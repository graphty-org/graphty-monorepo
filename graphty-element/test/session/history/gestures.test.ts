/**
 * @file What one step is: quick edits merge only when they are the same gesture on the same
 * target, an edit that changes nothing records nothing, and a session with no renderer paints
 * what a data command added. See design/undo/undo-design.md section 5.
 */

import { assert, describe, it } from "vitest";

import type { ElementSession, GraphSession } from "../../../src/session/types";
import { fixtureSession } from "./fixture-session";
import { pictureDigest } from "./round-trip-harness";

/**
 * A fixture session on a clock the test moves by hand.
 * @returns The session and the hand that moves its clock.
 */
async function clocked(): Promise<{ session: GraphSession; advance: (ms: number) => void }> {
    let time = 0;
    const session = await fixtureSession({ now: () => time });
    return {
        session,
        advance: (ms) => {
            time += ms;
        },
    };
}

/**
 * The labels of the recorded steps, oldest first.
 * @param session - The session.
 * @returns The labels.
 */
function labels(session: GraphSession): string[] {
    return session.history.steps.map((step) => step.label);
}

describe("what one step is", () => {
    it("records placements of different nodes as steps of their own, and repeated placements of one node as one", async () => {
        const { session, advance } = await clocked();
        for (const id of ["n1", "n3", "n2"]) {
            await session.positions.set([{ id, x: 1, y: 2, z: 3 }]);
            advance(500);
        }

        assert.lengthOf(session.history.steps, 3, "three nodes, three gestures");

        await session.positions.set([{ id: "n2", x: 4, y: 5, z: 6 }]);
        assert.lengthOf(session.history.steps, 3, "the same node again, within the window, merges");
        session.dispose();
    });

    it("merges edits of one filter, and keeps a different filter a step of its own", async () => {
        const { session, advance } = await clocked();
        await session.visibility.set({ kind: "degree", min: 1 });
        advance(300);
        await session.visibility.set({ kind: "degree", min: 2 });
        assert.lengthOf(session.history.steps, 1, "one slider drag");

        advance(300);
        await session.visibility.set({ kind: "range", attribute: "data.weight", min: 0 });
        assert.lengthOf(session.history.steps, 2, "another filter is another step");

        advance(300);
        await session.visibility.set(null);
        assert.lengthOf(session.history.steps, 3, "and so is clearing it");
        await session.undo();
        assert.deepEqual(session.visibility.filter, { kind: "range", attribute: "data.weight", min: 0 });
        session.dispose();
    });

    it("records nothing for an edit that writes what the record already holds", async () => {
        const session = await fixtureSession();
        await session.data.updateNodes([{ id: "n1", values: { w: 3 } }]);
        await session.data.updateNodes([{ id: "n1", values: { w: 3 } }]);
        await session.data.updateNodes([{ id: "n1", values: {} }]);

        assert.deepEqual(labels(session), ["Edited 1 node"]);
        session.dispose();
    });

    it("calls a one-member batch one change", async () => {
        const session = await fixtureSession();
        await session.execute({
            op: "batch",
            steps: [{ op: "positions.set", entries: [{ id: "n1", x: 1, y: 1, z: 1 }] }],
        });

        assert.deepEqual(labels(session), ["1 change"]);
        session.dispose();
    });
});

describe("a session with no renderer", () => {
    it("paints a node a data command added, forward and after undo and redo alike", async () => {
        const session = await fixtureSession();
        const colourOfQ = (): string => {
            const index = session.snapshot().ids.indexOf("q");
            return JSON.stringify((session as ElementSession).paint.styleOf("node", index));
        };
        await session.transaction("Red, then a node", async (tx) => {
            await tx.styles.add({
                name: "Red",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#ff0000" },
            });
            await tx.data.addNodes([{ id: "q" }]);
        });
        const forward = pictureDigest(session);
        assert.include(colourOfQ(), "#ff0000", "painted as the change lands");

        await session.undo();
        await session.redo();

        assert.strictEqual(pictureDigest(session), forward, "the same picture after redo as after the change");
        session.dispose();
    });
});
