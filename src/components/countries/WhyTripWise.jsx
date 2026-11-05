import { Link } from 'react-router';
import Photo from '../common/Photo.jsx';
import SectionHeading from '../home/SectionHeading.jsx';
import { CloudSunIcon, LockIcon, SparklesIcon, WalletIcon } from '../common/Icons.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { getCoverPhoto } from '../../services/attractions.js';

const FEATURES = [
  {
    Icon: SparklesIcon,
    title: 'Auto-plan my days',
    text: 'Your destination’s top sights spread over your trip in one click, nearby ones on the same day.',
  },
  {
    Icon: CloudSunIcon,
    title: 'Weather-smart plans',
    text: 'A 16-day forecast on every day, with a warning when rain meets your outdoor plans.',
  },
  {
    Icon: WalletIcon,
    title: 'Budget forecast',
    text: 'See your spending pace and a daily limit, so you know early if you might overspend.',
  },
  {
    Icon: LockIcon,
    title: 'Private and free',
    text: 'No sign-up and no ads. Your trips stay in your own browser.',
  },
];

// Collage photos (first available cover of each group).
const COLLAGE = [['NZL', 'CHE'], ['JPN'], ['GRC', 'ITA']];

/** "Why TripWise": photo collage + the app's smart features as a numbered list. */
export default function WhyTripWise() {
  const [large, top, bottom] = COLLAGE.map((codes) => codes.map(getCoverPhoto).find(Boolean));

  return (
    <section
      aria-labelledby="why-tripwise-heading"
      className="mt-20 grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
    >
      <div aria-hidden="true" className="relative grid h-80 grid-cols-5 grid-rows-2 gap-3 sm:h-96">
        {[
          { id: 'large', photo: large?.large ?? large?.src, area: 'col-span-3 row-span-2' },
          { id: 'top', photo: top?.src, area: 'col-span-2' },
          { id: 'bottom', photo: bottom?.src, area: 'col-span-2' },
        ].map(({ id, photo, area }) => (
          // A wrapper per tile keeps the rounded corners and grid area independent of <Photo>.
          <div
            key={id}
            className={`${area} overflow-hidden rounded-3xl bg-surface-muted shadow-card`}
          >
            <Photo src={photo} alt="" className="size-full" />
          </div>
        ))}
        <div className="absolute -bottom-5 left-5 rounded-2xl bg-surface px-5 py-3 shadow-card-hover">
          <p className="font-display text-3xl font-bold text-primary">16 days</p>
          <p className="text-xs font-medium text-fg-muted">of weather in every plan</p>
        </div>
      </div>

      <div>
        <SectionHeading
          id="why-tripwise-heading"
          eyebrow="Why TripWise"
          title="Plan smarter, travel better"
          text="More than a list of places: TripWise helps you make a plan that actually works."
        />
        <ol role="list" className="grid gap-6">
          {FEATURES.map(({ Icon, title, text }, featureIndex) => (
            <li key={title} className="flex gap-4">
              <span className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-fg">
                <Icon className="size-5" />
                <span className="absolute -top-2 -right-2 inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                  {featureIndex + 1}
                </span>
              </span>
              <div>
                <h3 className="font-semibold text-fg">{title}</h3>
                <p className="mt-1 text-sm text-fg-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link to="/trips/new" className={`${buttonStyles.primary} mt-8`}>
          Start planning
        </Link>
      </div>
    </section>
  );
}
