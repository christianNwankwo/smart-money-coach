/** Renders coach copy: double-newline paragraphs and **bold** spans. */
export function CoachText({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  const paragraphs = children.split(/\n\n+/).filter(Boolean);

  return (
    <div className={className}>
      {paragraphs.map((para, i) => (
        <p key={i} className={i > 0 ? "mt-4" : undefined}>
          <InlineBold text={para} />
        </p>
      ))}
    </div>
  );
}

function InlineBold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
