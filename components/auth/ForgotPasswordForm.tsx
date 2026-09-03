"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
import type { FormState } from "@/lib/types";

const initial: FormState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initial);

  // Une fois la demande envoyée, on retire le formulaire : le réafficher
  // invite à renvoyer un second courriel, ce qui invalide le premier lien
  // (les liens Supabase sont à usage unique) et sème la confusion.
  if (state.status === "success") {
    return (
      <div className="space-y-5">
        <FormAlert state={state} />
        <p className="text-sm text-gray-600">
          Le lien est valable une heure et ne fonctionne qu&apos;une fois. Si
          vous ne recevez rien d&apos;ici quelques minutes, vérifiez vos
          indésirables avant de redemander un envoi.
        </p>
        <Link
          href="/connexion"
          className="inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          ← Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormAlert state={state} />

      <Field
        label="Courriel"
        htmlFor="email"
        required
        error={state.status === "error" ? state.fieldErrors?.email : undefined}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          required
        />
      </Field>

      <SubmitButton size="lg" className="w-full" pendingText="Envoi…">
        Envoyer le lien de réinitialisation
      </SubmitButton>

      <p className="text-center text-sm text-gray-600">
        <Link
          href="/connexion"
          className="font-medium text-brand-600 hover:underline"
        >
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
