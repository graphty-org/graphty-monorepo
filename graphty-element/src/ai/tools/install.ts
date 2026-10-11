/**
 * @file Puts the generated tools in a command registry, and rebuilds them when the catalog or the
 * consumer's commands change: a plugin registered after the assistant was enabled reaches the
 * model at the next message. Also the small-model profile's `call`, which reaches every tool.
 */

import { z } from "zod";

import type { GraphSession } from "../../session/types";
import type { CommandRegistry } from "../commands/CommandRegistry";
import type { GraphCommand } from "../commands/types";
import { text } from "./fields";
import { suggest } from "./search";
import {
    AssistantTool,
    buildToolset,
    catalogKey,
    catalogView,
    type CheckedCall,
    isAssistantTool,
    stripPlaceholders,
} from "./toolset";
import { type ActionSpec, type JsonObject, ToolRefusal } from "./types";

/** The small-model profile's tools: everything else is reached through `call`. */
export const SMALL_PROFILE_TOOLS: readonly string[] = ["catalog", "query", "call", "undo"];

/** The on-demand tools a turn offers at most, beside the always-loaded ones. */
export const MAX_LOADED_TOOLS = 6;

/**
 * A consumer command as a one-action tool, so `call` can hand it to the executor like any other.
 * @param command - The command.
 * @returns The tool.
 */
function wrap(command: GraphCommand): AssistantTool {
    const action: ActionSpec = {
        name: "run",
        summary: command.description,
        fields: {},
        effect: command.effect ?? "write",
        reaches: [],
        run: async (context, args) => {
            const result = await command.execute(context.graph, args, {
                graph: context.graph,
                tx: context.tx,
                abortSignal: context.signal,
                emitEvent: () => undefined,
                updateStatus: () => undefined,
            });
            if (!result.success) {
                throw new ToolRefusal(result.code ?? "AI_TOOL_FAILED", {
                    ...(result.params ?? { message: result.message }),
                } as JsonObject);
            }

            return {
                code: result.code ?? "AI_OK",
                params: (result.params ?? (result.message === "" ? {} : { message: result.message })) as JsonObject,
                data: result.data as JsonObject,
            };
        },
    };
    return new AssistantTool({
        name: command.name,
        plainName: command.name,
        core: false,
        description: command.description,
        example: {},
        actions: [action],
    });
}

/** `call`: calls any tool by name, for a model that can hold only a few tools. */
export class CallTool extends AssistantTool {
    /**
     * The tool, over a registry.
     * @param registry - Where the tools it calls are.
     */
    constructor(private readonly registry: CommandRegistry) {
        super({
            name: "call",
            plainName: "Call a tool",
            core: true,
            description:
                "Calls any tool: {tool, action, args}. Find tools and their arguments with catalog search, detail schemas.",
            example: { tool: "style", action: "add", args: { where: "all", values: { "node.color": "red" } } },
            actions: [
                {
                    name: "call",
                    summary: "call a tool",
                    fields: {
                        tool: z.string().max(100).describe("The tool's name."),
                        action: z.string().max(100).optional().describe("Its action."),
                        args: z
                            .union([z.record(z.string(), z.unknown()), z.string().max(200_000)])
                            .optional()
                            .describe("Its arguments."),
                    },
                    effect: "read",
                    reaches: [],
                    run: () => Promise.reject(new Error("call runs the tool it names")),
                },
            ],
        });
    }

    /**
     * Check the call it stands for: the named tool's own check.
     * @param raw - `{ tool, action, args }`; `action` may sit inside `args`, and `args` may be JSON text.
     * @returns The named tool's checked call.
     */
    override check(raw: Readonly<Record<string, unknown>>): CheckedCall {
        const { tool, action, args } = stripPlaceholders(raw);
        let inner: Record<string, unknown> = {};
        if (typeof args === "string") {
            try {
                inner = JSON.parse(args) as Record<string, unknown>;
            } catch {
                throw new ToolRefusal("AI_ARG_INVALID", { path: "args", expected: "an object or its JSON" });
            }
        } else if (args !== undefined) {
            inner = args as Record<string, unknown>;
        }

        if (action !== undefined && inner.action !== undefined && inner.action !== action) {
            throw new ToolRefusal("AI_ARG_INVALID", { path: "action", expected: "one action, inside or outside args" });
        }

        const name = text(tool);
        const target = this.registry.get(name);
        if (target === undefined || target === this) {
            throw new ToolRefusal("AI_TOOL_UNKNOWN", {
                tool: name,
                didYouMean: suggest(
                    name,
                    this.registry.getNames().filter((each) => each !== "call"),
                ),
            });
        }

        const merged = action === undefined ? inner : { ...inner, action };
        return (isAssistantTool(target) ? target : wrap(target)).check(merged);
    }
}

/** What a registry's generated tools were built from. */
const builtFrom = new WeakMap<CommandRegistry, string>();

/**
 * Register the generated tools in a registry, or rebuild them when the catalog or the consumer's
 * commands changed since the last build.
 * @param registry - The registry.
 * @param session - The session whose catalog they offer.
 */
export function installAssistantTools(registry: CommandRegistry, session: Pick<GraphSession, "catalog">): void {
    const consumer = registry.getAll().filter((command) => !isAssistantTool(command));
    const key = `${catalogKey(catalogView(session))}|${consumer.map((command) => command.name).join(",")}`;
    if (builtFrom.get(registry) === key) {
        return;
    }

    const toolset = buildToolset(session, consumer);
    for (const tool of [...toolset.tools, new CallTool(registry)]) {
        registry.unregister(tool.name);
        registry.register(tool);
    }

    builtFrom.set(registry, key);
}

/**
 * Whether a registry holds the generated tools.
 * @param registry - The registry.
 * @returns True once they are installed.
 */
export function hasAssistantTools(registry: CommandRegistry): boolean {
    return builtFrom.has(registry);
}
