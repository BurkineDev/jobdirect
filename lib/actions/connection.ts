"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createConnectionCheckout } from "@/lib/payments";
import { connectionFee, isStripeEnabled } from "@/lib/stripe";
import { getString, isEmail, isPhone } from "@/lib/validation";
import { RATE_LIMIT_MESSAGE, claimSubmissionSlot } from "@/lib/submissions";
import type { FormState } from "@/lib/types";

/**
 * Demande de mise en relation : un client veut embaucher un travailleur.
 * Les coordonnées du travailleur ne sont jamais exposées ; c'est l'admin
 * qui fait la mise en relation (et facture la commission).
 *
 * La piste est enregistrée d'abord, le paiement ensuite : si Stripe échoue ou
 * si le client abandonne le paiement, le lead n'est pas perdu pour autant.
 */
export async function createConnectionRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const workerId = getString(formData, "worker_id");
  const workerName = getString(formData, "worker_name");
  const clientName = getString(formData, "client_name");
  const clientPhone = getString(formData, "client_phone");
  const clientEmail = getString(formData, "client_email");
  const city = getString(formData, "city");
  const need = getString(formData, "need");

  const fieldErrors: Record<string, string> = {};
  if (!clientName) fieldErrors.client_name = "Votre nom est requis.";
  if (!isPhone(clientPhone))
    fieldErrors.client_phone = "Numéro de téléphone invalide.";
  if (!isEmail(clientEmail)) fieldErrors.client_email = "Courriel invalide.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Veuillez corriger les champs indiqués.",
      fieldErrors,
    };
  }

  if (!(await claimSubmissionSlot("connection", clientEmail))) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  // Identifiant généré côté serveur : la RLS n'autorise pas le visiteur
  // anonyme à relire la ligne insérée (`insert ... returning` échouerait).
  const requestId = crypto.randomUUID();

  const supabase = await createClient();
  const { error } = await supabase.from("connection_requests").insert({
    id: requestId,
    worker_id: workerId || null,
    worker_name: workerName || null,
    client_name: clientName,
    client_phone: clientPhone,
    client_email: clientEmail,
    city: city || null,
    need: need || null,
    status: "new",
  });

  if (error) {
    console.error("createConnectionRequest error", error);
    return {
      status: "error",
      message: "Une erreur est survenue. Veuillez réessayer.",
    };
  }

  revalidatePath("/admin/operations");

  // Encaisser AVANT de livrer la mise en relation : c'est la seule étape où
  // l'on dispose encore d'un levier. Sans Stripe configuré, on retombe sur le
  // circuit manuel (Interac) sans rien changer pour le visiteur.
  if (isStripeEnabled()) {
    const url = await createConnectionCheckout({
      requestId,
      workerId,
      workerName,
      clientEmail,
    });
    if (url) {
      return {
        status: "success",
        message: `Demande enregistrée ! Redirection vers le paiement sécurisé (${connectionFee()} $)…`,
        redirectUrl: url,
      };
    }
  }

  return {
    status: "success",
    message:
      "Demande envoyée ! Notre équipe vous met en contact avec cette personne rapidement.",
  };
}
