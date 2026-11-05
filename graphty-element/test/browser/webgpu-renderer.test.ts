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

import { GraphtyError } from "../../src/errors";
import { Graph, operationQueueOf } from "../../src/Graph";
import { forgetShaderCompilers } from "../../src/managers/RenderManager";
import { defineShader } from "../../src/simple/defineShader";
import { drawnFrames } from "../helpers/drawn-frames";

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
        assert.deepEqual(graph.rendererStatus, { requested: "webgl", active: "webgl", reason: null, drawing: true });
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

describe.skipIf(!GPU_LANE)(`the WebGPU renderer on a real adapter (${ADAPTER})`, () => {
    it("opens a WebGPU engine when asked, and under auto", async () => {
        for (const renderer of ["webgpu", "auto"] as const) {
            const graph = await open(renderer);
            assert.deepEqual(graph.rendererStatus, {
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
     */
    async function assertDraws(id: string, glsl: string): Promise<void> {
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
        graph.on("error", (event) => {
            errors.push(event.error);
        });
        await graph.addNodes(NODES);
        await graph.getSession().styles.add({
            name: "shader under test",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: id }] },
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.scene.whenReadyAsync();
        while (own.length === 0) {
            await drawnFrames(graph.scene, 1);
        }
        await drawnFrames(graph.scene, 1);

        const refused = (await Promise.all(own)).flatMap(({ messages }) =>
            messages.filter(({ type }) => type === "error").map(({ message }) => message),
        );
        assert.deepEqual(refused, []);
        assert.deepEqual(errors, []);
        assert.equal(graph.rendererStatus?.drawing, true);
        const pixels = await screenshot(graph, id.replace("/", "-"));
        const { ink } = compare(pixels, pixels);
        assert.isAbove(ink, 0.001, "the nodes drawn with the shader are not on the canvas");
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
        // `image2D` is a free name in GLSL ES 3.00 and a type in the Vulkan GLSL glslang reads.
        const { graph, error } = await refusedShader(
            "webgpu-renderer/compiler-stops",
            "vec4 shade(NodeInput n) { float image2D = 1.0; return vec4(n.color.rgb, image2D); }",
        );
        assert.instanceOf(error, GraphtyError);
        assert.equal(error.code, "E_SHADER_REFUSED");
        assert.equal(error.details.stage, "compiler");
        assert.match(String(error.details.messages), /GLSL compilation failed/);
        assert.equal(graph.rendererStatus?.drawing, false);
    });

    it("reports a shader the translator loses", async () => {
        // The translator has no `acosh`: it stops there and hands back WGSL with no entry point.
        const { graph, error } = await refusedShader(
            "webgpu-renderer/translator-stops",
            "vec4 shade(NodeInput n) { return vec4(n.color.rgb, acosh(n.color.r + 1.5)); }",
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
vec4 shade(NodeInput n) { float image2D = 1.0; return vec4(n.color.rgb, image2D); }
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
