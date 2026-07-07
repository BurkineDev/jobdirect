import { getMyApplications } from "@/lib/queries";
import { APPLICATION_STATUS_META, TASK_STATUS_META } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ProfileForm } from "./ProfileForm";
import type { SessionProfile } from "@/lib/types";

export async function WorkerDashboard({ profile }: { profile: SessionProfile }) {
  const applications = await getMyApplications(profile.id);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* Mes candidatures */}
      <section className="order-2 lg:order-1">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-ink">Mes candidatures</h2>
          <ButtonLink href="/taches" size="sm">
            Parcourir les tâches
          </ButtonLink>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-gray-600">
              Vous n&apos;avez pas encore postulé à une tâche.
            </p>
            <ButtonLink href="/taches" variant="secondary" className="mt-6">
              Voir les tâches disponibles
            </ButtonLink>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const am = APPLICATION_STATUS_META[app.status];
              return (
                <div
                  key={app.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink">
                      {app.task ? app.task.title : "Tâche retirée"}
                    </h3>
                    <Badge tone={am.badge}>{am.label}</Badge>
                  </div>
                  {app.task && (
                    <p className="mt-1 text-sm text-gray-500">
                      {app.task.city} · {app.task.category} ·{" "}
                      {TASK_STATUS_META[app.task.status]?.label ?? app.task.status}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    Postulé le {formatDateTime(app.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Mon profil */}
      <aside className="order-1 lg:order-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold text-ink">Mon profil</h2>
          <p className="mt-1 text-sm text-gray-600">
            Ces informations aident à vous proposer les bonnes tâches.
          </p>
          <div className="mt-5">
            <ProfileForm profile={profile} />
          </div>
        </div>
      </aside>
    </div>
  );
}
