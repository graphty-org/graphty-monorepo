/**
 * A real immersive session, entered and left through the element's public API.
 *
 * Every other XR test drives the gesture maths or the button overlay without a WebXR runtime, so
 * nothing proved that `setViewMode("vr")` or `setViewMode("ar")` actually starts a session the
 * graph renders into, or that `setViewMode("3d")` ends it and gives the orbit camera back. IWER
 * emulates a Meta Quest 3 as the page's `navigator.xr`, which is enough for headless Chromium to
 * run both kinds of session and render XR frames.
 *
 * Nothing may touch the network: every test fails on a request to another host. The hand tracking
 * test enters VR with emulated hands and checks that both are tracked and drawn. The emulated
 * controllers stay disconnected, because Babylon draws a controller with a model it downloads from
 * controllers.babylonjs.com.
 */
import "../../src/graphty-element";

import { type AbstractMesh, UtilityLayerRenderer, WebXRHandJoint } from "@babylonjs/core";
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

/** Every URL the page asked for on a host other than its own, since the test started. */
let foreignRequests: string[] = [];
let restoreNetwork: () => void = () => undefined;

/**
 * Refuse, and record, every XHR or fetch to a host other than the page's. Babylon loads models,
 * shaders and controller profiles through XMLHttpRequest; fetch is covered for completeness.
 * @returns a function that puts XMLHttpRequest and fetch back
 */
function blockForeignRequests(): () => void {
    const { open } = XMLHttpRequest.prototype;
    const originalFetch = window.fetch;
    const check = (url: string | URL): void => {
        const resolved = new URL(String(url), location.href);

        if (resolved.protocol.startsWith("http") && resolved.origin !== location.origin) {
            foreignRequests.push(resolved.href);
            throw new Error(`network request to another host: ${resolved.href}`);
        }
    };

    XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        ...rest: unknown[]
    ): void {
        check(url);
        Reflect.apply(open, this, [method, url, ...rest]);
    };
    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        check(input instanceof Request ? input.url : input);
        return originalFetch(input, init);
    };

    return () => {
        XMLHttpRequest.prototype.open = open;
        window.fetch = originalFetch;
    };
}

beforeEach(() => {
    foreignRequests = [];
    restoreNetwork = blockForeignRequests();
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
    restoreNetwork();
    assert.deepEqual(foreignRequests, [], "the element touched the network");
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
 * Attach an element with XR on, and wait for its XR buttons to appear, which happens at the end
 * of `Graph.init()`.
 * @param handTracking - whether the element's hand tracking is on
 * @returns the element's graph
 */
async function mountXRGraph(handTracking = false): Promise<Graph> {
    element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    element.xr = {
        enabled: true,
        ui: { enabled: true, showAvailabilityWarning: true },
        input: { handTracking },
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

            // Configured off, so the hand tracking feature must not be running.
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

describe("VR with hand tracking on and emulated hands", () => {
    test(
        "tracks and draws both hands without touching the network",
        async () => {
            iwer.device.primaryInputMode = "hand";
            const graph = await mountXRGraph(true);

            await element.setViewMode("vr");
            assert.strictEqual(graph.getXRSessionManager()?.getActiveMode(), "immersive-vr");

            const features = graph.getXRSessionManager()?.getXRHelper()?.baseExperience.featuresManager;
            const handTracking = features?.getEnabledFeature("xr-hand-tracking");

            assert.exists(handTracking, "hand tracking is on in config, but the feature is not running");
            await vi.waitFor(() => {
                for (const handedness of ["left", "right"] as const) {
                    const wrist: AbstractMesh | undefined = handTracking
                        ?.getHandByHandedness(handedness)
                        ?.getJointMesh(WebXRHandJoint.WRIST);

                    assert.exists(wrist, `the ${handedness} hand is not tracked`);
                    assert.isTrue(wrist?.isVisible, `the ${handedness} hand is not drawn`);
                }
            }, WAIT);

            // Near interaction gives each hand a touch orb whose material the element ships.
            await vi.waitFor(() => {
                const orbs = UtilityLayerRenderer.DefaultUtilityLayer.utilityLayerScene.meshes.filter(
                    (mesh) => mesh.name === "PickSphere",
                );

                assert.isNotEmpty(orbs, "near interaction made no touch orbs");
                for (const orb of orbs) {
                    assert.strictEqual(orb.material?.name, "motionControllerTouchMaterial", "orb material not loaded");
                }
            }, WAIT);

            await element.setViewMode("3d");
        },
        TEST_TIMEOUT,
    );
});
