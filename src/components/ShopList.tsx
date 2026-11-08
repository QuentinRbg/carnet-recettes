import { useApp } from "../AppContext";
import { emojiOf } from "../lib/emoji";
import { shopQtyText } from "../lib/format";
import type { ShopLine } from "../lib/format";
import { RAYONS, rayonFor } from "../lib/rayon";

type Props = {
  lines: ShopLine[];
  isOn: (key: string) => boolean;
  onToggle: (key: string) => void;
};

/**
 * Liste de courses regroupée par rayon, dans l'ordre d'un magasin, avec un emoji devant chaque aliment.
 * Dans un rayon, ce qui reste à acheter passe avant ce qui est coché.
 */
export function ShopList({ lines, isOn, onToggle }: Props) {
  const { emojis } = useApp();
  const groups = RAYONS.map(r => ({
    ...r,
    items: lines
      .filter(x => rayonFor(x.name) === r.id)
      .sort((a, b) => Number(isOn(a.key)) - Number(isOn(b.key)) || a.name.localeCompare(b.name, "fr"))
  })).filter(g => g.items.length > 0);

  return (
    <div className="shop-groups">
      {groups.map(g => {
        const left = g.items.filter(x => !isOn(x.key)).length;
        return (
          <section key={g.id} className="shop-group" aria-label={g.label}>
            <h4><span aria-hidden="true">{g.emoji}</span> {g.label}<span className="count">{left === 0 ? "✓" : left}</span></h4>
            <ul className="shop">
              {g.items.map(x => (
                <li key={x.key} className={isOn(x.key) ? "done" : ""}>
                  <label>
                    <input type="checkbox" checked={isOn(x.key)} onChange={() => onToggle(x.key)} />
                    <span className="emo" aria-hidden="true">{emojiOf(x.name, emojis)}</span>
                    <span className="it">{x.name}</span>
                    <span className="q">{shopQtyText(x)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
