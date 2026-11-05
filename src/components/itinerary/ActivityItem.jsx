import ExternalLink from '../common/ExternalLink.jsx';
import { ChevronDownIcon, ChevronUpIcon, ClockIcon, MapPinIcon } from '../common/Icons.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { displayHost, isSafeUrl } from '../../utils/bookingLinks.js';
import { activityCategoryLabel } from '../../utils/itinerary.js';

const iconButton =
  'inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-fg hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40';
const small = `${buttonStyles.secondary} ${buttonStyles.small}`;

/**
 * One activity with its controls. `data-control` attributes let the itinerary restore focus to
 * the right button after the item moves (moving a DOM node drops focus in browsers).
 */
export default function ActivityItem({
  activity,
  isFirst,
  isLast,
  canMoveToOtherDay,
  onMoveUp,
  onMoveDown,
  onMoveToDay,
  onEdit,
  onDelete,
}) {
  const titleId = `activity-${activity.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      data-activity-id={activity.id}
      className="rounded-lg border border-line bg-surface p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {activity.time && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            <ClockIcon className="size-4" />
            <time dateTime={activity.time}>{activity.time}</time>
          </span>
        )}
        <h4 id={titleId} className="font-semibold wrap-break-word text-fg">
          {activity.title}
        </h4>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted">
          {activityCategoryLabel(activity.category)}
        </span>
      </div>

      {activity.location && (
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-fg-muted">
          <MapPinIcon className="size-4 shrink-0" />
          <span className="sr-only">Location: </span>
          {activity.location}
        </p>
      )}
      {activity.notes && (
        <p className="mt-1 text-sm whitespace-pre-line text-fg">{activity.notes}</p>
      )}
      {/* Re-checked at render time, not only when saved. */}
      {isSafeUrl(activity.url) && (
        <p className="mt-1 text-sm">
          <ExternalLink href={activity.url}>{displayHost(activity.url)}</ExternalLink>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-control="up"
          className={iconButton}
          disabled={isFirst}
          onClick={onMoveUp}
        >
          <ChevronUpIcon className="size-4" />
          <span className="sr-only">Move {activity.title} up</span>
        </button>
        <button
          type="button"
          data-control="down"
          className={iconButton}
          disabled={isLast}
          onClick={onMoveDown}
        >
          <ChevronDownIcon className="size-4" />
          <span className="sr-only">Move {activity.title} down</span>
        </button>
        {canMoveToOtherDay && (
          <button type="button" data-control="move" className={small} onClick={onMoveToDay}>
            <span>
              Move <span className="sr-only">{activity.title}</span> to another day…
            </span>
          </button>
        )}
        <button type="button" data-control="edit" className={small} onClick={onEdit}>
          Edit <span className="sr-only">{activity.title}</span>
        </button>
        <button
          type="button"
          data-control="delete"
          className={`${buttonStyles.dangerGhost} ${buttonStyles.small}`}
          onClick={onDelete}
        >
          Delete <span className="sr-only">{activity.title}</span>
        </button>
      </div>
    </article>
  );
}
