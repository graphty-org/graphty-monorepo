/**
 * @file `edit_data`, `import_data` and `export_graph`: the graph's records. Removals are measured
 * for the gate; an import over a graph that has data, and an import from a URL the reader did not
 * give, are held for approval; an export's document goes to the host, never to the model.
 */

import { z } from "zod";

import type { FormatId } from "../../../catalog/types";
import type { ExportResult } from "../../../data/export";
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
import {
    type ActionContext,
    type ActionResult,
    type ActionSpec,
    type CatalogView,
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
            reaches: [{ door: "SessionDataApi.addEdges" }],
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
            reaches: [{ door: "SessionDataApi.updateNodes" }],
            run: (context, args) => update(context, args, "node"),
        },
        {
            name: "update_edges",
            summary: "records with id, or values on a target",
            fields: { ...targetFields, records: recordsField.optional().describe("Records, each with an id."), values },
            effect: "write",
            reaches: [{ door: "SessionDataApi.updateEdges" }],
            run: (context, args) => update(context, args, "edge"),
        },
        {
            name: "remove_nodes",
            summary: "nodes and their edges",
            fields: targetFields,
            effect: "write",
            reaches: [{ door: "SessionDataApi.removeNodes" }],
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
            reaches: [{ door: "SessionDataApi.removeEdges" }],
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
            name: "delete_all",
            summary: "asks the reader",
            fields: {},
            effect: "write",
            reaches: [{ door: "SessionDataApi.clear" }],
            run: async ({ tx, message }) => {
                const { nodes, edges } = tx.status.counts;
                if (message.gate !== false && nodes > 0) {
                    throw new GateHold("replaces", { nodes, edges });
                }

                await coded(() => tx.data.clear());
                return { ...ok(undefined, { removedNodes: nodes, removedEdges: edges }), measure: { replaces: true } };
            },
        },
    ] satisfies ActionSpec[],
};

/**
 * Whether a URL appears verbatim in the reader's own text.
 * @param url - The URL.
 * @param readerText - What the reader wrote.
 * @returns True when it does.
 */
function readerGave(url: string, readerText: string): boolean {
    return readerText.includes(url);
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
                    const url = args.url as string | undefined;
                    const document = args.text as string | undefined;
                    if ((url === undefined) === (document === undefined)) {
                        throw new ToolRefusal("AI_ARG_INVALID", { path: "text", expected: "exactly one of text, url" });
                    }

                    let network: string | undefined;
                    if (url !== undefined && !readerGave(url, host.readerText)) {
                        let parsed: URL;
                        try {
                            parsed = new URL(url);
                        } catch {
                            throw new ToolRefusal("AI_ARG_INVALID", { path: "url", expected: "a URL" });
                        }

                        if (host.allowImportUrl?.(parsed) !== true) {
                            throw new ToolRefusal("AI_IMPORT_URL_REFUSED", { url });
                        }

                        network = url;
                    }

                    const mode = args.mode === "replace" ? "replace" : "merge";
                    const { nodes } = tx.status.counts;
                    if (message.gate !== false && (network !== undefined || (mode === "replace" && nodes > 0))) {
                        throw new GateHold(network === undefined ? "replaces" : "network", {
                            mode,
                            nodes,
                            ...(network === undefined ? {} : { url: network }),
                        });
                    }

                    let readerOptions: Record<string, unknown> = {};
                    if (args.format !== undefined) {
                        requireEntry("format", text(args.format), formats);
                        const options = catalog.formats.find((each) => each.id === args.format)?.options ?? [];
                        const parsed = optionsSchema(options).schema.safeParse(args.options ?? {});
                        if (!parsed.success) {
                            throw new ToolRefusal("AI_ARG_INVALID", {
                                path: "options",
                                allowed: options.map((option) => option.name),
                            });
                        }

                        readerOptions = parsed.data;
                    } else if (args.options !== undefined) {
                        throw new ToolRefusal("AI_ARG_INVALID", {
                            path: "options",
                            expected: "a format for its options",
                        });
                    }

                    await coded(() =>
                        tx.data.import(
                            {
                                ...(args.format === undefined ? {} : { type: text(args.format) }),
                                // Reader options only: headers and credentials are never the model's to set.
                                config: { ...readerOptions, ...(url === undefined ? { data: document } : { url }) },
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
