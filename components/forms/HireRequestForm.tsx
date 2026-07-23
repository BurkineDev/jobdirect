"use client";

import { useState, useTransition } from "react";
import { createConnectionRequest } from "@/lib/actions/connection";
import { isEmail, isPhone } from "@/lib/validation";
import { useFormValidation, type Validators } from "@/lib/useFormValidation";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import type { FormState } from "@/lib/types";

type Values = {
  client_name: string;
  client_phone: string;
  client_email: string;
  need: string;
};

const validators: Validators<Values> = {
  client_name: (v) => (!v.trim() ? "Votre nom est requis." : undefined),
  client_phone: (v) => (!isPhone(v) ? "Numéro de téléphone invalide." : undefined),
  client_email: (v) => (!isEmail(v) ? "Courriel invalide." : undefined),
};

export function HireRequestForm({
  workerId,
  workerName,
}: {
  workerId: string;
  workerName: string;
}) {
  const { values, errors, setErrors, handleChange, validateAll } =
    useFormValidation(
      { client_name: "", client_phone: "", client_email: "", need: "" },
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
    fd.append("worker_id", workerId);
    fd.append("worker_name", workerName);
    Object.entries(values).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const res = await createConnectionRequest({ status: "idle" }, fd);
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

      <Field label="Votre nom" htmlFor="h_name" required error={errors.client_name}>
        <Input
          id="h_name"
          autoComplete="name"
          value={values.client_name}
          onChange={handleChange("client_name")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Téléphone" htmlFor="h_phone" required error={errors.client_phone}>
          <Input
            id="h_phone"
            type="tel"
            autoComplete="tel"
            placeholder="514-555-0123"
            value={values.client_phone}
            onChange={handleChange("client_phone")}
          />
        </Field>
        <Field label="Courriel" htmlFor="h_email" required error={errors.client_email}>
          <Input
            id="h_email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={values.client_email}
            onChange={handleChange("client_email")}
          />
        </Field>
      </div>

      <Field
        label="Décrivez votre besoin"
        htmlFor="h_need"
        hint="Optionnel — quelle tâche, quand, où ?"
        error={errors.need}
      >
        <Textarea
          id="h_need"
          placeholder="Ex. : aide au déménagement samedi matin à Laval…"
          value={values.need}
          onChange={handleChange("need")}
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Envoi en cours…" : "Demander à être mis en relation"}
      </Button>
      <p className="text-xs text-gray-500">
        Vos coordonnées servent uniquement à vous mettre en contact. Nous ne les
        partageons pas publiquement.
      </p>
    </form>
  );
}
