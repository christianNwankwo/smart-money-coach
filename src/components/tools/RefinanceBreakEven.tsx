"use client";

import { analyzeRefinance } from "@/lib/finance";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import LineChart, { downsample } from "@/components/charts/LineChart";
import { ResultRow, StatTile, fieldDef, fmt } from "./shared";

function readParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function RefinanceBreakEven() {
  const searchParams = useSearchParams();
  const [seeded, setSeeded] = useState(false);

  const [balance, setBalance] = useState(300_000);
  const [currentRate, setCurrentRate] = useState(7);
  const [remainingMonths, setRemainingMonths] = useState(300);
  const [newRate, setNewRate] = useState(5.75);
  const [newTerm, setNewTerm] = useState(360);
  const [closingCosts, setClosingCosts] = useState(6_000);
  const [rollCosts, setRollCosts] = useState(false);
  const [monthsStay, setMonthsStay] = useState(120);

  // Pre-fill from URL params on first render — the Mortgage Deep Dive sends
  // balance, rate and remaining months so the user does not re-type.
  useEffect(() => {
    if (seeded) return;
    const b = readParam(searchParams, "balance");
    const r = readParam(searchParams, "rate");
    const m = readParam(searchParams, "months");
    if (b !== null) setBalance(b);
    if (r !== null) setCurrentRate(r);
    if (m !== null) setRemainingMonths(m);
    // Keep the new term aligned: same length as the incoming remaining months.
    if (m !== null) setNewTerm(Math.min(360, m));
    setSeeded(true);
  }, [searchParams, seeded]);

  const result = useMemo(
    () =>
      analyzeRefinance({
        currentBalance: balance,
        currentRatePct: currentRate,
        currentRemainingMonths: remainingMonths,
        newRatePct: newRate,
        newTermMonths: newTerm,
        closingCosts,
        rollCostsIn: rollCosts,
        monthsYouStay: monthsStay,
      }),
    [balance, currentRate, remainingMonths, newRate, newTerm, closingCosts, rollCosts, monthsStay]
  );

  const costChart = useMemo(() => {
    const stayingRows = result.currentSchedule.rows;
    const refiRows = result.newSchedule.rows;
    const horizon = Math.max(stayingRows.length, refiRows.length);
    // Cumulative interest series — staying is just interest, refi adds the closing costs
    const staying: number[] = [0];
    const refi: number[] = [result.cashDueAtClose];
    for (let m = 1; m <= horizon; m++) {
      const si = stayingRows[m - 1];
      const ri = refiRows[m - 1];
      staying.push(si ? si.cumulativeInterest : staying[staying.length - 1]);
      refi.push(
        ri
          ? result.cashDueAtClose + ri.cumulativeInterest
          : refi[refi.length - 1]
      );
    }
    const maxPts = 80;
    const stayDown = downsample(staying, maxPts);
    const refiDown = downsample(refi, maxPts);
    const step = Math.ceil(horizon / maxPts);
    const xLabels: string[] = [];
    for (let i = 0; i < maxPts; i++) {
      xLabels.push(i === 0 ? "Start" : (i * step) % 24 === 0 ? `Y${Math.round(i * step / 12)}` : "");
    }
    const breakEvenIdx = result.totalCostBreakEvenMonths
      ? Math.min(
          Math.round(result.totalCostBreakEvenMonths / step),
          maxPts - 1
        )
      : -1;
    return {
      series: [
        { id: "stay", label: "Current loan", values: stayDown, fill: false },
        { id: "refi", label: "Refinance", values: refiDown, fill: false },
      ],
      xLabels,
      breakEvenAt: breakEvenIdx > 0 ? breakEvenIdx : undefined,
    };
  }, [result]);

  const breakEvenLabel = (months: number | null): string => {
    if (months === null) return "Never";
    if (months === 0) return "Immediately";
    return `${months} months (${fmt.months(months)})`;
  };

  const costOverStaySign = result.costOverStay.saved >= 0 ? " saves " : " costs ";

  return (
    <div>
      {/* Input grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          fieldDef("Current balance", "$", "bal", balance, setBalance, {
            min: 0,
            step: 5_000,
          }),
          fieldDef("Current rate (%)", "", "crate", currentRate, setCurrentRate, {
            min: 0,
            max: 25,
            step: 0.125,
          }),
          fieldDef("Months left", "", "left", remainingMonths, setRemainingMonths, {
            min: 1,
            max: 480,
            step: 12,
          }),
          fieldDef("New rate (%)", "", "nrate", newRate, setNewRate, {
            min: 0,
            max: 25,
            step: 0.125,
          }),
          fieldDef("New term", "", "nterm", newTerm, setNewTerm, {
            min: 12,
            max: 480,
            step: 12,
          }),
          fieldDef("Closing costs", "$", "costs", closingCosts, setClosingCosts, {
            min: 0,
            step: 500,
          }),
        ].map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs font-medium text-slate-500">{f.label}</span>
            <input
              type="number"
              value={f.value}
              step={f.step}
              min={f.min}
              max={f.max}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) f.set(v);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
                text-slate-900 shadow-sm transition focus:border-emerald-500
                focus:outline-none focus:ring-2 focus:ring-emerald-500/20
                dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
        ))}

        {/* Roll costs and stay duration */}
        <label className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            checked={rollCosts}
            onChange={(e) => setRollCosts(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600
              focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-600">
            Finance costs into the loan
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-500">
            How long you expect to stay
          </span>
          <select
            value={monthsStay}
            onChange={(e) => setMonthsStay(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2
              text-sm text-slate-900 shadow-sm transition focus:border-emerald-500
              focus:outline-none focus:ring-2 focus:ring-emerald-500/20
              dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value={12}>1 year</option>
            <option value={36}>3 years</option>
            <option value={60}>5 years</option>
            <option value={84}>7 years</option>
            <option value={120}>10 years</option>
            <option value={180}>15 years</option>
            <option value={240}>20 years</option>
            <option value={300}>25 years</option>
          </select>
        </label>
      </div>

      {/* Payments */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Current payment"
          value={fmt.dollars(result.currentPayment)}
          detail="P&I"
        />
        <StatTile
          label="New payment"
          value={fmt.dollars(result.newPayment)}
          detail="P&I"
        />
        <StatTile
          label="Monthly saving"
          value={fmt.dollars(result.monthlySavings)}
          detail={result.monthlySavings < 0 ? "costs more" : ""}
        />
      </div>

      {/* Break-even — the substance of the page */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Cash-flow break-even
          </h3>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {breakEvenLabel(result.cashFlowBreakEvenMonths)}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {result.cashFlowBreakEvenMonths === null
              ? "The payment is not lower."
              : "Closing costs ÷ monthly saving — the number lenders quote."}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <h3 className="text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Total-cost break-even
          </h3>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-900 dark:text-emerald-300">
            {breakEvenLabel(result.totalCostBreakEvenMonths)}
          </p>
          <p className="mt-1 text-xs text-emerald-600">
            {result.totalCostBreakEvenMonths === null
              ? "This refinance never costs less than staying put."
              : "The month from which refinancing has cost less overall — the honest one."}
          </p>
        </div>
      </div>

      {/* If the refi extends the term, the borrower needs to know */}
      {result.extendsTerm && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-300">
            This refinance adds {fmt.months(result.monthsAddedToPayoff)} to your payoff date.
          </p>
          <p className="mt-0.5 text-amber-700 dark:text-amber-400">
            The lower payment comes from stretching the term, not just the rate — and
            that is why the two break-evens disagree.
          </p>
        </div>
      )}

      {/* Cumulative cost chart — the break-even is where the two lines cross */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Cumulative cost (interest + fees)
        </h3>
        <LineChart
          series={costChart.series}
          xLabels={costChart.xLabels}
          yLabel="Total cost"
          highlightAt={costChart.breakEvenAt}
          highlightLabel={
            result.totalCostBreakEvenMonths ? "break-even" : undefined
          }
        />
      </div>

      {/* Cost over the time they actually stay — the real answer */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          If you stay {fmt.months(monthsStay)}
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Refinancing{costOverStaySign}
          <span className="font-semibold tabular-nums text-slate-900">
            {fmt.dollars(Math.abs(result.costOverStay.saved))}
          </span>{" "}
          compared with staying in the current loan for the same period.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <ResultRow
            label="Stay in current loan"
            value={fmt.dollars(result.costOverStay.staying)}
            detail="interest over this window"
          />
          <ResultRow
            label="Refinance"
            value={fmt.dollars(result.costOverStay.refinancing)}
            detail={`incl. ${fmt.dollars(result.cashDueAtClose)} in closing costs`}
          />
        </div>
      </div>

      {/* Full-term effects */}
      <details className="mt-4 group">
        <summary className="cursor-pointer text-sm font-medium text-slate-500 group-hover:text-slate-700">
          Full-term comparison
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex justify-between rounded bg-slate-50 px-3 py-2">
            <span className="text-slate-500">Current loan total interest</span>
            <span className="tabular-nums font-medium text-slate-800">
              {fmt.dollars(result.currentTotalInterest)}
            </span>
          </div>
          <div className="flex justify-between rounded bg-slate-50 px-3 py-2">
            <span className="text-slate-500">New loan total interest</span>
            <span className="tabular-nums font-medium text-slate-800">
              {fmt.dollars(result.newTotalInterest)}
            </span>
          </div>
          <div className="flex justify-between rounded bg-slate-50 px-3 py-2">
            <span className="text-slate-500">
              Lifetime saving (net of closing costs)
            </span>
            <span
              className={`tabular-nums font-semibold ${
                result.lifetimeInterestSaved >= 0
                  ? "text-emerald-700"
                  : "text-red-600"
              }`}
            >
              {result.lifetimeInterestSaved >= 0 ? "+" : ""}
              {fmt.dollars(result.lifetimeInterestSaved)}
            </span>
          </div>
        </div>
      </details>
    </div>
  );
}
