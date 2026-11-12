/**
 * @file The scene the lit-surface preset tests and benchmark draw: a mounted element with a
 * sphere (drawn by the impostor batch) and a box (drawn on the mesh path), a color layer beneath,
 * and one layer naming the preset, plus the readings the tests make of it.
 */

import "../../../../src/graphty-element";

import type { Graphty } from "../../../../index.js";
import type { ShaderParams } from "../../../../src/catalog/shaders";
import { operationQueueOf } from "../../../../src/Graph";
import { NodeShaderDrawing } from "../../../../src/meshes/NodeShaderDrawing";
import { drawnFrames } from "../../../helpers/drawn-frames";

export const WIDTH = 400;
export const HEIGHT = 300;

/** The two nodes: a sphere and a box, side by side. */
export const NODES = [
    { id: "sphere", x: -3, y: 0 },
    { id: "box", x: 3, y: 0 },
] as const;

/** A drawn scene and the layer that names the shader. */
export interface LitScene {
    readonly element: Graphty;
    readonly layer: string;
    readonly dispose: () => void;
}

/**
 * Mount the scene and wait until both nodes are drawn by the shader.
 * @param shader - The shader id the layer names.
 * @param options - Options.
 * @param options.params - Its parameters.
 * @param options.size - The nodes' size; a large one fills the canvas.
 * @param options.only - Draw only the sphere.
 * @param options.renderer - Ask for the WebGPU renderer.
 * @returns The scene.
 */
export async function mountLitScene(
    shader: string,
    options: { params?: ShaderParams; size?: number; only?: boolean; renderer?: "webgpu" } = {},
): Promise<LitScene> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = true;
    if (options.renderer !== undefined) {
        element.renderer = options.renderer;
    }

    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    const nodes = options.only === true ? NODES.slice(0, 1) : NODES;
    await element.session.data.addNodes(nodes.map(({ id, x, y }) => ({ id, position: { x, y, z: 0 } })));
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.session.styles.add({
        name: "Colors",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#d55e00", ...(options.size === undefined ? {} : { "node.size": options.size }) },
    });
    await element.session.styles.add({
        name: "Box",
        target: "node",
        selector: { match: "ids", nodes: ["box"] },
        set: { "node.shape": "box" },
    });
    const layer = await element.session.styles.add({
        name: "Surface",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shaders": [{ shader: shader, params: options.params ?? {} }] },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await untilDrawn(element, options.only === true ? 0 : 1);

    return {
        element,
        layer: layer.id,
        dispose: () => {
            element.remove();
        },
    };
}

/**
 * Wait until the sphere is in a ready batch and the box on the mesh path, counting frames.
 * @param element - The element.
 * @param meshPath - How many nodes the mesh path should draw.
 */
export async function untilDrawn(element: Graphty, meshPath: number): Promise<void> {
    const scene = element.graph.getScene();
    const drawnBoth = (): boolean => {
        const stats = NodeShaderDrawing.peek(scene)?.stats();
        return stats !== undefined && stats.meshPath === meshPath && [...stats.slots.values()].includes(1);
    };
    for (let i = 0; i < 600 && !drawnBoth(); i++) {
        await drawnFrames(scene, 1);
    }

    if (!drawnBoth()) {
        throw new Error("the shader never drew on both paths");
    }

    await element.session.styles.settled();
    await drawnFrames(scene, 2);
}

/**
 * Every effect in the scene that failed to compile, with its error.
 * @param element - The element.
 * @returns The errors.
 */
export function compileErrors(element: Graphty): string[] {
    const scene = element.graph.getScene();
    const errors: string[] = [];
    const seen = new Set<unknown>();
    for (const mesh of scene.meshes) {
        const effects = [mesh.material?.getEffect?.(), ...(mesh.subMeshes ?? []).map((sub) => sub.effect)];
        for (const effect of effects) {
            if (effect === null || effect === undefined || seen.has(effect)) {
                continue;
            }

            seen.add(effect);
            const error = effect.getCompilationError();
            if (error !== "") {
                errors.push(`${mesh.name}: ${error}`);
            }
        }
    }

    return errors;
}

/**
 * The whole canvas, read back after the next frames, bottom row first.
 * @param element - The element.
 * @param frames - How many frames to wait for first.
 * @returns Width, height and RGBA pixels.
 */
export async function canvasPixels(
    element: Graphty,
    frames = 2,
): Promise<{ width: number; height: number; rgba: Uint8Array }> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), frames);
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const read = await engine.readPixels(0, 0, width, height);
    return { width, height, rgba: new Uint8Array(read.buffer, read.byteOffset, read.byteLength) };
}

/**
 * The canvas as a PNG, base64, top row first, for a person to look at.
 * @param pixels - The canvas, as {@link canvasPixels} reads it.
 * @returns The base64 PNG.
 */
export async function pngOf(pixels: { width: number; height: number; rgba: Uint8Array }): Promise<string> {
    const { width, height, rgba } = pixels;
    const flipped = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        flipped.set(rgba.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
    }

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("no 2d context");
    }

    context.putImageData(new ImageData(flipped, width, height), 0, 0);
    const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
    let text = "";
    for (const byte of bytes) {
        text += String.fromCharCode(byte);
    }

    return btoa(text);
}

/**
 * A body that draws magenta wherever the preset's own result is not a number or infinite, so a
 * NaN the wrapper would hide shows on the canvas.
 * @param body - The preset's body.
 * @returns The probing body.
 */
export function nanProbe(body: string): string {
    return `${body.replace("vec4 shade(NodeInput n)", "vec4 presetShade(NodeInput n)")}
vec4 shade(NodeInput n) {
    vec4 c = presetShade(n);
    bool bad = any(isnan(c)) || any(isinf(c));
    return bad ? vec4(1.0, 0.0, 1.0, 1.0) : c;
}
`;
}
