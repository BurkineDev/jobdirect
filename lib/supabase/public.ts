import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase PUBLIC — clé anon, aucun cookie.
 *
 * Pourquoi il existe en plus de `createClient()` : ce dernier lit les cookies
 * de la requête, ce qui force Next.js à rendre la page dynamiquement et
 * interdit d'envelopper l'appel dans `unstable_cache`. Or les vues publiques
 * (`public_tasks`, `public_workers`) sont identiques pour tout le monde : leur
 * lecture n'a aucun besoin de session.
 *
 * Ce client sert donc UNIQUEMENT aux lectures mises en cache et partagées
 * entre tous les visiteurs (compteurs du marché, pages d'atterrissage,
 * sitemap). Il n'a accès qu'à ce que la RLS ouvre au rôle `anon` — aucune
 * coordonnée privée n'est atteignable par cette voie.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Renvoie `null` au lieu de lever : ces lectures n'alimentent que du
  // décor (compteurs, listes de tâches, sitemap). Sur un déploiement dont
  // les variables sont mal configurées — le piège documenté dans le README —
  // le site doit rester debout sans compteurs plutôt que rendre une 500 sur
  // sa page d'accueil.
  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
