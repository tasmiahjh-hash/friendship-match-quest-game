import { config } from '../../config';
import { paths } from '../../state/router';
import { cx } from '../../utils';
import { Link } from './Link';

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to={paths.home} className={cx('brand', compact && 'brand--compact')} aria-label="Friendship Quest by Friends Across Campus, home">
      <span className="brand__mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="brand__text">
        <span className="brand__name">
          Friendship <span className="text-gradient">Quest</span>
        </span>
        <span className="brand__by">by Friends Across Campus</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <Brand />
      <nav className="site-nav" aria-label="Main">
        <Link to={paths.howItWorks}>How It Works</Link>
        <Link to={paths.feedback}>Help Us Improve</Link>
      </nav>
    </header>
  );
}

export function SiteFooter({ compact }: { compact?: boolean }) {
  return (
    <footer className={cx('site-footer', compact && 'site-footer--compact')}>
      <div className="site-footer__about">
        <p className="site-footer__brand">Friendship Quest by Friends Across Campus</p>
        <p>Built for University of Alberta students.</p>
        <p className="site-footer__note">
          A student friendship initiative. Not operated or endorsed by the University of Alberta.
        </p>
      </div>
      <nav className="site-footer__links" aria-label="Footer">
        <Link to={paths.howItWorks}>How It Works</Link>
        <Link to={paths.privacy}>Privacy Policy</Link>
        <Link to={paths.feedback}>Help Us Improve</Link>
        {config.contactEmail ? (
          <a href={`mailto:${config.contactEmail}`}>Contact: {config.contactEmail}</a>
        ) : (
          <Link to={paths.feedback}>Contact us</Link>
        )}
      </nav>
    </footer>
  );
}
