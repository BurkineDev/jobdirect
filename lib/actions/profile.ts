"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getString, isPhone } from "@/lib/validation";
import { MARKET_TAG } from "@/lib/market";
import type { FormState } from "@/lib/types";

/** Mise à jour du profil de l'utilisateur connecté. */
export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Non connecté." };

  const fullName = getString(formData, "full_name");
  const phone = getString(formData, "phone");
  const city = getString(formData, "city");
  const skills = getString(formData, "skills");
  const availability = getString(formData, "availability");
  const experience = getString(formData, "experience");
  // Envoyé uniquement par les comptes travailleur ; absent = inchangé.
  const isPublicRaw = formData.get("is_public");

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.full_name = "Votre nom est requis.";
  if (phone && !isPhone(phone))
    fieldErrors.phone = "Numéro de téléphone invalide.";
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Veuillez corriger les champs indiqués.",
      fieldErrors,
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      city: city || null,
      skills: skills || null,
      availability: availability || null,
      experience: experience || null,
      ...(isPublicRaw === null ? {} : { is_public: isPublicRaw !== "false" }),
    })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: "Erreur lors de l'enregistrement." };
  }

  revalidatePath("/mon-compte");
  // Ville, compétences et droit de retrait alimentent `public_workers`.
  // `updateTag` est ici une exigence de conformité : quand un travailleur
  // décoche « profil public », il doit disparaître du répertoire sur-le-champ,
  // pas au prochain rafraîchissement du cache (Loi 25, droit de retrait).
  updateTag(MARKET_TAG);
  return { status: "success", message: "Profil mis à jour." };
}
