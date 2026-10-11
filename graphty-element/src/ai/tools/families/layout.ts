/**
 * @file `layout`: where nodes sit. A catalog layout (with any of its engines), a layout scoped to
 * some nodes, pins, and positions written outright.
 */

import { z } from "zod";

import { layoutEntry, layoutIdForEngine } from "../../../catalog/layouts";
import type { LayoutDescriptor, OptionDescriptor } from "../../../catalog/types";
import { idsOf, MAX_ITEMS, MAX_STRING, requireTarget, scopeOf, targetFields, text } from "../fields";
import { checkOptions } from "../optionSchema";
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
 * The options a layout takes on one of its engines: each engine has its own vocabulary.
 * @param descriptor - The layout.
 * @param engine - The engine, or its default when absent.
 * @returns The engine's options.
 */
export function engineOptionsOf(descriptor: LayoutDescriptor, engine?: string): readonly OptionDescriptor[] {
    const wanted = engine ?? descriptor.engine;
    return (
        layoutEntry(descriptor.id)?.implementations.find((each) => each.engine === wanted)?.options ??
        descriptor.options
    );
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

/** A coordinate a call may place a node at: far past any graph's extent, finite on any renderer. */
const coordinate = z.number().min(-1e6).max(1e6);

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
                { options: "engines" },
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

                // Checked against the chosen engine's own options; a node option by id or label.
                const options = checkOptions(
                    tx,
                    engineOptionsOf(layout, engine),
                    (args.options ?? {}) as Record<string, unknown>,
                );
                await coded(() =>
                    tx.layout.set(layout.id, {
                        ...(engine === undefined ? {} : { engine }),
                        ...(args.options === undefined ? {} : { options }),
                    }),
                );
                return ok(undefined, { layout: tx.layout.id, engine: tx.layout.engine });
            },
        },
        {
            name: "scope",
            summary: "move only the target",
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
            reaches: [{ door: "SessionPositions.unpin" }, { door: "SessionPositions.pinned" }, { op: "positions.pin" }],
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
                            x: coordinate,
                            y: coordinate,
                            z: coordinate.optional(),
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
