import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase pour le navigateur (clé publique « anon »).
 * Fourni pour l'évolutivité (requêtes côté client, temps réel plus tard).
 * Dans le MVP, l'accès aux données passe surtout par le serveur.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
