import Link from "next/link";
import {
  getAllTasks,
  getDashboardStats,
  getNotesByTask,
} from "@/lib/queries";
import {
  TASK_STATUSES,
  TASK_STATUS_META,
  type TaskStatus,
} from "@/lib/constants";
import { StatCard } from "@/components/admin/StatCard";
import { AdminTaskCard } from "@/components/admin/AdminTaskCard";

function isStatus(value: string | undefined): value is TaskStatus {
  return !!value && (TASK_STATUSES as readonly string[]).includes(value);
}

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [stats, tasks, notesByTask] = await Promise.all([
    getDashboardStats(),
    getAllTasks(),
    getNotesByTask(),
  ]);

  const filter = isStatus(status) ? status : null;
  const visibleTasks = filter
    ? tasks.filter((t) => t.status === filter)
    : tasks;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Tableau de bord</h1>
        <p className="text-sm text-gray-500">
          Gérez les tâches, validez les publications et suivez l&apos;activité.
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Tâches totales" value={stats.totalTasks} />
        <StatCard label="En attente" value={stats.pendingTasks} accent />
        <StatCard label="Actives" value={stats.activeTasks} />
        <StatCard label="Travailleurs" value={stats.totalWorkers} />
        <StatCard label="Candidatures" value={stats.totalApplications} />
      </div>

      {/* Filtres par statut */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin"
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            !filter
              ? "bg-brand-500 text-white"
              : "bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
          }`}
        >
          Toutes ({tasks.length})
        </Link>
        {TASK_STATUSES.map((s) => {
          const count = tasks.filter((t) => t.status === s).length;
          return (
            <Link
              key={s}
              href={`/admin?status=${s}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                filter === s
                  ? "bg-brand-500 text-white"
                  : "bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {TASK_STATUS_META[s].label} ({count})
            </Link>
          );
        })}
      </div>

      {/* Liste des tâches */}
      {visibleTasks.length > 0 ? (
        <div className="space-y-4">
          {visibleTasks.map((task) => (
            <AdminTaskCard
              key={task.id}
              task={task}
              notes={notesByTask.get(task.id) ?? []}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          Aucune tâche {filter ? `« ${TASK_STATUS_META[filter].label} »` : ""}{" "}
          pour le moment.
        </div>
      )}
    </div>
  );
}
