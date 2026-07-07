"use client";

import { useState, useTransition } from "react";
import {
  markCommissionPaid,
  reopenCommission,
  deleteCommission,
} from "@/lib/actions/admin";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import type { CommissionWithTask } from "@/lib/queries";

export function CommissionRow({ commission }: { commission: CommissionWithTask }) {
  const [amount, setAmount] = useState(String(commission.amount));
  const [pending, startTransition] = useTransition();
  const paid = commission.status === "paid";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">
              {commission.task?.title ?? "Tâche supprimée"}
            </p>
            <Badge
              tone={
                paid
                  ? "bg-green-100 text-green-800 ring-green-200"
                  : "bg-amber-100 text-amber-800 ring-amber-200"
              }
            >
              {paid ? "Payée" : "À encaisser"}
            </Badge>
          </div>
          {commission.task && (
            <p className="mt-0.5 text-sm text-gray-500">
              {commission.task.city} · {commission.task.contact_name} ·{" "}
              <a
                href={`tel:${commission.task.contact_phone}`}
                className="text-brand-600 hover:underline"
              >
                {commission.task.contact_phone}
              </a>
            </p>
          )}
          <p className="mt-0.5 text-xs text-gray-400">
            {paid && commission.paid_at
              ? `Encaissée le ${formatDateTime(commission.paid_at)}`
              : `Créée le ${formatDateTime(commission.created_at)}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {paid ? (
            <>
              <span className="text-lg font-bold text-green-700">
                {Number(commission.amount).toFixed(2)} $
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => reopenCommission(commission.id))
                }
                className="text-xs text-gray-400 hover:text-amber-600 disabled:opacity-50"
              >
                Rouvrir
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-label="Montant de la commission"
                  className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-right text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
                />
                <span className="text-sm text-gray-500">$</span>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() =>
                    markCommissionPaid(commission.id, Number(amount)),
                  )
                }
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {pending ? "…" : "Interac reçu ✓"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => deleteCommission(commission.id))
                }
                className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                Supprimer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
