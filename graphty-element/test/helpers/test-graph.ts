/**
 * Test Graph utilities for AI command testing.
 * @module test/helpers/test-graph
 */

import type { AiStatus } from "../../src/ai/AiStatus";
import type { CommandContext } from "../../src/ai/commands/types";
import type { Graph } from "../../src/Graph";
import { createMockGraphContext, type MockGraphContextOptions } from "./mock-graph-context";

/**
 * Options for creating a test graph.
 */
export interface TestGraphOptions extends MockGraphContextOptions {
    /** Number of nodes to create */
    nodes?: number;
    /** Number of edges to create */
    edges?: number;
}

/**
 * Create a mock graph with specified options: createMockGraphContext with friendlier parameter
 * names. Not the real graph `createTestGraph` in testSetup.ts builds.
 *
 * @param options - Configuration options
 * @returns A mock graph for testing
 */
export function createMockTestGraph(options: TestGraphOptions = {}): Graph {
    const { nodes, edges, ...rest } = options;

    return createMockGraphContext({
        nodeCount: nodes ?? rest.nodeCount ?? 25,
        edgeCount: edges ?? rest.edgeCount ?? 40,
        ...rest,
    });
}

/**
 * Create a mock command context for testing commands.
 *
 * @param graph - The graph instance to use
 * @returns A mock command context
 */
export function createMockContext(graph: Graph): CommandContext {
    const events: { type: string; data: unknown }[] = [];
    const statusUpdates: Partial<AiStatus>[] = [];

    const context: CommandContext = {
        graph,
        tx: graph.getSession(),
        abortSignal: new AbortController().signal,
        emitEvent: (type: string, data: unknown) => {
            events.push({ type, data });
        },
        updateStatus: (updates: Partial<AiStatus>) => {
            statusUpdates.push(updates);
        },
    };

    // Attach test helpers to context for inspection
    (
        context as CommandContext & {
            __testEvents: typeof events;
            __testStatusUpdates: typeof statusUpdates;
        }
    ).__testEvents = events;
    (
        context as CommandContext & {
            __testEvents: typeof events;
            __testStatusUpdates: typeof statusUpdates;
        }
    ).__testStatusUpdates = statusUpdates;

    return context;
}

/**
 * Helper to get emitted events from a mock context.
 *
 * @param context - The command context
 * @returns Array of emitted events
 */
export function getEmittedEvents(context: CommandContext): { type: string; data: unknown }[] {
    const ctx = context as CommandContext & { __testEvents?: { type: string; data: unknown }[] };
    return ctx.__testEvents ?? [];
}

/**
 * Helper to get status updates from a mock context.
 *
 * @param context - The command context
 * @returns Array of status updates
 */
export function getStatusUpdates(context: CommandContext): Partial<AiStatus>[] {
    const ctx = context as CommandContext & { __testStatusUpdates?: Partial<AiStatus>[] };
    return ctx.__testStatusUpdates ?? [];
}
