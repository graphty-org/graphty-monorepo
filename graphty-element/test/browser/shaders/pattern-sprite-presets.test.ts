/**
 * @file The pattern, state and sprite presets drawn by the element (design/rendering/shader-styles.md
 * sections 7.1, 7.2 and 8, package P3): every parameter at each end of its range draws without a
 * NaN in the element's own sample program, each preset draws on a real graph over a color layer,
 * the sticker's finishes draw apart, and frost on a pinned-state layer grows in from the rim when a
 * node is pinned and thaws when it is unpinned.
 */

import "../../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterAll, afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting, registerShader } from "../../../src/catalog/shaderRegistry";
import {
    drawingOf,
    isClockBinding,
    type ShaderParamDescriptor,
    type ShaderParams,
    type ShaderProblem,
} from "../../../src/catalog/shaders";
import type { LayerSpec } from "../../../src/catalog/types";
import { operationQueueOf } from "../../../src/Graph";
import { NodeShaderDrawing } from "../../../src/meshes/NodeShaderDrawing";
import { PATTERN_SPRITE_PRESETS, patternPresetId } from "../../../stories/shaders/patternSpritePresets";
import { drawnFrames } from "../../helpers/drawn-frames";
import type { Point } from "../../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

/**
 * A mounted element drawing in 2D, with nodes at fixed places.
 * @param nodes - The nodes.
 * @param layers - Layers added before the first frame is waited for.
 * @returns The element.
 */
async function mounted(
    nodes: readonly { id: string; x: number; y: number }[],
    layers: readonly LayerSpec[],
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = true;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(nodes.map(({ id, x, y }) => ({ id, position: { x, y, z: 0 } })));
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    for (const layer of layers) {
        await element.session.styles.add(layer);
    }

    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * Wait until a condition holds, counting drawn frames; fail after a bound.
 * @param element - The element.
 * @param what - What is awaited, for the failure.
 * @param holds - The condition.
 */
async function until(element: Graphty, what: string, holds: () => boolean | Promise<boolean>): Promise<void> {
    const scene = element.graph.getScene();
    let held = await holds();
    for (let i = 0; i < 600 && !held; i++) {
        await drawnFrames(scene, 1);
        held = await holds();
    }

    assert.isTrue(held, what);
}

/**
 * Whether some batch of the element's drawing holds exactly this many live slots.
 * @param element - The element.
 * @param count - The count.
 * @returns True when one does.
 */
function batchHolds(element: Graphty, count: number): boolean {
    const drawing = NodeShaderDrawing.peek(element.graph.getScene());
    return drawing !== undefined && [...drawing.stats().slots.values()].includes(count);
}

/**
 * Read one pixel of the canvas at a point in CSS pixels, after the next frame.
 * @param element - The element.
 * @param point - The point.
 * @returns r, g, b, a.
 */
async function pixelAt(element: Graphty, point: Point): Promise<[number, number, number, number]> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 1);
    const scale = engine.getRenderWidth() / WIDTH;
    const x = Math.round(point.x * scale);
    const y = Math.round(engine.getRenderHeight() - point.y * scale);
    const read = (await engine.readPixels(x, y, 1, 1)) as unknown as Uint8Array;
    return [read[0], read[1], read[2], read[3]];
}

/**
 * A point a multiple of a node's radius to the right of its center, on screen.
 * @param element - The element.
 * @param id - The node.
 * @param radii - How many radii out; 0 for the center.
 * @returns The point.
 */
function pointOf(element: Graphty, id: string, radii: number): Point {
    const node = element.graph.getNode(id);
    assert.isDefined(node, `the graph holds ${id}`);
    const at = node.mesh.getAbsolutePosition();
    const radius = node.roundRadius ?? node.size / 2;
    return element.worldToScreen(at.add(new Vector3(radius * radii, 0, 0)));
}

/**
 * The RGBA pixels of a PNG.
 * @param png - The image.
 * @returns Its pixels.
 */
async function pixelsOf(png: Blob | ShaderProblem): Promise<Uint8ClampedArray> {
    assert.instanceOf(png, Blob, JSON.stringify(png));
    const bitmap = await createImageBitmap(png);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height).data;
}

/**
 * The values to try a parameter at: each end of its range, every choice, black and white.
 * @param param - The parameter.
 * @returns The values.
 */
function endsOf(param: ShaderParamDescriptor): readonly (number | string | boolean)[] {
    // A parameter bound to a clock: each end of what the clock maps onto.
    if (isClockBinding(param.default)) {
        return [...(param.default.range ?? [0, 1])];
    }

    switch (param.type) {
        case "color":
            return ["#000000", "#ffffff"];
        case "enum":
            return (param.values ?? []).map((choice) => choice.value);
        case "boolean":
            return [false, true];
        default:
            return [param.min as number, param.max as number];
    }
}

/** What a probe draws for a pixel whose result is not a number: pure magenta, which no preset draws. */
const NAN_MARK = [255, 0, 255] as const;

/**
 * Register a probe of a preset: the same descriptor and body, with `shade` wrapped to draw
 * {@link NAN_MARK} where the preset's own result is not a number or is infinite. The element's
 * wrapper would otherwise replace such a pixel with the color beneath, which hides it.
 * @param index - The preset's place in the list.
 * @returns The probe's id.
 */
function probeOf(index: number): string {
    const { descriptor, body } = PATTERN_SPRITE_PRESETS[index];
    const id = `probe/${descriptor.id}`;
    const input = drawingOf(descriptor).startsWith("node") ? "NodeInput" : "EdgeInput";
    const wrapped = `${body.replace(/\bshade\s*\(/, "presetShade(")}
vec4 shade(${input} n) {
    vec4 c = presetShade(n);
    bool bad = any(isnan(c)) || any(isinf(c));
    return bad ? vec4(1.0, 0.0, 1.0, 1.0) : c;
}
`;
    // Without the preset's own picture, so the thumbnail is drawn from the probe's code.
    const { origin: _origin, thumbnail: _thumbnail, ...facts } = descriptor;
    registerShader({ descriptor: { ...facts, id }, glsl: wrapped });
    return id;
}

/**
 * Register a copy of a preset without its supplied picture, so its thumbnail is drawn.
 * @param presetId - The preset.
 * @returns The copy's id.
 */
function drawnCopyOf(presetId: string): string {
    const preset = PATTERN_SPRITE_PRESETS.find((each) => each.descriptor.id === patternPresetId(presetId));
    assert.isDefined(preset);
    const { origin: _origin, thumbnail: _thumbnail, ...facts } = preset.descriptor;
    const id = `copy/${presetId}`;
    registerShader({ descriptor: { ...facts, id }, glsl: preset.body });
    return id;
}

describe("the pattern, state and sprite presets, in the element's own sample program", () => {
    it.each(PATTERN_SPRITE_PRESETS.map((preset, index) => [preset.descriptor.id, index] as const))(
        "%s draws every parameter at each end of its range without a NaN",
        async (_id, index) => {
            const element = await mounted([{ id: "a", x: 0, y: 0 }], []);
            const probe = probeOf(index);
            const { params } = PATTERN_SPRITE_PRESETS[index].descriptor;
            const sets: ShaderParams[] = [{}];
            for (const param of params) {
                for (const value of endsOf(param)) {
                    sets.push({ [param.name]: value });
                }
            }

            let drawnAtDefaults = 0;
            for (const set of sets) {
                const pixels = await pixelsOf(await element.session.shaders.thumbnail(probe, set));
                let marked = 0;
                let opaque = 0;
                for (let at = 0; at < pixels.length; at += 4) {
                    const [r, g, b, a] = [pixels[at], pixels[at + 1], pixels[at + 2], pixels[at + 3]];
                    marked += r === NAN_MARK[0] && g === NAN_MARK[1] && b === NAN_MARK[2] && a > 250 ? 1 : 0;
                    opaque += a > 128 ? 1 : 0;
                }

                assert.strictEqual(
                    marked,
                    0,
                    `${JSON.stringify(set)} draws ${String(marked)} pixels that are not a number`,
                );
                if (Object.keys(set).length === 0) {
                    drawnAtDefaults = opaque;
                }
            }

            assert.isAbove(drawnAtDefaults, 1000, "the preset draws a node-sized picture at its defaults");
        },
    );

    it("draws the sticker's three finishes apart", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }], []);
        const id = drawnCopyOf("icon-sticker");
        const [none, shiny, holographic] = await Promise.all(
            ["none", "shiny", "holographic"].map(async (finish) =>
                pixelsOf(await element.session.shaders.thumbnail(id, { finish })),
            ),
        );
        const differs = (a: Uint8ClampedArray, b: Uint8ClampedArray): number => {
            let count = 0;
            for (let at = 0; at < a.length; at += 4) {
                count +=
                    Math.abs(a[at] - b[at]) + Math.abs(a[at + 1] - b[at + 1]) + Math.abs(a[at + 2] - b[at + 2]) > 30
                        ? 1
                        : 0;
            }

            return count;
        };
        assert.isAbove(differs(none, shiny), 200, "shiny adds a glare and a gloss");
        assert.isAbove(differs(none, holographic), 1000, "holographic lays foil over the body");
        assert.isAbove(differs(shiny, holographic), 1000);
    });
});

describe("the pattern, state and sprite presets on a graph", () => {
    it("each draws in place of the plain look over a color layer", async () => {
        const ids = PATTERN_SPRITE_PRESETS.map((preset) => patternPresetId(preset.descriptor.id));
        const nodes = ids.map((_, at) => ({ id: `n${String(at)}`, x: (at - 2.5) * 3, y: 0 }));
        const element = await mounted(nodes, [
            { name: "Color", target: "node", selector: { match: "everything" }, set: { "node.color": "#3366cc" } },
        ]);
        await drawnFrames(element.graph.getScene(), 2);
        const before = [];
        for (const { id } of nodes) {
            before.push(await pixelAt(element, pointOf(element, id, 0.5)));
        }

        for (const [at, shader] of ids.entries()) {
            await element.session.styles.add({
                name: shader,
                target: "node",
                selector: { match: "ids", nodes: [`n${String(at)}`] },
                set: { "node.shaders": [{ shader: shader }] },
            });
        }

        // Frost and the hologram enter; neither entrance plays for the layer's own add, so both
        // are drawn at rest.
        await until(element, "all six draw on the batches", () => {
            const drawing = NodeShaderDrawing.peek(element.graph.getScene());
            const live = drawing === undefined ? 0 : [...drawing.stats().slots.values()].reduce((a, b) => a + b, 0);
            return live === ids.length;
        });
        for (const [at, { id }] of nodes.entries()) {
            const after = await pixelAt(element, pointOf(element, id, 0.5));
            assert.notDeepEqual(after.slice(0, 3), before[at].slice(0, 3), `${ids[at]} changes what ${id} looks like`);
        }
    });
});

describe("frost on a pinned-state layer", () => {
    it("grows in from the rim when a node is pinned and thaws when it is unpinned", async () => {
        const element = await mounted(
            [
                { id: "a", x: -3, y: 0 },
                { id: "warm", x: 3, y: 0 },
            ],
            [
                { name: "Color", target: "node", selector: { match: "everything" }, set: { "node.color": "#3366cc" } },
                {
                    name: "Pinned",
                    target: "node",
                    selector: { match: "state", state: "pinned" },
                    set: { "node.shaders": [{ shader: patternPresetId("frost") }] },
                },
            ],
        );
        const pins = element.session.positions;
        // The shader resolves and compiles on first use: one node pinned and released first, so
        // the next pin draws on the batch from its first frame and plays its entrance.
        await pins.pin(["warm"]);
        await until(element, "frost draws on the warm-up node", () => batchHolds(element, 1));
        await pins.unpin(["warm"]);
        await until(element, "the warm-up node thawed", () => batchHolds(element, 0));

        // Frosted is the light blue ice; the node's own lit #3366cc has a red channel under 90.
        const frosted = (pixel: readonly number[]): boolean => pixel[0] > 120 && pixel[2] > 170;
        const center = pointOf(element, "a", 0);
        const rim = pointOf(element, "a", 0.85);
        assert.isFalse(frosted(await pixelAt(element, center)), "the node starts plain");

        await pins.pin(["a"]);
        let rimBeforeCenter = false;
        const seen: string[] = [];
        await until(element, "the frost reaches the center", async () => {
            const [r, c] = [await pixelAt(element, rim), await pixelAt(element, center)];
            seen.push(`${r.join(".")}/${c.join(".")}`);
            rimBeforeCenter ||= frosted(r) && !frosted(c);
            return frosted(c);
        });
        console.log("FROST", seen.join(" "));
        assert.isTrue(rimBeforeCenter, "the frost reached the rim before the center: it grows inward");
        assert.isTrue(batchHolds(element, 1));

        await pins.unpin(["a"]);
        await element.session.styles.settled();
        await operationQueueOf(element.graph).waitForCompletion();
        await drawnFrames(element.graph.getScene(), 1);
        assert.isTrue(batchHolds(element, 1), "the unpinned node keeps drawing frost while it thaws");
        await until(element, "the thaw ends and the node is drawn plainly", () => batchHolds(element, 0));
        assert.isFalse(frosted(await pixelAt(element, center)), "the frost is gone");
    });
});
