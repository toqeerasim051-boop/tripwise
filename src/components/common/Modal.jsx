import { useEffect, useId, useRef } from 'react';

/**
 * Accessible modal built on the native <dialog>: showModal() makes the rest of the page inert,
 * traps focus and closes on Escape. Focus moves to the element marked `data-autofocus` (or the
 * first focusable one) and returns to whatever opened the modal when it closes.
 */
export default function Modal({ open, onClose, title, description, children }) {
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const closedByPropRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      openerRef.current = document.activeElement;
      dialog.showModal();
      const target =
        dialog.querySelector('[data-autofocus]') ??
        dialog.querySelector('button, [href], input, select, textarea');
      target?.focus();
    } else if (!open && dialog.open) {
      closedByPropRef.current = true;
      dialog.close();
    }
  }, [open]);

  // "close" fires for Escape and for dialog.close(): restore focus, and tell the parent only
  // when the dialog closed itself (Escape) — not when the parent closed it via `open`.
  useEffect(() => {
    const dialog = dialogRef.current;
    const handleClose = () => {
      openerRef.current?.focus?.();
      if (!closedByPropRef.current) onCloseRef.current();
      closedByPropRef.current = false;
    };
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-black/50"
    >
      {open && (
        <div className="p-6">
          <h2 id={titleId} className="text-lg font-semibold text-fg">
            {title}
          </h2>
          {description && (
            <div id={descriptionId} className="mt-2 text-fg-muted">
              {description}
            </div>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}
