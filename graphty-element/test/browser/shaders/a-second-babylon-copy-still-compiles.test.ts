/**
 * @file The shaders that reach Babylon from a lazily loaded module compile even when that module
 * got its own copy of Babylon (issue #5894).
 *
 * Every shader drawing module (edges, nodes, the background, group outlines) and the shader runtime
 * load on first use. A Vite dev server that re-optimizes between the page loading and that first
 * use serves them a new copy of `@babylonjs/core`, and a page can hold two copies by other routes
 * too. The engine came from the first copy and compiles everything, so a program written to the
 * lazy module's store was missing from the one the compile reads: Babylon fetched
 * `src/Shaders/<name>.fragment.fx`, got a 404, and the shader never drew.
 *
 * The store this file gives the element is that second copy's: it reads what the real one holds,
 * and what is written to it never reaches the real one.
 */

import "../../../src/graphty-element";

import type { ShaderMaterial } from "@babylonjs/core";
import { afterAll, afterEach, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import { operationQueueOf } from "../../../src/Graph";
import type { RenderManager } from "../../../src/managers/RenderManager";
import { defineShader } from "../../../src/simple/defineShader";
import { presetId } from "../../../stories/shaders/edgePresets";
import { drawnFrames } from "../../helpers/drawn-frames";

vi.mock("@babylonjs/core", async (importOriginal) => {
    const real = await importOriginal<typeof import("@babylonjs/core")>();
    return {
        ...real,
        ShaderStore: {
            ShadersStore: Object.create(real.ShaderStore.ShadersStore) as Record<string, string>,
            ShadersStoreWGSL: real.ShaderStore.ShadersStoreWGSL,
        },
    };
});

/** A node surface that compiles. */
const PASTED = `/* graphty-shader 1
{ "id": "user/second-copy", "name": "Second copy" }
*/
vec4 shade(NodeInput n) {
    return vec4(n.color.rgb * 0.5, n.color.a);
}
`;

/** The shader program files the page asked the network for. */
const fetched: string[] = [];
/** Called when the page asks for one. */
let onFetch: (() => void) | null = null;
const { open } = XMLHttpRequest.prototype;
XMLHttpRequest.prototype.open = function watched(this: XMLHttpRequest, ...args: unknown[]): void {
    if (String(args[1]).endsWith(".fx")) {
        fetched.push(String(args[1]));
        onFetch?.();
    }

    Reflect.apply(open, this, args);
};

const cleanups: (() => void)[] = [];

beforeAll(() => {
    defineShader({ id: "second/node", glsl: "vec4 shade(NodeInput n) { return vec4(1.0, 0.0, 0.0, 1.0); }" });
    defineShader({ id: "second/sky", glsl: "vec4 shade(BackgroundInput b) { return vec4(0.0, 0.0, 1.0, 1.0); }" });
    defineShader({
        id: "second/outline",
        reach: 5,
        glsl: "vec4 shade(GroupInput g) { return vec4(1.0, 0.0, 0.0, g.field); }",
    });
});

afterEach(() => {
    fetched.length = 0;
    onFetch = null;
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

afterAll(() => {
    XMLHttpRequest.prototype.open = open;
    clearRegisteredShadersForTesting();
});

/**
 * A mounted element with one edge between two fixed nodes.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
        element.graph.dispose();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", group: "g", position: { x: -6, y: 0, z: 0 } },
        { id: "b", group: "g", position: { x: 6, y: 0, z: 0 } },
    ]);
    await element.session.data.addEdges([{ source: "a", target: "b" }]);
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * Whether every mesh of a shader batch has a compiled program.
 * @param element - The element.
 * @param prefix - How the batch's mesh names start.
 * @returns True once each has one.
 */
function compiled(element: Graphty, prefix: string): boolean {
    const meshes = element.graph.getScene().meshes.filter((mesh) => mesh.name.startsWith(prefix));
    return (
        meshes.length > 0 &&
        meshes.every((mesh) => (mesh.material as ShaderMaterial | null)?.getEffect()?.isReady() === true)
    );
}

/**
 * The scene passes of an element.
 * @param element - The element.
 * @returns Its background, outline and bloom passes.
 */
function passesOf(element: Graphty): ReturnType<RenderManager["shaderPasses"]> {
    return (element.graph as unknown as { renderManager: RenderManager }).renderManager.shaderPasses();
}

/**
 * Draw frames until a shader drew or a program was fetched, then require the first.
 * @param element - The element.
 * @param drew - Whether the shader drew.
 */
async function drawsWithoutFetching(element: Graphty, drew: () => boolean): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    while (fetched.length === 0 && !drew()) {
        await drawnFrames(element.graph.getScene(), 1);
    }

    assert.deepEqual(fetched, []);
    assert.isTrue(drew());
}

describe("a lazily loaded shader module on a second copy of Babylon", () => {
    it("compiles an edge effect without fetching its program", async () => {
        const element = await mounted();
        await element.session.styles.add({
            name: "Changes",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.shaders": [{ shader: presetId("edge-change") }] },
        });
        await drawsWithoutFetching(element, () => compiled(element, "edge-effect|"));
    });

    it("compiles a node shader without fetching its program", async () => {
        const element = await mounted();
        await element.session.styles.add({
            name: "Shaded",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: "second/node" }] },
        });
        await drawsWithoutFetching(element, () => compiled(element, "graphtyNode"));
    });

    it("draws a background shader without fetching its program", async () => {
        const element = await mounted();
        element.background = { backgroundType: "color", shader: { id: "second/sky" } };
        await drawsWithoutFetching(element, () => (passesOf(element).background?.draws ?? 0) > 0);
    });

    it("draws a group outline without fetching its program", async () => {
        const element = await mounted();
        await element.session.styles.add({
            name: "Outline",
            target: "node",
            selector: { match: "has", path: "data.group" },
            set: { "node.shaders": [{ shader: "second/outline" }] },
        });
        await drawsWithoutFetching(element, () => (passesOf(element).outline?.drawn().length ?? 0) === 1);
    });

    it("compiles a pasted shader without fetching its program", async () => {
        const element = await mounted();
        const asked = new Promise<void>((resolve) => {
            onFetch = resolve;
        });
        await Promise.race([element.session.shaders.add(PASTED), asked]);
        assert.deepEqual(fetched, []);
        assert.strictEqual(element.session.shaders.status("user/second-copy").state, "ready");
    });
});
