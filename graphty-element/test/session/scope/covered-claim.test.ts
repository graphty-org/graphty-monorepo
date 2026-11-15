/**
 * @file A layer over a lower layer that paints the same channel decides that channel on all of
 * its own elements, and is never read as covered by the layer below, after its selector is
 * written through a branches view or the layer below is narrowed -- at every moment a reader can
 * read it, including the moment the view ends, before its repaint lands.
 */

import { assert, describe, it } from "vitest";

import type { UnionLeaf } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";

/**
 * Six nodes scored 0 to 5, a lower layer painting every node red and an upper layer painting
 * every node green.
 * @returns The session and both layers' ids.
 */
async function stacked(): Promise<{ session: GraphSession; lower: string; upper: string }> {
    const session = createGraphSession();
    await session.data.addNodes(["a", "b", "c", "d", "e", "f"].map((id, at) => ({ id, score: at })));
    const lower = await session.styles.add({
        name: "Lower",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#FF0000" },
    });
    const upper = await session.styles.add({
        name: "Upper",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#00FF00" },
    });
    await session.styles.settled();
    return { session, lower: lower.id, upper: upper.id };
}

/**
 * A union rule over the nodes scored 3 or more, as the selection workspace writes one.
 * @param session - The session.
 * @returns The rule.
 */
function topScores(session: GraphSession): UnionLeaf {
    return session.scope.asUnion(
        { kind: "range", attribute: "data.score", min: 3 },
        { side: "nodes", within: "visible" },
    ) as UnionLeaf;
}

/**
 * Asserts the upper layer decides its color on every element it matches, and nothing reads it
 * as covered: not the agreement over it, not its counts, not the legend.
 * @param session - The session.
 * @param upper - The upper layer.
 * @param when - What the reading follows, for the message.
 */
function assertDecides(session: GraphSession, upper: string, when: string): void {
    const entry = session.styles
        .agreement("graph", "node.color", { over: upper })
        .channels.find((each) => each.channel === "node.color");
    assert.strictEqual(entry?.state, "agree", when);
    assert.strictEqual(entry?.state === "agree" ? entry.layerId : undefined, upper, `${when}: the upper layer decides`);
    assert.deepEqual(session.styles.counts(upper).covers["node.color"]?.layers ?? [], [], `${when}: no cover`);
    const block = session.styles.legend().find((each) => each.layerId === upper);
    assert.isDefined(block, `${when}: the upper layer keeps its key`);
    assert.isFalse(
        block?.facts.some((fact) => fact.code === "legend.painted-over"),
        `${when}: the key says nothing paints over it`,
    );
    assert.isFalse(
        block?.swatches.some((swatch) => swatch.paintedOverBy !== undefined),
        `${when}: no swatch is painted over`,
    );
}

describe("a layer over a lower layer of the same channel", () => {
    it("decides its color when its selector is written through a branches view", async () => {
        const { session, upper } = await stacked();
        const where = topScores(session);
        let ended = false;
        session.on("style:branches-shown-changed", ({ shown }) => {
            if (!shown) {
                ended = true;
                assertDecides(session, upper, "as the view ends");
            }
        });
        const view = session.styles.showBranches({ rule: where, rest: "faint" });
        await session.styles.update(upper, { selector: { match: "rule", where } });
        await session.styles.settled();
        assertDecides(session, upper, "during the view");
        view.end();
        assert.isTrue(ended);
        assertDecides(session, upper, "before the view's repaint lands");
        await session.styles.settled();
        assertDecides(session, upper, "after the view's repaint");
        assert.strictEqual(session.styles.counts(upper).matched, 3);
    });

    it("decides its color when its selector is written with no view drawn", async () => {
        const { session, upper } = await stacked();
        await session.styles.update(upper, { selector: { match: "rule", where: topScores(session) } });
        await session.styles.settled();
        assertDecides(session, upper, "after the write");
    });

    it("decides its color when the layer below is narrowed, with a view drawn and without", async () => {
        const { session, lower, upper } = await stacked();
        const where = topScores(session);
        const view = session.styles.showBranches({ rule: where, rest: "faint" });
        await session.styles.update(lower, { selector: { match: "rule", where } });
        await session.styles.settled();
        view.end();
        assertDecides(session, upper, "as the view ends");
        await session.styles.settled();
        assertDecides(session, upper, "after the view's repaint");
        await session.styles.update(lower, { selector: { match: "everything" } });
        await session.styles.settled();
        assertDecides(session, upper, "after the layer below is widened again");
    });
});
