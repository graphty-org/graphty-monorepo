/**
 * @file A layout that places its edges itself, through its own `getEdgePosition`, has every edge drawn where it says,
 * on both render paths: on `"batched"` a plain edge is otherwise drawn from the shared batch straight between its
 * nodes, which never asks the layout (issue #10032). A layout that does not override it still has its plain edges
 * drawn from the batch, and a plain edge is pulled again once a layout that lays edges is gone, or failed to build.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import {
    type AuthoredLayoutDescriptor,
    type Edge,
    type EdgePosition,
    LayoutEngine,
    SimpleLayoutEngine,
} from "../../extend";
import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { nextFrame } from "../helpers/real-input";
import { edgeBetween } from "../helpers/testSetup";

/** How far up the layout below draws each edge off its nodes, in scene units. */
const RAISE = 2;

/** A plugin layout that puts the nodes in a row and draws every edge {@link RAISE} above the line between them. */
class RaisedEdgesLayout extends SimpleLayoutEngine {
    static type = "test-raised-edges";
    static maxDimensions = 3;
    static descriptor: AuthoredLayoutDescriptor = {
        id: "test-raised-edges",
        plainName: "Raised edges",
        technicalName: "Row with raised edges",
        description: "Puts the nodes in a row and draws each edge above them.",
        family: "special",
        kind: "batch",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: "test-raised-edges",
        options: [],
    };

    doLayout(): void {
        this.positions = {};
        let x = -1;
        for (const node of this.nodes) {
            this.positions[node.id] = [x, -1, 0];
            x += 2;
        }
    }

    override getEdgePosition(e: Edge): EdgePosition {
        const { src, dst } = super.getEdgePosition(e);
        return { src: { ...src, y: src.y + RAISE }, dst: { ...dst, y: dst.y + RAISE } };
    }
}

LayoutEngine.register(RaisedEdgesLayout);

/** Releases the build of {@link FailingRaisedEdgesLayout} under way, which then fails. */
let failBuild: () => void = () => undefined;

/** {@link RaisedEdgesLayout}, whose build waits for {@link failBuild} and then fails, as a Graphviz run can. */
class FailingRaisedEdgesLayout extends RaisedEdgesLayout {
    static override type = "test-failing-raised-edges";
    static override descriptor: AuthoredLayoutDescriptor = {
        ...RaisedEdgesLayout.descriptor,
        id: "test-failing-raised-edges",
        engine: "test-failing-raised-edges",
    };

    override async init(): Promise<void> {
        await new Promise<void>((resolve) => {
            failBuild = resolve;
        });
        throw new Error("this layout always fails");
    }
}

LayoutEngine.register(FailingRaisedEdgesLayout);

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * Let the element finish its queued work and draw.
 * @param element - The element.
 */
async function drawn(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * Where the edge's line is drawn against where its nodes are.
 * @param element - The element.
 * @returns How far its middle is drawn above the middle of its two nodes, and whether it is pulled from the batch.
 */
function drawnEdge(element: Graphty): { raised: number; pulled: boolean } {
    const edge = edgeBetween(element.graph, 0, 1);
    const line = edge?.drawnLine;
    const [a, b] = [element.graph.getNode(0)?.getPosition(), element.graph.getNode(1)?.getPosition()];
    assert.isDefined(line ?? undefined, "the edge's line is drawn");
    assert.isDefined(a);
    assert.isDefined(b);
    return {
        raised: (line?.center.y ?? Number.NaN) - ((a?.y ?? Number.NaN) + (b?.y ?? Number.NaN)) / 2,
        pulled: edge?.isPulled ?? false,
    };
}

/**
 * An element on the given render path with two nodes and the plain edge between them, laid out by `fixed`.
 * @param path - The render path.
 * @returns The element, drawn.
 */
async function twoNodes(path: "objects" | "batched"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await drawn(element);
    await element.session.data.addNodes([
        { id: 0, position: { x: -3, y: 2, z: 0 } },
        { id: 1, position: { x: 3, y: 2, z: 0 } },
    ]);
    await element.session.data.addEdges([{ source: 0, target: 1, directed: false }]);
    await element.graph.setLayout("fixed");
    await drawn(element);
    return element;
}

describe("a layout's own getEdgePosition", () => {
    it('pulls a plain edge again on "batched" when a layout that lays edges fails to build', async () => {
        const element = await twoNodes("batched");
        assert.isTrue(drawnEdge(element).pulled, "pulled from the batch under fixed");

        // while the build runs, its engine already lays the edge, which leaves the batch at its next placement
        const failing = element.graph.setLayout("test-failing-raised-edges");
        while (drawnEdge(element).pulled) {
            await nextFrame();
        }
        assert.closeTo(drawnEdge(element).raised, RAISE, 1e-3, "placed where the building layout says");
        failBuild();
        await failing.catch(() => undefined);
        await drawn(element);

        assert.closeTo(drawnEdge(element).raised, 0, 1e-3, "the line runs between its nodes");
        assert.isTrue(drawnEdge(element).pulled, "pulled from the batch again once fixed is back");
    });

    for (const path of ["objects", "batched"] as const) {
        it(`places a plain edge where the layout says on "${path}", and a layout that does not override it draws it between its nodes`, async () => {
            const element = await twoNodes(path);

            await element.graph.setLayout("test-raised-edges");
            await drawn(element);
            const raised = drawnEdge(element);
            assert.closeTo(raised.raised, RAISE, 1e-3, "the line runs between the ends the layout gives");
            assert.isFalse(raised.pulled, "placed from the layout's answer, not pulled between its nodes");

            await element.graph.setLayout("fixed");
            await drawn(element);
            const plain = drawnEdge(element);
            assert.closeTo(plain.raised, 0, 1e-3, "the line runs between its nodes again");
            assert.strictEqual(plain.pulled, path === "batched", "a plain edge is pulled again on batched");
        });
    }
});
