import Link from "next/link";
import Layout from "@/components/Layout";

export default function NotFound() {
  return (
    <Layout variant="narrow">
      <div className="flex flex-col items-center py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          404
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          No tool at this address
        </h1>
        <p className="mt-3 max-w-sm text-slate-500 dark:text-slate-400">
          The link may be out of date, or the tool may have been renamed.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500"
        >
          Browse all tools <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Layout>
  );
}
