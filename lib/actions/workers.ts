"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getString, isEmail, isPhone } from "@/lib/validation";
import type { FormState } from "@/lib/types";

/** Inscription d'un travailleur journalier. */
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

  const supabase = createAdminClient();
  const { error } = await supabase.from("workers").insert({
    name,
    phone,
    email,
    city,
    skills,
    availability,
    experience: experience || null,
  });

  if (error) {
    console.error("createWorker error", error);
    return {
      status: "error",
      message: "Une erreur est survenue. Veuillez réessayer.",
    };
  }

  revalidatePath("/admin/travailleurs");
  return {
    status: "success",
    message:
      "Inscription réussie ! Vous serez contacté(e) lorsqu'une tâche correspond à votre profil.",
  };
}
