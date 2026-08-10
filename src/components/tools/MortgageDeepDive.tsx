"use client";

import { computePiti, buildSchedule, comparePrepayment, analyzeRefinance } from "@/lib/finance";
import { useMemo, useState } from "react";
import Link from "next/link";
import LineChart, { downsample } from "@/components/charts/LineChart";
import { ResultRow, StatTile, fieldDef, fmt } from "./shared";

export default function MortgageDeepDive() {
  const [homePrice, setHomePrice] = useState(400_000);
  const [downPayment, setDownPayment] = useState(40_000);
  const [rate, setRate] = useState(6.5);
  const [termMonths, setTermMonths] = useState(360);
  const [propertyTax, setPropertyTax] = useState(6_000);
  const [insurance, setInsurance] = useState(1_800);
  const [hoa, setHoa] = useState(0);
  const [pmiRate, setPmiRate] = useState(0.5);
  const [extraMonthly, setExtraMonthly] = useState(0);

  const piti = useMemo(
    () =>
      computePiti({
        homePrice,
        downPayment,
        annualRatePct: rate,
        termMonths,
        annualPropertyTax: propertyTax,
        annualHomeInsurance: insurance,
        monthlyHoa: hoa,
        pmiAnnualRatePct: pmiRate,
      }),
    [homePrice, downPayment, rate, termMonths, propertyTax, insurance, hoa, pmiRate]
  );

  const prepay = useMemo(
    () =>
      extraMonthly > 0
        ? comparePrepayment(
            {
              principal: piti.loanAmount,
              annualRatePct: rate,
              termMonths,
            },
            { extraMonthly }
          )
        : null,
    [piti.loanAmount, rate, termMonths, extraMonthly]
  );

  const chartData = useMemo(() => {
    const schedule = buildSchedule({
      principal: piti.loanAmount,
      annualRatePct: rate,
      termMonths,
    });
    // Downsample to ~80 points for reasonable SVG output.
    const balances = downsample(
      schedule.rows.map((r) => r.endingBalance),
      80
    );
    const baseline = { id: "baseline", label: "Balance", values: balances, fill: true };
    if (!prepay) return { series: [baseline], xLabels: labelEvery(balances.length) };
    const accBalances = downsample(
      prepay.accelerated.rows.map((r) => r.endingBalance),
      80
    );
    return {
      series: [
        baseline,
        {
          id: "accelerated",
          label: "With extra",
          values: accBalances,
          fill: false,
        },
      ],
      xLabels: labelEvery(Math.max(balances.length, accBalances.length)),
    };
  }, [piti.loanAmount, rate, termMonths, prepay]);

  const refiTeaser = useMemo(() => {
    if (rate < 5 || prepay) return null; // only show when rate is high enough and no extra pmt set
    const newRate = Math.round((rate - 0.75) * 1000) / 1000;
    if (newRate <= 0) return null;
    try {
      const result = analyzeRefinance({
        currentBalance: piti.loanAmount,
        currentRatePct: rate,
        currentRemainingMonths: termMonths,
        newRatePct: newRate,
        newTermMonths: termMonths,
        closingCosts: Math.round(piti.loanAmount * 0.02),
        rollCostsIn: true,
        monthsYouStay: 120,
      });
      return {
        newRate,
        breakEvenMonths: result.totalCostBreakEvenMonths,
        lifetimeSaving: result.lifetimeInterestSaved,
      };
    } catch {
      return null;
    }
  }, [piti.loanAmount, rate, termMonths, prepay]);

  return (
    <div>
      {/* Input grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          fieldDef("Home price", "$", "homePrice", homePrice, setHomePrice, {
            min: 10_000,
            step: 5_000,
          }),
          fieldDef("Down payment", "$", "down", downPayment, setDownPayment, {
            min: 0,
            step: 5_000,
          }),
          fieldDef("Rate (%)", "", "rate", rate, setRate, { min: 0, max: 25, step: 0.125 }),
          fieldDef("Term (months)", "", "term", termMonths, setTermMonths, {
            min: 12,
            max: 480,
            step: 12,
          }),
          fieldDef("Property tax/yr", "$", "tax", propertyTax, setPropertyTax, {
            min: 0,
            step: 500,
          }),
          fieldDef("Insurance/yr", "$", "ins", insurance, setInsurance, {
            min: 0,
            step: 100,
          }),
          fieldDef("HOA/mo", "$", "hoa", hoa, setHoa, { min: 0, step: 25 }),
          fieldDef("PMI rate (%)", "", "pmi", pmiRate, setPmiRate, {
            min: 0,
            max: 3,
            step: 0.05,
          }),
          fieldDef("Extra principal/mo", "$", "extra", extraMonthly, setExtraMonthly, {
            min: 0,
            step: 50,
          }),
        ].map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs font-medium text-slate-500">
              {f.label}{" "}
              {f.unit === "$" && (
                <span className="tabular-nums text-slate-400">$</span>
              )}
            </span>
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
      </div>

      {/* Stat tiles */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Monthly P&I"
          value={fmt.dollars(piti.principalAndInterest)}
        />
        <StatTile
          label="Monthly total"
          value={fmt.dollars(piti.monthlyTotal)}
          detail="with escrow and PMI"
        />
        <StatTile
          label="Loan amount"
          value={fmt.dollars(piti.loanAmount)}
          detail={`${piti.ltvPct.toFixed(1)}% LTV`}
        />
        <StatTile
          label="PMI"
          value={piti.pmiRequired ? fmt.dollars(piti.pmi) + "/mo" : "None"}
          detail={
            piti.pmiRequired
              ? `Ends month ${piti.pmiEndsMonth} (ask at month ${piti.pmiRequestableMonth})`
              : ""
          }
        />
      </div>

      {/* PMI detail */}
      {piti.pmiRequired && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-300">
            PMI costs ${fmt.plain(piti.totalPmiPaid)} total if you wait.{' '}
            Asking for cancellation at 80% LTV saves ${fmt.plain(piti.pmiSavedByRequesting)}.
          </p>
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            The automatic date (month {piti.pmiAutomaticMonth}) follows the original schedule —
            extra principal does not move it. You must request cancellation.
          </p>
        </div>
      )}

      {/* Prepayment comparison */}
      {prepay && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
            Extra principal: what ${fmt.plain(extraMonthly)}/month buys
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <ResultRow label="Without extra" value={`${prepay.baseline.monthsToPayoff} months`} />
            <ResultRow
              label="With extra"
              value={`${prepay.accelerated.monthsToPayoff} months`}
            />
            <ResultRow
              label="Months saved"
              value={`${prepay.monthsSaved}`}
              accent
            />
            <ResultRow
              label="Interest saved"
              value={fmt.dollars(prepay.interestSaved)}
              accent
            />
            <ResultRow
              label="Extra paid in"
              value={fmt.dollars(prepay.extraPaid)}
            />
            <ResultRow
              label="Saved per $1 extra"
              value={`${fmt.plain(Math.round(prepay.savedPerExtraDollar * 100))}¢`}
              detail="compare to investment return"
            />
          </div>
        </div>
      )}

      {/* Balance over time chart */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Balance over time
        </h3>
        <LineChart
          series={chartData.series}
          xLabels={chartData.xLabels}
          yLabel="Remaining balance"
        />
      </div>

      {/* Refinance cross-link */}
      {refiTeaser && (
        <div className="mt-6 rounded-lg border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-sky-900">
                Should you refinance?
              </h3>
              <p className="mt-1 text-sm text-sky-700">
                At {rate}%, refinancing this balance to roughly{' '}
                {refiTeaser.newRate}% would{' '}
                {refiTeaser.breakEvenMonths !== null
                  ? `break even in ${refiTeaser.breakEvenMonths} months and ${refiTeaser.lifetimeSaving > 0 ? `save ${fmt.dollars(refiTeaser.lifetimeSaving)}` : `cost ${fmt.dollars(Math.abs(refiTeaser.lifetimeSaving))} more`} over the full term.`
                  : 'never break even — the rate drop is too small for the closing costs.'}
              </p>
            </div>
            <Link
              href={`/tools/refinance-break-even?balance=${piti.loanAmount}&rate=${rate}&months=${termMonths}`}
              className="shrink-0 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white
                transition hover:bg-sky-700"
            >
              Run full analysis →
            </Link>
          </div>
        </div>
      )}

      {/* First 12 rows of the schedule */}
      <details className="mt-6 group">
        <summary className="cursor-pointer text-sm font-medium text-slate-500 group-hover:text-slate-700">
          View first 12 months of the amortisation schedule
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-2 py-1.5">Mo</th>
                <th className="px-2 py-1.5 text-right">Payment</th>
                <th className="px-2 py-1.5 text-right">Interest</th>
                <th className="px-2 py-1.5 text-right">Principal</th>
                <th className="px-2 py-1.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {buildSchedule({
                principal: piti.loanAmount,
                annualRatePct: rate,
                termMonths,
              }).rows.slice(0, 12)
                .map((r) => (
                  <tr
                    key={r.month}
                    className="border-b border-slate-100 tabular-nums"
                  >
                    <td className="px-2 py-1.5 text-slate-500">{r.month}</td>
                    <td className="px-2 py-1.5 text-right text-slate-800">
                      {fmt.dollars(r.payment + r.extra)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-amber-600">
                      {fmt.dollars(r.interest)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-emerald-600">
                      {fmt.dollars(r.principal + r.extra)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-600">
                      {fmt.dollars(r.endingBalance)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** "Y1", "Y5", … labels for x-axis ticks on a balance chart. */
function labelEvery(count: number): string[] {
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    labels.push(
      i === 0 ? "Start" : i % 12 === 0 ? `Y${Math.round(i / 12)}` : ""
    );
  }
  return labels;
}
