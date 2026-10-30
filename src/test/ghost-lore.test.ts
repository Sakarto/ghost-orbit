import { expect, it } from "vitest";
import { getGhostLore } from "@/lib/ghost-lore";

it("rejects unknown intact spacecraft lore with a safe message", () => {
  expect(() => getGhostLore("derelict", "9999999")).toThrow("This ghost's history is unknown.");
});

it("preserves known intact spacecraft lore", () => {
  expect(getGhostLore("derelict", "00005").facts).toContain("Vanguard 1");
});