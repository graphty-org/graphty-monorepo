/**
 * @file Every file the "forced-batched" project runs either tests batched rows or says why not.
 *
 * "forced-batched" reruns the browser and interaction suites with `renderPath: "batched"` as the
 * default. On batched a node is a row in a table with no Babylon.js mesh, until something asks for
 * its object: reading `node.mesh`, `graph.getNode`, `getEdges` or `edges.values()` builds `Node` and
 * `Edge` objects (a whole connected component at a time) and can take a row off the batch for good.
 * A test that does that before its action exercises the objects code while it is counted as a
 * batched test, and a batched regression in hover, drag or selection ships green.
 *
 * So a file that reaches for objects must do one of these:
 * - assert `rowCounts.batchedNodes`, which proves its rows are still drawn by a batch;
 * - be left out of the project in test/forced-batched/skipped.json, with a reason;
 * - be listed in test/forced-batched/builds-objects.json, the files that built objects before this
 *   check existed. That list only shrinks: a new file cannot join it, and an entry whose file no
 *   longer builds objects (or now asserts the row count) fails until it is taken off.
 *
 * A static check over the file text, so it runs in the default project in a second; it reads the
 * same include lists as vitest.config.ts.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function json(file: string): unknown {
    return JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
}

const include = [...(json("test/browser-include.json") as string[]), "test/interactions/**/*.test.ts"];
const skipped = json("test/forced-batched/skipped.json") as { file: string; reason: string }[];
const legacy = json("test/forced-batched/builds-objects.json") as string[];
/** Every file under test/, relative to the package with forward slashes. */
const testFiles = readdirSync(path.join(ROOT, "test"), { recursive: true, encoding: "utf8" }).map(
    (file) => `test/${file.split(path.sep).join("/")}`,
);

/**
 * Whether a file matches one include pattern. The lists hold only exact paths and `dir/** /*suffix`.
 * @param file - Relative to the package.
 * @param pattern - An include pattern.
 * @returns True on a match.
 */
function matches(file: string, pattern: string): boolean {
    const [prefix, suffix] = pattern.split("**/*");
    return suffix === undefined ? file === pattern : file.startsWith(prefix) && file.endsWith(suffix);
}

/** What builds `Node` or `Edge` objects on a batched graph. */
const BUILDS_OBJECTS = /\.mesh\b|\.getNode\(|\.getEdges\(|edges\.values\(\)/u;
/** What proves a file's rows are still batched. */
const ASSERTS_BATCHED = /\bbatchedNodes\b/u;

function filesRun(): string[] {
    const skip = new Set(skipped.map(({ file }) => file));
    const files = new Set<string>();
    for (const file of testFiles) {
        if (include.some((pattern) => matches(file, pattern)) && !file.endsWith(".bench.test.ts") && !skip.has(file)) {
            files.add(file);
        }
    }

    return [...files].sort();
}

/**
 * Whether a file reaches for objects without proving its rows are batched.
 * @param file - Relative to the package.
 * @returns True when the file builds objects and never asserts a batched row count.
 */
function buildsObjectsUnchecked(file: string): boolean {
    const text = readFileSync(path.join(ROOT, file), "utf8");
    return BUILDS_OBJECTS.test(text) && !ASSERTS_BATCHED.test(text);
}

describe("forced-batched tests batched rows", () => {
    it("runs files", () => {
        assert.isAbove(filesRun().length, 600, "the include lists resolve to the browser and interaction suites");
    });

    it("every skipped file exists and says why", () => {
        for (const { file, reason } of skipped) {
            assert.isTrue(existsSync(path.join(ROOT, file)), `${file} in skipped.json exists`);
            assert.isAbove(reason.trim().length, 10, `${file} in skipped.json gives a reason`);
        }
    });

    it("no file builds objects without asserting batched rows, unless it is listed", () => {
        const listed = new Set(legacy);
        const unlisted = filesRun().filter((file) => buildsObjectsUnchecked(file) && !listed.has(file));
        assert.deepEqual(
            unlisted,
            [],
            "these files build Node or Edge objects under forced-batched: assert rowCounts.batchedNodes, " +
                "or add them to test/forced-batched/skipped.json with a reason",
        );
    });

    it("builds-objects.json lists only files that still build objects unchecked", () => {
        const running = new Set(filesRun());
        const stale = legacy.filter((file) => !running.has(file) || !buildsObjectsUnchecked(file));
        assert.deepEqual(stale, [], "take these off test/forced-batched/builds-objects.json");
    });
});
