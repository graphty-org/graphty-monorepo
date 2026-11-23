/**
 * The command context an AI command test hands a command, beside its graph.
 * @module test/helpers/test-graph
 */

import type { CommandContext } from "../../src/ai/commands/types";
import type { Graph } from "../../src/Graph";

/**
 * A command context over a graph: its session as `tx`, and event and status sinks that drop
 * what they are given.
 *
 * @param graph - The graph instance to use
 * @returns The command context
 */
export function createMockContext(graph: Graph): CommandContext {
    return {
        graph,
        tx: graph.getSession(),
        abortSignal: new AbortController().signal,
        emitEvent: () => undefined,
        updateStatus: () => undefined,
    };
}
