import type { Metadata } from "next";
import { Suspense } from "react";
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
