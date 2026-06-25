"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getString, isEmail, isPhone, parseBudget } from "@/lib/validation";
import type { FormState } from "@/lib/types";

/**
 * Publication d'une tâche par un employeur / particulier.
 * La tâche est créée au statut « pending » : elle n'apparaît publiquement
 * qu'une fois validée (passée à « active ») par l'administration.
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

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    title,
    description,
    city,
    category,
    desired_date: desiredDate || null,
    budget_estimate: budget === "invalid" ? null : budget,
    contact_name: contactName,
    contact_phone: contactPhone,
    contact_email: contactEmail,
    status: "pending",
  });

  if (error) {
    console.error("createTask error", error);
    return {
      status: "error",
      message: "Une erreur est survenue. Veuillez réessayer.",
    };
  }

  revalidatePath("/taches");
  revalidatePath("/admin");
  return {
    status: "success",
    message:
      "Votre tâche a été soumise ! Elle sera publiée dès qu'elle aura été validée par notre équipe.",
  };
}
