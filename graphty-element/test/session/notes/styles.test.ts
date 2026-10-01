/**
 * @file Notes in styles (design/notes/notes-design.md section 6): the reserved `graphty.` path
 * root, `graphty.notes.count`, `graphty.notes.latest` and `graphty.notes.latestTime` in selectors,
 * bindings and `select({ where })`, the repaint a note write owes, `styles.validate`, and the
 * `notes-path` refusal everywhere a path decides what a result, a set or the filter holds.
 */

import { assert, describe, it } from "vitest";

import type { NodeId } from "../../../src/catalog/types";
import type { ElementSession } from "../../../src/session/types";
import { edgeBetween, type Harness, makeSession } from "../helpers";
import { notesHarness, refusalOf } from "./harness";

const RED = "#ff0000";

/**
 * The session of a harness, typed as the element's own, which carries `paint`.
 * @param h - The harness.
 * @returns The session.
 */
function sessionOf(h: Harness): ElementSession {
    return h.session as ElementSession;
}

/**
 * The nodes painted red.
 * @param h - The harness.
 * @returns Their ids, as text, sorted.
 */
function red(h: Harness): string[] {
    const session = sessionOf(h);
    const snapshot = session.snapshot();
    const found: string[] = [];
    for (let row = 0; row < snapshot.nodeCount; row++) {
        if (session.paint.styleOf("node", row)["node.color"]?.hex === RED) {
            found.push(String(snapshot.ids.idOf(row)));
        }
    }

    return found.sort();
}

/**
 * One node's painted label text.
 * @param h - The harness.
 * @param id - The node.
 * @returns The label, or undefined.
 */
function labelOf(h: Harness, id: NodeId): unknown {
    const session = sessionOf(h);
    return session.paint.styleOf("node", session.snapshot().ids.indexOf(id))["node.label"];
}

/**
 * Count the passes that finish from now on, and what the last of them painted.
 * @param h - The harness.
 * @returns The count and the nodes the last pass painted.
 */
function passes(h: Harness): { count: number; nodes: string[] } {
    const session = sessionOf(h);
    const seen = { count: 0, nodes: [] as string[] };
    session.paint.onPainted(() => {
        seen.count++;
        const snapshot = session.snapshot();
        seen.nodes = Array.from(session.paint.lastPainted("node"), (row) => String(snapshot.ids.idOf(row))).sort();
    });
    return seen;
}

describe("graphty.notes.* in styles", () => {
    it("a has selector on graphty.notes.count paints exactly the noted nodes, and follows writes and undo", async () => {
        const h = notesHarness();
        const { session } = h;
        session.notes.add({ text: "x", targets: [{ node: "a" }, { node: "11" }] });
        await session.styles.add({
            name: "Noted",
            target: "node",
            selector: { match: "has", path: "graphty.notes.count" },
            set: { "node.color": RED },
        });
        await session.styles.settled();
        assert.deepEqual(red(h), ["11", "a"], "both targets, 11 named by its text");

        const later = session.notes.add({ text: "y", targets: [{ node: "c" }] });
        await session.styles.settled();
        assert.deepEqual(red(h), ["11", "a", "c"], "a note added later repaints");

        session.notes.remove(later);
        await session.styles.settled();
        assert.deepEqual(red(h), ["11", "a"], "a removed note takes its paint away");

        await session.undo();
        await session.styles.settled();
        assert.deepEqual(red(h), ["11", "a", "c"], "undo repaints back");
    });

    it("a binding reads the count, the newest text and the newest time; the expression form works too", async () => {
        const h = notesHarness();
        const { session } = h;
        const first = session.notes.add({ text: "first", targets: [{ node: "a" }] });
        const second = session.notes.add({ text: "second", targets: [{ node: "a" }, { node: "b" }] });
        await session.styles.add({
            name: "Count",
            target: "node",
            selector: { match: "expression", where: "graphty.notes.count > `0`" },
            encode: { "node.label": { by: "graphty.notes.count" } },
        });
        await session.styles.settled();
        assert.strictEqual(String(labelOf(h, "a")), "2");
        assert.strictEqual(String(labelOf(h, "b")), "1");
        assert.isUndefined(labelOf(h, "c"), "a node without notes keeps no label");

        await session.styles.add({
            name: "Latest",
            target: "node",
            selector: { match: "has", path: "graphty.notes.latest" },
            encode: { "node.label": { by: "graphty.notes.latest" } },
        });
        await session.styles.settled();
        assert.strictEqual(labelOf(h, "a"), "second");

        session.notes.update(first, { text: "first, edited" });
        await session.styles.settled();
        assert.strictEqual(labelOf(h, "a"), "second", "an edit does not make a note newer");

        await session.styles.add({
            name: "When",
            target: "node",
            selector: { match: "has", path: "graphty.notes.latestTime" },
            encode: { "node.label": { by: "graphty.notes.latestTime" } },
        });
        await session.styles.settled();
        assert.strictEqual(labelOf(h, "b"), session.notes.get(second)?.time);
    });

    it("counts an edge note on its edge, and a note about a set on nothing", async () => {
        const h = notesHarness();
        const { session } = h;
        const set = session.sets.create({ kind: "fixed", nodes: ["c"], reading: "induced" });
        session.notes.add({ text: "e", targets: [{ edge: edgeBetween(h, "a", "b") }, { set }] });
        await session.styles.add({
            name: "Noted edges",
            target: "edge",
            selector: { match: "has", path: "graphty.notes.count" },
            set: { "edge.color": RED },
        });
        await session.styles.add({
            name: "Noted nodes",
            target: "node",
            selector: { match: "has", path: "graphty.notes.count" },
            set: { "node.color": RED },
        });
        await session.styles.settled();

        const { paint } = sessionOf(h);
        const space = session.snapshot();
        const painted: number[] = [];
        for (let row = 0; row < space.edgeCount; row++) {
            if (paint.styleOf("edge", row)["edge.color"]?.hex === RED) {
                painted.push(row);
            }
        }

        assert.strictEqual(painted.length, 1);
        assert.deepEqual(red(h), [], "the set's member c is not counted");
    });

    it("a note write repaints only when a layer reads graphty.notes.*, and then the affected elements", async () => {
        const h = notesHarness();
        const { session } = h;
        await session.styles.add({
            name: "Everything",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        await session.styles.settled();
        const seen = passes(h);

        session.notes.add({ text: "x", targets: [{ node: "a" }] });
        await session.styles.settled();
        assert.strictEqual(seen.count, 0, "no layer reads a note path");

        await session.styles.add({
            name: "Noted",
            target: "node",
            selector: { match: "has", path: "graphty.notes.count" },
            set: { "node.color": RED },
        });
        await session.styles.settled();
        seen.count = 0;

        session.notes.add({ text: "y", targets: [{ node: "b" }] });
        await session.styles.settled();
        assert.isAbove(seen.count, 0);
        assert.deepEqual(seen.nodes, ["a", "b"], "the reader's matches and the newly noted node, never c or 11");
        assert.deepEqual(red(h), ["a", "b"]);
    });
});

describe("the graphty. path root", () => {
    it("note-23: a bare graphty. path reads the element's value, data.graphty. the column, and validate says so", async () => {
        const h = makeSession({ directed: true });
        h.add([{ id: "a" }, { id: "b", "graphty.notes.count": 5 }]);
        const { session } = h;
        session.notes.add({ text: "x", targets: [{ node: "a" }] });

        const bare = {
            name: "Bare",
            target: "node" as const,
            selector: { match: "has" as const, path: "graphty.notes.count" },
            set: { "node.color": RED },
        };
        const result = session.styles.validate(bare);
        assert.isTrue(result.ok);
        assert.deepEqual(result.shadowedPaths, ["graphty.notes.count"]);
        assert.deepEqual(result.unresolvedPaths, []);

        await session.styles.add(bare);
        await session.styles.settled();
        assert.deepEqual(red(h), ["a"], "the note count, not the column");

        await session.styles.add({
            name: "Column",
            target: "node",
            selector: { match: "has", path: "data.graphty.notes.count" },
            encode: { "node.label": { by: "data.graphty.notes.count" } },
        });
        await session.styles.settled();
        assert.strictEqual(String(labelOf(h, "b")), "5");
        assert.deepEqual(
            session.styles.validate({ ...bare, selector: { match: "has", path: "data.graphty.notes.count" } })
                .shadowedPaths,
            [],
        );
    });

    it("note-23b: a graphty. path this release does not know has no value and is reported unbound", async () => {
        const h = notesHarness();
        const { session } = h;
        session.notes.add({ text: "x", targets: [{ node: "a" }] });
        const spec = {
            name: "Unknown",
            target: "node" as const,
            selector: { match: "everything" as const },
            encode: { "node.label": { by: "graphty.unknownThing" } },
        };
        assert.deepEqual(session.styles.validate(spec).unresolvedPaths, ["graphty.unknownThing"]);

        const report = await session.styles.applyTemplate({ version: 1, layers: [spec] } as never);
        assert.strictEqual(report.unbound.length, 1);
        await session.styles.settled();
        assert.isUndefined(labelOf(h, "a"), "nothing painted");
    });

    it("a note path is never unresolved, even before any note exists", () => {
        const { session } = notesHarness();
        const result = session.styles.validate({
            name: "Later",
            target: "node",
            selector: { match: "has", path: "graphty.notes.count" },
            encode: { "node.label": { by: "graphty.notes.latest" } },
        });
        assert.deepEqual(result.unresolvedPaths, []);
    });
});

describe("graphty.notes.* outside styles", () => {
    it("select({ where }) reads the note values", async () => {
        const h = notesHarness();
        const { session } = h;
        session.notes.add({ text: "x", targets: [{ node: "a" }, { node: "b" }] });
        session.notes.add({ text: "y", targets: [{ node: "a" }] });

        const delta = await session.selection.apply({ where: "graphty.notes.count > `1`" });
        assert.deepEqual(session.selection.nodes, ["a"]);
        assert.deepEqual(delta.unresolvedPaths ?? [], []);
    });

    it("note-24: the filter, a run scope, a scope and a set rule refuse a note path", async () => {
        const h = notesHarness();
        const { session } = h;
        const where = "graphty.notes.count > `0`";
        const refusals = [
            refusalOf(() => session.visibility.set({ kind: "expression", where })),
            refusalOf(() => session.visibility.set({ kind: "range", attribute: "graphty.notes.count", min: 1 })),
            refusalOf(() => session.runs.start("degree", {}, { scope: { where }, style: false })),
            refusalOf(() =>
                session.sets.create({ kind: "rule", where: { kind: "expression", where }, reading: "induced" }),
            ),
        ];

        for (const refusal of refusals) {
            assert.deepInclude(refusal ?? {}, { code: "E_BAD_SELECTOR" });
            assert.strictEqual(refusal?.details.reason, "notes-path");
        }

        await session.styles.settled();
        assert.strictEqual(session.visibility.filter, null, "nothing changed");
    });
});
