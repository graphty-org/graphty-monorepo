/**
 * @file The lit node surfaces agree with the color the layers beneath chose, on the element's
 * own light canvas (design/rendering/shader-styles.md section 7.1).
 *
 * Each surface is drawn over a layer that paints half the nodes blue and half orange. The two
 * halves must stay apart in hue, so the canvas never contradicts a legend: at the preset's
 * defaults, by at least 25% of the fills' own difference, and with its Tint at 1, by at least
 * 45%. No surface may go near black, which on a light canvas reads as a black dot. Each preset is
 * checked with large nodes (its full program) and with a grid of nodes a few pixels across (a
 * heavy preset's small-size program).
 *
 * Each case leaves a PNG under tmp/preset-looks/ for a person to look at.
 */

import "../../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { commands } from "vitest/browser";

import type { Graphty } from "../../../../index.js";
import type { ShaderParams } from "../../../../src/catalog/shaders";
import { operationQueueOf } from "../../../../src/Graph";
import { NodeShaderDrawing } from "../../../../src/meshes/NodeShaderDrawing";
import { SHADER_PRESETS } from "../../../../src/shaders/presets";
import { drawnFrames } from "../../../helpers/drawn-frames";
import { canvasPixels, pngOf } from "./lit-surface-scene";

const WIDTH = 400;
const HEIGHT = 300;
const BLUE = [0x00, 0x72, 0xb2] as const;
const ORANGE = [0xe6, 0x9f, 0x00] as const;

/**
 * The lit materials, and the heavy surfaces that tint by the node's color. Anodized steel is
 * checked only at Tint 1: its oxide colors are the look, and Tint is how a reader brings the fill in.
 */
const SURFACES = [
    "matcap-ink",
    "pearl",
    "cel-shade",
    "halftone",
    "frosted-glass",
    "liquid-metal",
    "anodized-steel",
    "colorblind-patterns",
    "glass-marble",
    "disco-ball",
    "glass",
] as const;
const OWN_COLORS = new Set<string>(["anodized-steel"]);

/** Large nodes: two rows of four, the left two columns blue. */
const LARGE = Array.from({ length: 8 }, (_, i) => ({ id: `n${String(i)}`, x: ((i % 4) - 1.5) * 4, y: i < 4 ? 2 : -2 }));

/** 400 nodes a few pixels across, filling the canvas, the left half blue. */
const SMALL = Array.from({ length: 400 }, (_, i) => ({
    id: `n${String(i)}`,
    x: ((i % 20) - 9.5) * 2,
    y: (Math.floor(i / 20) - 9.5) * 2,
}));

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Mount the nodes in 2D, the left half blue and the right half orange, under the shader.
 * @param nodes - The nodes.
 * @param shader - The surface.
 * @param params - Its parameters.
 * @returns The element, once every node is drawn by the shader.
 */
async function mounted(
    nodes: readonly { id: string; x: number; y: number }[],
    shader: string,
    params: ShaderParams,
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
    const hex = (rgb: readonly number[]): string => `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
    await element.session.styles.add({
        name: "Fill",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": hex(ORANGE), "node.size": nodes.length > 8 ? 1 : 3 },
    });
    await element.session.styles.add({
        name: "Left",
        target: "node",
        selector: { match: "ids", nodes: nodes.filter((node) => node.x < 0).map((node) => node.id) },
        set: { "node.color": hex(BLUE) },
    });
    await element.session.styles.add({
        name: "Surface",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shaders": [{ shader: shader, params: params }] },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    const scene = element.graph.getScene();
    const drawn = (): boolean =>
        [...(NodeShaderDrawing.peek(scene)?.stats().slots.values() ?? [])].includes(nodes.length);
    for (let i = 0; i < 600 && !drawn(); i++) {
        await drawnFrames(scene, 1);
    }

    assert.isTrue(drawn(), "every node is drawn by the shader");
    await element.session.styles.settled();
    return element;
}

/** The mean color of a half of the canvas's node pixels, and how many there were. */
interface HalfMean {
    readonly rgb: readonly [number, number, number];
    readonly count: number;
}

/**
 * The mean color of the pixels in each half of the canvas that differ from its background.
 * @param pixels - The canvas.
 * @param pixels.width - Its width.
 * @param pixels.height - Its height.
 * @param pixels.rgba - Its pixels.
 * @returns The left and the right half's means.
 */
function halves({ width, height, rgba }: { width: number; height: number; rgba: Uint8Array }): [HalfMean, HalfMean] {
    const background = [rgba[0], rgba[1], rgba[2]];
    const sums = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const at = (y * width + x) * 4;
            const rgb = [rgba[at], rgba[at + 1], rgba[at + 2]];
            if (
                Math.abs(rgb[0] - background[0]) + Math.abs(rgb[1] - background[1]) + Math.abs(rgb[2] - background[2]) <
                24
            ) {
                continue;
            }

            const sum = sums[x < width / 2 ? 0 : 1];
            sum[0] += rgb[0];
            sum[1] += rgb[1];
            sum[2] += rgb[2];
            sum[3]++;
        }
    }

    const mean = (sum: number[]): HalfMean => ({
        rgb: [sum[0] / Math.max(sum[3], 1), sum[1] / Math.max(sum[3], 1), sum[2] / Math.max(sum[3], 1)],
        count: sum[3],
    });
    return [mean(sums[0]), mean(sums[1])];
}

/**
 * A color's blue against its red, which tells the two fills apart: high for blue, low for orange.
 * @param rgb - The color.
 * @returns Its blue minus its red, 0 to 255.
 */
function blueness(rgb: readonly number[]): number {
    return rgb[2] - rgb[0];
}

/**
 * Its luminance, 0 to 255.
 * @param rgb - The color.
 * @returns The luminance.
 */
function luminance(rgb: readonly number[]): number {
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/** The cases: each surface at its defaults and, where it has a Tint, at Tint 1, at each size. */
const CASES = SURFACES.flatMap((id) => {
    const tinted = SHADER_PRESETS.find((descriptor) => descriptor.id === id)?.params.some((p) => p.name === "tint");
    const looks = [
        ...(OWN_COLORS.has(id) ? [] : [["defaults", {}, 0.25] as const]),
        ...(tinted === true ? [["tint 1", { tint: 1 }, 0.45] as const] : []),
    ];
    return looks.flatMap(([look, params, bar]) =>
        (["large", "small"] as const).map((size) => [id, look, size, params, bar] as const),
    );
});

describe("the lit surfaces keep the fill color on the light canvas", () => {
    it.each(CASES)(
        "%s at %s, %s nodes: blue and orange stay apart, and nothing goes near black",
        async (id, look, size, params, bar) => {
            const element = await mounted(size === "large" ? LARGE : SMALL, id, params);
            const pixels = await canvasPixels(element);
            const file = `${id}-${look.replace(" ", "")}-${size}`;
            await commands.writeFile(`tmp/preset-looks/${file}.png`, await pngOf(pixels), "base64");
            const [left, right] = halves(pixels);
            assert.isAbove(left.count, 50, "the blue nodes are drawn");
            assert.isAbove(right.count, 50, "the orange nodes are drawn");

            const kept = (blueness(left.rgb) - blueness(right.rgb)) / (blueness(BLUE) - blueness(ORANGE));
            const where = `blue half ${left.rgb.map(Math.round).join(",")}, orange half ${right.rgb.map(Math.round).join(",")}`;
            assert.isAbove(kept, bar, `${file} keeps ${kept.toFixed(2)} of the fills' difference (${where})`);
            for (const half of [left, right]) {
                assert.isAbove(luminance(half.rgb), 55, `${file} is not near black (${where})`);
            }
        },
    );
});
