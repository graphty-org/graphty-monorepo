/**
 * @file `query`: read the graph's data, paged. "How many", "which" and "what values" are the
 * first questions of most workflows, and a large graph's answer must come back in pages.
 */

import { z } from "zod";

import type { RecordPageOptions } from "../../../session/types";
import {
    attributeNames,
    guardSelector,
    idsOf,
    MAX_STRING,
    requireTarget,
    resolveNode,
    scopeOf,
    settleTarget,
    targetFields,
    text,
} from "../fields";
import { compactRecord, limitOf, offsetOf, pageOf, toJson } from "../shape";
import { type ActionSpec, type JsonObject, type ToolDefinition, ToolRefusal } from "../types";
import { ok } from "./common";

const fields = z.array(z.string().max(200)).max(12).optional().describe("Fields to return.");
const limit = z.number().int().min(0).max(50).optional().describe("Default 20.");
const cursor = z.string().max(200).optional().describe("From the previous page.");
const sort = z.string().max(200).optional().describe("Attribute; -name descends.");

/**
 * A page of node or edge records.
 * @param kind - Nodes or edges.
 * @returns The action.
 */
function recordsAction(kind: "node" | "edge"): ActionSpec {
    const page = kind === "node" ? "nodePage" : "edgePage";
    return {
        name: kind === "node" ? "nodes" : "edges",
        summary: "a target's, or all",
        fields: {
            ...targetFields,
            fields,
            sort,
            limit,
            cursor,
            ...(kind === "edge"
                ? { node: z.string().max(MAX_STRING).optional().describe("Only edges at this node.") }
                : {}),
        },
        effect: "read",
        reaches: [{ door: `SessionDataApi.${page}` }, { door: "SessionDataApi.edge" }, { door: "SessionDataApi.node" }],
        run: (context, args) => {
            const { tx } = context;
            const { target, notes } = settleTarget(tx, args, kind, false);
            const { revision } = tx.data.nodePage({ limit: 0 });
            const offset = offsetOf(args.cursor as string | undefined, revision);
            const size = limitOf(args.limit);
            const sortKey = args.sort as string | undefined;
            const options: RecordPageOptions & { touching?: string } = {
                offset,
                limit: size,
                ...(target?.kind === "where" ? { where: target.where } : {}),
                ...(target?.kind === "ids" && kind === "node" ? { scope: scopeOf(target) } : {}),
                ...(sortKey === undefined
                    ? {}
                    : {
                          sort: {
                              key: sortKey.replace(/^-/, "").replace(/^data\./, ""),
                              descending: sortKey.startsWith("-"),
                          },
                      }),
                ...(args.node === undefined ? {} : { touching: resolveNode(tx, text(args.node)) }),
            };
            if (target?.kind === "ids" && kind === "edge") {
                const records = target.ids.flatMap((id) => {
                    const edge = tx.data.edge(id);
                    return edge === undefined ? [] : [compactRecord(edge, args.fields as string[] | undefined)];
                });
                return Promise.resolve(ok(records, notes));
            }

            const result = guardSelector(target, () =>
                kind === "node" ? tx.data.nodePage(options) : tx.data.edgePage(options),
            );
            const records = result.records.map((record) => compactRecord(record, args.fields as string[] | undefined));
            return Promise.resolve({
                ...ok(records, notes),
                page: pageOf(result.total, offset, records.length, revision),
            });
        },
    };
}

/** The `query` tool. */
export const queryTool: ToolDefinition = {
    name: "query",
    plainName: "Query data",
    core: true,
    description: "Reads the graph's data, paged. For capabilities use catalog.",
    example: { action: "nodes", where: "data.type == 'server'" },
    actions: [
        {
            name: "overview",
            summary: "counts, layout, selection, runs",
            fields: {},
            effect: "read",
            reaches: [
                { door: "GraphSession.status" },
                { door: "GraphSession.seededNodeCount" },
                { door: "SessionLayout.id" },
                { door: "SessionLayout.engine" },
                { door: "SessionLayout.dimension" },
                { door: "SessionLayout.options" },
                { door: "SelectionApi.size" },
                { door: "VisibilityApi.summary" },
                { door: "VisibilityApi.filter" },
                { door: "VisibilityApi.window" },
                { door: "RunsApi.list" },
                { door: "SessionDataApi.source" },
            ],
            run: ({ tx }) => {
                const { status } = tx;
                return Promise.resolve(
                    ok({
                        nodes: status.counts.nodes,
                        edges: status.counts.edges,
                        visibleNodes: status.counts.visibleNodes,
                        visibleEdges: status.counts.visibleEdges,
                        directed: status.directed,
                        layout: tx.layout.id,
                        engine: tx.layout.engine,
                        dimension: tx.layout.dimension,
                        selected: tx.selection.size,
                        filtered: tx.visibility.filter !== null || tx.visibility.window !== null,
                        source: toJson(tx.data.source()?.name ?? null),
                        runs: tx.runs
                            .list()
                            .map((run) => ({ run: run.id, algorithm: run.algorithm, status: run.status })),
                    }),
                );
            },
        },
        recordsAction("node"),
        recordsAction("edge"),
        {
            name: "node",
            summary: "records by id or label",
            fields: { ids: targetFields.ids, fields },
            effect: "read",
            reaches: [{ door: "SessionDataApi.node" }, { door: "SessionDataApi.name" }],
            run: ({ tx }, args) => {
                const ids = (args.ids as string[] | undefined) ?? [];
                if (ids.length === 0) {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "ids", expected: "a node id or label" });
                }

                const records = ids.slice(0, 10).map((name) => {
                    const id = resolveNode(tx, name);
                    const record = tx.data.node(id) ?? {};
                    return {
                        ...compactRecord(record, args.fields as string[] | undefined),
                        name: tx.data.name(id) ?? id,
                        neighbors: tx.data.neighbors(id, { limit: 0 }).total,
                    };
                });
                return Promise.resolve(ok(records));
            },
        },
        {
            name: "neighbors",
            summary: "of one node, hops 1-3",
            fields: {
                ids: targetFields.ids,
                hops: z.number().int().min(1).max(3).optional().describe("How many steps, 1 to 3."),
                limit,
                cursor,
            },
            effect: "read",
            reaches: [{ door: "SessionDataApi.neighbors" }],
            run: ({ tx }, args) => {
                const ids = (args.ids as string[] | undefined) ?? [];
                if (ids.length !== 1) {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "ids", expected: "exactly one node" });
                }

                const id = resolveNode(tx, ids[0]);
                const hops = (args.hops as number | undefined) ?? 1;
                const { revision } = tx.data.nodePage({ limit: 0 });
                const offset = offsetOf(args.cursor as string | undefined, revision);
                const size = limitOf(args.limit);
                if (hops === 1) {
                    const page = tx.data.neighbors(id, { offset, limit: size });
                    const records = page.records.map((neighbor) => ({
                        id: String(neighbor.node.id),
                        name: neighbor.name,
                        weight: neighbor.weight,
                        edges: neighbor.edgeCount,
                    }));
                    return Promise.resolve({
                        ...ok(records),
                        page: pageOf(page.total, offset, records.length, revision),
                    });
                }

                // Walk out ring by ring, each node once, up to the item bound.
                const seen = new Set([id]);
                let ring = [id];
                const found: { id: string; hops: number }[] = [];
                for (let step = 1; step <= hops && found.length < 500; step++) {
                    const next: string[] = [];
                    for (const at of ring) {
                        for (const neighbor of tx.data.neighbors(at, { limit: Infinity }).records) {
                            const other = String(neighbor.node.id);
                            if (!seen.has(other)) {
                                seen.add(other);
                                next.push(other);
                                found.push({ id: other, hops: step });
                            }
                        }
                    }

                    ring = next;
                }

                const window = found
                    .slice(offset, offset + size)
                    .map((row) => ({ ...row, name: tx.data.name(row.id) ?? row.id }));
                return Promise.resolve({ ...ok(window), page: pageOf(found.length, offset, window.length, revision) });
            },
        },
        {
            name: "find",
            summary: "text search",
            fields: { text: z.string().max(MAX_STRING).describe("Text to search for."), limit, cursor },
            effect: "read",
            reaches: [{ door: "GraphSession.find" }],
            run: ({ tx }, args) => {
                if (typeof args.text !== "string" || args.text === "") {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "text", expected: "text to find" });
                }

                const { revision } = tx.data.nodePage({ limit: 0 });
                const offset = offsetOf(args.cursor as string | undefined, revision);
                const result = tx.find(args.text, { limit: limitOf(args.limit), offset });
                const records = result.records.map((hit) => toJson(hit));
                return Promise.resolve({
                    ...ok(records),
                    page: pageOf(result.total, offset, records.length, revision),
                });
            },
        },
        {
            name: "attributes",
            summary: "names, types, ranges",
            fields: {},
            effect: "read",
            reaches: [{ door: "SessionDataApi.attributes" }, { door: "SessionDataApi.resultColumns" }],
            run: ({ tx }) =>
                Promise.resolve(
                    ok(
                        tx.data.attributes().map((attribute) => {
                            const out: JsonObject = {
                                path: attribute.path,
                                kind: attribute.kind,
                                type: attribute.type,
                            };
                            if (attribute.uniqueCount !== undefined) {
                                out.distinct = attribute.uniqueCount;
                            }

                            if (attribute.min !== undefined) {
                                out.min = attribute.min;
                                out.max = attribute.max ?? null;
                            }

                            out.samples = toJson(attribute.sampleValues.slice(0, 3));
                            return out;
                        }),
                    ),
                ),
        },
        {
            name: "histogram",
            summary: "one attribute's distribution",
            fields: { column: z.string().max(200).describe("Attribute name, e.g. type or data.weight.") },
            effect: "read",
            reaches: [{ door: "SessionDataApi.histogram" }],
            run: ({ tx }, args) => {
                const name = text(args.column).replace(/^data\./, "");
                const kind = (["node", "edge"] as const).find((each) => attributeNames(tx, each).includes(name));
                if (kind === undefined) {
                    throw new ToolRefusal("AI_UNKNOWN_COLUMN", {
                        name,
                        on: "node",
                        didYouMean: [...attributeNames(tx, "node"), ...attributeNames(tx, "edge")].slice(0, 15),
                    });
                }

                return Promise.resolve(ok(tx.data.histogram({ kind, name }), { on: kind }));
            },
        },
        {
            name: "statistics",
            summary: "density, degrees, components",
            fields: {},
            effect: "read",
            reaches: [{ door: "SessionDataApi.statistics" }],
            run: ({ tx }) => {
                const stats = tx.data.statistics();
                return Promise.resolve(
                    ok({
                        nodes: stats.nodeCount,
                        edges: stats.edgeCount,
                        density: stats.density,
                        directedness: stats.directedness,
                        weighted: stats.weighted,
                        selfLoops: stats.selfLoopCount,
                        repeatedEdges: stats.repeatedEdgeCount,
                        degreeRange: toJson(stats.degreeRange),
                        meanDegree: stats.meanDegree,
                        components: stats.components.count,
                        largestComponent: stats.components.largestSize,
                        isolated: stats.components.isolatedCount,
                        ...(stats.transitivity === undefined ? {} : { transitivity: stats.transitivity }),
                    }),
                );
            },
        },
        {
            name: "count",
            summary: "how many a target matches",
            fields: targetFields,
            effect: "read",
            reaches: [{ door: "ScopeApi.count" }],
            run: ({ tx }, args) => {
                const { target, notes } = requireTarget(tx, args, "node");

                const nodes = idsOf(tx, target, "node", 0).total;
                const edges = target.kind === "ids" ? 0 : idsOf(tx, target, "edge", 0).total;
                return Promise.resolve(ok({ nodes, edges }, notes));
            },
        },
    ],
};
