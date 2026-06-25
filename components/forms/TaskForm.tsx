"use client";

import { useActionState } from "react";
import { createTask } from "@/lib/actions/tasks";
import { CATEGORIES, CITIES } from "@/lib/constants";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
import { ButtonLink } from "@/components/ui/Button";
import type { FormState } from "@/lib/types";

const initial: FormState = { status: "idle" };

export function TaskForm() {
  const [state, formAction] = useActionState(createTask, initial);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

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
    <form action={formAction} className="space-y-8" noValidate>
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
            required
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Catégorie" htmlFor="category" required error={errors.category}>
            <Select id="category" name="category" defaultValue="" required>
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
            <Select id="city" name="city" defaultValue="" required>
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
            <Input id="desired_date" name="desired_date" type="date" />
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
            required
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold text-ink">
          Vos coordonnées
        </legend>

        <Field label="Nom" htmlFor="contact_name" required error={errors.contact_name}>
          <Input id="contact_name" name="contact_name" autoComplete="name" required />
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
              required
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
              required
            />
          </Field>
        </div>
        <p className="text-xs text-gray-500">
          Vos coordonnées restent privées et ne servent qu&apos;à vous mettre en
          relation.
        </p>
      </fieldset>

      <SubmitButton size="lg" pendingText="Publication en cours…">
        Publier la tâche
      </SubmitButton>
    </form>
  );
}
