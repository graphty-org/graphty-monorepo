/**
 * @file `edit_data`, `import_data` and `export_graph`: the graph's records. Removals are measured
 * for the gate; an import over a graph that has data, and an import from a URL the reader did not
 * give, are held for approval; an export's document goes to the host, never to the model.
 */

import { z } from "zod";

import type { FormatId } from "../../../catalog/types";
import { canExpand, expansionOf } from "../../../data/expand";
import type { ExportResult } from "../../../data/export";
import type { Graph } from "../../../Graph";
import type { TransactionScope } from "../../../session/types";
import {
    idsOf,
    MAX_STRING,
    recordField,
    recordsField,
    requireMatch,
    requireTarget,
    resolveNode,
    type Target,
    targetFields,
    text,
} from "../fields";
import { optionsSchema } from "../optionSchema";
import { httpUrl, readerGave } from "../readerUrls";
import {
    type ActionContext,
    type ActionResult,
    type ActionSpec,
    type CatalogView,
    gated,
    GateHold,
    type ToolDefinition,
    ToolRefusal,
} from "../types";
import { coded, nameField, ok, requireEntry } from "./common";

/**
 * The ids a write targets, refusing one that matches nothing.
 * @param tx - The session.
 * @param args - The call.
 * @param kind - Nodes or edges.
 * @returns The ids and the target's notes.
 */
function targetIds(
    tx: TransactionScope,
    args: Record<string, unknown>,
    kind: "node" | "edge",
): { ids: string[]; target: Target; notes: Record<string, unknown> } {
    const { target, notes } = requireTarget(tx, args, kind);

    const { ids } = idsOf(tx, target, kind);
    requireMatch(ids.length, target);

    return { ids, target, notes };
}

/**
 * Update the rows a call names: `records` each with an id, or `values` on a target.
 * @param context - The action's context.
 * @param args - The call.
 * @param kind - Nodes or edges.
 * @returns The result.
 */
async function update(
    context: ActionContext,
    args: Record<string, unknown>,
    kind: "node" | "edge",
): Promise<ActionResult> {
    const { tx } = context;
    let rows: { id: string; values: Record<string, unknown> }[];
    let notes: Record<string, unknown> = {};
    if (args.records !== undefined) {
        rows = (args.records as Record<string, unknown>[]).map((record) => {
            const { id, ...values } = record;
            if (typeof id !== "string" && typeof id !== "number") {
                throw new ToolRefusal("AI_ARG_INVALID", { path: "records.id", expected: "every record has an id" });
            }

            return { id: kind === "node" ? resolveNode(tx, String(id)) : String(id), values };
        });
    } else {
        if (args.values === undefined) {
            throw new ToolRefusal("AI_ARG_INVALID", {
                path: "values",
                expected: "values on a target, or records with ids",
            });
        }

        const named = targetIds(tx, args, kind);
        ({ notes } = named);
        rows = named.ids.map((id) => ({ id, values: args.values as Record<string, unknown> }));
    }

    await coded(() => (kind === "node" ? tx.data.updateNodes(rows) : tx.data.updateEdges(rows)));
    const changedValues = rows.reduce((sum, row) => sum + Object.keys(row.values).length, 0);
    return {
        ...ok(undefined, { ...(notes as Record<string, never>), updated: rows.length }),
        measure: { changedValues },
    };
}

const values = recordField.optional().describe("Values to set on every targeted record.");

/** The `edit_data` tool. */
export const editDataTool: ToolDefinition = {
    name: "edit_data",
    plainName: "Edit data",
    core: true,
    description: "Adds, changes and removes nodes and edges. To only hide, use filter.",
    example: { action: "remove_nodes", where: "data.family == 'Medici'" },
    actions: [
        {
            name: "add_nodes",
            summary: "records with id",
            fields: { records: recordsField.describe("Node records, each with an id.") },
            effect: "write",
            reaches: [{ op: "data.apply" }, { door: "SessionDataApi.addNodes" }],
            run: async ({ tx }, args) => {
                const records = (args.records ?? []) as Record<string, unknown>[];
                if (records.length === 0 || records.some((record) => record.id === undefined || record.id === null)) {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "records.id", expected: "every record has an id" });
                }

                await coded(() => tx.data.addNodes(records));
                return {
                    ...ok(undefined, { added: records.length }),
                    affectedNodes: records.map((record) => String(record.id)),
                };
            },
        },
        {
            name: "add_edges",
            summary: "records with source, target",
            fields: { records: recordsField.describe("Edge records, each with source and target.") },
            effect: "write",
            reaches: [{ door: "SessionDataApi.addEdges" }, { op: "data.apply" }],
            run: async ({ tx }, args) => {
                const records = ((args.records ?? []) as Record<string, unknown>[]).map((record) => {
                    const source = record.source ?? record.src;
                    const target = record.target ?? record.dst;
                    if (source === undefined || target === undefined || source === null || target === null) {
                        throw new ToolRefusal("AI_ARG_INVALID", {
                            path: "records.source",
                            expected: "source and target",
                        });
                    }

                    const { src: _src, dst: _dst, ...rest } = record;
                    return { ...rest, source: resolveNode(tx, text(source)), target: resolveNode(tx, text(target)) };
                });
                if (records.length === 0) {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "records", expected: "edge records" });
                }

                await coded(() => tx.data.addEdges(records));
                return ok(undefined, { added: records.length });
            },
        },
        {
            name: "update_nodes",
            summary: "records with id, or values on a target",
            fields: { ...targetFields, records: recordsField.optional().describe("Records, each with an id."), values },
            effect: "write",
            reaches: [{ door: "SessionDataApi.updateNodes" }, { op: "data.apply" }],
            run: (context, args) => update(context, args, "node"),
        },
        {
            name: "update_edges",
            summary: "likewise",
            fields: { ...targetFields, records: recordsField.optional().describe("Records, each with an id."), values },
            effect: "write",
            reaches: [{ door: "SessionDataApi.updateEdges" }, { op: "data.apply" }],
            run: (context, args) => update(context, args, "edge"),
        },
        {
            name: "remove_nodes",
            summary: "and their edges",
            fields: targetFields,
            effect: "write",
            reaches: [{ door: "SessionDataApi.removeNodes" }, { op: "data.apply" }],
            run: async ({ tx }, args) => {
                const { ids, notes } = targetIds(tx, args, "node");
                const edgesBefore = tx.status.counts.edges;
                await coded(() => tx.data.removeNodes(ids));
                const edges = edgesBefore - tx.status.counts.edges;
                return {
                    ...ok(undefined, { ...(notes as Record<string, never>), removed: ids.length, removedEdges: edges }),
                    measure: { removeNodes: ids.length, removeEdges: edges },
                    affectedNodes: ids.slice(0, 50),
                };
            },
        },
        {
            name: "remove_edges",
            summary: "",
            fields: targetFields,
            effect: "write",
            reaches: [{ door: "SessionDataApi.removeEdges" }, { op: "data.apply" }],
            run: async ({ tx }, args) => {
                const { ids, notes } = targetIds(tx, args, "edge");
                await coded(() => tx.data.removeEdges(ids));
                return {
                    ...ok(undefined, { ...(notes as Record<string, never>), removed: ids.length }),
                    measure: { removeEdges: ids.length },
                };
            },
        },
        {
            name: "expand",
            summary: "fetch a node's neighbors",
            fields: { ids: targetFields.ids },
            effect: "write",
            reaches: [{ op: "data.expand" }],
            run: async ({ tx, graph }, args) => {
                const ids = (args.ids as string[] | undefined) ?? [];
                if (ids.length !== 1) {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "ids", expected: "exactly one node" });
                }

                const id = resolveNode(tx, ids[0]);
                // The neighbourhood comes from the reader's application, through the fetchers its
                // layout behaviour supplies; with none, there is nothing to expand from.
                const renderer = graph as unknown as Partial<Graph> & Parameters<typeof canExpand>[0];
                const node = typeof renderer.getNode === "function" ? renderer.getNode(id) : undefined;
                if (node === undefined || !canExpand(renderer)) {
                    throw new ToolRefusal("AI_NOT_AVAILABLE", {
                        name: "expand",
                        requirement: node === undefined ? "renderer" : "fetchNodes and fetchEdges",
                    });
                }

                const before = tx.status.counts;
                const command = expansionOf(renderer as Graph, node);
                if (command !== undefined) {
                    await coded(() => tx.execute(command));
                }

                const after = tx.status.counts;
                return {
                    ...ok(undefined, {
                        node: id,
                        addedNodes: after.nodes - before.nodes,
                        addedEdges: after.edges - before.edges,
                    }),
                    affectedNodes: [id],
                };
            },
        },
        {
            name: "delete_all",
            summary: "asks the reader",
            fields: {},
            effect: "write",
            reaches: [{ door: "SessionDataApi.clear" }, { op: "data.apply" }],
            run: async ({ tx, message }) => {
                const { nodes, edges } = tx.status.counts;
                if (gated(message, "replaces") && nodes > 0) {
                    throw new GateHold("replaces", { nodes, edges });
                }

                await coded(() => tx.data.clear());
                return { ...ok(undefined, { removedNodes: nodes, removedEdges: edges }), measure: { replaces: true } };
            },
        },
    ] satisfies ActionSpec[],
};

/**
 * Where an import reads from: the text, or a URL the reader gave or the host admits.
 * @param url - The URL argument.
 * @param document - The text argument.
 * @param host - The conversation, for the reader's text and the URL policy.
 * @returns The URL parsed, if any, and the URL that goes to the network without the reader typing it.
 * @throws {ToolRefusal} When both or neither is given, or the URL is not one the reader gave.
 */
function importSource(
    url: string | undefined,
    document: string | undefined,
    host: ActionContext["host"],
): { parsed?: URL; network?: string } {
    if ((url === undefined) === (document === undefined)) {
        throw new ToolRefusal("AI_ARG_INVALID", { path: "text", expected: "exactly one of text, url" });
    }

    if (url === undefined) {
        return {};
    }

    const parsed = httpUrl(url);
    if (parsed === undefined) {
        throw new ToolRefusal("AI_ARG_INVALID", { path: "url", expected: "an absolute http or https URL" });
    }

    if (readerGave(parsed, host.readerText)) {
        return { parsed };
    }

    if (host.allowImportUrl?.(parsed) !== true) {
        throw new ToolRefusal("AI_IMPORT_URL_REFUSED", { url: parsed.href });
    }

    return { parsed, network: parsed.href };
}

/**
 * An import's reader options, checked against its format's.
 * @param catalog - The catalog.
 * @param formats - The importable formats.
 * @param args - The call's arguments.
 * @returns The options.
 * @throws {ToolRefusal} When they do not fit the format, or there is no format to check them against.
 */
function readerOptionsOf(
    catalog: CatalogView,
    formats: readonly string[],
    args: Record<string, unknown>,
): Record<string, unknown> {
    if (args.format === undefined) {
        if (args.options !== undefined) {
            throw new ToolRefusal("AI_ARG_INVALID", { path: "options", expected: "a format for its options" });
        }

        return {};
    }

    requireEntry("format", text(args.format), formats);
    const options = catalog.formats.find((each) => each.id === args.format)?.options ?? [];
    const parsed = optionsSchema(options).schema.safeParse(args.options ?? {});
    if (!parsed.success) {
        throw new ToolRefusal("AI_ARG_INVALID", { path: "options", allowed: options.map((option) => option.name) });
    }

    return parsed.data;
}

/**
 * The `import_data` tool for a catalog.
 * @param catalog - The catalog, for the formats.
 * @returns The tool.
 */
export function importDataTool(catalog: CatalogView): ToolDefinition {
    const formats = catalog.formats.filter((format) => format.canImport).map((format) => format.id);
    return {
        name: "import_data",
        plainName: "Import data",
        core: false,
        description:
            "Loads graph data from text or from a URL the reader gave, in a catalog format, merging or replacing. Replacing a graph that has data is held for approval.",
        example: { action: "import", format: "csv", text: "source,target\na,b", mode: "merge" },
        actions: [
            {
                name: "import",
                summary: "Import text or a URL the reader gave.",
                fields: {
                    format: nameField(formats, "Format; detected when absent.").optional(),
                    text: z.string().max(200_000).optional().describe("The document's text."),
                    url: z.string().max(MAX_STRING).optional().describe("A URL the reader gave in this message."),
                    mode: z.enum(["merge", "replace"]).optional().describe("Default merge."),
                    name: z.string().max(200).optional().describe("What to call the source."),
                    options: z
                        .record(z.string(), z.unknown())
                        .optional()
                        .describe("Reader options: catalog describe kind format."),
                },
                effect: "write",
                reaches: [
                    { op: "data.import" },
                    { door: "SessionDataApi.import" },
                    { options: "formats" },
                    ...formats.map((id) => ({ catalog: `formats/${id}` })),
                ],
                run: async ({ tx, host, message }, args) => {
                    const document = args.text as string | undefined;
                    const { parsed, network } = importSource(args.url as string | undefined, document, host);
                    const mode = args.mode === "replace" ? "replace" : "merge";
                    const { nodes } = tx.status.counts;
                    const hold = network === undefined ? "replaces" : "network";
                    if (gated(message, hold) && (network !== undefined || (mode === "replace" && nodes > 0))) {
                        throw new GateHold(hold, {
                            mode,
                            nodes,
                            ...(network === undefined ? {} : { url: network }),
                        });
                    }

                    const readerOptions = readerOptionsOf(catalog, formats, args);

                    await coded(() =>
                        tx.data.import(
                            {
                                ...(args.format === undefined ? {} : { type: text(args.format) }),
                                // Reader options only: headers and credentials are never the model's to set.
                                config: {
                                    ...readerOptions,
                                    ...(parsed === undefined ? { data: document } : { url: parsed.href }),
                                },
                                ...(typeof args.name === "string" ? { name: args.name } : {}),
                            },
                            { mode },
                        ),
                    );
                    return {
                        ...ok(undefined, { nodes: tx.status.counts.nodes, edges: tx.status.counts.edges, mode }),
                        measure: {
                            ...(mode === "replace" ? { replaces: true } : {}),
                            ...(network === undefined ? {} : { network }),
                        },
                    };
                },
            },
            {
                name: "rename_source",
                summary: "Rename the loaded data source.",
                fields: { name: z.string().min(1).max(200).describe("The new name.") },
                effect: "write",
                reaches: [{ op: "data.setSource" }, { door: "SessionDataApi.renameSource" }],
                run: async ({ tx }, args) => {
                    await coded(() => tx.data.renameSource(text(args.name)));
                    return ok(undefined, { name: text(args.name) });
                },
            },
            {
                name: "last_import",
                summary: "What the last import read: counts, endpoints, repeated edges.",
                fields: {},
                effect: "read",
                reaches: [{ door: "SessionDataApi.lastImport" }],
                run: ({ tx }) => Promise.resolve(ok(tx.data.lastImport())),
            },
        ],
    };
}

/**
 * The `export_graph` tool for a catalog.
 * @param catalog - The catalog, for the formats and their writer options.
 * @returns The tool.
 */
export function exportGraphTool(catalog: CatalogView): ToolDefinition {
    const writable = catalog.formats.filter((format) => format.canExport);
    const formats = writable.map((format) => format.id);
    return {
        name: "export_graph",
        plainName: "Export",
        core: false,
        description:
            "Writes the graph as a file in a catalog format and hands it to the reader's application to save. You receive only its size, never the document.",
        example: { action: "export", format: "graphml" },
        actions: [
            {
                name: "export",
                summary: "Export the graph in a format.",
                fields: {
                    format: nameField(formats, "Format."),
                    options: z
                        .record(z.string(), z.unknown())
                        .optional()
                        .describe("Writer options: catalog describe kind format."),
                },
                effect: "read",
                reaches: [
                    { door: "Graph.exportGraph" },
                    { options: "writers" },
                    ...formats.map((id) => ({ catalog: `formats/${id}` })),
                ],
                run: async ({ session, graph, host }, args) => {
                    const format = requireEntry("format", text(args.format), formats);
                    const writerOptions = writable.find((each) => each.id === format)?.writerOptions ?? [];
                    const parsed = optionsSchema(writerOptions).schema.safeParse(args.options ?? {});
                    if (!parsed.success) {
                        throw new ToolRefusal("AI_ARG_INVALID", {
                            path: "options",
                            allowed: writerOptions.map((option) => option.name),
                        });
                    }

                    const renderer = graph as unknown as {
                        exportGraph?: (id: FormatId, options: object) => Promise<ExportResult>;
                    };
                    const result = await coded(async () => {
                        if (typeof renderer.exportGraph === "function") {
                            return renderer.exportGraph(format, parsed.data);
                        }

                        // The writers load only when a session with no renderer exports.
                        const { exportSession } = await import("../../../data/export");
                        return exportSession(session, format, parsed.data);
                    });
                    const data = await result.text();
                    host.emit({ type: "ai-export-ready", format, data, losses: result.losses });
                    return ok(undefined, { format, bytes: data.length, losses: result.losses.length });
                },
            },
        ],
    };
}
