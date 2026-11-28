/**
 * @file The style combination matrix's own arithmetic (issue #10370): the all-pairs selection covers every
 * pair, the palette's colors cannot be mistaken for a blend of two others, and the border checks pass on a
 * drawn ring that keeps its promise and fail on one that does not.
 */

import { assert, describe, it } from "vitest";

import {
    allCases,
    AMOUNTS,
    BACKGROUND,
    CLASS_DISTANCE,
    type Classes,
    classify,
    CONDITION_FACTORS,
    covering,
    type DrawnMesh,
    drawnMeshes,
    drawnOnFrame,
    fillMeshReach,
    inradius,
    insetRetreat,
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
    PER_SIZE,
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
    it("expects a 3D solid's ring on its plain fill mesh, and a drawn-in fill's ring its whole width past it", () => {
        const width = AMOUNTS.borderWidth * PER_SIZE;
        const of = (border: string, drawnOver: boolean): { inset: number; border: number } =>
            fillMeshReach({ ...SETTINGS, border }, 1, drawnOver);
        // a flat shape, or a solid in 2D: the fill is drawn in, so the ring ends its whole width past it
        assert.deepEqual(of("inside", false), { inset: width, border: width });
        assert.deepEqual(of("center", false), { inset: width / 2, border: width });
        // a solid in 3D keeps its plain size, the ring drawn over its edge: on its outline, or half past it
        assert.deepEqual(of("inside", true), { inset: 0, border: 0 });
        assert.deepEqual(of("center", true), { inset: 0, border: width / 2 });
        assert.deepEqual(of("outside", true), { inset: 0, border: width });
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

    it("expects a ring's reach past the fill no deeper than the outline's inradius", () => {
        const box = (hx: number, hy: number, dx = 0): P2[] => [
            [-hx + dx, -hy],
            [hx + dx, -hy],
            [hx + dx, hy],
            [-hx + dx, hy],
        ];
        assert.closeTo(inradius(box(1, 0.25)), 0.25, 1e-6);
        // a 3-4-5 right triangle's inradius is (3 + 4 - 5) / 2
        assert.closeTo(
            inradius([
                [0, 0],
                [4, 0],
                [0, 3],
            ]),
            1,
            1e-6,
        );
        // an inside border 0.45 wide on a capsule seen side on, 0.25 deep: no fill can lie 0.45 in from its
        // outline, and one drawn in to its middle lies the whole 0.25 in
        const reach = (fill: P2[]): boolean =>
            meshRingChecks(fill, box(1, 0.25), 0.45, 0.01, true, "border").some(
                (c) => c.name === "mesh-border-reach" && c.pass,
            );
        assert.isTrue(reach(box(0.55, 0.001)));
        assert.isFalse(reach(box(0.55, 0.001, 0.4)));
        assert.isFalse(reach(box(0.55, 0.15)));
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

    it("reads an outer ring too thin to hold a pure pixel as drawn between the gap and the outline", () => {
        // the outer border's gap is background by design; past it the ring, a pixel across, blends on both sides
        // and tidy folds its one pure sample into the blend: the gap is not background between node and outline
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 20) {
                return "fill";
            }
            if (r <= 26) {
                return "border";
            }
            if (r <= 28) {
                return undefined;
            }
            if (r <= 30.4) {
                return r > 28.8 && r <= 29.6 ? "outer" : "mixed";
            }
            return r <= 40 ? "outline" : undefined;
        });
        const c = measured({ outer: "gap", effect: "outline" }, full).get("outline-touches-node");
        assert.isTrue(c?.pass, String(c?.measured));
    });

    it("reads a node's outline ring as part of what it covers", () => {
        // a neighbor's ring drawn over this node's outer border hid it, and the ray read as the outer border missing
        const mesh = (name: string, children: DrawnMesh[] = []): DrawnMesh => ({
            name,
            isVisible: true,
            visibility: 1,
            isEnabled: () => true,
            getChildMeshes: () => children,
        });
        const ring = mesh("graphty-node-outline-#ff00ff");
        const node = {
            mesh: mesh("fill", [ring, mesh("label")]),
            border: mesh("border"),
            outerBorder: null,
            underlay: null,
            overlay: null,
            halo: null,
            shadow: [],
            decorations: [],
        };
        assert.deepEqual(
            drawnMeshes(node).map((m) => m.name),
            ["fill", "border", "graphty-node-outline-#ff00ff"],
        );
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

    it("expects a halo from the node's outline, with the fill a centered or inside border drew in", () => {
        const full = frame((x, y) => (Math.hypot(x, y) <= 20 ? "fill" : undefined));
        // the element grows the drawn-in fill back out by the border's inset before its band (haloAxisScale)
        for (const [border, inset] of [
            ["inside", 0.45],
            ["center", 0.225],
            ["outside", 0],
        ] as const) {
            const insets: number[] = [];
            const keep = (scale: number, _border: number, given: number): [number, number] => {
                insets.push(given);
                return [scale, scale];
            };
            measured({ border, effect: "halo" }, full, { haloGrow: keep, haloHull: () => [] });
            assert.lengthOf(insets, 1, border);
            assert.approximately(insets[0], inset, 1e-9, border);
        }
    });

    it("expects a 3D solid's halo from its plain fill, its border reaching only its outer edge past it", () => {
        const full = frame((x, y) => (Math.hypot(x, y) <= 20 ? "fill" : undefined));
        const width = AMOUNTS.borderWidth * PER_SIZE;
        for (const [border, edge] of [
            ["inside", 0],
            ["center", width / 2],
            ["outside", width],
        ] as const) {
            const given: [number, number][] = [];
            const keep = (scale: number, reach: number, inset: number): [number, number] => {
                given.push([reach, inset]);
                return [scale, scale];
            };
            measured({ shape: "cone", border, effect: "halo" }, full, {
                view: "3d",
                haloGrow: keep,
                haloHull: () => [],
            });
            assert.lengthOf(given, 1, border);
            assert.approximately(given[0][0], edge, 1e-9, `${border} reach`);
            assert.strictEqual(given[0][1], 0, `${border} inset`);
        }
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

    it("reads the ring to its outer edge past a lobe of fill a ray only grazes, in blended pixels", () => {
        // bs-man-outside-3d-mid-a1: a ray leaves the torso, crosses the ring between it and an arm, grazes the arm's
        // tip along its slanted end (6 blended pixels, no pure fill), and then crosses the rest of the ring
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 20) {
                return "fill";
            }
            if (Math.abs(degrees(x, y)) < 8 && r > 21 && r <= 27) {
                return "mixed";
            }
            return r <= 29 ? "border" : undefined;
        });
        const c = measured({}, full);
        assert.isTrue(c.get("border-width-thinnest")?.pass, String(c.get("border-width-thinnest")?.measured));
    });

    it("reads the plain outline under an edge the plain frame draws over the fill", () => {
        // pw-085: in the plain frame (no ring) an edge reaches over the fill and across its outline, which the full
        // frame's ring hides; the outline under it is where the full frame shows it, so the ring reads its width
        // past the outline on every ray, not past the outline either side of the edge
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 20) {
                return "fill";
            }
            return r <= 29 ? "border" : undefined;
        });
        const plain = frame((x, y) => {
            if (x < -4 && x > -60 && Math.abs(y) < 5) {
                return "edge";
            }
            return Math.hypot(x, y) <= 20 ? "fill" : undefined;
        });
        const position = measured({}, full, { plain }).get("border-position");
        assert.exists(position);
        const rays = (position as { rays?: number[] }).rays ?? [];
        assert.isAbove(rays.length, 0);
        // 9 pixels past the outline at 20 a unit, within a band edge (1.5 pixels)
        for (const offset of rays) {
            assert.approximately(offset, 0.45, 1.5 / 20);
        }
    });

    it("reads where an outer ring starts, and how wide it is, on the rays that leave through a side", () => {
        // pw-085: a shape's mitred rings reach past their widths across its corners, and where the corners are most
        // of the rays a median over every ray is a corner's. Here a triangle with an inradius of 0.08 units, 60
        // pixels a unit, in a 0.45 border and a 0.3 outer ring past it, both mitred (triangles too).
        const plane: Plane = {
            m: [60, 0, 100, 0, -60, 100, 0, 0, 1],
            inverse: [1 / 60, 0, -100 / 60, 0, -1 / 60, 100 / 60, 0, 0, 1],
        };
        // how far a pixel lies out along the triangle's side normals, in units (its inradius on its outline)
        const out = (x: number, y: number): number =>
            Math.max(
                ...[90, 210, 330].map(
                    (d) => (x * Math.cos((d * Math.PI) / 180) - y * Math.sin((d * Math.PI) / 180)) / 60,
                ),
            );
        const full = frame((x, y) => {
            const r = out(x, y);
            if (r <= 0.08) {
                return "fill";
            }
            if (r <= 0.53) {
                return "border";
            }
            return r <= 0.83 ? "outer" : undefined;
        });
        const plain = frame((x, y) => (out(x, y) <= 0.08 ? "fill" : undefined));
        const c = measured({ shape: "triangle", outer: "abut" }, full, { plain, plane, reach: 2 });
        // on a side the outer ring starts at the border's outer edge, 0.45 units out, within a band edge (1.5 pixels)
        assert.approximately(c.get("outer-start")?.measured ?? Number.NaN, 0.45, 1.5 / 60);
        assert.isTrue(c.get("outer-width")?.pass, String(c.get("outer-width")?.measured));
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
        for (const name of [
            "border-width-thinnest",
            "border-width-median",
            "border-width-thickest",
            "border-position",
        ]) {
            assert.isTrue(c.get(name)?.pass, `${name}: ${String(c.get(name)?.measured)}`);
            assert.isNotTrue(c.get(name)?.unread, name);
        }
        // the band right on its left side only, twice as wide on the others: right at its thinnest, not on its sides
        const lopsided = frame((x, y) => {
            if (square(x, y, 10)) {
                return "fill";
            }
            return x >= -22 && x <= 34 && Math.abs(y) <= 34 ? "border" : undefined;
        });
        const d = measured({}, lopsided, { plain, sizeFactor: 0.6 / (0.3 * 1.5) });
        assert.isTrue(d.get("border-width-thinnest")?.pass);
        assert.isFalse(d.get("border-width-median")?.pass, String(d.get("border-width-median")?.measured));
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
        // given the outline itself (a solid in 3D), its own inset bounds the retreat: a square's corner allows it, a
        // circle's does not
        const polygon = (n: number, r: number): P2[] =>
            Array.from({ length: n }, (_, i) => [
                r * Math.cos(((i + 0.5) / n) * Math.PI * 2),
                r * Math.sin(((i + 0.5) / n) * Math.PI * 2),
            ]);
        const withOutline = (outline: P2[]): boolean | undefined =>
            measured({ border: "inside" }, drawn, { sharpestCorner: Math.PI, outlineHull: outline }).get(
                "border-width-thickest",
            )?.pass;
        assert.isTrue(withOutline(polygon(4, Math.SQRT2)));
        assert.isFalse(withOutline(polygon(64, 1)));
    });

    it("bounds an inset's retreat at a corner its tessellation splits into blunt ones by the corner it makes", () => {
        // a unit square with each corner cut by a chamfer 0.02 long: its sharpest vertex is 135 degrees, which alone
        // would allow 0.3 / sin(67.5) = 0.325, but an inset of 0.3 cuts the chamfer away and retreats as the square's
        const c = 0.01 * Math.SQRT2;
        const chamfered: P2[] = [
            [1, 1 - c],
            [1 - c, 1],
            [-1 + c, 1],
            [-1, 1 - c],
            [-1, -1 + c],
            [-1 + c, -1],
            [1 - c, -1],
            [1, -1 + c],
        ];
        const retreat = insetRetreat(chamfered, 0.3);
        assert.isAbove(retreat, 0.3 * Math.SQRT2 - 0.03);
        assert.isBelow(retreat, 0.3 * Math.SQRT2 + 1e-9);
    });

    it("reads a ring's width on its sides, not where a fill drawn in to a small square pulls its corners back", () => {
        // an inside border 30 px wide on a square 33 px from its center: the fill drawn in to 3 px, so a ray past
        // the fill's corner reads up to 30 sqrt(2); the ring is right, and its width on its sides is not misread
        const square = (x: number, y: number, half: number): boolean => Math.abs(x) <= half && Math.abs(y) <= half;
        const full = frame((x, y) => {
            if (square(x, y, 3)) {
                return "fill";
            }
            return square(x, y, 33) ? "border" : undefined;
        });
        const plain = frame((x, y) => (square(x, y, 32) ? "fill" : undefined));
        const c = measured({ border: "inside" }, full, { plain, sizeFactor: 1.5 / (0.3 * 1.5) });
        const median = c.get("border-width-median");
        assert.isNotTrue(median?.unread);
        assert.isTrue(median?.pass, String(median?.measured));
        assert.isTrue(c.get("border-width-thinnest")?.pass);
    });

    it("reads a ring's width on its sides round a round fill drawn in far from its outline", () => {
        // an inside border 14 px wide on a disc 20 px across: the fill drawn in to a disc of 6, round everywhere
        const full = frame((x, y) => {
            const r = Math.hypot(x, y);
            if (r <= 6) {
                return "fill";
            }
            return r <= 20 ? "border" : undefined;
        });
        const median = measured({ border: "inside" }, full, { sizeFactor: 0.7 / (0.3 * 1.5) }).get(
            "border-width-median",
        );
        assert.isNotTrue(median?.unread);
        assert.isTrue(median?.pass, String(median?.measured));
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

    it("reads no width of a ring too thin across to hold a pure pixel, and no bare ray without a side to see it on", () => {
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
        // 0.45 units at 4 pixels a unit is 1.8 pixels across: no width read, and (no fill hull to find a side the
        // plane stretches) a ray showing no ring is not counted bare
        assert.isTrue(across(4).get("border-drawn")?.pass);
        assert.isUndefined(across(4).get("border-width-thinnest"));
        // at 12 it is 5.4 pixels across: drawn
        assert.isTrue(across(12).get("border-drawn")?.pass);
    });

    it("reads a thin ring as drawn on the rays leaving through a side the plane stretches, and no width there", () => {
        // 20 pixels a unit along u, 4 along v: a 0.45 unit ring is 9 pixels across beside the u axis, 1.8 beside v
        const tilted: Plane = { m: [20, 0, 100, 0, -4, 100, 0, 0, 1], inverse: [0.05, 0, -5, 0, -0.25, 25, 0, 0, 1] };
        const onPlane = (paint: (u: number, v: number) => Part | undefined): Classes =>
            frame((x, y) => {
                const [u, v] = toPlane(tilted, x + 100, y + 100);
                return paint(u, v);
            });
        const disc1 = (u: number, v: number): Part | undefined => (Math.hypot(u, v) <= 1 ? "fill" : undefined);
        const plain = onPlane(disc1);
        const hull: P2[] = Array.from({ length: 64 }, (_, i) => [
            Math.cos((i / 64) * Math.PI * 2),
            Math.sin((i / 64) * Math.PI * 2),
        ]);
        const ringed = onPlane((u, v) => disc1(u, v) ?? (Math.hypot(u, v) <= 1.45 ? "border" : undefined));
        const drawn = measured({}, ringed, { plain, plane: tilted, fillHull: hull });
        assert.isTrue(drawn.get("border-drawn")?.pass);
        assert.isNotTrue(drawn.get("border-drawn")?.unread);
        assert.isTrue(drawn.get("border-touches-fill")?.pass);
        assert.isNotTrue(drawn.get("border-touches-fill")?.unread);
        for (const name of ["border-width-thinnest", "border-width-median", "border-position", "border-concentric"]) {
            assert.isUndefined(drawn.get(name), name);
        }
        // no ring at all fails where one would be seen
        assert.isFalse(
            measured({}, onPlane(disc1), { plain, plane: tilted, fillHull: hull }).get("border-drawn")?.pass,
        );
        // a ring with background between it and the fill fails
        const parted = onPlane(
            (u, v) => disc1(u, v) ?? (Math.hypot(u, v) > 1.2 && Math.hypot(u, v) <= 1.65 ? "border" : undefined),
        );
        assert.isFalse(measured({}, parted, { plain, plane: tilted, fillHull: hull }).get("border-touches-fill")?.pass);
    });

    it("counts a node on the canvas by its drawn extent, at least a blend and a pure pixel inside the frame", () => {
        // a node drawn from 3 to 197 pixels across a 200 pixel frame, which a looser window round it would leave
        assert.isTrue(
            drawnOnFrame(
                [
                    [3, 3, 0.5],
                    [197, 197, 0.5],
                ],
                200,
                200,
            ),
        );
        assert.isFalse(
            drawnOnFrame(
                [
                    [1, 3, 0.5],
                    [197, 197, 0.5],
                ],
                200,
                200,
            ),
        );
        // behind the camera
        assert.isFalse(drawnOnFrame([[100, 100, 1.2]], 200, 200));
        assert.isFalse(drawnOnFrame([], 200, 200));
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

    it("reads a plate's end only where background follows it, not where the ray stops inside it", () => {
        // a disc 20 px across with a bar out to 45 px along +u, its underlay every point within 12 px (0.6 units) of
        // it: the walk (2.6 units, 52 px) stops inside the underlay past the bar's end, 7 px past the fill
        const body = (x: number, y: number): boolean =>
            Math.hypot(x, y) <= 20 || (x >= 0 && x <= 45 && Math.abs(y) <= 4);
        const near = (x: number, y: number): boolean => {
            const [cx, cy] = [Math.max(0, Math.min(45, x)), Math.max(-4, Math.min(4, y))];
            return Math.hypot(x, y) <= 32 || Math.hypot(x - cx, y - cy) <= 12;
        };
        const full = frame((x, y) => {
            if (body(x, y)) {
                return "fill";
            }
            return near(x, y) ? "underlay" : undefined;
        });
        const plain = frame((x, y) => (body(x, y) ? "fill" : undefined));
        const c = measured({ border: "none", plate: "underlay" }, full, { plain }).get("underlay-padding");
        assert.isTrue(c?.pass, String(c?.measured));
        // and an underlay drawn 5 px short of its padding still fails
        const short = frame((x, y) => {
            if (body(x, y)) {
                return "fill";
            }
            const [cx, cy] = [Math.max(0, Math.min(45, x)), Math.max(-4, Math.min(4, y))];
            return Math.hypot(x, y) <= 27 || Math.hypot(x - cx, y - cy) <= 7 ? "underlay" : undefined;
        });
        assert.isFalse(measured({ border: "none", plate: "underlay" }, short, { plain }).get("underlay-padding")?.pass);
    });

    it("leaves a halo whose edge shows only in blended pixels past a ring unread, not ended in a dash's gap", () => {
        // a ring 20 to 29 px, a halo expected out to 32 px whose band past the ring is blended on the rays to the
        // right, where the halo also shows through a gap in the ring (as through a dashed border's gaps) at 22-26 px
        const drawn = (rim: Part | undefined): Classes =>
            frame((x, y) => {
                const r = Math.hypot(x, y);
                const right = Math.abs(degrees(x, y)) < 60;
                if (r <= 20) {
                    return "fill";
                }
                if (r <= 29) {
                    return right && r >= 22 && r <= 26 ? "halo" : "border";
                }
                if (r <= 32) {
                    return right ? rim : "halo";
                }
                return undefined;
            });
        const grow = { haloGrow: (): [number, number] => [1.6, 1.6], haloHull: () => [] };
        const blended = measured({ effect: "halo" }, drawn("mixed"), grow).get("halo-scale");
        assert.isTrue(blended?.pass, String(blended?.measured));
        // a halo that ends in the gap, background where its edge should be, still fails
        assert.isFalse(measured({ effect: "halo" }, drawn(undefined), grow).get("halo-scale")?.pass);
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
        // a centered border on a sharp triangle: the fill is the outline drawn in side by side by d, its tip
        // retreating d / sin(half its angle), and the ring is the outline's mitred offset by d, its tip cut at 3 d
        const d = 0.225;
        const outline: P2[] = [
            [0.625, 0],
            [0, 2],
            [-0.625, 0],
        ];
        const r = 1.25 / ((2 * Math.hypot(0.625, 2) + 1.25) / 2);
        const drawnIn = outline.map(([x, y]): P2 => [(x * (r - d)) / r, r + ((y - r) * (r - d)) / r]);
        const band = mitredOffset(outline, d);
        const mitre = (inset: number): boolean | undefined =>
            new Map(
                meshRingChecks(drawnIn, band, 2 * d, 0.005, false, "border", true, inset).map((k) => [k.name, k.pass]),
            ).get("mesh-border-mitre");
        assert.isTrue(mitre(d), "the drawn-in tip's retreat is allowed");
        assert.isFalse(mitre(0), "read as a mitred offset of the fill, the tip is past the limit");
        // a ring reaching past both at the tip fails
        const past = band.map(([x, y]): P2 => (y > 2 ? [x, y + 0.2] : [x, y]));
        assert.isFalse(
            new Map(
                meshRingChecks(drawnIn, past, 2 * d, 0.005, false, "border", true, d).map((k) => [k.name, k.pass]),
            ).get("mesh-border-mitre"),
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
