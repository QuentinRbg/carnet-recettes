import { useEffect, useState } from "react";
import { useApp } from "../AppContext";

/** Grande photo d'une recette, chargée à la demande. Tant qu'elle arrive, on affiche la miniature. */
export function usePhoto(id: string, thumb?: string): string | undefined {
  const { loadPhoto } = useApp();
  const [full, setFull] = useState<{ id: string; src: string } | null>(null);
  useEffect(() => {
    if (!thumb) return;
    let alive = true;
    loadPhoto(id).then(src => { if (alive && src) setFull({ id, src }); }).catch(() => {});
    return () => { alive = false; };
  }, [id, thumb, loadPhoto]);
  if (!thumb) return undefined;
  return full && full.id === id ? full.src : thumb;
}
