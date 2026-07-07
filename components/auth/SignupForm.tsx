"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signUpUser } from "@/lib/actions/auth";
import { CITIES } from "@/lib/constants";
import { isEmail, isPhone } from "@/lib/validation";
import { useFormValidation, type Validators } from "@/lib/useFormValidation";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";
import type { FormState } from "@/lib/types";

type Values = {
  role: string;
  full_name: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  skills: string;
  availability: string;
  experience: string;
};

const initialValues: Values = {
  role: "",
  full_name: "",
  email: "",
  password: "",
  phone: "",
  city: "",
  skills: "",
  availability: "",
  experience: "",
};

const validators: Validators<Values> = {
  role: (v) => (v !== "employer" && v !== "worker" ? "Choisissez un type de compte." : undefined),
  full_name: (v) => (!v.trim() ? "Votre nom est requis." : undefined),
  email: (v) => (!isEmail(v) ? "Courriel invalide." : undefined),
  password: (v) =>
    v.length < 6 ? "Mot de passe trop court (au moins 6 caractères)." : undefined,
  phone: (v) => (v && !isPhone(v) ? "Numéro de téléphone invalide." : undefined),
};

const roles = [
  { value: "employer", label: "Je publie des tâches", hint: "Employeur / particulier" },
  { value: "worker", label: "Je cherche du travail", hint: "Travailleur" },
];

export function SignupForm() {
  const { values, errors, setErrors, setValue, handleChange, validateAll } =
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
      const res = await signUpUser({ status: "idle" }, fd);
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

      {/* Choix du rôle */}
      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-800">
          Type de compte<span className="ml-0.5 text-brand-600">*</span>
        </span>
        <div className="grid grid-cols-2 gap-3">
          {roles.map((r) => {
            const active = values.role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setValue("role", r.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-300"
                    : "border-gray-300 hover:border-brand-300"
                }`}
              >
                <span className="block text-sm font-semibold text-ink">
                  {r.label}
                </span>
                <span className="block text-xs text-gray-500">{r.hint}</span>
              </button>
            );
          })}
        </div>
        {errors.role && <p className="mt-1.5 text-sm text-red-600">{errors.role}</p>}
      </div>

      <Field label="Nom complet" htmlFor="full_name" required error={errors.full_name}>
        <Input
          id="full_name"
          autoComplete="name"
          value={values.full_name}
          onChange={handleChange("full_name")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Courriel" htmlFor="email" required error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange("email")}
          />
        </Field>
        <Field label="Mot de passe" htmlFor="password" required error={errors.password}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange("password")}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Ville" htmlFor="city" error={errors.city}>
          <Select id="city" value={values.city} onChange={handleChange("city")}>
            <option value="">Choisir une ville</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Téléphone" htmlFor="phone" hint="Optionnel" error={errors.phone}>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="514-555-0123"
            value={values.phone}
            onChange={handleChange("phone")}
          />
        </Field>
      </div>

      {values.role === "worker" && (
        <div className="space-y-5 rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">Votre profil travailleur</p>
          <Field label="Compétences" htmlFor="skills" error={errors.skills}>
            <Textarea
              id="skills"
              placeholder="Ex. : déménagement, ménage, peinture…"
              value={values.skills}
              onChange={handleChange("skills")}
            />
          </Field>
          <Field label="Disponibilités" htmlFor="availability" error={errors.availability}>
            <Input
              id="availability"
              placeholder="Ex. : soirs et fins de semaine"
              value={values.availability}
              onChange={handleChange("availability")}
            />
          </Field>
          <Field label="Expérience" htmlFor="experience" hint="Optionnel" error={errors.experience}>
            <Textarea
              id="experience"
              value={values.experience}
              onChange={handleChange("experience")}
            />
          </Field>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Création du compte…" : "Créer mon compte"}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-medium text-brand-600 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
