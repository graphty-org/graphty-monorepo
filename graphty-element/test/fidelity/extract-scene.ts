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
 * - a node wholly behind another opaque node (inside its screen box and farther from the camera)
 *   is not visible, and nor are its fill and its label: a group drawn over its members hides them;
 * - a fill covered by an outline or glow whose inner rim reaches across the node, or on a node
 *   under one pixel across, or a transparent one (an unfilled shape that draws only its outline),
 *   is no visible fill (null);
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
    type SceneGroup,
    type SceneNode,
    type ShapeClass,
} from "../../../graph-io/test/fidelity/scene";
import { channelDescriptor } from "../../catalog";
import type { Graphty } from "../../index.js";
import { polygonPoints } from "../../src/meshes/shapeOutlines";
import type { DrawnEdge, DrawnGraph, DrawnNode, ScreenBox } from "./drawn-scene";

/**
 * What the graphty side cannot read off the drawn scene. A property here is scored "unmeasurable
 * (gap)" by the comparer, which counts as a fail. Delete an entry when the reader gains it.
 */
export const GRAPHTY_GAPS: readonly { property: Property; reason: string }[] = [];

/** graphty-element's node shapes, as the 2D class a reader sees from above. */
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
    // The flat shapes, drawn exactly.
    ["ellipse", "ellipse"],
    ["rectangle", "rect"],
    ["round-rectangle", "roundrect"],
    ["diamond", "diamond"],
    ["triangle", "triangle"],
    ["hexagon", "hexagon"],
    ["octagon", "octagon"],
    ["star", "star"],
    ["parallelogram", "parallelogram"],
    // a box with curved corners and a cylinder seen from the side read as rounded rectangles; a
    // rounded polygon is a curved shape of no class
    ["barrel", "roundrect"],
    ["database", "roundrect"],
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

/**
 * The shape class of a polygon node, from its corners as a reader tells them apart: by how many
 * there are, and four as a rectangle when three sit on their box's corners, else a diamond.
 * @param points - the polygon's `shape.points`
 * @returns the class; "rect", the box graphty draws, without usable corners
 */
export function polygonClassOf(points: string | undefined): ShapeClass {
    const corners = polygonPoints(points);
    if (corners === null) {
        // without usable corners graphty draws the node's box (shapeOutlines.flatShapeOutline)
        return "rect";
    }
    if (corners.length === 4) {
        const xs = corners.map(([x]) => x);
        const ys = corners.map(([, y]) => y);
        const near = (v: number, ends: readonly number[]): boolean => ends.some((e) => Math.abs(v - e) < 1e-3);
        const onBox = corners.filter(
            ([x, y]) => near(x, [Math.min(...xs), Math.max(...xs)]) && near(y, [Math.min(...ys), Math.max(...ys)]),
        ).length;
        // as the oracle's outlines are classed (associate.ts): a diamond touches its box at no corner, and a
        // parallelogram or a trapezium, at one or two, is neither
        if (onBox >= 3) {
            return "rect";
        }
        return onBox === 0 ? "diamond" : "other";
    }
    return (
        ({ 3: "triangle", 6: "hexagon", 8: "octagon" } as Partial<Record<number, ShapeClass>>)[corners.length] ??
        "other"
    );
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
    // against a side or in a corner inside the node is still inside it
    if (typeof location === "string" && location.startsWith("inside-")) {
        return "inside";
    }
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

/** Half a render pixel: how far a box may poke past another and still count as inside it. */
const INSIDE_SLACK = 0.5;

/** The least fill opacity that hides what is behind it. */
const OPAQUE = 0.99;

/**
 * Whether one screen box lies wholly inside another.
 * @param inner - the box that may be inside
 * @param outer - the box that may hold it
 * @returns true when every side of inner is within outer
 */
function boxInside(inner: ScreenBox, outer: ScreenBox): boolean {
    return (
        inner.x0 >= outer.x0 - INSIDE_SLACK &&
        inner.x1 <= outer.x1 + INSIDE_SLACK &&
        inner.y0 >= outer.y0 - INSIDE_SLACK &&
        inner.y1 <= outer.y1 + INSIDE_SLACK
    );
}

/**
 * The 2D class of a drawn node's shape, as a reader sees it from above.
 * @param d - the drawn node
 * @returns the class
 */
const drawnShapeClass = (d: DrawnNode): ShapeClass =>
    d.shapeType === "polygon"
        ? polygonClassOf(d.polygon)
        : shapeClassOf(SHAPE_NAMES.has(d.meshName) ? d.meshName : d.shapeType);

/**
 * Points around the ellipse a screen box holds, every 22.5 degrees.
 * @param b - the box
 * @returns the points
 */
const ellipsePoints = (b: ScreenBox): number[][] =>
    Array.from({ length: 16 }, (_, k) => [
        (b.x0 + b.x1) / 2 + ((b.x1 - b.x0) / 2) * Math.cos((k * Math.PI) / 8),
        (b.y0 + b.y1) / 2 + ((b.y1 - b.y0) / 2) * Math.sin((k * Math.PI) / 8),
    ]);

/**
 * Whether one screen box lies wholly under a node's outline: under its box for a shape that fills its box, else
 * under the ellipse its box holds. A shape with empty corners (a Pajek man's figure, a star) does not hide a node
 * drawn in a corner of its box (pajek-synth-vertices: man 24 beside man 32's arm, inside his box). ponytail: the
 * ellipse stands for every shape that is no rectangle; a small node under a diamond's or a triangle's corner of that
 * ellipse is counted hidden although it shows. A round node is covered when its own outline is, not its box's corners:
 * a disc drawn just inside a bigger one shows nothing (json-graphology-synth n1 under n11).
 * @param node - the node that may be covered
 * @param outer - the covering node
 * @returns true when the outline covers every corner of the box, or every point of a round node's outline
 */
function coveredBy(node: DrawnNode, outer: DrawnNode): boolean {
    const inner = node.box;
    if (!boxInside(inner, outer.box)) {
        return false;
    }
    const kind = drawnShapeClass(outer);
    if (kind === "rect" || kind === "roundrect") {
        return true;
    }
    const { box: b } = outer;
    const [cx, cy, rx, ry] = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.x1 - b.x0) / 2, (b.y1 - b.y0) / 2];
    const corners =
        drawnShapeClass(node) === "ellipse"
            ? ellipsePoints(inner)
            : [
                  [inner.x0, inner.y0],
                  [inner.x1, inner.y0],
                  [inner.x0, inner.y1],
                  [inner.x1, inner.y1],
              ];
    return corners.every(([x, y]) => Math.hypot((x - cx) / (rx + INSIDE_SLACK), (y - cy) / (ry + INSIDE_SLACK)) <= 1);
}

/**
 * For each drawn node, the node that hides it: a visible, opaque node whose outline covers the
 * whole of its box (`coveredBy`) and whose front is nearer the camera than its own. A group drawn
 * in front of its members hides every one of them this way.
 * @param nodes - what was drawn, by id
 * @returns the hiding node's id, by the hidden node's id; a node nothing hides is absent
 */
export function occluders(nodes: ReadonlyMap<string, DrawnNode>): Map<string, string> {
    const out = new Map<string, string>();
    const covers = [...nodes].filter(([, b]) => b.visible && b.fillDrawn !== null && b.fillOpacity >= OPAQUE);
    for (const [id, a] of nodes) {
        const hit = covers.find(([other, b]) => other !== id && b.box.near < a.box.near && coveredBy(a, b));
        if (hit !== undefined) {
            out.set(id, hit[0]);
        }
    }
    return out;
}

/**
 * The groups as drawn: every node whose screen box holds the whole box of a visible node, with
 * the visible leaf nodes (nodes holding no other) inside it as its members, the way the reference
 * extractors list a group's members (its leaf descendants). A group drawn over its members shows
 * none of them, so it has no members and is not a group here.
 * @param scene - the scene's nodes, with their visibility already decided
 * @param nodes - what was drawn, by id
 * @returns the groups
 */
export function groupsOf(scene: readonly SceneNode[], nodes: ReadonlyMap<string, DrawnNode>): SceneGroup[] {
    const visible = scene.filter((n) => n.visible);
    const inside = new Map(
        scene.map((g) => {
            // out to the node's size: a border drawn inside it (or centered on it) shrinks the fill the box measures,
            // and a group's members sit inside its size, not inside that fill
            const drawn = nodes.get(g.id);
            const grow = drawn ? borderInset(drawn) : 0;
            const box = drawn
                ? {
                      ...drawn.box,
                      x0: drawn.box.x0 - grow,
                      y0: drawn.box.y0 - grow,
                      x1: drawn.box.x1 + grow,
                      y1: drawn.box.y1 + grow,
                  }
                : undefined;
            const held = box
                ? visible.filter((n) => {
                      const own = nodes.get(n.id)?.box;
                      return n !== g && own !== undefined && boxInside(own, box);
                  })
                : [];
            return [g, held] as const;
        }),
    );
    const leaves = new Set(visible.filter((n) => (inside.get(n) ?? []).length === 0));
    return scene.flatMap((g) => {
        const box = nodes.get(g.id)?.box;
        const members = (inside.get(g) ?? []).filter((n) => leaves.has(n));
        if (!box || members.length === 0) {
            return [];
        }
        return [
            {
                id: g.id,
                members: members.map((n) => n.id),
                bbox: { x: box.x0, y: box.y0, w: box.x1 - box.x0, h: box.y1 - box.y0 },
                fill: g.fill,
                border: g.border.color,
                label: g.label?.visible === true ? g.label.text : null,
            },
        ];
    });
}

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
 * The border a node shows: its border ring when it has one, else the outline (highlight layer) drawn around it, else
 * none. A glow is a blurred halo, not a border: a reader sees no line round the node there.
 * @param d - what the renderer drew
 * @returns the border
 */
function drawnBorderOf(d: DrawnNode): SceneNode["border"] {
    if (d.border !== null) {
        const { style } = d.border;
        const kept: LineStyle = style === "solid" || style === "dashed" || style === "dotted" ? style : "other";
        return { color: d.border.color, width: d.border.widthPx, style: kept };
    }
    return d.ring?.kind === "outline"
        ? { color: d.ring.color, width: d.ring.reachPx, style: "solid" }
        : { color: null, width: 0, style: "solid" };
}

/**
 * How far a node's border drew its fill in from its size, in screen pixels: its whole width inside the size, half of
 * it centered on the size, nothing outside it.
 * @param d - what the renderer drew
 * @returns the inset on each side
 */
export function borderInset(d: Pick<DrawnNode, "insetPx">): number {
    return d.insetPx;
}

/**
 * One node as drawn, with the precedence rules applied, and what its style asked for.
 * @param id - the node id
 * @param d - what the renderer drew
 * @param merged - the node's merged requested style
 * @param hiddenBy - the node drawn in front of all of it, or null
 * @returns the scene node
 */
export function sceneNode(
    id: string,
    d: DrawnNode,
    merged: Readonly<Record<string, unknown>>,
    hiddenBy: string | null,
): SceneNode {
    const w = d.box.x1 - d.box.x0;
    const h = d.box.y1 - d.box.y0;
    // the node's size: its fill, out by as far as its border drew the fill in from its size
    const size = 2 * borderInset(d);
    const { ring } = d;
    // The highlight layer's stroke and the glow layer's bloom both draw over the rim of the mesh
    // as far as they reach; reaching across the whole node, they cover the fill.
    const covered = ring !== null && ring.inner && 2 * ring.reachPx >= Math.min(w, h);
    const subPixel = Math.min(w, h) < 1;
    const visible = d.visible && hiddenBy === null;
    const { label } = d;
    const place = label ? labelPlace(label.box, d) : "other";
    const occluded =
        label !== null && place === "inside" && !label.onTop && (label.box.near + label.box.far) / 2 > d.box.near;
    // a label a reader could see, whether or not it is enabled now
    const labelShown =
        label !== null && d.shown && (hiddenBy === null || label.onTop) && !occluded && label.fontPx >= 1;
    const requestedFill = colorOf(channel(merged, "node.color"));
    const opacity = channel(merged, "node.opacity");
    const labelStyle = (merged["node.labelStyle"] ?? {}) as Readonly<Record<string, unknown>>;
    return {
        id,
        x: d.x,
        y: d.y,
        w: w + size,
        h: h + size,
        shape: drawnShapeClass(d),
        fill: visible && !covered && !subPixel && d.fillOpacity > 0 ? d.fillDrawn : null,
        fillOpacity: d.fillOpacity,
        border: drawnBorderOf(d),
        label:
            label === null
                ? null
                : {
                      text: label.text,
                      fontSize: label.fontPx,
                      color: label.color,
                      position: place,
                      // a label is drawn whatever its node's fill: an unfilled group still shows it, and one drawn on
                      // top of everything shows over the node that hides its own (Gephi's, gexf-cns-wos n5)
                      visible: labelShown && label.enabled,
                  },
        visible,
        z: -d.box.near,
        requested: {
            size: channel(merged, "node.size"),
            shape: shapeClassOf(channel(merged, "node.shape")),
            fill: requestedFill?.hex ?? null,
            fillOpacity: (typeof opacity === "number" ? opacity : 1) * (requestedFill?.alpha ?? 1),
            borderColor: colorOf(merged["node.borderColor"] ?? merged["node.outline"])?.hex ?? null,
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
            border: d.border ? { ...d.border, widthPx: round(d.border.widthPx) } : null,
            labelFontPx: label ? round(label.fontPx) : null,
            labelOccluded: occluded,
            // shown but for its node-size rule (`DrawnLabel.nodeSizeRule`), which another framing may meet
            labelHiddenBySize: labelShown && label?.nodeSizeRule?.hidden === true,
            hiddenBy,
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
            caps: d.caps.map((c) => ({ end: c.end, name: c.name, sizePx: round(c.sizePx) })),
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
    const hidden = occluders(drawn.nodes);
    const nodes: SceneNode[] = [];
    for (const record of session.data.nodes()) {
        const id = String(record.id);
        const d = drawn.nodes.get(id);
        if (d !== undefined) {
            nodes.push(sceneNode(id, d, styleOf({ node: id }), hidden.get(id) ?? null));
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
        groups: groupsOf(nodes, drawn.nodes),
        annotations: drawn.annotations.map((a) => ({
            kind: a.kind,
            bbox: { x: a.box.x0, y: a.box.y0, w: a.box.x1 - a.box.x0, h: a.box.y1 - a.box.y0 },
            ...(a.text === undefined ? {} : { text: a.text }),
        })),
        background,
        gaps: [...GRAPHTY_GAPS],
    };
}
