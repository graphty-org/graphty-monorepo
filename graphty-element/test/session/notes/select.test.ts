/**
 * @file Selecting what a note is about, `select({ note, target? })`, and sets that know the
 * notes naming them, `sets.usedBy` (design/notes/notes-design.md sections 5.6 and 5.7).
 */

import { assert, describe, it } from "vitest";

import type { ItemKey, NodeId } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import type { SelectionDelta } from "../../../src/session/selection";
import { edgeBetween, type Harness, makeSession } from "../helpers";
import { builtInRuns } from "../sets/algorithms";
import { notesHarness, type Refusal } from "./harness";

/**
 * What a selection call refused with.
 * @param call - The call.
 * @returns The code and details, or null when it did not refuse.
 */
async function refusalOf(call: () => Promise<unknown>): Promise<Refusal | null> {
    try {
        await call();
    } catch (error) {
        if (!isGraphtyError(error)) {
            throw error;
        }

        return { code: error.code, details: (error.details ?? {}) as Record<string, unknown> };
    }

    return null;
}

/**
 * Nodes `a -> b -> c` and `x -> y`, so a components run finds two groups, with real runs.
 * @returns The harness.
 */
function twoPieces(): Harness {
    let harness: Harness | null = null;
    const h = makeSession({ directed: true, runs: { execute: builtInRuns(() => harness as Harness) } });
    harness = h;
    h.add(
        [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "x" }, { id: "y" }],
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "x", dst: "y" },
        ],
    );

    return h;
}

/**
 * The key of the components group holding a node.
 * @param h - The harness.
 * @param node - The node.
 * @returns The item key.
 */
async function groupOf(h: Harness, node: NodeId): Promise<ItemKey> {
    const { items } = await h.session.sets.containing({ node });
    const found = items.find((entry) => entry.item.result === "pieces");
    assert.isDefined(found);

    return (found as { item: { key: ItemKey } }).item.key;
}

/**
 * What a selection holds now, sorted, nodes and edges apart.
 * @param h - The harness.
 * @returns The ids.
 */
function held(h: Harness): { nodes: string[]; edges: string[] } {
    return {
        nodes: h.session.selection.nodes.map((id) => String(id)).sort(),
        edges: [...h.session.selection.edges].sort(),
    };
}

describe("select({ note })", () => {
    it("selects a note's node, edge, set and item targets, and counts a missing one as skipped", async () => {
        const h = twoPieces();
        const { session } = h;
        await session.runs.start("components", {}, { as: "pieces", scope: "graph", style: false });
        const set = session.sets.create({ kind: "fixed", nodes: ["c"], reading: "induced" });
        const id = session.notes.add({
            text: "x",
            targets: [
                { node: "a" },
                { edge: edgeBetween(h, "a", "b") },
                { set },
                { item: { result: "pieces", key: await groupOf(h, "x") } },
                { node: "gone" },
                { graph: true },
                { result: "pieces" },
            ],
        });

        const delta: SelectionDelta = await session.selection.apply({ note: id });

        // The component holding x is both its nodes and the edge between them.
        assert.deepEqual(held(h), {
            nodes: ["a", "c", "x", "y"],
            edges: [edgeBetween(h, "a", "b"), edgeBetween(h, "x", "y")].sort(),
        });
        assert.strictEqual(delta.skipped, 1, "only the missing node; the graph and a result name no elements");
    });

    it("selects one target by its position, and refuses a position the note does not have", async () => {
        const h = notesHarness();
        const { session } = h;
        const id = session.notes.add({ text: "x", targets: [{ node: "b" }, { node: "c" }] });

        const delta = await session.selection.apply({ note: id, target: 1 });
        assert.deepEqual(held(h).nodes, ["c"]);
        assert.strictEqual(delta.skipped, 0);

        for (const target of [2, -1, 0.5]) {
            assert.strictEqual(
                (await refusalOf(() => session.selection.apply({ note: id, target })))?.code,
                "E_OPTION_RANGE",
            );
        }
    });

    it("selects a filtered target, which is in the graph, and skips a removed set", async () => {
        const h = notesHarness();
        const { session } = h;
        const set = session.sets.create({ kind: "fixed", nodes: ["b"], reading: "induced" });
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }, { set }] });
        await session.visibility.set({ kind: "degree", min: 2 });
        session.sets.remove(set);

        const delta = await session.selection.apply({ note: id });
        assert.deepEqual(held(h).nodes, ["a"]);
        assert.strictEqual(delta.skipped, 1);
    });

    it("selects an item from an earlier run as the run left it", async () => {
        const h = twoPieces();
        const { session } = h;
        await session.runs.start("components", {}, { as: "pieces", scope: "graph", style: false });
        const id = session.notes.add({
            text: "x",
            targets: [{ item: { result: "pieces", key: await groupOf(h, "x") } }],
        });

        // The re-run sees z join x and y, but the note is about the group as it was.
        h.add([{ id: "z" }], [{ src: "y", dst: "z" }]);
        await session.runs.get("pieces")?.rerun();
        assert.strictEqual(session.notes.status(id).targets[0].state, "earlier-run");

        const delta = await session.selection.apply({ note: id });
        assert.deepEqual(held(h).nodes, ["x", "y"]);
        assert.strictEqual(delta.skipped, 0);
    });

    it("refuses a note id it does not hold, and leaves other targets without skipped", async () => {
        const { session } = notesHarness();
        const refusal = await refusalOf(() => session.selection.apply({ note: "note_nope" }));
        assert.strictEqual(refusal?.code, "E_BAD_COMMAND");
        assert.strictEqual(refusal?.details.reason, "unknown-id");
        assert.notProperty(await session.selection.apply({ nodes: ["a"] }), "skipped");
    });
});

describe("sets.usedBy and notes", () => {
    it("lists a note naming a set by its first line, cut to 80 characters, until the note is removed", () => {
        const { session } = notesHarness();
        const set = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" });
        const long = `${"y".repeat(100)}\nsecond line`;
        const id = session.notes.add({ text: long, targets: [{ set }, { node: "a" }] });
        session.notes.add({ text: "about a node", targets: [{ node: "a" }] });

        assert.deepEqual(session.sets.usedBy(set), [{ kind: "note", id, label: "y".repeat(80) }]);

        session.notes.remove(id);
        assert.deepEqual(session.sets.usedBy(set), []);
    });

    it("keeps a removed set's record while a note names it, so it can be restored", () => {
        const { session } = notesHarness();
        const set = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Core" });
        const id = session.notes.add({ text: "x", targets: [{ set }] });
        session.sets.remove(set);
        assert.strictEqual(session.notes.status(id).targets[0].state, "missing");

        session.sets.restore(set);
        assert.deepEqual(session.notes.status(id).targets[0], { state: "present", label: "Core" });
    });
});
