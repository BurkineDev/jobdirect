import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}
      aria-label="JobDirect — accueil"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </span>
      <span className="text-xl">
        Job<span className="text-brand-500">Direct</span>
      </span>
    </Link>
  );
}
