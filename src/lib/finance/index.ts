/**
 * The calculation library. Everything here is pure: numbers in, numbers out,
 * no dates read from the clock, no formatting, no React. That is what makes it
 * testable in Node without a browser, and it is where every figure the app
 * shows — including the recommendations — has to come from.
 */
export * from "./money";
export * from "./amortization";
export * from "./debt-payoff";
export * from "./refinance";
export * from "./piti";
