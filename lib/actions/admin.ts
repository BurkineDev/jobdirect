"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser, isAdminEmail } from "@/lib/auth";
import { getString } from "@/lib/validation";
import {
  APPLICATION_STATUSES,
  TASK_STATUSES,
  type ApplicationStatus,
  type TaskStatus,
} from "@/lib/constants";
import type { FormState } from "@/lib/types";

/** Empêche d'exécuter une action admin sans être authentifié et autorisé. */
async function assertAdmin() {
  const user = await getAdminUser();
  if (!user) throw new Error("Non autorisé.");
}

// --- Authentification -------------------------------------------------------

export async function signIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = getString(formData, "email");
  const password = (formData.get("password") as string) ?? "";
  const redirectField = getString(formData, "redirect");
  // On n'autorise que des redirections internes vers l'espace admin.
  const redirectTo =
    redirectField.startsWith("/admin") && !redirectField.includes("//")
      ? redirectField
      : "/admin";

  if (!email || !password) {
    return { status: "error", message: "Courriel et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: "Identifiants invalides." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "Ce compte n'a pas accès à l'administration.",
    };
  }

  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// --- Mutations métier (réservées admin) ------------------------------------

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  await assertAdmin();
  if (!TASK_STATUSES.includes(status)) throw new Error("Statut invalide.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/operations");
  revalidatePath("/taches");
  revalidatePath(`/taches/${taskId}`);
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
) {
  await assertAdmin();
  if (!APPLICATION_STATUSES.includes(status))
    throw new Error("Statut invalide.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/candidatures");
}

// --- Commissions (mise en relation) -----------------------------------------

/** Marque une commission comme payée (Interac reçu), avec montant final. */
export async function markCommissionPaid(commissionId: string, amount: number) {
  await assertAdmin();
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error("Montant invalide.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("commissions")
    .update({ amount, status: "paid", paid_at: new Date().toISOString() })
    .eq("id", commissionId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/operations");
}

/** Repasse une commission en attente (erreur de saisie). */
export async function reopenCommission(commissionId: string) {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("commissions")
    .update({ status: "pending", paid_at: null })
    .eq("id", commissionId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/operations");
}

/** Supprime une commission (ex. assignation annulée). */
export async function deleteCommission(commissionId: string) {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("commissions")
    .delete()
    .eq("id", commissionId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/operations");
}

export async function addAdminNote(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertAdmin();
  const taskId = getString(formData, "task_id");
  const note = getString(formData, "note");

  if (!note) return { status: "error", message: "La note est vide." };

  const supabase = await createClient();
  const { error } = await supabase.from("admin_notes").insert({
    task_id: taskId || null,
    note,
  });
  if (error) return { status: "error", message: "Erreur lors de l'ajout." };

  revalidatePath("/admin");
  return { status: "success", message: "Note ajoutée." };
}

export async function deleteAdminNote(noteId: string) {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_notes")
    .delete()
    .eq("id", noteId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
