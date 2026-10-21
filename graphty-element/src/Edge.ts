import { AbstractMesh, Ray, Vector3 } from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";
import * as jmespath from "jmespath";
import cloneDeep from "lodash/cloneDeep.js";
import isEqual from "lodash/isEqual.js";

import { motionOf, type ShaderEffects, type ShaderParamSets } from "./catalog/shaders";
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
import type { GraphContext } from "./managers/GraphContext";
import { LabelDeclutter } from "./managers/LabelDeclutter";
import { bootstrapEdgePaint, type EdgePaint } from "./managers/StylePainter";
import type { ArrowCap } from "./meshes/ArrowCapBatch";
import type { EdgeEffectBatch, ShadedEdgeBatch } from "./meshes/EdgeEffectBatch";
import { EDGE_STATE_BITS } from "./meshes/edgeJoinShader";
import type { EdgeLineBatch } from "./meshes/EdgeLineBatch";
import { EdgeMesh } from "./meshes/EdgeMesh";
import { bendPoints, interiorOutside, liftRoute, parseBends, roundCorners, surfaceReach } from "./meshes/edgeRoute";
import { EDGE_NEVER, EdgeShaderDrawing, type EdgeStaticLook, edgeStaticValues } from "./meshes/EdgeShaderDrawing";
import { PatternedLineMesh } from "./meshes/PatternedLineMesh";
import { readColor } from "./meshes/readColor";
import { type AttachPosition, RichTextLabel, type RichTextLabelOptions } from "./meshes/RichTextLabel";
import { Node, NodeIdType } from "./Node";
import { frozenRecord } from "./session/project/draft";
import { drawnEffects } from "./session/styles/channels";

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
 * How far a selected edge's band is pushed back in depth (a material's `zOffset`, which scales
 * with the slope, and `zOffsetUnits`, which a band facing the camera needs), so the line it marks
 * wins every pixel they share and the band shows only beside it, as a casing.
 */
const HALO_DEPTH_OFFSET = 2;

/**
 * The caption one end of an edge should be drawing, or undefined when it should draw none.
 *
 * TWO WAYS TO GET NOTHING, AND THEY MEAN DIFFERENT THINGS.
 *
 * Words are what switch a caption on, exactly as they switch a label on: `StylePainter` sets a
 * rich-text block's `enabled` whenever a layer writes the words that land in it, so a layer that
 * wrote only the APPEARANCE -- `edge.arrowHeadTextStyle` with no `edge.arrowHeadText` beneath it
 * -- has said how a caption should look without ever asking for one, and gets none. That is the
 * same rule `node.labelStyle` follows beside `node.label`, and it is what lets a theme carry a
 * caption's typeface for every edge while only the edges a layer names actually carry a caption.
 *
 * And a caption hangs from the cap at its end: `Edge.update` positions it against that cap's
 * mesh. An end drawn with no arrow has no mesh to hang one from, and a caption built anyway
 * would never be positioned at all -- it would be drawn at the middle of the scene, which is
 * what a reader would see rather than a missing caption.
 * @param block - The resolved rich-text block at that end of the edge, if there is one.
 * @param cap - The arrow mesh at that end, which is null when the end is drawn with no arrow.
 * @returns The block when a caption should be drawn from it, and undefined otherwise.
 */
function captionWanted(block: RichTextStyleType | undefined, cap: ArrowCap | null): RichTextStyleType | undefined {
    return cap === null ? undefined : drawnText(block);
}

/**
 * The frame each node mesh's world matrix was last recomputed for.
 *
 * Keyed on the MESH rather than on the node, so a node that is given a new mesh -- a reshape --
 * starts with no entry and is recomputed rather than skipped on a stamp its old mesh earned.
 */
const worldMatrixFrame = new WeakMap<AbstractMesh, number>();

/**
 * Make sure a node mesh's world matrix is this frame's, and only compute it once per frame.
 *
 * WHY IT HAS TO BE FRESH. Trimming an edge at the node surface intersects a ray with the node's
 * mesh, and that test reads the mesh's world matrix -- which is stale from the moment the frame
 * moved the node until something recomputes it.
 *
 * WHY IT IS COUNTED. A node with twenty edges on it would otherwise be recomputed twenty times a
 * frame. This used to be paid for by a separate pass over every edge in the graph that collected
 * the meshes into a set first, which cost a set of its own and a walk of every edge whether or
 * not any of them had moved. Asking here means it is paid once per node, and only for the nodes
 * an edge that actually moved is about to intersect.
 * @param mesh - The node mesh about to be intersected.
 * @param frame - The scene's current frame id.
 */
function freshenWorldMatrix(mesh: AbstractMesh, frame: number): void {
    if (worldMatrixFrame.get(mesh) === frame) {
        return;
    }

    worldMatrixFrame.set(mesh, frame);
    mesh.computeWorldMatrix(true);
}

interface EdgeOpts {
    metadata?: object;
}

/** The `shader` block of a resolved edge style: what the edge shader channels painted. */
interface EdgeShaderStyle {
    readonly id?: string;
    readonly params?: ShaderParamSets;
    readonly effects?: ShaderEffects;
}

/**
 * What the edge shader channels painted on an edge: the `shader` block the painter writes from
 * `edge.shader`, `edge.shaderParams` and `edge.effects`.
 * @param style - The resolved style.
 * @returns The block, or undefined when no shader channel painted it.
 */
function shaderStyleOf(style: EdgeStyleConfig | null): EdgeShaderStyle | undefined {
    if (style === null) {
        return undefined;
    }

    return (style as EdgeStyleConfig & { shader?: EdgeShaderStyle }).shader;
}

/**
 * The edge surface a style names, or null for none (unset, or `"none"`).
 * @param style - The resolved style.
 * @returns The id.
 */
function surfaceOf(style: EdgeStyleConfig | null): string | null {
    const id = shaderStyleOf(style)?.id;
    return id === undefined || id === "none" ? null : id;
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
 * built for: a surface, a taper, or nothing.
 * @param style - The resolved style.
 * @returns `"surface:<id>"`, `"taper"` or `"plain"`.
 */
function flavorOf(style: EdgeStyleConfig | null): string {
    const surface = surfaceOf(style);
    if (surface !== null) {
        return `surface:${surface}`;
    }

    return taperOf(style) === 1 ? "plain" : "taper";
}

/**
 * A stable 0..1 random per edge id.
 * @param id - The edge id.
 * @returns The seed.
 */
function edgeSeedOf(id: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
        hash = Math.imul(hash ^ id.charCodeAt(i), 0x01000193);
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
     * Which slots of {@link Edge.lineBatch} draw this edge: one for a straight line, and one per
     * segment of a curve, which is a run of straight segments. Empty when there is no batch.
     */
    private lineSlots: number[] = [];

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
     * The bends this edge's line passes through (`line.bends`, flat along/across pairs), or null
     * for a line straight from node to node. A bent line is a run of slots like a curve.
     */
    private lineBends: number[] | null = null;

    /** The `line.bends` text {@link Edge.lineBends} was read from. See {@link syncContent}. */
    private drawnBends?: string;

    /**
     * What the line was last asked to be drawn with beyond its plain look (`flavorOf`): a paint
     * that asks for something else rebuilds the line. A surface that cannot draw yet is drawn
     * plainly and asked for again when it can ({@link Edge.refreshShaderPaint}).
     */
    private lineWanted = "plain";

    /** What the line was built with: the flavor asked for, or `"plain"` while a surface cannot draw. */
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
     * stale. Nothing draws with it yet -- two parallel edges still render as two
     * coincident lines -- but a style layer can read it, and the geometry work that eventually
     * separates parallel edges needs exactly this number.
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
        if (this.lineBatch === null) {
            return null;
        }

        const batch = this.lineBatch;

        return {
            name: batch.name,
            // A curve's length is its whole run's.
            length: this.lineSlots.reduce((sum, slot) => sum + batch.lengthOf(slot), 0),
            // The width `createLine` built the batch with, from the same style.
            width: this.drawnStyle?.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
            visibility: batch.mesh.visibility,
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
     * and where the last one ends.
     * @returns The points, in order along the curve, as fresh vectors.
     */
    get drawnCurve(): Vector3[] | null {
        const batch = this.lineBatch;
        const last = this.lineSlots.at(-1);

        if (batch === null || !(this.lineIsCurve || this.lifted) || last === undefined) {
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
        return [...this.effectRuns].flatMap(([id, run]) => {
            const last = run.slots.at(-1);
            if (run.batch.disposed || last === undefined) {
                return [];
            }

            const points = run.slots.map((slot) => run.batch.endsOf(slot)[0]);
            points.push(run.batch.endsOf(last)[1]);
            return [{ id, points }];
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
    get drawnCaps(): { end: "arrowHead" | "arrowTail"; name: string; span: number; visibility: number }[] {
        const caps: { end: "arrowHead" | "arrowTail"; cap: ArrowCap | null }[] = [
            { end: "arrowHead", cap: this.arrowCap },
            { end: "arrowTail", cap: this.arrowTailCap },
        ];

        return caps.flatMap(({ end, cap }) =>
            cap === null || cap.isDisposed()
                ? []
                : [{ end, name: cap.name, span: cap.span, visibility: cap.visibility }],
        );
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
            this.srcNode.mesh.position.clone(),
            this.dstNode.mesh.position.subtract(this.srcNode.mesh.position),
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
        this.arrowCap = EdgeMesh.createArrowHead(
            this.context.getMeshCache(),
            paint.meshKey,
            {
                type: style.arrowHead?.type ?? "none",
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color: style.arrowHead?.color ?? style.line?.color ?? "#FFFFFF",
                size: style.arrowHead?.size,
                opacity: style.arrowHead?.opacity,
            },
            this.context.getScene(),
        );

        // create arrow tail mesh if needed
        this.arrowTailCap = EdgeMesh.createArrowHead(
            this.context.getMeshCache(),
            `${paint.meshKey}-tail`,
            {
                type: style.arrowTail?.type ?? "none",
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color: style.arrowTail?.color ?? style.line?.color ?? "#FFFFFF",
                size: style.arrowTail?.size,
                opacity: style.arrowTail?.opacity,
            },
            this.context.getScene(),
        );

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

        // DIRTY TRACKING FIRST, BEFORE ANYTHING THAT COSTS. On a still graph this comparison is
        // the whole of an edge's frame, and the update pass walks every edge in the graph on
        // every frame -- so whatever sits above this line is paid a million times a second at the
        // render ceiling for edges that are not going to move. It used to sit below a timing call
        // and a lookup into the layout engine, neither of which the early exit needs: the
        // engine's answer is only read further down, for an edge that IS moving.
        const srcPos = this.srcNode.mesh.position;
        const dstPos = this.dstNode.mesh.position;

        const srcMoved = !(this._lastSrcPos?.equalsWithEpsilon(srcPos, 0.001) ?? false);
        const dstMoved = !(this._lastDstPos?.equalsWithEpsilon(dstPos, 0.001) ?? false);

        if (!srcMoved && !dstMoved) {
            return;
        }

        this.context.getStatsManager().startMeasurement("Edge.update");

        const lnk = this.context.getLayoutManager().layoutEngine?.getEdgePosition(this);
        if (!lnk) {
            this.context.getStatsManager().endMeasurement("Edge.update");
            return;
        }

        const src = new Vector3(lnk.src.x, lnk.src.y, lnk.src.z ?? 0);
        const dst = new Vector3(lnk.dst.x, lnk.dst.y, lnk.dst.z ?? 0);
        const lift = this.liftDrawn();
        const lifted = lift !== 0 && this.lineBatch !== null && this.drawnStyle?.line?.width !== 0;
        this.lifted = lifted;
        const bent =
            lifted || (this.lineBends !== null && this.lineBatch !== null && this.drawnStyle?.line?.width !== 0);
        if (lifted && this.lineBatch) {
            this.placeLifted(this.lineBatch, src, dst, lift);
        } else if (bent && this.lineBatch && this.lineBends) {
            this.placeBent(this.lineBatch, src, dst, this.lineBends);
        } else {
            const { srcPoint, dstPoint } = this.transformArrowCap();
            this.transformEdgeMesh(srcPoint ?? src, dstPoint ?? dst);
        }

        // Update label position if exists
        if (this.label) {
            const midPoint = bent && this.lineBatch ? this.curveMiddle(this.lineBatch) : Vector3.Center(src, dst);
            this.label.attachTo(midPoint, this._labelAttachPosition, this._labelOffset);
        }

        this.placeArrowCaptions();

        // Cache positions for next frame
        this._lastSrcPos = srcPos.clone();
        this._lastDstPos = dstPos.clone();

        this.context.getStatsManager().endMeasurement("Edge.update");
    }

    /** Put each arrow cap's caption, if it has one, beside the cap where the cap now sits. */
    private placeArrowCaptions(): void {
        if (this.arrowHeadText && this.arrowCap) {
            this.arrowHeadText.attachTo(
                this.arrowCap.position,
                this._arrowHeadTextAttachPosition,
                this._arrowHeadTextOffset,
            );
        }

        if (this.arrowTailText && this.arrowTailCap) {
            this.arrowTailText.attachTo(
                this.arrowTailCap.position,
                this._arrowTailTextAttachPosition,
                this._arrowTailTextOffset,
            );
        }
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
        this.haloSlots = this.haloBatch ? [this.haloBatch.acquire()] : [];
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
            EdgeMesh.drawsAsPattern(style) &&
            !asSurface;
        const sameRoute = wantsPattern === this.mesh instanceof PatternedLineMesh;
        // A surface or a taper keys no source mesh either (`content` channels), but it is drawn
        // from a batch of its own, so asking for another one rebuilds the line.
        const sameFlavor = flavorOf(style) === this.lineWanted;
        const sameGeometry = sameRoute && sameFlavor && (meshKey === this.meshKey || isEqual(style, this.drawnStyle));

        if (sameGeometry && !meshDisposed) {
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

        this.arrowCap = EdgeMesh.createArrowHead(
            this.context.getMeshCache(),
            meshKey,
            {
                type: style.arrowHead?.type ?? "none",
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color: style.arrowHead?.color ?? style.line?.color ?? "#FFFFFF",
                size: style.arrowHead?.size,
                opacity: style.arrowHead?.opacity,
            },
            this.context.getScene(),
        );

        // recreate arrow tail mesh if needed
        if (this.arrowTailCap && !this.arrowTailCap.isDisposed()) {
            this.arrowTailCap.dispose();
        }

        this.arrowTailCap = EdgeMesh.createArrowHead(
            this.context.getMeshCache(),
            `${meshKey}-tail`,
            {
                type: style.arrowTail?.type ?? "none",
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color: style.arrowTail?.color ?? style.line?.color ?? "#FFFFFF",
                size: style.arrowTail?.size,
                opacity: style.arrowTail?.opacity,
            },
            this.context.getScene(),
        );

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
        const block = shaderStyleOf(style);
        const surface = surfaceOf(style);
        const names = surface !== null || Object.keys(block?.effects ?? {}).length > 0;
        const drawing = names
            ? EdgeShaderDrawing.of(scene, this.context.getSession?.())
            : (EdgeShaderDrawing.peek(scene) ?? null);

        const batch = this.lineBatch;
        if (batch?.widened === true) {
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
            const values = surface === null ? undefined : block?.params?.[surface];
            this.lineStatic =
                shader !== null && drawing !== null
                    ? drawing.staticValues(look, shader, values)
                    : edgeStaticValues(look);
            this.lineSpeed = shader !== null && drawing !== null ? drawing.speedOf(shader, values) : 0;
            for (const slot of this.lineSlots) {
                this.prepareLineSlot(slot);
            }
        } else {
            this.lineStatic = null;
            this.surfaceEnteredFor = null;
        }

        if (drawing !== null) {
            this.syncEffects(style, drawing);
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
     * One run of slots per edge effect the style draws (at most four, `drawnEffects`), each placed
     * with the line's own points; an effect no longer drawn plays its exit, if it has one.
     * @param style - The resolved style.
     * @param drawing - The scene's edge shader drawing.
     */
    private syncEffects(style: EdgeStyleConfig, drawing: EdgeShaderDrawing): void {
        const width = style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH;
        const wanted = this.isRenderVisible() && width > 0 ? drawnEffects(shaderStyleOf(style)?.effects).drawn : [];
        if (wanted.length === 0 && this.effectRuns.size === 0) {
            return;
        }

        const scene = this.context.getScene();
        const is2D = EdgeMesh.drawsFlat(scene);
        const painted = style.line?.color;
        const line = {
            width: is2D ? width / 40 : width * 20,
            worldWidth: is2D,
            color: typeof painted === "string" ? painted : "#a9a9a9",
            opacity: style.line?.opacity ?? 1,
        };
        const kept = new Set<string>();
        for (const [id, values] of wanted) {
            const name = `edge-effect|${id}|${String(width)}|${is2D ? "2d" : "3d"}`;
            const batch = drawing.effectBatch(this, id, this.context.getMeshCache(), name, line);
            if (batch === null) {
                continue;
            }

            kept.add(id);
            let run = this.effectRuns.get(id);
            if (run !== undefined && (run.batch !== batch || run.batch.disposed)) {
                this.releaseEffect(id, run, false);
                run = undefined;
            }

            if (run === undefined) {
                const { stamp, untilMs } = drawing.entrance(batch.shader, this.causedAt);
                const slot = batch.acquire();
                if (untilMs > 0) {
                    batch.playUntil(slot, untilMs);
                }

                run = { batch, slots: [slot], values: new Float32Array(0), speed: 0, entered: stamp };
                this.effectRuns.set(id, run);
                // The run has no place until the next update puts it on the line.
                this.invalidatePositionCache();
            }

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

        const seconds = exit ? Math.min(motionOf(run.batch.shader.registration.descriptor.motion).exit ?? 0, 1) : 0;
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
     * @param batch - The batch the run is in.
     * @param src - The source node's center.
     * @param dst - The target node's center.
     * @param lift - How far the middle rises.
     */
    private placeLifted(batch: EdgeLineBatch, src: Vector3, dst: Vector3, lift: number): void {
        const bezier = this.drawnStyle?.line?.bezier === true;
        let base: number[];
        if (this.lineBends === null) {
            base = bezier ? EdgeMesh.createBezierLine(src, dst) : [src.x, src.y, src.z, dst.x, dst.y, dst.z];
        } else {
            base = [src.x, src.y, src.z, ...bendPoints(src, dst, this.lineBends), dst.x, dst.y, dst.z];
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

        this.placeThrough(batch, src, dst, mid, bezier && this.lineBends !== null);
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
                const motion = motionOf(shaded(batch)?.shader.registration.descriptor.motion);
                return motion.change ?? 0;
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
        this.lineBatch = options.width > 0 ? this.shadedLineBatch(meshKey, style, options) : null;
        this.lineBuilt = this.lineBatch === null ? "plain" : this.lineWanted;
        this.lineBatch ??= EdgeMesh.lineBatch(
            this.context.getMeshCache(),
            options,
            drawnStyle,
            this.context.getScene(),
        );

        if (this.lineBatch) {
            // A curve's run of slots is sized to its length when it is first placed.
            this.drawnBends = drawnStyle.line?.bends;
            this.lineBends = this.srcNode === this.dstNode ? null : parseBends(this.drawnBends);
            this.lineIsCurve = drawnStyle.line?.bezier === true || this.lineBends !== null;
            this.lineSlots = [this.lineBatch.acquire()];
            this.lineStatic = null;

            // No per-edge mesh to make unpickable and nothing to hang `parentEdge` on: the batch
            // is unpickable as a whole, and the back-reference was only ever written and never
            // read -- reproducing it would be an array of Edge references one per edge, which is
            // the kind of per-edge object a batch exists to remove.
            return this.lineBatch.mesh;
        }

        return EdgeMesh.createPatternedLine(options, style, this.context.getScene());
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
            const opacity = style.line?.opacity ?? 1;
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
                },
            );
            if (batch) {
                return batch;
            }
        }

        if (taperOf(style) === 1 || EdgeMesh.drawsAsPattern(style)) {
            return null;
        }

        return EdgeMesh.lineBatch(cache, options, style, scene, true);
    }

    /**
     * Stop drawing this edge's line, whichever of the two it is.
     *
     * A BATCH IS SHARED, so a batched line is handed its slot back rather than disposed -- calling
     * `dispose()` on what {@link Edge.mesh} points at would take every other edge of the same
     * appearance off the screen with it.
     */
    private releaseLine(): void {
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
        let rebuilt = false;

        const wantedLabel = drawnText(style.label);
        const labelText = wantedLabel === undefined ? undefined : this.extractLabelText(wantedLabel);

        if (rebuild || labelText !== this.drawnLabelText || !isEqual(wantedLabel, this.drawnLabelStyle)) {
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
            rebuilt = true;
        }

        if (this.syncArrowCaptions(style, rebuild)) {
            rebuilt = true;
        }

        if (this.syncBends(style)) {
            rebuilt = true;
        }

        if (rebuilt) {
            this.invalidatePositionCache();
            // Overlapping texts are thinned out with node labels when `labels.declutter` is on.
            if (this.label ?? this.arrowHeadText ?? this.arrowTailText) {
                LabelDeclutter.trackEdge(this.context.getScene(), this.context, this);
            }
        }
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

        const wantedHead = captionWanted(style.arrowHead?.text, this.arrowCap);

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

        const wantedTail = captionWanted(style.arrowTail?.text, this.arrowTailCap);

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
        const wanted = style.line?.bends;
        const batch = this.lineBatch;
        if (wanted === this.drawnBends || batch === null) {
            return false;
        }

        this.drawnBends = wanted;
        this.lineBends = this.srcNode === this.dstNode ? null : parseBends(wanted);
        this.lineIsCurve = style.line?.bezier === true || this.lineBends !== null;
        // A straight line is one slot: hand back the rest of a run.
        while (!this.lineIsCurve && this.lineSlots.length > 1) {
            const slot = this.lineSlots.pop();
            if (slot !== undefined) {
                batch.release(slot);
            }
        }

        return true;
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

        this.label?.dispose();
        this.label = null;
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
     * and its style. Showing it again re-enables the meshes it already has and invalidates the
     * endpoint cache so the next frame recomputes where the line meets the two node surfaces --
     * which is a ray cast, not a layout.
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
     * The arrowheads are only ever DISABLED here. Whether an edge has an arrowhead at all, and
     * where it sits, is decided while the endpoints are recomputed, so re-enabling one from here
     * would show a cap on an edge whose style asks for none. Invalidating the endpoint cache hands
     * that decision back to the next update, which is the code that owns it.
     */
    private applyRenderState(): void {
        if (this.disposed) {
            return;
        }

        const drawn = this.isRenderVisible();

        for (const slot of this.haloSlots) {
            this.haloBatch?.setDrawn(slot, drawn);
        }

        for (const run of this.effectRuns.values()) {
            for (const slot of run.slots) {
                run.batch.setDrawn(slot, drawn);
            }
        }

        if (this.lineBatch) {
            for (const slot of this.lineSlots) {
                this.lineBatch.setDrawn(slot, drawn);
            }
        } else if (this.mesh instanceof PatternedLineMesh) {
            this.mesh.setDrawn(drawn);
        } else if (!this.mesh.isDisposed()) {
            // setEnabled alone: a disabled mesh is not a pick candidate either, and writing
            // isPickable here would lose whatever the edge style asked for on the way back.
            this.mesh.setEnabled(drawn);
        }

        if (!drawn) {
            this.arrowCap?.setDrawn(false);
            this.arrowTailCap?.setDrawn(false);
        }

        for (const text of [this.label, this.arrowHeadText, this.arrowTailText]) {
            const labelMesh = text?.labelMesh;

            if (labelMesh && !labelMesh.isDisposed()) {
                labelMesh.setEnabled(drawn);
            }
        }

        if (drawn) {
            this.invalidatePositionCache();
        }
    }

    /**
     * Transforms the edge mesh to position it between source and destination points.
     * Handles different mesh types (solid, patterned, 2D, bezier).
     * @param srcPoint - The source point position
     * @param dstPoint - The destination point position
     */
    transformEdgeMesh(srcPoint: Vector3, dstPoint: Vector3): void {
        // A line of width 0 is never placed, so it stays the zero matrix it was acquired as.
        if (this.drawnStyle?.line?.width === 0) {
            return;
        }

        // A batched line is sixteen floats in a shared buffer, and this is the write that moves
        // it. The whole buffer reaches the GPU once a frame, from the batch itself.
        if (this.lineBatch && this.lineIsCurve) {
            this.placeEffects(this.placeCurve(this.lineBatch, this.lineSlots, srcPoint, dstPoint));
        } else if (this.lineBatch) {
            // One straight piece: a run left from a lift is handed back to one slot.
            const straight = [srcPoint.x, srcPoint.y, srcPoint.z, dstPoint.x, dstPoint.y, dstPoint.z];
            if (this.lineSlots.length > 1) {
                this.placeRun(this.lineBatch, this.lineSlots, straight);
            } else {
                this.lineBatch.place(this.lineSlots[0], srcPoint, dstPoint);
            }

            this.placeEffects(straight);
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
            this.haloBatch.place(this.haloSlots[0], srcPoint, dstPoint);
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
     * @returns The curve's points, which the edge's effects are placed with too.
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
     * Draw this edge through its bends: straight segments from where the line leaves the source
     * node toward the first bend, through every bend, to where it meets the target node from the
     * last -- each end trimmed for its arrow cap along its own segment -- with the corners rounded
     * when the line is also curved. A selected edge's band follows the same run.
     * @param batch - The batch the run is in.
     * @param src - The source node's center.
     * @param dst - The target node's center.
     * @param bends - The bends, as `parseBends` reads them.
     */
    private placeBent(batch: EdgeLineBatch, src: Vector3, dst: Vector3, bends: readonly number[]): void {
        this.placeThrough(batch, src, dst, bendPoints(src, dst, bends), this.drawnStyle?.line?.bezier === true);
    }

    /**
     * Draw this edge through points between its nodes: straight segments from where the line
     * leaves the source node toward the first point, through every point, to where it meets the
     * target node from the last -- each end trimmed for its arrow cap along its own segment -- with
     * the corners rounded when asked. A selected edge's band and its effects follow the same run.
     * @param batch - The batch the run is in.
     * @param src - The source node's center.
     * @param dst - The target node's center.
     * @param mid - The points, flat x, y, z: at least one.
     * @param round - Whether to round the corners.
     */
    private placeThrough(
        batch: EdgeLineBatch,
        src: Vector3,
        dst: Vector3,
        mid: readonly number[],
        round: boolean,
    ): void {
        const first = Vector3.FromArray(mid, 0);
        const last = Vector3.FromArray(mid, mid.length - 3);
        const start = this.leaveNode(this.srcNode, src, first);
        const end = this.leaveNode(this.dstNode, dst, last);

        const { arrowCap } = this;
        if (arrowCap) {
            this.placeArrowHead(arrowCap, end, end.subtract(last).normalize());
        }

        const lineStart = this.placeArrowTail(start, first, first.subtract(start).normalize());
        const lineEnd = this.lineEndBefore(last, end);
        const flat = [lineStart.x, lineStart.y, lineStart.z, ...mid, lineEnd.x, lineEnd.y, lineEnd.z];
        const run = round ? roundCorners(flat) : flat;
        this.placeRun(batch, this.lineSlots, run, (slot) => {
            this.prepareLineSlot(slot);
        });
        if (this.haloBatch) {
            this.placeRun(this.haloBatch, this.haloSlots, run);
        }

        this.placeEffects(run);
    }

    /**
     * Where a segment from a node's center toward a point crosses the node's surface and border.
     * @param node - The node.
     * @param centre - Its center.
     * @param toward - The point the segment runs to.
     * @returns The crossing, or the center when the point is the center.
     */
    private leaveNode(node: Node, centre: Vector3, toward: Vector3): Vector3 {
        const dir = toward.subtract(centre);
        const span = dir.length();
        if (span === 0) {
            return centre.clone();
        }

        dir.scaleInPlace(1 / span);
        const reach = surfaceReach(dir, node.drawnHalfExtents, node.roundRadius) + node.borderReach;

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
        const segments = flat.length / 3 - 1;

        // Grow before shrinking, and never below one slot: the batch disposes itself when its last
        // slot goes, which must not happen in the middle of re-sizing a run.
        while (slots.length < segments) {
            const slot = batch.acquire();
            slots.push(slot);
            fresh?.(slot);
        }

        while (slots.length > Math.max(1, segments)) {
            const slot = slots.pop();

            if (slot !== undefined) {
                batch.release(slot);
            }
        }

        // One write per piece, each with its neighbours, so the pieces meet at their corners.
        batch.placeRun(slots, flat);
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
        if (!arrowCap && !this.arrowTailCap) {
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
            this.placeArrowHead(arrowCap, dstPoint, direction);
        }

        const adjustedSrcPoint = this.placeArrowTail(srcPoint, dstPoint, direction);

        return {
            srcPoint: adjustedSrcPoint,
            dstPoint: newEndPoint, // Line ends before arrow to create gap for arrow to fill
        };
    }

    /**
     * Place the arrow head with its tip where the line meets the target node.
     * @param arrowCap - This edge's arrow head.
     * @param dstPoint - Where the line meets the target node's surface.
     * @param direction - The unit direction the line arrives in.
     */
    private placeArrowHead(arrowCap: ArrowCap, dstPoint: Vector3, direction: Vector3): void {
        // Use common arrow geometry functions for positioning
        this.context.getStatsManager().startMeasurement("Edge.transformArrowCap.mainPath");
        const arrowStyle = this.currentStyle;
        const arrowType = arrowStyle.arrowHead?.type;
        const arrowSize = arrowStyle.arrowHead?.size ?? 1;
        const arrowLength = EdgeMesh.calculateArrowLength() * arrowSize;
        const geometry = EdgeMesh.getArrowGeometry(arrowType ?? "normal");

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
    }

    /**
     * Place the arrow head from the node centres and bounding radii, for when the line's ends on
     * the node surfaces could not be found, and say where the line runs.
     * @param arrowCap - This edge's arrow head.
     * @returns The line's ends, stopping short of the arrow head.
     */
    private placeArrowFromCentres(arrowCap: ArrowCap): EdgeLine {
        const fallbackSrc = this.srcNode.mesh.position;
        const fallbackDst = this.dstNode.mesh.position;

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
        const arrowLength = EdgeMesh.calculateArrowLength() * arrowSize;

        // Where the line leaves each node's bounding box. Not its bounding SPHERE: that is fitted
        // around the box, so its radius is the box's half-diagonal and an edge trimmed by it
        // stopped well short of a box, a cylinder or a torus (#2643). Measured in the node's own
        // (graph-root) space, the space the centres above are in.
        const dstNodeRadius = boxReach(this.dstNode.mesh, direction);
        const srcNodeRadius = boxReach(this.srcNode.mesh, direction);
        this.context.getStatsManager().endMeasurement("Edge.transformArrowCap.styleAndGeometry");

        // Calculate surface intersection points
        this.context.getStatsManager().startMeasurement("Edge.transformArrowCap.vectorMath");
        const srcSurfacePoint = fallbackSrc.add(direction.scale(srcNodeRadius));
        const dstSurfacePoint = fallbackDst.subtract(direction.scale(dstNodeRadius));

        // Use common arrow geometry functions for positioning
        const arrowType = style.arrowHead?.type;
        const geometry = EdgeMesh.getArrowGeometry(arrowType ?? "normal");

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
     * @returns Where the line starts: past the tail, or the source surface with no tail.
     */
    private placeArrowTail(srcPoint: Vector3, dstPoint: Vector3, direction: Vector3): Vector3 {
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
        const tailLength = EdgeMesh.calculateArrowLength() * tailSize;
        const tailGeometry = EdgeMesh.getArrowGeometry(tailType);

        // PHASE 4: Override scaleFactor for 2D tail arrows
        if (arrowTailCap.is2D && tailGeometry.scaleFactor !== undefined) {
            tailGeometry.scaleFactor = 1;
        }

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

        // Adjust line start point to create gap for tail arrow
        return EdgeMesh.calculateLineEndpoint(
            srcPoint,
            tailDirection.scale(-1), // Reverse direction for tail
            tailLength,
            tailGeometry,
        );
    }

    /**
     * Calculates ray intersection points with source and destination node meshes.
     * Used to position edges at node surfaces rather than centers.
     * @returns Intersection points for source, destination, and adjusted endpoint
     */
    getInterceptPoints(): InterceptPoint {
        const srcMesh = this.srcNode.mesh;
        const dstMesh = this.dstNode.mesh;

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
            const frame = this.context.getScene().getFrameId();

            freshenWorldMatrix(srcMesh, frame);
            freshenWorldMatrix(dstMesh, frame);

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
            const srcHitInfo = this.ray.intersectsMeshes([srcMesh]);

            if (dstHitInfo.length && srcHitInfo.length && worldSpan > 0) {
                const dstHit = dstHitInfo[0].pickedPoint;
                const srcHit = srcHitInfo[0].pickedPoint;

                if (!srcHit || !dstHit) {
                    throw new TypeError("error picking points");
                }

                srcPoint = Vector3.Lerp(
                    srcMesh.position,
                    dstMesh.position,
                    Vector3.Distance(srcWorld, srcHit) / worldSpan,
                );
                dstPoint = Vector3.Lerp(
                    srcMesh.position,
                    dstMesh.position,
                    Vector3.Distance(srcWorld, dstHit) / worldSpan,
                );
            }
        }

        if (srcPoint !== null && dstPoint !== null) {
            this.pastBorders(srcPoint, dstPoint);
            newEndPoint = this.lineEndBefore(srcPoint, dstPoint);
        }

        return {
            srcPoint,
            dstPoint,
            newEndPoint,
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
        const srcReach = this.srcNode.borderReach;
        const dstReach = this.dstNode.borderReach;

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

        if (!hasArrowHead) {
            // No arrow head, edge goes all the way to the node surface
            return dstPoint;
        }

        const arrowSize = style.arrowHead?.size ?? 1;
        const arrowLength = EdgeMesh.calculateArrowLength() * arrowSize;
        const arrowType = style.arrowHead?.type ?? "normal";
        const geometry = EdgeMesh.getArrowGeometry(arrowType);

        // PHASE 4: Override scaleFactor for 2D arrows in line endpoint calculation
        if (this.arrowCap?.is2D && geometry.scaleFactor !== undefined) {
            geometry.scaleFactor = 1;
        }

        // Use common function to calculate line endpoint
        // Direction points FROM source TO destination (forward direction)
        const direction = dstPoint.subtract(srcPoint).normalize();
        return EdgeMesh.calculateLineEndpoint(dstPoint, direction, arrowLength, geometry);
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
