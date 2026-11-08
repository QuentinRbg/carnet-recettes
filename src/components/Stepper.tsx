type Props = { value: number; min: number; max: number; onChange: (v: number) => void; small?: boolean };

/** Sélecteur − n + */
export function Stepper({ value, min, max, onChange, small }: Props) {
  const set = (x: number) => onChange(Math.max(min, Math.min(max, x)));
  return (
    <div className={"stepper" + (small ? " sm" : "")}>
      <button className="st-btn" type="button" aria-label="Moins" disabled={value <= min} onClick={() => set(value - 1)}>−</button>
      <span className="st-val" aria-live="polite">{value}</span>
      <button className="st-btn" type="button" aria-label="Plus" disabled={value >= max} onClick={() => set(value + 1)}>+</button>
    </div>
  );
}
