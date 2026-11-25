import { useEffect, useId, useRef, useState } from 'react';
import { CAMPUSES, MAX_COURSES, PROGRAM_SUGGESTIONS, YEARS, yearLabel } from '../../data/campus';
import { useGame } from '../../state/GameContext';
import { cx } from '../../utils';
import { onRadioKeys, radioTabIndex } from '../ui/radioKeys';
import { LevelShell } from './LevelShell';

export function CampusLevel() {
  const { state, dispatch } = useGame();
  const campus = state.profile.campus;
  const [courseDraft, setCourseDraft] = useState('');
  const id = useId();

  const update = (patch: Partial<typeof campus>) => dispatch({ type: 'UPDATE_CAMPUS', patch });

  const addCourse = () => {
    const code = courseDraft.trim().replace(/\s+/g, ' ').toUpperCase();
    if (!code || campus.courses.length >= MAX_COURSES) return;
    if (!campus.courses.includes(code)) update({ courses: [...campus.courses, code] });
    setCourseDraft('');
  };

  // A typed course is kept even if the student leaves without pressing Add. Doing this on
  // blur instead would shift the page mid-click and swallow the click on "Complete level".
  const leave = useRef(addCourse);
  leave.current = addCourse;
  useEffect(() => () => leave.current(), []);

  return (
    <LevelShell
      level="campus"
      heading={
        <>
          Your <span className="text-gradient">campus life</span>
        </>
      }
      subheading="Friendship Quest is for University of Alberta students. Tell us where we’d find you. Courses are optional, but they make great conversation starters."
    >
      <section className="form-block">
        <h2 className="form-block__title" id={`${id}-campus`}>
          <span className="form-block__num" aria-hidden="true">
            1
          </span>{' '}
          Your campus
        </h2>
        <div className="uni-grid stagger" role="radiogroup" aria-labelledby={`${id}-campus`} onKeyDown={onRadioKeys}>
          {CAMPUSES.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              className={cx('uni', campus.campusId === c.id && 'is-on')}
              aria-checked={campus.campusId === c.id}
              tabIndex={radioTabIndex(campus.campusId === c.id, Boolean(campus.campusId), i)}
              onClick={() => update({ campusId: c.id })}
            >
              <span className="uni__emoji" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="uni__name">{c.name}</span>
              <span className="uni__domain">{c.place}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="form-block">
        <h2 className="form-block__title">
          <span className="form-block__num" aria-hidden="true">
            2
          </span>{' '}
          <label htmlFor={`${id}-program`}>Program</label>
        </h2>
        <input
          id={`${id}-program`}
          className={cx('input', campus.program.trim() && 'input--valid')}
          placeholder="e.g. Psychology"
          value={campus.program}
          maxLength={60}
          required
          onChange={(e) => update({ program: e.target.value })}
          onBlur={() => update({ program: campus.program.trim() })}
        />
        <div className="suggestions" role="group" aria-label="Program suggestions">
          {PROGRAM_SUGGESTIONS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={campus.program === p}
              className={cx('suggestion', campus.program === p && 'is-on')}
              onClick={() => update({ program: p })}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      <section className="form-block">
        <h2 className="form-block__title" id={`${id}-year`}>
          <span className="form-block__num" aria-hidden="true">
            3
          </span>{' '}
          Year of study
        </h2>
        <div className="segmented" role="radiogroup" aria-labelledby={`${id}-year`} onKeyDown={onRadioKeys}>
          {YEARS.map((y, i) => (
            <button
              key={y}
              type="button"
              role="radio"
              aria-checked={campus.year === y}
              tabIndex={radioTabIndex(campus.year === y, Boolean(campus.year), i)}
              className={cx('segmented__opt', campus.year === y && 'is-on')}
              onClick={() => update({ year: y })}
            >
              {yearLabel(y)}
            </button>
          ))}
        </div>
      </section>

      <section className="form-block">
        <h2 className="form-block__title">
          <span className="form-block__num" aria-hidden="true">
            4
          </span>{' '}
          <label htmlFor={`${id}-course`}>Courses</label>{' '}
          <span className="field__optional">optional · up to {MAX_COURSES}</span>
        </h2>
        <form
          className="course-input"
          onSubmit={(e) => {
            e.preventDefault();
            addCourse();
          }}
        >
          <input
            id={`${id}-course`}
            className="input"
            placeholder="e.g. PSYCH 104"
            value={courseDraft}
            maxLength={16}
            onChange={(e) => setCourseDraft(e.target.value)}
            disabled={campus.courses.length >= MAX_COURSES}
          />
          <button type="submit" className="btn btn--secondary" disabled={!courseDraft.trim()}>
            + Add
          </button>
        </form>
        {campus.courses.length > 0 && (
          <ul className="course-list" aria-label="Your courses">
            {campus.courses.map((c) => (
              <li key={c} className="tag tag--lav course-tag">
                <span aria-hidden="true">📘</span> {c}
                <button type="button" aria-label={`Remove ${c}`} onClick={() => update({ courses: campus.courses.filter((x) => x !== c) })}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </LevelShell>
  );
}
