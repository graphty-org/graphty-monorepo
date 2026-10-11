/**
 * @file `view`: the camera, 2D or 3D, and saved views. Moving the camera is not saved in a project
 * and adds no undo step; switching dimension and saving a view do.
 */

import { z } from "zod";

import type { CameraState } from "../../../camera/types";
import { MAX_STRING, scopeOf, settleTarget, targetFields, text } from "../fields";
import { type ActionContext, type ActionSpec, type CatalogView, type ToolDefinition, ToolRefusal } from "../types";
import { coded, nameField, ok } from "./common";

/** What only the renderer does for a view. */
interface Renderer {
    applyCameraView(id: string, options?: { scope?: unknown; animate?: boolean }): Promise<void>;
    getCameraState(): CameraState;
}

/**
 * The renderer behind a graph, or a refusal when there is none (a headless session).
 * @param context - The action's context.
 * @returns The renderer.
 */
function renderer(context: ActionContext): Renderer {
    const graph = context.graph as unknown as Partial<Renderer>;
    if (typeof graph.applyCameraView !== "function" || typeof graph.getCameraState !== "function") {
        throw new ToolRefusal("AI_NOT_AVAILABLE", { name: "camera", requirement: "renderer" });
    }

    return graph as Renderer;
}

const vec = z.array(z.number()).length(3).describe("[x, y, z]");

/**
 * A point as the camera reads one.
 * @param value - `[x, y, z]`.
 * @returns The point.
 */
function point(value: unknown): { x: number; y: number; z: number } {
    const [x, y, z] = value as [number, number, number];
    return { x, y, z };
}
const name = z.string().min(1).max(MAX_STRING).describe("The saved view's name.");

/**
 * The `view` tool for a catalog.
 * @param catalog - The catalog, for the camera views.
 * @returns The tool.
 */
export function viewTool(catalog: CatalogView): ToolDefinition {
    const cameras = catalog.cameras.map((each) => each.id);
    const actions: ActionSpec[] = [
        {
            name: "dimension",
            summary: "",
            fields: { dimension: z.enum(["2d", "3d"]).describe("2d or 3d.") },
            effect: "write",
            reaches: [{ op: "view.dimension" }, { door: "SessionLayout.setDimension" }],
            run: async ({ tx }, args) => {
                await coded(() => tx.layout.setDimension(args.dimension as "2d" | "3d"));
                return ok(undefined, { dimension: tx.layout.dimension });
            },
        },
        {
            name: "camera",
            summary: "camera view or position",
            fields: {
                preset: nameField(cameras, "Camera view or saved view.").optional(),
                position: vec.optional(),
                target: vec.optional(),
            },
            effect: "exempt",
            reaches: [{ op: "view.camera" }, ...cameras.map((id) => ({ catalog: `cameras/${id}` }))],
            run: async ({ tx }, args) => {
                if (args.preset === undefined && args.position === undefined && args.target === undefined) {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "preset", allowed: cameras });
                }

                await coded(() =>
                    tx.execute({
                        op: "view.camera",
                        ...(args.preset === undefined ? {} : { preset: text(args.preset) }),
                        ...(args.position === undefined ? {} : { position: point(args.position) }),
                        ...(args.target === undefined ? {} : { target: point(args.target) }),
                        animate: true,
                    }),
                );
                return ok(undefined, args.preset === undefined ? {} : { preset: text(args.preset) });
            },
        },
        {
            name: "zoom_to",
            summary: "frame the target",
            fields: targetFields,
            effect: "exempt",
            reaches: [{ door: "Graph.applyCameraView" }, { door: "Graph.zoomToNodes" }],
            run: async (context, args) => {
                const { target, notes } = settleTarget(context.tx, args, "node", true);
                await coded(() =>
                    renderer(context).applyCameraView("fitToGraph", {
                        ...(target === undefined || target.kind === "all" ? {} : { scope: scopeOf(target) }),
                        animate: true,
                    }),
                );
                return ok(undefined, notes);
            },
        },
        {
            name: "fit",
            summary: "",
            fields: {},
            effect: "exempt",
            reaches: [{ door: "Graph.zoomToFit" }],
            run: async (context) => {
                await coded(() => renderer(context).applyCameraView("fitToGraph", { animate: true }));
                return ok();
            },
        },
        {
            name: "save",
            summary: "save the camera as a name",
            fields: { name },
            effect: "write",
            reaches: [{ op: "view.save" }, { door: "SessionViews.save" }, { door: "Graph.getCameraState" }],
            run: async (context, args) => {
                const camera = renderer(context).getCameraState();
                await coded(() => context.tx.views.save([{ name: text(args.name), camera }]));
                return ok(undefined, { name: text(args.name) });
            },
        },
        {
            name: "restore",
            summary: "go to a saved view",
            fields: { name },
            effect: "exempt",
            reaches: [{ op: "view.camera" }],
            run: async ({ tx }, args) => {
                const saved = text(args.name);
                if (!tx.views.has(saved)) {
                    throw new ToolRefusal("AI_UNKNOWN_ENTRY", {
                        kind: "view",
                        name: saved,
                        didYouMean: [...tx.views.keys()].slice(0, 10),
                    });
                }

                await coded(() => tx.execute({ op: "view.camera", preset: saved, animate: true }));
                return ok(undefined, { name: saved });
            },
        },
        {
            name: "remove_saved",
            summary: "delete a saved view",
            fields: { name },
            effect: "write",
            reaches: [{ op: "view.remove" }, { door: "SessionViews.remove" }],
            run: async ({ tx }, args) => {
                const saved = text(args.name);
                if (!tx.views.has(saved)) {
                    throw new ToolRefusal("AI_UNKNOWN_ENTRY", {
                        kind: "view",
                        name: saved,
                        didYouMean: [...tx.views.keys()].slice(0, 10),
                    });
                }

                await coded(() => tx.views.remove([saved]));
                return ok(undefined, { name: saved });
            },
        },
        {
            name: "list_saved",
            summary: "saved and camera views",
            fields: {},
            effect: "read",
            reaches: [],
            run: ({ tx }) => Promise.resolve(ok({ saved: [...tx.views.keys()], cameras })),
        },
    ];
    return {
        name: "view",
        plainName: "View",
        core: true,
        description: "The camera (not undoable), 2D or 3D, saved views.",
        example: { action: "zoom_to", where: "data.type == 'server'" },
        actions,
    };
}
