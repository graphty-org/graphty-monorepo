/**
 * @file `columns`, `sources` and `issues`: what the loaded data's columns are called and mean, the
 * loads the graph came from, and the problems found in them. Every write is one undoable step of
 * the session's own; fetching from a network source is held for the reader's approval, as an import
 * from a URL the reader did not give is.
 */

import type { GeneratorParams } from "@graphty/graph-samples/generators";
import { z } from "zod";

import type { FixCode, IssueId } from "../../../session/issues";
import type { ColumnRef } from "../../../session/shared";
import type { ColumnRole, TransactionScope, ValueType } from "../../../session/types";
import { MAX_ITEMS, MAX_STRING, resolveNode, text } from "../fields";
import { type ActionResult, type ActionSpec, gated, GateHold, type MessageState, type ToolDefinition } from "../types";
import { coded, list, ok } from "./common";

const column = z.string().max(200).describe("The column's name.");
const on = z.enum(["node", "edge"]).optional().describe("Default node.");
const value = z.union([z.string().max(MAX_STRING), z.number(), z.boolean()]).describe("One value of the column.");
const types = z.enum(["text", "number", "boolean", "date", "category"]);

/**
 * The column a call names.
 * @param args - The call.
 * @returns The reference.
 */
function columnOf(args: Record<string, unknown>): ColumnRef {
    return { kind: args.on === "edge" ? "edge" : "node", name: text(args.column).replace(/^data\./, "") };
}

/**
 * The path a call's column is read at.
 * @param args - The call.
 * @returns The path.
 */
function pathOf(args: Record<string, unknown>): string {
    return `data.${columnOf(args).name}`;
}

/** The `columns` tool. */
export const columnsTool: ToolDefinition = {
    name: "columns",
    plainName: "Columns",
    core: false,
    description:
        "What the data's columns are: their names, types and roles, which are hidden, and what their values are called.",
    example: { action: "rename", column: "lbl", name: "label" },
    actions: [
        {
            name: "list",
            summary: "every readable value and every hidden column",
            fields: {},
            effect: "read",
            reaches: [
                { door: "SessionDataApi.readableValues" },
                { door: "SessionDataApi.structureValues" },
                { door: "SessionDataApi.hiddenColumns" },
                { door: "SessionDataApi.loadedWeight" },
            ],
            run: ({ tx }) =>
                Promise.resolve(
                    ok({
                        readable: list(tx.data.readableValues()),
                        structure: list(tx.data.structureValues()),
                        hidden: list(tx.data.hiddenColumns()),
                        weight: tx.data.loadedWeight(),
                    }),
                ),
        },
        {
            name: "values",
            summary: "one column's values, their counts and names",
            fields: { column, on },
            effect: "read",
            reaches: [{ door: "SessionDataApi.valueCounts" }, { door: "SessionDataApi.valueLabels" }],
            run: ({ tx }, args) => {
                const path = pathOf(args);
                const counts = tx.data.valueCounts(path, { kind: columnOf(args).kind });
                return Promise.resolve(ok({ counts, labels: Object.fromEntries(tx.data.valueLabels(path)) }));
            },
        },
        {
            name: "over_represented",
            summary: "per group of the column, the node values more frequent than chance",
            fields: {
                column: z
                    .string()
                    .max(200)
                    .describe("The column or path holding each node's group, e.g. team or a run's path."),
            },
            effect: "read",
            reaches: [{ door: "SessionDataApi.overRepresented" }],
            run: ({ tx }, args) => {
                const group = text(args.column);
                return Promise.resolve(ok(tx.data.overRepresented(group.includes(".") ? group : `data.${group}`)));
            },
        },
        {
            name: "preview_type",
            summary: "what a type change would do",
            fields: { column, on, type: types.describe("The type.") },
            effect: "read",
            reaches: [{ door: "SessionDataApi.previewType" }],
            run: ({ tx }, args) => Promise.resolve(ok(tx.data.previewType(columnOf(args), args.type as ValueType))),
        },
        {
            name: "rename",
            summary: "",
            fields: { column, on, name: z.string().max(200).describe("The new name.") },
            effect: "write",
            reaches: [{ door: "SessionDataApi.renameColumn" }],
            run: async ({ tx }, args) => {
                await coded(() => tx.data.renameColumn(columnOf(args), text(args.name)));
                return ok(undefined, { name: text(args.name) });
            },
        },
        {
            name: "set_type",
            summary: "",
            fields: { column, on, type: types.describe("The type.") },
            effect: "write",
            reaches: [{ door: "SessionDataApi.setType" }],
            run: async ({ tx }, args) => {
                await coded(() => tx.data.setType(columnOf(args), args.type as ValueType));
                return ok(undefined, { type: text(args.type) });
            },
        },
        {
            name: "set_role",
            summary: "the node label, the edge weight...; none clears it",
            fields: {
                column,
                on,
                role: z
                    .string()
                    .max(100)
                    .optional()
                    .describe("key, label, source, target, weight, time, edgeId, kind or a location kind."),
            },
            effect: "write",
            reaches: [{ door: "SessionDataApi.setRole" }],
            run: async ({ tx }, args) => {
                await coded(() => tx.data.setRole(columnOf(args), (args.role ?? null) as ColumnRole | null));
                return ok(undefined, { role: (args.role ?? null) as string | null });
            },
        },
        {
            name: "hide",
            summary: "leave columns out of what a reader is shown",
            fields: {
                columns: z.array(column).max(MAX_ITEMS).describe("The columns."),
                on,
                hidden: z.boolean().optional().describe("false shows them again."),
            },
            effect: "write",
            reaches: [{ door: "SessionDataApi.setHidden" }, { op: "data.columns" }],
            run: async ({ tx }, args) => {
                const refs = (args.columns as string[]).map((each) => columnOf({ column: each, on: args.on }));
                await coded(() => tx.data.setHidden(refs, args.hidden !== false));
                return ok(undefined, { columns: refs.length });
            },
        },
        {
            name: "label_value",
            summary: "name one value; none takes its name away",
            fields: {
                column,
                on,
                value,
                label: z.string().max(MAX_STRING).optional().describe("What to call it."),
            },
            effect: "write",
            reaches: [{ door: "SessionDataApi.setValueLabel" }, { op: "data.label" }],
            run: async ({ tx }, args) => {
                const label = (args.label ?? null) as string | null;
                await coded(() => tx.data.setValueLabel(pathOf(args), args.value as string, label));
                return ok(undefined, { label });
            },
        },
    ] satisfies ActionSpec[],
};

/**
 * Hold a fetch from a network source for the reader's approval.
 * @param message - The message.
 * @param what - What it would fetch.
 * @throws {GateHold} While the gate is on and the reader has not approved.
 */
function holdFetch(message: MessageState, what: string): void {
    if (gated(message, "network")) {
        throw new GateHold("network", { source: what });
    }
}

const sourceKey = z.string().max(200).describe("The load's key, from list.");
const node = z.string().max(MAX_STRING).describe("Node id or label.");

/**
 * What a load changed, for a result.
 * @param tx - The session.
 * @param network - What was fetched.
 * @returns The result.
 */
function loaded(tx: TransactionScope, network?: string): ActionResult {
    const { nodes, edges } = tx.status.counts;
    return { ...ok(undefined, { nodes, edges }), ...(network === undefined ? {} : { measure: { network } }) };
}

/** The `sources` tool. */
export const sourcesTool: ToolDefinition = {
    name: "sources",
    plainName: "Data sources",
    core: false,
    description:
        "The loads the graph came from: list them, take one out, generate a graph, or download a sample dataset or fetch from a network source (held for approval).",
    example: { action: "generate", name: "path", params: { n: 10 } },
    actions: [
        {
            name: "list",
            summary: "every load, joined table and waiting source load",
            fields: {},
            effect: "read",
            reaches: [
                { door: "SessionDataApi.sources" },
                { door: "SessionDataApi.loads" },
                { door: "SessionDataApi.joins" },
                { door: "SessionDataApi.pendingSourceLoads" },
            ],
            run: ({ tx }) =>
                Promise.resolve(
                    ok({
                        sources: list(tx.data.sources()),
                        loads: list(tx.data.loads()),
                        joins: list(tx.data.joins()),
                        pending: list(tx.data.pendingSourceLoads()),
                    }),
                ),
        },
        {
            name: "of",
            summary: "the loads a node came from",
            fields: { node },
            effect: "read",
            reaches: [{ door: "SessionDataApi.sourcesOf" }, { door: "SessionDataApi.nodeSource" }],
            run: ({ tx }, args) => {
                const id = resolveNode(tx, text(args.node));
                return Promise.resolve(ok({ loads: list(tx.data.sourcesOf(id)), source: tx.data.nodeSource(id) }));
            },
        },
        {
            name: "remove",
            summary: "take one load out",
            fields: { key: sourceKey },
            effect: "write",
            reaches: [{ door: "SessionDataApi.removeSource" }],
            run: async ({ tx }, args) => {
                const { removed, kept } = await coded(() => tx.data.removeSource(text(args.key)));
                return {
                    ...ok({ removed, kept }),
                    measure: { removeNodes: removed.nodes, removeEdges: removed.edges },
                };
            },
        },
        {
            name: "generate",
            summary: "add a generated graph",
            fields: {
                name: z.string().max(200).describe("The generator."),
                params: z.record(z.string(), z.unknown()).optional().describe("Its parameters."),
            },
            effect: "write",
            reaches: [{ door: "SessionDataApi.generate" }, { op: "data.import" }],
            run: async ({ tx }, args) => {
                await coded(() =>
                    tx.data.generate(text(args.name), args.params as GeneratorParams | undefined, { mode: "merge" }),
                );
                return loaded(tx);
            },
        },
        {
            name: "load_dataset",
            summary: "download a sample dataset (Karate Club, Les Miserables, ...), added to the graph",
            fields: {
                name: z.string().max(200).describe('The dataset\'s name, such as "karate" or "les-miserables".'),
            },
            effect: "write",
            reaches: [{ door: "SessionDataApi.loadDataset" }, { op: "data.import" }],
            run: async ({ tx, message }, args) => {
                const name = text(args.name);
                holdFetch(message, name);
                await coded(() => tx.data.loadDataset(name, { mode: "merge" }));
                return loaded(tx, name);
            },
        },
        {
            name: "load_example",
            summary: "fetch a network source's public example, added to the graph",
            fields: {
                source: z.string().max(200).describe("The source's id."),
                id: z.string().max(200).describe("The example's id."),
            },
            effect: "write",
            reaches: [{ door: "SessionDataApi.loadExample" }, { op: "data.import-source" }],
            run: async ({ tx, message }, args) => {
                const source = text(args.source);
                const id = text(args.id);
                holdFetch(message, id);
                await coded(() => tx.data.loadExample(source, id, { mode: "merge" }));
                return loaded(tx, id);
            },
        },
        {
            name: "expand",
            summary: "fetch nodes' neighbors from the source that loaded them",
            fields: { ids: z.array(node).max(50).describe("Ids or labels.") },
            effect: "write",
            reaches: [{ door: "SessionDataApi.expand" }, { op: "data.source-expand" }],
            run: async ({ tx, message }, args) => {
                const ids = (args.ids as string[]).map((each) => resolveNode(tx, each));
                holdFetch(message, ids.join(","));
                await coded(() => tx.data.expand(ids));
                return loaded(tx, ids.join(","));
            },
        },
        {
            name: "collapse",
            summary: "remove what a node's expansions alone brought",
            fields: { node },
            effect: "write",
            reaches: [{ door: "SessionDataApi.collapse" }, { op: "data.collapse" }],
            run: async ({ tx }, args) => {
                const id = resolveNode(tx, text(args.node));
                return ok(await coded(() => tx.data.collapse(id)));
            },
        },
    ] satisfies ActionSpec[],
};

const issue = z.string().max(200).describe("The issue's id, from list.");

/** The `issues` tool. */
export const issuesTool: ToolDefinition = {
    name: "issues",
    plainName: "Data issues",
    core: false,
    description: "Problems found in the loaded data, each with the fixes that would change it.",
    example: { action: "fix", id: "issue-1", fix: "trim" },
    actions: [
        {
            name: "list",
            summary: "",
            fields: { all: z.boolean().optional().describe("Also the ignored and the fixed.") },
            effect: "read",
            reaches: [{ door: "SessionDataApi.issues" }],
            run: ({ tx }, args) => {
                const all = args.all === true;
                return Promise.resolve(ok(list(tx.data.issues({ includeIgnored: all, includeFixed: all }))));
            },
        },
        {
            name: "fix",
            summary: "apply one of an issue's fixes",
            fields: { id: issue, fix: z.string().max(100).describe("One of the issue's fixes.") },
            effect: "write",
            reaches: [{ door: "SessionDataApi.fix" }],
            run: async ({ tx }, args) => ok(await coded(() => tx.data.fix(text(args.id), text(args.fix) as FixCode))),
        },
        {
            name: "ignore",
            summary: "stop listing issues, or list them again",
            fields: {
                ids: z.array(issue).max(MAX_ITEMS).describe("The issues."),
                ignored: z.boolean().optional().describe("false lists them again."),
            },
            effect: "write",
            reaches: [{ door: "SessionDataApi.ignoreIssues" }, { op: "data.issues" }],
            run: async ({ tx }, args) => {
                const ids = args.ids as IssueId[];
                await coded(() => tx.data.ignoreIssues(ids, args.ignored !== false));
                return ok(undefined, { issues: ids.length });
            },
        },
    ] satisfies ActionSpec[],
};
