import { Link } from 'react-router';
import PageHeader from '../components/common/PageHeader.jsx';
import { buttonStyles } from '../components/common/buttonStyles.js';

export default function NotFoundPage() {
  return (
    <div className="py-10 text-center">
      <PageHeader eyebrow="Error 404" title="Page not found" />
      <p className="text-fg-muted">The page you are looking for doesn&apos;t exist or has moved.</p>
      <Link to="/" className={`${buttonStyles.primary} mt-6`}>
        Go to Explore
      </Link>
    </div>
  );
}
