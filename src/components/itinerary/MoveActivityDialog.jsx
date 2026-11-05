import Modal from '../common/Modal.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { pluralize } from '../../utils/formatters.js';

/**
 * Lets the user pick another day for an activity. Buttons instead of drag-and-drop:
 * works with keyboard, screen readers and touch. `days`: [{ id, label, dateLabel, count }].
 */
export default function MoveActivityDialog({ open, activityTitle, days, onSelect, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={`Move “${activityTitle}” to…`}
      description="It will be added at the end of the chosen day."
    >
      <ul role="list" className="mt-4 grid max-h-[50vh] gap-2 overflow-y-auto">
        {days.map((day) => (
          <li key={day.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2 text-left text-sm hover:bg-surface-muted"
              onClick={() => onSelect(day.id)}
            >
              <span className="font-medium text-fg">
                {day.label} · {day.dateLabel}
              </span>
              <span className="text-fg-muted">
                {pluralize(day.count, 'activity', 'activities')}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <button type="button" data-autofocus className={buttonStyles.secondary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
