/**
 * @file The model chunk loads a GLB, an OBJ with its MTL and PNG, a binary STL and FBX files without
 * asking the network for anything, and a USDZ asking for nothing but the OpenUSD importer files
 * babylonjs-models ships: no Babylon.js CDN, no lazily split shader or loader file, nothing but
 * the files the caller handed it. And a page that draws no model never downloads the chunk.
 *
 * Runs in Chromium (project "browser") and WebKit (project "models-webkit"), because Safari is
 * where a lazy fetch has failed before (src/meshes/bundledStandardShaders.ts).
 *
 * Requests are recorded three ways for the length of each load and its first draw: every
 * `fetch`, every `XMLHttpRequest.open` and every image `src` (which see `blob:` URLs too), and the
 * page's resource timing (which sees module scripts the dev server would serve for a lazy
 * `import()`). A module worker started while recording (the OpenUSD importer runs in one) is
 * started behind a module of the test's own that records the worker's `fetch` calls and resource
 * timing the same way and reports them over a BroadcastChannel. The fixtures are built here as bytes and handed over as `blob:` URLs, so any
 * http(s) request at all is one the chunk made on its own.
 */

import "../../../src/graphty-element";

import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader.js";
import { SceneLoaderFlags } from "@babylonjs/core/Loading/sceneLoaderFlags.js";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Scene } from "@babylonjs/core/scene.js";
import { afterEach, assert, describe, it, vi } from "vitest";

import { operationQueueOf } from "../../../src/Graph";
import { useBundledStandardShaders } from "../../../src/meshes/bundledStandardShaders";
import { loadChunk, loadModel } from "../../../src/models/loadModel";

/** The FBX and USD fixtures, by path. */
const FIXTURES = import.meta.glob<string>(
    [
        "../../../../babylonjs-models/test/fixtures/variants/fbx-*/**",
        "../../../../babylonjs-models/test/fixtures/variants/usdz/*",
    ],
    { query: "?url", import: "default", eager: true },
);

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
    }
});

/** Every URL requested while recording, from any of the three hooks. */
interface Recording {
    urls: string[];
    stop: () => string[];
    /** Stop, after every module worker started while recording has reported all it requested. */
    stopWithWorkers: () => Promise<string[]>;
}

/**
 * The module run in a worker before the worker's own script: it reports every URL the worker
 * fetches or loads, and answers a flush with `done` once everything before it has been sent.
 * @param channelName - The BroadcastChannel the recording listens on.
 * @returns The module's source.
 */
function workerRecorderSource(channelName: string): string {
    return `
const channel = new BroadcastChannel(${JSON.stringify(channelName)});
const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) channel.postMessage({ url: entry.name });
});
observer.observe({ type: "resource", buffered: true });
const originalFetch = self.fetch;
self.fetch = (input, init) => {
    channel.postMessage({ url: input instanceof Request ? input.url : String(input) });
    return originalFetch(input, init);
};
channel.onmessage = (event) => {
    if (event.data === "flush") {
        for (const entry of observer.takeRecords()) channel.postMessage({ url: entry.name });
        channel.postMessage({ done: true });
    }
};
`;
}

/**
 * A module worker script that runs the recorder's module and then the worker's own script, which
 * runs as it would: a module's imports are evaluated in order before it.
 * @param script - The worker's own script.
 * @param channelName - The channel the recorder reports on.
 * @returns The wrapper's blob: URL.
 */
function recordedWorkerScript(script: string, channelName: string): string {
    const recorder = URL.createObjectURL(new Blob([workerRecorderSource(channelName)], { type: "text/javascript" }));
    const wrapper = `import ${JSON.stringify(recorder)};\nimport ${JSON.stringify(script)};\n`;
    return URL.createObjectURL(new Blob([wrapper], { type: "text/javascript" }));
}

/**
 * Add every URL a recorded worker reports to `urls`.
 * @param channelName - The channel the worker's recorder reports on.
 * @param urls - Where the URLs go.
 * @returns A flush: asks the worker for the rest, and settles once all of it has arrived.
 */
function listenToWorker(channelName: string, urls: string[]): () => Promise<void> {
    const channel = new BroadcastChannel(channelName);
    channel.onmessage = (event: MessageEvent<{ url?: string }>): void => {
        if (event.data.url !== undefined) {
            urls.push(event.data.url);
        }
    };
    let report: Promise<void> | undefined;
    return async (): Promise<void> => {
        report ??= new Promise<void>((resolve) => {
            channel.onmessage = (event: MessageEvent<{ url?: string; done?: boolean }>): void => {
                if (event.data.url !== undefined) {
                    urls.push(event.data.url);
                } else if (event.data.done === true) {
                    channel.close();
                    resolve();
                }
            };
            // A second channel object on the same name: a channel never hears its own messages.
            const asker = new BroadcastChannel(channelName);
            asker.postMessage("flush");
            asker.close();
        });
        await report;
    };
}

/**
 * Record every request the page makes until `stop` is called.
 * @returns The recording.
 */
function recordRequests(): Recording {
    const urls: string[] = [];
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            urls.push(entry.name);
        }
    });
    observer.observe({ type: "resource" });

    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        urls.push(input instanceof Request ? input.url : String(input));
        return await originalFetch(input, init);
    };
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function open(
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        ...rest: unknown[]
    ): void {
        urls.push(String(url));
        Reflect.apply(originalOpen, this, [method, url, ...rest]);
    };
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    assert.isDefined(src?.set, "images have a src setter to watch");
    Object.defineProperty(HTMLImageElement.prototype, "src", {
        configurable: true,
        get(this: HTMLImageElement): string {
            return src.get?.call(this) as string;
        },
        set(this: HTMLImageElement, value: string): void {
            urls.push(value);
            src.set?.call(this, value);
        },
    });

    /** Each module worker's flush: settles once the worker has sent everything it requested. */
    const flushes: (() => Promise<void>)[] = [];
    const OriginalWorker = window.Worker;
    window.Worker = class RecordedWorker extends OriginalWorker {
        /** Ask the worker for the rest of its requests; settles when they have all arrived. */
        readonly #flush: (() => Promise<void>) | undefined;

        constructor(scriptURL: string | URL, options?: WorkerOptions) {
            const script = new URL(String(scriptURL), location.href).href;
            urls.push(script);
            const channelName = options?.type === "module" ? `no-requests-${crypto.randomUUID()}` : undefined;
            super(channelName === undefined ? scriptURL : recordedWorkerScript(script, channelName), options);
            this.#flush = channelName === undefined ? undefined : listenToWorker(channelName, urls);
            if (this.#flush !== undefined) {
                flushes.push(this.#flush);
            }
        }

        /** A worker its owner ends (the USD importer's is ended after each load) reports first. */
        override terminate(): void {
            if (this.#flush === undefined) {
                super.terminate();
                return;
            }

            void this.#flush().then(() => {
                super.terminate();
            });
        }
    };

    const stop = (): string[] => {
        for (const entry of observer.takeRecords()) {
            urls.push(entry.name);
        }
        observer.disconnect();
        window.fetch = originalFetch;
        XMLHttpRequest.prototype.open = originalOpen;
        Object.defineProperty(HTMLImageElement.prototype, "src", src);
        window.Worker = OriginalWorker;
        return urls;
    };
    cleanups.push(() => {
        window.Worker = OriginalWorker;
    });

    return {
        urls,
        stop,
        stopWithWorkers: async (): Promise<string[]> => {
            const result = stop();
            await Promise.all(flushes.map(async (flush) => await flush()));
            return result;
        },
    };
}

/**
 * Import the model chunk and babylonjs-models before a recording starts, so the dev server's
 * module requests are not counted as the load's.
 * @returns The model chunk.
 */
async function modelModules(): Promise<Awaited<ReturnType<typeof loadChunk>>> {
    await import("babylonjs-models");
    return await loadChunk();
}

/**
 * Assert that a recording holds nothing but in-page URLs.
 * @param urls - What was recorded.
 */
function assertNoNetwork(urls: string[]): void {
    const babylon = urls.filter((url) => /(^|\.)babylonjs\.com$/.test(new URL(url, location.href).hostname));
    assert.deepEqual(babylon, [], "nothing is requested from Babylon's hosts");
    const network = urls.filter((url) => !url.startsWith("blob:") && !url.startsWith("data:"));
    assert.deepEqual(network, [], "nothing is requested but the caller's own blob: URLs");
}

/** A 2 x 2 RGBA PNG, built by the browser. */
async function pngBytes(): Promise<Uint8Array> {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.fillStyle = "#c08040";
    context.fillRect(0, 0, 2, 2);
    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
    });
    assert.isNotNull(blob);
    return new Uint8Array(await blob.arrayBuffer());
}

/**
 * A GLB holding one textured triangle with a PBR material, its PNG in the binary chunk.
 * @param png - The texture's bytes.
 * @returns The GLB's bytes.
 */
function glbBytes(png: Uint8Array): Uint8Array {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1]);
    const pad = (n: number): number => Math.ceil(n / 4) * 4;
    const imageOffset = positions.byteLength + uvs.byteLength;
    const binLength = pad(imageOffset + png.byteLength);
    const bin = new Uint8Array(binLength);
    bin.set(new Uint8Array(positions.buffer), 0);
    bin.set(new Uint8Array(uvs.buffer), positions.byteLength);
    bin.set(png, imageOffset);

    const json = {
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
        materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0.5 } }],
        textures: [{ source: 0 }],
        images: [{ bufferView: 2, mimeType: "image/png" }],
        buffers: [{ byteLength: binLength }],
        bufferViews: [
            { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
            { buffer: 0, byteOffset: positions.byteLength, byteLength: uvs.byteLength },
            { buffer: 0, byteOffset: imageOffset, byteLength: png.byteLength },
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
            { bufferView: 1, componentType: 5126, count: 3, type: "VEC2" },
        ],
    };
    let jsonText = JSON.stringify(json);
    jsonText += " ".repeat(pad(jsonText.length) - jsonText.length);
    const jsonBytes = new TextEncoder().encode(jsonText);

    const total = 12 + 8 + jsonBytes.byteLength + 8 + binLength;
    const out = new Uint8Array(total);
    const view = new DataView(out.buffer);
    view.setUint32(0, 0x46546c67, true); // "glTF"
    view.setUint32(4, 2, true);
    view.setUint32(8, total, true);
    view.setUint32(12, jsonBytes.byteLength, true);
    view.setUint32(16, 0x4e4f534a, true); // "JSON"
    out.set(jsonBytes, 20);
    const binStart = 20 + jsonBytes.byteLength;
    view.setUint32(binStart, binLength, true);
    view.setUint32(binStart + 4, 0x004e4942, true); // "BIN\0"
    out.set(bin, binStart + 8);
    return out;
}

/** A binary STL holding one triangle. */
function stlBytes(): Uint8Array {
    const out = new Uint8Array(84 + 50);
    const view = new DataView(out.buffer);
    view.setUint32(80, 1, true);
    const floats = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
    floats.forEach((value, i) => {
        view.setFloat32(84 + i * 4, value, true);
    });
    return out;
}

/**
 * A `blob:` URL for some bytes, revoked after the test.
 * @param bytes - The file's bytes.
 * @param type - Its media type.
 * @returns The URL.
 */
function blobUrl(bytes: Uint8Array | string, type: string): string {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
    cleanups.push(() => {
        URL.revokeObjectURL(url);
    });
    return url;
}

/**
 * A WebGL scene of the kind the element builds, with StandardMaterial's shaders pinned as the
 * element pins them.
 * @returns The scene.
 */
function makeScene(): Scene {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    document.body.appendChild(canvas);
    const engine = new Engine(canvas, false);
    const scene = new Scene(engine);
    useBundledStandardShaders();
    new FreeCamera("camera", new Vector3(0, 0, -3), scene).setTarget(Vector3.Zero());
    new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    cleanups.push(() => {
        engine.dispose();
        canvas.remove();
    });
    return scene;
}

describe("the model chunk", () => {
    it("is not downloaded by a page that draws no model", async () => {
        const recording = recordRequests();
        const element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "200px";
        element.style.height = "150px";
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        await element.addNodes([{ id: "a" }, { id: "b" }]);
        await element.addEdges([{ src: "a", dst: "b" }]);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        const drawn = recording.stop();

        const chunkUrls = (urls: string[]): string[] =>
            urls.filter(
                (url) =>
                    url.includes("/src/models/") ||
                    url.includes("babylonjs_loaders") ||
                    url.includes("babylonjs-models"),
            );
        assert.deepEqual(chunkUrls(drawn), [], "drawing a graph fetched nothing of the model chunk");
        // The chunk's code has not run on this page at all, from this test's imports or any other.
        assert.isFalse(SceneLoader.IsPluginForExtensionAvailable(".glb"), "no glTF loader is registered");
        assert.isTrue(SceneLoaderFlags.ShowLoadingScreen, "Babylon's loading-screen default is untouched");

        // The same recorder sees the chunk once something imports it, so the empty list above is
        // not a recorder that sees nothing.
        const importing = recordRequests();
        await import("../../../src/models/chunk");
        assert.isNotEmpty(chunkUrls(importing.stop()), "importing the chunk is a request the recorder sees");
        assert.isTrue(SceneLoader.IsPluginForExtensionAvailable(".glb"), "the chunk registers the glTF loader");
    });

    it("loads a GLB with a PBR material and an embedded texture with no request", async () => {
        const { neutralEnvironment } = await modelModules();
        const scene = makeScene();
        const png = await pngBytes();

        const recording = recordRequests();
        const container = await loadModel(scene, new Map([["model.glb", glbBytes(png)]]), "model.glb", "glb");
        container.addAllToScene();
        const materials = scene.materials.filter((material) => material instanceof PBRMaterial);
        assert.lengthOf(materials, 1, "the glTF material loads as PBR");
        materials[0].reflectionTexture = neutralEnvironment(scene);
        await vi.waitFor(() => {
            assert.isTrue(scene.isReady(), "the scene compiled its shaders and loaded its textures");
        });
        scene.render();
        const urls = recording.stop();

        assert.isAbove(container.meshes.length, 0, "the model has meshes");
        assert.lengthOf(container.cameras, 0, "the file's cameras are discarded");
        assertNoNetwork(urls);
    });

    it("loads an OBJ with its MTL and PNG from blob: URLs of its own files only", async () => {
        await modelModules();
        const scene = makeScene();
        const mtl = new TextEncoder().encode("newmtl paint\nKd 1 1 1\nmap_Kd paint.png\n");
        const obj = [
            "mtllib paint.mtl",
            "v 0 0 0",
            "v 1 0 0",
            "v 0 1 0",
            "vt 0 0",
            "vt 1 0",
            "vt 0 1",
            "usemtl paint",
            "f 1/1 2/2 3/3",
            "",
        ].join("\n");

        const files = new Map([
            ["model.obj", new TextEncoder().encode(obj)],
            ["paint.mtl", mtl],
            ["paint.png", await pngBytes()],
        ]);

        const recording = recordRequests();
        const container = await loadModel(scene, files, "model.obj", "obj");
        container.addAllToScene();
        await vi.waitFor(() => {
            assert.isTrue(scene.isReady(), "the scene compiled its shaders and loaded its texture");
        });
        scene.render();
        const urls = recording.stop();

        assert.isAbove(container.meshes.length, 0, "the model has meshes");
        assert.isNotEmpty(urls, "the MTL and the texture were read from blob: URLs, which the recorder sees");
        assert.lengthOf(container.textures, 1, "the MTL's texture belongs to the model");
        assertNoNetwork(urls);
    });

    it("loads a binary STL with no request", async () => {
        await modelModules();
        const scene = makeScene();

        const recording = recordRequests();
        const container = await loadModel(scene, new Map([["model.stl", stlBytes()]]), "model.stl", "stl");
        container.addAllToScene();
        await vi.waitFor(() => {
            assert.isTrue(scene.isReady(), "the scene compiled its shaders");
        });
        scene.render();
        const urls = recording.stop();

        assert.isAbove(container.meshes.length, 0, "the model has meshes");
        assertNoNetwork(urls);
    });

    it("refuses a decoder that is turned off instead of fetching one", async () => {
        await modelModules();
        const { configureDecoders } = await import("babylonjs-models");
        const scene = makeScene();
        const gltf = JSON.stringify({
            asset: { version: "2.0" },
            extensionsUsed: ["KHR_draco_mesh_compression"],
            extensionsRequired: ["KHR_draco_mesh_compression"],
        });

        configureDecoders({ draco: false });
        cleanups.push(() => {
            configureDecoders({ draco: undefined });
        });
        const recording = recordRequests();
        let failed = false;
        try {
            await loadModel(scene, new Map([["model.gltf", new TextEncoder().encode(gltf)]]), "model.gltf", "gltf");
        } catch {
            failed = true;
        }
        const urls = recording.stop();

        assert.isTrue(failed, "a model that needs Draco fails to load");
        assertNoNetwork(urls);
    });

    it("refuses a model's own reference to Babylon's CDN, and leaves the hooks alone after", async () => {
        await modelModules();
        const { Tools } = await import("@babylonjs/core/Misc/tools.js");
        const scene = makeScene();
        const cdn = "https://assets.babylonjs.com/environments/backgroundGround.png";
        const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
        const files = new Map([
            ["model.obj", encode("mtllib paint.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nusemtl paint\nf 1 2 3\n")],
            ["paint.mtl", encode(`newmtl paint\nmap_Kd ${cdn}\n`)],
        ]);

        const recording = recordRequests();
        try {
            await loadModel(scene, files, "model.obj", "obj");
        } catch {
            // Refusing the texture may fail the whole load; either way nothing is fetched.
        }
        const urls = recording.stop();

        assertNoNetwork(urls);
        // Outside a load, Babylon's URL hooks are the page's own again.
        assert.include(Tools.GetBabylonScriptURL("https://cdn.babylonjs.com/x.js"), "cdn.babylonjs.com");
        assert.strictEqual(Tools.PreprocessUrl(cdn), cdn);
    });

    it("lets a page's own babylonjs.com texture load while a model loads (issue #7437)", async () => {
        await modelModules();
        const { Tools } = await import("@babylonjs/core/Misc/tools.js");
        const scene = makeScene();
        const png = await pngBytes();
        const pageTexture = "https://assets.babylonjs.com/textures/grass.png";
        const pngUrl = blobUrl(png, "image/png");

        // No real network: the page texture's image is answered by a local PNG at the last step,
        // below every Babylon hook, so whatever refuses it has already had its chance.
        const requested: string[] = [];
        const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
        assert.isDefined(src?.set, "images have a src setter to intercept");
        Object.defineProperty(HTMLImageElement.prototype, "src", {
            configurable: true,
            get(this: HTMLImageElement): string {
                return src.get?.call(this) as string;
            },
            set(this: HTMLImageElement, value: string): void {
                requested.push(value);
                src.set?.call(this, value === pageTexture ? pngUrl : value);
            },
        });
        cleanups.push(() => {
            Object.defineProperty(HTMLImageElement.prototype, "src", src);
        });

        // The loader starts once the model's files are under the request guard.
        const started = new Promise<void>((resolve) => {
            SceneLoader.OnPluginActivatedObservable.addOnce(() => {
                resolve();
            });
        });
        const loading = loadModel(scene, new Map([["model.glb", glbBytes(png)]]), "model.glb", "glb");
        await started;
        // The model load is running: Babylon's CDN scripts are refused ...
        assert.throws(() => Tools.ScriptPreprocessUrl("https://cdn.babylonjs.com/draco.js"), /Babylon's CDN/);
        // ... and the page's own texture from a babylonjs.com host is requested all the same.
        const texture = new Texture(pageTexture, scene);
        await loading;

        await vi.waitFor(() => {
            assert.isTrue(texture.isReady() || texture.loadingError, "the page texture settled");
        });
        assert.isFalse(texture.loadingError, "the page texture was not refused");
        assert.include(requested, pageTexture, "the page texture was requested from its own URL");
    });

    it("loads an FBX with its picture beside it, and one with its picture inside, with no request", async () => {
        await modelModules();
        for (const [variant, names] of [
            ["fbx-textured", ["cube.fbx", "textures/cube.png"]],
            ["fbx-ascii-embedded-texture", ["cube.fbx"]],
        ] as const) {
            const scene = makeScene();
            const files = new Map<string, Uint8Array>();
            for (const name of names) {
                files.set(name, await fixtureBytes(variant, name));
            }

            const recording = recordRequests();
            const container = await loadModel(scene, files, "cube.fbx", "fbx");
            container.addAllToScene();
            await vi.waitFor(() => {
                assert.isTrue(scene.isReady(), "the scene compiled its shaders and loaded its textures");
            });
            scene.render();
            // The FBX loader's own module is imported the first time an FBX file loads, as a decoder is.
            const urls = recording
                .stop()
                .filter((url) => !/babylonjs_loaders_FBX|@babylonjs\/loaders\/FBX\//.test(url));
            assert.isAbove(container.textures.length, 0, `${variant} draws its picture`);
            assertNoNetwork(urls);
        }
    });

    it("loads a USDZ asking for nothing but the package's own OpenUSD importer files", async () => {
        await modelModules();
        const scene = makeScene();
        const files = new Map([["cube.usdz", await fixtureBytes("usdz", "cube.usdz")]]);
        const recording = recordRequests();
        const container = await loadModel(scene, files, "cube.usdz", "usdz");
        const urls = await recording.stopWithWorkers();
        assert.isAbove(container.meshes.length, 0, "the model has meshes");
        // The importer fetches its WebAssembly inside its worker: seeing it proves the worker is watched.
        assert.isTrue(
            urls.some((url) => url.includes("babylon-usd-importer.wasm")),
            "the worker's requests are recorded",
        );
        const babylon = urls.filter((url) => /(^|\.)babylonjs\.com$/.test(new URL(url, location.href).hostname));
        assert.deepEqual(babylon, [], "nothing is requested from Babylon's hosts");
        const network = urls.filter((url) => !url.startsWith("blob:") && !url.startsWith("data:"));
        for (const url of network) {
            assert.strictEqual(new URL(url, location.href).origin, location.origin, url);
            // The loader's and the importer's modules, imported on first use as each decoder's is, and
            // the importer's files.
            assert.match(
                url,
                /\/babylonjs-models\/dist\/(?:wasm\/babylon-usd-importer\.|decoders\/usd\.js)|babylonjs_loaders_USD|@babylonjs\/loaders\/USD\//,
                url,
            );
        }
    });
});

/**
 * A variant fixture's bytes (babylonjs-models/test/fixtures/variants).
 * @param variant - The variant.
 * @param name - The file.
 * @returns Its bytes.
 */
async function fixtureBytes(variant: string, name: string): Promise<Uint8Array> {
    const url = FIXTURES[`../../../../babylonjs-models/test/fixtures/variants/${variant}/${name}`];
    return new Uint8Array(await (await fetch(url)).arrayBuffer());
}
