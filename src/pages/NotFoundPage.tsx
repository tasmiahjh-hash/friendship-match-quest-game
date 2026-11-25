import { Link } from '../components/layout/Link';
import { paths } from '../state/router';

export function NotFoundPage() {
  return (
    <div className="page page--center">
      <div className="page__emoji" aria-hidden="true">
        🧭
      </div>
      <h1 className="page__title">Off the map</h1>
      <p className="page__lede">We couldn’t find that page. Your quest progress is safe.</p>
      <Link to={paths.home} className="btn btn--primary btn--lg">
        Return to Home
      </Link>
    </div>
  );
}
