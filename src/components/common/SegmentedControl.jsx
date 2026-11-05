/**
 * A row of radio buttons styled as a segmented button group. Native radios give the group
 * arrow-key navigation and "1 of 3" announcements for free.
 * `options`: [{ value, label, Icon? }]. With `iconOnly`, labels are visually hidden (but still
 * name each radio) and shown as tooltips.
 */
export default function SegmentedControl({
  legend,
  hideLegend = false,
  name,
  options,
  value,
  onChange,
  iconOnly = false,
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={hideLegend ? 'sr-only' : 'mb-1 text-sm font-medium text-fg'}>
        {legend}
      </legend>
      <div className="inline-flex flex-wrap gap-0.5 rounded-lg border border-line bg-surface p-0.5">
        {options.map(({ value: optionValue, label, Icon }) => (
          <label
            key={optionValue}
            title={iconOnly ? label : undefined}
            className={[
              'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors',
              iconOnly ? 'size-8' : 'px-3 py-1.5',
              'text-fg-muted hover:bg-surface-muted hover:text-fg',
              'has-checked:bg-primary has-checked:text-on-primary',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
            ].join(' ')}
          >
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
              className="sr-only"
            />
            {Icon && <Icon className="size-4" />}
            <span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
