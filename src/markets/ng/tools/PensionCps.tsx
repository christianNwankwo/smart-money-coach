"use client";

import { useMemo, useState } from "react";
import { projectContributions } from "@/lib/finance/savings";
import { useFormat, fieldDef, StatTile } from "@/components/tools/shared";

export default function PensionCps() {
  const f = useFormat();
  const [monthlySalary, setMonthlySalary] = useState(300_000);
  const [contributionPct, setContributionPct] = useState(10);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [yearsToRetirement, setYearsToRetirement] = useState(25);
  const [expectedReturnPct, setExpectedReturnPct] = useState(12);
  const [inflationPct, setInflationPct] = useState(15);

  const result = useMemo(() => {
    const monthlyContribution = Math.round(
      monthlySalary * (contributionPct / 100)
    );
    const months = yearsToRetirement * 12;
    try {
      const projection = projectContributions({
        openingBalance: currentBalance,
        monthlyContribution,
        months,
        annualReturnPct: expectedReturnPct,
        annualInflationPct: inflationPct,
      });
      return { ...projection, monthlyContribution, months };
    } catch {
      return null;
    }
  }, [
    monthlySalary,
    contributionPct,
    currentBalance,
    yearsToRetirement,
    expectedReturnPct,
    inflationPct,
  ]);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          fieldDef("Monthly salary", "sal", monthlySalary, setMonthlySalary, {
            min: 30_000,
            step: 50_000,
          }),
          fieldDef("Pension rate (%)", "rate", contributionPct, setContributionPct, {
            min: 8,
            max: 20,
            step: 0.5,
          }),
          fieldDef("Current RSA balance", "bal", currentBalance, setCurrentBalance, {
            min: 0,
            step: 100_000,
          }),
          fieldDef("Years to retirement", "yrs", yearsToRetirement, setYearsToRetirement, {
            min: 1,
            max: 45,
            step: 1,
          }),
          fieldDef("Expected return (%)", "ret", expectedReturnPct, setExpectedReturnPct, {
            min: 5,
            max: 20,
            step: 0.5,
          }),
          fieldDef("Inflation (%)", "inf", inflationPct, setInflationPct, {
            min: 5,
            max: 40,
            step: 1,
          }),
        ].map((fd) => (
          <label key={fd.key} className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {fd.label}
            </span>
            <input
              type="number"
              value={fd.value}
              step={fd.step}
              min={fd.min}
              max={fd.max}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) fd.set(v);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
                text-slate-900 shadow-sm transition focus:border-emerald-500
                focus:outline-none focus:ring-2 focus:ring-emerald-500/20
                dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
        ))}
      </div>

      {result && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Monthly contribution"
              value={f.money(result.monthlyContribution)}
              detail={`${contributionPct}% of salary`}
            />
            <StatTile
              label="Projected balance"
              value={f.money(result.finalBalance)}
              detail="at retirement"
            />
            <StatTile
              label="In today's naira"
              value={f.money(result.balanceInTodaysMoney)}
              detail={`after ${inflationPct}% inflation`}
            />
            <StatTile
              label="Total you put in"
              value={f.money(result.totalContributed)}
              detail={`over ${f.plain(result.months)} months`}
            />
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-slate-600 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-200">
                What this projection means:
              </strong>{" "}
              Contributing {f.money(result.monthlyContribution)}/month for{" "}
              {yearsToRetirement} years at {expectedReturnPct}% could grow the
              account to {f.money(result.finalBalance)} — of which{" "}
              {f.money(result.investmentGrowth)} is investment growth rather than
              your own contributions. In today&apos;s naira, at {inflationPct}%
              inflation, that balance is worth about{" "}
              {f.money(result.balanceInTodaysMoney)}. The gap between those two
              figures is what inflation takes, not a flaw in the pension.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
