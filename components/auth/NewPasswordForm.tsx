"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassword } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
import type { FormState } from "@/lib/types";

const initial: FormState = { status: "idle" };

export function NewPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, initial);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormAlert state={state} />

      <Field
        label="Nouveau mot de passe"
        htmlFor="password"
        required
        hint="Au moins 8 caractères."
        error={
          state.status === "error" ? state.fieldErrors?.password : undefined
        }
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field
        label="Confirmer le mot de passe"
        htmlFor="password_confirmation"
        required
        error={
          state.status === "error"
            ? state.fieldErrors?.password_confirmation
            : undefined
        }
      >
        <Input
          id="password_confirmation"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <SubmitButton size="lg" className="w-full" pendingText="Enregistrement…">
        Enregistrer le nouveau mot de passe
      </SubmitButton>

      <p className="text-center text-sm text-gray-600">
        <Link
          href="/mot-de-passe-oublie"
          className="font-medium text-brand-600 hover:underline"
        >
          Demander un nouveau lien
        </Link>
      </p>
    </form>
  );
}
