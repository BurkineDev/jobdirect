"use client";

import { useActionState } from "react";
import { createWorker } from "@/lib/actions/workers";
import { CITIES } from "@/lib/constants";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
import { ButtonLink } from "@/components/ui/Button";
import type { FormState } from "@/lib/types";

const initial: FormState = { status: "idle" };

export function WorkerForm() {
  const [state, formAction] = useActionState(createWorker, initial);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (state.status === "success") {
    return (
      <div className="space-y-5">
        <FormAlert state={state} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/taches">Voir les tâches disponibles</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Retour à l&apos;accueil
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormAlert state={state} />

      <Field label="Nom complet" htmlFor="name" required error={errors.name}>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Téléphone" htmlFor="phone" required error={errors.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="514-555-0123"
            required
          />
        </Field>

        <Field label="Courriel" htmlFor="email" required error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            required
          />
        </Field>
      </div>

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
        label="Compétences"
        htmlFor="skills"
        required
        error={errors.skills}
        hint="Ex. : déménagement, ménage, peinture, manutention…"
      >
        <Textarea
          id="skills"
          name="skills"
          placeholder="Décrivez ce que vous savez faire"
          required
        />
      </Field>

      <Field
        label="Disponibilités"
        htmlFor="availability"
        required
        error={errors.availability}
        hint="Ex. : soirs et fins de semaine, à temps plein, sur appel…"
      >
        <Input
          id="availability"
          name="availability"
          placeholder="Quand êtes-vous disponible ?"
          required
        />
      </Field>

      <Field
        label="Expérience"
        htmlFor="experience"
        hint="Optionnel — décrivez votre expérience pertinente"
        error={errors.experience}
      >
        <Textarea
          id="experience"
          name="experience"
          placeholder="Ex. : 3 ans en déménagement résidentiel…"
        />
      </Field>

      <SubmitButton size="lg" pendingText="Inscription en cours…">
        M&apos;inscrire
      </SubmitButton>
    </form>
  );
}
