import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requestSiteUrl } from "@/lib/site";

/**
 * Point de retour unique de tous les liens d'authentification.
 *
 * Trois familles de liens y aboutissent, et il faut les distinguer :
 *   • OAuth (Google, Apple) → `?code=…`
 *   • liens de courriel au format PKCE → `?code=…` également
 *   • liens de courriel au format jeton → `?token_hash=…&type=recovery`
 *
 * Supabase choisit l'un ou l'autre format selon la configuration du projet.
 * Ne traiter que `code` faisait échouer silencieusement la réinitialisation de
 * mot de passe : le visiteur était renvoyé sur une erreur « oauth » qui
 * n'avait aucun sens pour lui.
 *
 * La session créée ici est ce qui autorise ensuite `/nouveau-mot-de-passe` à
 * enregistrer le nouveau mot de passe.
 */
export async function GET(request: NextRequest) {
  // Origine réelle de la requête (liste blanche d'hôtes dans lib/site.ts) :
  // le visiteur doit revenir là où il était, pas sur une valeur figée par
  // variable d'environnement.
  const origin = await requestSiteUrl();
  const { searchParams } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const role = searchParams.get("role");
  const nextParam = searchParams.get("next") ?? "/mon-compte";
  // Seules les destinations internes sont acceptées.
  let next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/mon-compte";

  // Une récupération de mot de passe impose sa destination, quoi que dise
  // `next`. C'est une sécurité contre la configuration de Supabase : si la
  // liste blanche des « Redirect URLs » n'accepte pas la chaîne de requête,
  // Supabase la supprime (voire retombe sur le Site URL) et `next` est perdu.
  // On se retrouverait alors connecté sur le tableau de bord sans jamais
  // avoir pu changer son mot de passe — le symptôme est déroutant.
  if (type === "recovery") {
    next = "/nouveau-mot-de-passe";
  }

  // Une récupération de mot de passe qui échoue doit renvoyer vers la demande
  // d'un nouveau lien — pas vers une page d'erreur de connexion externe.
  const isRecovery = type === "recovery" || next === "/nouveau-mot-de-passe";
  const failure = isRecovery
    ? `${origin}/mot-de-passe-oublie?erreur=lien`
    : `${origin}/connexion?erreur=oauth`;

  // Le fournisseur signale un refus ou une erreur.
  const providerError = searchParams.get("error");
  if (providerError) {
    console.error("auth/callback: erreur du fournisseur", providerError);
    return NextResponse.redirect(failure);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("auth/callback: échange du code impossible", error.message);
      return NextResponse.redirect(failure);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) {
      console.error("auth/callback: jeton refusé", error.message);
      return NextResponse.redirect(failure);
    }
  } else {
    // Ni code ni jeton : lien tronqué, ou page ouverte à la main.
    return NextResponse.redirect(failure);
  }

  // Le rôle métier n'est appliqué qu'à un compte qui n'en a pas encore
  // confirmé un (cas d'une inscription Google/Apple). Un compte existant ne
  // voit jamais son rôle réécrit, même si l'URL en contient un.
  if (role === "employer" || role === "worker") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ role, role_confirmed: true })
        .eq("id", user.id)
        .eq("role_confirmed", false);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
