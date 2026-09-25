/**
 * The session's query engine, reached through every surface that accepts an expression or text.
 *
 * A session used to refuse every `{ where }` and `{ text }` with E_UNSUPPORTED because nothing
 * built an engine for it. These tests hold it to the promise that replaced the refusal: one
 * engine, shared with the style layers, so the same text matches the same elements everywhere.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { compileSelector } from "../../src/session/styles/selector";
import { createSelectorSource } from "../../src/session/styles/sources";
import { edgeBetween, type Harness, makeSession } from "./helpers";

/** Three hosts, two services, four edges in a line. */
function harnessOf(): Harness {
    const harness = makeSession();
    harness.add(
        [
            { id: "a", type: "host", label: "Alpha" },
            { id: "b", type: "host", label: "Beta" },
            { id: "c", type: "host", label: "Gamma" },
            { id: "d", type: "service", label: "Delta" },
            { id: "e", type: "service", label: "Epsilon" },
        ],
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
            { src: "d", dst: "e" },
        ],
    );

    return harness;
}

/**
 * The code a call refused with, whether it threw or rejected, or null when it did not refuse.
 * @param call - The call.
 * @returns The code.
 */
async function codeOf(call: () => Promise<unknown>): Promise<string | null> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

describe("a { where } predicate on a session", () => {
    it("resolves as a scope, and counts what it matches", async () => {
        const harness = harnessOf();
        const resolved = await harness.session.scope.resolve({ where: "data.type == 'host'" });

        assert.deepStrictEqual([...resolved.nodes].sort(), ["a", "b", "c"]);
        assert.strictEqual(resolved.edgeCount, 2, "the edges among the hosts are induced");
        assert.strictEqual((await harness.session.scope.count({ where: "data.type == 'service'" })).nodes, 2);
        harness.session.dispose();
    });

    it("selects nodes and edges, and reports a path nothing answers", async () => {
        const harness = harnessOf();
        const { selection } = harness.session;

        const delta = await selection.apply({ where: "data.type == 'service'" });

        assert.deepStrictEqual([...selection.nodes].sort(), ["d", "e"]);
        assert.deepStrictEqual(delta.unresolvedPaths, []);

        await selection.apply({ where: "data.source == 'b'" });

        assert.deepStrictEqual([...selection.edges], [edgeBetween(harness, "b", "c")], "an edge predicate selects edges");

        const missing = await selection.apply({ where: "data.nope == 'x'" });

        assert.strictEqual(selection.size, 0);
        assert.deepStrictEqual(missing.unresolvedPaths, ["data.nope"], "an empty answer says why it is empty");
        harness.session.dispose();
    });

    it("matches exactly what a style layer selector with the same text matches", async () => {
        const harness = harnessOf();
        const where = "data.type == 'host' && data.label != 'Beta'";
        const source = createSelectorSource({
            snapshot: () => harness.session.snapshot(),
            records: {
                nodeAttributes: (index) => harness.nodeAttributes.get(index),
                edgeAttributes: (index) => harness.edgeAttributes.get(index),
            },
        });
        const layer = compileSelector({ match: "expression", where }, "node", source);
        const painted = [0, 1, 2, 3, 4].filter((index) => layer.test?.(index)).map((index) => source.nodeIdOf(index));

        await harness.session.selection.apply({ where });

        assert.deepStrictEqual([...harness.session.selection.nodes], painted);
        assert.deepStrictEqual(painted, ["a", "c"]);
        harness.session.dispose();
    });

    it("hides through an expression filter and an edge filter", async () => {
        const harness = harnessOf();

        const nodes = await harness.session.visibility.set({ kind: "expression", where: "data.type == 'host'" });
        assert.deepStrictEqual(nodes.visible, { nodes: 3, edges: 2 });

        const edges = await harness.session.visibility.set({ kind: "edges", where: "data.target == 'd'" });
        assert.deepStrictEqual(edges.visible, { nodes: 5, edges: 1 });
        harness.session.dispose();
    });

    it("narrows to a scope when the target names one", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set({ kind: "categories", attribute: "data.type", values: ["service"] });

        await harness.session.selection.apply({ where: "data.label != 'Delta'", scope: "visible" });

        assert.deepStrictEqual([...harness.session.selection.nodes], ["e"]);
        harness.session.dispose();
    });
});

describe("a { text } search on a session", () => {
    it("finds a substring of an id or an attribute value, ignoring case", async () => {
        const harness = harnessOf();
        const { selection } = harness.session;

        await selection.apply({ text: "ta" });

        assert.deepStrictEqual([...selection.nodes].sort(), ["b", "d"], "Beta and Delta");
        harness.session.dispose();
    });

    it("reads the exact:, regex:, id: and attribute prefixes", async () => {
        const harness = harnessOf();
        const { selection } = harness.session;

        await selection.apply({ text: "exact:alpha" });
        assert.deepStrictEqual([...selection.nodes], [], "exact is exact");

        await selection.apply({ text: "exact:Alpha" });
        assert.deepStrictEqual([...selection.nodes], ["a"]);

        await selection.apply({ text: "regex:^[DE]" });
        assert.deepStrictEqual([...selection.nodes].sort(), ["d", "e"]);

        await selection.apply({ text: "id:c" });
        assert.deepStrictEqual([...selection.nodes], ["c"]);

        await selection.apply({ text: "type:Service" });
        assert.deepStrictEqual([...selection.nodes].sort(), ["d", "e"]);
        harness.session.dispose();
    });

    it("reads a leading = as an expression, so one search box offers both", async () => {
        const harness = harnessOf();
        const { selection } = harness.session;

        const delta = await selection.apply({ text: "=data.type == 'service'", scope: "graph" });

        assert.deepStrictEqual([...selection.nodes].sort(), ["d", "e"]);
        assert.deepStrictEqual(delta.unresolvedPaths, []);
        assert.strictEqual(await codeOf(() => selection.apply({ text: "=data.type ==" })), "E_BAD_SELECTOR");
        harness.session.dispose();
    });

    it("searches a prefix that names no attribute as plain text", async () => {
        const harness = harnessOf();

        // No node carries an `http` attribute, so the colon is part of the text searched for.
        harness.add([{ id: "f", type: "link", label: "see http://x/page" }]);
        await harness.session.selection.apply({ text: "http://x" });

        assert.deepStrictEqual([...harness.session.selection.nodes], ["f"]);
        harness.session.dispose();
    });

    it("refuses a regular expression that does not parse", async () => {
        const harness = harnessOf();

        assert.strictEqual(await codeOf(() => harness.session.selection.apply({ text: "regex:(" })), "E_BAD_COMMAND");
        harness.session.dispose();
    });

    it("narrows to the visible nodes when asked", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set({ kind: "categories", attribute: "data.type", values: ["host"] });

        await harness.session.selection.apply({ text: "ta", scope: "visible" });

        assert.deepStrictEqual([...harness.session.selection.nodes], ["b"]);
        harness.session.dispose();
    });
});
