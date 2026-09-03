import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Indique aux robots ce qu'ils peuvent explorer.
 *
 * On ouvre tout le catalogue public (c'est le canal d'acquisition), et on
 * ferme trois familles d'URL :
 *   • les espaces authentifiés (/admin, /mon-compte) — inutile à indexer, et
 *     leur présence dans Google inviterait aux tentatives de connexion ;
 *   • les routes techniques (/api, /auth) ;
 *   • les pages de remerciement, qui n'ont aucun sens hors parcours et
 *     feraient de mauvais résultats de recherche.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/mon-compte",
        "/api/",
        "/auth/",
        "/offline",
        "/merci-paiement",
        "/embaucher/merci",
        "/mot-de-passe-oublie",
        "/nouveau-mot-de-passe",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
