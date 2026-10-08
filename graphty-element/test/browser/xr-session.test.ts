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
 * test enters VR with emulated hands and checks that both are tracked and drawn. The VR and AR
 * tests run with both emulated controllers connected, which once made Babylon download a
 * controller model from controllers.babylonjs.com.
 */
import "../../src/graphty-element";

import { type AbstractMesh, UtilityLayerRenderer, WebXRHandJoint } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { type Graph, operationQueueOf } from "../../src/Graph";
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
 * Babylon's default WebXR enter/exit button, wherever Babylon put it (next to the canvas).
 * @returns the button, or null
 */
function babylonXRButton(): Element | null {
    return xrControl(".babylonVRicon") ?? document.querySelector(".babylonVRicon");
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
    await operationQueueOf(element.graph).waitForCompletion();
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

            // Only the element's own controls: Babylon's default enter/exit button stays out.
            assert.isNull(babylonXRButton(), "Babylon's default XR button was drawn");

            assert.strictEqual(iwer.sessions.length, 1, "exactly one session should have been requested");
            const [record] = iwer.sessions;

            assert.strictEqual(record.mode, mode);
            assert.strictEqual(record.session.environmentBlendMode, blend);
            assert.strictEqual(graph.getViewMode(), viewMode, "the element fell back instead of entering XR");
            assert.strictEqual(graph.getXRSessionManager()?.getActiveMode(), mode);

            await vi.waitFor(() => {
                assert.isAtLeast(record.frames, MIN_XR_FRAMES, "the session is not rendering XR frames");
            }, WAIT);

            // Both emulated controllers are connected and get a motion controller, the point at
            // which Babylon would fetch a controller model if the element let it.
            await vi.waitFor(() => {
                const controllers = graph.getXRSessionManager()?.getXRHelper()?.input.controllers ?? [];

                assert.lengthOf(controllers, 2, "the emulated controllers are not tracked");
                for (const controller of controllers) {
                    assert.exists(controller.motionController, "a controller has no motion controller");
                }
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

            // A step recorded in the headset says so, with the session it belongs to.
            await element.session.data.addNodes([{ id: "added-in-xr" }]);
            const inside = element.session.history.steps.at(-1)?.provenance.xr;
            assert.match(
                inside ?? "",
                new RegExp(`^${viewMode}:\\d{4}-\\d{2}-\\d{2}T`),
                "the step carries the session",
            );

            await element.setViewMode("3d");

            await vi.waitFor(() => {
                assert.isTrue(record.ended, "the XR session did not end");
            }, WAIT);
            assert.isNull(graph.getXRSessionManager()?.getActiveMode(), "the session manager still holds a session");
            assert.strictEqual(graph.getViewMode(), "3d");
            await element.session.data.addNodes([{ id: "added-after-xr" }]);
            assert.notProperty(
                element.session.history.steps.at(-1)?.provenance ?? {},
                "xr",
                "and one after it does not",
            );

            assert.isNull(babylonXRButton(), "Babylon's default XR button was left on the canvas");

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

/**
 * Attach an element with the default XR configuration and wait for its graph to hold nodes.
 * @param created - an element already created and not yet attached, or none to create one
 * @returns the element's graph
 */
async function mountDefaultGraph(created?: HTMLElementTagNameMap["graphty-element"]): Promise<Graph> {
    element = created ?? document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    element.layout = "circular";
    document.body.append(element);
    element.nodeData = NODES;
    element.edgeData = EDGES;
    await operationQueueOf(element.graph).waitForCompletion();
    await vi.waitFor(() => {
        assert.isAbove([...element.graph.getNodes()].length, 0, "the graph never loaded its nodes");
    }, WAIT);

    return element.graph;
}

describe("session.capabilities.xr", () => {
    test("says there is no WebXR when the browser has none", async () => {
        iwer.uninstall();
        Object.defineProperty(navigator, "xr", { value: undefined, configurable: true });

        await mountDefaultGraph();

        assert.deepEqual(element.session.capabilities.xr, {
            vr: false,
            ar: false,
            reasons: { vr: "no-webxr", ar: "no-webxr" },
            active: null,
        });
        assert.isFalse(await element.graph.isVRSupported(), "isVRSupported reads the same fact");
    });

    test("asks the browser after the first frame, never from the getter, and announces the answer", async () => {
        const { xr } = navigator;
        assert.exists(xr);
        let asked = 0;
        const original = xr.isSessionSupported.bind(xr);
        xr.isSessionSupported = (mode: XRSessionMode) => {
            asked++;
            return original(mode);
        };

        element = document.createElement("graphty-element");
        const seen: (typeof element.session.capabilities)[] = [];
        element.session.on("capabilities:changed", ({ capabilities }) => {
            seen.push(capabilities);
        });
        assert.strictEqual(element.session.capabilities.xr.reasons.vr, "probing");
        assert.strictEqual(asked, 0, "reading session.capabilities asked the browser");

        await mountDefaultGraph(element);
        await vi.waitFor(() => {
            assert.isTrue(element.session.capabilities.xr.vr, "VR never became available");
        }, WAIT);

        assert.isAbove(asked, 0);
        assert.isTrue(
            seen.some((capabilities) => capabilities.xr.vr && capabilities.xr.reasons.vr === null),
            "capabilities:changed never carried the answer",
        );
        assert.isTrue(element.session.capabilities.xr.ar);
        assert.isNull(element.session.capabilities.xr.active);
    });

    test("stops listening on navigator.xr when the element leaves the page", async () => {
        const { xr } = navigator;
        assert.exists(xr);
        const added = vi.spyOn(xr, "addEventListener");
        const removed = vi.spyOn(xr, "removeEventListener");
        const deviceChange = (calls: readonly (readonly unknown[])[]): unknown[] =>
            calls.filter(([type]) => type === "devicechange").map(([, listener]) => listener);

        await mountDefaultGraph();
        const listening = deviceChange(added.mock.calls);
        assert.isNotEmpty(listening, "the element never listened for WebXR device changes");

        element.remove();

        // A listener left on navigator.xr keeps the removed element's whole graph alive.
        assert.sameMembers(deviceChange(removed.mock.calls), listening, "a devicechange listener outlived the element");
    });

    test("answers unsupported when the browser never answers, within 1500 ms", async () => {
        const { xr } = navigator;
        assert.exists(xr);
        let askedAt = 0;
        xr.isSessionSupported = () => {
            askedAt ||= performance.now();
            return new Promise<boolean>(() => undefined);
        };

        await mountDefaultGraph();
        let settledAt = 0;
        element.session.on("capabilities:changed", ({ capabilities }) => {
            if (capabilities.xr.reasons.vr === "unsupported") {
                settledAt ||= performance.now();
            }
        });
        await vi.waitFor(() => {
            assert.strictEqual(element.session.capabilities.xr.reasons.vr, "unsupported");
        }, WAIT);

        assert.isAbove(askedAt, 0, "the browser was never asked");
        assert.isAtMost(settledAt - askedAt, 1500 + 250, "the probe was not bounded");
        assert.deepEqual(element.session.capabilities.xr.reasons, { vr: "unsupported", ar: "unsupported" });
    });

    test("allocates nothing for XR and draws no buttons until a session is entered", async () => {
        const graph = await mountDefaultGraph();
        await vi.waitFor(() => {
            assert.isTrue(element.session.capabilities.xr.vr);
        }, WAIT);

        assert.exists(graph.getXRSessionManager(), "XR is on by default");
        assert.isNull(graph.getXRSessionManager()?.getXRHelper() ?? null, "a WebXR helper was built");
        assert.notExists(graph.scene.metadata?.xrHelper, "the scene holds a WebXR helper");
        assert.isFalse(
            graph.scene.cameras.some((camera) => camera.getClassName() === "WebXRCamera"),
            "the scene holds an XR camera",
        );
        assert.isNull(xrControl("[data-xr-mode]"), "the canvas has an XR button by default");
        assert.isNull(xrControl(".xr-button-overlay"), "the canvas has an XR overlay by default");
    });

    test(
        "view.immersive from 2D switches to 3D in the same step, and one undo returns to 2D",
        async () => {
            const graph = await mountDefaultGraph();
            await element.session.execute({ op: "view.dimension", dimension: "2d" });
            assert.strictEqual(graph.getViewMode(), "2d");

            await element.session.execute({ op: "view.immersive", mode: "vr" });
            assert.strictEqual(graph.getViewMode(), "vr");
            assert.strictEqual(element.session.capabilities.xr.active, "vr");
            assert.strictEqual(element.session.history.steps.at(-1)?.label, "Switched to 3D for VR");

            await element.session.undo();
            await vi.waitFor(() => {
                assert.isTrue(iwer.sessions[0]?.ended, "undo did not end the session");
            }, WAIT);
            assert.strictEqual(graph.getViewMode(), "2d");
            assert.isNull(element.session.capabilities.xr.active);
        },
        TEST_TIMEOUT,
    );

    test(
        "announces the headset ending the session itself",
        async () => {
            const graph = await mountDefaultGraph();
            await element.session.execute({ op: "view.immersive", mode: "vr" });
            const [record] = iwer.sessions;
            const actives: ("vr" | "ar" | null)[] = [];
            element.session.on("capabilities:changed", ({ capabilities }) => {
                actives.push(capabilities.xr.active);
            });

            await record.session.end();

            await vi.waitFor(() => {
                assert.include(actives, null, "capabilities:changed never said the session ended");
            }, WAIT);
            assert.isNull(element.session.capabilities.xr.active);
            assert.isNull(graph.getXRSessionManager()?.getActiveMode() ?? null);
            await vi.waitFor(() => {
                assert.strictEqual(graph.getViewMode(), "3d");
            }, WAIT);
        },
        TEST_TIMEOUT,
    );

    test("reports a refused entry as graph-error, without alert()", async () => {
        const { xr } = navigator;
        assert.exists(xr);
        xr.requestSession = () => Promise.reject(new Error("the runtime refused"));
        const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
        await mountDefaultGraph();
        const contexts: string[] = [];
        element.on("error", (event) => {
            contexts.push((event as { context?: string }).context ?? "");
        });

        let rejected = false;
        try {
            await element.session.execute({ op: "view.immersive", mode: "vr" });
        } catch {
            rejected = true;
        }

        assert.isTrue(rejected);
        assert.include(contexts, "xr");
        assert.strictEqual(alert.mock.calls.length, 0);
        alert.mockRestore();
    });
});
