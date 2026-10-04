import { writeFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { INTERNAL_REFERENCE, internalReferences, pages, undocumented } from "../scripts/docs-reference.js";

// The format tables, options and codes in docs/ are generated from the source by scripts/docs-reference.ts. A new
// format, exporter, option or code fails here until the pages are regenerated (`npm run docs:reference`, which
// also creates the page of a new format).
describe("generated documentation", () => {
    it("matches the current source", async () => {
        const results = await pages();
        if (process.env.UPDATE_REFERENCE === "1") {
            for (const r of results) {
                writeFileSync(new URL(`../docs/${r.page}`, import.meta.url), r.expected);
            }
            return;
        }
        const stale = results.filter((r) => r.current !== r.expected).map((r) => r.page);
        expect(stale, "docs are out of date: run `npm run docs:reference` in graph-io").toEqual([]);
    }, 120_000);

    it("gives every option, code and capability a description", async () => {
        // a row without a meaning has no doc comment where it is declared: write one there
        expect(await undocumented()).toEqual([]);
    }, 120_000);

    it("never sends a reader to the internal design documents", async () => {
        // the published doc comments and the generated pages are read by users, who have neither
        expect(internalReferences()).toEqual([]);
        const leaking = (await pages()).filter((r) => INTERNAL_REFERENCE.test(r.expected)).map((r) => r.page);
        expect(leaking).toEqual([]);
    }, 120_000);
});
