import "server-only";
import { createAdminClient } from "./supabase/admin";
import {
  connectionFee,
  getStripe,
  isStripeEnabled,
  siteUrl,
  toCents,
} from "./stripe";

/**
 * Création des sessions de paiement Stripe.
 *
 * Principe du modèle d'affaires : on encaisse AVANT de livrer la mise en
 * relation. Tant que le paiement n'est pas confirmé par le webhook, la
 * demande reste une simple piste ; une fois payée, elle passe en tête de la
 * file dans /admin/operations.
 *
 * Toute session créée est enregistrée dans `payments` (statut « pending »).
 * Seul le webhook Stripe la fait passer à « paid » — jamais le navigateur.
 */

type ConnectionCheckoutInput = {
  requestId: string;
  workerId: string;
  workerName: string;
  clientEmail: string;
};

/**
 * Frais de mise en relation payés d'avance par le client.
 * Renvoie l'URL Stripe, ou null si Stripe n'est pas configuré (l'application
 * retombe alors sur le circuit Interac, sans rien casser).
 */
export async function createConnectionCheckout(
  input: ConnectionCheckoutInput,
): Promise<string | null> {
  const stripe = getStripe();
  const admin = createAdminClient();
  if (!stripe || !admin || !isStripeEnabled()) return null;

  const amount = connectionFee();
  const worker = input.workerName || "un travailleur";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "fr-CA",
      customer_email: input.clientEmail || undefined,
      client_reference_id: input.requestId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: toCents(amount),
            product_data: {
              name: `Mise en relation avec ${worker}`,
              description:
                "Frais de mise en relation JobDirect — intégralement remboursés si aucun travailleur n'est confirmé.",
            },
          },
        },
      ],
      // TODO (dès l'inscription TPS/TVQ) : activer Stripe Tax
      // (`automatic_tax: { enabled: true }`) pour percevoir les taxes.
      metadata: {
        kind: "connection",
        connection_request_id: input.requestId,
      },
      success_url: `${siteUrl()}/embaucher/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/embaucher/${input.workerId}?paiement=annule`,
    });

    if (!session.url) return null;

    const { error } = await admin.from("payments").insert({
      kind: "connection",
      connection_request_id: input.requestId,
      amount,
      currency: "cad",
      status: "pending",
      stripe_session_id: session.id,
      customer_email: input.clientEmail || null,
    });
    if (error) {
      // La session existe chez Stripe mais on ne saurait pas la rattacher :
      // mieux vaut ne pas envoyer le client payer dans le vide.
      console.error("createConnectionCheckout: insert payment", error);
      return null;
    }

    return session.url;
  } catch (error) {
    console.error("createConnectionCheckout error", error);
    return null;
  }
}

/**
 * Vérifie une session auprès de Stripe (source de vérité) pour l'affichage de
 * la page de retour, sans dépendre de l'arrivée du webhook.
 */
export async function retrieveCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  if (!stripe) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      paid: session.payment_status === "paid",
      amountTotal: session.amount_total,
      email: session.customer_details?.email ?? session.customer_email ?? null,
    };
  } catch (error) {
    console.error("retrieveCheckoutSession error", error);
    return null;
  }
}
