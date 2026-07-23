"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createWorker } from "@/lib/actions/workers";
import { CITIES } from "@/lib/constants";
import { isEmail, isPhone } from "@/lib/validation";
import { useFormValidation, type Validators } from "@/lib/useFormValidation";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import type { FormState } from "@/lib/types";

type Values = {
  name: string;
  phone: string;
  email: string;
  city: string;
  skills: string;
  availability: string;
  experience: string;
};

const initialValues: Values = {
  name: "",
  phone: "",
  email: "",
  city: "",
  skills: "",
  availability: "",
  experience: "",
};

const validators: Validators<Values> = {
  name: (v) => (!v.trim() ? "Votre nom est requis." : undefined),
  phone: (v) => (!isPhone(v) ? "Numéro de téléphone invalide." : undefined),
  email: (v) => (!isEmail(v) ? "Courriel invalide." : undefined),
  city: (v) => (!v ? "La ville est requise." : undefined),
  skills: (v) => (!v.trim() ? "Indiquez vos compétences." : undefined),
  availability: (v) => (!v.trim() ? "Indiquez vos disponibilités." : undefined),
};

export function WorkerForm() {
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
      const res = await createWorker({ status: "idle" }, fd);
      setState(res);
      if (res.status === "error" && res.fieldErrors) setErrors(res.fieldErrors);
    });
  }

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
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormAlert state={state} />

      <Field label="Nom complet" htmlFor="name" required error={errors.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={handleChange("name")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Téléphone" htmlFor="phone" required error={errors.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="514-555-0123"
            value={values.phone}
            onChange={handleChange("phone")}
          />
        </Field>

        <Field label="Courriel" htmlFor="email" required error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={values.email}
            onChange={handleChange("email")}
          />
        </Field>
      </div>

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
          value={values.skills}
          onChange={handleChange("skills")}
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
          value={values.availability}
          onChange={handleChange("availability")}
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
          value={values.experience}
          onChange={handleChange("experience")}
        />
      </Field>

      <p className="text-xs text-gray-500">
        En vous inscrivant, votre profil (prénom, ville, compétences,
        disponibilités) pourra être présenté aux clients qui cherchent de
        l&apos;aide. Vos coordonnées restent privées et ne sont jamais affichées
        publiquement. Voir notre{" "}
        <Link href="/confidentialite" className="text-brand-600 hover:underline">
          politique de confidentialité
        </Link>
        .
      </p>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Inscription en cours…" : "M'inscrire"}
      </Button>
    </form>
  );
}
