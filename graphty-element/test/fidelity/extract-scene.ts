/**
 * The graphty side of the style fidelity harness: what a mounted `<graphty-element>` DREW, as the
 * scene description of `graph-io/test/fidelity/scene.ts`. Every scored value is read off the
 * renderer's scene graph (`drawn-scene.ts`): mesh boxes projected through the camera, material and
 * instance colors, the outline and glow layers, label planes, edge line batches and arrow caps.
 * What the style ASKED for (`styles.explain`) rides along per element as `requested`, a diagnostic
 * the comparer never scores, so a miss can be told apart as a mapping bug (asked for the wrong
 * thing) or a rendering bug (asked for the right thing and drew another).
 *
 * Precedence, so a drawn value nobody can see does not pass:
 * - a fill covered by an outline or glow whose inner rim reaches across the node, or on a node
 *   under one pixel across, is no visible fill (null);
 * - a label inside its node's box and behind the node's front face (occluded), or under one pixel
 *   tall, is not visible.
 *
 * Lengths are render pixels; the comparer fits one similarity transform on node centers and
 * expresses every length in reference units with its scale. The vocabulary maps are unit-tested in
 * Node (`extract-scene.test.ts`); the reader runs in the browser (`fidelity.test.ts`).
 */
import { resample } from "../../../graph-io/test/fidelity/compare";
import { canCarry } from "../../../graph-io/test/fidelity/routes";
import {
    type ArrowClass,
    type LineStyle,
    PROPERTIES,
    type Property,
    type Scene,
    type SceneEdge,
    type SceneNode,
    type ShapeClass,
} from "../../../graph-io/test/fidelity/scene";
import { channelDescriptor } from "../../catalog";
import type { Graphty } from "../../index.js";
import type { DrawnEdge, DrawnGraph, DrawnNode, ScreenBox } from "./drawn-scene";

/**
 * What the graphty side cannot read off the drawn scene. A property here is scored "unmeasurable
 * (gap)" by the comparer, which counts as a fail. Delete an entry when the reader gains it.
 */
export const GRAPHTY_GAPS: readonly { property: Property; reason: string }[] = [
    { property: "groups", reason: "the element draws no group (compound node) boxes to read (#2320)" },
];

/** graphty-element's 3D node shapes, as the 2D class a reader sees from above. */
const SHAPES: ReadonlyMap<string, ShapeClass> = new Map<string, ShapeClass>([
    ["sphere", "ellipse"],
    ["icosphere", "ellipse"],
    ["geodesic", "ellipse"],
    ["goldberg", "ellipse"],
    ["capsule", "ellipse"],
    ["cylinder", "ellipse"],
    ["torus", "ellipse"],
    ["box", "rect"],
    ["octahedron", "diamond"],
    ["triangular_prism", "triangle"],
    ["tetrahedron", "triangle"],
    ["hexagonal_prism", "hexagon"],
    ["dodecahedron", "octagon"],
    ["icosahedron", "star"],
]);

/** The node mesh names that are shapes; a mesh built under another name is read by its node's shape. */
const SHAPE_NAMES: ReadonlySet<string> = new Set(SHAPES.keys());

/**
 * The shape class of a graphty-element node shape, matching how the file-style import maps a
 * file's shapes onto meshes (`src/session/styles/fileStyles/shapes.ts`) in reverse.
 * @param shape - the `node.shape` value
 * @returns the class; "other" for a shape with no 2D counterpart
 */
export function shapeClassOf(shape: unknown): ShapeClass {
    return (typeof shape === "string" ? SHAPES.get(shape) : undefined) ?? "other";
}

const ARROWS: Readonly<Record<string, ArrowClass | "none">> = {
    none: "none",
    normal: "filled-triangle",
    inverted: "filled-triangle",
    vee: "filled-triangle",
    "open-normal": "open-triangle",
    diamond: "diamond",
    "open-diamond": "diamond",
    dot: "circle",
    "sphere-dot": "circle",
    "open-dot": "circle",
    tee: "tee",
};

/**
 * The arrow class of a graphty-element arrowhead, with the same folding the reference extractors
 * use (a filled arrowhead of any outline is filled-triangle; open and filled diamonds and circles
 * are one class).
 * @param arrow - the `edge.arrowHead` or `edge.arrowTail` value
 * @returns the class
 */
export function arrowClassOf(arrow: unknown): ArrowClass | "none" {
    if (arrow === undefined || arrow === null) {
        return "none";
    }
    return (typeof arrow === "string" ? ARROWS[arrow] : undefined) ?? "other";
}

/** The 3D arrow meshes' names (FilledArrowRenderer), as the arrowhead each draws. */
const ARROW_MESHES: Readonly<Record<string, ArrowClass>> = {
    "filled-triangle-arrow": "filled-triangle",
    "filled-vee-arrow": "filled-triangle",
    "filled-open-normal-arrow": "open-triangle",
    "filled-diamond-arrow": "diamond",
    "filled-circle-arrow": "circle",
    "filled-open-circle-arrow": "circle",
    "sphere-dot-arrow-3d": "circle",
    "filled-tee-arrow": "tee",
};

/**
 * The arrow class of a drawn arrowhead, from the name of the mesh its batch draws: a 2D head is
 * `arrow-2d-<arrow type>`, a 3D one a named mesh.
 * @param name - the cap's mesh name (`Edge.drawnCaps[].name`)
 * @returns the class
 */
export function capClassOf(name: string): ArrowClass | "none" {
    const flat = /^arrow-2d-(.+)$/.exec(name);
    return flat ? arrowClassOf(flat[1]) : (ARROW_MESHES[name] ?? "other");
}

/**
 * The line style of a graphty-element edge pattern.
 * @param style - the `edge.style` value
 * @returns the style
 */
export function lineStyleOf(style: unknown): LineStyle {
    if (style === undefined || style === "solid") {
        return "solid";
    }
    if (style === "dash") {
        return "dashed";
    }
    return style === "dot" ? "dotted" : "other";
}

type LabelPositionClass = NonNullable<SceneNode["label"]>["position"];

/**
 * The scene's label position class of a graphty-element label location.
 * @param location - the label style's `location` (graphty-element's default is "top")
 * @returns the class
 */
export function labelPositionOf(location: unknown): LabelPositionClass {
    switch (location ?? "top") {
        case "center":
            return "inside";
        case "top":
            return "above";
        case "bottom":
            return "below";
        case "left":
            return "left";
        case "right":
            return "right";
        default:
            return "other";
    }
}

/**
 * Splits a color as a style channel carries it -- a ColorValue (`{ hex, a }`), `#rgb`,
 * `#rrggbb` or `#rrggbbaa` -- into the scene's lowercase `#rrggbb` and an alpha.
 * @param value - the channel value
 * @returns the color and alpha, or null when it is not a hex color
 */
export function colorOf(value: unknown): { hex: string; alpha: number } | null {
    const text = typeof value === "object" && value !== null && "hex" in value ? value.hex : value;
    if (typeof text !== "string") {
        return null;
    }
    const match = /^#?([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(text.trim());
    if (!match) {
        return null;
    }
    let digits = match[1].toLowerCase();
    if (digits.length <= 4) {
        digits = digits.replace(/./g, "$&$&");
    }
    const alpha = digits.length === 8 ? Number.parseInt(digits.slice(6), 16) / 255 : 1;
    return { hex: `#${digits.slice(0, 6)}`, alpha };
}

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

/** Where the scene came from; the reader fills in the rest. */
export interface GraphtyProvenance {
    version: string;
    command: string;
    sourceSha256: string;
}

const round = (x: number): number => Math.round(x * 1000) / 1000;

/**
 * Where a label sits relative to its node, from their boxes on screen.
 * @param label - the label's screen box
 * @param node - the node's screen box and center
 * @returns the position class
 */
function labelPlace(label: ScreenBox, node: DrawnNode): LabelPositionClass {
    const cx = (label.x0 + label.x1) / 2;
    const cy = (label.y0 + label.y1) / 2;
    const b = node.box;
    if (cx >= b.x0 && cx <= b.x1 && cy >= b.y0 && cy <= b.y1) {
        return "inside";
    }
    const dx = cx - node.x;
    const dy = cy - node.y;
    if (Math.abs(dy) >= Math.abs(dx)) {
        return dy < 0 ? "above" : "below";
    }
    return dx < 0 ? "left" : "right";
}

/**
 * One node as drawn, with the precedence rules applied, and what its style asked for.
 * @param id - the node id
 * @param d - what the renderer drew
 * @param merged - the node's merged requested style
 * @returns the scene node
 */
function sceneNode(id: string, d: DrawnNode, merged: Readonly<Record<string, unknown>>): SceneNode {
    const w = d.box.x1 - d.box.x0;
    const h = d.box.y1 - d.box.y0;
    const { ring } = d;
    // The highlight layer's stroke and the glow layer's bloom both draw over the rim of the mesh
    // as far as they reach; reaching across the whole node, they cover the fill.
    const covered = ring !== null && ring.inner && 2 * ring.reachPx >= Math.min(w, h);
    const subPixel = Math.min(w, h) < 1;
    const { label } = d;
    const place = label ? labelPlace(label.box, d) : "other";
    const occluded =
        label !== null && place === "inside" && !label.onTop && (label.box.near + label.box.far) / 2 > d.box.near;
    const requestedFill = colorOf(channel(merged, "node.color"));
    const opacity = channel(merged, "node.opacity");
    const labelStyle = (merged["node.labelStyle"] ?? {}) as Readonly<Record<string, unknown>>;
    return {
        id,
        x: d.x,
        y: d.y,
        w,
        h,
        shape: shapeClassOf(SHAPE_NAMES.has(d.meshName) ? d.meshName : d.shapeType),
        fill: d.visible && !covered && !subPixel ? d.fillDrawn : null,
        fillOpacity: d.fillOpacity,
        border: ring
            ? { color: ring.color, width: ring.reachPx, style: "solid" }
            : { color: null, width: 0, style: "solid" },
        label:
            label === null
                ? null
                : {
                      text: label.text,
                      fontSize: label.fontPx,
                      color: label.color,
                      position: place,
                      visible: d.visible && label.enabled && !occluded && label.fontPx >= 1,
                  },
        visible: d.visible,
        z: -d.box.near,
        requested: {
            size: channel(merged, "node.size"),
            shape: shapeClassOf(channel(merged, "node.shape")),
            fill: requestedFill?.hex ?? null,
            fillOpacity: (typeof opacity === "number" ? opacity : 1) * (requestedFill?.alpha ?? 1),
            borderColor: colorOf(merged["node.outline"])?.hex ?? null,
            labelColor: colorOf(labelStyle.color ?? channel(merged, "node.labelColor"))?.hex ?? null,
            fontSize: labelStyle.sizePx ?? channel(merged, "node.labelSize"),
            labelPosition: labelPositionOf(labelStyle.location),
        },
        drawn: {
            screenW: round(w),
            screenH: round(h),
            fillDrawn: d.fillDrawn,
            fillCovered: covered,
            subPixel,
            instanceColor: d.instanceColor,
            ring: ring ? { ...ring, reachPx: round(ring.reachPx) } : null,
            labelFontPx: label ? round(label.fontPx) : null,
            labelOccluded: occluded,
        },
    };
}

const MAX_PATH_POINTS = 65;

const PATTERN_STYLES: Readonly<Record<string, LineStyle>> = { dash: "dashed", dot: "dotted" };

/**
 * One edge as drawn, and what its style asked for.
 * @param record - the edge's id and ends
 * @param record.id - the edge id
 * @param record.source - the source node id
 * @param record.target - the target node id
 * @param d - what the renderer drew
 * @param merged - the edge's merged requested style
 * @returns the scene edge
 */
function sceneEdge(
    record: { id: string; source: string; target: string },
    d: DrawnEdge,
    merged: Readonly<Record<string, unknown>>,
): SceneEdge {
    const capAt = (end: "arrowHead" | "arrowTail"): ArrowClass | "none" => {
        const cap = d.caps.find((c) => c.end === end);
        return cap ? capClassOf(cap.name) : "none";
    };
    const color = colorOf(channel(merged, "edge.color"));
    const opacity = channel(merged, "edge.opacity");
    const width = channel(merged, "edge.width");
    const label = merged["edge.label"];
    return {
        ...record,
        // ponytail: the comparer resamples every path to THRESHOLDS.pathSamples points anyway; a
        // curve drawn as thousands of slots would otherwise make each scene tens of megabytes.
        points: d.points.length > MAX_PATH_POINTS ? resample(d.points, MAX_PATH_POINTS) : d.points,
        curved: d.kind === "curve",
        color: d.color ?? "#000000",
        opacity: d.opacity,
        width: d.thicknessPx,
        style: d.pattern === null ? "solid" : (PATTERN_STYLES[d.pattern] ?? "other"),
        arrow: { source: capAt("arrowTail"), target: capAt("arrowHead") },
        label: d.label?.enabled === true && d.label.fontPx >= 1 && d.label.text !== "" ? d.label.text : null,
        requested: {
            edgeColor: color?.hex ?? null,
            edgeOpacity: (typeof opacity === "number" ? opacity : 1) * (color?.alpha ?? 1),
            edgeWidth: width,
            lineStyle: lineStyleOf(channel(merged, "edge.style")),
            arrows: {
                source: arrowClassOf(channel(merged, "edge.arrowTail")),
                target: arrowClassOf(channel(merged, "edge.arrowHead")),
            },
            edgeLabel: typeof label === "string" && label !== "" ? label : null,
        },
        drawn: {
            kind: d.kind,
            thicknessPx: round(d.thicknessPx),
            caps: d.caps.map((c) => ({ ...c, sizePx: round(c.sizePx) })),
            pathPoints: d.points.length,
        },
    };
}

/**
 * Builds the scene from what was drawn. Call `readDrawn(element.graph)` after
 * `waitForStableFrame()` and hand its result here.
 * @param element - the mounted element, for its records and the requested styles
 * @param drawn - what the renderer drew
 * @param provenance - the element's version, how it was loaded, and the sample's hash
 * @returns the scene
 */
export function extractScene(element: Graphty, drawn: DrawnGraph, provenance: GraphtyProvenance): Scene {
    const { session } = element;
    // `explain().merged` is typed ResolvedStyle, which no entry point exports; read as a record.
    const styleOf = (target: { node: string } | { edge: string }): Readonly<Record<string, unknown>> =>
        session.styles.explain(target).merged;
    const nodes: SceneNode[] = [];
    for (const record of session.data.nodes()) {
        const id = String(record.id);
        const d = drawn.nodes.get(id);
        if (d !== undefined) {
            nodes.push(sceneNode(id, d, styleOf({ node: id })));
        }
    }
    const edges: SceneEdge[] = [];
    for (const record of session.data.edges()) {
        const d = drawn.edges.get(record.id);
        if (d !== undefined) {
            edges.push(
                sceneEdge(
                    { id: record.id, source: String(record.source), target: String(record.target) },
                    d,
                    styleOf({ edge: record.id }),
                ),
            );
        }
    }
    // A clear color with no alpha shows the page behind the canvas, which is white in the test page.
    const background = drawn.background.alpha < 0.01 ? "#ffffff" : drawn.background.hex;
    return {
        provenance: {
            side: "graphty",
            route: "graphty",
            tool: "graphty-element, read off its Babylon.js scene graph",
            generatedAt: new Date().toISOString(),
            ...provenance,
        },
        canCarry: canCarry("graphty", PROPERTIES),
        nodes,
        edges,
        groups: [],
        background,
        gaps: [...GRAPHTY_GAPS],
    };
}
