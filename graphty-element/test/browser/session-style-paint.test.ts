/**
 * The renderer drawing from the session's style stack, end to end in a real graph.
 *
 * WHAT THIS IS FOR. The unit tests next door assert what a resolved style becomes and who owns an
 * element's paint; this asserts that the wiring between them is actually connected -- that loading
 * data drives a pass, that the pass's dirty set reaches the frame loop, and that the mesh a node
 * ends up drawn from is the one the session's interner keyed rather than the one the legacy style
 * id keyed. Every one of those is a seam that can be correct on both sides and still not joined.
 */

import { InstancedMesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { StyleSchema } from "../../src/config";
import { Graph } from "../../src/Graph";

/** Four nodes and three edges: enough for both halves of the stack to have something to paint. */
const NODES = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }];

/** The edges between them. */
const EDGES = [
    { src: "1", dst: "2" },
    { src: "2", dst: "3" },
    { src: "3", dst: "4" },
];

/** A template with one layer of its own, which is what hands the graph back to the legacy stack. */
const TEMPLATE = {
    graphtyTemplate: true,
    majorVersion: "1",
    graph: { addDefaultStyle: true },
    layers: [
        {
            node: {
                selector: "",
                style: { texture: { color: "#4CAF50" }, shape: { type: "sphere", size: 10 } },
            },
        },
    ],
} as unknown as StyleSchema;

describe("session style paint", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Load the test graph and let every queued operation and one frame finish.
     */
    async function load(): Promise<void> {
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();
        graph.getUpdateManager().renderFixedFrames(2);
    }

    it("paints a graph with no style template from the session's own stack", async () => {
        await load();

        assert.isTrue(graph.getStylePainter().owns, "nothing has taken the graph back");

        for (const node of graph.getNodes()) {
            assert.instanceOf(node.mesh, InstancedMesh);
            // The instance is named after the cache key it came from, and that key is where the
            // interner's number lands: `s3` rather than a legacy style id.
            assert.match(
                node.mesh.name,
                /^node-style-s\d+/,
                "the source mesh is keyed by the session's interner, not by a legacy style id",
            );
        }
    });

    it("draws every node of one shape from ONE source mesh", async () => {
        await load();

        const sources = new Set(graph.getNodes().map((node) => (node.mesh as InstancedMesh).sourceMesh.uniqueId));

        assert.strictEqual(sources.size, 1, "four nodes of one shape and size share one source mesh");
    });

    it("writes the session's colour into each node's own instance", async () => {
        await load();

        for (const node of graph.getNodes()) {
            const painted = (node.mesh as InstancedMesh).instancedBuffers.color as
                | { r: number; g: number; b: number }
                | undefined;

            assert.isDefined(painted, "a node the session painted carries a per-instance colour");
            // #6366F1, the element's own default, as the base layer resolved it.
            assert.closeTo(painted?.r ?? 0, 99 / 255, 0.01);
            assert.closeTo(painted?.g ?? 0, 102 / 255, 0.01);
            assert.closeTo(painted?.b ?? 0, 241 / 255, 0.01);
        }
    });

    /**
     * The reader's own layer belongs in the SESSION'S stack, and this is what goes wrong when it
     * is written as a 1.x template layer instead.
     *
     * A 1.x layer in the stack is what `owns` reads to decide who paints the graph, so ONE of
     * them silently takes the whole picture away from the session -- including the layer the
     * algorithm just published, which lives nowhere else. Three of this package's own stories
     * dimmed their background that way and drew an unstyled graph for it, with nothing failing.
     * The same layer added here keeps the session painting, which is the arrangement those
     * stories now use.
     */
    it("keeps an algorithm's colours under a reader layer in the session's own stack", async () => {
        await load();

        await graph.getSession().styles.add({
            name: "Reader - grey every edge",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#999999" },
        });

        await graph.runAlgorithm("graphty", "degree", { applySuggestedStyles: true });
        await graph.operationQueue.waitForCompletion();
        graph.getUpdateManager().renderFixedFrames(2);

        assert.isTrue(graph.getStylePainter().owns, "a reader layer in the session's stack leaves the session painting");

        const colours = new Set(
            graph.getNodes().map((node) => {
                const painted = (node.mesh as InstancedMesh).instancedBuffers.color as
                    | { r: number; g: number; b: number }
                    | undefined;

                return painted === undefined ? "unpainted" : `${painted.r},${painted.g},${painted.b}`;
            }),
        );

        assert.isFalse(colours.has("unpainted"), "every node carries a colour the session wrote");
        assert.isAbove(colours.size, 1, "and the degree ramp painted the two degrees this graph has differently");
    });

    it("hands the graph back to the legacy stack when a template arrives", async () => {
        await load();
        await graph.setStyleTemplate(TEMPLATE);
        await graph.operationQueue.waitForCompletion();
        graph.getUpdateManager().renderFixedFrames(2);

        assert.isFalse(graph.getStylePainter().owns, "a template's layers are not in the session's stack");

        for (const node of graph.getNodes()) {
            assert.strictEqual(node.size, 10, "and the template's size is what is drawn");
        }
    });
});
