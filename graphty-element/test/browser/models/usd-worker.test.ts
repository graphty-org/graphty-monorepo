/**
 * @file The OpenUSD importer's worker: a scene's models, loaded together or one after another, share
 * one worker (OpenUSD's 10 MB of WebAssembly downloaded and compiled once) that is ended with the
 * scene, a stopped load ends its worker instead of running to
 * the end, and a page with no Worker is told the importer is missing rather than that the file is
 * damaged.
 *
 * Every worker the page starts is counted by a Worker subclass put in the page's place for the
 * test, which also counts the workers ended and the requests posted to them.
 */

import { Engine } from "@babylonjs/core/Engines/engine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { afterEach, assert, describe, it } from "vitest";

import { loadModel, ModelLoadFailure } from "../../../src/models/loadModel";

const FIXTURES = import.meta.glob<string>("../../../../babylonjs-models/test/fixtures/variants/usdz/*", {
    query: "?url",
    import: "default",
    eager: true,
});

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
    }
});

/**
 * A WebGL engine and scene on a canvas in the page.
 * @returns The scene.
 */
function makeScene(): Scene {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const engine = new Engine(canvas, false);
    const scene = new Scene(engine);
    cleanups.push(() => {
        engine.dispose();
        canvas.remove();
    });
    return scene;
}

/**
 * The USDZ cube's files.
 * @returns The set.
 */
async function cube(): Promise<Map<string, Uint8Array>> {
    const url = FIXTURES["../../../../babylonjs-models/test/fixtures/variants/usdz/cube.usdz"];
    return new Map([["cube.usdz", new Uint8Array(await (await fetch(url)).arrayBuffer())]]);
}

/** What the page's workers did while counted. */
interface Workers {
    started: number;
    ended: number;
    /** Called with each request posted to a worker. */
    onPost: (() => void) | undefined;
}

/**
 * Count every worker the page starts, ends and posts to, until the test ends.
 * @returns The counts.
 */
function countWorkers(): Workers {
    const counts: Workers = { started: 0, ended: 0, onPost: undefined };
    const Original = globalThis.Worker;
    class Counted extends Original {
        constructor(url: string | URL, options?: WorkerOptions) {
            super(url, options);
            counts.started++;
        }

        override terminate(): void {
            counts.ended++;
            super.terminate();
        }

        override postMessage(message: unknown, transfer?: Transferable[] | StructuredSerializeOptions): void {
            super.postMessage(message, transfer as Transferable[]);
            counts.onPost?.();
        }
    }
    globalThis.Worker = Counted;
    cleanups.push(() => {
        globalThis.Worker = Original;
    });
    return counts;
}

describe("the OpenUSD importer's worker", () => {
    it("is started once for a scene's models, together or one after another, and ended with the scene", async () => {
        const scene = makeScene();
        const files = await cube();
        const workers = countWorkers();
        const loaded = await Promise.all([1, 2, 3].map(() => loadModel(scene, files, "cube.usdz", "usdz")));
        loaded.push(await loadModel(scene, files, "cube.usdz", "usdz"));
        loaded.push(await loadModel(scene, files, "cube.usdz", "usdz"));
        for (const container of loaded) {
            assert.isAbove(container.meshes.length, 0, "each model has meshes");
            container.dispose();
        }
        assert.strictEqual(workers.started, 1, "one worker read all five");
        assert.strictEqual(workers.ended, 0, "kept while the scene lives");
        scene.dispose();
        assert.strictEqual(workers.ended, 1, "and ended when it is disposed");
    });

    it("is ended when a load is stopped while OpenUSD reads the model, and the load rejects", async () => {
        const scene = makeScene();
        const files = await cube();
        const workers = countWorkers();
        const stop = new AbortController();
        workers.onPost = () => {
            queueMicrotask(() => {
                stop.abort();
            });
        };
        const error = await loadModel(scene, files, "cube.usdz", "usdz", [], [], stop.signal).then(
            () => assert.fail("the stopped load resolved"),
            (e: unknown) => e,
        );
        assert.instanceOf(error, DOMException);
        assert.strictEqual(error.name, "AbortError");
        assert.strictEqual(workers.started, 1);
        assert.strictEqual(workers.ended, 1, "the worker reading it was ended");

        // The next load starts a worker of its own and is drawn.
        workers.onPost = undefined;
        const container = await loadModel(scene, files, "cube.usdz", "usdz");
        assert.isAbove(container.meshes.length, 0);
        assert.strictEqual(workers.started, 2);
        container.dispose();
    });

    it("is said to be missing on a page with no Worker", async () => {
        const scene = makeScene();
        const files = await cube();
        const Original = globalThis.Worker;
        Reflect.deleteProperty(globalThis, "Worker");
        cleanups.push(() => {
            globalThis.Worker = Original;
        });
        const error = await loadModel(scene, files, "cube.usdz", "usdz").then(
            () => assert.fail("the model loaded with no Worker"),
            (e: unknown) => e,
        );
        assert.instanceOf(error, ModelLoadFailure);
        assert.deepStrictEqual(error.fact, {
            code: "E_MODEL_DECODER_UNAVAILABLE",
            params: { format: "usd", reason: "missing" },
        });
    });
});
