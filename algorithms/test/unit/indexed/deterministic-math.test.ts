import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { afterEach, describe, expect, it, vi } from "vitest";

import { leiden } from "../../../src/indexed/leiden.js";
import { adamicAdarPrediction } from "../../../src/indexed/link-prediction.js";
import { markovClustering } from "../../../src/indexed/markov.js";
import { spectralClustering } from "../../../src/indexed/spectral.js";
import { syncClustering } from "../../../src/indexed/sync.js";

/** The Math functions whose last bit ECMAScript leaves to the engine (Math.sqrt is correctly rounded). */
const ENGINE_APPROXIMATED = [
    "log",
    "exp",
    "sin",
    "cos",
    "tan",
    "acos",
    "asin",
    "atan",
    "atan2",
    "cbrt",
    "hypot",
    "pow",
    "log1p",
    "expm1",
    "log2",
    "log10",
] as const;

/**
 * Six planted communities of 40 nodes, drawn from a fixed integer generator.
 * @returns the snapshot
 */
function plantedBlocks(): GraphSnapshot {
    let x = 7;
    const next = (): number => {
        x = (Math.imul(x, 1103515245) + 12345) >>> 0;
        return x / 4294967296;
    };
    const src: number[] = [];
    const dst: number[] = [];
    for (let i = 0; i < 240; i++) {
        for (let j = i + 1; j < 240; j++) {
            if (next() < (i % 6 === j % 6 ? 0.25 : 0.01)) {
                src.push(i);
                dst.push(j);
            }
        }
    }
    return fromEdgeArrays({ directed: false, nodeCount: 240, src: Uint32Array.from(src), dst: Uint32Array.from(dst) });
}

const word = new Float64Array(1);
const halves = new Uint32Array(word.buffer);

/**
 * An FNV-1a hash of every bit of a result: numbers by their double bits, arrays element by element, objects by key.
 * @param value - the result
 * @returns 8 hex digits
 */
function digest(value: unknown): string {
    let h = 0x811c9dc5;
    const mix = (w: number): void => {
        h = Math.imul(h ^ w, 0x01000193) >>> 0;
    };
    const walk = (v: unknown): void => {
        if (typeof v === "number") {
            word[0] = v;
            mix(halves[0]);
            mix(halves[1]);
        } else if (typeof v === "boolean") {
            mix(v ? 1 : 2);
        } else if (ArrayBuffer.isView(v)) {
            for (const e of v as unknown as ArrayLike<number>) {
                walk(e);
            }
        } else if (typeof v === "object" && v !== null) {
            for (const key of Object.keys(v).sort()) {
                mix(key.length);
                walk((v as Record<string, unknown>)[key]);
            }
        }
    };
    walk(value);
    return h.toString(16).padStart(8, "0");
}

describe("engine-independent math in the seeded and iterative algorithms", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("never calls an engine-approximated Math function, and gives the results it gave with them", () => {
        // The digests were recorded from the algorithms before they moved to graph-format's det functions, which
        // return the same bits as Node's Math.exp, Math.log and Math.hypot, and as Math.pow for an exponent of 2.
        const g = plantedBlocks();
        for (const name of ENGINE_APPROXIMATED) {
            vi.spyOn(Math, name).mockImplementation(() => {
                throw new Error(`Math.${name} called`);
            });
        }
        const seeded = leiden(g, { randomSeed: 42 });
        const other = leiden(g, { randomSeed: 7, resolution: 1.5 });
        const markov = (inflation: number): string => {
            const m = markovClustering(g, { inflation });
            return digest({
                labels: m.labels,
                attractors: m.attractors,
                iterations: m.iterations,
                converged: m.converged,
            });
        };
        const aa = adamicAdarPrediction(g, { topK: 200 });
        const spectral = spectralClustering(g, { k: 6, laplacianType: "normalized", seed: 3 });
        const sync = syncClustering(g, { numClusters: 6, seed: 5 });
        expect({
            leiden: digest({ labels: seeded.labels, modularity: seeded.modularity, iterations: seeded.iterations }),
            leiden7: digest({ labels: other.labels, modularity: other.modularity }),
            markov2: markov(2),
            markov3: markov(3),
            "markov1.5": markov(1.5),
            "markov2.5": markov(2.5),
            adamicAdar: digest({ s: aa.sources, t: aa.targets, scores: aa.scores }),
            spectral: digest({ labels: spectral.labels, eigenvalues: spectral.eigenvalues }),
            sync: digest({ labels: sync.labels }),
        }).toEqual({
            leiden: "307a356c",
            leiden7: "752b960e",
            markov2: "597bf1e3",
            markov3: "905baa0b",
            "markov1.5": "a1695b5b",
            "markov2.5": "735e7233",
            adamicAdar: "dda00115",
            spectral: "7d899f15",
            sync: "26f73179",
        });
    });
});
