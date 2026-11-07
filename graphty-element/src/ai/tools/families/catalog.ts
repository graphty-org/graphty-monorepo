/**
 * @file `catalog`: find and describe capabilities -- algorithms, layouts, formats, palettes,
 * scales, channels, camera views, settings and the tools themselves -- never data. A hit whose
 * tool is on-demand loads that tool for the next turn.
 */

import { z } from "zod";

import type { TransactionScope } from "../../../session/types";
import { compactSchema, toolJsonSchema } from "../../engine/jsonSchema";
import { text } from "../fields";
import { optionsJsonSchema } from "../optionSchema";
import { CATALOG_KINDS, type CatalogKind, type IndexEntry, type SearchIndex, suggest } from "../search";
import { toJson } from "../shape";
import { type ActionSpec, type CatalogView, type JsonObject, type ToolDefinition, ToolRefusal } from "../types";
import { ok } from "./common";
import { engineOptionsOf, enginesOf } from "./layout";
import { SETTING_GROUPS, settingSchema } from "./project";

/** What the catalog tool reads besides the catalog. */
export interface CatalogSources {
    readonly catalog: CatalogView;
    /** Every tool, built-in and registered, by name. */
    readonly tools: () => readonly ToolDefinition[];
    readonly index: () => SearchIndex;
    /** Whether a tool is offered only once named. */
    readonly onDemand: (tool: string) => boolean;
}

/**
 * A tool's actions, each with its fields as JSON Schema.
 * @param tool - The tool.
 * @returns The actions.
 */
export function toolActions(tool: ToolDefinition): JsonObject[] {
    return tool.actions.map((action) => {
        const schema = toolJsonSchema(z.strictObject(action.fields)) as JsonObject;
        delete schema.$schema;
        return { action: action.name, summary: action.summary, effect: action.effect, schema };
    });
}

/**
 * Describe one algorithm.
 * @param tx - The session.
 * @param catalog - The catalog.
 * @param name - The algorithm's name.
 * @param missing - Refuses an unknown name.
 * @returns What the model reads, and the tool it loads.
 */
async function describeAlgorithm(
    tx: TransactionScope,
    catalog: CatalogSources["catalog"],
    name: string,
    missing: (names: readonly string[]) => never,
): Promise<{ data: JsonObject; tool: string }> {
    if (catalog.legacyAlgorithms.includes(name)) {
        // Registered with no descriptor: nothing is known of it but its address.
        return { tool: "run_algorithm", data: { name, described: false, example: { name } } };
    }

    const entry =
        catalog.algorithms.find((each) => each.key === name) ??
        missing([...catalog.algorithms.map((each) => each.key), ...catalog.legacyAlgorithms]);
    const options = await tx.catalog.optionsFor(entry.key);
    const estimate = tx.estimate({ op: "algo.run", algorithm: entry.key });
    return {
        tool: "run_algorithm",
        data: {
            name: entry.key,
            plainName: entry.plainName,
            description: entry.description,
            category: entry.category,
            shape: entry.shape,
            options: optionsJsonSchema(
                options.map((option) => ({
                    ...option,
                    values: option.type === "node-id" || option.type === "node-set" ? undefined : option.values,
                })),
            ),
            results: entry.fields.map((field) => ({ field: field.name, kind: field.kind, type: field.type })),
            requires: toJson(entry.requires ?? {}),
            approximable: entry.approximable !== undefined,
            estimate: {
                seconds: toJson(estimate.seconds),
                available: estimate.available,
                costClass: estimate.costClass,
            },
            example: { name: entry.key },
        },
    };
}

/**
 * Describe one entry.
 * @param tx - The session.
 * @param sources - The catalog and the tools.
 * @param kind - The kind.
 * @param name - The entry's name.
 * @returns What the model reads, and the tool it loads.
 */
async function describe(
    tx: TransactionScope,
    sources: CatalogSources,
    kind: CatalogKind,
    name: string,
): Promise<{ data: JsonObject; tool: string }> {
    const { catalog } = sources;
    const missing = (names: readonly string[]): never => {
        throw new ToolRefusal("AI_UNKNOWN_ENTRY", { kind, name, didYouMean: suggest(name, names) });
    };

    switch (kind) {
        case "algorithm": {
            return describeAlgorithm(tx, catalog, name, missing);
        }

        case "layout": {
            const entry =
                catalog.layouts.find((each) => each.id === name) ?? missing(catalog.layouts.map((each) => each.id));
            return {
                tool: "layout",
                data: {
                    name: entry.id,
                    plainName: entry.plainName,
                    description: entry.description,
                    options: optionsJsonSchema(entry.options),
                    // Every engine takes its own options; the default engine's are `options`.
                    engines: enginesOf(entry).map((engine) => ({
                        engine,
                        default: engine === entry.engine,
                        options: optionsJsonSchema(engineOptionsOf(entry, engine)),
                    })),
                    maxDimensions: entry.maxDimensions,
                    scoped: entry.scoped,
                    example: { action: "set", name: entry.id },
                },
            };
        }

        case "format": {
            const entry =
                catalog.formats.find((each) => each.id === name) ?? missing(catalog.formats.map((each) => each.id));
            return {
                tool: entry.canImport ? "import_data" : "export_graph",
                data: {
                    name: entry.id,
                    plainName: entry.plainName,
                    extensions: [...entry.extensions],
                    canImport: entry.canImport,
                    canExport: entry.canExport,
                    readerOptions: optionsJsonSchema(entry.options),
                    ...(entry.writerOptions === undefined
                        ? {}
                        : { writerOptions: optionsJsonSchema(entry.writerOptions) }),
                },
            };
        }

        case "palette": {
            const entry =
                catalog.palettes.find((each) => each.id === name) ?? missing(catalog.palettes.map((each) => each.id));
            // How to color by it: a diverging palette is centered on a midpoint.
            const encode = {
                channel: "node.color",
                attribute: "<attribute>",
                palette: entry.id,
                ...(entry.kind === "diverging" ? { midpoint: 0 } : {}),
            };
            return { tool: "style", data: { ...(toJson(entry) as JsonObject), example: { action: "encode", encode } } };
        }

        case "scale": {
            const entry =
                catalog.scales.find((each) => each.name === name) ?? missing(catalog.scales.map((each) => each.name));
            return {
                tool: "style",
                data: { name: entry.name, domainKind: entry.domainKind, options: optionsJsonSchema(entry.options) },
            };
        }

        case "channel": {
            const entry =
                catalog.channels.find((each) => each.channel === name) ??
                missing(catalog.channels.map((each) => each.channel));
            return {
                tool: "style",
                data: {
                    name: entry.channel,
                    plainName: entry.plainName,
                    accepts: entry.accepts,
                    ...(entry.values === undefined ? {} : { values: [...entry.values] }),
                    ...(entry.min === undefined ? {} : { min: entry.min }),
                    ...(entry.max === undefined ? {} : { max: entry.max }),
                    ...(entry.default === undefined ? {} : { default: entry.default }),
                    drawn: entry.renderable,
                    example: { action: "add", where: "all", values: { [entry.channel]: entry.default ?? null } },
                },
            };
        }

        case "camera": {
            const entry =
                catalog.cameras.find((each) => each.id === name) ?? missing(catalog.cameras.map((each) => each.id));
            return {
                tool: "view",
                data: {
                    name: entry.id,
                    plainName: entry.plainName,
                    description: entry.description,
                    modes: [...entry.modes],
                },
            };
        }

        case "setting": {
            const description =
                (SETTING_GROUPS as Record<string, string>)[name] ?? missing(Object.keys(SETTING_GROUPS));
            const schema = compactSchema(
                toolJsonSchema(settingSchema(name as keyof typeof SETTING_GROUPS)),
            ) as JsonObject;
            return {
                tool: "project",
                data: { name, description, schema, example: { action: "settings", [name]: null } },
            };
        }

        case "tool": {
            const tools = sources.tools();
            const tool = tools.find((each) => each.name === name) ?? missing(tools.map((each) => each.name));
            return {
                tool: tool.name,
                data: {
                    name: tool.name,
                    description: tool.description,
                    actions: toolActions(tool),
                    example: tool.example,
                },
            };
        }

        default:
            return missing([]);
    }
}

/**
 * The `catalog` tool over a catalog and the tools.
 * @param sources - The catalog, the tools and the index.
 * @returns The tool.
 */
export function catalogTool(sources: CatalogSources): ToolDefinition {
    const kind = z.enum(CATALOG_KINDS).optional().describe("Only this kind.");
    const actions: ActionSpec[] = [
        {
            name: "search",
            summary: "find by words",
            fields: {
                text: z.string().min(1).max(500).optional().describe("What you want to do or find."),
                kind,
                limit: z.number().int().min(1).max(10).optional().describe("Default 5."),
                detail: z
                    .enum(["names", "schemas"])
                    .optional()
                    .describe("schemas: the top two carry their argument schema."),
            },
            effect: "read",
            reaches: [],
            run: async ({ tx }, args) => {
                const limit = (args.limit as number | undefined) ?? 5;
                const kind = args.kind as CatalogKind | undefined;
                if (args.text === undefined && kind === undefined) {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "text", expected: "text, or a kind to list" });
                }

                const hits =
                    args.text === undefined
                        ? sources.index().entries(kind).slice(0, limit)
                        : sources.index().search(text(args.text), { ...(kind === undefined ? {} : { kind }), limit });
                const rows: JsonObject[] = [];
                for (const [index, hit] of hits.entries()) {
                    const row: JsonObject = hitRow(hit);
                    if (args.detail === "schemas" && index < 2) {
                        row.detail = (await describe(tx, sources, hit.kind, hit.name)).data;
                    }

                    rows.push(row);
                }

                const load = [...new Set(hits.map((hit) => hit.tool))].filter((tool) => sources.onDemand(tool));
                return { ...ok(rows, load.length === 0 ? {} : { load }), load };
            },
        },
        {
            name: "describe",
            summary: "options and an example",
            fields: {
                kind: z.enum(CATALOG_KINDS).optional().describe("The entry's kind; needed only when a name has two."),
                name: z.string().min(1).max(200).describe("The entry's name, as search returned it."),
            },
            effect: "read",
            reaches: [{ door: "GraphSession.catalog" }, { door: "GraphSession.estimate" }],
            run: async ({ tx }, args) => {
                const name = text(args.name);
                const kind = (args.kind as CatalogKind | undefined) ?? kindOf(sources, name);
                const { data, tool } = await describe(tx, sources, kind, name);
                const load = sources.onDemand(tool) ? [tool] : [];
                return { ...ok(data, load.length === 0 ? {} : { load }), load };
            },
        },
    ];
    return {
        name: "catalog",
        plainName: "Catalog",
        core: true,
        description:
            "Finds algorithms, layouts, formats, palettes, channels, cameras, settings and tools -- not data (use query).",
        example: { action: "search", text: "find communities" },
        actions,
    };
}

/**
 * The kind of the one entry a name names.
 * @param sources - The catalog and the index.
 * @param name - The name.
 * @returns The kind.
 * @throws {ToolRefusal} `AI_ARG_INVALID` when no entry or several have the name.
 */
function kindOf(sources: CatalogSources, name: string): CatalogKind {
    const kinds = [
        ...new Set(
            sources
                .index()
                .entries()
                .filter((entry) => entry.name === name)
                .map((entry) => entry.kind),
        ),
    ];
    if (kinds.length !== 1) {
        throw new ToolRefusal("AI_ARG_INVALID", {
            path: "kind",
            expected: "the entry's kind",
            allowed: kinds.length === 0 ? [...CATALOG_KINDS] : kinds,
        });
    }

    return kinds[0];
}

/**
 * A hit as the model reads it.
 * @param hit - The hit.
 * @returns The row.
 */
function hitRow(hit: IndexEntry): JsonObject {
    return {
        kind: hit.kind,
        name: hit.name,
        plainName: hit.plainName,
        summary: hit.summary.length > 160 ? `${hit.summary.slice(0, 157)}...` : hit.summary,
        tool: hit.tool,
        ...(hit.action === undefined ? {} : { action: hit.action }),
    };
}
