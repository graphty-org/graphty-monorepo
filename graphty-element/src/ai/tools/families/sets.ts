/**
 * @file `sets` and `notes`: named sets of elements, and notes pinned to them. Both are on-demand
 * tools, offered once `catalog` search names them.
 */

import { z } from "zod";

import type { ScopeInput, SetCombine, SetId } from "../../../catalog/types";
import type { TransactionScope } from "../../../session/types";
import {
    idsOf,
    MAX_ITEMS,
    MAX_STRING,
    requireTarget,
    resolveNode,
    resolveRun,
    scopeOf,
    settleTarget,
    targetFields,
    text,
} from "../fields";
import { suggest } from "../search";
import { compactRecord, toJson } from "../shape";
import { type ActionSpec, type ToolDefinition, ToolRefusal } from "../types";
import { coded, ok } from "./common";

/**
 * The set a call names, by id or by name.
 * @param tx - The session.
 * @param name - The id or name.
 * @returns The set's id.
 */
function setOf(tx: TransactionScope, name: unknown): SetId {
    const wanted = text(name);
    const sets = tx.sets.list();
    const found =
        sets.find((set) => set.id === wanted) ?? sets.find((set) => set.name.toLowerCase() === wanted.toLowerCase());
    if (found === undefined) {
        throw new ToolRefusal("AI_UNKNOWN_ENTRY", {
            kind: "set",
            name: wanted,
            didYouMean: suggest(
                wanted,
                sets.map((set) => set.name),
            ),
        });
    }

    return found.id;
}

/**
 * The scope a call's target means, refusing none.
 * @param tx - The session.
 * @param args - The call.
 * @returns The scope.
 */
function scopeArg(tx: TransactionScope, args: Record<string, unknown>): ScopeInput {
    const { target } = requireTarget(tx, args, "node");
    return scopeOf(target);
}

const set = z.string().max(MAX_STRING).optional().describe("Set id or name.");
const name = z.string().min(1).max(200).optional().describe("A name.");
const nodes = z.array(z.string().max(MAX_STRING)).max(MAX_ITEMS).optional().describe("Node ids or labels.");

/** The `sets` tool. */
export const setsTool: ToolDefinition = {
    name: "sets",
    plainName: "Sets",
    core: false,
    description:
        "Named sets of nodes: create from a target or a path, combine, rename, edit members, remove and restore. A set can scope a run or a layout.",
    example: { action: "create", where: "data.type == 'server'", name: "Servers" },
    actions: [
        {
            name: "create",
            summary: "A set that keeps matching a selector (where) or holds fixed ids.",
            fields: { ...targetFields, name },
            effect: "write",
            reaches: [{ op: "set.create" }, { door: "SetsApi.create" }],
            run: async ({ tx }, args) => {
                const { target, notes } = requireTarget(tx, args, "node");
                const definition =
                    target.kind === "where"
                        ? { kind: "rule" as const, where: target.where, reading: "induced" as const }
                        : {
                              kind: "fixed" as const,
                              nodes: idsOf(tx, target, "node", MAX_ITEMS).ids,
                              reading: "induced" as const,
                          };
                const id = await coded(() =>
                    tx.sets.create(definition, typeof args.name === "string" ? { name: args.name } : {}),
                );
                return ok({ set: id }, { ...notes, set: id });
            },
        },
        {
            name: "create_from",
            summary: "A fixed set of what a target holds now.",
            fields: { ...targetFields, name },
            effect: "write",
            reaches: [{ door: "SetsApi.createFrom" }, { op: "set.create" }],
            run: async ({ tx }, args) => {
                const id = await coded(() =>
                    tx.sets.createFrom(scopeArg(tx, args), typeof args.name === "string" ? { name: args.name } : {}),
                );
                return ok({ set: id }, { set: id });
            },
        },
        {
            name: "path",
            summary: "A set of the selection as a path, in order.",
            fields: { name },
            effect: "write",
            reaches: [{ door: "SetsApi.createPath" }, { op: "set.create" }],
            run: async ({ tx }, args) => {
                const id = await coded(() =>
                    tx.sets.createPath("selection", typeof args.name === "string" ? { name: args.name } : {}),
                );
                return ok({ set: id }, { set: id });
            },
        },
        {
            name: "combine",
            summary: "A set from the union, intersection or difference of sets.",
            fields: {
                op: z.enum(["union", "intersection", "difference", "symmetric-difference"]).describe("How to combine."),
                sets: z.array(z.string().max(MAX_STRING)).min(2).max(10).describe("Set ids or names."),
                name,
            },
            effect: "write",
            reaches: [{ door: "SetsApi.combine" }, { op: "set.create" }],
            run: async ({ tx }, args) => {
                const of = (args.sets as string[]).map((each) => ({ set: setOf(tx, each) }));
                const id = await coded(() =>
                    tx.sets.combine(
                        args.op as SetCombine,
                        of,
                        typeof args.name === "string" ? { name: args.name } : {},
                    ),
                );
                return ok({ set: id }, { set: id });
            },
        },
        {
            name: "rename",
            summary: "Rename a set.",
            fields: { set, name },
            effect: "write",
            reaches: [{ op: "set.rename" }, { door: "SetsApi.rename" }],
            run: async ({ tx }, args) => {
                const id = setOf(tx, args.set);
                await coded(() => {
                    tx.sets.rename(id, text(args.name));
                });
                return ok(undefined, { set: id });
            },
        },
        {
            name: "redefine",
            summary: "Make a set match a new selector.",
            fields: { set, where: targetFields.where },
            effect: "write",
            reaches: [{ op: "set.redefine" }, { door: "SetsApi.redefine" }],
            run: async ({ tx }, args) => {
                const id = setOf(tx, args.set);
                const { target } = settleTarget(tx, { where: args.where }, "node", true);
                if (target?.kind !== "where") {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "where", expected: "a selector" });
                }

                await coded(() => {
                    tx.sets.redefine(id, { kind: "rule", where: target.where, reading: "induced" });
                });
                return ok(undefined, { set: id });
            },
        },
        {
            name: "add_members",
            summary: "Add nodes to a fixed set.",
            fields: { set, nodes },
            effect: "write",
            reaches: [{ op: "set.members" }, { door: "SetsApi.addMembers" }],
            run: async ({ tx }, args) => {
                const id = setOf(tx, args.set);
                const members = ((args.nodes ?? []) as string[]).map((each) => resolveNode(tx, each));
                await coded(() => {
                    tx.sets.addMembers(id, { nodes: members });
                });
                return ok(undefined, { set: id, added: members.length });
            },
        },
        {
            name: "remove_members",
            summary: "Take nodes out of a fixed set.",
            fields: { set, nodes },
            effect: "write",
            reaches: [{ door: "SetsApi.removeMembers" }, { op: "set.members" }],
            run: async ({ tx }, args) => {
                const id = setOf(tx, args.set);
                const members = ((args.nodes ?? []) as string[]).map((each) => resolveNode(tx, each));
                await coded(() => {
                    tx.sets.removeMembers(id, { nodes: members });
                });
                return ok(undefined, { set: id, removed: members.length });
            },
        },
        {
            name: "remove",
            summary: "Remove a set (it can be restored).",
            fields: { set },
            effect: "write",
            reaches: [{ op: "set.remove" }, { door: "SetsApi.remove" }],
            run: async ({ tx }, args) => {
                const id = setOf(tx, args.set);
                await coded(() => {
                    tx.sets.remove(id);
                });
                return ok(undefined, { set: id });
            },
        },
        {
            name: "restore",
            summary: "Bring back a removed set.",
            fields: { set: z.string().max(MAX_STRING).describe("The removed set's id.") },
            effect: "write",
            reaches: [{ op: "set.restore" }, { door: "SetsApi.restore" }],
            run: async ({ tx }, args) => {
                const id = text(args.set);
                await coded(() => {
                    tx.sets.restore(id);
                });
                return ok(undefined, { set: id });
            },
        },
        {
            name: "list",
            summary: "Every set: id, name, how it was made.",
            fields: {},
            effect: "read",
            reaches: [{ door: "SetsApi.list" }],
            run: ({ tx }) =>
                Promise.resolve(
                    ok(
                        tx.sets.list().map((each) => ({
                            set: each.id,
                            name: each.name,
                            kind: each.definition.kind,
                            from: each.createdFrom.kind,
                        })),
                    ),
                ),
        },
        {
            name: "get",
            summary: "One set: its definition, status and how many elements it holds.",
            fields: { set },
            effect: "read",
            reaches: [{ door: "SetsApi.get" }, { door: "SetsApi.status" }, { door: "SetsApi.usedBy" }],
            run: ({ tx }, args) => {
                const id = setOf(tx, args.set);
                return Promise.resolve(
                    ok({
                        set: toJson(tx.sets.get(id)),
                        status: toJson(tx.sets.status({ set: id })),
                        usedBy: toJson(tx.sets.usedBy(id)),
                    }),
                );
            },
        },
        {
            name: "containing",
            summary: "The sets a node belongs to.",
            fields: { node: z.string().max(MAX_STRING).describe("Node id or label.") },
            effect: "read",
            reaches: [{ door: "SetsApi.containing" }],
            run: async ({ tx }, args) => {
                const memberships = await coded(() => tx.sets.containing({ node: resolveNode(tx, text(args.node)) }));
                return ok(memberships);
            },
        },
        {
            name: "offers",
            summary: "Sets a finished run offers to save (its communities, its path).",
            fields: { run: z.string().max(200).describe('Run id, algorithm name or "latest".') },
            effect: "read",
            reaches: [{ door: "SetsApi.offers" }],
            run: ({ tx }, args) => Promise.resolve(ok(tx.sets.offers(resolveRun(tx, text(args.run)), { limit: 20 }))),
        },
    ] satisfies ActionSpec[],
};

const note = z.string().max(MAX_STRING).optional().describe("Note id.");
const body = z.string().max(MAX_STRING).optional().describe("The note's text.");

/** The `notes` tool. */
export const notesTool: ToolDefinition = {
    name: "notes",
    plainName: "Notes",
    core: false,
    description: "Notes on nodes and edges: add, edit, remove, list and read.",
    example: { action: "add", ids: ["a"], text: "Checked by finance" },
    actions: [
        {
            name: "add",
            summary: "Add a note on nodes.",
            fields: { ids: targetFields.ids, text: body },
            effect: "write",
            reaches: [{ op: "note.add" }, { door: "NotesApi.add" }],
            run: async ({ tx }, args) => {
                const nodes = ((args.ids ?? []) as string[]).map((each) => resolveNode(tx, each));
                if (nodes.length === 0 || typeof args.text !== "string") {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "ids", expected: "nodes and text" });
                }

                const id = await coded(() =>
                    tx.notes.add({ text: args.text as string, targets: nodes.map((node) => ({ node })) }),
                );
                return ok({ note: id }, { note: id });
            },
        },
        {
            name: "update",
            summary: "Change a note's text.",
            fields: { note, text: body },
            effect: "write",
            reaches: [{ op: "note.update" }, { door: "NotesApi.update" }],
            run: async ({ tx }, args) => {
                const id = text(args.note);
                await coded(() => {
                    tx.notes.update(id, { text: text(args.text) });
                });
                return ok(undefined, { note: id });
            },
        },
        {
            name: "remove",
            summary: "Remove a note.",
            fields: { note },
            effect: "write",
            reaches: [{ op: "note.remove" }, { door: "NotesApi.remove" }],
            run: async ({ tx }, args) => {
                const id = text(args.note);
                await coded(() => {
                    tx.notes.remove(id);
                });
                return ok(undefined, { note: id });
            },
        },
        {
            name: "list",
            summary: "The notes, with their targets.",
            fields: {},
            effect: "read",
            reaches: [{ door: "NotesApi.list" }, { door: "NotesApi.counts" }, { door: "NotesApi.authors" }],
            run: ({ tx }) =>
                Promise.resolve(
                    ok(
                        tx.notes
                            .list()
                            .slice(0, 50)
                            .map((each) => compactRecord({ ...each })),
                        { ...tx.notes.counts(), authors: [...tx.notes.authors()] },
                    ),
                ),
        },
        {
            name: "get",
            summary: "One note and its status.",
            fields: { note },
            effect: "read",
            reaches: [{ door: "NotesApi.get" }, { door: "NotesApi.status" }],
            run: ({ tx }, args) => {
                const id = text(args.note);
                const found = tx.notes.get(id);
                if (found === undefined) {
                    throw new ToolRefusal("AI_UNKNOWN_ENTRY", {
                        kind: "note",
                        name: id,
                        didYouMean: tx.notes
                            .list()
                            .slice(0, 5)
                            .map((each) => each.id),
                    });
                }

                return Promise.resolve(ok({ note: toJson(found), status: toJson(tx.notes.status(id)) }));
            },
        },
    ] satisfies ActionSpec[],
};
