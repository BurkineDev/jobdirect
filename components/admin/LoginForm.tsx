"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/actions/admin";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
import type { FormState } from "@/lib/types";

const initial: FormState = { status: "idle" };

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(signIn, initial);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="redirect" value={redirectTo ?? "/admin"} />
      <FormAlert state={state} />

      <Field label="Courriel" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </Field>

      <Field label="Mot de passe" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton size="lg" className="w-full" pendingText="Connexion…">
        Se connecter
      </SubmitButton>
    </form>
  );
}
