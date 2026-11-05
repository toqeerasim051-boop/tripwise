import { screen, within } from '@testing-library/react';
import { renderRoute } from '../../test/renderRoute.jsx';
import { makeTrip, readStoredTrips, storeTrips } from '../../test/fixtures.js';
import { formatMoney } from '../../utils/money.js';
import { addDays, todayIso } from '../../utils/dates.js';
import { buildDays } from '../../utils/itinerary.js';

vi.mock('../../services/restCountries.js', () => ({
  getAllCountries: vi.fn(async () => []),
  getCountry: vi.fn(),
  getNeighbours: vi.fn(),
}));

const eur = (cents) => formatMoney(cents, 'EUR');
const expense = (id, amountCents, category, extra = {}) => ({
  id,
  category,
  description: '',
  amountCents,
  date: null,
  ...extra,
});

function seed(overrides = {}) {
  storeTrips([makeTrip({ id: 'abc', currency: 'EUR', ...overrides })]);
}

const region = (name) => screen.getByRole('region', { name });
const tile = (label) =>
  within(region('Budget')).getByText(label, { selector: 'dt' }).closest('div');
const status = () => screen.getAllByRole('status').find((el) => el.closest('.grid'));

beforeEach(() => localStorage.clear());

describe('BudgetTab', () => {
  it('shows an empty budget state', () => {
    seed();
    renderRoute('/trips/abc/budget');

    expect(within(region('Budget')).getByText(/No budget set yet/)).toBeInTheDocument();
    expect(tile('Spent')).toHaveTextContent(eur(0));
    expect(screen.queryByRole('region', { name: 'Spending by category' })).not.toBeInTheDocument();
    expect(within(region('Expenses')).getByText(/No expenses yet/)).toBeInTheDocument();
  });

  it('sets a budget and shows what is left per day', async () => {
    seed(); // 3-day trip
    const { user } = renderRoute('/trips/abc/budget');

    await user.click(screen.getByRole('button', { name: 'Set budget' }));
    const dialog = screen.getByRole('dialog', { name: 'Set budget' });
    const total = within(dialog).getByLabelText('Total budget (EUR)');
    expect(total).toHaveFocus();
    await user.type(total, '1.500,00');
    await user.click(within(dialog).getByRole('button', { name: 'Save budget' }));

    expect(tile('Budget')).toHaveTextContent(eur(150000));
    expect(tile('Remaining')).toHaveTextContent(eur(150000));
    expect(
      within(region('Budget')).getByText(`0% of your budget used, ${eur(150000)} left.`),
    ).toBeInTheDocument();
    expect(
      within(region('Budget')).getByText(`That's about ${eur(50000)} per day.`),
    ).toBeInTheDocument();
    expect(status()).toHaveTextContent(`Budget set to ${eur(150000)}.`);
    expect(readStoredTrips()[0].budget.totalCents).toBe(150000);
  });

  it('adds expenses and updates totals and the category breakdown', async () => {
    seed({ budget: { totalCents: 100000 } });
    const { user } = renderRoute('/trips/abc/budget');

    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    let dialog = screen.getByRole('dialog', { name: 'Add expense' });
    await user.type(within(dialog).getByLabelText('Amount (EUR)'), '450');
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'accommodation');
    await user.type(within(dialog).getByLabelText('Description', { exact: false }), 'Hotel');
    await user.click(within(dialog).getByRole('button', { name: 'Add expense' }));

    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    dialog = screen.getByRole('dialog', { name: 'Add expense' });
    await user.type(within(dialog).getByLabelText('Amount (EUR)'), '50.25');
    await user.click(within(dialog).getByRole('button', { name: 'Add expense' }));

    expect(tile('Spent')).toHaveTextContent(eur(50025));
    expect(tile('Remaining')).toHaveTextContent(eur(49975));
    const breakdown = within(region('Spending by category')).getAllByRole('listitem');
    expect(breakdown.map((row) => row.textContent)).toEqual([
      `Accommodation${eur(45000)} · 90%`,
      `Food & drink${eur(5025)} · 10%`,
    ]);
    expect(within(region('Expenses')).getByText('Hotel', { selector: 'p' })).toBeInTheDocument();
    expect(readStoredTrips()[0].expenses.map((e) => e.amountCents)).toEqual([45000, 5025]);
  });

  it('validates expense amounts', async () => {
    seed();
    const { user } = renderRoute('/trips/abc/budget');

    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Amount (EUR)'), '12.345');
    await user.click(within(dialog).getByRole('button', { name: 'Add expense' }));

    expect(within(dialog).getByText('Use at most 2 decimal places.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Amount (EUR)')).toHaveFocus();
  });

  it('shows the warning and over-budget states with text, not colour alone', async () => {
    seed({ budget: { totalCents: 10000 }, expenses: [expense('a', 9500, 'food')] });
    const { user } = renderRoute('/trips/abc/budget');

    expect(
      within(region('Budget')).getByText(`Almost at your budget: 95% used, ${eur(500)} left.`),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    await user.type(screen.getByLabelText('Amount (EUR)'), '20');
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Add expense' }),
    );

    expect(within(region('Budget')).getByText(`Over budget by ${eur(1500)}.`)).toBeInTheDocument();
    expect(tile('Over budget')).toHaveTextContent(eur(1500));
  });

  it('edits an expense', async () => {
    seed({ expenses: [expense('a', 1000, 'transport', { description: 'Taxi' })] });
    const { user } = renderRoute('/trips/abc/budget');

    await user.click(screen.getByRole('button', { name: 'Edit Taxi' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit Taxi' });
    const amount = within(dialog).getByLabelText('Amount (EUR)');
    expect(amount).toHaveValue('10.00');
    await user.clear(amount);
    await user.type(amount, '12.50');
    await user.click(within(dialog).getByRole('button', { name: 'Save expense' }));

    expect(tile('Spent')).toHaveTextContent(eur(1250));
    expect(screen.getByRole('button', { name: 'Edit Taxi' })).toHaveFocus();
  });

  it('deletes after confirmation and moves focus to the next expense, then to Add', async () => {
    seed({
      expenses: [
        expense('a', 1000, 'food', { description: 'Lunch', date: '2026-05-02' }),
        expense('b', 2000, 'food', { description: 'Dinner', date: '2026-05-01' }),
      ],
    });
    const { user } = renderRoute('/trips/abc/budget');

    await user.click(screen.getByRole('button', { name: 'Delete Lunch' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Lunch?' });
    expect(dialog).toHaveTextContent(`This removes ${eur(1000)} from your spending.`);
    await user.click(within(dialog).getByRole('button', { name: 'Delete expense' }));

    expect(screen.queryByText('Lunch')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Dinner' })).toHaveFocus();
    expect(status()).toHaveTextContent('Deleted Lunch.');

    await user.click(screen.getByRole('button', { name: 'Delete Dinner' }));
    await user.click(screen.getByRole('button', { name: 'Delete expense' }));
    expect(screen.getByRole('button', { name: 'Add expense' })).toHaveFocus();
    expect(readStoredTrips()[0].expenses).toEqual([]);
  });

  it('changes currency without converting amounts', async () => {
    seed({ budget: { totalCents: 10000 } });
    const { user } = renderRoute('/trips/abc/budget');

    await user.click(screen.getByRole('button', { name: 'Edit budget' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit budget' });
    expect(within(dialog).getByLabelText('Total budget (EUR)')).toHaveValue('100.00');
    await user.selectOptions(within(dialog).getByLabelText('Currency'), 'GBP');
    expect(within(dialog).getByText(/shown in GBP without conversion/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save budget' }));

    expect(tile('Budget')).toHaveTextContent(formatMoney(10000, 'GBP'));
    expect(readStoredTrips()[0]).toMatchObject({ currency: 'GBP', budget: { totalCents: 10000 } });
  });

  describe('budget forecast', () => {
    // Dates relative to the real today, so the trip is upcoming / in progress whenever this runs.
    function seedAround(startOffset, endOffset, overrides) {
      const today = todayIso();
      const startDate = addDays(today, startOffset);
      const endDate = addDays(today, endOffset);
      let n = 0;
      seed({
        startDate,
        endDate,
        days: buildDays(startDate, endDate, () => `d${(n += 1)}`),
        ...overrides,
      });
    }
    const forecastRegion = () => screen.getByRole('region', { name: 'Budget forecast' });

    it('is hidden without a budget and for past trips', () => {
      seed({ budget: { totalCents: 30000 } }); // the fixture trip is in the past
      renderRoute('/trips/abc/budget');
      expect(screen.queryByRole('region', { name: 'Budget forecast' })).not.toBeInTheDocument();
    });

    it('before the trip, shows a daily allowance', () => {
      seedAround(10, 12, {
        budget: { totalCents: 30000 },
        expenses: [expense('hotel', 12000, 'accommodation')],
      });
      renderRoute('/trips/abc/budget');

      expect(forecastRegion()).toHaveTextContent(
        `Your trip starts in 10 days. You can spend about ${eur(6000)} on each of its 3 days.`,
      );
    });

    it('during the trip, projects an overspend from the spending pace', () => {
      seedAround(-1, 1, {
        budget: { totalCents: 40000 },
        expenses: [expense('dinner', 30000, 'food', { date: addDays(todayIso(), -1) })],
      });
      renderRoute('/trips/abc/budget');

      const region = forecastRegion();
      expect(
        within(region).getByText('Spending pace', { selector: 'dt' }).closest('div'),
      ).toHaveTextContent(`${eur(15000)} / day`);
      expect(region).toHaveTextContent(`At this pace you will go over budget by ${eur(5000)}.`);
      expect(region).toHaveTextContent(
        `To stay on budget, spend up to ${eur(5000)} a day for the last 2 days (today included).`,
      );
    });
  });
});
