/**
 * Command Registry Module - Registry for graph commands.
 * @module ai/commands/CommandRegistry
 */

import { ASSISTANT_TOOLS } from "../../catalog/assistant";
import { GraphtyError } from "../../errors/GraphtyError";
import type { ToolDefinition } from "../providers/types";
import { isAssistantTool } from "../tools/toolset";
import type { GraphCommand } from "./types";

/** The assistant's own tool names, which a consumer command may not take. */
const RESERVED: ReadonlySet<string> = new Set(ASSISTANT_TOOLS.map((tool) => tool.name));

/**
 * Registry for graph commands that can be executed via AI.
 * Follows the same pattern as LayoutEngine.register() and Algorithm.register().
 */
export class CommandRegistry {
    private commands = new Map<string, GraphCommand>();

    /**
     * Register a new command.
     * @param command - The command to register
     * @throws Error if a command with the same name is already registered, and a `GraphtyError`
     *   coded `E_DUPLICATE_PLUGIN` for a name in `ASSISTANT_TOOLS`, the assistant's own tools.
     */
    register(command: GraphCommand): void {
        if (RESERVED.has(command.name) && !isAssistantTool(command)) {
            throw new GraphtyError({
                code: "E_DUPLICATE_PLUGIN",
                message: `"${command.name}" is the name of one of the assistant's own tools; register the command under another name.`,
                source: "registry",
                details: { command: command.name, tool: command.name },
            });
        }

        if (this.commands.has(command.name)) {
            throw new Error(`Command "${command.name}" is already registered`);
        }

        this.commands.set(command.name, command);
    }

    /**
     * Get a command by name.
     * @param name - Name of the command
     * @returns The command or undefined if not found
     */
    get(name: string): GraphCommand | undefined {
        return this.commands.get(name);
    }

    /**
     * Check if a command is registered.
     * @param name - Name of the command
     * @returns True if the command is registered
     */
    has(name: string): boolean {
        return this.commands.has(name);
    }

    /**
     * Get all registered commands.
     * @returns Array of all registered commands
     */
    getAll(): GraphCommand[] {
        return Array.from(this.commands.values());
    }

    /**
     * Get names of all registered commands.
     * @returns Array of command names
     */
    getNames(): string[] {
        return Array.from(this.commands.keys());
    }

    /**
     * Unregister a command by name.
     * @param name - Name of the command to remove
     */
    unregister(name: string): void {
        this.commands.delete(name);
    }

    /**
     * Remove all registered commands.
     */
    clear(): void {
        this.commands.clear();
    }

    /**
     * Convert all registered commands to tool definitions, as an `LlmProvider` takes them.
     * @returns Array of tool definitions for use with LLM providers
     */
    toToolDefinitions(): ToolDefinition[] {
        return this.getAll().map((command) => ({
            name: command.name,
            description: command.description,
            parameters: command.parameters,
        }));
    }
}
