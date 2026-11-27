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
    type P2,
    PALETTE,
    partIndex,
    type Plane,
    RING_FACTORS,
    SETTING_FACTORS,
    type Settings,
    shardOf,
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
});
