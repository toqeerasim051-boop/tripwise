/* Decorative Font Awesome icons (free set). They are aria-hidden; pair them with visible or sr-only text. */
import { config } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faClock,
  faHeart as faHeartOutline,
} from '@fortawesome/free-regular-svg-icons';
import {
  faArrowLeft,
  faArrowRight,
  faArrowUpRightFromSquare,
  faBars,
  faCamera,
  faChevronDown,
  faChevronUp,
  faCircleInfo,
  faCloudSun,
  faDesktop,
  faDownload,
  faDroplet,
  faEarthAmericas,
  faHeart,
  faLocationDot,
  faLock,
  faMagnifyingGlass,
  faMoon,
  faPlus,
  faRulerCombined,
  faSun,
  faTemperatureHalf,
  faTriangleExclamation,
  faUpload,
  faUsers,
  faWallet,
  faWandMagicSparkles,
  faXmark,
  faCompass,
  faPiggyBank,
  faReceipt,
  faRoute,
  faSuitcaseRolling,
  faHotel,
  faPlane,
  faTicket,
  faSliders,
} from '@fortawesome/free-solid-svg-icons';

// Icons are sized with our own utility classes (default size-5), so Font Awesome's runtime
// stylesheet is not injected (it would also override those classes).
config.autoAddCss = false;

function Icon({ icon, className = 'size-5' }) {
  return (
    <FontAwesomeIcon
      icon={icon}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    />
  );
}

export function AlertIcon({ className }) {
  return <Icon icon={faTriangleExclamation} className={className} />;
}

export function AreaIcon({ className }) {
  return <Icon icon={faRulerCombined} className={className} />;
}

export function ArrowLeftIcon({ className }) {
  return <Icon icon={faArrowLeft} className={className} />;
}

export function ArrowRightIcon({ className }) {
  return <Icon icon={faArrowRight} className={className} />;
}

export function CameraIcon({ className }) {
  return <Icon icon={faCamera} className={className} />;
}

export function ChevronDownIcon({ className }) {
  return <Icon icon={faChevronDown} className={className} />;
}

export function ChevronUpIcon({ className }) {
  return <Icon icon={faChevronUp} className={className} />;
}

export function CloseIcon({ className }) {
  return <Icon icon={faXmark} className={className} />;
}

export function CloudSunIcon({ className }) {
  return <Icon icon={faCloudSun} className={className} />;
}

export function DownloadIcon({ className }) {
  return <Icon icon={faDownload} className={className} />;
}

export function DropletIcon({ className }) {
  return <Icon icon={faDroplet} className={className} />;
}

export function ExternalLinkIcon({ className }) {
  return <Icon icon={faArrowUpRightFromSquare} className={className} />;
}

export function GlobeIcon({ className }) {
  return <Icon icon={faEarthAmericas} className={className} />;
}

export function InfoIcon({ className }) {
  return <Icon icon={faCircleInfo} className={className} />;
}

export function LockIcon({ className }) {
  return <Icon icon={faLock} className={className} />;
}

export function MapPinIcon({ className }) {
  return <Icon icon={faLocationDot} className={className} />;
}

export function MenuIcon({ className }) {
  return <Icon icon={faBars} className={className} />;
}

export function MonitorIcon({ className }) {
  return <Icon icon={faDesktop} className={className} />;
}

export function MoonIcon({ className }) {
  return <Icon icon={faMoon} className={className} />;
}

export function PlusIcon({ className }) {
  return <Icon icon={faPlus} className={className} />;
}

export function SearchIcon({ className }) {
  return <Icon icon={faMagnifyingGlass} className={className} />;
}

export function SparklesIcon({ className }) {
  return <Icon icon={faWandMagicSparkles} className={className} />;
}

export function SunIcon({ className }) {
  return <Icon icon={faSun} className={className} />;
}

export function UploadIcon({ className }) {
  return <Icon icon={faUpload} className={className} />;
}

export function UsersIcon({ className }) {
  return <Icon icon={faUsers} className={className} />;
}

export function WalletIcon({ className }) {
  return <Icon icon={faWallet} className={className} />;
}

export function CalendarIcon({ className }) {
  return <Icon icon={faCalendarDays} className={className} />;
}

export function ClockIcon({ className }) {
  return <Icon icon={faClock} className={className} />;
}

export function HeartIcon({ className, filled = false }) {
  return <Icon icon={filled ? faHeart : faHeartOutline} className={className} />;
}

export function CompassIcon({ className }) {
  return <Icon icon={faCompass} className={className} />;
}

export function PiggyBankIcon({ className }) {
  return <Icon icon={faPiggyBank} className={className} />;
}

export function ReceiptIcon({ className }) {
  return <Icon icon={faReceipt} className={className} />;
}

export function RouteIcon({ className }) {
  return <Icon icon={faRoute} className={className} />;
}

export function SuitcaseIcon({ className }) {
  return <Icon icon={faSuitcaseRolling} className={className} />;
}

export function HotelIcon({ className }) {
  return <Icon icon={faHotel} className={className} />;
}

export function PlaneIcon({ className }) {
  return <Icon icon={faPlane} className={className} />;
}

export function TicketIcon({ className }) {
  return <Icon icon={faTicket} className={className} />;
}

export function SlidersIcon({ className }) {
  return <Icon icon={faSliders} className={className} />;
}

export function TemperatureIcon({ className }) {
  return <Icon icon={faTemperatureHalf} className={className} />;
}
