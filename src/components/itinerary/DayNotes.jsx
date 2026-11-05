import { useEffect, useRef, useState } from 'react';
import { buttonStyles } from '../common/buttonStyles.js';
import { inputStyles } from '../common/formStyles.js';
import { validateDay } from '../../utils/validators.js';

const small = `${buttonStyles.secondary} ${buttonStyles.small}`;

/** Inline notes editor for a day. Focus moves into the textarea and back to the toggle button. */
export default function DayNotes({ dayId, dayLabel, notes, onSave }) {
  const [draft, setDraft] = useState(null); // null = not editing
  const textareaRef = useRef(null);
  const toggleRef = useRef(null);
  const wasEditing = useRef(false);
  const editing = draft !== null;
  const error = editing ? validateDay({ notes: draft }).notes : undefined;
  const textareaId = `day-${dayId}-notes`;

  useEffect(() => {
    if (editing && !wasEditing.current) textareaRef.current?.focus();
    if (!editing && wasEditing.current) toggleRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  if (!editing) {
    return (
      <div className="mt-2">
        {notes && <p className="text-sm whitespace-pre-line text-fg">{notes}</p>}
        <button
          ref={toggleRef}
          type="button"
          className="mt-1 text-sm font-medium text-primary hover:underline"
          onClick={() => setDraft(notes)}
        >
          {notes ? 'Edit notes' : 'Add notes'} <span className="sr-only">for {dayLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-2 grid gap-2"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (error) return;
        onSave(draft);
        setDraft(null);
      }}
    >
      <label htmlFor={textareaId} className="text-sm font-medium text-fg">
        Notes for {dayLabel}
      </label>
      <textarea
        ref={textareaRef}
        id={textareaId}
        rows={3}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && setDraft(null)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        className={inputStyles}
      />
      {error && (
        <p id={`${textareaId}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className={`${buttonStyles.primary} ${buttonStyles.small}`}>
          Save notes
        </button>
        <button type="button" className={small} onClick={() => setDraft(null)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
