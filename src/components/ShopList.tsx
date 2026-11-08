import { emojiFor } from "../lib/emoji";
import { qtyText } from "../lib/format";
import type { ShopLine } from "../lib/format";

type Props = {
  lines: ShopLine[];
  isOn: (key: string) => boolean;
  onToggle: (key: string) => void;
};

/** Liste de courses : un emoji devant chaque aliment aide à repérer une ligne dans une longue liste. */
export function ShopList({ lines, isOn, onToggle }: Props) {
  return (
    <ul className="shop">
      {lines.map(x => (
        <li key={x.key} className={isOn(x.key) ? "done" : ""}>
          <label>
            <input type="checkbox" checked={isOn(x.key)} onChange={() => onToggle(x.key)} />
            <span className="emo" aria-hidden="true">{emojiFor(x.name)}</span>
            <span className="it">{x.name}</span>
            <span className="q">{qtyText(x.q, x.u)}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
