/**
 * @file The style combination matrix's own arithmetic (issue #10370): the all-pairs selection covers every
 * pair, the palette's colors cannot be mistaken for a blend of two others, and the border checks pass on a
 * drawn ring that keeps its promise and fail on one that does not.
 */

import { assert, describe, it } from "vitest";

import {
    allCases,
    BACKGROUND,
    CLASS_DISTANCE,
    type Classes,
    classify,
    CONDITION_FACTORS,
    covering,
    measureNode,
    meshRingChecks,
    type NodeFrames,
    type P2,
    PALETTE,
    type Part,
    partIndex,
    type Plane,
    RING_FACTORS,
    type Run,
    SETTING_FACTORS,
    type Settings,
    shardOf,
    tidy,
} from "../helpers/style-matrix";

const SETTINGS: Settings = {
    shape: "sphere",
    border: "outside",
    outer: "none",
    plate: "none",
    shadow: "none",
    effect: "none",
    sizeSpace: "scene",
    extents: "uniform",
    label: "none",
    edges: "off",
};

/** 20 pixels a unit, the origin at (100, 100), y down. */
const PLANE: Plane = { m: [20, 0, 100, 0, -20, 100, 0, 0, 1], inverse: [0.05, 0, -5, 0, -0.05, 5, 0, 0, 1] };

/**
 * A 200 by 200 frame of a disc of fill and, optionally, a ring round it.
 * @param ring - The ring's inner and outer radius in pixels and its center's shift right, or none.
 * @returns The classified frame.
 */
function disc(ring?: { inner: number; outer: number; shift: number }): Classes {
    const parts = new Int8Array(200 * 200).fill(partIndex("bg"));
    for (let y = 0; y < 200; y++) {
        for (let x = 0; x < 200; x++) {
            const r = Math.hypot(x + 0.5 - 100, y + 0.5 - 100);
            if (ring !== undefined) {
                const rr = Math.hypot(x + 0.5 - 100 - ring.shift, y + 0.5 - 100);
                if (rr <= ring.outer) {
                    parts[y * 200 + x] = partIndex("border");
                }
            }
            if (r <= 20) {
                parts[y * 200 + x] = partIndex("fill");
            }
        }
    }
    return { parts, width: 200, height: 200 };
}

/**
 * The border checks on a frame.
 * @param full - The frame with the ring.
 * @returns Each check's name and whether it passed.
 */
function checksOn(full: Classes): Map<string, boolean> {
    const { checks } = measureNode(SETTINGS, {
        full,
        plain: disc(),
        plane: PLANE,
        reach: 2.6,
        dpr: 1,
        sizeFactor: 1,
        view: "2d",
    });
    return new Map(checks.map((c) => [c.name, c.pass]));
}

/**
 * A 200 by 200 frame painted pixel by pixel.
 * @param paint - The part at a pixel center, in pixels from (100, 100) (y down), or undefined for background.
 * @returns The classified frame.
 */
function frame(paint: (x: number, y: number) => Part | undefined): Classes {
    const parts = new Int8Array(200 * 200);
    for (let y = 0; y < 200; y++) {
        for (let x = 0; x < 200; x++) {
            parts[y * 200 + x] = partIndex(paint(x + 0.5 - 100, y + 0.5 - 100) ?? "bg");
        }
    }
    return { parts, width: 200, height: 200 };
}

/** The angle of a pixel offset in degrees, y down, from -180 to 180. */
const degrees = (x: number, y: number): number => (Math.atan2(y, x) * 180) / Math.PI;

/**
 * The checks measureNode makes on a frame against a plain disc of radius 20.
 * @param settings - The settings to differ from the outside border's.
 * @param full - The full frame.
 * @param frames - Frames to differ from the default.
 * @returns The checks by name.
 */
function measured(
    settings: Partial<Settings>,
    full: Classes,
    frames: Partial<NodeFrames> = {},
): Map<string, { pass: boolean; unread?: boolean; measured: number }> {
    const { checks } = measureNode(
        { ...SETTINGS, ...settings },
        { full, plain: disc(), plane: PLANE, reach: 2.6, dpr: 1, sizeFactor: 1, view: "2d", ...frames },
    );
    return new Map(checks.map((c) => [c.name, c]));
}

describe("style combination matrix", () => {
    it("covers every pair of factor values", () => {
        const factors = { ...SETTING_FACTORS, ...CONDITION_FACTORS };
        const rows = covering(factors);
        const names = Object.keys(factors) as (keyof typeof factors)[];
        for (const [i, a] of names.entries()) {
            for (const b of names.slice(i + 1)) {
                for (const va of factors[a]) {
                    for (const vb of factors[b]) {
                        assert.isTrue(
                            rows.some((row) => row[a] === va && row[b] === vb),
                            `${a}=${va} with ${b}=${vb}`,
                        );
                    }
                }
            }
        }
    });

    it("covers every triple of the ring settings' values", () => {
        const triples = allCases().filter((c) => c.family === "triples");
        const [a, b, c] = ["shape", "border", "plate"] as const;
        for (const va of SETTING_FACTORS[a]) {
            for (const vb of SETTING_FACTORS[b]) {
                for (const vc of SETTING_FACTORS[c]) {
                    assert.isTrue(
                        triples.some((t) => t.settings[a] === va && t.settings[b] === vb && t.settings[c] === vc),
                        `${va} ${vb} ${vc}`,
                    );
                }
            }
        }
        assert.includeMembers([...RING_FACTORS], [a, b, c]);
    });

    it("splits the cases into shards that together hold each once", () => {
        const cases = allCases();
        const ids = [0, 1, 2, 3].flatMap((i) => shardOf(cases, i, 4).map((c) => c.id));
        assert.strictEqual(ids.length, cases.length);
        assert.strictEqual(new Set(ids).size, cases.length);
    });

    it("keeps the palette's colors apart, and clear of their blends with the background and the fill", () => {
        // A blended edge pixel lies on the segment between two colors. Every part meets the background and
        // the fill, so those blends must never land on a third part; a blend between two rings is one pixel
        // and inside the checks' edge tolerance.
        const colors = Object.values(PALETTE) as (readonly number[])[];
        const neighbors = [BACKGROUND, PALETTE.fill] as (readonly number[])[];
        for (const [ik, k] of colors.entries()) {
            for (const [ia, a] of colors.entries()) {
                if (ia !== ik) {
                    assert.isAbove(
                        Math.hypot(...k.map((v, c) => v - a[c])),
                        2 * CLASS_DISTANCE,
                        `${String(k)} vs ${String(a)}`,
                    );
                }
                for (const b of neighbors) {
                    if (ia === ik || b === k || b === a) {
                        continue;
                    }
                    const ab = a.map((v, c) => b[c] - v);
                    const length = ab.reduce((s, v) => s + v * v, 0);
                    const t = Math.max(0, Math.min(1, ab.reduce((s, v, c) => s + v * (k[c] - a[c]), 0) / length));
                    const d = Math.hypot(...k.map((v, c) => v - (a[c] + t * ab[c])));
                    assert.isAbove(d, CLASS_DISTANCE, `${String(k)} sits between ${String(a)} and ${String(b)}`);
                }
            }
        }
    });

    it("classifies against the clear color, not a corner a node covers", () => {
        // a 2 by 1 frame: fill in the corner pixel, background beside it
        const frame = { data: new Uint8Array([...PALETTE.fill, 255, ...BACKGROUND, 255]), width: 2, height: 1 };
        const { parts } = classify(frame, BACKGROUND);
        assert.deepEqual([...parts], [partIndex("fill"), partIndex("bg")]);
    });

    it("passes a ring that is its width wide, against the fill and centered", () => {
        const passes = checksOn(disc({ inner: 20, outer: 29, shift: 0 }));
        for (const [name, pass] of passes) {
            assert.isTrue(pass, name);
        }
    });

    it("fails a ring that is off center", () => {
        const passes = checksOn(disc({ inner: 20, outer: 29, shift: 4 }));
        assert.isFalse(passes.get("border-concentric"));
        assert.isFalse(passes.get("border-width-thinnest"));
    });

    it("fails a ring that is too thin, or that leaves a gap", () => {
        assert.isFalse(checksOn(disc({ inner: 20, outer: 24, shift: 0 })).get("border-width-median"));
        const gap = disc({ inner: 20, outer: 29, shift: 0 });
        for (let i = 0; i < gap.parts.length; i++) {
            const x = (i % 200) + 0.5 - 100;
            const y = Math.floor(i / 200) + 0.5 - 100;
            const r = Math.hypot(x, y);
            if (r > 20 && r <= 23) {
                gap.parts[i] = partIndex("bg");
            }
        }
        assert.isFalse(checksOn(gap).get("border-touches-fill"));
    });
    it("passes a ring mesh its promised distance out and centered, and fails one moved off center", () => {
        const square = (half: number, dx = 0): P2[] => [
            [-half + dx, -half],
            [half + dx, -half],
            [half + dx, half],
            [-half + dx, half],
        ];
        const good = meshRingChecks(square(1), square(1.45), 0.45, 0.01, true, "border");
        assert.isTrue(good.every((c) => c.pass));
        const moved = new Map(
            meshRingChecks(square(1), square(1.45, 0.1), 0.45, 0.01, true, "border").map((c) => [c.name, c.pass]),
        );
        assert.isFalse(moved.get("mesh-border-centered"));
        assert.isFalse(meshRingChecks(square(1), square(1.3), 0.45, 0.01, true, "border")[0].pass);
    });

    it("passes a label below its node and fails one over it", () => {
        const withLabel = (top: number): Classes => {
            const full = disc();
            for (let y = top; y <= top + 10; y++) {
                for (let x = 90; x <= 110; x++) {
                    full.parts[y * 200 + x] = partIndex("label");
                }
            }
            return full;
        };
        const run = (top: number): Map<string, boolean> => {
            const { checks } = measureNode(
                { ...SETTINGS, border: "none", label: "bottom" },
                {
                    full: withLabel(top),
                    plain: disc(),
                    plane: PLANE,
                    reach: 2.6,
                    dpr: 1,
                    sizeFactor: 1,
                    view: "2d",
                    labelReadable: true,
                },
            );
            return new Map(checks.map((c) => [c.name, c.pass]));
        };
        assert.isTrue([...run(125).values()].every(Boolean));
        assert.isFalse(run(112).get("label-off-node"));
    });

    it("joins a one-sample fragment where a ray grazes an outline, and a long blended seam it crosses at a slant", () => {
        const [FILL, BORDER, MIXED, BG] = (["fill", "border", "mixed", "bg"] as const).map(partIndex);
        const run = (part: number, from: number, to: number): Run => ({ part, from, to });
        // 20 pixels a unit: the border for one sample (0 px), then fill again, then the ring
        const grazing = tidy(
            [
                run(FILL, 0, 1),
                run(BORDER, 1.015, 1.015),
                run(FILL, 1.03, 1.1),
                run(BORDER, 1.115, 1.55),
                run(BG, 1.565, 2),
            ],
            20,
        );
        assert.deepEqual(
            grazing.map((r) => [r.part, r.from, r.to]),
            [
                [FILL, 0, 1.1],
                [BORDER, 1.115, 1.55],
                [BG, 1.565, 2],
            ],
        );
        // a 2.4 pixel seam inside the ring
        const seam = tidy(
            [run(FILL, 0, 1), run(BORDER, 1.01, 1.2), run(MIXED, 1.21, 1.33), run(BORDER, 1.34, 1.5)],
            20,
        );
        assert.deepEqual(
            seam.map((r) => r.part),
            [FILL, BORDER],
        );
        assert.strictEqual(seam[1].to, 1.5);
    });

    it("joins a stair step of one-sample fragments with blended pixels round them", () => {
        const [FILL, BORDER, MIXED, BG] = (["fill", "border", "mixed", "bg"] as const).map(partIndex);
        const run = (part: number, from: number, to: number): Run => ({ part, from, to });
        // bs-cone-inside-2d-near-a1 ray 7, in pixels (one unit a pixel): a ray crossing the anti-aliased fill and
        // border edge at a shallow angle meets a sample of border, a sample of fill, then the 30 px ring
        const stair = tidy(
            [
                run(FILL, 0, 13.2),
                run(MIXED, 13.5, 14.1),
                run(BORDER, 14.4, 14.7),
                run(FILL, 15, 15.3),
                run(MIXED, 15.6, 16.2),
                run(BORDER, 16.5, 54.3),
                run(MIXED, 54.6, 54.9),
                run(BG, 55.2, 140.7),
            ],
            1,
        );
        assert.deepEqual(
            stair.map((r) => [r.part, r.from, r.to]),
            [
                [FILL, 0, 15.3],
                [MIXED, 15.6, 16.2],
                [BORDER, 16.5, 54.3],
                [MIXED, 54.6, 54.9],
                [BG, 55.2, 140.7],
            ],
        );
        // a thin ring that really is thin is kept: fill, a blended pixel, a 1 px border, then background
        const thin = tidy([run(FILL, 0, 10), run(MIXED, 10.3, 10.6), run(BORDER, 10.9, 11.2), run(BG, 11.5, 30)], 1);
        assert.deepEqual(
            thin.map((r) => r.part),
            [FILL, MIXED, BORDER, BG],
        );
    });

    it("reads a database node's border past the rim it draws across its face", () => {
        // the rim: a band in the border's color across the fill above its center
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 20) {
                return y >= -12 && y <= -7 ? "border" : "fill";
            }
            return r <= 29 ? "border" : undefined;
        });
        const database = measured({ shape: "database" }, full);
        for (const [name, c] of database) {
            assert.isTrue(c.pass, name);
        }
        // read as the ring, the rim is a border 0 wide
        assert.isFalse(measured({}, full).get("border-width-thinnest")?.pass);
    });

    it("leaves a ring's mitred corner out of its centroid", () => {
        // a corner reaching 4 pixels past the band on one side only
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 20) {
                return "fill";
            }
            return r <= 29 || (Math.abs(degrees(x, y)) <= 26 && r <= 33) ? "border" : undefined;
        });
        const c = measured({}, full);
        assert.isTrue(c.get("border-concentric")?.pass, String(c.get("border-concentric")?.measured));
    });

    it("leaves a mitred corner out of the centroid by the outline's corner, not by how thick it reads", () => {
        // a square seen tilted (60 pixels a unit across, 15 up), its dashed mitred ring 0.45 out: a corner reads 0.64
        // thick, under the width cutoff the tilt loosens to 0.675, and the ring's gap at 315 degrees leaves three
        // corners counted with no fourth to balance them
        const plane: Plane = {
            m: [60, 0, 100, 0, -15, 100, 0, 0, 1],
            inverse: [1 / 60, 0, -100 / 60, 0, -1 / 15, 100 / 15, 0, 0, 1],
        };
        const square = (x: number, y: number, half: number): boolean =>
            Math.abs(x / 60) <= half && Math.abs(y / 15) <= half;
        const full = frame((x, y) => {
            if (square(x, y, 1)) {
                return "fill";
            }
            const a = (((degrees(x / 60, -y / 15) % 360) + 360) % 360) + 5;
            const dash = a % 45 < 20 && Math.abs(a - 320) > 12;
            return square(x, y, 1.45) && dash ? "border" : undefined;
        });
        const frames = { plain: frame((x, y) => (square(x, y, 1) ? "fill" : undefined)), plane, reach: 2.2 };
        const c = measured({ shape: "rectangle", border: "dashed" }, full, frames).get("border-concentric");
        assert.isTrue(c?.pass, String(c?.measured));
    });

    it("does not count an outer ring an edge hides as missing", () => {
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (x > 24 && Math.abs(y) < 12) {
                return "edge";
            }
            if (r <= 20) {
                return "fill";
            }
            if (r <= 29) {
                return "border";
            }
            return r <= 35 ? "outer" : undefined;
        });
        const c = measured({ outer: "abut" }, full);
        assert.isTrue(c.get("outer-drawn")?.pass, String(c.get("outer-drawn")?.measured));
    });

    it("reads the node's own halo, not a neighbor's past it, and a ray with no halo as unread", () => {
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            const a = degrees(x, y);
            if (r <= 20) {
                return "fill";
            }
            if (r <= 29 && Math.abs(a) < 160) {
                return "halo";
            }
            // a neighbor's halo further out on the rays to the right
            return r >= 40 && r <= 55 && Math.abs(a) < 40 ? "halo" : undefined;
        });
        const c = measured({ border: "none", effect: "halo" }, full);
        assert.isTrue(c.get("halo-scale")?.pass, String(c.get("halo-scale")?.measured));
        // and expects the element's stretch: a halo grown 1.2 along u is not one grown 1.45
        const stretched = measured({ border: "none", effect: "halo" }, full, { haloGrow: () => [1.2, 1.45] });
        assert.isFalse(stretched.get("halo-scale")?.pass);
    });

    it("leaves a plate unread when too few rays show its end", () => {
        // the underlay shows on three rays only, and wrongly wide there
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 20) {
                return "fill";
            }
            return r <= 40 && Math.abs(degrees(x, y)) < 20 ? "underlay" : undefined;
        });
        const c = measured({ border: "none", plate: "underlay" }, full).get("underlay-padding");
        assert.isTrue(c?.unread);
    });

    it("takes a label's box from its own blob, not stray label pixels on the node", () => {
        const full = frame((x, y) => {
            if (y >= 25 && y <= 35 && Math.abs(x) <= 10) {
                return "label";
            }
            if (y >= 5 && y <= 7 && x >= -8 && x <= -6) {
                return "label";
            }
            return Math.hypot(x, y) <= 20 ? "fill" : undefined;
        });
        const c = measured({ border: "none", label: "bottom" }, full, { labelReadable: true });
        assert.isTrue(c.get("label-off-node")?.pass);
    });

    it("lets an edge stop the border's width along its line past a dashed border's slanted side", () => {
        // a square, its border 18 pixels, an edge leaving at 35 degrees that stops 18 pixels past the side along it
        const square = (x: number, y: number): Part | undefined =>
            Math.abs(x) <= 20 && Math.abs(y) <= 20 ? "fill" : undefined;
        const [dx, dy] = [Math.cos((35 * Math.PI) / 180), Math.sin((35 * Math.PI) / 180)];
        const stop = 20 / dx + 18;
        const full = frame((x, y) => {
            const t = x * dx + y * dy;
            if (Math.abs(x * dy - y * dx) < 2 && t >= stop + 0.5 && t <= 50) {
                return "edge";
            }
            return square(x, y);
        });
        const frames = { plain: frame(square), sizeFactor: 2 };
        assert.isTrue(measured({ border: "dashed", edges: "on" }, full, frames).get("edge-stops-at-border")?.pass);
        // a solid border would hide the edge there: the same picture fails it
        assert.isFalse(measured({ border: "outside", edges: "on" }, full, frames).get("edge-stops-at-border")?.pass);
    });
});
