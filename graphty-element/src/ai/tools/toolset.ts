/**
 * @file The generator: builds the assistant's tools from the live catalog (built-in and
 * registered entries) and the tool families, as `GraphCommand`s the registry, the executor and
 * the loop already speak. Each tool's provider schema is one flat object (an `action` enum plus
 * every action's fields); each call is validated against its own action's exact schema.
 */

import { z } from "zod";

import type { Graph } from "../../Graph";
import { channelsFor } from "../../session/styles/channels";
import type { GraphSession } from "../../session/types";
import type { CommandContext, CommandResult, GraphCommand } from "../commands/types";
import { compactSchema, toolJsonSchema } from "../engine/jsonSchema";
import type { JsonSchema } from "../engine/types";
import { resultsTool, runAlgorithmTool } from "./families/algorithms";
import { catalogTool } from "./families/catalog";
import { asRefusal } from "./families/common";
import { editDataTool, exportGraphTool, importDataTool } from "./families/data";
import { filterTool } from "./families/filter";
import { layoutTool } from "./families/layout";
import { captureTool, immersiveTool, projectTool, SETTING_GROUPS } from "./families/project";
import { queryTool } from "./families/query";
import { selectTool } from "./families/select";
import { notesTool, setsTool } from "./families/sets";
import { styleTool } from "./families/style";
import { undoTool } from "./families/undo";
import { viewTool } from "./families/view";
import { text } from "./fields";
import { undescribedPlugins } from "./reach";
import { type IndexEntry, SearchIndex, suggest } from "./search";
import {
    type ActionContext,
    type ActionResult,
    type ActionSpec,
    type CatalogView,
    type JsonObject,
    type ToolDefinition,
    ToolRefusal,
} from "./types";

/** What a call's arguments became once checked. */
export interface CheckedCall {
    readonly tool: AssistantTool;
    readonly action: ActionSpec;
    readonly args: Record<string, unknown>;
    /** Facts from settling the call, added to its result's params. */
    readonly notes?: JsonObject;
}

/**
 * Drop the placeholders a model fills unused fields with: `""`, `[]` and `null`.
 * @param args - The arguments.
 * @returns Them, without placeholders.
 */
export function stripPlaceholders(args: Readonly<Record<string, unknown>>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
        if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
            continue;
        }

        out[key] = value;
    }

    return out;
}

/**
 * The refusal a failed parse means, with the path and what was expected.
 * @param error - The zod error.
 * @param action - The action, for its schema.
 * @returns The refusal.
 */
function argRefusal(error: z.ZodError, action: ActionSpec): ToolRefusal {
    const issue = error.issues[0];
    if (issue.code === "unrecognized_keys") {
        // A stray key inside a nested object (`encode.midpoint`) names that object's fields.
        const at = issue.path.map(String);
        const allowed = at.length === 0 ? Object.keys(action.fields) : fieldsAt(action, at);
        return new ToolRefusal("AI_ARG_INVALID", {
            path: [...at, issue.keys[0]].join("."),
            expected: `a field of ${at.length === 0 ? action.name : at.join(".")}`,
            allowed,
            didYouMean: suggest(issue.keys[0], allowed),
        });
    }

    const params: JsonObject = {
        path: issue.path.join("."),
        expected: "expected" in issue ? String(issue.expected) : issue.code,
    };
    if (issue.code === "too_big" || issue.code === "too_small") {
        return new ToolRefusal("AI_ARG_OUT_OF_RANGE", {
            ...params,
            [issue.code === "too_big" ? "max" : "min"]: Number(
                issue.code === "too_big" ? issue.maximum : issue.minimum,
            ),
        });
    }

    if (issue.code === "invalid_value") {
        params.allowed = issue.values.map(String);
    }

    // The schema of the field that failed, compact, rather than the whole action's: what the
    // model needs to fix the call, small enough for a small model's result cap.
    const whole = compactSchema(toolJsonSchema(z.strictObject(action.fields))) as {
        properties?: Record<string, JsonObject>;
    };
    const field = issue.path.length > 0 ? whole.properties?.[String(issue.path[0])] : undefined;
    return new ToolRefusal("AI_ARG_INVALID", { ...params, schema: (field ?? whole) as JsonObject });
}

/**
 * The field names of an object nested in an action's arguments.
 * @param action - The action.
 * @param path - Where the object is, such as ["encode"].
 * @returns Its fields, or none when the path names no object.
 */
function fieldsAt(action: ActionSpec, path: readonly string[]): string[] {
    let node = toolJsonSchema(z.strictObject(action.fields)) as { properties?: Record<string, unknown> } | undefined;
    for (const key of path) {
        node = node?.properties?.[key] as typeof node;
    }

    return Object.keys(node?.properties ?? {});
}

/** The three ways to name a target, described once each. */
const TARGET_FIELDS = new Set(["where", "ids", "result"]);

/** A generated tool: one family of actions, as a command the registry and the executor run. */
export class AssistantTool implements GraphCommand {
    readonly name: string;
    readonly description: string;
    readonly parameters: z.ZodObject;
    readonly examples = [];
    /** Offered on every turn, or once a catalog result names it. */
    readonly load: "always" | "on-demand";
    /** Fields two actions declare with different types: a coverage failure. */
    readonly conflicts: readonly string[];
    private readonly actions: ReadonlyMap<string, { spec: ActionSpec; schema: z.ZodObject }>;
    private compact: JsonSchema | undefined;

    /**
     * A tool from its definition.
     * @param definition - The family.
     */
    constructor(readonly definition: ToolDefinition) {
        this.name = definition.name;
        this.load = definition.core ? "always" : "on-demand";
        this.actions = new Map(
            definition.actions.map((spec) => [spec.name, { spec, schema: z.strictObject(spec.fields) }]),
        );
        const { flat, conflicts } = flatSchema(definition);
        this.parameters = flat;
        this.conflicts = conflicts;
        const names = definition.actions.map((action) => action.name);
        const list =
            names.length > 1
                ? ` Actions: ${definition.actions.map((action) => (action.summary === "" ? action.name : `${action.name} (${action.summary})`)).join("; ")}.`
                : "";
        this.description = `${definition.description}${list} Example: ${JSON.stringify(definition.example)}`;
    }

    /**
     * The schema a provider is sent: the flat object, compact.
     * @returns The JSON Schema.
     */
    get jsonSchema(): JsonSchema {
        if (this.compact === undefined) {
            const schema = compactSchema(toolJsonSchema(this.parameters)) as {
                properties?: Record<string, { description?: string }>;
            };
            // A result target's shape is in its description; the strict check holds the rest.
            const result = schema.properties?.result;
            if (schema.properties !== undefined && result !== undefined) {
                schema.properties.result = {
                    type: "object",
                    ...(result.description === undefined ? {} : { description: result.description }),
                } as never;
            }

            this.compact = schema;
        }

        return this.compact;
    }

    /**
     * Whether the action a call names writes: a refused call takes the message's earlier writes
     * back only when it was itself a write. No such action writes nothing.
     * @param raw - The arguments as the model sent them.
     * @returns True for a known write action.
     */
    writesFor(raw: Readonly<Record<string, unknown>>): boolean {
        const { action: named, ...rest } = stripPlaceholders(raw);
        return this.entryFor(named, rest)?.spec.effect === "write";
    }

    /**
     * The action a call names; with none named, the tool's only action, or the only action whose
     * fields hold every field the call gave (`{ text }` to catalog is a search).
     * @param named - The action field as sent.
     * @param rest - The other fields.
     * @returns The action, or undefined when none or several answer.
     */
    private entryFor(
        named: unknown,
        rest: Readonly<Record<string, unknown>>,
    ): { spec: ActionSpec; schema: z.ZodObject } | undefined {
        if (named !== undefined) {
            return this.actions.get(text(named));
        }

        const given = Object.keys(rest);
        const fitting = [...this.actions.values()].filter(
            (entry) => this.actions.size === 1 || (given.length > 0 && given.every((key) => key in entry.spec.fields)),
        );
        return fitting.length === 1 ? fitting[0] : undefined;
    }

    /**
     * Check a call's arguments: the action exists, placeholders dropped, the action's own
     * strict schema passes.
     * @param raw - The arguments as the model sent them.
     * @returns The checked call.
     * @throws {ToolRefusal} `AI_UNKNOWN_ACTION`, `AI_ARG_INVALID` or `AI_ARG_OUT_OF_RANGE`.
     */
    check(raw: Readonly<Record<string, unknown>>): CheckedCall {
        const { action: named, ...rest } = stripPlaceholders(raw);
        const entry = this.entryFor(named, rest);
        if (entry === undefined) {
            throw new ToolRefusal("AI_UNKNOWN_ACTION", {
                tool: this.name,
                action: named === undefined ? null : text(named),
                allowed: [...this.actions.keys()],
            });
        }

        const prepared = entry.spec.prepare?.(rest) ?? rest;
        const parsed = entry.schema.safeParse(prepared);
        if (!parsed.success) {
            throw argRefusal(parsed.error, entry.spec);
        }

        return { tool: this, action: entry.spec, args: parsed.data };
    }

    /**
     * Run a checked call.
     * @param call - The call.
     * @param context - The session and the message.
     * @returns Its result.
     */
    async run(call: CheckedCall, context: ActionContext): Promise<ActionResult> {
        try {
            return await call.action.run(context, call.args);
        } catch (error) {
            throw asRefusal(error);
        }
    }

    /**
     * Run the tool outside a message, as any command can be called: checked, with the gate off.
     * @param graph - The graph.
     * @param params - The arguments.
     * @param context - The command's context, when it has one.
     * @returns The result, its code and params set.
     */
    async execute(graph: Graph, params: Record<string, unknown>, context?: CommandContext): Promise<CommandResult> {
        const session = graph.getSession();
        try {
            const call = this.check(params);
            const result = await this.run(call, {
                tx: context?.tx ?? session,
                session,
                graph,
                signal: context?.abortSignal ?? new AbortController().signal,
                message: {
                    id: "direct",
                    gate: false,
                    runs: new Set(),
                    undoCalls: 0,
                    totals: { removeNodes: 0, removeEdges: 0, changedValues: 0 },
                },
                host: { emit: () => undefined, readerText: "" },
            });
            return {
                success: true,
                message: "",
                code: result.code ?? "AI_OK",
                params: result.params ?? {},
                data: result.data,
            };
        } catch (error) {
            if (error instanceof ToolRefusal) {
                return { success: false, message: "", code: error.code, params: error.params };
            }

            throw error;
        }
    }
}

/**
 * Whether a command is a generated tool.
 * @param command - The command.
 * @returns True for an `AssistantTool`.
 */
export function isAssistantTool(command: GraphCommand | undefined): command is AssistantTool {
    return command instanceof AssistantTool;
}

/**
 * One flat object for the provider: an `action` enum plus every action's fields, each optional and
 * described with the actions that use it.
 * @param definition - The tool.
 * @returns The schema, and the fields two actions declare with different types.
 */
function flatSchema(definition: ToolDefinition): { flat: z.ZodObject; conflicts: string[] } {
    const shape: Record<string, z.ZodType> = {};
    const seen = new Map<string, { json: string; actions: string[] }>();
    const conflicts: string[] = [];
    for (const action of definition.actions) {
        for (const [key, field] of Object.entries(action.fields)) {
            const json = JSON.stringify(toolJsonSchema(z.object({ value: field })));
            const prior = seen.get(key);
            if (prior === undefined) {
                seen.set(key, { json, actions: [action.name] });
                shape[key] = field as z.ZodType;
            } else {
                prior.actions.push(action.name);
                if (prior.json !== json && !sameType(prior.json, json)) {
                    conflicts.push(`${definition.name}.${key}`);
                }
            }
        }
    }

    const all = definition.actions.length;
    for (const [key, { actions }] of seen) {
        const field = shape[key];
        const base =
            field.description ??
            (field instanceof z.ZodOptional ? (field.unwrap() as z.ZodType).description : undefined) ??
            "";
        // A field most actions take, or a target field, does not list its actions.
        const own = actions.length === 1 && actions[0] === key;
        const used =
            actions.length * 2 > all || TARGET_FIELDS.has(key) || own ? base : `(${actions.join(", ")}) ${base}`;
        // A single action's required fields stay required; otherwise only `action` is.
        shape[key] = (field.safeParse(undefined).success || all === 1 ? field : field.optional()).describe(used);
    }

    if (all > 1) {
        return {
            flat: z.object({
                action: z.enum(definition.actions.map((action) => action.name) as [string, ...string[]]),
                ...shape,
            }),
            conflicts,
        };
    }

    return { flat: z.object(shape), conflicts };
}

/**
 * Whether two field schemas declare the same JSON type, ignoring descriptions and bounds.
 * @param a - One, as JSON text.
 * @param b - The other.
 * @returns True when their types agree.
 */
function sameType(a: string, b: string): boolean {
    const typeOf = (json: string): string => {
        const { value } = (JSON.parse(json) as { properties: { value: Record<string, unknown> } }).properties;
        return JSON.stringify(value.type ?? value.anyOf ?? value.enum ?? value);
    };

    return typeOf(a) === typeOf(b);
}

/**
 * The catalog as one build of the tools reads it.
 * @param session - The session whose catalog the tools offer.
 * @returns The view.
 */
export function catalogView(session: Pick<GraphSession, "catalog">): CatalogView {
    const tables = session.catalog;
    return {
        algorithms: tables.algorithms(),
        legacyAlgorithms: undescribedPlugins(),
        layouts: tables.layouts(),
        formats: tables.formats(),
        palettes: tables.palettes(),
        cameras: tables.cameras(),
        scales: tables.scales(),
        channels: [...channelsFor("node"), ...channelsFor("edge")],
    };
}

/**
 * What changes the tools: every catalog entry as it is now -- its name, its description, its
 * options -- so an entry redefined under the same name is rebuilt too. The catalog is plain data,
 * so its JSON is the key. Rebuilt at a turn's start when it differs.
 * @param view - The catalog.
 * @returns The key.
 */
export function catalogKey(view: CatalogView): string {
    const { channels: _channels, ...tables } = view;
    return JSON.stringify(tables);
}

/** One build of the assistant's tools. */
export interface Toolset {
    readonly key: string;
    readonly catalog: CatalogView;
    /** Every built-in tool, in the order they are offered. */
    readonly tools: readonly AssistantTool[];
    readonly index: SearchIndex;
}

/**
 * The index `catalog search` reads: every catalog entry and every tool, consumer commands too.
 * @param catalog - The catalog.
 * @param tools - The built-in tools.
 * @param consumer - The consumer's commands.
 * @returns The index.
 */
function buildIndex(
    catalog: CatalogView,
    tools: readonly ToolDefinition[],
    consumer: readonly GraphCommand[],
): SearchIndex {
    const entries: IndexEntry[] = [
        ...catalog.algorithms.map((entry) => ({
            kind: "algorithm" as const,
            name: entry.key,
            plainName: entry.plainName,
            summary: entry.description,
            tool: "run_algorithm",
            words: [entry.technicalName, entry.category, ...((entry as { keywords?: string[] }).keywords ?? [])],
        })),
        ...catalog.legacyAlgorithms.map((address) => ({
            kind: "algorithm" as const,
            name: address,
            plainName: address,
            summary:
                "A registered algorithm that publishes no descriptor: it runs by this name, with no options known.",
            tool: "run_algorithm",
            words: address.split(/[:_-]/),
        })),
        ...catalog.layouts.map((entry) => ({
            kind: "layout" as const,
            name: entry.id,
            plainName: entry.plainName,
            summary: entry.description,
            tool: "layout",
            action: "set",
            words: [entry.technicalName, entry.family, entry.engine],
        })),
        ...catalog.formats.flatMap((entry) => [
            ...(entry.canImport
                ? [
                      {
                          kind: "format" as const,
                          name: entry.id,
                          plainName: entry.plainName,
                          summary: `Read ${entry.plainName} files.`,
                          tool: "import_data",
                          action: "import",
                          words: ["import", "load", "open", ...entry.extensions],
                      },
                  ]
                : []),
            ...(entry.canExport
                ? [
                      {
                          kind: "format" as const,
                          name: entry.id,
                          plainName: entry.plainName,
                          summary: `Write ${entry.plainName} files.`,
                          tool: "export_graph",
                          action: "export",
                          words: ["export", "save", "download", "write", ...entry.extensions],
                      },
                  ]
                : []),
        ]),
        ...catalog.palettes.map((entry) => ({
            kind: "palette" as const,
            name: entry.id,
            plainName: entry.plainName,
            summary: `A ${entry.kind} palette.`,
            tool: "style",
            action: "encode",
            words: ["color", "colors", entry.kind],
        })),
        ...catalog.scales.map((entry) => ({
            kind: "scale" as const,
            name: entry.name,
            plainName: entry.plainName,
            summary: `A ${entry.domainKind} scale.`,
            tool: "style",
            action: "encode",
        })),
        ...catalog.channels.map((entry) => ({
            kind: "channel" as const,
            name: entry.channel,
            plainName: entry.plainName,
            summary: `${entry.plainName}: ${entry.accepts}.`,
            tool: "style",
            action: "add",
            words: [entry.group, entry.shortName],
        })),
        ...catalog.cameras.map((entry) => ({
            kind: "camera" as const,
            name: entry.id,
            plainName: entry.plainName,
            summary: entry.description,
            tool: "view",
            action: "camera",
            words: ["camera", "view"],
        })),
        ...Object.entries(SETTING_GROUPS).map(([name, summary]) => ({
            kind: "setting" as const,
            name,
            plainName: name,
            summary,
            tool: "project",
            action: "settings",
            words: ["setting", "settings"],
        })),
        ...tools.map((tool) => ({
            kind: "tool" as const,
            name: tool.name,
            plainName: tool.plainName,
            summary: tool.description,
            tool: tool.name,
            words: tool.actions.flatMap((action) => [action.name, action.summary, ...(action.keywords ?? [])]),
        })),
        ...consumer.map((command) => ({
            kind: "tool" as const,
            name: command.name,
            plainName: command.name,
            summary: command.description,
            tool: command.name,
            words: [...((command as { keywords?: readonly string[] }).keywords ?? [])],
        })),
    ];
    return new SearchIndex(entries);
}

/**
 * Build the tools over a catalog.
 * @param session - The session whose catalog the tools offer.
 * @param consumer - The consumer's commands, which catalog search indexes too.
 * @returns The toolset.
 */
export function buildToolset(session: Pick<GraphSession, "catalog">, consumer: readonly GraphCommand[] = []): Toolset {
    const catalog = catalogView(session);
    const definitions: ToolDefinition[] = [];
    let index: SearchIndex | undefined;
    const onDemand = new Set<string>();
    const catalogDefinition = catalogTool({
        catalog,
        tools: () => definitions,
        index: () => (index ??= buildIndex(catalog, definitions, consumer)),
        onDemand: (tool) =>
            onDemand.has(tool) ||
            consumer.some((command) => command.name === tool && (command as { load?: string }).load === "on-demand"),
    });
    definitions.push(
        catalogDefinition,
        queryTool,
        selectTool,
        runAlgorithmTool(catalog),
        resultsTool,
        styleTool(catalog),
        filterTool,
        layoutTool(catalog),
        viewTool(catalog),
        editDataTool,
        undoTool,
        setsTool,
        notesTool,
        importDataTool(catalog),
        exportGraphTool(catalog),
        projectTool,
        captureTool,
        immersiveTool,
    );
    for (const definition of definitions) {
        if (!definition.core) {
            onDemand.add(definition.name);
        }
    }

    const tools = definitions.map((definition) => new AssistantTool(definition));
    index = buildIndex(catalog, definitions, consumer);
    return { key: catalogKey(catalog), catalog, tools, index };
}
