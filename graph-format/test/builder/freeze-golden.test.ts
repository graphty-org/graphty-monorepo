/**
 * Characterization of the freeze pipeline: seeded random builders with parallel edges, self-loops,
 * removed edges, mixed explicit and omitted weights, cancelling infinities, every duplicate policy and
 * both directions are frozen, and every observable result (the CSR, the arc weights, the remaps, the
 * report counts, the weight shadow column, the edge values, or the error code, details and message) is
 * compared with the recorded results in `freeze-golden.json`. It pins the current behavior so a
 * refactor of the pipeline cannot change it.
 *
 * To re-record after an intended behavior change: `GRAPH_FORMAT_RECORD_GOLDEN=1 npx vitest run
 * test/builder/freeze-golden.test.ts`.
 */

import { readFileSync, writeFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { WEIGHT_COLUMN_NAME } from "../../src/builder/freeze.js";
import { GraphBuilder } from "../../src/builder/graph-builder.js";
import { GraphFormatError } from "../../src/errors.js";
import { type DuplicatePolicy } from "../../src/types/index.js";

const GOLDEN = new URL("./freeze-golden.json", import.meta.url);
const CASES = 160;
const POLICIES: readonly DuplicatePolicy[] = ["keep", "error", "first", "last", "sum", "min", "max"];
const LOOPS = ["keep", "drop", "keep", "drop", "error"] as const;
const WEIGHTED = ["auto", true, false] as const;
const WEIGHT_POOL = [1, 2, 0.1, 3.5, -1, 1e-9, Infinity, -Infinity, Infinity, -Infinity];

/**
 * A small deterministic generator (mulberry32).
 * @param seed - the seed
 * @returns a function returning floats in [0, 1)
 */
function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pick<T>(r: () => number, items: readonly T[]): T {
    return items[Math.floor(r() * items.length)];
}

function plain(value: unknown): unknown {
    if (ArrayBuffer.isView(value)) {
        return Array.from(value as unknown as ArrayLike<number>).map(plain);
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
        return String(value);
    }
    if (Array.isArray(value)) {
        return value.map(plain);
    }
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
    }
    return value;
}

function runCase(seed: number): unknown {
    const r = rng(seed + 1);
    const directed = r() < 0.5;
    const policy = pick(r, POLICIES);
    const selfLoops = pick(r, LOOPS);
    const weighted = pick(r, WEIGHTED);
    const weightDtype = r() < 0.5 ? "f32" : "f64";
    const nodes = 2 + Math.floor(r() * 3);
    const edgeTotal = 1 + Math.floor(r() * 14);
    const weightRate = r();
    const b = new GraphBuilder({ directed, duplicateEdges: policy, selfLoops, weighted, weightDtype });
    for (let i = 0; i < nodes; i++) {
        b.addNode(`n${i}`);
    }
    for (let e = 0; e < edgeTotal; e++) {
        const u = Math.floor(r() * nodes);
        const v = r() < 0.15 ? u : Math.floor(r() * nodes);
        if (weighted !== false && r() < weightRate) {
            b.addEdge(`n${u}`, `n${v}`, pick(r, WEIGHT_POOL));
        } else {
            b.addEdge(`n${u}`, `n${v}`);
        }
        if (r() < 0.4) {
            b.setEdgeValue("kind", e, `k${e}`);
        }
    }
    for (let e = 0; e < edgeTotal; e++) {
        if (r() < 0.12) {
            b.removeEdge(e);
        }
    }
    if (r() < 0.1) {
        b.removeNode(`n${Math.floor(r() * nodes)}`);
    }
    const config = { directed, policy, selfLoops, weighted, weightDtype };
    try {
        const { snapshot: s, report } = b.freezeWithReport({ arena: r() < 0.7 });
        const shadow = s.edges.has(WEIGHT_COLUMN_NAME)
            ? Array.from({ length: s.edgeCount }, (_, e) =>
                  s.edges.isSet(WEIGHT_COLUMN_NAME, e) ? s.edges.value(WEIGHT_COLUMN_NAME, e) : null,
              )
            : null;
        const kinds = s.edges.has("kind")
            ? Array.from({ length: s.edgeCount }, (_, e) =>
                  s.edges.isSet("kind", e) ? s.edges.value("kind", e) : null,
              )
            : null;
        return plain({
            config,
            nodeCount: s.nodeCount,
            edgeCount: s.edgeCount,
            arcCount: s.arcCount,
            selfLoopCount: s.selfLoopCount,
            multigraph: s.flags.multigraph,
            rowPtr: s.rowPtr,
            colIdx: s.colIdx,
            weights: s.weights,
            arcToEdge: s.arcToEdge,
            nodeRemap: report.nodeRemap,
            edgeRemap: report.edgeRemap,
            compacted: report.compacted,
            droppedSelfLoops: report.droppedSelfLoops,
            mergedEdges: report.mergedEdges,
            droppedEdges: report.droppedEdges,
            shadow,
            kinds,
            builderEdgeCount: b.edgeCount,
            builderEdgeBound: b.edgeBound,
        });
    } catch (err) {
        if (!(err instanceof GraphFormatError)) {
            throw err;
        }
        return plain({ config, error: { code: err.code, message: err.message, details: err.details } });
    }
}

describe("freeze: golden characterization", () => {
    const actual = Array.from({ length: CASES }, (_, seed) => runCase(seed));

    if (process.env.GRAPH_FORMAT_RECORD_GOLDEN === "1") {
        writeFileSync(GOLDEN, `${JSON.stringify(actual, null, 1)}\n`);
    }
    const expected = JSON.parse(readFileSync(GOLDEN, "utf8")) as unknown[];

    it("covers merges, every error path and the shadow column", () => {
        const codes = new Set(expected.map((c) => (c as { error?: { code: string } }).error?.code));
        expect(codes).toEqual(new Set([undefined, "E_DUPLICATE_EDGE", "E_SELF_LOOP", "E_INVALID_WEIGHT"]));
        expect(expected.some((c) => ((c as { mergedEdges?: number }).mergedEdges ?? 0) > 0)).toBe(true);
        expect(expected.some((c) => Array.isArray((c as { shadow?: unknown }).shadow))).toBe(true);
    });

    it.each(Array.from({ length: CASES }, (_, seed) => seed))("case %i matches the recorded result", (seed) => {
        expect(actual[seed]).toEqual(expected[seed]);
    });
});
