/**
 * @file Where the nodes are, under undo and redo, on a session with a fake layout.
 *
 * Coordinates are recorded at rest: a rest point seals the lane into the top step, a history call
 * seals it before the cursor moves, and `positions.set` records the rows it wrote. Undo restores
 * the arrangement below a step and redo the arrangement after it, without running the layout.
 * See design/undo/undo-design.md sections 6.2 and 6.4.
 */

import { assert, describe, it } from "vitest";

import { dispatcherOf } from "../../../src/session/GraphSession";
import type { GraphSession } from "../../../src/session/types";
import { makeSession } from "../helpers";
import { fakeLayout } from "./fakes";
import { fixtureSession } from "./fixture-session";

/**
 * Every node's coordinates, by id.
 * @param session - The session.
 * @returns `id: x,y,z` for every row, in id order.
 */
function lane(session: GraphSession): Record<string, string> {
    const snapshot = session.snapshot();
    const at = { x: 0, y: 0, z: 0 };
    const out: Record<string, string> = {};
    for (let row = 0; row < snapshot.nodeCount; row++) {
        session.positions.read(row, at);
        out[String(snapshot.ids.idOf(row))] = `${String(at.x)},${String(at.y)},${String(at.z)}`;
    }

    return out;
}

/**
 * A layer painting every node red: a step that moves nothing.
 * @param session - The session.
 * @param name - The layer's name.
 * @returns Settles once it is recorded.
 */
async function styleEdit(session: GraphSession, name = "Red"): Promise<void> {
    await session.styles.add({
        name,
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#ff0000" },
    });
}

describe("the arrangement under undo and redo", () => {
    it("seals where the layout came to rest into the top step, and undo and redo restore it without running the layout", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        layout.play();
        layout.step();
        layout.settle();
        const settled = lane(session);

        await session.data.addNodes([{ id: "n4" }]);
        layout.play();
        layout.step();
        layout.step();
        layout.settle();
        const after = lane(session);
        const { loads } = layout;

        await session.undo();
        assert.deepEqual(lane(session), settled, "the arrangement before the add, n4 gone");
        assert.isFalse(layout.running, "and the layout is left at rest");
        assert.isAbove(layout.loads, loads, "having taken the restored arrangement as its own");

        await session.redo();
        assert.deepEqual(lane(session), after, "the arrangement the add came to rest at");
        session.dispose();
    });

    it("seals the lane before the cursor moves, so an arrangement still in flight is the top step's", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        const start = lane(session);
        await styleEdit(session);
        layout.play();
        layout.step();
        const moving = lane(session);

        await session.undo();
        assert.deepEqual(lane(session), start, "undo goes back to where the nodes were before the edit");
        await session.redo();
        assert.deepEqual(lane(session), moving, "and redo to where the layout had them when undo was pressed");
        session.dispose();
    });

    it("seals a write straight into the lane, as a GPU readback makes one, at the next rest point", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        const { state } = dispatcherOf(session);
        await styleEdit(session);
        const before = state.arrangement;

        layout.play();
        assert.isTrue(layout.readback()(), "the readback landed");
        layout.settle();

        const sealed = state.arrangement;
        assert.notStrictEqual(sealed, before, "the rest point took a capture");
        assert.deepEqual(
            [...(sealed?.coords ?? [])],
            [...session.positions.view(3)],
            "of the lane as the readback left it",
        );
        const landed = lane(session);
        await session.undo();
        await session.redo();
        assert.deepEqual(lane(session), landed, "and redo restores it");
        session.dispose();
    });

    it("drops a readback submitted before an undo when it lands after it", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        await styleEdit(session);
        layout.play();
        const land = layout.readback();

        await session.undo();
        const restored = lane(session);
        assert.isFalse(land(), "the late readback is dropped");
        assert.deepEqual(lane(session), restored, "and the restored arrangement stands");
        session.dispose();
    });

    it("restores the arrangement below a placement as it was sealed last, not the coordinates the rows were written over", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        await styleEdit(session);
        await session.positions.set([{ id: "n1", x: 10, y: 10, z: 10 }]);

        await session.undo();
        layout.play();
        layout.step();
        layout.settle();
        const below = lane(session);

        await session.redo();
        assert.deepEqual(lane(session), { ...below, n1: "10,10,10" }, "the placement over the arrangement below it");
        await session.undo();
        assert.deepEqual(lane(session), below, "and undone, the arrangement below as it now is");
        session.dispose();
    });

    it("takes at most one capture per layout frame from a script placing one node at a time", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        const { arrangement } = dispatcherOf(session);
        const capture = arrangement.capture.bind(arrangement);
        let captures = 0;
        arrangement.capture = () => {
            captures++;
            return capture();
        };

        layout.play();
        const frames = 4;
        let start: Record<string, string> = {};
        for (let frame = 0; frame < frames; frame++) {
            layout.step();
            if (frame === 0) {
                start = lane(session);
            }

            for (const id of ["n1", "n2", "n3"]) {
                await session.positions.set([{ id, x: frame, y: 1, z: 2 }]);
            }
        }

        assert.isAtMost(captures, frames, "one capture per frame the layout moved the lane");
        assert.lengthOf(session.history.steps, 1, "and the calls coalesce into one step");
        const end = lane(session);
        await session.undo();
        assert.deepEqual(lane(session), start, "undone, where the script started");
        await session.redo();
        assert.deepEqual(lane(session), end, "redone, where it finished");
        session.dispose();
    });

    it("pins a removed node again when its removal is undone, through the pins slice, and the lane agrees", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        const pinnedRow = (id: string): boolean => session.positions.isPinned(session.snapshot().ids.indexOf(id));

        await session.positions.pin(["n2"]);
        assert.isTrue(session.positions.pinned.has("n2"));
        assert.isTrue(pinnedRow("n2"), "the lane's pin byte is written");

        await session.data.removeNodes(["n2"]);
        assert.isFalse(session.positions.pinned.has("n2"), "the pin went with the node");

        await session.undo();
        assert.isTrue(session.positions.pinned.has("n2"), "the pins slice has it again");
        assert.isTrue(pinnedRow("n2"), "and the lane agrees");
        assert.deepEqual(layout.pins.at(-1), ["n2", true], "and the layout was told");

        await session.undo();
        assert.isFalse(session.positions.pinned.has("n2"), "undoing the pin releases it");
        assert.isFalse(pinnedRow("n2"));
        session.dispose();
    });

    it("a pinned node does not move under the layout", async () => {
        const session = await fixtureSession();
        const layout = fakeLayout(session);
        layout.play();
        layout.step();
        await session.positions.pin(["n1"]);
        const pinned = lane(session).n1;

        layout.step();
        assert.strictEqual(lane(session).n1, pinned);
        session.dispose();
    });

    it("removed rows keep their seeds, and a removed node the layout had moved comes back where it was", async () => {
        const harness = makeSession();
        const { session, store } = harness;
        await session.data.addNodes([
            { id: "a", position: { x: 1, y: 2, z: 3 } },
            { id: "b", position: { x: 4, y: 5, z: 6 } },
            { id: "c", position: { x: 7, y: 8, z: 9 } },
        ]);
        session.history.clear();
        const layout = fakeLayout(session);
        const at = { x: 0, y: 0, z: 0 };
        const coordsOf = (id: string): typeof at => {
            store.positions.read(session.snapshot().ids.indexOf(id), at);
            return { ...at };
        };

        await session.data.removeNodes(["b"]);
        await session.undo();
        assert.deepEqual(coordsOf("b"), { x: 4, y: 5, z: 6 }, "unmoved, the node is back at its seed");

        layout.play();
        layout.step();
        layout.settle();
        await session.redo();
        await session.undo();
        assert.deepEqual(coordsOf("b"), { x: 5, y: 6, z: 7 }, "moved, it is back where the layout left it");
        session.dispose();
    });

    it("keeps a capture instead of a row patch for a placement over more than a third of the rows", async () => {
        const session = await fixtureSession();
        fakeLayout(session);
        await session.positions.set([{ id: "n1", x: 1, y: 1, z: 1 }]);
        const small = session.history.steps[0].bytes;
        session.history.clear();

        await session.positions.set([
            { id: "n1", x: 2, y: 2, z: 2 },
            { id: "n2", x: 3, y: 3, z: 3 },
        ]);
        const large = session.history.steps[0].bytes;
        assert.isAbove(large, small, "the step holds a capture of every row");
        assert.deepEqual(
            [...(dispatcherOf(session).state.arrangement?.coords.subarray(0, 6) ?? [])],
            [2, 2, 2, 3, 3, 3],
        );
        session.dispose();
    });
});
