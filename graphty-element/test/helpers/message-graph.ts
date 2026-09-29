/**
 * @file A stand-in graph for the assistant controller's tests: nothing but a session whose
 * transaction runs its body, which is all the controller asks of a graph itself. Each message is
 * a transaction; what a registered command does with the graph is the command's own business.
 */

import type { CommandContext } from "../../src/ai/commands/types";

/**
 * A graph with a session that runs each transaction's body with the session itself as `tx`.
 * @returns The graph.
 */
export function createMessageGraph(): CommandContext["graph"] {
    const session = {
        transaction: <T>(_label: string, fn: (tx: unknown, signal: AbortSignal) => T | Promise<T>): Promise<T> =>
            Promise.resolve().then(() => fn(session, new AbortController().signal)),
    };
    return { getSession: () => session } as unknown as CommandContext["graph"];
}
