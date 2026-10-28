/**
 * @file The scene presets drawn by a real element (design/rendering/shader-styles.md section 8,
 * package P6): the nebula background and the soap-bubble and hull group outlines compile and draw;
 * every parameter at each end of its range draws without a NaN; motion is honored (each rests at
 * speed 0, and the nebula at drift 0 is drawn again only when the camera moves); none flashes more
 * than three times a second at its fastest; the nebula takes the group outlines' colors only when
 * asked; and a hull on a 10,000-node community layer splats one kernel per member.
 *
 * Each drawing case leaves a PNG under tmp/scene-presets/ for a person to look at.
 */

import "../../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { commands } from "vitest/browser";

import type { Graphty } from "../../../../index.js";
import { registerShader, shaderDescriptor } from "../../../../src/catalog/shaderRegistry";
import { drawingOf, type ShaderDescriptor, type ShaderParams } from "../../../../src/catalog/shaders";
import type { LayerSpec } from "../../../../src/catalog/types";
import { operationQueueOf } from "../../../../src/Graph";
import { everyFrameAnimationsOn } from "../../../../src/managers/everyFrameAnimations";
import type { RenderManager } from "../../../../src/managers/RenderManager";
import { FLASH_GRID, FlashCounter } from "../../../../src/managers/ShaderGuard";
import { shadersControllerOf } from "../../../../src/session/shaders";
import type { LazyShaderHost } from "../../../../src/shaders/chunk";
import { presetId, SCENE_PRESETS } from "../../../../stories/shaders/scenePresets";
import { drawnFrames } from "../../../helpers/drawn-frames";
import { canvasPixels, pngOf } from "./lit-surface-scene";

/** Which Chromium flag set the run asked for; empty when it asked for none (no WebGPU). */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** Three communities of seven nodes, about ten node radii apart, each in two subgroups. */
const COLORS = ["#e0703a", "#2f9e8f", "#6a5acd"];
const NODES = COLORS.flatMap((color, community) =>
    Array.from({ length: 7 }, (_, i) => {
        const angle = (i / 7) * Math.PI * 2;
        const r = i === 0 ? 0 : 4.5 + (i % 2) * 1.5;
        return {
            id: `c${String(community)}n${String(i)}`,
            community,
            sub: `${String(community)}${i % 2 === 0 ? "a" : "b"}`,
            color,
            x: 16 * Math.cos((community / 3) * Math.PI * 2) + r * Math.cos(angle),
            y: 16 * Math.sin((community / 3) * Math.PI * 2) + r * Math.sin(angle),
        };
    }),
);

/**
 * A mounted element with the communities in the 2D view, colored by community.
 * @param layers - Layers added above the colors.
 * @param options - Options.
 * @param options.nodes - Other nodes.
 * @param options.renderer - Ask for the WebGPU renderer.
 * @returns The element.
 */
async function mounted(
    layers: readonly LayerSpec[],
    options: { nodes?: readonly (typeof NODES)[number][]; renderer?: "webgpu" } = {},
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = true;
    if (options.renderer !== undefined) {
        element.renderer = options.renderer;
    }

    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(
        (options.nodes ?? NODES).map(({ id, x, y, ...data }) => ({ id, ...data, position: { x, y, z: 0 } })),
    );
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.setViewMode("2d");
    await element.session.styles.add({
        name: "Colors",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 0.9 },
        encode: { "node.color": { by: "data.color", scale: "passthrough" } },
    });
    for (const layer of layers) {
        await element.session.styles.add(layer);
    }

    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.waitForStableFrame();
    return element;
}

/**
 * The element's render manager, which holds the scene passes.
 * @param element - The element.
 * @returns It.
 */
function passesOf(element: Graphty): ReturnType<RenderManager["shaderPasses"]> {
    return (element.graph as unknown as { renderManager: RenderManager }).renderManager.shaderPasses();
}

/**
 * Wait until a condition holds, counting drawn frames; fail after a bound.
 * @param element - The element.
 * @param what - What is awaited, for the failure.
 * @param holds - The condition.
 */
async function until(element: Graphty, what: string, holds: () => boolean): Promise<void> {
    const scene = element.graph.getScene();
    for (let i = 0; i < 600 && !holds(); i++) {
        await drawnFrames(scene, 1);
    }

    assert.isTrue(holds(), what);
}

/**
 * A group outline over the communities.
 * @param shader - The group outline shader.
 * @param params - Its parameters.
 * @param groupBy - The data path it groups by.
 * @returns The layer.
 */
function outlineLayer(shader: string, params: ShaderParams = {}, groupBy = "data.community"): LayerSpec {
    return {
        name: `Outline ${groupBy}`,
        target: "node",
        selector: { match: "has", path: groupBy },
        set: { "node.shaders": [{ shader, params, groupBy }] },
    };
}

/**
 * Mount a preset: the nebula as the background, a group outline as one community layer.
 * @param id - The preset, or a shader registered from one.
 * @param kind - The preset's kind.
 * @param params - Its parameters.
 * @param options - As {@link mounted}.
 * @returns The element, once the shader drew.
 */
async function showing(
    id: string,
    kind: string,
    params: ShaderParams = {},
    options: Parameters<typeof mounted>[1] = {},
): Promise<Graphty> {
    if (kind === "background") {
        const element = await mounted([], options);
        element.background = { backgroundType: "color", color: "#000000", shader: { id, params } };
        await until(element, `${id} draws`, () => passesOf(element).background?.shown === true);
        return element;
    }

    const element = await mounted([outlineLayer(id, params)], options);
    await until(element, `${id} draws`, () => (passesOf(element).outline?.drawn()[0]?.groups.length ?? 0) === 3);
    return element;
}

/**
 * Wait for chances of the element's render loop to draw (a tick that drew or rested), asking the
 * scene for nothing: a frame observer would itself be something the loop draws for.
 * @param element - The element.
 * @param chances - How many.
 * @returns How many of them drew a frame.
 */
async function loopChances(element: Graphty, chances: number): Promise<number> {
    const { ticks } = (element.graph as unknown as { renderManager: { ticks: { drawn: number; rested: number } } })
        .renderManager;
    const start = ticks.drawn + ticks.rested;
    const drawnBefore = ticks.drawn;
    while (ticks.drawn + ticks.rested - start < chances) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    return ticks.drawn - drawnBefore;
}

/**
 * Point the element at a preset's parameters again and wait for the drawing.
 * @param element - The element.
 * @param id - The shader.
 * @param kind - Its kind.
 * @param params - The parameters.
 */
async function setParams(element: Graphty, id: string, kind: string, params: ShaderParams): Promise<void> {
    if (kind === "background") {
        element.background = { backgroundType: "color", color: "#000000", shader: { id, params } };
    } else {
        const layer = element.session.styles.list().find((each) => each.set?.["node.shaders"] !== undefined);
        assert.isDefined(layer);
        await element.session.styles.update(layer.id, {
            set: { "node.shaders": [{ shader: id, params, groupBy: "data.community" }] },
        });
        await element.session.styles.settled();
    }

    await element.graph.waitForStableFrame();
    await drawnFrames(element.graph.getScene(), 3);
}

/**
 * The probing twin of a preset: its body draws magenta wherever the preset's result is not a
 * number, so a NaN the wrapper would hide shows on the canvas.
 * @param descriptor - The preset.
 * @param body - Its body.
 * @returns The twin's id.
 */
function probeOf(descriptor: ShaderDescriptor, body: string): string {
    const id = `nan-probe/${descriptor.id}`;
    if (shaderDescriptor(id) === undefined) {
        const input = drawingOf(descriptor) === "background" ? "BackgroundInput b" : "GroupInput g";
        const arg = input.split(" ")[1];
        const glsl = `${body.replace(`vec4 shade(${input})`, `vec4 presetShade(${input})`)}
vec4 shade(${input}) {
    vec4 c = presetShade(${arg});
    bool bad = any(isnan(c)) || any(isinf(c));
    // A good pixel's blue is held under the magenta band: the membrane's rainbow reaches
    // near-magenta on a few pixels at large blob radii, which is a color, not a NaN.
    return bad ? vec4(1.0, 0.0, 1.0, 1.0) : vec4(c.rg, min(c.b, 0.9), c.a);
}
`;
        const { origin: _origin, ...facts } = descriptor;
        registerShader({ descriptor: { ...facts, id }, glsl });
    }

    return id;
}

/**
 * Each parameter alone at each end of its range, then all at their minimums and maximums.
 * @param descriptor - The preset.
 * @returns The sets, each with a name.
 */
function rangeEnds(descriptor: ShaderDescriptor): [string, ShaderParams][] {
    const ranged = descriptor.params.filter((param) => typeof param.min === "number" && typeof param.max === "number");
    const end = (which: "min" | "max"): ShaderParams =>
        Object.fromEntries(ranged.map((param) => [param.name, param[which] as number]));
    const enums = descriptor.params.flatMap((param): [string, ShaderParams][] =>
        (param.values ?? []).map((entry) => [`${param.name}-${entry.value}`, { [param.name]: entry.value }]),
    );
    return [
        ...ranged.flatMap((param): [string, ShaderParams][] => [
            [`${param.name}-min`, { [param.name]: param.min as number }],
            [`${param.name}-max`, { [param.name]: param.max as number }],
        ]),
        ...enums,
        ["all-min", end("min")],
        ["all-max", end("max")],
    ];
}

/**
 * How many pixels of a canvas are the probe's magenta.
 * @param rgba - The pixels.
 * @returns The count.
 */
function magentaPixels(rgba: Uint8Array): number {
    let count = 0;
    for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i] >= 250 && rgba[i + 1] <= 5 && rgba[i + 2] >= 250) {
            count++;
        }
    }

    return count;
}

/**
 * The canvas averaged down to the flashing check's grid.
 * @param rgba - The canvas pixels.
 * @param width - Its width.
 * @param height - Its height.
 * @returns FLASH_GRID x FLASH_GRID RGBA pixels.
 */
function downsample(rgba: Uint8Array, width: number, height: number): Uint8Array {
    const sums = new Float64Array(FLASH_GRID * FLASH_GRID * 5);
    for (let y = 0; y < height; y++) {
        const gy = Math.min(FLASH_GRID - 1, Math.floor((y * FLASH_GRID) / height));
        for (let x = 0; x < width; x++) {
            const cell = (gy * FLASH_GRID + Math.min(FLASH_GRID - 1, Math.floor((x * FLASH_GRID) / width))) * 5;
            for (let c = 0; c < 4; c++) {
                sums[cell + c] += rgba[(y * width + x) * 4 + c];
            }

            sums[cell + 4]++;
        }
    }

    const out = new Uint8Array(FLASH_GRID * FLASH_GRID * 4);
    for (let cell = 0; cell < FLASH_GRID * FLASH_GRID; cell++) {
        for (let c = 0; c < 4; c++) {
            out[cell * 4 + c] = Math.round(sums[cell * 5 + c] / Math.max(sums[cell * 5 + 4], 1));
        }
    }

    return out;
}

/**
 * Each parameter at its maximum, the enums at their defaults.
 * @param descriptor - The preset.
 * @returns The parameters.
 */
function highest(descriptor: ShaderDescriptor): ShaderParams {
    return Object.fromEntries(
        descriptor.params
            .filter((param) => typeof param.max === "number")
            .map((param) => [param.name, param.max as number]),
    );
}

const cases = SCENE_PRESETS.map((preset) => [preset.descriptor.id, preset] as const);

describe("the scene presets on a real element", () => {
    it.each(cases)("%s compiles and draws", async (id, { descriptor }) => {
        const element = await showing(presetId(id), drawingOf(descriptor));
        const pixels = await canvasPixels(element);
        await commands.writeFile(`tmp/scene-presets/${id}.png`, await pngOf(pixels), "base64");
        const { rgba } = pixels;
        const distinct = new Set<number>();
        for (let i = 0; i < rgba.length; i += 4 * 97) {
            distinct.add((rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2]);
        }

        assert.isAbove(distinct.size, 20, "it draws more than flat colors");
    });

    it.each(["goo", "membrane", "outline"])("the hull draws its %s look around nested subgroups", async (look) => {
        const shader = presetId("metaball-hull");
        const element = await mounted([outlineLayer(shader, { look }), outlineLayer(shader, { look }, "data.sub")]);
        await until(element, "both layers draw", () => passesOf(element).outline?.drawn().length === 2);
        await commands.writeFile(
            `tmp/scene-presets/hull-${look}.png`,
            await pngOf(await canvasPixels(element)),
            "base64",
        );
        assert.deepEqual(
            passesOf(element)
                .outline?.drawn()
                .map(({ depth }) => depth),
            [0, 1],
        );
    });

    it.skipIf(ADAPTER === "").each(cases)(
        "%s compiles and draws on the WebGPU renderer",
        async (id, { descriptor }) => {
            const element = await showing(presetId(id), drawingOf(descriptor), {}, { renderer: "webgpu" });
            assert.strictEqual(element.rendererStatus?.active, "webgpu", "the graph draws with WebGPU");
            await commands.writeFile(
                `tmp/scene-presets/${id}-webgpu.png`,
                await pngOf(await canvasPixels(element)),
                "base64",
            );
        },
    );

    it.each(cases)("%s draws every parameter at each end of its range without a NaN", async (id, preset) => {
        const probe = probeOf(preset.descriptor, preset.body);
        const element = await showing(probe, drawingOf(preset.descriptor));
        for (const [name, params] of rangeEnds(preset.descriptor)) {
            await setParams(element, probe, drawingOf(preset.descriptor), params);
            const { rgba } = await canvasPixels(element);
            assert.strictEqual(magentaPixels(rgba), 0, `${id} at ${name} draws a NaN or an infinity`);
        }
    });

    it.each(cases)("%s moves at its speed and rests at speed 0", async (id, { descriptor }) => {
        const shader = presetId(id);
        const speed = descriptor.motion.loop?.speedParam;
        assert.isDefined(speed);
        const element = await showing(shader, drawingOf(descriptor), { [speed]: 1 });
        const scene = element.graph.getScene();
        const pass = passesOf(element).background;
        if (pass === null) {
            // A group outline moves on every frame it draws.
            await drawnFrames(scene, 3);
            assert.isAbove(everyFrameAnimationsOn(scene), 0, "it keeps the frames coming");
            await setParams(element, shader, drawingOf(descriptor), { [speed]: 0 });
            assert.strictEqual(everyFrameAnimationsOn(scene), 0, "at speed 0 it rests");
            return;
        }

        // Watched passively, over the render loop's chances to draw: a background is drawn again
        // at its own rate (30 a second), asking only for the frames of its own ticks. It holds no
        // claim on every display frame, which drew the whole graph on each of them.
        const { draws } = pass;
        let unclaimed = 0;
        for (let chance = 0; chance < 60; chance++) {
            await loopChances(element, 1);
            unclaimed += everyFrameAnimationsOn(scene) === 0 ? 1 : 0;
        }

        assert.isAbove(pass.draws - draws, 3, "it keeps moving");
        assert.isAbove(unclaimed, 30, "between its ticks it asks for no frame");

        await setParams(element, shader, drawingOf(descriptor), { [speed]: 0 });
        await drawnFrames(scene, 2);
        const still = pass.draws;
        await loopChances(element, 20);
        assert.strictEqual(pass.draws, still, "at speed 0 it rests");
        assert.strictEqual(everyFrameAnimationsOn(scene), 0, "and asks for no frame");
    });

    it("the hull is still by default", async () => {
        const element = await showing(presetId("metaball-hull"), "group");
        const scene = element.graph.getScene();
        await drawnFrames(scene, 3);
        assert.strictEqual(everyFrameAnimationsOn(scene), 0);
    });

    it("the nebula at drift 0 is drawn again only when the camera moves", async () => {
        const element = await showing(presetId("nebula"), "background", { drift: 0 });
        const scene = element.graph.getScene();
        await drawnFrames(scene, 3);
        const pass = passesOf(element).background;
        const still = pass?.draws ?? 0;

        // Frames forced by something else: a style change repaints the nodes, not the backdrop.
        await element.session.styles.add({
            name: "Grow",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        await element.graph.waitForStableFrame();
        await drawnFrames(scene, 6);
        assert.strictEqual(pass?.draws, still, "no draw while the camera is still");

        await element.graph.setCameraState({ zoom: 2 });
        await element.graph.waitForStableFrame();
        await drawnFrames(scene, 2);
        assert.isAbove(pass?.draws ?? 0, still, "a camera move draws it again");
    });

    it("the nebula's stars are faint points, each smaller than a node", async () => {
        // No gas and no twinkle: what is lit is stars. A node of the scene above is about 8 px
        // across; each star must be a point well under that, and the stars together a sprinkle.
        const element = await showing(
            presetId("nebula"),
            "background",
            { density: 0, drift: 0, twinkle: 0 },
            {
                nodes: [],
            },
        );
        const { width, height, rgba } = await canvasPixels(element);
        await commands.writeFile("tmp/scene-presets/nebula-stars.png", await pngOf({ width, height, rgba }), "base64");
        const lit = new Uint8Array(width * height);
        for (let i = 0; i < lit.length; i++) {
            lit[i] = 0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2] > 60 ? 1 : 0;
        }

        // The largest star: a flood fill over the lit pixels, four-connected.
        let largest = 0;
        let total = 0;
        for (let start = 0; start < lit.length; start++) {
            if (lit[start] !== 1) {
                continue;
            }

            let size = 0;
            const stack = [start];
            lit[start] = 2;
            while (stack.length > 0) {
                const at = stack.pop() as number;
                size++;
                const x = at % width;
                for (const next of [at - width, at + width, x > 0 ? at - 1 : -1, x < width - 1 ? at + 1 : -1]) {
                    if (next >= 0 && next < lit.length && lit[next] === 1) {
                        lit[next] = 2;
                        stack.push(next);
                    }
                }
            }

            largest = Math.max(largest, size);
            total += size;
        }

        assert.isAbove(total, 0, "some stars are drawn");
        assert.isAtMost(largest, 16, "no star is as large as a node");
        assert.isBelow(total / (width * height), 0.01, "the stars are a sprinkle, not a blizzard");
    });

    it("the nebula takes the group outlines' colors only with tintBy group outlines", async () => {
        const nebula = presetId("nebula");
        const element = await mounted([outlineLayer(presetId("metaball-hull"), { look: "outline", fillOpacity: 0 })]);
        element.background = {
            backgroundType: "color",
            color: "#000000",
            shader: { id: nebula, params: { drift: 0 } },
        };
        await until(element, "the nebula draws", () => passesOf(element).background?.shown === true);
        await until(element, "the hulls draw", () => (passesOf(element).outline?.tints(4).length ?? 0) === 3);
        const plain = (await canvasPixels(element)).rgba;

        element.background = {
            backgroundType: "color",
            color: "#000000",
            shader: { id: nebula, params: { drift: 0, tintBy: "groups" } },
        };
        await drawnFrames(element.graph.getScene(), 3);
        const tinted = await canvasPixels(element);
        await commands.writeFile("tmp/scene-presets/nebula-tinted.png", await pngOf(tinted), "base64");
        let changed = 0;
        for (let i = 0; i < plain.length; i += 4) {
            changed += Math.abs(plain[i] - tinted.rgba[i]) > 8 ? 1 : 0;
        }

        assert.isAbove(changed, (plain.length / 4) * 0.05, "the gas near the groups takes their colors");
    });

    it.each(cases)("%s at its fastest flashes at most three times a second", async (id, { descriptor }) => {
        const element = await showing(presetId(id), drawingOf(descriptor), highest(descriptor));
        const host = shadersControllerOf(element.session)?.host as LazyShaderHost | null | undefined;
        const uniforms = host?.loaded?.uniforms;
        assert.isDefined(uniforms, "the shader runtime is loaded");

        // The scene's time stepped at 30 samples a second for three seconds, one drawn frame per
        // sample (the frame drawn after the time is written shows it): 30 a second still sees
        // every flash up to 15 a second, five times the limit.
        const scene = element.graph.getScene();
        let time = 0;
        const observer = scene.onBeforeRenderObservable.add(() => {
            uniforms.write(time);
        });
        try {
            const counter = new FlashCounter();
            let flashing = 0;
            for (let frame = 0; frame < 90; frame++) {
                time = frame / 30;
                const { width, height, rgba } = await canvasPixels(element, 1);
                flashing += counter.add(downsample(rgba, width, height), time * 1000) ? 1 : 0;
            }

            assert.strictEqual(flashing, 0, "no area of the canvas flashed more than three times a second");
        } finally {
            scene.onBeforeRenderObservable.remove(observer);
        }
    });

    it("a hull on a 10,000-node community layer splats one kernel per member", async () => {
        const nodes = Array.from({ length: 10_000 }, (_, i) => {
            const community = i % 8;
            const angle = (community / 8) * Math.PI * 2;
            const k = Math.floor(i / 8);
            return {
                id: `n${String(i)}`,
                community,
                sub: "",
                color: COLORS[community % 3],
                x: 300 * Math.cos(angle) + (k % 35) * 4,
                y: 300 * Math.sin(angle) + Math.floor(k / 35) * 4,
            };
        });
        const element = await mounted([outlineLayer(presetId("metaball-hull"))], { nodes });
        const pass = await (async () => {
            await until(
                element,
                "the hulls draw",
                () => (passesOf(element).outline?.drawn()[0]?.groups.length ?? 0) === 8,
            );
            return passesOf(element).outline;
        })();
        // The field costs members x kernel area: each member's kernel is splatted once, and the
        // hull's program reads the field per pixel of its group's box, never the members.
        assert.strictEqual(pass?.splats(), 10_000);
    });
});

describe("the background, bottom to top: color, image, shader", () => {
    /**
     * The canvas's corner pixel, where no node is drawn.
     * @param element - The element.
     * @returns Its red, green and blue.
     */
    async function corner(element: Graphty): Promise<[number, number, number]> {
        const { width, height, rgba } = await canvasPixels(element);
        const at = ((height - 4) * width + 4) * 4;
        return [rgba[at], rgba[at + 1], rgba[at + 2]];
    }

    /** Nebula with no gas and no stars, so its alpha is the sky's. */
    const CLEAR_SKY = { drift: 0, density: 0, stars: 0, sky: 0 };

    it("shows the color where the shader's alpha is low", async () => {
        const element = await mounted([]);
        element.background = { backgroundType: "color", color: "#ff0000", shader: { id: "nebula", params: CLEAR_SKY } };
        await until(element, "the nebula draws", () => passesOf(element).background?.shown === true);
        const [r, g, b] = await corner(element);
        assert.isAbove(r, 240, "the red color shows through");
        assert.isBelow(g + b, 20, "and nothing else is over it");

        // The same nebula with an opaque sky covers the color.
        element.background = {
            backgroundType: "color",
            color: "#ff0000",
            shader: { id: "nebula", params: { ...CLEAR_SKY, sky: 1 } },
        };
        await element.graph.waitForStableFrame();
        await drawnFrames(element.graph.getScene(), 3);
        assert.isBelow((await corner(element))[0], 20, "an opaque sky hides the color");
    });

    it("shows the skybox image beneath the shader, and the dome hides while the shader draws it", async () => {
        const image = new OffscreenCanvas(8, 8);
        const context = image.getContext("2d");
        assert.isNotNull(context);
        context.fillStyle = "#0000ff";
        context.fillRect(0, 0, 8, 8);
        const blob = await image.convertToBlob({ type: "image/png" });
        const data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.readAsDataURL(blob);
        });
        const element = await mounted([]);
        element.background = {
            backgroundType: "skybox",
            data,
            color: "#ff0000",
            shader: { id: "nebula", params: CLEAR_SKY },
        };
        await until(element, "the nebula draws", () => passesOf(element).background?.shown === true);
        const scene = element.graph.getScene();
        const dome = scene.meshes.find((mesh) => mesh.name.startsWith("testdome"));
        await until(element, "the dome hides", () => dome?.isEnabled() === false);
        // The image arrives after the shader first draws; the pass draws again once it has.
        let [r, g, b] = await corner(element);
        for (let i = 0; i < 120 && b < 240; i++) {
            await drawnFrames(scene, 1);
            [r, g, b] = await corner(element);
        }

        assert.isAbove(b, 240, "the blue image shows through the clear sky");
        assert.isBelow(r + g, 20, "over the red color");
    });
});
