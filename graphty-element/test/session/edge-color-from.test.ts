/**
 * @file `edge.colorFrom`: an edge drawn in the color the layers painted its source or target node,
 * kept current when a later layer recolors the node.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";
import { asColorValue } from "../../src/session/styles/channels";
import type { ElementSession } from "../../src/session/types";

/**
 * A session over a path a - b - c, its nodes colored red, green and blue.
 * @returns The session.
 */
async function path(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    for (const [id, color] of [
        ["a", "#ff0000"],
        ["b", "#00ff00"],
        ["c", "#0000ff"],
    ] as const) {
        await session.styles.add({
            name: id,
            target: "node",
            selector: { match: "ids", nodes: [id] },
            set: { "node.color": color },
        });
    }

    return session;
}

/**
 * The color the renderer is handed for each edge row.
 * @param session - The session.
 * @returns The hex colors, by edge row.
 */
function edgeColors(session: GraphSession): (string | undefined)[] {
    const { paint } = session as ElementSession;
    const { edgeCount } = session.data.snapshot();

    return Array.from({ length: edgeCount }, (_, row) => asColorValue(paint.styleOf("edge", row)["edge.color"])?.hex);
}

describe("edge.colorFrom", () => {
    it("draws an edge in its source or target node's painted color", async () => {
        const session = await path();
        const { id } = await session.styles.add({
            name: "From source",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#888888", "edge.colorFrom": "source" },
        });
        await session.styles.settled();
        assert.deepEqual(edgeColors(session), ["#ff0000", "#00ff00"]);

        await session.styles.update(id, { set: { "edge.color": "#888888", "edge.colorFrom": "target" } });
        await session.styles.settled();
        assert.deepEqual(edgeColors(session), ["#00ff00", "#0000ff"]);
        session.dispose();
    });

    it('leaves an edge its own color under "none", the default an editor shows before a pick', async () => {
        // Issue #9296: with no default an editor showed the first value, "source", for a line nothing
        // had set, and a reader who took it as set saw every edge stay gray.
        const session = await path();
        assert.strictEqual(
            session.catalog.channels("edge").find((each) => each.channel === "edge.colorFrom")?.default,
            "none",
        );
        await session.styles.add({
            name: "None",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#888888", "edge.colorFrom": "none" },
        });
        await session.styles.settled();
        assert.deepEqual(edgeColors(session), ["#888888", "#888888"]);
        session.dispose();
    });

    it("leaves an edge its own color when unset", async () => {
        const session = await path();
        await session.styles.add({
            name: "Gray",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#888888" },
        });
        await session.styles.settled();
        assert.deepEqual(edgeColors(session), ["#888888", "#888888"]);
        session.dispose();
    });

    it("repaints the edges that follow a node a later layer recolors", async () => {
        const session = await path();
        await session.styles.add({
            name: "From source",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.colorFrom": "source" },
        });
        await session.styles.settled();
        const { paint } = session as ElementSession;
        // The renderer reads every edge it draws, which is how the session learns edges follow nodes.
        edgeColors(session);

        const repainted: number[][] = [];
        const stop = paint.onPainted(() => {
            repainted.push(Array.from(paint.lastPainted("edge")));
        });
        await session.styles.add({
            name: "b yellow",
            target: "node",
            selector: { match: "ids", nodes: ["b"] },
            set: { "node.color": "#ffff00" },
        });
        await session.styles.settled();
        stop();

        assert.deepEqual(edgeColors(session), ["#ff0000", "#ffff00"]);
        assert.isTrue(
            repainted.some((edges) => edges.includes(1)),
            "the edge leaving b is repainted with it",
        );
        assert.isFalse(
            repainted.some((edges) => edges.includes(0)),
            "the edge into b follows a, not b",
        );
        session.dispose();
    });
});
