"use client";

import { useState, useTransition } from "react";
import { deleteTask } from "@/lib/actions/admin";

/**
 * Suppression définitive d'une tâche.
 *
 * Contrairement aux autres boutons de suppression de l'admin, celui-ci exige
 * une confirmation explicite dans l'interface plutôt qu'un `confirm()` natif :
 * l'action est irréversible (les candidatures partent en cascade) et
 * l'opérateur travaille souvent depuis son téléphone, où un clic accidentel
 * est vite arrivé.
 */
export function DeleteTaskButton({
  taskId,
  title,
}: {
  taskId: string;
  title: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="whitespace-nowrap text-xs font-medium text-gray-400 hover:text-red-600"
      >
        Supprimer
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-2 py-1 ring-1 ring-inset ring-red-200">
      <span className="text-xs text-red-800">
        Supprimer « {title.length > 28 ? `${title.slice(0, 28)}…` : title} » et
        ses candidatures ?
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => deleteTask(taskId))}
        className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Suppression…" : "Oui, supprimer"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-50"
      >
        Annuler
      </button>
    </span>
  );
}
