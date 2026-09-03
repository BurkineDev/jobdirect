import type { Metadata } from "next";
import { WorkerForm } from "@/components/forms/WorkerForm";
import { CITIES } from "@/lib/constants";
import { getMarketSnapshot } from "@/lib/market";

export const metadata: Metadata = {
  title: "Je cherche du travail",
  description:
    "Inscrivez-vous comme travailleur journalier et recevez des opportunités ponctuelles près de chez vous.",
};

export default async function TravailleurPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const params = await searchParams;
  const city = CITIES.includes(params.city as never) ? params.city : undefined;

  // Un travailleur s'inscrit s'il croit qu'il y a du travail : on lui montre
  // le vrai compte de tâches ouvertes dans sa ville, jamais une estimation.
  const market = await getMarketSnapshot();
  const openInCity = city ? (market.tasksByCity[city] ?? 0) : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          {city ? `Je cherche du travail à ${city}` : "Je cherche du travail"}
        </h1>
        <p className="mt-2 text-gray-600">
          Créez votre profil de travailleur journalier. Nous vous contacterons
          lorsqu&apos;une tâche correspond à vos compétences et à votre région.
        </p>
        {openInCity > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 ring-1 ring-inset ring-green-200">
            {openInCity} tâche{openInCity > 1 ? "s" : ""} ouverte
            {openInCity > 1 ? "s" : ""} à {city} en ce moment
          </p>
        )}
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <WorkerForm defaults={{ city }} />
      </div>
    </div>
  );
}
