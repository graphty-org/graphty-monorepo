/**
 * @file `layout`: where nodes sit. A catalog layout (with any of its engines), a layout scoped to
 * some nodes, pins, and positions written outright.
 */

import { z } from "zod";

import { layoutEntry, layoutIdForEngine } from "../../../catalog/layouts";
import type { LayoutDescriptor } from "../../../catalog/types";
import { idsOf, MAX_ITEMS, MAX_STRING, requireTarget, scopeOf, targetFields, text } from "../fields";
import { optionsSchema } from "../optionSchema";
import { suggest } from "../search";
import { type ActionSpec, type CatalogView, type ToolDefinition, ToolRefusal } from "../types";
import { coded, nameField, ok } from "./common";

/**
 * Every engine a layout can run on: its default and its alternatives.
 * @param descriptor - The layout.
 * @returns The engine names.
 */
export function enginesOf(descriptor: LayoutDescriptor): string[] {
    const entry = layoutEntry(descriptor.id);
    return entry === undefined ? [descriptor.engine] : entry.implementations.map((each) => each.engine);
}

/**
 * The layout a name means: a catalog id, or an engine name ("d3", "forceatlas2").
 * @param name - The name.
 * @param layouts - The catalog's layouts.
 * @returns The layout and the engine named, if one was.
 */
function layoutOf(name: string, layouts: readonly LayoutDescriptor[]): { layout: LayoutDescriptor; engine?: string } {
    const lower = name.toLowerCase().replaceAll("_", "-");
    const direct = layouts.find((each) => each.id === name || each.id.toLowerCase() === lower);
    if (direct !== undefined) {
        return { layout: direct };
    }

    const id = layoutIdForEngine(lower);
    const byEngine = layouts.find((each) => each.id === id);
    if (byEngine !== undefined) {
        return { layout: byEngine, engine: lower };
    }

    throw new ToolRefusal("AI_UNKNOWN_ENTRY", {
        kind: "layout",
        name,
        didYouMean: suggest(name, [...layouts.map((each) => each.id), ...layouts.flatMap(enginesOf)]),
    });
}

/**
 * The `layout` tool for a catalog.
 * @param catalog - The catalog.
 * @returns The tool.
 */
export function layoutTool(catalog: CatalogView): ToolDefinition {
    const ids = catalog.layouts.map((each) => each.id);
    const engines = [...new Set(catalog.layouts.flatMap(enginesOf))];
    const actions: ActionSpec[] = [
        {
            name: "set",
            summary: "layout by name",
            fields: {
                name: nameField(ids, "Layout."),
                engine: z
                    .string()
                    .max(100)
                    .optional()
                    .describe("An engine of the layout (catalog describe); default its own."),
                options: z
                    .record(z.string(), z.unknown())
                    .optional()
                    .describe("Layout options: catalog describe kind layout."),
            },
            effect: "write",
            reaches: [
                { op: "layout.set" },
                { door: "SessionLayout.set" },
                { options: "layouts" },
                ...ids.map((id) => ({ catalog: `layouts/${id}` })),
                ...engines.map((engine) => ({ catalog: `engines/${engine}` })),
            ],
            prepare: (args) => {
                if (typeof args.name !== "string") {
                    return args;
                }

                try {
                    const { layout, engine } = layoutOf(args.name, catalog.layouts);
                    return {
                        ...args,
                        name: layout.id,
                        ...(engine === undefined || args.engine !== undefined ? {} : { engine }),
                    };
                } catch {
                    return args;
                }
            },
            run: async ({ tx }, args) => {
                const { layout } = layoutOf(text(args.name), catalog.layouts);
                const engine = args.engine as string | undefined;
                if (engine !== undefined && !enginesOf(layout).includes(engine)) {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "engine", allowed: enginesOf(layout) });
                }

                const parsed = optionsSchema(layout.options).schema.safeParse(args.options ?? {});
                if (!parsed.success) {
                    const issue = parsed.error.issues[0];
                    throw new ToolRefusal(
                        issue.code === "too_big" || issue.code === "too_small"
                            ? "AI_ARG_OUT_OF_RANGE"
                            : "AI_ARG_INVALID",
                        {
                            path: `options.${issue.code === "unrecognized_keys" ? issue.keys[0] : issue.path.join(".")}`,
                            allowed: layout.options
                                .filter((option) => option.internal !== true)
                                .map((option) => option.name),
                        },
                    );
                }

                await coded(() =>
                    tx.layout.set(layout.id, {
                        ...(engine === undefined ? {} : { engine }),
                        ...(args.options === undefined ? {} : { options: parsed.data }),
                    }),
                );
                return ok(undefined, { layout: tx.layout.id, engine: tx.layout.engine });
            },
        },
        {
            name: "scope",
            summary: "move only the target; all = everything",
            fields: targetFields,
            effect: "write",
            reaches: [{ op: "layout.scope" }],
            run: async ({ tx }, args) => {
                const { target, notes } = requireTarget(tx, args, "node");

                await coded(() => tx.execute({ op: "layout.scope", scope: scopeOf(target) }));
                return ok(undefined, notes);
            },
        },
        {
            name: "pin",
            summary: "hold nodes still",
            fields: targetFields,
            effect: "write",
            reaches: [{ op: "positions.pin" }, { door: "SessionPositions.pin" }],
            run: async ({ tx }, args) => {
                const { target, notes } = requireTarget(tx, args, "node");
                const { ids } = idsOf(tx, target, "node", MAX_ITEMS);
                await coded(() => tx.positions.pin(ids));
                return ok(undefined, { ...notes, pinned: ids.length });
            },
        },
        {
            name: "unpin",
            summary: "",
            fields: targetFields,
            effect: "write",
            reaches: [{ door: "SessionPositions.unpin" }, { door: "SessionPositions.pinned" }],
            run: async ({ tx }, args) => {
                const { target, notes } = requireTarget(tx, args, "node");
                const { ids } =
                    target.kind === "all"
                        ? { ids: [...tx.positions.pinned].map(String) }
                        : idsOf(tx, target, "node", MAX_ITEMS);
                await coded(() => tx.positions.unpin(ids));
                return ok(undefined, { ...notes, unpinned: ids.length });
            },
        },
        {
            name: "set_positions",
            summary: "x, y, z per node",
            fields: {
                positions: z
                    .array(
                        z.strictObject({
                            id: z.string().max(MAX_STRING),
                            x: z.number(),
                            y: z.number(),
                            z: z.number().optional(),
                        }),
                    )
                    .max(MAX_ITEMS)
                    .describe("[{id, x, y, z?}]"),
            },
            effect: "write",
            reaches: [{ op: "positions.set" }, { door: "SessionPositions.set" }],
            run: async ({ tx }, args) => {
                const positions = args.positions as { id: string; x: number; y: number; z?: number }[];
                await coded(() => tx.positions.set(positions));
                return ok(undefined, { placed: positions.length });
            },
        },
    ];
    return {
        name: "layout",
        plainName: "Layout",
        core: true,
        description: "Arranges nodes: layouts, scope, pins, positions. 2D or 3D: view.",
        example: { action: "set", name: "circular" },
        actions,
    };
}
