import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase « service role » — contourne la RLS.
 *
 * EXCEPTION ASSUMÉE à l'architecture « clé publique seulement ». Deux usages,
 * tous deux strictement serveur :
 *   • app/api/stripe/webhook/route.ts — confirmer un encaissement (un webhook
 *     arrive sans cookie ni session : aucune RLS ne peut l'autoriser) ;
 *   • lib/submissions.ts — publier une tâche après modération, ce que la
 *     politique d'insertion publique interdit précisément pour qu'une clé
 *     anon volée ne puisse rien rendre visible.
 * Elle ne doit JAMAIS être préfixée NEXT_PUBLIC_ ni atteindre le navigateur.
 */

/**
 * Résout la clé serveur, sous ses DEUX noms possibles.
 *
 * Supabase a renommé la clé : l'ancienne `service_role` (JWT) devient la
 * « secret key » (`sb_secret_…`) dans le nouveau système de clés. Or
 * l'intégration Supabase pour Vercel provisionne automatiquement
 * `SUPABASE_SECRET_KEY`, tandis que ce projet lisait historiquement
 * `SUPABASE_SERVICE_ROLE_KEY`.
 *
 * Conséquence constatée en production : les deux clés Stripe étaient bien
 * présentes, l'intégration Supabase avait posé `SUPABASE_SECRET_KEY`… et le
 * paiement par carte restait inactif sans le moindre signal, parce que le
 * code cherchait un nom que personne n'avait défini. On accepte donc les deux.
 */
export function serviceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    undefined
  );
}

/** L'URL du projet, sous ses deux noms possibles également. */
export function supabaseUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    undefined
  );
}

/** true si une clé serveur est configurée (sous l'un ou l'autre nom). */
export function hasServiceRoleKey(): boolean {
  return Boolean(serviceRoleKey() && supabaseUrl());
}

export function createAdminClient() {
  const url = supabaseUrl();
  const key = serviceRoleKey();
  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
