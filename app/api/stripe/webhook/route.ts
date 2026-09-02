import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook Stripe — la SEULE source autorisée à marquer un paiement encaissé.
 *
 * À configurer dans Stripe → Developers → Webhooks :
 *   URL       : https://<votre-domaine>/api/stripe/webhook
 *   Événements: checkout.session.completed,
 *               checkout.session.async_payment_succeeded,
 *               charge.refunded
 *
 * Un webhook arrive sans cookie : aucune politique RLS ne peut l'autoriser,
 * d'où l'usage du client « service role » (voir lib/supabase/admin.ts).
 * L'écriture se limite à la table `payments` ; un trigger SQL propage ensuite
 * l'encaissement vers la demande de mise en relation ou la commission.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const admin = createAdminClient();

  if (!stripe || !webhookSecret || !admin) {
    return new Response("Stripe non configuré.", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Signature manquante.", { status: 400 });

  // Le corps BRUT est requis pour vérifier la signature — ne pas parser avant.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Webhook Stripe : signature invalide", error);
    return new Response("Signature invalide.", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.payment_status !== "paid") break;

        const intent =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);

        // `neq('status','paid')` rend le traitement idempotent : Stripe peut
        // livrer le même événement plusieurs fois.
        const { error } = await admin
          .from("payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent: intent,
            customer_email:
              session.customer_details?.email ?? session.customer_email ?? null,
          })
          .eq("stripe_session_id", session.id)
          .neq("status", "paid");

        if (error) {
          console.error("Webhook Stripe : mise à jour du paiement", error);
          return new Response("Erreur de base de données.", { status: 500 });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const intent =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : (charge.payment_intent?.id ?? null);
        if (!intent) break;

        const { error } = await admin
          .from("payments")
          .update({ status: "refunded" })
          .eq("stripe_payment_intent", intent)
          .neq("status", "refunded");

        if (error) {
          console.error("Webhook Stripe : remboursement", error);
          return new Response("Erreur de base de données.", { status: 500 });
        }
        break;
      }

      default:
        // Événement non traité : on acquitte pour que Stripe cesse de réessayer.
        break;
    }
  } catch (error) {
    console.error("Webhook Stripe : erreur de traitement", error);
    return new Response("Erreur de traitement.", { status: 500 });
  }

  return Response.json({ received: true });
}
