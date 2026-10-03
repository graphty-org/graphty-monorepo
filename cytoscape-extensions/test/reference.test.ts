import { readFileSync, writeFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { reference, withReference } from "../scripts/reference.js";

// README.md's reference section is generated from the source. A changed option, default, layout, algorithm,
// generator, dataset or format fails here until the README is regenerated (`npm run docs:reference`).
const README = new URL("../README.md", import.meta.url);

describe("README.md", () => {
    it("holds the reference generated from the current source", async () => {
        const current = readFileSync(README, "utf8");
        const expected = await withReference(current);
        if (process.env.UPDATE_REFERENCE === "1") {
            writeFileSync(README, expected);
            return;
        }
        expect(current, "README.md is out of date: run `npm run docs:reference`").toBe(expected);
    }, 120_000);

    it("gives every option a meaning", () => {
        // an option row whose last cell is empty has no doc comment where it is declared: write one there
        const undocumented = reference()
            .split("\n")
            .filter((line) => line.startsWith("| `") && line.endsWith("|  |"));
        expect(undocumented).toEqual([]);
    }, 120_000);
});
