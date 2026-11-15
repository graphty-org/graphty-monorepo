/**
 * @file The node models guide held against its first example: the page opens with the example file
 * exactly as it is (so the page cannot drift from the code the browser test runs), the example stays
 * within the adoption budget, names no internal or 3D concept and imports only published entry
 * points, and the page has a row for every model code the element reports.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { authorLines, DOCS, exampleText, internalTermsIn, tsBlocks } from "./guide-examples";

/** What a first model example must not need to know about 3D. */
const THREE_D_TERMS = [
    "mesh",
    "material",
    "texture",
    "vertex",
    "vertices",
    "triangle",
    "normal",
    "scene",
    "Babylon",
    "glTF",
    "PBR",
    "shader",
];

describe("the node models guide", () => {
    const page = readFileSync(join(DOCS, "guide", "node-models.md"), "utf8");
    const example = exampleText("node-models/servers-as-racks.ts", "example");

    it("opens with the example file, exactly as the file has it", () => {
        assert.strictEqual(tsBlocks(page)[0], example);
    });

    it("keeps the first example within the adoption budget", () => {
        assert.isAtMost(authorLines(example), 20, `the example takes ${String(authorLines(example))} author lines`);
    });

    it("names no internal or 3D concept", () => {
        assert.deepEqual(internalTermsIn(example), []);
        assert.deepEqual(
            THREE_D_TERMS.filter((term) => new RegExp(`\\b${term}\\b`, "i").test(example)),
            [],
        );
    });

    it("imports only the published package", () => {
        assert.deepEqual(
            [...example.matchAll(/import "([^"]+)"/g)].map((m) => m[1]),
            ["@graphty/graphty-element"],
        );
    });

    it("teaches ready, the samples, encode and files, in that order", () => {
        const order = ["assets.ready(", "catalog.models()", "styles.encode(", "assets.add(input.files"].map((s) =>
            page.indexOf(s),
        );
        assert.notInclude(order, -1);
        assert.deepEqual(
            order,
            [...order].sort((a, b) => a - b),
        );
    });

    it("lists every model code in its table", () => {
        const source = readFileSync(join(DOCS, "..", "src", "errors", "codes.ts"), "utf8");
        const codes = [...new Set([...source.matchAll(/\| "([EW]_MODEL_[A-Z_]+)"/g)].map((m) => m[1]))];
        assert.isNotEmpty(codes);
        for (const code of codes) {
            assert.include(page, `| \`${code}\``, code);
        }
    });
});
