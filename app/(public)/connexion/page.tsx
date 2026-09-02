import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthLoginForm } from "@/components/auth/AuthLoginForm";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; erreur?: string }>;
}) {
  if (await getCurrentUser()) redirect("/mon-compte");
  const { redirect: redirectTo, erreur } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Connexion
        </h1>
        <p className="mt-2 text-gray-600">
          Accédez à votre compte JobDirect.
        </p>
      </header>
      {erreur === "oauth" && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          La connexion externe n&apos;a pas abouti. Réessayez, ou utilisez
          votre courriel et mot de passe.
        </div>
      )}
      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <AuthLoginForm redirectTo={redirectTo} />
        <OAuthButtons redirectTo={redirectTo} />
      </div>
    </div>
  );
}
