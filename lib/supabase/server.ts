import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase côté serveur lié aux cookies de la requête.
 * Utilisé pour l'AUTHENTIFICATION admin (login, session, déconnexion).
 * L'accès aux données métier passe par le client « admin » (service role).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component : ignoré.
            // Le middleware se charge de rafraîchir la session.
          }
        },
      },
    },
  );
}
