import { FeedbackForm } from '../components/feedback/FeedbackForm';
import { config } from '../config';

export function FeedbackPage() {
  return (
    <div className="page">
      <header className="page__header">
        <div className="eyebrow">Suggestion box</div>
        <h1 className="page__title">
          Help Us Improve <span className="text-gradient">Friendship Quest</span>
        </h1>
        <p className="page__lede">
          Friendship Quest is built for students, and we want to build it with you! Tell us what features you’d love to see, what could be
          improved, or anything that would make your experience better.
        </p>
      </header>
      <FeedbackForm />
      {config.contactEmail && (
        <p className="muted">
          Need a reply or want to report a concern? Email <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>.
        </p>
      )}
    </div>
  );
}
