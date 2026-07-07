import { getMyTasksWithApplications } from "@/lib/queries";
import { TASK_STATUS_META, APPLICATION_STATUS_META } from "@/lib/constants";
import { formatBudget, formatDate, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

export async function EmployerDashboard({ userId }: { userId: string }) {
  const tasks = await getMyTasksWithApplications(userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-ink">Mes tâches publiées</h2>
        <ButtonLink href="/publier" size="sm">
          Publier une tâche
        </ButtonLink>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-600">Vous n&apos;avez pas encore publié de tâche.</p>
          <ButtonLink href="/publier" variant="secondary" className="mt-6">
            Publier ma première tâche
          </ButtonLink>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const meta = TASK_STATUS_META[task.status];
            return (
              <div
                key={task.id}
                className="rounded-2xl border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{task.title}</h3>
                      <Badge tone={meta.badge}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {task.city} · {task.category} · {formatDate(task.desired_date)}{" "}
                      · {formatBudget(task.budget_estimate)}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {task.applications.length} candidature
                    {task.applications.length > 1 ? "s" : ""}
                  </span>
                </div>

                {task.applications.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                    <p className="text-xs font-medium uppercase text-gray-400">
                      Candidatures reçues
                    </p>
                    {task.applications.map((app) => {
                      const am = APPLICATION_STATUS_META[app.status];
                      return (
                        <div
                          key={app.id}
                          className="rounded-lg bg-gray-50 p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-ink">{app.name}</span>
                            <Badge tone={am.badge}>{am.label}</Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
                            <a
                              href={`tel:${app.phone}`}
                              className="text-brand-600 hover:underline"
                            >
                              {app.phone}
                            </a>
                            <a
                              href={`mailto:${app.email}`}
                              className="text-brand-600 hover:underline"
                            >
                              {app.email}
                            </a>
                          </div>
                          {app.message && (
                            <p className="mt-1 whitespace-pre-line text-gray-600">
                              {app.message}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-400">
                            {formatDateTime(app.created_at)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Les statuts des tâches sont gérés par l&apos;équipe JobDirect après
        validation.
      </p>
    </div>
  );
}
