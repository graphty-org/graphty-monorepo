/**
 * `ALGORITHMS` is only worth having if it is true and complete, so every claim in it is checked by running the
 * algorithm: the direction rule on a directed and an undirected graph, the weight rule on a weighted graph and its
 * unweighted twin, the inputs by calling `fn(graph, ...inputs, options)`, and the per-element result arrays by
 * their length. A new export that is not catalogued fails the completeness test.
 */

import { fromEdgeArrays, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import * as pkg from "../../src/index.js";
import {
    accelerated,
    type AcceleratorMethod,
    type AlgorithmEntry,
    type AlgorithmInputKind,
    ALGORITHMS,
    type WeightUse,
} from "../../src/index.js";

// A 4 x 5 grid (bipartite, so the matchings accept it). The weights change every weighted answer: the edges
// between columns 2 and 3 are light and the rest vary from 2 to 6, so a weighted clustering splits the grid there.
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
const weights = Float64Array.from(src, (u, e) => (u % COLS === 2 && dst[e] === u + 1 ? 0.25 : ((e * 7) % 5) + 2));

function graph(directed: boolean, weighted: boolean): GraphSnapshot {
    return fromEdgeArrays({
        src: Uint32Array.from(src),
        dst: Uint32Array.from(dst),
        nodeCount: N,
        directed,
        ...(weighted ? { weights } : {}),
    });
}

const REQUIRED_OPTIONS: Readonly<Record<string, unknown>> = { k: 2, numClusters: 2 };

/** One argument of each input kind, valid on the fixture; `nth` counts the node inputs before this one. */
const ARGUMENTS: Readonly<Record<AlgorithmInputKind, (nth: number, s: GraphSnapshot) => unknown>> = {
    node: (nth) => (nth === 0 ? 0 : N - 1),
    "node-values": () => Float64Array.from({ length: N }, (_, i) => (i === 0 ? 1 : 0)),
    "node-labels": () => Uint32Array.from({ length: N }, (_, i) => (i < N / 2 ? 0 : 1)),
    "seed-labels": () => {
        const seeds = new Uint32Array(N).fill(INVALID_INDEX);
        seeds[0] = 0;
        seeds[N - 1] = 1;
        return seeds;
    },
    "node-pairs": () => ({ sources: [0, 1, 2], targets: [6, 7, 19] }),
    heuristic: () => () => 0,
    graph: (_nth, s) => s,
};

function run(entry: AlgorithmEntry, s: GraphSnapshot, extra: Record<string, unknown> = {}): unknown {
    let nodes = 0;
    const args = entry.inputs.map((input) => ARGUMENTS[input.kind](input.kind === "node" ? nodes++ : nodes, s));
    const options: Record<string, unknown> = { seed: 1, randomSeed: 1, ...extra };
    for (const name of entry.requiredOptions) {
        options[name] = REQUIRED_OPTIONS[name];
    }
    return (entry.fn as (...a: unknown[]) => unknown)(s, ...args, options);
}

/**
 * A comparable rendering of a result: typed arrays as arrays, numbers as strings (NaN and Infinity survive),
 * functions dropped, snapshots by size.
 * @param x - the result
 * @returns its fingerprint
 */
function fingerprint(x: unknown): string {
    return JSON.stringify(x, (_key, v: unknown) => {
        if (ArrayBuffer.isView(v)) {
            return Array.from(v as unknown as ArrayLike<number>, String);
        }
        if (typeof v === "number") {
            return String(v);
        }
        if (typeof v === "function") {
            return undefined;
        }
        if (typeof v === "object" && v !== null && "rowPtr" in v) {
            return `graph of ${String((v as GraphSnapshot).nodeCount)} nodes`;
        }
        return v;
    });
}

function at(result: unknown, path: string): unknown {
    return path === "" ? result : path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], result);
}

// grsbm leaves every small graph whole, weighted or not, so the fixture cannot show it reading weights;
// test/unit/indexed/grsbm.test.ts shows it on the karate club.
const WEIGHTS_SHOWN_ELSEWHERE = new Set(["grsbm"]);

const WEIGHT_RULES: Readonly<Record<WeightUse, readonly [boolean, boolean, boolean]>> = {
    never: [true, true, true],
    always: [false, false, false],
    "by-default": [false, false, true],
    "on-request": [true, true, false],
};

const entries = Object.entries(ALGORITHMS) as [string, AlgorithmEntry][];

// Exports that are not algorithms of the `fn(graph, ...inputs, options)` shape: helpers, and the id-keyed views of a result.
const NOT_ALGORITHMS = new Set([
    "accelerated",
    "walkPredArcs",
    "walkPredEdges",
    "bipartiteFlowNetwork",
    "arcSourceIn",
    "groupsById",
    "pathIds",
    "scoresById",
]);

describe("ALGORITHMS", () => {
    it("lists every algorithm the package exports, under its export name", () => {
        const exported = Object.entries(pkg)
            .filter(([, v]) => typeof v === "function" && !/^class\b/.test(Function.prototype.toString.call(v)))
            .map(([name]) => name)
            .filter((name) => !NOT_ALGORITHMS.has(name))
            .sort();
        expect(Object.keys(ALGORITHMS).sort()).toEqual(exported);
        for (const [key, entry] of entries) {
            expect(entry.name).toBe(key);
            expect(entry.fn).toBe((pkg as Record<string, unknown>)[key]);
        }
    });

    it("names every dispatcher method once or more, and only dispatcher methods", () => {
        const dispatcher = accelerated(null);
        const methods = Object.keys(dispatcher).filter((k) => k !== "accelerator");
        const named = new Set(entries.map(([, e]) => e.dispatch).filter((d) => d !== null));
        expect([...named].sort()).toEqual(methods.sort());
    });

    it("names every accelerator method", () => {
        // A compile-time list: adding a method to AlgorithmAccelerator fails the type check until it is listed.
        const all: Record<AcceleratorMethod, true> = {
            pageRank: true,
            personalizedPageRank: true,
            hits: true,
            eigenvectorCentrality: true,
            katzCentrality: true,
            connectedComponents: true,
            weaklyConnectedComponents: true,
            breadthFirstSearch: true,
            sssp: true,
            bellmanFord: true,
            closenessCentrality: true,
            betweennessCentrality: true,
            edgeBetweennessCentrality: true,
            allPairsShortestPath: true,
            kCoreDecomposition: true,
            triangleCount: true,
            labelPropagation: true,
            minimumSpanningTree: true,
            louvain: true,
        };
        const named = new Set(entries.map(([, e]) => e.accelerator).filter((a) => a !== null));
        expect([...named].sort()).toEqual(Object.keys(all).sort());
    });

    describe.each(entries)("%s", (_name, entry) => {
        const directed = entry.direction === "directed";

        it(`accepts ${entry.direction === "any" ? "both kinds of graph" : `only ${entry.direction} graphs`}`, () => {
            const onDirected = (): unknown => run(entry, graph(true, false));
            const onUndirected = (): unknown => run(entry, graph(false, false));
            if (entry.direction === "undirected") {
                expect(onDirected).toThrow();
            } else {
                expect(onDirected).not.toThrow();
            }
            if (entry.direction === "directed") {
                expect(onUndirected).toThrow();
            } else {
                expect(onUndirected).not.toThrow();
            }
        });

        it(`reads edge weights: ${entry.weights}`, () => {
            const weighted = graph(directed, true);
            const plain = graph(directed, false);
            const same = (extra: Record<string, unknown> = {}): boolean => {
                expect(fingerprint(run(entry, weighted, extra))).toBe(fingerprint(run(entry, weighted, extra)));
                return fingerprint(run(entry, weighted, extra)) === fingerprint(run(entry, plain, extra));
            };
            // Whether the weighted and the unweighted graph give the same answer: with the default options, and
            // with the `weighted` flag set the other way from the rule's default.
            const [plainSame, flag, flaggedSame] = WEIGHT_RULES[entry.weights];
            expect(same()).toBe(plainSame || WEIGHTS_SHOWN_ELSEWHERE.has(entry.name));
            expect(same({ weighted: flag })).toBe(flaggedSame);
        });

        it(`returns ${entry.result} with per-element arrays [${entry.values.join(", ")}]`, () => {
            const s = graph(directed, false);
            const result = run(entry, s);
            if (entry.result === "number") {
                expect(typeof result).toBe("number");
            }
            if (entry.result === "boolean") {
                expect(typeof result).toBe("boolean");
            }
            for (const path of entry.values) {
                const values = at(result, path) as ArrayLike<number>;
                expect([s.nodeCount, s.edgeCount]).toContain(values.length);
            }
        });
    });
});
