"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getString, isEmail, isPhone } from "@/lib/validation";
import { moderateWorker } from "@/lib/moderation";
import { RATE_LIMIT_MESSAGE, claimSubmissionSlot } from "@/lib/submissions";
import { MARKET_TAG, getMarketSnapshot } from "@/lib/market";
import { after } from "next/server";
import { notifyWorkerWelcome } from "@/lib/notify";
import type { FormState } from "@/lib/types";

/**
 * Inscription d'un travailleur journalier.
 *
 * `skills`, `availability` et `experience` alimentent la vue publique
 * `public_workers` : ils passent donc par la même modération que la
 * description d'une tâche. Un travailleur qui glisse son numéro dans ses
 * compétences contournerait la mise en relation — le seul service facturé.
 */
export async function createWorker(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = getString(formData, "name");
  const phone = getString(formData, "phone");
  const email = getString(formData, "email");
  const city = getString(formData, "city");
  const skills = getString(formData, "skills");
  const availability = getString(formData, "availability");
  const experience = getString(formData, "experience");
  // Consentement à la publication ; absent du formulaire = publié (défaut SQL).
  const isPublic = formData.get("is_public") !== "false";

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Votre nom est requis.";
  if (!isPhone(phone)) fieldErrors.phone = "Numéro de téléphone invalide.";
  if (!isEmail(email)) fieldErrors.email = "Courriel invalide.";
  if (!city) fieldErrors.city = "La ville est requise.";
  if (!skills) fieldErrors.skills = "Indiquez vos compétences.";
  if (!availability)
    fieldErrors.availability = "Indiquez vos disponibilités.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Veuillez corriger les champs indiqués.",
      fieldErrors,
    };
  }

  if (!(await claimSubmissionSlot("worker", email))) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  const moderated = moderateWorker({ skills, availability, experience });

  const supabase = await createClient();
  const { error } = await supabase.from("workers").insert({
    name,
    phone,
    email,
    city,
    skills: moderated.skills,
    availability: moderated.availability,
    experience: moderated.experience,
    // Original conservé seulement s'il a été modifié (donnée personnelle).
    skills_raw: moderated.redacted ? skills : null,
    moderation_reasons:
      moderated.reasons.length > 0 ? moderated.reasons : null,
    is_public: isPublic,
  });

  if (error) {
    console.error("createWorker error", error);
    return {
      status: "error",
      message: "Une erreur est survenue. Veuillez réessayer.",
    };
  }

  revalidatePath("/admin/travailleurs");
  // Le nouveau venu fait monter les compteurs publics. `revalidateTag` en
  // profil « max » : on sert la version périmée pendant que la fraîche se
  // recalcule en arrière-plan — personne n'attend pour un compteur.
  revalidateTag(MARKET_TAG, "max");
  // Accueil : le seul argument qui retient un travailleur est de savoir
  // qu'il y a du travail dans sa ville. On lui envoie le compte réel.
  const market = await getMarketSnapshot();
  // `after()` : les courriels partent APRÈS que la réponse soit envoyée.
  // Sans lui, le visiteur attend l'aller-retour vers Resend avant de voir sa
  // confirmation — sur l'étape de conversion la plus importante du site.
  after(() => notifyWorkerWelcome({
    email,
    name,
    city,
    openTasksInCity: market.tasksByCity[city] ?? 0,
  }));

  if (moderated.redacted) {
    return {
      status: "success",
      message:
        "Inscription réussie ! Nous avons retiré vos coordonnées de votre profil public : sur JobDirect, ce sont les employeurs qui passent par nous pour vous joindre — c'est ce qui vous protège des sollicitations. Vous serez contacté(e) dès qu'une tâche correspond à votre profil.",
    };
  }

  return {
    status: "success",
    message:
      "Inscription réussie ! Vous serez contacté(e) lorsqu'une tâche correspond à votre profil.",
  };
}
