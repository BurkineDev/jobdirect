import type { Metadata } from "next";
import { WorkerForm } from "@/components/forms/WorkerForm";

export const metadata: Metadata = {
  title: "Je cherche du travail",
  description:
    "Inscrivez-vous comme travailleur journalier et recevez des opportunités ponctuelles près de chez vous.",
};

export default function TravailleurPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Je cherche du travail
        </h1>
        <p className="mt-2 text-gray-600">
          Créez votre profil de travailleur journalier. Nous vous contacterons
          lorsqu&apos;une tâche correspond à vos compétences et à votre région.
        </p>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <WorkerForm />
      </div>
    </div>
  );
}
