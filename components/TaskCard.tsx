import Link from "next/link";
import { formatBudget, formatDate } from "@/lib/format";
import type { PublicTask } from "@/lib/queries";

export function TaskCard({ task }: { task: PublicTask }) {
  return (
    <Link
      href={`/taches/${task.id}`}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-ink group-hover:text-brand-700">
          {task.title}
        </h3>
        <span className="whitespace-nowrap rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
          {task.category}
        </span>
      </div>

      <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
        <svg
          className="h-4 w-4"
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
        {task.city}
      </p>

      <p className="mt-3 line-clamp-2 flex-1 text-sm text-gray-600">
        {task.description}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="text-sm">
          <span className="font-semibold text-brand-600">
            {formatBudget(task.budget_estimate)}
          </span>
          <span className="text-gray-400"> · {formatDate(task.desired_date)}</span>
        </div>
        <span className="text-sm font-semibold text-brand-600 group-hover:underline">
          Voir →
        </span>
      </div>
    </Link>
  );
}
