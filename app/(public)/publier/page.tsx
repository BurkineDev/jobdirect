import type { Metadata } from "next";
import { TaskForm } from "@/components/forms/TaskForm";
import { getCurrentProfile } from "@/lib/auth";
import { CATEGORIES, CITIES } from "@/lib/constants";
import { categoryCopy } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Publier une tâche",
  description:
    "Publiez gratuitement une tâche ponctuelle et trouvez une personne disponible près de chez vous.",
};

export default async function PublierPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; category?: string }>;
}) {
  const [profile, params] = await Promise.all([
    getCurrentProfile(),
    searchParams,
  ]);

  // Les pages « service × ville » arrivent ici avec le contexte déjà choisi.
  // On ne fait confiance qu'aux valeurs présentes dans nos listes : ces champs
  // alimentent des `<select>`, et une valeur inconnue afficherait une
  // sélection impossible à soumettre.
  const city = CITIES.includes(params.city as never) ? params.city : undefined;
  const category = CATEGORIES.includes(params.category as never)
    ? params.category
    : undefined;

  const defaults = {
    ...(profile && {
      contact_name: profile.full_name,
      contact_phone: profile.phone ?? "",
      contact_email: profile.email,
    }),
    city,
    category,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          {category && city
            ? `${categoryCopy(category).h1} à ${city}`
            : "Publier une tâche"}
        </h1>
        <p className="mt-2 text-gray-600">
          Décrivez ce dont vous avez besoin. C&apos;est gratuit et sans
          engagement — votre tâche sera publiée après une rapide validation.
        </p>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <TaskForm defaults={defaults} />
      </div>
    </div>
  );
}
