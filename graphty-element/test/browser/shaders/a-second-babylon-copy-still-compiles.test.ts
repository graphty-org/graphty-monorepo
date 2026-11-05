/**
 * @file The shaders that reach Babylon from a lazily loaded module compile even when that module
 * got its own copy of Babylon (issue #5894).
 *
 * `EdgeEffectBatch` and the shader runtime load on first use. A Vite dev server that re-optimizes
 * between the page loading and that first use serves them a new copy of `@babylonjs/core`, and a
 * page can hold two copies by other routes too. A program written to the shader store of the lazy
 * module's copy is missing from the store of the copy that compiles it, so Babylon fetched
 * `src/Shaders/<name>.fragment.fx`, got a 404, and the shader never drew.
 *
 * The store this file gives the element is that second copy's: it reads what the real one holds,
 * and what is written to it never reaches the real one.
 */

import "../../../src/graphty-element";

import type { ShaderMaterial } from "@babylonjs/core";
import { afterAll, afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
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

afterEach(() => {
    fetched.length = 0;
    onFetch = null;
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

afterAll(() => {
    XMLHttpRequest.prototype.open = open;
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
        { id: "a", position: { x: -6, y: 0, z: 0 } },
        { id: "b", position: { x: 6, y: 0, z: 0 } },
    ]);
    await element.session.data.addEdges([{ source: "a", target: "b" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * Whether the edge effect's program compiled.
 * @param element - The element.
 * @returns True once its batch has a compiled program.
 */
function compiled(element: Graphty): boolean {
    const meshes = element.graph.getScene().meshes.filter((mesh) => mesh.name.startsWith("edge-effect|"));
    return (
        meshes.length > 0 &&
        meshes.every((mesh) => (mesh.material as ShaderMaterial | null)?.getEffect()?.isReady() === true)
    );
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
        await operationQueueOf(element.graph).waitForCompletion();
        while (fetched.length === 0 && !compiled(element)) {
            await drawnFrames(element.graph.getScene(), 1);
        }

        assert.deepEqual(fetched, []);
        assert.isTrue(compiled(element));
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
