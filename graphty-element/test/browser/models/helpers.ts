/**
 * @file What the model browser tests share: a mounted element, a stub of `fetch` that answers some
 * URLs with bytes, the element's `graphty-model-change` events, and whether a node is drawn as a
 * model.
 */

import "../../../src/graphty-element";

import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import { afterEach, vi } from "vitest";

import type { Graphty } from "../../../index.js";
import { type Graph, operationQueueOf } from "../../../src/Graph";
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
