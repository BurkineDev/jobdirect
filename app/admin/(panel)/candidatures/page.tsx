import Link from "next/link";
import { getAllApplications } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { APPLICATION_STATUS_META } from "@/lib/constants";
import { ApplicationStatusSelect } from "@/components/admin/ApplicationStatusSelect";

export default async function AdminApplicationsPage() {
  const applications = await getAllApplications();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Candidatures</h1>
        <p className="text-sm text-gray-500">
          {applications.length} candidature
          {applications.length > 1 ? "s" : ""} reçue
          {applications.length > 1 ? "s" : ""}.
        </p>
      </div>

      {applications.length > 0 ? (
        <div className="space-y-4">
          {applications.map((app) => {
            const meta = APPLICATION_STATUS_META[app.status];
            return (
              <div
                key={app.id}
                className="rounded-2xl border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{app.name}</h3>
                      <Badge tone={meta.badge}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Pour :{" "}
                      {app.task ? (
                        <Link
                          href={`/taches/${app.task.id}`}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          {app.task.title}
                        </Link>
                      ) : (
                        <span className="italic">tâche supprimée</span>
                      )}
                      {app.task && (
                        <span className="text-gray-400">
                          {" "}
                          · {app.task.city} · {app.task.category}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {formatDateTime(app.created_at)}
                    </span>
                    <ApplicationStatusSelect
                      applicationId={app.id}
                      status={app.status}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
                  {app.worker_id && (
                    <span className="text-xs text-gray-400">
                      (travailleur inscrit)
                    </span>
                  )}
                </div>

                {app.message && (
                  <p className="mt-3 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                    {app.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          Aucune candidature pour le moment.
        </div>
      )}
    </div>
  );
}
