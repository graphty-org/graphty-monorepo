import { assert, describe, it, vi } from "vitest";

import type { LayerSpec } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { edgeBetween, type Harness, makeSession } from "../helpers";

/**
 * The line a-b-c-d with a spur b-e: b's neighbors are a, c and e; d is two steps away.
 * @returns The harness.
 */
function line(): Harness {
    const harness = makeSession();
    harness.add(
        [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
            { src: "b", dst: "e" },
        ],
    );

    return harness;
}

/**
 * Whether one layer paints one node's opacity now.
 * @param harness - The session.
 * @param node - The node.
 * @param layerId - The layer.
 * @returns True when the layer wins the node's opacity.
 */
function nodeDimmedBy(harness: Harness, node: string, layerId: string): boolean {
    return harness.session.styles
        .explain({ node })
        .channels.some((entry) => entry.channel === "node.opacity" && entry.layerId === layerId);
}

/**
 * Whether one layer paints one edge's opacity now.
 * @param harness - The session.
 * @param from - One end.
 * @param to - The other end.
 * @param layerId - The layer.
 * @returns True when the layer wins the edge's opacity.
 */
function edgeDimmedBy(harness: Harness, from: string, to: string, layerId: string): boolean {
    return harness.session.styles
        .explain({ edge: edgeBetween(harness, from, to) })
        .channels.some((entry) => entry.channel === "edge.opacity" && entry.layerId === layerId);
}

/**
 * Waits until the nodes a layer paints are the expected ones: a hover change repaints in the
 * background, and an explanation reads the painted picture.
 * @param harness - The session.
 * @param layerId - The layer.
 * @param expected - The node ids it should paint.
 */
async function paints(harness: Harness, layerId: string, expected: readonly string[]): Promise<void> {
    await vi.waitFor(() => {
        assert.deepStrictEqual(
            ["a", "b", "c", "d", "e"].filter((id) => nodeDimmedBy(harness, id, layerId)),
            expected,
        );
    });
}

const DIM_NODES: LayerSpec = {
    name: "Dim the rest",
    target: "node",
    selector: { match: "hover", reach: "neighbors", invert: true },
    set: { "node.opacity": 0.25 },
};

describe('a { match: "hover" } style layer', () => {
    it("paints nothing at rest, then everything outside the hovered node's neighborhood", async () => {
        const harness = line();
        const layer = await harness.session.styles.add(DIM_NODES);

        assert.isNull(harness.session.selection.hovered);
        await paints(harness, layer.id, []);

        harness.session.selection.hover("b");
        assert.strictEqual(harness.session.selection.hovered, "b");
        await paints(harness, layer.id, ["d"]);

        harness.session.selection.hover(null);
        await paints(harness, layer.id, []);
        harness.session.dispose();
    });

    it("reads edges as the ones touching the hovered node", async () => {
        const harness = line();
        const layer = await harness.session.styles.add({
            name: "Dim the other edges",
            target: "edge",
            selector: { match: "hover", invert: true },
            set: { "edge.opacity": 0.25 },
        });

        harness.session.selection.hover("b");
        await vi.waitFor(() => {
            assert.isTrue(edgeDimmedBy(harness, "c", "d", layer.id));
        });
        assert.isFalse(edgeDimmedBy(harness, "a", "b", layer.id));
        assert.isFalse(edgeDimmedBy(harness, "b", "e", layer.id));
        assert.isTrue(edgeDimmedBy(harness, "c", "d", layer.id));
        harness.session.dispose();
    });

    it('paints only the hovered node with reach "node", and records no undo step', async () => {
        const harness = line();
        const layer = await harness.session.styles.add({
            name: "Hovered",
            target: "node",
            selector: { match: "hover" },
            set: { "node.opacity": 0.5 },
        });
        const steps = harness.session.history.steps.length;

        harness.session.selection.hover("c");
        await paints(harness, layer.id, ["c"]);
        assert.strictEqual(harness.session.history.steps.length, steps);
        assert.strictEqual(harness.session.selection.size, 0, "pointing at a node selects nothing");
        harness.session.dispose();
    });

    it("with orSelected, follows a lone selected node while nothing is hovered", async () => {
        const harness = line();
        const layer = await harness.session.styles.add({
            ...DIM_NODES,
            selector: { match: "hover", reach: "neighbors", invert: true, orSelected: true },
        });

        await paints(harness, layer.id, []);
        await harness.session.selection.apply({ ids: ["b"] });
        await paints(harness, layer.id, ["d"]);

        // The pointer wins while it is on a node, and the selection is back when it leaves.
        harness.session.selection.hover("d");
        await paints(harness, layer.id, ["a", "b", "e"]);
        harness.session.selection.hover(null);
        await paints(harness, layer.id, ["d"]);

        // Two selected nodes are no one node to follow.
        await harness.session.selection.apply({ ids: ["b", "d"] });
        await paints(harness, layer.id, []);
        harness.session.dispose();
    });

    it("refuses a reach it does not know", async () => {
        const harness = line();
        let code: string | null = null;
        try {
            await harness.session.styles.add({
                name: "Bad",
                target: "node",
                selector: { match: "hover", reach: "everything" as "node" },
                set: { "node.opacity": 0.5 },
            });
        } catch (error) {
            code = isGraphtyError(error) ? error.code : "other";
        }

        assert.strictEqual(code, "E_BAD_SELECTOR");
        harness.session.dispose();
    });
});
