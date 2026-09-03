import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { getIndexableTasks } from "@/lib/market";
import { SEO_CITIES, SERVICE_PAGES } from "@/lib/seo";

/**
 * Sitemap complet : pages fixes + pages « service × ville » + tâches actives.
 *
 * Les priorités reflètent l'intention commerciale plutôt que la hiérarchie du
 * site : les pages « service × ville » sont le vrai actif SEO (elles captent
 * « aide déménagement Laval »), donc elles passent avant la page d'accueil des
 * tâches. Les fiches de tâches changent tous les jours, d'où `daily`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${base}/publier`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/travailleur`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/taches`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/embaucher`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/services`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/inscription`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${base}/connexion`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${base}/confidentialite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // Le cœur du SEO local : une URL par couple (service, ville).
  const servicePages: MetadataRoute.Sitemap = SERVICE_PAGES.map((page) => ({
    url: `${base}/services/${page.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // Répertoire des travailleurs, filtré par ville.
  const workerCityPages: MetadataRoute.Sitemap = SEO_CITIES.map((city) => ({
    url: `${base}/embaucher?city=${encodeURIComponent(city)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Tâches actives : le contenu frais qui donne au site sa fréquence de crawl.
  let taskPages: MetadataRoute.Sitemap = [];
  try {
    const tasks = await getIndexableTasks();
    taskPages = tasks.map((task) => ({
      url: `${base}/taches/${task.id}`,
      lastModified: new Date(task.created_at),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
  } catch (error) {
    // Un sitemap partiel vaut infiniment mieux qu'un sitemap en erreur 500 :
    // Google réessaiera, et les pages fixes restent découvrables.
    console.error("sitemap: tâches indisponibles", error);
  }

  return [...staticPages, ...servicePages, ...workerCityPages, ...taskPages];
}

/** Le sitemap est régénéré au plus une fois par heure. */
export const revalidate = 3600;
