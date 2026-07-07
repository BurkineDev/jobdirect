"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/lib/actions/profile";
import { CITIES } from "@/lib/constants";
import { isPhone } from "@/lib/validation";
import { useFormValidation, type Validators } from "@/lib/useFormValidation";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import type { FormState, SessionProfile } from "@/lib/types";

type Values = {
  full_name: string;
  phone: string;
  city: string;
  skills: string;
  availability: string;
  experience: string;
};

const validators: Validators<Values> = {
  full_name: (v) => (!v.trim() ? "Votre nom est requis." : undefined),
  phone: (v) => (v && !isPhone(v) ? "Numéro de téléphone invalide." : undefined),
};

export function ProfileForm({ profile }: { profile: SessionProfile }) {
  const initialValues: Values = {
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
    city: profile.city ?? "",
    skills: profile.skills ?? "",
    availability: profile.availability ?? "",
    experience: profile.experience ?? "",
  };
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
      const res = await updateProfile({ status: "idle" }, fd);
      setState(res);
      if (res.status === "error" && res.fieldErrors) setErrors(res.fieldErrors);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormAlert state={state} />

      <Field label="Nom complet" htmlFor="p_name" required error={errors.full_name}>
        <Input id="p_name" value={values.full_name} onChange={handleChange("full_name")} />
      </Field>

      <Field label="Téléphone" htmlFor="p_phone" error={errors.phone}>
        <Input
          id="p_phone"
          type="tel"
          placeholder="514-555-0123"
          value={values.phone}
          onChange={handleChange("phone")}
        />
      </Field>

      <Field label="Ville" htmlFor="p_city" error={errors.city}>
        <Select id="p_city" value={values.city} onChange={handleChange("city")}>
          <option value="">Choisir une ville</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Compétences" htmlFor="p_skills" error={errors.skills}>
        <Textarea
          id="p_skills"
          placeholder="Ex. : déménagement, ménage…"
          value={values.skills}
          onChange={handleChange("skills")}
        />
      </Field>

      <Field label="Disponibilités" htmlFor="p_availability" error={errors.availability}>
        <Input
          id="p_availability"
          placeholder="Ex. : soirs et fins de semaine"
          value={values.availability}
          onChange={handleChange("availability")}
        />
      </Field>

      <Field label="Expérience" htmlFor="p_experience" error={errors.experience}>
        <Textarea
          id="p_experience"
          value={values.experience}
          onChange={handleChange("experience")}
        />
      </Field>

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
