import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicWorker } from "@/lib/queries";
import { Badge } from "@/components/ui/Badge";
import { HireRequestForm } from "@/components/forms/HireRequestForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const worker = await getPublicWorker(id);
  return { title: worker ? `${worker.display_name} · ${worker.city}` : "Profil" };
}

export default async function WorkerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const worker = await getPublicWorker(id);
  if (!worker) notFound();

  const initial = worker.display_name.charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/embaucher"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-brand-600"
      >
        ← Retour aux travailleurs
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Profil */}
        <article>
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
              {initial}
            </span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">
                {worker.display_name}
              </h1>
              <p className="text-gray-500">{worker.city}</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <h2 className="text-sm font-semibold uppercase text-gray-400">
                Compétences
              </h2>
              <p className="mt-1 whitespace-pre-line text-gray-700">
                {worker.skills}
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase text-gray-400">
                Disponibilités
              </h2>
              <p className="mt-1 text-gray-700">{worker.availability}</p>
            </div>
            {worker.experience && (
              <div>
                <h2 className="text-sm font-semibold uppercase text-gray-400">
                  Expérience
                </h2>
                <p className="mt-1 whitespace-pre-line text-gray-700">
                  {worker.experience}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <Badge tone="bg-green-100 text-green-800 ring-green-200">
              Disponible
            </Badge>
          </div>
        </article>

        {/* Demande de mise en relation */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">
              Demander {worker.display_name}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Laissez vos coordonnées : notre équipe vous met en contact
              rapidement pour organiser la tâche.
            </p>
            <div className="mt-5">
              <HireRequestForm
                workerId={worker.id}
                workerName={worker.display_name}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
