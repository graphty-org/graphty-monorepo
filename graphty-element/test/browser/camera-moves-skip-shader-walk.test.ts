/**
 * @file A camera move does not ask every mesh whether its shader is ready.
 *
 * Until a finished frame is drawn, graphty-element asks every drawn mesh `isReady(true)`, so a frame that skipped
 * a mesh still compiling is never called final. A camera move unfinished the frame, and the walk ran again on each
 * frame after it -- twice a frame, about 43 ms a frame at 10,000 labeled nodes -- although a camera move brings no
 * new shader. The answer is now kept until the scene's content changes. Counted, not timed: the readiness questions
 * over camera moves, and that a change of the picture's content still asks them.
 */

import "../../src/graphty-element";

import { Mesh, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const COUNT = 40;
const NODES = Array.from({ length: COUNT }, (_unused, index) => ({ id: `n${String(index)}` }));
const EDGES = NODES.map((node, index) => ({ src: node.id, dst: NODES[(index * 7 + 3) % COUNT].id }));
const MOVES = 6;

describe("a camera move and the shader readiness walk", () => {
    let container: HTMLDivElement;
    let element: Graphty;
    let walked = 0;
    let isReady: Mesh["isReady"];
    let sceneIsReady: Scene["isReady"];
    let inSceneCheck = false;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "100%";
        element.style.height = "100%";
        container.appendChild(element);
        element.nodeData = NODES;
        element.edgeData = EDGES;
        await element.session.styles.add({
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "a label" },
        });
        await element.session.layout.set("circular");
        await element.waitForStableFrame();

        // Babylon's own render asks `isReady()` with no argument; the readiness walk asks `isReady(true)`. Babylon's
        // own `Scene.isReady` (asked once by a freeze of the drawn list, after the camera rests) is not this walk.
        ({ isReady } = Mesh.prototype);
        sceneIsReady = Scene.prototype.isReady;
        walked = 0;
        Scene.prototype.isReady = function (this: Scene, checkRenderTargets?: boolean): boolean {
            inSceneCheck = true;
            try {
                return sceneIsReady.call(this, checkRenderTargets);
            } finally {
                inSceneCheck = false;
            }
        };
        Mesh.prototype.isReady = function (this: Mesh, completeCheck?: boolean, forceInstances?: boolean): boolean {
            if (completeCheck === true && !inSceneCheck) {
                walked++;
            }

            return isReady.call(this, completeCheck, forceInstances);
        };
    });

    afterEach(() => {
        Mesh.prototype.isReady = isReady;
        Scene.prototype.isReady = sceneIsReady;
        element.remove();
        container.remove();
    });

    it("asks no mesh again over camera moves, and asks again after a style change", async () => {
        for (let move = 0; move < MOVES; move++) {
            await element.setCameraState({
                position: { x: 30 + move * 5, y: 20, z: 60 - move * 4 },
                target: { x: 0, y: 0, z: 0 },
            });
            await element.waitForStableFrame();
            // The first move may find the answer from before it stale; none after it asks again.
            if (move === 0) {
                walked = 0;
            }
        }

        assert.strictEqual(walked, 0, "camera moves after the first asked no mesh whether its shader is ready");

        await element.session.styles.add({
            name: "tint",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff8800" },
        });
        await element.waitForStableFrame();
        assert.isAbove(walked, 0, "a style change asks the meshes again before the frame is final");
    });
});
