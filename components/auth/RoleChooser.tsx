"use client";

import { useTransition } from "react";
import { confirmRole } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

/**
 * Affiché après une première connexion Google / Apple : ces fournisseurs ne
 * transmettent aucun rôle métier, et deviner à la place de l'utilisateur
 * l'enverrait sur le mauvais tableau de bord sans qu'il s'en rende compte.
 */
export function RoleChooser() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mb-8 rounded-2xl border-2 border-brand-300 bg-brand-50/60 p-6">
      <h2 className="text-lg font-bold text-ink">
        Une dernière chose : vous êtes ici pour…
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Votre compte a été créé avec Google ou Apple, qui ne nous disent pas
        ce que vous cherchez. Ce choix détermine votre tableau de bord.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button
          size="lg"
          disabled={pending}
          onClick={() => startTransition(() => confirmRole("employer"))}
        >
          Faire faire une tâche
        </Button>
        <Button
          size="lg"
          variant="secondary"
          disabled={pending}
          onClick={() => startTransition(() => confirmRole("worker"))}
        >
          Trouver du travail
        </Button>
      </div>
    </div>
  );
}
