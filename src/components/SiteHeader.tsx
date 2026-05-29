import Link from "next/link";

export default function SiteHeader({ showBack = false }: { showBack?: boolean }) {
  return (
    <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-lg font-bold text-white shadow-lg shadow-emerald-500/30">
            $
          </span>
          <span className="text-sm font-semibold tracking-wide text-white group-hover:text-emerald-300 sm:text-base">
            Smart Money Coach
          </span>
        </Link>
        {showBack && (
          <Link
            href="/"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            ← Edit profile
          </Link>
        )}
      </div>
    </header>
  );
}
