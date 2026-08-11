/**
 * United States tool registry.
 */
import type { Category, CategoryId, FaqItem, Tool } from "@/markets/types";

/** Repeated across several answers, because it is the thing to be clear about. */
const NOT_ADVICE =
  "These are arithmetic results, not advice. They use the numbers you typed and " +
  "nothing else — not your tax situation, job security, health, or anything a " +
  "person who knows you would weigh.";

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
    ],
    how: [
      "Enter the purchase price, down payment, rate and term.",
      "Add property tax, homeowners insurance and any HOA dues.",
      "Set a PMI rate if you are putting down less than 20%.",
      "Add an extra monthly amount to see what prepaying is worth.",
    ],
    faq: [
      {
        q: "Why is the total higher than the mortgage payment I was quoted?",
        a:
          "Because a quote is usually principal and interest only. Property tax, homeowners insurance, PMI and HOA dues are collected with the payment and can add 30–50% on top.",
      },
      {
        q: "When does PMI actually come off?",
        a:
          "Three rules apply. You may request cancellation once the scheduled balance reaches 80% of the original value; the servicer must cancel automatically at 78%; and it ends at the midpoint of the schedule regardless. The automatic date is keyed to the original schedule — extra principal does not move it. You have to ask.",
      },
      {
        q: "Does paying extra principal really save that much?",
        a:
          "Early on, yes, because almost all of a new payment is interest. The tool reports interest saved per extra dollar, which is the number to compare against what that dollar would earn elsewhere.",
      },
      {
        q: "How exact are these numbers?",
        a:
          "The arithmetic is, to the cent: interest is rounded monthly the way a servicer rounds it. Your actual statement will differ if your escrow is reassessed, your rate is not fixed, or your lender uses a different day-count. " +
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
    ],
    how: [
      "List each debt with its balance, rate and minimum payment.",
      "Add any extra you can put toward debt each month.",
      "Compare avalanche (highest rate first) against snowball (smallest balance first).",
      "Look at both the interest cost and the date of the first cleared account.",
    ],
    faq: [
      {
        q: "Which strategy is better?",
        a:
          "Avalanche always costs less interest — that is arithmetic. Snowball clears an account sooner, and for many people that is what keeps the plan alive. The tool shows both numbers so the trade is explicit.",
      },
      {
        q: "What is the rollover, and why does it matter?",
        a:
          "When an account clears, its minimum payment does not disappear — it joins the money attacking the next debt. Both strategies here do this. A plan without it finishes years later.",
      },
      {
        q: "What if my minimum payment does not cover the interest?",
        a:
          "Then that balance grows no matter what you do elsewhere, and the tool says so and names the account rather than showing a payoff date that will never arrive.",
      },
      {
        q: "Should I pay off debt or invest?",
        a:
          "The tool gives you the interest rate you are guaranteed to avoid by paying a debt off. Compare that against an expected return. It cannot tell you which to pick. " +
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
    ],
    how: [
      "Enter your current balance, rate and how many payments are left.",
      "Enter the offered rate, term and closing costs.",
      "Say whether the costs are paid in cash or financed into the balance.",
      "Compare the break-even month against how long you expect to keep the house.",
    ],
    faq: [
      {
        q: "Why are there two break-even numbers?",
        a:
          "The usual one divides closing costs by the monthly payment saving. It ignores that a fresh 30-year term pays principal down more slowly. The second figure compares total cost — interest plus fees — and is the one that answers whether the deal is good.",
      },
      {
        q: "Is it cheaper to roll closing costs into the loan?",
        a:
          "No. It removes the cash due at closing but the fees are then borrowed at the mortgage rate for up to 30 years. The tool shows the break-even moving out when you finance them.",
      },
      {
        q: "What counts as closing costs?",
        a:
          "Origination and underwriting fees, appraisal, title insurance and search, recording fees, and any discount points.",
      },
      {
        q: "What if I might move?",
        a:
          "Enter how long you expect to stay. Below the break-even month the refinance loses money. " +
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

export const registry = {
  tools,
  categories,
  getTool,
  relatedTools,
  searchTools,
  toolsBySlug,
  toolsInCategory,
};
