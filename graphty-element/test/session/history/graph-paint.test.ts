/**
 * @file The `graph` hook of a session with no renderer: a change to the rows repaints every layer;
 * a change to records' attributes alone repaints only the layers that read a field it changed,
 * forward and on undo and redo, and paints nothing when no layer reads one. Counted in passes and
 * in what each pass painted, never timed.
 */

import { assert, describe, it } from "vitest";

import type { NodeId } from "../../../src/catalog/types";
import type { ElementSession } from "../../../src/session/types";
import { makeSession } from "../helpers";

const RED = "#ff0000";

/**
 * A session over n1, n2 and n3, weighted 1, 2 and 3, painted.
 * @returns The session.
 */
async function weighted(): Promise<ElementSession> {
    const { session } = makeSession();
    await session.data.addNodes([
        { id: "n1", weight: 1, label: "one" },
        { id: "n2", weight: 2, label: "two" },
        { id: "n3", weight: 3, label: "three" },
    ]);
    return session as ElementSession;
}

/**
 * The nodes the session's last passes painted red.
 * @param session - The session.
 * @returns Their ids, sorted.
 */
function red(session: ElementSession): NodeId[] {
    const snapshot = session.snapshot();
    const found: NodeId[] = [];
    for (let row = 0; row < snapshot.nodeCount; row++) {
        if (session.paint.styleOf("node", row)["node.color"]?.hex === RED) {
            found.push(snapshot.ids.idOf(row));
        }
    }

    return found.sort();
}

/**
 * Count the passes that finish from now on.
 * @param session - The session.
 * @returns The count so far.
 */
function passes(session: ElementSession): { count: number } {
    const seen = { count: 0 };
    session.paint.onPainted(() => {
        seen.count++;
    });
    return seen;
}

describe("the headless graph hook", () => {
    it("repaints a layer reading the edited field, forward and on undo and redo", async () => {
        const session = await weighted();
        await session.styles.add({
            name: "Heavy",
            selector: { match: "expression", where: "data.weight > `2`" },
            set: { "node.color": RED },
        });
        await session.styles.settled();
        assert.deepEqual(red(session), ["n3"]);

        await session.data.updateNodes([{ id: "n1", values: { weight: 9 } }]);
        assert.deepEqual(red(session), ["n1", "n3"]);

        await session.undo();
        assert.deepEqual(red(session), ["n3"], "undo repaints what the field held before");

        await session.redo();
        assert.deepEqual(red(session), ["n1", "n3"], "and redo what it holds after");
        session.dispose();
    });

    it("paints nothing for a record edit no layer reads", async () => {
        const session = await weighted();
        await session.styles.add({
            name: "Heavy",
            selector: { match: "expression", where: "data.weight > `2`" },
            set: { "node.color": RED },
        });
        await session.styles.settled();
        const seen = passes(session);

        await session.data.updateNodes([{ id: "n1", values: { label: "uno" } }]);
        await session.undo();
        await session.redo();

        assert.strictEqual(seen.count, 0, "no layer reads the label");
        assert.deepEqual(red(session), ["n3"]);
        session.dispose();
    });

    it("repaints every layer when rows change, forward and on undo", async () => {
        const session = await weighted();
        await session.styles.add({ name: "All", selector: { match: "everything" }, set: { "node.color": RED } });
        await session.styles.settled();

        await session.data.addNodes([{ id: "n4" }]);
        assert.deepEqual(red(session), ["n1", "n2", "n3", "n4"], "the added row is painted");

        await session.data.removeNodes(["n2"]);
        await session.undo();
        assert.deepEqual(red(session), ["n1", "n2", "n3", "n4"], "the row an undo put back is painted");
        session.dispose();
    });
});
