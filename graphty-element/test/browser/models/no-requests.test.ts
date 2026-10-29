/**
 * @file The model chunk loads a GLB, an OBJ with its MTL and PNG, and a binary STL without asking
 * the network for anything: no Babylon.js CDN, no lazily split shader or loader file, nothing but
 * the files the caller handed it. And a page that draws no model never downloads the chunk.
 *
 * Runs in Chromium (project "browser") and WebKit (project "models-webkit"), because Safari is
 * where a lazy fetch has failed before (src/meshes/bundledStandardShaders.ts).
 *
 * Requests are recorded three ways for the length of each load and its first draw: every
 * `fetch`, every `XMLHttpRequest.open` and every image `src` (which see `blob:` URLs too), and the
 * page's resource timing (which sees module scripts the dev server would serve for a lazy
 * `import()`). The fixtures are built here as bytes and handed over as `blob:` URLs, so any
 * http(s) request at all is one the chunk made on its own.
 */

import "../../../src/graphty-element";

import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { SceneLoaderFlags } from "@babylonjs/core/Loading/sceneLoaderFlags";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { afterEach, assert, describe, it, vi } from "vitest";

import { operationQueueOf } from "../../../src/Graph";
import { useBundledStandardShaders } from "../../../src/meshes/bundledStandardShaders";

/** How long the element and a load may take. */
const TIMEOUT_MS = 20000;

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

    return {
        urls,
        stop: (): string[] => {
            for (const entry of observer.takeRecords()) {
                urls.push(entry.name);
            }
            observer.disconnect();
            window.fetch = originalFetch;
            XMLHttpRequest.prototype.open = originalOpen;
            Object.defineProperty(HTMLImageElement.prototype, "src", src);
            return urls;
        },
    };
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
    useBundledStandardShaders(scene);
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
        await element.waitForStableFrame({ timeoutMs: TIMEOUT_MS });
        const drawn = recording.stop();

        const chunkUrls = (urls: string[]): string[] =>
            urls.filter((url) => url.includes("/src/models/") || url.includes("babylonjs_loaders"));
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
        const { loadModelContainer, neutralEnvironment } = await import("../../../src/models/chunk");
        const scene = makeScene();
        const png = await pngBytes();

        const recording = recordRequests();
        const container = await loadModelContainer(scene, glbBytes(png), ".glb");
        container.addAllToScene();
        const materials = scene.materials.filter((material) => material instanceof PBRMaterial);
        assert.lengthOf(materials, 1, "the glTF material loads as PBR");
        materials[0].reflectionTexture = neutralEnvironment(scene);
        await vi.waitFor(
            () => {
                assert.isTrue(scene.isReady(), "the scene compiled its shaders and loaded its textures");
            },
            { timeout: TIMEOUT_MS },
        );
        scene.render();
        const urls = recording.stop();

        assert.isAbove(container.meshes.length, 0, "the model has meshes");
        assert.lengthOf(container.cameras, 0, "the file's cameras are discarded");
        assertNoNetwork(urls);
    });

    it("loads an OBJ with its MTL and PNG from the caller's blob: URLs only", async () => {
        const { loadModelContainer } = await import("../../../src/models/chunk");
        const scene = makeScene();
        const pngUrl = blobUrl(await pngBytes(), "image/png");
        const mtlUrl = blobUrl(`newmtl paint\nKd 1 1 1\nmap_Kd ${pngUrl}\n`, "text/plain");
        const obj = [
            `mtllib ${mtlUrl}`,
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

        const recording = recordRequests();
        const container = await loadModelContainer(scene, new TextEncoder().encode(obj), ".obj");
        container.addAllToScene();
        await vi.waitFor(
            () => {
                assert.isTrue(scene.isReady(), "the scene compiled its shaders and loaded its texture");
            },
            { timeout: TIMEOUT_MS },
        );
        scene.render();
        const urls = recording.stop();

        assert.isAbove(container.meshes.length, 0, "the model has meshes");
        assert.include(urls, mtlUrl, "the MTL was read from the caller's URL");
        assert.include(urls, pngUrl, "the texture was read from the caller's URL");
        assert.lengthOf(container.textures, 1, "the MTL's texture belongs to the model");
        assertNoNetwork(urls);
    });

    it("loads a binary STL with no request", async () => {
        const { loadModelContainer } = await import("../../../src/models/chunk");
        const scene = makeScene();

        const recording = recordRequests();
        const container = await loadModelContainer(scene, stlBytes(), ".stl");
        container.addAllToScene();
        await vi.waitFor(
            () => {
                assert.isTrue(scene.isReady(), "the scene compiled its shaders");
            },
            { timeout: TIMEOUT_MS },
        );
        scene.render();
        const urls = recording.stop();

        assert.isAbove(container.meshes.length, 0, "the model has meshes");
        assertNoNetwork(urls);
    });

    it("refuses a decoder it does not bundle instead of fetching one", async () => {
        const { loadModelContainer } = await import("../../../src/models/chunk");
        const scene = makeScene();
        const gltf = JSON.stringify({
            asset: { version: "2.0" },
            extensionsUsed: ["KHR_draco_mesh_compression"],
            extensionsRequired: ["KHR_draco_mesh_compression"],
        });

        const recording = recordRequests();
        let failed = false;
        try {
            await loadModelContainer(scene, new TextEncoder().encode(gltf), ".gltf");
        } catch {
            failed = true;
        }
        const urls = recording.stop();

        assert.isTrue(failed, "a model that needs Draco fails to load");
        assertNoNetwork(urls);
    });

    it("refuses Babylon's CDN while a model loads, and only then", async () => {
        const { loadModelContainer } = await import("../../../src/models/chunk");
        const { Tools } = await import("@babylonjs/core/Misc/tools");
        const scene = makeScene();
        const cdn = "https://assets.babylonjs.com/environments/backgroundGround.png";
        const mtlUrl = blobUrl(`newmtl paint\nmap_Kd ${cdn}\n`, "text/plain");
        const obj = `mtllib ${mtlUrl}\nv 0 0 0\nv 1 0 0\nv 0 1 0\nusemtl paint\nf 1 2 3\n`;

        const recording = recordRequests();
        try {
            await loadModelContainer(scene, new TextEncoder().encode(obj), ".obj");
        } catch {
            // Refusing the texture may fail the whole load; either way nothing is fetched.
        }
        const urls = recording.stop();

        assertNoNetwork(urls);
        // Outside a load, Babylon's URL hooks are the page's own again.
        assert.include(Tools.GetBabylonScriptURL("https://cdn.babylonjs.com/x.js"), "cdn.babylonjs.com");
        assert.strictEqual(Tools.PreprocessUrl(cdn), cdn);
    });
});
