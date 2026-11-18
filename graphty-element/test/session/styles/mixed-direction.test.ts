/**
 * @file A graph that mixes directed and undirected edges (#309): the head no layer chose is drawn
 * per edge, so `styles.defaultValue("edge.arrowHead")` and the counts' end-caption tally answer
 * per edge too, not from the graph-wide default.
 */

import { assert, describe, it } from "vitest";

import { channelDescriptor } from "../../../src/session/styles/channels";
import { makeSession } from "../helpers";

/**
 * A directed graph of two edges whose second says it is undirected.
 * @returns the session
 */
async function mixed(): Promise<ReturnType<typeof makeSession>["session"]> {
    const { session } = makeSession({ directed: true });
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c", directed: false },
    ]);
    assert.strictEqual(session.data.statistics().directedness, "mixed");
    return session;
}

describe("styles on a graph mixing directed and undirected edges", () => {
    it("answers the default head per edge, and the catalog's head for the graph", async () => {
        const session = await mixed();
        const head = channelDescriptor("edge.arrowHead")?.default;
        const idFrom = (source: string): string =>
            String(session.data.edges().find((edge) => edge.source === source)?.id);
        assert.strictEqual(session.styles.defaultValue("edge.arrowHead"), head, "some edge draws a head");
        assert.strictEqual(session.styles.defaultValue("edge.arrowHead", idFrom("a")), head);
        assert.strictEqual(session.styles.defaultValue("edge.arrowHead", idFrom("b")), "none");
        assert.strictEqual(
            session.styles.defaultValue("edge.arrowHead", "missing"),
            head,
            "an unknown edge reads the graph",
        );
        session.dispose();
    });

    it("counts a head caption with no head only on the undirected edge", async () => {
        const session = await mixed();
        const layer = await session.styles.add({
            name: "End",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHeadText": "End" },
        });

        assert.deepStrictEqual(session.styles.counts(layer.id).undrawn, [
            { code: "caption.noArrow", params: { channel: "edge.arrowHeadText", arrow: "edge.arrowHead", count: 1 } },
        ]);
        session.dispose();
    });
});
