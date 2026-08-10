import Link from "next/link";

export default function Layout({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "tool" | "narrow";
}) {
  const maxW =
    variant === "narrow" ? "max-w-2xl" : variant === "tool" ? "max-w-4xl" : "max-w-6xl";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-900/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Smart Money Coach home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-base font-bold text-white shadow-md shadow-emerald-600/20 transition group-hover:bg-emerald-500">
              $
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200">
              Smart Money Coach
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/tools/mortgage-deep-dive"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 sm:block"
            >
              Mortgage
            </Link>
            <Link
              href="/tools/debt-payoff"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 sm:block"
            >
              Debt
            </Link>
            <Link
              href="/tools/refinance-break-even"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 sm:block"
            >
              Refinance
            </Link>
            <Link
              href="/recommendation"
              className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              Quick Check
            </Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className={`mx-auto w-full ${maxW} flex-1 px-4 py-8 sm:px-6 sm:py-12`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-500">
            Smart Money Coach is arithmetic, not advice. Every figure shown is
            computed from the numbers you type — not from your tax situation,
            job security, health, or anything else a person who knows you would
            weigh.{" "}
            <strong className="font-semibold text-slate-500 dark:text-slate-400">
              For educational purposes only.
            </strong>
          </p>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-600">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-400">
              Smart Money Coach
            </Link>{" "}
            · All calculations run in your browser
          </p>
        </div>
      </footer>
    </div>
  );
}
