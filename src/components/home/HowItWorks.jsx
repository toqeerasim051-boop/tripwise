import SectionHeading from './SectionHeading.jsx';
import { CalendarIcon, SearchIcon, WalletIcon } from '../common/Icons.jsx';

const STEPS = [
  {
    Icon: SearchIcon,
    title: 'Pick a destination',
    text: 'Browse hand-picked countries or search any of about 250 to see facts, weather and top sights.',
  },
  {
    Icon: CalendarIcon,
    title: 'Plan your days',
    text: 'Create a trip, auto-plan the famous sights and move things around until it feels right.',
  },
  {
    Icon: WalletIcon,
    title: 'Track your budget',
    text: 'Add expenses as you go and let the forecast tell you how much you can spend per day.',
  },
];

/** Three-step explanation of the app. */
export default function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="mt-20 rounded-3xl bg-surface-muted px-5 py-12 sm:px-10"
    >
      <SectionHeading
        id="how-it-works-heading"
        eyebrow="How it works"
        title="Your trip in three easy steps"
        centered
      />
      <ol role="list" className="grid gap-5 md:grid-cols-3">
        {STEPS.map(({ Icon, title, text }, stepIndex) => (
          <li key={title} className="relative rounded-3xl bg-surface p-6 shadow-card">
            <span
              aria-hidden="true"
              className="absolute top-4 right-5 font-display text-5xl font-bold text-primary-soft"
            >
              {stepIndex + 1}
            </span>
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-on-primary">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-fg">
              <span className="sr-only">Step {stepIndex + 1}: </span>
              {title}
            </h3>
            <p className="mt-2 text-sm text-fg-muted">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
