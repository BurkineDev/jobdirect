import "server-only";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "./supabase/server";
import { createAdminClient, hasServiceRoleKey } from "./supabase/admin";

/**
 * Garde anti-spam et publication instantanée des soumissions publiques.
 */

export type SubmissionKind = "task" | "worker" | "application" | "connection";

/**
 * Réserve un jeton de soumission auprès de la base (quota par courriel et par
 * heure — voir `claim_submission_slot` dans le schéma SQL).
 *
 * Renvoie `true` si la soumission est autorisée.
 *
 * En cas d'ERREUR, on autorise volontairement. C'est le comportement sûr :
 * si la migration `20260902c` n'a pas encore été appliquée, la fonction SQL
 * n'existe pas, et faire échouer la garde bloquerait TOUS les formulaires du
 * site. Un anti-spam qui tombe doit laisser passer, jamais fermer la porte.
 */
export async function claimSubmissionSlot(
  kind: SubmissionKind,
  fingerprint: string,
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("claim_submission_slot", {
      p_kind: kind,
      p_fingerprint: fingerprint,
    });
    if (error) {
      console.error("claimSubmissionSlot: RPC indisponible", error.message);
      return true;
    }
    return data !== false;
  } catch (error) {
    unstable_rethrow(error);
    console.error("claimSubmissionSlot error", error);
    return true;
  }
}

/** Message unique affiché quand le quota est atteint. */
export const RATE_LIMIT_MESSAGE =
  "Vous avez envoyé plusieurs demandes coup sur coup. Patientez une heure ou écrivez-nous directement — c'est une mesure anti-pourriel, pas un refus.";

/**
 * Passe une tâche de « pending » à « active » après un contrôle de modération
 * réussi — c'est ce qui remplace le clic manuel de l'administrateur.
 *
 * La promotion emprunte la clé service role, et c'est délibéré : la politique
 * RLS d'insertion publique force `status = 'pending'`, si bien qu'une clé anon
 * volée ne peut rien rendre visible. Seul ce chemin serveur, précédé du
 * contrôle de `lib/moderation.ts`, publie.
 *
 * Renvoie `false` si la clé service role n'est pas configurée : la tâche
 * reste alors dans la file d'attente et le site se comporte exactement comme
 * avant cette fonctionnalité.
 */
export async function promoteTaskToActive(taskId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { error } = await admin
    .from("tasks")
    .update({ status: "active", auto_published: true })
    .eq("id", taskId)
    .eq("status", "pending"); // ne réveille jamais une tâche annulée ou terminée

  if (error) {
    console.error("promoteTaskToActive error", error);
    return false;
  }
  return true;
}

/** La publication instantanée exige la clé service role (voir ci-dessus). */
export function isAutoPublishEnabled(): boolean {
  return hasServiceRoleKey();
}
