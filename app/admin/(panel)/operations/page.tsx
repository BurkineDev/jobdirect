import Link from "next/link";
import {
  getAllTasks,
  getCommissions,
  getConnectionRequests,
  getWorkerPool,
} from "@/lib/queries";
import { suggestMatches } from "@/lib/matching";
import { formatBudget, formatDate, formatDateTime } from "@/lib/format";
import { CONNECTION_REQUEST_STATUS_META } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/admin/StatCard";
import { ActivateTaskButton } from "@/components/admin/ActivateTaskButton";
import { TaskStatusSelect } from "@/components/admin/TaskStatusSelect";
import { CommissionRow } from "@/components/admin/CommissionRow";
import { ConnectionRequestStatusSelect } from "@/components/admin/ConnectionRequestStatusSelect";

export default async function AdminOperationsPage() {
  const [tasks, pool, commissions, requests] = await Promise.all([
    getAllTasks(),
    getWorkerPool(),
    getCommissions(),
    getConnectionRequests(),
  ]);

  const pending = tasks.filter((t) => t.status === "pending");
  const active = tasks.filter((t) => t.status === "active");
  const toCollect = commissions.filter((c) => c.status === "pending");
  const collected = commissions.filter((c) => c.status === "paid");
  const totalToCollect = toCollect.reduce((s, c) => s + Number(c.amount), 0);
  const totalCollected = collected.reduce((s, c) => s + Number(c.amount), 0);
  const newRequests = requests.filter((r) => r.status === "new");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-ink">Opérations</h1>
        <p className="text-sm text-gray-500">
          Le circuit des premiers revenus : valider → mettre en relation →
          assigner → encaisser la commission (Interac).
        </p>
      </div>

      {/* Vue d'ensemble */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="À valider" value={pending.length} accent={pending.length > 0} />
        <StatCard label="Actives (à matcher)" value={active.length} />
        <StatCard
          label="À encaisser"
          value={`${totalToCollect.toFixed(2)} $`}
          accent={toCollect.length > 0}
        />
        <StatCard label="Encaissé au total" value={`${totalCollected.toFixed(2)} $`} />
      </div>

      {/* 0. Demandes de mise en relation (leads chauds : un client veut CETTE personne) */}
      {requests.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-ink">
            ⭐ Demandes de mise en relation{" "}
            <span className="font-normal text-gray-400">
              ({newRequests.length} nouvelle{newRequests.length > 1 ? "s" : ""})
            </span>
          </h2>
          {requests.map((r) => {
            const meta = CONNECTION_REQUEST_STATUS_META[r.status];
            return (
              <div
                key={r.id}
                className="rounded-xl border border-brand-200 bg-brand-50/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">
                      {r.client_name}{" "}
                      <span className="font-normal text-gray-500">
                        veut embaucher
                      </span>{" "}
                      {r.worker_name ?? "un travailleur"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
                      <a
                        href={`tel:${r.client_phone}`}
                        className="text-brand-600 hover:underline"
                      >
                        {r.client_phone}
                      </a>
                      <a
                        href={`mailto:${r.client_email}`}
                        className="text-brand-600 hover:underline"
                      >
                        {r.client_email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={meta.badge}>{meta.label}</Badge>
                    <ConnectionRequestStatusSelect
                      requestId={r.id}
                      status={r.status}
                    />
                  </div>
                </div>
                {r.need && (
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-white p-3 text-sm text-gray-700">
                    {r.need}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {formatDateTime(r.created_at)}
                </p>
              </div>
            );
          })}
          <p className="text-xs text-gray-400">
            Contactez le client, mettez-le en relation avec le travailleur
            (dont vous avez les coordonnées côté admin), puis facturez la
            commission.
          </p>
        </section>
      )}

      {/* 1. File de validation */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink">
          1 · Tâches à valider{" "}
          <span className="font-normal text-gray-400">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
            Rien à valider. Publiez de nouvelles tâches via votre réseau (voir{" "}
            <code className="rounded bg-gray-100 px-1">MARKETING.md</code>).
          </p>
        ) : (
          pending.map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{task.title}</p>
                <p className="text-sm text-gray-500">
                  {task.city} · {task.category} · {formatDate(task.desired_date)} ·{" "}
                  {formatBudget(task.budget_estimate)} — {task.contact_name},{" "}
                  <a
                    href={`tel:${task.contact_phone}`}
                    className="text-brand-600 hover:underline"
                  >
                    {task.contact_phone}
                  </a>
                </p>
              </div>
              <ActivateTaskButton taskId={task.id} />
            </div>
          ))
        )}
      </section>

      {/* 2. Matchs suggérés */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink">
          2 · Mise en relation{" "}
          <span className="font-normal text-gray-400">
            ({active.length} tâche{active.length > 1 ? "s" : ""} active
            {active.length > 1 ? "s" : ""} · {pool.length} travailleur
            {pool.length > 1 ? "s" : ""} au total)
          </span>
        </h2>
        {active.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
            Aucune tâche active pour le moment.
          </p>
        ) : (
          active.map((task) => {
            const matches = suggestMatches(task, pool);
            return (
              <div key={task.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{task.title}</p>
                    <p className="text-sm text-gray-500">
                      {task.city} · {task.category} ·{" "}
                      {task.application_count} candidature
                      {task.application_count > 1 ? "s" : ""} reçue
                      {task.application_count > 1 ? "s" : ""}
                    </p>
                  </div>
                  {/* Quand l'entente est conclue : passer à « Assignée » crée la commission. */}
                  <TaskStatusSelect taskId={task.id} status={task.status} />
                </div>

                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium uppercase text-gray-400">
                    Travailleurs suggérés
                  </p>
                  {matches.length === 0 ? (
                    <p className="mt-1 text-sm text-gray-500">
                      {`Aucun travailleur inscrit à ${task.city} pour l'instant — recrutez dans les groupes locaux.`}
                    </p>
                  ) : (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {matches.map(({ candidate, reason, score }) => (
                        <li
                          key={candidate.key}
                          className="rounded-lg bg-gray-50 p-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-ink">
                              {candidate.name}
                            </span>
                            <Badge
                              tone={
                                score >= 3
                                  ? "bg-green-100 text-green-800 ring-green-200"
                                  : score >= 2
                                    ? "bg-blue-100 text-blue-800 ring-blue-200"
                                    : "bg-gray-100 text-gray-600 ring-gray-200"
                              }
                            >
                              {reason}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 text-sm">
                            {candidate.phone && (
                              <a
                                href={`tel:${candidate.phone}`}
                                className="text-brand-600 hover:underline"
                              >
                                {candidate.phone}
                              </a>
                            )}
                            {candidate.email && (
                              <a
                                href={`mailto:${candidate.email}`}
                                className="text-brand-600 hover:underline"
                              >
                                {candidate.email}
                              </a>
                            )}
                          </div>
                          {candidate.skills && (
                            <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                              {candidate.skills}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })
        )}
        <p className="text-xs text-gray-400">
          Entente conclue ? Passez la tâche à <strong>« Assignée »</strong> :
          la commission est créée automatiquement ci-dessous (max entre 10 % du
          budget et 15 $).
        </p>
      </section>

      {/* 3. Commissions */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink">
          3 · Commissions{" "}
          <span className="font-normal text-gray-400">
            ({toCollect.length} à encaisser · {collected.length} payée
            {collected.length > 1 ? "s" : ""})
          </span>
        </h2>
        {commissions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
            Aucune commission pour l&apos;instant. Elles apparaîtront quand vous
            assignerez des tâches. Voir aussi le{" "}
            <Link href="/admin" className="text-brand-600 hover:underline">
              tableau de bord
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-3">
            {[...toCollect, ...collected].map((c) => (
              <CommissionRow key={c.id} commission={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
