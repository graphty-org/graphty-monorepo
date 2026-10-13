/**
 * The graphty side of the style fidelity harness: reads what a mounted `<graphty-element>` drew
 * into the scene description of `graph-io/test/fidelity/scene.ts`, through the element's public
 * API only. Anything a third-party consumer could not read is not read here either: it goes into
 * `scene.gaps`, and each gap is a defect report against graphty-element.
 *
 * Coordinates are the element's CSS pixels, y down, so the comparer's similarity fit absorbs the
 * camera's framing. This module imports types and Node-safe entry points only, so its vocabulary
 * maps are unit-tested in Node (`extract-scene.test.ts`) and the reader runs in the browser
 * (`fidelity.test.ts`).
 */
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

/**
 * What the public API cannot read back as drawn. A property here is scored "unmeasurable (API
 * gap)" by the comparer, which counts as a fail. Delete an entry when the element gains the read.
 */
export const GRAPHTY_GAPS: readonly { property: Property; reason: string }[] = [
    {
        property: "size",
        reason: "nodeScreenPosition gives one drawn radius (the largest half-extent), not a drawn width and height; w and h are both 2 x radius (#2322)",
    },
    {
        property: "borderWidth",
        reason: "no channel: the outline is a highlight layer whose width belongs to the layer, and nothing reports it",
    },
    { property: "fontSize", reason: "explain() gives the requested label size, not the drawn one (#2323)" },
    {
        property: "labelPosition",
        reason: "explain() gives the requested label location, not where it was drawn (#2323)",
    },
    { property: "labelColor", reason: "explain() gives the requested label color, not the drawn one (#2323)" },
    {
        property: "edgeWidth",
        reason: "explain() gives the requested width in style units; nothing reads back the drawn width in pixels",
    },
    { property: "zOrder", reason: "no read-back of drawing order (#2321)" },
    {
        property: "edgePath",
        reason: "no read-back of an edge's drawn path or bends; points are the two node centers (#2319)",
    },
    { property: "arrows", reason: "explain() gives the requested arrowheads, not what was drawn (#2324)" },
    {
        property: "edgeLabel",
        reason: "explain() gives the requested edge label, not whether or where it was drawn (#2323)",
    },
    { property: "groups", reason: "no read-back of group (compound node) boxes (#2320)" },
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
 * A channel's value as the element drew it: the merged style when a layer wrote it, otherwise the
 * catalog's published default.
 * @param merged - `explain().merged`
 * @param channel - the channel name
 * @returns the value, or undefined when neither has one
 */
function channel(merged: Readonly<Record<string, unknown>>, channel: string): unknown {
    return merged[channel] ?? channelDescriptor(channel)?.default;
}

/** Where the scene came from; the reader fills in the rest. */
export interface GraphtyProvenance {
    version: string;
    command: string;
    sourceSha256: string;
}

/**
 * Reads the drawn graph. Call after `waitForStableFrame()`: positions and labels are read off the
 * last drawn frame.
 * @param element - the mounted element
 * @param provenance - the element's version, how it was loaded, and the sample's hash
 * @returns the scene
 */
export function extractScene(element: Graphty, provenance: GraphtyProvenance): Scene {
    const { session } = element;
    // `explain().merged` is typed ResolvedStyle, which no entry point exports, so a consumer can
    // only read it as a plain record, as here. A typing gap, not a property gap.
    const styleOf = (target: { node: string } | { edge: string }): Readonly<Record<string, unknown>> =>
        session.styles.explain(target).merged;

    const centers = new Map<string, [number, number]>();
    const nodes: SceneNode[] = session.data.nodes().map((record) => {
        const id = String(record.id);
        const merged = styleOf({ node: id });
        const at = element.nodeScreenPosition(record.id) ?? { x: 0, y: 0, radius: 0 };
        centers.set(id, [at.x, at.y]);
        const fill = colorOf(channel(merged, "node.color"));
        const opacity = channel(merged, "node.opacity");
        const outline = colorOf(merged["node.outline"]);
        const labelStyle = (merged["node.labelStyle"] ?? {}) as Readonly<Record<string, unknown>>;
        const drawnLabel = element.labelOf(record.id);
        return {
            id,
            x: at.x,
            y: at.y,
            w: 2 * at.radius,
            h: 2 * at.radius,
            shape: shapeClassOf(channel(merged, "node.shape")),
            fill: fill?.hex ?? null,
            fillOpacity: (typeof opacity === "number" ? opacity : 1) * (fill?.alpha ?? 1),
            border: { color: outline?.hex ?? null, width: 0, style: "solid" },
            label:
                drawnLabel === undefined
                    ? null
                    : {
                          text: drawnLabel.text,
                          fontSize: Number(labelStyle.sizePx ?? channel(merged, "node.labelSize") ?? 0),
                          color: colorOf(labelStyle.color ?? channel(merged, "node.labelColor"))?.hex ?? "#000000",
                          position: labelPositionOf(labelStyle.location),
                          visible: drawnLabel.drawn,
                      },
            visible: session.visibility.isVisible(record.id),
            z: 0,
        };
    });

    const edges: SceneEdge[] = session.data.edges().map((record) => {
        const { id } = record;
        const merged = styleOf({ edge: id });
        const color = colorOf(channel(merged, "edge.color"));
        const opacity = channel(merged, "edge.opacity");
        const width = channel(merged, "edge.width");
        const label = merged["edge.label"];
        const ends = [centers.get(String(record.source)), centers.get(String(record.target))].filter(
            (p): p is [number, number] => p !== undefined,
        );
        return {
            id,
            source: String(record.source),
            target: String(record.target),
            points: ends,
            curved: merged["edge.curvature"] === true,
            color: color?.hex ?? "#000000",
            opacity: (typeof opacity === "number" ? opacity : 1) * (color?.alpha ?? 1),
            width: typeof width === "number" ? width : 0,
            style: lineStyleOf(channel(merged, "edge.style")),
            arrow: {
                source: arrowClassOf(channel(merged, "edge.arrowTail")),
                target: arrowClassOf(channel(merged, "edge.arrowHead")),
            },
            label: typeof label === "string" && label !== "" ? label : null,
        };
    });

    return {
        provenance: {
            side: "graphty",
            route: "graphty",
            tool: "graphty-element through its public API",
            generatedAt: new Date().toISOString(),
            ...provenance,
        },
        canCarry: canCarry("graphty", PROPERTIES),
        nodes,
        edges,
        groups: [],
        gaps: [...GRAPHTY_GAPS],
    };
}
