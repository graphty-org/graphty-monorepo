import { z } from "zod/v4";

import type { Graph } from "../Graph";
import type { Node as GraphNode } from "../Node";

const NodeBehaviorOpts = z
    .strictObject({
        pinOnDrag: z.boolean().default(true),
    })
    .prefault({});

const GraphLayoutOpts = z.strictObject({
    type: z.string().default("ngraph"),
    preSteps: z.number().default(0),
    stepMultiplier: z.number().default(1),
    minDelta: z.number().default(0),
    zoomStepInterval: z.number().min(1).default(1),
});

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

interface EdgeObjectType {
    src: NodeIdType;
    dst: NodeIdType;
    metadata: object;
    [key: string]: unknown;
}

export type FetchNodesFn = (nodeIds: Set<NodeIdType>, g: Graph) => Set<NodeObjectType>;
export type FetchEdgesFn = (node: GraphNode, g: Graph) => Set<EdgeObjectType>;
