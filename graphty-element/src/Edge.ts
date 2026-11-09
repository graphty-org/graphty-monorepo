import { AbstractMesh, Color3, Ray, Vector3 } from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";
import * as jmespath from "jmespath";
import cloneDeep from "lodash/cloneDeep.js";
import isEqual from "lodash/isEqual.js";
import omit from "lodash/omit.js";

import { fixedParamsOf, type ShaderParams, type ShaderUse, timingOf } from "./catalog/shaders";
import {
    type AdHocData,
    DEFAULT_SELECTION_STYLE,
    type EdgeStyleConfig,
    type GraphSelectionStyleConfig,
    type RichTextStyleType,
} from "./config";
import { drawnText } from "./config/RichTextStyle";
import { EDGE_CONSTANTS } from "./constants/meshConstants";
import { edgeIdOf } from "./data/edgeIdentity";
import type { Graph } from "./Graph";
import type { EdgePosition } from "./layout/LayoutEngine";
import type { LocationMapFrame } from "./layout/locationMap/place";
import type { GraphContext } from "./managers/GraphContext";
import { LabelDeclutter } from "./managers/LabelDeclutter";
import { bootstrapEdgePaint, type EdgePaint } from "./managers/StylePainter";
import type { ArrowCap } from "./meshes/ArrowCapBatch";
import { type ArrowStackPart, parseArrowStack } from "./meshes/arrowStack";
import type { EdgeEffectBatch, ShadedEdgeBatch } from "./meshes/EdgeEffectBatch";
import { gradientPieceColors } from "./meshes/edgeGradient";
import { EDGE_STATE_BITS } from "./meshes/edgeJoinShader";
import type { EdgeLineBatch } from "./meshes/EdgeLineBatch";
import { EdgeMesh } from "./meshes/EdgeMesh";
import {
    arcThroughBend,
    bendPoints,
    bezierThroughControls,
    centerArc,
    clearOfCaps,
    crossingOf,
    curveThroughMidpoints,
    cutFromEnd,
    fanArc,
    fanOffset,
    fanSlot,
    fileRoute,
    greatCircleArc,
    interiorOutside,
    liftRoute,
    loopTeardrop,
    parseBends,
    parsePort,
    pointFromEnd,
    raisedArc,
    roundCorners,
    routeEnds,
    routeOutside,
    surfaceReach,
    type Xyz,
} from "./meshes/edgeRoute";
import { EDGE_NEVER, EdgeShaderDrawing, type EdgeStaticLook, edgeStaticValues } from "./meshes/EdgeShaderDrawing";
import { type EdgeTrimInput, TRIM_CLOSED, TRIM_NO_HIT, type TrimEnd, trimEnds } from "./meshes/edgeTrim";
import { TEE_DEPTH } from "./meshes/FilledArrowRenderer";
import { batchUploadFrames } from "./meshes/FrameRoster";
import { PatternedLineMesh } from "./meshes/PatternedLineMesh";
import { movingTexel } from "./meshes/pulledAnimatedLine";
import { curvePathPoint, type CurveSpan, curveSpan, loopShape, viaShare } from "./meshes/pulledCurve";
import { pulledEdgesDefault, type PulledLineBatch } from "./meshes/PulledLineBatch";
import { readColor } from "./meshes/readColor";
import { type AttachPosition, RichTextLabel, type RichTextLabelOptions } from "./meshes/RichTextLabel";
import { isPositive } from "./meshes/shapeOutlines";
import { SUPPORT_DEFAULTS, type SupportEdge } from "./meshes/supportPoints";
import { Node, NodeIdType, XLABEL_UNSHARED } from "./Node";
import { edgeDrawChanges } from "./render/EdgeIdTarget";
import { frozenRecord } from "./session/project/draft";
import { placeOfUse } from "./session/styles/channels";

interface InterceptPoint {
    srcPoint: Vector3 | null;
    dstPoint: Vector3 | null;
    newEndPoint: Vector3 | null;
}

interface EdgeLine {
    srcPoint: Vector3 | null;
    dstPoint: Vector3 | null;
}

/**
 * Where an edge's own label hangs when its block does not say, and how far off.
 *
 * The middle of the line, touching it. A label's block always carries a `location` once the
 * schema has parsed it, so this is what a caller who assembled a block by hand falls back to.
 */
const EDGE_LABEL_LOCATION: AttachPosition = "center";

/** How far an edge's own label sits from the middle of the line when its block does not say. */
const EDGE_LABEL_OFFSET = 0;

/**
 * Where an edge's external label (`xlabel`) hangs from the line's middle when its block does not say and no layout
 * placed it: up and left, its lower right corner on the middle, the first place Graphviz's lib/label/xlabels.c tries.
 */
const EDGE_XLABEL_LOCATION: AttachPosition = "top-left";

/**
 * Where a caption hangs from the cap it belongs to, when its own block does not say.
 *
 * Above the cap and a little clear of it, which is where the 1.x arrow captions sat. Unlike a
 * label's block, an arrow caption's is optional in the schema and carries no parsed defaults, so
 * this is the ordinary case rather than the fallback.
 */
const ARROW_CAPTION_LOCATION: AttachPosition = "top";

/** How far a caption sits from its cap when its own block does not say. */
const ARROW_CAPTION_OFFSET = 0.3;

/**
 * How high a raised route rises at its middle when `line.arcHeight` is unset, as a share of the
 * straight distance between its ends: a quarter over a flat map, a tenth over a globe, so a route
 * to the far side of the world rises a fifth of the radius and thousands of routes do not wrap
 * the globe in a thick halo.
 */
const DEFAULT_ARC_HEIGHT = { arc: 0.25, "great-circle": 0.1 } as const;

/** Style keys a pulled line can carry; any other set keeps the edge an object edge (`Edge.pullsLine`). */
const PULLED_STYLE_KEYS = new Set(["line", "label", "arrowHead", "arrowTail", "band", "visible"]);

/** Line keys a pulled line draws exactly as the plain line does. */
const PULLED_LINE_KEYS = new Set([
    "type",
    "animationSpeed",
    "width",
    "color",
    "opacity",
    "minScreenWidth",
    "bezier",
    "fanned",
    "fanSpacing",
    "arcRadius",
    "route",
    "arcHeight",
    "nodeGap",
    "sourceNodeGap",
    "targetNodeGap",
    "supportModel",
    "supportSpringLength",
    "supportSpringConstant",
    "supportRepulsion",
    "supportCentralGravity",
    "supportUnit",
    "supportScale",
    "bends",
]);

/**
 * Whether every key set on a style block is one of the keys named.
 * @param block - The block.
 * @param keys - The keys it may set.
 * @returns False when it sets any other.
 */
function setsOnly(block: object, keys: ReadonlySet<string>): boolean {
    return Object.entries(block).every(([key, value]) => value === undefined || value === false || keys.has(key));
}

/**
 * Whether an end draws no cap and no words.
 * @param cap - The end's style.
 * @returns True for none.
 */
function noCap(cap: EdgeStyleConfig["arrowHead"]): boolean {
    return cap === undefined || ((cap.type ?? "none") === "none" && cap.text === undefined);
}

/** Which of an edge's caps an entry of {@link Edge.drawnCaps} is: an end's, or one drawn part-way along the line. */
/**
 * How far behind the line, along the 2D camera's view (+z), an edge's outline band is drawn: far
 * above the depth buffer's resolution there and far below anything a reader could see.
 */
const OUTLINE_BEHIND = 0.002;

export type EdgeCapEnd = "arrowHead" | "arrowTail" | "arrowMiddleHead" | "arrowMiddleTail";

/**
 * Points from a flat x, y, z list.
 * @param flat - The coordinates.
 * @returns The points.
 */
function points(flat: readonly number[]): Vector3[] {
    return Array.from({ length: flat.length / 3 }, (_, i) => Vector3.FromArray(flat, 3 * i));
}

/**
 * How far a selected edge's band is pushed back in depth (a material's `zOffset`, which scales
 * with the slope, and `zOffsetUnits`, which a band facing the camera needs), so the line it marks
 * wins every pixel they share and the band shows only beside it, as a casing.
 */
const HALO_DEPTH_OFFSET = 2;

/**
 * The caption one end of an edge should be drawing, or undefined when it should draw none.
 *
 * Words are what switch a caption on, exactly as they switch a label on: `StylePainter` sets a
 * rich-text block's `enabled` whenever a layer writes the words that land in it, so a layer that
 * wrote only the APPEARANCE -- `edge.arrowHeadTextStyle` with no `edge.arrowHeadText` beneath it
 * -- has said how a caption should look without ever asking for one, and gets none. That is the
 * same rule `node.labelStyle` follows beside `node.label`, and it is what lets a theme carry a
 * caption's typeface for every edge while only the edges a layer names actually carry a caption.
 *
 * An end drawn with no arrow still carries its caption, as Graphviz draws a `taillabel` on an
 * edge with no arrow at its tail: `placeArrowCaptions` hangs it where the line meets the node.
 * @param block - The resolved rich-text block at that end of the edge, if there is one.
 * @returns The block when a caption should be drawn from it, and undefined otherwise.
 */
function captionWanted(block: RichTextStyleType | undefined): RichTextStyleType | undefined {
    return drawnText(block);
}

/**
 * Whether an edge drawn in this style draws no line: a width of 0 (#2067) with no
 * `line.minScreenWidth` to draw it at.
 * @param style - The style, or undefined for one not yet painted.
 * @returns True when the line is never placed.
 */
function drawsNoLine(style: EdgeStyleConfig | null | undefined): boolean {
    return (
        (style?.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH) === 0 && !isPositive(style?.line?.minScreenWidth ?? 0)
    );
}

/**
 * Make sure a node mesh's world matrix is current before an edge intersects it.
 *
 * WHY IT HAS TO BE FRESH. Trimming an edge at the node surface intersects a ray with the node's
 * mesh, and that test reads the mesh's world matrix -- which is stale from the moment the frame
 * moved the node until something recomputes it.
 *
 * NOT CACHED BY FRAME ID. It once was, once per node per scene frame id, but the element renders on
 * demand, so the frame id stands still between renders while a load places, sizes and moves nodes.
 * An edge freshened a node early, the node moved, and a later edge in the same frame id met the
 * node's stale world matrix: the arrowhead then sat a fraction of a pixel off, on some loads only
 * (#4073). Recomputing one matrix is cheap next to the ray-against-mesh test it feeds.
 * @param mesh - The node mesh about to be intersected.
 */
function freshenWorldMatrix(mesh: AbstractMesh): void {
    mesh.computeWorldMatrix(true);
}

interface EdgeOpts {
    metadata?: object;
}

/** Most uses along one edge drawn at once; past it the highest are kept. */
const ALONG_CAP = 4;

/** How near, in `along, across` units, a laid bend may sit to a line end the layout gives and be that end. */
const LAID_END_MATCH = 1e-4;

/**
 * The shader uses resolved on an edge: its style's `shaders`, which the painter writes from
 * `edge.shaders`.
 * @param style - The resolved style.
 * @returns The uses, or undefined when no layer wrote any.
 */
function shaderUsesOf(style: EdgeStyleConfig | null): readonly ShaderUse[] | undefined {
    return style === null ? undefined : (style as EdgeStyleConfig & { shaders?: readonly ShaderUse[] }).shaders;
}

/**
 * The edge's `paint` use: the last one, which the resolution leaves alone.
 * @param style - The resolved style.
 * @returns The use, or undefined for none.
 */
function paintUseOf(style: EdgeStyleConfig | null): ShaderUse | undefined {
    const paints = (shaderUsesOf(style) ?? []).filter((use) => use.off !== true && placeOfUse(use) === "paint");
    return paints.at(-1);
}

/**
 * The edge surface a style names, or null for none.
 * @param style - The resolved style.
 * @returns The id.
 */
function surfaceOf(style: EdgeStyleConfig | null): string | null {
    return paintUseOf(style)?.shader ?? null;
}

/**
 * The uses along an edge, keyed by shader and how many uses of it come before, at most
 * {@link ALONG_CAP}, the highest kept.
 * @param style - The resolved style.
 * @returns The shader id and fixed parameters of each, by key.
 */
function alongUsesOf(
    style: EdgeStyleConfig,
): readonly (readonly [string, { readonly id: string; readonly params: ShaderParams | undefined }])[] {
    const along = (shaderUsesOf(style) ?? []).filter((use) => use.off !== true && placeOfUse(use) === "along");
    const seen = new Map<string, number>();
    return along.slice(Math.max(0, along.length - ALONG_CAP)).map((use) => {
        const nth = seen.get(use.shader) ?? 0;
        seen.set(use.shader, nth + 1);
        return [`${use.shader}|${String(nth)}`, { id: use.shader, params: fixedParamsOf(use.params) }] as const;
    });
}

/**
 * The taper a style asks for: the width at the target over the width at the source.
 * @param style - The resolved style.
 * @returns The taper, 1 for none.
 */
function taperOf(style: EdgeStyleConfig | null): number {
    const taper = style?.line?.taper;
    return typeof taper === "number" && Number.isFinite(taper) ? Math.min(Math.max(taper, 0), 4) : 1;
}

/**
 * What a style asks the line to be drawn with beyond its plain look, as the key the line was
 * built for: a surface, a widened line (a taper or a fade), or nothing.
 * @param style - The resolved style.
 * @returns `"surface:<id>"`, `"taper"` or `"plain"`.
 */
function flavorOf(style: EdgeStyleConfig | null): string {
    const surface = surfaceOf(style);
    if (surface !== null) {
        return `surface:${surface}`;
    }

    return widensLine(style) ? "taper" : "plain";
}

/**
 * Whether a style's line is drawn from a widened batch without a surface: one whose slots carry a
 * taper or the whole edge's length, which a fade reads.
 * @param style - The resolved style.
 * @returns True for a taper or a fade.
 */
function widensLine(style: EdgeStyleConfig | null): boolean {
    return taperOf(style) !== 1 || EdgeMesh.fadeOf(style) !== undefined;
}

/**
 * A style with the colour and the opacity of its line and its end caps left out: what two looks
 * that share their batches' geometry have in common. See `Edge.restyleInPlace`.
 * @param style - The resolved style.
 * @returns A shallow copy without those six values.
 */
function withoutColours(style: EdgeStyleConfig): Record<string, unknown> {
    const out: Record<string, unknown> = { ...style };
    for (const part of ["line", "arrowHead", "arrowTail"] as const) {
        const value = style[part];
        if (value !== undefined) {
            out[part] = { ...value, color: undefined, opacity: undefined };
        }
    }

    return out;
}

/** What {@link differsOnlyInColour} found for each pair of styles it was asked about. */
const colourOnlyPairs = new WeakMap<EdgeStyleConfig, WeakMap<EdgeStyleConfig, boolean>>();

/** What {@link sameStyle} found for each pair of styles it was asked about. */
const equalPairs = new WeakMap<EdgeStyleConfig, WeakMap<EdgeStyleConfig, boolean>>();

/**
 * A comparison of two styles, remembered per pair.
 *
 * Edges painted by their key alone share their paint (`StylePainter.edgePaint`), so a pass that
 * moves thousands of edges between two looks asks about the same two objects every time, and a
 * deep comparison of two whole styles per edge cost more than the rebuild it decides on (#6026).
 * @param cache - Where this comparison's answers are kept.
 * @param a - One look.
 * @param b - The other.
 * @param compare - The comparison, run once per pair.
 * @returns Its answer.
 */
function rememberedPair(
    cache: WeakMap<EdgeStyleConfig, WeakMap<EdgeStyleConfig, boolean>>,
    a: EdgeStyleConfig,
    b: EdgeStyleConfig,
    compare: () => boolean,
): boolean {
    let row = cache.get(a);
    if (row === undefined) {
        row = new WeakMap();
        cache.set(a, row);
    }

    let known = row.get(b);
    if (known === undefined) {
        known = compare();
        row.set(b, known);
    }

    return known;
}

/**
 * Whether two looks are deep-equal.
 * @param a - One look.
 * @param b - The other, or null for none.
 * @returns True when they say the same thing.
 */
function sameStyle(a: EdgeStyleConfig, b: EdgeStyleConfig | null): boolean {
    return a === b || (b !== null && rememberedPair(equalPairs, a, b, () => isEqual(a, b)));
}

/**
 * Whether two looks differ at most in the colour and the opacity of their line and end caps.
 * @param a - One look.
 * @param b - The other.
 * @returns True when nothing else differs.
 */
function differsOnlyInColour(a: EdgeStyleConfig, b: EdgeStyleConfig): boolean {
    return rememberedPair(colourOnlyPairs, a, b, () => isEqual(withoutColours(a), withoutColours(b)));
}

/**
 * A stable 0..1 random per edge id.
 * @param id - The edge id.
 * @returns The seed.
 */
function edgeSeedOf(id: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
        hash = Math.imul(hash ^ id.charCodeAt(i), 0x01000193); // NOSONAR(S7758): FNV-1a over UTF-16 code units; codePointAt would change the seed of an id outside the BMP
    }

    return (hash >>> 0) / 0xffffffff;
}

/** One effect an edge draws: its batch, the slots of its run, and their static values. */
interface EffectRun {
    readonly batch: EdgeEffectBatch;
    readonly slots: number[];
    values: Float32Array;
    /** The loop's speed on this edge, 0 still. */
    speed: number;
    /** The entered stamp, scene time, or EDGE_NEVER at rest. */
    readonly entered: number;
}

/**
 * A batch's loop speed setter, when it draws a shader.
 * @param batch - The batch.
 * @returns The batch as a shader batch, or null for a plain line.
 */
function shaded(batch: EdgeLineBatch | null): ShadedEdgeBatch | null {
    return batch !== null && "setSpeed" in batch ? (batch as ShadedEdgeBatch) : null;
}

/** Per scene, the frame the lift rule was last read in and its answer; see `Edge.liftDrawn`. */
const liftRule = new WeakMap<object, { frame: number; draws: boolean }>();

/** Writes an edge's row; see {@link placeEdgeRow}. */
let writeEdgeRow: (edge: Edge, row: number) => void;

/**
 * Move an edge to a row of the current snapshot. Only the data manager calls it, as an edge is
 * added, removed or renumbered by a compacting freeze.
 * @param edge - The edge.
 * @param row - Its logical edge index, or INVALID_INDEX.
 */
export function placeEdgeRow(edge: Edge, row: number): void {
    writeEdgeRow(edge, row);
}

/** Writes an edge's record; see {@link adoptEdgeRecord}. */
let writeRecord: (edge: Edge, record: AdHocData) => void;

/**
 * Hand an edge the record the graph now holds for it. Only the data manager calls it, from the
 * render half of the graph's derivation, when a command, an undo or a redo changed the record;
 * no entry point exports it, so `edge.data` is always the graph's record.
 * @param edge - The edge.
 * @param record - The record.
 */
export function adoptEdgeRecord(edge: Edge, record: AdHocData): void {
    writeRecord(edge, record);
}

/**
 * How far a line through a node's centre runs before it leaves the node's bounding box, in the
 * node's own (graph-root) space: the exact surface of a box, and a tight bound for any other
 * built-in shape, all of which are built centred on their origin.
 * @param mesh - The node's mesh.
 * @param direction - The line's unit direction.
 * @returns The distance from the centre to the box's surface along the line.
 */
function boxReach(mesh: AbstractMesh, direction: Vector3): number {
    const { extendSize } = mesh.getBoundingInfo().boundingBox;
    const { scaling } = mesh;
    let reach = Infinity;
    for (const axis of ["x", "y", "z"] as const) {
        const along = Math.abs(direction[axis]);
        if (along > 1e-9) {
            reach = Math.min(reach, Math.abs(extendSize[axis] * scaling[axis]) / along);
        }
    }

    return Number.isFinite(reach) ? reach : 0;
}

/**
 * Visit some slots of one batch, every one of them.
 * @param batch - The batch.
 * @param slots - The slots.
 * @param visit - Called with each.
 * @returns True when every visit returned true.
 */
function everySlotOf(
    batch: EdgeLineBatch,
    slots: readonly number[],
    visit: (batch: EdgeLineBatch, slot: number) => boolean,
): boolean {
    let all = true;
    for (const slot of slots) {
        all = visit(batch, slot) && all;
    }

    return all;
}

/**
 * Park one edge batch slot; see `Edge.parkPieces`.
 * @param batch - The batch.
 * @param slot - The slot.
 * @returns True, always.
 */
function parkSlot(batch: EdgeLineBatch, slot: number): boolean {
    batch.park(slot);
    return true;
}

/**
 * Put one parked edge batch slot back; see `Edge.unparkPieces`.
 * @param batch - The batch.
 * @param slot - The slot.
 * @returns Whether it was put back.
 */
function unparkSlot(batch: EdgeLineBatch, slot: number): boolean {
    return batch.unpark(slot);
}

/**
 * Park one arrow cap.
 * @param cap - The cap.
 * @returns True, always.
 */
function parkCap(cap: ArrowCap): boolean {
    cap.park();
    return true;
}

/**
 * Put one parked arrow cap back.
 * @param cap - The cap.
 * @returns Whether it was put back.
 */
function unparkCap(cap: ArrowCap): boolean {
    return cap.unpark();
}

/**
 * Represents a directed edge between two nodes in the graph visualization.
 * Handles rendering of edge lines, arrow heads/tails, and labels with support for various styles.
 */
export class Edge {
    parentGraph: Graph | GraphContext;
    opts: EdgeOpts;
    readonly srcId: NodeIdType;
    readonly dstId: NodeIdType;

    /**
     * This edge's identity: the element-assigned counter the store stamped into its
     * `graphty.edgeId` column, printed as a string.
     *
     * It used to be the `"srcId:dstId"` pair string, which could not name two edges between the
     * same pair at all -- so parallel edges were dropped -- and which collided for any node id
     * containing a colon: an edge `a:b -> c` and an edge `a -> b:c` had the same id. The counter
     * is unique by construction, so both of those are now two distinct edges.
     */
    readonly id: string;

    /**
     * This edge's LOGICAL edge index in the element's current GraphSnapshot, assigned at add time
     * and re-keyed through `report.edgeRemap` on a compacting freeze.
     *
     * Every Edge has one. An edge whose endpoint ids graph-format will not store is REJECTED
     * before a render object is built for it, so there is no such thing as an Edge with no row --
     * which is what makes `index` safe to read without a guard everywhere downstream.
     * @returns The row.
     */
    get index(): number {
        return this.row;
    }

    private set index(row: number) {
        this.row = row;
    }

    private row: number = INVALID_INDEX;

    static {
        writeEdgeRow = (edge, row) => {
            edge.index = row;
        };
        writeRecord = (edge, record) => {
            edge.#record = frozenRecord(record);
            edge.shaderDataChanged();
        };
    }
    dstNode: Node;
    srcNode: Node;
    /**
     * The record this edge carries, as the graph holds it: deep-frozen, so a write to it throws. A
     * change goes through the graph (`updateNodes`, `session.data.updateNodes`, ...), which is what undo sees.
     * @returns The record.
     */
    get data(): AdHocData {
        return this.#record;
    }

    /** The record, as the graph last handed it over. */
    #record: AdHocData;
    /**
     * The mesh this edge's line is drawn by.
     *
     * NOT ALWAYS THIS EDGE'S OWN MESH ANY MORE. Every line but a patterned one -- straight or
     * curved, 2D or 3D -- is drawn as thin instances of a batch shared by every edge of the same
     * appearance, and this then points at
     * the batch's mesh -- so it still answers what the line is drawn as, and it is still the
     * thing to ask whether the renderer's geometry has been disposed under it, but disposing it
     * or enabling it would reach every other edge in the batch. This edge's private `lineBatch` says
     * which of the two an edge is, and every write below is routed through it.
     */
    mesh: AbstractMesh | PatternedLineMesh; // PHASE 5: Support both solid lines and patterned lines
    /**
     * This edge's head cap, as a slot in the batch that draws every cap of its appearance, and
     * null when the style asks for none.
     *
     * NOT A MESH ANY MORE. A cap was a `Mesh` with a `ShaderMaterial` of its own, then an
     * `InstancedMesh` of a shared source, and is now sixteen floats in a shared array plus the
     * seven the billboard shader reads -- so there is nothing per cap in the scene to position,
     * enable or dispose. An `ArrowCap` -- a slot in `ArrowCapBatch` -- is what an edge holds instead,
     * and every question the renderer asks of a cap is answered off its batch.
     */
    arrowCap: ArrowCap | null = null;

    /** This edge's tail cap, the same way. */
    arrowTailCap: ArrowCap | null = null;

    /** The cap part-way along this edge's line pointing toward its target (`arrowMiddleHead`), the same way. */
    arrowMiddleHeadCap: ArrowCap | null = null;

    /** The caps drawn in a row behind the head (`arrowHead.stack`), each with the part it draws, nearest first. */
    private headStack: { cap: ArrowCap; part: ArrowStackPart }[] = [];

    /** The caps drawn in a row behind the tail (`arrowTail.stack`), the same way. */
    private tailStack: { cap: ArrowCap; part: ArrowStackPart }[] = [];

    /** The cap part-way along this edge's line pointing toward its source (`arrowMiddleTail`), the same way. */
    arrowMiddleTailCap: ArrowCap | null = null;

    /**
     * Never set by the element: an arrowhead is a slot in a shared batch now, not a mesh.
     * @deprecated Use {@link Edge.arrowCap}. Will be removed in graphty-element 4.0.
     */
    arrowMesh: AbstractMesh | null = null;

    /**
     * Never set by the element: an arrow tail is a slot in a shared batch now, not a mesh.
     * @deprecated Use {@link Edge.arrowTailCap}. Will be removed in graphty-element 4.0.
     */
    arrowTailMesh: AbstractMesh | null = null;

    /**
     * The batch this edge's line is drawn from, or null for a patterned line, whose elements are
     * slots in batches of their own (see `PatternedLineMesh`). See {@link EdgeMesh.lineBatch}.
     */
    private lineBatch: EdgeLineBatch | null = null;

    /**
     * The piece this edge's line is pulled into instead ({@link Edge.pullsLine}), with the rows last
     * written to it: -1 while hidden. Null for every other line.
     */
    private pulled: {
        batch: PulledLineBatch;
        piece: number;
        source: number;
        target: number;
        drawn: boolean;
        /** The look's name and visibility, as a batch of its own would carry them ({@link Edge.drawnLine}). */
        name: string;
        visibility: number;
        /** A lone curve's further pieces, after `piece`: as many as its longest cut so far ({@link Edge.pullCurve}). */
        run: number[] | null;
        /** The look its pieces are given, for the pieces a curve takes later. */
        look: { color: Color3; opacity: number; width: number };
        /** A curve's last span and the centres it was cut between, null while it draws nothing ({@link Edge.drawnCurve}). */
        path?: { src: Vector3; dst: Vector3; span: CurveSpan } | null;
        /** A line through bends' block in the batch's route table and the cut path it holds ({@link Edge.pullSpan}). */
        route?: { at: number; points: readonly number[] } | null;
    } | null = null;

    /**
     * Which slots of {@link Edge.lineBatch} draw this edge: one for a straight line, and one per
     * segment of a curve, which is a run of straight segments. Empty when there is no batch.
     */
    private lineSlots: number[] = [];

    /**
     * The opacity {@link Edge.colorLine} last wrote into the line's slots, as the number the style
     * gave rather than the 32-bit float the slot holds.
     */
    private lineOpacity = 1;

    /** The color {@link Edge.colorLine} last wrote into the line's slots, as the style spelled it. */
    private lineColor = "#FFFFFF";

    /** The batch this edge's outline (`line.outline`, a band under the line) is drawn from, or null for none. */
    private outlineBatch: EdgeLineBatch | null = null;

    /** This edge's slots in {@link Edge.outlineBatch}, one per piece of its line. */
    private outlineSlots: number[] = [];

    /** The bands drawn beneath (`line.underlay`) and over (`line.overlay`) this edge's line, with their slots. */
    private haloBands: { kind: "underlay" | "overlay"; batch: EdgeLineBatch; slots: number[] }[] = [];

    /**
     * The pieces a line painted in a gradient (`line.gradient`) is drawn as, source end first:
     * each a slot in the batch of its color, drawn over the line.
     */
    private gradientPieces: { batch: EdgeLineBatch; slot: number; color: string }[] = [];

    /** The caption distances (`textDistance`, head then tail) the captions were last placed by. */
    private drawnCaptionDistances: string | undefined;

    /** Whether this edge's line is a curve, drawn as a run of slots rebuilt as its ends move. */
    private lineIsCurve = false;

    /** The batch this edge's selection halo is drawn from while it is selected; see `paintHalo`. */
    private haloBatch: EdgeLineBatch | null = null;

    /** Which slots of {@link Edge.haloBatch} draw the halo, as {@link Edge.lineSlots} do the line. */
    private haloSlots: number[] = [];

    /** Whether the halo follows a curve. */
    private haloIsCurve = false;

    /** What the halo was drawn from, or null when none is drawn; see `paintHalo`. */
    private haloKey: string | null = null;

    /**
     * Whether this edge is drawn as a self-loop's teardrop or fanned out of a bundle of edges
     * between the same two nodes: a run of slots, like a curve.
     */
    private bundled = false;

    /** The data manager's edge set this edge was last placed against; a new one may regroup its bundle. */
    private bundleVersion = -1;

    /**
     * The route the style stores for this edge's line: its bends (`line.bends`, flat pairs) and its
     * ports (`line.sourcePort`, `line.targetPort`), or null for a line straight from node to node. A
     * routed line is a run of slots like a curve.
     */
    private lineRoute: {
        bends: number[] | null;
        srcPort: [number, number] | null;
        dstPort: [number, number] | null;
        loop: boolean;
        /** Whether the first and last bends are the line's ends, where the layout ended it ({@link fileRoute}). */
        ends?: boolean;
    } | null = null;

    /** The texts {@link Edge.lineRoute} was read from, joined. See {@link syncContent}. */
    private drawnBends?: string;

    /** The `line.fanSpacing` the edge's arc was last placed with. See {@link syncContent}. */
    private drawnFanSpacing?: number;

    /** The `line.fanned` the edge's arc was last placed with. See {@link syncContent}. */
    private drawnFanned?: boolean;

    /** The `line.arcRadius` the edge's curve was last placed with. See {@link syncContent}. */
    private drawnArcRadius?: number;

    /** The `line.route` and `line.arcHeight` the edge was last placed with. See {@link syncContent}. */
    private drawnRoute?: string;

    /** The node gaps (`line.nodeGap`, `sourceNodeGap`, `targetNodeGap`) the ends were last placed with. */
    private drawnNodeGap?: string;

    /**
     * What the line was last asked to be drawn with beyond its plain look (`flavorOf`): a paint
     * that asks for something else rebuilds the line. A surface that cannot draw yet is drawn
     * plainly and asked for again when it can ({@link Edge.refreshShaderPaint}).
     */
    private lineWanted = "plain";

    /** What the line was built with: the flavor asked for, or a lesser one while a surface cannot draw. */
    private lineBuilt = "plain";

    /**
     * The static values the line's slots carry in a widened batch (a surface or a taper), written
     * on a repaint and into each slot a run takes; null for a plain batch.
     */
    private lineStatic: Float32Array | null = null;

    /** The entered stamp of the line's surface, scene time, or EDGE_NEVER at rest. */
    private surfaceEntered = EDGE_NEVER;

    /** The surface {@link Edge.surfaceEntered} was decided for. */
    private surfaceEnteredFor: string | null = null;

    /** The loop speed of the line's surface on this edge, 0 still. */
    private lineSpeed = 0;

    /** Each edge effect this edge draws, by id, in the order they draw. */
    private readonly effectRuns = new Map<string, EffectRun>();

    /** Whether the line is drawn lifted out of a flat layout's plane now (`edge.lift`): a run of slots. */
    private lifted = false;

    /** When something last happened to this edge that a shader's entrance plays for, by `performance.now()`. */
    private causedAt = Number.NEGATIVE_INFINITY;

    /** When this edge's data last changed, scene time, or EDGE_NEVER. */
    private changedStamp = EDGE_NEVER;

    /**
     * The source mesh this edge is currently drawn from.
     *
     * The interner's key with the colour put back in, because the edge renderer has no
     * per-instance state to carry one. See `EdgePaint`.
     */
    private meshKey: string;

    /**
     * What the session's style stack resolved for this edge, or null while no pass has resolved
     * one and the element's own defaults are what is drawn.
     *
     * READ FOR EVERY DRAWING DECISION, not only for the mesh: whether the line bows, which arrow
     * caps it carries and how wide it is are all read again on frames the style stack knows
     * nothing about.
     */
    private sessionPaint: EdgePaint | null = null;
    // XXX: performance impact when not needed?
    ray: Ray;
    label: RichTextLabel | null = null;
    arrowHeadText: RichTextLabel | null = null;
    arrowTailText: RichTextLabel | null = null;
    private _arrowHeadTextOffset = ARROW_CAPTION_OFFSET;
    private _arrowTailTextOffset = ARROW_CAPTION_OFFSET;
    private _arrowHeadTextAttachPosition: AttachPosition = ARROW_CAPTION_LOCATION;
    private _arrowTailTextAttachPosition: AttachPosition = ARROW_CAPTION_LOCATION;
    private _labelOffset = EDGE_LABEL_OFFSET;
    private _labelAttachPosition: AttachPosition = EDGE_LABEL_LOCATION;

    /** The external label on screen (`xlabel`), drawn beside the line's middle. */
    xlabelLabel: RichTextLabel | null = null;
    private _xlabelOffset = 0;
    private _xlabelAttachPosition: AttachPosition = EDGE_XLABEL_LOCATION;
    /** The labels the layout left out when it last placed this edge ({@link EdgePosition.leftOut}). */
    private leftOutLabels: NonNullable<EdgePosition["leftOut"]> = [];
    /** Whether the external label's style names a location of its own, which a layout's place does not override. */
    private _xlabelPlacedByStyle = false;
    /** What the external label on screen was drawn from, or undefined for none. See {@link syncXlabel}. */
    private drawnXlabel?: string;

    /**
     * The words the label on screen is drawing, and undefined when this edge draws no label.
     *
     * WHY THIS EXISTS, which is the defect it closes. `edge.label`, `edge.labelStyle` and the
     * four arrow-caption channels are `role: "content"` in `src/session/styles/intern.ts` and
     * deliberately key no source mesh. So a paint that changes only an edge's words arrives carrying the same
     * mesh key as the paint before it, and the comparison at the top of `paintFrom` -- which
     * returns having applied NOTHING at all, an edge having no per-instance state to write --
     * discarded it. `styles.add({ set: { "edge.label": "..." } })` over a graph already on
     * screen resolved the text, reported it, and drew nothing.
     *
     * Held beside {@link drawnLabelStyle} so {@link syncContent} can run on every paint and
     * still cost nothing when the text has not moved.
     */
    private drawnLabelText?: string;

    /** The style the current line and caps were built from; see `paintFrom`. */
    private drawnStyle: EdgeStyleConfig | null = null;

    /**
     * The resolved label block the label on screen was built from.
     *
     * Deep-compared rather than compared by reference: `StylePainter.edgePaint` builds a fresh
     * paint on every call, so two paints that say the same thing are never the same object.
     */
    private drawnLabelStyle?: EdgeStyleConfig["label"];

    /** The arrow-head text block the glyph on screen was built from. See {@link syncContent}. */
    private drawnArrowHeadText?: NonNullable<EdgeStyleConfig["arrowHead"]>["text"];

    /** The arrow-tail text block the glyph on screen was built from. See {@link syncContent}. */
    private drawnArrowTailText?: NonNullable<EdgeStyleConfig["arrowTail"]>["text"];
    // Debug flag for logging lineDirection (reserved for future use)
    private readonly _loggedLineDirection: boolean = false;

    // Dirty tracking: Cache last node positions to skip unnecessary updates
    private _lastSrcPos: Vector3 | null = null;
    private _lastDstPos: Vector3 | null = null;

    /**
     * Whether the placement under way follows a moved end. A batched end only a ray reaches then takes its node's
     * bounding radius, and `UpdateManager` places the edge again, measured, once the move rests (design section 4.3).
     */
    private endsMoving = false;
    /** Where the line's support point was when the line was last placed (`line.supportModel`). */
    private _lastVia: Xyz | null = null;

    /**
     * Set once {@link Edge.dispose} has run. Guards the two methods that would otherwise rebuild
     * this edge's meshes -- see the comment on `dispose` for why a disposed Edge still receives
     * calls every frame.
     */
    private disposed = false;

    /**
     * Whether the visibility mask says this edge is part of the graph on screen.
     *
     * Held rather than derived so the renderer can apply a mask as a DELTA: an edge whose
     * visibility did not move costs no mesh operation at all.
     */
    private renderVisible = true;

    /** Whether the style stack hid this edge (`edge.visible` false), which only stops drawing it. */
    private styleHidden = false;

    /**
     * Whether this edge is in the session's selection.
     *
     * Tracked here so the renderer owns the answer; see {@link Edge.setSelected}.
     */
    private selected = false;

    /**
     * Helper to check if we're using GraphContext
     * @returns The GraphContext instance
     */
    private get context(): GraphContext {
        // Check if parentGraph has GraphContext methods
        if ("getStyles" in this.parentGraph) {
            return this.parentGraph;
        }

        // Otherwise, it's a Graph instance which implements GraphContext
        return this.parentGraph;
    }

    /**
     * Where this edge sits among the edges sharing its ordered endpoint pair, counting from zero.
     *
     * Derived on every read from the graph store rather than stored, so a removal cannot leave it
     * stale. The drawing fans parallel edges out by their place among every edge joining the
     * same two nodes in EITHER direction (`DataManager.drawnBundle`), which this ordered rank is
     * not.
     * @returns the rank, or -1 for an edge the store no longer holds
     */
    get parallelRank(): number {
        return this.context.getDataManager().getEdgesBetween(this.srcId, this.dstId).indexOf(this);
    }

    /**
     * What this edge's line is drawn as, when it is drawn from a shared batch.
     *
     * THE ONLY READING OF A BATCHED LINE THERE IS. A line drawn as a thin instance has no mesh of
     * its own in the scene and no material of its own, so the scene walk that reads an edge's
     * appearance off `scene.meshes` -- which is how the story assertions have always read it --
     * finds one batch where it used to find one mesh per edge. The edge itself is where the
     * answer moved to: the batch's name carries the interned appearance, exactly as the instance
     * name did, the length is the drawn extent the bounding box used to carry, and the width is
     * the line width the batch was built with.
     * @returns The appearance, or null for a patterned line, whose elements are read through
     *     {@link Edge.drawnPattern}.
     */
    get drawnLine(): { name: string; length: number; width: number; visibility: number; centre: Vector3 } | null {
        if (this.pulled) {
            const src = this.srcNode.drawnPosition;
            const dst = this.dstNode.drawnPosition;
            return {
                name: this.pulled.name,
                length: Vector3.Distance(src, dst),
                width: this.drawnStyle?.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                visibility: this.pulled.visibility,
                centre: Vector3.Center(src, dst),
            };
        }

        if (this.lineBatch === null) {
            return null;
        }

        const batch = this.lineBatch;

        const ownColor = this.lineSlots.length > 0 && batch.colorOf(this.lineSlots[0]) !== null;
        return {
            // A batch keyed by shape draws every color, so the look it draws this edge in is named
            // with the color and opacity the edge wrote into its slots.
            name: ownColor ? `${batch.name}|${this.lineColor}|${String(this.lineOpacity)}` : batch.name,
            // A curve's length is its whole run's.
            length: this.lineSlots.reduce((sum, slot) => sum + batch.lengthOf(slot), 0),
            // The width `createLine` built the batch with, from the same style.
            width: this.drawnStyle?.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
            // A batch keyed by shape draws each slot at the opacity this edge wrote into it.
            visibility: ownColor ? this.lineOpacity : batch.mesh.visibility,
            centre: this.curveMiddle(batch),
        };
    }

    /**
     * The middle of this edge's run of slots: the middle of its one slot for a straight line, and
     * for a curve the middle of its middle segment, or the joint between its two middle ones.
     * @param batch - The batch the slots are in.
     * @returns The point, as a fresh vector.
     */
    private curveMiddle(batch: EdgeLineBatch): Vector3 {
        const n = this.lineSlots.length;

        return n % 2 === 1 ? batch.centreOf(this.lineSlots[(n - 1) / 2]) : batch.endsOf(this.lineSlots[n / 2])[0];
    }

    /**
     * The points this edge's curve -- or its line through its bends -- is drawn through, or null
     * when its line is one straight segment.
     *
     * A curve is a run of slots in a shared batch and has no mesh of its own whose vertices say
     * how far it bows, so the points are read back out of the slots: where each segment starts,
     * and where the last one ends. A patterned line laid along a curve, bends or a loop gives the
     * route it was laid along (issue #3102). Either way the points are in graph-root's space.
     * @returns The points, in order along the curve, as fresh vectors.
     */
    get drawnCurve(): Vector3[] | null {
        const path = this.pulled?.path ?? null;
        if (path !== null) {
            // a pulled curve's points, as its pieces place them (`meshes/pulledCurve.ts`), in the floats the card
            // holds them in, as the object path reads its slots: the camera frames the graph by these points, and a
            // frame placed from doubles sits a last bit off the object path's and moves a sample (ThreeDBends)
            return Array.from({ length: path.span.pieces + 1 }, (_, j) => {
                const { x, y, z } = curvePathPoint(path.src, path.dst, path.span, j);
                return new Vector3(Math.fround(x), Math.fround(y), Math.fround(z));
            });
        }

        if (this.mesh instanceof PatternedLineMesh) {
            const route = this.mesh.drawnRoute();
            return route !== null && route.length > 2 ? route : null;
        }

        const batch = this.lineBatch;
        const last = this.lineSlots.at(-1);

        if (batch === null || !(this.lineIsCurve || this.bundled || this.lifted) || last === undefined) {
            return null;
        }

        const points = this.lineSlots.map((slot) => batch.endsOf(slot)[0]);
        points.push(batch.endsOf(last)[1]);

        return points;
    }

    /**
     * The edge effects this edge draws, each with the points its run of pieces is placed through,
     * in the order they draw: the same points as the line's, so an effect follows a straight,
     * curved, bent or lifted route. Read like {@link Edge.drawnCurve}, from the slots.
     * @returns One entry per effect drawn.
     */
    get drawnEffects(): { id: string; points: Vector3[] }[] {
        return [...this.effectRuns.values()].flatMap((run) => {
            const last = run.slots.at(-1);
            if (run.batch.disposed || last === undefined) {
                return [];
            }

            const points = run.slots.map((slot) => run.batch.endsOf(slot)[0]);
            points.push(run.batch.endsOf(last)[1]);
            return [{ id: run.batch.shader.id, points }];
        });
    }

    /**
     * The elements a patterned line is drawn as -- each dash, dot or segment, in order along the
     * line -- and none for any other line. Each is a slot in a batch shared by every element of
     * its shape, so this is the only place to ask which shapes an edge draws.
     * @returns The elements.
     */
    get drawnPattern(): readonly ArrowCap[] {
        return this.mesh instanceof PatternedLineMesh ? this.mesh.elements : [];
    }

    /**
     * Where this edge's line is drawn, as the middle of the segment on screen.
     *
     * ONE ANSWER FOR BOTH RENDERERS, which is the point of it. A patterned line carries the
     * middle of its segment in its wrapper's position, and an edge drawn as slots in a batch
     * carries it in the slots' matrices -- for a curve, the middle of the curve, not of its first
     * segment. Asking the edge rather than its mesh gets the right number either way, and is the
     * only way to get it for a batched edge, whose mesh sits at the origin and is shared with
     * every other edge of the same appearance.
     * @returns The middle of the drawn line.
     */
    get drawnCentre(): Vector3 {
        return this.drawnLine?.centre ?? this.mesh.position;
    }

    /**
     * What this edge's arrow caps are drawn as.
     *
     * THE ONLY READING OF A CAP THERE IS. A cap drawn as a thin instance has no mesh of its own
     * in the scene and no material of its own, so the scene walk that read a cap's shape off
     * `scene.meshes` by name -- which is how the story assertions have always read one -- finds
     * one batch where it used to find one mesh per cap, and a batch's name deliberately does not
     * say "arrow". The edge is where the answer moved to: the shape is the name the cap's mesh
     * carried, the span is the reading a story used to take off its bounding box, and the
     * visibility is the opacity the cap is drawn at.
     * @returns One entry per cap this edge draws, head before tail.
     */
    get drawnCaps(): { end: EdgeCapEnd; name: string; span: number; visibility: number }[] {
        const caps: { end: EdgeCapEnd; cap: ArrowCap | null }[] = [
            { end: "arrowHead", cap: this.arrowCap },
            ...this.headStack.map(({ cap }) => ({ end: "arrowHead" as const, cap })),
            { end: "arrowTail", cap: this.arrowTailCap },
            ...this.tailStack.map(({ cap }) => ({ end: "arrowTail" as const, cap })),
            { end: "arrowMiddleHead", cap: this.arrowMiddleHeadCap },
            { end: "arrowMiddleTail", cap: this.arrowMiddleTailCap },
        ];

        return caps.flatMap(({ end, cap }) =>
            cap === null || cap.isDisposed()
                ? []
                : [{ end, name: cap.name, span: cap.span, visibility: cap.visibility }],
        );
    }

    /**
     * The caps drawn in a row behind this edge's head (`arrowHead.stack`), nearest the head first.
     * @returns The caps, each a slot in its appearance's batch as the head is.
     */
    get arrowHeadStackCaps(): readonly ArrowCap[] {
        return this.headStack.map(({ cap }) => cap);
    }

    /**
     * The caps drawn in a row behind this edge's tail (`arrowTail.stack`), nearest the tail first.
     * @returns The caps.
     */
    get arrowTailStackCaps(): readonly ArrowCap[] {
        return this.tailStack.map(({ cap }) => cap);
    }

    /**
     * How many edges share this edge's ordered endpoint pair, including this one.
     * @returns the count
     */
    get parallelCount(): number {
        return this.context.getDataManager().getEdgesBetween(this.srcId, this.dstId).length;
    }

    /**
     * Creates a new Edge instance connecting two nodes.
     * @param graph - The parent graph or graph context
     * @param srcNodeId - The ID of the source node
     * @param dstNodeId - The ID of the destination node
     * @param edgeId - The element-assigned counter the store stamped into this edge's
     *     `graphty.edgeId` column. It becomes {@link Edge.id}, and it is what makes two edges
     *     between the same pair of nodes two different edges
     * @param paint - The source mesh and the style to draw this edge from. Handed in rather than
     *     asked for: the session's paint is addressed by the dense index the store assigns after
     *     construction, so an edge starts from `bootstrapEdgePaint()` and the first style pass
     *     replaces it
     * @param data - Custom data associated with the edge
     * @param opts - Optional configuration options
     */
    constructor(
        graph: Graph | GraphContext,
        srcNodeId: NodeIdType,
        dstNodeId: NodeIdType,
        edgeId: number,
        paint: EdgePaint,
        data: AdHocData,
        opts: EdgeOpts = {},
    ) {
        this.parentGraph = graph;
        this.srcId = srcNodeId;
        this.dstId = dstNodeId;
        this.id = edgeIdOf(edgeId);
        this.opts = opts;
        this.#record = frozenRecord(data);

        // make sure both srcNode and dstNode already exist
        const srcNode = this.context.getDataManager().nodeCache.get(srcNodeId);
        if (!srcNode) {
            throw new Error(
                `Attempting to create edge '${srcNodeId}->${dstNodeId}', Node '${srcNodeId}' hasn't been created yet.`,
            );
        }

        const dstNode = this.context.getDataManager().nodeCache.get(dstNodeId);
        if (!dstNode) {
            throw new Error(
                `Attempting to create edge '${srcNodeId}->${dstNodeId}', Node '${dstNodeId}' hasn't been created yet.`,
            );
        }

        this.srcNode = srcNode;
        this.dstNode = dstNode;

        // The ray the intercept search aims and casts; its own vectors, never a mesh's, because
        // the search writes into them.
        this.ray = new Ray(
            this.srcNode.drawnPosition.clone(),
            this.dstNode.drawnPosition.subtract(this.srcNode.drawnPosition),
        );

        this.meshKey = paint.meshKey;

        // The layout engine gets this edge from DataManager, not from here.

        // create mesh
        const { style } = paint;
        this.drawnStyle = style;

        // An edge arriving in a graph already drawing edge shaders plays the entrances it starts with.
        if (EdgeShaderDrawing.peek(this.context.getScene()) !== undefined) {
            this.causedAt = performance.now();
        }

        // create arrow mesh if needed
        this.arrowCap = this.createEndCap(paint.meshKey, style, "arrowHead");

        // create arrow tail mesh if needed
        this.arrowTailCap = this.createEndCap(paint.meshKey, style, "arrowTail");

        this.createMidCaps(paint.meshKey, style);

        // create edge line mesh
        // Note: Edge.transformArrowCap() provides start/end positions already adjusted for node surfaces and arrows
        this.mesh = this.createLine(paint.meshKey, style);

        // Nothing is parented to graph-root here. Every line, pattern element and cap is a slot in
        // a batch, and a batch parents its one mesh when it is built, which puts every edge in it
        // under the graph's transform for XR gestures.

        // create the label and the arrow glyphs if configured
        this.syncContent(style, true);
    }

    /**
     * Invalidates the position cache, forcing the edge to be recalculated on the next update.
     * Call this when a connected node's size changes (e.g., due to selection).
     */
    invalidatePositionCache(): void {
        this._lastSrcPos = null;
        this._lastDstPos = null;
    }

    /**
     * The style this edge is currently drawn from.
     *
     * ONE READER FOR ONE FACT. An edge asks what it looks like on nearly every frame -- to decide
     * whether to bow, where to cut its line for an arrow cap, how wide to draw it -- and each of
     * those questions used to go straight to a static style table keyed by a style id, which was
     * a second door into an answer the session's stack may already have given. There is now one
     * door.
     * @returns The resolved style.
     */
    private get currentStyle(): EdgeStyleConfig {
        return this.sessionPaint?.style ?? bootstrapEdgePaint().style;
    }

    /**
     * Where the edge's label goes: where the layout put it (Graphviz's `lp`), else the middle of the line.
     * @param src - the source end
     * @param dst - the target end
     * @param bent - whether the line was drawn bent
     * @param labelAt - the layout's label place, relative to the two ends
     * @returns the point
     */
    private labelPoint(src: Vector3, dst: Vector3, bent: boolean, labelAt: EdgePosition["labelAt"]): Vector3 {
        if (labelAt !== undefined && !this.lifted) {
            return Vector3.FromArray(bendPoints(src, dst, labelAt));
        }

        return (bent || this.bundled ? this.routeMiddle() : null) ?? Vector3.Center(src, dst);
    }

    /**
     * Updates the edge's visual representation based on current node positions and style changes.
     * Performs dirty checking to skip updates when nodes haven't moved.
     */
    update(): void {
        // A DELIBERATELY disposed edge must never rebuild itself. UpdateManager iterates the
        // LAYOUT ENGINE's edge list every frame. DataManager.clear() takes a dropped dataset's
        // edges out of the engine before disposing them (#121), but DataManager.dispose() does
        // not, so this method can still be called on an edge whose dataset is gone. Without this
        // guard the style branch below would take a brand new slot (or build a patterned line)
        // for an edge nobody owns.
        if (this.disposed) {
            return;
        }

        // A hidden edge costs nothing per frame. It is also what keeps the arrow-cap branches
        // below from putting an arrowhead back on screen for an edge the mask has taken off it:
        // placing a cap IS showing it -- the collapsed matrix the mask wrote is overwritten by
        // the placement -- and those branches run on any frame an endpoint moves.
        if (!this.isRenderVisible()) {
            return;
        }

        // A renumbering freeze moves rows; a pulled piece follows by its nodes' rows, not their places.
        this.pullRows();

        // DIRTY TRACKING FIRST, BEFORE ANYTHING THAT COSTS. On a still graph this comparison is
        // the whole of an edge's frame, and the update pass walks every edge in the graph on
        // every frame -- so whatever sits above this line is paid a million times a second at the
        // render ceiling for edges that are not going to move. It used to sit below a timing call
        // and a lookup into the layout engine, neither of which the early exit needs: the
        // engine's answer is only read further down, for an edge that IS moving.
        const srcPos = this.srcNode.drawnPosition;
        const dstPos = this.dstNode.drawnPosition;

        const srcMoved = !(this._lastSrcPos?.equalsWithEpsilon(srcPos, 0.001) ?? false);
        const dstMoved = !(this._lastDstPos?.equalsWithEpsilon(dstPos, 0.001) ?? false);
        // An edge added beside this one, or taken away, fans this one out or back in.
        const { edgeVersion } = this.context.getDataManager();

        // A line through a support point moves when the point does, its nodes still or not.
        const via = this.drawnStyle?.line?.supportModel === undefined ? null : this.supportVia();
        const viaMoved = via !== this._lastVia;

        if (!srcMoved && !dstMoved && !viaMoved && edgeVersion === this.bundleVersion) {
            return;
        }

        this._lastVia = via;
        this.bundleVersion = edgeVersion;

        // a placed end that moves is a move; a first placement, or one after invalidatePositionCache, is at rest
        this.endsMoving = (srcMoved && this._lastSrcPos !== null) || (dstMoved && this._lastDstPos !== null);

        this.context.getStatsManager().startMeasurement("Edge.update");

        const lnk = this.context.getLayoutManager().layoutEngine?.getEdgePosition(this);
        if (!lnk) {
            this.endsMoving = false;
            this.context.getStatsManager().endMeasurement("Edge.update");
            return;
        }

        const src = new Vector3(lnk.src.x, lnk.src.y, lnk.src.z ?? 0);
        const dst = new Vector3(lnk.dst.x, lnk.dst.y, lnk.dst.z ?? 0);
        const lift = this.liftDrawn();
        const bentBefore = this.bundled || this.lifted;
        this.lifted = lift !== 0 && this.laysRoute();
        let bent = this.lifted;
        if (this.lifted) {
            this.bundled = false;
            this.placeLifted(this.lineBatch, src, dst, lift);
        } else {
            bent = this.placeLine(src, dst, lnk.bends, lnk.lineEnds);
        }

        if (bentBefore !== (this.bundled || this.lifted)) {
            edgeDrawChanges.count++;
        }

        // the layout's place (Graphviz's `lp` and `xlp`) is the label's center
        const laidLabel = lnk.labelAt !== undefined && !this.lifted;
        this.label?.attachTo(
            this.labelPoint(src, dst, bent, lnk.labelAt),
            laidLabel ? "center" : this._labelAttachPosition,
            laidLabel ? 0 : this._labelOffset,
        );

        this.placeXlabel(src, dst, bent, lnk.xlabelAt);
        this.placeArrowCaptions(src, dst, lnk);
        // the layout may leave a label out (Graphviz's `forcelabels=false` with no room for it)
        this.leftOutLabels = lnk.leftOut ?? [];
        this.setTextsDrawn(true);

        // Cache positions for next frame
        this._lastSrcPos = srcPos.clone();
        this._lastDstPos = dstPos.clone();
        this.endsMoving = false;

        this.context.getStatsManager().endMeasurement("Edge.update");
    }

    /**
     * Lay the edge's line between its ends: along its bends, along the route its layout laid it (Graphviz's
     * splines), along its bundle's route (a fanned arc or a self-loop), or straight with its arrow caps.
     * @param src - The source end.
     * @param dst - The target end.
     * @param laid - The bends of the route the layout laid, if it laid one.
     * @param laidEnds - Where the layout starts and ends the line, if it ends it itself: the line runs to them.
     * @returns Whether the line was laid along its bends.
     */
    private placeLine(
        src: Vector3,
        dst: Vector3,
        laid?: readonly number[],
        laidEnds?: EdgePosition["lineEnds"],
    ): boolean {
        this.followRoute();
        this.pullCurve(src, dst);
        const lays = this.laysRoute();
        const batch = lays ? this.lineBatch : null;
        const stored = this.lineRoute;
        const bent = lays && stored !== null && this.placeBent(batch, src, dst, stored);
        // a patterned line (no batch) follows the route as its elements (issue #3102)
        const followsLayout =
            !bent &&
            lays &&
            stored === null &&
            laid !== undefined &&
            this.srcNode !== this.dstNode &&
            this.placeBent(batch, src, dst, Edge.laidRoute(laid ?? [], laidEnds));
        const route = !bent && !followsLayout && lays ? this.bundleRoute(src, dst) : null;
        this.bundled = followsLayout || (route !== null && this.placeRoute(batch, src, dst, route));
        if (!bent && !this.bundled) {
            // a straight line the layout ends itself runs between its ends, as a laid route does
            const { srcPoint, dstPoint } =
                laidEnds !== undefined && stored === null && this.srcNode !== this.dstNode
                    ? this.placeLaidEnds(src, dst, laidEnds)
                    : this.transformArrowCap();
            // A wave with a period of its own starts where the line leaves its node, as Cytoscape desktop
            // lays its strokes from the node's outline, so its turns fall where the program's do.
            const surface =
                srcPoint === null && this.mesh instanceof PatternedLineMesh && this.mesh.wave !== undefined
                    ? this.getInterceptPoints()
                    : null;
            this.transformEdgeMesh(
                srcPoint ?? surface?.srcPoint ?? this.bareEnd("source", src, dst),
                dstPoint ?? surface?.dstPoint ?? this.bareEnd("target", dst, src),
            );
        }

        return bent;
    }

    /**
     * The route a layout laid: its bends, and when it ends the line itself, its ends first and last, in place of the
     * bends that sit at them (a Graphviz route's first and last bends are its ends).
     * @param laid - The bends.
     * @param ends - The line's ends, if the layout gives them.
     * @returns The route.
     */
    private static laidRoute(laid: readonly number[], ends: EdgePosition["lineEnds"]): NonNullable<Edge["lineRoute"]> {
        if (ends === undefined) {
            return { bends: [...laid], srcPort: null, dstPort: null, loop: false };
        }

        const at = (i: number, [along, across]: readonly [number, number]): boolean =>
            Math.hypot(laid[i] - along, laid[i + 1] - across) < LAID_END_MATCH;
        const inner: number[] = [];
        for (let i = 0; i + 1 < laid.length; i += 2) {
            if (!at(i, ends.source) && !at(i, ends.target)) {
                inner.push(laid[i], laid[i + 1]);
            }
        }

        return {
            bends: [...ends.source, ...inner, ...ends.target],
            srcPort: null,
            dstPort: null,
            loop: false,
            ends: true,
        };
    }

    /**
     * Whether this edge's line can be laid along a route: a slot run in its batch, or a patterned line's elements.
     * @returns False for a line of width 0 or one not built.
     */
    private laysRoute(): boolean {
        return !drawsNoLine(this.drawnStyle) && (this.lineBatch !== null || this.mesh instanceof PatternedLineMesh);
    }

    /**
     * The middle of the route this edge's line was last laid along: of its run of slots, or of its pattern's route.
     * @returns The point, or null when the line has no route to take it from.
     */
    private routeMiddle(): Vector3 | null {
        if (this.lineBatch) {
            return this.curveMiddle(this.lineBatch);
        }

        return this.mesh instanceof PatternedLineMesh ? this.mesh.routeMiddle() : null;
    }

    /**
     * Where a line with no cap at an end starts: its node's gap past the outline where the end has one (no node hides
     * that stretch, Cytoscape.js `source-distance-from-node`), else as {@link groupEnd} says.
     * @param end - Which end.
     * @param centre - Its node's center.
     * @param toward - The other end's center.
     * @returns The point.
     */
    private bareEnd(end: "source" | "target", centre: Vector3, toward: Vector3): Vector3 {
        const node = end === "source" ? this.srcNode : this.dstNode;
        const gap = this.gapAt(end);
        return gap > 0 ? this.leaveNode(node, centre, toward, gap) : this.groupEnd(node, centre, toward);
    }

    /**
     * Where a line with no cap at an end starts from that end's node: its center, which the opaque
     * node hides, or, for a node drawn behind every edge (a group region, or a 2D node below z-index 0:
     * `Node.isDrawnBehindEdges`), its outline, which is where Cytoscape.js and yEd end an edge to a compound node.
     * @param node - The end's node.
     * @param centre - Its center.
     * @param toward - The other end's center.
     * @returns The point.
     */
    private groupEnd(node: Node, centre: Vector3, toward: Vector3): Vector3 {
        if (!node.isDrawnBehindEdges) {
            return centre;
        }

        // The region is a thin plate: the line leaves it through its outline across the view, never through its
        // face, so the crossing is found in the plane and the line's depth carried along to it.
        const across = Math.hypot(toward.x - centre.x, toward.y - centre.y);
        const edge = this.leaveNode(node, centre, new Vector3(toward.x, toward.y, centre.z));
        const reached = Math.hypot(edge.x - centre.x, edge.y - centre.y);
        edge.z = across > 0 ? centre.z + ((toward.z - centre.z) * reached) / across : centre.z;
        return edge;
    }

    /**
     * Put the external label, if there is one: centered where the layout put it (Graphviz's `xlp`) unless its style
     * names a location, else against the line's middle where its style, or {@link EDGE_XLABEL_LOCATION}, says.
     * @param src - The source end.
     * @param dst - The target end.
     * @param bent - Whether the line was drawn bent.
     * @param xlabelAt - The layout's place, relative to the two ends.
     */
    private placeXlabel(src: Vector3, dst: Vector3, bent: boolean, xlabelAt: EdgePosition["xlabelAt"]): void {
        if (!this.xlabelLabel) {
            return;
        }

        const laid = xlabelAt !== undefined && !this.lifted && !this._xlabelPlacedByStyle;
        this.xlabelLabel.attachTo(
            this.labelPoint(src, dst, bent, laid ? xlabelAt : undefined),
            laid ? "center" : this._xlabelAttachPosition,
            laid ? 0 : this._xlabelOffset,
        );
    }

    /**
     * Put each end's caption, if it has one, beside the arrow cap where the cap now sits, or, at an
     * end drawn with no arrow, where the line leaves the node; centered where the layout put it
     * (Graphviz's `head_lp` and `tail_lp`) when its style does not place it.
     * @param src - The source node's center.
     * @param dst - The target node's center.
     * @param laid - Where the layout put the end labels, if it placed them.
     */
    private placeArrowCaptions(src: Vector3, dst: Vector3, laid: EdgePosition): void {
        // ponytail: a capless end is found along the straight line between the centers, not along a bent route
        const style = this.currentStyle;
        if (this.arrowHeadText) {
            const along =
                this.captionOnLine(style.arrowHead, this.dstNode, dst, src) ??
                this.captionLaid(style.arrowHead, src, dst, laid.headLabelAt);
            this.arrowHeadText.attachTo(
                along?.at ?? this.arrowCap?.position ?? this.leaveNode(this.dstNode, dst, src),
                along?.attachPosition ?? this._arrowHeadTextAttachPosition,
                along?.offset ?? this._arrowHeadTextOffset,
            );
        }

        if (this.arrowTailText) {
            const along =
                this.captionOnLine(style.arrowTail, this.srcNode, src, dst) ??
                this.captionLaid(style.arrowTail, src, dst, laid.tailLabelAt);
            this.arrowTailText.attachTo(
                along?.at ?? this.arrowTailCap?.position ?? this.leaveNode(this.srcNode, src, dst),
                along?.attachPosition ?? this._arrowTailTextAttachPosition,
                along?.offset ?? this._arrowTailTextOffset,
            );
        }
    }

    /**
     * Where an end's caption sits when the layout placed it and its style names no location of its own: centered on
     * the layout's place. Null otherwise.
     * @param arrow - The end's arrow block.
     * @param src - The source node's center.
     * @param dst - The target node's center.
     * @param place - The layout's place, relative to the two ends.
     * @returns The point, where the caption hangs from it and how far, or null.
     */
    private captionLaid(
        arrow: EdgeStyleConfig["arrowHead"],
        src: Vector3,
        dst: Vector3,
        place: EdgePosition["headLabelAt"],
    ): { at: Vector3; attachPosition: AttachPosition; offset: number } | null {
        if (place === undefined || this.lifted || arrow?.text?.location !== undefined) {
            return null;
        }

        return { at: Vector3.FromArray(bendPoints(src, dst, place)), attachPosition: "center", offset: 0 };
    }

    /**
     * Where an end's caption sits when its style gives `textDistance`: centered on the line, that far
     * along it from where it leaves the end's node (Cytoscape.js draws its source and target labels
     * so). Null without one, for the caption to hang beside the cap as before.
     * @param arrow - The end's arrow block.
     * @param node - The end's node.
     * @param centre - That node's center.
     * @param other - The other node's center.
     * @returns The point, where the caption hangs from it and how far, or null.
     */
    private captionOnLine(
        arrow: EdgeStyleConfig["arrowHead"],
        node: Node,
        centre: Vector3,
        other: Vector3,
    ): { at: Vector3; attachPosition: AttachPosition; offset: number } | null {
        const distance = arrow?.textDistance;
        if (distance === undefined) {
            return null;
        }

        const start = this.leaveNode(node, centre, other);
        const toward = other.subtract(centre);
        const length = toward.length();
        const at = length > 0 ? start.add(toward.scale(distance / length)) : start;

        return { at, attachPosition: "center", offset: 0 };
    }

    /**
     * Rebuild this edge's line, arrow caps and label from the paint it is currently drawn from.
     *
     * A REBUILD REQUEST, NOT A STYLE CHANGE: the 2D/3D switch makes it with every mesh already
     * disposed. What to draw is the style stack's answer; WHETHER to draw is the caller's.
     */
    updateStyle(): void {
        // See update(): a disposed edge is still reachable from the layout engine, and this
        // method builds meshes. Refuse rather than resurrect.
        if (this.disposed) {
            return;
        }

        const paint = this.currentPaint();

        this.sessionPaint = paint;
        this.paintMarked(paint);
    }

    /**
     * Build this edge's label and arrow captions again when a font they draw in has just loaded
     * (issue #3531): one measured and drawn while its web font was loading shows the fallback face.
     * @param families - The families that loaded, as `fontFamilies` gives them.
     * @returns True when anything was rebuilt.
     * @internal
     */
    refreshFonts(families: ReadonlySet<string>): boolean {
        const texts = [this.label, this.xlabelLabel, this.arrowHeadText, this.arrowTailText];
        if (this.disposed || this.drawnStyle === null || !texts.some((text) => text?.usesFont(families) === true)) {
            return false;
        }

        this.syncContent(this.drawnStyle, true);
        return true;
    }

    /**
     * What this edge looks like right now.
     *
     * See Node.currentPaint: the painter is asked rather than the field read, because a rebuild
     * can arrive between the session being bound and the first frame that drains its dirty set.
     * @returns The session's paint when one is bound, and the element's own defaults otherwise.
     */
    private currentPaint(): EdgePaint {
        const painter = this.context.getStylePainter?.();
        const painted = painter?.owns === true ? (this.sessionPaint ?? painter.edgePaint(this.index)) : null;

        return painted ?? bootstrapEdgePaint();
    }

    /**
     * Draw this edge as the session's style stack resolved it.
     * @param paint - The source mesh and the style behind it.
     */
    applySessionPaint(paint: EdgePaint): void {
        if (this.disposed) {
            return;
        }

        this.sessionPaint = paint;
        this.paintMarked(paint);
    }

    /**
     * Draw a paint, with the selection halo over it when this edge is selected.
     *
     * The line keeps its own paint, as a selected node keeps its own: like a node's halo the mark
     * is drawn from the selection mask, never from a layer (see `GraphSelectionStyle`).
     * @param paint - The paint the style stack resolved.
     */
    private paintMarked(paint: EdgePaint): void {
        edgeDrawChanges.count++;
        this.paintFrom(paint.meshKey, paint.style);
        this.paintHalo(paint.style);
        this.syncShading(paint.style);

        const hidden = paint.style.visible === false;
        if (hidden !== this.styleHidden) {
            this.styleHidden = hidden;
            this.applyRenderState();
        }
    }

    /**
     * Draw, move or drop the band of the configured edge selection colour, at the configured
     * opacity, along this edge's line: the edge's halo.
     *
     * THE SELECTION STYLE'S THREE EDGE SETTINGS (`edgeColor`, `edgeScale`, `edgeOpacity`). The
     * band is `edgeScale` times twice the line's width and is drawn BEHIND the line, pushed back
     * in depth, so the line keeps its own paint down the middle and the band shows on both sides
     * as a casing. It used to read the node halo's settings: a pale gold band at 0.4 opacity
     * beside a one-pixel line, which on a dense drawing could not be told from the grey edges.
     * Before that it recoloured the line itself, darkened until it stood 3:1 from the canvas: on
     * a light canvas that turned gold into a dark olive nobody had configured.
     * @param style - The line's resolved style; the band follows its width and its curve.
     */
    private paintHalo(style: EdgeStyleConfig): void {
        const { graph } = this.context.getStyles().config;
        // A band a layer painted; else, while selected, the selection settings' band -- unless the
        // starting rows are on, where the Selected row draws it as a style instead.
        let selection: Pick<GraphSelectionStyleConfig, "edgeColor" | "edgeScale" | "edgeOpacity"> | null = null;
        if (style.band?.color !== undefined) {
            selection = {
                edgeColor: style.band.color,
                edgeScale: style.band.scale ?? DEFAULT_SELECTION_STYLE.edgeScale,
                edgeOpacity: style.band.opacity ?? DEFAULT_SELECTION_STYLE.edgeOpacity,
            };
        } else if (this.selected && graph.startingRows !== true) {
            selection = graph.selection ?? DEFAULT_SELECTION_STYLE;
        }
        const width = (style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH) * 2 * (selection?.edgeScale ?? 0);
        const curve = style.line?.bezier === true;
        const key =
            selection === null
                ? null
                : `selection-halo|${selection.edgeColor}|${String(selection.edgeOpacity)}|${String(width)}|${String(curve)}`;
        const gone = this.haloBatch?.mesh.isDisposed() ?? true;

        if (key === this.haloKey && (key === null || !gone)) {
            return;
        }

        this.releaseHalo();
        this.haloKey = key;

        if (selection === null || key === null) {
            return;
        }

        const { edgeColor: color, edgeOpacity: opacity } = selection;
        this.haloBatch = EdgeMesh.lineBatch(
            this.context.getMeshCache(),
            { styleId: key, width, color },
            { line: { type: "solid", color, opacity, width, bezier: curve } },
            this.context.getScene(),
        );
        // Behind the line: the batch is the band's alone, so its material can be pushed back.
        if (this.haloBatch?.mesh.material) {
            this.haloBatch.mesh.material.zOffset = HALO_DEPTH_OFFSET;
            this.haloBatch.mesh.material.zOffsetUnits = HALO_DEPTH_OFFSET;
        }
        this.haloSlots = this.haloBatch ? [this.haloBatch.acquire(this)] : [];
        this.haloIsCurve = curve;
        // The band has no place until the next update puts it on the line.
        this.invalidatePositionCache();
    }

    /** Hand the halo's slots back to its batch, so a deselected edge draws no band. */
    private releaseHalo(): void {
        for (const slot of this.haloSlots) {
            this.haloBatch?.release(slot);
        }

        this.haloBatch = null;
        this.haloSlots = [];
        this.haloKey = null;
    }

    /**
     * Build the line, the arrow caps and the label one resolved style asks for.
     * @param meshKey - Which source mesh this edge is drawn from.
     * @param style - The resolved style everything below is built from.
     */
    private paintFrom(meshKey: string, style: EdgeStyleConfig): void {
        // Only skip update if the source mesh is the same AND mesh is not disposed
        // (mesh can be disposed when switching 2D/3D modes via meshCache.clear())
        // A patterned line says so with a flag rather than a method. It used to be read as always
        // alive, so a view-mode switch -- which disposes it and repaints the edge with the same
        // style -- skipped the rebuild and left the line disposed.
        const meshDisposed = this.mesh instanceof PatternedLineMesh ? this.mesh.isDisposed : this.mesh.isDisposed();

        // WHAT THIS RETURN MAY AND MAY NOT SKIP. The mesh key is minted from the channels whose
        // role is `mesh`, with the colour and the opacity folded back into the string by
        // `StylePainter.edgePaintOf` because an edge has no per-instance state to write them
        // into -- so an unchanged key means the line, its caps and its colour are all unchanged.
        // The `content` channels are keyed by nothing, so they are applied here. See
        // `drawnLabelText` for the defect that reached a consumer.
        // A DIFFERENT KEY FOR THE SAME STYLE IS NOT A REBUILD. Every element is constructed from
        // the bootstrap paint, whose key is a sentinel no session key ever equals, and the first
        // style pass then hands it the session's key -- for the same style, whenever no layer
        // touches the element, which is every element of a plain load. Comparing keys alone
        // rebuilt every node and edge once: dispose the placeholder mesh, build the same mesh
        // again. Babylon's dispose is a linear search of the scene's mesh list and of the parent's
        // children, so that rebuild cost the size of the scene per element and the load grew as
        // its square (issue #388: 4,000 nodes took 28 s, 10,000 never finished). A style that is
        // deep-equal to the one the current mesh was built from means the same geometry, the same
        // colour and the same content by construction, so the key is adopted and nothing is
        // touched.
        // The bends are a `content` channel and key no mesh, but a dashed or dotted line that gains
        // or loses its bends moves between pattern elements and a joined line in a batch
        // (`EdgeMesh.drawsAsPattern`), which is a different mesh.
        // A surface draws as a solid joined line whatever the pattern, once it can draw.
        const asSurface = surfaceOf(style) !== null && this.lineBuilt === flavorOf(style);
        const wantsPattern =
            (style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH) > 0 &&
            EdgeMesh.drawsAsPattern(style, this.srcNode === this.dstNode) &&
            !asSurface;
        // A line moves between a pulled piece and a placed slot when the render path changes.
        // a pulled line that becomes a curve, or stops being one, moves between batches (`EdgeMesh.pullsCurve`)
        const samePull =
            this.wantsPull(style) === (this.pulled !== null) &&
            (this.pulled === null || (this.pulled.run !== null) === this.pullsCurve(style));
        const sameRoute = wantsPattern === this.mesh instanceof PatternedLineMesh && samePull;
        // A surface or a taper keys no source mesh either (`content` channels), but it is drawn
        // from a batch of its own, so asking for another one rebuilds the line.
        const sameFlavor = flavorOf(style) === this.lineWanted;
        const sameGeometry = sameRoute && sameFlavor && (meshKey === this.meshKey || sameStyle(style, this.drawnStyle));

        if (!meshDisposed && (sameGeometry || (sameRoute && sameFlavor && this.restyleInPlace(meshKey, style)))) {
            this.meshKey = meshKey;
            this.drawnStyle = style;
            this.syncContent(style, false);
            return;
        }

        this.meshKey = meshKey;
        this.drawnStyle = style;

        // Invalidate position cache to force edge redraw with new style
        this._lastSrcPos = null;
        this._lastDstPos = null;
        // PHASE 5: Dispose pattern lines or solid lines appropriately
        this.releaseLine();

        // recreate arrow mesh if needed. A cap is an instance of its scene's batch, and the batch
        // owns the material: disposing an instance's material would dispose the material every
        // other cap in the batch draws with. The batch disposes it with its last instance
        // (FilledArrowRenderer.instanceOf).
        if (this.arrowCap && !this.arrowCap.isDisposed()) {
            this.arrowCap.dispose();
        }

        this.arrowCap = this.createEndCap(meshKey, style, "arrowHead");

        // recreate arrow tail mesh if needed
        if (this.arrowTailCap && !this.arrowTailCap.isDisposed()) {
            this.arrowTailCap.dispose();
        }

        this.arrowTailCap = this.createEndCap(meshKey, style, "arrowTail");

        this.createMidCaps(meshKey, style);

        // recreate edge line mesh; the next update places it, because the endpoint cache was
        // invalidated above
        this.mesh = this.createLine(meshKey, style);

        // Nothing is parented to graph-root here. Every line, pattern element and cap is a slot in
        // a batch, and a batch parents its one mesh when it is built, which puts every edge in it
        // under the graph's transform for XR gestures.

        // Update the label and the arrow glyphs.
        //
        // UNCONDITIONALLY, which is what the `true` says: the arrow meshes the two glyphs are
        // positioned against were replaced above, so a glyph asking for exactly what was drawn
        // a moment ago is still pointing at a mesh that is gone.
        this.syncContent(style, true);

        // Every mesh above is new, so whatever the visibility mask said about this edge has to be
        // said again -- otherwise a restyle silently puts a filtered-out edge back on screen.
        this.applyRenderState();
    }

    /**
     * Build one end cap a resolved style asks for.
     * @param meshKey - Which source mesh the edge is drawn from.
     * @param style - The resolved style.
     * @param end - The head or the tail.
     * @param reuse - The cap drawn at that end now, recolored and handed back when the new look's
     *     batch is its own (see `EdgeMesh.createArrowHead`).
     * @returns The cap, or null for none.
     */
    private createEndCap(
        meshKey: string,
        style: EdgeStyleConfig,
        end: "arrowHead" | "arrowTail",
        reuse: ArrowCap | null = null,
    ): ArrowCap | null {
        const arrow = style[end];
        return EdgeMesh.createArrowHead(
            this.context.getMeshCache(),
            end === "arrowHead" ? meshKey : `${meshKey}-tail`,
            {
                type: arrow?.type ?? "none",
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color: arrow?.color ?? style.line?.color ?? "#FFFFFF",
                size: arrow?.size,
                breadth: arrow?.width,
                side: arrow?.side,
                opacity: arrow?.opacity,
                image: arrow?.image,
                outline: arrow?.outlineWidth,
            },
            this.context.getScene(),
            reuse,
        );
    }

    /**
     * Write this edge's line color and opacity into each of its slots, for a batch that reads them
     * per slot (one keyed by shape, see `EdgeMesh.lineBatch`); a batch whose material holds them
     * ignores it.
     * @param style - The look the line is drawn in.
     */
    private colorLine(style: EdgeStyleConfig): void {
        const batch = this.lineBatch;
        if (batch === null) {
            return;
        }

        this.lineColor = style.line?.color ?? "#FFFFFF";
        const rgb = Color3.FromHexString(this.lineColor);
        const opacity = EdgeMesh.opacityOf(style);
        this.lineOpacity = opacity;
        for (const slot of this.lineSlots) {
            batch.setColor(slot, rgb.r, rgb.g, rgb.b, opacity);
        }
    }

    /**
     * Whether this edge draws only a plain batched line and its end caps, which
     * {@link Edge.restyleInPlace} knows how to move: no outline, gradient, band, middle cap, cap
     * stack or arrow caption.
     * @returns True for one.
     */
    private drawsPlainLine(): boolean {
        return (
            this.lineBatch !== null &&
            this.pulled === null &&
            this.lineBuilt === "plain" &&
            this.lineWanted === "plain" &&
            this.outlineBatch === null &&
            this.gradientPieces.length === 0 &&
            this.haloBands.length === 0 &&
            this.arrowMiddleHeadCap === null &&
            this.arrowMiddleTailCap === null &&
            this.headStack.length === 0 &&
            this.tailStack.length === 0 &&
            this.arrowHeadText === null &&
            this.arrowTailText === null
        );
    }

    /**
     * Move a plain line and its end caps to the batches of a look that differs from the one they
     * are drawn with only in colour and opacity, copying where each is drawn rather than building
     * and placing them again.
     *
     * WHY THIS EXISTS (#6026). Colour and opacity are a batch's, folded into the mesh key, so a
     * look that changes only them -- the Ghost row, as a time window slides past thousands of
     * edges a frame -- took the whole rebuild in `paintFrom` for every edge: release the line,
     * dispose and rebuild every cap, rebuild the content, and place everything again on the next
     * frame. Nothing about where the edge is drawn moved, so the slots are copied instead.
     * Anything but the common case (see {@link Edge.drawsPlainLine}) takes the rebuild.
     *
     * AND NOW NOT EVEN COPIED. A plain line's batch is keyed by its shape and a billboarded cap's
     * by its shape alone, each slot carrying its own color and opacity, so the new look's batches
     * are the ones the edge is already in: the line's slots and the caps are recolored where they
     * are, four floats each. Only a batch that still holds its color on its material (an animated
     * line, a 2D or sphere-dot cap) is moved to as before.
     * @param meshKey - The new look's mesh key.
     * @param style - The new look.
     * @returns True when the edge now draws the new look; false, having changed nothing, when it
     *     must be rebuilt.
     */
    private restyleInPlace(meshKey: string, style: EdgeStyleConfig): boolean {
        const old = this.lineBatch;
        const width = style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH;
        if (
            old === null ||
            width <= 0 ||
            flavorOf(style) !== "plain" ||
            !this.drawsPlainLine() ||
            this.drawnStyle === null ||
            !differsOnlyInColour(style, this.drawnStyle)
        ) {
            return false;
        }

        const next = EdgeMesh.lineBatch(
            this.context.getMeshCache(),
            { styleId: meshKey, width, color: style.line?.color ?? "#FFFFFF" },
            style,
            this.context.getScene(),
            false,
            this.srcNode === this.dstNode,
            true,
        );
        if (next === null) {
            return false;
        }

        // A batch keyed by shape draws every color: the slots stay and only their color changes.
        let placed = true;
        if (next !== old) {
            // Every slot is copied before any is released: the last release takes the old batch with it.
            const slots = this.lineSlots.map((slot) => {
                const moved = next.adopt(old, slot, this);
                placed &&= moved.copied;
                return moved.slot;
            });
            for (const slot of this.lineSlots) {
                old.release(slot);
            }

            this.lineBatch = next;
            this.lineSlots = slots;
            this.mesh = next.mesh;
        }

        this.colorLine(style);
        placed = this.moveEndCaps(meshKey, style) && placed;

        // Whatever could not be copied is placed by the next update.
        if (!placed) {
            this.invalidatePositionCache();
        }

        return true;
    }

    /**
     * Rebuild both end caps in a new look, each standing where its old cap stood.
     * @param meshKey - The new look's mesh key.
     * @param style - The new look.
     * @returns False when a cap could not take its old cap's place and must be placed again.
     */
    private moveEndCaps(meshKey: string, style: EdgeStyleConfig): boolean {
        let placed = true;
        const move = (cap: ArrowCap | null, end: "arrowHead" | "arrowTail"): ArrowCap | null => {
            const live = cap !== null && !cap.isDisposed();
            const made = this.createEndCap(meshKey, style, end, live ? cap : null);
            // A cap whose batch draws the new look too was recolored where it stands, and stays.
            if (live && made !== cap) {
                placed = (made?.takePlaceOf(cap) ?? false) && placed;
                cap.dispose();
            }

            return made;
        };
        this.arrowCap = move(this.arrowCap, "arrowHead");
        this.arrowTailCap = move(this.arrowTailCap, "arrowTail");

        return placed;
    }

    /**
     * Bring the line's static values and the edge's effects into line with one resolved style:
     * the surface's parameters, the taper, the colors and the state each slot carries, and one run
     * of slots per edge effect. Written on a paint, never because the edge moved.
     * @param style - The resolved style.
     */
    private syncShading(style: EdgeStyleConfig): void {
        if (this.disposed) {
            return;
        }

        const scene = this.context.getScene();
        const surface = surfaceOf(style);
        const names = surface !== null || alongUsesOf(style).length > 0;
        const drawing = names
            ? EdgeShaderDrawing.of(scene, this.context.getSession?.())
            : (EdgeShaderDrawing.peek(scene) ?? null);

        const batch = this.lineBatch;
        if (batch?.widened === true) {
            this.syncLineShading(style, batch, drawing, surface);
        } else {
            this.lineStatic = null;
            this.surfaceEnteredFor = null;
        }

        if (drawing !== null) {
            this.syncEffects(style, drawing);
        }
    }

    /**
     * The line half of {@link Edge.syncShading}, for a widened line batch: play the surface's
     * entrance when the surface changed, then write the line's static values and speed into every
     * slot.
     * @param style - The resolved style.
     * @param batch - The line batch, widened.
     * @param drawing - The scene's edge shader drawing, or null when there is none.
     * @param surface - The surface's id, or null for none.
     */
    private syncLineShading(
        style: EdgeStyleConfig,
        batch: EdgeLineBatch,
        drawing: EdgeShaderDrawing | null,
        surface: string | null,
    ): void {
        const shader =
            surface !== null && this.lineBuilt === `surface:${surface}`
                ? (drawing?.shader(surface, this) ?? null)
                : null;
        if (shader !== null && this.surfaceEnteredFor !== surface && drawing !== null) {
            const { stamp, untilMs } = drawing.entrance(shader, this.causedAt);
            this.surfaceEntered = stamp;
            this.surfaceEnteredFor = surface;
            for (const slot of this.lineSlots) {
                shaded(batch)?.playUntil(slot, untilMs);
            }
        }

        const look = this.staticLook(style, shader === null ? EDGE_NEVER : this.surfaceEntered);
        const values = surface === null ? undefined : fixedParamsOf(paintUseOf(style)?.params);
        this.lineStatic =
            shader !== null && drawing !== null ? drawing.staticValues(look, shader, values) : edgeStaticValues(look);
        this.lineSpeed = shader !== null && drawing !== null ? drawing.speedOf(shader, values) : 0;
        for (const slot of this.lineSlots) {
            this.prepareLineSlot(slot);
        }
    }

    /**
     * Write the line's static values and speed into one of its slots: every slot on a paint, and
     * each slot a run takes as it grows.
     * @param slot - The slot.
     */
    private prepareLineSlot(slot: number): void {
        if (this.lineStatic !== null) {
            this.lineBatch?.writeStatic(slot, this.lineStatic);
        }

        shaded(this.lineBatch)?.setSpeed(slot, this.lineSpeed);
    }

    /**
     * What every one of this edge's shader slots carries beside its shader's own values.
     * @param style - The resolved style.
     * @param entered - The entered stamp of the shader the values are for.
     * @returns The look.
     */
    private staticLook(style: EdgeStyleConfig, entered: number): EdgeStaticLook {
        const painted = style.line?.color;
        const { rgb, alpha } = readColor(typeof painted === "string" ? painted : undefined, "#a9a9a9");
        const color: [number, number, number, number] = [rgb.r, rgb.g, rgb.b, (style.line?.opacity ?? 1) * alpha];
        let bits = this.selected ? EDGE_STATE_BITS.selected : 0;
        bits |= this.srcNode.isSelected() ? EDGE_STATE_BITS.sourceSelected : 0;
        bits |= this.dstNode.isSelected() ? EDGE_STATE_BITS.targetSelected : 0;
        return {
            colorA: color,
            colorB: color,
            seed: edgeSeedOf(this.id),
            bits,
            taper: taperOf(style),
            times: [entered, EDGE_NEVER, this.changedStamp],
        };
    }

    /**
     * One run of slots per use along the edge (at most four, `alongUsesOf`), each placed with the
     * line's own points; a use no longer drawn plays its exit, if it has one.
     * @param style - The resolved style.
     * @param drawing - The scene's edge shader drawing.
     */
    private syncEffects(style: EdgeStyleConfig, drawing: EdgeShaderDrawing): void {
        const width = style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH;
        const wanted = this.isRenderVisible() && width > 0 ? alongUsesOf(style) : [];
        if (wanted.length === 0 && this.effectRuns.size === 0) {
            return;
        }

        const is2D = EdgeMesh.drawsFlat(this.context.getScene());
        const line = Edge.effectLineOf(style, width, is2D);
        const kept = new Set<string>();
        for (const [key, { id, params: values }] of wanted) {
            const name = `edge-effect|${id}|${String(width)}|${is2D ? "2d" : "3d"}`;
            const batch = drawing.effectBatch(this, id, this.context.getMeshCache(), name, line);
            if (batch === null) {
                continue;
            }

            kept.add(key);
            const run = this.effectRunFor(key, batch, drawing);
            run.values = drawing.staticValues(this.staticLook(style, run.entered), batch.shader, values);
            run.speed = drawing.speedOf(batch.shader, values);
            for (const slot of run.slots) {
                batch.writeStatic(slot, run.values);
                batch.setSpeed(slot, run.speed);
            }
        }

        for (const [id, run] of [...this.effectRuns]) {
            if (!kept.has(id)) {
                this.releaseEffect(id, run, true);
            }
        }
    }

    /**
     * The line an edge effect's batch is drawn along: the edge's width in the units of the view,
     * its painted color (dark gray when none is painted) and its opacity.
     * @param style - The resolved style.
     * @param width - The line's width as painted.
     * @param is2D - Whether the scene draws flat.
     * @returns The line facts the batch is keyed and drawn by.
     */
    private static effectLineOf(
        style: EdgeStyleConfig,
        width: number,
        is2D: boolean,
    ): { width: number; worldWidth: boolean; color: string; opacity: number } {
        const painted = style.line?.color;
        return {
            width: is2D ? width / 40 : width * 20,
            worldWidth: is2D,
            color: typeof painted === "string" ? painted : "#a9a9a9",
            opacity: style.line?.opacity ?? 1,
        };
    }

    /**
     * The run that draws one effect with one batch: the edge's current run when it still draws with
     * that batch, else a new run of one slot that plays the effect's entrance (an old run on another
     * or a disposed batch is released at once, without its exit).
     * @param id - The effect's id.
     * @param batch - The batch the effect draws with now.
     * @param drawing - The scene's edge shader drawing.
     * @returns The run.
     */
    private effectRunFor(id: string, batch: EffectRun["batch"], drawing: EdgeShaderDrawing): EffectRun {
        const run = this.effectRuns.get(id);
        if (run?.batch === batch && !batch.disposed) {
            return run;
        }

        if (run !== undefined) {
            this.releaseEffect(id, run, false);
        }

        const { stamp, untilMs } = drawing.entrance(batch.shader, this.causedAt);
        const slot = batch.acquire(this);
        if (untilMs > 0) {
            batch.playUntil(slot, untilMs);
        }

        const created: EffectRun = { batch, slots: [slot], values: new Float32Array(0), speed: 0, entered: stamp };
        this.effectRuns.set(id, created);
        // The run has no place until the next update puts it on the line.
        this.invalidatePositionCache();
        return created;
    }

    /**
     * Stop drawing one effect: at once, or, when it declares an exit and `exit` is asked for,
     * after the exit plays (at most a second), with its slots no longer placed.
     * @param id - The effect's id.
     * @param run - Its run.
     * @param exit - Whether to play its exit.
     */
    private releaseEffect(id: string, run: EffectRun, exit: boolean): void {
        this.effectRuns.delete(id);
        if (run.batch.disposed) {
            return;
        }

        const seconds = exit ? Math.min(timingOf(run.batch.shader.registration.descriptor).exit ?? 0, 1) : 0;
        const drawing = EdgeShaderDrawing.peek(this.context.getScene());
        if (seconds <= 0 || drawing === undefined) {
            for (const slot of run.slots) {
                run.batch.release(slot);
            }

            return;
        }

        // The exited stamp, so the effect's sinceExited counts from now.
        run.values[17] = drawing.now();
        const ends = performance.now() + seconds * 1000;
        for (const slot of run.slots) {
            run.batch.writeStatic(slot, run.values);
            run.batch.retireAt(slot, ends);
        }
    }

    /**
     * Place every effect's run with the line's points: a run of pieces, or one straight piece.
     * @param flat - The points, flat x, y, z; two points for a straight line.
     */
    private placeEffects(flat: readonly number[]): void {
        if (this.effectRuns.size === 0) {
            return;
        }

        for (const run of this.effectRuns.values()) {
            if (run.batch.disposed) {
                continue;
            }

            this.placeRun(run.batch, run.slots, flat, (slot) => {
                run.batch.writeStatic(slot, run.values);
                run.batch.setSpeed(slot, run.speed);
            });
        }
    }

    /**
     * How far this edge's route rises out of the layout plane now: its `edge.lift`, drawn only for
     * a flat layout in the 3D view (anywhere else the layer reports `edge.lift-needs-flat-layout`).
     * @returns The lift in world units, 0 for none.
     */
    private liftDrawn(): number {
        const lift = this.drawnStyle?.line?.lift;
        if (typeof lift !== "number" || lift === 0 || !Number.isFinite(lift) || this.srcNode === this.dstNode) {
            return 0;
        }

        const scene = this.context.getScene();
        const frame = scene.getFrameId();
        let rule = liftRule.get(scene);
        if (rule?.frame !== frame) {
            const layout = this.context.getSession?.()?.layout;
            rule = { frame, draws: layout?.dimension === "3d" && layout.arrangedDimension === "2d" };
            liftRule.set(scene, rule);
        }

        return rule.draws ? lift : 0;
    }

    /**
     * Draw this edge lifted out of its layout plane: its route (through its bends, or curved, or
     * straight) between the node centers, raised along the plane's normal as an arc, then trimmed
     * at the node surfaces and for its arrow caps like a bent edge, so the caps, the label, the
     * band, the effects and picking all follow the lifted route.
     * @param batch - The batch the run is in, or null for a patterned line's elements.
     * @param src - The source node's center.
     * @param dst - The target node's center.
     * @param lift - How far the middle rises.
     */
    private placeLifted(batch: EdgeLineBatch | null, src: Vector3, dst: Vector3, lift: number): void {
        const bezier = this.drawnStyle?.line?.bezier === true;
        const stored = this.lineRoute;
        let base: number[];
        if (stored === null) {
            base = bezier ? EdgeMesh.createBezierLine(src, dst) : [src.x, src.y, src.z, dst.x, dst.y, dst.z];
        } else {
            base = fileRoute(src, dst, stored, this.srcNode.drawnHalfExtents, this.dstNode.drawnHalfExtents);
        }

        const reach = (node: Node): number => {
            const half = node.drawnHalfExtents;
            return (node.roundRadius ?? Math.max(half.x, half.y, half.z)) + node.borderReach;
        };
        const mid = interiorOutside(liftRoute(base, lift), reach(this.srcNode), reach(this.dstNode));
        if (mid.length === 0) {
            const { srcPoint, dstPoint } = this.transformArrowCap();
            this.transformEdgeMesh(srcPoint ?? src, dstPoint ?? dst);
            return;
        }

        this.placeThrough(batch, src, dst, mid, bezier && stored !== null);
    }

    /**
     * Draw this edge's line from the paint it holds again: a shader it names can draw now, or can
     * no longer draw. Asks for the line to be rebuilt even when the paint did not change.
     * @internal
     */
    refreshShaderPaint(): void {
        const paint = this.sessionPaint;
        if (this.disposed || paint === null) {
            return;
        }

        // The line is rebuilt only when what it can be drawn with changed: a surface that can draw
        // now, or one it is drawn with that can no longer draw. An effect is added by the paint.
        const surface = surfaceOf(this.drawnStyle);
        const drawable =
            surface !== null &&
            (EdgeShaderDrawing.peek(this.context.getScene())?.shader(surface, this) ?? null) !== null;
        if (flavorOf(this.drawnStyle) !== this.lineBuilt || (this.lineBuilt.startsWith("surface:") && !drawable)) {
            this.lineWanted = "";
        }

        this.paintMarked(paint);
    }

    /**
     * This edge's data changed: stamp the time its shaders read as `sinceChanged`, and play the
     * entrance of a shader it starts carrying now.
     * @internal
     */
    shaderDataChanged(): void {
        const drawing = EdgeShaderDrawing.peek(this.context.getScene());
        if (drawing === undefined || this.disposed) {
            return;
        }

        this.causedAt = performance.now();
        this.changedStamp = drawing.now();
        const style = this.drawnStyle;
        if (style !== null && (this.lineStatic !== null || this.effectRuns.size > 0)) {
            this.syncShading(style);
            const seconds = (batch: EdgeLineBatch | null): number => {
                return timingOf(shaded(batch)?.shader.registration.descriptor).change ?? 0;
            };
            const play = (batch: EdgeLineBatch | null, slots: readonly number[]): void => {
                const change = seconds(batch);
                for (const slot of change > 0 ? slots : []) {
                    shaded(batch)?.playUntil(slot, performance.now() + change * 1000);
                }
            };
            play(this.lineBatch, this.lineSlots);
            for (const run of this.effectRuns.values()) {
                play(run.batch, run.slots);
            }
        }
    }

    /**
     * Build this edge's line, as a slot in a shared batch when the style allows one and as a mesh
     * of this edge's own otherwise.
     *
     * {@link EdgeMesh.lineBatch} makes the choice, and it makes it from the style and the scene,
     * so one call site cannot get a different answer from another. What comes back is what
     * {@link Edge.mesh} points at either way: the batch's mesh, or the pattern's own wrapper.
     * @param meshKey - Which appearance this edge is drawn with.
     * @param style - The resolved style to draw from.
     * @returns What the line is drawn by.
     */
    private createLine(meshKey: string, style: EdgeStyleConfig): AbstractMesh | PatternedLineMesh {
        const options = {
            styleId: meshKey,
            width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
            color: style.line?.color ?? "#FFFFFF",
        };

        // A WIDTH OF 0 DRAWS NO LINE (#2067). The edge still takes one straight slot, so it has a
        // line to point at like any other, but the slot is never placed (transformEdgeMesh), and
        // an unplaced slot is a zero matrix the shader draws no fragments for. Taking the solid
        // path also keeps a pattern from building elements nobody can see.
        const drawnStyle =
            options.width > 0 ? style : { ...style, line: { ...style.line, type: "solid" as const, bezier: false } };

        this.lineWanted = flavorOf(style);
        const pulled = this.wantsPull(style) ? this.pullLine(options, style) : null;
        if (pulled) {
            this.lineBatch = null;
            this.lineSlots = [];
            this.lineBuilt = "plain";
            this.readRoute(style);
            return pulled;
        }

        this.lineBatch = options.width > 0 ? this.shadedLineBatch(meshKey, style, options) : null;
        // A surface that cannot draw yet leaves a taper's or a fade's batch here, or nothing; which
        // of them was built is what wakes the edge once the surface can.
        const built = shaded(this.lineBatch) === null ? "taper" : this.lineWanted;
        this.lineBuilt = this.lineBatch === null ? "plain" : built;
        this.lineBatch ??= EdgeMesh.lineBatch(
            this.context.getMeshCache(),
            options,
            drawnStyle,
            this.context.getScene(),
            false,
            this.srcNode === this.dstNode,
            true,
        );

        if (this.lineBatch) {
            // A curve's run of slots is sized to its length when it is first placed.
            this.readRoute(drawnStyle);
            this.lineSlots = [this.lineBatch.acquire(this)];
            this.colorLine(drawnStyle);
            this.lineStatic = null;
            this.createOutline(meshKey, drawnStyle);
            this.createGradient(meshKey, drawnStyle);

            // No per-edge mesh to make unpickable and nothing to hang `parentEdge` on: the batch
            // is unpickable as a whole, and the back-reference was only ever written and never
            // read -- reproducing it would be an array of Edge references one per edge, which is
            // the kind of per-edge object a batch exists to remove.
            return this.lineBatch.mesh;
        }

        // a patterned line is laid along its bends too (issue #3102)
        this.readRoute(style);
        return EdgeMesh.createPatternedLine(options, style, this.context.getScene());
    }

    /**
     * Whether this edge's line is to be pulled from the row table: it {@link Edge.pullsLine}, it
     * draws a line at all, and the graph keeps a row table to pull from.
     * @param style - The resolved style.
     * @returns True when it is to be pulled.
     */
    private wantsPull(style: EdgeStyleConfig): boolean {
        return (
            (style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH) > 0 &&
            this.pullsLine(style) &&
            (this.context.getRowTable?.() ?? null) !== null
        );
    }

    /**
     * Whether this edge's line is pulled from the row table (`PulledLineBatch`): on the `"batched"`
     * render path (or behind the internal switch `pulledEdgesDefault`), a plain solid straight line
     * between two node centres -- no cap, gap, group, bend, label, band or any other line
     * key -- in 3D, while lines do not fade by age (a pulled piece carries no age). A curve is pulled
     * too, through its support point when it has one (`line.supportModel`), and only a curve may stop short of its nodes by a gap (`line.nodeGap`): its shape is its two centres' and, for one that fans out of a
     * bundle, how far it bows (spread by `fanSpacing` when set), or for one that does not, its circle's
     * radius (`arcRadius`), or for one raised off the map or a globe (`line.route` "arc" or "great-circle", which wins
     * over both, and pulls a straight line as a curve too, `EdgeMesh.pullsCurve`), its height
     * (`arcHeight`), the style's route or the one the layout picks (followed as it is placed), which each placement writes; a self-loop is
     * pulled as its teardrop, whatever its curve or route asks for
     * (`meshes/pulledCurve.ts`, {@link Edge.pullCurve}). Read when the line is built.
     * @param style - The resolved style.
     * @returns True when it is pulled.
     */
    private pullsLine(style: EdgeStyleConfig): boolean {
        const line = style.line ?? {};
        return (
            (pulledEdgesDefault.value || (this.context.getNodeBatches?.() ?? null) !== null) &&
            !this.srcNode.isDrawnAsGroup &&
            !this.dstNode.isDrawnAsGroup &&
            !EdgeMesh.drawsFlat(this.context.getScene()) &&
            setsOnly(style, PULLED_STYLE_KEYS) &&
            setsOnly(line, PULLED_LINE_KEYS) &&
            (this.pullsCurve(style) || !(line.nodeGap || line.sourceNodeGap || line.targetNodeGap)) &&
            (line.type ?? "solid") === "solid" &&
            (!line.animationSpeed || this.pullsAnimated(style)) &&
            // a line through bends is pulled straight, not rounded or round a self-loop's ring
            (parseBends(line.bends) === null || (line.bezier !== true && !this.isLoop)) &&
            drawnText(style.label) === undefined &&
            noCap(style.arrowHead) &&
            noCap(style.arrowTail) &&
            style.band?.color === undefined &&
            !batchUploadFrames.edgeAges(this.context.getScene()).on
        );
    }

    /**
     * Whether an animated line (`line.animationSpeed`) is pulled (`meshes/pulledAnimatedLine.ts`): only on the
     * `"batched"` render path, only straight, and only opaque, as the greased line it redraws.
     * @param style - The resolved style.
     * @returns True when it is pulled.
     */
    private pullsAnimated(style: EdgeStyleConfig): boolean {
        return (
            (this.context.getNodeBatches?.() ?? null) !== null &&
            !this.pullsCurve(style) &&
            EdgeMesh.opacityOf(style) >= 1 &&
            !EdgeMesh.drawsOpaque(style)
        );
    }

    /**
     * Whether a pulled line with this style is drawn from a curve batch ({@link EdgeMesh.pullsCurve}), on the route
     * it takes now, its style's or the layout's.
     * @param style - The resolved style.
     * @returns True for a pulled curve.
     */
    private pullsCurve(style: EdgeStyleConfig): boolean {
        return EdgeMesh.pullsCurve(style, this.isLoop, this.routeOf(style));
    }

    /**
     * Move a pulled line between the straight and the curve batch, as it is placed, when the route the layout picks
     * for it has changed ({@link Edge.routeOf}): the layout's map came or went, or changed surface, which keys no
     * mesh, so no restyle would. The placement then writes the route's shape ({@link Edge.pullCurve}).
     */
    private followRoute(): void {
        const style = this.drawnStyle;
        if (this.pulled !== null && style !== null && (this.pulled.run !== null) !== this.pullsCurve(style)) {
            this.updateStyle();
        }
    }

    /**
     * Take a piece of the pulled batch and give it this line's look.
     * @param options - The line's look.
     * @param options.styleId - The look's key.
     * @param options.width - Its width.
     * @param options.color - Its color.
     * @param style - The resolved style.
     * @returns The batch's mesh, or null when the graph keeps no row table.
     */
    private pullLine(
        options: { styleId: string; width: number; color: string },
        style: EdgeStyleConfig,
    ): AbstractMesh | null {
        const rows = this.context.getRowTable?.() ?? null;
        if (rows === null) {
            return null;
        }

        const scene = this.context.getScene();
        const batch = EdgeMesh.pulledBatch(
            this.context.getMeshCache(),
            options,
            style,
            scene,
            () => rows.positionTexture,
            this.isLoop,
            this.routeOf(style),
            this.context.leansLines?.() ?? false,
        );
        const piece = batch.acquire();
        // As `createStaticLine` hands the plain line's material its look.
        const opacity = EdgeMesh.opacityOf(style);
        const animationSpeed = style.line?.animationSpeed ?? 0;
        const color = Color3.FromHexString(options.color);
        // an animated line's width and color as its greased line takes them (`EdgeMesh.createAnimatedLine`)
        const look = animationSpeed
            ? { color: movingTexel(color), opacity, width: options.width / 40 }
            : { color, opacity, width: options.width * 20 };
        batch.setLook(piece, look.color, look.opacity, look.width);
        if (animationSpeed) {
            batch.setSpeed(piece, animationSpeed);
        }

        const curve = this.pullsCurve(style);
        if (curve) {
            // nothing drawn until the first placement writes the span
            batch.setCurve(piece, 0, null);
        }

        this.pulled = {
            batch,
            piece,
            source: -1,
            target: -1,
            drawn: true,
            name: `edge-style-${options.styleId}-pulled`,
            visibility: Math.min(opacity, 1),
            run: curve ? [] : null,
            look,
        };
        this.pullRows();
        return batch.mesh;
    }

    /**
     * Write a pulled curve's span for its two centres, as `placeRoute` would cut the curve there -- a lone
     * curve, the arc it fans out of its bundle on ({@link Edge.fanOf}), its circle (`line.arcRadius`), or its raised arc (`line.route`
     * "arc"), the quadratic through its support point (`line.supportModel`), or a self-loop's teardrop round its node -- taking pieces while the cut
     * needs more than it holds, each node grown by its gap (`line.nodeGap`). A curve no point of which clears both nodes is drawn as the lone
     * curve between its bare ends ({@link Edge.bareEnd}), uncut, as the object path draws it (`placeCurve`); one it would draw another way
     * (`curveSpan` null: a centre outside its own node, or bare ends that meet) draws nothing.
     * @param src - The source node's centre.
     * @param dst - The target node's centre.
     */
    private pullCurve(src: Vector3, dst: Vector3): void {
        if ((this.pulled?.run ?? null) === null) {
            return;
        }

        if (this.isLoop) {
            // a self-loop's teardrop, whatever else its style asks for, as `bundleRoute` draws it
            const { rank, count } = this.context.getDataManager().drawnBundle(this);
            const around = Edge.outside(this.srcNode, src);
            const loop = loopShape(rank, count, (dir) => Edge.reachOf(this.srcNode, dir));
            this.pullSpan(curveSpan(src, src, around, around, { loop }), src, src);
            return;
        }

        // a straight line through bends wins over every route, as `placeLine` lays it; where no bend clears both nodes it
        // is drawn as it would be without them (`bundleRoute`) when raised off the map, else as the lone curve between its
        // bare ends, as `transformEdgeMesh` draws a line with a route (`lineIsCurve`)
        const { route } = this;
        const bends = this.lineRoute?.bends ?? null;
        if (bends !== null) {
            const bent = curveSpan(
                src,
                dst,
                Edge.outside(this.srcNode, src, this.gapAt("source")),
                Edge.outside(this.dstNode, dst, this.gapAt("target")),
                { bends },
                () => [this.bareEnd("source", src, dst), this.bareEnd("target", dst, src)],
            );
            if (route === "straight" || (bent?.bends ?? null) !== null) {
                this.pullSpan(bent, src, dst);
                return;
            }
        }

        // a raised or great-circle arc, the style's or the layout's, wins over a fan and a circle, as `bundleRoute` draws it
        const raised = route !== "straight";
        const height = raised ? (this.drawnStyle?.line?.arcHeight ?? DEFAULT_ARC_HEIGHT[route]) : null;
        // a support point wins over a fan and a circle, as `bundleRoute` draws it
        const support = raised ? null : this.supportVia();
        const via = support === null ? null : viaShare(src, dst, support);
        const fan = raised || via !== null ? null : this.fanOf(src, dst);
        // `fanArc` bows to the left of the bundle's first edge; the span's bow is to the left of this one
        let bow: number | null = null;
        if (fan !== null) {
            bow = fan.forward ? fan.offset : -fan.offset;
        }
        // a curve that does not fan is drawn on its circle when it has a radius, as `bundleRoute` draws it
        const radius = fan === null && via === null ? (this.drawnStyle?.line?.arcRadius ?? null) : null;
        const span = curveSpan(
            src,
            dst,
            Edge.outside(this.srcNode, src, this.gapAt("source")),
            Edge.outside(this.dstNode, dst, this.gapAt("target")),
            // a straight line raised off the map that clears neither node is drawn straight (`placeLine`)
            {
                bow,
                radius,
                height,
                via,
                globe: route === "great-circle",
                straight: this.drawnStyle?.line?.bezier !== true,
            },
            () => [this.bareEnd("source", src, dst), this.bareEnd("target", dst, src)],
        );
        this.pullSpan(span, src, dst);
    }

    /**
     * Write a pulled curve's span to its pieces, taking more while the span needs more than they hold.
     * @param span - The span, or null to draw nothing.
     * @param src - The source centre it was cut between.
     * @param dst - The target centre.
     */
    private pullSpan(span: CurveSpan | null, src: Vector3, dst: Vector3): void {
        const { pulled } = this;
        const run = pulled?.run ?? null;
        if (pulled === null || run === null) {
            return;
        }

        pulled.path = span === null ? null : { src: src.clone(), dst: dst.clone(), span };

        const { batch, look } = pulled;
        while (run.length + 1 < (span?.pieces ?? 0)) {
            const piece = batch.acquire();
            batch.setLook(piece, look.color, look.opacity, look.width);
            batch.setRows(piece, pulled.source, pulled.target);
            run.push(piece);
        }

        const bends = span?.bends ?? null;
        const kept = pulled.route ?? null;
        // a line through bends' cut path itself, its ends and the bends between, placed in doubles as `placeBent`
        // places them, so the card draws the very points the object path does
        const points =
            span === null || bends === null
                ? null
                : Array.from({ length: span.pieces + 1 }, (_, j) => curvePathPoint(src, dst, span, j)).flatMap((p) => [
                      p.x,
                      p.y,
                      p.z,
                  ]);
        if (points === null) {
            batch.releaseRoute(kept?.at ?? -1);
            pulled.route = null;
        } else if (kept?.points.length !== points.length || kept.points.some((v, i) => v !== points[i])) {
            pulled.route = { at: batch.writeRoute(kept?.at ?? -1, points), points };
        }
        const at = pulled.route?.at ?? 0;
        batch.setCurve(pulled.piece, 0, span, at);
        run.forEach((piece, i) => {
            batch.setCurve(piece, i + 1, span, at);
        });
    }

    /**
     * Whether this edge is a self-loop, from a node back to it.
     * @returns True for a self-loop.
     */
    private get isLoop(): boolean {
        return this.srcNode === this.dstNode;
    }

    /** Write this edge's rows to its pulled piece when they changed: its nodes', or none while hidden. */
    private pullRows(): void {
        const { pulled } = this;
        if (pulled === null) {
            return;
        }

        const source = pulled.drawn ? this.srcNode.index : -1;
        const target = pulled.drawn ? this.dstNode.index : -1;
        if (source !== pulled.source || target !== pulled.target) {
            pulled.batch.setRows(pulled.piece, source, target);
            for (const piece of pulled.run ?? []) {
                pulled.batch.setRows(piece, source, target);
            }

            pulled.source = source;
            pulled.target = target;
        }
    }

    /**
     * Whether this edge's line is pulled from the row table rather than placed.
     * @returns True for a pulled line.
     * @internal
     */
    get isPulled(): boolean {
        return this.pulled !== null;
    }

    /**
     * The batch a line with a surface or a taper is drawn from, or null for the plain line's.
     *
     * A SURFACE replaces the line's pattern (`edge.style`), so its line is a solid joined line
     * drawn with the surface's program; until the surface can draw (resolving, compiling, held,
     * failed) the line is drawn as the layers beneath paint it, and the drawing asks for this edge
     * again once it can. A TAPER is the plain line's own program, widened to read the taper; a
     * line drawn as separate pattern elements does not taper.
     * @param meshKey - Which appearance the edge is drawn with.
     * @param style - The resolved style.
     * @param options - The line's width and color.
     * @param options.width - The width.
     * @param options.color - The color.
     * @param options.styleId - The appearance's key, which names the batch.
     * @returns The batch, or null.
     */
    private shadedLineBatch(
        meshKey: string,
        style: EdgeStyleConfig,
        options: { styleId: string; width: number; color: string },
    ): EdgeLineBatch | null {
        const scene = this.context.getScene();
        const cache = this.context.getMeshCache();
        const surface = surfaceOf(style);
        if (surface !== null) {
            const drawing = EdgeShaderDrawing.of(scene, this.context.getSession?.());
            const is2D = EdgeMesh.drawsFlat(scene);
            const opacity = EdgeMesh.opacityOf(style);
            const batch = drawing?.surfaceBatch(
                this,
                surface,
                cache,
                `edge-surface|${surface}|${meshKey}|${is2D ? "2d" : "3d"}`,
                {
                    width: is2D ? options.width / 40 : options.width * 20,
                    worldWidth: is2D,
                    color: options.color,
                    opacity,
                    fade: EdgeMesh.fadeOf(style),
                    opaque: EdgeMesh.drawsOpaque(style),
                },
            );
            if (batch) {
                return batch;
            }
        }

        const loop = this.srcNode === this.dstNode;
        if (!widensLine(style) || EdgeMesh.drawsAsPattern(style, loop)) {
            return null;
        }

        return EdgeMesh.lineBatch(cache, options, style, scene, true, loop);
    }

    /**
     * Stop drawing this edge's line, whichever of the two it is.
     *
     * A BATCH IS SHARED, so a batched line is handed its slot back rather than disposed -- calling
     * `dispose()` on what {@link Edge.mesh} points at would take every other edge of the same
     * appearance off the screen with it.
     */
    private releaseLine(): void {
        if (this.pulled) {
            this.pulled.batch.release(this.pulled.piece);
            for (const piece of this.pulled.run ?? []) {
                this.pulled.batch.release(piece);
            }

            this.pulled.batch.releaseRoute(this.pulled.route?.at ?? -1);

            this.pulled = null;
            return;
        }

        for (const { batch, slot } of this.gradientPieces) {
            batch.release(slot);
        }

        this.gradientPieces = [];

        if (this.outlineBatch) {
            for (const slot of this.outlineSlots) {
                this.outlineBatch.release(slot);
            }

            this.outlineBatch = null;
            this.outlineSlots = [];
        }

        for (const { batch, slots } of this.haloBands) {
            for (const slot of slots) {
                batch.release(slot);
            }
        }

        this.haloBands = [];

        if (this.lineBatch) {
            for (const slot of this.lineSlots) {
                this.lineBatch.release(slot);
            }

            this.lineBatch = null;
            this.lineSlots = [];
            return;
        }

        // PatternedLineMesh has its own dispose logic, so it is called whatever the state.
        if (this.mesh instanceof PatternedLineMesh || !this.mesh.isDisposed()) {
            this.mesh.dispose();
        }
    }

    /**
     * Bring the text this edge draws into line with what one resolved style asks for.
     *
     * SEPARATE FROM THE GEOMETRY REBUILD, and the separation is the whole point. `paintFrom`
     * skips its work when the source mesh has not changed, which is correct for a line and its
     * caps; an edge's words are not keyed by that mesh, so they have to be looked at on every
     * paint instead. Each of the three has its own comparison, so a repaint that leaves the
     * text alone rebuilds nothing.
     *
     * WHY A REBUILD INVALIDATES THE POSITION CACHE. A `RichTextLabel` built here is at the
     * origin until `update()` places it, and `update()` returns early when neither endpoint has
     * moved -- so on a settled layout, which is exactly when a reader switches labels on, the
     * label would be built and then left in the middle of the scene. Clearing the cached
     * endpoints is what asks the next frame to place it.
     * @param style - The resolved style.
     * @param rebuild - True when the meshes the text is positioned against have just been
     *     replaced, so text asking for what was drawn a moment ago must still be built again.
     */
    private syncContent(style: EdgeStyleConfig, rebuild: boolean): void {
        // Every one runs: each brings its own part into line, whatever the others found.
        const label = this.syncLabel(style, rebuild);
        const xlabel = this.syncXlabel(style, rebuild);
        const captions = this.syncArrowCaptions(style, rebuild);
        const bends = this.syncBends(style);
        const placement = this.syncPlacement(style);

        if (label || xlabel || captions || bends || placement) {
            this.invalidatePositionCache();
            // Overlapping texts are thinned out with node labels when `labels.declutter` is on.
            if (this.label ?? this.xlabelLabel ?? this.arrowHeadText ?? this.arrowTailText) {
                LabelDeclutter.trackEdge(this.context.getScene(), this.context, this);
            }
        }
    }

    /**
     * Bring the edge's label into line with what one resolved style asks for. See
     * {@link syncContent}.
     * @param style - The resolved style.
     * @param rebuild - True when the meshes the label is positioned against have just been replaced.
     * @returns True when the label was rebuilt.
     */
    private syncLabel(style: EdgeStyleConfig, rebuild: boolean): boolean {
        const wantedLabel = drawnText(style.label);
        const labelText = wantedLabel === undefined ? undefined : this.extractLabelText(wantedLabel);

        if (!rebuild && labelText === this.drawnLabelText && isEqual(wantedLabel, this.drawnLabelStyle)) {
            return false;
        }

        this.label?.dispose();
        this.label = null;

        if (wantedLabel !== undefined) {
            const { label, offset, attachPosition } = this.createLabel(style);
            this.label = label;
            this._labelOffset = offset;
            this._labelAttachPosition = attachPosition;
        }

        this.drawnLabelText = labelText;
        // CLONED rather than held: the block belongs to an `EdgePaint` that
        // `StylePainter.edgePaint` builds fresh on every call, and a comparison against a
        // reference somebody else can still write to silently starts passing.
        this.drawnLabelStyle = wantedLabel === undefined ? undefined : cloneDeep(wantedLabel);
        return true;
    }

    /**
     * Bring the external label (`xlabel`) into line with one resolved style: drawn in the label's look with its own
     * fields over it. Rebuilt only when what it is drawn from changes, or the meshes it is placed against were
     * replaced. See {@link syncContent}.
     * @param style - The resolved style.
     * @param rebuild - True when the meshes the label is positioned against have just been replaced.
     * @returns True when the external label was rebuilt.
     */
    private syncXlabel(style: EdgeStyleConfig, rebuild: boolean): boolean {
        // its words switch it on, whichever way they were written
        const own = style.xlabel;
        const wanted =
            own?.text === undefined || own.text === "" || own.enabled === false
                ? undefined
                : drawnText({ ...own, enabled: true });
        const key = wanted === undefined ? undefined : JSON.stringify([style.label, wanted]);
        if (!rebuild && key === this.drawnXlabel) {
            return false;
        }

        this.xlabelLabel?.dispose();
        this.xlabelLabel = null;
        this.drawnXlabel = key;
        if (wanted === undefined) {
            return true;
        }

        // the label's look, less where it sits and what it says; the external label's own fields win
        const block = { ...omit(style.label ?? {}, XLABEL_UNSHARED), ...wanted };
        const placement = this.placementOf(wanted, EDGE_XLABEL_LOCATION, 0);
        this.xlabelLabel = new RichTextLabel(
            this.context.getScene(),
            this.createLabelOptions(this.extractLabelText(wanted), block, placement),
        );
        this._xlabelAttachPosition = placement.attachPosition;
        this._xlabelOffset = placement.attachOffset;
        this._xlabelPlacedByStyle = wanted.location !== undefined;
        return true;
    }

    /**
     * Record the style values that key no mesh but move what is drawn: the captions' distances
     * along the line, the fan, the route and the gap at the nodes. See {@link syncContent}.
     * @param style - The resolved style.
     * @returns True when any of them changed, so the edge must be placed again.
     */
    private syncPlacement(style: EdgeStyleConfig): boolean {
        let changed = false;

        // Where a caption sits along the line keys nothing either: a new distance only moves it.
        const distances = `${String(style.arrowHead?.textDistance)} ${String(style.arrowTail?.textDistance)}`;
        if (distances !== this.drawnCaptionDistances) {
            this.drawnCaptionDistances = distances;
            changed = true;
        }

        // The fan spacing keys no mesh either: a new one only moves the arc.
        if (style.line?.fanSpacing !== this.drawnFanSpacing) {
            this.drawnFanSpacing = style.line?.fanSpacing;
            changed = true;
        }

        if (style.line?.fanned !== this.drawnFanned || style.line?.arcRadius !== this.drawnArcRadius) {
            this.drawnFanned = style.line?.fanned;
            this.drawnArcRadius = style.line?.arcRadius;
            changed = true;
        }

        const route = `${String(style.line?.route)} ${String(style.line?.arcHeight)}`;
        if (route !== this.drawnRoute) {
            this.drawnRoute = route;
            changed = true;
        }

        const gaps = `${String(style.line?.nodeGap)} ${String(style.line?.sourceNodeGap)} ${String(style.line?.targetNodeGap)}`;
        if (gaps !== this.drawnNodeGap) {
            this.drawnNodeGap = gaps;
            changed = true;
        }

        return changed;
    }

    /**
     * Bring the arrow caps' captions into line with what one resolved style asks for. See
     * {@link syncContent}.
     * @param style - The resolved style.
     * @param rebuild - True when the caps the captions sit beside have just been replaced.
     * @returns True when a caption was rebuilt.
     */
    private syncArrowCaptions(style: EdgeStyleConfig, rebuild: boolean): boolean {
        let rebuilt = false;

        const wantedHead = captionWanted(style.arrowHead?.text);

        if (rebuild || !isEqual(wantedHead, this.drawnArrowHeadText)) {
            this.arrowHeadText?.dispose();
            this.arrowHeadText = null;

            if (wantedHead !== undefined) {
                const { label, offset, attachPosition } = this.createArrowText(wantedHead, "arrowHead");
                this.arrowHeadText = label;
                this._arrowHeadTextOffset = offset;
                this._arrowHeadTextAttachPosition = attachPosition;
            }

            this.drawnArrowHeadText = wantedHead === undefined ? undefined : cloneDeep(wantedHead);
            rebuilt = true;
        }

        const wantedTail = captionWanted(style.arrowTail?.text);

        if (rebuild || !isEqual(wantedTail, this.drawnArrowTailText)) {
            this.arrowTailText?.dispose();
            this.arrowTailText = null;

            if (wantedTail !== undefined) {
                const { label, offset, attachPosition } = this.createArrowText(wantedTail, "arrowTail");
                this.arrowTailText = label;
                this._arrowTailTextOffset = offset;
                this._arrowTailTextAttachPosition = attachPosition;
            }

            this.drawnArrowTailText = wantedTail === undefined ? undefined : cloneDeep(wantedTail);
            rebuilt = true;
        }

        return rebuilt;
    }

    /**
     * Bring the line's bends into line with what one resolved style asks for. A route is per edge
     * and keys no mesh (`edge.bends` is a `content` channel), so a paint that changes only the
     * bends keeps the line's slots and re-places them.
     * @param style - The resolved style.
     * @returns True when the bends changed.
     */
    private syncBends(style: EdgeStyleConfig): boolean {
        const batch = this.lineBatch;
        if (Edge.routeKey(style) === this.drawnBends) {
            return false;
        }

        // a patterned line holds no slots: its elements are laid along the new route when it is placed, as a pulled
        // line's span is
        if (batch === null) {
            if (this.mesh instanceof PatternedLineMesh || this.pulled !== null) {
                this.readRoute(style);
                return true;
            }

            return false;
        }

        this.readRoute(style);
        // A straight line is one slot: hand back the rest of a run, the band's as well as the line's
        // (a selected edge's band followed the bends in a run of its own).
        while (!this.lineIsCurve && this.lineSlots.length > 1) {
            const slot = this.lineSlots.pop();
            if (slot !== undefined) {
                batch.release(slot);
            }
        }
        while (!this.lineIsCurve && this.haloSlots.length > 1) {
            const slot = this.haloSlots.pop();
            if (slot !== undefined) {
                this.haloBatch?.release(slot);
            }
        }

        return true;
    }

    /**
     * The texts a style stores this edge's route in, joined, to tell when they change.
     * @param style - The resolved style.
     * @returns The key.
     */
    private static routeKey(style: EdgeStyleConfig): string {
        const { line } = style;
        return [line?.bends, line?.sourcePort, line?.targetPort, line?.bendCurve].map((t) => t ?? "").join("|");
    }

    /**
     * Read the route a style stores for this edge's line, and whether the line is a curve.
     * @param style - The resolved style.
     */
    private readRoute(style: EdgeStyleConfig): void {
        const loop = this.srcNode === this.dstNode;
        const bends = parseBends(style.line?.bends);
        // a loop's ports alone say nothing about its shape: it keeps its usual loop
        const srcPort = loop && bends === null ? null : parsePort(style.line?.sourcePort);
        const dstPort = loop && bends === null ? null : parsePort(style.line?.targetPort);
        this.drawnBends = Edge.routeKey(style);
        this.lineRoute =
            bends === null && srcPort === null && dstPort === null ? null : { bends, srcPort, dstPort, loop };
        this.lineIsCurve = style.line?.bezier === true || this.lineRoute !== null;
    }

    /**
     * Tears down every Babylon resource this edge owns.
     *
     * THE DEFECT THIS CLOSES, and it was visible on screen: no Edge.dispose existed at all.
     * `DataManager.clear()` emptied its maps and called `meshCache.clear()`, which disposes the
     * cached SOURCE meshes -- and Babylon disposes a source mesh's instances with it. That is why
     * node spheres and 3D solid edge lines vanished on a dataset clear while roughly sixty grey
     * ARROWHEADS stayed on the canvas, in rosettes where the previous dataset's edges had
     * converged. Arrowheads are not in the MeshCache (today each is an instance of a per-scene
     * batch that `FilledArrowRenderer.instanceOf` frees with its last head): they are parented
     * to the `graph-root` TransformNode, which outlives every dataset, so nothing but this
     * dispose frees them. The same was true of the patterned-line meshes
     * (dot/dash/star/...), 2D lines, bezier curves and all three RichTextLabels.
     *
     * Every dispose is guarded with `isDisposed()` -- matching the idiom already used in
     * `updateStyle` -- because the line mesh may be an instance whose SOURCE `meshCache.clear()`
     * is about to dispose, or has just disposed. `PatternedLineMesh` owns its own dispose logic
     * (it disposes a per-element ShaderMaterial that Babylon's default flags would leave behind),
     * so it is routed to that rather than to `AbstractMesh.dispose`.
     *
     * A DISPOSED EDGE STILL RECEIVES CALLS, which is why {@link Edge.isDisposed} exists: the layout
     * engine keeps its own edge list and `UpdateManager` walks it every frame regardless of what
     * DataManager holds. Calling this twice is safe.
     */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        edgeDrawChanges.count++;

        this.releaseLine();
        this.releaseHalo();
        // A removed edge is kept drawn only while an effect on it plays its exit; with none, every
        // slot it held is handed back now and nothing of it is drawn in the next frame.
        for (const [id, run] of [...this.effectRuns]) {
            this.releaseEffect(id, run, true);
        }

        if (this.arrowCap && !this.arrowCap.isDisposed()) {
            this.arrowCap.dispose();
        }

        this.arrowCap = null;

        if (this.arrowTailCap && !this.arrowTailCap.isDisposed()) {
            this.arrowTailCap.dispose();
        }

        this.arrowTailCap = null;

        for (const cap of [this.arrowMiddleHeadCap, this.arrowMiddleTailCap, ...this.stackCaps()]) {
            if (cap && !cap.isDisposed()) {
                cap.dispose();
            }
        }

        this.arrowMiddleHeadCap = null;
        this.arrowMiddleTailCap = null;
        this.headStack = [];
        this.tailStack = [];

        this.label?.dispose();
        this.label = null;
        this.xlabelLabel?.dispose();
        this.xlabelLabel = null;
        this.drawnXlabel = undefined;
        this.arrowHeadText?.dispose();
        this.arrowHeadText = null;
        this.arrowTailText?.dispose();
        this.arrowTailText = null;

        // Cleared with them, so the caches never say text is drawn that is not.
        this.drawnLabelText = undefined;
        this.drawnLabelStyle = undefined;
        this.drawnArrowHeadText = undefined;
        this.drawnArrowTailText = undefined;
    }

    /**
     * Does nothing.
     * @deprecated Each edge aims its own ray when it needs one, so there is no graph-wide ray
     * update any more. Will be removed in graphty-element 4.0.
     * @param _g - Ignored
     */
    static updateRays(_g: Graph | GraphContext): void {
        // deliberately empty: kept so callers of the 3.x API still compile
    }

    /**
     * Reports whether {@link Edge.dispose} has run on this edge.
     *
     * Note this is about the EDGE, not about `edge.mesh.isDisposed()`: a live edge's line mesh is
     * disposed and rebuilt on every style change, so the mesh's own flag says nothing about
     * whether the edge is still part of the graph.
     * @returns True once this edge has been disposed
     */
    isDisposed(): boolean {
        return this.disposed;
    }

    /**
     * Whether the renderer is currently drawing this edge.
     * @returns True when it is drawn.
     */
    isRenderVisible(): boolean {
        return this.renderVisible && !this.styleHidden;
    }

    /**
     * Say whether the renderer should draw this edge.
     *
     * HIDING IS NOT DELETION: the edge keeps its row in the store, its dense index, its endpoints
     * and its style. Showing it again puts back the slots it was hidden from as they were (see
     * `applyRenderState`), and the next frame re-places it only if its endpoint cache says
     * something moved while it was hidden.
     * @param visible - What the visibility mask says about this edge.
     * @returns True when this changed the state.
     */
    setRenderVisible(visible: boolean): boolean {
        if (this.renderVisible === visible) {
            return false;
        }

        this.renderVisible = visible;
        this.applyRenderState();

        return true;
    }

    /**
     * Whether this edge is in the session's selection.
     * @returns True when it is selected.
     */
    isSelected(): boolean {
        return this.selected;
    }

    /**
     * Say whether this edge is selected, and draw it marked or plain to match (see `paintMarked`).
     * @param selected - What the selection mask says about this edge.
     * @returns True when this changed the state.
     */
    setSelected(selected: boolean): boolean {
        if (this.selected === selected) {
            return false;
        }

        this.selected = selected;
        this.updateStyle();

        return true;
    }

    /**
     * Enable or disable every mesh this edge owns, to match {@link Edge.renderVisible}.
     *
     * HIDING PARKS, SHOWING PUTS BACK (issue #6025). Every slot this edge holds in a batch is parked
     * when it is hidden: a joined line and a billboarded cap set the slot's hidden flag, one float
     * the shader reads, and leave its placement where it is; any other batch zeroes the slot and
     * keeps what it held aside. Showing it puts each slot back as it was and keeps the endpoint cache, so the next update re-places the edge only if an end moved
     * (or anything else its cache answers for) while it was hidden. A time window that jumps shows
     * tens of thousands of edges whose nodes did not move, and placing each again was most of the
     * jump. A slot that cannot be put back -- taken anew by a restyle, or written since -- drops the
     * cache, so the edge is placed as before.
     *
     * The arrowheads come back only as they were parked: whether an edge has one at all is decided
     * while its endpoints are recomputed, and a cap that placement hid was parked hidden.
     */
    private applyRenderState(): void {
        if (this.disposed) {
            return;
        }

        edgeDrawChanges.count++;
        const drawn = this.isRenderVisible();
        let back = true;
        if (drawn) {
            back = this.unparkPieces();
        } else {
            this.parkPieces();
        }

        this.setTextsDrawn(drawn);

        if (!back) {
            this.invalidatePositionCache();
        }
    }

    /**
     * Visit every slot this edge holds in an edge batch: its line, halo, effects, outline, bands and gradient.
     * @param visit - Called with each batch and slot; a module-level function, so a visit allocates nothing.
     * @returns True when every visit returned true.
     */
    private everySlot(visit: (batch: EdgeLineBatch, slot: number) => boolean): boolean {
        let all = true;
        if (this.lineBatch && !this.pulled) {
            all = everySlotOf(this.lineBatch, this.lineSlots, visit);
        }

        if (this.haloBatch) {
            all = everySlotOf(this.haloBatch, this.haloSlots, visit) && all;
        }

        for (const run of this.effectRuns.values()) {
            all = everySlotOf(run.batch, run.slots, visit) && all;
        }

        if (this.outlineBatch) {
            all = everySlotOf(this.outlineBatch, this.outlineSlots, visit) && all;
        }

        for (const { batch, slots } of this.haloBands) {
            all = everySlotOf(batch, slots, visit) && all;
        }

        for (const { batch, slot } of this.gradientPieces) {
            all = visit(batch, slot) && all;
        }

        return all;
    }

    /**
     * Visit every arrow cap this edge holds: head, tail, the mid caps and the stacked caps.
     * @param visit - Called with each cap; a module-level function, so a visit allocates nothing.
     * @returns True when every visit returned true.
     */
    private everyCap(visit: (cap: ArrowCap) => boolean): boolean {
        let all = true;
        if (this.arrowCap) {
            all = visit(this.arrowCap) && all;
        }

        if (this.arrowTailCap) {
            all = visit(this.arrowTailCap) && all;
        }

        if (this.arrowMiddleHeadCap) {
            all = visit(this.arrowMiddleHeadCap) && all;
        }

        if (this.arrowMiddleTailCap) {
            all = visit(this.arrowMiddleTailCap) && all;
        }

        for (const { cap } of this.headStack) {
            all = visit(cap) && all;
        }

        for (const { cap } of this.tailStack) {
            all = visit(cap) && all;
        }

        return all;
    }

    /** Stop drawing every piece of this edge, keeping each batch slot's place to put back. */
    private parkPieces(): void {
        this.everySlot(parkSlot);
        this.everyCap(parkCap);

        if (this.pulled) {
            this.pulled.drawn = false;
            this.pullRows();
        } else if (this.lineBatch) {
            // parked with the slots above
        } else if (this.mesh instanceof PatternedLineMesh) {
            this.mesh.park();
        } else if (!this.mesh.isDisposed()) {
            // setEnabled alone: a disabled mesh is not a pick candidate either, and writing
            // isPickable here would lose whatever the edge style asked for on the way back.
            this.mesh.setEnabled(false);
        }
    }

    /**
     * Draw every piece of this edge again as it was parked.
     * @returns True when every piece is back as it was; false when one must be placed again.
     */
    private unparkPieces(): boolean {
        let back = this.everySlot(unparkSlot);
        back = this.everyCap(unparkCap) && back;

        if (this.pulled) {
            // a pulled piece is drawn from its nodes' rows, and placed by its next update
            this.pulled.drawn = true;
            this.pullRows();
            back = false;
        } else if (this.lineBatch) {
            // put back with the slots above
        } else if (this.mesh instanceof PatternedLineMesh) {
            back = this.mesh.unpark() && back;
        } else if (!this.mesh.isDisposed()) {
            this.mesh.setEnabled(true);
        }

        return back;
    }

    /**
     * Show or hide the edge's texts: its label, external label and end captions; one the layout left out stays hidden.
     * @param drawn - Whether the edge is drawn.
     */
    private setTextsDrawn(drawn: boolean): void {
        for (const [labelMesh, part] of this.textMeshes()) {
            labelMesh.setEnabled(drawn && !this.leftOutLabels.includes(part));
        }
    }

    /**
     * The meshes of the edge's texts that exist: its label, external label and end captions.
     * @returns Each mesh with the part it draws.
     */
    private textMeshes(): [AbstractMesh, "label" | "xlabel" | "headLabel" | "tailLabel"][] {
        const texts = [
            [this.label, "label"],
            [this.xlabelLabel, "xlabel"],
            [this.arrowHeadText, "headLabel"],
            [this.arrowTailText, "tailLabel"],
        ] as const;
        const meshes: [AbstractMesh, "label" | "xlabel" | "headLabel" | "tailLabel"][] = [];
        for (const [text, part] of texts) {
            const labelMesh = text?.labelMesh;
            if (labelMesh && !labelMesh.isDisposed()) {
                meshes.push([labelMesh, part]);
            }
        }

        return meshes;
    }

    /**
     * Whether showing or hiding this edge enables or disables a mesh of its own -- a line drawn as
     * a mesh of its own, or a text -- rather than only writing slots of shared batches. A scene
     * whose list of what is drawn is frozen draws the meshes it listed, so only a change of this
     * kind needs the list read again; a slot write is drawn from the batch's buffer as it is.
     * @returns True when {@link Edge.setRenderVisible} reaches a mesh's enabled state.
     * @internal
     */
    togglesOwnMeshes(): boolean {
        return this.lineIsOwnMesh() || this.textMeshes().length > 0;
    }

    /**
     * Whether the line is drawn as a mesh of its own, which hiding disables, rather than from a
     * batch, a patterned line's caps or the row table.
     * @returns True for a line mesh of its own.
     */
    private lineIsOwnMesh(): boolean {
        return (
            this.pulled === null &&
            this.lineBatch === null &&
            !(this.mesh instanceof PatternedLineMesh) &&
            !this.mesh.isDisposed()
        );
    }

    /**
     * Transforms the edge mesh to position it between source and destination points.
     * Handles different mesh types (solid, patterned, 2D, bezier).
     * @param srcPoint - The source point position
     * @param dstPoint - The destination point position
     */
    transformEdgeMesh(srcPoint: Vector3, dstPoint: Vector3): void {
        // A line of width 0 is never placed, so it stays the zero matrix it was acquired as.
        if (drawsNoLine(this.drawnStyle)) {
            return;
        }

        // A batched line is sixteen floats in a shared buffer, and this is the write that moves
        // it. The whole buffer reaches the GPU once a frame, from the batch itself.
        if (this.lineBatch && this.lineIsCurve) {
            const curve = this.placeCurve(this.lineBatch, this.lineSlots, srcPoint, dstPoint);
            this.placeEffects(curve);
            this.placeOutline(curve);
            this.placeGradient(curve);
        } else if (this.lineBatch) {
            // One straight piece: a run left from a lift, a fan or a loop is handed back to one slot.
            const straight = [srcPoint.x, srcPoint.y, srcPoint.z, dstPoint.x, dstPoint.y, dstPoint.z];
            if (this.lineSlots.length > 1) {
                this.placeRun(this.lineBatch, this.lineSlots, straight);
            } else {
                this.lineBatch.place(this.lineSlots[0], srcPoint, dstPoint);
            }

            this.placeEffects(straight);
            this.placeOutline(straight);
            this.placeGradient(straight);
        } else if (this.mesh instanceof PatternedLineMesh) {
            // Pattern lines: Update element positions in world space
            this.mesh.update(srcPoint, dstPoint);
        }

        if (this.haloBatch && this.haloIsCurve) {
            this.placeCurve(this.haloBatch, this.haloSlots, srcPoint, dstPoint);
        } else if (this.haloBatch && this.haloSlots.length > 1) {
            this.placeRun(this.haloBatch, this.haloSlots, [
                srcPoint.x,
                srcPoint.y,
                srcPoint.z,
                dstPoint.x,
                dstPoint.y,
                dstPoint.z,
            ]);
        } else if (this.haloBatch) {
            // A band that followed a run (a route, bends) holds a run too: hand back all but its first slot.
            Edge.releaseRun(this.haloBatch, this.haloSlots);
            this.haloBatch.place(this.haloSlots[0], srcPoint, dstPoint);
        }
    }

    /**
     * Hand back every slot of a run but its first, for a run drawn as one straight segment again.
     * @param batch - The batch the slots belong to.
     * @param slots - The run's slots; left holding only the first.
     */
    private static releaseRun(batch: EdgeLineBatch, slots: number[]): void {
        while (slots.length > 1) {
            const slot = slots.pop();
            if (slot !== undefined) {
                batch.release(slot);
            }
        }
    }

    /**
     * How far a self-loop runs from its node's centre: the usual radius, or far enough out to
     * clear a node too big for it -- the loop is a circle in the x-y plane, so the node's reach
     * there is its radius when round, and its box's half-diagonal in that plane otherwise.
     * @returns The radius.
     */
    private selfLoopRadius(): number {
        const node = this.srcNode;
        const half = node.drawnHalfExtents;
        const reach = node.roundRadius ?? Math.hypot(half.x, half.y);
        return Math.max(EdgeMesh.SELF_LOOP_RADIUS, reach + EdgeMesh.SELF_LOOP_CLEARANCE);
    }

    /**
     * The route this edge takes when it is not one straight line between its nodes: a self-loop's
     * teardrop outside its node, the arc of a curved edge fanned out of a bundle of edges between
     * the same two nodes, or the own curve of a lone curved edge or one that does not fan
     * (`line.fanned: false`), from one center to the other, so its
     * ends meet the nodes and its arrow caps point along the curve there. Null for a straight
     * edge: only an edge whose style asks for a curve (`line.bezier`) bows.
     * @param src - The source node's center.
     * @param dst - The target node's center.
     * @returns The route, flat x, y, z, or null.
     */
    private bundleRoute(src: Vector3, dst: Vector3): number[] | null {
        if (this.srcNode === this.dstNode) {
            const { rank, count } = this.context.getDataManager().drawnBundle(this);
            return loopTeardrop(src, rank, count, (dir) => Edge.reachOf(this.srcNode, dir));
        }

        const { route } = this;
        if (route !== "straight") {
            const height = this.drawnStyle?.line?.arcHeight ?? DEFAULT_ARC_HEIGHT[route];
            return route === "arc" ? raisedArc(src, dst, height) : greatCircleArc(src, dst, height);
        }

        if (!this.curved) {
            return null;
        }

        // a support point is placed apart from its bundle's others by the forces themselves
        const via = this.supportVia();
        if (via !== null) {
            return bezierThroughControls([src.x, src.y, src.z, via.x, via.y, via.z, dst.x, dst.y, dst.z]);
        }

        const fan = this.fanOf(src, dst);
        if (fan === null) {
            const arc = this.drawnStyle?.line?.arcRadius;
            return arc === undefined ? EdgeMesh.createBezierLine(src, dst) : centerArc(src, dst, arc);
        }

        const { offset, forward } = fan;
        if (offset === 0) {
            // the middle of an evenly spread bundle keeps the line, curved or not; its middle point
            // is outside both nodes, so the route is drawn rather than handed to the curve
            const mid = Vector3.Center(src, dst);
            return [src.x, src.y, src.z, mid.x, mid.y, mid.z, dst.x, dst.y, dst.z];
        }

        return fanArc(src, dst, forward ? src : dst, forward ? dst : src, offset);
    }

    /**
     * How far this curve bows out of its bundle of edges between the same two nodes at its middle
     * (`fanOffset`), and whether it runs the way of the bundle's first edge, whose left it bows to.
     * @param src - The source node's center.
     * @param dst - The target node's center.
     * @returns The fan, or null for an edge that does not fan or is alone between its nodes.
     */
    private fanOf(src: Vector3, dst: Vector3): { offset: number; forward: boolean } | null {
        if (!this.fans) {
            return null;
        }

        const { rank, count, first, members } = this.context.getDataManager().drawnBundle(this);
        if (count < 2) {
            return null;
        }

        const slot = fanSlot(
            members.map((e) => e.fans),
            rank,
        );
        const radius = Math.max(Edge.radiusOf(this.srcNode), Edge.radiusOf(this.dstNode));
        const offset = fanOffset(slot, count, radius, Vector3.Distance(src, dst), this.drawnStyle?.line?.fanSpacing);
        return { offset, forward: first.srcNode === this.srcNode };
    }

    /**
     * What this edge's support point settles under, for the update loop: its two nodes' centers and its style's
     * forces. Null for an edge without one: not curved, no `line.supportModel`, a self-loop, or not drawn.
     * @param centerOf - A node's center; the same point for a node each time it is asked within one update, as the
     *     forces find an edge's nodes among the centers by the point itself (forceAtlas2's degrees).
     * @returns The edge's ends and forces, or null.
     * @internal
     */
    supportEdge(centerOf: (node: Node) => Readonly<Vector3> = (node) => node.drawnPosition): SupportEdge | null {
        const line = this.drawnStyle?.line;
        const model = line?.supportModel;
        if (model === undefined || !this.curved || this.srcNode === this.dstNode || !this.renderVisible) {
            return null;
        }
        return {
            src: centerOf(this.srcNode),
            dst: centerOf(this.dstNode),
            forces: {
                model,
                springLength: line?.supportSpringLength ?? SUPPORT_DEFAULTS.springLength,
                springConstant: line?.supportSpringConstant ?? SUPPORT_DEFAULTS.springConstant,
                repulsion: line?.supportRepulsion ?? SUPPORT_DEFAULTS.repulsion,
                centralGravity: line?.supportCentralGravity ?? SUPPORT_DEFAULTS.centralGravity,
                // a unit of 0 has no size: drawn as unset, as the channel refuses it
                unit: line?.supportUnit || 1,
                scale: line?.supportScale ?? "unit",
            },
        };
    }

    /**
     * Where this edge's support point is now, or null when it has none.
     * @returns The point.
     */
    private supportVia(): Xyz | null {
        return this.context.getDataManager().supportPoints.pointOf(this);
    }

    /**
     * The path the edge takes (`line.route`): what its style asks for, else what the active layout's
     * map draws -- a raised arc over a flat map in the 3D view (laid out in 2D or 3D), a great
     * circle on a globe, straight in the 2D view or to a node the map could not place -- else
     * straight.
     * @returns The route.
     */
    private get route(): "straight" | "arc" | "great-circle" {
        return this.routeOf(this.drawnStyle);
    }

    /**
     * The path a style would have this edge take ({@link Edge.route}), read from that style rather
     * than the one drawn now, so a restyle is judged by the route it asks for.
     * @param style - The style to read, or null for none.
     * @returns The route.
     */
    private routeOf(style: EdgeStyleConfig | null): "straight" | "arc" | "great-circle" {
        const asked = style?.line?.route;
        if (asked !== undefined) {
            return asked;
        }

        // Read by shape, not by class: the layout module is not imported here.
        const engine = this.context.getLayoutManager().layoutEngine as
            { geoFrame?: LocationMapFrame | null } | undefined;
        const frame = engine?.geoFrame;
        // The view decides, not the layout's shape: a flat map laid out in 2D (Shape 2D) and drawn in
        // the 3D view still raises its edges in arcs above it.
        if (frame === undefined || frame === null || this.context.is2D()) {
            return "straight";
        }

        // An edge to a node in the tray has no place to arc between: it goes straight.
        if (frame.unplacedIds.has(this.srcId) || frame.unplacedIds.has(this.dstId)) {
            return "straight";
        }

        return frame.surface === "globe" ? "great-circle" : "arc";
    }

    /**
     * Whether this edge's style asks for a curve, which fans it out of a bundle.
     * @returns True for a curved edge.
     */
    private get curved(): boolean {
        return this.drawnStyle?.line?.bezier === true;
    }

    /**
     * Whether this curved edge is spread apart from the other curved edges joining the same two
     * nodes, rather than drawn as its own curve whatever they are (`line.fanned: false`).
     * @returns True for a curved edge that fans.
     */
    private get fans(): boolean {
        return this.curved && this.drawnStyle?.line?.fanned !== false;
    }

    /**
     * How far a line through a node's centre runs before it leaves the node's bounding box ({@link boxReach}), or its
     * box when its surface is its box ({@link Node.surfaceIsBox}).
     * @param node - The node.
     * @param direction - The line's unit direction.
     * @returns The distance.
     */
    private static boxReachOf(node: Node, direction: Vector3): number {
        const mesh = node.drawnPickMesh;
        return node.surfaceIsBox || mesh === null
            ? surfaceReach(direction, node.drawnHalfExtents, null)
            : boxReach(mesh, direction);
    }

    /**
     * How far a node's surface and border are from its center in a direction: on a flat shape, its own outline
     * ({@link Node.reachOutline}), so a line ends on a star's point and not out at its box's corner.
     * @param node - The node.
     * @param dir - The unit direction.
     * @returns The distance.
     */
    private static reachOf(node: Node, dir: Xyz): number {
        return (
            surfaceReach(
                dir,
                node.drawnHalfExtents,
                node.roundRadius,
                node.shapeType === "ellipse" || (node.reachOutline ?? false),
            ) + node.borderReach
        );
    }

    /**
     * A node's radius for spacing the edges around it: its own when round, its box's half-diagonal
     * across the view otherwise.
     * @param node - The node.
     * @returns The radius.
     */
    private static radiusOf(node: Node): number {
        const half = node.drawnHalfExtents;
        return node.roundRadius ?? Math.hypot(half.x, half.y);
    }

    /**
     * A test of whether a point lies outside a node's drawn shape.
     * @param node - The node.
     * @param centre - The node's center.
     * @param gap - How far past the outline a point must be to count as outside (`line.nodeGap`).
     * @returns True for a point farther from the center than the node's outline in its direction.
     */
    private static outside(node: Node, centre: Vector3, gap = 0): (x: number, y: number, z: number) => boolean {
        return (x, y, z) => {
            const d = Math.hypot(x - centre.x, y - centre.y, z - centre.z);
            return (
                d > 0 &&
                d > gap + Edge.reachOf(node, { x: (x - centre.x) / d, y: (y - centre.y) / d, z: (z - centre.z) / d })
            );
        };
    }

    /**
     * How far from one of its nodes' outlines this edge's line stops: that end's own gap (`line.sourceNodeGap`,
     * `line.targetNodeGap`), else `line.nodeGap`; none for a self-loop.
     * @param end - Which end.
     * @returns The gap, in scene units.
     */
    private gapAt(end: "source" | "target"): number {
        if (this.srcNode === this.dstNode) {
            return 0;
        }

        const line = this.drawnStyle?.line;
        return (end === "source" ? line?.sourceNodeGap : line?.targetNodeGap) ?? line?.nodeGap ?? 0;
    }

    /**
     * Draw this edge along a route from one node center to the other: the part outside both
     * nodes, each end trimmed for its arrow cap along the route's own direction there.
     * @param batch - The batch the run is in, or null for a patterned line's elements.
     * @param src - The source node's center.
     * @param dst - The target node's center.
     * @param route - The route, flat x, y, z, from `src` to `dst`.
     * @returns False, drawing nothing, when no part of the route is outside both nodes.
     */
    private placeRoute(batch: EdgeLineBatch | null, src: Vector3, dst: Vector3, route: readonly number[]): boolean {
        const [srcGap, dstGap] = [this.gapAt("source"), this.gapAt("target")];
        const outSrc = Edge.outside(this.srcNode, src, srcGap);
        const outDst = Edge.outside(this.dstNode, dst, dstGap);
        const span = routeOutside(route, outSrc, outDst);
        if (span === null) {
            return false;
        }

        const first = Vector3.FromArray(route, 3 * span.first);
        const last = Vector3.FromArray(route, 3 * span.last);
        // where the route itself crosses each outline, on the curve; a line from the center toward the first point
        // outside would cut the curve's corner and bow the rest deeper (Gephi's arcs between large nodes)
        const cross = (i: number, to: Vector3, out: typeof outSrc): Vector3 => {
            const c = crossingOf(Vector3.FromArray(route, 3 * i), to, out);
            return new Vector3(c.x, c.y, c.z);
        };
        const start =
            span.first > 0 ? cross(span.first - 1, first, outSrc) : this.leaveNode(this.srcNode, src, first, srcGap);
        const end =
            span.last < route.length / 3 - 1
                ? cross(span.last + 1, last, outDst)
                : this.leaveNode(this.dstNode, dst, last, dstGap);

        const path = [start, ...points(route.slice(3 * span.first, 3 * span.last + 3)), end];
        const { arrowCap } = this;
        // the route is cut back along itself for the head, which spans the chord from the cut to the outline, as
        // Gephi and Cytoscape.js draw an arrowhead on a curve; a head longer than the route keeps the last segment
        const stop = arrowCap ? this.headStop() : 0;
        const cut = stop > 0 ? cutFromEnd(path, stop) : null;
        const cutAt = cut === null ? null : new Vector3(cut.at.x, cut.at.y, cut.at.z);
        if (arrowCap) {
            this.placeArrowHead(arrowCap, end, end.subtract(cutAt ?? last).normalize(), [...path].reverse());
        }

        this.placeMidCaps(path);

        const lineStart = this.placeArrowTail(start, first, first.subtract(start).normalize(), path);
        const body =
            cut === null || cutAt === null
                ? [...route.slice(3 * span.first, 3 * span.last + 3), ...this.lineEndBefore(last, end).asArray()]
                : [...path.slice(1, cut.keep + 1).flatMap((p) => p.asArray()), ...cutAt.asArray()];
        this.placeLineRun(batch, [lineStart.x, lineStart.y, lineStart.z, ...body]);
        return true;
    }

    /**
     * What decides how far a line runs on under an end cap: the line's width, the cap's size and breadth, and the
     * caps drawn in a row behind it.
     * @param style - The edge's style
     * @param arrow - The end cap's style
     * @returns The values
     */
    private static capOf(
        style: EdgeStyleConfig,
        arrow: EdgeStyleConfig["arrowHead"],
    ): { lineWidth?: number; size?: number; breadth?: number; stack?: string } {
        return { lineWidth: style.line?.width, size: arrow?.size, breadth: arrow?.width, stack: arrow?.stack };
    }

    /**
     * How far back from where it meets its target the line stops for its arrow head: the head's gap off the node
     * plus the length of line the head covers. Zero without a head, or with one drawn part-way along.
     * @returns The distance, in scene units.
     */
    private headStop(): number {
        const head = this.currentStyle.arrowHead;
        if (!head?.type || head.type === "none" || (head.position ?? 0) > 0) {
            return 0;
        }

        const geometry = EdgeMesh.getArrowGeometry(head.type, Edge.capOf(this.currentStyle, head));
        // a 2D cap is drawn at full size (see placeArrowHead)
        const scale = this.arrowCap?.is2D === true ? 1 : (geometry.scaleFactor ?? 1);
        return (
            Edge.capGap(head) +
            EdgeMesh.calculateArrowLength() *
                (head.size ?? 1) *
                scale *
                Edge.capScale(this.dstNode) *
                (geometry.lineStop ?? 1)
        );
    }

    /**
     * Draw this edge's curve as a run of straight segments, one slot each, between two points.
     *
     * A CURVE IS A RUN OF THE SAME SLOTS A STRAIGHT LINE TAKES (issue #444). The curve renderer
     * already drew a curve as a strip of independent straight quads -- no joins between them -- so
     * one slot per quad draws the same segments. It used to dispose and rebuild a mesh of its own
     * every time an endpoint moved; now the run grows or shrinks to the curve's point count and
     * each segment is a matrix write.
     * @param batch - The batch the run is in.
     * @param slots - The run's slots, grown or shrunk in place.
     * @param srcPoint - Where the curve starts.
     * @param dstPoint - Where it ends.
     * @returns The curve's points, which the line's outline, gradient and effects are placed along too.
     */
    private placeCurve(batch: EdgeLineBatch, slots: number[], srcPoint: Vector3, dstPoint: Vector3): number[] {
        const loopRadius = this.srcNode === this.dstNode ? this.selfLoopRadius() : undefined;
        const flat = EdgeMesh.createBezierLine(srcPoint, dstPoint, undefined, loopRadius);
        this.placeRun(
            batch,
            slots,
            flat,
            batch === this.lineBatch
                ? (slot) => {
                      this.prepareLineSlot(slot);
                  }
                : undefined,
        );
        return flat;
    }

    /**
     * Draw this edge along the route its style stores: from its source port, or from where the line
     * leaves the source node toward the first bend outside it, through the bends, to its target port
     * or to where it meets the target node -- each end trimmed for its arrow cap along its own
     * segment -- with the corners rounded when the line is also curved. Bends inside a node are
     * passed over, as a tool that clips a line at the outlines draws it. A selected edge's band and
     * its effects follow the same run.
     * @param batch - The batch the run is in, or null for a patterned line's elements.
     * @param src - The source node's center.
     * @param dst - The target node's center.
     * @param stored - The route: the style's, or the one the layout laid.
     * @returns False, drawing nothing, when no stored point is outside the nodes (a self-loop whose
     *     points all lie inside its node), so the edge is drawn as it would be without a route.
     */
    private placeBent(
        batch: EdgeLineBatch | null,
        src: Vector3,
        dst: Vector3,
        stored: NonNullable<Edge["lineRoute"]>,
    ): boolean {
        const line = this.drawnStyle?.line;
        const through = fileRoute(src, dst, stored, this.srcNode.outlineHalfExtents, this.dstNode.outlineHalfExtents);
        const ring = stored.loop ? Edge.detachedRing(through, Edge.outside(this.srcNode, src)) : null;
        if (ring !== null) {
            // ponytail: a ring's arrow caps are not placed; no program draws one on a ring that misses its node
            this.placeLineRun(batch, Edge.curveThroughBends(line, ring));
            return true;
        }
        const { route, sampled } = Edge.shapeBentRoute(line, through);
        // a layout's own line ends are drawn from where they lie, as ports are: on a cluster's border, a node's outer
        // periphery or at a port inside the node
        const ports = {
            src: stored.srcPort !== null || stored.ends === true,
            dst: stored.dstPort !== null || stored.ends === true,
        };
        const [srcGap, dstGap] = [this.gapAt("source"), this.gapAt("target")];
        const outSrc = Edge.outside(this.srcNode, src, srcGap);
        const outDst = Edge.outside(this.dstNode, dst, dstGap);
        const span = routeEnds(route, ports, outSrc, outDst);
        if (span === null) {
            return false;
        }

        const a = Vector3.FromArray(route, 3 * span.first);
        const b = Vector3.FromArray(route, 3 * span.last);
        // where the route crosses each outline, on the route (a sampled Bezier curve too), as in placeRoute
        const cross = (i: number, to: Vector3, out: typeof outSrc): Vector3 => {
            const c = crossingOf(Vector3.FromArray(route, 3 * i), to, out);
            return new Vector3(c.x, c.y, c.z);
        };
        const leave = (
            node: Node,
            centre: Vector3,
            i: number,
            to: Vector3,
            out: typeof outSrc,
            gap: number,
        ): Vector3 => (i >= 0 && i < route.length / 3 ? cross(i, to, out) : this.leaveNode(node, centre, to, gap));
        // A port inside a node drawn behind every edge, which hides no stretch of the line, only aims it: the line is
        // cut where it leaves the node's outline toward its next point, as yEd cuts one at a group's border
        // (graphml-galaxy-lcms-workflow's bands from its "3 tabulars" group, ports at its middle).
        const aimed = (node: Node, port: Vector3, to: Vector3, out: typeof outSrc): Vector3 => {
            if (!node.isDrawnBehindEdges || out(port.x, port.y, port.z) || !out(to.x, to.y, to.z)) {
                return port;
            }
            const c = crossingOf(port, to, out);
            return new Vector3(c.x, c.y, c.z);
        };
        // the point a port's line runs on to: the route's next, else the other end
        const one = span.first === span.last;
        const afterA = one ? dst : Vector3.FromArray(route, 3 * span.first + 3);
        const start = ports.src
            ? aimed(this.srcNode, a, afterA, outSrc)
            : leave(this.srcNode, src, span.first - 1, a, outSrc, srcGap);
        const beforeB = one ? start : Vector3.FromArray(route, 3 * span.last - 3);
        const end = ports.dst
            ? aimed(this.dstNode, b, beforeB, outDst)
            : leave(this.dstNode, dst, span.last + 1, b, outDst, dstGap);
        const mid = clearOfCaps(
            route.slice(3 * (span.first + (ports.src ? 1 : 0)), 3 * (span.last + (ports.dst ? 0 : 1))),
            start,
            end,
            { start: this.capReach("tail"), end: this.capReach("head") },
        );
        const afterStart = mid.length > 0 ? Vector3.FromArray(mid, 0) : end;
        const beforeEnd = mid.length > 0 ? Vector3.FromArray(mid, mid.length - 3) : start;

        const path = [start, ...points(mid), end];
        const { arrowCap } = this;
        if (arrowCap) {
            this.placeArrowHead(arrowCap, end, end.subtract(beforeEnd).normalize(), [...path].reverse());
        }

        this.placeMidCaps(path);

        const lineStart = this.placeArrowTail(start, afterStart, afterStart.subtract(start).normalize(), path);
        const lineEnd = this.lineEndBefore(beforeEnd, end);
        const flat = [lineStart.x, lineStart.y, lineStart.z, ...mid, lineEnd.x, lineEnd.y, lineEnd.z];
        this.placeLineRun(batch, sampled ? flat : Edge.curveThroughBends(line, flat));
        return true;
    }

    /**
     * Draw this edge through points between its nodes: straight segments from where the line
     * leaves the source node toward the first point, through every point, to where it meets the
     * target node from the last -- each end trimmed for its arrow cap along its own segment -- with
     * the corners rounded when asked. A selected edge's band and its effects follow the same run.
     * @param batch - The batch the run is in, or null for a patterned line's elements.
     * @param src - The source node's center.
     * @param dst - The target node's center.
     * @param mid - The points, flat x, y, z: at least one.
     * @param round - Whether to round the corners.
     */
    private placeThrough(
        batch: EdgeLineBatch | null,
        src: Vector3,
        dst: Vector3,
        mid: readonly number[],
        round: boolean,
    ): void {
        const first = Vector3.FromArray(mid, 0);
        const last = Vector3.FromArray(mid, mid.length - 3);
        const start = this.leaveNode(this.srcNode, src, first);
        const end = this.leaveNode(this.dstNode, dst, last);
        const path = [start, ...points(mid), end];

        const { arrowCap } = this;
        if (arrowCap) {
            this.placeArrowHead(arrowCap, end, end.subtract(last).normalize(), [...path].reverse());
        }

        this.placeMidCaps(path);

        const lineStart = this.placeArrowTail(start, first, first.subtract(start).normalize(), path);
        const lineEnd = this.lineEndBefore(last, end);
        const flat = [lineStart.x, lineStart.y, lineStart.z, ...mid, lineEnd.x, lineEnd.y, lineEnd.z];
        this.placeLineRun(batch, round ? roundCorners(flat) : flat);
    }

    /**
     * How near one end of a bent line its route may not pass: half the length of the arrow cap drawn
     * there, so the cap points along the route it covers ({@link clearOfCaps}); 0 without a cap at the end.
     * @param end - Which end.
     * @returns The distance, in scene units.
     */
    private capReach(end: "head" | "tail"): number {
        const [cap, arrow] =
            end === "head"
                ? [this.arrowCap, this.currentStyle.arrowHead]
                : [this.arrowTailCap, this.currentStyle.arrowTail];
        if (!cap || arrow?.type === undefined || arrow.type === "none" || (arrow.position ?? 0) > 0) {
            return 0;
        }

        return (EdgeMesh.calculateArrowLength() * (arrow.size ?? 1)) / 2;
    }

    /**
     * The route a bent line runs along before it is cut at its nodes. A Bezier curve runs from node center to node
     * center through its bends as control points, as a program that draws its curves under its nodes shows it; an
     * arc runs through its one bend on a circle. An arc with other than one bend, or with its bend on the line
     * between its ends, is drawn as "corners", like any other line.
     * @param line - The line's style.
     * @param through - The route, flat x, y, z: the source center, the bends, the target center.
     * @returns The route, and whether it is already a sampled curve (so its corners are not rounded again).
     */
    private static shapeBentRoute(
        line: EdgeStyleConfig["line"],
        through: number[],
    ): { route: number[]; sampled: boolean } {
        if (line?.bezier !== true) {
            return { route: through, sampled: false };
        }

        if (line.bendCurve === "bezier") {
            return { route: bezierThroughControls(through), sampled: true };
        }

        const arced = line.bendCurve === "arc" ? arcThroughBend(through) : null;
        return arced === null ? { route: through, sampled: false } : { route: arced, sampled: true };
    }

    /**
     * A self-loop's route that is a closed ring meeting its node nowhere -- its bends start and end at one point and
     * every one lies outside the node -- as vis-network draws a self-loop whose circle holds the whole node: the ring
     * alone, with no line from the node out to it. An open route, whose ends a program runs back into the node
     * (Cytoscape.js's loop spline), keeps its legs.
     * @param through - The route, flat x, y, z: the node's center, the bends, the center again.
     * @param outside - Whether a point is outside the node.
     * @returns The ring's points, flat, or null for any other route.
     */
    private static detachedRing(
        through: readonly number[],
        outside: (x: number, y: number, z: number) => boolean,
    ): number[] | null {
        const ring = through.slice(3, -3);
        const n = ring.length / 3;
        if (n < 4) {
            return null;
        }

        const gap = Math.hypot(ring[0] - ring[3 * n - 3], ring[1] - ring[3 * n - 2], ring[2] - ring[3 * n - 1]);
        const span = Math.hypot(ring[0] - ring[3], ring[1] - ring[4], ring[2] - ring[5]);
        if (gap > 1e-6 * Math.max(span, 1e-9)) {
            return null;
        }

        for (let i = 0; i < n; i++) {
            if (!outside(ring[3 * i], ring[3 * i + 1], ring[3 * i + 2])) {
                return null;
            }
        }

        return ring;
    }

    /**
     * A line through its bends as its style draws it: straight segments, or a curve when the line is curved, with
     * its corners rounded or through the segments' midpoints (`line.bendCurve`; a "bezier" curve is sampled before).
     * @param line - The line's style.
     * @param flat - The line's points, flat x, y, z, ends included.
     * @returns The points it is drawn through.
     */
    private static curveThroughBends(line: EdgeStyleConfig["line"], flat: number[]): number[] {
        if (line?.bezier !== true) {
            return flat;
        }

        return line.bendCurve === "midpoints" ? curveThroughMidpoints(flat) : roundCorners(flat);
    }

    /**
     * Where a segment from a node's center toward a point crosses the node's surface and border.
     * @param node - The node.
     * @param centre - Its center.
     * @param toward - The point the segment runs to.
     * @param gap - How far past the outline the line stops (`line.nodeGap`).
     * @returns The crossing, or the center when the point is the center.
     */
    private leaveNode(node: Node, centre: Vector3, toward: Vector3, gap = 0): Vector3 {
        const dir = toward.subtract(centre);
        const span = dir.length();
        if (span === 0) {
            return centre.clone();
        }

        dir.scaleInPlace(1 / span);
        const reach = Edge.reachOf(node, dir) + gap;

        return centre.add(dir.scale(Math.min(reach, span)));
    }

    /**
     * Draw a run of straight segments, one slot each, through points.
     * @param batch - The batch the run is in.
     * @param slots - The run's slots, grown or shrunk in place.
     * @param flat - The points, flat x, y, z.
     * @param fresh - Called with each slot the run takes, so a shader batch's slot gets its static
     *     values and its speed; a plain batch needs nothing.
     */
    private placeRun(
        batch: EdgeLineBatch,
        slots: number[],
        flat: readonly number[],
        fresh?: (slot: number) => void,
    ): void {
        Edge.placeBand(this, batch, slots, flat, fresh);
    }

    /**
     * Lay this edge's line along points, and everything drawn along the line with it: its run of
     * slots, the selection band, the outline and the underlay and overlay bands, the gradient's
     * pieces and the effects.
     * @param batch - The line's batch, or null for a patterned line's elements.
     * @param flat - The points, flat x, y, z.
     */
    private placeLineRun(batch: EdgeLineBatch | null, flat: readonly number[]): void {
        if (batch !== null) {
            this.placeRun(batch, this.lineSlots, flat, (slot) => {
                this.prepareLineSlot(slot);
            });
        } else if (this.mesh instanceof PatternedLineMesh) {
            // a patterned line's elements are spread along the route (issue #3102); it has no outline, gradient or effect
            this.mesh.updatePath(points(flat));
            if (this.haloBatch) {
                this.placeRun(this.haloBatch, this.haloSlots, flat);
            }

            return;
        }

        if (this.haloBatch) {
            this.placeRun(this.haloBatch, this.haloSlots, flat);
        }

        this.placeOutline(flat);
        this.placeGradient(flat);
        this.placeEffects(flat);
    }

    /**
     * The colors this edge's line is drawn in when it is painted in a gradient, one per piece from
     * its source end to its target end, and none otherwise.
     * @returns The pieces' colors, `#rrggbb`.
     * @internal
     */
    get drawnGradient(): readonly string[] {
        return this.gradientPieces.map((p) => p.color);
    }

    /**
     * Build the pieces a line painted in a gradient is drawn as (`line.gradient`): one slot per piece in the batch of
     * the gradient's color at its middle, as wide as the line and, in 2D, a hair in front of it.
     * @param meshKey - The source mesh key the edge is drawn under.
     * @param style - The style the line is drawn from.
     */
    private createGradient(meshKey: string, style: EdgeStyleConfig): void {
        const colors = gradientPieceColors(style.line?.gradient);
        if (colors === null || this.lineBatch === null) {
            return;
        }

        const scene = this.context.getScene();
        const solid = { ...style, line: { ...style.line, type: "solid" as const, animationSpeed: 0 } };
        for (const color of colors) {
            const batch = EdgeMesh.lineBatch(
                this.context.getMeshCache(),
                {
                    styleId: `${meshKey}-gradient-${color}`,
                    width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                    color,
                },
                solid,
                scene,
                false,
                this.srcNode === this.dstNode,
            );
            if (batch === null) {
                continue;
            }

            // ponytail: in 3D the pieces and the line are drawn at the same depth, so the line may show through
            if (this.context.is2D()) {
                batch.mesh.position.z = -OUTLINE_BEHIND;
            }

            this.gradientPieces.push({ batch, slot: batch.acquire(this), color });
        }
    }

    /**
     * Lay the gradient's pieces along the line's points, each an equal share of its length.
     * @param flat - The line's points, flat x, y, z.
     */
    private placeGradient(flat: readonly number[]): void {
        const n = this.gradientPieces.length;
        if (n === 0 || flat.length < 6) {
            return;
        }

        const pts = points(flat);
        const lengths = [0];
        for (let i = 1; i < pts.length; i++) {
            lengths.push(lengths[i - 1] + Vector3.Distance(pts[i - 1], pts[i]));
        }

        const total = lengths.at(-1) ?? 0;
        const at = (share: number): Vector3 => {
            const want = share * total;
            for (let i = 1; i < pts.length; i++) {
                if (want <= lengths[i] || i === pts.length - 1) {
                    const span = lengths[i] - lengths[i - 1];
                    return Vector3.Lerp(pts[i - 1], pts[i], span > 0 ? (want - lengths[i - 1]) / span : 0);
                }
            }

            return pts[0];
        };
        for (const [i, { batch, slot }] of this.gradientPieces.entries()) {
            batch.place(slot, at(i / n), at((i + 1) / n));
        }
    }

    /**
     * Build the band drawn under this edge's line (`line.outline`: Cytoscape.js's line outline,
     * vis-network's edge background), as slots in a batch of its own, wider than the line by the
     * outline's width and in its color. In 2D it is drawn a hair behind the line, so the line is
     * always on top of it.
     * @param meshKey - The source mesh key the edge is drawn under.
     * @param style - The style the line is drawn from.
     */
    private createOutline(meshKey: string, style: EdgeStyleConfig): void {
        this.createHaloBands(meshKey, style);
        const outline = style.line?.outline;
        const extra = outline?.width ?? 0;
        const opacity = outline?.opacity ?? 1;
        if (extra <= 0 || opacity <= 0 || this.lineBatch === null) {
            return;
        }

        const scene = this.context.getScene();
        this.outlineBatch = EdgeMesh.lineBatch(
            this.context.getMeshCache(),
            {
                styleId: `${meshKey}-outline`,
                width: (style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH) + extra,
                color: outline?.color ?? "#000000",
            },
            { ...style, line: { ...style.line, type: outline?.type ?? "solid", opacity, animationSpeed: 0 } },
            scene,
            false,
            this.srcNode === this.dstNode,
        );
        if (this.outlineBatch === null) {
            return;
        }

        this.outlineSlots = [this.outlineBatch.acquire(this)];
        // ponytail: in 3D the band and the line are drawn at the same depth, so either may show where they overlap
        if (this.context.is2D()) {
            this.outlineBatch.mesh.position.z = OUTLINE_BEHIND;
        }
    }

    /**
     * Lay this edge's outline along the same points as its line, one slot per piece.
     * @param flat - The line's points, flat x, y, z.
     */
    private placeOutline(flat: readonly number[]): void {
        for (const { batch, slots } of this.haloBands) {
            Edge.placeBand(this, batch, slots, flat);
        }

        if (this.outlineBatch !== null) {
            Edge.placeBand(this, this.outlineBatch, this.outlineSlots, flat);
        }
    }

    /**
     * Lay one band along a line's points, one slot per piece, growing or shrinking its run of slots.
     * @param owner - The edge, whose row each new slot ages by.
     * @param batch - The band's batch.
     * @param slots - Its slots, changed in place.
     * @param flat - The line's points, flat x, y, z.
     * @param fresh - Called with each slot the run takes, so a shader batch's slot gets its static
     *     values and its speed; a plain batch needs nothing.
     */
    private static placeBand(
        owner: Edge,
        batch: EdgeLineBatch,
        slots: number[],
        flat: readonly number[],
        fresh?: (slot: number) => void,
    ): void {
        const segments = flat.length / 3 - 1;

        // Grow before shrinking, and never below one slot: the batch disposes itself when its last
        // slot goes, which must not happen in the middle of re-sizing a run.
        while (slots.length < segments) {
            const slot = batch.acquire(owner);
            // A piece the run grows by is drawn in the run's color (a batch keyed by shape).
            if (slots.length > 0) {
                batch.copyColor(slot, slots[0]);
            }
            slots.push(slot);
            fresh?.(slot);
        }

        while (slots.length > Math.max(1, segments)) {
            const slot = slots.pop();
            if (slot !== undefined) {
                batch.release(slot);
            }
        }

        batch.placeRun(slots, flat);
    }

    /**
     * Build the bands drawn beneath (`line.underlay`) and over (`line.overlay`) this edge's line:
     * Cytoscape.js's underlay and overlay, each twice its padding wide whatever the line's width, a
     * hair behind or before the line in 2D.
     * @param meshKey - The source mesh key the edge is drawn under.
     * @param style - The style the line is drawn from.
     */
    private createHaloBands(meshKey: string, style: EdgeStyleConfig): void {
        for (const kind of ["underlay", "overlay"] as const) {
            const halo = style.line?.[kind];
            const opacity = halo?.opacity ?? 0;
            const width = 2 * (halo?.padding ?? 0);
            if (opacity <= 0 || width <= 0 || this.lineBatch === null) {
                continue;
            }

            const batch = EdgeMesh.lineBatch(
                this.context.getMeshCache(),
                { styleId: `${meshKey}-${kind}`, width, color: halo?.color ?? "#000000" },
                { ...style, line: { ...style.line, type: "solid", opacity, animationSpeed: 0 } },
                this.context.getScene(),
                false,
                this.srcNode === this.dstNode,
            );
            if (batch === null) {
                continue;
            }

            // ponytail: in 3D a band and the line are drawn at the same depth, so either may show where they overlap
            if (this.context.is2D()) {
                batch.mesh.position.z = kind === "underlay" ? OUTLINE_BEHIND : -OUTLINE_BEHIND;
            }

            this.haloBands.push({ kind, batch, slots: [batch.acquire(this)] });
        }
    }

    /**
     * Place a straight line's arrow caps between the ends its layout gave it, as {@link transformArrowCap} places them
     * between the node outlines.
     * @param src - The source node's center.
     * @param dst - The target node's center.
     * @param laidEnds - The line's ends, the target end at the arrow head's tip.
     * @returns The line's ends, the end stopping short of the arrow head.
     */
    private placeLaidEnds(src: Vector3, dst: Vector3, laidEnds: NonNullable<EdgePosition["lineEnds"]>): EdgeLine {
        const ends = bendPoints(src, dst, [...laidEnds.source, ...laidEnds.target]);
        const start = Vector3.FromArray(ends, 0);
        const end = Vector3.FromArray(ends, 3);
        const direction = end.subtract(start).normalize();
        if (this.arrowCap) {
            this.placeArrowHead(this.arrowCap, end, direction, [end, start]);
        }

        const srcPoint = this.placeArrowTail(start, end, direction, [start, end]);
        this.placeMidCaps([start, end]);
        return { srcPoint, dstPoint: this.lineEndBefore(start, end) };
    }

    /**
     * Calculates and applies transformations for arrow head and tail meshes.
     * Adjusts edge line endpoints to create gaps for arrows.
     * @returns Edge line positions adjusted for arrow placement
     */
    transformArrowCap(): EdgeLine {
        const { arrowCap } = this;

        // A TAIL IS PLACED WITHOUT A HEAD TOO. This used to return here unless the edge had a
        // head, so a tail drawn with no head (type "none", or size 0, #2067) was never placed.
        if (!arrowCap && !this.arrowTailCap && !this.arrowMiddleHeadCap && !this.arrowMiddleTailCap) {
            return {
                srcPoint: null,
                dstPoint: null,
            };
        }

        const { srcPoint, dstPoint, newEndPoint } = this.getInterceptPoints();

        // If we can't find intercept points, fall back to approximate positions
        if (!srcPoint || !dstPoint || !newEndPoint) {
            return arrowCap ? this.placeArrowFromCentres(arrowCap) : { srcPoint: null, dstPoint: null };
        }

        const direction = dstPoint.subtract(srcPoint).normalize();

        if (arrowCap) {
            this.placeArrowHead(arrowCap, dstPoint, direction, [dstPoint, srcPoint]);
        }

        const adjustedSrcPoint = this.placeArrowTail(srcPoint, dstPoint, direction, [srcPoint, dstPoint]);
        this.placeMidCaps([srcPoint, dstPoint]);

        return {
            srcPoint: adjustedSrcPoint,
            dstPoint: newEndPoint, // Line ends before arrow to create gap for arrow to fill
        };
    }

    /**
     * Place the arrow head with its tip where the line meets the target node, or, with a
     * position, that fraction of the way back along the line.
     * @param arrowCap - This edge's arrow head.
     * @param dstPoint - Where the line meets the target node's surface.
     * @param direction - The unit direction the line arrives in.
     * @param path - The line's points from the target end, for a head drawn part-way along it.
     */
    private placeArrowHead(
        arrowCap: ArrowCap,
        dstPoint: Vector3,
        direction: Vector3,
        path: readonly Vector3[] = [],
    ): void {
        // Use common arrow geometry functions for positioning
        this.context.getStatsManager().startMeasurement("Edge.transformArrowCap.mainPath");
        const arrowStyle = this.currentStyle;
        const along = pointFromEnd(path, arrowStyle.arrowHead?.position ?? 0);
        if (along !== null) {
            dstPoint = new Vector3(along.tip.x, along.tip.y, along.tip.z);
            direction = new Vector3(along.toward.x, along.toward.y, along.toward.z);
        } else {
            dstPoint = dstPoint.subtract(direction.scale(Edge.capGap(arrowStyle.arrowHead)));
        }

        const arrowType = arrowStyle.arrowHead?.type;
        const arrowSize = arrowStyle.arrowHead?.size ?? 1;
        const scale = Edge.capScale(this.dstNode);
        arrowCap.setScale(scale);
        const arrowLength = EdgeMesh.calculateArrowLength() * arrowSize * scale;
        const geometry = EdgeMesh.getArrowGeometry(arrowType ?? "normal", Edge.capOf(arrowStyle, arrowStyle.arrowHead));

        // PHASE 4: Override scaleFactor for 2D arrows
        // In 2D mode, sphere-dot and open-dot use full-size circles (not tiny 0.25x spheres)
        // so their scaleFactor should be 1.0, not 0.25
        if (arrowCap.is2D && geometry.scaleFactor !== undefined) {
            geometry.scaleFactor = 1;
        }

        // Calculate arrow position using common function
        const arrowPosition = EdgeMesh.calculateArrowPosition(dstPoint, direction, arrowLength, geometry);
        this.context.getStatsManager().endMeasurement("Edge.transformArrowCap.mainPath");

        arrowCap.place(arrowPosition, direction);
        Edge.placeStack(this.headStack, arrowStyle.arrowHead, dstPoint, direction);
    }

    /**
     * Place the arrow head from the node centres and bounding radii, for when the line's ends on
     * the node surfaces could not be found, and say where the line runs.
     * @param arrowCap - This edge's arrow head.
     * @returns The line's ends, stopping short of the arrow head.
     */
    private placeArrowFromCentres(arrowCap: ArrowCap): EdgeLine {
        const fallbackSrc = this.srcNode.drawnPosition;
        const fallbackDst = this.dstNode.drawnPosition;

        // Hide arrow if nodes are too close or at same position
        if (fallbackSrc.equalsWithEpsilon(fallbackDst, 0.01)) {
            arrowCap.setDrawn(false);
            return {
                srcPoint: fallbackSrc,
                dstPoint: fallbackDst,
            };
        }

        // Pure geometric positioning (same as main path, but using node centers/radii)
        const direction = fallbackDst.subtract(fallbackSrc).normalize();

        // Get arrow length (including size multiplier)
        this.context.getStatsManager().startMeasurement("Edge.transformArrowCap.styleAndGeometry");
        const style = this.currentStyle;
        const arrowSize = style.arrowHead?.size ?? 1;
        const scale = Edge.capScale(this.dstNode);
        arrowCap.setScale(scale);
        const arrowLength = EdgeMesh.calculateArrowLength() * arrowSize * scale;

        // Where the line leaves each node's bounding box. Not its bounding SPHERE: that is fitted
        // around the box, so its radius is the box's half-diagonal and an edge trimmed by it
        // stopped well short of a box, a cylinder or a torus (#2643). Measured in the node's own
        // (graph-root) space, the space the centres above are in.
        const dstNodeRadius = Edge.boxReachOf(this.dstNode, direction);
        const srcNodeRadius = Edge.boxReachOf(this.srcNode, direction);
        this.context.getStatsManager().endMeasurement("Edge.transformArrowCap.styleAndGeometry");

        // Calculate surface intersection points
        this.context.getStatsManager().startMeasurement("Edge.transformArrowCap.vectorMath");
        const srcSurfacePoint = fallbackSrc.add(direction.scale(srcNodeRadius));
        const dstSurfacePoint = fallbackDst.subtract(direction.scale(dstNodeRadius + Edge.capGap(style.arrowHead)));

        // Use common arrow geometry functions for positioning
        const arrowType = style.arrowHead?.type;
        const geometry = EdgeMesh.getArrowGeometry(arrowType ?? "normal", Edge.capOf(style, style.arrowHead));

        // PHASE 4: Override scaleFactor for 2D arrows
        // In 2D mode, sphere-dot and open-dot use full-size circles (not tiny 0.25x spheres)
        // so their scaleFactor should be 1.0, not 0.25
        if (arrowCap.is2D && geometry.scaleFactor !== undefined) {
            geometry.scaleFactor = 1;
        }

        // Calculate arrow position using common function
        const arrowPosition = EdgeMesh.calculateArrowPosition(dstSurfacePoint, direction, arrowLength, geometry);

        // Calculate line endpoint using common function
        const lineEndPoint = EdgeMesh.calculateLineEndpoint(dstSurfacePoint, direction, arrowLength, geometry);
        this.context.getStatsManager().endMeasurement("Edge.transformArrowCap.vectorMath");

        arrowCap.place(arrowPosition, direction);
        Edge.placeStack(this.headStack, style.arrowHead, dstSurfacePoint, direction);

        return {
            srcPoint: srcSurfacePoint,
            dstPoint: lineEndPoint,
        };
    }

    /**
     * Place the arrow tail, when this edge draws one, and say where the line has to start so it
     * leaves the tail room.
     * @param srcPoint - Where the line leaves the source node's surface.
     * @param dstPoint - Where the line meets the destination node's surface.
     * @param direction - The unit direction from source to destination.
     * @param path - The line's points from the source end, for a tail drawn part-way along it.
     * @returns Where the line starts: past the tail, or the source surface with no tail or a tail
     *   drawn part-way along.
     */
    private placeArrowTail(
        srcPoint: Vector3,
        dstPoint: Vector3,
        direction: Vector3,
        path: readonly Vector3[] = [],
    ): Vector3 {
        const { arrowTailCap } = this;
        if (!arrowTailCap) {
            return srcPoint;
        }

        const tailStyle = this.currentStyle;
        const tailType = tailStyle.arrowTail?.type;

        if (!tailType || tailType === "none") {
            return srcPoint;
        }

        // Reverse direction for tail (points away from source toward destination)
        const tailDirection = dstPoint.subtract(srcPoint).normalize();

        // Get tail arrow dimensions and geometry
        const tailSize = tailStyle.arrowTail?.size ?? 1;
        const tailScale = Edge.capScale(this.srcNode);
        arrowTailCap.setScale(tailScale);
        const tailLength = EdgeMesh.calculateArrowLength() * tailSize * tailScale;
        const tailGeometry = EdgeMesh.getArrowGeometry(tailType, Edge.capOf(tailStyle, tailStyle.arrowTail));

        // PHASE 4: Override scaleFactor for 2D tail arrows
        if (arrowTailCap.is2D && tailGeometry.scaleFactor !== undefined) {
            tailGeometry.scaleFactor = 1;
        }

        // A tail part-way along sits on the line, which runs on to the source node.
        const along = pointFromEnd(path, tailStyle.arrowTail?.position ?? 0);
        if (along !== null) {
            const toward = new Vector3(along.toward.x, along.toward.y, along.toward.z);
            const tip = new Vector3(along.tip.x, along.tip.y, along.tip.z);
            arrowTailCap.place(EdgeMesh.calculateArrowPosition(tip, toward, tailLength, tailGeometry), toward);
            Edge.placeStack(this.tailStack, tailStyle.arrowTail, tip, toward);
            return srcPoint;
        }

        // a tail standing off its node: the cap and the line's start both move out along the line
        srcPoint = srcPoint.add(tailDirection.scale(Edge.capGap(tailStyle.arrowTail)));

        // Calculate tail position using common function
        // For tail, we negate the direction since it points away from source
        const tailPosition = EdgeMesh.calculateArrowPosition(
            srcPoint,
            tailDirection.scale(-1), // Reverse direction for tail
            tailLength,
            tailGeometry,
        );

        // Tail points in opposite direction (away from source)
        const reversedDirection = direction.scale(-1);

        arrowTailCap.place(tailPosition, reversedDirection);
        Edge.placeStack(this.tailStack, tailStyle.arrowTail, srcPoint, tailDirection.scale(-1));

        // Adjust line start point to create gap for tail arrow
        return EdgeMesh.calculateLineEndpoint(
            srcPoint,
            tailDirection.scale(-1), // Reverse direction for tail
            tailLength,
            tailGeometry,
        );
    }

    /**
     * Build the caps drawn part-way along the line (`arrowMiddleHead`, `arrowMiddleTail`), disposing any
     * drawn before. Each is a slot in the batch every cap of its appearance shares, as the end caps are.
     * @param meshKey - The source mesh key the edge is drawn under.
     * @param style - The resolved style.
     */
    private createMidCaps(meshKey: string, style: EdgeStyleConfig): void {
        for (const cap of [this.arrowMiddleHeadCap, this.arrowMiddleTailCap]) {
            if (cap && !cap.isDisposed()) {
                cap.dispose();
            }
        }
        const make = (arrow: EdgeStyleConfig["arrowMiddleHead"], suffix: string): ArrowCap | null =>
            EdgeMesh.createArrowHead(
                this.context.getMeshCache(),
                `${meshKey}-${suffix}`,
                {
                    type: arrow?.type ?? "none",
                    width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                    color: arrow?.color ?? style.line?.color ?? "#FFFFFF",
                    size: arrow?.size,
                    breadth: arrow?.width,
                    side: arrow?.side,
                    opacity: arrow?.opacity,
                    image: arrow?.image,
                    outline: arrow?.outlineWidth,
                },
                this.context.getScene(),
            );
        this.arrowMiddleHeadCap = make(style.arrowMiddleHead, "mid-head");
        this.arrowMiddleTailCap = make(style.arrowMiddleTail, "mid-tail");

        for (const cap of this.stackCaps()) {
            if (!cap.isDisposed()) {
                cap.dispose();
            }
        }
        // a row of caps behind an end cap, each part in the end cap's colour and opacity
        const stack = (
            arrow: EdgeStyleConfig["arrowHead"],
            suffix: string,
        ): { cap: ArrowCap; part: ArrowStackPart }[] =>
            !arrow?.type || arrow.type === "none" || (arrow.size ?? 1) <= 0
                ? []
                : parseArrowStack(arrow.stack).flatMap((part, i) => {
                      const cap = make(
                          {
                              ...arrow,
                              type: part.type as NonNullable<typeof arrow.type>,
                              size: part.size ?? arrow.size,
                              width: part.width,
                              side: part.side,
                              outlineWidth: part.outline ?? arrow.outlineWidth,
                          },
                          `${suffix}-${String(i)}`,
                      );
                      return cap === null ? [] : [{ cap, part }];
                  });
        this.headStack = stack(style.arrowHead, "head-stack");
        this.tailStack = stack(style.arrowTail, "tail-stack");
    }

    /**
     * Every cap drawn in a row behind an end cap, head's then tail's.
     * @returns The caps.
     */
    private stackCaps(): ArrowCap[] {
        return [...this.headStack, ...this.tailStack].map(({ cap }) => cap);
    }

    /**
     * Place the caps drawn in a row behind an end cap: each with its tip where the one before it ends, pointing the
     * way the end cap points, the first behind the end cap itself.
     * @param stack - The caps and the parts they draw.
     * @param arrow - The end cap's style.
     * @param tip - Where the end cap's tip is.
     * @param toward - The way the end cap points, a unit vector.
     */
    private static placeStack(
        stack: readonly { cap: ArrowCap; part: ArrowStackPart }[],
        arrow: EdgeStyleConfig["arrowHead"],
        tip: Vector3,
        toward: Vector3,
    ): void {
        const size = arrow?.size ?? 1;
        let back = EdgeMesh.capExtent(arrow?.type ?? "normal", size);
        for (const { cap, part } of stack) {
            const partSize = part.size ?? size;
            const geometry = EdgeMesh.getArrowGeometry(part.type);
            if (cap.is2D && geometry.scaleFactor !== undefined) {
                geometry.scaleFactor = 1;
            }
            const at = tip.subtract(toward.scale(back));
            cap.place(
                EdgeMesh.calculateArrowPosition(at, toward, EdgeMesh.calculateArrowLength() * partSize, geometry),
                toward,
            );
            back += EdgeMesh.capExtent(part.type, partSize);
        }
    }

    /**
     * Place the caps drawn part-way along the line: the mid head with its tip `position` (unset,
     * half) of the way back from the target end pointing toward the target, the mid tail the same
     * from the source end pointing toward the source. The line runs on under them.
     * @param path - The line's points, from where it leaves the source node to where it meets the target.
     */
    private placeMidCaps(path: readonly Vector3[]): void {
        const style = this.currentStyle;
        const ends: [ArrowCap | null, EdgeStyleConfig["arrowMiddleHead"], readonly Vector3[]][] = [
            [this.arrowMiddleHeadCap, style.arrowMiddleHead, [...path].reverse()],
            [this.arrowMiddleTailCap, style.arrowMiddleTail, path],
        ];
        for (const [cap, arrow, from] of ends) {
            const along = cap === null ? null : pointFromEnd(from, arrow?.position ?? 0.5);
            if (cap === null || along === null) {
                continue;
            }

            const geometry = EdgeMesh.getArrowGeometry(arrow?.type ?? "normal");
            if (cap.is2D && geometry.scaleFactor !== undefined) {
                geometry.scaleFactor = 1;
            }

            const toward = new Vector3(along.toward.x, along.toward.y, along.toward.z);
            const tip = new Vector3(along.tip.x, along.tip.y, along.tip.z);
            const scale = Edge.capScale(this.dstNode);
            cap.setScale(scale);
            const length = EdgeMesh.calculateArrowLength() * (arrow?.size ?? 1) * scale;
            cap.place(EdgeMesh.calculateArrowPosition(tip, toward, length, geometry), toward);
        }
    }

    /**
     * Calculates ray intersection points with source and destination node meshes.
     * Used to position edges at node surfaces rather than centers.
     * @returns Intersection points for source, destination, and adjusted endpoint
     */
    getInterceptPoints(): InterceptPoint {
        const srcMesh = this.srcNode.drawnPickMesh;
        const dstMesh = this.dstNode.drawnPickMesh;
        if (this.srcNode.drawnInBatch || this.dstNode.drawnInBatch || srcMesh === null || dstMesh === null) {
            return this.interceptPointsFromRows();
        }

        let srcPoint: Vector3 | null = null;
        let dstPoint: Vector3 | null = null;
        let newEndPoint: Vector3 | null = null;

        const srcRadius = this.srcNode.roundRadius;
        const dstRadius = this.dstNode.roundRadius;

        if (srcRadius !== null && dstRadius !== null) {
            // WORKED OUT RATHER THAN SEARCHED FOR. Where a straight line crosses a sphere is one
            // multiply away from the centre and the radius, and this is the answer for the shapes
            // the element draws by default. The search it replaces -- two ray-against-mesh
            // intersections per edge, each walking the triangles of a node's geometry -- measured
            // 137 ms of a 151 ms frame on a graph of two thousand nodes with a live layout, which
            // was the whole of what a moving graph cost. It also needed both endpoint meshes to
            // have a freshly computed world matrix; a radius does not move when a node does, so
            // that is gone too.
            const srcCentre = srcMesh.position;
            const dstCentre = dstMesh.position;
            const dx = dstCentre.x - srcCentre.x;
            const dy = dstCentre.y - srcCentre.y;
            const dz = dstCentre.z - srcCentre.z;
            const span = Math.sqrt(dx * dx + dy * dy + dz * dz); // NOSONAR(S7769): per edge, per frame; Math.hypot measured ~5x slower here

            // Two nodes closer than their own surfaces have no line between them to trim, which
            // is the same case the intersection search reported by finding no hit.
            if (span > srcRadius + dstRadius) {
                const ux = dx / span;
                const uy = dy / span;
                const uz = dz / span;

                srcPoint = new Vector3(
                    srcCentre.x + ux * srcRadius,
                    srcCentre.y + uy * srcRadius,
                    srcCentre.z + uz * srcRadius,
                );
                dstPoint = new Vector3(
                    dstCentre.x - ux * dstRadius,
                    dstCentre.y - uy * dstRadius,
                    dstCentre.z - uz * dstRadius,
                );
            }
        } else {
            // AIMED HERE, BY THE ONE EDGE THAT IS ABOUT TO FIRE IT. A pass over every edge in the
            // graph used to do this, once a frame, whether or not the edge had moved.
            freshenWorldMatrix(srcMesh);
            freshenWorldMatrix(dstMesh);

            // CAST IN THE WORLD, DRAWN IN GRAPH-ROOT SPACE. The intersection is against the
            // meshes' world geometry, so the ray runs between their world centres; the line is
            // drawn under graph-root, so each hit is carried back as how far along the centre
            // line it is, which a move, turn or scale of graph-root (an XR gesture) leaves alone.
            const srcWorld = srcMesh.getAbsolutePosition();
            const dstWorld = dstMesh.getAbsolutePosition();
            this.ray.origin.copyFrom(srcWorld);
            dstWorld.subtractToRef(srcWorld, this.ray.direction);
            const worldSpan = this.ray.direction.length();

            const dstHitInfo = this.ray.intersectsMeshes([dstMesh]);
            // THE SOURCE IS MET FROM THE FAR END TOO. A ray cast from inside a node meets the nearest wall,
            // which for a figure with arms (Pajek's man) is its body's, and the line would then run on
            // across its own arm; coming in from the destination, the first wall is where the line
            // finally leaves the outline, as it is for the destination.
            this.ray.origin.copyFrom(dstWorld);
            srcWorld.subtractToRef(dstWorld, this.ray.direction);
            const srcHitInfo = this.ray.intersectsMeshes([srcMesh]);
            // A node with no body (shape "none") has no face for the ray to meet: the line meets its box.
            const along = (hits: typeof srcHitInfo, node: Node, toward: Node): Vector3 | null => {
                // a node whose surface is its box (a glyph of pieces) is met at its box, not at a piece the ray crosses
                const hit = node.surfaceIsBox ? null : hits[0]?.pickedPoint;
                if (hit) {
                    return Vector3.Lerp(
                        srcMesh.position,
                        dstMesh.position,
                        Vector3.Distance(srcWorld, hit) / worldSpan,
                    );
                }

                return node.shapeType === "none" || node.surfaceIsBox
                    ? this.leaveNode(node, node.drawnPosition, toward.drawnPosition)
                    : null;
            };

            if (worldSpan > 0) {
                srcPoint = along(srcHitInfo, this.srcNode, this.dstNode);
                dstPoint = along(dstHitInfo, this.dstNode, this.srcNode);
            }
        }

        if (srcPoint !== null && dstPoint !== null) {
            this.pastBorders(srcPoint, dstPoint);
        }

        // A group drawn as a region behind its members is a thin plate a ray meets at once, at its middle, and no node
        // drawn behind every edge hides the line under it: the line leaves it through its outline across the view.
        if (this.srcNode.isDrawnBehindEdges) {
            srcPoint = this.groupEnd(this.srcNode, srcMesh.position, dstMesh.position);
        }
        if (this.dstNode.isDrawnBehindEdges) {
            dstPoint = this.groupEnd(this.dstNode, dstMesh.position, srcMesh.position);
        }

        if (srcPoint !== null && dstPoint !== null) {
            newEndPoint = this.lineEndBefore(srcPoint, dstPoint);
        }

        return {
            srcPoint,
            dstPoint,
            newEndPoint,
        };
    }

    /**
     * {@link getInterceptPoints} with a batch drawing either end: the mirror's answer, reading no batched row's mesh.
     * An end only a ray reaches is met by the same ray, through its row, or its own mesh on an object row.
     * @returns The points.
     */
    private interceptPointsFromRows(): InterceptPoint {
        const { srcNode, dstNode, ray } = this;
        const input = this.trimInput;
        for (const node of [srcNode, dstNode]) {
            if (!node.drawnInBatch) {
                node.drawnWorldMatrix(true);
            }
        }

        const srcWorld = srcNode.drawnWorldPosition;
        const dstWorld = dstNode.drawnWorldPosition;
        const worldSpan = Vector3.Distance(srcWorld, dstWorld);
        const span = Math.hypot(input.dst.x - input.src.x, input.dst.y - input.src.y, input.dst.z - input.src.z);
        const reach = (end: TrimEnd, node: Node, from: Vector3, to: Vector3): number => {
            if (end.measured !== TRIM_NO_HIT || worldSpan === 0) {
                return end.measured;
            }

            if (this.endsMoving && node.drawnInBatch) {
                // ponytail: the box's bounding sphere, so a figure's end floats off it while it moves; a GPU
                // pass over the shared shape (design section 4.3) would give the exact end at no ray
                this.context.getUpdateManager?.().endsByRadius(this);
                return Math.hypot(end.half.x, end.half.y, end.half.z);
            }

            ray.origin.copyFrom(from);
            to.subtractToRef(from, ray.direction);
            const hit = node.drawnRayHit(ray);
            return hit === null ? TRIM_NO_HIT : (Vector3.Distance(to, hit) / worldSpan) * span;
        };
        const { src, dst, lineEnd } = trimEnds({
            ...input,
            source: { ...input.source, measured: reach(input.source, srcNode, dstWorld, srcWorld) },
            target: { ...input.target, measured: reach(input.target, dstNode, srcWorld, dstWorld) },
        });
        const point = (at: Xyz | null): Vector3 | null => (at === null ? null : new Vector3(at.x, at.y, at.z));
        return { srcPoint: point(src), dstPoint: point(dst), newEndPoint: point(lineEnd) };
    }

    /**
     * What {@link getInterceptPoints} works from, as numbers, for its mirror (`meshes/edgeTrim.ts`).
     * An end only a ray reaches carries `TRIM_NO_HIT`, for the caller to measure: a shape that is not a
     * box, and a round end across from a non-round one, which the ray meets on its facets.
     * @returns The numbers.
     * @internal
     */
    get trimInput(): EdgeTrimInput {
        const trimEnd = (node: Node, gap: number, other: Node): TrimEnd => {
            const leaves = node.surfaceIsBox || node.shapeType === "none";
            const closed =
                leaves || (node.roundRadius !== null && other.roundRadius !== null) || node.surfaceIsClosedForm;
            return {
                radius: node.roundRadius,
                half: node.drawnHalfExtents,
                flat: node.shapeType === "ellipse" || (node.reachOutline ?? false),
                border: node.borderReach,
                gap,
                measured: closed ? TRIM_CLOSED : TRIM_NO_HIT,
                leaves,
                group: node.isDrawnBehindEdges,
            };
        };
        // a line a unit long loses what the arrow head takes from any line
        const tip = new Vector3(1, 0, 0);
        return {
            src: this.srcNode.drawnPosition,
            dst: this.dstNode.drawnPosition,
            source: trimEnd(this.srcNode, this.gapAt("source"), this.dstNode),
            target: trimEnd(this.dstNode, this.gapAt("target"), this.srcNode),
            capBack: 1 - this.lineEndBefore(Vector3.Zero(), tip).x,
        };
    }

    /**
     * Move the line's two ends out past the borders of the nodes they meet, so the line meets a
     * border rather than running across it. Along the line, so at a slant it stops a little inside
     * the border's outer edge, never outside it.
     * @param srcPoint - Where the line leaves the source node's surface; moved in place.
     * @param dstPoint - Where it meets the destination node's surface; moved in place.
     */
    private pastBorders(srcPoint: Vector3, dstPoint: Vector3): void {
        const srcReach = this.srcNode.borderReach + this.gapAt("source");
        const dstReach = this.dstNode.borderReach + this.gapAt("target");

        if (srcReach === 0 && dstReach === 0) {
            return;
        }

        const direction = dstPoint.subtract(srcPoint);
        const span = direction.length();

        if (span <= srcReach + dstReach) {
            return;
        }

        direction.scaleInPlace(1 / span);
        srcPoint.addInPlace(direction.scale(srcReach));
        dstPoint.subtractInPlace(direction.scale(dstReach));
    }

    /**
     * Where the line stops short of the destination node's surface to leave room for the arrow
     * head, or the surface itself when there is no arrow head.
     * @param srcPoint - Where the line leaves the source node's surface.
     * @param dstPoint - Where the line meets the destination node's surface.
     * @returns The line's end.
     */
    private lineEndBefore(srcPoint: Vector3, dstPoint: Vector3): Vector3 {
        const style = this.currentStyle;
        const hasArrowHead = style.arrowHead?.type && style.arrowHead.type !== "none";

        // No arrow head, or one drawn part-way along: the line goes all the way to the node surface
        if (!hasArrowHead || (style.arrowHead?.position ?? 0) > 0) {
            return dstPoint;
        }

        const arrowSize = style.arrowHead?.size ?? 1;
        const arrowLength = EdgeMesh.calculateArrowLength() * arrowSize * Edge.capScale(this.dstNode);
        const arrowType = style.arrowHead?.type ?? "normal";
        const geometry = EdgeMesh.getArrowGeometry(arrowType, Edge.capOf(style, style.arrowHead));

        // PHASE 4: Override scaleFactor for 2D arrows in line endpoint calculation
        if (this.arrowCap?.is2D && geometry.scaleFactor !== undefined) {
            geometry.scaleFactor = 1;
        }

        // Use common function to calculate line endpoint
        // Direction points FROM source TO destination (forward direction)
        const direction = dstPoint.subtract(srcPoint).normalize();
        const capEnd = dstPoint.subtract(direction.scale(Edge.capGap(style.arrowHead)));
        return EdgeMesh.calculateLineEndpoint(capEnd, direction, arrowLength, geometry);
    }

    /**
     * How much larger or smaller than its style's size a cap at a node is drawn: as the node is,
     * so a node kept one size on screen (a map's `nodeScale: "screen"`) or drawn at one depth's
     * size keeps its arrowheads in proportion rather than buried under them.
     * @param node - The node the cap stands on.
     * @returns The node mesh's scale; 1 when it has none.
     */
    private static capScale(node: Node): number {
        const scale = node.drawnScale;
        return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }

    /**
     * How far off its node an end cap is drawn (`gap` times the cap's length), in scene units: 0 for no cap, no gap,
     * or a cap drawn part-way along its line.
     * @param arrow - The end's arrow style.
     * @returns The distance from the node's surface to the cap's tip.
     */
    private static capGap(arrow: EdgeStyleConfig["arrowHead"]): number {
        const gap = arrow?.gap ?? 0;
        if (gap <= 0 || (arrow?.position ?? 0) > 0 || !arrow?.type || arrow.type === "none") {
            return 0;
        }

        // the cap's own length: its size, except a tee's bar, which is drawn shallower than its size
        const depth = arrow.type === "tee" ? TEE_DEPTH : 1;
        return gap * depth * EdgeMesh.calculateArrowLength() * (arrow.size ?? 1);
    }

    /**
     * Where one of this edge's three pieces of text hangs, and how far off.
     *
     * ONE PLACE FOR BOTH ANSWERS, because they were worked out twice and could disagree: the
     * label's builder resolved `location` into an attach position, and its caller resolved the
     * same field again to decide where `update()` would hang the plane every frame. A block that
     * says "automatic" falls back to whatever the caller's own default is -- the renderer has no
     * rule for choosing a side of an edge, so "automatic" here means "wherever this piece of text
     * normally sits" rather than a computation.
     * @param block - The resolved rich-text block, if there is one.
     * @param fallbackLocation - Where this piece of text sits when its block does not say.
     * @param fallbackOffset - How far off it sits when its block does not say.
     * @returns The side it hangs from and the distance, in world units.
     */
    private placementOf(
        block: RichTextStyleType | undefined,
        fallbackLocation: AttachPosition,
        fallbackOffset: number,
    ): { attachPosition: AttachPosition; attachOffset: number } {
        const location = block?.location ?? fallbackLocation;

        return {
            attachPosition: location === "automatic" ? fallbackLocation : location,
            attachOffset: block?.attachOffset ?? fallbackOffset,
        };
    }

    private createLabel(styleConfig: EdgeStyleConfig): {
        label: RichTextLabel;
        offset: number;
        attachPosition: AttachPosition;
    } {
        const labelText = this.extractLabelText(styleConfig.label);
        const placement = this.placementOf(styleConfig.label, EDGE_LABEL_LOCATION, EDGE_LABEL_OFFSET);
        const labelOptions = this.createLabelOptions(labelText, styleConfig.label, placement);

        return {
            label: new RichTextLabel(this.context.getScene(), labelOptions),
            offset: placement.attachOffset,
            attachPosition: placement.attachPosition,
        };
    }

    /**
     * The text this edge's label draws, which is the empty string when nothing configured one.
     *
     * There used to be a fallback to `this.id`, so an unlabelled edge read `"alice:bob"` on
     * screen. Under an element-assigned counter that same fallback would read `"17"` -- an
     * internal number with no meaning to a reader -- so it is gone: an unlabelled edge draws no
     * label at all.
     * @param labelConfig - the label block of the resolved edge style, if there is one
     * @returns the text, or "" for an edge nothing named
     */
    private extractLabelText(labelConfig?: Record<string, unknown>): string {
        if (!labelConfig) {
            return "";
        }

        // Check if text is directly provided
        if (labelConfig.text !== undefined && labelConfig.text !== null) {
            // Only convert to string if it's a primitive type
            if (
                typeof labelConfig.text === "string" ||
                typeof labelConfig.text === "number" ||
                typeof labelConfig.text === "boolean"
            ) {
                return String(labelConfig.text);
            }
        } else if (labelConfig.textPath && typeof labelConfig.textPath === "string") {
            try {
                const result = jmespath.search(this.data, labelConfig.textPath);
                if (result !== null && result !== undefined) {
                    return String(result);
                }
            } catch {
                // Ignore jmespath errors
            }
        }

        return "";
    }

    /**
     * Turn one rich-text block into the options the label renderer takes.
     *
     * TAKES THE BLOCK, not the whole edge style, because an edge draws three of them: its own
     * label at the middle of the line, and a caption at each end of it. They are the same schema
     * (`RichTextStyle`), the same class draws all three, and the only difference is which key of
     * the resolved style they came from and where they hang. The node's equivalent has taken the
     * block since it grew a tooltip beside its label, for the same reason.
     *
     * WHAT THIS REPLACED FOR A CAPTION. The captions used to be built by a mapping of their own
     * that read seven fields of the block -- the words, the font size, the text and background
     * colours, the corner radius and the offset -- and dropped the other fifty. A caption could
     * not be given a typeface, a border, a shadow, a badge or a margin by any route at all, not
     * even by a caller writing the style out by hand, and nothing said so.
     * @param labelText - The words to draw.
     * @param block - The resolved rich-text block: `style.label`, `style.arrowHead.text` or
     *     `style.arrowTail.text`.
     * @param placement - Where it hangs, from {@link placementOf}.
     * @param placement.attachPosition - Which side of its anchor it sits on.
     * @param placement.attachOffset - How far off, in world units.
     * @returns The options, with the placement the caller worked out already applied.
     */
    private createLabelOptions(
        labelText: string,
        block: RichTextStyleType | undefined,
        placement: { attachPosition: AttachPosition; attachOffset: number },
    ): RichTextLabelOptions {
        if (!block) {
            return {
                text: labelText,
                attachPosition: placement.attachPosition,
                attachOffset: placement.attachOffset,
            };
        }

        // Transform backgroundColor to string if it's an advanced color style
        let backgroundColor: string | undefined = undefined;
        if (block.backgroundColor) {
            if (typeof block.backgroundColor === "string") {
                ({ backgroundColor } = block);
            } else if (block.backgroundColor.colorType === "solid") {
                ({ value: backgroundColor } = block.backgroundColor);
            } else if (block.backgroundColor.colorType === "gradient") {
                // For gradients, use the first color as a fallback
                [backgroundColor] = block.backgroundColor.colors;
            }
        }

        // Filter out undefined values from backgroundGradientColors
        let backgroundGradientColors: string[] | undefined = undefined;
        if (block.backgroundGradientColors) {
            backgroundGradientColors = block.backgroundGradientColors.filter(
                (color): color is string => color !== undefined,
            );
            if (backgroundGradientColors.length === 0) {
                backgroundGradientColors = undefined;
            }
        }

        // Transform borders to ensure colors are strings
        let borders: { width: number; color: string; spacing: number }[] | undefined = undefined;
        if (block.borders && block.borders.length > 0) {
            const validBorders = block.borders
                .filter((border): border is typeof border & { color: string } => border.color !== undefined)
                .map((border) => ({
                    width: border.width,
                    color: border.color,
                    spacing: border.spacing,
                }));
            // Only set borders if we have valid borders, otherwise leave it undefined
            // so the default empty array is used
            if (validBorders.length > 0) {
                borders = validBorders;
            }
        }

        // Create label options by spreading the entire block
        const labelOptions: RichTextLabelOptions = {
            ...block,
            // Override with computed values
            text: labelText,
            attachPosition: placement.attachPosition,
            attachOffset: placement.attachOffset,
            backgroundColor,
            backgroundGradientColors,
            ...(borders !== undefined && { borders }),
        };

        // Handle special case for transparent background
        if (labelOptions.backgroundColor === "transparent") {
            labelOptions.backgroundColor = undefined;
        }

        // Remove properties that shouldn't be passed to RichTextLabel
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { location, textPath, enabled, ...finalLabelOptions } = labelOptions;

        return finalLabelOptions;
    }

    /**
     * Build the caption that hangs from the cap at one end of this edge.
     *
     * THE SAME BUILDER AS THE EDGE'S OWN LABEL, which is the whole of what changed here: the
     * caption is a `RichTextLabel` written in the same schema, so every field the label
     * vocabulary publishes reaches it, rather than the seven a mapping of its own used to copy.
     * @param textConfig - The resolved rich-text block at this end.
     * @param source - Which end it is, which decides the glyph an unworded caption falls back to.
     * @returns The caption, and where to hang it from the cap.
     */
    private createArrowText(
        textConfig: RichTextStyleType,
        source: "arrowHead" | "arrowTail",
    ): { label: RichTextLabel; offset: number; attachPosition: AttachPosition } {
        // What is drawn for a caption that was switched on and given no words: a right arrow
        // (U+2192) at the head and a left arrow (U+2190) at the tail. It is UI content, so it is
        // the arrow glyph rather than "->" / "<-"; written as escapes to keep the source ASCII.
        const glyph = source === "arrowHead" ? "\u2192" : "\u2190";
        const words = this.extractLabelText(textConfig);
        const labelText = words === "" ? glyph : words;
        const placement = this.placementOf(textConfig, ARROW_CAPTION_LOCATION, ARROW_CAPTION_OFFSET);
        const labelOptions = this.createLabelOptions(labelText, textConfig, placement);

        return {
            label: new RichTextLabel(this.context.getScene(), labelOptions),
            offset: placement.attachOffset,
            attachPosition: placement.attachPosition,
        };
    }
}
