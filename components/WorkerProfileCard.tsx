import Link from "next/link";
import type { PublicWorker } from "@/lib/types";

export function WorkerProfileCard({ worker }: { worker: PublicWorker }) {
  const initial = worker.display_name.charAt(0).toUpperCase();

  return (
    <Link
      href={`/embaucher/${worker.id}`}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
          {initial}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-ink group-hover:text-brand-700">
            {worker.display_name}
          </h3>
          <p className="flex items-center gap-1 text-sm text-gray-500">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {worker.city}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-sm text-gray-600">
        {worker.skills}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="line-clamp-1 text-xs text-gray-400">
          {worker.availability}
        </span>
        <span className="whitespace-nowrap text-sm font-semibold text-brand-600 group-hover:underline">
          Demander →
        </span>
      </div>
    </Link>
  );
}
