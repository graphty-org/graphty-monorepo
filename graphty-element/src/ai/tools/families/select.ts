/**
 * @file `select`: change what the reader is pointing at. A selection is not saved in a project, so
 * these actions add no undo step, except saving the selection as a set.
 */

import { z } from "zod";

import type { SelectionTarget } from "../../../session/selection/targets";
import { MAX_STRING, requireTarget, settleTarget, type Target, targetFields, text } from "../fields";
import { type ActionContext, type ActionSpec, type ToolDefinition, ToolRefusal } from "../types";
import { coded, ok } from "./common";

/**
 * A target as the selection reads one.
 * @param target - The target.
 * @returns The selection target.
 */
function selectionTarget(target: Target): SelectionTarget {
    if (target.kind === "all") {
        return { scope: "graph" };
    }

    return target.kind === "where" ? { where: target.where } : { ids: target.ids };
}

/**
 * Apply a target to the selection.
 * @param context - The action's context.
 * @param args - Its arguments.
 * @param op - How the target combines with the selection.
 * @returns The result.
 */
async function apply(
    context: ActionContext,
    args: Record<string, unknown>,
    op: "replace" | "add" | "remove",
): Promise<ReturnType<typeof ok>> {
    const { tx } = context;
    const { target, notes } = requireTarget(tx, args, "node");

    const delta = await coded(() => tx.selection.apply(selectionTarget(target), op));
    return {
        ...ok(
            { nodes: tx.selection.nodes.length, edges: tx.selection.edges.length },
            {
                ...notes,
                added: delta.added.length,
                removed: delta.removed.length,
                ...(tx.selection.truncated ? { truncated: true } : {}),
            },
        ),
        affectedNodes: tx.selection.nodes.slice(0, 50).map(String),
    };
}

const SELECT_DOOR = [
    { door: "SelectionApi.apply" },
    { door: "SelectionApi.nodes" },
    { door: "SelectionApi.edges" },
    { door: "SelectionApi.truncated" },
];

/** The `select` tool. */
export const selectTool: ToolDefinition = {
    name: "select",
    plainName: "Select",
    core: true,
    description: "The selection (not undoable). Hide: filter; color: style.",
    example: { action: "set", where: "data.type == 'server'" },
    actions: [
        {
            name: "set",
            summary: "exactly the target",
            fields: targetFields,
            effect: "exempt",
            reaches: SELECT_DOOR,
            run: (context, args) => apply(context, args, "replace"),
        },
        {
            name: "add",
            summary: "",
            fields: targetFields,
            effect: "exempt",
            reaches: SELECT_DOOR,
            run: (context, args) => apply(context, args, "add"),
        },
        {
            name: "remove",
            summary: "",
            fields: targetFields,
            effect: "exempt",
            reaches: SELECT_DOOR,
            run: (context, args) => apply(context, args, "remove"),
        },
        {
            name: "clear",
            summary: "",
            fields: {},
            effect: "exempt",
            reaches: [{ door: "SelectionApi.clear" }],
            run: ({ tx }) => {
                const delta = tx.selection.clear();
                return Promise.resolve(ok(undefined, { removed: delta.removed.length }));
            },
        },
        {
            name: "neighborhood",
            summary: "nodes within hops",
            fields: {
                ids: targetFields.ids,
                hops: z.number().int().min(1).max(3).optional().describe("How many steps, 1 to 3."),
            },
            effect: "exempt",
            reaches: [{ door: "SelectionApi.apply" }, { door: "SelectionApi.nodes" }],
            run: async (context, args) => {
                const { tx } = context;
                const { target, notes } = settleTarget(tx, { ids: args.ids }, "node", false);
                const seeds = target?.kind === "ids" ? target.ids : undefined;
                const depth = ((args.hops as number | undefined) ?? 1) as 1 | 2 | 3;
                const delta = await coded(() =>
                    tx.selection.apply(seeds === undefined ? { depth } : { neighborsOf: seeds, depth }, "replace"),
                );
                return ok({ nodes: tx.selection.nodes.length }, { ...notes, added: delta.added.length });
            },
        },
        {
            name: "save_as_set",
            summary: "selection to a set",
            fields: { name: z.string().min(1).max(MAX_STRING).describe("The set's name.") },
            effect: "write",
            reaches: [{ door: "SetsApi.createFrom" }, { op: "set.create" }],
            run: async ({ tx }, args) => {
                if (tx.selection.size === 0) {
                    throw new ToolRefusal("AI_EMPTY_MATCH", { where: "selection", nodes: 0 });
                }

                const id = await coded(() => tx.sets.createFrom("selection", { name: text(args.name) }));
                return ok({ set: id }, { set: id });
            },
        },
    ] satisfies ActionSpec[],
};
