"use client";

import Link from "next/link";
import { useState } from "react";
import Layout from "@/components/Layout";
import { DebtIcon, MortgageIcon, RefinanceIcon } from "@/components/ToolIcon";
import { tools, categories, searchTools } from "@/registry";
import { marketConfig } from "@/market";

const CAT_ICONS: Record<string, React.ComponentType> = {
  mortgage: MortgageIcon,
  debt: DebtIcon,
};

const TOOL_ICONS: Record<string, React.ComponentType> = {
  "mortgage-deep-dive": MortgageIcon,
  "debt-payoff": DebtIcon,
  "refinance-break-even": RefinanceIcon,
};

export default function Home() {
  const [query, setQuery] = useState("");
  const results = query.trim() ? searchTools(query) : null;

  return (
    <Layout>
      {/* Hero */}
      <section className="pt-4 pb-8 text-center sm:pt-8 sm:pb-12">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Your mortgage and debt
          <br />
          numbers, actually explained
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-slate-500 dark:text-slate-400 sm:text-lg">
          Free calculators that show the arithmetic behind every figure —
          no advice, no uploads, no "contact an advisor."
        </p>
        {/* Search */}
        <div className="mx-auto mt-8 max-w-md">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900
              shadow-sm transition placeholder:text-slate-400 focus:border-emerald-500
              focus:outline-none focus:ring-2 focus:ring-emerald-500/20
              dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
          />
          {results && results.length === 0 && (
            <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
              No tools match &ldquo;{query}&rdquo; — try "mortgage", "debt", or "refinance".
            </p>
          )}
          {results && results.length > 0 && (
            <div className="mt-3 space-y-2">
              {results.map((tool) => {
                const Icon = TOOL_ICONS[tool.slug];
                return (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3
                      text-left shadow-sm transition hover:border-emerald-300 dark:border-slate-700
                      dark:bg-slate-800 dark:hover:border-emerald-600"
                  >
                    <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400">
                      {Icon && <Icon />}
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {tool.title}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tool.blurb}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Tools by category */}
      {categories.map((cat) => {
        const catTools = tools.filter((t) => t.category === cat.id);
        const CatIcon = CAT_ICONS[cat.id];
        return (
          <section key={cat.id} className="mt-10">
            <div className="flex items-center gap-2.5">
              {CatIcon && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  <CatIcon />
                </span>
              )}
              <div>
                <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500">
                  {cat.label}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {cat.blurb}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {catTools.map((tool) => {
                const ToolIcon = TOOL_ICONS[tool.slug];
                return (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5
                      shadow-sm transition hover:border-emerald-300 hover:shadow-md
                      dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-600"
                  >
                    <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {ToolIcon && <ToolIcon />}
                    </span>
                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                      {tool.title}
                    </h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                      {tool.blurb}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Open <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Quick Check card — only where the market has a recommendation engine */}
      {marketConfig.hasQuickCheck && (
      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Quick Check
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Fill a one-page profile and get an illustrated plan — every figure
              is computed from your numbers using the same engine as the tools.
            </p>
          </div>
          <Link
            href="/recommendation"
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500"
          >
            Get started →
          </Link>
        </div>
      </section>
      )}

      {/* Trust bar */}
      <section className="mt-16 border-t border-slate-200 pt-10 dark:border-slate-800">
        <div className="grid gap-6 text-center sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Runs in your browser
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Nothing you type is ever uploaded or stored on a server. The
              calculations happen in your browser, then vanish when you close
              the tab.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              The arithmetic is shown
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Every number on this site is computed from the inputs you see.
              No hidden assumptions, no "trust the algorithm" — you can verify
              the math yourself.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Not financial advice
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              These are arithmetic illustrations, not recommendations. They
              use only the numbers you type — not your tax situation, job, or
              goals.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
