/**
 * @file The element's layout transition presets (design/rendering/shader-styles.md section 7.6):
 * each is admitted by the registry, declares the parameters of the design's table, lands exactly on
 * the new layout's place, starts where the node was, draws only finite points along the way at
 * every end of its ranges, never jumps, and keeps a 2D layout's nodes on Z = 0.
 */

import { assert, describe, it } from "vitest";

import type { Vec3 } from "../../../src/camera/types";
import { resolveOptionValues } from "../../../src/catalog/options";
import { PARTICLE_CAPS, particlesPerNode } from "../../../src/transitions/ParticleDrawable";
import { ARC_MOVE } from "../../../src/transitions/presets/arc-move";
import { COLLAPSE_BLOOM } from "../../../src/transitions/presets/collapse-bloom";
import { FADE_THROUGH } from "../../../src/transitions/presets/fade-through";
import { GLIDE, spring } from "../../../src/transitions/presets/glide";
import { PARTICLE_MORPH } from "../../../src/transitions/presets/particle-morph";
import { STAGGERED_GLIDE } from "../../../src/transitions/presets/staggered-glide";
import { SWIRL } from "../../../src/transitions/presets/swirl";
import { admitTransition, type TransitionNode, type TransitionRegistration } from "../../../src/transitions/registry";

const PRESETS: readonly TransitionRegistration[] = [
    GLIDE,
    STAGGERED_GLIDE,
    ARC_MOVE,
    SWIRL,
    FADE_THROUGH,
    COLLAPSE_BLOOM,
    PARTICLE_MORPH,
];

/** Each preset's parameters as section 7.6 lists them: name, default, and range or choices. */
const TABLE: Readonly<Record<string, readonly [string, unknown, unknown][]>> = {
    glide: [["easing", "ease-in-out", ["linear", "ease-in-out", "spring"]]],
    "staggered-glide": [
        ["from", "center", ["center", "selection"]],
        ["stagger", 0.5, [0, 1]],
    ],
    "arc-move": [["height", 0.3, [0, 1]]],
    swirl: [["turns", 0.5, [-2, 2]]],
    "fade-through": [],
    "collapse-bloom": [["hold", 0.1, [0, 0.5]]],
    "particle-morph": [
        ["particles", 24, [1, 32]],
        ["curl", 1, [0, 3]],
    ],
};

/** Moves from all over a layout to all over another, including through and onto the middle. */
const MOVES: readonly [Vec3, Vec3][] = [
    [
        { x: -7.3, y: 2.1, z: 0 },
        { x: 4.9, y: -6.6, z: 0 },
    ],
    [
        { x: 0.1, y: 0.3, z: 0 },
        { x: 0.3, y: 0.1, z: 0 },
    ],
    [
        { x: 0, y: 0, z: 0 },
        { x: 9, y: 0, z: 0 },
    ],
    [
        { x: 5, y: 5, z: 0 },
        { x: -5, y: -5, z: 0 },
    ],
    [
        { x: 3, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
    ],
];

const NODES: readonly TransitionNode[] = [
    { index: 0, seed: 0, hopFromSelection: 0, distanceFromCenter: 0 },
    { index: 1, seed: 0.999, hopFromSelection: 1, distanceFromCenter: 1 },
    { index: 2, seed: 0.42, hopFromSelection: undefined, distanceFromCenter: 0.5 },
];

/**
 * Every setting of a preset's parameters to try: the defaults, then each parameter at each end of
 * its range or at each of its choices, the others at their defaults.
 * @param preset - The preset.
 * @returns The settings, each with every default filled in.
 */
function settingsOf(preset: TransitionRegistration): Record<string, unknown>[] {
    const params = preset.descriptor.params ?? [];
    const resolve = (passed: Record<string, unknown>): Record<string, unknown> =>
        resolveOptionValues(params, passed, { kind: "transition", id: preset.descriptor.id });
    const out = [resolve({})];
    for (const param of params) {
        const values =
            param.values?.map((choice) => choice.value) ??
            (typeof param.min === "number" && typeof param.max === "number" ? [param.min, param.max] : []);
        for (const value of values) {
            out.push(resolve({ [param.name]: value }));
        }
    }

    return out;
}

describe("transition presets", () => {
    it("are the seven of the design, each admitted as a preset with the design's parameters", () => {
        assert.deepEqual(
            PRESETS.map((preset) => preset.descriptor.id),
            Object.keys(TABLE),
        );
        for (const preset of PRESETS) {
            const { descriptor } = admitTransition(preset, false);
            const shown = descriptor.params.filter((param) => param.internal !== true);
            assert.deepEqual(
                shown.map((param) => {
                    const range =
                        param.values?.map((choice) => choice.value) ??
                        (param.min === undefined ? undefined : [param.min, param.max]);
                    return [param.name, param.default, range];
                }),
                [...TABLE[descriptor.id]],
                descriptor.id,
            );
        }
    });

    it("draw particles for particle morph and fade through, and nothing for the rest", () => {
        assert.deepEqual(
            PRESETS.filter((preset) => preset.drawable === "particles").map((preset) => preset.descriptor.id),
            ["fade-through", "particle-morph"],
        );
    });

    it("land exactly on the new place, start where the node was, and never jump or leave a 2D plane", () => {
        let checked = 0;
        for (const preset of PRESETS) {
            for (const params of settingsOf(preset)) {
                for (const [from, to] of MOVES) {
                    for (const node of NODES) {
                        const label = `${preset.descriptor.id} ${JSON.stringify(params)} node ${String(node.index)}`;
                        assert.deepEqual(preset.move(1, from, to, node, params), to, `${label}: lands`);
                        const start = preset.move(0, from, to, node, params);
                        assert.closeTo(Math.hypot(start.x - from.x, start.y - from.y, start.z - from.z), 0, 1e-9);

                        const span = 2 * Math.max(1, Math.hypot(from.x, from.y), Math.hypot(to.x, to.y));
                        let last = start;
                        for (let step = 1; step <= 200; step++) {
                            const at = preset.move(step / 200, from, to, node, params);
                            assert.isTrue(
                                Number.isFinite(at.x) && Number.isFinite(at.y) && Number.isFinite(at.z),
                                `${label}: finite at ${String(step)}`,
                            );
                            assert.strictEqual(at.z, 0, `${label}: on the plane`);
                            const jump = Math.hypot(at.x - last.x, at.y - last.y);
                            assert.isBelow(jump, span * 0.2, `${label}: no jump at step ${String(step)}`);
                            last = at;
                            checked++;
                        }
                    }
                }
            }
        }

        assert.isAbove(checked, 10_000);
    });

    it("glide's spring overshoots and settles; linear is linear", () => {
        assert.isAbove(Math.max(...Array.from({ length: 100 }, (_, i) => spring(i / 100))), 1.05);
        assert.strictEqual(spring(1), 1);
        const from = { x: 0, y: 0, z: 0 };
        const to = { x: 10, y: 0, z: 0 };
        const at = GLIDE.move(0.25, from, to, NODES[0], { easing: "linear" });
        assert.closeTo(at.x, 2.5, 1e-9);
    });

    it("staggered glide starts its wave at the selection when asked, else at the middle", () => {
        const from = { x: 0, y: 0, z: 0 };
        const to = { x: 10, y: 0, z: 0 };
        const near: TransitionNode = { index: 0, seed: 0.5, hopFromSelection: 0, distanceFromCenter: 1 };
        const far: TransitionNode = { index: 1, seed: 0.5, hopFromSelection: 1, distanceFromCenter: 0 };
        const t = 0.3;
        const bySelection = { from: "selection", stagger: 0.5 };
        assert.isAbove(
            STAGGERED_GLIDE.move(t, from, to, near, bySelection).x,
            STAGGERED_GLIDE.move(t, from, to, far, bySelection).x,
        );
        const byCenter = { from: "center", stagger: 0.5 };
        assert.isAbove(
            STAGGERED_GLIDE.move(t, from, to, far, byCenter).x,
            STAGGERED_GLIDE.move(t, from, to, near, byCenter).x,
        );
    });

    it("arc move bows off the straight line by its height; swirl turns about the middle", () => {
        const from = { x: 0, y: 0, z: 0 };
        const to = { x: 10, y: 0, z: 0 };
        assert.closeTo(ARC_MOVE.move(0.5, from, to, NODES[0], { height: 0.3 }).y, 3, 1e-9);
        assert.strictEqual(ARC_MOVE.move(0.5, from, to, NODES[0], { height: 0 }).y, 0);

        // A node that ends where it started still goes once round at one turn.
        const ring = { x: 5, y: 0, z: 0 };
        const half = SWIRL.move(0.5, ring, ring, NODES[0], { turns: 1 });
        assert.closeTo(half.x, -5, 1e-9);
        assert.closeTo(Math.hypot(half.x, half.y), 5, 1e-9);
    });

    it("collapse and bloom gathers the graph into a knot at the middle while it holds", () => {
        const from = { x: 10, y: 0, z: 0 };
        const to = { x: 0, y: -10, z: 0 };
        const held = COLLAPSE_BLOOM.move(0.5, from, to, NODES[1], { hold: 0.2 });
        assert.isBelow(Math.hypot(held.x, held.y), 0.5);
    });

    it("particle morph's cloud stays within 60,000 particles and the quality cap at its largest setting", () => {
        assert.strictEqual(PARTICLE_CAPS.high, 60_000);
        for (const level of ["low", "medium", "high"] as const) {
            for (const nodes of [1, 100, 1875, 1876, 5000, 60_000, 200_000]) {
                const total = particlesPerNode(nodes, 32, level) * nodes;
                assert.isAtMost(total, PARTICLE_CAPS[level], `${level}, ${String(nodes)} nodes`);
            }
        }
    });
});
