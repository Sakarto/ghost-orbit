import { expect, it } from "vitest";
import { ESA_CONTEXT } from "@/data/esa-context";

it("keeps the requested rounded ESA macro quantities with their historical categories", () => {
  expect(ESA_CONTEXT.large).toMatchObject({ count: 36500, year: 2021, size: ">10 cm" });
  expect(ESA_CONTEXT.small).toMatchObject({ count: 130000000, year: 2019, size: ">1 mm" });
});