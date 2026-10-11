/**
 * @file `filter`: what is visible. The reversible alternative to deleting: a filtered-out element
 * is still in the graph, still counted by an algorithm, and comes back when the filter is cleared.
 */

import { z } from "zod";

import type { RuleTree } from "../../../catalog/types";
import type { TransactionScope } from "../../../session/types";
import { MAX_STRING, requireTarget, resolveNode, type Target, targetFields, text } from "../fields";
import { type ActionResult, type ActionSpec, type JsonObject, type ToolDefinition, ToolRefusal } from "../types";
import { coded, ok } from "./common";

const on = z.enum(["node", "edge"]).optional().describe("Whether where reads nodes (default) or edges.");

/**
 * The rule a target means.
 * @param target - The target.
 * @param kind - Whether a selector reads nodes or edges.
 * @returns The rule.
 */
function ruleOf(target: Target, kind: "node" | "edge"): RuleTree {
    if (target.kind === "all") {
        return { kind: "expression", where: "true" };
    }

    if (target.kind === "ids") {
        return { kind: "member", of: { nodes: target.ids } };
    }

    return kind === "edge" ? { kind: "edges", where: target.where } : { kind: "expression", where: target.where };
}

/**
 * Set the filter and report what is visible.
 * @param tx - The session.
 * @param rule - The filter, or null for none.
 * @param notes - Facts from settling the target.
 * @returns The result.
 */
async function setFilter(tx: TransactionScope, rule: RuleTree | null, notes: JsonObject = {}): Promise<ActionResult> {
    await coded(async () => {
        await tx.visibility.set(rule);
    });
    const { summary } = tx.visibility;
    return ok({ visibleNodes: summary.visibleNodes, visibleEdges: summary.visibleEdges }, notes);
}

/**
 * Settle a required target.
 * @param tx - The session.
 * @param args - The call.
 * @returns The target and its notes.
 */
function required(
    tx: TransactionScope,
    args: Record<string, unknown>,
): { target: Target; notes: JsonObject; kind: "node" | "edge" } {
    const kind = args.on === "edge" ? "edge" : "node";
    const { target, notes } = requireTarget(tx, args, kind);

    return { target, notes, kind };
}

/** The `filter` tool. */
export const filterTool: ToolDefinition = {
    name: "filter",
    plainName: "Filter",
    core: true,
    description: "Shows or hides elements without deleting them. Prefer it to removing.",
    example: { action: "show_only", where: "data.weight > `0.5`", on: "edge" },
    actions: [
        {
            name: "show_only",
            summary: "replaces the filter",
            fields: { ...targetFields, on },
            effect: "write",
            reaches: [{ op: "visibility.set" }, { door: "VisibilityApi.set" }],
            run: ({ tx }, args) => {
                const { target, notes, kind } = required(tx, args);
                return setFilter(tx, target.kind === "all" ? null : ruleOf(target, kind), notes);
            },
        },
        {
            name: "hide",
            summary: "adds to the filter",
            fields: { ...targetFields, on },
            effect: "write",
            reaches: [{ op: "visibility.set" }],
            run: ({ tx }, args) => {
                const { target, notes, kind } = required(tx, args);
                const hidden: RuleTree = { kind: "not", of: ruleOf(target, kind) };
                const current = tx.visibility.filter;
                return setFilter(tx, current === null ? hidden : { kind: "all", of: [current, hidden] }, notes);
            },
        },
        {
            name: "clear",
            summary: "",
            fields: {},
            effect: "write",
            reaches: [{ op: "visibility.window" }, { door: "VisibilityApi.setWindow" }],
            run: async ({ tx }) => {
                if (tx.visibility.window !== null) {
                    await coded(async () => {
                        await tx.visibility.setWindow(null);
                    });
                }

                return setFilter(tx, null);
            },
        },
        {
            name: "range",
            summary: "attribute from/to; dates = time window",
            fields: {
                attribute: z.string().max(200).describe("Attribute name."),
                from: z
                    .union([z.number(), z.string().max(MAX_STRING)])
                    .optional()
                    .describe("Lowest value or date."),
                to: z
                    .union([z.number(), z.string().max(MAX_STRING)])
                    .optional()
                    .describe("Highest value or date."),
            },
            effect: "write",
            reaches: [{ op: "visibility.window" }, { op: "visibility.set" }],
            run: async ({ tx }, args) => {
                const attribute = `data.${text(args.attribute).replace(/^data\./, "")}`;
                const { from, to } = args as { from?: number | string; to?: number | string };
                if (typeof from === "string" || typeof to === "string") {
                    if (from === undefined || to === undefined) {
                        throw new ToolRefusal("AI_ARG_INVALID", {
                            path: "from",
                            expected: "both from and to for a time window",
                        });
                    }

                    await coded(async () => {
                        await tx.visibility.setWindow({ attribute, from, to });
                    });
                    return ok({ visibleNodes: tx.visibility.summary.visibleNodes });
                }

                return setFilter(tx, {
                    kind: "range",
                    attribute,
                    ...(from === undefined ? {} : { min: from }),
                    ...(to === undefined ? {} : { max: to }),
                });
            },
        },
        {
            name: "keep_neighbors",
            summary: "nodes and neighbors within hops",
            fields: {
                ids: targetFields.ids,
                hops: z.number().int().min(1).max(3).optional().describe("1 to 3, default 1."),
            },
            effect: "write",
            reaches: [{ op: "visibility.set" }],
            run: ({ tx }, args) => {
                const ids = ((args.ids as string[] | undefined) ?? []).map((id) => resolveNode(tx, id));
                if (ids.length === 0) {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "ids", expected: "nodes" });
                }

                return setFilter(tx, {
                    kind: "neighborhood",
                    seeds: ids,
                    depth: (args.hops as number | undefined) ?? 1,
                });
            },
        },
        {
            name: "context",
            summary: "draw hidden ones faintly",
            fields: { enabled: z.boolean().describe("true draws hidden elements faintly.") },
            effect: "write",
            reaches: [{ op: "visibility.context" }, { door: "VisibilityApi.showContext" }],
            run: async ({ tx }, args) => {
                // Dispatched and awaited here, so the change joins this batch's step.
                await coded(() => tx.execute({ op: "visibility.context", show: args.enabled === true }));
                return ok(undefined, { enabled: args.enabled === true });
            },
        },
    ] satisfies ActionSpec[],
};
