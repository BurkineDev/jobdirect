import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase « service role » — contourne la RLS.
 *
 * EXCEPTION ASSUMÉE à l'architecture « clé publique seulement » : un webhook
 * Stripe arrive sans cookie ni session utilisateur, donc aucune politique RLS
 * ne peut l'autoriser. Cette clé n'est utilisée QUE dans deux endroits, tous
 * deux strictement serveur :
 *   • app/api/stripe/webhook/route.ts — confirmer un encaissement ;
 *   • lib/actions/payments.ts — enregistrer la session de paiement créée pour
 *     un visiteur non authentifié.
 * Elle ne doit JAMAIS être préfixée NEXT_PUBLIC_ ni atteindre le navigateur.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
