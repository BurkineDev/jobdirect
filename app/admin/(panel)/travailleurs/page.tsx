import { getAllWorkers } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";

export default async function AdminWorkersPage() {
  const workers = await getAllWorkers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Travailleurs inscrits</h1>
        <p className="text-sm text-gray-500">
          {workers.length} travailleur{workers.length > 1 ? "s" : ""} inscrit
          {workers.length > 1 ? "s" : ""}.
        </p>
      </div>

      {workers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-ink">{worker.name}</h3>
                  <p className="text-sm text-gray-500">{worker.city}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDateTime(worker.created_at)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a
                  href={`tel:${worker.phone}`}
                  className="text-brand-600 hover:underline"
                >
                  {worker.phone}
                </a>
                <a
                  href={`mailto:${worker.email}`}
                  className="text-brand-600 hover:underline"
                >
                  {worker.email}
                </a>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-400">
                    Compétences
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-line text-gray-700">
                    {worker.skills}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-400">
                    Disponibilités
                  </dt>
                  <dd className="mt-0.5 text-gray-700">{worker.availability}</dd>
                </div>
                {worker.experience && (
                  <div>
                    <dt className="text-xs font-medium uppercase text-gray-400">
                      Expérience
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-line text-gray-700">
                      {worker.experience}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          Aucun travailleur inscrit pour le moment.
        </div>
      )}
    </div>
  );
}
