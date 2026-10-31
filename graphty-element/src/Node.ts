import {
    AbstractMesh,
    type BaseTexture,
    Camera,
    Color3,
    Color4,
    InstancedMesh,
    Mesh,
    MeshBuilder,
    type Scene,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";
import jmespath from "jmespath";
import cloneDeep from "lodash/cloneDeep.js";
import isEqual from "lodash/isEqual.js";

import type { ShaderUse } from "./catalog/shaders";
import type { Rgba } from "./catalog/types";
import { AdHocData, DEFAULT_SELECTION_STYLE, type GraphSelectionStyleConfig, NodeStyleConfig } from "./config";
import { drawnText } from "./config/RichTextStyle";
import { writableLane } from "./data/lane";
import type { ElementPositions } from "./data/positions";
import type { Graph } from "./Graph";
import { NGraphEngine } from "./layout/NGraphLayoutEngine";
import { GraphtyLogger } from "./logging/GraphtyLogger.js";
import type { GraphContext } from "./managers/GraphContext";
import { LabelDeclutter } from "./managers/LabelDeclutter";
import type { GroupBox } from "./managers/LayoutManager";
import { bootstrapNodePaint, type NodePaint } from "./managers/StylePainter";
import { oweLabelAnimations } from "./meshes/labelAnimationDebt";
import { unfreezeFor } from "./meshes/LabelBatch";
import { labelFitExtent } from "./meshes/labelFit";
import {
    createNodeDecorations,
    type NodeDecorationMetadata,
    type NodeDecorationPiece,
} from "./meshes/NodeDecorationMesh";
import { NodeEffects } from "./meshes/NodeEffects";
import { NodeMesh } from "./meshes/NodeMesh";
import {
    NodeShaderDrawing,
    type NodeShaderLook,
    type NodeShaderState,
    type SurfacePath,
} from "./meshes/NodeShaderDrawing";
import { readColor } from "./meshes/readColor";
import { type AttachPosition, RichTextLabel, type RichTextLabelOptions } from "./meshes/RichTextLabel";
import { pixelsPerUnit } from "./meshes/screenSize";
import { isFlatShape, shapeTexts } from "./meshes/shapeOutlines";
import { ModelCache, type ModelTemplate, type ModelUser } from "./models/ModelCache";
import { TextureCache } from "./models/TextureCache";
import { NodeBehavior, type NodeDragHandler } from "./NodeBehavior";
import { dispatcherOf } from "./session/GraphSession";
import { frozenRecord } from "./session/project/draft";
import { CHANNEL_DESCRIPTORS, drawnUses, toColorValue } from "./session/styles/channels";
import { transitionsOf } from "./transitions/LayoutTransitionRunner";

export type NodeIdType = string | number;

/**
 * How the renderer is drawing one node.
 *
 * This comes from the visibility mask the session holds and NEVER from a style layer. "context"
 * is what a hidden node becomes while `showContext` is on: its own mesh is not drawn, and a faint
 * point stands in its place so the reader can still see the shape of what they hid. A context
 * node is still hidden -- it is outside every run's default scope and absent from the visible id
 * set -- so nothing about this state changes what "visible" means.
 */
export type NodeRenderState = "visible" | "hidden" | "context";

const logger = GraphtyLogger.getLogger(["graphty", "node"]);

/**
 * The prefix of the cached source meshes selection halos are instances of. There is one source
 * per node mesh source -- the halo is the node's own geometry -- keyed by the node's cache key.
 */
export const SELECTION_HALO_MESH = "graphty-selection-halo";

/** The cached source mesh every context point is an instance of. */
const CONTEXT_POINT_MESH = "graphty-context-point";

/*
 * The halo's colour, size and opacity are NOT constants any more: they are
 * `graph.selection` in the element's configuration, set through
 * `element.selectionStyle` or `graph.setSelectionStyle()`. The gold, the 1.45 and the 0.4 that
 * used to live here are the schema's defaults, in `src/config/GraphStyle.ts`, so an element
 * nobody has configured still draws exactly what it always drew.
 */

/** The context point's colour: neutral, so it never reads as a category. */
const CONTEXT_POINT_COLOR = "#8A8A8A";

/** How much of the node's size a context point is drawn at. */
const CONTEXT_POINT_SCALE = 0.3;

/** How transparent a context point is. Faint by design -- it is background, not content. */
const CONTEXT_POINT_ALPHA = 0.18;

/** The smallest size an overlay is drawn at, so a zero-sized style still leaves something to see. */
const MIN_OVERLAY_SIZE = 0.2;

/** How deep a group following its members is drawn, as a fraction of its smaller side. */
const GROUP_DEPTH_RATIO = 0.02;

/**
 * How much a group's box may change size, as a fraction, before its border is rebuilt and its
 * label re-attached at the new size: a moving layout changes every box a little every frame.
 */
const GROUP_RESIZE_EPSILON = 0.01;

/** How opaque a group following its members is drawn when no layer styled it: a faint region. */
const GROUP_REGION_OPACITY = 0.25;

/** The flat shape a group following its members is drawn as when its style names a solid. */
const GROUP_REGION_SHAPE = "round-rectangle";

/**
 * What a group that follows its members is drawn as: a region behind them, never a solid round
 * them. A solid shape becomes a flat {@link GROUP_REGION_SHAPE} (a flat shape the file named is
 * kept), and a group no layer gave an opacity or a draw level -- one the file's styles did not
 * describe, since they give every group a level -- is drawn in its colour at
 * {@link GROUP_REGION_OPACITY}.
 * @param meshKey - The key the paint's style is drawn under.
 * @param style - The resolved style.
 * @returns The key and style to draw the group with.
 */
function groupRegionPaint(meshKey: string, style: NodeStyleConfig): { meshKey: string; style: NodeStyleConfig } {
    const type = style.shape?.type;
    const shape = { ...style.shape, type: type !== undefined && isFlatShape(type) ? type : GROUP_REGION_SHAPE };
    const painted = style.texture?.color;
    const styled = typeof painted === "object" || style.shape?.zIndex !== undefined;
    const texture = styled
        ? style.texture
        : { ...style.texture, color: { colorType: "solid" as const, value: painted, opacity: GROUP_REGION_OPACITY } };

    // The region is stretched over its members' box whatever its own size, so its border rings that box from
    // outside: a border position, which draws the fill in from the node's own size, has nothing to draw it in from.
    const border = style.border === undefined ? undefined : { ...style.border, position: undefined };

    return { meshKey: `${meshKey}|group`, style: { ...style, shape, texture, border } };
}

interface NodeOpts {
    pinOnDrag?: boolean;
}

/** Writes a node's row; see {@link placeNodeRow}. */
let writeNodeRow: (node: Node, row: number) => void;

/**
 * Move a node to a row of the current snapshot. Only the data manager calls it, as a node reaches
 * the builder, leaves it, or is renumbered by a freeze.
 * @param node - The node.
 * @param row - Its row, or INVALID_INDEX.
 */
export function placeNodeRow(node: Node, row: number): void {
    writeNodeRow(node, row);
}

/** Writes an node's record; see {@link adoptNodeRecord}. */
let writeRecord: (node: Node, record: AdHocData<string | number>) => void;

/**
 * Hand an node the record the graph now holds for it. Only the data manager calls it, from the
 * render half of the graph's derivation, when a command, an undo or a redo changed the record;
 * no entry point exports it, so `node.data` is always the graph's record.
 * @param node - The node.
 * @param record - The record.
 */
export function adoptNodeRecord(node: Node, record: AdHocData<string | number>): void {
    writeRecord(node, record);
}

/** Reads whether a paint rebuilds a node's mesh; see {@link nodeRebuildsFor}. */
let rebuildsFor: (node: Node, paint: NodePaint) => boolean;

/**
 * Whether {@link Node.applySessionPaint} with this paint would dispose the node's mesh and build
 * a new one, rather than only write to the mesh it has. A repaint of many nodes asks first, so it
 * can hand every mesh about to go to the bulk teardown before any of them is disposed (#2749).
 * @param node - The node.
 * @param paint - The paint it is about to be handed.
 * @returns Whether the mesh is rebuilt.
 */
export function nodeRebuildsFor(node: Node, paint: NodePaint): boolean {
    return rebuildsFor(node, paint);
}

/**
 * Dispose what a node's rebuild replaces -- its mesh and the label parented to it -- ahead of the
 * rebuild. The drag handler is kept: it lives as long as the node, reads `node.mesh` whenever it
 * acts, and holds the hover, which a dispose would end while the pointer is still on the node.
 * A repaint of many nodes disposes every one of them first, inside the bulk teardown, and only
 * then builds the new meshes: built in between, the new meshes would fill the scene lists the
 * teardown emptied, and each later dispose would search them (#2749).
 * The rebuild then finds the mesh disposed and builds a new one, as it does after a 2D/3D switch.
 * @param node - A node {@link nodeRebuildsFor} said is rebuilt.
 */
export function releaseNodeMesh(node: Node): void {
    node.label?.dispose();
    node.label = undefined;
    if (!node.mesh.isDisposed()) {
        node.mesh.dispose();
    }
}

/** Collects the nodes whose size or shape changed while {@link collectResizedNodes} runs. */
let resizedSink: Set<Node> | null = null;

/**
 * Run a repaint and collect the nodes whose size or shape it changed, instead of each of them
 * walking every edge in the graph to find its own. The caller then finds their edges in one walk
 * (#2749).
 * @param work - The repaint.
 * @returns The nodes whose geometry changed.
 */
export function collectResizedNodes(work: () => void): Set<Node> {
    const resized = new Set<Node>();
    resizedSink = resized;
    try {
        work();
    } finally {
        resizedSink = null;
    }

    return resized;
}

/**
 * Node shapes whose outline is a circle from every direction.
 *
 * Deliberately short. A cone, a box or a torus looks different from different sides, so there is
 * no single radius that describes where its surface is.
 */
const ROUND_SHAPES: ReadonlySet<string> = new Set(["sphere", "icosphere"]);

type LabelStyle = NonNullable<NodeStyleConfig["label"]>;

/**
 * A label's background color as the one string the label renderer takes: an advanced color style's solid value,
 * or a gradient's first color as a fallback.
 * @param color - The style's background color.
 * @returns The color, or undefined for none.
 */
function labelBackgroundColor(color: LabelStyle["backgroundColor"]): string | undefined {
    if (!color) {
        return undefined;
    }
    if (typeof color === "string") {
        return color;
    }
    if (color.colorType === "solid") {
        return color.value;
    }
    if (color.colorType === "gradient") {
        return color.colors[0];
    }
    return undefined;
}

/**
 * A label's borders with a color each, the only ones the label renderer can draw.
 * @param borders - The style's borders.
 * @returns The borders, or undefined when none has a color, so the renderer's default empty list is used.
 */
function labelBorders(borders: LabelStyle["borders"]): { width: number; color: string; spacing: number }[] | undefined {
    const valid = (borders ?? [])
        .filter((border): border is typeof border & { color: string } => border.color !== undefined)
        .map((border) => ({
            width: border.width,
            color: border.color,
            spacing: border.spacing,
        }));
    return valid.length > 0 ? valid : undefined;
}

/** The colour a node is drawn in when no layer a reader added colours it. */
const DEFAULT_NODE_COLOR = String(CHANNEL_DESCRIPTORS["node.color"].default ?? "").toLowerCase();

/** White: an untinted model instance keeps its own colours. */
const UNTINTED = new Color4(1, 1, 1, 1);

/**
 * Whether a shape block tints its model with the node's colour.
 * @param shape - The shape block.
 * @returns True for tint on or "replace".
 */
function modelTinted(shape: NodeStyleConfig["shape"]): boolean {
    const tint = shape?.modelTint as unknown;
    return tint === true || tint === "true" || tint === "replace";
}

/**
 * The shader uses resolved on a node: its style's `shaders`, which the painter writes from
 * `node.shaders`.
 * @param style - The resolved style.
 * @returns The uses, or undefined when no layer wrote any.
 */
function shaderUsesOf(style: NodeStyleConfig): readonly ShaderUse[] | undefined {
    return (style as NodeStyleConfig & { shaders?: readonly ShaderUse[] }).shaders;
}

/**
 * Whether a node's uses name anything it draws itself (every place but `group`).
 * @param uses - The uses.
 * @returns True when they do.
 */
function namesShader(uses: readonly ShaderUse[] | undefined): boolean {
    const { exclusive, stacked } = drawnUses(uses);
    return exclusive !== null || stacked.length > 0;
}

/**
 * The shader path part of a mesh key (`|shader:<path>:<id>`), or "" for a node drawn plainly.
 * @param meshKey - The key.
 * @returns The part.
 */
function shaderPartOf(meshKey: string): string {
    const at = meshKey.indexOf("|shader:");
    return at === -1 ? "" : meshKey.slice(at);
}

/**
 * A color for the shader batch, as `#rrggbb`, with its alpha apart.
 * @param value - The color as a style holds it.
 * @param fallback - The color when it does not read.
 * @returns The hex and the alpha.
 */
function hexOf(value: unknown, fallback: string): { hex: string; alpha: number } {
    const { rgb, alpha } = readColor(typeof value === "string" ? value : undefined, fallback);
    return { hex: rgb.toHexString(), alpha };
}

/**
 * Represents a node in the graph visualization with its mesh, label, and associated data.
 * Manages node rendering, styling, drag behavior, and interactions with the layout engine.
 */
export class Node implements ModelUser {
    parentGraph: Graph | GraphContext;
    opts: NodeOpts;
    readonly id: NodeIdType;

    private row: number = INVALID_INDEX;

    static {
        writeNodeRow = (node, row) => {
            node.index = row;
        };
        writeRecord = (node, record) => {
            node.#record = frozenRecord(record);
            node.shaderDrawing?.dataChanged(node);
        };
        rebuildsFor = (node, paint) => {
            if (node.disposed) {
                return false;
            }

            const shaded = node.shadedPaint(paint.meshKey, paint.style);
            return !node.keepsMeshFor(shaded.meshKey, shaded.style, paint.color);
        };
    }

    /**
     * This node's index in the element's current GraphSnapshot, assigned at add time as
     * `builder.addNode(id)` and walked through `report.nodeRemap` on a renumbering freeze
     * (graph-format design 14.4 rule 5). INVALID_INDEX until the node reaches the builder.
     * @returns The row.
     */
    get index(): number {
        return this.row;
    }

    private set index(row: number) {
        this.row = row;
    }

    /**
     * The record this node carries, as the graph holds it: deep-frozen, so a write to it throws. A
     * change goes through the graph (`updateNodes`, `session.data.updateNodes`, ...), which is what undo sees.
     * @returns The record.
     */
    get data(): AdHocData<string | number> {
        return this.#record;
    }

    /** The record, as the graph last handed it over. */
    #record: AdHocData<string | number>;
    mesh: AbstractMesh;
    label?: RichTextLabel;

    /** The further texts on screen (`shape.texts`), one label each. */
    shapeTextLabels: RichTextLabel[] = [];

    /** What the further texts on screen were drawn from, or undefined for none. See {@link syncShapeTexts}. */
    private drawnShapeTexts?: string;

    /**
     * The tooltip on screen, and undefined whenever the pointer is not over this node.
     *
     * A tooltip is HOVER-ONLY, which is the whole difference between it and a label: a label is
     * part of the picture and a tooltip is an answer to pointing at something. So it exists only
     * between {@link Node.showTooltip} and {@link Node.hideTooltip}, and a graph of fifty
     * thousand nodes with a tooltip on every one of them carries at most one label mesh for
     * them.
     */
    tooltip?: RichTextLabel;

    /**
     * The tooltip block the style stack resolved for this node, or undefined when it has none.
     *
     * Kept rather than looked up on hover, because the pointer arriving is not a moment at which
     * a style pass can be run. The whole block is held -- not only the words -- so that a
     * tooltip drawn while the pointer is already resting on the node can be rebuilt when a layer
     * changes what it should say.
     */
    private wantedTooltip?: NodeStyleConfig["tooltip"];

    /**
     * The words the label on screen is drawing, and undefined when this node draws no label.
     *
     * WHY THIS EXISTS, which is the defect it closes. A label, a tooltip and a label's
     * typography are `role: "content"` in `src/session/styles/intern.ts`: they deliberately key
     * no source mesh, because keying one on free text would mint one source mesh per node and
     * gain nothing. So a paint that changes only the words arrives carrying the SAME mesh key as
     * the paint before it, and the geometry comparison in `paintFrom` -- which is right about
     * geometry -- cannot see it. Until now the label was built only inside the geometry rebuild,
     * so `styles.add({ set: { "node.label": "..." } })` on a graph already on screen resolved
     * the text, reported it from `nodePaint(index)`, and drew nothing at all. Every consumer
     * switching labels on from a settings panel had it.
     *
     * Held beside {@link drawnLabelStyle} so that {@link syncLabel} can be run on every paint
     * and still cost nothing when the label has not moved.
     */
    private drawnLabelText?: string;

    /**
     * The label a node that grows to hold it (`shape.labelFit`) was last fitted to, and the width
     * and height that gave; null when the node is drawn at the size it states. A new label means a
     * new size, so `keepsMeshFor` rebuilds the mesh when the label changes under the same style.
     */
    private fittedFor: { text: string; label: NodeStyleConfig["label"] } | null = null;
    private fittedExtent: { width: number; height: number } | null = null;

    /** The style and the instance colour the current mesh was built from; see `paintFrom`. */
    private drawnStyle: NodeStyleConfig | null = null;
    /** The model template this node's mesh instances, or null when it draws a built-in shape. */
    private drawnModel: ModelTemplate | null = null;
    /** The `node.texture` picture the built-in shape's mesh was built with, or null. */
    private drawnImage: BaseTexture | null = null;
    private drawnColor: Rgba | null = null;

    /**
     * The resolved label block the label on screen was built from.
     *
     * Deep-compared rather than compared by reference: `StylePainter.nodePaint` builds a fresh
     * paint on every call, so two paints that say the same thing are never the same object. See
     * {@link drawnLabelText} for why the comparison is needed at all.
     */
    private drawnLabelStyle?: NodeStyleConfig["label"];

    dragHandler?: NodeDragHandler;
    dragging = false;
    pinOnDrag!: boolean;
    size!: number;

    /**
     * The shape type of the mesh currently on screen, cached beside {@link Node.size}.
     *
     * It exists ONLY so that the repaint can tell a geometry change from a colour change; see the
     * invalidation block in `paintFrom` for the defect it fixes. It is read from
     * `style.shape.type`, so it is `undefined` for a style that names no shape.
     */
    shapeType?: NonNullable<NodeStyleConfig["shape"]>["type"];

    /** The node's border, a child of its mesh, or null when its style draws none. */
    private border: AbstractMesh | null = null;

    /** The node's outer border (`outerBorder`), a child of its mesh like its border, or null when its style draws none. */
    private outerBorder: AbstractMesh | null = null;
    /** The filled shapes drawn beneath (`underlay`) and over (`overlay`) the node, children of its mesh, or null. */
    private underlay: AbstractMesh | null = null;
    private overlay: AbstractMesh | null = null;

    /** What is drawn over the node's face (`pie`, `stripes`, `image`), children of its mesh like its border. */
    private decorations: AbstractMesh[] = [];

    /** How far the border reaches past the outline, in the units positions are laid out in. */
    private borderWidth = 0;

    /**
     * What the border was last built from: the mesh key and style, and for a border in screen
     * pixels (`border.screenWidth`) the screen pixels one scene unit was drawn as then, rounded to
     * a step of 1/16 of a doubling, so a zoom that changes the border on screen rebuilds it and one
     * that does not leaves it alone. Null scale for a border in scene units.
     */
    private borderBuilt: { meshKey: string; style: NodeStyleConfig; scale: number | null } | null = null;

    /** The mesh {@link Node.roundRadius} was last measured from, so a reshape re-measures. */
    private roundRadiusMesh: AbstractMesh | null = null;

    /** The last measured radius, or null for a node that is not round. */
    private roundRadiusValue: number | null = null;

    /** The mesh scale {@link Node.roundRadius} was last measured at. */
    private roundRadiusScale = 1;
    /** What {@link Node.drawnRadius} last measured, and the mesh and scaling it measured. */
    private drawnRadiusMesh: AbstractMesh | null = null;
    private drawnRadiusScale = 0;
    private drawnRadiusValue = 0;

    /** What {@link Node.drawnHalfExtents} last measured, and the mesh and scaling it measured. */
    private halfExtentsMesh: AbstractMesh | null = null;
    private readonly halfExtentsScale = { x: 0, y: 0, z: 0 };
    private readonly halfExtentsValue = { x: 0, y: 0, z: 0 };

    /**
     * What the visibility mask says about this node, as the renderer is currently drawing it.
     *
     * Held here rather than derived on every frame because the renderer applies the mask as a
     * DELTA: a pass that changes nothing touches no mesh at all, and the comparison that makes
     * that possible needs the state the mesh is actually in.
     */
    private renderState: NodeRenderState = "visible";

    /** Whether the style stack hid this node (`node.visible` false), which only stops drawing it. */
    private styleHidden = false;

    /**
     * Whether this node is in the session's selection.
     *
     * The highlight this drives is drawn BY CONSTRUCTION -- a halo mesh the element owns -- and
     * not by a style layer. Selection used to be expressed by writing a flag onto this node's
     * result bag and letting a layer whose selector read that flag repaint it, which put the
     * element's own highlight into the reader's layer stack to fight for precedence with the
     * layers they had actually asked for.
     */
    private selected = false;

    /**
     * The source mesh this node is currently drawn from.
     *
     * A KEY, NOT A STYLE. It is the key the style interner minted -- built from the shape and the
     * size and deliberately NOT from the colour, because a colour is per-instance GPU state and
     * folding it in is what turns a continuous ramp into one source mesh per node.
     */
    private meshKey: string;

    /**
     * What the session's style stack resolved for this node, or null while no pass has resolved
     * one and the element's own defaults are what is drawn.
     *
     * Held rather than re-read because the renderer rebuilds a mesh at moments the style stack
     * knows nothing about -- a 2D/3D switch disposes every mesh -- and asking the stack again at
     * one of those moments costs a resolve for an answer that has not changed.
     */
    private sessionPaint: NodePaint | null = null;

    /** The halo instance drawn around this node while it is selected, or null when it is not. */
    private halo: AbstractMesh | null = null;

    /** Whether the mesh was built as a group following its members: see `groupRegionPaint`. */
    private drawnAsGroup = false;
    /**
     * How much the last {@link drawAsGroup} grew the group's face for the perspective it was drawn
     * under, and the camera height it was drawn for; see {@link groupDrawnForAnotherCamera}.
     */
    private groupFar = 1;
    private groupEye: number | undefined = undefined;
    /** The border built for this node drawn as a group at its box's size, while it is the border drawn. */
    private groupBorder: AbstractMesh | null = null;
    /**
     * The cached border instance a group's ring took the place of, kept hidden: while it lives, the
     * mesh cache keeps its source, and with it the material the ring is drawn with.
     */
    private groupBorderSource: AbstractMesh | null = null;
    /** The cache key of the halo's source mesh, so a node that changes shape rebuilds its halo. */
    private haloKey: string | null = null;

    /**
     * Which shader path draws this node's surface or sprite (design/rendering/shader-styles.md
     * section 5), or null while it is drawn plainly. Part of its source mesh's key: an impostor or
     * a sprite keeps its mesh only as an invisible pick proxy, and the mesh path's shader is a
     * plugin on the source's material.
     */
    private shaderPath: SurfacePath | null = null;

    /** The shader drawing of this node's scene, once this node has drawn a shader. */
    private shaderDrawing: NodeShaderDrawing | null = null;
    /** When a shader state changed while this node had no shader drawing, until its next paint. */
    private pendingShaderCause: number | undefined;

    /** The faint point drawn in this node's place while it is a context node, or null. */
    private contextPoint: AbstractMesh | null = null;

    /**
     * Set once {@link Node.dispose} has run. Guards every method that would otherwise rebuild
     * this node's mesh -- see the comment on `dispose` for why a disposed Node still receives
     * calls.
     */
    private disposed = false;

    /**
     * Helper to check if we're using GraphContext
     * @returns The GraphContext instance from the parent graph
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
     * Creates a new Node instance with mesh, label, and behaviors.
     *
     * THE PAINT IS HANDED IN RATHER THAN ASKED FOR, because at this moment there is nothing to
     * ask. The session's paint is addressed by the dense row index the store assigns AFTER the
     * node is constructed, so a node builds its first mesh from `bootstrapNodePaint()` and the
     * first style pass replaces it.
     * @param graph - The parent graph or graph context that owns this node
     * @param nodeId - Unique identifier for this node
     * @param paint - The source mesh, the style behind it and the per-instance colour to draw
     * @param data - Custom data associated with this node
     * @param opts - Optional configuration options for the node
     */
    constructor(
        graph: Graph | GraphContext,
        nodeId: NodeIdType,
        paint: NodePaint,
        data: AdHocData<string | number>,
        opts: NodeOpts = {},
    ) {
        this.parentGraph = graph;
        this.id = nodeId;
        this.opts = opts;
        this.#record = frozenRecord(data);

        this.meshKey = paint.meshKey;

        // The layout engine gets this node from DataManager, not from here.

        // create mesh
        const o = paint.style;
        this.drawnStyle = o;
        this.drawnColor = paint.color;
        this.size = o.shape?.size ?? 0;
        this.shapeType = o.shape?.type;

        const fit = this.fitToLabel(paint.meshKey, o);
        this.mesh = this.buildMesh(fit.meshKey, fit.style);

        // Parent to graph-root for XR gesture support
        // This allows gestures to transform the entire graph by manipulating the root
        const graphRoot = this.context.getScene().getTransformNodeByName("graph-root");
        if (graphRoot) {
            this.mesh.parent = graphRoot;
        }

        // Add metadata for XR controller raycasting
        // IMPORTANT: For InstancedMesh, we must set metadata on the INSTANCE, not spread from source
        this.mesh.metadata = {
            graphNode: this,
            styleId: paint.meshKey,
            nodeId: this.id,
        };

        this.syncBorder(fit.meshKey, fit.style);
        this.syncDecorations(fit.meshKey, fit.style);

        // create label
        this.syncLabel(o, true);
        this.syncTooltip(o);

        // Everything that lives on the instance rather than in its source: the colour, the
        // outline and the glow. See applyInstancePaint.
        this.applyInstancePaint(o, paint.color);

        NodeBehavior.addDefaultBehaviors(this, this.opts);

        // A node arriving in a graph already drawing shaders plays the entrances it starts with.
        NodeShaderDrawing.peek(this.context.getScene())?.arrived(this);
    }

    /**
     * How far this node's drawn surface is from its centre, when that distance is the same in
     * every direction -- and null when it is not, or cannot be trusted to be.
     *
     * WHAT IT IS FOR. An edge has to stop at the node's surface, and for a shape that is round
     * from every side that point is one radius along the line, which is arithmetic. For anything
     * else the only honest answer is to intersect the drawn geometry, which is what a null sends
     * the caller back to.
     *
     * COMPUTED ONCE PER MESH, because every edge on this node would otherwise ask the same
     * question every frame: at ten edges a node that is twenty bounding-box reads per node per
     * frame for an answer that changes only when the node is rebuilt. Measured on a live layout
     * of two thousand nodes, asking per edge cost 13 ms a frame against 4 ms for asking once.
     * @returns The radius in world units, or null when this node is not round.
     */
    get roundRadius(): number | null {
        // The scale too: `layoutBehavior.node.depthIndependentSize` rescales a node mesh as the
        // camera turns, and its edges must stop at the surface it is drawn with.
        if (this.roundRadiusMesh === this.mesh && this.roundRadiusScale === this.mesh.scaling.x) {
            return this.roundRadiusValue;
        }

        this.roundRadiusMesh = this.mesh;
        this.roundRadiusScale = this.mesh.scaling.x;
        this.roundRadiusValue = this.measureRoundRadius();

        return this.roundRadiusValue;
    }

    /**
     * How far this node's border reaches past its outline, in the units its position is laid out
     * in: zero for a node with no border. An edge stops this much further out than the node's
     * surface, so its line meets the border rather than running across it.
     * @returns The border's width.
     * @internal
     */
    get borderReach(): number {
        return this.border === null ? 0 : this.borderWidth;
    }

    /**
     * How far this node reaches along one axis, for framing the graph: its drawn half-extent and
     * its border, in the units of `node.size` (half the size for a node of one size, as before).
     *
     * ponytail: in node-size units rather than world units, so every graph without a border or a
     * width is framed exactly as it always was; framing by the true drawn extent would re-frame
     * every graph a little looser.
     * @param axis - The axis.
     * @returns The half-extent.
     * @internal
     */
    framingHalf(axis: "x" | "y" | "z"): number {
        if (this.mesh.isDisposed() || !NodeMesh.isFitted(this.drawnStyle?.shape)) {
            return this.size / 2;
        }

        // A group's face is grown for the camera it was drawn under (see `drawAsGroup`): counted
        // grown, the framing depended on where the camera stood before it, and the same file was
        // framed at two zooms (issue #4088). Its box is measured without that growth.
        const far = this.drawnAsGroup && axis !== "z" ? this.groupFar : 1;
        const extent =
            (this.mesh.getBoundingInfo().boundingBox.extendSize[axis] * Math.abs(this.mesh.scaling[axis])) / far;
        // A border in screen pixels (`border.screenWidth`) is not counted: its reach in the scene
        // depends on the zoom, so counting it made the box depend on the camera that frames it.
        // The first framing measured the ring built for the camera before it, the ring was then
        // rebuilt for the new zoom, and whether a second framing came along to measure that one
        // decided the zoom: the same file drew two pictures. The cameras' fit padding covers the
        // few pixels.
        return (extent + this.sceneBorderReach) / NodeMesh.extentPerSize(this.drawnStyle?.shape);
    }

    /**
     * {@link Node.borderReach} without a border drawn in screen pixels (`border.screenWidth`),
     * whose reach in the scene changes with every zoom: what framing and layout count.
     * @returns The reach.
     */
    private get sceneBorderReach(): number {
        return typeof this.borderBuilt?.scale === "number" ? 0 : this.borderReach;
    }

    /**
     * Build this node's border from its style, as a child of its mesh so it moves, hides and is
     * disposed with the node. Called after every new mesh: the old border went with the old mesh.
     * @param meshKey - The source mesh key the node is drawn under.
     * @param style - The resolved style.
     */
    private syncBorder(meshKey: string, style: NodeStyleConfig): void {
        this.groupBorderSource?.dispose();
        this.groupBorderSource = null;
        const scale = this.screenScale(style);
        const perSize = NodeMesh.extentPerSize(style.shape);
        let { border } = style;
        let key = meshKey;
        if (scale !== null && border?.screenWidth !== undefined) {
            // Never wider than the node, as vis-network caps it (NodeBase.initContextForDraw).
            const box = this.mesh.getBoundingInfo().boundingBox.extendSize;
            const across = 2 * Math.min(box.x * Math.abs(this.mesh.scaling.x), box.y * Math.abs(this.mesh.scaling.y));
            border = { ...border, width: Math.min(border.screenWidth / scale, across) / perSize };
            // ponytail: a ring per style and zoom step stays in the mesh cache until the scene
            // goes; a reader zooms over a few dozen steps, so it is a few dozen small rings.
            key = `${meshKey}|screen${String(scale)}`;
        }

        this.borderBuilt = { meshKey, style, scale };
        this.borderWidth =
            (border?.position ?? "outside") === "outside"
                ? (border?.width ?? 0) * perSize
                : // only an inside border is ever drawn narrower than its width, and only on a small node
                  NodeMesh.borderFit(
                      style.shape,
                      border,
                      NodeMesh.extentsOf(style.shape ?? {}, Math.max(style.shape?.size ?? this.size, 1e-3)),
                  ).ring;
        this.border = NodeMesh.createBorder(
            this.context.getMeshCache(),
            { styleId: key, is2D: this.context.is2D(), size: this.size },
            { shape: style.shape, border },
            this.mesh,
            this.context.getScene(),
        );

        if (this.border !== null) {
            this.border.parent = this.mesh;
            this.border.position.setAll(0);
        }

        if (this.outerBorder !== null && !this.outerBorder.isDisposed()) {
            this.outerBorder.dispose();
        }

        this.outerBorder = NodeMesh.createOuterBorder(
            this.context.getMeshCache(),
            { styleId: key, is2D: this.context.is2D(), size: this.size },
            { shape: style.shape, border, outerBorder: style.outerBorder },
            this.mesh,
            this.context.getScene(),
        );

        if (this.outerBorder !== null) {
            this.outerBorder.parent = this.mesh;
            this.outerBorder.position.setAll(0);
        }

        for (const kind of ["underlay", "overlay"] as const) {
            const old = this[kind];
            if (old !== null && !old.isDisposed()) {
                old.dispose();
            }

            const halo = NodeMesh.createHalo(
                this.context.getMeshCache(),
                { styleId: key, is2D: this.context.is2D(), size: this.size },
                style.shape,
                style[kind],
                kind,
                this.mesh,
                this.context.getScene(),
            );
            if (halo !== null) {
                halo.parent = this.mesh;
                halo.position.setAll(0);
            }

            this[kind] = halo;
        }
    }

    /**
     * Build what this node draws over its face (its pie, stripes and image) from its style, as
     * children of its mesh, so they move, hide and are disposed with the node. Called after every
     * new mesh: the old ones went with the old mesh.
     * @param meshKey - The source mesh key the node is drawn under.
     * @param style - The resolved style.
     */
    private syncDecorations(meshKey: string, style: NodeStyleConfig): void {
        for (const old of this.decorations) {
            if (!old.isDisposed()) {
                old.dispose();
            }
        }

        const { pieces, image, glyph } = createNodeDecorations(
            this.context.getMeshCache(),
            `${meshKey}-${this.context.is2D() ? "2d" : "3d"}`,
            style,
            this.size,
            this.mesh,
            this.context.getScene(),
        );
        this.decorations = [pieces, image, glyph].filter((m): m is InstancedMesh => m !== null);
        for (const mesh of this.decorations) {
            mesh.parent = this.mesh;
            mesh.position.setAll(0);
        }
    }

    /**
     * What this node draws over its face, for a reader of the drawing: each piece's kind and its
     * box in the node mesh's own plane.
     * @returns The pieces, the colored ones first.
     * @internal
     */
    get decorationPieces(): readonly NodeDecorationPiece[] {
        return this.decorations.flatMap((mesh) => {
            const source = "sourceMesh" in mesh ? (mesh as InstancedMesh).sourceMesh : mesh;
            return (source.metadata as Partial<NodeDecorationMetadata> | null)?.nodePieces ?? [];
        });
    }

    /**
     * The screen pixels one scene unit is drawn as where this node is, rounded to 1/16 of a
     * doubling, for a style whose border is in screen pixels; null for any other.
     * @param style - The style the border is built from.
     * @returns The rounded scale, or null.
     */
    private screenScale(style: NodeStyleConfig): number | null {
        if (style.border?.screenWidth === undefined) {
            return null;
        }

        const camera = this.context.getScene().activeCamera;
        // In CSS pixels, as a program drawing on a page counts them: a render pixel is a fraction
        // of one on a high-density screen.
        const ppu = camera
            ? pixelsPerUnit(camera, this.mesh.getAbsolutePosition()) * camera.getEngine().getHardwareScalingLevel()
            : 0;

        // ponytail: the scale of the scene's root (an XR gesture's) is not divided out; a border
        // drawn in a headset is as wide as the root's scale makes it.
        return ppu > 0 ? 2 ** (Math.round(Math.log2(ppu) * 16) / 16) : 1;
    }

    /**
     * Rebuild a border drawn in screen pixels when the camera now draws it at another width on
     * screen. Called by the update loop on a frame the camera moved; does nothing for a node
     * whose border is in scene units.
     *
     * The ring's reach is where this node's edges end, so the caller re-trims them when this
     * answers true (#3532). A layout is not woken: it spaces nodes by {@link Node.layoutRadius},
     * which leaves this border out.
     * @returns Whether the border's reach changed.
     * @internal
     */
    refreshScreenBorder(): boolean {
        const built = this.borderBuilt;
        if (typeof built?.scale !== "number" || this.mesh.isDisposed()) {
            return false;
        }

        if (this.screenScale(built.style) === built.scale) {
            return false;
        }

        const before = this.borderReach;
        this.border?.dispose();
        this.syncBorder(built.meshKey, built.style);
        return this.borderReach !== before;
    }

    /**
     * Work out whether this node is round, and how big, from the geometry rather than the name.
     *
     * THE NAME IS NOT THE GUARANTEE. Two things would make a shape called "sphere" the wrong
     * thing to trim an edge against, and neither changes its name: a node drawn under a scale
     * that is not the same in every direction is an ellipsoid, and the shape registry lets a
     * creator be replaced, so the name says what was asked for rather than what was built. The
     * centre matters too -- the arithmetic measures out from `mesh.position`, which is the middle
     * of the drawn shape only because Babylon builds both round shapes centred on their own
     * origin. All three are read in LOCAL space, which needs no up-to-date world matrix.
     * @returns The radius, or null.
     */
    private measureRoundRadius(): number | null {
        // A model's edges stop at its fitted bounding sphere (design section 3.8).
        if (this.drawnModel !== null) {
            const { scaling } = this.mesh;
            return this.drawnModel.radius * Math.max(Math.abs(scaling.x), Math.abs(scaling.y), Math.abs(scaling.z));
        }

        // An unnamed shape is not assumed to be anything. `NodeMesh.create` throws for a type it
        // does not know, so a node that is drawn always has one.
        if (this.shapeType === undefined || !ROUND_SHAPES.has(this.shapeType)) {
            return null;
        }

        // THE BOX'S HALF-WIDTH, NOT THE BOUNDING SPHERE'S RADIUS. Babylon fits its bounding
        // sphere around the bounding BOX, so for a node drawn at radius 0.75 it reads 1.299 --
        // the half-diagonal. Trimming a line there stops it well outside its node with a visible
        // gap, which is what the first version of this did.
        const box = this.mesh.getBoundingInfo().boundingBox;
        const { extendSize } = box;
        const radius = extendSize.x;

        if (radius <= 0) {
            return null;
        }

        const tolerance = radius * 0.01;

        if (Math.abs(extendSize.y - radius) > tolerance || Math.abs(extendSize.z - radius) > tolerance) {
            return null;
        }

        const { center } = box;

        if (Math.abs(center.x) > tolerance || Math.abs(center.y) > tolerance || Math.abs(center.z) > tolerance) {
            return null;
        }

        const { scaling } = this.mesh;

        if (Math.abs(scaling.x - scaling.y) > 1e-6 || Math.abs(scaling.x - scaling.z) > 1e-6) {
            return null;
        }

        return radius * Math.abs(scaling.x);
    }

    /**
     * Updates the node's mesh position and style based on layout engine and style changes.
     * Handles mesh recreation if disposed.
     */
    update(): void {
        // A DELIBERATELY disposed node must never be resurrected here. The recreate-on-disposed
        // branch below exists for the 2D/3D mode switch, which disposes meshes out from under
        // live nodes; it cannot tell that case apart from a node this graph has finished with.
        // SelectionManager.selectedNode keeps a hard reference to a Node after its dataset is
        // dropped, and the layout engine keeps them after DataManager.dispose() (clear() takes
        // them out of it, #121); both call update(), so without this guard a dropped node's mesh
        // would silently be rebuilt on the next frame or the next deselect.
        if (this.disposed) {
            return;
        }

        this.context.getStatsManager().startMeasurement("Node.update");

        // Check if mesh was disposed (e.g., from 2D/3D mode switch) and recreate it.
        if (this.mesh.isDisposed()) {
            this.updateStyle();
        }

        if (this.dragging) {
            this.syncOverlayPositions();
            this.context.getStatsManager().endMeasurement("Node.update");
            return;
        }

        const layoutManager = this.context.getLayoutManager();
        const { layoutEngine } = layoutManager;

        const pos = layoutEngine?.getNodePosition(this);
        const box = layoutManager.groupBox(this.id);
        // A node becomes, or stops being, a group following its members after it is painted (the
        // groups arrive with the file, the behaviour can turn them off): draw it again as one.
        if ((box !== undefined) !== this.drawnAsGroup) {
            this.updateStyle();
        }

        if (box !== undefined) {
            this.drawAsGroup(box);
        } else if (pos) {
            // A layout transition draws the node on its way to the layout's answer; with none,
            // the answer itself, in one frame.
            const at = transitionsOf(layoutManager)?.place(this, pos) ?? pos;
            this.setMeshPosition(at.x, at.y, at.z ?? 0);
        }

        this.syncOverlayPositions();

        this.context.getStatsManager().endMeasurement("Node.update");
    }

    /**
     * Draw a group that follows its members over their box, behind them: stretched across the
     * box's width and height, thin, and set at the box's far face (the camera looks along +z in
     * both views), so every member, edge and label is drawn in front of it. Its row keeps the
     * box's centre; only the drawing sits back.
     * @param box - The box, from `LayoutManager.groupBox`.
     */
    private drawAsGroup(box: GroupBox): void {
        const { extendSize } = this.mesh.getBoundingInfo().boundingBox;
        const { half, center } = box;
        const thin = GROUP_DEPTH_RATIO * Math.min(half.x, half.y);
        const back = center.z + half.z + thin;
        // Seen in perspective from in front, a face set back looks smaller: grown by the ratio of
        // the two distances, it covers the box its members make on screen. An orthographic view
        // (2D) has no perspective, so nothing is grown there: growing it by where that camera sits
        // drew the group larger before the view was framed than after (issue #3107).
        const camera = this.mesh.getScene().activeCamera;
        const eye = camera?.mode === Camera.ORTHOGRAPHIC_CAMERA ? undefined : camera?.position.z;
        const far = eye !== undefined && eye < center.z ? (back - eye) / (center.z - eye) : 1;
        // A round shape is grown to the ellipse through the box's corners, so a member in a
        // corner is still inside it -- unless the style sizes the group (a Cytoscape.js compound
        // parent), whose shape is drawn in its box, as Cytoscape.js draws it.
        const round = this.shapeType === "ellipse" && this.drawnStyle?.group === undefined;
        const grow = round ? far * Math.SQRT2 : far;
        this.groupFar = far;
        this.groupEye = eye;
        const scale = (want: number, local: number): number => (local > 0 ? want / local : 1);
        const stretch = this.mesh.scaling;
        const before = stretch.clone();
        stretch.set(scale(half.x * grow, extendSize.x), scale(half.y * grow, extendSize.y), scale(thin, extendSize.z));
        this.setMeshPosition(center.x, center.y, back);
        if (
            this.border !== this.groupBorder ||
            !stretch.equalsWithEpsilon(before, GROUP_RESIZE_EPSILON * stretch.length())
        ) {
            this.fitGroupChildren(2 * half.x * grow, 2 * half.y * grow, 2 * thin);
        }
    }

    /**
     * Whether this node is drawn as a group grown for a camera height other than the active
     * camera's: the camera moved (a zoom to fit, a reader's orbit) after the group was last drawn,
     * so its face no longer covers its members' box on screen until it is drawn again.
     * @returns True when it should be drawn again.
     * @internal
     */
    get groupDrawnForAnotherCamera(): boolean {
        if (!this.drawnAsGroup || this.mesh.isDisposed()) {
            return false;
        }

        const camera = this.mesh.getScene().activeCamera;
        const eye = camera?.mode === Camera.ORTHOGRAPHIC_CAMERA ? undefined : camera?.position.z;
        return eye !== this.groupEye;
    }

    /**
     * Keep a stretched group's border and label at the size its style gives, rather than stretched
     * with its box: the border is rebuilt at the box's size and the label re-attached, each under
     * the inverse of the box's stretch. Called only when the box's size changes.
     * @param width - The box's drawn width.
     * @param height - Its drawn height.
     * @param depth - Its drawn depth.
     */
    private fitGroupChildren(width: number, height: number, depth: number): void {
        const { scaling } = this.mesh;
        const inverse = new Vector3(1 / scaling.x, 1 / scaling.y, 1 / scaling.z);
        const old = this.border;
        const style = this.drawnStyle;
        const ring =
            old === null || style === null
                ? null
                : NodeMesh.createGroupBorder(
                      { shape: style.shape, border: style.border },
                      { x: width, y: height, z: depth },
                      this.context.is2D(),
                      this.context.getScene(),
                  );
        if (old !== null && ring !== null) {
            // The cached border's material, shared: the ring's own disposal never takes it. The
            // cached instance is hidden rather than disposed, because the cache disposes a source
            // with no instance left -- and its material with it -- on the next repaint's prune,
            // which drew every group whose ring was built before that prune with no outline at all
            // (issue #3478).
            ring.material = old.material;
            ring.parent = this.mesh;
            ring.scaling.copyFrom(inverse);
            if (old === this.groupBorder) {
                old.dispose(false, false);
            } else {
                old.setEnabled(false);
                this.groupBorderSource = old;
            }
            this.border = ring;
            this.groupBorder = ring;
        }

        // ponytail: a group's box is stretched over its members, so its outer border would be stretched with it; it
        // is left off a group until the ring is rebuilt at the box's size as the border is
        this.outerBorder?.dispose();
        this.outerBorder = null;
        this.underlay?.dispose();
        this.underlay = null;
        this.overlay?.dispose();
        this.overlay = null;

        this.label?.reattach();
    }

    /**
     * Put this node's mesh at a point. The ONLY place a node mesh's position is written: the
     * `local/node-position-funnel` lint rule reports any other, so the writers stay few and
     * visible. A 2D view needs every node on Z = 0, and each extra writer would be one more place
     * to re-apply that by hand.
     * @param x - scene-unit x
     * @param y - scene-unit y
     * @param z - scene-unit z
     * @internal
     */
    setMeshPosition(x: number, y: number, z: number): void {
        this.mesh.position.set(x, y, z);
        this.shaderDrawing?.moved(this, x, y, z);
        // The overlays follow here, not only in update(): over a settled layout the update loop
        // visits no node, so a dragged node's halo stayed where the drag began until the drop.
        this.syncOverlayPositions();
    }

    /**
     * Rebuild this node's mesh, its label and its effects from the paint it is currently drawn
     * from, preserving its position and reattaching its behaviours.
     *
     * A REBUILD REQUEST, NOT A STYLE CHANGE. The 2D/3D switch calls this for exactly one reason
     * -- every mesh has just been disposed -- and `update()` calls it when it finds a mesh that
     * has gone. What to draw is the style stack's answer; WHETHER to draw is the caller's.
     */
    updateStyle(): void {
        // See update(): a disposed node is still reachable from the layout engine and from
        // SelectionManager, and this method builds a mesh. Refuse rather than resurrect.
        if (this.disposed) {
            return;
        }

        const paint = this.currentPaint();

        this.sessionPaint = paint;
        this.paintFrom(paint.meshKey, paint.style, paint.color);
    }

    /**
     * Build this node's texts again when a font they draw in has just loaded (issue #3531): a
     * label measured and drawn while its web font was loading shows the fallback face, and a node
     * sized to its label (`shape.labelFit`) has the fallback's size.
     * @param families - The families that loaded, as `fontFamilies` gives them.
     * @returns True when anything was rebuilt.
     * @internal
     */
    refreshFonts(families: ReadonlySet<string>): boolean {
        const texts = [this.label, this.tooltip, ...this.shapeTextLabels];
        if (this.disposed || !texts.some((text) => text?.usesFont(families) === true)) {
            return false;
        }

        // Forget what they were drawn from, so the repaint builds them again and fits the node anew.
        this.drawnLabelStyle = undefined;
        this.drawnShapeTexts = undefined;
        this.fittedFor = null;
        const tooltipShown = this.tooltip !== undefined;
        this.updateStyle();
        if (tooltipShown) {
            this.hideTooltip();
            this.showTooltip();
        }

        return true;
    }

    /**
     * What this node looks like right now.
     *
     * The painter is asked rather than only the field read, because the two do not become true
     * at the same moment: a session's paint exists from the instant it is bound, and the field is
     * filled by the first frame that drains the dirty set. A rebuild in between -- a 2D/3D switch
     * immediately after a load -- would otherwise find nothing and draw nothing.
     * @returns The session's paint when one is bound, and the element's own defaults otherwise.
     */
    private currentPaint(): NodePaint {
        const painter = this.context.getStylePainter?.();
        const painted = painter?.owns === true ? (this.sessionPaint ?? painter.nodePaint(this.index)) : null;

        return painted ?? bootstrapNodePaint();
    }

    /**
     * Draw this node as the session's style stack resolved it.
     * @param paint - The source mesh, the style behind it and the per-instance colour.
     */
    applySessionPaint(paint: NodePaint): void {
        if (this.disposed) {
            return;
        }

        this.sessionPaint = paint;
        this.paintFrom(paint.meshKey, paint.style, paint.color);
    }

    /**
     * Write the colour the session resolved into this node's own instance.
     *
     * WHY THE COLOUR IS NOT IN THE MATERIAL. Every node drawn from one source mesh shares that
     * mesh's material, so a colour in the material is a colour in the mesh key -- and a key that
     * carries the colour mints one source mesh per distinct colour, which for a continuous ramp
     * is one per node. The instanced buffer is the per-instance state Babylon offers instead: one
     * buffer write against an instance that already exists.
     *
     * THE SOURCE MATERIAL IS UNFROZEN BEFORE THE BUFFER IS REGISTERED. Registering the buffer
     * adds a shader define, and a frozen material is a material that has stopped re-evaluating
     * its defines -- so registering behind a freeze compiles nothing and every instance draws in
     * the material's own colour, silently. Registration happens once per source mesh.
     * @param color - The colour, or null when no layer painted one.
     */
    private applyInstanceColor(color: Rgba | null): void {
        if (this.drawnModel !== null) {
            this.applyModelTint(this.drawnModel, color);
            return;
        }

        if (this.drawnImage !== null && !modelTinted(this.drawnStyle?.shape)) {
            // A picture replaces the shape's color; `node.modelTint` multiplies the node's color in.
            color = color === null ? null : { ...color, r: 255, g: 255, b: 255 };
        }

        if (color === null || !(this.mesh instanceof InstancedMesh)) {
            return;
        }

        const source = this.mesh.sourceMesh;

        if (source.instancedBuffers?.color === undefined) {
            // Only the source draws with its material (one per cache entry), so only its submeshes
            // are marked dirty, not every mesh in the scene (issue #2894).
            if (source.material) {
                unfreezeFor(source, source.material);
            }

            source.registerInstancedBuffer("color", 4);
            source.instancedBuffers.color = new Color4(1, 1, 1, 1);
        }

        // Alpha is pinned to 1: transparency is `mesh.visibility`, which Babylon keeps on the
        // SOURCE mesh, so it is part of the key rather than of this buffer. An alpha here would
        // be inert without a VERTEXALPHA define and would read as opacity that does nothing.
        this.mesh.instancedBuffers.color = new Color4(color.r / 255, color.g / 255, color.b / 255, 1);
    }

    /**
     * Write the tint of a drawn model into each of its instanced parts.
     *
     * A model keeps its own colours unless `node.modelTint` asks for the node's: every template
     * registers the colour buffer white, so this is one write per part.
     * @param model - The model this node draws.
     * @param color - The colour, or null when no layer painted one.
     */
    private applyModelTint(model: ModelTemplate, color: Rgba | null): void {
        const tint =
            color !== null && modelTinted(this.drawnStyle?.shape)
                ? new Color4(color.r / 255, color.g / 255, color.b / 255, 1)
                : UNTINTED;
        for (const part of [this.mesh, ...this.mesh.getChildMeshes(true)]) {
            if (part instanceof InstancedMesh && model.groups.includes(part.sourceMesh)) {
                part.instancedBuffers.color = tint;
            }
        }
    }

    /**
     * Apply everything about this node that lives on the drawn mesh rather than in its geometry.
     *
     * THE ROLE DECIDES THE BRANCH, AND IT USED NOT TO. `CHANNEL_ROLES` in
     * `src/session/styles/intern.ts` is the one statement of what a channel costs to change on an
     * element already on screen: a `mesh` channel is part of the source mesh's identity, and an
     * `instance` channel is a write against a mesh that already exists. `paintFrom` restated that
     * contract in its own words and got it wrong in one direction -- it applied the node's
     * EFFECTS only on the branch that rebuilds the mesh, so an `instance` channel's edit reached
     * the screen only if some unrelated `mesh` channel happened to change in the same repaint.
     * That is why a glow was drawn when its colour was in the stack before the first frame and
     * ignored when a layer added it afterwards. (`node.glowStrength` is a `mesh` channel for a
     * different reason: a glow's strength is set per SOURCE mesh, like its colour.)
     *
     * So this method is everything the `instance` role promises, and `paintFrom` calls it on BOTH
     * of its branches -- once when it has just rebuilt the mesh, because every one of these lives
     * ON an instance and the instance is new, and once when it has not, because that is the whole
     * of what the role means. `test/browser/channel-paints.test.ts` is the gate: it edits a live
     * session and requires the picture to move.
     * @param style - The resolved style the effects are read from.
     * @param color - The per-instance colour, or null when no layer painted one.
     */
    private applyInstancePaint(style: NodeStyleConfig, color: Rgba | null): void {
        this.applyInstanceColor(color);
        // A node drawn by the shader batch draws its outline ring and glow there, from its radius:
        // on its invisible pick proxy they would ring nothing.
        const effect = this.drawnByBatch() ? undefined : style.effect;
        NodeEffects.applyOutlineEffect(this.mesh, effect, this.context.getMeshCache());
        NodeEffects.applyGlowEffect(this.mesh, effect);
        const hidden = style.visible === false;
        if (hidden !== this.styleHidden) {
            this.styleHidden = hidden;
            this.applyRenderState();
        }

        this.syncShaders();
    }

    /**
     * Whether the shader batch draws this node in place of its mesh: an impostor or a sprite.
     * @returns True when it does.
     */
    private drawnByBatch(): boolean {
        return this.shaderPath === "impostor" || this.shaderPath === "replace";
    }

    /**
     * The mesh key and style a paint is drawn with once its shader is taken into account: the
     * shader path joins the key, and a sprite's proxy is a sphere, so it is picked by its radius.
     * @param meshKey - The paint's key.
     * @param style - The paint's style.
     * @returns The key and style to build the mesh from, and the path.
     */
    private shadedPaint(
        meshKey: string,
        style: NodeStyleConfig,
    ): { meshKey: string; style: NodeStyleConfig; path: SurfacePath | null } {
        const surface = drawnUses(shaderUsesOf(style)).exclusive;
        if (surface === null || this.drawnAsGroup) {
            return { meshKey, style, path: null };
        }

        const id = surface.use.shader;
        const drawing = NodeShaderDrawing.of(this.context.getScene(), this.context.getSession?.());
        const round = ROUND_SHAPES.has(style.shape?.type ?? "");
        const path = drawing?.surfacePath(this, id, surface.place, round) ?? null;
        if (path === null) {
            return { meshKey, style, path };
        }

        // In place of the node, its mesh is kept only as the pick proxy: a sphere of its radius.
        const shaped = path === "replace" ? { ...style, shape: { ...style.shape, type: "sphere" as const } } : style;
        return { meshKey: `${meshKey}|shader:${path}:${id}`, style: shaped, path };
    }

    /**
     * Hand the shader drawing what this node looks like now: its surface or sprite, its effects,
     * and the halo, ring and glow the batch draws for it.
     */
    private syncShaders(): void {
        const style = this.drawnStyle;
        if (style === null) {
            return;
        }

        // A state change before this node had a shader drawing is the cause of this paint, or of
        // none: it is handed on once, here, and never kept for a later paint.
        const cause = this.pendingShaderCause;
        this.pendingShaderCause = undefined;
        const uses = shaderUsesOf(style);
        const scene = this.context.getScene();
        const drawing = namesShader(uses)
            ? NodeShaderDrawing.of(scene, this.context.getSession?.())
            : (this.shaderDrawing ?? NodeShaderDrawing.peek(scene) ?? null);
        if (drawing === null) {
            return;
        }

        this.shaderDrawing = drawing;
        if (cause !== undefined) {
            drawing.noteCause(this, cause);
        }

        // States first: a state that brought this shader (a pin onto a pinned-state layer) is
        // then the cause the new slot's entrance plays for.
        this.syncShaderStates();
        drawing.paint(this, this.shaderLook(style, uses));
    }

    /**
     * The resolved color the node was last painted with (r, g and b 0..255, a 0..1), or null
     * before its first paint. What a group outline averages over its members.
     * @returns The color.
     * @internal
     */
    get paintedColor(): Rgba | null {
        return this.drawnColor;
    }

    /**
     * What the shader drawing draws this node with.
     * @param style - The resolved style.
     * @param uses - Its resolved shader uses.
     * @returns The look.
     */
    private shaderLook(style: NodeStyleConfig, uses: readonly ShaderUse[] | undefined): NodeShaderLook {
        const painted = style.texture?.color;
        const opacity = typeof painted === "object" ? (painted.opacity ?? 1) : 1;
        const color = this.drawnColor ?? { r: 255, g: 255, b: 255, a: 1 };
        const batch = this.drawnByBatch();
        const halo = batch && this.renderState === "visible" ? this.haloLook() : null;
        const haloColor = halo === null ? null : hexOf(halo.color, DEFAULT_SELECTION_STYLE.color);
        const outline = style.effect?.outline;
        const glow = style.effect?.glow;
        const glowColor = glow?.color;
        return {
            mesh: this.mesh,
            uses,
            path: this.shaderPath,
            color,
            opacity,
            radius: this.roundRadius ?? this.size / 2,
            drawn: this.getRenderState() === "visible",
            halo:
                halo === null || haloColor === null || halo.opacity === 0
                    ? null
                    : { color: haloColor.hex, scale: halo.scale, opacity: halo.opacity * haloColor.alpha },
            ring: batch && outline ? hexOf(NodeEffects.extractColorValue(outline.color), "#000000").hex : null,
            glow:
                batch && glow && glowColor !== undefined && (glow.strength ?? 1) > 0
                    ? {
                          color: hexOf(NodeEffects.extractColorValue(glowColor), "#FFFFFF").hex,
                          strength: glow.strength ?? 1,
                      }
                    : null,
        };
    }

    /** The states the shader drawing has stamped, brought up to date: selected, hovered, pinned. */
    private readonly shaderStates = { selected: false, hovered: false, pinned: false };

    /**
     * The selected, hovered and pinned states the shader drawing has heard, as its state bits.
     * @returns 1 selected, 2 hovered, 4 pinned, summed.
     * @internal
     */
    shaderStateBits(): number {
        const { selected, hovered, pinned } = this.shaderStates;
        return (selected ? 1 : 0) + (hovered ? 2 : 0) + (pinned ? 4 : 0);
    }

    /** Tell the shader drawing which states changed since it last heard. */
    private syncShaderStates(): void {
        const now: Record<NodeShaderState, boolean> = {
            selected: this.selected,
            hovered: this.context.getSelectionManager?.()?.isHovered(this.id) ?? false,
            pinned: this.isPinned(),
        };
        for (const state of ["selected", "hovered", "pinned"] as const) {
            if (now[state] !== this.shaderStates[state]) {
                this.shaderStateChanged(state, now[state]);
            }
        }
    }

    /**
     * Whether an enabled node layer of the session names node shaders.
     * @returns True when one does.
     */
    private layersNameANodeShader(): boolean {
        const layers = this.context.getSession?.()?.styles.list() ?? [];
        return layers.some(
            (layer) => layer.enabled && layer.target === "node" && layer.set?.["node.shaders"] !== undefined,
        );
    }

    /**
     * A state the shaders read changed: stamp it.
     * @param state - The state.
     * @param on - Its value now.
     * @internal
     */
    shaderStateChanged(state: NodeShaderState, on: boolean): void {
        if (this.shaderStates[state] === on) {
            return;
        }

        this.shaderStates[state] = on;
        if (this.shaderDrawing === null && this.layersNameANodeShader()) {
            // No shader drawing yet, but a layer names a node shader: the repaint this change
            // starts may be what brings it (the first click on a Selected layer naming an
            // effect), and its entrance plays for it. A layer added later, over a node already
            // selected, finds no cause and shows its effect at rest.
            this.pendingShaderCause = performance.now();
        }

        this.shaderDrawing?.stateChanged(this, state, on);
    }

    /**
     * Draw this node again from the paint it holds: a shader it names became drawable.
     * @internal
     */
    refreshShaderPaint(): void {
        const paint = this.sessionPaint;
        if (this.disposed || paint === null) {
            return;
        }

        this.paintFrom(paint.meshKey, paint.style, paint.color);
    }

    /**
     * Whether a paint keeps the mesh this node has: the same source mesh, or a style deep-equal to
     * the one the mesh was built from, and a mesh that is still alive. See `paintFrom`.
     * @param meshKey - Which source mesh the paint draws from.
     * @param o - The resolved style.
     * @param color - The per-instance colour.
     * @returns Whether the mesh stays.
     */
    private keepsMeshFor(meshKey: string, o: NodeStyleConfig, color: Rgba | null): boolean {
        // An equal style on another shader path is another source mesh: a plain node and an
        // impostor's pick proxy must never share one, since the proxy's source is not drawn.
        const samePath = shaderPartOf(meshKey) === shaderPartOf(this.meshKey);
        const sameGeometry =
            meshKey === this.meshKey || (samePath && isEqual(o, this.drawnStyle) && isEqual(color, this.drawnColor));
        const model = this.modelFor(o);
        return (
            sameGeometry &&
            !this.mesh.isDisposed() &&
            !this.fitIsStale(o) &&
            model === this.drawnModel &&
            (model !== null || this.imageFor(o) === this.drawnImage)
        );
    }

    /**
     * The words a node's label shows, and the label block that draws them, when it has one on.
     * @param o - The resolved style.
     * @returns The text ("" with no label) and the block.
     */
    private labelOf(o: NodeStyleConfig): { text: string; label: NodeStyleConfig["label"] } {
        const label = drawnText(o.label);
        return { text: label === undefined ? "" : this.extractLabelText(label), label };
    }

    /**
     * Whether a node that grows to hold its label was fitted to another label than the style's.
     * @param o - The resolved style.
     * @returns True when the mesh has to be fitted again.
     */
    private fitIsStale(o: NodeStyleConfig): boolean {
        if (o.shape?.labelFit === undefined || this.drawnAsGroup) {
            return false;
        }

        const { text, label } = this.labelOf(o);
        return text !== this.fittedFor?.text || !isEqual(label, this.fittedFor.label);
    }

    /**
     * The mesh key and style a node is built from: as painted, or for a node that grows to hold
     * its label (`shape.labelFit`), with the width and height its measured label asks for
     * (`labelFitExtent`) and a key naming them, since nodes of one style differ by their label.
     * A group drawn over its members is sized by them instead.
     * @param meshKey - The paint's mesh key.
     * @param o - The resolved style.
     * @returns The key and style to build the mesh and its border from.
     */
    private fitToLabel(meshKey: string, o: NodeStyleConfig): { meshKey: string; style: NodeStyleConfig } {
        const { shape } = o;
        if (shape?.labelFit === undefined || this.drawnAsGroup) {
            this.fittedFor = null;
            this.fittedExtent = null;
            return { meshKey, style: o };
        }

        const { text, label } = this.labelOf(o);
        const words =
            text === ""
                ? { width: 0, height: 0 }
                : RichTextLabel.measureWords(this.context.getScene(), this.createLabelOptions(text, label));
        const perSize = NodeMesh.extentPerSize(shape);
        const extent = labelFitExtent(shape, { width: words.width / perSize, height: words.height / perSize });
        const width = Number((extent?.width ?? 0).toPrecision(6));
        const height = Number((extent?.height ?? 0).toPrecision(6));
        this.fittedFor = { text, label: cloneDeep(label) };
        this.fittedExtent = { width, height };
        return { meshKey: `${meshKey}|fit:${width}x${height}`, style: { ...o, shape: { ...shape, width, height } } };
    }

    /**
     * The model template a style asks for, once it is drawable; asking starts its load, and this
     * node is repainted when it is ready. Null for a built-in shape, while a model loads, and
     * when it failed: the node then draws `node.shape`.
     * @param o - The resolved style.
     * @returns The template, or null.
     */
    private modelFor(o: NodeStyleConfig): ModelTemplate | null {
        if (o.shape?.model === undefined) {
            return null;
        }

        return ModelCache.of(this.context)?.templateFor(this, o.shape, o.texture?.image) ?? null;
    }

    /**
     * The `node.texture` picture a style asks for, once it is drawable; asking starts its load, and
     * this node is repainted when it is ready. Null when none is named, while it loads, and when it
     * failed.
     * @param o - The resolved style.
     * @returns The texture, or null.
     */
    private imageFor(o: NodeStyleConfig): BaseTexture | null {
        const ref = o.texture?.image;
        if (ref === undefined || ref === "") {
            return null;
        }

        return (
            TextureCache.forScene(this.context.getScene(), this.context.getSession?.())?.textureFor(this, ref) ?? null
        );
    }

    /**
     * Build this node's mesh: an instance of its model when one is drawable, else its shape.
     * @param meshKey - The source mesh key.
     * @param o - The resolved style.
     * @returns The mesh.
     */
    private buildMesh(meshKey: string, o: NodeStyleConfig): AbstractMesh {
        const model = this.modelFor(o);
        this.drawnModel = model;
        if (model !== null) {
            this.drawnImage = null;
            return NodeMesh.createModelInstance(model, o.shape, `node-model-${String(this.id)}`);
        }

        const image = this.imageFor(o);
        this.drawnImage = image;
        return NodeMesh.create(
            this.context.getMeshCache(),
            // A source mesh with its picture is another source mesh than the one drawn while it loads.
            { styleId: image === null ? meshKey : `${meshKey}|image`, is2D: this.context.is2D(), size: this.size },
            { shape: o.shape, texture: o.texture, effect: o.effect, border: o.border, picture: image },
            this.context.getScene(),
        );
    }

    /**
     * What this node draws as a model, for the model cache's warnings.
     * @returns Its template, whether it is tinted and whether a reader's layer coloured it.
     * @internal
     */
    modelDrawn(): { readonly template: ModelTemplate | null; readonly tinted: boolean; readonly colored: boolean } {
        const color = this.drawnColor;
        const hex =
            color === null
                ? DEFAULT_NODE_COLOR
                : `#${[color.r, color.g, color.b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
        return {
            template: this.drawnModel,
            tinted: modelTinted(this.drawnStyle?.shape),
            colored: hex !== DEFAULT_NODE_COLOR,
        };
    }

    /**
     * Tell the layout and this node's edges that its size or shape changed. See `paintFrom`.
     */
    private geometryChanged(): void {
        // A layout that keeps nodes apart by their drawn size (`nodeGap`) has to look again;
        // the frame loop steps it while it is not settled.
        const engine = this.context.getLayoutManager().layoutEngine;
        if (engine instanceof NGraphEngine) {
            engine.wakeForResize();
        }

        if (resizedSink) {
            // A repaint of many nodes finds all their edges in one walk afterwards.
            resizedSink.add(this);
            return;
        }

        for (const edge of this.context.getDataManager().edges.values()) {
            if (edge.srcNode === this || edge.dstNode === this) {
                edge.invalidatePositionCache();
            }
        }

        // Outside a style pass (a model or picture landing on a frame of its own) nothing else
        // makes the frame loop visit the edges: it walks them only when a node moved, and this
        // node did not. Without it the edges kept the ends measured against the placeholder shape
        // whenever the model landed after the last walk, so one story drew two pictures (#4392).
        this.context.getUpdateManager?.().forceEdgeWalk();
    }

    /**
     * Build the mesh, the label and the effects one resolved style asks for.
     *
     * The one place a node's appearance is applied, whichever stack resolved it. It is keyed on
     * the SOURCE MESH rather than on a style, because that is what decides whether anything has
     * to be rebuilt: two nodes of one shape and size differing only in colour share a mesh, and
     * the colour is one buffer write on an instance that is already correct. A group following
     * its members is drawn as a region behind them (`groupRegionPaint`).
     * @param meshKey - Which source mesh this node is drawn from.
     * @param style - The resolved style the mesh, the label and the effects are built from.
     * @param color - The per-instance colour, or null when the style carries it itself.
     */
    private paintFrom(meshKey: string, style: NodeStyleConfig, color: Rgba | null): void {
        this.drawnAsGroup = this.context.getLayoutManager().groupBox(this.id) !== undefined;
        if (this.drawnAsGroup) {
            const region = groupRegionPaint(meshKey, style);
            this.drawPaint(region.meshKey, region.style, color);
        } else {
            this.drawPaint(meshKey, style, color);
        }
    }

    /**
     * Draw a paint as it is, with its shader path taken into account: see `paintFrom` and
     * `shadedPaint`.
     * @param paintKey - Which source mesh the paint draws from.
     * @param paintStyle - The resolved style.
     * @param color - The per-instance colour.
     */
    private drawPaint(paintKey: string, paintStyle: NodeStyleConfig, color: Rgba | null): void {
        this.context.getStatsManager().startMeasurement("Node.updateMesh");
        const shaded = this.shadedPaint(paintKey, paintStyle);
        const { meshKey, style: o } = shaded;
        this.shaderPath = shaded.path;

        // Only skip update if the source mesh is the same AND mesh is not disposed
        // (mesh can be disposed when switching 2D/3D modes via meshCache.clear())
        //
        // WHAT THIS RETURN MAY AND MAY NOT SKIP. The mesh key is minted from the channels whose
        // role is `mesh` alone, so an unchanged key means the GEOMETRY is unchanged and nothing
        // more. The two `instance` channels are compensated for by `StylePainter.nodePaintOf`,
        // which folds opacity into the key string, and by the colour write below. The `content`
        // channels -- the label and its typography -- are compensated for by nothing at all, so
        // they are applied here. See `drawnLabelText` for the defect that reached a consumer.
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
        if (this.keepsMeshFor(meshKey, o, color)) {
            this.meshKey = meshKey;
            this.drawnStyle = o;
            this.drawnColor = color;
            // The mesh keeps its geometry and takes the key it is now drawn under: what a reader of
            // the scene (test/browser/every-element-leaves-the-bootstrap-paint.test.ts) uses to
            // tell an element the hand-over reached from one it did not.
            const metadata = this.mesh.metadata as { styleId?: string } | undefined;

            if (metadata !== undefined) {
                metadata.styleId = meshKey;
            }
            this.applyInstancePaint(o, color);
            this.syncLabel(o, false);
            this.syncTooltip(o);
            this.syncHalo();
            this.context.getStatsManager().endMeasurement("Node.updateMesh");
            return;
        }

        // Width, height, depth, flatness and a border move a node's surface as surely as its size
        // and shape do, so any of them sends the edges back to find it.
        const fittedBefore = this.fittedExtent;
        const fit = this.fitToLabel(meshKey, o);
        const geometryChanged =
            !isEqual(this.drawnStyle?.shape, o.shape) ||
            !isEqual(this.drawnStyle?.border, o.border) ||
            !isEqual(fittedBefore, this.fittedExtent) ||
            this.modelFor(o) !== this.drawnModel;

        this.meshKey = meshKey;
        this.drawnStyle = o;
        this.drawnColor = color;

        // Save the current position before disposing the mesh
        // This is critical for style changes when layout is settled,
        // because updateNodes() won't be called to restore positions
        const savedPosition = {
            x: this.mesh.position.x,
            y: this.mesh.position.y,
            z: this.mesh.position.z,
        };

        // Only dispose if not already disposed
        if (!this.mesh.isDisposed()) {
            this.mesh.dispose();
        }

        this.size = o.shape?.size ?? 0;
        this.shapeType = o.shape?.type;

        // If the GEOMETRY changed -- size or shape -- invalidate connected edges so they
        // recalculate their endpoints against the new surface.
        //
        // THE DEFECT THIS FIXES, which is the product owner's report "when I change shapes the
        // edges are no longer touching the surface of the node": until now this test read
        // `this.size !== oldSize` alone. A shape change at constant size left `size` equal, so
        // nothing was invalidated; `Edge.update` then hit its dirty check (Edge.ts: "if
        // (!srcMoved && !dstMoved) return") and returned BEFORE `transformArrowCap()` could
        // re-shoot the ray at the new mesh, so the edge kept the endpoints it had computed
        // against the PREVIOUS geometry. Icosphere and box at the same declared size have
        // bounding radii of 0.75 and 0.866, so the gap is immediately visible.
        //
        // TO ANSWER THE QUESTION AS ASKED -- "I think that used to work in the old shell, did you
        // create a different code path that doesn't do that?": it DID used to work, and no, the
        // shell did not create a code path that skips this. The regression is entirely inside
        // graphty-element, and git dates it exactly:
        //
        //   973f1d96, 2025-11-11, "edge performance enhancements" -- introduced `_lastSrcPos` /
        //   `_lastDstPos` and the early return in `Edge.update`. BEFORE that commit `update()`
        //   called `transformArrowCap()` unconditionally on every frame, so an edge re-shot its
        //   ray at the node meshes continuously and a shape change reattached within one frame,
        //   for free. The dirty check bought back that per-frame ray cast and, with it, silently
        //   made every non-positional geometry change invisible to the edges.
        //
        //   a2cb98c5, 2026-01-04, "improved layer and selection management" -- added the
        //   invalidation block below, guarded on `this.size !== oldSize`, written for SELECTION
        //   (which grows a node). It restored the behaviour for size only. Shape was never
        //   covered, which is why the regression survived it.
        //
        // Every route into a repaint -- a style pass draining its dirty set, a 2D/3D switch, a
        // selection growing a node -- converges on this same method and this same guard, so no
        // route bypasses a recalculation another route performs. The old shell saw it work
        // because it predates 973f1d96, not because it called anything different.
        //
        // THIS STAYS A CONDITION, never an unconditional invalidation: the loop is O(E) per node
        // because a Node holds no incident-edge index, and a colour-only repaint reaches this
        // line too, so invalidating unconditionally would make a full repaint O(N*E). The cost
        // is unchanged for the size case and newly reachable for the shape case; if a repaint
        // that changes every node's shape ever hitches, the answer is a per-node edge index, not
        // removing the guard.
        if (geometryChanged) {
            this.geometryChanged();
        }

        this.mesh = this.buildMesh(fit.meshKey, fit.style);

        // Restore the saved position to the new mesh
        this.setMeshPosition(savedPosition.x, savedPosition.y, savedPosition.z);
        this.syncBorder(fit.meshKey, fit.style);
        this.syncDecorations(fit.meshKey, fit.style);

        // Parent to graph-root for XR gesture support
        const graphRoot = this.context.getScene().getTransformNodeByName("graph-root");
        if (graphRoot) {
            this.mesh.parent = graphRoot;
        }

        // Add metadata for XR controller raycasting
        // IMPORTANT: For InstancedMesh, we must set metadata on the INSTANCE, not spread from source
        this.mesh.metadata = {
            graphNode: this,
            styleId: meshKey,
            nodeId: this.id,
        };

        // Restore position from layout engine after mesh recreation
        // This ensures the mesh doesn't reset to (0, 0, 0) when style changes
        const layoutManager = this.context.getLayoutManager();
        const pos = layoutManager.layoutEngine?.getNodePosition(this);
        if (pos) {
            const at = transitionsOf(layoutManager)?.place(this, pos) ?? pos;
            this.setMeshPosition(at.x, at.y, at.z ?? 0);
        }

        // recreate label if needed
        //
        // UNCONDITIONALLY, which is what the `true` says. A label's plane is PARENTED to the
        // node's mesh (`RichTextLabel._attachToTarget`), and Babylon disposes a mesh's children
        // with it -- so the label that was on screen a moment ago went with the mesh disposed
        // above, whatever the new style says about it.
        this.syncLabel(o, true);
        // A tooltip's plane is parented to the mesh too, so one on screen went with the mesh
        // disposed above: put it back on the new one. Pointing at a node often restyles it (a
        // hover layer), so without this the tooltip vanished the moment it was drawn.
        const tooltipShown = this.tooltip !== undefined;
        this.hideTooltip();
        this.syncTooltip(o);
        if (tooltipShown) {
            this.showTooltip();
        }

        // The new mesh is made pickable and clickable; the drag handler carries over (see
        // NodeBehavior.addDefaultBehaviors).
        NodeBehavior.addDefaultBehaviors(this, this.opts);

        // The mesh above is a NEW instance, so everything that lives ON an instance rather than
        // in its source has to be said again: what the masks said about this node, and everything
        // the `instance` role covers. Otherwise a restyle silently un-hides a filtered node,
        // drops its halo, and repaints it in its source mesh's own colour.
        this.applyRenderState();
        this.applyInstancePaint(o, color);

        this.context.getStatsManager().endMeasurement("Node.updateMesh");
    }

    /**
     * Tears down every Babylon resource this node owns.
     *
     * THE DEFECT THIS CLOSES: no Node.dispose existed at all. `DataManager.clear()` emptied its
     * maps and called `meshCache.clear()`, which disposes the cached SOURCE meshes -- and Babylon
     * disposes a source's instances with it, which is the only reason node spheres vanished on a
     * dataset clear. Everything a node creates OUTSIDE the cache survived: its label
     * (RichTextLabel builds its own plane and dynamic texture) and its drag handler's observers.
     * See Edge.dispose for the visible half of the same bug, the arrowheads.
     *
     * ORDER MATTERS. The label and drag handler go first, which hold their own meshes and scene
     * observers; then the mesh itself last, so nothing is asked about a mesh that is already gone.
     * The outline ring is a child of the mesh and goes with it.
     *
     * THE GLOW IS DELIBERATELY NOT REMOVED HERE. Membership of the glow layer is keyed by the
     * SHARED source mesh that MeshCache hands out instances of -- one source per style id -- so
     * calling `NodeEffects.applyGlowEffect(mesh, undefined)` from here would darken every OTHER
     * node that still uses this style. The source is owned by the cache, so it is freed when the
     * cache is cleared.
     *
     * A DISPOSED NODE STILL RECEIVES CALLS, which is why the private `disposed` flag exists rather than
     * this method simply freeing things. `DataManager.dispose()` does not take nodes out of the
     * layout engine (`clear()` does, #121), so `UpdateManager` can keep iterating the engine's
     * node and edge lists; and `SelectionManager.selectedNode` holds a Node across a dataset
     * boundary and calls `updateStyle` + `update` on it when the selection is finally cleared.
     * Both paths would have hit `update()`'s recreate-if-disposed branch and rebuilt the mesh of a
     * node nobody owns. Calling this twice is safe.
     */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        if (this.dragHandler) {
            this.dragHandler.dispose();
            this.dragHandler = undefined;
        }

        if (this.label) {
            this.label.dispose();
            this.label = undefined;
        }

        for (const label of this.shapeTextLabels) {
            label.dispose();
        }
        this.shapeTextLabels = [];
        this.drawnShapeTexts = undefined;

        // A tooltip outlives no node: its plane is not parented to the node's mesh, so nothing
        // else would take it down and a hovered node that is then removed would leave its words
        // floating over the graph.
        this.hideTooltip();
        this.wantedTooltip = undefined;

        // Cleared with it, so the cache never says a label is drawn that is not.
        this.drawnLabelText = undefined;
        this.drawnLabelStyle = undefined;

        if (this.halo) {
            if (!this.halo.isDisposed()) {
                this.halo.dispose();
            }

            this.halo = null;
        }

        if (this.contextPoint) {
            if (!this.contextPoint.isDisposed()) {
                this.contextPoint.dispose();
            }

            this.contextPoint = null;
        }

        this.shaderDrawing?.forget(this);
        this.shaderDrawing = null;

        if (!this.mesh.isDisposed()) {
            this.mesh.dispose();
        }
    }

    /**
     * Reports whether {@link Node.dispose} has run on this node.
     *
     * Note this is about the NODE, not about `node.mesh.isDisposed()`: a live node's mesh is
     * disposed and rebuilt on every style change and on a 2D/3D switch, so the mesh's own flag
     * says nothing about whether the node is still part of the graph.
     * @returns True once this node has been disposed
     */
    isDisposed(): boolean {
        return this.disposed;
    }

    /**
     * How the renderer is currently drawing this node.
     * @returns The render state.
     */
    getRenderState(): NodeRenderState {
        // A node a style hides is drawn as a filtered-out one would be, minus the context point:
        // it is still in the graph, so it is no one's context.
        return this.styleHidden && this.renderState === "visible" ? "hidden" : this.renderState;
    }

    /**
     * Say how the renderer should draw this node.
     *
     * HIDING IS NOT DELETION. The node keeps its row in the store, its dense index, its position,
     * its results and its place in the layout engine; only the meshes stop being drawn. Showing it
     * again re-enables the meshes it already has, so nothing is rebuilt and no layout runs.
     * @param state - What the visibility mask says about this node.
     * @returns True when this changed the state, which is what lets the renderer apply a mask as a
     *     delta and touch nothing that did not move.
     */
    setRenderState(state: NodeRenderState): boolean {
        if (this.renderState === state) {
            return false;
        }

        this.renderState = state;
        this.applyRenderState();

        return true;
    }

    /**
     * Whether this node is in the session's selection.
     * @returns True when it is selected.
     */
    isSelected(): boolean {
        return this.selected;
    }

    /**
     * Say whether this node is selected.
     * @param selected - What the selection mask says about this node.
     * @returns True when this changed the state.
     */
    setSelected(selected: boolean): boolean {
        if (this.selected === selected) {
            return false;
        }

        this.selected = selected;
        this.applyRenderState();
        this.shaderStateChanged("selected", selected);

        return true;
    }

    /**
     * Put the meshes into the state the two masks describe.
     *
     * Every operation here is O(1) per node and touches no style, no material and no layer: a
     * node is drawn or it is not, and the two overlays are instances of ONE shared source mesh
     * each, so the halo and the context point cost no material of their own however many nodes
     * carry one.
     */
    private applyRenderState(): void {
        if (this.disposed) {
            return;
        }

        const state = this.getRenderState();
        const drawn = state === "visible";

        if (!this.mesh.isDisposed()) {
            this.mesh.setEnabled(drawn);
            // A hidden node must not swallow a click meant for whatever is behind it, and a
            // context point is background rather than a target.
            this.mesh.isPickable = drawn;
        }

        const labelMesh = this.label?.labelMesh;
        if (labelMesh && !labelMesh.isDisposed()) {
            labelMesh.setEnabled(drawn);
        }

        // A node that has just been filtered out cannot be under the pointer any more, and a
        // tooltip left hanging over a node that is no longer drawn is words with nothing under
        // them. Taken down rather than disabled, on the same terms as leaving a node: a tooltip
        // carries a dynamic texture and is cheap to build again when the pointer comes back.
        if (!drawn) {
            this.hideTooltip();
        }

        this.showOverlay("context", state === "context");
        // A hidden node draws no halo: the selection is still the selection, but there is nothing
        // on screen for it to ring.
        this.syncHalo();
    }

    /**
     * What a selected node is configured to look like.
     *
     * Read on every overlay pass rather than cached, because a consumer can restyle the
     * selection while a selection is on screen and a cached answer would keep drawing the old
     * one until something else happened to rebuild the node.
     * @returns The configured colour, scale and opacity.
     */
    private selectionStyle(): GraphSelectionStyleConfig {
        return this.context.getStyles().config.graph.selection ?? DEFAULT_SELECTION_STYLE;
    }

    /**
     * The look this node's halo is drawn in, or null when it draws none.
     *
     * ONE HALO, TWO SOURCES. The selection draws one on a selected node, in the configured
     * selection style; a layer draws one on any node through the `node.halo*` channels. A
     * node with both shows one halo: each value the layer set wins and the selection style gives
     * the rest, and a layer's `node.halo: false` takes the halo off even a selected node. With
     * the starting rows on, the Selected row draws the selection's halo as a style instead, so
     * the selection itself draws none and a node never carries two.
     * @returns The colour, scale and opacity, or null.
     */
    private haloLook(): GraphSelectionStyleConfig | null {
        const layer = this.drawnStyle?.effect?.halo;
        const color = layer?.color;
        const scale = layer?.scale !== undefined && layer.scale > 0 ? layer.scale : undefined;
        const opacity = layer?.opacity;
        const lookSet = color !== undefined || scale !== undefined || opacity !== undefined;
        const selectionDraws = this.selected && this.context.getStyles().config.graph.startingRows !== true;

        if (!(layer?.enabled ?? (lookSet || selectionDraws))) {
            return null;
        }

        const base = this.selectionStyle();

        return lookSet
            ? { ...base, color: color ?? base.color, scale: scale ?? base.scale, opacity: opacity ?? base.opacity }
            : base;
    }

    /**
     * Draw or take down this node's halo from the selection and the layers as they now stand.
     */
    private syncHalo(): void {
        const look = this.renderState === "visible" ? this.haloLook() : null;
        if (this.drawnByBatch()) {
            // The shader batch draws the halo from the radius; the mesh halo would be the proxy's.
            this.showOverlay("halo", false);
            this.ringLabel(look === null || look.opacity === 0 ? null : look.scale);
            this.syncShaders();
            return;
        }

        this.showOverlay("halo", look !== null, look ?? undefined);
    }

    /**
     * Redraw this node's selection halo from the configuration as it now stands.
     *
     * Called for every node when `graph.setSelectionStyle()` changes it. A node with no halo has
     * nothing to redraw and nothing happens.
     */
    refreshSelectionOverlay(): void {
        if (this.disposed) {
            return;
        }

        this.syncHalo();
    }

    /**
     * Turn one of this node's two overlays on or off, building it the first time it is needed.
     * @param kind - Which overlay.
     * @param wanted - Whether it should be drawn.
     * @param look - The halo's look; the selection style when absent.
     */
    private showOverlay(
        kind: "halo" | "context",
        wanted: boolean,
        look: GraphSelectionStyleConfig = this.selectionStyle(),
    ): void {
        const existing = kind === "halo" ? this.halo : this.contextPoint;

        // A HALO OF OPACITY 0 IS NOT DRAWN AT ALL. Drawn invisible it still covered the node in
        // the depth and stencil buffers, so an outline on a selected node (`node.outline`) was
        // painted over the whole node instead of around it. The halo's OWN look: a layer's
        // halo is drawn even while the selection's own halo is hidden at opacity 0.
        if (!wanted || (kind === "halo" && look.opacity === 0)) {
            this.hideOverlay(kind, existing);
            return;
        }

        const selection = look;
        // A halo is the node's own shape, so a node redrawn in another shape needs another halo,
        // and its own look's material, so a halo changing look needs another one too.
        const stale = kind === "halo" && existing !== null && this.haloKey !== this.haloSourceKey(selection);
        if (stale && !existing.isDisposed()) {
            existing.dispose();
        }

        const overlay = existing && !stale && !existing.isDisposed() ? existing : this.createOverlay(kind, selection);

        if (kind === "halo") {
            this.halo = overlay;
            // WRITTEN ON EVERY PASS, not only when the halo is built. Every halo in the graph is
            // an instance of ONE source mesh and shares ONE material, so a selection restyled
            // while a selection is on screen is this one write -- and it is the same write for
            // one selected node and for forty thousand. Minting a source mesh per appearance
            // instead would leave one behind in the cache for every colour a colour picker
            // passed through.
            Node.paintHalo(overlay, look);
            this.ringLabel(look.scale);
            // The node's own geometry, scaled about its centre: every point of the node's surface
            // moves out by the configured multiplier, so a box gets a box, a cylinder a
            // cylinder, and a node drawn wider than tall a halo wider than tall.
            overlay.scaling.copyFrom(this.mesh.scaling).scaleInPlace(selection.scale);
        } else {
            this.contextPoint = overlay;
            overlay.scaling.setAll(Math.max(this.size, MIN_OVERLAY_SIZE) * CONTEXT_POINT_SCALE);
        }

        overlay.position.copyFrom(this.mesh.position);
        overlay.setEnabled(true);
    }

    /**
     * Stop drawing one of this node's overlays, keeping it for the next time it is wanted.
     * @param kind - Which overlay.
     * @param existing - The overlay, when one was built.
     */
    private hideOverlay(kind: "halo" | "context", existing: AbstractMesh | null): void {
        if (existing && !existing.isDisposed()) {
            existing.setEnabled(false);
        }

        if (kind === "halo") {
            this.ringLabel(null);
        }
    }

    /**
     * Keep the label clear of the halo as it keeps clear of the node, and have the label overlap
     * pass look again: the label moved with no node moving.
     * @param scale - The halo's size over the node's, or null when no halo is drawn.
     */
    private ringLabel(scale: number | null): void {
        const { label } = this;
        if (label?.setRing(scale) === true) {
            LabelDeclutter.track(this.mesh.getScene(), this.context, this);
        }
    }

    /**
     * The colour this node is drawn in now, as `#rrggbb` (with `aa` when not opaque): what the
     * last paint of the style stack gave it, after hidden rows, runs, notes and data changes have
     * repainted it. Null before its first paint. A read for tests and tools that must check what
     * was drawn rather than what the stack would explain.
     * @returns The drawn colour, or null.
     * @since 3.26.0
     */
    get drawnFill(): string | null {
        return toColorValue(this.drawnColor)?.hex ?? null;
    }

    /**
     * How far the node's drawn surface reaches from its centre at most: its largest half-extent,
     * in the units its position is laid out in.
     *
     * THE NODE'S OWN EXTENT, not its world one. The node and the halo are children of
     * `graph-root`, and an XR gesture scales that root -- so measuring in world space would
     * count the gesture in a value that is compared with layout coordinates and local scalings.
     *
     * Counts the border as drawn now, so a border in screen pixels makes it change with the zoom;
     * a layout reads {@link Node.layoutRadius} instead.
     * @returns The radius; the style's own size when the mesh has no bounds yet.
     */
    get drawnRadius(): number {
        return this.surfaceRadius + this.borderReach;
    }

    /**
     * {@link Node.drawnRadius} without a border drawn in screen pixels (`border.screenWidth`):
     * the radius a layout spaces this node by (`nodeGap`). That border's reach in the scene
     * changes with every zoom, so counting it made the spacing depend on the camera the layout
     * ran under; the few pixels it adds are left to the gap (#3532).
     * @returns The radius.
     * @internal
     */
    get layoutRadius(): number {
        return this.surfaceRadius + this.sceneBorderReach;
    }

    /**
     * How far the node's drawn surface reaches from its centre at most, without its border.
     * Measured once per mesh and scaling: a bounding-box read per node per layout step is the cost
     * {@link Node.roundRadius} documents.
     * @returns The radius; the style's own size when the mesh has no bounds yet.
     */
    private get surfaceRadius(): number {
        const own = this.mesh.scaling;
        const scale = Math.max(Math.abs(own.x), Math.abs(own.y), Math.abs(own.z));
        if (this.drawnRadiusMesh !== this.mesh || this.drawnRadiusScale !== scale || this.drawnRadiusValue <= 0) {
            const box = this.mesh.isDisposed() ? null : this.mesh.getBoundingInfo().boundingBox;
            this.drawnRadiusMesh = this.mesh;
            this.drawnRadiusScale = scale;
            this.drawnRadiusValue =
                box === null ? 0 : Math.max(box.extendSize.x, box.extendSize.y, box.extendSize.z) * scale;
        }

        // A mesh whose bounds have not been computed yet answers zero. Falling back to the
        // style's own size keeps the answer roughly right until the mesh is measured.
        return this.drawnRadiusValue > 0 ? this.drawnRadiusValue : Math.max(this.size, MIN_OVERLAY_SIZE) / 2;
    }

    /**
     * The node's label, when it draws any words.
     * @returns The label, or null for no label or an empty one.
     * @internal
     */
    get wordedLabel(): RichTextLabel | null {
        const words = this.drawnLabelText?.trim() ?? "";
        return words === "" ? null : (this.label ?? null);
    }

    /**
     * How the style sizes this node when it is drawn as a group following its members (`node.group*`),
     * its lengths in the units positions are laid out in (a length of `shape.size` units is drawn
     * {@link NodeMesh.extentPerSize} of them across, as the node's own size is).
     * @returns The sizing, or undefined when the style sets none.
     * @internal
     */
    get groupSizing(): NodeStyleConfig["group"] {
        const group = this.drawnStyle?.group;
        if (group === undefined) {
            return undefined;
        }

        const per = NodeMesh.extentPerSize(this.drawnStyle?.shape);
        const scaled = (length: number | undefined): number | undefined =>
            length === undefined ? undefined : length * per;
        return {
            ...group,
            padding: scaled(group.padding),
            minWidth: scaled(group.minWidth),
            minHeight: scaled(group.minHeight),
        };
    }

    /**
     * Whether the node is drawn as a group following its members: a region behind them, its edges and
     * their labels, stretched over its members' box.
     * @returns True while it is drawn so.
     */
    get isDrawnAsGroup(): boolean {
        return this.drawnAsGroup;
    }

    /**
     * How far the node's drawn surface reaches from its centre along each axis: its bounding
     * box's half-size, in the units its position is laid out in (the node's own space, not the
     * world, for the reason {@link Node.drawnRadius} gives).
     *
     * One number per axis because one radius is wrong for most shapes: a box reaches 1.41 times
     * its half-width at a corner, and a tall cylinder is far narrower than it is tall. Read by
     * `ngraph`'s `nodeGap` and by edge self-loops. Measured once per mesh and scaling.
     * @returns The half-extents; the style's own size on every axis when the mesh has no bounds yet.
     */
    get drawnHalfExtents(): Readonly<{ x: number; y: number; z: number }> {
        const own = this.mesh.scaling;
        const seen = this.halfExtentsScale;
        const value = this.halfExtentsValue;
        if (
            this.halfExtentsMesh !== this.mesh ||
            seen.x !== own.x ||
            seen.y !== own.y ||
            seen.z !== own.z ||
            value.x <= 0
        ) {
            const extent = this.mesh.isDisposed() ? null : this.mesh.getBoundingInfo().boundingBox.extendSize;
            this.halfExtentsMesh = this.mesh;
            seen.x = own.x;
            seen.y = own.y;
            seen.z = own.z;
            value.x = extent ? extent.x * Math.abs(own.x) : 0;
            value.y = extent ? extent.y * Math.abs(own.y) : 0;
            value.z = extent ? extent.z * Math.abs(own.z) : 0;
        }

        if (value.x > 0 || value.y > 0 || value.z > 0) {
            return value;
        }

        const fallback = this.drawnRadius;
        return { x: fallback, y: fallback, z: fallback };
    }

    /**
     * How far the node's outline -- the size its style gives it -- reaches from its centre along each axis: its drawn
     * surface ({@link Node.drawnHalfExtents}) plus what a border centered on the outline or inside it took from the
     * fill. What a file's ports and a self-loop's bends are measured against (`line.sourcePort`, `line.bends`), so
     * a Gephi loop sized from the node's size is not drawn smaller by the node's inside border.
     * @returns The half-extents, in the units {@link Node.drawnHalfExtents} gives.
     * @internal
     */
    get outlineHalfExtents(): Readonly<{ x: number; y: number; z: number }> {
        const half = this.drawnHalfExtents;
        // only a fitted mesh (a flat shape, or one sized to its extents) is drawn in by the border's inset
        const inset = NodeMesh.isFitted(this.drawnStyle?.shape) ? this.fillInset() : 0;
        return inset === 0 ? half : { x: half.x + inset, y: half.y + inset, z: half.z };
    }

    /**
     * Build one overlay instance for this node.
     *
     * The source mesh is interned in the mesh cache under a fixed name, so the whole graph shares
     * one sphere and one material per overlay kind: turning the context layer on for 40,000 hidden
     * nodes allocates 40,000 instances of one mesh, not 40,000 meshes.
     * @param kind - Which overlay.
     * @param selection - The halo's look.
     * @returns The instance, parented and ready to be positioned.
     */
    private createOverlay(kind: "halo" | "context", selection: GraphSelectionStyleConfig): AbstractMesh {
        const scene = this.context.getScene();
        const name = kind === "halo" ? this.haloSourceKey(selection) : CONTEXT_POINT_MESH;
        const color = kind === "halo" ? selection.color : CONTEXT_POINT_COLOR;
        const alpha = kind === "halo" ? selection.opacity : CONTEXT_POINT_ALPHA;
        const shape = kind === "halo" ? this.nodeSourceMesh() : null;
        const overlay = this.context
            .getMeshCache()
            .get(name, () => Node.createOverlaySource(name, color, alpha, scene, shape));

        if (kind === "halo") {
            this.haloKey = name;
        }

        // Never pickable: the halo sits OVER the node it rings, so a pickable halo would take
        // every click meant for the node underneath it and selection would stop working.
        overlay.isPickable = false;

        const graphRoot = scene.getTransformNodeByName("graph-root");
        if (graphRoot) {
            overlay.parent = graphRoot;
        }

        return overlay;
    }

    /**
     * Bring the shared halo material into line with the configured appearance.
     * @param overlay - Any halo instance; its material is the shared one.
     * @param selection - The colour and opacity to draw it in.
     */
    private static paintHalo(overlay: AbstractMesh, selection: GraphSelectionStyleConfig): void {
        const { material } = overlay;

        if (!(material instanceof StandardMaterial)) {
            return;
        }

        // The color's own alpha multiplies the configured opacity (issue #2071).
        const { rgb, alpha } = readColor(selection.color, DEFAULT_SELECTION_STYLE.color);

        material.emissiveColor = rgb;
        material.alpha = selection.opacity * alpha;
    }

    /**
     * Whether a mesh is flat: its geometry has no depth along one axis.
     * @param mesh - The mesh.
     * @returns True when one extent is (next to) zero beside the largest.
     */
    private static isFlat(mesh: Mesh): boolean {
        const { extendSize } = mesh.getBoundingInfo().boundingBox;
        const largest = Math.max(extendSize.x, extendSize.y, extendSize.z);
        return Math.min(extendSize.x, extendSize.y, extendSize.z) <= largest * 1e-3;
    }

    /**
     * Build the one source mesh a kind of overlay is instanced from.
     * @param name - The mesh name, which is also its cache key.
     * @param color - The colour, as a hex string.
     * @param alpha - How opaque it is, in `[0, 1]`.
     * @param scene - The scene to build it in.
     * @param shape - The node source mesh whose geometry a halo shares, or null for a unit sphere.
     * @returns The source mesh.
     */
    private static createOverlaySource(
        name: string,
        color: string,
        alpha: number,
        scene: Scene,
        shape: Mesh | null,
    ): Mesh {
        let source: Mesh;
        if (shape?.geometry) {
            // SHARED geometry, not a copy: one halo source per node source costs a material and
            // no vertices, and Babylon reference-counts the geometry so either can be disposed
            // first. A new mesh rather than a clone, so nothing of the node's own source -- its
            // material, its instance colour buffer, its visibility -- comes with it.
            source = new Mesh(name, scene);
            shape.geometry.applyToMesh(source);
        } else {
            source = MeshBuilder.CreateSphere(name, { diameter: 1, segments: 8 }, scene);
        }

        const material = new StandardMaterial(`${name}-material`, scene);

        // Unlit on purpose: an overlay is a marker, and a marker that changes shade as the camera
        // orbits reads as another node rather than as an annotation on one.
        material.disableLighting = true;
        const painted = readColor(color, DEFAULT_SELECTION_STYLE.color);

        material.emissiveColor = painted.rgb;
        material.diffuseColor = Color3.Black();
        material.specularColor = Color3.Black();
        material.alpha = alpha * painted.alpha;
        // A halo around a solid draws only its far side. The near side lies in front of the node
        // it surrounds, and blending it over the node tinted the whole node the halo's colour (a
        // selected blue node drew gray-brown) instead of ringing it. The far side lies behind the
        // node, so the node hides it inside its own outline and it shows only around it, as a
        // ring; and from inside the halo every face seen is a far face, so the ring survives the
        // camera there. A flat node's halo has no far side -- it is one sheet in the node's own
        // plane, which the zOffset below keeps behind the node -- so it keeps both faces, and so
        // does a context point, drawn in place of a hidden node with nothing in front of it.
        material.backFaceCulling = name.startsWith(SELECTION_HALO_MESH) && !Node.isFlat(source);
        material.cullBackFaces = false;
        // Drawn just behind a surface it shares a depth with, so around a flat node -- whose
        // scaled copy lies in the node's own plane -- the halo shows as a rim around the node
        // instead of fighting it for the same pixels. Too small to move a 3D halo visibly.
        material.zOffsetUnits = 4;
        source.material = material;

        return source;
    }

    /**
     * The source mesh this node's own mesh is an instance of, or the mesh itself.
     * @returns The mesh whose geometry the node is drawn with.
     */
    private nodeSourceMesh(): Mesh | null {
        if (this.mesh instanceof InstancedMesh) {
            return this.mesh.sourceMesh;
        }

        return this.mesh instanceof Mesh ? this.mesh : null;
    }

    /**
     * The cache key of the halo source for this node's current shape and the halo's look: one per
     * node source mesh in the selection's own look, so every selected node of one shape shares
     * one halo source, and one more per colour and opacity a layer's halo asks for. Every
     * halo of one source shares one material, so two looks cannot share a source.
     * @param look - The halo's look.
     * @returns The key.
     */
    private haloSourceKey(look: GraphSelectionStyleConfig): string {
        const key = `${SELECTION_HALO_MESH}:${this.mesh.name}`;
        const selection = this.selectionStyle();
        // ponytail: one cached source per halo colour and opacity ever drawn; evict unused
        // ones if a continuous halo colour encoding ever shows up in a profile.
        return look.color === selection.color && look.opacity === selection.opacity
            ? key
            : `${key}:${look.color}:${String(look.opacity)}`;
    }

    /**
     * Move the overlays onto the node's current position.
     *
     * Called from the update loop rather than from a parent-child link, because the context point
     * stands in for a mesh that is DISABLED: Babylon disables a mesh's descendants with it, so an
     * overlay parented to the node's own mesh would vanish in exactly the case it exists for.
     */
    private syncOverlayPositions(): void {
        if (this.halo && !this.halo.isDisposed()) {
            this.halo.position.copyFrom(this.mesh.position);
        }

        if (this.contextPoint && !this.contextPoint.isDisposed()) {
            this.contextPoint.position.copyFrom(this.mesh.position);
        }
    }

    /**
     * Pins the node in place, so that no layout moves it again until it is released.
     *
     * THE ELEMENT OWNS THE PIN, in the byte beside this node's coordinates. It used to be owned by
     * whichever layout engine happened to be current, which meant every pin was lost the moment
     * the reader changed arrangement or switched between 2D and 3D -- and meant nothing at all
     * under fourteen of the sixteen engines, whose `pin()` does nothing. Recorded here it is one
     * fact that survives a layout change, a re-freeze and a renumbering, and the shared position
     * array refuses a layout step onto a pinned row whatever engine is running.
     *
     * THE ENGINE IS STILL TOLD, because a live simulation that knows a body is fixed stops
     * spending force on it -- ngraph's `pinNode`, d3's `fx`/`fy`/`fz`. That copy is a projection
     * of the element's bit and never a second source of truth. The order is load-bearing: the bit
     * is recorded FIRST, so an engine that calls back into {@link Node.isPinned} while being told
     * sees the pin.
     *
     * In a graph with a session the pin is an undoable step: it is recorded in the session's
     * `pins`, which writes the byte and tells the engine.
     */
    pin(): void {
        if (this.dispatchPin(true)) {
            return;
        }

        if (!this.positionsLane?.setPinned(this.index, true)) {
            // A node the graph builder never took has no row to pin, and pinning happens from a
            // pointer gesture, so this says so rather than throwing inside the frame that reports
            // the drop.
            logger.debug("A node with no row in the graph cannot be pinned", { nodeId: this.id });
            return;
        }

        this.tellEngine("pin");
    }

    /**
     * Unpins the node, allowing the layout engine to move it again.
     *
     * The element's bit is cleared FIRST and the forward is guarded, so this cannot throw. It used
     * to: a node pinned under one engine and released after a layout change forwarded the release
     * to a DIFFERENT engine, which threw "Internal error: Node not found" for a node it had never
     * been told about.
     */
    unpin(): void {
        if (this.dispatchPin(false)) {
            return;
        }

        this.positionsLane?.setPinned(this.index, false);
        this.tellEngine("unpin");
    }

    /**
     * Pin or release this node as a step of its graph's session, when it has one.
     * @param pinned - Pin, or release.
     * @returns False when there is no session to dispatch through.
     */
    private dispatchPin(pinned: boolean): boolean {
        const session = this.context.getSession?.();
        if (session === undefined) {
            return false;
        }

        void dispatcherOf(session).dispatchNow({ op: "positions.pin", ids: [this.id], pinned });
        return true;
    }

    /**
     * Tell the current layout engine about a pin the element has already recorded.
     *
     * GUARDED, and this is the whole reason it exists as a method. An engine may refuse a node it
     * has not been told about -- `NGraphLayoutEngine` and `D3GraphLayoutEngine` both throw for
     * one -- and the element's pin is already recorded by the time this runs, so a throw here
     * would abort the caller's gesture while leaving the pin in force with no way back out.
     * @param verb - which half of the projection to forward
     */
    private tellEngine(verb: "pin" | "unpin"): void {
        const engine = this.context.getLayoutManager().layoutEngine;
        if (!engine) {
            return;
        }

        try {
            engine[verb](this);
        } catch (error) {
            logger.debug("The layout engine did not accept the pin change", {
                nodeId: this.id,
                verb,
                reason: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * The element's position array, when this node belongs to a graph that keeps one.
     *
     * Resolved on every read rather than cached, for the same reason `LayoutEngine.positionsFor`
     * resolves on every call: the element REPLACES the array when a dataset is discarded, and a
     * cached reference would go on answering for a graph that no longer exists.
     * @returns the array, or undefined for a node built outside a graph
     */
    private get positionsLane(): ElementPositions | undefined {
        return writableLane(this.context.getDataManager?.());
    }

    /**
     * Bring the label on screen into line with what one resolved style asks for.
     *
     * SEPARATE FROM THE GEOMETRY REBUILD, and the separation is the whole point. `paintFrom`
     * skips the geometry when the source mesh has not changed, which is correct and is what
     * makes a colour change one buffer write; the label is not geometry and is not keyed by the
     * mesh, so it has to be looked at on every paint instead. Its own comparison is what keeps
     * that free: a repaint that leaves the words and their typography alone rebuilds nothing.
     *
     * NOT A STYLE DECISION. What the label says and how it is drawn is the style stack's answer,
     * resolved into `o.label` by `StylePainter` from the `node.label` and `node.labelStyle`
     * channels. This method only makes the scene agree with it.
     * @param o - The resolved style.
     * @param rebuild - True when the mesh the label hangs from has just been replaced, so a
     *     label asking for exactly what was drawn a moment ago must still be built again.
     */
    private syncLabel(o: NodeStyleConfig, rebuild: boolean): void {
        // the further texts first: the label's own early return must not skip them
        this.syncShapeTexts(o, rebuild);
        const wanted = drawnText(o.label);
        const text = wanted === undefined ? undefined : this.extractLabelText(wanted);

        if (!rebuild && text === this.drawnLabelText && isEqual(wanted, this.drawnLabelStyle)) {
            return;
        }

        this.label?.dispose();
        this.label = wanted === undefined ? undefined : this.createLabel(o);
        this.drawnLabelText = text;

        // CLONED rather than held. The block belongs to a `NodePaint` that
        // `StylePainter.nodePaint` builds fresh on every call, and a comparison against a
        // reference somebody else can still write to is a comparison that silently starts
        // passing. Paid only when the label actually changes.
        this.drawnLabelStyle = wanted === undefined ? undefined : cloneDeep(wanted);
    }

    /**
     * Bring the further texts (`shape.texts`) on screen into line with one resolved style: each one line in the
     * label's font, size and color (or its own, where its entry gives one), centered on its point over the node, as
     * Graphviz draws a record's fields. Rebuilt only when the texts, the label's typography or the node's size change,
     * or the mesh they hang from was replaced.
     * @param o - The resolved style.
     * @param rebuild - True when the node's mesh has just been replaced.
     */
    private syncShapeTexts(o: NodeStyleConfig, rebuild: boolean): void {
        const texts = shapeTexts(o.shape?.texts);
        const half = this.drawnHalfExtents;
        const key = texts.length === 0 ? undefined : JSON.stringify([o.shape?.texts, o.label, half.x, half.y]);
        if (!rebuild && key === this.drawnShapeTexts) {
            return;
        }

        for (const label of this.shapeTextLabels) {
            label.dispose();
        }
        this.shapeTextLabels = [];
        this.drawnShapeTexts = key;
        if (key === undefined) {
            return;
        }

        const scene = this.mesh.getScene();
        const style = { ...o.label, location: "center" as const, attachOffset: 0, offsetX: 0, offsetY: 0 };
        this.shapeTextLabels = texts.map(
            ([x, y, text, look]) =>
                new RichTextLabel(scene, {
                    ...this.createLabelOptions(text, {
                        ...style,
                        ...(look.size === undefined ? {} : { letterSize: look.size * 2 * half.y }),
                        ...(look.color === undefined ? {} : { textColor: look.color }),
                        ...(look.font === undefined ? {} : { font: look.font }),
                        ...(look.rotation === undefined ? {} : { rotation: look.rotation }),
                    }),
                    // right and down on screen
                    offsetX: x * half.x,
                    offsetY: -y * half.y,
                }),
        );
    }

    /**
     * Remember what this node's tooltip should say, and redraw it if one is on screen.
     *
     * A tooltip is not drawn by a paint. It is drawn when the pointer arrives, which is a moment
     * the style stack knows nothing about, so what a paint can do is record the answer for when
     * that happens. If the reader is already resting on this node, the tooltip in front of them
     * is rebuilt so it does not keep saying what a layer has just stopped saying.
     *
     * NOT A STYLE DECISION, on exactly the same terms as {@link Node.syncLabel}: what a tooltip
     * says and how it is drawn is resolved into `o.tooltip` by `StylePainter` from the
     * `node.tooltip` channel.
     * @param o - The resolved style.
     */
    private syncTooltip(o: NodeStyleConfig): void {
        const wanted = drawnText(o.tooltip);

        if (isEqual(wanted, this.wantedTooltip)) {
            return;
        }

        // CLONED for the reason `drawnLabelStyle` is cloned: the block belongs to a paint the
        // painter rebuilds on every call, and holding the reference makes the comparison above
        // start passing whenever somebody else writes through it.
        this.wantedTooltip = wanted === undefined ? undefined : cloneDeep(wanted);

        if (this.tooltip) {
            this.hideTooltip();
            this.showTooltip();
        }
    }

    /**
     * Draw this node's tooltip, if a layer gave it one.
     *
     * Called when the pointer arrives over the node. Does nothing at all when no layer has
     * written `node.tooltip`, which is the ordinary case, so hovering an unannotated graph costs
     * one comparison per node entered.
     */
    showTooltip(): void {
        if (this.disposed || this.tooltip || this.wantedTooltip === undefined || this.mesh.isDisposed()) {
            return;
        }

        const text = this.extractLabelText(this.wantedTooltip);
        this.tooltip = new RichTextLabel(this.mesh.getScene(), {
            ...this.createLabelOptions(text, this.wantedTooltip),
            onTop: true,
        });
    }

    /**
     * Take this node's tooltip off the screen.
     *
     * Called when the pointer leaves, and on dispose. Disposing rather than hiding, because a
     * tooltip's plane carries a dynamic texture of its own: keeping one per node that has ever
     * been hovered is a texture per node, which is the cost the hover-only rule exists to avoid.
     */
    hideTooltip(): void {
        this.tooltip?.dispose();
        this.tooltip = undefined;
    }

    /**
     * The words this node's tooltip draws, or undefined when no layer gave it one.
     * @returns The tooltip text.
     */
    get tooltipText(): string | undefined {
        return this.wantedTooltip === undefined ? undefined : this.extractLabelText(this.wantedTooltip);
    }

    private createLabel(styleConfig: NodeStyleConfig): RichTextLabel {
        const labelText = this.extractLabelText(styleConfig.label);
        const labelOptions = this.createLabelOptions(labelText, styleConfig.label);
        const scene = this.mesh.getScene();
        // Labels that would overlap on screen are thinned out when `labels.declutter` is on; see
        // LabelDeclutter.
        LabelDeclutter.track(scene, this.context, this);
        // Its animation starts on the first frame at rest with no style paint left to draw.
        oweLabelAnimations(scene);
        const label = new RichTextLabel(scene, labelOptions);
        // The plane is pickable either way (Babylon's default), so unset it takes a click and
        // answers no node; `pickable` makes `pickNodeId` read this node's id off it.
        if (styleConfig.label?.pickable === true && label.labelMesh) {
            label.labelMesh.metadata = { nodeId: this.id };
        }

        if (this.halo?.isEnabled() === true) {
            label.setRing(this.haloLook()?.scale ?? null);
        }

        return label;
    }

    private extractLabelText(labelConfig?: Record<string, unknown>): string {
        if (!labelConfig) {
            return this.id.toString();
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

        return this.id.toString();
    }

    /**
     * Turn one rich-text block into the options the label renderer takes.
     *
     * TAKES THE BLOCK, not the whole style, because a node draws two of them: its label and its
     * tooltip. They are the same schema (`RichTextStyle`), they are drawn by the same class, and
     * the only difference is which key of the resolved style they came from and when they are on
     * screen.
     * @param labelText - The words to draw.
     * @param labelStyle - The resolved rich-text block: `style.label` or `style.tooltip`.
     * @returns The options, with this node's mesh as the thing they attach to.
     */
    private createLabelOptions(labelText: string, labelStyle: NodeStyleConfig["label"] = {}): RichTextLabelOptions {
        // Get attach position and offset
        const attachPosition = this.getAttachPosition(labelStyle.location ?? "top");
        // Measured from the node's outline: a border centered on it or inside it draws the fill, which the label is
        // placed against, in from it by the inset, so a label beside the node goes that much further out and one
        // inside it that much less far in; one in the middle stays.
        const inset = this.fillInset();
        const placed = labelStyle.location ?? "top";
        let along = inset;
        if (placed === "center") {
            along = 0;
        } else if (placed.startsWith("inside-")) {
            along = -inset;
        }
        const attachOffset = (labelStyle.attachOffset ?? this.getDefaultAttachOffset(placed)) + along;

        const backgroundColor = labelBackgroundColor(labelStyle.backgroundColor);

        // Filter out undefined values from backgroundGradientColors
        let backgroundGradientColors: string[] | undefined = undefined;
        if (labelStyle.backgroundGradientColors) {
            backgroundGradientColors = labelStyle.backgroundGradientColors.filter(
                (color): color is string => color !== undefined,
            );
            if (backgroundGradientColors.length === 0) {
                backgroundGradientColors = undefined;
            }
        }

        const borders = labelBorders(labelStyle.borders);

        // Create label options by spreading the entire labelStyle object
        const labelOptions: RichTextLabelOptions = {
            ...labelStyle,
            // Override with computed values
            text: labelText,
            attachTo: this.mesh,
            attachPosition,
            attachOffset,
            ...(this.shapeType === "polygon" && { centerAtOrigin: true }),
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
     * How far in from its outline this node's fill is drawn: half its border's width for a border centered on the
     * outline, the whole width for one inside it, nothing for one outside it (`NodeMesh.borderFit`).
     * @returns The inset, in world units.
     */
    private fillInset(): number {
        const style = this.drawnStyle;
        if (style?.border === undefined) {
            return 0;
        }
        const { shape } = style;
        return NodeMesh.borderFit(
            shape,
            style.border,
            NodeMesh.extentsOf(shape ?? {}, Math.max(shape?.size ?? this.size, 1e-3)),
        ).inset;
    }

    private getAttachPosition(location: string): AttachPosition {
        switch (location) {
            case "floating":
            case "automatic":
                return "top";
            case "top":
            case "top-left":
            case "top-right":
            case "left":
            case "center":
            case "right":
            case "bottom":
            case "bottom-left":
            case "bottom-right":
            case "inside-top":
            case "inside-bottom":
            case "inside-left":
            case "inside-right":
            case "inside-top-left":
            case "inside-top-right":
            case "inside-bottom-left":
            case "inside-bottom-right":
                return location;
            default:
                return "top";
        }
    }

    private getDefaultAttachOffset(location: string): number {
        // Return larger offsets for left/right positions to prevent overlap
        switch (location) {
            case "left":
            case "right":
                return 1; // Larger offset for horizontal positions
            case "center":
            case "inside-top":
            case "inside-bottom":
            case "inside-left":
            case "inside-right":
            case "inside-top-left":
            case "inside-top-right":
            case "inside-bottom-left":
            case "inside-bottom-right":
                return 0; // No offset for center, nor for a label flush inside a side
            default:
                return 0.5; // Standard offset for top/bottom positions
        }
    }

    // Test helper methods
    /**
     * Gets the current 3D position of the node's mesh.
     * @remarks
     * This is where the node is DRAWN, which a frame's update pass copies from the layout. Until
     * the first frame after the node's mesh is created -- a new node, or a 2D/3D switch that
     * rebuilds the meshes -- it is the hidden mesh template's position (y = -10000), not the
     * node's. `waitForSettled()` does not wait for that frame; wait for
     * {@link Graph.waitForStableFrame} before reading it.
     * @returns An object containing the x, y, and z coordinates of the node
     */
    getPosition(): { x: number; y: number; z: number } {
        return {
            x: this.mesh.position.x,
            y: this.mesh.position.y,
            z: this.mesh.position.z,
        };
    }

    /**
     * Checks whether the node is currently pinned in place.
     *
     * Answers from the element's own position array, so the answer does not change because the
     * reader switched arrangement, switched between 2D and 3D, or applied a style template.
     * @returns True if the node is pinned, false otherwise
     */
    isPinned(): boolean {
        return this.positionsLane?.isPinned(this.index) ?? false;
    }
}
