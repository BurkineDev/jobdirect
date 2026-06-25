import { Badge } from "@/components/ui/Badge";
import { TASK_STATUS_META } from "@/lib/constants";
import { formatBudget, formatDate, formatDateTime } from "@/lib/format";
import type { AdminNote } from "@/lib/types";
import type { TaskWithCount } from "@/lib/queries";
import { TaskStatusSelect } from "./TaskStatusSelect";
import { NoteForm } from "./NoteForm";
import { DeleteNoteButton } from "./DeleteNoteButton";

export function AdminTaskCard({
  task,
  notes,
}: {
  task: TaskWithCount;
  notes: AdminNote[];
}) {
  const meta = TASK_STATUS_META[task.status];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink">{task.title}</h3>
            <Badge tone={meta.badge}>{meta.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {task.city} · {task.category} · {formatDate(task.desired_date)} ·{" "}
            {formatBudget(task.budget_estimate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap text-sm text-gray-500">
            {task.application_count} candidature
            {task.application_count > 1 ? "s" : ""}
          </span>
          <TaskStatusSelect taskId={task.id} status={task.status} />
        </div>
      </div>

      <details className="group mt-3 border-t border-gray-100 pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-brand-600 [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Voir les détails et notes</span>
          <span className="hidden group-open:inline">Masquer</span>
        </summary>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {/* Détails + coordonnées */}
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-gray-400">
                Description
              </p>
              <p className="mt-1 whitespace-pre-line text-gray-700">
                {task.description}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase text-gray-400">
                Coordonnées du demandeur
              </p>
              <p className="mt-1 font-medium text-ink">{task.contact_name}</p>
              <p>
                <a
                  href={`tel:${task.contact_phone}`}
                  className="text-brand-600 hover:underline"
                >
                  {task.contact_phone}
                </a>
              </p>
              <p>
                <a
                  href={`mailto:${task.contact_email}`}
                  className="text-brand-600 hover:underline"
                >
                  {task.contact_email}
                </a>
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Publiée le {formatDateTime(task.created_at)}
            </p>
          </div>

          {/* Notes internes */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase text-gray-400">
              Notes internes
            </p>
            {notes.length > 0 ? (
              <ul className="space-y-2">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm"
                  >
                    <p className="whitespace-pre-line text-gray-700">
                      {note.note}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {formatDateTime(note.created_at)}
                      </span>
                      <DeleteNoteButton noteId={note.id} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Aucune note.</p>
            )}
            <NoteForm taskId={task.id} />
          </div>
        </div>
      </details>
    </div>
  );
}
