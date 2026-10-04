import { useState } from 'react';
import { REPORT_REASONS } from '../../data/safety';
import { useGame } from '../../state/GameContext';
import type { ReportReason } from '../../types';
import { cx, uid } from '../../utils';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Modal } from '../ui/Modal';
import type { SafetyAction } from './RoomHeader';

interface Props {
  action: SafetyAction | null;
  onClose: () => void;
}

export function SafetyModals({ action, onClose }: Props) {
  return (
    <>
      <ReportModal open={action === 'report'} onClose={onClose} />
      <ConfirmEndModal kind="block" open={action === 'block'} onClose={onClose} />
      <ConfirmEndModal kind="unmatch" open={action === 'unmatch'} onClose={onClose} />
    </>
  );
}

function ReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useGame();
  const name = state.match?.student.firstName ?? 'this person';
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const close = () => {
    if (submittedId && alsoBlock) dispatch({ type: 'BLOCK' });
    setReason(null);
    setDetails('');
    setAlsoBlock(false);
    setSubmittedId(null);
    onClose();
  };

  const submit = () => {
    if (!reason) return;
    const id = uid('rpt');
    dispatch({ type: 'REPORT', report: { id, reason, details: details.trim(), alsoBlocked: alsoBlock, at: Date.now() } });
    setSubmittedId(id);
  };

  if (submittedId) {
    return (
      <Modal open={open} onClose={close} title="Thanks for telling us" icon="💚" tone="safe" actions={<Button onClick={close}>Done</Button>}>
        <p>Your report has been sent to the FAC safety team. A trained team member will review it, usually within 24 hours.</p>
        <p>
          {name} won’t be told who reported them.{' '}
          {alsoBlock ? `When you close this, ${name} will be blocked.` : 'You can still block or unmatch at any time.'}
        </p>
        <div className="pill-note">
          <span className="pill-note__icon">🆘</span>
          <span>If you’re ever in immediate danger, contact campus security or emergency services first.</span>
        </div>
        <p className="muted report__ref">Reference: {submittedId.toUpperCase()} (prototype, not actually sent)</p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Report ${name}`}
      icon="🚩"
      tone="danger"
      wide
      actions={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="danger-solid" disabled={!reason} onClick={submit}>
            Send report
          </Button>
        </>
      }
    >
      <p>What’s going on? Your report is confidential.</p>
      <div className="report__reasons" role="radiogroup" aria-label="Reason">
        {REPORT_REASONS.map((r) => (
          <button
            key={r.id}
            role="radio"
            aria-checked={reason === r.id}
            className={cx('report__reason', reason === r.id && 'is-on')}
            onClick={() => setReason(r.id)}
          >
            <span aria-hidden="true">{r.emoji}</span> {r.label}
          </button>
        ))}
      </div>
      <label className="field">
        <span className="field__label">
          Anything else we should know? <span className="field__optional">optional</span>
        </span>
        <textarea
          className="input"
          rows={3}
          maxLength={600}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe what happened…"
        />
      </label>
      <Checkbox checked={alsoBlock} onChange={setAlsoBlock}>
        Also block {name}
      </Checkbox>
      <div className="pill-note pill-note--lav">
        <span className="pill-note__icon">🔐</span>
        <span>
          Moderators don’t routinely read private chats. Submitting a report shares <strong>this conversation</strong> with the FAC safety team
          so they can review what happened.
        </span>
      </div>
    </Modal>
  );
}

function ConfirmEndModal({ kind, open, onClose }: { kind: 'block' | 'unmatch'; open: boolean; onClose: () => void }) {
  const { state, dispatch } = useGame();
  const name = state.match?.student.firstName ?? 'this person';
  const isBlock = kind === 'block';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isBlock ? `Block ${name}?` : `Unmatch with ${name}?`}
      icon={isBlock ? '⛔' : '💔'}
      tone="danger"
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger-solid"
            onClick={() => {
              dispatch({ type: isBlock ? 'BLOCK' : 'UNMATCH' });
              onClose();
            }}
          >
            {isBlock ? 'Block' : 'Unmatch'}
          </Button>
        </>
      }
    >
      {isBlock ? (
        <>
          <p>
            {name} won’t be able to message you, and you won’t be matched again. Any meetup plans are cancelled, and anything you shared is
            hidden from them.
          </p>
          <p>{name} won’t be notified that you blocked them.</p>
        </>
      ) : (
        <>
          <p>This closes the Match Room for both of you and cancels any meetup plans. Nothing you chose not to share is ever revealed.</p>
          <p>No hard feelings. Not every match is meant to be. You’ll be eligible for a new match next round.</p>
        </>
      )}
      <p className="muted">Want someone to look into their behaviour too? Use Report instead.</p>
    </Modal>
  );
}
