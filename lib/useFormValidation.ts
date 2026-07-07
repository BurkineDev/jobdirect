"use client";

import { useState } from "react";

type ChangeEl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export type Validators<T> = Partial<
  Record<keyof T, (value: string, all: T) => string | undefined>
>;

/**
 * Petit hook de validation côté client pour des formulaires contrôlés.
 * - Conserve les valeurs saisies (pas de réinitialisation au submit).
 * - Efface l'erreur d'un champ dès qu'il (re)devient valide pendant la saisie.
 */
export function useFormValidation<T extends Record<string, string>>(
  initial: T,
  validators: Validators<T>,
) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  function setValue(name: keyof T, value: string) {
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    // On ne (re)valide en direct que les champs déjà en erreur, pour ne pas
    // afficher d'erreur tant que l'utilisateur n'a pas tenté de soumettre.
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const err = validators[name]?.(value, nextValues);
      const next = { ...prev };
      if (err) next[name] = err;
      else delete next[name];
      return next;
    });
  }

  function handleChange(name: keyof T) {
    return (e: React.ChangeEvent<ChangeEl>) => setValue(name, e.target.value);
  }

  function validateAll(): boolean {
    const next: Partial<Record<keyof T, string>> = {};
    (Object.keys(validators) as (keyof T)[]).forEach((key) => {
      const err = validators[key]?.(values[key], values);
      if (err) next[key] = err;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return { values, errors, setErrors, setValue, handleChange, validateAll };
}
