import { z } from "zod/v4";

import type { Graph } from "../Graph";
import type { Node as GraphNode } from "../Node";

const NodeBehaviorOpts = z
    .strictObject({
        /*
         * Whether dropping a dragged node fixes it where the reader put it.
         *
         * IT STAYS ON BY DEFAULT even though a pin now survives a layout change, a 2D/3D switch
         * and a style template -- which means every node a reader has ever dragged stops being
         * rearranged, with nobody opting in. A drag is a deliberate placement, and an arrangement
         * that silently discards it is the defect this release is fixing, not a feature to
         * preserve.
         *
         * What makes that defensible is that a pin can now be RELEASED: `element.pin`,
         * `element.unpin` and `element.pinnedNodes` are public, so a reader who wants their
         * placements back in the layout has a way to say so. Before those existed, leaving this
         * on would have meant a session that froze one node per drag with no way out.
         */
        pinOnDrag: z.boolean().default(true),
    })
    .prefault({});

const GraphLayoutOpts = z.strictObject({
    type: z.string().default("ngraph"),
    preSteps: z.number().default(0),
    stepMultiplier: z.number().default(1),
    minDelta: z.number().default(0),
    zoomStepInterval: z.number().min(1).default(1),

    /*
     * How many iterations of a simulation layout one frame computes.
     *
     * LEFT UNSET ON PURPOSE by default, because the right answer depends on the graph in front of
     * the reader rather than on the host: a simulation resolves it at every load from
     * `stepMultiplier`, raising it fourfold once the graph is large enough that one round trip per
     * iteration costs more than the arithmetic. Setting it here pins the count whatever the size.
     *
     * It reaches nothing but a simulation layout -- `forceatlas2`, `spring` and `spring-electrical`
     * -- because no other engine computes in batches.
     */
    iterationsPerStep: z.number().int().positive().optional(),

    /*
     * How many accelerated batches a simulation layout may have in flight at once.
     *
     * Two is one being computed while the next is being prepared, which is what keeps the device
     * busy without letting the frame loop queue work faster than the device retires it. One makes
     * every frame wait for the readback; more than four buys nothing and costs a uniform ring
     * entry per batch. A CPU simulation ignores it: its step is synchronous.
     */
    maxInFlight: z.number().int().min(1).max(4).default(2),
});

/** How the element drives a layout, as the behaviour configuration resolves it. */
export type GraphLayoutBehavior = z.infer<typeof GraphLayoutOpts>;

/** How the element drives the layout, as a caller supplies it: every field optional. */
export type GraphBehaviorConfig = z.input<typeof GraphBehaviorOpts>;

export const GraphBehaviorOpts = z.strictObject({
    // dimensions: z.int().min(2).max(3).default(3),
    layout: GraphLayoutOpts.prefault({}),
    node: NodeBehaviorOpts,
    fetchNodes: z.optional(z.instanceof(Function)),
    fetchEdges: z.optional(z.instanceof(Function)),
});

/* ******* REFACTOR EVERYTHING BELOW THIS LINE *********/
export type NodeIdType = string | number;

interface NodeObjectType {
    id: NodeIdType;
    metadata: object;
    [key: string]: unknown;
}

/**
 * The shape of an edge record a consumer's `fetchEdges` hands back.
 *
 * This is a RECORD, not the element's render object, so it carries the canonical endpoint
 * spelling. The element still probes `src`/`dst` and `from`/`to` at runtime, so a `fetchEdges`
 * written against 1.x keeps working; the declared type names the spelling the guides teach and
 * that every other door into the element publishes.
 */
interface EdgeObjectType {
    source: NodeIdType;
    target: NodeIdType;
    metadata: object;
    [key: string]: unknown;
}

export type FetchNodesFn = (nodeIds: Set<NodeIdType>, g: Graph) => Set<NodeObjectType>;
export type FetchEdgesFn = (node: GraphNode, g: Graph) => Set<EdgeObjectType>;
