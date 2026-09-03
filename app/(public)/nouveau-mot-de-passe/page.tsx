import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  robots: { index: false, follow: false },
};

/**
 * Choix du nouveau mot de passe, après le lien reçu par courriel.
 *
 * On arrive ici depuis `/auth/callback`, qui vient d'échanger le code du
 * courriel contre une session. La présence de cette session est donc la
 * preuve que le lien était valide : sans elle, il a expiré, a déjà servi
 * (les liens Supabase sont à usage unique), ou la page a été ouverte
 * directement. On le dit clairement au lieu d'afficher un formulaire qui
 * échouerait à la soumission.
 */
export default async function NouveauMotDePassePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Ce lien n&apos;est plus valide
        </h1>
        <p className="mt-3 text-gray-600">
          Les liens de réinitialisation expirent après une heure et ne
          fonctionnent qu&apos;une seule fois. Demandez-en un nouveau, il
          arrivera dans la minute.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/mot-de-passe-oublie">
            Demander un nouveau lien
          </ButtonLink>
          <ButtonLink href="/connexion" variant="secondary">
            Retour à la connexion
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Nouveau mot de passe
        </h1>
        <p className="mt-2 text-gray-600">
          Vous êtes identifié comme <strong>{user.email}</strong>. Choisissez
          votre nouveau mot de passe.
        </p>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <NewPasswordForm />
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Ce n&apos;est pas votre compte ?{" "}
        <Link href="/connexion" className="font-medium text-brand-600 hover:underline">
          Se connecter autrement
        </Link>
      </p>
    </div>
  );
}
