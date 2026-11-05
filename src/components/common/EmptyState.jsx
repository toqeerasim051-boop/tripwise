export default function EmptyState({ title, description, action, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`;

  return (
    <section className="rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <Heading className="text-lg font-semibold text-fg">{title}</Heading>
      {description && <p className="mx-auto mt-2 max-w-md text-fg-muted">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </section>
  );
}
