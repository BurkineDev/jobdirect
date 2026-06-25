"use client";

import { useActionState } from "react";
import { createApplication } from "@/lib/actions/applications";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
import type { FormState } from "@/lib/types";

const initial: FormState = { status: "idle" };

export function ApplicationForm({ taskId }: { taskId: string }) {
  const [state, formAction] = useActionState(createApplication, initial);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (state.status === "success") {
    return <FormAlert state={state} />;
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="task_id" value={taskId} />
      <FormAlert state={state} />

      <Field label="Nom complet" htmlFor="app_name" required error={errors.name}>
        <Input id="app_name" name="name" autoComplete="name" required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Téléphone" htmlFor="app_phone" required error={errors.phone}>
          <Input
            id="app_phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="514-555-0123"
            required
          />
        </Field>

        <Field label="Courriel" htmlFor="app_email" required error={errors.email}>
          <Input
            id="app_email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            required
          />
        </Field>
      </div>

      <Field
        label="Message"
        htmlFor="app_message"
        hint="Optionnel — présentez-vous ou précisez vos disponibilités"
        error={errors.message}
      >
        <Textarea
          id="app_message"
          name="message"
          placeholder="Bonjour, je suis disponible pour cette tâche…"
        />
      </Field>

      <SubmitButton size="lg" className="w-full sm:w-auto">
        Je suis disponible
      </SubmitButton>
    </form>
  );
}
