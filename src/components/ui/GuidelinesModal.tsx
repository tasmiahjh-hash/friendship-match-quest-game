import { COMMUNITY_GUIDELINES, MODERATION_EXPLAINER } from '../../data/safety';
import { Button } from './Button';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onAgree?: () => void;
}

export function GuidelinesModal({ open, onClose, onAgree }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Community guidelines"
      icon="🛡️"
      tone="safe"
      wide
      actions={
        onAgree ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={() => {
                onAgree();
                onClose();
              }}
            >
              I agree
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Got it</Button>
        )
      }
    >
      <p>Friendship Quest is a space for making friends, safely. Everyone here agrees to:</p>
      <div className="guidelines-list">
        {COMMUNITY_GUIDELINES.map((g) => (
          <div className="guideline" key={g.title}>
            <div className="guideline__emoji" aria-hidden="true">
              {g.emoji}
            </div>
            <div>
              <div className="guideline__title">{g.title}</div>
              <div className="guideline__body">{g.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="pill-note pill-note--lav">
        <span className="pill-note__icon">🔐</span>
        <span>{MODERATION_EXPLAINER}</span>
      </div>
    </Modal>
  );
}
