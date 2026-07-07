import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function InscriptionPage() {
  if (await getCurrentUser()) redirect("/mon-compte");

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Créer un compte
        </h1>
        <p className="mt-2 text-gray-600">
          Un compte vous permet de suivre vos tâches et vos candidatures.
        </p>
      </header>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <SignupForm />
      </div>
    </div>
  );
}
