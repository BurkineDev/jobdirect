import "server-only";

/**
 * URL publique du site, utilisée pour tout retour externe (Stripe, OAuth).
 *
 * Priorité : NEXT_PUBLIC_SITE_URL (explicite) → domaine de production Vercel
 * → localhost. Définissez la variable explicite en production : sans elle,
 * Vercel peut renvoyer l'URL technique `*.vercel.app` au lieu du domaine.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
