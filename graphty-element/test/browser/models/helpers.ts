/**
 * @file What the model browser tests share: a mounted element, a stub of `fetch` that answers some
 * URLs with bytes, the element's `graphty-model-change` events, whether a node is drawn as a
 * model, the variant fixtures, a model drawn through a layer, and the canvas read as pixels.
 */

import "../../../src/graphty-element";

import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import { afterEach, assert, vi } from "vitest";

import manifest from "../../../../babylonjs-models/test/fixtures/variants/manifest.json";
import type { Graphty } from "../../../index.js";
import { type Graph, operationQueueOf } from "../../../src/Graph";
import type { CodedFact } from "../../../src/session/shared";
import type { ModelChange } from "../../../src/session/types";

/** Undone after each test, last first. */
export const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
    }
});

/**
 * Answer `fetch` for some URLs with bytes, and pass every other request through.
 * @param answers - URL to the bytes it answers with.
 * @returns Every URL requested while the stub was on.
 */
export function stubFetch(answers: ReadonlyMap<string, Uint8Array>): string[] {
    const requested: string[] = [];
    const original = globalThis.fetch.bind(globalThis);
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        requested.push(url);
        const bytes = answers.get(url);
        if (bytes !== undefined) {
            return Promise.resolve(new Response(bytes as Uint8Array<ArrayBuffer>, { status: 200 }));
        }

        return original(input, init);
    });
    cleanups.push(() => {
        spy.mockRestore();
    });
    return requested;
}

/**
 * Collect the element's `graphty-model-change` events.
 * @param element - The element.
 * @returns The events so far, growing.
 */
export function modelEvents(element: Graphty): ModelChange[] {
    const seen: ModelChange[] = [];
    const listener = (event: CustomEvent<ModelChange>): void => {
        seen.push(event.detail);
    };
    element.addEventListener("graphty-model-change", listener);
    cleanups.push(() => {
        element.removeEventListener("graphty-model-change", listener);
    });
    return seen;
}

/**
 * Wait for a model event that matches.
 * @param element - The element.
 * @param match - Which event.
 * @returns The event.
 */
export function nextModelEvent(element: Graphty, match: (change: ModelChange) => boolean): Promise<ModelChange> {
    return new Promise((resolve) => {
        const listener = (event: CustomEvent<ModelChange>): void => {
            if (match(event.detail)) {
                element.removeEventListener("graphty-model-change", listener);
                resolve(event.detail);
            }
        };
        element.addEventListener("graphty-model-change", listener);
    });
}

/**
 * A mounted element, drawn.
 * @param width - Its width in CSS pixels.
 * @param height - Its height.
 * @returns The element.
 */
export async function mount(width = 400, height = 300): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(width)}px`;
    element.style.height = `${String(height)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * Whether a node is drawn as a model now.
 * @param graph - The graph.
 * @param id - The node.
 * @returns True when its mesh instances a model template.
 */
export function drawnAsModel(graph: Graph, id: string): boolean {
    const mesh = graph.getNodeMesh(id);
    if (!(mesh instanceof InstancedMesh)) {
        return false;
    }

    return (mesh.sourceMesh.metadata as { graphtyModelGroup?: string } | null)?.graphtyModelGroup !== undefined;
}

/** Every model variant fixture file, by its path below babylonjs-models' variants folder. */
const VARIANT_URLS = import.meta.glob<string>("../../../../babylonjs-models/test/fixtures/variants/*/**", {
    query: "?url",
    import: "default",
    eager: true,
});

/**
 * The served URL of one variant's file.
 * @param id - The variant.
 * @param name - The file's path in its folder.
 * @returns The URL the test server serves it at.
 */
export function variantUrl(id: string, name: string): string {
    const url = VARIANT_URLS[`../../../../babylonjs-models/test/fixtures/variants/${id}/${name}`];
    if (url === undefined) {
        throw new Error(`no fixture ${id}/${name}`);
    }

    return url;
}

/**
 * A variant's files, as `manifest.json` lists them.
 * @param id - The variant.
 * @returns path to bytes.
 */
export async function filesOf(id: string): Promise<Map<string, Uint8Array>> {
    const variant = (manifest as { id: string; files: string[] }[]).find((v) => v.id === id);
    if (variant === undefined) {
        throw new Error(`no variant ${id}`);
    }

    const files = new Map<string, Uint8Array>();
    for (const name of variant.files) {
        files.set(name, new Uint8Array(await (await fetch(variantUrl(id, name))).arrayBuffer()));
    }

    return files;
}

/**
 * Draw a model on the given nodes through one layer, and wait until it is on screen.
 * @param element - The element.
 * @param files - The model's files, or a variant's id.
 * @param nodes - The nodes, with their x positions.
 * @param set - More values for the model layer.
 * @returns The model's problems once drawn, and the layer's id.
 */
export async function drawModel(
    element: Graphty,
    files: string | ReadonlyMap<string, Uint8Array>,
    nodes: readonly { id: string; x: number }[],
    set: Record<string, unknown> = {},
): Promise<{ problems: readonly CodedFact[]; layer: string; asset: string }> {
    const { graph } = element;
    const record = await element.session.assets.add({
        files: typeof files === "string" ? await filesOf(files) : files,
    });
    assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
    await graph.addNodes(nodes.map((n) => ({ id: n.id, position: { x: n.x, y: 0, z: 0 } })));
    await graph.setLayout("fixed", { dim: 3 });
    const drawn = nextModelEvent(
        element,
        (change) => change.ref === record.id && ["drawn", "failed", "rejected"].includes(change.state),
    );
    const layer = await element.session.styles.add({
        name: "model",
        target: "node",
        selector: { match: "everything" },
        set: { "node.model": record.id, ...set },
    });
    const { problems, state } = await drawn;
    assert.strictEqual(state, "drawn", JSON.stringify(problems));
    await operationQueueOf(graph).waitForCompletion();
    for (const node of nodes) {
        assert.isTrue(drawnAsModel(graph, node.id), `${node.id} draws the model`);
    }

    return { problems, layer: layer.id, asset: record.id };
}

/** One frame of the canvas, RGBA rows from the bottom. */
export interface Frame {
    readonly pixels: Uint8Array;
    readonly width: number;
    readonly height: number;
}

/**
 * Read the canvas once its picture is final.
 * @param element - The element.
 * @param settle - Whether to wait for the final picture first; false reads the frame as it is.
 * @returns The frame.
 */
export async function readFrame(element: Graphty, settle = true): Promise<Frame> {
    if (settle) {
        await element.waitForStableFrame();
    }

    const { engine, scene } = element.graph;
    scene.render();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const pixels = new Uint8Array((await engine.readPixels(0, 0, width, height)) as unknown as ArrayBufferLike);
    return { pixels, width, height };
}

/**
 * Count the pixels of a frame that pass a test, in its left and right halves.
 * @param frame - The frame.
 * @param match - Which pixels count.
 * @returns How many in each half.
 */
export function countIn(
    frame: Frame,
    match: (r: number, g: number, b: number) => boolean,
): { left: number; right: number } {
    const { pixels, width } = frame;
    const counts = { left: 0, right: 0 };
    for (let at = 0; at < pixels.length; at += 4) {
        if (match(pixels[at], pixels[at + 1], pixels[at + 2])) {
            counts[(at / 4) % width < width / 2 ? "left" : "right"]++;
        }
    }

    return counts;
}

/**
 * How many pixels differ between two frames of the same size.
 * @param a - One frame.
 * @param b - The other.
 * @returns The count of pixels whose color differs by more than a rounding step.
 */
export function pixelsChanged(a: Frame, b: Frame): number {
    let changed = 0;
    for (let at = 0; at < a.pixels.length; at += 4) {
        const step = Math.max(
            Math.abs(a.pixels[at] - b.pixels[at]),
            Math.abs(a.pixels[at + 1] - b.pixels[at + 1]),
            Math.abs(a.pixels[at + 2] - b.pixels[at + 2]),
        );
        if (step > 8) {
            changed++;
        }
    }

    return changed;
}
