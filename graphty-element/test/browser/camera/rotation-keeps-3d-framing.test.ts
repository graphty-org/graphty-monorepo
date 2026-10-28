/**
 * @file A placement that only turns the camera keeps the framing a switch to 3D still owes.
 *
 * A switch to 3D first frames the camera on the compact starting layout, and the framing of the
 * settled layout arrives later with a pending zoom to fit. A placement that only sets the
 * rotation answers nothing about where the camera stands or how far away it is, so it must not
 * withdraw that zoom to fit: before the fix, turning the camera on the next frame left it about
 * 6.5x too close (issue #3153).
 */
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../../src/Graph";
import { nextFrame } from "../../helpers/real-input";

const NODES = Array.from({ length: 40 }, (_, i) => ({ id: i }));
const EDGES = NODES.slice(1).map((node, i) => ({ id: `e${i}`, source: Math.floor(i / 2), target: node.id }));

describe("a camera turn after a switch to 3D", () => {
    let graph: Graph;
    let container: HTMLDivElement;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "400px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.setLayout("ngraph", { seed: 7 });
        await graph.waitForSettled();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Switch to 3D, optionally turn the camera on the next frame, and let the layout settle.
     * @param turn - Place a rotation-only camera state on the frame after the switch.
     * @returns The camera distance once everything settled.
     */
    async function switchTo3d(turn: boolean): Promise<number> {
        await graph.setViewMode("3d");
        if (turn) {
            await nextFrame();
            await graph.setCameraState({ pivotRotation: { x: 0.3, y: 0.8, z: 0 } });
        }

        await graph.waitForSettled();
        await graph.waitForStableFrame();
        const distance = graph.getCameraState().cameraDistance;
        assert.isDefined(distance);
        return distance;
    }

    it("frames the settled graph on every 2D -> 3D switch, as a switch with no turn does", async () => {
        const untouched = await switchTo3d(false);
        await graph.setViewMode("2d");
        await graph.waitForSettled();
        const first = await switchTo3d(true);
        await graph.setViewMode("2d");
        await graph.waitForSettled();
        const second = await switchTo3d(true);

        assert.closeTo(first, untouched, untouched * 0.1, "the turn withdrew the 3D framing");
        assert.closeTo(second, untouched, untouched * 0.1, "a second switch framed the graph differently");
    });
});
