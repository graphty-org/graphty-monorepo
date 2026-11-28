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
    mitredOffset,
    movedTo,
    type NodeFrames,
    OTHER_NODE,
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
    toPlane,
    withoutOthers,
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
        assert.isFalse(checksOn(disc({ inner: 20, outer: 24, shift: 0 })).get("border-width-thinnest"));
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
        const edgeFrom = (stop: number): Classes =>
            frame((x, y) => {
                const t = x * dx + y * dy;
                if (Math.abs(x * dy - y * dx) < 2 && t >= stop + 0.5 && t <= 50) {
                    return "edge";
                }
                return square(x, y);
            });
        const stop = 20 / dx + 18;
        const frames = { plain: frame(square), sizeFactor: 2 };
        assert.isTrue(
            measured({ border: "dashed", edges: "on" }, edgeFrom(stop), frames).get("edge-stops-at-border")?.pass,
        );
        // past the corner the solid band reaches about as far along the line as across it, so it hides an edge
        // stopping 4 pixels short of that
        assert.isFalse(
            measured({ border: "outside", edges: "on" }, edgeFrom(stop - 4), frames).get("edge-stops-at-border")?.pass,
        );
    });

    it("drops a ring cut short by a crossing behind the blended pixels where the crossing begins", () => {
        const [FILL, BORDER, MIXED, EDGE] = (["fill", "border", "mixed", "edge"] as const).map(partIndex);
        const run = (part: number, from: number, to: number): Run => ({ part, from, to });
        const tidied = tidy(
            [
                run(FILL, 0, 1),
                run(MIXED, 1.01, 1.04),
                run(BORDER, 1.05, 1.3),
                run(MIXED, 1.31, 1.34),
                run(EDGE, 1.35, 4),
            ],
            20,
        );
        assert.deepEqual(
            tidied.map((r) => r.part),
            [FILL, MIXED],
        );
    });

    it("leaves a ray an edge crosses at the ring's outer edge unread, not bare", () => {
        // the edge leaves rightward from the ring's outer edge, where the element stops it
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (x > 29 && Math.abs(y) < 2) {
                return "edge";
            }
            if (r <= 20) {
                return "fill";
            }
            return r <= 29 ? "border" : undefined;
        });
        const c = measured({}, full);
        assert.isTrue(c.get("border-drawn")?.pass, String(c.get("border-drawn")?.measured));
    });

    it("does not read a band filling the gap between two lobes as the ring", () => {
        // to the right the border fills a 3 pixel gap, the fill starts again, and the ring lies past it
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            const a = Math.abs(degrees(x, y));
            if (r <= 20 || (a < 8 && r > 23 && r <= 30)) {
                return "fill";
            }
            if (a < 20) {
                return r <= 39 ? "border" : undefined;
            }
            if (r <= 20) {
                return "fill";
            }
            return r <= 29 ? "border" : undefined;
        });
        const c = measured({}, full);
        assert.isTrue(c.get("border-width-thinnest")?.pass, String(c.get("border-width-thinnest")?.measured));
    });

    it("counts no hole in the fill as a gap between the fill and the ring", () => {
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 20) {
                return r > 5 && r <= 10 ? undefined : "fill";
            }
            return r <= 29 ? "border" : undefined;
        });
        assert.isTrue(measured({}, full).get("border-touches-fill")?.pass);
    });

    it("reads the ring past a database rim that only blended pixels part from it (far zoom)", () => {
        // the rim covers the face's top, a strip of blended pixels is all that is left of the fill above it
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 20) {
                if (y < -10 && r > 17) {
                    return "mixed";
                }
                return y < -10 ? "border" : "fill";
            }
            return r <= 29 ? "border" : undefined;
        });
        const c = measured({ shape: "database" }, full);
        assert.isTrue(c.get("border-width-thinnest")?.pass, String(c.get("border-width-thinnest")?.measured));
    });

    it("measures a node against its own parts, not a neighbor's that reach into its window", () => {
        // a neighbor's ring to the right, run together with this node's
        const neighbor = (x: number, y: number): boolean => Math.hypot(x - 40, y) <= 15;
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 20) {
                return "fill";
            }
            return r <= 29 || neighbor(x, y) ? "border" : undefined;
        });
        assert.isFalse(measured({}, full).get("border-width-thickest")?.pass);
        // its hull, in pixels: a square round it
        const hull: P2[] = [
            [125, 85],
            [155, 85],
            [155, 115],
            [125, 115],
        ];
        const c = measured({}, full, { others: [hull] });
        for (const name of [
            "border-width-thinnest",
            "border-width-thickest",
            "border-drawn",
            "border-position",
            "border-concentric",
        ]) {
            assert.isTrue(c.get(name)?.pass, `${name}: ${String(c.get(name)?.measured)}`);
        }
        // a pixel another node covers is marked, and nothing outside the hull grown by one pixel is
        const marked = withoutOthers(full, [hull]);
        assert.strictEqual(marked.parts[100 * 200 + 140], OTHER_NODE);
        assert.notStrictEqual(marked.parts[100 * 200 + 120], OTHER_NODE);
    });

    it("leaves a fill an edge crosses on a tiny node unread, not missing", () => {
        // a node 5 px across, two edges 8 px wide meeting at it cut most of its rays
        const plain = frame((x, y) => {
            if (Math.abs(y) < 4 && Math.abs(x) > 1) {
                return "edge";
            }
            return Math.hypot(x, y) <= 5 ? "fill" : undefined;
        });
        const c = measured(
            { border: "none" },
            frame(() => undefined),
            { plain },
        );
        assert.isTrue(c.get("fill-drawn")?.pass, String(c.get("fill-drawn")?.measured));
    });

    it("reads a ring's width at its thinnest and its position on its sides, past a cross's mitred corners", () => {
        // a square's band, its corners mitred square: a ray beside a corner reads up to sqrt(2) widths
        const square = (x: number, y: number, half: number): boolean => Math.abs(x) <= half && Math.abs(y) <= half;
        const full = frame((x, y) => {
            if (square(x, y, 10)) {
                return "fill";
            }
            return square(x, y, 22) ? "border" : undefined;
        });
        const plain = frame((x, y) => (square(x, y, 10) ? "fill" : undefined));
        // a band 12 px (0.6 units) wide
        const c = measured({}, full, { plain, sizeFactor: 0.6 / (0.3 * 1.5) });
        for (const name of ["border-width-thinnest", "border-width-thickest", "border-position"]) {
            assert.isTrue(c.get(name)?.pass, `${name}: ${String(c.get(name)?.measured)}`);
        }
    });

    it("lets an inset fill's tip retreat by the inset over sin(half its angle), and no further", () => {
        // an inside border 9 px wide, its outer edge on the outline (20 px); the fill drawn in to 11 px, and pulled
        // further in (to 5 px) in a wedge to the right, as an inset pulls in a sharp corner's tip
        const drawn = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 5 || (r <= 11 && Math.abs(degrees(x, y)) >= 40)) {
                return "fill";
            }
            return r <= 20 ? "border" : undefined;
        });
        const thickest = (corner: number): boolean | undefined =>
            measured({ border: "inside" }, drawn, { sharpestCorner: corner }).get("border-width-thickest")?.pass;
        // a round shape's fill cannot retreat: 13.6 px against a 9 px band fails
        assert.isFalse(thickest(Math.PI));
        // a 60 degree corner lets it retreat to 9 / sin(30) = 18 px
        assert.isTrue(thickest(Math.PI / 3));
        // a concave shape's corners are unknown: unread
        assert.isTrue(
            measured({ border: "inside" }, drawn, { sharpestCorner: Number.NaN }).get("border-width-thickest")?.unread,
        );
    });

    it("reads a tilted slab's ring shift in true device pixels", () => {
        // 20 pixels a unit across, 8 along the foreshortened axis
        const tilted: Plane = {
            m: [20, 0, 100, 0, -8, 100, 0, 0, 1],
            inverse: [0.05, 0, -5, 0, -0.125, 12.5, 0, 0, 1],
        };
        const onPlane = (paint: (u: number, v: number) => Part | undefined): Classes =>
            frame((x, y) => {
                const [u, v] = toPlane(tilted, x + 100, y + 100);
                return paint(u, v);
            });
        const ring = (du: number, dv: number): Classes =>
            onPlane((u, v) => {
                if (Math.hypot(u, v) <= 1) {
                    return "fill";
                }
                return Math.hypot(u - du, v - dv) <= 1.45 ? "border" : undefined;
            });
        const plain = onPlane((u, v) => (Math.hypot(u, v) <= 1 ? "fill" : undefined));
        const concentric = (c: Classes): { pass: boolean; measured: number } | undefined =>
            measured({}, c, { plain, plane: tilted }).get("border-concentric");
        // 0.08 units along the foreshortened axis is 0.64 true pixels (1.6 at the across scale)
        const along = concentric(ring(0, 0.08));
        assert.isTrue(along?.pass, String(along?.measured));
        assert.isFalse(concentric(ring(0.15, 0))?.pass);
    });

    it("leaves a ring too thin across to hold a pure pixel unread, and reads one wide enough", () => {
        const across = (ppuV: number): Map<string, { pass: boolean; unread?: boolean; measured: number }> => {
            const tilted: Plane = {
                m: [20, 0, 100, 0, -ppuV, 100, 0, 0, 1],
                inverse: [0.05, 0, -5, 0, -1 / ppuV, 100 / ppuV, 0, 0, 1],
            };
            const onPlane = (paint: (u: number, v: number) => Part | undefined): Classes =>
                frame((x, y) => {
                    const [u, v] = toPlane(tilted, x + 100, y + 100);
                    return paint(u, v);
                });
            const full = onPlane((u, v) => {
                const r = Math.hypot(u, v);
                if (r <= 1) {
                    return "fill";
                }
                return r <= 1.45 ? "border" : undefined;
            });
            const plain = onPlane((u, v) => (Math.hypot(u, v) <= 1 ? "fill" : undefined));
            return measured({}, full, { plain, plane: tilted });
        };
        // 0.45 units at 4 pixels a unit is 1.8 pixels across: nothing read
        assert.isUndefined(across(4).get("border-drawn"));
        // at 12 it is 5.4 pixels across: drawn
        assert.isTrue(across(12).get("border-drawn")?.pass);
    });

    it("does not count an outer ring of a pixel or two, folded into its blends, as missing", () => {
        // the outer ring is blended on both sides with one pure pixel between: raw runs see it, tidy folds it
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 20) {
                return "fill";
            }
            if (r <= 29) {
                return "border";
            }
            if (r <= 30) {
                return "mixed";
            }
            if (r <= 31) {
                return "outer";
            }
            return r <= 32 ? "mixed" : undefined;
        });
        // promised 0.3 units (6 px) across, so it is read; drawn here as one pure pixel between two blends
        const c = measured({ outer: "abut" }, full);
        assert.isTrue(c.get("outer-drawn")?.pass, String(c.get("outer-drawn")?.measured));
    });

    it("reads a plate's padding where it leaves through a side, past its mitred corners", () => {
        // a square 10 px each side of center, its underlay its mitred offset by 21 px (1.05 units)
        const square = (x: number, y: number, half: number): boolean => Math.abs(x) <= half && Math.abs(y) <= half;
        const full = frame((x, y) => {
            if (square(x, y, 10)) {
                return "fill";
            }
            return square(x, y, 31) ? "underlay" : undefined;
        });
        const plain = frame((x, y) => (square(x, y, 10) ? "fill" : undefined));
        const c = measured({ border: "none", plate: "underlay" }, full, {
            plain,
            sizeFactor: 1.05 / (0.4 * 1.5),
        }).get("underlay-padding");
        assert.isTrue(c?.pass, String(c?.measured));
    });

    it("walks a flat shadow in its own plane, where its depth behind the slab puts it on screen", () => {
        // the shadow drawn 0.2 units right of where the offset alone would put it (its parallax)
        const [ou, ov] = [0.45, -0.45];
        const full = frame((x, y) => {
            if (Math.hypot(x, y) <= 20) {
                return "fill";
            }
            return Math.hypot(x / 20 - ou - 0.2, -y / 20 - ov) <= 1 ? "shadow" : undefined;
        });
        const settings = { border: "none", shadow: "offset" } as const;
        assert.isFalse(measured(settings, full).get("shadow-offset")?.pass);
        const c = measured(settings, full, { shadowPlaneAt: (u, v) => movedTo(PLANE, u + 0.2, v) });
        assert.isTrue(c.get("shadow-offset")?.pass, String(c.get("shadow-offset")?.measured));
    });

    it("expects a halo on the hull of the node's stretched, projected vertices when one is given", () => {
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 20) {
                return "fill";
            }
            return r <= 29 ? "halo" : undefined;
        });
        const circle = (radius: number): P2[] =>
            Array.from({ length: 64 }, (_, i) => [
                radius * Math.cos((i / 64) * Math.PI * 2),
                radius * Math.sin((i / 64) * Math.PI * 2),
            ]);
        const settings = { border: "none", effect: "halo" } as const;
        // the model alone would expect a halo grown 1.2 along u: the hull overrides it
        const good = measured(settings, full, { haloGrow: () => [1.2, 1.2], haloHull: () => circle(29 / 20) });
        assert.isTrue(good.get("halo-scale")?.pass, String(good.get("halo-scale")?.measured));
        assert.isFalse(measured(settings, full, { haloHull: () => circle(1.2) }).get("halo-scale")?.pass);
    });

    it("lets an edge pixel at the ring's outer edge pass, within half a pixel diagonal of rasterization", () => {
        // a ring 9.5 px wide (sizeFactor 0.475 / 0.45), an edge drawn over its outer 2 px from 27.5 px out
        const ringed = (from: number): Classes =>
            frame((x, y) => {
                const r = Math.hypot(x, y);
                if (r <= 20) {
                    return "fill";
                }
                if (x > from && Math.abs(y) < 1) {
                    return "edge";
                }
                return r <= 29.5 ? "border" : undefined;
            });
        const frames = { sizeFactor: 0.475 / 0.45 };
        // 7.5 px past the outline, 2 px inside the ring's edge: rasterization (EDGE_PX and half a diagonal)
        assert.isTrue(measured({ edges: "on" }, ringed(27), frames).get("edge-stops-at-border")?.pass);
        // 4.5 px past the outline, 5 px inside it: the edge is drawn over the ring
        assert.isFalse(measured({ edges: "on" }, ringed(24), frames).get("edge-stops-at-border")?.pass);
    });

    it("passes a ring mesh that is the exact mitred offset of a small or sharp fill, and centers it on that offset", () => {
        const diamond: P2[] = [
            [0, -0.5],
            [0.5, 0],
            [0, 0.5],
            [-0.5, 0],
        ];
        // a 90 degree corner reads 1.05 sqrt(2) beside it: the median would be past 1.05
        const ring = mitredOffset(diamond, 1.05);
        assert.isTrue(
            meshRingChecks(diamond, ring, 1.05, 0.005, true, "outer-border").every((k) => k.pass),
            "diamond",
        );
        // read by its median (a plate round a solid in perspective), the same ring's corners carry the reading past
        const median = meshRingChecks(diamond, ring, 1.05, 0.005, true, "underlay", false);
        assert.deepEqual(
            median.map((k) => [k.name, k.pass]),
            [
                ["mesh-underlay-reach", false],
                ["mesh-underlay-centered", true],
            ],
        );
        // a thin triangle: its tips are cut square at three times the offset
        const triangle: P2[] = [
            [0, 1],
            [-0.1, -0.5],
            [0.1, -0.5],
        ];
        const cut = mitredOffset(triangle, 0.45);
        const checks = meshRingChecks(triangle, cut, 0.45, 0.005, false, "border");
        assert.isTrue(
            checks.every((k) => k.pass),
            JSON.stringify(checks.map((k) => [k.name, k.measured])),
        );
        // an uneven hexagon (a near corner magnified): its offset's middle is off the outline's, and that is right
        const uneven: P2[] = [
            [1.2, 0],
            [0.5, 0.8],
            [-0.5, 0.8],
            [-0.9, 0],
            [-0.5, -0.8],
            [0.5, -0.8],
        ];
        assert.isTrue(
            meshRingChecks(uneven, mitredOffset(uneven, 0.45), 0.45, 0.005, true, "border").every((k) => k.pass),
        );
        // a ring far wider than the mitre allows at one corner fails
        const bulged = ring.map((p, i): P2 => (i === 1 ? [4.5, 0] : p));
        assert.isFalse(
            new Map(
                meshRingChecks(diamond, bulged, 1.05, 0.005, false, "outer-border").map((k) => [k.name, k.pass]),
            ).get("mesh-outer-border-mitre"),
        );
    });
});
