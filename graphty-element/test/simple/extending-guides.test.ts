/**
 * @file The layout, palette and log destination guides held against the example files the browser
 * tests run: every example appears in its guide exactly as it is in its file (so the page cannot
 * drift from tested code, and a reader of the raw Markdown sees the code), the first plugin stays
 * within the adoption budget end to end, and no example names an internal concept. The algorithm
 * guide has the same checks in define-algorithm.test.ts.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { authorLines, DOCS, exampleText, internalTermsIn, tsBlocks } from "./guide-examples";

/** One guide: its file, where its simple tier ends, its examples, and what its first plugin is. */
interface Guide {
    readonly file: string;
    readonly advancedHeading: string;
    /** Every example the simple tier shows, as [file, region]. */
    readonly examples: readonly (readonly [string, string?])[];
    /** The first plugin end to end: the definition and its use-it line. */
    readonly firstPlugin: readonly (readonly [string, string?])[];
    /** Internal terms that mean something else in this guide. */
    readonly allowed?: readonly string[];
}

const GUIDES: readonly Guide[] = [
    {
        file: "custom-layouts.md",
        advancedHeading: "## Advanced: full control",
        examples: [
            ["simple-tier/layout-tiers.ts", "example"],
            ["simple-tier/layout-tiers.ts", "use"],
            ["simple-tier/layout-category-rows.ts", "example"],
            ["simple-tier/layout-category-rows.ts", "use"],
            ["simple-tier/layout-precomputed.ts", "example"],
            ["simple-tier/layout-precomputed.ts", "use"],
        ],
        firstPlugin: [
            ["simple-tier/layout-tiers.ts", "example"],
            ["simple-tier/layout-tiers.ts", "use"],
        ],
        // A layout arranges nodes in rows on screen; that is not the element's storage row.
        allowed: ["row", "rows"],
    },
    {
        file: "custom-palettes.md",
        advancedHeading: "## Advanced: the palette descriptor",
        examples: [
            ["simple-tier/palette/brand-palettes.ts", "example"],
            ["simple-tier/palette/use-brand-palettes.ts", "use"],
            ["simple-tier/palette/token-colour.ts", "example"],
        ],
        firstPlugin: [
            ["simple-tier/palette/brand-palettes.ts", "example"],
            ["simple-tier/palette/use-brand-palettes.ts", "use"],
        ],
    },
    {
        file: "custom-log-destinations.md",
        advancedHeading: "## The advanced tier",
        examples: [["simple-tier/log-destination-telemetry.ts"], ["simple-tier/log-destination-panel.ts"]],
        firstPlugin: [["simple-tier/log-destination-telemetry.ts"]],
    },
];

describe.each(GUIDES)("the $file guide and its examples", (guide) => {
    const text = readFileSync(join(DOCS, "guide", "extending", guide.file), "utf8");
    const simpleTier = text.slice(0, text.indexOf(guide.advancedHeading));

    it("leads with the simple tier and labels the rest advanced", () => {
        assert.isAbove(text.indexOf(guide.advancedHeading), 0);
        const [file, region] = guide.firstPlugin[0];
        assert.strictEqual(tsBlocks(text)[0], exampleText(file, region), "the first example is the first plugin");
    });

    it("shows every example exactly as the tested file has it, inline", () => {
        assert.notInclude(simpleTier, "<<<", "the raw Markdown carries the code, not an include");
        const blocks = tsBlocks(simpleTier);
        for (const [file, region] of guide.examples) {
            assert.include(blocks, exampleText(file, region), `${file}${region === undefined ? "" : `#${region}`}`);
        }
    });

    it("keeps the first plugin, end to end, within the adoption budget", () => {
        const total = guide.firstPlugin.reduce((sum, [file, region]) => sum + authorLines(exampleText(file, region)), 0);
        assert.isAtMost(total, 20, `the first plugin takes ${String(total)} author lines`);
    });

    it("names no internal concept in any example", () => {
        for (const [file, region] of guide.examples) {
            assert.deepEqual(internalTermsIn(exampleText(file, region), guide.allowed), [], file);
        }
    });
});
