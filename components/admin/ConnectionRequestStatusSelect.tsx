"use client";

import { useTransition } from "react";
import { updateConnectionRequestStatus } from "@/lib/actions/admin";
import {
  CONNECTION_REQUEST_STATUSES,
  CONNECTION_REQUEST_STATUS_META,
  type ConnectionRequestStatusValue,
} from "@/lib/constants";

export function ConnectionRequestStatusSelect({
  requestId,
  status,
}: {
  requestId: string;
  status: ConnectionRequestStatusValue;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Changer le statut de la demande"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as ConnectionRequestStatusValue;
        startTransition(() => updateConnectionRequestStatus(requestId, next));
      }}
      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-ink focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:opacity-60"
    >
      {CONNECTION_REQUEST_STATUSES.map((s) => (
        <option key={s} value={s}>
          {CONNECTION_REQUEST_STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}
