/**
 * @file Path resolution (design/sets/sets-design.md section 4.4).
 *
 * A path set resolves to its distinct nodes and the edges its steps name, read `listed`. A step
 * that names an edge or a group of edges contributes the ones bound in the snapshot (through the
 * binding table, as a fixed set's edge members do); a `null` step, or a path with no `edges`,
 * contributes every edge between its pair. Under `directed: true` only edges running from
 * `nodes[i]` to `nodes[i + 1]` count. A step with no edge left counts missing. Nothing throws.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { INVALID_INDEX, makeMask } from "@graphty/graph-format";

import type { EdgeMember, NodeId, PathKind, SetDefinition } from "../../catalog/types";
import {
    addEdgeRow,
    bindEdgeMembers,
    EDGE_AMBIGUOUS,
    edgeMemberKey,
    type EdgeSeeds,
    type Resolution,
    resolutionOf,
    type ResolveContext,
    resolveCounters,
} from "./resolve";

/** A path definition. */
type PathDefinition = Extract<SetDefinition, { kind: "path" }>;

/**
 * The walk's named edge members, flattened, with the step each belongs to. Memoised per frozen
 * definition, so the binding table sees one member array per path.
 */
const flattened = new WeakMap<
    PathDefinition,
    { readonly members: readonly EdgeMember[]; readonly stepOf: Uint32Array }
>();

/**
 * A path's named edge members and their steps.
 * @param definition - The path.
 * @returns The members, in step order, and the step of each.
 */
function namedMembers(definition: PathDefinition): {
    readonly members: readonly EdgeMember[];
    readonly stepOf: Uint32Array;
} {
    let entry = flattened.get(definition);
    if (entry === undefined) {
        const members: EdgeMember[] = [];
        const steps: number[] = [];
        (definition.edges ?? []).forEach((step, i) => {
            if (step === null) {
                return;
            }

            for (const member of Array.isArray(step) ? (step as readonly EdgeMember[]) : [step as EdgeMember]) {
                members.push(member);
                steps.push(i);
            }
        });
        entry = { members, stepOf: Uint32Array.from(steps) };
        flattened.set(definition, entry);
    }

    return entry;
}

/**
 * What a path covers in the context snapshot.
 * @param definition - A canonical path definition.
 * @param context - What the resolution reads.
 * @param seeds - The set's seeds, for a kept set.
 * @returns The resolution: `missingNodes` counts distinct walk nodes the graph does not hold,
 *     `missingEdges` the steps with no edge, `ambiguousEdges` the named members two edges carry.
 */
export function resolvePath(definition: PathDefinition, context: ResolveContext, seeds?: EdgeSeeds): Resolution {
    const { snapshot } = context;
    const ids = context.ids ?? snapshot.ids;
    const n = snapshot.nodeCount;
    const nodes = makeMask(n);
    const edges = makeMask(snapshot.edgeCount);
    const index = definition.nodes.map((id) => ids.indexOf(id));
    const absent = new Set<NodeId>();
    index.forEach((at, i) => {
        if (at === INVALID_INDEX) {
            absent.add(definition.nodes[i]);
        } else {
            nodes[at >>> 5] |= 1 << (at & 31);
        }
    });

    const steps = Math.max(0, definition.nodes.length - 1);
    const directed = definition.directed === true;
    const covered = new Uint8Array(steps);
    const forward = (row: number, step: number): boolean =>
        snapshot.edgeSource(row) === index[step] && snapshot.edgeTarget(row) === index[step + 1];

    const { members, stepOf } = namedMembers(definition);
    let ambiguous = 0;
    bindEdgeMembers(definition, members, context, seeds).forEach((row, k) => {
        if (row === EDGE_AMBIGUOUS) {
            ambiguous++;
        }

        const step = stepOf[k];
        // Under `directed`, a named edge whose direction opposes its step is not walked.
        if (row >= 0 && (!directed || forward(row, step))) {
            addEdgeRow(row, snapshot, nodes, edges);
            covered[step] = 1;
        }
    });

    // Null steps (and every step of a path that names no edges): every edge between the pair,
    // found in one edge pass keyed by the pair.
    const pairKey = (s: number, t: number): number => (directed || s <= t ? s * n + t : t * n + s);
    const open = new Map<number, number[]>();
    for (let step = 0; step < steps; step++) {
        const named = definition.edges?.[step] ?? null;
        if (named !== null || index[step] === INVALID_INDEX || index[step + 1] === INVALID_INDEX) {
            continue;
        }

        const key = pairKey(index[step], index[step + 1]);
        const list = open.get(key);
        if (list === undefined) {
            open.set(key, [step]);
        } else {
            list.push(step);
        }
    }

    if (open.size > 0) {
        const { src, dst } = snapshot.edgeList();
        resolveCounters.edgePasses++;
        resolveCounters.edgeRowVisits += snapshot.edgeCount;
        for (let e = 0; e < snapshot.edgeCount; e++) {
            const list = open.get(pairKey(src[e], dst[e]));
            if (list !== undefined) {
                addEdgeRow(e, snapshot, nodes, edges);
                for (const step of list) {
                    covered[step] = 1;
                }
            }
        }
    }

    let missingSteps = 0;
    for (let step = 0; step < steps; step++) {
        missingSteps += covered[step] === 1 ? 0 : 1;
    }

    return resolutionOf(
        { nodes, constraint: null, all: false, missingNodes: absent.size },
        edges,
        context,
        missingSteps,
        ambiguous,
    );
}

/**
 * One node id as a key that keeps `1` and `"1"` apart.
 * @param id - The node id.
 * @returns The key.
 */
function nodeKey(id: NodeId): string {
    return `${typeof id === "number" ? "n" : "s"}${String(id)}`;
}

/**
 * What kind of walk a path is (design 4.4). Each step is one logical edge, keyed on the group of
 * edges it names, or on its end pair for a `null` step (unordered unless `directed`). `trail`: no
 * logical edge repeats; `simple`: no node repeats; `cycle`: a closed trail of at least one step
 * whose only repeated node is the first, equal to the last; `walk`: anything else. The most
 * specific kind is returned. Derived from the definition alone: never resolves.
 * @param definition - A canonical path definition.
 * @returns The kind.
 */
export function pathKind(definition: PathDefinition): PathKind {
    const nodes = definition.nodes.map(nodeKey);
    const steps = Math.max(0, nodes.length - 1);
    const directed = definition.directed === true;
    const logical = new Set<string>();
    let trail = true;
    for (let step = 0; step < steps; step++) {
        const named = definition.edges?.[step] ?? null;
        let key: string;
        if (named === null) {
            const [a, b] =
                directed || nodes[step] <= nodes[step + 1]
                    ? [nodes[step], nodes[step + 1]]
                    : [nodes[step + 1], nodes[step]];
            key = `p${JSON.stringify([a, b])}`;
        } else {
            const members = Array.isArray(named) ? (named as readonly EdgeMember[]) : [named as EdgeMember];
            key = `e${JSON.stringify(members.map(edgeMemberKey).sort())}`;
        }

        if (logical.has(key)) {
            trail = false;
        }

        logical.add(key);
    }

    const distinct = (keys: readonly string[]): boolean => new Set(keys).size === keys.length;
    if (trail && steps >= 1 && nodes[0] === nodes[steps] && distinct(nodes.slice(0, steps))) {
        return "cycle";
    }

    if (distinct(nodes)) {
        return "simple";
    }

    return trail ? "trail" : "walk";
}
