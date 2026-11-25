import { Link } from '../components/layout/Link';
import { PRIVACY_POLICY_VERSION, config } from '../config';
import { paths } from '../state/router';

/**
 * Describes what this release actually does. If the code, the storage backend or
 * FAC's practices change, update this page and PRIVACY_POLICY_VERSION together.
 * Open policy questions are listed in docs/RELEASE_CHECKLIST.md.
 */
export function PrivacyPage() {
  const contact = config.privacyEmail;
  return (
    <div className="page">
      <header className="page__header">
        <div className="eyebrow">Version {PRIVACY_POLICY_VERSION}</div>
        <h1 className="page__title">
          Privacy <span className="text-gradient">Policy</span>
        </h1>
        <p className="page__lede">
          Friendship Quest is run by Friends Across Campus (FAC) for University of Alberta students. This page explains, in plain language,
          what we collect and what happens to it.
        </p>
      </header>

      <div className="prose panel">
        <h2>What we collect</h2>
        <p>When you submit a registration, we collect only what you enter in the quest:</p>
        <ul>
          <li>Your first name or nickname, email address, avatar, and Instagram handle if you choose to add one.</li>
          <li>Your University of Alberta campus, program, year of study, and any courses you choose to add.</li>
          <li>Your friendship style answers and interests.</li>
          <li>Your meeting and campus preferences, activities you’d enjoy, and general availability.</li>
          <li>
            Your confirmation that you’re a University of Alberta student, your agreement to the community guidelines, your consent, and the
            version of this policy you agreed to.
          </li>
        </ul>
        <p>We add a reference ID, the time you submitted, and a matching status.</p>
        <p>
          If you use the suggestion box, we collect your suggestion, plus a category and email address if you provide them. You can leave the
          email empty to send a suggestion without identifying yourself.
        </p>

        <h2>How we use it</h2>
        <ul>
          <li>To look for a compatible friendship match.</li>
          <li>To email you about your registration and a potential match.</li>
          <li>To review suggestions and improve Friendship Quest.</li>
        </ul>
        <p>
          Matching is currently performed or reviewed by authorized FAC administrators. This website doesn’t make automated matching
          decisions.
        </p>

        <h2>Where it’s stored and who can see it</h2>
        <p>
          During this initial release, submissions are sent through Google Apps Script and stored in a private Google Sheets spreadsheet.
          Access is intended to be limited to authorized FAC administrators. Google processes this data on FAC’s behalf and may store it
          outside Canada.
        </p>
        <p>
          The website itself is hosted on GitHub Pages. Like most web hosts, GitHub and Google may process technical information such as your
          IP address when you connect to them. Your registration answers are not stored on GitHub.
        </p>
        <p>No system is perfectly secure. We limit what we collect and who can reach it, but we can’t promise absolute security.</p>

        <h2>Sharing with other students</h2>
        <p>
          Your personal contact information won’t be shared with another participant without appropriate consent. We don’t sell your
          information or use it for advertising.
        </p>

        <h2>On your device</h2>
        <p>
          While you play, your answers are saved in your browser’s local storage so you don’t lose them. None of your answers are sent until you press
          Submit. Some pages ask our Google endpoint whether submissions are open; that request contains no answers. After a confirmed registration, your answers are removed from this device. Your first name, avatar, badges and reference ID
          stay until you clear them with the button in the quest menu, and your email address is kept only until you close the tab. On a
          shared computer, please clear the device when you’re done.
        </p>
        <p>We don’t use analytics, advertising cookies or tracking.</p>

        <h2>How long we keep it</h2>
        <p>
          FAC hasn’t set a fixed retention period for this initial release. You can ask us to delete your information at any time, and this
          page will be updated when a retention period is set.
        </p>

        <h2 id="your-choices">Correcting or deleting your information</h2>
        <p>
          You can ask to see, correct or delete your information, or withdraw from matching, at any time. Please include your reference ID
          (it starts with FQ-) and write from the email address you registered with, so we can confirm the request is yours.
        </p>
        {contact ? (
          <p>
            Privacy contact: <a href={`mailto:${contact}`}>{contact}</a>
          </p>
        ) : (
          <p>
            <strong>A privacy contact hasn’t been published yet.</strong> Registration shouldn’t open until it is. In the meantime you can
            reach us through the <Link to={paths.feedback}>suggestion box</Link>.
          </p>
        )}

        <h2>Eligibility and safety</h2>
        <p>
          Friendship Quest is for University of Alberta students. Students confirm this themselves; FAC doesn’t currently verify identity or
          enrolment. Please don’t include sensitive information, such as health details or government ID, anywhere in the quest or suggestion
          box.
        </p>

        <h2>About the University of Alberta</h2>
        <p>Friendship Quest is an initiative by Friends Across Campus. It is not operated or endorsed by the University of Alberta.</p>

        <h2>Changes</h2>
        <p>
          If we change how we handle information, we’ll update this page and its version. The version you agreed to is recorded with your
          registration.
        </p>
      </div>
    </div>
  );
}
