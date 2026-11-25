/**
 * @file An XR session keeps drawing when a controller sits in the plane of the eyes, and when a
 * step of its frame throws (issue #9919).
 *
 * A controller exactly level with the eyes projects to a screen point at infinity. Babylon's laser
 * passes that point into a pointer event, which the browser refuses to build, and the throw used to
 * stop the session's frame loop for good.
 */

import "../../src/graphty-element";

import type { PointerInfo } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { installIWER, type IWERHandle } from "../interactions/helpers/iwer-setup";

let iwer: IWERHandle;
let element: Graphty;

beforeEach(() => {
    iwer = installIWER();
});

afterEach(() => {
    element.remove();
    iwer.uninstall();
});

/**
 * Open the element in VR with nodes in front of the headset, drawn on a render path.
 * @param path - The render path to draw with.
 */
async function inVR(path: "objects" | "batched"): Promise<void> {
    element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    element.xr = { enabled: true, ui: { enabled: true, showAvailabilityWarning: false } };
    document.body.append(element);
    await element.updateComplete;
    await element.session.data.addNodes(
        Array.from({ length: 12 }, (_, id) => ({
            id,
            position: { x: (id % 4) - 1.5, y: Math.floor(id / 4) + 1, z: 4 },
        })),
    );
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    element.graph.setRenderPath(path);
    await element.setViewMode("vr");
    await drawnFrames(element.graph.getScene(), 4);
}

/**
 * Put both controllers somewhere, pointing straight ahead.
 * @param z - How far in front of the eyes, in meters along WebXR's -z; 0 is the plane of the eyes.
 */
function controllersAt(z: number): void {
    // Above and to the left of the eyes: in the plane of the eyes both screen coordinates are -Infinity,
    // which Babylon's own check lets through.
    iwer.device.controllers.left?.position.set(-0.5, 1.9, -z);
    iwer.device.controllers.right?.position.set(-0.3, 1.9, -z);
}

/**
 * Count the XR pointer moves the scene receives, with their screen coordinates.
 * @returns The moves received so far.
 */
function xrPointerMoves(): { x: number; y: number }[] {
    const moves: { x: number; y: number }[] = [];
    element.graph.getScene().onPointerObservable.add((info: PointerInfo) => {
        const event = info.event as PointerEvent;
        if (event.pointerType === "xr" && event.type === "pointermove") {
            moves.push({ x: event.screenX, y: event.screenY });
        }
    });
    return moves;
}

describe.each(["objects", "batched"] as const)("an XR session on the %s path", (path) => {
    it("keeps drawing with a controller in the plane of the eyes, and the pointer recovers", async () => {
        await inVR(path);
        const scene = element.graph.getScene();
        const errors: unknown[] = [];
        element.on("error", (event) => {
            errors.push(event);
        });

        controllersAt(0);
        const record = iwer.sessions.at(-1);
        assert.exists(record);
        const before = record.frames;
        await drawnFrames(scene, 10);
        assert.isAbove(record.frames, before, "the session stopped drawing");
        assert.isFalse(record.ended);

        const moves = xrPointerMoves();
        controllersAt(0.3);
        await drawnFrames(scene, 4);
        await vi.waitFor(() => {
            const last = moves.at(-1);
            assert.exists(last, "no XR pointer move reached the scene");
            assert.isTrue(Number.isFinite(last.x) && Number.isFinite(last.y), "the pointer is still off screen");
        });
        assert.isEmpty(errors, "a controller in the plane of the eyes is not an error");
    });

    it("reports a step of the XR frame that throws as E_XR_FRAME_FAILED and keeps drawing", async () => {
        await inVR(path);
        const scene = element.graph.getScene();
        const reported: { code?: string; context?: string }[] = [];
        element.on("error", (event) => {
            const { error, context } = event as { error?: { code?: string }; context?: string };
            reported.push({ code: error?.code, context });
        });

        const frames = element.graph.getXRSessionManager()?.getXRHelper()?.baseExperience
            .sessionManager.onXRFrameObservable;
        assert.exists(frames);
        frames.add(() => {
            throw new Error("an XR frame observer failed");
        });
        const record = iwer.sessions.at(-1);
        assert.exists(record);
        const before = record.frames;
        await drawnFrames(scene, 10);
        assert.isAbove(record.frames, before + 5, "the session stopped drawing");
        // Reported once, not once a frame.
        assert.deepEqual(reported, [{ code: "E_XR_FRAME_FAILED", context: "xr" }]);
    });
});
