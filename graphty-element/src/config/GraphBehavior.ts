import { z } from "zod";

import type { Graph } from "../Graph";
import type { Node as GraphNode } from "../Node";

const NodeBehaviorOpts = z
    .strictObject({
        /*
         * Whether dropping a dragged node fixes it where the reader put it.
         *
         * IT STAYS ON BY DEFAULT even though a pin now survives a layout change, a 2D/3D switch
         * and a style template -- which means every node a reader has ever dragged stops being
         * rearranged, with nobody opting in. A drag is a deliberate placement, and an arrangement
         * that silently discards it is the defect this release is fixing, not a feature to
         * preserve.
         *
         * What makes that defensible is that a pin can now be RELEASED: `element.pin`,
         * `element.unpin` and `element.pinnedNodes` are public, so a reader who wants their
         * placements back in the layout has a way to say so. Before those existed, leaving this
         * on would have meant a session that froze one node per drag with no way out.
         */
        pinOnDrag: z.boolean().default(true),

        /*
         * Whether a node's drawn size ignores how far it is from the 3D camera.
         *
         * OFF BY DEFAULT (unset): a 3D view is a perspective, and a nearer node looks bigger, which is
         * what a reader exploring a space expects. On, every node is drawn as if it stood at the
         * depth of the point the camera turns about, so two drawn sizes compare as the two sizes a
         * style gave them, at any angle -- what a size bound to data needs, because with depth a
         * node 6% larger but 16% farther away is drawn smaller. Zooming still scales everything.
         * The 2D view (orthographic) and an XR session ignore it.
         */
        depthIndependentSize: z.boolean().optional(),

        /*
         * How wide every node outline is drawn, as a multiple of the renderer's own stroke (about
         * four device pixels at 1).
         *
         * ONE WIDTH FOR EVERY OUTLINE, which is why it is a graph setting and not a style channel:
         * the renderer draws all outlines in one full-screen pass, and the stroke's width belongs
         * to that pass (see the `node.outline` channel's caveat). Unset, the renderer's own width.
         */
        outlineWidth: z.number().positive().max(10).optional(),
    })
    .prefault({});

const LabelBehaviorOpts = z
    .strictObject({
        /*
         * Whether node labels that would be drawn on top of each other are thinned out.
         *
         * OFF BY DEFAULT, so a graph looks the way it always has: every label a style asks for is
         * drawn. On, the element hides a label whose words would overlap a label it keeps, and it
         * keeps a selected node's label first, then the label of the node with more edges. The
         * decision is taken again whenever the camera, the viewport, a label, a node's position or
         * the selection changes, and never on a frame where none of them did.
         */
        declutter: z.boolean().default(false),
        /*
         * Whether a node label moves off the other nodes and the edges it would cover.
         *
         * OFF BY DEFAULT, so a label is drawn where its style puts it. On, the element tries the
         * label's own place first and then the places around its node (above, below, beside, the
         * four corners) and draws it at the first one that covers no other label, node or edge;
         * failing that, at one that covers no label or node. When none of them is clear of other
         * labels and nodes, `declutter` hides the label; with `declutter` off it stays where its
         * style puts it. Decided again whenever `declutter` is.
         */
        avoidNodesAndEdges: z.boolean().default(false),
    })
    .prefault({});

const CameraBehaviorOpts = z
    .strictObject({
        /*
         * Whether the selection becomes the camera's pivot.
         *
         * OFF BY DEFAULT, so the camera turns about the point it always has. On, selecting one node
         * makes it the pivot, and selecting several makes the plain average of their positions the
         * pivot: the 3D camera glides to look at it and orbits, spins and zooms about it, the 2D view
         * glides to center it, and in VR or AR the reader's turns and scaling happen about it without
         * moving the reader. The pivot follows the selected nodes while they move, and stays where it
         * is when the selection is cleared.
         */
        pivotOnSelection: z.boolean().default(false),
        /*
         * Which selection changes move the pivot, by who made them: the `cause` of the
         * `selection:changed` event -- `user` (a click or a shift-click on the canvas), `api` (a
         * call such as `session.selection.apply`), `command` (a filter condition whose effect is
         * `select`) and `history` (an undo, a redo or a restore).
         *
         * UNSET BY DEFAULT, so every selection change moves it, as `pivotOnSelection` always has.
         * Set, a change whose cause is not listed leaves the camera where it is, as a pan of the
         * reader's does, until the selection changes again. Only read while `pivotOnSelection` is on.
         */
        pivotOnSelectionCauses: z.array(z.enum(["user", "api", "command", "history"])).optional(),
        /*
         * How fast the 3D camera turns on its own, in radians per second, about the graph's
         * vertical axis.
         *
         * 0 BY DEFAULT, so the camera stays where the reader put it. Above 0 the 3D view turns at
         * that speed every frame, and stops while the reader drags, pinches, holds an arrow key
         * or drags a node, carrying on from wherever they left it. The 2D view and a VR or AR
         * session never turn. A page that honours `prefers-reduced-motion` sets 0 for those
         * readers. The turning does not hold back `graph-frame-stable`: the picture is finished
         * when the layout and the styles are, however the camera moves.
         */
        autoRotate: z.number().min(0).default(0),
        /*
         * Room, in CSS pixels, that framing the graph leaves clear at each edge of the canvas, for
         * a page that draws its own panels over the graph.
         *
         * ALL 0 BY DEFAULT, so the graph is framed in the whole canvas. Set, zoom-to-fit (on a
         * load, a layout change, a 2D/3D switch and `zoomToFit()`) fits the graph inside what is
         * left and centers it there, in 2D and 3D, and the 3D camera keeps that center while it
         * turns and zooms. The canvas still draws everywhere: a node turned or panned into an
         * inset is drawn and can be pointed at. Changing it frames the graph again.
         */
        fitInsets: z
            .strictObject({
                top: z.number().min(0).default(0),
                right: z.number().min(0).default(0),
                bottom: z.number().min(0).default(0),
                left: z.number().min(0).default(0),
            })
            .prefault({}),
        /*
         * What zoom-to-fit fits into view in 3D.
         *
         * "box" BY DEFAULT: every corner of the box around the nodes and labels, as seen from
         * the front. "turning" fits the nodes and labels themselves at every angle the view turns
         * to about the graph's vertical axis -- as `autoRotate` and a sideways drag turn it -- so
         * a turning graph stays in the frame and is not drawn smaller to make room for the empty
         * corners of its box. 2D always fits the box.
         */
        fitBounds: z.enum(["box", "turning"]).default("box"),
    })
    .prefault({});

const ExpandBehaviorOpts = z
    .strictObject({
        /*
         * What expands a node from the network source that loaded it.
         *
         * "none" BY DEFAULT, so a click and a double-click do what they always did. Set, the
         * element asks the node's source for its neighborhood and merges it as one undoable step;
         * `fetchNodes` and `fetchEdges`, when a host sets them, still win. A node loaded from a
         * file has nothing to ask, and the expansion fails with E_SOURCE_UNSUPPORTED. Experimental.
         */
        trigger: z.enum(["none", "click", "double-click"]).default("none"),
        /* How many hops. */
        depth: z.number().int().positive().default(1),
        /* Which edges to follow. */
        direction: z.enum(["out", "in", "both"]).default("both"),
        /* At most this many new nodes per expansion; no limit when unset, the source's own default. */
        limit: z.number().int().positive().optional(),
        /* Only these relationship types; every type when unset. */
        relationshipTypes: z.array(z.string()).optional(),
        /* "continue" plays the layout so it places the new nodes; "none" leaves it as it is. */
        layout: z.enum(["continue", "none"]).default("continue"),
    })
    .prefault({});
/** What zoom-to-fit fits into view in 3D: the nodes' box, or the nodes at every turn of the view. */
export type FitBounds = "box" | "turning";

/** Room framing leaves clear at each edge of the canvas, in CSS pixels. */
export interface FitInsets {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
}

/** The rendering settings: the fields `setRenderSettings` accepts. */
export const RenderSettingsOpts = z.strictObject({
    /*
     * Whether a frame is drawn only when the picture can have changed.
     *
     * OFF BY DEFAULT, so the element draws every animation frame, as Babylon.js does and as a
     * consumer who changes the Babylon scene directly (through `element.graph.scene`) relies
     * on. On, the element skips a frame once the layout has settled, the styles are painted and
     * the camera is still, and draws again when anything it drives or the reader's input changes
     * the picture. A still graph then costs the page nothing per frame, which on a software GPU
     * is tens to hundreds of milliseconds of every frame. Something added to or removed from the
     * scene from outside the element is drawn; a property changed on something already in it
     * is not seen until something else asks for a frame.
     */
    onDemand: z.boolean().default(false),
});

const RenderingBehaviorOpts = RenderSettingsOpts.prefault({});

const GraphLayoutOpts = z.strictObject({
    type: z.string().default("ngraph"),
    preSteps: z.number().default(0),
    stepMultiplier: z.number().default(1),
    minDelta: z.number().default(0),
    zoomStepInterval: z.number().min(1).default(1),

    /*
     * How many iterations of a simulation layout one frame computes.
     *
     * LEFT UNSET ON PURPOSE by default, because the right answer depends on the graph in front of
     * the reader rather than on the host: a simulation resolves it at every load from
     * `stepMultiplier`, raising it fourfold once the graph is large enough that one round trip per
     * iteration costs more than the arithmetic. Setting it here pins the count whatever the size.
     *
     * It reaches nothing but a simulation layout -- `forceatlas2`, `spring` and `spring-electrical`
     * -- because no other engine computes in batches.
     */
    iterationsPerStep: z.number().int().positive().optional(),

    /*
     * How many accelerated batches a simulation layout may have in flight at once.
     *
     * Two is one being computed while the next is being prepared, which is what keeps the device
     * busy without letting the frame loop queue work faster than the device retires it. One makes
     * every frame wait for the readback; more than four buys nothing and costs a uniform ring
     * entry per batch. A CPU simulation ignores it: its step is synchronous.
     */
    maxInFlight: z.number().int().min(1).max(4).default(2),

    /*
     * Whether a group node with no stored position follows its members.
     *
     * A file can nest nodes in another node: a Graphviz cluster, a yEd group, a Cytoscape compound
     * node. When the file stores no position for such a group, the element does not lay it out
     * as a node of its own: it is placed on its members' bounding box, padded, every frame, drawn
     * that size behind them, and it pushes and pulls no other node. False lays it out like any
     * other node, as the element did before. A group the file places keeps its stored position and
     * box either way. Unset means true.
     */
    groupsFollowMembers: z.boolean().optional(),
});

/** How the element drives a layout, as the behaviour configuration resolves it. */
export type GraphLayoutBehavior = z.infer<typeof GraphLayoutOpts>;

/** How the element drives the layout, as a caller supplies it: every field optional. */
export type GraphBehaviorConfig = z.input<typeof GraphBehaviorOpts>;

export const GraphBehaviorOpts = z.strictObject({
    // dimensions: z.int().min(2).max(3).default(3),
    layout: GraphLayoutOpts.prefault({}),
    node: NodeBehaviorOpts,
    labels: LabelBehaviorOpts,
    rendering: RenderingBehaviorOpts,
    camera: CameraBehaviorOpts,
    expand: ExpandBehaviorOpts,
    fetchNodes: z.optional(z.instanceof(Function)),
    fetchEdges: z.optional(z.instanceof(Function)),
});

/* ******* REFACTOR EVERYTHING BELOW THIS LINE *********/
export type NodeIdType = string | number;

interface NodeObjectType {
    id: NodeIdType;
    metadata: object;
    [key: string]: unknown;
}

/**
 * The shape of an edge record a consumer's `fetchEdges` hands back.
 *
 * This is a RECORD, not the element's render object, so it carries the canonical endpoint
 * spelling. The element still probes `src`/`dst` and `from`/`to` at runtime, so a `fetchEdges`
 * written against 1.x keeps working; the declared type names the spelling the guides teach and
 * that every other door into the element publishes.
 */
interface EdgeObjectType {
    source: NodeIdType;
    target: NodeIdType;
    metadata: object;
    [key: string]: unknown;
}

export type FetchNodesFn = (nodeIds: Set<NodeIdType>, g: Graph) => Set<NodeObjectType>;
export type FetchEdgesFn = (node: GraphNode, g: Graph) => Set<EdgeObjectType>;
