import "server-only";
import Stripe from "stripe";
import { hasServiceRoleKey } from "./supabase/admin";

export { siteUrl } from "./site";

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
  // `hasServiceRoleKey()` accepte SUPABASE_SERVICE_ROLE_KEY comme
  // SUPABASE_SECRET_KEY : c'est ce dernier nom que provisionne l'intégration
  // Supabase pour Vercel, et son absence rendait Stripe muet sans signal.
  return Boolean(process.env.STRIPE_SECRET_KEY && hasServiceRoleKey());
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

