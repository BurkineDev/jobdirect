"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getString, isEmail, isPhone } from "@/lib/validation";
import type { FormState } from "@/lib/types";

/** Candidature « Je suis disponible pour cette tâche ». */
export async function createApplication(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const taskId = getString(formData, "task_id");
  const name = getString(formData, "name");
  const phone = getString(formData, "phone");
  const email = getString(formData, "email");
  const message = getString(formData, "message");

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Votre nom est requis.";
  if (!isPhone(phone)) fieldErrors.phone = "Numéro de téléphone invalide.";
  if (!isEmail(email)) fieldErrors.email = "Courriel invalide.";

  if (!taskId) {
    return { status: "error", message: "Tâche introuvable." };
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Veuillez corriger les champs indiqués.",
      fieldErrors,
    };
  }

  const supabase = await createClient();

  // La tâche doit être active pour accepter des candidatures.
  // (La vue publique ne contient que les tâches actives.)
  const { data: task } = await supabase
    .from("public_tasks")
    .select("id")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) {
    return {
      status: "error",
      message: "Cette tâche n'accepte plus de candidatures.",
    };
  }

  // Si un travailleur est connecté, on relie la candidature à son compte.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("applications").insert({
    task_id: taskId,
    name,
    phone,
    email,
    message: message || null,
    status: "new",
    user_id: user?.id ?? null,
  });

  if (error) {
    console.error("createApplication error", error);
    return {
      status: "error",
      message: "Une erreur est survenue. Veuillez réessayer.",
    };
  }

  revalidatePath("/admin/candidatures");
  return {
    status: "success",
    message:
      "Votre disponibilité a été envoyée ! Le demandeur ou notre équipe vous contactera bientôt.",
  };
}
