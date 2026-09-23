/**
 * A real immersive session, entered and left through the element's public API.
 *
 * Every other XR test drives the gesture maths or the button overlay without a WebXR runtime, so
 * nothing proved that `setViewMode("vr")` or `setViewMode("ar")` actually starts a session the
 * graph renders into, or that `setViewMode("3d")` ends it and gives the orbit camera back. IWER
 * emulates a Meta Quest 3 as the page's `navigator.xr`, which is enough for headless Chromium to
 * run both kinds of session and render XR frames.
 *
 * Nothing may touch the network in CI, so hand tracking is turned off (with it on the element
 * downloads hand meshes from assets.babylonjs.com) and the emulated controllers are disconnected
 * (Babylon would download their models from controllers.babylonjs.com).
 */
import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import type { Graph } from "../../src/Graph";
import { installIWER, type IWERHandle } from "../interactions/helpers/iwer-setup";

/** Generous for a swiftshader CI runner; every wait below returns as soon as its condition holds. */
const WAIT = { timeout: 20_000, interval: 50 };

/** Mount, enter, render and leave, each bounded by WAIT, with room to spare. */
const TEST_TIMEOUT = 90_000;

/** XR frames a session must render before it counts as drawing, not just started. */
const MIN_XR_FRAMES = 10;

const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
const EDGES = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
    { source: "c", target: "d" },
];

let iwer: IWERHandle;
let element: HTMLElementTagNameMap["graphty-element"];

beforeEach(() => {
    iwer = installIWER();
    // A connected controller makes Babylon fetch its model from controllers.babylonjs.com, and CI
    // must not need the network. Sessions start and render without input sources.
    for (const controller of Object.values(iwer.device.controllers)) {
        controller.connected = false;
    }
});

afterEach(() => {
    element.remove();
    iwer.uninstall();
});

/**
 * Find something in the element's XR overlay, which the element draws inside its shadow root.
 * @param selector - CSS selector
 * @returns the match, or null
 */
function xrControl(selector: string): Element | null {
    return (element.shadowRoot ?? element).querySelector(selector);
}

/**
 * Attach an element with XR on and hand tracking off, and wait for its XR buttons to appear,
 * which happens at the end of `Graph.init()`.
 * @returns the element's graph
 */
async function mountXRGraph(): Promise<Graph> {
    element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    element.xr = {
        enabled: true,
        ui: { enabled: true, showAvailabilityWarning: true },
        input: { handTracking: false },
    };
    element.layout = "circular";
    document.body.append(element);
    element.nodeData = NODES;
    element.edgeData = EDGES;

    await vi.waitFor(() => {
        assert.isNotNull(xrControl('[data-xr-mode="immersive-ar"]'), "AR button never appeared");
    }, WAIT);
    await element.graph.operationQueue.waitForCompletion();
    await vi.waitFor(() => {
        assert.isAbove([...element.graph.getNodes()].length, 0, "the graph never loaded its nodes");
    }, WAIT);

    return element.graph;
}

describe.each([
    { viewMode: "vr", mode: "immersive-vr", blend: "opaque" },
    { viewMode: "ar", mode: "immersive-ar", blend: "alpha-blend" },
] as const)("setViewMode($viewMode) with an emulated Quest 3", ({ viewMode, mode, blend }) => {
    test(
        "starts a session the graph renders into, and setViewMode('3d') ends it",
        async () => {
            const graph = await mountXRGraph();

            // The element asked the runtime and offered both modes.
            assert.isNotNull(xrControl('[data-xr-mode="immersive-vr"]'), "no VR button");
            assert.isNotNull(xrControl('[data-xr-mode="immersive-ar"]'), "no AR button");
            assert.isNull(xrControl(".webxr-not-available"), "XR is available, yet the element said not");

            await element.setViewMode(viewMode);

            assert.strictEqual(iwer.sessions.length, 1, "exactly one session should have been requested");
            const [record] = iwer.sessions;

            assert.strictEqual(record.mode, mode);
            assert.strictEqual(record.session.environmentBlendMode, blend);
            assert.strictEqual(graph.getViewMode(), viewMode, "the element fell back instead of entering XR");
            assert.strictEqual(graph.getXRSessionManager()?.getActiveMode(), mode);

            await vi.waitFor(() => {
                assert.isAtLeast(record.frames, MIN_XR_FRAMES, "the session is not rendering XR frames");
            }, WAIT);

            const xrCamera = graph.getXRSessionManager()?.getXRCamera();

            assert.exists(xrCamera);
            assert.strictEqual(graph.scene.activeCamera, xrCamera, "the scene is not drawing through the XR camera");
            assert.strictEqual(xrCamera?.getClassName(), "WebXRCamera");

            // Configured off, so the feature that downloads hand meshes must not be running.
            const features = graph.getXRSessionManager()?.getXRHelper()?.baseExperience.featuresManager;

            assert.notInclude(
                features?.getEnabledFeatures() ?? [],
                "xr-hand-tracking",
                "hand tracking ignored its config",
            );

            const nodes = [...graph.getNodes()];

            assert.lengthOf(nodes, NODES.length);
            for (const node of nodes) {
                assert.isFalse(node.mesh.isDisposed(), `node ${String(node.id)} mesh is disposed`);
                assert.isTrue(node.mesh.isEnabled(), `node ${String(node.id)} mesh is disabled`);
                assert.strictEqual(node.mesh.getScene(), graph.scene, `node ${String(node.id)} is not in the scene`);
            }

            await element.setViewMode("3d");

            await vi.waitFor(() => {
                assert.isTrue(record.ended, "the XR session did not end");
            }, WAIT);
            assert.isNull(graph.getXRSessionManager()?.getActiveMode(), "the session manager still holds a session");
            assert.strictEqual(graph.getViewMode(), "3d");

            const orbit = graph.camera.getActiveController()?.camera;

            assert.exists(orbit);
            assert.strictEqual(graph.scene.activeCamera, orbit, "the orbit camera did not come back");
            assert.notStrictEqual(graph.scene.activeCamera, xrCamera);
        },
        TEST_TIMEOUT,
    );
});
