"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signInUser } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
import type { FormState } from "@/lib/types";

const initial: FormState = { status: "idle" };

export function AuthLoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(signInUser, initial);
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="redirect" value={redirectTo ?? "/mon-compte"} />
      <FormAlert state={state} />

      <Field label="Courriel" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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

      <p className="text-center text-sm text-gray-600">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-medium text-brand-600 hover:underline">
          S&apos;inscrire
        </Link>
      </p>
    </form>
  );
}
