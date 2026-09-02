import "server-only";
import Stripe from "stripe";

/**
 * Accès Stripe côté serveur.
 *
 * Stripe est OPTIONNEL : sans `STRIPE_SECRET_KEY`, l'application fonctionne
 * exactement comme avant (encaissement manuel par Interac). Dès que les clés
 * sont configurées, le paiement en ligne s'active tout seul.
 */

/** Version d'API figée sur celle des types du SDK (évite les surprises). */
const API_VERSION = "2026-08-26.dahlia" as const;

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) {
    cached = new Stripe(key, { apiVersion: API_VERSION, typescript: true });
  }
  return cached;
}

/**
 * Le paiement en ligne exige DEUX choses :
 *   • les clés Stripe (créer la session de paiement) ;
 *   • la clé service role Supabase (le webhook Stripe n'a aucune session
 *     utilisateur : c'est la seule voie d'écriture serveur-à-serveur).
 * Sans les deux, on retombe proprement sur le circuit Interac.
 */
export function isStripeEnabled(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Frais de mise en relation facturés au client, en dollars. */
export function connectionFee(): number {
  const raw = Number(process.env.CONNECTION_FEE_CAD);
  return Number.isFinite(raw) && raw > 0 ? raw : 24;
}

/** Convertit des dollars en cents (unité attendue par Stripe). */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * URL publique du site, utilisée pour les retours Stripe (success/cancel).
 * Vercel fournit VERCEL_PROJECT_PRODUCTION_URL ; sinon on utilise
 * NEXT_PUBLIC_SITE_URL, et en dernier recours le localhost de développement.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
