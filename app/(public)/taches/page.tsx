import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getActiveTasks } from "@/lib/queries";
import { TaskCard } from "@/components/TaskCard";
import { TaskFilters } from "@/components/TaskFilters";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Tâches disponibles",
  description: "Parcourez les tâches ponctuelles disponibles près de chez vous.",
};

// Données fraîches à chaque visite (liste alimentée par la base).
export const dynamic = "force-dynamic";

export default async function TachesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; category?: string }>;
}) {
  const { city, category } = await searchParams;
  const tasks = await getActiveTasks({ city, category });

  // Filtres actifs + lien pour retirer chacun (en conservant l'autre).
  const activeFilters = [
    category && {
      label: `Catégorie : ${category}`,
      href: city ? `/taches?city=${encodeURIComponent(city)}` : "/taches",
    },
    city && {
      label: `Ville : ${city}`,
      href: category
        ? `/taches?category=${encodeURIComponent(category)}`
        : "/taches",
    },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Tâches disponibles
        </h1>
        <p className="mt-2 text-gray-600">
          {tasks.length > 0
            ? `${tasks.length} tâche${tasks.length > 1 ? "s" : ""} active${
                tasks.length > 1 ? "s" : ""
              }`
            : "Aucune tâche pour ces critères pour le moment."}
        </p>

        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Filtres actifs :</span>
            {activeFilters.map((f) => (
              <Link
                key={f.label}
                href={f.href}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-100"
              >
                {f.label}
                <span aria-hidden="true">✕</span>
              </Link>
            ))}
          </div>
        )}
      </header>

      <Suspense fallback={<div className="h-24" />}>
        <TaskFilters />
      </Suspense>

      {tasks.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-600">
            Aucune tâche ne correspond à votre recherche.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Essayez d&apos;élargir vos filtres ou revenez bientôt.
          </p>
          <ButtonLink href="/publier" variant="secondary" className="mt-6">
            Publier une tâche
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
