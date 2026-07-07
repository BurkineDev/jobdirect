import "server-only";
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
 * Récupère l'utilisateur authentifié s'il est administrateur, sinon null.
 * Utilisé pour protéger les pages /admin.
 */
export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}

/** Utilisateur authentifié (employeur ou travailleur), ou null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Profil complet (rôle, nom, etc.) de l'utilisateur connecté, ou null. */
export async function getCurrentProfile(): Promise<SessionProfile | null> {
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
}
