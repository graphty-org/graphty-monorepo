/**
 * The renderer drawing from the session's style stack, end to end in a real graph.
 *
 * WHAT THIS IS FOR. The unit tests next door assert what a resolved style becomes; this asserts
 * that the wiring between them is actually connected -- that loading data drives a pass, that a
 * finished algorithm run drives another, that the pass's dirty set reaches the frame loop, and
 * that the mesh a node ends up drawn from is the one the session's interner keyed. Every one of
 * those is a seam that can be correct on both sides and still not joined.
 *
 * THE STACK THAT PAINTS IS THE ONLY STACK. This file used to end with four tests about a style
 * template taking the graph away from the session -- silently, with `list()` still returning
 * every superseded layer -- and about the warning and the `graphty-style-layers-superseded` event
 * that existed to make that theft visible. The template is gone, so the theft cannot happen and
 * there is nothing left to announce. What replaces those tests is the unconditional version of
 * the fact they were protecting, at the bottom of this file: a session that is bound paints, and
 * nothing a reader can do to the graph takes that away.
 */

import { InstancedMesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Algorithm } from "../../src/algorithms/Algorithm";
import { Graph } from "../../src/Graph";

/** Four nodes and three edges: enough for a layer to have something to paint. */
const NODES = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }];

/** The edges between them. */
const EDGES = [
    { src: "1", dst: "2" },
    { src: "2", dst: "3" },
    { src: "3", dst: "4" },
];

/**
 * A PLUGIN ALGORITHM HAS NO RUN TO ANNOUNCE, so the element has to ask for its picture.
 *
 * A catalogue algorithm runs as a session run, and the session announcing that run's end is what
 * brings the paint up to date. A plugin registered through `Algorithm.register` publishes no
 * catalogue descriptor, so it cannot be started by key and takes the 1.10 path instead: it writes
 * straight onto the element's records, which the session reads as attributes. Nothing announces
 * that. Without the element asking for the repaint where the plugin wrote, a layer selecting on
 * what it wrote goes on showing the picture from before it ran -- silently, because the layer is
 * in the stack and the value is on the record, and only the screen disagrees.
 */
class MarkEveryNode extends Algorithm {
    static override type = "mark-every-node";

    static override namespace = "test-plugin";

    /**
     * Write one attribute onto every node, which is all a plugin can do today.
     * @param graph - The graph to mark.
     */
    override async run(graph: Graph): Promise<void> {
        for (const node of graph.getNodes()) {
            (node.data as Record<string, unknown>).marked = true;
        }

        return Promise.resolve();
    }
}

Algorithm.register(MarkEveryNode);

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
        graph.getUpdateManager().stepFrames(2);
    }

    it("paints a freshly loaded graph from the session's own stack", async () => {
        await load();

        assert.isTrue(graph.getStylePainter().owns, "a session is bound, so it is what paints");

        for (const node of graph.getNodes()) {
            assert.instanceOf(node.mesh, InstancedMesh);
            // The instance is named after the cache key it came from, and that key is where the
            // interner's number lands: `s3` rather than the reserved bootstrap key a node is
            // built under before the first pass reaches it.
            assert.match(node.mesh.name, /^node-style-s\d+/, "the source mesh is keyed by the session's interner");
        }
    });

    it("draws every node of one shape from ONE source mesh", async () => {
        await load();

        const sources = new Set(graph.getNodes().map((node) => (node.mesh as InstancedMesh).sourceMesh.uniqueId));

        assert.strictEqual(sources.size, 1, "four nodes of one shape and size share one source mesh");
    });

    it("frees the source meshes of sizes no node is drawn at any more", async () => {
        // Every size edit is a new look and a new source mesh. The cache has to follow the looks
        // on screen, not every edit ever made, or a slider dragged across a size range holds one
        // mesh per stop until the next dataset load.
        await load();

        const layer = await graph.getSession().styles.add({
            name: "Reader - size",
            selector: { match: "everything" },
            set: { "node.size": 1 },
        });
        graph.getUpdateManager().stepFrames(2);

        const settled = graph.getMeshCache().size();

        for (let size = 2; size <= 6; size++) {
            await graph.getSession().styles.update(layer.id, { set: { "node.size": size } });
            graph.getUpdateManager().stepFrames(2);

            assert.strictEqual(graph.getMeshCache().size(), settled, `after setting the size to ${String(size)}`);
        }

        for (const node of graph.getNodes()) {
            assert.isFalse((node.mesh as InstancedMesh).sourceMesh.isDisposed(), "no node lost the mesh it is drawn from");
            assert.strictEqual(node.size, 6);
        }
    });

    it("holds no more materials, textures or frame callbacks after a look is toggled back and forth", async () => {
        // A released key is never reused, so switching back to an earlier look builds its source
        // mesh again. Whatever that mesh brought with it -- its material, an animated line's
        // texture and per-frame callback -- has to go when the mesh goes, or toggling a size or a
        // selection-driven layer leaks one set per toggle.
        await load();

        const session = graph.getSession();
        const nodeLayer = await session.styles.add({
            name: "Reader - node size",
            selector: { match: "everything" },
            set: { "node.size": 1 },
        });
        const edgeLayer = await session.styles.add({
            name: "Reader - edge width",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.width": 1, "edge.animationSpeed": 0.1 },
        });
        graph.getUpdateManager().stepFrames(2);

        const scene = graph.getScene();
        /**
         * What the scene is holding, as one comparable record. Babylon takes a removed observer
         * out of its list on the next macrotask, so the count is read after one.
         * @returns The counts.
         */
        const held = async (): Promise<Record<string, number>> => {
            await new Promise((resolve) => setTimeout(resolve, 0));

            return {
                meshes: graph.getMeshCache().size(),
                materials: scene.materials.length,
                textures: scene.textures.length,
                frameCallbacks: scene.onBeforeRenderObservable.observers.length,
            };
        };
        const settled = await held();

        for (const step of [2, 1, 2, 1, 2]) {
            await session.styles.update(nodeLayer.id, { set: { "node.size": step } });
            await session.styles.update(edgeLayer.id, { set: { "edge.width": step, "edge.animationSpeed": 0.1 } });
            graph.getUpdateManager().stepFrames(2);

            assert.deepStrictEqual(await held(), settled, `after toggling to ${String(step)}`);
        }
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
     * A reader's own layer and an algorithm's layer in one stack, painting together.
     *
     * The reader's layer greys every edge and the algorithm's colours every node, so the picture
     * has to carry both. This is the arrangement the stories in this package use for dimming
     * what an algorithm did not select: a layer of the reader's own, beneath the algorithm's.
     */
    it("keeps an algorithm's colours over a reader layer in the same stack", async () => {
        await load();

        await graph.getSession().styles.add({
            name: "Reader - grey every edge",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#999999" },
        });

        await graph.runAlgorithm("graphty", "degree", { applySuggestedStyles: true });
        await graph.operationQueue.waitForCompletion();
        graph.getUpdateManager().stepFrames(2);

        assert.isTrue(graph.getStylePainter().owns, "the session is still what paints");

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

    /**
     * Nothing takes the graph away from the session's stack.
     *
     * This is the unconditional replacement for the ownership rule. There were two style systems
     * and a test that decided which of them drew a graph, and the answer could change under a
     * reader who had done nothing but load a style template -- at which point every layer an
     * algorithm had published stopped reaching the screen while `list()` still reported it. One
     * stack cannot lose an argument with itself, so what is asserted now is that `owns` is true
     * from the moment a graph exists and stays true through everything a reader does to it.
     */
    describe("the session's stack is the only one, whatever happens to the graph", () => {
        it("is painting before a single node has been added", () => {
            assert.isTrue(graph.getStylePainter().owns, "a session is bound as soon as the graph is built");
        });

        it("is still painting after a load, a layer, an algorithm and a mode switch", async () => {
            await load();
            assert.isTrue(graph.getStylePainter().owns, "after a load");

            const layer = await graph.getSession().styles.add({
                name: "Reader - grey every edge",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.color": "#999999" },
            });
            assert.isTrue(graph.getStylePainter().owns, "after a reader's own layer");

            await graph.runAlgorithm("graphty", "degree", { applySuggestedStyles: true });
            await graph.operationQueue.waitForCompletion();
            assert.isTrue(graph.getStylePainter().owns, "after an algorithm published a layer of its own");

            await graph.setViewMode("2d");
            await graph.operationQueue.waitForCompletion();
            assert.isTrue(graph.getStylePainter().owns, "and after the meshes were all rebuilt for 2D");

            assert.isDefined(
                graph.getSession().styles.get(layer.id),
                "and the reader's layer is still in the stack that is painting",
            );
        });

        it("keeps drawing the reader's layer after an algorithm paints over it", async () => {
            await load();
            await graph.getSession().styles.add({
                name: "Reader - fat edges",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.width": 4 },
            });

            await graph.runAlgorithm("graphty", "degree", { applySuggestedStyles: true });
            await graph.operationQueue.waitForCompletion();
            graph.getUpdateManager().stepFrames(2);

            // The degree layer writes node colours and says nothing about edge width, so the
            // reader's layer underneath is still what decides how wide an edge is drawn. A stack
            // where the top layer wins everything is the failure this replaces.
            for (const edge of graph.getDataManager().edges.values()) {
                assert.strictEqual(
                    graph.getStylePainter().edgePaint(edge.index)?.style.line?.width,
                    4,
                    "a layer nobody overwrote still paints",
                );
            }
        });

        /**
         * A run's measurements reach the picture, which is the `algorithm-run` repaint trigger.
         *
         * A layer bound to a run's own column reads something that does not exist until the run
         * finishes. Nothing about adding the layer can paint it, and the run publishes a result
         * rather than walking the graph -- so if the element did not repaint when a run finished,
         * this layer would sit in the stack painting nothing until the next unrelated edit.
         */
        /**
         * THE LAYER GOES ON FIRST, and that ordering is the whole test.
         *
         * A style edit repaints on its own account, so adding the layer AFTER the run proves
         * nothing about what a finished run triggers -- the element could stop repainting on a
         * run entirely and that version would still pass. The layer therefore goes on while the
         * column it names does not exist yet, matches nothing, and paints nothing. What makes it
         * paint is the run finishing, and nothing else happens in between.
         */
        it("paints a layer bound to a run's column when the run finishes, with no edit in between", async () => {
            await load();

            const session = graph.getSession();

            await session.styles.add({
                name: "measured nodes are green",
                target: "node",
                selector: { match: "has", path: "results.later.value" },
                set: { "node.color": "#00FF00" },
            });
            await graph.operationQueue.waitForCompletion();
            graph.getUpdateManager().stepFrames(2);

            for (const node of graph.getNodes()) {
                assert.notDeepEqual(
                    graph.getStylePainter().nodePaint(node.index)?.color,
                    { r: 0, g: 255, b: 0, a: 1 },
                    "the column it names does not exist yet, so it matches nothing",
                );
            }

            // Named in advance, so the layer added above is already bound to this run's column.
            const run = session.runs.start("degree", {}, { as: "later" });
            await run;
            await graph.operationQueue.waitForCompletion();
            graph.getUpdateManager().stepFrames(2);

            for (const node of graph.getNodes()) {
                assert.deepStrictEqual(
                    graph.getStylePainter().nodePaint(node.index)?.color,
                    { r: 0, g: 255, b: 0, a: 1 },
                    "the run finishing is what brought the picture up to date",
                );
            }
        });
    });

    describe("a plugin algorithm's writes", () => {
        it("reach the picture, even though no run announced them", async () => {
            await load();

            const green = { r: 0, g: 255, b: 0, a: 1 };

            // The layer goes on FIRST, against an attribute no record carries yet, so it matches
            // nothing and paints nothing. What makes it paint is the plugin writing.
            await graph.getSession().styles.add({
                name: "marked nodes are green",
                target: "node",
                selector: { match: "has", path: "data.marked" },
                set: { "node.color": "#00FF00" },
            });
            await graph.operationQueue.waitForCompletion();
            graph.getUpdateManager().stepFrames(2);

            for (const node of graph.getNodes()) {
                assert.notDeepEqual(graph.getStylePainter().nodePaint(node.index)?.color, green);
            }

            await graph.runAlgorithm("test-plugin", "mark-every-node");
            await graph.operationQueue.waitForCompletion();
            graph.getUpdateManager().stepFrames(2);

            for (const node of graph.getNodes()) {
                assert.deepStrictEqual(
                    graph.getStylePainter().nodePaint(node.index)?.color,
                    green,
                    "the element brought the picture up to date after the plugin wrote",
                );
            }
        });
    });
});