interface Props {
  value: string;
  onChange: (value: string) => void;
}

/** Invisible to people and assistive tech. Only automated form fillers put anything in it. */
export function Honeypot({ value, onChange }: Props) {
  return (
    <div className="hp" aria-hidden="true">
      <label>
        Leave this field empty
        <input
          type="text"
          name="fq_leave_empty"
          tabIndex={-1}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore=""
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
