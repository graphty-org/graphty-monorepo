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

/**
 * The "browser" project's include list, read from vitest.config.ts's `BROWSER_FILES` literal.
 * @returns Its patterns.
 */
function browserInclude(): string[] {
    const config = readFileSync(path.join(ROOT, "vitest.config.ts"), "utf8");
    const block = /const BROWSER_FILES = \{\s*include: \[([^\]]*)\]/u.exec(config)?.[1] ?? "";
    return [...block.matchAll(/"([^"]+)"/gu)].map(([, pattern]) => pattern);
}

const include = [...browserInclude(), "test/interactions/**/*.test.ts"];
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

/**
 * What builds `Node` or `Edge` objects on a batched graph: a mesh, the object getters, and the
 * data manager's maps and index arrays, which build every object they hand out.
 */
const BUILDS_OBJECTS =
    /\.mesh\b|\.get(?:Node|Edge)s?\(|\b(?:nodes|edges|nodeCache|edgeCache)\.(?:values|get|forEach|entries)\(|\b(?:nodesByIndex|edgesByIndex)\b/u;

/**
 * The text of a file without its comments, so a mention in prose neither builds objects nor
 * proves anything. A `//` straight after a colon is a URL, not a comment.
 * @param text - A file's source.
 * @returns The source with block and line comments blanked.
 */
function code(text: string): string {
    return text.replaceAll(/\/\*[\s\S]*?\*\//gu, "").replaceAll(/(?<!:)\/\/.*$/gmu, "");
}

/**
 * Whether the code asserts that a batch draws some rows: an `assert` or `expect` call over
 * `batchedNodes` that pins it to a count, not one that only checks a total
 * (`batchedNodes + objectNodes`) or that the batch is empty (`equal(batchedNodes, 0)`).
 * @param source - Comment-free code.
 * @returns True when some assertion proves rows are batched.
 */
function assertsBatched(source: string): boolean {
    for (const { index } of source.matchAll(/\bbatchedNodes\b/gu)) {
        const before = source.slice(0, index);
        const start = Math.max(before.lastIndexOf("assert"), before.lastIndexOf("expect("));
        if (start < 0 || before.slice(start).includes(";")) {
            continue;
        }

        const end = source.indexOf(";", index);
        const call = source.slice(start, end < 0 ? undefined : end);
        if (/batchedNodes\s*[+-]|[+-]\s*[\w.]*batchedNodes/u.test(call)) {
            continue;
        }

        if (/(?:equal|strictEqual)\(\s*[\w.]*batchedNodes\s*,\s*0\s*[,)]/u.test(call)) {
            continue;
        }

        return true;
    }

    return false;
}

/**
 * Whether a file's source reaches for objects without proving its rows are batched.
 * @param text - A file's source.
 * @returns True when the code builds objects and never asserts a batched row count.
 */
function buildsObjectsUncheckedIn(text: string): boolean {
    const source = code(text);
    return BUILDS_OBJECTS.test(source) && !assertsBatched(source);
}

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
    return buildsObjectsUncheckedIn(readFileSync(path.join(ROOT, file), "utf8"));
}

describe("the check reads a file the way it means to", () => {
    const cases: [string, string, boolean][] = [
        ["a mesh read", "const m = node.mesh;", true],
        ["getNodes", "const all = element.getNodes();", true],
        ["getEdge", "graph.getEdge(id);", true],
        ["a data manager map", "graph.dataManager.nodes.get(1);", true],
        ["an index array", "const e = dm.edgesByIndex[0];", true],
        ["a read only in a comment", "// node.mesh is not read here\nconst x = 1;", false],
        ["a pinned batched count", "node.mesh;\nassert.equal(graph.rowCounts.batchedNodes, 9);", false],
        ["a positive batched count", "node.mesh;\nassert.isAbove(counts.batchedNodes, 0, 'some');", false],
        ["a count named only in a comment", "node.mesh;\n// assert rowCounts.batchedNodes", true],
        ["a count read but never asserted", "node.mesh;\nconst { batchedNodes } = element.rowCounts;", true],
        ["only the total", "node.mesh;\nassert.equal(c.batchedNodes + c.objectNodes, 9);", true],
        ["an empty batch", "node.mesh;\nassert.strictEqual(element.rowCounts.batchedNodes, 0);", true],
    ];
    for (const [name, text, unchecked] of cases) {
        it(name, () => {
            assert.equal(buildsObjectsUncheckedIn(text), unchecked);
        });
    }
});

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
            `these files build Node or Edge objects under forced-batched: assert rowCounts.batchedNodes, ` +
                `or add them to test/forced-batched/skipped.json with a reason:\n${unlisted.join("\n")}`,
        );
    });

    it("builds-objects.json lists only files that still build objects unchecked", () => {
        const running = new Set(filesRun());
        const stale = legacy.filter((file) => !running.has(file) || !buildsObjectsUnchecked(file));
        assert.deepEqual(stale, [], `take these off test/forced-batched/builds-objects.json:\n${stale.join("\n")}`);
    });
});
