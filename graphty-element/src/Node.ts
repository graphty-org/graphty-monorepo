import { AbstractMesh } from "@babylonjs/core";
import jmespath from "jmespath";
import _ from "lodash";

import { CalculatedValue } from "./CalculatedValue";
import { ChangeManager } from "./ChangeManager";
import { AdHocData, NodeStyle, NodeStyleConfig } from "./config";
import type { Graph } from "./Graph";
import type { GraphContext } from "./managers/GraphContext";
import { NodeEffects } from "./meshes/NodeEffects";
import { NodeMesh } from "./meshes/NodeMesh";
import { RichTextLabel, type RichTextLabelOptions } from "./meshes/RichTextLabel";
import { NodeBehavior, type NodeDragHandler } from "./NodeBehavior";
import { NodeStyleId, Styles } from "./Styles";

export type NodeIdType = string | number;

interface NodeOpts {
    pinOnDrag?: boolean;
}

/**
 * Represents a node in the graph visualization with its mesh, label, and associated data.
 * Manages node rendering, styling, drag behavior, and interactions with the layout engine.
 */
export class Node {
    parentGraph: Graph | GraphContext;
    opts: NodeOpts;
    id: NodeIdType;
    data: AdHocData<string | number>;
    algorithmResults: AdHocData;
    styleUpdates: AdHocData;
    mesh: AbstractMesh;
    label?: RichTextLabel;
    dragHandler?: NodeDragHandler;
    dragging = false;
    styleId: NodeStyleId;
    pinOnDrag!: boolean;
    size!: number;

    /**
     * The shape type of the mesh currently on screen, cached beside {@link Node.size}.
     *
     * It exists ONLY so that {@link Node.updateStyle} can tell a geometry change from a colour
     * change; see the invalidation block there for the defect it fixes. It is read from
     * `style.shape.type`, so it is `undefined` for a style that names no shape.
     */
    shapeType?: NonNullable<NodeStyleConfig["shape"]>["type"];
    changeManager: ChangeManager;

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
     * @param graph - The parent graph or graph context that owns this node
     * @param nodeId - Unique identifier for this node
     * @param styleId - Style identifier determining the node's visual appearance
     * @param data - Custom data associated with this node
     * @param opts - Optional configuration options for the node
     */
    constructor(
        graph: Graph | GraphContext,
        nodeId: NodeIdType,
        styleId: NodeStyleId,
        data: AdHocData<string | number>,
        opts: NodeOpts = {},
    ) {
        this.parentGraph = graph;
        this.id = nodeId;
        this.opts = opts;
        this.changeManager = new ChangeManager();
        this.data = this.changeManager.watch("data", data);
        this.algorithmResults = this.changeManager.watch("algorithmResults", {} as unknown as AdHocData);
        this.styleUpdates = this.changeManager.addData("style", {} as unknown as AdHocData, NodeStyle);
        this.changeManager.loadCalculatedValues(
            this.context.getStyleManager().getStyles().getCalculatedStylesForNode(data, this.algorithmResults),
        );

        // copy nodeMeshOpts
        this.styleId = styleId;

        // create graph node
        // TODO: Node is added to layout engine by DataManager, not here

        // create mesh
        const o = Styles.getStyleForNodeStyleId(styleId);
        this.size = o.shape?.size ?? 0;
        this.shapeType = o.shape?.type;

        this.mesh = NodeMesh.create(
            this.context.getMeshCache(),
            { styleId: String(styleId), is2D: this.context.is2D(), size: this.size },
            { shape: o.shape, texture: o.texture, effect: o.effect },
            this.context.getScene(),
        );

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
            styleId: String(styleId),
            nodeId: this.id,
        };

        // Apply outline and glow effects if configured in style
        NodeEffects.applyOutlineEffect(this.mesh, o.effect);
        NodeEffects.applyGlowEffect(this.mesh, o.effect);

        // create label
        if (o.label?.enabled) {
            this.label = this.createLabel(o);
        }

        NodeBehavior.addDefaultBehaviors(this, this.opts);
    }

    /**
     * Adds a calculated style value to this node's change manager.
     *
     * NOT DURABLE, by design: a value added here does not survive a style reload.
     * `ChangeManager.loadCalculatedValues` -- which `DataManager.applyStylesToExistingNodes` calls
     * on every repaint and `SelectionManager` calls on every selection change -- REPLACES both the
     * calculated-value set and the watched-input map with exactly what the current style layers
     * ask for, so anything registered through this method is dropped at the next repaint. That
     * replacement is deliberate: without it a REMOVED style layer's calculated value kept running
     * and overwrote the replacement layer's colours on every repaint. To make a calculated value
     * durable, put it in a style layer's `calculatedStyle` so `Styles.getCalculatedStylesForNode`
     * rebuilds it on every load.
     * @param cv - The calculated value to add to the node's styling system
     */
    addCalculatedStyle(cv: CalculatedValue): void {
        this.changeManager.addCalculatedValue(cv);
    }

    /**
     * Updates the node's mesh position and style based on layout engine and style changes.
     * Handles mesh recreation if disposed and applies any pending style updates.
     */
    update(): void {
        // A DELIBERATELY disposed node must never be resurrected here. The recreate-on-disposed
        // branch below exists for the 2D/3D mode switch, which disposes meshes out from under
        // live nodes; it cannot tell that case apart from a node this graph has finished with.
        // Both the layout engine (which DataManager.clear does not notify -- see its TODO) and
        // SelectionManager.selectedNode keep hard references to Nodes after a dataset is dropped,
        // and both of them call update(), so without this guard clearing a dataset would silently
        // rebuild every node's mesh on the next frame or the next deselect.
        if (this.disposed) {
            return;
        }

        this.context.getStatsManager().startMeasurement("Node.update");

        // Check if mesh was disposed (e.g., from 2D/3D mode switch) and recreate it
        if (this.mesh.isDisposed()) {
            this.updateStyle(this.styleId);
        }

        const newStyleKeys = Object.keys(this.styleUpdates);
        if (newStyleKeys.length > 0) {
            let style = Styles.getStyleForNodeStyleId(this.styleId);
            // Convert styleUpdates Proxy to plain object for proper merging
            // (styleUpdates is wrapped by on-change library's Proxy)
            const plainStyleUpdates = _.cloneDeep(this.styleUpdates);
            style = _.defaultsDeep(plainStyleUpdates, style);
            const styleId = Styles.getNodeIdForStyle(style);
            this.updateStyle(styleId);
            for (const key of newStyleKeys) {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete this.styleUpdates[key];
            }
        }

        if (this.dragging) {
            this.context.getStatsManager().endMeasurement("Node.update");
            return;
        }

        const layoutManager = this.context.getLayoutManager();
        const { layoutEngine } = layoutManager;

        const pos = layoutEngine?.getNodePosition(this);
        if (pos) {
            this.mesh.position.x = pos.x;
            this.mesh.position.y = pos.y;
            this.mesh.position.z = pos.z ?? 0;
        }

        this.context.getStatsManager().endMeasurement("Node.update");
    }

    /**
     * Updates the node's visual style by recreating the mesh with the specified style.
     * Preserves the node's position and reattaches behaviors and labels.
     * @param styleId - The new style identifier to apply to the node
     */
    updateStyle(styleId: NodeStyleId): void {
        // See update(): a disposed node is still reachable from the layout engine and from
        // SelectionManager, and this method builds a mesh. Refuse rather than resurrect.
        if (this.disposed) {
            return;
        }

        this.context.getStatsManager().startMeasurement("Node.updateMesh");

        // Only skip update if styleId is the same AND mesh is not disposed
        // (mesh can be disposed when switching 2D/3D modes via meshCache.clear())
        if (styleId === this.styleId && !this.mesh.isDisposed()) {
            this.context.getStatsManager().endMeasurement("Node.updateMesh");
            return;
        }

        this.styleId = styleId;

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

        const o = Styles.getStyleForNodeStyleId(styleId);
        const oldSize = this.size;
        const oldShapeType = this.shapeType;
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
        // Both style routes -- Graph.ts's style-changed handler and
        // DataManager.applyStylesToExistingNodes, which is what the shell repaints through --
        // converge on this same method and this same guard, so no route bypassed a recalculation
        // that another route performed. The old shell saw it work because it predates 973f1d96,
        // not because it called anything different.
        //
        // THIS STAYS A CONDITION, never an unconditional invalidation: the loop is O(E) per node
        // because a Node holds no incident-edge index, and a colour-only repaint reaches this
        // line too, so invalidating unconditionally would make a full repaint O(N*E). The cost
        // is unchanged for the size case and newly reachable for the shape case; if a repaint
        // that changes every node's shape ever hitches, the answer is a per-node edge index, not
        // removing the guard.
        if (this.size !== oldSize || this.shapeType !== oldShapeType) {
            const dataManager = this.context.getDataManager();
            for (const edge of dataManager.edges.values()) {
                if (edge.srcNode === this || edge.dstNode === this) {
                    edge.invalidatePositionCache();
                }
            }
        }

        this.mesh = NodeMesh.create(
            this.context.getMeshCache(),
            { styleId: String(styleId), is2D: this.context.is2D(), size: this.size },
            { shape: o.shape, texture: o.texture, effect: o.effect },
            this.context.getScene(),
        );

        // Restore the saved position to the new mesh
        this.mesh.position.x = savedPosition.x;
        this.mesh.position.y = savedPosition.y;
        this.mesh.position.z = savedPosition.z;

        // Parent to graph-root for XR gesture support
        const graphRoot = this.context.getScene().getTransformNodeByName("graph-root");
        if (graphRoot) {
            this.mesh.parent = graphRoot;
        }

        // Add metadata for XR controller raycasting
        // IMPORTANT: For InstancedMesh, we must set metadata on the INSTANCE, not spread from source
        this.mesh.metadata = {
            graphNode: this,
            styleId: String(styleId),
            nodeId: this.id,
        };

        // Restore position from layout engine after mesh recreation
        // This ensures the mesh doesn't reset to (0, 0, 0) when style changes
        const layoutManager = this.context.getLayoutManager();
        const pos = layoutManager.layoutEngine?.getNodePosition(this);
        if (pos) {
            this.mesh.position.x = pos.x;
            this.mesh.position.y = pos.y;
            this.mesh.position.z = pos.z ?? 0;
        }

        // Apply outline and glow effects if configured in style
        NodeEffects.applyOutlineEffect(this.mesh, o.effect);
        NodeEffects.applyGlowEffect(this.mesh, o.effect);

        // recreate label if needed
        if (o.label?.enabled) {
            this.label?.dispose();
            this.label = this.createLabel(o);
        } else if (this.label) {
            this.label.dispose();
            this.label = undefined;
        }

        // Dispose old drag handler before creating new one to prevent duplicate event listeners
        if (this.dragHandler) {
            this.dragHandler.dispose();
        }

        NodeBehavior.addDefaultBehaviors(this, this.opts);

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
     * ORDER MATTERS. The highlight layer is told first, because it keeps this mesh's uniqueId in
     * a list and does not watch for disposal; then the label and drag handler, which hold their
     * own meshes and scene observers; then the mesh itself last, so nothing is asked about a mesh
     * that is already gone.
     *
     * GLOW IS DELIBERATELY NOT REMOVED HERE. Glow membership is keyed by the SHARED source mesh
     * that MeshCache hands out instances of -- one source per style id -- so calling
     * `NodeEffects.applyGlowEffect(mesh, undefined)` from here would darken every OTHER node that
     * still uses this style. The source is owned by the cache, so it is freed when the cache is
     * cleared, and the layer's leftover uniqueId is inert: Babylon's uniqueIds are monotonic per
     * scene and never reused, so no future mesh can inherit a dead style's glow.
     *
     * A DISPOSED NODE STILL RECEIVES CALLS, which is why {@link Node.disposed} exists rather than
     * this method simply freeing things. `DataManager.clear()` does not notify the layout engine
     * (its own standing TODO), so `UpdateManager` keeps iterating the engine's node and edge
     * lists; and `SelectionManager.selectedNode` holds a Node across a dataset boundary and calls
     * `updateStyle` + `update` on it when the selection is finally cleared. Both paths would have
     * hit `update()`'s recreate-if-disposed branch and rebuilt the mesh of a node nobody owns.
     * Calling this twice is safe.
     */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        NodeEffects.removeFromHighlight(this.mesh);

        if (this.dragHandler) {
            this.dragHandler.dispose();
            this.dragHandler = undefined;
        }

        if (this.label) {
            this.label.dispose();
            this.label = undefined;
        }

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
     * Pins the node in place, preventing the layout engine from moving it.
     */
    pin(): void {
        this.context.getLayoutManager().layoutEngine?.pin(this);
    }

    /**
     * Unpins the node, allowing the layout engine to move it again.
     */
    unpin(): void {
        this.context.getLayoutManager().layoutEngine?.unpin(this);
    }

    private createLabel(styleConfig: NodeStyleConfig): RichTextLabel {
        const labelText = this.extractLabelText(styleConfig.label);
        const labelOptions = this.createLabelOptions(labelText, styleConfig);
        return new RichTextLabel(this.mesh.getScene(), labelOptions);
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

    private createLabelOptions(labelText: string, styleConfig: NodeStyleConfig): RichTextLabelOptions {
        const labelStyle = styleConfig.label ?? {};

        // Get attach position and offset
        const attachPosition = this.getAttachPosition(labelStyle.location ?? "top");
        const attachOffset = labelStyle.attachOffset ?? this.getDefaultAttachOffset(labelStyle.location ?? "top");

        // Transform backgroundColor to string if it's an advanced color style
        let backgroundColor: string | undefined = undefined;
        if (labelStyle.backgroundColor) {
            if (typeof labelStyle.backgroundColor === "string") {
                ({ backgroundColor } = labelStyle);
            } else if (labelStyle.backgroundColor.colorType === "solid") {
                ({ value: backgroundColor } = labelStyle.backgroundColor);
            } else if (labelStyle.backgroundColor.colorType === "gradient") {
                // For gradients, use the first color as a fallback
                [backgroundColor] = labelStyle.backgroundColor.colors;
            }
        }

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

        // Transform borders to ensure colors are strings
        let borders: { width: number; color: string; spacing: number }[] | undefined = undefined;
        if (labelStyle.borders && labelStyle.borders.length > 0) {
            const validBorders = labelStyle.borders
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

        // Create label options by spreading the entire labelStyle object
        const labelOptions: RichTextLabelOptions = {
            ...labelStyle,
            // Override with computed values
            text: labelText,
            attachTo: this.mesh,
            attachPosition,
            attachOffset,
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
        const { location, textPath, enabled, ...finalLabelOptions } = labelOptions as RichTextLabelOptions & {
            location?: string;
            textPath?: string;
            enabled?: boolean;
        };

        return finalLabelOptions;
    }

    private getAttachPosition(
        location: string,
    ): "top" | "top-left" | "top-right" | "left" | "center" | "right" | "bottom" | "bottom-left" | "bottom-right" {
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
                return 1.0; // Larger offset for horizontal positions
            case "center":
                return 0; // No offset for center
            default:
                return 0.5; // Standard offset for top/bottom positions
        }
    }

    // Test helper methods
    /**
     * Gets the current 3D position of the node's mesh.
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
     * @returns True if the node is pinned, false otherwise
     */
    isPinned(): boolean {
        // For now, nodes are not pinned unless drag behavior is disabled
        return false;
    }

    /**
     * Checks whether the node is currently selected.
     * @returns True if the node is selected, false otherwise
     */
    isSelected(): boolean {
        // Check if node is in selection - this is a simplified version
        // In reality, selection state would be managed by a selection manager
        return this.mesh.isPickable && this.mesh.metadata?.selected === true;
    }
}
