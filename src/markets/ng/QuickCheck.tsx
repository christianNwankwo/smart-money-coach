import Link from "next/link";
import { ngMarket } from "@/markets/ng";

/**
 * Nigeria has no recommendation engine yet.
 *
 * This stands in for the US `QuickCheck` so the route still resolves, but it is
 * a separate component rather than a branch inside the US one — that is what
 * keeps `recommendation.ts` and everything it pulls in (the mortgage, PMI and
 * refinance engines) out of the Nigerian bundle entirely.
 */
export default function QuickCheck() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
        Quick Check isn&apos;t available for {ngMarket.name} yet
      </h1>
      <p className="mx-auto mt-3 max-w-md text-slate-500 dark:text-slate-400">
        The recommendation engine is built around products that don&apos;t apply
        here — employer-matched retirement accounts, mortgage insurance,
        30-year fixed-rate prepayment. Handing you a plan written for a
        different country would be worse than handing you none.
      </p>
      <p className="mx-auto mt-3 max-w-md text-slate-500 dark:text-slate-400">
        The calculators work on your actual numbers today.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500"
      >
        Browse the tools <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
