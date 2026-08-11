"use client";

import { useMemo, useState } from "react";
import { useFormat, fieldDef, StatTile } from "@/components/tools/shared";

export default function EmergencyFund() {
  const f = useFormat();
  const [monthlyExpenses, setMonthlyExpenses] = useState(150_000);
  const [targetMonths, setTargetMonths] = useState(3);
  const [currentSavings, setCurrentSavings] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(30_000);

  const result = useMemo(() => {
    const target = monthlyExpenses * targetMonths;
    const gap = Math.max(0, target - currentSavings);
    const monthsToReach = monthlySavings > 0 ? Math.ceil(gap / monthlySavings) : 0;
    return { target, gap, monthsToReach };
  }, [monthlyExpenses, targetMonths, currentSavings, monthlySavings]);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          fieldDef("Monthly expenses", "exp", monthlyExpenses, setMonthlyExpenses, {
            min: 10_000,
            step: 10_000,
          }),
          fieldDef("Target months of cushion", "mo", targetMonths, setTargetMonths, {
            min: 1,
            max: 12,
            step: 1,
          }),
          fieldDef("Already saved", "saved", currentSavings, setCurrentSavings, {
            min: 0,
            step: 10_000,
          }),
          fieldDef("Saving per month", "rate", monthlySavings, setMonthlySavings, {
            min: 1_000,
            step: 5_000,
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

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Your target"
          value={f.money(result.target)}
          detail={`${targetMonths} months at ${f.money(monthlyExpenses)}/mo`}
        />
        <StatTile
          label="Still needed"
          value={f.money(result.gap)}
          detail={result.gap === 0 ? "Already there" : "Gap to close"}
        />
        <StatTile
          label="Time to reach"
          value={
            result.monthsToReach === 0
              ? "Already funded"
              : `${result.monthsToReach} months`
          }
          detail={
            result.monthsToReach > 0
              ? `at ${f.money(monthlySavings)}/mo`
              : ""
          }
        />
      </div>

      {result.gap === 0 && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="font-medium text-emerald-900 dark:text-emerald-300">
            Your emergency fund is fully funded at {f.money(result.target)}.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
        <p className="text-slate-600 dark:text-slate-400">
          <strong className="text-slate-800 dark:text-slate-200">Where to keep it:</strong> A separate
          savings account — not your current account. Separation is what makes it a fund.
          A money market or high-yield savings account that earns some interest without
          locking the money away is ideal.
        </p>
      </div>
    </div>
  );
}
