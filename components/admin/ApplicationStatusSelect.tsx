"use client";

import { useTransition } from "react";
import { updateApplicationStatus } from "@/lib/actions/admin";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_META,
  type ApplicationStatus,
} from "@/lib/constants";

export function ApplicationStatusSelect({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Changer le statut de la candidature"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as ApplicationStatus;
        startTransition(() => updateApplicationStatus(applicationId, next));
      }}
      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:opacity-60"
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {APPLICATION_STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}
