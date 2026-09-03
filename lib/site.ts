import "server-only";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";

/**
 * URL CANONIQUE du site — celle qui doit apparaître dans les balises
 * `canonical`, le sitemap, robots.txt et les données structurées.
 *
 * Elle doit rester STABLE quel que soit le déploiement : si une URL de
 * prévisualisation `*.vercel.app` se retrouvait dans une balise canonical,
 * Google indexerait le domaine technique au lieu du vrai.
 *
 * Priorité : NEXT_PUBLIC_SITE_URL (explicite) → domaine de production Vercel
 * → localhost.
 *
 * ⚠️ Pour une URL de RETOUR (OAuth, Stripe), utilisez `requestSiteUrl()` :
 * le visiteur doit revenir là où il était, pas sur le domaine canonique.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/**
 * URL de RETOUR : l'origine réellement utilisée par le visiteur.
 *
 * Pourquoi ça ne peut pas être `siteUrl()` : celle-ci renvoie une valeur
 * figée par variable d'environnement. Conséquence observée en production —
 * un visiteur qui se connecte avec Google depuis une prévisualisation, ou
 * depuis un déploiement dont la variable est restée sur une autre valeur, est
 * renvoyé vers un domaine où il n'était pas (le symptôme classique : retour
 * sur `localhost:3000`). Les déploiements de prévisualisation, dont l'URL
 * change à chaque commit, ne peuvent de toute façon pas être couverts par une
 * variable fixe.
 *
 * L'origine est donc lue sur la requête — mais uniquement si l'hôte figure
 * dans une liste blanche. L'en-tête `Host` est en principe contrôlable par le
 * client : sans ce filtre, on pourrait détourner l'URL de retour OAuth vers
 * un domaine tiers.
 */
export async function requestSiteUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host && isTrustedHost(host)) {
      const bare = host.toLowerCase().split(":")[0];
      const local = bare === "localhost" || bare === "127.0.0.1";
      // Hors développement, on force `https` au lieu de faire confiance à
      // `x-forwarded-proto` : un en-tête injecté ne doit pas pouvoir
      // rétrograder en clair une URL de retour OAuth ou de paiement.
      const proto = local ? (h.get("x-forwarded-proto") ?? "http") : "https";
      return `${proto}://${host}`;
    }
  } catch (error) {
    // Next.js lève une exception INTERNE depuis `headers()` pour signaler que
    // la route doit devenir dynamique : il faut la relancer, sinon on casse
    // la détection statique/dynamique du framework.
    unstable_rethrow(error);
    // Vrai échec : appelé hors contexte de requête. On retombe sur l'URL
    // canonique.
  }
  return siteUrl();
}

/**
 * Hôtes acceptés comme origine de retour :
 *   • localhost / 127.0.0.1 (développement) ;
 *   • le domaine de NEXT_PUBLIC_SITE_URL (production) ;
 *   • le domaine de production Vercel ;
 *   • tout sous-domaine `.vercel.app` (prévisualisations, dont l'URL est
 *     imprévisible par nature — Vercel valide déjà l'en-tête Host contre les
 *     domaines du déploiement).
 * Tout le reste est refusé.
 */
function isTrustedHost(host: string): boolean {
  const bare = host.toLowerCase().split(":")[0];

  if (bare === "localhost" || bare === "127.0.0.1") return true;
  if (bare === "vercel.app" || bare.endsWith(".vercel.app")) return true;

  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      if (new URL(configured).hostname.toLowerCase() === bare) return true;
    } catch {
      // Variable malformée : on l'ignore plutôt que de tout refuser.
    }
  }

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.toLowerCase();
  if (production && production.split(":")[0] === bare) return true;

  return false;
}
