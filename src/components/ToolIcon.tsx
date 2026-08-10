/**
 * Small 36×36 SVG icons for tool cards on the home page.
 *
 * Each is a simple geometric shape in the category's accent hue — distinct
 * enough to tell apart at a glance, light enough not to compete with the title.
 */
export function MortgageIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <rect x="4" y="10" width="28" height="20" rx="2" strokeWidth="2" />
      <path d="M4 10 L18 4 L32 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="12" y="20" width="12" height="10" rx="1" strokeWidth="1.5" />
      <line x1="18" y1="14" x2="18" y2="18" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function DebtIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <rect x="6" y="8" width="24" height="20" rx="3" strokeWidth="2" />
      <line x1="6" y1="15" x2="30" y2="15" strokeWidth="1.5" />
      <line x1="6" y1="20" x2="24" y2="20" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="25" x2="18" y2="25" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function RefinanceIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="18" cy="13" r="6" strokeWidth="2" />
      <path
        d="M18 19 C10 19 6 24 6 28 L30 28 C30 24 26 19 18 19Z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="14" y1="28" x2="22" y2="28" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
