import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CATEGORIES } from "@/lib/constants";
import Link from "next/link";
import {
  SEO_CATEGORIES,
  categoryCopy,
  jsonLd,
  servicePath,
  slugify,
} from "@/lib/seo";
import { getMarketSnapshot } from "@/lib/market";
import { siteUrl } from "@/lib/site";

/**
 * Les six plus grandes villes desservies : elles concentrent l'essentiel de
 * la demande et reçoivent donc les liens de la page la plus « forte » du site.
 */
const HERO_CITIES = [
  "Montréal",
  "Québec",
  "Laval",
  "Longueuil",
  "Gatineau",
  "Sherbrooke",
] as const;

const STEPS = [
  {
    title: "Publiez votre tâche",
    text: "Décrivez ce dont vous avez besoin, où et quand. Gratuit et en moins de 2 minutes.",
  },
  {
    title: "Recevez des disponibilités",
    text: "Des travailleurs de votre région se montrent disponibles pour votre tâche.",
  },
  {
    title: "Choisissez et c'est réglé",
    text: "Notre équipe vous met en relation avec la bonne personne, près de chez vous.",
  },
];

export default async function HomePage() {
  const market = await getMarketSnapshot();
  const base = siteUrl();

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "JobDirect",
    url: base,
    logo: `${base}/icons/icon-512.png`,
    description:
      "Plateforme québécoise de mise en relation entre particuliers et travailleurs journaliers pour des tâches ponctuelles.",
    areaServed: { "@type": "AdministrativeArea", name: "Québec, Canada" },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "JobDirect",
    url: base,
    inLanguage: "fr-CA",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/taches?city={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(website) }}
      />

      {/* HERO */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <Badge tone="bg-brand-100 text-brand-800 ring-brand-200">
              Local · Québec
            </Badge>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
              Publiez une tâche.{" "}
              <span className="text-brand-500">
                Trouvez une personne disponible
              </span>{" "}
              près de chez vous.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-gray-600">
              JobDirect connecte les employeurs et particuliers du Québec avec
              des travailleurs journaliers prêts à donner un coup de main —
              déménagement, ménage, manutention et bien plus.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/publier" size="lg" className="sm:w-auto">
                Publier une tâche
              </ButtonLink>
              <ButtonLink
                href="/travailleur"
                size="lg"
                variant="secondary"
                className="sm:w-auto"
              >
                Je cherche du travail
              </ButtonLink>
            </div>
            {/* Preuve de liquidité : de vrais compteurs, affichés seulement
                s'ils sont flatteurs. Un « 0 personne inscrite » ferait plus de
                mal que son absence. */}
            {(market.totalWorkers > 0 || market.totalTasks > 0) && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {market.totalWorkers > 0 && (
                  <Badge tone="bg-green-100 text-green-800 ring-green-200">
                    {market.totalWorkers} personne
                    {market.totalWorkers > 1 ? "s" : ""} disponible
                    {market.totalWorkers > 1 ? "s" : ""} au Québec
                  </Badge>
                )}
                {market.totalTasks > 0 && (
                  <Badge tone="bg-brand-100 text-brand-800 ring-brand-200">
                    {market.totalTasks} tâche
                    {market.totalTasks > 1 ? "s" : ""} ouverte
                    {market.totalTasks > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            )}

            <p className="mt-4 text-sm text-gray-500">
              Gratuit · Sans engagement ·{" "}
              <Link
                href="/embaucher"
                className="font-medium text-brand-600 hover:underline"
              >
                Voir les travailleurs disponibles
              </Link>
            </p>
          </div>

          {/* Aperçu décoratif d'une tâche */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="rotate-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-ink">
                    Aide au déménagement (2 h)
                  </h3>
                  <p className="text-sm text-gray-500">Montréal · Déménagement</p>
                </div>
                <Badge tone="bg-green-100 text-green-800 ring-green-200">
                  Active
                </Badge>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                Besoin d&apos;une personne pour charger un camion, 3e étage sans
                ascenseur. Matériel fourni.
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-brand-600">
                  ~ 80 $
                </span>
                <span className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white">
                  Je suis disponible
                </span>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 -z-10 h-24 w-24 rounded-full bg-brand-200/60 blur-2xl" />
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight text-ink">
          Comment ça marche
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-gray-200 bg-white p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">
                {i + 1}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-gray-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATÉGORIES */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight text-ink">
            Catégories populaires
          </h2>
          <p className="mt-2 text-gray-600">
            Parcourez les tâches par type de service.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {CATEGORIES.map((category) => (
              <Link
                key={category}
                href={`/taches?category=${encodeURIComponent(category)}`}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES PAR VILLE — maillage interne vers les pages qui se classent */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-ink">
              Nos services près de chez vous
            </h2>
            <p className="mt-2 text-gray-600">
              Choisissez votre ville et le type d&apos;aide dont vous avez
              besoin.
            </p>
          </div>
          <Link
            href="/services"
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Toutes les villes →
          </Link>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {HERO_CITIES.map((city) => {
            const workers = market.workersByCity[city] ?? 0;
            return (
              <div
                key={city}
                className="rounded-2xl border border-gray-200 bg-white p-6"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-ink">{city}</h3>
                  {workers > 0 && (
                    <span className="text-xs font-medium text-green-700">
                      {workers} dispo
                    </span>
                  )}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {SEO_CATEGORIES.slice(0, 5).map((category) => (
                    <li key={category}>
                      <Link
                        href={servicePath(
                          `${slugify(category)}-${slugify(city)}`,
                        )}
                        className="text-sm text-gray-600 hover:text-brand-600 hover:underline"
                      >
                        {categoryCopy(category).h1} à {city}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* DOUBLE APPEL À L'ACTION */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-brand-500 p-8 text-white">
            <h3 className="text-2xl font-bold">Vous avez une tâche à faire ?</h3>
            <p className="mt-2 text-brand-50">
              Publiez gratuitement et recevez rapidement des disponibilités de
              gens près de chez vous.
            </p>
            <ButtonLink
              href="/publier"
              size="lg"
              variant="secondary"
              className="mt-6"
            >
              Publier une tâche
            </ButtonLink>
            <p className="mt-4 text-sm text-brand-50">
              ou{" "}
              <Link href="/embaucher" className="font-semibold underline">
                choisissez directement un travailleur
              </Link>
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <h3 className="text-2xl font-bold text-ink">
              Vous cherchez du travail ?
            </h3>
            <p className="mt-2 text-gray-600">
              Inscrivez-vous pour découvrir des opportunités ponctuelles et
              postuler en un clic.
            </p>
            <ButtonLink href="/travailleur" size="lg" className="mt-6">
              Je cherche du travail
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
