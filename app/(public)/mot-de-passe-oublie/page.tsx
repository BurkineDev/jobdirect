import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: "Recevez un lien pour réinitialiser votre mot de passe JobDirect.",
  // Aucun intérêt dans un moteur de recherche, et une page de récupération
  // indexée attire surtout les tentatives automatisées.
  robots: { index: false, follow: false },
};

export default async function MotDePasseOubliePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Mot de passe oublié
        </h1>
        <p className="mt-2 text-gray-600">
          Entrez le courriel de votre compte : nous vous envoyons un lien pour
          en choisir un nouveau.
        </p>
      </header>

      {/* Renvoyé ici par /auth/callback quand le lien du courriel a expiré
          ou a déjà servi : on explique au lieu de laisser deviner. */}
      {erreur === "lien" && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Ce lien n&apos;était plus valide — ils expirent après une heure et
            ne fonctionnent qu&apos;une fois. Demandez-en un nouveau ci-dessous.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
