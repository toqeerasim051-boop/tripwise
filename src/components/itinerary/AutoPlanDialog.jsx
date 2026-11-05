import Modal from '../common/Modal.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { MAX_PLANNED_PER_DAY } from '../../utils/autoPlan.js';
import { pluralize } from '../../utils/formatters.js';

/**
 * Preview of an auto-plan (see planAttractions): which sights go on which day. Nothing changes
 * until the user confirms. `plan.entries[].label` / `dateLabel` are added by the page.
 */
export default function AutoPlanDialog({ plan, onConfirm, onCancel }) {
  const total = plan ? plan.entries.reduce((sum, entry) => sum + entry.attractions.length, 0) : 0;

  return (
    <Modal
      open={plan !== null}
      onClose={onCancel}
      title="Auto-plan my days"
      description="Nearby sights share a day, and days with bad weather in the forecast are filled last."
    >
      {plan && (
        <>
          <ol role="list" className="grid gap-3">
            {plan.entries.map((entry) => (
              <li key={entry.day.id} className="rounded-lg border border-line p-3">
                <p className="text-sm font-semibold text-fg">
                  {entry.label}{' '}
                  <span className="font-normal text-fg-muted">· {entry.dateLabel}</span>
                </p>
                {entry.wet && <p className="text-xs text-fg-muted">Bad weather forecast</p>}
                <ul role="list" className="mt-1 list-disc pl-5 text-sm text-fg">
                  {entry.attractions.map((attraction) => (
                    <li key={attraction.id}>
                      {attraction.name} <span className="text-fg-muted">({attraction.place})</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {plan.leftOver > 0 && (
            <p className="mt-3 text-sm text-fg-muted">
              {pluralize(plan.leftOver, 'more sight')} didn&apos;t fit. Days are kept to{' '}
              {MAX_PLANNED_PER_DAY} activities.
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className={buttonStyles.secondary} onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className={buttonStyles.primary}
              onClick={onConfirm}
              data-autofocus
            >
              Add {pluralize(total, 'sight')} to itinerary
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
