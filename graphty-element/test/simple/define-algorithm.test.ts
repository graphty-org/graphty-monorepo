/**
 * @file `defineAlgorithm` without a browser: the refusals a malformed definition meets at the
 * define call itself, and the guide's toy examples held against the files the browser tests run.
 *
 * The guide (docs/guide/extending/custom-algorithms.md) shows each example with the import a
 * reader writes, `@graphty/graphty-element/extend`; the example files under
 * docs/examples/simple-tier/ import the same module from source so the browser tests can run them.
 * The check below fails when the two drift apart, when an example outgrows the adoption budget
 * (design/extensions/README.md section 8.1: about 15 author lines, never more than 20, counted
 * end to end), or when one names a concept a newcomer should never need.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { defineAlgorithm } from "../../extend";
import { type GraphtyError, isGraphtyError } from "../../src/errors";

const ROOT = join(__dirname, "..", "..");
const GUIDE = readFileSync(join(ROOT, "docs", "guide", "extending", "custom-algorithms.md"), "utf8");
const EXAMPLES_DIR = join(ROOT, "docs", "examples", "simple-tier");
const EXAMPLE_FILES = readdirSync(EXAMPLES_DIR).filter((name) => name.endsWith(".ts"));

/** Where the simple tier ends in the guide and the advanced tier begins. */
const ADVANCED_HEADING = "## Advanced: full control";

/** The guide's "use it" lines for the first plugin, run as written by the browser tests. */
const FIRST_PLUGIN_USE = [
    'element.run("acme-confidence-degree", {}, { as: "strength" }); // colours the nodes',
    'element.run("acme-confidence-share", {}, { as: "share" }); // colours the edges',
];

/**
 * Terms a first plugin must not need (design/extensions/README.md section 8.1 item 4), matched
 * as whole words.
 */
const INTERNAL_TERMS = [
    "snapshot",
    "row",
    "rows",
    "rowPtr",
    "colIdx",
    "CSR",
    "arc",
    "arcs",
    "Float32Array",
    "Int32Array",
    "Uint32Array",
    "mask",
    "NodeMask",
    "EdgeMask",
    "yieldNow",
    "forEachChunked",
    "chunk",
    "costClass",
    "costUnits",
    "complexity",
    "plainName",
    "technicalName",
    "namespace",
    "descriptor",
    "fields",
    "caveats",
    "declaredCaveats",
    "GraphtyError",
    "idOf",
    "edgeId",
    "DeclaredAlgorithm",
];

/**
 * An example as the guide shows it: the file below its header comment, importing from the
 * published entry point.
 * @param name - The file name.
 * @returns The code.
 */
function shown(name: string): string {
    const text = readFileSync(join(EXAMPLES_DIR, name), "utf8");
    const afterHeader = text.slice(text.indexOf("*/\n") + 3);
    return afterHeader.replaceAll('"../../../extend"', '"@graphty/graphty-element/extend"').trim();
}

/**
 * Every TypeScript block of a Markdown text, in order.
 * @param markdown - The text.
 * @returns The blocks' contents.
 */
function tsBlocks(markdown: string): string[] {
    return [...markdown.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => match[1].trim());
}

/**
 * Author lines: not blank, not a comment, not an import.
 * @param code - The code.
 * @returns How many.
 */
function authorLines(code: string): number {
    return code.split("\n").filter((line) => {
        const trimmed = line.trim();
        return trimmed !== "" && !trimmed.startsWith("//") && !trimmed.startsWith("import ");
    }).length;
}

/**
 * The error a call throws, asserted to be a GraphtyError.
 * @param call - The call.
 * @returns The error.
 */
function thrown(call: () => unknown): GraphtyError {
    try {
        call();
    } catch (error) {
        assert.isTrue(isGraphtyError(error), `a GraphtyError, not ${String(error)}`);
        return error as GraphtyError;
    }

    return assert.fail("the call did not throw");
}

describe("the algorithm guide and its examples", () => {
    const simpleTier = GUIDE.slice(0, GUIDE.indexOf(ADVANCED_HEADING));

    it("names the release that ships the simple tier on its first line", () => {
        assert.strictEqual(
            GUIDE.split("\n")
                .slice(1)
                .find((line) => line.trim() !== ""),
            "Available from graphty-element 2.7.",
        );
    });

    it("leads with the simple tier and labels the rest advanced", () => {
        assert.isAbove(GUIDE.indexOf(ADVANCED_HEADING), 0, "the advanced material is under its own heading");
        assert.strictEqual(tsBlocks(GUIDE)[0], shown("confidence-degree.ts"), "the first example is the first plugin");
        assert.notInclude(simpleTier, "DeclaredAlgorithm", "the simple part never names the advanced class");
    });

    it("shows every example file exactly as the browser tests run it", () => {
        const blocks = tsBlocks(simpleTier);
        assert.isNotEmpty(EXAMPLE_FILES);
        for (const name of EXAMPLE_FILES) {
            assert.include(blocks, shown(name), `${name} appears in the guide as it is in the file`);
        }

        for (const block of blocks.filter((code) => code.includes("defineAlgorithm("))) {
            assert.include(
                EXAMPLE_FILES.map(shown),
                block,
                `every defineAlgorithm example in the guide is a tested file:\n${block}`,
            );
        }
    });

    it("shows the first plugin's use-it lines as the browser tests run them", () => {
        assert.include(tsBlocks(simpleTier), FIRST_PLUGIN_USE.join("\n"));
    });

    it("keeps the first plugin, end to end, within the adoption budget", () => {
        const total =
            authorLines(shown("confidence-degree.ts")) +
            authorLines(shown("confidence-share.ts")) +
            FIRST_PLUGIN_USE.length;
        assert.isAtMost(total, 20, `the first plugin takes ${String(total)} author lines`);
    });

    it("keeps every example within 20 author lines", () => {
        for (const name of EXAMPLE_FILES) {
            assert.isAtMost(authorLines(shown(name)), 20, name);
        }
    });

    it("names no internal concept in any example", () => {
        for (const name of EXAMPLE_FILES) {
            const code = shown(name);
            const named = INTERNAL_TERMS.filter((term) => new RegExp(`\\b${term}\\b`, "i").test(code));
            assert.deepEqual(named, [], `${name} names ${named.join(", ")}`);
        }
    });

    it("no longer teaches the corrected mistakes", () => {
        assert.notInclude(GUIDE, "edgeIdsByPair", "the endpoint-pair helper cannot name a parallel edge");
        assert.notMatch(GUIDE, /this\.algorithmGraph\(\s*"undirected"\s*\);/, "input is read through context.input");
        assert.notInclude(GUIDE, ".length * hops", "a neighbour count times the hops is not the nodes within reach");
    });
});

describe("defineAlgorithm refuses a malformed definition at once", () => {
    it("refuses a definition with no function to compute", () => {
        const error = thrown(() => defineAlgorithm({ id: "acme-nothing" } as never));

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.match(error.message, /^defineAlgorithm\("acme-nothing"\): /);
        for (const member of ["node", "edge", "nodes", "groups"]) {
            assert.include(error.message, `"${member}"`, `the message names "${member}"`);
        }
    });

    it("refuses a definition with two functions", () => {
        const error = thrown(() => defineAlgorithm({ id: "acme-both", node: () => 1, edge: () => 1 } as never));

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.match(error.message, /^defineAlgorithm\("acme-both"\): .*exactly one/);
        assert.include(error.message, '"node"');
        assert.include(error.message, '"edge"');
    });

    it("refuses a member that is not a function", () => {
        const error = thrown(() => defineAlgorithm({ id: "acme-three", node: 3 } as never));

        assert.strictEqual(
            error.message,
            'defineAlgorithm("acme-three"): "node" must be a function; got the number 3.',
        );
        assert.strictEqual(error.details.field, "node");
    });

    it("refuses an id that cannot be saved", () => {
        const error = thrown(() => defineAlgorithm({ id: "Acme Degree", node: () => 1 }));

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.details.field, "id");
    });

    it("refuses a direction it does not know", () => {
        const error = thrown(() => defineAlgorithm({ id: "acme-way", direction: "sideways", node: () => 1 } as never));

        assert.strictEqual(
            error.message,
            'defineAlgorithm("acme-way"): "direction" must be one of "undirected", "directed"; got the string "sideways".',
        );
    });

    it("refuses a malformed option", () => {
        const error = thrown(() =>
            defineAlgorithm({ id: "acme-opt", options: { hops: { type: "hop" } }, node: () => 1 } as never),
        );

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.details.field, "options.hops.type");
    });

    it("refuses passes that name no declared integer option", () => {
        const missing = thrown(() =>
            defineAlgorithm({ id: "acme-passes", passes: "rounds", nodes: () => new Map() } as never),
        );
        assert.strictEqual(missing.code, "E_BAD_COMMAND");
        assert.strictEqual(missing.details.field, "passes");
        assert.include(missing.message, '"rounds"');

        const notInteger = thrown(() =>
            defineAlgorithm({
                id: "acme-passes-text",
                options: { rounds: "many" },
                passes: "rounds",
                nodes: () => new Map(),
            } as never),
        );
        assert.strictEqual(notInteger.details.field, "passes");
    });

    it("refuses weights that name no declared edge attribute option", () => {
        const error = thrown(() =>
            defineAlgorithm({
                id: "acme-weights",
                weights: { option: "weight", meaning: "strength" },
                node: () => 1,
            } as never),
        );

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.details.field, "weights.option");
    });
});
