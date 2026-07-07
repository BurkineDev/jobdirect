"use client";

import { useState, useTransition } from "react";
import { createApplication } from "@/lib/actions/applications";
import { isEmail, isPhone } from "@/lib/validation";
import { useFormValidation, type Validators } from "@/lib/useFormValidation";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import type { FormState } from "@/lib/types";

type Values = {
  name: string;
  phone: string;
  email: string;
  message: string;
};

const validators: Validators<Values> = {
  name: (v) => (!v.trim() ? "Votre nom est requis." : undefined),
  phone: (v) => (!isPhone(v) ? "Numéro de téléphone invalide." : undefined),
  email: (v) => (!isEmail(v) ? "Courriel invalide." : undefined),
};

export function ApplicationForm({
  taskId,
  defaults,
}: {
  taskId: string;
  defaults?: { name?: string; phone?: string; email?: string };
}) {
  const { values, errors, setErrors, handleChange, validateAll } =
    useFormValidation(
      {
        name: defaults?.name ?? "",
        phone: defaults?.phone ?? "",
        email: defaults?.email ?? "",
        message: "",
      },
      validators,
    );
  const [state, setState] = useState<FormState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAll()) {
      setState({ status: "error", message: "Veuillez corriger les champs indiqués." });
      return;
    }
    const fd = new FormData();
    fd.append("task_id", taskId);
    Object.entries(values).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const res = await createApplication({ status: "idle" }, fd);
      setState(res);
      if (res.status === "error" && res.fieldErrors) setErrors(res.fieldErrors);
    });
  }

  if (state.status === "success") {
    return <FormAlert state={state} />;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormAlert state={state} />

      <Field label="Nom complet" htmlFor="app_name" required error={errors.name}>
        <Input
          id="app_name"
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={handleChange("name")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Téléphone" htmlFor="app_phone" required error={errors.phone}>
          <Input
            id="app_phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="514-555-0123"
            value={values.phone}
            onChange={handleChange("phone")}
          />
        </Field>

        <Field label="Courriel" htmlFor="app_email" required error={errors.email}>
          <Input
            id="app_email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={values.email}
            onChange={handleChange("email")}
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
          value={values.message}
          onChange={handleChange("message")}
        />
      </Field>

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Envoi en cours…" : "Je suis disponible"}
      </Button>
    </form>
  );
}
