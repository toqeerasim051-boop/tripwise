import Modal from './Modal.jsx';
import { buttonStyles } from './buttonStyles.js';

/**
 * Confirmation for destructive actions. Focus starts on Cancel so Enter never destroys by
 * accident; Escape cancels.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} description={description}>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" data-autofocus className={buttonStyles.secondary} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={buttonStyles.danger} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
