import type { Metadata } from "next";
import Link from "next/link";
import {
  SEO_CATEGORIES,
  SEO_CITIES,
  categoryCopy,
  jsonLd,
  servicePath,
  slugify,
} from "@/lib/seo";
import { getMarketSnapshot } from "@/lib/market";
import { siteUrl } from "@/lib/site";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Plan des services — le hub de maillage interne.
 *
 * Sans cette page, les 126 pages « service × ville » ne seraient reliées
 * qu'entre elles et par le sitemap : Google les découvrirait lentement et leur
 * accorderait peu d'autorité. Ici, chacune est à un seul clic de l'accueil.
 */

export const metadata: Metadata = {
  title: "Tous les services, ville par ville",
  description:
    "Déménagement, ménage, manutention, peinture, aménagement paysager… Trouvez de l'aide ponctuelle dans votre ville au Québec.",
  alternates: { canonical: `${siteUrl()}/services` },
};

export default async function ServicesIndexPage() {
  const market = await getMarketSnapshot();
  const base = siteUrl();

  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tous les services JobDirect, ville par ville",
    url: `${base}/services`,
    isPartOf: { "@type": "WebSite", name: "JobDirect", url: base },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(collection) }}
      />

      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
            Tous les services, <span className="text-brand-500">ville par ville</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-600">
            {market.totalWorkers > 0
              ? `${market.totalWorkers} personne${market.totalWorkers > 1 ? "s" : ""} inscrite${market.totalWorkers > 1 ? "s" : ""} partout au Québec.`
              : "Partout au Québec."}{" "}
            Choisissez votre service et votre ville — la publication d&apos;une
            tâche est toujours gratuite.
          </p>
          <div className="mt-8">
            <ButtonLink href="/publier" size="lg">
              Publier une tâche
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-14">
        {SEO_CATEGORIES.map((category) => {
          const copy = categoryCopy(category);
          return (
            <section key={category}>
              <h2 className="text-2xl font-bold tracking-tight text-ink">
                {copy.h1}
              </h2>
              <p className="mt-1 text-gray-600">
                Disponible dans {SEO_CITIES.length} villes du Québec.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SEO_CITIES.map((city) => {
                  const count =
                    market.tasksByCityCategory[`${city}|${category}`] ?? 0;
                  return (
                    <Link
                      key={city}
                      href={servicePath(
                        `${slugify(category)}-${slugify(city)}`,
                      )}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {city}
                      {count > 0 && (
                        <span className="rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
