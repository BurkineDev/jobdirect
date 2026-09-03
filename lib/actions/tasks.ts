"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getString, isEmail, isPhone, parseBudget } from "@/lib/validation";
import { moderateTask } from "@/lib/moderation";
import {
  RATE_LIMIT_MESSAGE,
  claimSubmissionSlot,
  isAutoPublishEnabled,
  promoteTaskToActive,
} from "@/lib/submissions";
import { MARKET_TAG } from "@/lib/market";
import { after } from "next/server";
import { notifyNewTask } from "@/lib/notify";
import type { FormState } from "@/lib/types";

/**
 * Publication d'une tâche par un employeur / particulier.
 *
 * La tâche est TOUJOURS insérée au statut « pending » — c'est ce que la
 * politique RLS d'insertion publique autorise, et rien d'autre. Elle est
 * ensuite promue « active » côté serveur si, et seulement si, la modération
 * automatique n'a rien relevé (voir `lib/moderation.ts`).
 *
 * Pourquoi ce détour plutôt qu'une insertion directe en « active » : la clé
 * anon est publique. Autoriser « active » à l'insertion permettrait à
 * n'importe qui d'écrire directement dans l'API Supabase et de publier du
 * contenu — coordonnées comprises — sans jamais passer par ce fichier.
 */
export async function createTask(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const title = getString(formData, "title");
  const description = getString(formData, "description");
  const city = getString(formData, "city");
  const category = getString(formData, "category");
  const desiredDate = getString(formData, "desired_date");
  const budgetRaw = getString(formData, "budget_estimate");
  const contactName = getString(formData, "contact_name");
  const contactPhone = getString(formData, "contact_phone");
  const contactEmail = getString(formData, "contact_email");

  const fieldErrors: Record<string, string> = {};
  if (title.length < 3)
    fieldErrors.title = "Le titre est requis (au moins 3 caractères).";
  if (description.length < 10)
    fieldErrors.description = "Décrivez la tâche (au moins 10 caractères).";
  if (!city) fieldErrors.city = "La ville est requise.";
  if (!category) fieldErrors.category = "La catégorie est requise.";
  if (!contactName) fieldErrors.contact_name = "Votre nom est requis.";
  if (!isPhone(contactPhone))
    fieldErrors.contact_phone = "Numéro de téléphone invalide.";
  if (!isEmail(contactEmail)) fieldErrors.contact_email = "Courriel invalide.";

  const budget = parseBudget(budgetRaw);
  if (budget === "invalid")
    fieldErrors.budget_estimate = "Budget invalide (ex. : 80).";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Veuillez corriger les champs indiqués.",
      fieldErrors,
    };
  }

  if (!(await claimSubmissionSlot("task", contactEmail))) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  // Contrôle du texte qui deviendra public.
  const moderated = moderateTask({ title, description });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Identifiant généré ici : la RLS n'autorise pas le visiteur anonyme à
  // relire la ligne insérée, donc `insert ... returning` échouerait — et il
  // nous faut l'identifiant pour promouvoir la tâche juste après.
  const taskId = crypto.randomUUID();

  const { error } = await supabase.from("tasks").insert({
    id: taskId,
    title: moderated.title,
    description: moderated.description,
    // On ne conserve l'original que s'il diffère : inutile de dupliquer un
    // texte propre, et c'est une donnée personnelle en moins à garder.
    description_raw: moderated.redacted ? description : null,
    moderation_reasons:
      moderated.reasons.length > 0 ? moderated.reasons : null,
    city,
    category,
    desired_date: desiredDate || null,
    budget_estimate: budget === "invalid" ? null : budget,
    contact_name: contactName,
    contact_phone: contactPhone,
    contact_email: contactEmail,
    status: "pending",
    user_id: user?.id ?? null,
  });

  if (error) {
    console.error("createTask error", error);
    return {
      status: "error",
      message: "Une erreur est survenue. Veuillez réessayer.",
    };
  }

  let published = false;
  if (moderated.autoPublishable && isAutoPublishEnabled()) {
    published = await promoteTaskToActive(taskId);
  }

  revalidatePath("/taches");
  revalidatePath("/admin");
  revalidatePath("/admin/operations");
  if (published) updateTag(MARKET_TAG);

  // Notifications : opérateur toujours, travailleurs et employeur seulement
  // si la tâche est visible. `notifyNewTask` ne lève jamais — un incident du
  // fournisseur de courriel ne doit pas transformer une tâche enregistrée en
  // message d'erreur pour le visiteur.
  // `after()` : les courriels partent APRÈS que la réponse soit envoyée.
  // Sans lui, le visiteur attend l'aller-retour vers Resend avant de voir sa
  // confirmation — sur l'étape de conversion la plus importante du site.
  after(() => notifyNewTask({
    id: taskId,
    title: moderated.title,
    description: moderated.description,
    city,
    category,
    desired_date: desiredDate || null,
    budget_estimate: budget === "invalid" ? null : budget,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    published,
    moderationReasons: moderated.reasons,
  }));

  if (published) {
    return {
      status: "success",
      message:
        "Votre tâche est en ligne ! Les personnes disponibles dans votre secteur peuvent déjà se proposer. Nous vous prévenons dès la première réponse.",
    };
  }

  // Cas le plus délicat à formuler : on a modifié le texte de la personne.
  // Le lui dire franchement, et expliquer pourquoi, vaut mieux qu'un silence
  // qu'elle découvrirait en relisant son annonce publiée.
  if (moderated.redacted) {
    return {
      status: "success",
      message:
        "Votre tâche a été soumise. Nous avons retiré vos coordonnées de la description : sur JobDirect, c'est notre équipe qui vous met en contact, et vos coordonnées ne sont jamais publiques. Nous vérifions l'annonce et la publions rapidement.",
    };
  }

  return {
    status: "success",
    message:
      "Votre tâche a été soumise ! Elle sera publiée dès qu'elle aura été validée par notre équipe.",
  };
}
