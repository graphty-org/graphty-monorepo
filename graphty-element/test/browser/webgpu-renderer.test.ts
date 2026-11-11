/**
 * @file The renderer a graph is drawn with: WebGL by default, WebGPU when asked for and available.
 *
 * The first half runs everywhere. It pins the default, the refusal of a bad value and of a change
 * once drawing has started, and -- on the five CI shards, which launch Chromium with no WebGPU
 * flags -- that asking for WebGPU where there is none draws with WebGL and says why.
 *
 * The second half needs a WebGPU adapter and runs only when `GRAPHTY_BROWSER_GPU` names a flag set
 * (see `vitest.config.ts`). It draws the same styled scene twice, once per renderer, and holds the
 * two to the same scene objects, the same materials compiled with no error, and the same picture
 * to within a bucketed pixel histogram. The styles are chosen to reach every custom shader the
 * element owns: screen-space lines, patterned lines, animated lines, filled and dot arrow caps,
 * and a node glow.
 */

import "../../src/graphty-element";

import { type Effect, EngineStore, Mesh, Tools, Vector3, WebGPUEngine } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import annotationSessionUrl from "../../../graph-io/test/corpus/styles/cys/cytoscape-tutorials-AnnotationExample.cys?url";
import { GraphtyError } from "../../src/errors";
import { Graph, operationQueueOf } from "../../src/Graph";
import { forgetShaderCompilers, type RenderManager } from "../../src/managers/RenderManager";
import { shadersControllerOf } from "../../src/session/shaders";
import { VULKAN_GLSL_NAMES } from "../../src/shaders/runtime/wrap";
import { defineShader } from "../../src/simple/defineShader";
import { drawnFrames } from "../helpers/drawn-frames";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

/** Which Chromium flag set the run asked for; empty when it asked for none. */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

/** Whether this run has a WebGPU device to talk to. */
const GPU_LANE = ADAPTER !== "";

/** How big the canvas is. */
const WIDTH = 480;
const HEIGHT = 360;

/** Twelve nodes in a ring, each joined to the next and to the one across. */
const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = NODES.flatMap((_, i) => [
    { src: `n${String(i)}`, dst: `n${String((i + 1) % 12)}`, kind: i % 3 === 0 ? "dash" : "plain" },
    ...(i < 6 ? [{ src: `n${String(i)}`, dst: `n${String(i + 6)}`, kind: "animated" }] : []),
]);

/** How far apart two renderings of one pixel may be, per channel, before they count as different. */
const PIXEL_TOLERANCE = 48;

const mounted: { graph: Graph; container: HTMLElement }[] = [];

afterEach(() => {
    for (const { graph, container } of mounted.splice(0)) {
        graph.dispose();
        container.remove();
    }
});

/**
 * Builds a graph asking for a renderer and initialises it.
 * @param renderer - What to ask for; left out, nothing is asked.
 * @returns The graph.
 */
async function open(renderer?: "webgl" | "webgpu" | "auto"): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = `${String(WIDTH)}px`;
    container.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(container);
    const graph = new Graph(container);
    mounted.push({ graph, container });
    if (renderer !== undefined) {
        graph.setRenderer(renderer);
    }

    await graph.init();
    return graph;
}

/**
 * Loads the ring and styles it so every still custom shader the element owns is on screen:
 * screen-space lines, patterned lines, filled and sphere arrow caps, and a node glow.
 * @param graph - The graph to draw.
 */
async function drawStyledRing(graph: Graph): Promise<void> {
    await graph.addNodes(NODES);
    await graph.addEdges(EDGES);
    await graph.setLayout("circular", { scale: 0.3 });
    const { styles } = graph.getSession();
    await styles.add({
        name: "caps",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "normal", "edge.arrowTail": "sphere-dot", "edge.arrowHeadSize": 2 },
    });
    await styles.add({
        name: "dashed",
        target: "edge",
        selector: { match: "expression", where: "data.kind == 'dash'" },
        set: { "edge.style": "dash", "edge.color": "#1f77b4" },
    });
    await styles.add({
        name: "glow",
        target: "node",
        selector: { match: "expression", where: "data.id == 'n0'" },
        set: { "node.glow": "#ff00ff" },
    });
    await operationQueueOf(graph).waitForCompletion();
}

/**
 * Adds the animated edges, the one style whose picture moves from frame to frame, so it is kept
 * out of the pixel comparison and held to its scene objects and shaders instead.
 * @param graph - The graph to draw.
 */
async function animateEdges(graph: Graph): Promise<void> {
    await graph.getSession().styles.add({
        name: "animated",
        target: "edge",
        selector: { match: "expression", where: "data.kind == 'animated'" },
        set: { "edge.animationSpeed": 1, "edge.color": "#d62728" },
    });
    await operationQueueOf(graph).waitForCompletion();
    // Every mesh built and every shader compiled, and then a frame drawn with them: a shader that
    // has not compiled yet reports no failure either.
    await graph.scene.whenReadyAsync();
    await drawnFrames(graph.scene, 1);
}

/**
 * Waits for the picture to be final and takes a screenshot the way the element does.
 *
 * Babylon's own `CreateScreenshotAsync`, the call `captureScreenshot` makes, rather than
 * `captureScreenshot` itself: test/setup.ts replaces that call with a one-pixel stub for every
 * other test, so the real one is imported past the mock here. The PNG is kept under
 * tmp/webgpu-renderer/ for a person to look at.
 * @param graph - The graph to read.
 * @param name - The PNG's name.
 * @returns The RGBA pixels.
 */
async function screenshot(graph: Graph, name: string): Promise<Uint8ClampedArray> {
    await graph.waitForStableFrame();
    const { CreateScreenshotAsync } = await vi.importActual<typeof import("@babylonjs/core")>("@babylonjs/core");
    const camera = graph.scene.activeCamera;
    assert.isNotNull(camera);
    const dataUrl = await CreateScreenshotAsync(graph.engine, camera, { width: WIDTH, height: HEIGHT });
    await commands.writeFile(`tmp/webgpu-renderer/${name}.png`, dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");

    const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height).data;
}

/**
 * The share of pixels that are not the same colour in two pictures, and the share that are ink
 * (not the background) in the first.
 * @param one - The first picture's pixels.
 * @param other - The second's.
 * @returns Both shares, of the whole canvas.
 */
function compare(one: Uint8ClampedArray, other: Uint8ClampedArray): { differ: number; ink: number } {
    let differ = 0;
    let ink = 0;
    for (let at = 0; at < one.length; at += 4) {
        let largest = 0;
        for (let channel = 0; channel < 3; channel++) {
            largest = Math.max(largest, Math.abs(one[at + channel] - other[at + channel]));
        }

        differ += largest > PIXEL_TOLERANCE ? 1 : 0;
        // The default background is #F5F5F5.
        ink += Math.abs(one[at] - 0xf5) + Math.abs(one[at + 1] - 0xf5) + Math.abs(one[at + 2] - 0xf5) > 24 ? 1 : 0;
    }

    const pixels = one.length / 4;
    return { differ: differ / pixels, ink: ink / pixels };
}

/**
 * What the scene holds, as a sorted list of mesh names with their instance counts.
 * @param graph - The graph to read.
 * @returns One line per enabled mesh.
 */
function sceneObjects(graph: Graph): string[] {
    return graph.scene.meshes
        .filter((mesh) => mesh.isEnabled())
        .map((mesh) => {
            const count = mesh instanceof Mesh ? mesh.thinInstanceCount : 0;
            const thin = count > 0 ? ` thin=${String(count)}` : "";
            return `${mesh.getClassName()}:${mesh.name.replace(/[-_]?\d+$/, "")}${thin}`;
        })
        .sort();
}

/**
 * Every material in the scene whose effect failed to compile, by name and error.
 * @param graph - The graph to read.
 * @returns The failures; empty when every shader compiled.
 */
function shaderFailures(graph: Graph): string[] {
    const failures: string[] = [];
    for (const material of graph.scene.materials) {
        const effect = material.getEffect();
        const error = effect?.getCompilationError();
        if (error !== undefined && error !== "") {
            failures.push(`${material.getClassName()} ${material.name}: ${error}`);
        }
    }

    return failures;
}

describe("the renderer a graph is drawn with", () => {
    it("is WebGL unless something else is asked for", async () => {
        const graph = await open();
        assert.deepInclude(graph.rendererStatus, { requested: "webgl", active: "webgl", reason: null, drawing: true });
        assert.notInstanceOf(graph.engine, WebGPUEngine);
    });

    it("refuses a value it does not know, and a change once the graph is drawn", async () => {
        const container = document.createElement("div");
        const graph = new Graph(container);
        mounted.push({ graph, container });

        assert.throws(() => {
            graph.setRenderer("vulkan" as "webgl");
        }, /renderer must be/);
        graph.setRenderer("auto");
        graph.setRenderer("webgl");
        await graph.init();
        assert.throws(() => {
            graph.setRenderer("webgpu");
        }, /chosen once/);
        // Setting the renderer it already has is not a change.
        graph.setRenderer("webgl");
    });

    it("refuses a change while the renderer is still opening", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);
        const graph = new Graph(container);
        mounted.push({ graph, container });

        graph.setRenderer("webgpu");
        const init = graph.init();
        assert.throws(() => {
            graph.setRenderer("webgl");
        }, /chosen once/);
        await init;
        assert.equal(graph.rendererRequest, "webgpu");
        assert.equal(graph.rendererStatus?.requested, "webgpu");
    });

    it("opens nothing when shut down while the renderer is still opening", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);
        const graph = new Graph(container);
        const webgpuEngines = (): number => EngineStore.Instances.filter((e) => e instanceof WebGPUEngine).length;
        const before = webgpuEngines();

        try {
            graph.setRenderer("webgpu");
            const init = graph.init();
            graph.shutdown();
            await init;
            assert.isFalse(graph.initialized);
            assert.equal(webgpuEngines(), before, "a WebGPU engine was left open");
            assert.notInstanceOf(graph.engine, WebGPUEngine);
        } finally {
            container.remove();
        }
    });

    it("builds no node while WebGPU is opening, so nothing is built on a scene about to be thrown away", async () => {
        // An adapter that answers only when told to, so the window in which WebGPU is opening --
        // the adapter, the device and the compiler fetch, hundreds of milliseconds in a browser --
        // is as long as the test needs it to be, on every lane. It answers "no adapter" at the
        // end, so WebGL draws; what is being tested is what happens before that answer.
        let answer: () => void = () => undefined;
        const answered = new Promise<void>((resolve) => {
            answer = resolve;
        });
        // Told when the graph asks for its adapter, which is the moment the renderer is opening.
        let ask: () => void = () => undefined;
        const asked = new Promise<void>((resolve) => {
            ask = resolve;
        });
        Object.defineProperty(navigator, "gpu", {
            configurable: true,
            value: {
                requestAdapter: async (): Promise<null> => {
                    ask();
                    await answered;
                    return null;
                },
            },
        });

        try {
            const container = document.createElement("div");
            document.body.appendChild(container);
            const graph = new Graph(container);
            mounted.push({ graph, container });
            graph.setRenderer("webgpu");

            // Data assigned before the graph is drawn, the way an element's `nodeData` set before
            // it is attached arrives.
            const added = graph.addNodes(NODES);
            const init = graph.init();
            // The renderer is now opening. Give the queued add every chance to run early: turns
            // of the event loop and a frame, all while the adapter has not answered.
            await asked;
            for (let turn = 0; turn < 10; turn++) {
                await new Promise((resolve) => setTimeout(resolve, 0));
            }
            await new Promise((resolve) => requestAnimationFrame(resolve));
            const builtWhileOpening = graph.getDataManager().nodes.size;

            answer();
            await init;
            await added;

            assert.equal(builtWhileOpening, 0, "nodes were built before the renderer was chosen");
            assert.equal(graph.getDataManager().nodes.size, NODES.length);
        } finally {
            Reflect.deleteProperty(navigator, "gpu");
        }
    });

    it("still takes GLSL's built-ins on WebGL where only a constant expression will do", async () => {
        // A helper in their place would be refused here: a constant expression cannot call a function.
        const graph = await open("webgl");
        const added = await graph.getSession().shaders.add(`/* graphty-shader 1
{ "id": "user/webgl-constants", "name": "Constants", "place": "paint" }
*/
const float K = acosh(1.5) + asinh(1.0) + atanh(0.5);
const bool B = isnan(K) || isinf(K);
vec4 shade(NodeInput n) {
    float sizes[int(acosh(4.0))];
    sizes[0] = fillAA(n.uv.x) + acosh(n.color.r + 1.5);
    return vec4(n.color.rgb, B ? 0.0 : K + sizes[0]);
}
`);
        assert.deepEqual(added.ok ? [] : added.problems, []);
    });

    it.skipIf(GPU_LANE)("draws with WebGL and says why when WebGPU is asked for and absent", async () => {
        const graph = await open("webgpu");
        const status = graph.rendererStatus;
        assert.equal(status?.active, "webgl");
        assert.equal(status?.requested, "webgpu");
        assert.isString(status?.reason);
        assert.notInstanceOf(graph.engine, WebGPUEngine);

        // And it still draws.
        await drawStyledRing(graph);
        assert.isAbove(graph.scene.meshes.length, 0);
    });
});

describe("the element's renderer attribute", () => {
    it("is read before the first draw, reflected, and reported through rendererStatus", async () => {
        const host = document.createElement("div");
        host.style.width = `${String(WIDTH)}px`;
        host.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(host);
        const element = document.createElement("graphty-element");
        element.setAttribute("renderer", "auto");
        // An unknown value is refused and the previous one kept, not thrown.
        element.renderer = "vulkan" as "auto";
        assert.equal(element.renderer, "auto");

        let initialized = false;
        element.addEventListener("render-initialized", () => {
            initialized = true;
        });
        host.appendChild(element);
        await element.updateComplete;
        for (let wait = 0; wait < 600 && !(initialized && element.graph.initialized); wait++) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }

        // Babylon imports each shader the first time it compiles it. Removing the element with
        // those imports in flight leaves them to resolve after this file's page has gone, where
        // they reject unhandled -- so the scene is let finish compiling first.
        await element.graph.scene.whenReadyAsync();

        try {
            const status = element.rendererStatus;
            assert.equal(status?.requested, "auto");
            assert.equal(status?.active, GPU_LANE ? "webgpu" : "webgl");
            assert.equal(status?.reason === null, GPU_LANE);
            assert.equal(element.getAttribute("renderer"), "auto");
        } finally {
            element.remove();
            host.remove();
        }
    });
});

/** A shader that compiles on either renderer. */
const TINT = `/* graphty-shader 1
{ "id": "user/swap-tint", "name": "Tint", "place": "paint" }
*/
vec4 shade(NodeInput n) {
    return n.color;
}
`;

/** Where the fixed camera of the swap tests stands and looks. */
const PLACED = { position: { x: 30, y: 20, z: -40 }, target: { x: 1, y: 2, z: 3 } };

/**
 * Asserts two points are the same to within rounding.
 * @param actual - The point found.
 * @param expected - The point wanted.
 * @param what - What it is, for the message.
 */
function assertSamePoint(
    actual: { x: number; y: number; z?: number } | undefined,
    expected: { x: number; y: number; z?: number },
    what: string,
): void {
    assert.isDefined(actual, what);
    const off = Math.hypot(
        (actual?.x ?? 0) - expected.x,
        (actual?.y ?? 0) - expected.y,
        (actual?.z ?? 0) - (expected.z ?? 0),
    );
    assert.isBelow(off, 1e-3, `${what} is ${String(off)} units from where it was set`);
}

/**
 * Starts a graph opening WebGPU and holds it there: the adapter is not asked for until the test
 * lets it, so everything the test does first happens on the scene the swap will throw away.
 * @param before - Done before `init`, the way a page sets things on an element not yet attached.
 * @returns The graph, and a call that lets WebGPU open and waits for the graph to be up on it.
 */
async function holdWebGPUOpening(
    before?: (graph: Graph) => void,
): Promise<{ graph: Graph; finish: () => Promise<void> }> {
    const { gpu } = navigator;
    let release: () => void = () => undefined;
    const released = new Promise<void>((resolve) => {
        release = resolve;
    });
    let ask: () => void = () => undefined;
    const asked = new Promise<void>((resolve) => {
        ask = resolve;
    });
    Object.defineProperty(navigator, "gpu", {
        configurable: true,
        value: {
            requestAdapter: async (options?: GPURequestAdapterOptions): Promise<unknown> => {
                ask();
                await released;
                // The engine asks for its own adapter next, and that one is not held.
                Reflect.deleteProperty(navigator, "gpu");
                return (await gpu?.requestAdapter(options)) ?? null;
            },
        },
    });

    const container = document.createElement("div");
    container.style.width = `${String(WIDTH)}px`;
    container.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(container);
    const graph = new Graph(container);
    mounted.push({ graph, container });
    graph.setRenderer("webgpu");
    before?.(graph);
    const init = graph.init();
    await asked;
    return {
        graph,
        finish: async () => {
            release();
            await init;
            assert.equal(graph.rendererStatus?.active, "webgpu", graph.rendererStatus?.reason ?? "");
        },
    };
}

/**
 * The graph's render manager, for what only it can say.
 * @param graph - The graph.
 * @returns Its render manager.
 */
function renderManagerOf(graph: Graph): RenderManager {
    return (graph as unknown as { renderManager: RenderManager }).renderManager;
}

describe.skipIf(!GPU_LANE)(`work started before WebGPU opens (${ADAPTER})`, () => {
    it("keeps a camera set while WebGPU opens, through the load after it", async () => {
        const { graph, finish } = await holdWebGPUOpening((early) => {
            early.setAutoFrame(false);
        });
        await graph.setCameraState(PLACED);
        await finish();

        assertSamePoint(graph.getCameraState().position, PLACED.position, "the camera");
        assertSamePoint(graph.getCameraState().target, PLACED.target, "the camera's target");

        await graph.addNodes(NODES);
        await graph.waitForStableFrame();
        assertSamePoint(graph.getCameraState().position, PLACED.position, "the camera after a load");
    });

    it("keeps a camera set before the graph is even asked to draw", async () => {
        const { graph, finish } = await holdWebGPUOpening((early) => {
            void early.setCameraState(PLACED);
        });
        await finish();

        assertSamePoint(graph.getCameraState().position, PLACED.position, "the camera");
    });

    it("finishes a camera move animated before the graph is asked to draw, where it was sent", async () => {
        let moved: Promise<void> = Promise.resolve();
        const { graph, finish } = await holdWebGPUOpening((early) => {
            moved = early.setCameraState(PLACED, { animate: true, duration: 50 });
        });
        await finish();
        await moved;

        assertSamePoint(graph.getCameraState().position, PLACED.position, "the camera");
    });

    it("keeps a 2D camera set while WebGPU opens", async () => {
        const { graph, finish } = await holdWebGPUOpening((early) => {
            void early.setViewMode("2d");
        });
        await graph.setCameraState({ zoom: 2, pan: { x: 3, y: 4 } });
        await finish();

        const state = graph.getCameraState();
        assert.closeTo(state.zoom ?? 0, 2, 1e-6);
        assertSamePoint(state.pan, { x: 3, y: 4 }, "the pan");
    });

    it("keeps the camera transition set while WebGPU opens", async () => {
        const { graph, finish } = await holdWebGPUOpening();
        graph.setCameraTransitionDuration(0);
        await finish();

        const target = new Vector3(5, 0, 0);
        graph.camera.followPoint(target);
        assertSamePoint(graph.getCameraState().target, target, "a point followed with no glide");
    });

    it("draws a background shader asked for while WebGPU opens", async () => {
        const { graph, finish } = await holdWebGPUOpening();
        // Nebula is heavy, and the frame guard rightly turns a heavy shader off after one long frame,
        // which a software GPU on a loaded machine draws. This is about the swap, not the guard.
        const shaders = shadersControllerOf(graph.getSession());
        shaders?.configure({ ...shaders.settings, guard: false });
        graph.setBackground({ backgroundType: "color", color: "#000000", shader: { id: "nebula" } });
        await finish();
        await graph.waitForStableFrame();

        assert.isTrue(renderManagerOf(graph).shaderPasses().background?.shown, "the background shader is not drawn");
    });

    it("draws group outlines asked for while WebGPU opens", async () => {
        const { graph, finish } = await holdWebGPUOpening();
        const styled = graph.getSession().styles.add({
            name: "outlined",
            target: "node",
            selector: { match: "has", path: "data.community" },
            set: { "node.shaders": [{ shader: "metaball-hull", groupBy: "data.community" }] },
        });
        await finish();
        await styled;
        await graph.addNodes(NODES.map((node, i) => ({ ...node, community: i % 2 })));
        await graph.waitForStableFrame();

        assert.isNotNull(renderManagerOf(graph).shaderPasses().outline, "the group outlines are not drawn");
    });

    it("keeps the hold on frames that wait for a style", async () => {
        const { graph, finish } = await holdWebGPUOpening();
        await finish();

        assert.isNotNull(renderManagerOf(graph).drawHeld, "the new render manager does not ask the graph");
    });

    it("keeps a node outline width set while WebGPU opens", async () => {
        const { graph, finish } = await holdWebGPUOpening();
        graph.setLayoutBehavior({ node: { outlineWidth: 3 } });
        await finish();

        assert.equal((graph.scene.metadata as { outlineWidth?: number }).outlineWidth, 3);
    });

    it("keeps what a page set on the input while WebGPU opens", async () => {
        const { graph, finish } = await holdWebGPUOpening();
        const heard: string[] = [];
        graph.input.onPointerDown.add(() => heard.push("down"));
        const up = new Promise<void>((resolve) => {
            graph.input.onPointerUp.add(() => {
                resolve();
            });
        });
        graph.on("input:pointer-down", () => heard.push("bridged"));
        graph.setInputEnabled(false);
        await finish();

        await userEvent.click(graph.canvas);
        await up;

        assert.deepEqual(heard, ["down"], "a subscriber hears the pointer, and disabled input stays disabled");
    });

    it("keeps a recording of the input started while WebGPU opens", async () => {
        const { graph, finish } = await holdWebGPUOpening();
        const up = new Promise<void>((resolve) => {
            graph.input.onPointerUp.add(() => {
                resolve();
            });
        });
        graph.startInputRecording();
        await finish();

        await userEvent.click(graph.canvas);
        await up;

        assert.include(
            graph.stopInputRecording().map(({ type }) => type),
            "input:pointer-down",
        );
    });

    it("answers a shader check whose compile the swap cut off, on the new renderer", async () => {
        const { graph, finish } = await holdWebGPUOpening();
        const compiling = new Promise<void>((started) => {
            vi.spyOn(graph.engine, "createEffect").mockImplementation(() => {
                started();
                return undefined as unknown as Effect;
            });
        });
        const check = graph.getSession().shaders.check(TINT);
        await compiling;
        await finish();

        const result = await check;
        assert.isTrue(result.ok, JSON.stringify(result));
    });

    it("settles a wait for the picture asked for while WebGPU opens", async () => {
        const { graph, finish } = await holdWebGPUOpening();
        const settled = graph.waitForStableFrame();
        await finish();
        await settled;

        assert.isTrue(graph.initialized);
    });
});

describe.skipIf(!GPU_LANE)(`the WebGPU renderer on a real adapter (${ADAPTER})`, () => {
    it("opens a WebGPU engine when asked, and under auto", async () => {
        for (const renderer of ["webgpu", "auto"] as const) {
            const graph = await open(renderer);
            assert.deepInclude(graph.rendererStatus, {
                requested: renderer,
                active: "webgpu",
                reason: null,
                drawing: true,
            });
            assert.instanceOf(graph.engine, WebGPUEngine);
            assert.strictEqual(graph.canvas.isConnected, true, "the WebGPU canvas is the one in the page");
        }
    });

    it("draws the same scene objects, compiles every shader and paints the same picture as WebGL", async () => {
        const webgl = await open("webgl");
        await drawStyledRing(webgl);
        const webgpu = await open("webgpu");
        await drawStyledRing(webgpu);

        const glPixels = await screenshot(webgl, "webgl");
        const gpuPixels = await screenshot(webgpu, "webgpu");
        const { differ, ink } = compare(glPixels, gpuPixels);
        await commands.writeFile("tmp/webgpu-renderer/compare.json", JSON.stringify({ adapter: ADAPTER, ink, differ }));

        // The picture has to be there at all -- a blank canvas matches a blank canvas.
        assert.isAbove(ink, 0.01, "the WebGL picture has almost nothing on it");
        // Anti-aliasing differs between the two back ends along every line; a missing line, cap
        // or glow is a whole shape. A tenth of the ink covers the first and not the second: the
        // grey and blue lines alone are more than a quarter of it.
        assert.isBelow(differ, ink / 10, "the WebGPU frame is not the WebGL frame");

        await animateEdges(webgl);
        await animateEdges(webgpu);
        assert.deepEqual(sceneObjects(webgpu), sceneObjects(webgl));
        assert.deepEqual(shaderFailures(webgl), []);
        assert.deepEqual(shaderFailures(webgpu), []);
    });

    it("draws a Cytoscape session with labels too small for one texture pixel", async () => {
        const element = document.createElement("graphty-element");
        element.style.cssText = `display:block;width:${String(WIDTH)}px;height:${String(HEIGHT)}px`;
        element.setAttribute("renderer", "webgpu");
        element.layout = "circular";
        element.dataSource = "cys";
        element.dataSourceConfig = { url: new URL(annotationSessionUrl, location.href).href, styles: "file" };
        document.body.appendChild(element);
        try {
            await element.updateComplete;
            await element.graph.waitForStableFrame();
            assert.equal(element.graph.rendererStatus?.active, "webgpu");
            assert.equal(element.graph.getDataManager().nodes.size, 330);
        } finally {
            element.remove();
        }
    });

    it("paints the same picture as WebGL in the 2D view", async () => {
        const webgl = await open("webgl");
        const webgpu = await open("webgpu");
        for (const graph of [webgl, webgpu]) {
            await graph.setViewMode("2d");
            await drawStyledRing(graph);
        }

        const { differ, ink } = compare(await screenshot(webgl, "webgl-2d"), await screenshot(webgpu, "webgpu-2d"));
        assert.isAbove(ink, 0.01, "the WebGL picture has almost nothing on it");
        assert.isBelow(differ, ink / 10, "the WebGPU frame is not the WebGL frame");
        assert.deepEqual(sceneObjects(webgpu), sceneObjects(webgl));
        assert.deepEqual(shaderFailures(webgpu), []);
    });

    it("holds the drawn graph in the frame a resize is painted in, and keeps drawing after it", async () => {
        const graph = await open("webgpu");
        await drawStyledRing(graph);
        await graph.waitForStableFrame();
        const { engine } = graph;
        assert.instanceOf(engine, WebGPUEngine);
        const errors: string[] = [];
        engine._device.addEventListener("uncapturederror", (event) => {
            errors.push(event.error.message);
        });

        const { container } = mounted[mounted.length - 1];
        const height = HEIGHT + 100;
        // The element's own ResizeObserver calls graph.resize(); this one stands in for it and
        // reads the canvas in the same rendering step, before it is painted.
        const opaque = new Promise<number>((resolve) => {
            const observer = new ResizeObserver(([entry]) => {
                if (entry.contentRect.height !== height) {
                    return;
                }

                observer.disconnect();
                graph.resize();
                const copy = document.createElement("canvas");
                copy.width = graph.canvas.width;
                copy.height = graph.canvas.height;
                const context = copy.getContext("2d");
                assert.isNotNull(context);
                context.drawImage(graph.canvas, 0, 0);
                const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
                let count = 0;
                for (let at = 3; at < pixels.length; at += 4) {
                    count += pixels[at] === 255 ? 1 : 0;
                }

                resolve(count / (pixels.length / 4));
            });
            observer.observe(container);
        });
        container.style.height = `${String(height)}px`;

        assert.isAbove(await opaque, 0.99, "the canvas holds a frame, not the texture the resize cleared");
        // The frame drawn for the resize ended inside its own frame, so the loop's next frames
        // reach the canvas too: no command buffer refers to a texture already presented.
        await drawnFrames(graph.scene, 2);
        assert.deepEqual(errors, []);
        const resized = await screenshot(graph, "webgpu-resized");
        const { ink } = compare(resized, resized);
        assert.isAbove(ink, 0.01, "the picture after the resize has almost nothing on it");
    });

    /**
     * Draws the nodes with a shader body and holds its compiled program to the device's verdict.
     * The frame the style lands in can finish on the default material alone, so this waits for the
     * body's own module rather than for a frame: a refused name is otherwise never seen.
     * @param id - The shader's id.
     * @param glsl - The body.
     * @returns The canvas's pixels.
     */
    async function assertDraws(id: string, glsl: string): Promise<Uint8ClampedArray> {
        defineShader({ id, glsl });
        const graph = await open("webgpu");
        assert.instanceOf(graph.engine, WebGPUEngine);
        const device = graph.engine._device;
        const own: Promise<GPUCompilationInfo>[] = [];
        const create = device.createShaderModule.bind(device);
        device.createShaderModule = (descriptor) => {
            const module = create(descriptor);
            if (descriptor.code.includes("graphty_u_shade")) {
                own.push(module.getCompilationInfo());
            }

            return module;
        };
        const errors: unknown[] = [];
        // A refused shader stops the frames this would wait for, so the refusal ends the wait too.
        const refusal = new Promise<void>((resolve) => {
            graph.on("error", (event) => {
                errors.push(event.error);
                resolve();
            });
        });
        await graph.addNodes(NODES);
        await graph.getSession().styles.add({
            name: "shader under test",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: id }] },
        });
        const drawn = async (): Promise<void> => {
            await operationQueueOf(graph).waitForCompletion();
            await graph.scene.whenReadyAsync();
            while (own.length === 0) {
                await drawnFrames(graph.scene, 1);
            }
            await drawnFrames(graph.scene, 1);
        };
        await Promise.race([drawn(), refusal]);

        const refused = (await Promise.all(own)).flatMap(({ messages }) =>
            messages.filter(({ type }) => type === "error").map(({ message }) => message),
        );
        assert.deepEqual(refused, []);
        assert.deepEqual(errors, []);
        assert.equal(graph.rendererStatus?.drawing, true);
        const pixels = await screenshot(graph, id.replace("/", "-"));
        const { ink } = compare(pixels, pixels);
        assert.isAbove(ink, 0.001, "the nodes drawn with the shader are not on the canvas");
        return pixels;
    }

    it("draws a shader whose names WGSL reserves, local, parameter, field and built-in alike", async () => {
        // Legal GLSL that WGSL would refuse with the names kept: `pass`, `target` and `fn` are
        // reserved, a local `select` hides the built-in the translated program calls (#5852), and
        // `sampler` is a keyword of the compiler that reads GLSL for WebGPU.
        await assertDraws(
            "webgpu-renderer/reserved-words",
            "struct S { float fn; }; float lift(float target) { return target; } " +
                "vec4 shade(NodeInput n) { S s; s.fn = 1.0; float pass = lift(s.fn); float sampler = 1.0; " +
                "float select = n.color.r > 0.5 ? 1.0 : 0.9; return vec4(n.color.rgb, pass * select * sampler); }",
        );
    });

    it("draws a local named after a built-in both languages have, beside calls to the built-in", async () => {
        // WGSL's `mod` is reserved, and a `var abs` in the translated function is "not a call
        // target" for the `abs` call beside it (#5872).
        await assertDraws(
            "webgpu-renderer/shared-built-ins",
            "vec4 shade(NodeInput n) { float v = abs(n.color.r - 0.5); float mod = mod(v, 0.5); " +
                "{ float abs = 1.0; v *= abs; } return vec4(n.color.rgb, v + mod + 0.5); }",
        );
    });

    it("draws a shader that calls modf", async () => {
        await assertDraws(
            "webgpu-renderer/modf",
            "vec4 shade(NodeInput n) { vec2 whole; vec2 part = modf(n.uv * 3.5, whole); float w; " +
                "float f = modf(n.color.r * 3.5, w); return vec4(n.color.rgb, part.x + whole.x + f + w + 0.5); }",
        );
    });

    it("answers isnan, isinf and the inverse hyperbolics as GLSL does, for every overload", async () => {
        // Green only if every answer is right, on values computed at run time so nothing folds them.
        const pixels = await assertDraws(
            "webgpu-renderer/built-in-helpers",
            `vec4 shade(NodeInput n) {
                float zero = n.color.r - n.color.r; float nan = zero / zero; float inf = 1.0 / zero;
                bool right = isnan(nan) && !isnan(inf) && !isnan(1.0 + zero) && isinf(inf) && isinf(-inf) && !isinf(nan);
                right = right && all(isnan(vec2(nan))) && !any(isnan(vec3(zero))) && all(isinf(vec4(inf))) && !any(isinf(vec2(zero)));
                right = right && abs(acosh(cosh(1.0 + zero)) - 1.0) < 0.001 && abs(asinh(sinh(zero - 1.0)) + 1.0) < 0.001;
                right = right && abs(atanh(tanh(0.5 + zero)) - 0.5) < 0.001 && all(lessThan(abs(acosh(vec2(1.0 + zero))), vec2(0.001)));
                right = right && abs(asinh(vec3(zero - 1.0)).z + 0.8813736) < 0.001 && abs(atanh(vec4(zero + 0.5)).w - 0.5493061) < 0.001;
                return right ? vec4(0.0, 1.0, 0.0, 1.0) : vec4(1.0, 0.0, 0.0, 1.0);
            }`,
        );
        let green = 0;
        let red = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            green += pixels[i + 1] > pixels[i] + 60 ? 1 : 0;
            red += pixels[i] > pixels[i + 1] + 60 ? 1 : 0;
        }

        assert.isAbove(green, 0);
        assert.equal(red, 0);
    });

    it("draws a constant isnan or isinf, which only the built-in can be", async () => {
        await assertDraws(
            "webgpu-renderer/constant-built-ins",
            "const float Z = 0.0; const bool K = isnan(Z / Z); const int N = isinf(1.5) ? 2 : 3; " +
                "vec4 shade(NodeInput n) { float s[N]; s[0] = K ? 0.5 : 1.0; s[1] = isnan(1.0) ? 0.0 : 0.5; " +
                "return vec4(n.color.rgb, s[0] + s[1]); }",
        );
    });

    it("draws an isnan of a struct constant in a global const, where only a constant expression will do", async () => {
        await assertDraws(
            "webgpu-renderer/constant-struct",
            "struct S { float a; }; const S s = S(1.0); const bool b = isnan(s.a) || isinf(S(1.0).a); " +
                "vec4 shade(NodeInput n) { const bool c = isinf(s.a); float t[isnan(s.a) ? 2 : 3]; t[0] = 0.5; " +
                "return vec4(n.color.rgb, b || c ? 0.0 : t[0] + 0.5); }",
        );
    });

    it("draws derivatives in a branch, in the library's fillAA and strokeAA too", async () => {
        // Every body runs behind a branch of the wrapper's, so even the plain `fillAA` call needs this.
        await assertDraws(
            "webgpu-renderer/derivatives",
            "vec4 shade(NodeInput n) { float a = fillAA(length(n.uv) - 0.9); if (n.uv.x > 0.0) { " +
                "a += dFdx(n.uv.x) + dFdy(n.uv.y) + fwidth(n.uv.x) + strokeAA(n.uv.y, 0.1); } " +
                "return vec4(n.color.rgb, a + 0.5); }",
        );
    });

    it("draws locals and fields named after the keywords of Vulkan GLSL", async () => {
        // `texture2D`, `texture3D` and `textureCube` never get here: the shader check refuses them.
        const names = [...VULKAN_GLSL_NAMES].filter((name) => !/^texture(?:2D|3D|Cube)$/.test(name));
        await assertDraws(
            "webgpu-renderer/vulkan-keywords",
            "struct S { float image2D; float sample; }; " +
                `vec4 shade(NodeInput n) { S s; s.image2D = 1.0; s.sample = 0.0; float a = s.image2D + s.sample; ` +
                `${names.map((name) => `float ${name} = 0.0; a += ${name};`).join(" ")} ` +
                "return vec4(n.color.rgb, a); }",
        );
    });

    it("stops claiming to draw and reports it when the device refuses a shader", async () => {
        const graph = await open("webgpu");
        assert.instanceOf(graph.engine, WebGPUEngine);
        const refused = new Promise<Error>((resolve) => {
            graph.on("error", (event) => {
                resolve(event.error);
            });
        });
        // Every GLSL body the element accepts now translates, so the device is handed WGSL it
        // refuses directly, through the same device the graph's shaders are compiled on.
        graph.engine._device.createShaderModule({ code: "fn refused( {" });

        const error = await refused;
        assert.instanceOf(error, GraphtyError);
        assert.equal(error.code, "E_SHADER_REFUSED");
        assert.match(String(error.details.messages), /expected/);
        assert.equal(graph.rendererStatus?.drawing, false);
    });

    /**
     * Paints the nodes with a shader body and waits for the graph to report it.
     * @param id - The shader's id.
     * @param glsl - The body.
     * @returns The graph and the error it reported.
     */
    async function refusedShader(id: string, glsl: string): Promise<{ graph: Graph; error: Error }> {
        defineShader({ id, glsl });
        const graph = await open("webgpu");
        const refused = new Promise<Error>((resolve) => {
            graph.on("error", (event) => {
                resolve(event.error);
            });
        });
        await graph.addNodes(NODES);
        await graph.getSession().styles.add({
            name: "refused",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: id }] },
        });
        return { graph, error: await refused };
    }

    it("reports a shader the GLSL compiler stops on", async () => {
        // A global `const` may call a built-in under WebGL only: the compiler WebGPU uses cannot fold it.
        const { graph, error } = await refusedShader(
            "webgpu-renderer/compiler-stops",
            "const float K = acosh(1.5); vec4 shade(NodeInput n) { return vec4(n.color.rgb, K); }",
        );
        assert.instanceOf(error, GraphtyError);
        assert.equal(error.code, "E_SHADER_REFUSED");
        assert.equal(error.details.stage, "compiler");
        assert.match(String(error.details.messages), /GLSL compilation failed/);
        assert.equal(graph.rendererStatus?.drawing, false);
    });

    it("reports a shader the translator loses", async () => {
        // The translator has no `uaddCarry`: it stops there and hands back WGSL with no entry point.
        // GLSL ES 3.00 has no such call, so no body that draws on WebGL is lost this way any more.
        const { graph, error } = await refusedShader(
            "webgpu-renderer/translator-stops",
            "vec4 shade(NodeInput n) { uint carry; uint sum = uaddCarry(1u, uint(n.color.r), carry); " +
                "return vec4(n.color.rgb, float(sum + carry)); }",
        );
        assert.instanceOf(error, GraphtyError);
        assert.equal(error.code, "E_SHADER_REFUSED");
        assert.equal(error.details.stage, "translator");
        assert.equal(graph.rendererStatus?.drawing, false);
    });

    it("answers a pasted shader the GLSL compiler stops on, with the picture left as it was", async () => {
        const graph = await open("webgpu");
        const errors: unknown[] = [];
        graph.on("error", (event) => {
            errors.push(event.error);
        });
        const added = await graph.getSession().shaders.add(`/* graphty-shader 1
{ "id": "user/compiler-stops", "name": "Stops", "place": "paint" }
*/
const float K = acosh(1.5);
vec4 shade(NodeInput n) { return vec4(n.color.rgb, K); }
`);
        assert.isFalse(added.ok);
        assert.equal(added.ok ? "" : added.problems[0].code, "shader.compile");
        assert.deepEqual(errors, []);
        assert.equal(graph.rendererStatus?.drawing, true);
    });

    it("draws with WebGL and says why when the GLSL compiler cannot be fetched", async () => {
        // The first WebGPU graph on the page fetches the compiler; a failed fetch is not
        // remembered, so the next graph asks again -- and this one is refused.
        const refuse = vi.spyOn(Tools, "LoadBabylonScriptAsync").mockRejectedValue(new Error("blocked by the page"));
        try {
            forgetShaderCompilers();
            const graph = await open("webgpu");
            assert.equal(graph.rendererStatus?.active, "webgl");
            assert.match(graph.rendererStatus?.reason ?? "", /GLSL compiler .* blocked by the page/);
            assert.notInstanceOf(graph.engine, WebGPUEngine);
        } finally {
            refuse.mockRestore();
        }
    });
});
