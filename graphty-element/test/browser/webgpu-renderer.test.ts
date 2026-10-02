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

import { EngineStore, Mesh, Tools, WebGPUEngine } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";
import { commands } from "vitest/browser";

import { Graph, operationQueueOf } from "../../src/Graph";
import { forgetShaderCompilers } from "../../src/managers/RenderManager";

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
    await frames(8);
}

/**
 * Waits for the render loop to draw some frames; a paint lands on a frame.
 * @param count - How many.
 */
async function frames(count: number): Promise<void> {
    for (let at = 0; at < count; at++) {
        await new Promise<void>((done) => {
            requestAnimationFrame(() => {
                done();
            });
        });
    }
}

/**
 * Draws a few frames and takes a screenshot the way the element does.
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
    await frames(8);
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
        assert.deepEqual(graph.rendererStatus, { requested: "webgl", active: "webgl", reason: null });
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
        Object.defineProperty(navigator, "gpu", {
            configurable: true,
            value: {
                requestAdapter: async (): Promise<null> => {
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
            await new Promise((resolve) => setTimeout(resolve, 200));
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
            await frames(1);
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

describe.skipIf(!GPU_LANE)(`the WebGPU renderer on a real adapter (${ADAPTER})`, () => {
    it("opens a WebGPU engine when asked, and under auto", async () => {
        for (const renderer of ["webgpu", "auto"] as const) {
            const graph = await open(renderer);
            assert.deepEqual(graph.rendererStatus, { requested: renderer, active: "webgpu", reason: null });
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
