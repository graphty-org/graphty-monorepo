/**
 * @file The styles-from-files guide held against its example: the page opens with the example
 * file exactly as it is (so the page cannot drift from the code the browser test runs), the example
 * stays within the adoption budget, names no internal concept and imports only published entry
 * points, and no page that teaches file styles points a reader at anything outside the published
 * docs.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { authorLines, DOCS, exampleText, internalTermsIn, tsBlocks } from "./guide-examples";

const EXAMPLE = ["file-styles/open-and-save.ts", "example"] as const;

/** The subpaths package.json publishes, as a reader imports them. */
const PUBLISHED = new Set(
    Object.keys(
        (JSON.parse(readFileSync(join(DOCS, "..", "package.json"), "utf8")) as { exports: Record<string, unknown> })
            .exports,
    ).map((subpath) => (subpath === "." ? "@graphty/graphty-element" : `@graphty/graphty-element/${subpath.slice(2)}`)),
);

/** The pages that teach a file's styles. */
const PAGES = [
    "guide/file-styles.md",
    "guide/styling.md",
    "guide/column-encoding.md",
    "guide/data-sources.md",
    "guide/load-preview.md",
    "guide/extending/custom-data-sources.md",
];

describe("the styles-from-files guide", () => {
    const page = readFileSync(join(DOCS, "guide", "file-styles.md"), "utf8");
    const example = exampleText(...EXAMPLE);

    it("opens with the example file, exactly as the file has it", () => {
        assert.strictEqual(tsBlocks(page)[0], example);
    });

    it("keeps the first example within the adoption budget", () => {
        assert.isAtMost(authorLines(example), 16, `the example takes ${String(authorLines(example))} author lines`);
    });

    it("loads with the file's styles, exports with them, and reads the losses", () => {
        assert.include(example, 'loadFromUrl(url, { styles: "file" })');
        assert.include(example, 'exportGraph("graphml", { styles: true })');
        assert.include(example, "out.losses");
    });

    it("names no internal concept", () => {
        assert.deepEqual(internalTermsIn(example), []);
    });

    it("imports only published entry points", () => {
        const sources = [...example.matchAll(/from "([^"]+)"/g)].map((match) => match[1]);
        assert.isNotEmpty(sources);
        for (const source of sources) {
            assert.isTrue(PUBLISHED.has(source), `${source} is not a published entry point`);
        }
    });

    it.each(PAGES)("%s points at nothing a reader of the published docs cannot see", (file) => {
        const text = readFileSync(join(DOCS, file), "utf8");
        for (const term of [/\bprototype\b/i, /\bspike\b/i, /design\//, /\btmp\//, /#2029\b/, /\bsection \d/i]) {
            assert.notMatch(text, term, `${file} mentions ${String(term)}`);
        }
    });
});
