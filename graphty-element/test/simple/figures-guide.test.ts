/**
 * @file The screenshots guide's vector figure section held against its example: the page shows the
 * example file exactly as it is, and the example stays within the adoption budget and names no
 * internal concept.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { authorLines, DOCS, exampleText, internalTermsIn, tsBlocks } from "./guide-examples";

describe("the vector figure example", () => {
    const page = readFileSync(join(DOCS, "guide", "screenshots.md"), "utf8");
    const example = exampleText("figures/svg-figure.ts", "example");

    it("is on the page exactly as the file has it", () => {
        assert.include(tsBlocks(page), example);
    });

    it("keeps within the adoption budget and names no internal concept", () => {
        assert.isAtMost(authorLines(example), 15);
        assert.deepEqual(internalTermsIn(example), []);
    });
});
