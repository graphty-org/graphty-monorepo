import type { GraphSnapshot } from "@graphty/graph-format";
import { z } from "zod";

import type { NodeId, SelectionDirection } from "../../catalog/types";
import type { InputOrientation } from "../input/derivedInputs";
import { type ElementScopedInput, scopeNodeIds } from "../input/ScopedInput";
import type { OptionsSchema } from "../types/OptionSchema";

/** A route endpoint option: a node id, null for the input's first or last node. */
const NODE_ID = z.union([z.string(), z.number()]).nullable().default(null);

/** One endpoint field for `defineOptions`. */
interface EndpointField {
    /** The option's Zod schema. */
    schema: typeof NODE_ID;
    /** The option's label and description in the options panel. */
    meta: { label: string; description: string };
}

/**
 * The `source` and `target` options of a route search, as Zod fields for `defineOptions`.
 * @param source - What the source option means, in the options panel.
 * @param target - What the target option means.
 * @returns The two fields.
 */
export function endpointOptions(source: string, target: string): Record<"source" | "target", EndpointField> {
    return {
        source: { schema: NODE_ID, meta: { label: "Source Node", description: source } },
        target: { schema: NODE_ID, meta: { label: "Target Node", description: target } },
    };
}

/**
 * The same `source` and `target` options, as the descriptor's `OptionsSchema` entries.
 * @param source - What the source option means.
 * @param target - What the target option means.
 * @returns The two entries.
 */
export function endpointSchema(source: string, target: string): OptionsSchema {
    return {
        source: { type: "nodeId", default: null, label: "Source Node", description: source, required: false },
        target: { type: "nodeId", default: null, label: "Target Node", description: target, required: false },
    };
}

/**
 * The endpoints a route search runs between: the options' own, or the snapshot's first and last node.
 * @param snapshot - The snapshot the search runs over.
 * @param options - The run's `source` and `target` options.
 * @param options.source - The source node, or null.
 * @param options.target - The target node, or null.
 * @returns The source and target ids.
 */
export function endpointIds(
    snapshot: GraphSnapshot,
    options: { source: NodeId | null; target: NodeId | null },
): { source: NodeId; target: NodeId } {
    return {
        source: options.source ?? snapshot.ids.idOf(0),
        target: options.target ?? snapshot.ids.idOf(snapshot.nodeCount - 1),
    };
}

/**
 * The input a route search reads for a `direction` option: "all", or any value on a graph loaded
 * undirected, lets a route cross an edge either way.
 * @param input - The algorithm's input for an orientation (`this.input`).
 * @param direction - The run's `direction` option.
 * @returns Whether the search follows edge direction, the input, and its nodes (the scope's, or
 * the whole graph's).
 */
export function routeInput(
    input: (orientation: InputOrientation) => ElementScopedInput,
    direction: SelectionDirection,
): { directed: boolean; input: ElementScopedInput; nodeIds: NodeId[] } {
    const directed = direction !== "all" && input("declared").graph.directed;
    const chosen = input(directed ? "declared" : "undirected");
    return { directed, input: chosen, nodeIds: scopeNodeIds(chosen) };
}
