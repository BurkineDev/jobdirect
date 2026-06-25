import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase « service role » — réservé au SERVEUR.
 *
 * Il contourne les politiques RLS : c'est lui qui assure tout l'accès aux
 * données (lectures publiques avec sélection explicite des colonnes, écritures
 * de formulaires validées, opérations admin). La clé service role ne doit
 * JAMAIS être exposée au navigateur (pas de préfixe NEXT_PUBLIC_).
 *
 * L'import "server-only" fait échouer le build si ce fichier est importé
 * par erreur dans du code client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
