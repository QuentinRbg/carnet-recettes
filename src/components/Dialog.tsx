import { useEffect } from "react";
import type { ReactNode } from "react";

type Props = {
  onClose: () => void;
  title: string;
  titleId: string;
  /** Texte sous le titre. */
  sub?: string;
  alert?: boolean;
  children: ReactNode;
};

/** Fenêtre dans la page : se ferme avec Échap ou en touchant le fond. */
export function Dialog({ onClose, title, titleId, sub, alert, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role={alert ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={titleId}>
        <div>
          <h2 id={titleId}>{title}</h2>
          {sub ? <p className="sub">{sub}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

type ConfirmProps = {
  title: string;
  text: string;
  okLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onOk: () => void;
  onCancel: () => void;
};

/** Fenêtre de confirmation générique (jamais de confirm() du navigateur). */
export function ConfirmBox({ title, text, okLabel, cancelLabel = "Annuler", danger, onOk, onCancel }: ConfirmProps) {
  return (
    <Dialog title={title} titleId="cbTitle" sub={text} alert onClose={onCancel}>
      <div className="actions" style={{ justifyContent: "flex-end" }}>
        <button className="btn" type="button" autoFocus onClick={onCancel}>{cancelLabel}</button>
        <button className={"btn " + (danger ? "danger" : "primary")} type="button" onClick={onOk}>{okLabel}</button>
      </div>
    </Dialog>
  );
}
