import { useEffect } from "react";

/** Comportement commun des tiroirs : Échap ferme, et le fond de la page ne défile pas pendant qu'ils sont ouverts. */
export function useDrawerBehavior(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
}
