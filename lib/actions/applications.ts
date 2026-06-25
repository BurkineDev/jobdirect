"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const supabase = createAdminClient();

  // La tâche doit exister et être active pour accepter des candidatures.
  const { data: task } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("id", taskId)
    .single();

  if (!task || task.status !== "active") {
    return {
      status: "error",
      message: "Cette tâche n'accepte plus de candidatures.",
    };
  }

  // Si un travailleur est déjà inscrit avec ce courriel, on relie la candidature.
  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  const { error } = await supabase.from("applications").insert({
    task_id: taskId,
    worker_id: worker?.id ?? null,
    name,
    phone,
    email,
    message: message || null,
    status: "new",
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
