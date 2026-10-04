import { useState } from 'react';
import { GETTING_TO_KNOW_THRESHOLD } from '../../data/progression';
import { useGame } from '../../state/GameContext';
import type { ContactChannel } from '../../types';
import { cx, normaliseInstagram } from '../../utils';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

const LABEL: Record<ContactChannel, { name: string; emoji: string }> = {
  instagram: { name: 'Instagram', emoji: '📸' },
  email: { name: 'email', emoji: '📧' },
};

export function ContactSharingPanel() {
  const { state, dispatch } = useGame();
  const [confirm, setConfirm] = useState<ContactChannel | null>(null);
  const [igDraft, setIgDraft] = useState('');
  const match = state.match!;
  const name = match.student.firstName;
  const { contact } = state.profile;
  const { sharing } = state;
  const active = state.relationship === 'active';

  const sent = state.messages.filter((m) => m.from === 'me').length;
  const unlocked = sent >= GETTING_TO_KNOW_THRESHOLD;

  if (!unlocked) {
    return (
      <section className="side-card side-card--locked">
        <h3 className="side-card__title">🔐 Stay connected</h3>
        <p className="muted">
          Options to share contact info unlock once you’ve chatted a little. Until then, everything stays inside Friendship Quest.
        </p>
        <div className="lock-progress">
          <div className="lock-progress__bar">
            <div style={{ width: `${(sent / GETTING_TO_KNOW_THRESHOLD) * 100}%` }} />
          </div>
          <span>
            {sent}/{GETTING_TO_KNOW_THRESHOLD} messages
          </span>
        </div>
      </section>
    );
  }

  const valueFor = (c: ContactChannel) => (c === 'email' ? contact.email : contact.instagram);

  const row = (channel: ContactChannel) => {
    const value = valueFor(channel);
    const isShared = sharing.mine[channel];
    return (
      <div className={cx('share-row', isShared && 'is-shared')} key={channel}>
        <div className="share-row__icon">{LABEL[channel].emoji}</div>
        <div className="share-row__info">
          <div className="share-row__title">Share my {LABEL[channel].name}</div>
          <div className="share-row__value">{value ? (isShared ? `${value} · visible to ${name}` : `${value} · hidden`) : 'Not added'}</div>
        </div>
        {isShared ? (
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'UNSHARE_CONTACT', channel })}>
            Hide
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled={!value || !active} onClick={() => setConfirm(channel)}>
            Share
          </Button>
        )}
      </div>
    );
  };

  return (
    <section className="side-card share">
      <h3 className="side-card__title">Want to stay connected outside Friendship Quest?</h3>
      <p className="share__intro">
        <strong>Totally optional.</strong> Each of you controls your own info. Sharing yours never shares {name}’s, and neither of you ever has
        to.
      </p>

      <div className="share__rows">
        {row('instagram')}
        {!contact.instagram && (
          <form
            className="share__add-ig"
            onSubmit={(e) => {
              e.preventDefault();
              const handle = normaliseInstagram(igDraft);
              if (handle) dispatch({ type: 'UPDATE_CONTACT', patch: { instagram: handle } });
              setIgDraft('');
            }}
          >
            <input className="input input--sm" placeholder="Add an Instagram handle (still private)" value={igDraft} onChange={(e) => setIgDraft(e.target.value)} />
            <Button size="sm" variant="ghost" type="submit" disabled={!igDraft.trim()}>
              Save
            </Button>
          </form>
        )}
        {row('email')}

        <button
          className={cx('share-row share-row--keep', sharing.keepChattingHere && 'is-shared')}
          onClick={() => dispatch({ type: 'KEEP_CHATTING_HERE' })}
          disabled={!active}
        >
          <div className="share-row__icon">💬</div>
          <div className="share-row__info">
            <div className="share-row__title">Keep chatting here</div>
            <div className="share-row__value">
              {sharing.keepChattingHere ? 'Selected · your details stay private' : 'Totally fine. No need to share anything.'}
            </div>
          </div>
          <span className="share-row__check">{sharing.keepChattingHere ? '✓' : ''}</span>
        </button>
      </div>

      <div className="share__theirs">
        <div className="eyebrow">Shared with you by {name}</div>
        {sharing.theirs.instagram || sharing.theirs.email ? (
          <div className="share__theirs-list">
            {sharing.theirs.instagram && <span className="tag tag--lav">📸 {sharing.theirs.instagram}</span>}
            {sharing.theirs.email && <span className="tag tag--lav">📧 {sharing.theirs.email}</span>}
            <p className="muted share__note">{name} chose to share this. You don’t need to share anything back.</p>
          </div>
        ) : (
          <p className="muted share__note">Nothing yet, and that’s okay. It’s {name}’s choice.</p>
        )}
      </div>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={`Share your ${confirm ? LABEL[confirm].name : ''} with ${name}?`}
        icon={confirm ? LABEL[confirm].emoji : '🔐'}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Not now
            </Button>
            <Button
              onClick={() => {
                if (confirm) dispatch({ type: 'SHARE_CONTACT', channel: confirm });
                setConfirm(null);
              }}
            >
              Yes, share it
            </Button>
          </>
        }
      >
        <p>
          {name} will see <strong className="share__confirm-value">{confirm ? valueFor(confirm) : ''}</strong> in your Match Room.
        </p>
        <p>This only shares your own {confirm ? LABEL[confirm].name : 'info'}. You can hide it again later, but {name} may already have seen it.</p>
        <div className="pill-note">
          <span className="pill-note__icon">💛</span>
          <span>Only share if you genuinely want to. Keeping the chat here is always a great option.</span>
        </div>
      </Modal>
    </section>
  );
}
