"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import { getString, isEmail, isPhone } from "@/lib/validation";
import { OAUTH_PROVIDERS, type OAuthProvider } from "@/lib/constants";
import type { FormState, UserRole } from "@/lib/types";

function safeRedirect(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/mon-compte";
}

/** Inscription d'un utilisateur (employeur ou travailleur). */
export async function signUpUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const role = getString(formData, "role");
  const fullName = getString(formData, "full_name");
  const email = getString(formData, "email");
  const password = (formData.get("password") as string) ?? "";
  const phone = getString(formData, "phone");
  const city = getString(formData, "city");
  const skills = getString(formData, "skills");
  const availability = getString(formData, "availability");
  const experience = getString(formData, "experience");

  const fieldErrors: Record<string, string> = {};
  if (role !== "employer" && role !== "worker")
    fieldErrors.role = "Choisissez un type de compte.";
  if (!fullName) fieldErrors.full_name = "Votre nom est requis.";
  if (!isEmail(email)) fieldErrors.email = "Courriel invalide.";
  if (password.length < 6)
    fieldErrors.password = "Mot de passe trop court (au moins 6 caractères).";
  if (phone && !isPhone(phone))
    fieldErrors.phone = "Numéro de téléphone invalide.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Veuillez corriger les champs indiqués.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name: fullName,
        phone: phone || null,
        city: city || null,
        skills: skills || null,
        availability: availability || null,
        experience: experience || null,
      },
    },
  });

  if (error) {
    const msg = error.message.toLowerCase().includes("already")
      ? "Un compte existe déjà avec ce courriel."
      : "Une erreur est survenue. Veuillez réessayer.";
    return { status: "error", message: msg };
  }

  // Si la confirmation par courriel est désactivée, une session est créée.
  if (data.session) {
    redirect("/mon-compte");
  }

  return {
    status: "success",
    message:
      "Compte créé ! Vérifiez votre courriel pour confirmer votre adresse, puis connectez-vous.",
  };
}

/** Connexion d'un utilisateur. */
export async function signInUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = getString(formData, "email");
  const password = (formData.get("password") as string) ?? "";
  const redirectTo = safeRedirect(getString(formData, "redirect"));

  if (!email || !password) {
    return { status: "error", message: "Courriel et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: "Identifiants invalides." };
  }

  redirect(redirectTo);
}

/**
 * Connexion via un fournisseur externe (Google, Apple).
 *
 * Le rôle métier n'existe pas chez le fournisseur : on le transporte dans
 * l'URL de retour pour les inscriptions. La route /auth/callback ne
 * l'appliquera qu'à un compte dont le rôle n'a pas encore été confirmé —
 * jamais pour écraser le choix d'un compte existant.
 */
export async function signInWithProvider(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const provider = getString(formData, "provider") as OAuthProvider;
  if (!OAUTH_PROVIDERS.includes(provider)) {
    return { status: "error", message: "Fournisseur non pris en charge." };
  }

  const role = getString(formData, "role");
  const next = safeRedirect(getString(formData, "redirect"));

  const callback = new URL(`${siteUrl()}/auth/callback`);
  callback.searchParams.set("next", next);
  if (role === "employer" || role === "worker") {
    callback.searchParams.set("role", role);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
  });

  if (error || !data?.url) {
    console.error("signInWithProvider error", error);
    return {
      status: "error",
      message:
        "Connexion externe indisponible. Vérifiez que le fournisseur est activé dans Supabase.",
    };
  }

  // Quitte l'application vers la page de consentement du fournisseur.
  redirect(data.url);
}

/** Confirme le rôle d'un compte créé via OAuth (employeur ou travailleur). */
export async function confirmRole(role: UserRole): Promise<void> {
  if (role !== "employer" && role !== "worker") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // `role_confirmed` dans le filtre : un rôle déjà confirmé n'est jamais
  // réécrit par cette action, même si elle est rejouée.
  await supabase
    .from("profiles")
    .update({ role, role_confirmed: true })
    .eq("id", user.id)
    .eq("role_confirmed", false);

  revalidatePath("/mon-compte");
  redirect("/mon-compte");
}

export async function signOutUser() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
