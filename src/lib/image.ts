/** Taille réduite qui garde les proportions, sans jamais agrandir. */
export function fitSize(w: number, h: number, max: number): { w: number; h: number } {
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

/** Un document Firestore pèse 1 Mo au maximum : on garde de la marge. */
export const MAX_PHOTO_CHARS = 700_000;

export type Photo = { full: string; thumb: string };

function draw(bmp: ImageBitmap, max: number, quality: number): string {
  const { w, h } = fitSize(bmp.width, bmp.height, max);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas indisponible");
  ctx.fillStyle = "#fff"; // pas de fond noir pour les PNG transparents
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  return c.toDataURL("image/jpeg", quality);
}

/**
 * Réduit une photo (appareil photo, galerie…) en JPEG : une grande version (1200 px) pour la fiche
 * et une miniature (360 px) pour les cartes de la liste. Les photos de téléphone font plusieurs Mo : on les compresse
 * pour rester dans les limites gratuites de Firestore.
 */
export async function processPhoto(file: File): Promise<Photo> {
  if (!file.type.startsWith("image/")) throw new Error("Ce fichier n'est pas une image.");
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    let full = "";
    for (const [max, q] of [[1200, 0.8], [1200, 0.65], [900, 0.6], [700, 0.55]] as const) {
      full = draw(bmp, max, q);
      if (full.length <= MAX_PHOTO_CHARS) break;
    }
    if (full.length > MAX_PHOTO_CHARS) throw new Error("Photo trop lourde, essaie une autre image.");
    return { full, thumb: draw(bmp, 360, 0.72) };
  } finally {
    bmp.close();
  }
}
