/** Eyebrow + serif title + intro for a home-page section. `action` sits on the right (wide screens). */
export default function SectionHeading({ id, eyebrow, title, text, action, centered = false }) {
  return (
    <div
      className={`mb-8 flex flex-wrap items-end gap-4 ${centered ? 'justify-center text-center' : 'justify-between'}`}
    >
      <div className={centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && (
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">{eyebrow}</p>
        )}
        <h2 id={id} className="mt-2 text-3xl font-bold text-fg sm:text-4xl">
          {title}
        </h2>
        {text && <p className="mt-3 text-fg-muted sm:text-lg">{text}</p>}
      </div>
      {action}
    </div>
  );
}
