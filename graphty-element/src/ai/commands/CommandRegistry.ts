/**
 * Command Registry Module - Registry for graph commands.
 * @module ai/commands/CommandRegistry
 */

import { ASSISTANT_TOOLS } from "../../catalog/assistant";
import type { ToolDefinition } from "../providers/types";
import { isAssistantTool } from "../tools/toolset";
import type { GraphCommand } from "./types";

/** The assistant's own tool names. */
const RESERVED: ReadonlySet<string> = new Set(ASSISTANT_TOOLS.map((tool) => tool.name));

/**
 * The name a command is offered to the model under: its own, or `app_<name>` when one of the
 * assistant's own tools has its name.
 * @param name - The command's name.
 * @returns The name the registry holds it by.
 */
export function offeredName(name: string): string {
    return RESERVED.has(name) ? `app_${name}` : name;
}

/** Commands registered under another name, by the name the consumer gave them. */
const renamedFrom = new WeakMap<GraphCommand, string>();

/**
 * A consumer command under the name the model is offered it by.
 * @param command - The command.
 * @param name - The name.
 * @returns The command, everything but its name its own.
 */
function renamed(command: GraphCommand, name: string): GraphCommand {
    const view = Object.create(command, {
        name: { value: name, enumerable: true },
    }) as GraphCommand;
    renamedFrom.set(view, command.name);
    return view;
}

/**
 * Registry for graph commands that can be executed via AI.
 * Follows the same pattern as LayoutEngine.register() and Algorithm.register().
 */
export class CommandRegistry {
    private commands = new Map<string, GraphCommand>();

    /**
     * Register a new command. A command named as one of the assistant's own tools
     * (`ASSISTANT_TOOLS`) is held, and offered to the model, as `app_<name>`, so a tool added in
     * a later release never displaces a command already written.
     * @param command - The command to register
     * @throws Error if a command with the same name is already registered
     */
    register(command: GraphCommand): void {
        const existing = this.commands.get(command.name);
        if (isAssistantTool(command)) {
            // The assistant's own tools are rebuilt in place when the catalog changes.
            if (existing !== undefined && !isAssistantTool(existing)) {
                throw new Error(`Command "${command.name}" is already registered`);
            }

            this.commands.set(command.name, command);
            return;
        }

        const name = offeredName(command.name);
        if (this.commands.has(name)) {
            throw new Error(`Command "${name}" is already registered`);
        }

        this.commands.set(name, name === command.name ? command : renamed(command, name));
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
     * Unregister a command by name: the name it was registered under, which for a command named
     * as one of the assistant's own tools removes that command, never the tool.
     * @param name - Name of the command to remove
     */
    unregister(name: string): void {
        const offered = this.commands.get(offeredName(name));
        if (offered !== undefined && renamedFrom.get(offered) === name) {
            this.commands.delete(offeredName(name));
            return;
        }

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
