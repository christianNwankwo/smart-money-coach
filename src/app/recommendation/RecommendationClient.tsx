"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { generateRecommendation } from "@/lib/recommendation";
import { loadProfile } from "@/lib/storage";
import type { FinancialProfile, RecommendationResult } from "@/types/financial";

function CoachText({ children, className = "" }: { children: string; className?: string }) {
  const paragraphs = children.split(/\n\n+/).filter(Boolean);
  return (
    <div className={className}>
      {paragraphs.map((para, i) => (
        <p key={i} className={i > 0 ? "mt-4" : undefined}>
          <InlineBold text={para} />
        </p>
      ))}
    </div>
  );
}

function InlineBold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-slate-900 dark:text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function RecommendationClient() {
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const data = loadProfile();
    setProfile(data);
    if (data) setResult(generateRecommendation(data));
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile || !result) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          No profile found
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Complete the form on the homepage to get your illustrated plan.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-500"
        >
          Go to homepage
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        Your illustrated plan
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        Coach recommendation
      </h1>
      <p className="mt-3 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
        Primary focus: {result.focusArea}
      </p>

      <section className="mt-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-lg dark:border-emerald-800 dark:from-emerald-950/40 dark:to-slate-800 sm:p-8">
        <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-300">
          Recommendation summary
        </h2>
        <CoachText className="mt-3 text-lg leading-relaxed text-slate-800 dark:text-slate-200" children={result.summary} />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Your numbers explained
        </h2>
        <CoachText className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300" children={result.personalizedWhy} />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Suggested strategy
        </h2>
        <CoachText className="mt-3 leading-relaxed text-slate-700 dark:text-slate-300" children={result.suggestedStrategy} />
      </section>

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-6 dark:border-amber-800 dark:bg-amber-950/30 sm:p-8">
        <h2 className="text-lg font-semibold text-amber-950 dark:text-amber-300">
          Risks & tradeoffs
        </h2>
        <CoachText className="mt-3 leading-relaxed text-amber-900/90 dark:text-amber-200/80" children={result.risksAndTradeoffs} />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          3 next actions
        </h2>
        <ol className="mt-4 space-y-4">
          {result.nextActions.map((action, i) => (
            <li
              key={action}
              className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <p className="pt-1 text-slate-700 dark:text-slate-300">{action}</p>
            </li>
          ))}
        </ol>
      </section>

      <ProfileSnapshot profile={profile} />
    </div>
  );
}

function ProfileSnapshot({ profile }: { profile: FinancialProfile }) {
  const effective = profile.retirementContributionPct + profile.employerMatchPct;
  const monthlyIncome = profile.householdIncome / 12;
  const savingsMonths =
    monthlyIncome > 0 ? (profile.savingsAmount / monthlyIncome).toFixed(1) : "—";

  const rows: [string, string][] = [
    ["Age", String(profile.age)],
    ["Household income", `$${profile.householdIncome.toLocaleString()}/yr`],
    [
      "Mortgage",
      `$${profile.mortgageBalance.toLocaleString()} @ ${profile.mortgageInterestRate}% ($${profile.monthlyMortgagePayment.toLocaleString()}/mo)`,
    ],
    [
      "Retirement",
      `${profile.retirementContributionPct}% you + ${profile.employerMatchPct}% match (${effective}% total)`,
    ],
    [
      "Savings / debt",
      `$${profile.savingsAmount.toLocaleString()} (~${savingsMonths} mo) / $${profile.otherDebt.toLocaleString()} debt`,
    ],
    ["Risk tolerance", profile.riskTolerance],
    ["Goal", profile.financialGoal],
  ];

  return (
    <details className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <summary className="cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-400">
        View submitted inputs
      </summary>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
