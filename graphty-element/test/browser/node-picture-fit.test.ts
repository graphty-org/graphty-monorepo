/**
 * `shape.labelFitImage`: a node that grows to hold its label holds its picture too, as Graphviz grows a node round its
 * `image` (dot-specimen-images-charts image-fixedsize-false: a 24 pixel picture makes a 20 x 20 point node). The
 * picture's size is only known once it is read, so the node is fitted again then, and the finished picture waits for
 * that: a stable frame never shows the node at the size it had without its picture.
 */
import { afterEach, assert, describe, test, vi } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { attachPendingWork, PendingWork } from "../../src/managers/PendingWork";
import { NodeMesh } from "../../src/meshes/NodeMesh";
import { pictureSize } from "../../src/meshes/pictureSize";
import { asData, styleEveryNode } from "../helpers/testSetup";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

/**
 * A picture of a size, as a local PNG `data:` URL.
 * @param width - its width in pixels
 * @param height - its height in pixels
 * @returns the URL
 */
function picture(width: number, height: number): string {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    assert(context, "a 2D canvas");
    context.fillStyle = "#ff0000";
    context.fillRect(0, 0, width, height);
    return canvas.toDataURL("image/png");
}

describe("a node sized by its picture", () => {
    test("is fitted to the picture once it is read, before the picture is final", async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.append(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");
        await graph.setLayout("fixed", { dim: 2 });
        await graph.addNode(asData({ id: "P", position: { x: 0, y: 0, z: 0 } }));
        const shape = {
            "node.shape": "rectangle",
            "node.width": 0,
            "node.height": 0,
            "node.label": "",
            "node.labelFit": "inside",
            "node.labelFitImage": 0.75,
            "node.labelFitImagePadding": 1,
            "node.imageFit": "none",
        } as const;
        await styleEveryNode(graph, { ...shape, "node.image": picture(24, 16) });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const node = graph.getDataManager().nodes.get("P");
        assert(node, "the node is drawn");
        const per = NodeMesh.extentPerSize({ type: "rectangle" });
        const half = node.drawnHalfExtents;
        // 24 x 16 pixels at 0.75 each, 1 more on each side
        assert.approximately((2 * half.x) / per, 20, 1e-3);
        assert.approximately((2 * half.y) / per, 14, 1e-3);

        // without labelFitImage the picture sizes nothing
        await styleEveryNode(graph, { "node.labelFitImage": 0 }, "no picture fit");
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const bare = graph.getDataManager().nodes.get("P");
        assert(bare, "the node is drawn");
        assert.isBelow((2 * bare.drawnHalfExtents.x) / per, 1);
    });

    test("holds the picture back until every node that asked is fitted to the picture's size", async () => {
        const scene = {};
        const work = new PendingWork();
        attachPendingWork(scene, work);
        const refits: number[] = [];
        const user = {
            isDisposed: (): boolean => false,
            refitPicture: (): void => {
                refits.push(work.epoch);
            },
        };
        const src = picture(24, 16);
        assert.isNull(pictureSize(scene, src, user), "not read yet");
        assert.isFalse(work.idle, "the picture is not final while it is read");
        await vi.waitFor(() => {
            assert.isTrue(work.idle);
        });
        // fitted once, before the hold was released
        assert.lengthOf(refits, 1);
        assert.isBelow(refits[0], work.epoch);
        assert.deepEqual(pictureSize(scene, src, user), { width: 24, height: 16 });
        assert.lengthOf(refits, 1, "a known size asks no refit");
    });
});
