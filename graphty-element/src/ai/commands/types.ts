/**
 * Command Types Module - Interfaces for graph commands.
 * @module ai/commands/types
 */

import type { z } from "zod";

import type { Graph } from "../../Graph";
import type { TransactionScope } from "../../session/types";
import type { AiStatus } from "../AiStatus";

/**
 * Result of executing a command.
 */
export interface CommandResult {
    /** Whether the command executed successfully */
    success: boolean;
    /** Human-readable message about the result */
    message: string;
    /** Optional data returned by the command */
    data?: unknown;
    /** IDs of nodes affected by the command */
    affectedNodes?: string[];
    /** IDs of edges affected by the command */
    affectedEdges?: string[];
}

/**
 * Context provided to command execution.
 */
export interface CommandContext {
    /** The graph instance to operate on */
    graph: Graph;
    /**
     * The message's transaction. Everything a command changes through `tx` -- `tx.styles.add`,
     * `tx.layout.set`, `tx.run` -- joins the message's one undoable step, and is rolled back with
     * the rest of the message when a command throws. A change made through `graph` instead is a
     * step of its own and is not rolled back.
     */
    tx: TransactionScope;
    /**
     * Fires when the message is cancelled, or undone while it is still going. A command stops
     * on it: once it has fired, every `tx` call rejects.
     */
    abortSignal: AbortSignal;
    /** Function to emit events */
    emitEvent: (type: string, data: unknown) => void;
    /** Function to update AI status */
    updateStatus: (updates: Partial<AiStatus>) => void;
}

/**
 * Where a command writes: the message's transaction, so its changes join the message's step, or
 * the graph's own session when the command is called outside a message.
 * @param graph - The graph the command was handed.
 * @param context - The command's context, when it has one.
 * @returns The session to write through.
 */
export function writerOf(graph: Graph, context?: CommandContext): TransactionScope {
    return context?.tx ?? graph.getSession();
}

/**
 * Example of how a command can be invoked.
 */
export interface CommandExample {
    /** Natural language input that should trigger this command */
    input: string;
    /** The parameters that should be extracted from the input */
    params: Record<string, unknown>;
}

/**
 * Definition of a graph command that can be executed via AI.
 */
export interface GraphCommand {
    /** Unique name of the command (used as tool name) */
    readonly name: string;
    /** Description of what the command does (used in LLM prompt) */
    readonly description: string;
    /** Zod schema defining the parameters */
    readonly parameters: z.ZodType;
    /** Examples of how the command can be invoked */
    readonly examples: CommandExample[];
    /**
     * Execute the command.
     * @param graph - The graph instance to operate on
     * @param params - Parameters parsed from user input
     * @param context - Optional execution context with abort signal and event emitter
     * @returns Promise resolving to the command result
     */
    execute(graph: Graph, params: Record<string, unknown>, context?: CommandContext): Promise<CommandResult>;
}
