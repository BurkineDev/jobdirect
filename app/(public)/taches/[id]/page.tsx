import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveTask } from "@/lib/queries";
import { formatBudget, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { ApplicationForm } from "@/components/forms/ApplicationForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const task = await getActiveTask(id);
  return { title: task ? task.title : "Tâche introuvable" };
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await getActiveTask(id);
  if (!task) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/taches"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-brand-600"
      >
        ← Retour aux tâches
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Détails */}
        <article>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="bg-brand-50 text-brand-700 ring-brand-200">
              {task.category}
            </Badge>
            <Badge tone="bg-green-100 text-green-800 ring-green-200">
              Active
            </Badge>
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
            {task.title}
          </h1>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-gray-500">Ville</dt>
              <dd className="mt-1 font-semibold text-ink">{task.city}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">
                Date souhaitée
              </dt>
              <dd className="mt-1 font-semibold text-ink">
                {formatDate(task.desired_date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">
                Budget estimé
              </dt>
              <dd className="mt-1 font-semibold text-brand-600">
                {formatBudget(task.budget_estimate)}
              </dd>
            </div>
          </dl>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Description</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-gray-700">
              {task.description}
            </p>
          </div>
        </article>

        {/* Candidature */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">
              Je suis disponible pour cette tâche
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Laissez vos coordonnées : le demandeur ou notre équipe vous
              contactera.
            </p>
            <div className="mt-5">
              <ApplicationForm taskId={task.id} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
