/**
 * @file The `"batched"` render path never fails silently (issues #10022 and #10025).
 *
 * Its shaders are GLSL ES 3.00, which a WebGL1 context cannot compile: there the rows are drawn as
 * objects, and `rowCounts` says so. A batch shader the WebGL compiler refuses is reported as
 * `E_SHADER_REFUSED`, as WebGPU's always were. And the edits the batch makes to Babylon's shader
 * text are checked on every batch shader built, so a Babylon release that rewords a line they edit
 * is reported instead of drawing rows shaded differently from objects.
 *
 * WebGL always; WebGPU as well when `GRAPHTY_BROWSER_GPU` names a flag set.
 */

import "../../src/graphty-element";

import { Engine } from "@babylonjs/core/Engines/engine.js";
import { ShaderStore } from "@babylonjs/core/Engines/shaderStore.js";
import type { Effect } from "@babylonjs/core/Materials/effect.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { GraphtyError } from "../../src/errors";
import { operationQueueOf } from "../../src/Graph";
import { isRowBatch } from "../../src/meshes/RowPullPlugin";
import { readCanvas } from "../helpers/whole-canvas";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
    }
});

const NODES = Array.from({ length: 6 }, (_, id) => ({
    id,
    position: { x: (id % 3) * 1.5 - 1.5, y: Math.floor(id / 3) * 1.5 - 0.75, z: 0 },
}));

/**
 * Mount an element on the `"batched"` path.
 * @param renderer - The renderer.
 * @returns The element.
 */
async function mounted(renderer: "webgl" | "webgpu"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.renderPath = "batched";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * Load the nodes where they are given.
 * @param element - The element.
 */
async function load(element: Graphty): Promise<void> {
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3, spacing: 0 });
    await operationQueueOf(element.graph).waitForCompletion();
}

/**
 * The first error the element reports.
 * @param element - The element.
 * @returns The error.
 */
function firstError(element: Graphty): Promise<Error> {
    return new Promise((resolve) => {
        element.graph.on("error", (event) => {
            resolve(event.error);
        });
    });
}

/**
 * Change a shader in Babylon's store for the rest of the test, as a Babylon release would.
 * @param store - Which store.
 * @param name - The shader's key.
 * @param edit - The change.
 */
function editShader(store: Record<string, string>, name: string, edit: (code: string) => string): void {
    const original = store[name];
    assert.isString(original, `${name} is loaded`);
    const edited = edit(original);
    assert.notEqual(edited, original, `${name} was changed`);
    store[name] = edited;
    cleanups.push(() => {
        store[name] = original;
    });
}

/**
 * The batch effects drawn, once a frame has drawn them.
 * @param element - The element.
 * @returns The effects.
 */
function batchEffects(element: Graphty): Effect[] {
    const meshes = element.graph.scene.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && isRowBatch(mesh));
    return meshes.flatMap((mesh) => mesh.subMeshes.flatMap((subMesh) => subMesh.effect ?? []));
}

describe("batched on a WebGL1 context", () => {
    it("draws every row as an object and says so", async () => {
        // Any context id, as Babylon asks for them; the typed overloads name each id apart.
        const getContext = HTMLCanvasElement.prototype.getContext as (
            this: HTMLCanvasElement,
            id: string,
            options?: unknown,
        ) => RenderingContext | null;
        // A browser or GPU with no WebGL2: the context is refused, as such a browser refuses it.
        const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
            this: HTMLCanvasElement,
            id: string,
            options?: unknown,
        ) {
            return id === "webgl2" || id === "experimental-webgl2" ? null : getContext.call(this, id, options);
        } as typeof HTMLCanvasElement.prototype.getContext);
        cleanups.push(() => {
            spy.mockRestore();
        });

        const element = await mounted("webgl");
        const { engine } = element.graph;
        assert.instanceOf(engine, Engine);
        assert.equal(engine.webGLVersion, 1);
        await load(element);
        await element.waitForStableFrame();

        assert.equal(element.renderPath, "batched");
        assert.deepEqual(element.graph.rowCounts, {
            batchedNodes: 0,
            objectNodes: NODES.length,
            pulledEdges: 0,
            objectEdges: 0,
        });
        assert.equal(element.graph.rendererStatus?.drawing, true);
        const frame = await readCanvas(element.graph);
        const [r, g, b] = frame.pixels;
        let drawn = 0;
        for (let i = 0; i < frame.pixels.length; i += 4) {
            drawn += frame.pixels[i] !== r || frame.pixels[i + 1] !== g || frame.pixels[i + 2] !== b ? 1 : 0;
        }

        assert.isAbove(drawn, 500, "the nodes are drawn");
    });
});

describe("a batch shader WebGL refuses", () => {
    it("is reported, and drawing turns false", async () => {
        // Loads the shaders a batch compiles, so the next graph compiles them from the edited store.
        await load(await mounted("webgl"));
        // Breaks the batch's vertex shader only: the object rows' shader compiles as it did.
        editShader(ShaderStore.ShadersStore, "defaultVertexShader", (code) =>
            code.replace(
                "#define CUSTOM_VERTEX_MAIN_END",
                "#ifdef ROW_PULL\nnot glsl;\n#endif\n#define CUSTOM_VERTEX_MAIN_END",
            ),
        );

        const element = await mounted("webgl");
        const refused = firstError(element);
        await load(element);
        const error = await refused;

        assert.instanceOf(error, GraphtyError);
        assert.equal(error.code, "E_SHADER_REFUSED");
        assert.equal(error.details.stage, "compiler");
        assert.equal(element.graph.rendererStatus?.drawing, false);
    });
});

describe.each(RENDERERS)("the batch's shader edits on %s", (renderer) => {
    it("are in every batch shader built", async () => {
        const element = await mounted(renderer);
        const errors: unknown[] = [];
        element.graph.on("error", (event) => errors.push(event.error));
        await load(element);
        await element.waitForStableFrame();

        const effects = batchEffects(element);
        assert.isNotEmpty(effects);
        for (const effect of effects) {
            const vertex = effect.vertexSourceCodeBeforeMigration;
            const fragment = effect.fragmentSourceCodeBeforeMigration;
            assert.include(vertex, "/* row pull: an ordinary instance's normal */");
            assert.match(vertex, /#ifdef ROW_UNSCALED\n(?:mat4 |var )finalWorld/);
            assert.match(fragment, /#ifndef ROW_PULL\nalpha\*=(?:fragmentInputs\.)?vColor\.a;/);
        }

        assert.deepEqual(errors, []);
        assert.equal(element.graph.rendererStatus?.drawing, true);
    });

    it("are reported when Babylon's text no longer matches one", async () => {
        await load(await mounted(renderer));
        // A Babylon release that spaces the thin-instance normal line differently.
        const store = renderer === "webgpu" ? ShaderStore.ShadersStoreWGSL : ShaderStore.ShadersStore;
        editShader(store, "defaultVertexShader", (code) =>
            code.replace(/vNormalW=normalUpdated\/\s*vec3/, "vNormalW=normalUpdated / vec3"),
        );

        const element = await mounted(renderer);
        const refused = firstError(element);
        await load(element);
        const error = await refused;

        assert.instanceOf(error, GraphtyError);
        assert.equal(error.code, "E_SHADER_REFUSED");
        assert.equal(error.details.stage, "rewrite");
        assert.match(String(error.details.messages), /vNormalW/);
        assert.equal(element.graph.rendererStatus?.drawing, false);
    });
});
