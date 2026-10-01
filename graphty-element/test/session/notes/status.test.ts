/**
 * @file What a note's targets and cites point at now (design/notes/notes-design.md section 4),
 * worked out when read and never stored: present, filtered, missing and earlier-run, with their
 * labels; `counts()`; and the `list` filters, `authors()` and the order notes are listed in.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session/GraphSession";
import type { NoteStatus } from "../../../src/session/notes/types";
import { edgeBetween } from "../helpers";
import { notesHarness } from "./harness";

/**
 * The states and labels of a status's targets.
 * @param status - The status.
 * @returns `[state, label]` per target.
 */
function targets(status: NoteStatus): [string, string][] {
    return status.targets.map((target) => [target.state, target.label]);
}

describe("notes.status", () => {
    it("reads a node present, filtered, missing, and present again once it is loaded", async () => {
        const h = notesHarness();
        const { session } = h;
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }, { node: "zz" }, { node: "11" }] });

        assert.deepEqual(targets(session.notes.status(id)), [
            ["present", "a"],
            ["missing", "zz"],
            ["present", "11"],
        ]);

        await session.visibility.set({ kind: "degree", min: 2 });
        assert.strictEqual(session.notes.status(id).targets[0].state, "filtered");

        // In the graph now, and hidden like every other node of degree below 2.
        h.add([{ id: "zz" }]);
        assert.strictEqual(session.notes.status(id).targets[1].state, "filtered");
        assert.deepEqual(session.notes.status(id).cites, []);
        assert.notProperty(session.notes.status(id), "source");
        assert.isTrue(Object.isFrozen(session.notes.status(id)));
    });

    it("reads an edge by position, and missing once a load gives its pair a different number of edges", async () => {
        const session = createGraphSession();
        const load = async (parallel: number, weight = 1): Promise<void> => {
            const edges = [
                { src: "a", dst: "b" },
                ...Array.from({ length: parallel }, (_, n) => ({ src: "c", dst: 11, weight: weight + n })),
            ];
            const data = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: 11 }], edges });
            await session.execute({ op: "data.import", source: { type: "json", config: { data } }, mode: "replace" });
        };
        await load(2);
        const id = session.notes.add({
            text: "x",
            targets: [
                { edge: { source: "a", target: "b", ordinal: 0, among: 1 } },
                { edge: { source: "c", target: "11", ordinal: 1, among: 2 } },
            ],
        });

        // The graph loads undirected, and the edge's ends compare by text: "11" is node 11.
        assert.deepEqual(targets(session.notes.status(id)), [
            ["present", "a -- b"],
            ["present", "c -- 11"],
        ]);

        await load(3);
        assert.deepEqual(
            session.notes.status(id).targets.map((target) => target.state),
            ["present", "missing"],
            "no edge guessed",
        );

        // Two edges again, but not the two the note was written about: a position names whatever
        // edge now holds it (conformance note-18, the known limit of saving by position).
        await load(2, 10);
        assert.deepEqual(
            session.notes.status(id).targets.map((target) => target.state),
            ["present", "present"],
        );
        session.dispose();
    });

    it("labels an undirected edge with --", () => {
        const h = notesHarness(false);
        const id = h.session.notes.add({ text: "x", targets: [{ edge: edgeBetween(h, "a", "b") }] });
        assert.deepEqual(targets(h.session.notes.status(id)), [["present", "a -- b"]]);
    });

    it("reads a set missing once removed, labeled with its name, and present once the removal is undone", async () => {
        const { session } = notesHarness();
        const set = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Core" });
        const id = session.notes.add({ text: "x", targets: [{ set }, { graph: true }] });

        assert.deepEqual(targets(session.notes.status(id)), [
            ["present", "Core"],
            ["present", "Graph"],
        ]);
        session.sets.remove(set);
        assert.deepEqual(targets(session.notes.status(id))[0], ["missing", "Core"]);
        await session.undo();
        assert.strictEqual(session.notes.status(id).targets[0].state, "present");
    });

    it("follows a result across a re-run, reads its item and cite as an earlier run, and missing once removed", async () => {
        const { session } = notesHarness();
        await session.runs.start("degree", undefined, { as: "deg", style: false });
        const id = session.notes.add({
            text: "x",
            targets: [{ result: "deg" }, { item: { result: "deg", key: { field: "group", value: 3 } } }],
            cites: [{ result: "deg" }],
        });

        let status = session.notes.status(id);
        assert.deepEqual(targets(status), [
            ["present", "deg"],
            ["present", "deg: group 3"],
        ]);
        assert.deepEqual(
            status.cites.map((cite) => [cite.state, cite.label]),
            [["current", "deg"]],
        );

        await session.runs.get("deg")?.rerun();
        status = session.notes.status(id);
        assert.deepEqual(
            status.targets.map((target) => target.state),
            ["present", "earlier-run"],
        );
        assert.strictEqual(status.cites[0].state, "earlier-run");

        session.runs.remove("deg");
        status = session.notes.status(id);
        assert.deepEqual(
            status.targets.map((target) => target.state),
            ["missing", "missing"],
        );
        assert.strictEqual(status.cites[0].state, "missing");
    });

    it('binds a node target to the id of its own type when the graph holds both 11 and "11"', () => {
        const h = notesHarness();
        h.add([{ id: "11" }]);
        const { session } = h;
        session.notes.add({ text: "x", targets: [{ node: 11 }] });
        session.notes.add({ text: "y", targets: [{ node: "11" }] });
        assert.deepEqual(session.notes.counts(), { notes: 2, nodes: 2, edges: 0 });
    });
});

describe("notes.counts, list and authors", () => {
    it("counts notes and the distinct nodes and edges in the graph that have one", () => {
        const h = notesHarness();
        const { session } = h;
        const ab = edgeBetween(h, "a", "b");
        session.notes.add({ text: "1", targets: [{ node: "a" }, { node: "b" }, { node: "zz" }] });
        session.notes.add({ text: "2", targets: [{ node: "a" }, { edge: ab }, { graph: true }] });
        session.notes.add({ text: "3", targets: [{ edge: ab }] });

        assert.deepEqual(session.notes.counts(), { notes: 3, nodes: 2, edges: 1 });
    });

    it("lists newest first, and filters by target, kind, cite, author and missing targets", async () => {
        const h = notesHarness();
        const { session } = h;
        await session.runs.start("degree", undefined, { as: "deg", style: false });
        await session.config.set({ author: "Ada" });
        const first = session.notes.add({ text: "1", targets: [{ node: 11 }], cites: [{ result: "deg" }] });
        await session.config.set({ author: "Bob" });
        const second = session.notes.add({ text: "2", targets: [{ node: "a" }, { edge: edgeBetween(h, "a", "b") }] });
        await session.config.set({ author: "Ada" });
        const third = session.notes.add({ text: "3", targets: [{ node: "zz" }] });
        const ids = (notes: readonly { readonly id: string }[]): string[] => notes.map((note) => note.id);

        assert.deepEqual(ids(session.notes.list()), [third, second, first]);
        assert.deepEqual(ids(session.notes.list({ target: { node: "11" } })), [first], "node ids compare by text");
        assert.deepEqual(ids(session.notes.list({ target: [{ node: "zz" }, { node: 11 }] })), [third, first]);
        assert.deepEqual(ids(session.notes.list({ target: { edge: edgeBetween(h, "a", "b") } })), [second]);
        assert.deepEqual(ids(session.notes.list({ targetKind: "edge" })), [second]);
        assert.deepEqual(ids(session.notes.list({ cites: "deg" })), [first]);
        assert.deepEqual(ids(session.notes.list({ author: "Ada" })), [third, first]);
        assert.deepEqual(ids(session.notes.list({ missing: true })), [third]);
        assert.deepEqual(ids(session.notes.list({ author: "Ada", missing: true })), [third]);
        assert.deepEqual(session.notes.authors(), ["Ada", "Bob"]);
    });
});
