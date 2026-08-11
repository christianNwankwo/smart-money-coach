"use client";

import { useMemo, useState } from "react";
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
    const monthlyContribution = Math.round(monthlySalary * (contributionPct / 100));
    const months = yearsToRetirement * 12;
    const monthlyReturn = expectedReturnPct / 100 / 12;
    // Future value of existing balance + annuity of monthly contributions
    let balance = currentBalance;
    let totalContributions = 0;
    for (let m = 0; m < months; m++) {
      balance = Math.round(balance * (1 + monthlyReturn) + monthlyContribution);
      totalContributions += monthlyContribution;
    }
    const investmentGains = balance - currentBalance - totalContributions;
    // Discount to today's naira
    const monthlyInflation = inflationPct / 100 / 12;
    const todayValue = Math.round(balance / Math.pow(1 + monthlyInflation, months));
    return {
      monthlyContribution,
      projectedBalance: balance,
      totalContributions,
      investmentGains,
      todayValue,
      months,
    };
  }, [monthlySalary, contributionPct, currentBalance, yearsToRetirement, expectedReturnPct, inflationPct]);

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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Monthly contribution"
          value={f.money(result.monthlyContribution)}
          detail={`${contributionPct}% of salary`}
        />
        <StatTile
          label="Projected balance"
          value={f.money(result.projectedBalance)}
          detail={`at retirement`}
        />
        <StatTile
          label="In today's naira"
          value={f.money(result.todayValue)}
          detail={`after ${inflationPct}% inflation`}
        />
        <StatTile
          label="Total you put in"
          value={f.money(result.totalContributions)}
          detail={`${f.plain(result.months)} months`}
        />
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
        <p className="text-slate-600 dark:text-slate-400">
          <strong className="text-slate-800 dark:text-slate-200">
            What this projection means:
          </strong>{" "}
          If you contribute {f.money(result.monthlyContribution)}/month for{' '}
          {yearsToRetirement} years at {expectedReturnPct}% return, your RSA could grow to{' '}
          {f.money(result.projectedBalance)}. But in today's naira, at {inflationPct}% inflation,
          that is worth about {f.money(result.todayValue)}. The gap between those two
          numbers is the cost of inflation — not a flaw in the pension.
        </p>
      </div>
    </div>
  );
}
