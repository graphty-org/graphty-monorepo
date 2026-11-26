/**
 * A hover or selection change repaints only what a `{ match: "hover" }` layer can paint
 * differently: the old and new node's neighborhoods, never the whole graph. Counted, never timed.
 */
import { assert, describe, it, vi } from "vitest";

import type { LayerSpec } from "../../../src/catalog/types";
import type { GraphSession } from "../../../src/session/types";
import { assertScalesLinearly, visitsDuring } from "../../helpers/cost";
import { makeSession, withConsumerStrictState } from "../helpers";

/** The two graph sizes. */
const SIZES = [500, 2_000] as const;

/**
 * A session over a ring of `size` nodes with a chord from each node, so every node has degree 4.
 * @param size - The node count.
 * @returns The session.
 */
function ringSession(size: number): GraphSession {
    const harness = makeSession();
    const id = (at: number): string => `n${String(((at % size) + size) % size)}`;
    harness.add(
        Array.from({ length: size }, (_, at) => ({ id: id(at) })),
        Array.from({ length: size * 2 }, (_, at) =>
            at < size ? { src: id(at), dst: id(at + 1) } : { src: id(at), dst: id(at + 7) },
        ),
    );
    return harness.session;
}

const FADE_REST: LayerSpec = {
    name: "Fade the rest",
    target: "node",
    selector: { match: "hover", reach: "neighbors", invert: true },
    set: { "node.opacity": 0.25 },
};

const FADE_OTHER_EDGES: LayerSpec = {
    name: "Fade the other edges",
    target: "edge",
    selector: { match: "hover", invert: true, orSelected: true },
    set: { "edge.opacity": 0.25 },
};

/**
 * The node ids a layer paints the opacity of now.
 * @param session - The session.
 * @param layerId - The layer.
 * @param ids - The ids to check.
 * @returns Those it paints.
 */
function fadedBy(session: GraphSession, layerId: string, ids: readonly string[]): string[] {
    return ids.filter((node) =>
        session.styles
            .explain({ node })
            .channels.some((entry) => entry.channel === "node.opacity" && entry.layerId === layerId),
    );
}

describe("a hover layer's repaint on a hover move", () => {
    it("visits about the same number of elements at any graph size", async () => {
        await assertScalesLinearly(
            (size) =>
                withConsumerStrictState(async () => {
                    const session = ringSession(size);
                    await session.styles.add(FADE_REST);
                    await session.styles.add(FADE_OTHER_EDGES);
                    // Pointing at a node for the first time flips an inverted layer over the whole graph.
                    session.selection.hover("n5");
                    await session.styles.settled();
                    const visits = await visitsDuring(async () => {
                        session.selection.hover("n6");
                        await session.styles.settled();
                        await session.selection.apply({ ids: ["n9"] });
                        await session.styles.settled();
                        session.selection.hover("n40");
                        await session.styles.settled();
                    });
                    session.dispose();
                    return visits;
                }),
            { sizes: SIZES, growth: "constant", counter: "elements visited by three hover and selection moves" },
        );
    });

    it("paints the same picture as a repaint of the whole graph", async () => {
        const session = ringSession(40);
        const layer = await session.styles.add(FADE_REST);
        const ids = Array.from({ length: 40 }, (_, at) => `n${String(at)}`);
        const outside = (...inside: string[]): string[] => ids.filter((id) => !inside.includes(id));

        session.selection.hover("n5");
        await session.styles.settled();
        assert.deepStrictEqual(fadedBy(session, layer.id, ids), outside("n4", "n5", "n6", "n12", "n38"));

        session.selection.hover("n20");
        await session.styles.settled();
        assert.deepStrictEqual(fadedBy(session, layer.id, ids), outside("n13", "n19", "n20", "n21", "n27"));

        session.selection.hover(null);
        await vi.waitFor(() => {
            assert.deepStrictEqual(fadedBy(session, layer.id, ids), []);
        });
        session.dispose();
    });
});
