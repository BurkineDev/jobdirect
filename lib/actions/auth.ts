"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestSiteUrl } from "@/lib/site";
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
 * Demande de réinitialisation du mot de passe.
 *
 * Deux choix importants :
 *
 * 1. `redirectTo` pointe sur `/auth/callback`, PAS sur la racine du site.
 *    C'est la cause du symptôme « le lien du courriel me ramène à l'accueil
 *    et rien ne se passe » : Supabase envoie un code d'autorisation à échanger
 *    contre une session, et sans route pour l'échanger, le code est ignoré.
 *    Le paramètre `next` fait ensuite atterrir la personne sur le formulaire
 *    de nouveau mot de passe.
 *
 * 2. La réponse est TOUJOURS la même, que le compte existe ou non. Répondre
 *    « ce courriel est inconnu » transformerait ce formulaire en outil pour
 *    savoir qui est inscrit sur JobDirect — un travailleur journalier n'a pas
 *    à voir son inscription révélée à qui teste son adresse.
 */
export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = getString(formData, "email");

  if (!isEmail(email)) {
    return {
      status: "error",
      message: "Courriel invalide.",
      fieldErrors: { email: "Courriel invalide." },
    };
  }

  const origin = await requestSiteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=%2Fnouveau-mot-de-passe`,
  });

  // L'erreur est journalisée mais jamais montrée : voir le point 2 ci-dessus.
  if (error) {
    console.error("requestPasswordReset", error.message);
  }

  return {
    status: "success",
    message:
      "Si un compte existe avec ce courriel, un lien de réinitialisation vient d'être envoyé. Pensez à regarder vos indésirables.",
  };
}

/**
 * Enregistrement du nouveau mot de passe.
 *
 * Ne fonctionne qu'avec une session active — celle que `/auth/callback` vient
 * de créer en échangeant le code du courriel. Sans elle, le lien est expiré
 * ou déjà utilisé (les liens Supabase sont à usage unique).
 */
export async function updatePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const password = (formData.get("password") as string) ?? "";
  const confirmation = (formData.get("password_confirmation") as string) ?? "";

  const fieldErrors: Record<string, string> = {};
  if (password.length < 8) {
    fieldErrors.password = "Au moins 8 caractères.";
  }
  if (password !== confirmation) {
    fieldErrors.password_confirmation = "Les deux mots de passe diffèrent.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Veuillez corriger les champs indiqués.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message:
        "Ce lien de réinitialisation a expiré ou a déjà été utilisé. Demandez-en un nouveau.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // Cas courant : Supabase refuse un mot de passe trop faible ou identique.
    return {
      status: "error",
      message:
        "Ce mot de passe a été refusé. Choisissez-en un autre, plus long ou différent du précédent.",
    };
  }

  revalidatePath("/mon-compte");
  redirect("/mon-compte?mdp=change");
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

  // Origine RÉELLE de la requête, et non la variable d'environnement : c'est
  // ce qui évite de renvoyer le visiteur sur un domaine où il n'était pas
  // (« retour sur localhost:3000 ») et ce qui fait fonctionner OAuth sur les
  // déploiements de prévisualisation, dont l'URL change à chaque commit.
  const callback = new URL(`${await requestSiteUrl()}/auth/callback`);
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
