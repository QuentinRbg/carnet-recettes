import { useState } from "react";
import { useDrawerBehavior } from "../hooks/useDrawerBehavior";
import { EMOJI_GROUPS, firstEmoji } from "../lib/emoji";

type Props = {
  /** Nom de l'ingrédient. */
  name: string;
  /** Emoji choisi à la main, s'il y en a un. */
  current: string | undefined;
  /** Emoji deviné d'après le nom. */
  auto: string;
  /** Une chaîne vide revient à l'emoji automatique. */
  onPick: (emoji: string) => void;
  onClose: () => void;
};

/** Tiroir « Emoji de l'ingrédient » : une grille d'emojis d'aliments, ou n'importe quel emoji saisi à la main. */
export function EmojiPicker({ name, current, auto, onPick, onClose }: Props) {
  useDrawerBehavior(onClose);
  const [custom, setCustom] = useState("");
  const typed = firstEmoji(custom);
  const shown = current || auto;

  return (
    <div className="drawer-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer emoji-picker" role="dialog" aria-modal="true" aria-labelledby="emojiTitle">
        <span className="grab" aria-hidden="true" />
        <button className="icon-btn drawer-close" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        <div className="drawer-body">
          <div className="emoji-head">
            <span className="emoji-big" aria-hidden="true">{shown}</span>
            <div>
              <h2 id="emojiTitle">Emoji de « {name} »</h2>
              <p className="sub">Valable pour toutes les recettes et les listes de courses.</p>
            </div>
          </div>

          <button className="btn small" type="button" disabled={!current} onClick={() => onPick("")}>
            Revenir à l'automatique {auto}
          </button>

          {EMOJI_GROUPS.map(g => (
            <div key={g.label} className="emoji-group">
              <span className="label-up">{g.label}</span>
              <div className="emoji-grid">
                {g.emojis.map(e => (
                  <button key={e} type="button" aria-label={e} aria-pressed={e === shown} onClick={() => onPick(e)}>{e}</button>
                ))}
              </div>
            </div>
          ))}

          <div className="emoji-group">
            <span className="label-up">Un autre emoji</span>
            <div className="emoji-custom">
              <input type="text" inputMode="text" placeholder="Colle ou tape un emoji" aria-label="Un autre emoji" value={custom} maxLength={16}
                onChange={e => setCustom(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (typed) onPick(typed); } }} />
              <button className="btn primary" type="button" disabled={!typed} onClick={() => typed && onPick(typed)}>
                {typed ? "Utiliser " + typed : "Utiliser"}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
