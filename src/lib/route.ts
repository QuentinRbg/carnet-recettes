export type Route = { v: "list" } | { v: "courses" } | { v: "batch" } | { v: "finder" } | { v: "recipe"; id: string };

/** Routage par hash : (vide) = liste, #courses, #batch, #finder, #r-<id> = fiche. */
export function getRoute(): Route {
  const hs = location.hash.replace(/^#/, "");
  if (hs === "courses") return { v: "courses" };
  if (hs === "batch") return { v: "batch" };
  if (hs === "finder") return { v: "finder" };
  if (hs.startsWith("r-")) return { v: "recipe", id: hs.slice(2) };
  return { v: "list" };
}

export const currentHash = () => location.hash.replace(/^#/, "");
