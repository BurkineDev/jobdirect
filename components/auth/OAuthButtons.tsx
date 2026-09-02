"use client";

import { useActionState } from "react";
import { signInWithProvider } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
import type { FormState } from "@/lib/types";

const initial: FormState = { status: "idle" };

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5a11 11 0 0 0-9.82 6.05l3.66 2.84C6.71 6.79 9.14 4.75 12 4.75Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.78c.02 2.5 2.19 3.33 2.21 3.34-.02.06-.35 1.2-1.14 2.37-.69 1.02-1.4 2.04-2.52 2.06-1.1.02-1.46-.65-2.72-.65s-1.65.63-2.7.67c-1.08.04-1.9-1.1-2.6-2.12-1.42-2.06-2.5-5.82-1.05-8.36a4.06 4.06 0 0 1 3.43-2.08c1.06-.02 2.06.71 2.71.71.65 0 1.87-.88 3.15-.75.54.02 2.05.22 3.02 1.64-.08.05-1.8 1.05-1.79 3.17M14.5 4.9c.58-.7.97-1.67.86-2.64-.83.03-1.84.55-2.44 1.25-.53.62-1 1.61-.87 2.56.93.07 1.87-.47 2.45-1.17" />
    </svg>
  );
}

/**
 * Connexion par fournisseur externe.
 * `role` n'est transmis qu'au moment d'une inscription : il ne sert qu'à
 * renseigner un compte NEUF, jamais à modifier un compte existant.
 */
export function OAuthButtons({
  role,
  redirectTo,
  label = "Ou continuer avec",
}: {
  role?: string;
  redirectTo?: string;
  label?: string;
}) {
  const [state, formAction] = useActionState(signInWithProvider, initial);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <FormAlert state={state} />

      <form action={formAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="redirect" value={redirectTo ?? "/mon-compte"} />
        {role ? <input type="hidden" name="role" value={role} /> : null}

        <SubmitButton
          name="provider"
          value="google"
          variant="secondary"
          pendingText="Redirection…"
          className="w-full !text-gray-700 !ring-gray-300"
        >
          <GoogleIcon />
          Google
        </SubmitButton>

        <SubmitButton
          name="provider"
          value="apple"
          variant="secondary"
          pendingText="Redirection…"
          className="w-full !text-gray-900 !ring-gray-300"
        >
          <AppleIcon />
          Apple
        </SubmitButton>
      </form>
    </div>
  );
}
