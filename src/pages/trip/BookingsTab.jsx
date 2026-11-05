import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { PlusIcon } from '../../components/common/Icons.jsx';
import { buttonStyles } from '../../components/common/buttonStyles.js';
import SegmentedControl from '../../components/common/SegmentedControl.jsx';
import BookingSearchForm from '../../components/booking/BookingSearchForm.jsx';
import PartnerWidget from '../../components/booking/PartnerWidget.jsx';
import SavedLinkForm from '../../components/booking/SavedLinkForm.jsx';
import SavedLinkList from '../../components/booking/SavedLinkList.jsx';
import { sectionCard } from '../../components/layout/layoutStyles.js';
import { useTrips } from '../../hooks/useTrips.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { getSearchDates, getSearchDefaults } from '../../utils/bookingLinks.js';
import { fillWidgetUrl, getPartnerWidgets, widgetValuesFor } from '../../utils/partnerWidgets.js';
import { EMPTY_LINK_VALUES, savedLinkToValues } from '../../utils/savedLinks.js';
import { formatDateRange, todayIso } from '../../utils/dates.js';

function Section({ id, title, action, children }) {
  return (
    <section aria-labelledby={id} className={sectionCard}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="text-lg font-semibold text-fg">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function BookingsTab() {
  const { trip } = useOutletContext();
  const trips = useTrips();
  const [searchType, setSearchType] = useState('hotel');
  const [searchValues, setSearchValues] = useState(() => getSearchDefaults(trip, todayIso()));
  const debouncedWhere = useDebounce(searchValues.where, 300);
  const [partnerWidgets] = useState(getPartnerWidgets); // configured once per visit
  const [widgetType, setWidgetType] = useState(null);
  const [linkForm, setLinkForm] = useState(null); // { mode: 'add' } | { mode: 'edit', link }
  const [deleting, setDeleting] = useState(null); // { link, nextId }
  const [announcement, setAnnouncement] = useState('');
  const rootRef = useRef(null);
  const pendingFocusId = useRef(undefined); // link id, or null for the Add button

  useEffect(() => {
    if (pendingFocusId.current === undefined || !rootRef.current) return;
    const id = pendingFocusId.current;
    const target = id
      ? rootRef.current.querySelector(`[data-link-id="${id}"] [data-control="edit"]`)
      : rootRef.current.querySelector('[data-control="add-link"]');
    target?.focus();
    pendingFocusId.current = undefined;
  });

  const query = debouncedWhere.trim() || trip.destinationName;
  const today = todayIso();
  const datesIncluded = getSearchDates(trip, today).includesDates;
  const activeWidget =
    partnerWidgets.find((widget) => widget.type === widgetType) ?? partnerWidgets[0];
  const widgetSrc =
    activeWidget && fillWidgetUrl(activeWidget.template, widgetValuesFor(trip, { query, today }));

  function saveLink(values) {
    if (linkForm.mode === 'add') {
      const link = trips.addSavedLink(trip.id, values);
      setAnnouncement(`Saved link “${link.label}”.`);
    } else {
      trips.updateSavedLink(trip.id, linkForm.link, values);
      setAnnouncement(`Updated link “${values.label.trim()}”.`);
    }
    setLinkForm(null);
  }

  function requestDelete(link) {
    const links = trip.savedLinks;
    const index = links.indexOf(link);
    const next = links[index + 1] ?? links[index - 1] ?? null;
    setDeleting({ link, nextId: next?.id ?? null });
  }

  function confirmDelete() {
    pendingFocusId.current = deleting.nextId;
    trips.deleteSavedLink(trip.id, deleting.link.id);
    setAnnouncement(`Deleted link “${deleting.link.label}”.`);
    setDeleting(null);
  }

  return (
    <div ref={rootRef} className="grid gap-6">
      <p role="status" className="sr-only">
        {announcement}
      </p>

      <Section id="booking-search-heading" title="Search and book">
        <p className="mb-4 text-sm text-fg-muted">
          {activeWidget
            ? "Search with our travel partner here, or open a travel site in a new tab. You book and pay on the partner's site."
            : 'Search hotels, flights and activities on trusted travel sites. They open in a new tab.'}{' '}
          TripWise never makes reservations or takes payments.
        </p>
        {activeWidget && (
          <div className="mb-6 grid gap-3">
            {partnerWidgets.length > 1 && (
              <SegmentedControl
                legend="Search for"
                name="partner-widget"
                options={partnerWidgets.map(({ type, title }) => ({ value: type, label: title }))}
                value={activeWidget.type}
                onChange={setWidgetType}
              />
            )}
            <PartnerWidget
              key={widgetSrc}
              src={widgetSrc}
              title={`${activeWidget.title} search by our travel partner`}
            />
          </div>
        )}
        {activeWidget && <h3 className="mb-3 font-semibold text-fg">Or search on these sites</h3>}
        <BookingSearchForm
          type={searchType}
          values={searchValues}
          onTypeChange={setSearchType}
          onChange={setSearchValues}
          today={today}
          hint={
            datesIncluded
              ? `Filled in with your trip dates (${formatDateRange(trip.startDate, trip.endDate)}). Change anything you like.`
              : 'Your trip dates have passed, so add new dates or search without them.'
          }
        />
      </Section>

      <Section
        id="saved-links-heading"
        title="Saved links"
        action={
          <button
            type="button"
            data-control="add-link"
            className={`${buttonStyles.primary} ${buttonStyles.small}`}
            onClick={() => setLinkForm({ mode: 'add' })}
          >
            <PlusIcon className="size-4" />
            Add link
          </button>
        }
      >
        {trip.savedLinks.length === 0 ? (
          <p className="text-fg-muted">
            Keep booking confirmations, tickets and useful pages here, all in one place.
          </p>
        ) : (
          <SavedLinkList
            links={trip.savedLinks}
            onEdit={(link) => setLinkForm({ mode: 'edit', link })}
            onDelete={requestDelete}
          />
        )}
      </Section>

      <Modal
        open={linkForm !== null}
        onClose={() => setLinkForm(null)}
        title={linkForm?.mode === 'edit' ? `Edit “${linkForm.link.label}”` : 'Add link'}
      >
        {linkForm && (
          <SavedLinkForm
            initialValues={
              linkForm.mode === 'edit' ? savedLinkToValues(linkForm.link) : EMPTY_LINK_VALUES
            }
            submitLabel={linkForm.mode === 'edit' ? 'Save link' : 'Add link'}
            onSubmit={saveLink}
            onCancel={() => setLinkForm(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete “${deleting?.link.label ?? ''}”?`}
        description="The link is removed from this trip. Your booking itself is not affected."
        confirmLabel="Delete link"
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
