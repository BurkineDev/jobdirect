import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CATEGORIES } from "@/lib/constants";
import Link from "next/link";

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

export default function HomePage() {
  return (
    <>
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
            <p className="mt-4 text-sm text-gray-500">
              Gratuit · Sans engagement ·{" "}
              <Link href="/taches" className="font-medium text-brand-600 hover:underline">
                Voir les tâches actives
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
