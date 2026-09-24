/**
 * Style Commands Module - Commands for styling graph nodes and edges.
 *
 * WHAT A STYLE COMMAND PRODUCES. One layer on `session.styles`, addressed by the id the element
 * mints for it. A layer's selector is an expression in the element's own selector language -- a
 * declared subset of JMESPath, compiled once when the layer is added -- so a selector the element
 * refuses is refused HERE, in front of the person who asked, with the character it went wrong at.
 * The previous implementation ran `jmespath.search()` once per element to guess at a match count
 * and turned an unparseable selector into an empty array, which reached the reader as "no nodes
 * matched" -- the same words a correct answer of zero uses.
 *
 * PATHS ARE SPELLED THE WAY THE ELEMENT SPELLS THEM. A record's own fields are published under
 * `data.`, so a selector reads `data.type == 'server'`. That is what `session.data.attributes()`
 * reports and what a layer, a filter and a legend all use.
 * @module ai/commands/StyleCommands
 */

import { z } from "zod";

import type { Channel, ChannelValue, LayerSource, LayerSpec, StaticStyle } from "../../catalog/types";
import { isGraphtyError } from "../../errors";
import type { Graph } from "../../Graph";
import { NODE_OUTLINE_CAVEAT } from "../../session/styles/channels";
import type { CommandResult, GraphCommand } from "./types";

/**
 * One property a request named that the element cannot carry out, and the reason it cannot.
 *
 * THE REASON IS THE POINT. A refusal with no reason -- "outlineWidth is unsupported" -- leaves
 * the person who asked with nothing to do next, and leaves the model that relayed it free to
 * guess: try a bigger number, try a different word, try it on the edges. So nothing goes in this
 * list without a sentence saying what the element draws instead and why, and the sentence is the
 * element's OWN published words for it rather than a second wording invented here.
 */
interface UnsupportedProperty {
    /** The property as the request spelled it. */
    readonly property: string;
    /** Why no channel can carry it, in the words the channel table publishes. */
    readonly reason: string;
}

/**
 * Schema for node style properties that can be applied via AI commands.
 * Uses simplified property names that map to the element's style channels.
 */
const NodeStyleParamsSchema = z
    .object({
        color: z.string().optional().describe("Color for the node (e.g., '#ff0000', 'red')"),
        size: z.number().positive().optional().describe("Size of the node (default is 1)"),
        shape: z.string().optional().describe("Shape type (e.g., 'sphere', 'box', 'cylinder')"),
        glowColor: z.string().optional().describe("Glow effect color"),
        glowStrength: z
            .number()
            .positive()
            .optional()
            .describe("Glow effect strength. One strength is drawn at a time for the whole scene"),
        outlineColor: z.string().optional().describe("Outline color"),
        outlineWidth: z
            .number()
            .positive()
            .optional()
            .describe(
                "Outline width. Not drawn: every outline in the scene is stroked at one width, " +
                    "so asking for this is answered with the reason rather than applied",
            ),
        enabled: z.boolean().optional().describe("Whether the node is visible"),
    })
    .describe("Style properties for nodes");

/**
 * Schema for edge style properties that can be applied via AI commands.
 * Uses simplified property names that map to the element's style channels.
 */
const EdgeStyleParamsSchema = z
    .object({
        color: z.string().optional().describe("Color for the edge line (e.g., '#00ff00', 'green')"),
        width: z.number().positive().optional().describe("Width of the edge line"),
        lineType: z.string().optional().describe("Line pattern (e.g., 'solid', 'dash', 'dot')"),
        arrowColor: z.string().optional().describe("Color for the arrow head"),
        arrowSize: z.number().positive().optional().describe("Size of the arrow head"),
        arrowOpacity: z.number().min(0).max(1).optional().describe("Opacity of the arrow head, 0 to 1"),
        enabled: z.boolean().optional().describe("Whether the edge is visible"),
    })
    .describe("Style properties for edges");

/** What the element records as the origin of every layer these commands add. */
const AI_LAYER_SOURCE: LayerSource = { by: "plugin", name: "graphty-ai" };

/**
 * Turn the simplified node parameters into literal channel values.
 *
 * ONE OF THEM HAS NO CHANNEL, and this says WHY rather than dropping it or refusing it blankly.
 * An outline is drawn by adding the node's source mesh to a Babylon highlight layer, and that
 * layer owns the stroke width for the whole scene -- so a per-node width is not a channel the
 * element has not got round to, it is a picture the renderer cannot draw. The node style declares
 * no `effect.outline.width` either, for the same reason and so that nothing accepts one and
 * quietly ignores it. The sentence that explains all this is `NODE_OUTLINE_CAVEAT`, which is
 * `node.outline`'s published caveat, so a reader who asks the catalogue and a reader who asks in
 * words get the same answer. The glow's STRENGTH used to be refused beside it and is a channel
 * now, with a caveat of its own, which is what the difference looks like when it can be closed.
 * @param params - What was asked for.
 * @returns The channel values to write, and the properties the channel set cannot express.
 */
function nodeChannels(params: z.infer<typeof NodeStyleParamsSchema>): {
    set: StaticStyle;
    unsupported: UnsupportedProperty[];
} {
    const set: Partial<Record<Channel, ChannelValue>> = {};
    const unsupported: UnsupportedProperty[] = [];

    if (params.color !== undefined) {
        set["node.color"] = params.color;
    }

    if (params.size !== undefined) {
        set["node.size"] = params.size;
    }

    if (params.shape !== undefined) {
        set["node.shape"] = params.shape;
    }

    if (params.glowColor !== undefined) {
        set["node.glow"] = params.glowColor;
    }

    if (params.glowStrength !== undefined) {
        set["node.glowStrength"] = params.glowStrength;
    }

    if (params.outlineColor !== undefined) {
        set["node.outline"] = params.outlineColor;
    }

    // "Not visible" is said as fully transparent, because hiding an element is the visibility
    // mask's job and a style layer has no spelling for it. The node keeps its place in the graph.
    if (params.enabled === false) {
        set["node.opacity"] = 0;
    }

    if (params.outlineWidth !== undefined) {
        unsupported.push({ property: "outlineWidth", reason: NODE_OUTLINE_CAVEAT });
    }

    return { set, unsupported };
}

/**
 * Turn the simplified edge parameters into literal channel values.
 *
 * NOTHING IS REFUSED HERE ANY MORE. An arrow's colour, size and opacity each have a channel of
 * their own at each end, so the three this function used to answer "unsupported" to are written
 * like everything else. They are written to the HEAD, which is what the parameters are named
 * for; a tail is drawn only when a layer asks for one.
 * @param params - What was asked for.
 * @returns The channel values to write, and the properties the channel set cannot express.
 */
function edgeChannels(params: z.infer<typeof EdgeStyleParamsSchema>): {
    set: StaticStyle;
    unsupported: UnsupportedProperty[];
} {
    const set: Partial<Record<Channel, ChannelValue>> = {};

    if (params.color !== undefined) {
        set["edge.color"] = params.color;
    }

    if (params.width !== undefined) {
        set["edge.width"] = params.width;
    }

    if (params.lineType !== undefined) {
        set["edge.style"] = params.lineType;
    }

    // See nodeChannels: transparency, not deletion.
    if (params.enabled === false) {
        set["edge.opacity"] = 0;
    }

    if (params.arrowColor !== undefined) {
        set["edge.arrowHeadColor"] = params.arrowColor;
    }

    if (params.arrowSize !== undefined) {
        set["edge.arrowHeadSize"] = params.arrowSize;
    }

    if (params.arrowOpacity !== undefined) {
        set["edge.arrowHeadOpacity"] = params.arrowOpacity;
    }

    // The pair is the shape `addLayer` takes, and the second half is empty because every edge
    // property this command accepts now has a channel. A property added to the schema above with
    // no channel to write it belongs in this list rather than being dropped.
    return { set, unsupported: [] };
}

/**
 * Common selector spellings that mean "every element".
 *
 * A model reaches for one of these when it wants the whole graph, and the element's own spelling
 * for that is `{match: "everything"}` -- never an empty expression, which is refused.
 */
const MATCH_ALL_SELECTORS = new Set(["", "*", "all", "*.*", "true"]);

/**
 * Whether a selector means "every element".
 * @param selector - The selector string as it arrived.
 * @returns True when it should become `{match: "everything"}`.
 */
function isMatchAllSelector(selector: string): boolean {
    return !selector || MATCH_ALL_SELECTORS.has(selector.toLowerCase().trim());
}

/**
 * Build the layer one style command adds.
 *
 * The selector is normalised for quotes only. The element's expression parser accepts single
 * quotes around a string literal, and a model that was trained on JSON sends double ones.
 * @param name - What to call the layer.
 * @param target - Whether it paints nodes or edges.
 * @param selector - The selector as it arrived, empty or a match-all word meaning everything.
 * @param set - The literal channel values it writes.
 * @returns The specification to hand to `session.styles.add()`.
 */
function layerSpecOf(name: string, target: "node" | "edge", selector: string, set: StaticStyle): LayerSpec {
    return {
        name,
        target,
        kind: "custom",
        source: AI_LAYER_SOURCE,
        selector: isMatchAllSelector(selector)
            ? { match: "everything" }
            : { match: "expression", where: selector.replace(/"/g, "'") },
        set,
    };
}

/**
 * Say what went wrong with a layer, in the words the element used.
 * @param error - What the style stack rejected the layer with.
 * @returns A sentence naming the problem and, for an expression, where in it the problem is.
 */
function refusalOf(error: unknown): string {
    if (isGraphtyError(error)) {
        return `${error.message} (${error.code})`;
    }

    return error instanceof Error ? error.message : String(error);
}

/**
 * Add one layer and report what happened, including what the style stack refused.
 * @param graph - The graph to add it to.
 * @param spec - The layer to add.
 * @param unsupported - The requested properties no channel can express.
 * @param subject - "node" or "edge", for the message.
 * @returns What to tell the caller.
 */
async function addLayer(
    graph: Graph,
    spec: LayerSpec,
    unsupported: readonly UnsupportedProperty[],
    subject: "node" | "edge",
): Promise<CommandResult> {
    const { styles } = graph.getSession();

    // Asked BEFORE anything is committed, because `validate` reports every problem at once with
    // the path and the character offset, while a refusal from `add` reports only the first.
    const verdict = styles.validate(spec);

    if (!verdict.ok) {
        return {
            success: false,
            message: `That ${subject} style could not be applied: ${verdict.errors
                .map((problem) => problem.message)
                .join(" ")}`,
        };
    }

    try {
        const layer = await styles.add(spec);
        // One sentence per refused property, each carrying its own reason. Joining the NAMES and
        // appending a single "no channel for these" is what this used to do, and it produced an
        // answer nobody could act on: the reader learned a word had been dropped and not what the
        // element draws instead. An empty list contributes an empty string, so an ordinary layer
        // still reads "Added the node style layer" and stops.
        const caveat = unsupported
            .map(({ property, reason }) => ` ${property} was not applied: ${reason}`)
            .join("");
        const unbound =
            verdict.unresolvedPaths.length === 0
                ? ""
                : ` Nothing in this graph answers ${verdict.unresolvedPaths.join(", ")} yet, so the layer may paint nothing until it does.`;

        return {
            success: true,
            message: `Added the ${subject} style layer "${layer.name}".${caveat}${unbound}`,
            data: { layerId: layer.id, layerName: layer.name },
        };
    } catch (error) {
        return {
            success: false,
            message: `That ${subject} style could not be applied: ${refusalOf(error)}`,
        };
    }
}

/**
 * Command to find and style nodes matching a selector.
 */
export const findAndStyleNodes: GraphCommand = {
    name: "findAndStyleNodes",
    description:
        "Style the nodes matching a selector by adding a style layer. Use an empty selector to match every node. A node's own fields are published under 'data.', so write 'data.type == \"server\"'. Styles include color, size, shape, glow color and outline color.",
    parameters: z.object({
        selector: z
            .string()
            .describe(
                "Expression matching nodes (empty string matches all). A record's own fields live under 'data.', so write 'data.type == \"server\"'.",
            ),
        style: NodeStyleParamsSchema,
        layerName: z.string().optional().describe("Name for this style layer (for later removal)"),
    }),
    examples: [
        {
            input: "Make all nodes red",
            params: { selector: "", style: { color: "#ff0000" }, layerName: "red-nodes" },
        },
        {
            input: "Highlight server nodes in blue",
            params: {
                selector: "data.type == 'server'",
                style: { color: "#0000ff", glowColor: "#0000ff" },
                layerName: "servers",
            },
        },
        {
            input: "Make nodes larger",
            params: { selector: "", style: { size: 2 }, layerName: "large-nodes" },
        },
        {
            input: "Change nodes to boxes",
            params: { selector: "", style: { shape: "box" }, layerName: "box-shapes" },
        },
    ],

    async execute(graph: Graph, params: Record<string, unknown>): Promise<CommandResult> {
        const {
            selector,
            style: styleParams,
            layerName = `ai-node-style-${Date.now()}`,
        } = params as {
            selector: string;
            style: z.infer<typeof NodeStyleParamsSchema>;
            layerName?: string;
        };

        const { set, unsupported } = nodeChannels(styleParams);

        return addLayer(graph, layerSpecOf(layerName, "node", selector, set), unsupported, "node");
    },
};

/**
 * Command to find and style edges matching a selector.
 */
export const findAndStyleEdges: GraphCommand = {
    name: "findAndStyleEdges",
    description:
        "Style the edges matching a selector by adding a style layer. Use an empty selector to match every edge. An edge's own fields are published under 'data.', so write 'data.weight > `0.5`'. Styles include color, width and line pattern.",
    parameters: z.object({
        selector: z
            .string()
            .describe(
                "Expression matching edges (empty string matches all). A record's own fields live under 'data.', so write 'data.weight > `0.5`'.",
            ),
        style: EdgeStyleParamsSchema,
        layerName: z.string().optional().describe("Name for this style layer (for later removal)"),
    }),
    examples: [
        {
            input: "Make all edges green",
            params: { selector: "", style: { color: "#00ff00" }, layerName: "green-edges" },
        },
        {
            input: "Highlight heavy edges",
            params: {
                selector: "data.weight > `0.7`",
                style: { color: "#ff0000", width: 3 },
                layerName: "heavy-edges",
            },
        },
        {
            input: "Make edges dashed",
            params: { selector: "", style: { lineType: "dash" }, layerName: "dashed" },
        },
    ],

    async execute(graph: Graph, params: Record<string, unknown>): Promise<CommandResult> {
        const {
            selector,
            style: styleParams,
            layerName = `ai-edge-style-${Date.now()}`,
        } = params as {
            selector: string;
            style: z.infer<typeof EdgeStyleParamsSchema>;
            layerName?: string;
        };

        const { set, unsupported } = edgeChannels(styleParams);

        return addLayer(graph, layerSpecOf(layerName, "edge", selector, set), unsupported, "edge");
    },
};

/**
 * Command to clear styles from a layer or all AI-added layers.
 */
export const clearStyles: GraphCommand = {
    name: "clearStyles",
    description:
        "Clear styles added by AI commands. Specify a layerName to clear a specific style, or leave empty to clear all AI-added styles.",
    parameters: z.object({
        layerName: z.string().optional().describe("Name of the style layer to clear (clears all if not specified)"),
    }),
    examples: [
        { input: "Clear all styling", params: {} },
        { input: "Remove red node styling", params: { layerName: "red-nodes" } },
    ],

    async execute(graph: Graph, params: Record<string, unknown>): Promise<CommandResult> {
        const { layerName } = params as { layerName?: string };
        const { styles } = graph.getSession();

        try {
            if (layerName === undefined) {
                // Swept by SOURCE rather than by a list this module keeps, which is the list that
                // goes stale. The element's own layers are never swept, whatever the predicate.
                const removed = await styles.removeBySource(
                    (source) => source.by === "plugin" && source.name === "graphty-ai",
                );

                return {
                    success: true,
                    message: `Cleared ${String(removed.length)} AI-added style layer(s).`,
                    data: { clearedCount: removed.length },
                };
            }

            const doomed = styles
                .list()
                .filter(
                    (layer) =>
                        layer.name === layerName && layer.source.by === "plugin" && layer.source.name === "graphty-ai",
                );

            if (doomed.length === 0) {
                return {
                    success: true,
                    message: `Style layer "${layerName}" not found (may already be cleared).`,
                };
            }

            for (const layer of doomed) {
                await styles.remove(layer.id);
            }

            return {
                success: true,
                message: `Cleared style layer "${layerName}".`,
                data: { clearedCount: doomed.length },
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to clear styles: ${refusalOf(error)}`,
            };
        }
    },
};
