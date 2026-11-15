/**
 * What Katz and eigenvector centrality share: the options both iterate with, turning an unconverged
 * run into `E_NOT_CONVERGED`, and reading the scores back per node.
 * @module
 */

import { ConvergenceError } from "@graphty/algorithms";
import { INVALID_INDEX, type NodeIdMap } from "@graphty/graph-format";
import { z } from "zod";

import type { NodeId } from "../../catalog/types";
import type { OptionsSchema as ZodOptionsSchema } from "../../config";
import { GraphtyError } from "../../errors";
import type { ResultElementValues } from "../../session/results";
import type { OptionsSchema } from "../types/OptionSchema";
import { walkInChunks } from "./context";
import type { MetricRunContext } from "./types";

const ENDPOINTS_DESCRIPTION =
    "Not supported: this method walks no paths, so a run with it switched on is refused. Leave it off";

/** The Zod `tolerance` and `normalized` options. */
export const convergenceZodOptions = {
    tolerance: {
        schema: z.number().min(1e-10).max(0.01).default(1e-6),
        meta: { label: "Tolerance", description: "Convergence threshold", advanced: true },
    },
    normalized: {
        schema: z.boolean().default(true),
        meta: { label: "Normalized", description: "Whether to normalize the final scores", advanced: true },
    },
} satisfies ZodOptionsSchema;

/** The Zod `endpoints` option, which these methods refuse. */
export const endpointsZodOption = {
    endpoints: {
        schema: z.boolean().default(false),
        meta: { label: "Include Endpoints", description: ENDPOINTS_DESCRIPTION, advanced: true },
    },
} satisfies ZodOptionsSchema;

/** The `tolerance` and `normalized` options. */
export const convergenceOptions = {
    tolerance: {
        type: "number",
        default: 1e-6,
        label: "Tolerance",
        description: "Convergence threshold",
        min: 1e-10,
        max: 0.01,
        advanced: true,
    },
    normalized: {
        type: "boolean",
        default: true,
        label: "Normalized",
        description: "Whether to normalize the final scores",
        advanced: true,
    },
} satisfies OptionsSchema;

/** The `endpoints` option, which these methods refuse. */
export const endpointsOption = {
    endpoints: {
        type: "boolean",
        default: false,
        label: "Include Endpoints",
        description: ENDPOINTS_DESCRIPTION,
        advanced: true,
    },
} satisfies OptionsSchema;

/** Who ran and how, for the `E_NOT_CONVERGED` error. */
interface ConvergenceCall {
    /** The algorithm's `namespace:type`. */
    readonly algorithm: string;
    /** The method's name, starting the error's message. */
    readonly name: string;
    /** What to change before running it again. */
    readonly advice: string;
    readonly maxIterations: number;
    readonly tolerance: number;
}

/**
 * Await an iterative run, turning a `ConvergenceError` -- thrown by the port, or the cause of the
 * device controller's own failure -- into `E_NOT_CONVERGED`.
 * @param context - The run, for the error's target.
 * @param call - The algorithm and the limits it ran with.
 * @param running - The run.
 * @returns What the run returned.
 * @throws A `GraphtyError` with `E_NOT_CONVERGED`, or whatever else the run threw.
 */
export async function converged<T>(context: MetricRunContext, call: ConvergenceCall, running: Promise<T>): Promise<T> {
    try {
        return await running;
    } catch (error) {
        const convergence = error instanceof Error && !(error instanceof ConvergenceError) ? error.cause : error;
        if (!(convergence instanceof ConvergenceError)) {
            throw error;
        }
        const { algorithm, name, advice, maxIterations, tolerance } = call;
        throw new GraphtyError({
            code: "E_NOT_CONVERGED",
            message: `${name} did not converge in ${String(maxIterations)} iterations (tolerance ${String(tolerance)}). ${advice}`,
            source: "run",
            target: { kind: "run", id: context.runId },
            details: { algorithm, maxIterations, tolerance },
            cause: convergence,
        });
    }
}

/**
 * One value per node from a score vector indexed by snapshot row; a node the snapshot lacks gets none.
 * @param context - Where progress goes and where cancellation arrives.
 * @param nodeIds - The nodes to read.
 * @param ids - The snapshot's id map.
 * @param scores - The scores by row.
 * @returns The values.
 */
export async function readScores(
    context: MetricRunContext,
    nodeIds: readonly NodeId[],
    ids: NodeIdMap,
    scores: ArrayLike<number>,
): Promise<ResultElementValues[]> {
    const nodes: ResultElementValues[] = [];
    await walkInChunks(nodeIds, context, "reading-scores", (nodeId) => {
        const index = ids.indexOf(nodeId);
        nodes.push({ id: nodeId, values: index === INVALID_INDEX ? {} : { value: scores[index] } });
    });
    return nodes;
}
