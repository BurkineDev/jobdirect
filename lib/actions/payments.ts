"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth";
import {
  getStripe,
  isStripeEnabled,
  siteUrl,
  toCents,
} from "@/lib/stripe";

/**
 * Lien de paiement Stripe pour une commission de mise en relation.
 * Réservé à l'admin : il génère le lien puis l'envoie au client (texto,
 * courriel). Le webhook marque ensuite la commission « Payée » tout seul —
 * plus besoin de courir après un virement Interac.
 */
export async function createCommissionPaymentLink(
  commissionId: string,
): Promise<{ url: string } | { error: string }> {
  const admin = await getAdminUser();
  if (!admin) return { error: "Non autorisé." };

  const stripe = getStripe();
  if (!stripe || !isStripeEnabled()) {
    return {
      error:
        "Stripe n'est pas configuré (voir STRIPE_SECRET_KEY dans le README).",
    };
  }

  const supabase = await createClient();
  const { data: commission, error } = await supabase
    .from("commissions")
    .select("id, amount, status, task:tasks(id, title, city, contact_email)")
    .eq("id", commissionId)
    .maybeSingle();

  if (error || !commission) return { error: "Commission introuvable." };
  if (commission.status === "paid") return { error: "Déjà encaissée." };

  // `task` arrive comme un tableau ou un objet selon la forme de la jointure.
  const task = Array.isArray(commission.task)
    ? commission.task[0]
    : commission.task;
  const amount = Number(commission.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Montant de commission invalide." };
  }

  // Réutilise une session encore valide plutôt que d'en empiler une nouvelle
  // à chaque clic (les sessions Stripe expirent après 24 h).
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("payments")
    .select("stripe_session_id, amount")
    .eq("commission_id", commissionId)
    .eq("status", "pending")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.stripe_session_id && Number(existing.amount) === amount) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        existing.stripe_session_id,
      );
      if (session.status === "open" && session.url) return { url: session.url };
    } catch {
      // Session introuvable / expirée : on en crée une nouvelle ci-dessous.
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "fr-CA",
      customer_email: task?.contact_email ?? undefined,
      client_reference_id: commissionId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: toCents(amount),
            product_data: {
              name: `Frais de mise en relation — ${task?.title ?? "tâche JobDirect"}`,
              description: task?.city
                ? `JobDirect · ${task.city}`
                : "JobDirect",
            },
          },
        },
      ],
      metadata: { kind: "commission", commission_id: commissionId },
      // Ici, et contrairement aux frais de mise en relation, on garde l'URL
      // CANONIQUE et non l'origine de la requête : ce lien est créé par
      // l'admin puis envoyé au client, qui l'ouvrira plus tard depuis son
      // propre appareil. Le renvoyer sur l'origine de l'admin l'expédierait
      // sur une prévisualisation ou sur localhost.
      success_url: `${siteUrl()}/merci-paiement?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/`,
    });

    if (!session.url) return { error: "Stripe n'a pas renvoyé de lien." };

    const { error: insertError } = await supabase.from("payments").insert({
      kind: "commission",
      commission_id: commissionId,
      amount,
      currency: "cad",
      status: "pending",
      stripe_session_id: session.id,
      customer_email: task?.contact_email ?? null,
    });
    if (insertError) {
      console.error("createCommissionPaymentLink: insert payment", insertError);
      return { error: "Impossible d'enregistrer le paiement." };
    }

    revalidatePath("/admin/operations");
    return { url: session.url };
  } catch (err) {
    console.error("createCommissionPaymentLink error", err);
    return { error: "Erreur Stripe. Réessayez." };
  }
}
