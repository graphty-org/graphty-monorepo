/**
 * @file A layer scoped to the selection (or to what is on screen) is about the session, not the
 * graph: no file holds that state, so an export with styles leaves it out instead of writing it
 * as a rule or reporting it as lost.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { exportSession } from "../../src/data/export";

/**
 * A graph of three nodes with one layer on the selection, and optionally one on every node.
 * @param everyNode - Whether to add the layer on every node too.
 * @returns The session.
 */
async function graphWithSelectionLayer(everyNode: boolean): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.styles.add({
        name: "Card on the selection",
        target: "node",
        selector: { match: "member", of: "selection" },
        set: { "node.color": "#ff0000" },
    });
    if (everyNode) {
        await session.styles.add({
            name: "Every node blue",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#0000ff" },
        });
    }

    await session.styles.settled();
    return session;
}

describe("a layer scoped to the reader's view", () => {
    it("is not written into a file's styles, while a layer on the graph is", async () => {
        const session = await graphWithSelectionLayer(true);
        const text = await exportSession(session, "graphml", { styles: true }).text();
        assert.include(text, "Every node blue");
        assert.notInclude(text, "Card on the selection");
    });

    it("is not reported as lost by a format that keeps no styles", async () => {
        const session = await graphWithSelectionLayer(false);
        const result = exportSession(session, "csv", { styles: true });
        assert.deepEqual(
            result.losses.filter((loss) => loss.code.startsWith("W_STYLE_")).map((loss) => loss.code),
            [],
        );
    });
});
