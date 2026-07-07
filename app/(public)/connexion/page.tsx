import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthLoginForm } from "@/components/auth/AuthLoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  if (await getCurrentUser()) redirect("/mon-compte");
  const { redirect: redirectTo } = await searchParams;

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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <AuthLoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
