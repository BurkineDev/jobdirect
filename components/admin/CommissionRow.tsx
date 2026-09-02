"use client";

import { useState, useTransition } from "react";
import {
  markCommissionPaid,
  reopenCommission,
  deleteCommission,
} from "@/lib/actions/admin";
import { createCommissionPaymentLink } from "@/lib/actions/payments";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import type { CommissionWithTask } from "@/lib/queries";

export function CommissionRow({
  commission,
  stripeEnabled,
}: {
  commission: CommissionWithTask;
  stripeEnabled: boolean;
}) {
  const [amount, setAmount] = useState(String(commission.amount));
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkPending, startLinkTransition] = useTransition();
  const paid = commission.status === "paid";

  function generateLink() {
    setLinkError(null);
    startLinkTransition(async () => {
      const res = await createCommissionPaymentLink(commission.id);
      if ("url" in res) {
        setLink(res.url);
        // Confort : le lien est prêt à coller dans un texto au client.
        try {
          await navigator.clipboard.writeText(res.url);
        } catch {
          // Presse-papiers refusé : le lien reste affiché et sélectionnable.
        }
      } else {
        setLinkError(res.error);
      }
    });
  }

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

      {/* Encaissement par carte : le webhook marque « Payée » automatiquement. */}
      {!paid && stripeEnabled && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <button
            type="button"
            disabled={linkPending}
            onClick={generateLink}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {linkPending ? "Génération…" : "Créer un lien de paiement"}
          </button>

          {link && (
            <div className="mt-2">
              <p className="text-xs text-green-700">
                Lien copié — envoyez-le au client par texto ou courriel.
              </p>
              <input
                readOnly
                value={link}
                aria-label="Lien de paiement Stripe"
                onFocus={(e) => e.currentTarget.select()}
                className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 font-mono text-xs text-gray-600"
              />
            </div>
          )}
          {linkError && (
            <p className="mt-2 text-xs text-red-600">{linkError}</p>
          )}
        </div>
      )}
    </div>
  );
}
