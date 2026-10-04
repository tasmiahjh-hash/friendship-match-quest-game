import { useEffect, useRef, useState } from 'react';
import { STYLE_QUESTIONS, friendshipArchetype } from '../../data/styleQuestions';
import { useGame } from '../../state/GameContext';
import { cx } from '../../utils';
import { LevelShell } from './LevelShell';

const ADVANCE_MS = 520;

export function StyleLevel() {
  const { state, dispatch } = useGame();
  const answers = state.profile.styleAnswers;
  const answeredCount = STYLE_QUESTIONS.filter((q) => answers[q.id]).length;
  const allAnswered = answeredCount === STYLE_QUESTIONS.length;

  // Start at the first unanswered question, or the summary if everything is answered.
  const firstOpen = STYLE_QUESTIONS.findIndex((q) => !answers[q.id]);
  const [index, setIndex] = useState(firstOpen === -1 ? STYLE_QUESTIONS.length : firstOpen);
  const [picked, setPicked] = useState<string | null>(null);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onSummary = index >= STYLE_QUESTIONS.length;
  const question = STYLE_QUESTIONS[Math.min(index, STYLE_QUESTIONS.length - 1)];

  const choose = (optionId: string) => {
    if (picked) return;
    setPicked(optionId);
    dispatch({ type: 'ANSWER_STYLE', questionId: question.id, optionId });
    timer.current = window.setTimeout(() => {
      setPicked(null);
      // Jump to the next unanswered question, else the summary.
      const nextAnswers = { ...answers, [question.id]: optionId };
      const nextOpen = STYLE_QUESTIONS.findIndex((q) => !nextAnswers[q.id]);
      setIndex(nextOpen === -1 ? STYLE_QUESTIONS.length : nextOpen);
    }, ADVANCE_MS);
  };

  const archetype = friendshipArchetype(answers);

  return (
    <LevelShell
      level="style"
      heading={
        <>
          Your <span className="text-gradient">friendship style</span>
        </>
      }
      subheading="Five quick this-or-that rounds. No wrong answers, just go with your gut."
      canContinue={allAnswered}
      hint={`${STYLE_QUESTIONS.length - answeredCount} to go`}
    >
      <div className="rounds" role="tablist" aria-label="Questions">
        {STYLE_QUESTIONS.map((q, i) => (
          <button
            key={q.id}
            role="tab"
            aria-selected={i === index}
            className={cx('rounds__dot', answers[q.id] && 'is-done', i === index && 'is-current')}
            onClick={() => !picked && setIndex(i)}
          >
            <span className="sr-only">Question {i + 1}</span>
            {answers[q.id] ? '✓' : i + 1}
          </button>
        ))}
        <button
          className={cx('rounds__dot rounds__dot--final', onSummary && 'is-current', allAnswered && 'is-done')}
          disabled={!allAnswered}
          onClick={() => setIndex(STYLE_QUESTIONS.length)}
          aria-label="Your result"
        >
          ★
        </button>
      </div>

      {!onSummary ? (
        <div className="round" key={question.id}>
          <div className="round__kicker">
            Round {index + 1} · {question.kicker}
          </div>
          <h2 className="round__prompt">{question.prompt}</h2>
          <div className={cx('round__options', `round__options--${question.options.length}`)}>
            {question.options.map((o, i) => {
              const isPicked = picked === o.id;
              const isCurrent = !picked && answers[question.id] === o.id;
              return (
                <button
                  key={o.id}
                  className={cx('option', (isPicked || isCurrent) && 'is-on', picked && !isPicked && 'is-dim')}
                  style={{ animationDelay: `${i * 0.07}s` }}
                  onClick={() => choose(o.id)}
                >
                  <span className="option__emoji" aria-hidden="true">
                    {o.emoji}
                  </span>
                  <span className="option__label">{o.label}</span>
                  <span className="option__blurb">{o.blurb}</span>
                  {isPicked && <span className="option__plus">+XP</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="archetype panel" key="summary">
          <div className="archetype__emoji" aria-hidden="true">
            {archetype.emoji}
          </div>
          <div className="eyebrow">Your friendship archetype</div>
          <h2 className="archetype__name">{archetype.name}</h2>
          <p className="archetype__blurb">{archetype.blurb}</p>
          <div className="archetype__answers">
            {STYLE_QUESTIONS.map((q, i) => {
              const o = q.options.find((opt) => opt.id === answers[q.id]);
              return (
                <button key={q.id} className="tag" onClick={() => setIndex(i)} title="Change answer">
                  <span aria-hidden="true">{o?.emoji}</span> {o?.label}
                </button>
              );
            })}
          </div>
          <p className="muted archetype__note">Tap any answer to change it.</p>
        </div>
      )}
    </LevelShell>
  );
}
