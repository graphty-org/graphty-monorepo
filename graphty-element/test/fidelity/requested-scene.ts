/**
 * The Node tier of the style fidelity harness: what graphty-element is ASKED to draw, as the scene
 * description of `graph-io/test/fidelity/scene.ts`, read from a session with no renderer. Each
 * node's and edge's merged style (`styles.explain`) gives the style values, the session's own
 * coordinates give the positions (all in the element's scene units; the comparer's fitted
 * transform maps them onto the reference), and the session's visibility gives what is shown.
 *
 * It judges whether the file's styles were read and translated right; whether they were then
 * drawn right is the browser tier's question (`extract-scene.ts`). The properties it can judge are
 * `REQUESTED_PROPERTIES`; everything else (font sizes, drawn paths, self-loops, groups, drawing
 * order) needs the renderer and is not judged here. Lengths are the scene units the element draws
 * a 2D view in (`SCENE_PER_UNIT`).
 */
import { canCarry } from "../../../graph-io/test/fidelity/routes";
import {
    PROPERTIES,
    type Property,
    type Scene,
    type SceneEdge,
    type SceneNode,
} from "../../../graph-io/test/fidelity/scene";
import { channelDescriptor } from "../../catalog";
import type { GraphSession } from "../../session";
import type { NodeStyleConfig } from "../../src/config/NodeStyle";
import { labelFitExtent } from "../../src/meshes/labelFit";
import { labelLetterHeight, SCENE_PER_UNIT } from "../../src/session/styles/fileStyles/translate";
import { arrowClassOf, colorOf, labelPositionOf, lineStyleOf, shapeClassOf } from "./extract-scene";

/** The properties a requested scene can judge. */
export const REQUESTED_PROPERTIES: readonly Property[] = [
    "position",
    "size",
    "shape",
    "fill",
    "fillOpacity",
    "borderColor",
    "borderWidth",
    "borderStyle",
    "labelText",
    "labelColor",
    "labelPosition",
    "visible",
    "edgeColor",
    "edgeOpacity",
    "edgeWidth",
    "lineStyle",
    "arrows",
    "edgeLabel",
];

/**
 * A channel's requested value: the merged style when a layer wrote it, otherwise the catalog's
 * published default.
 * @param merged - `explain().merged`
 * @param name - the channel name
 * @returns the value, or undefined when neither has one
 */
function channel(merged: Readonly<Record<string, unknown>>, name: string): unknown {
    return merged[name] ?? channelDescriptor(name)?.default;
}

const num = (value: unknown, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

const BORDER_STYLES = new Set(["solid", "dashed", "dotted"]);

/**
 * How wide a label's letters are on average, in font sizes: what the Node tier, which measures no
 * text, takes a label's width to be. The browser tier measures it.
 */
const AVERAGE_LETTER_WIDTH = 0.55;

/**
 * The width and height a node that grows to hold its label is asked to be drawn at, in the units
 * of `node.size`, with its label's box estimated from its letters; null when it does not grow.
 * @param merged - `explain().merged`
 * @param size - its `node.size`
 * @param text - its label, or undefined
 * @param sizePx - its label's `sizePx`
 * @returns The width and height, or null
 */
function fittedExtent(
    merged: Readonly<Record<string, unknown>>,
    size: number,
    text: unknown,
    sizePx: number,
): { width: number; height: number } | null {
    const fit = merged["node.labelFit"];
    if (fit !== "inside" && fit !== "bounds") {
        return null;
    }
    const lines = typeof text === "string" && text !== "" ? text.split("\n") : [];
    const em = labelLetterHeight(sizePx) / SCENE_PER_UNIT.node;
    const widest = Math.max(0, ...lines.map((line) => line.length));
    const shape: NodeStyleConfig["shape"] = {
        size,
        type: channel(merged, "node.shape") as NonNullable<NodeStyleConfig["shape"]>["type"],
        labelFit: fit,
        labelPaddingX: num(merged["node.labelPaddingX"], 0),
        labelPaddingY: num(merged["node.labelPaddingY"], 0),
        labelFitSquare: merged["node.labelFitSquare"] === true,
        labelFitQuantum: num(merged["node.labelFitQuantum"], 0),
        ...(typeof merged["node.shapePoints"] === "string" ? { points: merged["node.shapePoints"] } : {}),
        ...(typeof merged["node.width"] === "number" ? { width: merged["node.width"] } : {}),
        ...(typeof merged["node.height"] === "number" ? { height: merged["node.height"] } : {}),
    };
    return labelFitExtent(shape, { width: widest * AVERAGE_LETTER_WIDTH * em, height: lines.length * em });
}

/**
 * The scene's line style of a requested `node.borderStyle`.
 * @param style - the channel value
 * @returns the style; unset is solid
 */
function borderStyleOf(style: unknown): SceneNode["border"]["style"] {
    if (style === undefined) {
        return "solid";
    }
    return typeof style === "string" && BORDER_STYLES.has(style) ? (style as SceneNode["border"]["style"]) : "other";
}

/**
 * Builds the scene a loaded session asks graphty-element to draw.
 * @param session - a session holding one imported file with its styles
 * @param sourceSha256 - the sample's hash as stored
 * @param command - how it was loaded
 * @returns the scene
 */
export function requestedScene(session: GraphSession, sourceSha256: string, command: string): Scene {
    const styleOf = (target: { node: string } | { edge: string }): Readonly<Record<string, unknown>> =>
        session.styles.explain(target).merged;
    const records = session.data.nodes();
    const { positions } = session;
    // The element keeps a file's coordinates (the "fixed" layout, drawing them at the scale its
    // file styles chose) only when every node has one, a group drawn round its members counting as
    // placed when they are (session/layout.ts, GraphSession's layout advice); otherwise it lays the
    // graph out, and positions say nothing about the file. Such a group has no row of its own.
    const placed = session.layout.id === "fixed" && records.length > 0;
    const scale = num(session.layout.options.scale, 1);
    const at = { x: 0, y: 0, z: 0 };
    const nodes: SceneNode[] = records.map((record, index) => {
        const id = String(record.id);
        const merged = styleOf({ node: id });
        if (placed) {
            positions.read(index, at);
        }
        // Node lengths are drawn SCENE_PER_UNIT.node scene units per unit (NODE_EXTENT_PER_SIZE).
        const size = num(channel(merged, "node.size"), 1);
        // a node of shape "none" has no body: its fill is drawn at opacity 0 and it has no border (meshes/NodeMesh.ts)
        const bodiless = channel(merged, "node.shape") === "none";
        const fill = colorOf(channel(merged, "node.color"));
        const borderWidth = bodiless ? 0 : num(merged["node.borderWidth"], 0);
        const borderStyle = merged["node.borderStyle"];
        const labelStyle = (merged["node.labelStyle"] ?? {}) as Readonly<Record<string, unknown>>;
        const text = merged["node.label"];
        const sizePx = num(labelStyle.sizePx ?? channel(merged, "node.labelSize"), 12);
        const fitted = fittedExtent(merged, size, text, sizePx);
        return {
            id,
            x: placed && Number.isFinite(at.x) ? at.x * scale : 0,
            y: placed && Number.isFinite(at.y) ? -at.y * scale : 0,
            w: (fitted?.width ?? num(merged["node.width"], size)) * SCENE_PER_UNIT.node,
            h: (fitted?.height ?? num(merged["node.height"], size)) * SCENE_PER_UNIT.node,
            shape: shapeClassOf(channel(merged, "node.shape")),
            fill: fill?.hex ?? null,
            fillOpacity: bodiless ? 0 : num(channel(merged, "node.opacity"), 1) * (fill?.alpha ?? 1),
            border: {
                // a border of opacity 0 is not drawn (meshes/NodeMesh.ts createBorder)
                color:
                    borderWidth > 0 && num(merged["node.borderOpacity"], 1) > 0
                        ? (colorOf(merged["node.borderColor"])?.hex ?? null)
                        : null,
                width: borderWidth * SCENE_PER_UNIT.node,
                style: borderStyleOf(borderStyle),
            },
            label:
                typeof text === "string" && text !== ""
                    ? {
                          text,
                          fontSize: sizePx,
                          color: colorOf(labelStyle.color ?? channel(merged, "node.labelColor"))?.hex ?? "#000000",
                          position: labelPositionOf(labelStyle.location),
                          visible: labelStyle.enabled !== false,
                      }
                    : null,
            visible: session.visibility.isVisible(record.id),
            z: num(merged["node.zIndex"], 0),
        };
    });
    const edges: SceneEdge[] = session.data.edges().map((record) => {
        const merged = styleOf({ edge: record.id });
        const color = colorOf(channel(merged, "edge.color"));
        const label = merged["edge.label"];
        return {
            id: record.id,
            source: String(record.source),
            target: String(record.target),
            points: [],
            curved: false,
            color: color?.hex ?? "#000000",
            opacity:
                (session.visibility.isVisible(record.id) ? 1 : 0) *
                num(channel(merged, "edge.opacity"), 1) *
                (color?.alpha ?? 1),
            // a 2D line is drawn SCENE_PER_UNIT.edge scene units wide per unit of edge.width
            width: num(channel(merged, "edge.width"), 1) * SCENE_PER_UNIT.edge,
            style: lineStyleOf(channel(merged, "edge.style")),
            arrow: {
                source: arrowClassOf(channel(merged, "edge.arrowTail")),
                target: arrowClassOf(channel(merged, "edge.arrowHead")),
            },
            label: typeof label === "string" && label !== "" ? label : null,
        };
    });
    const gaps: Scene["gaps"] = PROPERTIES.filter((p) => !REQUESTED_PROPERTIES.includes(p)).map((property) => ({
        property,
        reason: "the requested-style tier does not judge it; the browser tier reads it off the renderer",
    }));
    if (!placed) {
        gaps.push({ property: "position", reason: "the element lays this file out: not every node has a coordinate" });
    }
    return {
        provenance: {
            side: "graphty",
            route: "graphty",
            tool: "graphty-element's requested styles, through session.styles.explain in Node",
            version: "source",
            command,
            sourceSha256,
            generatedAt: new Date().toISOString(),
        },
        canCarry: canCarry("graphty", PROPERTIES),
        nodes,
        edges,
        groups: [],
        gaps,
    };
}
