import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

/**
 * Retour du fournisseur OAuth (Google, Apple).
 *
 * Échange le code contre une session, puis applique le rôle demandé — mais
 * UNIQUEMENT si le compte n'a pas déjà un rôle confirmé. Un utilisateur
 * existant qui se reconnecte ne voit donc jamais son rôle changer, même si
 * l'URL en contient un.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const role = searchParams.get("role");
  const nextParam = searchParams.get("next") ?? "/mon-compte";
  // Seules les destinations internes sont acceptées.
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/mon-compte";

  // Le fournisseur signale un refus ou une erreur.
  const providerError = searchParams.get("error");
  if (providerError) {
    console.error("OAuth: erreur du fournisseur", providerError);
    return NextResponse.redirect(`${siteUrl()}/connexion?erreur=oauth`);
  }
  if (!code) {
    return NextResponse.redirect(`${siteUrl()}/connexion?erreur=oauth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("OAuth: échange du code impossible", error);
    return NextResponse.redirect(`${siteUrl()}/connexion?erreur=oauth`);
  }

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

  return NextResponse.redirect(`${siteUrl()}${next}`);
}
