/**
 * @file `style:batch-changed`: one event per repaint, after every `style:changed` it told. A
 * grouping run adds a layer per group and one pass tells all of them; a consumer re-reading the
 * legend on each `style:changed` read it 51 times for one Louvain run.
 */

import { assert, describe, it } from "vitest";

import type { LayerId, NodeId } from "../../../src/catalog/types";
import type { StyleBatchChange } from "../../../src/session/styles";
import type { GraphSession } from "../../../src/session/types";
import { makeSession } from "../helpers";

const EDITS = 51;

/**
 * A session of {@link EDITS} nodes, recording both style events in the order they arrive.
 * @returns The session and what it told.
 */
function watched(): { session: GraphSession; told: (number | StyleBatchChange)[]; batches: () => StyleBatchChange[] } {
    const harness = makeSession();
    harness.add(Array.from({ length: EDITS }, (_, at) => ({ id: `n${String(at)}` })));
    const { session } = harness;
    // A number is a `style:changed` (its layer count); an object is a batch.
    const told: (number | StyleBatchChange)[] = [];
    session.on("style:changed", (change) => told.push(change.layers.length));
    session.on("style:batch-changed", (batch) => told.push(batch));
    const batches = (): StyleBatchChange[] => told.filter((each): each is StyleBatchChange => typeof each !== "number");
    return { session, told, batches };
}

/**
 * A layer coloring one node.
 * @param at - The node.
 * @returns The spec.
 */
function group(at: number): Parameters<GraphSession["styles"]["add"]>[0] {
    return {
        name: `Group ${String(at)}`,
        target: "node",
        selector: { match: "ids", nodes: [`n${String(at)}` as NodeId] },
        set: { "node.color": "#d55e00" },
    };
}

describe("style:batch-changed", () => {
    it("closes a pass of 51 edits with one event, after the last of them", async () => {
        const { session, told, batches } = watched();

        const added = await Promise.all(Array.from({ length: EDITS }, (_, at) => session.styles.add(group(at))));
        await session.styles.settled();

        const changes = told.filter((each) => typeof each === "number").length;
        assert.strictEqual(changes, EDITS, "every edit is still told by style:changed");
        assert.lengthOf(batches(), 1, "and the pass is closed once");
        assert.notStrictEqual(typeof told.at(-1), "number", "after the last style:changed");
        const [batch] = batches();
        assert.strictEqual(batch?.edits, EDITS);
        assert.strictEqual(batch?.cause, "command");
        assert.sameMembers(
            [...(batch?.layers ?? [])],
            added.map((layer): LayerId => layer.id),
        );
    });

    it("closes a single edit with one event", async () => {
        const { session, told, batches } = watched();

        const layer = await session.styles.add(group(0));
        await session.styles.settled();

        assert.deepEqual(told, [1, { edits: 1, layers: [layer.id], cause: "command" }]);
        assert.lengthOf(batches(), 1);
    });

    it("closes an undo of several steps with one event", async () => {
        const { session, told, batches } = watched();
        await session.styles.add(group(0));
        await session.styles.add(group(1));
        await session.styles.settled();
        told.length = 0;

        await session.history.restoreTo(null);
        await session.styles.settled();
        await Promise.resolve();

        assert.strictEqual(told.filter((each) => typeof each === "number").length, 2, "one style:changed per step");
        assert.lengthOf(batches(), 1);
        assert.strictEqual(batches()[0]?.edits, 2);
        assert.strictEqual(batches()[0]?.cause, "restore");
    });
});
