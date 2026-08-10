/**
 * Single source of truth for the tool suite.
 *
 * Routing, the home grid, the category headings, search, the related-tools rail
 * and every page's metadata all derive from this file. Adding a tool is one
 * entry here plus one component in `src/components/tools/`, wired into
 * `src/tool-components.ts`.
 *
 * Deliberately free of React imports so it stays plain data: `tests/registry.test.mjs`
 * loads it directly in Node, and the build has no way to ship a tool whose copy
 * is missing.
 */

export type CategoryId = "mortgage" | "debt";

export interface Category {
  id: CategoryId;
  label: string;
  blurb: string;
  /** Tailwind classes for the category chip. */
  accent: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Tool {
  slug: string;
  category: CategoryId;
  title: string;
  /** One line, shown on the home card and under the tool's heading. */
  blurb: string;
  /** What someone would actually type into a search box to find this. */
  keywords: string[];
  /**
   * Steps and answers rendered on the tool page.
   *
   * Required by the type rather than optional. A tool page without them is a
   * heading, a form and nothing else — no explanation of what the numbers mean
   * and no reason for the page to exist for anyone who has not already decided
   * to use it. Nothing else in the build would catch that.
   */
  how: string[];
  faq: FaqItem[];
}

export const categories: Category[] = [
  {
    id: "mortgage",
    label: "Mortgage",
    blurb:
      "What the loan actually costs, what extra principal buys, and whether refinancing is worth the fees.",
    accent: "bg-emerald-500/10 text-emerald-700",
  },
  {
    id: "debt",
    label: "Debt",
    blurb:
      "Payoff order, the real cost of each strategy, and how much sooner an extra payment finishes it.",
    accent: "bg-sky-500/10 text-sky-700",
  },
];

/** Repeated across several answers, because it is the thing to be clear about. */
const NOT_ADVICE =
  "These are arithmetic results, not advice. They use the numbers you typed and " +
  "nothing else — not your tax situation, job security, health, or anything a " +
  "person who knows you would weigh.";

export const tools: Tool[] = [
  {
    slug: "mortgage-deep-dive",
    category: "mortgage",
    title: "Mortgage Deep Dive",
    blurb:
      "Full payment breakdown with escrow and PMI, the amortisation schedule, and what extra principal is worth.",
    keywords: [
      "mortgage calculator",
      "amortization schedule",
      "PITI",
      "PMI",
      "extra payment",
      "pay off mortgage early",
      "principal and interest",
      "escrow",
      "how much house can I afford",
    ],
    how: [
      "Enter the purchase price, down payment, rate and term.",
      "Add property tax, homeowners insurance and any HOA dues — these are part of the payment even though lenders quote them separately.",
      "Set a PMI rate if you are putting down less than 20%.",
      "Add an extra monthly amount to see what prepaying is worth in months and in interest.",
    ],
    faq: [
      {
        q: "Why is the total higher than the mortgage payment I was quoted?",
        a:
          "Because a quote is usually principal and interest only. Property tax, homeowners insurance, PMI and HOA dues are collected with the payment and can add 30–50% on top. The figure that matters is the one that leaves your account.",
      },
      {
        q: "When does PMI actually come off?",
        a:
          "Three rules apply at once. You may request cancellation once the scheduled balance reaches 80% of the original value; the servicer must cancel automatically at 78%; and it ends at the midpoint of the schedule regardless. The automatic date is keyed to the original amortisation schedule, so paying extra principal does not move it — you have to ask. The tool shows all three dates and what the difference costs.",
      },
      {
        q: "Does paying extra principal really save that much?",
        a:
          "Early on, yes, because almost all of a new payment is interest. The tool reports interest saved per extra dollar, which is the number to compare against what that dollar would earn elsewhere — a large total saved over 30 years can still be a mediocre return.",
      },
      {
        q: "Are these numbers exact?",
        a:
          "The arithmetic is, to the cent: interest is rounded monthly the way a servicer rounds it, and the payment is rounded up so the loan retires inside its stated term. Your actual statement will differ if your escrow is reassessed, your rate is not fixed, or your lender uses a different day-count. " +
          NOT_ADVICE,
      },
    ],
  },
  {
    slug: "debt-payoff",
    category: "debt",
    title: "Debt Payoff",
    blurb:
      "Avalanche against snowball on your actual balances — what each costs, and when each clears its first account.",
    keywords: [
      "debt snowball",
      "debt avalanche",
      "debt payoff calculator",
      "credit card payoff",
      "debt free date",
      "pay off debt fastest",
      "which debt first",
    ],
    how: [
      "List each debt with its balance, rate and minimum payment.",
      "Add any extra you can put toward debt each month.",
      "Compare the two strategies: avalanche targets the highest rate, snowball the smallest balance.",
      "Look at both the interest cost and the date of the first cleared account before choosing.",
    ],
    faq: [
      {
        q: "Which strategy is better?",
        a:
          "Avalanche always costs less interest — that is arithmetic, not opinion. Snowball clears an account sooner, and for many people that is what keeps the plan alive. The tool shows both numbers so the trade is explicit: if avalanche saves $120 and snowball clears a card eight months earlier, that is a decision you can actually make.",
      },
      {
        q: "What is the rollover, and why does it matter so much?",
        a:
          "When an account clears, its minimum payment does not disappear — it joins the money attacking the next debt, so the monthly total stays constant and the payoff accelerates. Both strategies here do this. A plan without it finishes years later.",
      },
      {
        q: "What if my minimum payment does not cover the interest?",
        a:
          "Then that balance grows no matter what you do elsewhere, and the tool says so and names the account rather than showing a payoff date that will never arrive. That is a signal to call the lender, not to budget harder.",
      },
      {
        q: "Should I pay off debt or invest?",
        a:
          "The tool gives you the interest rate you are guaranteed to avoid by paying a debt off, which is the number to compare against an expected return. It cannot tell you which to pick. " +
          NOT_ADVICE,
      },
    ],
  },
  {
    slug: "refinance-break-even",
    category: "mortgage",
    title: "Refinance Break-Even",
    blurb:
      "Two break-even dates: the one lenders quote, and the one that accounts for restarting the term.",
    keywords: [
      "refinance calculator",
      "refinance break even",
      "should I refinance",
      "closing costs",
      "mortgage refinance",
      "cash out refinance",
      "no cost refinance",
    ],
    how: [
      "Enter your current balance, rate and how many payments are left.",
      "Enter the offered rate, term and closing costs.",
      "Say whether the costs are paid in cash or financed into the balance.",
      "Compare the break-even month against how long you actually expect to keep the house.",
    ],
    faq: [
      {
        q: "Why are there two break-even numbers?",
        a:
          "The usual one divides the closing costs by the monthly payment saving. It ignores that a fresh 30-year term pays principal down more slowly, so a refinance can lower the payment while costing more money. The second figure compares total cost — interest plus fees — and is the one that answers whether the deal is good.",
      },
      {
        q: "Is it cheaper to roll the closing costs into the loan?",
        a:
          "No. It removes the cash due at closing, which can be the deciding factor if you do not have it, but the fees are then borrowed at the mortgage rate for up to 30 years. The tool shows the break-even moving out when you finance them.",
      },
      {
        q: "What counts as closing costs?",
        a:
          "Origination and underwriting fees, appraisal, title insurance and search, recording fees, and any discount points. A 'no-cost' refinance has not removed them — it has paid them with a higher rate, so enter the higher rate and zero costs to compare properly.",
      },
      {
        q: "What if I might move?",
        a:
          "Enter how long you expect to stay. Below the break-even month the refinance loses money, and the tool reports the loss rather than the headline saving. " +
          NOT_ADVICE,
      },
    ],
  },
];

export const toolsBySlug = new Map(tools.map((tool) => [tool.slug, tool]));

export function getTool(slug: string): Tool | undefined {
  return toolsBySlug.get(slug);
}

export function toolsInCategory(id: CategoryId): Tool[] {
  return tools.filter((tool) => tool.category === id);
}

/**
 * Other tools worth showing next to `slug` — same category first, then the
 * rest, so the rail is never empty and never dominated by one category.
 */
export function relatedTools(slug: string, limit = 3): Tool[] {
  const tool = getTool(slug);
  if (!tool) return tools.slice(0, limit);
  const sameCategory = tools.filter(
    (t) => t.slug !== slug && t.category === tool.category
  );
  const others = tools.filter(
    (t) => t.slug !== slug && t.category !== tool.category
  );
  return [...sameCategory, ...others].slice(0, limit);
}

/**
 * Substring match over title, blurb and keywords. Small enough to be honest
 * about: with three tools a fuzzy ranking would be inventing precision.
 */
export function searchTools(query: string): Tool[] {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  return tools.filter((tool) =>
    [tool.title, tool.blurb, ...tool.keywords]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}
