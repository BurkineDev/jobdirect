import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicWorkers } from "@/lib/queries";
import { WorkerProfileCard } from "@/components/WorkerProfileCard";
import { WorkerFilters } from "@/components/WorkerFilters";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Travailleurs disponibles",
  description:
    "Parcourez les travailleurs disponibles près de chez vous et demandez à être mis en relation.",
};

export const dynamic = "force-dynamic";

export default async function EmbaucherPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;
  const workers = await getPublicWorkers({ city });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Travailleurs disponibles
        </h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Parcourez les profils, puis demandez à être mis en relation avec la
          personne de votre choix. Notre équipe s&apos;occupe du contact.
        </p>
      </header>

      <Suspense fallback={<div className="h-24" />}>
        <WorkerFilters />
      </Suspense>

      {workers.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {workers.map((worker) => (
            <WorkerProfileCard key={worker.id} worker={worker} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-600">
            Aucun travailleur disponible pour ces critères pour le moment.
          </p>
          <ButtonLink href="/publier" variant="secondary" className="mt-6">
            Publier une tâche
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
