import { readFileSync, writeFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
    OPTION_NAMES_FILE,
    optionNamesModule,
    reference,
    REFERENCE_PAGES,
    withReference,
} from "../scripts/reference.js";

// The tables of the reference pages under docs/reference/ are generated from the source. A changed option, default,
// layout, algorithm, generator, dataset or format fails here until the pages are regenerated
// (`npm run docs:reference`). The hand-written text around the generated sections is kept.
describe("docs/reference", () => {
    it.each(REFERENCE_PAGES)(
        "%s holds the reference generated from the current source",
        async (page) => {
            const file = new URL(`../docs/reference/${page}`, import.meta.url);
            const current = readFileSync(file, "utf8");
            const expected = await withReference(page, current);
            if (process.env.UPDATE_REFERENCE === "1") {
                writeFileSync(file, expected);
                return;
            }
            expect(current, `docs/reference/${page} is out of date: run \`npm run docs:reference\``).toBe(expected);
        },
        120_000,
    );

    it("src/algorithm-options.ts lists the options of the current algorithm types", async () => {
        const file = new URL(`../${OPTION_NAMES_FILE}`, import.meta.url);
        const expected = await optionNamesModule();
        if (process.env.UPDATE_REFERENCE === "1") {
            writeFileSync(file, expected);
            return;
        }
        expect(readFileSync(file, "utf8"), `${OPTION_NAMES_FILE} is out of date: run \`npm run docs:reference\``).toBe(
            expected,
        );
    }, 120_000);

    it("gives every option a meaning", () => {
        // an option row whose last cell is empty has no doc comment where it is declared: write one there
        const undocumented = reference()
            .split("\n")
            .filter((line) => line.startsWith("| `") && line.endsWith("|  |"));
        expect(undocumented).toEqual([]);
    }, 120_000);
});
