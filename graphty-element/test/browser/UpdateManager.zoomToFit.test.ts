/**
 * @file Zoom-to-fit frames the nodes AND their labels; a label edit leaves the camera alone.
 *
 * The box the camera is framed on is the visible nodes out to their size, grown by every label
 * plane's world bounds -- wherever the label is anchored -- so no label is cut off by the edge of
 * the viewport. A label's size depends on its text and font, which is why framing runs on data
 * loads and layout changes and never on a label edit (#76): after the graph has settled, changing a
 * label's words, colour, size, anchor or offset must leave the camera exactly where it was.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LabelStyle } from "../../src/catalog/types";
import { Graph } from "../../src/Graph";
import { framingBox, nodeFramingBox } from "../../src/managers/UpdateManager";

/** Three nodes at fixed places, so the only thing that can change the framing is the labels. */
const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
    { id: "c", position: { x: 0, y: 3, z: 0 } },
];

/** Three nodes so close that a label reaches well past the node box on a small viewport. */
const PILED = [
    { id: "a", position: { x: 0, y: 0, z: 0 } },
    { id: "b", position: { x: -0.3, y: 0.1, z: 0 } },
    { id: "c", position: { x: 0.3, y: -0.1, z: 0 } },
];

/** Every anchor the label style lets a reader choose. */
const LOCATIONS = [
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
    "center",
] as const;

/** How long to wait for a framing before giving up. */
const FRAMING_TIMEOUT_MS = 5000;

/** Room for a cold start, nine anchors and two view modes. */
const CASE_TIMEOUT_MS = 30000;

/** A box, as the element reports one. */
interface Box {
    min: Vector3;
    max: Vector3;
}

describe("zoom-to-fit framing", () => {
    let container: HTMLElement;
    let graph: Graph;
    let framings: number;

    /**
     * Build a graph from the given nodes and lay it out where they say.
     * @param nodes - The nodes.
     * @param viewMode - "2d" for the orthographic camera; the default is the 3D orbit.
     */
    async function build(nodes: typeof NODES, viewMode?: "2d"): Promise<void> {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        framings = 0;
        graph.on("zoom-to-fit-complete", () => {
            framings++;
        });

        await graph.addNodes(nodes);
        await graph.addEdges([{ src: "a", dst: "b" }]);
        await graph.setLayout("fixed", { dim: 3 });
        if (viewMode) {
            await graph.setViewMode(viewMode);
        }
        await graph.operationQueue.waitForCompletion();
    }

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Let the element draw a few frames.
     * @param frames - How many.
     */
    async function draw(frames = 5): Promise<void> {
        for (let at = 0; at < frames; at++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, 10);
            });
        }
    }

    /**
     * Ask the element to fit the graph and wait for it to do so.
     * @returns The box it framed.
     */
    async function frame(): Promise<Box> {
        await graph.operationQueue.waitForCompletion();

        const box = await new Promise<Box>((done, fail) => {
            const timer = setTimeout(() => {
                off();
                fail(new Error("the element never framed the graph"));
            }, FRAMING_TIMEOUT_MS);

            const off = graph.on("zoom-to-fit-complete", (event) => {
                if (
                    !("boundingBoxMin" in event) ||
                    !(event.boundingBoxMin instanceof Vector3) ||
                    !(event.boundingBoxMax instanceof Vector3)
                ) {
                    return;
                }

                clearTimeout(timer);
                off();
                done({ min: event.boundingBoxMin.clone(), max: event.boundingBoxMax.clone() });
            });

            graph.zoomToFit();
        });

        // Let the frame that applied the framing finish, then let the camera come to rest.
        await draw();

        return box;
    }

    /**
     * Put a label with the given words and style on every node.
     * @param text - The words.
     * @param style - The typography and anchor.
     */
    async function label(text: string, style: LabelStyle = {}): Promise<void> {
        const layer = graph
            .getSession()
            .styles.list()
            .find((entry) => entry.name === "labels");
        const set = { "node.label": text, "node.labelStyle": style };

        if (layer) {
            await graph.getSession().styles.update(layer.id, { set });
        } else {
            await graph.getSession().styles.add({
                name: "labels",
                target: "node",
                selector: { match: "everything" },
                set,
            });
        }

        await graph.operationQueue.waitForCompletion();

        // A label is built by the frame that next updates its node.
        await draw();

        assert.isOk(graph.getNode("a")?.label?.labelMesh, "the label was drawn");
    }

    /**
     * Give the one edge a label and arrow captions.
     * @param text - The words on all three.
     */
    async function edgeLabel(text: string): Promise<void> {
        await graph.getSession().styles.add({
            name: "edge labels",
            target: "edge",
            selector: { match: "everything" },
            set: {
                "edge.label": text,
                "edge.arrowHead": "normal",
                "edge.arrowHeadText": text,
                "edge.arrowTail": "normal",
                "edge.arrowTailText": text,
            },
        });
        await graph.operationQueue.waitForCompletion();
        await draw();
    }

    /**
     * The world bounds of every label plane on screen, keyed by what it belongs to.
     * @returns The bounds.
     */
    function labelBounds(): Map<string, Box> {
        const bounds = new Map<string, Box>();

        for (const node of graph.getNodes()) {
            const mesh = node.label?.labelMesh;
            if (mesh) {
                mesh.computeWorldMatrix(true);
                const { minimumWorld, maximumWorld } = mesh.getBoundingInfo().boundingBox;
                bounds.set(`node ${String(node.id)}`, { min: minimumWorld.clone(), max: maximumWorld.clone() });
            }
        }

        for (const edge of graph.getLayoutManager().edges) {
            for (const [what, rich] of [
                ["label", edge.label],
                ["arrow head", edge.arrowHeadText],
                ["arrow tail", edge.arrowTailText],
            ] as const) {
                const mesh = rich?.labelMesh;
                if (mesh) {
                    mesh.computeWorldMatrix(true);
                    const { minimumWorld, maximumWorld } = mesh.getBoundingInfo().boundingBox;
                    bounds.set(`edge ${what}`, { min: minimumWorld.clone(), max: maximumWorld.clone() });
                }
            }
        }

        return bounds;
    }

    /**
     * Assert a box takes in another.
     * @param outer - The box that must contain the other.
     * @param inner - The box inside it.
     * @param what - The inner box, for the message.
     */
    function assertContains(outer: Box, inner: Box, what: string): void {
        for (const axis of ["x", "y", "z"] as const) {
            assert.isAtMost(outer.min[axis], inner.min[axis] + 1e-4, `${what}: min ${axis} is inside the box`);
            assert.isAtLeast(outer.max[axis], inner.max[axis] - 1e-4, `${what}: max ${axis} is inside the box`);
        }
    }

    /**
     * The camera, as a string two states can be compared by.
     * @returns The state.
     */
    function camera(): string {
        return JSON.stringify(graph.getCameraState());
    }

    describe("the box", () => {
        beforeEach(async () => {
            await build(NODES);
        });

        it("is the nodes out to their size when nothing is labelled", async () => {
            const box = await frame();
            const half = (graph.getNode("a")?.size ?? 0) / 2;

            assert.closeTo(box.min.x, -4 - half, 1e-4);
            assert.closeTo(box.max.x, 4 + half, 1e-4);
            assert.closeTo(box.min.y, 0 - half, 1e-4);
            assert.closeTo(box.max.y, 3 + half, 1e-4);
        });

        it(
            "takes in every node label wherever it is anchored, and reaches past the nodes on that side",
            async () => {
                for (const location of LOCATIONS) {
                    await label(`A label at ${location}`, { location });
                    const box = await frame();
                    const nodesOnly = nodeFramingBox(graph.getNodes());
                    assert.isDefined(nodesOnly);

                    for (const [what, bounds] of labelBounds()) {
                        assertContains(box, bounds, `${location}: ${what}`);
                    }

                    if (location.includes("top")) {
                        assert.isAbove(box.max.y, nodesOnly.max.y, `${location}: the box grew upwards`);
                    }
                    if (location.includes("bottom")) {
                        assert.isBelow(box.min.y, nodesOnly.min.y, `${location}: the box grew downwards`);
                    }
                    if (location.includes("left")) {
                        assert.isBelow(box.min.x, nodesOnly.min.x, `${location}: the box grew to the left`);
                    }
                    if (location.includes("right")) {
                        assert.isAbove(box.max.x, nodesOnly.max.x, `${location}: the box grew to the right`);
                    }
                }
            },
            CASE_TIMEOUT_MS,
        );

        it("reaches as far as an offset pushes a label", async () => {
            await label("Far", { location: "top", attachOffset: 3 });
            const box = await frame();
            const nodesOnly = nodeFramingBox(graph.getNodes());
            assert.isDefined(nodesOnly);

            // The label's bottom edge sits the offset above the node; the plane is on top of that.
            assert.isAtLeast(box.max.y, nodesOnly.max.y + 3, "the box reaches the offset label");
        });

        it("takes in an edge's label and arrow captions", async () => {
            await edgeLabel("A caption long enough to stick out");
            const box = await frame();
            const bounds = labelBounds();

            assert.sameMembers([...bounds.keys()], ["edge label", "edge arrow head", "edge arrow tail"]);
            for (const [what, each] of bounds) {
                assertContains(box, each, what);
            }
        });

        it("is the box the exported function measures", async () => {
            await label("Words", { location: "bottom-right" });
            await edgeLabel("More words");
            const box = await frame();
            const measured = framingBox(graph.getNodes(), graph.getLayoutManager().edges);
            assert.isDefined(measured);

            for (const axis of ["x", "y", "z"] as const) {
                assert.closeTo(box.min[axis], measured.min[axis], 1e-6, `min ${axis}`);
                assert.closeTo(box.max[axis], measured.max[axis], 1e-6, `max ${axis}`);
            }
        });

    });

    for (const viewMode of [undefined, "2d"] as const) {
        const mode = viewMode ?? "3d";

        describe(`every label stays on screen in ${mode}`, () => {
            it(
                "after zoom-to-fit on a small graph, at every anchor",
                async () => {
                    await build(PILED, viewMode);

                    for (const location of LOCATIONS) {
                        await label(`Label ${location}`, { location });
                        await frame();

                        const scene = graph.getScene();
                        const engine = scene.getEngine();
                        const width = engine.getRenderWidth();
                        const height = engine.getRenderHeight();
                        const camera = scene.activeCamera;
                        assert.isNotNull(camera);
                        const viewport = camera.viewport.toGlobal(width, height);

                        for (const [what, bounds] of labelBounds()) {
                            for (const corner of [bounds.min, bounds.max]) {
                                const on = Vector3.Project(
                                    corner,
                                    Matrix.Identity(),
                                    scene.getTransformMatrix(),
                                    viewport,
                                );
                                assert.isAtLeast(on.x, 0, `${location}: ${what} is inside the left edge`);
                                assert.isAtMost(on.x, width, `${location}: ${what} is inside the right edge`);
                                assert.isAtLeast(on.y, 0, `${location}: ${what} is inside the top edge`);
                                assert.isAtMost(on.y, height, `${location}: ${what} is inside the bottom edge`);
                            }
                        }
                    }
                },
                CASE_TIMEOUT_MS,
            );
        });

        describe(`a label edit after the graph has settled, in ${mode}`, () => {
            beforeEach(async () => {
                await build(NODES, viewMode);
                await label("Before", { location: "top" });
                await frame();
                await draw();
            });

            const edits: [string, string, LabelStyle][] = [
                ["the words", "A much longer label\nover two lines", { location: "top" }],
                ["the colour", "Before", { location: "top", color: "#ff0000" }],
                ["the size", "Before", { location: "top", sizePx: 96 }],
                ["the anchor, bottom", "Before", { location: "bottom" }],
                ["the anchor, left", "Before", { location: "left" }],
                ["the anchor, right", "Before", { location: "right" }],
                ["the offset", "Before", { location: "top", attachOffset: 4 }],
            ];

            for (const [what, text, style] of edits) {
                it(`leaves the camera where it was when ${what} changes`, async () => {
                    const before = camera();
                    const framed = framings;

                    await label(text, style);
                    await draw(10);

                    assert.strictEqual(framings, framed, "the element did not re-frame the graph");
                    assert.strictEqual(camera(), before, "the camera has not moved");
                });
            }
        });
    }
});
