import { Button } from '../components/ui/Button';
import { Link } from '../components/layout/Link';
import { useGame } from '../state/GameContext';
import { navigate, paths, questEntry } from '../state/router';

const STEPS = [
  {
    emoji: '🪪',
    title: 'Create your player card',
    body: 'Pick an avatar, tell us your first name and share an email address. Any valid email works, and there’s no account or password.',
  },
  {
    emoji: '🏫',
    title: 'Choose your campus',
    body: 'North Campus, Augustana, Campus Saint-Jean or South Campus, plus your program and year.',
  },
  {
    emoji: '🎭',
    title: 'Play the friendship quest',
    body: 'Quick this-or-that rounds about your friendship style. Earn XP and badges, and discover your friendship archetype.',
  },
  {
    emoji: '✨',
    title: 'Share your interests and preferences',
    body: 'What you love doing, how you’d feel comfortable meeting someone, and when you’re usually free.',
  },
  {
    emoji: '🏁',
    title: 'Review, consent and submit',
    body: 'Check every answer before anything is sent. You’ll get a reference ID once your registration is confirmed as saved.',
  },
  {
    emoji: '✉️',
    title: 'Get your match by email',
    body: 'Authorized Friends Across Campus administrators look for compatible students. When there’s a suitable match, we email you with the next steps.',
  },
];

const FAQ = [
  {
    q: 'How long until I’m matched?',
    a: 'We can’t promise a date. It depends on how many compatible students have registered, so inviting friends from your campus helps.',
  },
  {
    q: 'Who can take part?',
    a: 'University of Alberta students. We ask you to confirm that you’re a student, but we don’t currently verify enrolment.',
  },
  {
    q: 'Do I need a @ualberta.ca address?',
    a: 'No. We recommend it, but any valid email address is welcome.',
  },
  {
    q: 'Is this a dating service?',
    a: 'No. Friendship Quest is about friendship, and the community guidelines don’t allow unwanted romantic or sexual advances.',
  },
  {
    q: 'Will my match get my contact details?',
    a: 'Not automatically. Your contact information isn’t shared with another participant without your consent.',
  },
  {
    q: 'How do I change or delete my registration?',
    a: 'See “Correcting or deleting your information” in the Privacy Policy. Your reference ID helps us find your registration.',
  },
];

export function HowItWorksPage() {
  const { state } = useGame();
  return (
    <div className="page">
      <header className="page__header">
        <div className="eyebrow">How It Works</div>
        <h1 className="page__title">
          From quest to <span className="text-gradient">friendship</span>
        </h1>
        <p className="page__lede">
          Friendship Quest is an initiative by Friends Across Campus (FAC) that helps University of Alberta students build meaningful
          friendships.
        </p>
      </header>

      <ol className="how">
        {STEPS.map((s, i) => (
          <li key={s.title} className="how__step panel">
            <span className="how__emoji" aria-hidden="true">
              {s.emoji}
            </span>
            <div>
              <h2 className="how__title">
                {i + 1}. {s.title}
              </h2>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="prose" aria-labelledby="faq">
        <h2 id="faq">Good to know</h2>
        <dl className="faq">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="page__actions">
        <Button size="lg" onClick={() => navigate(questEntry(state))}>
          {state.receipt ? 'View your registration' : state.completedLevels.length ? 'Continue your quest' : 'Start your quest'}
        </Button>
        <Link to={paths.privacy} className="btn btn--secondary btn--lg">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
