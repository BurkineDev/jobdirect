import type { Metadata } from "next";
import { TaskForm } from "@/components/forms/TaskForm";

export const metadata: Metadata = {
  title: "Publier une tâche",
  description:
    "Publiez gratuitement une tâche ponctuelle et trouvez une personne disponible près de chez vous.",
};

export default function PublierPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Publier une tâche
        </h1>
        <p className="mt-2 text-gray-600">
          Décrivez ce dont vous avez besoin. C&apos;est gratuit et sans
          engagement — votre tâche sera publiée après une rapide validation.
        </p>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <TaskForm />
      </div>
    </div>
  );
}
