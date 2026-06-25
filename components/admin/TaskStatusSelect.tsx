"use client";

import { useTransition } from "react";
import { updateTaskStatus } from "@/lib/actions/admin";
import {
  TASK_STATUSES,
  TASK_STATUS_META,
  type TaskStatus,
} from "@/lib/constants";

export function TaskStatusSelect({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Changer le statut"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as TaskStatus;
        startTransition(() => updateTaskStatus(taskId, next));
      }}
      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:opacity-60"
    >
      {TASK_STATUSES.map((s) => (
        <option key={s} value={s}>
          {TASK_STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}
