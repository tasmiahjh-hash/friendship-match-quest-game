import { useState } from 'react';
import { PROGRAM_SUGGESTIONS, UNIVERSITIES, YEARS } from '../../data/campus';
import { useGame } from '../../state/GameContext';
import { cx } from '../../utils';
import { LevelShell } from './LevelShell';

const MAX_COURSES = 6;

export function CampusLevel() {
  const { state, dispatch } = useGame();
  const campus = state.profile.campus;
  const [courseDraft, setCourseDraft] = useState('');

  const update = (patch: Partial<typeof campus>) => dispatch({ type: 'UPDATE_CAMPUS', patch });

  const addCourse = () => {
    const code = courseDraft.trim().toUpperCase();
    if (!code || campus.courses.includes(code) || campus.courses.length >= MAX_COURSES) return;
    update({ courses: [...campus.courses, code] });
    setCourseDraft('');
  };

  const missing = [!campus.universityId && 'university', !campus.program.trim() && 'program', !campus.year && 'year'].filter(Boolean);

  return (
    <LevelShell
      level="campus"
      heading={
        <>
          Your <span className="text-gradient">campus life</span>
        </>
      }
      subheading="You’ll only be matched with students at your own university. Courses are optional, but they make great conversation starters."
      canContinue={missing.length === 0}
      hint={missing.length ? `Add your ${missing.join(', ')}` : undefined}
    >
      <section className="form-block">
        <h3 className="form-block__title">
          <span className="form-block__num">1</span> Your university
        </h3>
        <div className="uni-grid stagger">
          {UNIVERSITIES.map((u) => (
            <button
              key={u.id}
              className={cx('uni', campus.universityId === u.id && 'is-on')}
              aria-pressed={campus.universityId === u.id}
              onClick={() => update({ universityId: u.id })}
            >
              <span className="uni__emoji" aria-hidden="true">
                {u.emoji}
              </span>
              <span className="uni__name">{u.name}</span>
              <span className="uni__domain">@{u.emailDomain}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="form-block">
        <h3 className="form-block__title">
          <span className="form-block__num">2</span> Program
        </h3>
        <input
          className={cx('input', campus.program.trim() && 'input--valid')}
          placeholder="e.g. Psychology"
          value={campus.program}
          maxLength={60}
          onChange={(e) => update({ program: e.target.value })}
          aria-label="Program"
        />
        <div className="suggestions">
          {PROGRAM_SUGGESTIONS.map((p) => (
            <button key={p} className={cx('suggestion', campus.program === p && 'is-on')} onClick={() => update({ program: p })}>
              {p}
            </button>
          ))}
        </div>
      </section>

      <section className="form-block">
        <h3 className="form-block__title">
          <span className="form-block__num">3</span> Year of study
        </h3>
        <div className="segmented" role="radiogroup" aria-label="Year of study">
          {YEARS.map((y) => (
            <button
              key={y}
              role="radio"
              aria-checked={campus.year === y}
              className={cx('segmented__opt', campus.year === y && 'is-on')}
              onClick={() => update({ year: y })}
            >
              {y === 'Grad' ? 'Grad' : `${y} year`}
            </button>
          ))}
        </div>
      </section>

      <section className="form-block">
        <h3 className="form-block__title">
          <span className="form-block__num">4</span> Courses <span className="field__optional">optional</span>
        </h3>
        <form
          className="course-input"
          onSubmit={(e) => {
            e.preventDefault();
            addCourse();
          }}
        >
          <input
            className="input"
            placeholder="e.g. PSYC 101"
            value={courseDraft}
            maxLength={16}
            onChange={(e) => setCourseDraft(e.target.value)}
            aria-label="Add a course"
            disabled={campus.courses.length >= MAX_COURSES}
          />
          <button type="submit" className="btn btn--secondary" disabled={!courseDraft.trim()}>
            + Add
          </button>
        </form>
        {campus.courses.length > 0 && (
          <div className="course-list">
            {campus.courses.map((c) => (
              <span key={c} className="tag tag--lav course-tag">
                📘 {c}
                <button
                  aria-label={`Remove ${c}`}
                  onClick={() => update({ courses: campus.courses.filter((x) => x !== c) })}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </section>
    </LevelShell>
  );
}
