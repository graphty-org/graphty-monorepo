/**
 * Camera Commands Module - Commands for controlling the camera.
 * @module ai/commands/CameraCommands
 */

import jmespath from "jmespath";
import { z } from "zod";

import { registeredCameraDescriptors } from "../../catalog/cameraRegistry";
import { CAMERA_DESCRIPTORS,cameraDescriptor } from "../../catalog/cameras";
import type { Graph } from "../../Graph";
import type { CommandResult, GraphCommand } from "./types";

/**
 * Every camera view that can be named right now, the element's own first.
 *
 * Read at call time rather than captured at import time, because a third party's view is
 * registered while the page is running: a list baked into a schema when this module loaded could
 * never name one.
 * @returns The view names.
 */
function cameraViewNames(): string[] {
    return [
        ...CAMERA_DESCRIPTORS.map((descriptor) => descriptor.id),
        ...registeredCameraDescriptors().map((descriptor) => descriptor.id),
    ];
}

/*
 * THE PARAMETER IS A STRING, NOT AN ENUM, AND THAT IS THE POINT. It used to be a Zod enum spread
 * from the five built-in names and then re-validated against the same array, so a registered
 * camera view could not be named here even once registration existed. The names the element
 * ships are still listed in the description, where they guide the model; the refusal below reads
 * the catalogue, so a view a third party registered is offerable and nameable.
 */
const CameraPresetSchema = z
    .string()
    .describe(
        "Named camera view. The element ships 'fitToGraph', 'topView', 'sideView', 'frontView' and " +
            "'isometric'; an application may have registered others.",
    );

/**
 * 3D position schema.
 */
const Position3DSchema = z
    .object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
    })
    .describe("3D position coordinates");

/**
 * Command to set the camera position or apply a preset.
 */
export const setCameraPosition: GraphCommand = {
    name: "setCameraPosition",
    /*
     * READ AT PROMPT TIME, NOT AT IMPORT TIME. The description is what the system prompt shows
     * the model, and a fixed sentence naming the element's own five views is the only place the
     * model ever learns a view name from -- so a registered view was nameable and never offered.
     * A getter satisfies the same `readonly description: string` the command type declares and
     * is evaluated each time the prompt is built, which is after a page's plugins have
     * registered.
     */
    get description(): string {
        return (
            `Set the camera position using a preset (${cameraViewNames().join(", ")}) or specific coordinates. ` +
            "Presets automatically calculate the best view for the current graph. " +
            "Animation can be enabled for smooth transitions."
        );
    },
    parameters: z.object({
        preset: CameraPresetSchema.optional().describe("Named camera preset to apply"),
        position: Position3DSchema.optional().describe("Custom camera position (3D only)"),
        target: Position3DSchema.optional().describe("Point the camera should look at (3D only)"),
        animate: z.boolean().optional().describe("Whether to animate the camera transition (default: true)"),
    }),
    examples: [
        { input: "Show from top", params: { preset: "topView", animate: true } },
        { input: "View from the side", params: { preset: "sideView" } },
        { input: "Show front view", params: { preset: "frontView" } },
        { input: "Isometric view", params: { preset: "isometric" } },
        { input: "Fit all nodes in view", params: { preset: "fitToGraph" } },
        {
            input: "Move camera to position",
            params: { position: { x: 10, y: 20, z: 30 }, target: { x: 0, y: 0, z: 0 } },
        },
    ],

    async execute(graph: Graph, params: Record<string, unknown>): Promise<CommandResult> {
        const {
            preset,
            position,
            target,
            animate = true,
        } = params as {
            preset?: string;
            position?: { x: number; y: number; z: number };
            target?: { x: number; y: number; z: number };
            animate?: boolean;
        };

        try {
            // Validate we have either a preset or position
            if (!preset && !position) {
                return {
                    success: false,
                    message: "Either 'preset' or 'position' must be provided.",
                };
            }

            // Use preset if provided
            if (preset) {
                // Validate against the catalogue rather than a fixed list, so a registered view
                // is as nameable here as a built-in one.
                if (!cameraDescriptor(preset)) {
                    return {
                        success: false,
                        message: `Unknown camera view "${preset}". Available views: ${cameraViewNames().join(", ")}.`,
                    };
                }

                // Apply the preset
                await graph.setCameraState({ preset }, { animate, description: `Setting camera to ${preset} view` });

                return {
                    success: true,
                    message: `Camera moved to ${preset} view${animate ? " (animated)" : ""}.`,
                    data: { preset, animated: animate },
                };
            }

            // Use custom position
            if (position) {
                const cameraState: {
                    position: { x: number; y: number; z: number };
                    target?: { x: number; y: number; z: number };
                } = { position };
                if (target) {
                    cameraState.target = target;
                }

                await graph.setCameraState(cameraState, {
                    animate,
                    description: "Moving camera to specified position",
                });

                return {
                    success: true,
                    message: `Camera moved to position (${position.x}, ${position.y}, ${position.z})${animate ? " (animated)" : ""}.`,
                    data: { position, target, animated: animate },
                };
            }

            return {
                success: false,
                message: "No camera state specified.",
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to set camera position: ${(error as Error).message}`,
            };
        }
    },
};

/**
 * Find nodes matching a JMESPath selector (reused from StyleCommands).
 * @param graph - The graph instance
 * @param selector - JMESPath selector string
 * @returns Array of matching node IDs
 */
function findMatchingNodeIds(graph: Graph, selector: string): string[] {
    const dataManager = graph.getDataManager();
    const { nodes } = dataManager;
    const matchingIds: string[] = [];

    // Empty selector matches all nodes
    if (!selector || selector.length === 0) {
        for (const [id] of nodes) {
            matchingIds.push(String(id));
        }

        return matchingIds;
    }

    // Try JMESPath matching
    // Wrap data in array so we can use JMESPath filter expression [?condition]
    try {
        // Normalize selector: JMESPath npm library only supports single quotes for string literals,
        // not double quotes. LLMs like Anthropic send double quotes, so convert them.
        const normalizedSelector = selector.replace(/"/g, "'");
        const query = `[?${normalizedSelector}]`;

        for (const [id, node] of nodes) {
            const { data } = node;
            // Use JMESPath filter syntax: [?selector] returns array of matches
            const searchResult = jmespath.search([data], query);
            if (Array.isArray(searchResult) && searchResult.length > 0) {
                matchingIds.push(String(id));
            }
        }
    } catch {
        // Invalid JMESPath, return empty array
        return [];
    }

    return matchingIds;
}

/**
 * Command to zoom the camera to fit specific nodes.
 */
export const zoomToNodes: GraphCommand = {
    name: "zoomToNodes",
    description:
        "Zoom the camera to fit specific nodes in view. Use a JMESPath selector to choose which nodes to focus on, or leave empty to fit all nodes. Optionally add padding around the nodes.",
    parameters: z.object({
        selector: z.string().optional().describe("JMESPath expression to match nodes (empty matches all)"),
        animate: z.boolean().optional().describe("Whether to animate the zoom (default: true)"),
        padding: z.number().optional().describe("Extra padding around nodes (default: 1.2 = 20% padding)"),
    }),
    examples: [
        { input: "Zoom to fit all nodes", params: { selector: "" } },
        { input: "Zoom to server nodes", params: { selector: "type == 'server'" } },
        { input: "Fit graph with more padding", params: { selector: "", padding: 1.5 } },
    ],

    async execute(graph: Graph, params: Record<string, unknown>): Promise<CommandResult> {
        const { selector = "", animate = true } = params as {
            selector?: string;
            animate?: boolean;
            padding?: number;
        };

        try {
            // Find matching nodes
            const matchingIds = findMatchingNodeIds(graph, selector);

            if (matchingIds.length === 0 && selector && selector.length > 0) {
                return {
                    success: true,
                    message: `No nodes matched the selector "${selector}".`,
                    affectedNodes: [],
                };
            }

            // Frame the matched nodes and nothing else. A camera view is handed the box the
            // element measured rather than measuring one itself, so scoping the box is all it
            // takes -- which is why this used to fit the whole graph and no longer does.
            await graph.applyCameraView("fitToGraph", {
                ...(selector && selector.length > 0 ? { scope: { nodes: matchingIds } } : {}),
                animate,
                description: `Zooming to fit ${selector ? "matching nodes" : "all nodes"}`,
            });

            const nodeCount = selector ? matchingIds.length : graph.getNodeCount();
            return {
                success: true,
                message: `Zoomed to fit ${nodeCount} node(s)${selector ? ` matching "${selector}"` : ""}.`,
                affectedNodes: matchingIds,
                data: { nodeCount, animated: animate },
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to zoom to nodes: ${(error as Error).message}`,
            };
        }
    },
};
