import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  categoryCopy,
  deElided,
  findServicePage,
  jsonLd,
  servicePagesInCategory,
  servicePagesInCity,
  servicePath,
} from "@/lib/seo";
import { getMarketSnapshot, getServiceTasks, medianBudget } from "@/lib/market";
import { siteUrl } from "@/lib/site";
import { formatBudget } from "@/lib/format";
import { TaskCard } from "@/components/TaskCard";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/**
 * Page d'atterrissage « service × ville » — l'actif SEO du site.
 *
 * Elle répond à la requête réelle d'un particulier (« aide déménagement
 * Laval ») plutôt qu'au vocabulaire de la plateforme. Pour ne pas être une
 * page satellite creuse (que Google déclasse), chacune contient des données
 * VRAIES et propres à ce couple : tâches actives du moment, nombre de
 * personnes disponibles dans la ville, budget médian observé — plus un
 * maillage vers les pages sœurs.
 *
 * Les lectures passent par `lib/market` (client anon sans cookie, mis en
 * cache 5 min et rafraîchi par le tag « market » dès qu'une tâche est
 * activée), de sorte que 126 pages ne coûtent pas 126 requêtes par visite.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = findServicePage(slug);
  if (!page) return { title: "Service introuvable" };

  const copy = categoryCopy(page.category);
  const title = `${copy.h1} à ${page.city}`;
  const description = `Besoin ${deElided(copy.searchTerm)} à ${page.city} ? Publiez votre tâche gratuitement sur JobDirect et recevez des personnes disponibles près de chez vous, souvent le jour même.`;
  const url = `${siteUrl()}${servicePath(slug)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} · JobDirect`,
      description,
      url,
      locale: "fr_CA",
      type: "website",
    },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = findServicePage(slug);
  if (!page) notFound();

  const { city, category } = page;
  const copy = categoryCopy(category);
  const [tasks, market] = await Promise.all([
    getServiceTasks(city, category),
    getMarketSnapshot(),
  ]);

  const workerCount = market.workersByCity[city] ?? 0;
  const cityTaskCount = market.tasksByCity[city] ?? 0;
  const median = medianBudget(tasks);

  const siblingsInCity = servicePagesInCity(city).filter(
    (p) => p.category !== category,
  );
  const siblingsInCategory = servicePagesInCategory(category).filter(
    (p) => p.city !== city,
  );

  const base = siteUrl();
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: base },
      {
        "@type": "ListItem",
        position: 2,
        name: "Services",
        item: `${base}/services`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${copy.h1} à ${city}`,
        item: `${base}${servicePath(slug)}`,
      },
    ],
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${copy.h1} à ${city}`,
    serviceType: category,
    description: `Mise en relation avec des travailleurs disponibles pour ${copy.searchTerm} à ${city}, au Québec.`,
    areaServed: {
      "@type": "City",
      name: city,
      containedInPlace: { "@type": "AdministrativeArea", name: "Québec" },
    },
    provider: {
      "@type": "Organization",
      name: "JobDirect",
      url: base,
    },
    ...(median != null && {
      offers: {
        "@type": "Offer",
        priceCurrency: "CAD",
        price: median,
        description: "Budget médian des tâches publiées dans cette catégorie.",
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(serviceSchema) }}
      />

      {/* EN-TÊTE */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <nav aria-label="Fil d'Ariane" className="text-sm text-gray-500">
            <Link href="/" className="hover:text-brand-600">
              Accueil
            </Link>
            <span className="mx-1.5">/</span>
            <Link href="/services" className="hover:text-brand-600">
              Services
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-gray-700">{category}</span>
          </nav>

          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
            {copy.h1} à <span className="text-brand-500">{city}</span>
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-gray-600">
            Publiez votre besoin {deElided(copy.searchTerm)} à {city} —
            gratuitement et en moins de deux minutes. Nous vous mettons en relation avec une
            personne disponible dans votre secteur.
          </p>

          {/* Signaux de liquidité : de vrais chiffres, jamais d'estimation. */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {workerCount > 0 && (
              <Badge tone="bg-green-100 text-green-800 ring-green-200">
                {workerCount} personne{workerCount > 1 ? "s" : ""} inscrite
                {workerCount > 1 ? "s" : ""} à {city}
              </Badge>
            )}
            {cityTaskCount > 0 && (
              <Badge tone="bg-brand-100 text-brand-800 ring-brand-200">
                {cityTaskCount} tâche{cityTaskCount > 1 ? "s" : ""} active
                {cityTaskCount > 1 ? "s" : ""} à {city}
              </Badge>
            )}
            {median != null && (
              <Badge tone="bg-gray-100 text-gray-700 ring-gray-200">
                Budget médian observé : {formatBudget(median)}
              </Badge>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href={`/publier?city=${encodeURIComponent(city)}&category=${encodeURIComponent(category)}`}
              size="lg"
              className="sm:w-auto"
            >
              Publier ma tâche gratuitement
            </ButtonLink>
            <ButtonLink
              href={`/embaucher?city=${encodeURIComponent(city)}`}
              size="lg"
              variant="secondary"
              className="sm:w-auto"
            >
              Voir les personnes disponibles
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* CE QUE COUVRE LE SERVICE */}
      {copy.examples.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            {copy.h1} à {city} : ce que vous pouvez demander
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {copy.examples.map((example) => (
              <li
                key={example}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700"
                >
                  ✓
                </span>
                <span className="text-gray-700">{example}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-gray-600">
            Votre besoin ne figure pas dans la liste ? Décrivez-le quand même :
            la plupart des tâches de {category.toLowerCase()} à {city} se
            règlent en quelques heures avec un simple coup de main.
          </p>
        </section>
      )}

      {/* TÂCHES ACTIVES DU MOMENT */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            {tasks.length > 0
              ? `Tâches de ${category.toLowerCase()} à ${city} en ce moment`
              : `Vous cherchez du travail en ${category.toLowerCase()} à ${city} ?`}
          </h2>

          {tasks.length > 0 ? (
            <>
              <p className="mt-2 text-gray-600">
                {tasks.length} tâche{tasks.length > 1 ? "s" : ""} ouverte
                {tasks.length > 1 ? "s" : ""} — postulez en un clic, sans
                compte.
              </p>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
              <div className="mt-8">
                <ButtonLink
                  href={`/taches?city=${encodeURIComponent(city)}&category=${encodeURIComponent(category)}`}
                  variant="secondary"
                >
                  Voir toutes les tâches à {city}
                </ButtonLink>
              </div>
            </>
          ) : (
            /* État vide qui convertit : on ne dit pas « rien ici », on
               propose l'action utile aux deux faces du marché. */
            <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8">
              <p className="max-w-2xl text-gray-600">
                Aucune tâche de {category.toLowerCase()} n&apos;est ouverte à{" "}
                {city} à l&apos;instant. Inscrivez-vous pour être prévenu dès
                qu&apos;une tâche est publiée dans votre secteur — c&apos;est
                gratuit et ça prend deux minutes.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <ButtonLink
                  href={`/travailleur?city=${encodeURIComponent(city)}`}
                >
                  Je cherche du travail à {city}
                </ButtonLink>
                <ButtonLink href="/taches" variant="secondary">
                  Parcourir toutes les tâches
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Comment ça marche à {city}
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              t: "Décrivez votre tâche",
              d: `Le type de travail, votre secteur de ${city}, la date et un budget approximatif. Gratuit, sans engagement.`,
            },
            {
              t: "Recevez des disponibilités",
              d: "Les personnes inscrites dans votre région se déclarent disponibles pour votre tâche.",
            },
            {
              t: "On vous met en contact",
              d: "Nous validons et vous mettons en relation avec la bonne personne. Vous vous entendez directement sur place.",
            },
          ].map((step, i) => (
            <li
              key={step.t}
              className="rounded-2xl border border-gray-200 bg-white p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">
                {i + 1}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">{step.t}</h3>
              <p className="mt-2 text-gray-600">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* MAILLAGE INTERNE */}
      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-14">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">
              Autres services à {city}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {siblingsInCity.map((p) => (
                <Link
                  key={p.slug}
                  href={servicePath(p.slug)}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {categoryCopy(p.category).h1} à {city}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">
              {copy.h1} ailleurs au Québec
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {siblingsInCategory.map((p) => (
                <Link
                  key={p.slug}
                  href={servicePath(p.slug)}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {p.city}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
