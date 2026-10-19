/**
 * @file A glow strength, an edge width or an arrow size of 0 draws nothing (issue #2067).
 *
 * The style channels have always accepted 0 for these, and the schemas now do too. What 0 draws
 * is defined, and cheap: no glow layer for a glow of strength 0, no placed line for an edge of
 * width 0 (and no pattern elements for a patterned one), and no cap for an arrow of size 0 --
 * with the line running as it would with no cap there, and the other end's cap still drawn.
 */
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

const NODES = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => ({ id }));
const EDGES = [
    { src: "a", dst: "b", group: "zero-width" },
    { src: "c", dst: "d", group: "control" },
    { src: "e", dst: "f", group: "zero-head" },
    { src: "g", dst: "h", group: "tail-only" },
];

describe("0 draws nothing", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.setLayout("circular", { scale: 1 });
        await operationQueueOf(graph).waitForCompletion();

        const group = (name: string): { match: "expression"; where: string } => ({
            match: "expression",
            where: `data.group == '${name}'`,
        });
        await session.styles.add({
            name: "width 0, dashed",
            target: "edge",
            selector: group("zero-width"),
            set: { "edge.width": 0, "edge.style": "dash" },
        });
        await session.styles.add({
            name: "head size 0",
            target: "edge",
            selector: group("zero-head"),
            set: { "edge.arrowHead": "normal", "edge.arrowHeadSize": 0 },
        });
        await session.styles.add({
            name: "head size 0, tail size 1",
            target: "edge",
            selector: group("tail-only"),
            set: {
                "edge.arrowHead": "normal",
                "edge.arrowHeadSize": 0,
                "edge.arrowTail": "normal",
                "edge.arrowTailSize": 1,
            },
        });
        await session.styles.add({
            name: "glow of strength 0",
            target: "node",
            selector: { match: "everything" },
            set: { "node.glow": "#ff00ff", "node.glowStrength": 0 },
        });
        await graph.waitForStableFrame();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    function edge(group: string): Edge {
        const found = [...graph.getDataManager().edges.values()].find((e) => e.data.group === group);
        if (!found) {
            assert.fail(`no edge in group ${group}`);
        }

        return found;
    }

    function centreGap(e: Edge): number {
        return e.srcNode.mesh.position.subtract(e.dstNode.mesh.position).length();
    }

    it("creates no glow layer for a glow of strength 0", () => {
        const glowLayers = graph.scene.effectLayers.filter((layer) => layer.getClassName() === "GlowLayer");
        assert.lengthOf(glowLayers, 0);
    });

    it("draws no line, and builds no pattern, for an edge of width 0", () => {
        const zero = edge("zero-width");
        assert.lengthOf(zero.drawnPattern, 0, "a dashed edge of width 0 builds no dashes");
        assert.strictEqual(zero.drawnLine?.length, 0, "its line is never placed");

        const control = edge("control");
        assert.isAbove(control.drawnLine?.length ?? 0, 0, "an edge of the default width is drawn");
    });

    it("draws no cap for an arrow head of size 0, and runs the line as it would with none", () => {
        const zero = edge("zero-head");
        assert.deepEqual(
            zero.drawnCaps.map((cap) => cap.end),
            [],
        );
        // An edge with no cap at either end runs centre to centre, as an arrow of type "none" does.
        assert.closeTo(zero.drawnLine?.length ?? 0, centreGap(zero), 0.01);
    });

    it("still draws the tail when only the head has size 0", () => {
        const tailOnly = edge("tail-only");
        assert.deepEqual(
            tailOnly.drawnCaps.map((cap) => cap.end),
            ["arrowTail"],
        );

        const tail = tailOnly.arrowTailCap?.position;
        if (!tail) {
            assert.fail("the tail has no cap");
        }

        const toSrc = tail.subtract(tailOnly.srcNode.mesh.position).length();
        const toDst = tail.subtract(tailOnly.dstNode.mesh.position).length();
        assert.isBelow(toSrc, toDst, "the tail is placed at the source end");
    });
});
