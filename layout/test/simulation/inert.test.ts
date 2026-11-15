/**
 * setInert (issue #3075): a row taken out of the forces -- a group node the owner draws round its members -- never
 * moves and leaves every other row where a run without it puts them. Each case runs the same members twice: once
 * alone, once with one more row (no edges, sitting at the members' centroid) marked inert, and compares row by row.
 */

import assert from "node:assert";

import { type F32, fromEdgeArrays, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { ForceAtlas2Simulation } from "../../src/simulation/forceatlas2";
import { FruchtermanReingoldSimulation } from "../../src/simulation/fruchterman-reingold";
import { seedPositions } from "../../src/simulation/seed";
import type { LayoutSimulation } from "../../src/simulation/types";

/** A ring of 12 members with two chords; `withGroup` adds row 12, which has no edges. */
function members(withGroup: boolean): GraphSnapshot {
    const src = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 3];
    const dst = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 6, 9];
    return fromEdgeArrays({
        directed: false,
        nodeCount: withGroup ? 13 : 12,
        src: Uint32Array.from(src),
        dst: Uint32Array.from(dst),
    });
}

/** The seeded members, and for the run with the group, row 12 at their centroid. */
function start(withGroup: boolean, range: "fa2" | "fr"): F32 {
    const alone = members(false);
    const seeded = new Float32Array(3 * 12).fill(Number.NaN);
    seedPositions(alone, seeded, 11, 3, 1, null, range);
    if (!withGroup) {
        return seeded;
    }
    const out = new Float32Array(3 * 13);
    out.set(seeded);
    for (let a = 0; a < 3; a++) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += seeded[3 * i + a];
        }
        out[36 + a] = sum / 12;
    }
    return out;
}

const ITERATIONS = 60;

/**
 * Runs ITERATIONS iterations over the members, with the group row when `group` is not "none".
 * @param make - builds the simulation
 * @param range - the seed range
 * @param group - "none", "inert" (row 12 set inert) or "fixed" (row 12 only pinned: the defect)
 * @returns the owner's array afterwards
 */
function run(make: () => LayoutSimulation, range: "fa2" | "fr", group: "none" | "inert" | "fixed"): F32 {
    const withGroup = group !== "none";
    const positions = start(withGroup, range);
    const sim = make();
    sim.load(members(withGroup), positions);
    if (withGroup) {
        const mask = makeMask(13);
        maskSet(mask, 12, true);
        if (group === "inert") {
            assert.ok(sim.setInert !== undefined);
            sim.setInert(mask);
        } else {
            sim.setFixed(mask);
        }
    }
    for (let i = 0; i < ITERATIONS; i++) {
        void sim.step(1);
    }
    sim.dispose();
    return positions;
}

/** The largest coordinate difference over the 12 members. */
function memberDrift(a: F32, b: F32): number {
    let worst = 0;
    for (let k = 0; k < 36; k++) {
        worst = Math.max(worst, Math.abs(a[k] - b[k]));
    }
    return worst;
}

const fa2 = (): LayoutSimulation => new ForceAtlas2Simulation({ dim: 3, seed: 11, settleThreshold: 0, maxIter: 1000 });
const fr = (): LayoutSimulation =>
    new FruchtermanReingoldSimulation({ dim: 3, seed: 11, settleThreshold: 0, iterations: 1000 });

describe("setInert", () => {
    for (const [name, make, range] of [
        ["ForceAtlas2Simulation", fa2, "fa2"],
        ["FruchtermanReingoldSimulation", fr, "fr"],
    ] as const) {
        it(`${name}: an inert group never moves`, () => {
            const before = start(true, range);
            const after = run(make, range, "inert");
            assert.deepStrictEqual([...after.subarray(36, 39)], [...before.subarray(36, 39)]);
        });

        it(`${name}: the members lay out as they do without the group`, () => {
            const alone = run(make, range, "none");
            const inert = run(make, range, "inert");
            const fixedOnly = run(make, range, "fixed");
            // The control: a group that is only pinned still repels its members (the defect of issue #3075).
            assert.ok(memberDrift(alone, fixedOnly) > 1e-2, `pinned-only drift ${memberDrift(alone, fixedOnly)}`);
            // Every statistic counts the live rows only, so the members match bit for bit.
            assert.strictEqual(memberDrift(alone, inert), 0);
        });
    }

    it("throws on a mask too short for the graph", () => {
        const sim = new FruchtermanReingoldSimulation({ dim: 2, seed: 1 });
        sim.load(members(true), start(true, "fr"));
        assert.throws(() => {
            sim.setInert(new Uint32Array(0));
        }, /setInert/);
        const fa = new ForceAtlas2Simulation({ dim: 2, seed: 1 });
        fa.load(members(true), start(true, "fa2"));
        assert.throws(() => {
            fa.setInert(new Uint32Array(0));
        }, /setInert/);
    });

    it("ForceAtlas2Simulation: distributed action stays finite with an inert row", () => {
        const sim = new ForceAtlas2Simulation({ dim: 2, seed: 3, distributedAction: true, settleThreshold: 0 });
        const positions = start(true, "fa2");
        sim.load(members(true), positions);
        const mask = makeMask(13);
        maskSet(mask, 12, true);
        sim.setInert(mask);
        for (let i = 0; i < 20; i++) {
            sim.step(1);
        }
        assert.ok(positions.every((v) => Number.isFinite(v)));
    });
});
