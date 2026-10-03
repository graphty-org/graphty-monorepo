/**
 * `LAYOUTS` is only worth having if it is true and complete, so every claim in it is checked by running the
 * layout: on a directed and an undirected graph, on a weighted graph and its unweighted twin, without and with its
 * required options, and as a simulation on the CPU and through an accelerator. A new layout export that is not
 * catalogued fails the completeness test.
 */

import assert from "node:assert";

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { describe, it } from "vitest";

import * as pkg from "../src";
import { createSimulation, type LayoutAccelerator, type LayoutEntry, LAYOUTS, type LayoutSimulation } from "../src";

// A 4 x 5 grid: connected, planar and bipartite, so every layout accepts it. Its weights vary from 1 to 5.
const ROWS = 4;
const COLS = 5;
const N = ROWS * COLS;
const src: number[] = [];
const dst: number[] = [];
for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        if (c + 1 < COLS) {
            src.push(i);
            dst.push(i + 1);
        }
        if (r + 1 < ROWS) {
            src.push(i);
            dst.push(i + COLS);
        }
    }
}
const weights = Float64Array.from(src, (_, e) => ((e * 7) % 5) + 1);

const graph = (directed: boolean, weighted: boolean): GraphSnapshot =>
    fromEdgeArrays({
        src: Uint32Array.from(src),
        dst: Uint32Array.from(dst),
        nodeCount: N,
        directed,
        ...(weighted ? { weights } : {}),
    });

const REQUIRED_OPTIONS: Readonly<Record<string, unknown>> = {
    subsets: [Array.from({ length: N / 2 }, (_, i) => i), Array.from({ length: N / 2 }, (_, i) => i + N / 2)],
};

function run(entry: LayoutEntry, s: GraphSnapshot, extra: Record<string, unknown> = {}, required = true): number[] {
    assert.ok(entry.fn !== null);
    const options: Record<string, unknown> = { seed: 1, ...extra };
    if (required) {
        for (const name of entry.requiredOptions) {
            options[name] = REQUIRED_OPTIONS[name];
        }
    }
    return Array.from((entry.fn as (...a: unknown[]) => { positions: Float32Array })(s, options).positions);
}

const entries = Object.entries(LAYOUTS) as [string, LayoutEntry][];
const oneShot = entries.filter(([, e]) => e.fn !== null);

// Exports that are functions but not layouts.
const NOT_LAYOUTS = new Set([
    "createSimulation",
    "fitToBox",
    "fromPositionColumn",
    "fromPositionMap",
    "rescaleInPlace",
    "rescaleLayout",
    "rescaleLayoutDict",
    "resolveNodeVector",
    "resolveWeights",
    "seedPositions",
    "toLayoutSnapshot",
    "toPositionColumn",
    "toPositionMap",
]);

describe("LAYOUTS", () => {
    it("lists every one-shot layout the package exports, under its export name", () => {
        const exported = Object.entries(pkg)
            .filter(([, v]) => typeof v === "function" && !/^class\b/.test(Function.prototype.toString.call(v)))
            .map(([name]) => name)
            .filter((name) => !NOT_LAYOUTS.has(name))
            .sort();
        assert.deepStrictEqual(oneShot.map(([name]) => name).sort(), exported);
        for (const [key, entry] of entries) {
            assert.strictEqual(entry.name, key);
            if (entry.fn !== null) {
                assert.strictEqual(entry.fn, (pkg as Record<string, unknown>)[key]);
            }
        }
    });

    describe.each(oneShot)("%s", (_name, entry) => {
        it(`accepts ${entry.direction === "any" ? "both kinds of graph" : `only ${entry.direction} graphs`}`, () => {
            for (const directed of [true, false]) {
                const ok = entry.direction === "any" || (entry.direction === "directed") === directed;
                if (ok) {
                    assert.strictEqual(run(entry, graph(directed, false)).length, 2 * N);
                } else {
                    assert.throws(() => run(entry, graph(directed, false)));
                }
            }
        });

        it(`reads edge weights: ${entry.weights}`, () => {
            const same = (extra: Record<string, unknown> = {}): boolean =>
                JSON.stringify(run(entry, graph(false, true), extra)) ===
                JSON.stringify(run(entry, graph(false, false), extra));
            assert.strictEqual(same(), entry.weights !== "by-default");
            assert.strictEqual(same({ weight: entry.weights !== "by-default" }), entry.weights !== "on-request");
        });

        it(`needs [${entry.requiredOptions.join(", ")}]`, () => {
            if (entry.requiredOptions.length > 0) {
                assert.throws(() => run(entry, graph(false, false), {}, false));
            }
            assert.strictEqual(run(entry, graph(false, false)).length, 2 * N);
        });
    });

    describe.each(entries.filter(([, e]) => e.simulation !== null))("%s simulation", (_name, entry) => {
        const type = entry.simulation ?? "forceatlas2";

        it(entry.requiresAccelerator ? "has no CPU implementation" : "runs on the CPU", () => {
            if (entry.requiresAccelerator) {
                assert.throws(() => createSimulation(type, {}, null));
                return;
            }
            const sim = createSimulation(type, { seed: 1 }, null);
            const positions = new Float32Array(3 * N).map((_, i) => (i * 37) % 11);
            sim.load(graph(false, false), positions);
            void sim.step(3);
            assert.ok(positions.every(Number.isFinite));
            sim.dispose();
        });

        it(`runs on the accelerator's ${String(entry.accelerator)}`, () => {
            assert.ok(entry.accelerator !== null);
            const marker = { marker: true } as unknown as LayoutSimulation;
            const acc: LayoutAccelerator = { kind: "fake", [entry.accelerator]: () => marker };
            assert.strictEqual(createSimulation(type, {}, acc), marker);
        });
    });
});
