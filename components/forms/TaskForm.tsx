"use client";

import { useState, useTransition } from "react";
import { createTask } from "@/lib/actions/tasks";
import { CATEGORIES, CITIES } from "@/lib/constants";
import { isEmail, isPhone, parseBudget } from "@/lib/validation";
import { useFormValidation, type Validators } from "@/lib/useFormValidation";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import type { FormState } from "@/lib/types";

type Values = {
  title: string;
  category: string;
  city: string;
  desired_date: string;
  budget_estimate: string;
  description: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
};

const initialValues: Values = {
  title: "",
  category: "",
  city: "",
  desired_date: "",
  budget_estimate: "",
  description: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
};

const validators: Validators<Values> = {
  title: (v) =>
    v.trim().length < 3 ? "Le titre est requis (au moins 3 caractères)." : undefined,
  category: (v) => (!v ? "La catégorie est requise." : undefined),
  city: (v) => (!v ? "La ville est requise." : undefined),
  description: (v) =>
    v.trim().length < 10 ? "Décrivez la tâche (au moins 10 caractères)." : undefined,
  budget_estimate: (v) =>
    parseBudget(v) === "invalid" ? "Budget invalide (ex. : 80)." : undefined,
  contact_name: (v) => (!v.trim() ? "Votre nom est requis." : undefined),
  contact_phone: (v) => (!isPhone(v) ? "Numéro de téléphone invalide." : undefined),
  contact_email: (v) => (!isEmail(v) ? "Courriel invalide." : undefined),
};

export function TaskForm() {
  const { values, errors, setErrors, handleChange, validateAll } =
    useFormValidation(initialValues, validators);
  const [state, setState] = useState<FormState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAll()) {
      setState({ status: "error", message: "Veuillez corriger les champs indiqués." });
      return;
    }
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const res = await createTask({ status: "idle" }, fd);
      setState(res);
      if (res.status === "error" && res.fieldErrors) setErrors(res.fieldErrors);
    });
  }

  if (state.status === "success") {
    return (
      <div className="space-y-5">
        <FormAlert state={state} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/taches">Voir les tâches actives</ButtonLink>
          <ButtonLink href="/publier" variant="secondary">
            Publier une autre tâche
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <FormAlert state={state} />

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold text-ink">
          Détails de la tâche
        </legend>

        <Field label="Titre de la tâche" htmlFor="title" required error={errors.title}>
          <Input
            id="title"
            name="title"
            placeholder="Ex. : Aide au déménagement (2 h)"
            value={values.title}
            onChange={handleChange("title")}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Catégorie" htmlFor="category" required error={errors.category}>
            <Select
              id="category"
              name="category"
              value={values.category}
              onChange={handleChange("category")}
            >
              <option value="" disabled>
                Choisir une catégorie
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Ville" htmlFor="city" required error={errors.city}>
            <Select
              id="city"
              name="city"
              value={values.city}
              onChange={handleChange("city")}
            >
              <option value="" disabled>
                Choisir une ville
              </option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Date souhaitée"
            htmlFor="desired_date"
            hint="Optionnel"
            error={errors.desired_date}
          >
            <Input
              id="desired_date"
              name="desired_date"
              type="date"
              value={values.desired_date}
              onChange={handleChange("desired_date")}
            />
          </Field>

          <Field
            label="Budget estimé ($ CA)"
            htmlFor="budget_estimate"
            hint="Optionnel — ex. : 80"
            error={errors.budget_estimate}
          >
            <Input
              id="budget_estimate"
              name="budget_estimate"
              inputMode="decimal"
              placeholder="80"
              value={values.budget_estimate}
              onChange={handleChange("budget_estimate")}
            />
          </Field>
        </div>

        <Field
          label="Description"
          htmlFor="description"
          required
          error={errors.description}
          hint="Décrivez la tâche, le lieu, le matériel fourni, etc."
        >
          <Textarea
            id="description"
            name="description"
            placeholder="Ex. : Besoin d'une personne pour charger un camion, 3e étage sans ascenseur…"
            value={values.description}
            onChange={handleChange("description")}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold text-ink">
          Vos coordonnées
        </legend>

        <Field label="Nom" htmlFor="contact_name" required error={errors.contact_name}>
          <Input
            id="contact_name"
            name="contact_name"
            autoComplete="name"
            value={values.contact_name}
            onChange={handleChange("contact_name")}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Téléphone"
            htmlFor="contact_phone"
            required
            error={errors.contact_phone}
          >
            <Input
              id="contact_phone"
              name="contact_phone"
              type="tel"
              autoComplete="tel"
              placeholder="514-555-0123"
              value={values.contact_phone}
              onChange={handleChange("contact_phone")}
            />
          </Field>

          <Field
            label="Courriel"
            htmlFor="contact_email"
            required
            error={errors.contact_email}
          >
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              value={values.contact_email}
              onChange={handleChange("contact_email")}
            />
          </Field>
        </div>
        <p className="text-xs text-gray-500">
          Vos coordonnées restent privées et ne servent qu&apos;à vous mettre en
          relation.
        </p>
      </fieldset>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Publication en cours…" : "Publier la tâche"}
      </Button>
    </form>
  );
}
