/**
 * @file Border, outline and halo, side by side on a sphere, a box and a star, in 2D and 3D.
 *
 * VERDICT (2026-11-19, judged by eye on the whole sheet, measured by the numbers this test writes):
 * - On the sphere, the default shape, the three are one look: a solid ring hugging the node. Drawn
 *   in one color they differ only in how wide the ring is, which is a setting, not a kind.
 * - Halo and Border draw the same geometry on every shape in both views (a ring that follows the
 *   node's own outline); the halo's ring is wider. Halo is not a kind of its own.
 * - Outline differs only on the box and the star, where it stays a circle. That goes to the owner;
 *   until he answers it is treated as not distinct.
 * So Border is the one kept kind. The Selected and Pinned starting rows draw a border instead of a
 * halo (src/session/styles/rows.ts). The halo stays in graphty-element because the selection
 * settings and `selection.peek` draw it.
 *
 * With one kept kind there is no pair to guard yet; this test keeps every cell drawing and, run
 * with VITE_BORDER_KINDS_SHEET=1, writes the sheet's pictures and numbers to tmp/border-kinds/.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { commands } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { nextFrame } from "../helpers/real-input";
import { pngOf } from "./shaders/presets/lit-surface-scene";

const WIDTH = 400;
const HEIGHT = 160;

/** The three shapes, left to right. */
const NODES = [
    { id: "sphere", position: { x: -3, y: 0, z: 0 } },
    { id: "box", position: { x: 0, y: 0, z: 0 } },
    { id: "star", position: { x: 3, y: 0, z: 0 } },
] as const;

/** Each kind at graphty-element's own defaults: only what switches it on is written. */
const KINDS = {
    none: {},
    border: { "node.borderColor": "#000000", "node.borderWidth": 0.1 },
    outline: { "node.outline": "#FFFF00" },
    halo: { "node.halo": true },
    // The same three in one color, so only their geometry differs.
    borderRed: { "node.borderColor": "#E00000", "node.borderWidth": 0.1 },
    outlineRed: { "node.outline": "#E00000" },
    haloRed: { "node.halo": true, "node.haloColor": "#E00000" },
} as const;

type Kind = keyof typeof KINDS;
type View = "2d" | "3d";

/** Whether to write the PNGs a person judges by (VITE_BORDER_KINDS_SHEET=1). */
const WRITE_SHEET = import.meta.env.VITE_BORDER_KINDS_SHEET === "1";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

interface Frame {
    readonly width: number;
    readonly height: number;
    readonly rgba: Uint8Array;
    /** Each node's center in device pixels, bottom row first. */
    readonly centers: Record<string, { x: number; y: number }>;
}

/**
 * The three shapes drawn with one kind, read back.
 * @param view - 2D or 3D.
 * @param kind - The kind.
 * @returns The canvas.
 */
async function draw(view: View, kind: Kind): Promise<Frame> {
    const element: Graphty = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES.map((node) => ({ ...node })));
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(view);
    for (const node of NODES) {
        await element.session.styles.add({
            name: node.id,
            target: "node",
            selector: { match: "ids", nodes: [node.id] },
            set: { "node.shape": node.id, ...KINDS[kind] },
        });
    }

    await element.session.styles.settled();
    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.setCameraState(
        view === "2d"
            ? { position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 }, zoom: 1 }
            : { position: { x: 0, y: 0, z: -8 }, target: { x: 0, y: 0, z: 0 } },
    );
    await element.waitForStableFrame();
    await element.graph.scene.whenReadyAsync();
    for (let frame = 0; frame < 3; frame++) {
        element.graph.scene.render();
        await nextFrame();
    }

    const { engine } = element.graph;
    engine.beginFrame();
    element.graph.scene.render();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const read = engine.readPixels(0, 0, width, height);
    engine.endFrame();
    const bytes = await read;
    const rgba = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width, height, rgba, centers: centersOf(width, height, rgba) };
}

/**
 * Each node's center: the middle of what differs from the background in its third of the canvas,
 * sphere, box and star from left to right.
 * @param width - Device pixels across.
 * @param height - Device pixels down.
 * @param rgba - The pixels, bottom row first.
 * @returns The centers.
 */
function centersOf(width: number, height: number, rgba: Uint8Array): Record<string, { x: number; y: number }> {
    const centers: Record<string, { x: number; y: number }> = {};
    NODES.forEach((node, third) => {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (let y = 0; y < height; y++) {
            for (let x = Math.floor((third * width) / 3); x < ((third + 1) * width) / 3; x++) {
                const at = (y * width + x) * 4;
                if (
                    Math.abs(rgba[at] - rgba[0]) + Math.abs(rgba[at + 1] - rgba[1]) + Math.abs(rgba[at + 2] - rgba[2]) >
                    30
                ) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        assert.isAtMost(minX, maxX, `${node.id} is drawn`);
        centers[node.id] = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    });
    return centers;
}

/** What one kind adds around one node, measured against the bare node. */
interface Added {
    /** Pixels within the node's third of the canvas that differ from the bare node by more than a glance. */
    readonly pixels: number;
    /** The nearest and farthest such pixel from the node's center, as a share of the bare node's radius. */
    readonly inner: number;
    readonly outer: number;
    /** The mean color of those pixels. */
    readonly color: readonly number[];
    /** Their mask, for comparing two kinds' footprints. */
    readonly mask: Set<number>;
}

/**
 * Sum of absolute channel differences at a pixel.
 * @param a - A frame.
 * @param b - A frame.
 * @param at - Byte offset.
 * @returns The difference, 0 to 765.
 */
function difference(a: Frame, b: Frame, at: number): number {
    return (
        Math.abs(a.rgba[at] - b.rgba[at]) +
        Math.abs(a.rgba[at + 1] - b.rgba[at + 1]) +
        Math.abs(a.rgba[at + 2] - b.rgba[at + 2])
    );
}

/**
 * The bare node's radius: the farthest pixel in its third that differs from the background.
 * @param bare - The bare frame.
 * @param id - The node.
 * @returns The radius in device pixels.
 */
function bareRadius(bare: Frame, id: string): number {
    const { width, height, rgba } = bare;
    const background = [rgba[0], rgba[1], rgba[2]];
    const center = bare.centers[id];
    let radius = 0;
    for (let y = 0; y < height; y++) {
        for (let x = Math.floor(center.x - width / 6); x < center.x + width / 6; x++) {
            const at = (y * width + x) * 4;
            const off =
                Math.abs(rgba[at] - background[0]) +
                Math.abs(rgba[at + 1] - background[1]) +
                Math.abs(rgba[at + 2] - background[2]);
            if (off > 30) {
                radius = Math.max(radius, Math.hypot(x - center.x, y - center.y));
            }
        }
    }

    return radius;
}

/**
 * What a kind adds around one node.
 * @param kind - The kind's frame.
 * @param bare - The bare frame.
 * @param id - The node.
 * @returns The measure.
 */
function added(kind: Frame, bare: Frame, id: string): Added {
    const { width, height } = kind;
    const center = bare.centers[id];
    const radius = Math.max(bareRadius(bare, id), 1);
    const mask = new Set<number>();
    const sum = [0, 0, 0];
    let inner = Infinity;
    let outer = 0;
    for (let y = 0; y < height; y++) {
        for (let x = Math.max(0, Math.floor(center.x - width / 6)); x < Math.min(width, center.x + width / 6); x++) {
            const at = (y * width + x) * 4;
            if (difference(kind, bare, at) <= 60) {
                continue;
            }

            mask.add(y * width + x);
            sum[0] += kind.rgba[at];
            sum[1] += kind.rgba[at + 1];
            sum[2] += kind.rgba[at + 2];
            const r = Math.hypot(x - center.x, y - center.y) / radius;
            inner = Math.min(inner, r);
            outer = Math.max(outer, r);
        }
    }

    const n = Math.max(mask.size, 1);
    return {
        pixels: mask.size,
        inner: mask.size === 0 ? 0 : inner,
        outer,
        color: sum.map((value) => Math.round(value / n)),
        mask,
    };
}

/**
 * How much two kinds' footprints overlap: shared pixels over all their pixels.
 * @param a - A kind's measure.
 * @param b - Another's.
 * @returns 0 (apart) to 1 (the same pixels).
 */
function overlap(a: Added, b: Added): number {
    let shared = 0;
    for (const pixel of a.mask) {
        if (b.mask.has(pixel)) {
            shared++;
        }
    }

    const union = a.mask.size + b.mask.size - shared;
    return union === 0 ? 1 : shared / union;
}

describe("border, outline and halo on a sphere, a box and a star", () => {
    for (const view of ["2d", "3d"] as const) {
        it(`in ${view.toUpperCase()}: each kind draws, and the sheet's numbers are recorded`, async () => {
            const frames = {} as Record<Kind, Frame>;
            for (const kind of Object.keys(KINDS) as Kind[]) {
                frames[kind] = await draw(view, kind);
                if (WRITE_SHEET) {
                    await commands.writeFile(
                        `tmp/border-kinds/${view}-${kind}.png`,
                        await pngOf(frames[kind]),
                        "base64",
                    );
                }
            }

            const report: Record<string, unknown> = {};
            for (const [suffix, node] of ["", "Red"].flatMap((s) => NODES.map((n) => [s, n] as const))) {
                const measures = {
                    border: added(frames[`border${suffix}` as Kind], frames.none, node.id),
                    outline: added(frames[`outline${suffix}` as Kind], frames.none, node.id),
                    halo: added(frames[`halo${suffix}` as Kind], frames.none, node.id),
                };
                report[`${node.id}${suffix}`] = {
                    border: { ...measures.border, mask: undefined },
                    outline: { ...measures.outline, mask: undefined },
                    halo: { ...measures.halo, mask: undefined },
                    overlap: {
                        borderOutline: overlap(measures.border, measures.outline),
                        borderHalo: overlap(measures.border, measures.halo),
                        outlineHalo: overlap(measures.outline, measures.halo),
                    },
                };
                for (const [kind, measure] of Object.entries(measures)) {
                    assert.isAbove(measure.pixels, 20, `${view} ${node.id}: ${kind} draws`);
                }
            }

            if (WRITE_SHEET) {
                await commands.writeFile(`tmp/border-kinds/${view}-measures.json`, JSON.stringify(report, null, 2));
            }
        });
    }
});
