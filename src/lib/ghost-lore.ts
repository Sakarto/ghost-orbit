import { EVENT_META, ZOMBIES, type EventKey } from "@/lib/events";

export function getGhostLore(source: EventKey, norad: string) {
  const lore = source === "derelict" ? ZOMBIES[String(Number(norad))] : EVENT_META[source];
  if (!lore?.facts) throw new Error("This ghost's history is unknown.");
  return lore;
}