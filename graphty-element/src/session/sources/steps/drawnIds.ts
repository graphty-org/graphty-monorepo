/**
 * @file The session ids of a draft's elements and how many it marks (design
 * design/data/multiple-data-sources-design.md, section 5), behind the `source-steps` experiment:
 * what `preview.ids`, `preview.marks` and `styles.showDraft` read. Pure, and free of Babylon.js, Lit
 * and the DOM.
 */

import type { EdgeId, NodeId } from "../../../catalog/types";
import type { SourceDraftMadeCounts, SourceDraftMarkCounts } from "../../types";
import { nodeId } from "./build";
import type { DraftMarks, DraftState } from "./draft";
import { drillElements } from "./drill";
import { buildOf, nodeIdsOf } from "./project";
import type { ElementRef } from "./types";

/** The node ids and edge ids of some draft elements. */
export interface DrawnIds {
    readonly nodes: readonly NodeId[];
    readonly edges: readonly EdgeId[];
}

/** The counts of a step one query lists, by the draft's step place. */
export interface StepBuckets {
    readonly step: number;
    readonly buckets: readonly string[];
}

/**
 * The references behind some counts of one step, once each; a step or count the draft does not
 * hold lists nothing.
 * @param state - The draft.
 * @param query - The step and its counts.
 * @returns The references.
 */
export function stepRefs(state: DraftState, query: StepBuckets): ElementRef[] {
    const out: ElementRef[] = [];
    for (const bucket of query.buckets) {
        try {
            out.push(...drillElements(state, { step: query.step, bucket: bucket as never }));
        } catch {
            // A count this step does not keep lists nothing.
        }
    }
    return out;
}

/**
 * The NodeId a node reference names in a build, through the aliases of nodes merged since.
 * @param built - The build.
 * @param ids - Its NodeIds by internal id.
 * @param ref - The reference.
 * @param ref.space - Its id space.
 * @param ref.key - Its key.
 * @returns The NodeId, or undefined when the build holds no such node.
 */
function nodeIdOf(
    built: ReturnType<typeof buildOf>,
    ids: ReadonlyMap<string, NodeId>,
    ref: { readonly space: string; readonly key: string },
): NodeId | undefined {
    const at = nodeId(ref.space, ref.key);
    const node = built.nodes.get(at) ?? built.nodes.get(built.aliases.get(at) ?? "");
    return node === undefined ? undefined : ids.get(node.id);
}

/**
 * The session ids of element references in one side's build.
 * @param side - The value and copies drawn.
 * @param refs - The references.
 * @param edgeIds - The session id of each built edge drawn.
 * @returns The ids; a reference the side does not build, or an edge it does not draw, is left out.
 */
export function idsOfRefs(
    side: Pick<DraftState, "value" | "copies">,
    refs: readonly ElementRef[],
    edgeIds: Readonly<Record<string, EdgeId>>,
): DrawnIds {
    const built = buildOf(side.value, side.copies);
    const ids = nodeIdsOf(built);
    const nodes = new Set<NodeId>();
    const edges = new Set<EdgeId>();
    for (const ref of refs) {
        if ("space" in ref) {
            const id = nodeIdOf(built, ids, ref);
            if (id !== undefined) {
                nodes.add(id);
            }
        } else {
            const at = `${ref.load}\u0001${ref.key}`;
            const edge = built.edges.get(at) ?? built.edges.get(built.edgeAliases.get(at) ?? "");
            const id = edge === undefined ? undefined : edgeIds[edge.id];
            if (id !== undefined) {
                edges.add(id);
            }
        }
    }
    return { nodes: [...nodes], edges: [...edges] };
}

/**
 * The nodes of a space a step joins into that no row of the step reached, over every step, as
 * the draft's After names them; a node the commit merges into or adds is left out.
 * @param state - The draft.
 * @param marks - What the commit does to each element.
 * @returns The NodeIds.
 */
export function untouchedNodes(state: DraftState, marks: DraftMarks): Set<string> {
    const built = buildOf(state.value, state.copies);
    const ids = nodeIdsOf(built);
    const out = new Set<string>();
    for (let step = 0; step < state.value.steps.length; step++) {
        for (const ref of stepRefs(state, { step, buckets: ["untouched"] })) {
            const id = "space" in ref ? nodeIdOf(built, ids, ref) : undefined;
            const mark = id === undefined ? undefined : marks.nodes.get(String(id));
            if (id !== undefined && mark !== "merged" && mark !== "new") {
                out.add(String(id));
            }
        }
    }
    return out;
}

/**
 * How many elements a draft marks.
 * @param state - The draft.
 * @param marks - What the commit does to each element.
 * @returns The counts.
 */
export function markCounts(state: DraftState, marks: DraftMarks): SourceDraftMarkCounts {
    const count = (all: ReadonlyMap<string, string>, mark: string): number =>
        [...all.values()].filter((each) => each === mark).length;
    const merged = count(marks.nodes, "merged");
    const newNodes = count(marks.nodes, "new");
    const newEdges = count(marks.edges, "new");
    const untouched = untouchedNodes(state, marks).size;
    // Named only when there are any: most drafts change no element but by merging into it.
    const changed = (all: ReadonlyMap<string, string>): { changed?: number } => {
        const n = count(all, "changed");
        return n === 0 ? {} : { changed: n };
    };
    return {
        merged,
        new: newNodes + newEdges,
        untouched,
        nodes: { merged, new: newNodes, untouched, removed: count(marks.nodes, "removed"), ...changed(marks.nodes) },
        edges: {
            merged: count(marks.edges, "merged"),
            new: newEdges,
            removed: count(marks.edges, "removed"),
            ...changed(marks.edges),
        },
    };
}

/**
 * How many elements some steps of a draft make, each counted once however many of the steps reach it:
 * the nodes and edges they add, and those they fold rows into. An element a step adds counts as added
 * only when the commit adds it, as `markCounts` counts it: one the graph holds already, a committed join's
 * own included, is not new to the reader.
 * @param base - The committed value and copies.
 * @param state - The draft.
 * @param marks - What the commit does to each element.
 * @param steps - The steps' places; a place the draft does not hold makes nothing.
 * @returns The counts.
 */
export function madeCounts(
    base: Omit<DraftState, "owned">,
    state: DraftState,
    marks: DraftMarks,
    steps: readonly number[],
): SourceDraftMadeCounts {
    const built = buildOf(state.value, state.copies);
    const ids = nodeIdsOf(built);
    const reached = (buckets: readonly string[]): Set<string> => {
        const out = new Set<string>();
        for (const step of new Set(steps)) {
            for (const ref of stepRefs(state, { step, buckets })) {
                const id = "space" in ref ? nodeIdOf(built, ids, ref) : builtEdgeOf(built, ref);
                if (id !== undefined) {
                    out.add(String(id));
                }
            }
        }
        return out;
    };
    const added = (made: ReadonlySet<string>, of: ReadonlyMap<string, string>): number =>
        [...made].filter((id) => of.get(id) === "new").length;
    const merged = reached(["merged"]);
    const mergedEdges = reached(["mergedEdges"]);
    // A node a merge keeps is the one an earlier step made: new only when the commit adds it.
    const made = reached(["newNodes"]);
    const kept = [...reached(["keptNew"])].filter((id) => !made.has(id) && marks.nodes.get(id) === "new");
    // A node a step took out is one the committed build holds, named by its committed NodeId.
    const ids0 = nodeIdsOf(buildOf(base.value, base.copies));
    const removed = new Set<string>();
    for (const step of new Set(steps)) {
        for (const id of built.dropped.get(step) ?? []) {
            const at = String(ids0.get(id));
            if (marks.nodes.get(at) === "removed") {
                removed.add(at);
            }
        }
    }
    return {
        nodes: { new: added(made, marks.nodes) + kept.length, merged: merged.size, removed: removed.size },
        edges: { new: added(reached(["newEdges"]), marks.edges), merged: mergedEdges.size },
    };
}

/**
 * The built edge id an edge reference names, through the aliases of edges merged since.
 * @param built - The build.
 * @param ref - The reference.
 * @param ref.load - Its load.
 * @param ref.key - Its key.
 * @returns The id, or undefined when the build holds no such edge.
 */
function builtEdgeOf(
    built: ReturnType<typeof buildOf>,
    ref: { readonly load: string; readonly key: string },
): string | undefined {
    const at = `${ref.load}\u0001${ref.key}`;
    return built.edges.has(at) ? at : built.edgeAliases.get(at);
}
