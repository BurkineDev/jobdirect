import "server-only";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile, SessionProfile } from "./types";

/**
 * Détermine si une adresse courriel fait partie des administrateurs autorisés.
 * La liste blanche est définie via la variable d'environnement ADMIN_EMAILS
 * (adresses séparées par des virgules).
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

/**
 * Pourquoi ces trois fonctions ne lèvent JAMAIS.
 *
/**
 * `unstable_rethrow` est INDISPENSABLE dans chacun de ces blocs `catch`.
 *
 * Next.js signale « cette route doit être rendue dynamiquement » en LEVANT
 * une exception interne depuis `cookies()` / `headers()` — c'est du contrôle
 * de flux, pas une panne. Un `catch` qui l'avale casse la détection
 * statique/dynamique du framework (et polluait le journal de build de
 * fausses erreurs « Supabase injoignable »). On relance donc les exceptions
 * internes avant de traiter les vraies.
 */

/**
 * `createClient()` lève si `NEXT_PUBLIC_SUPABASE_URL` ou la clé anon manquent.
 * Or `getCurrentProfile()` est appelée par le layout public, c'est-à-dire par
 * TOUTES les pages du site : une variable d'environnement absente ne
 * provoquait donc pas une dégradation, mais une erreur 500 sur l'intégralité
 * du site — page d'accueil comprise, et sans le moindre avertissement.
 *
 * C'est précisément le piège que documente le README : Vercel fige les
 * variables dans chaque déploiement, et une variable ajoutée après coup (ou
 * enregistrée pour « Preview » seulement) reste invisible en production.
 *
 * L'échec se traduit désormais par « personne n'est connecté » : le site
 * s'affiche, les formulaires signalent proprement leur erreur, et
 * `/api/diagnostic` dit ce qui manque. Pour `getAdminUser()`, refuser l'accès
 * est de toute façon le sens sûr de l'échec.
 */

/**
 * Récupère l'utilisateur authentifié s'il est administrateur, sinon null.
 * Utilisé pour protéger les pages /admin.
 */
export async function getAdminUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) return null;
    return user;
  } catch (error) {
    unstable_rethrow(error);
    console.error("getAdminUser: Supabase injoignable", error);
    return null;
  }
}

/** Utilisateur authentifié (employeur ou travailleur), ou null. */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    unstable_rethrow(error);
    console.error("getCurrentUser: Supabase injoignable", error);
    return null;
  }
}

/**
 * L'administrateur connecté est-il reconnu par la BASE (et pas seulement par
 * l'application) ?
 *
 * Il y a deux autorisations distinctes, et elles se ratent facilement :
 *   • `ADMIN_EMAILS` autorise l'accès aux PAGES (garde applicative) ;
 *   • la table `public.admins`, lue par la fonction SQL `is_admin()`,
 *     autorise l'accès aux DONNÉES (politiques RLS).
 *
 * Quand la première passe et la seconde échoue, l'admin entre dans le panneau
 * et n'y voit… rien. Aucune erreur, aucune ligne : la RLS filtre tout en
 * silence. C'est indiagnosticable sans cette vérification, d'où son existence.
 *
 * Renvoie `true` en cas d'erreur d'appel : cette fonction ne sert qu'à
 * AFFICHER un avertissement, jamais à autoriser quoi que ce soit. Un faux
 * négatif afficherait une alarme trompeuse ; la vraie frontière de sécurité
 * reste la RLS elle-même.
 */
export async function isAdminInDatabase(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("is_admin");
    if (error) {
      console.error("isAdminInDatabase: RPC", error.message);
      return true;
    }
    return data !== false;
  } catch (error) {
    console.error("isAdminInDatabase error", error);
    return true;
  }
}

/** Profil complet (rôle, nom, etc.) de l'utilisateur connecté, ou null. */
export async function getCurrentProfile(): Promise<SessionProfile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) return null;
    return { ...(profile as Profile), email: user.email ?? "" };
  } catch (error) {
    unstable_rethrow(error);
    console.error("getCurrentProfile: Supabase injoignable", error);
    return null;
  }
}
