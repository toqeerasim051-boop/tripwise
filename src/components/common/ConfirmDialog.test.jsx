import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog.jsx';

function Harness({ onConfirm, onCancel }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Delete trip
      </button>
      <ConfirmDialog
        open={open}
        title="Delete “Paris”?"
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        onCancel={() => {
          onCancel();
          setOpen(false);
        }}
      />
    </>
  );
}

function setup() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(<Harness onConfirm={onConfirm} onCancel={onCancel} />);
  return { user, onConfirm, onCancel, opener: screen.getByRole('button', { name: 'Delete trip' }) };
}

describe('ConfirmDialog', () => {
  it('opens a labelled dialog with focus on Cancel', async () => {
    const { user, opener } = setup();
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Delete “Paris”?' });
    expect(dialog).toHaveAccessibleDescription("This can't be undone.");
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('confirms once and returns focus to the opener', async () => {
    const { user, opener, onConfirm, onCancel } = setup();
    await user.click(opener);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('cancels with the Cancel button or Escape', async () => {
    const { user, opener, onConfirm, onCancel } = setup();

    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(opener).toHaveFocus();

    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
