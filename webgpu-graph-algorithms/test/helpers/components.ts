/**
 * The check set and the error factor of the Afforest sabotage suite (test/sabotage/wcc.test.ts; M8b-T10). A label
 * array is integer: it is either the oracle's partition or it is not, and no relative-error factor is definable
 * over it, so the factor is defined explicitly below (WCC_NOISE_FLOOR), which is what makes the table's
 * `minFactor: 10` mean something. IMPORT RULE (the same as test/helpers/spmv.ts): only @graphty/graph-format types,
 * src/** modules outside src/node/**, test/oracle/** and the pure helpers -- never test/helpers/device.ts or
 * test/setup/**.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { connectedComponents } from "../../src/algorithms/components.js";
import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { componentsOracle } from "../oracle/components.js";
import { type EdgeSpec, randomEdges, snapshotOf } from "./graphs.js";

/**
 * The noise floor of a label comparison: a partition is exact, so anything above zero is signal. 1e-3 makes
 * minFactor 10 mean "at least 1% of the nodes are mislabelled" on the 1,000-node checks below.
 */
const WCC_NOISE_FLOOR = 1e-3;

/**
 * One check of the WCC sabotage set: the element type of wccChecks() and the parameter type of wccWorstFactor
 * (knip: exported for the signatures, not imported by name).
 * @public
 */
export interface WccCheck {
    readonly name: string;
    readonly snapshot: GraphSnapshot;
}

/**
 * The check set: a 1,000-node random graph with ~25 components, a giant component plus 200 two-node components
 * (the case the `P.giant` guard and the sampler touch), a directed graph whose weak components differ from its
 * strong ones (a directed path), and a directed 100-node core whose sampled rounds link it into the giant plus 900
 * leaves each reachable by ONE in-arc from the core only -- the leaves have no out-arcs, so the sampled rounds never
 * see them and only the each-edge-once round can attach them (the case that round is needed for, and the case the
 * `P.giant` guard, the self-edge skip and the link direction of wcc-link-edges are visible in).
 * @returns the checks
 */
export function wccChecks(): readonly WccCheck[] {
    // ~25 components: 1,000 nodes over 25 disjoint random blocks of 40.
    const blocks: EdgeSpec[] = [];
    for (let b = 0; b < 25; b++) {
        for (const [u, v] of randomEdges(40, 120, 11 + b)) {
            blocks.push([u + 40 * b, v + 40 * b]);
        }
    }
    // a giant component of 600 plus 200 two-node components.
    const dust: EdgeSpec[] = [...randomEdges(600, 3000, 3)];
    for (let i = 0; i < 200; i++) {
        dust.push([600 + 2 * i, 601 + 2 * i]);
    }
    // directed: the weak components are ONE, the strong ones are 1,000 (a directed path).
    const path: EdgeSpec[] = Array.from({ length: 999 }, (_, i): EdgeSpec => [i, i + 1]);
    // directed: a 100-node core (a cycle plus its chords, so out-neighbours 0 and 1 of every core row are core
    // rows) and 900 leaves, each with one in-arc from the core and no out-arcs.
    const leaves: EdgeSpec[] = [];
    for (let c = 0; c < 100; c++) {
        leaves.push([c, (c + 1) % 100], [c, (c + 2) % 100]);
    }
    for (let j = 0; j < 900; j++) {
        leaves.push([j % 100, 100 + j]);
    }
    return [
        { name: "1000 nodes / 25 blocks", snapshot: snapshotOf(blocks, { nodeCount: 1000, label: "wcc-blocks" }) },
        { name: "giant 600 + 200 pairs", snapshot: snapshotOf(dust, { nodeCount: 1000, label: "wcc-dust" }) },
        {
            name: "directed path, weakly one component",
            snapshot: snapshotOf(path, { directed: true, nodeCount: 1000, label: "wcc-path" }),
        },
        {
            name: "directed core 100 + 900 leaves reachable by the edge round only",
            snapshot: snapshotOf(leaves, { directed: true, nodeCount: 1000, label: "wcc-leaves" }),
        },
    ];
}

/**
 * The worst error factor over the checks: the share of nodes whose label differs from the oracle's (both label
 * arrays are in first-seen order -- `connectedComponents` renumbers by default and `componentsOracle` renumbers
 * the same way -- so a correct partition under different names scores 0), divided by WCC_NOISE_FLOOR. A run that
 * throws a WebGpuGraphError (a mutant whose changed flag never settles, or one that produces a label outside
 * [0, n)) is a failed check under a tolerance of 0: Infinity, the same reading `ratioOf` gives a mismatch.
 * @param ctx - the context (a fresh one per mutation under withSabotage)
 * @param checks - the checks
 * @returns max over checks of mismatchFraction / WCC_NOISE_FLOOR
 */
export async function wccWorstFactor(ctx: GpuContext, checks: readonly WccCheck[]): Promise<number> {
    let worst = 0;
    for (const check of checks) {
        const expected = componentsOracle(check.snapshot);
        let mismatched = 0;
        try {
            const actual = await connectedComponents(ctx, check.snapshot);
            for (let v = 0; v < check.snapshot.nodeCount; v++) {
                if (actual.labels[v] !== expected.labels[v]) {
                    mismatched++;
                }
            }
        } catch (error: unknown) {
            if (!isWebGpuGraphError(error)) {
                throw error;
            }
            console.warn(`[sabotage] ${check.name}: ${error.code} ${error.message}`);
            worst = Number.POSITIVE_INFINITY;
            continue;
        }
        worst = Math.max(worst, mismatched / check.snapshot.nodeCount / WCC_NOISE_FLOOR);
    }
    for (const check of checks) {
        ctx.release(check.snapshot);
    }
    return worst;
}
