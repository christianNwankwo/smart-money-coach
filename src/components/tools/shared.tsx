/** Shared UI and formatting for every tool component — market-aware. */

import { useMarket } from "@/components/MarketContext";
import type { MarketConfig } from "@/markets/types";

export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
        {value}
      </dd>
      {detail && (
        <dd className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{detail}</dd>
      )}
    </div>
  );
}

export function ResultRow({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          accent ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"
        }`}
      >
        {value}
      </div>
      {detail && <div className="text-xs text-slate-400 dark:text-slate-500">{detail}</div>}
    </div>
  );
}

export interface FieldConfig {
  key: string;
  label: string;
  unit?: string;
  value: number;
  set: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function fieldDef(
  label: string,
  key: string,
  value: number,
  set: (v: number) => void,
  opts?: { min?: number; max?: number; step?: number }
): FieldConfig;
export function fieldDef(
  label: string,
  _unit: string,
  key: string,
  value: number,
  set: (v: number) => void,
  opts?: { min?: number; max?: number; step?: number }
): FieldConfig;
export function fieldDef(
  label: string,
  unitOrKey: string,
  keyOrValue: string | number,
  setOrValue: number | ((v: number) => void),
  setOrOpts?: ((v: number) => void) | { min?: number; max?: number; step?: number },
  opts?: { min?: number; max?: number; step?: number }
): FieldConfig {
  // Backward-compatible: the old signature was (label, unit, key, value, set, opts?)
  // The new signature is (label, key, value, set, opts?)
  let key: string;
  let value: number;
  let set: (v: number) => void;
  let resolvedOpts: { min?: number; max?: number; step?: number } | undefined;

  let u: string | undefined;
  if (typeof setOrValue === "number") {
    // Old signature: (label, unit, key, value, set, opts?)
    u = unitOrKey;
    key = keyOrValue as string;
    value = setOrValue;
    set = setOrOpts as (v: number) => void;
    resolvedOpts = opts;
  } else {
    // New signature: (label, key, value, set, opts?)
    key = unitOrKey;
    value = keyOrValue as number;
    set = setOrValue;
    resolvedOpts = setOrOpts as { min?: number; max?: number; step?: number } | undefined;
  }
  return { key, label, unit: u ?? undefined, value, set, ...resolvedOpts };
}

/** Market-aware number formatting — use this hook instead of the static `fmt`. */
export function useFormat() {
  const m = useMarket();
  return createFormat(m);
}

export function createFormat(m: MarketConfig) {
  const { currency } = m;
  return {
    money(n: number): string {
      if (!Number.isFinite(n)) return "—";
      return n.toLocaleString(currency.locale, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: currency.fractionDigits,
        maximumFractionDigits: currency.fractionDigits,
      });
    },
    plain(n: number): string {
      if (!Number.isFinite(n)) return "—";
      return n.toLocaleString(currency.locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    },
    pct(n: number): string {
      if (!Number.isFinite(n)) return "—";
      return `${(n * 100).toFixed(1)}%`;
    },
    months(total: number): string {
      if (!Number.isFinite(total)) return "—";
      const y = Math.floor(total / 12);
      const mo = total % 12;
      const parts: string[] = [];
      if (y > 0) parts.push(`${y}y`);
      if (mo > 0 || parts.length === 0) parts.push(`${mo}mo`);
      return parts.join(" ");
    },
    currency: m.currency,
  };
}

/** Static formatter for non-React code (tests, server components). */
const _fmt = {
  dollars(n: number): string {
    return _fmt.money(n);
  },
  money(n: number): string {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  },
  plain(n: number): string {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },
  pct(n: number): string {
    if (!Number.isFinite(n)) return "—";
    return `${(n * 100).toFixed(1)}%`;
  },
  months(total: number): string {
    if (!Number.isFinite(total)) return "—";
    const y = Math.floor(total / 12);
    const m = total % 12;
    const parts: string[] = [];
    if (y > 0) parts.push(`${y}y`);
    if (m > 0 || parts.length === 0) parts.push(`${m}mo`);
    return parts.join(" ");
  },
};
export const fmt = _fmt;
