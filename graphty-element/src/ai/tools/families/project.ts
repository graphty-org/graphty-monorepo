/**
 * @file `project`, `capture` and `immersive`: the project's settings and name, pictures and video
 * of the graph (handed to the host, never to the model), and VR and AR. All three are on-demand.
 */

import { z } from "zod";

import type { MeasurementDeclaration } from "../../../catalog/types";
import type { ProjectConfigPatch } from "../../../session/types";
import { MAX_STRING, text } from "../fields";
import { type ActionContext, type ActionSpec, type ToolDefinition, ToolRefusal } from "../types";
import { coded, ok } from "./common";

/**
 * The project's setting groups, each a field of `config.set`. The session validates the values;
 * each group is a catalog entry `catalog` search finds.
 */
export const SETTING_GROUPS = Object.freeze({
    background: "The background color or skybox behind the graph.",
    selectionStyle: "How selected nodes and edges are drawn.",
    layoutBehavior: "Whether the layout restarts on edits and how it settles.",
    runAlgorithmsOnLoad: "Whether the configured algorithms run when data loads.",
    data: "How records are read: the id, label, endpoint and weight columns, direction.",
    author: "The project's author.",
    name: "The project's name.",
} as const);

const settings = {
    background: z.record(z.string(), z.unknown()).optional().describe(SETTING_GROUPS.background),
    selectionStyle: z.record(z.string(), z.unknown()).optional().describe(SETTING_GROUPS.selectionStyle),
    layoutBehavior: z.record(z.string(), z.unknown()).optional().describe(SETTING_GROUPS.layoutBehavior),
    runAlgorithmsOnLoad: z.boolean().optional().describe(SETTING_GROUPS.runAlgorithmsOnLoad),
    data: z.record(z.string(), z.unknown()).optional().describe(SETTING_GROUPS.data),
    author: z.string().max(200).optional().describe(SETTING_GROUPS.author),
    name: z.string().max(200).optional().describe(SETTING_GROUPS.name),
};

/** The `project` tool. */
export const projectTool: ToolDefinition = {
    name: "project",
    plainName: "Project",
    core: false,
    description:
        "Project settings (background, selection style, layout behavior, data columns, direction), its name, what a column measures, and whether it has unsaved changes. Saving is the reader's application's.",
    example: { action: "settings", background: { backgroundType: "color", color: "#101010" } },
    actions: [
        {
            name: "settings",
            summary: "Change project settings; only the groups given change.",
            fields: settings,
            effect: "write",
            reaches: [
                { op: "config.set" },
                { door: "SessionConfig.set" },
                ...Object.keys(SETTING_GROUPS).map((key) => ({ catalog: `settings/${key}` })),
            ],
            run: async ({ tx }, args) => {
                const patch = Object.fromEntries(Object.entries(args).filter(([key]) => key in SETTING_GROUPS));
                if (Object.keys(patch).length === 0) {
                    throw new ToolRefusal("AI_ARG_INVALID", { path: "settings", allowed: Object.keys(SETTING_GROUPS) });
                }

                await coded(() => tx.config.set(patch as ProjectConfigPatch));
                return ok(undefined, { changed: Object.keys(patch).join(",") });
            },
        },
        {
            name: "rename",
            summary: "Rename the project.",
            fields: { name: z.string().max(200).describe("The new name.") },
            effect: "write",
            reaches: [{ door: "ProjectApi.rename" }],
            run: async ({ tx }, args) => {
                await coded(() => tx.project.rename(text(args.name)));
                return ok(undefined, { name: text(args.name) });
            },
        },
        {
            name: "declare",
            summary: "Say what an attribute measures, so it is colored and binned right.",
            fields: {
                column: z.string().max(200).describe("Attribute name."),
                on: z.enum(["node", "edge"]).optional().describe("Default node."),
                measurement: z.enum(["categorical", "quantitative", "time", "ordinal"]).describe("What it measures."),
                order: z
                    .array(z.union([z.string().max(MAX_STRING), z.number()]))
                    .max(100)
                    .optional()
                    .describe("For ordinal: the order."),
            },
            effect: "write",
            reaches: [{ op: "data.declare" }, { door: "SessionDataApi.declare" }],
            run: async ({ tx }, args) => {
                const kind = args.on === "edge" ? "edge" : "node";
                const name = text(args.column).replace(/^data\./, "");
                const declaration: MeasurementDeclaration =
                    args.measurement === "ordinal"
                        ? { measurement: "ordinal", order: (args.order ?? []) as (string | number)[] }
                        : { measurement: args.measurement as "categorical" | "quantitative" | "time" };
                await coded(() => tx.data.declare({ kind, name }, declaration));
                return ok(undefined, { column: name, measurement: declaration.measurement });
            },
        },
        {
            name: "status",
            summary: "The project's name, settings, unsaved changes and undo depth.",
            fields: {},
            effect: "read",
            reaches: [
                { door: "ProjectApi.name" },
                { door: "ProjectApi.dirty" },
                { door: "SessionConfig.background" },
                { door: "SessionConfig.selectionStyle" },
                { door: "SessionConfig.layoutBehavior" },
                { door: "SessionConfig.runAlgorithmsOnLoad" },
                { door: "SessionConfig.data" },
                { door: "SessionConfig.author" },
                { door: "SessionConfig.name" },
            ],
            run: ({ tx, session }) =>
                Promise.resolve(
                    ok({
                        name: tx.project.name,
                        dirty: tx.project.dirty,
                        undoable: session.history.position,
                        background: tx.config.background,
                        layoutBehavior: tx.config.layoutBehavior,
                        runAlgorithmsOnLoad: tx.config.runAlgorithmsOnLoad,
                        data: tx.config.data,
                    }),
                ),
        },
    ] satisfies ActionSpec[],
};

/** What only the renderer captures. */
interface Capturer {
    captureScreenshot(
        options: object,
    ): Promise<{ blob: Blob; metadata: { width: number; height: number; format: string; byteSize: number } }>;
    captureAnimation(
        options: object,
    ): Promise<{ blob: Blob; metadata: { width: number; height: number; format: string; duration: number } }>;
    cancelAnimationCapture(): boolean;
    isVRSupported(): Promise<boolean>;
    isARSupported(): Promise<boolean>;
}

/**
 * The renderer, or a refusal in a headless session.
 * @param context - The action's context.
 * @param member - The member needed.
 * @returns The renderer.
 */
function capturer(context: ActionContext, member: keyof Capturer): Capturer {
    const graph = context.graph as unknown as Partial<Capturer>;
    if (typeof graph[member] !== "function") {
        throw new ToolRefusal("AI_NOT_AVAILABLE", { name: member, requirement: "renderer" });
    }

    return graph as Capturer;
}

const side = z.number().int().min(16).max(4096).optional().describe("Pixels, at most 4096.");

/** The `capture` tool. */
export const captureTool: ToolDefinition = {
    name: "capture",
    plainName: "Capture",
    core: false,
    description:
        "Takes a picture or records a short video of the graph and hands it to the reader's application. You receive only its size.",
    example: { action: "screenshot", width: 1600, height: 900 },
    actions: [
        {
            name: "screenshot",
            summary: "Capture a still picture.",
            fields: {
                width: side,
                height: side,
                format: z.enum(["png", "jpeg", "webp"]).optional().describe("Default png."),
            },
            effect: "read",
            reaches: [{ door: "Graph.captureScreenshot" }],
            run: async (context, args) => {
                const result = await coded(() =>
                    capturer(context, "captureScreenshot").captureScreenshot({
                        ...(args.width === undefined ? {} : { width: args.width }),
                        ...(args.height === undefined ? {} : { height: args.height }),
                        ...(args.format === undefined ? {} : { format: args.format }),
                    }),
                );
                context.host.emit({
                    type: "ai-export-ready",
                    format: result.metadata.format,
                    data: result.blob,
                    losses: [],
                });
                const { width, height, format, byteSize } = result.metadata;
                return ok(undefined, { format, width, height, bytes: byteSize });
            },
        },
        {
            name: "animation",
            summary: "Record a short video while the camera and layout move.",
            fields: {
                seconds: z.number().min(1).max(30).describe("How long, 1 to 30 seconds."),
                width: side,
                height: side,
            },
            effect: "read",
            reaches: [{ door: "Graph.captureAnimation" }],
            run: async (context, args) => {
                const result = await coded(() =>
                    capturer(context, "captureAnimation").captureAnimation({
                        duration: Number(args.seconds) * 1000,
                        ...(args.width === undefined ? {} : { width: args.width }),
                        ...(args.height === undefined ? {} : { height: args.height }),
                    }),
                );
                context.host.emit({
                    type: "ai-export-ready",
                    format: result.metadata.format,
                    data: result.blob,
                    losses: [],
                });
                const { width, height, format } = result.metadata;
                return ok(undefined, { format, width, height, bytes: result.blob.size });
            },
        },
        {
            name: "cancel",
            summary: "Stop a video recording.",
            fields: {},
            effect: "exempt",
            reaches: [{ door: "Graph.cancelAnimationCapture" }],
            run: (context) =>
                Promise.resolve(
                    ok(undefined, { cancelled: capturer(context, "cancelAnimationCapture").cancelAnimationCapture() }),
                ),
        },
    ] satisfies ActionSpec[],
};

/** The `immersive` tool. */
export const immersiveTool: ToolDefinition = {
    name: "immersive",
    plainName: "VR and AR",
    core: false,
    description: "Enters or leaves virtual or augmented reality, and says whether this device supports them.",
    example: { action: "enter", mode: "vr" },
    actions: [
        {
            name: "enter",
            summary: "Enter VR or AR.",
            fields: { mode: z.enum(["vr", "ar"]).describe("vr or ar.") },
            effect: "exempt",
            reaches: [{ op: "view.immersive" }],
            run: async ({ tx }, args) => {
                await coded(() => tx.execute({ op: "view.immersive", mode: args.mode as "vr" | "ar" }));
                return ok(undefined, { mode: text(args.mode) });
            },
        },
        {
            name: "exit",
            summary: "Leave VR or AR.",
            fields: {},
            effect: "exempt",
            reaches: [{ op: "view.immersive" }],
            run: async ({ tx }) => {
                await coded(() => tx.execute({ op: "view.immersive", mode: null }));
                return ok();
            },
        },
        {
            name: "support",
            summary: "Whether this device can enter VR and AR.",
            fields: {},
            effect: "read",
            reaches: [{ door: "Graph.isVRSupported" }, { door: "Graph.isARSupported" }],
            run: async (context) => {
                const graph = capturer(context, "isVRSupported");
                return ok({ vr: await graph.isVRSupported(), ar: await graph.isARSupported() });
            },
        },
    ] satisfies ActionSpec[],
};
