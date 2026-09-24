/**
 * @file Zoom-to-fit frames the nodes, never the label text.
 *
 * A label plane's size depends on its text, font size and the machine's font metrics. When the
 * framing box included label meshes, editing one label moved the camera pivot and distance, and
 * the same layout framed differently on two machines. The box is now the visible nodes plus a
 * fixed margin, so it is a function of node positions and sizes only.
 */

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { FRAMING_MARGIN, nodeFramingBox } from "../../src/managers/UpdateManager";

/** Three nodes at fixed places, so the only thing that can change the framing is the labels. */
const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
    { id: "c", position: { x: 0, y: 3, z: 0 } },
];

/** How long to wait for a framing before giving up. */
const FRAMING_TIMEOUT_MS = 5000;

/** A framing: the box the element reported, and the camera's view matrix after it. */
interface Framing {
    min: Vector3;
    max: Vector3;
    view: number[];
}

describe("zoom-to-fit framing", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.setLayout("fixed", { dim: 3 });
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Ask the element to fit the graph and wait for it to do so.
     * @returns The box it framed and where the camera ended up.
     */
    async function frame(): Promise<Framing> {
        await graph.operationQueue.waitForCompletion();

        const box = await new Promise<{ min: Vector3; max: Vector3 }>((done, fail) => {
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

        // Let the frame that applied the framing finish, then read the camera.
        graph.scene.render();
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera);

        return { ...box, view: Array.from(camera.getViewMatrix(true).asArray()) };
    }

    /**
     * Put a label with the given text on every node.
     * @param text - The words.
     */
    async function label(text: string): Promise<void> {
        const layer = graph
            .getSession()
            .styles.list()
            .find((entry) => entry.name === "labels");

        if (layer) {
            await graph.getSession().styles.update(layer.id, { set: { "node.label": text } });
        } else {
            await graph.getSession().styles.add({
                name: "labels",
                target: "node",
                selector: { match: "everything" },
                set: { "node.label": text },
            });
        }

        await graph.operationQueue.waitForCompletion();

        // A label is built by the frame that next updates its node.
        for (let frame = 0; frame < 5; frame++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, 10);
            });
        }

        assert.isOk(graph.getNode("a")?.label?.labelMesh, "the label was drawn");
    }

    /**
     * Assert two framings are the same box and the same camera.
     * @param actual - The framing under test.
     * @param expected - The framing it must match.
     * @param what - What is being compared, for the message.
     */
    function assertSameFraming(actual: Framing, expected: Framing, what: string): void {
        for (const axis of ["x", "y", "z"] as const) {
            assert.closeTo(actual.min[axis], expected.min[axis], 1e-6, `${what}: box min ${axis}`);
            assert.closeTo(actual.max[axis], expected.max[axis], 1e-6, `${what}: box max ${axis}`);
        }

        actual.view.forEach((value, index) => {
            assert.closeTo(value, expected.view[index], 1e-6, `${what}: camera view matrix [${String(index)}]`);
        });
    }

    it("frames the visible nodes plus a fixed margin", async () => {
        const framing = await frame();
        const expected = nodeFramingBox(graph.getNodes());
        assert.isDefined(expected);

        for (const axis of ["x", "y", "z"] as const) {
            assert.closeTo(framing.min[axis], expected.min[axis], 1e-6);
            assert.closeTo(framing.max[axis], expected.max[axis], 1e-6);
        }

        // Node a sits at x = -4 and is size 1, so the box reaches half a node plus the margin past it.
        const half = (graph.getNode("a")?.size ?? 0) / 2;
        assert.closeTo(framing.min.x, -4 - half - FRAMING_MARGIN, 1e-4);
        assert.closeTo(framing.max.y, 3 + half + FRAMING_MARGIN, 1e-4);
    });

    it("frames the same box with labels as without them", async () => {
        const bare = await frame();

        await label("A label wide enough to reach well past every node in this graph");
        const labelled = await frame();

        assertSameFraming(labelled, bare, "labels added");
    });

    it("leaves the camera where it was when a label's text changes", async () => {
        await label("x");
        const short = await frame();

        await label("A much longer label\nover two lines");
        const long = await frame();

        assertSameFraming(long, short, "label text changed");
    });
});
