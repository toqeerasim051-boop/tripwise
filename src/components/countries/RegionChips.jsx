/**
 * Quick region filter shown as chips (radio buttons, so arrow keys move between them).
 * Mirrors the region select in the search bar.
 */
export default function RegionChips({ regions, value, onChange }) {
  const options = [{ value: 'all', label: 'All' }, ...regions.map((r) => ({ value: r, label: r }))];

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Quick region filter</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:border-primary hover:text-fg has-checked:border-primary has-checked:bg-primary has-checked:text-on-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
          >
            <input
              type="radio"
              name="region-chip"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
