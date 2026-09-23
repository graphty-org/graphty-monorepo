import { AbstractMesh, NullEngine, Scene } from "@babylonjs/core";

import type { LayerSpec, StaticStyle } from "../../src/catalog/types";
import type { AdHocData, EdgeStyleConfig, StyleSchemaV1, ViewMode } from "../../src/config";
import type { Edge } from "../../src/Edge";
import { Graph } from "../../src/Graph";
import type { DataManager } from "../../src/managers/DataManager";
import type { LayoutManager } from "../../src/managers/LayoutManager";
import type { PatternedLineMesh } from "../../src/meshes/PatternedLineMesh";

/**
 * Arrow style config type extracted from EdgeStyleConfig
 */
export type ArrowStyleConfig = NonNullable<EdgeStyleConfig["arrowHead"]>;

/**
 * Helper to check if a mesh is disposed.
 * Handles the difference between AbstractMesh (method) and PatternedLineMesh (property).
 */
export function isDisposed(mesh: AbstractMesh | PatternedLineMesh): boolean {
    if ("isDisposed" in mesh) {
        if (typeof mesh.isDisposed === "function") {
            return mesh.isDisposed();
        }

        return mesh.isDisposed;
    }

    return false;
}

/**
 * Type helper to access private Graph members in tests.
 * Uses Omit to remove the private members first, then re-add them as public.
 * This avoids TypeScript's intersection reduction to 'never'.
 */
export interface TestGraph extends Omit<Graph, "dataManager" | "layoutManager"> {
    dataManager: DataManager;
    layoutManager: LayoutManager;
}

/**
 * The render edge running from one node to another, for a test that has the endpoints and wants
 * the `Edge`.
 *
 * `dataManager.edges` is keyed by the element's own edge id -- a counter -- rather than by the
 * endpoint pair, because two edges can run between one pair and a pair string cannot name either
 * of them. This is the lookup a test actually wants, and it goes through the manager's own verb
 * rather than rebuilding a key.
 * @param graph - the graph under test
 * @param source - the node the edge leaves
 * @param target - the node the edge enters
 * @returns the oldest edge between them, or undefined when there is none
 */
export function edgeBetween(graph: Graph, source: string | number, target: string | number): Edge | undefined {
    return graph.getDataManager().getEdgesBetween(source, target)[0];
}

/**
 * Cast a plain object to AdHocData for test purposes
 * This allows tests to pass simple objects to graph.addNode/addEdge
 */
export function asData<T extends Record<string, unknown>>(data: T): AdHocData & T {
    return data as AdHocData & T;
}

/**
 * Create a complete arrow config with defaults filled in
 */
export function arrowConfig(opts: {
    type: ArrowStyleConfig["type"];
    color?: string;
    size?: number;
    opacity?: number;
}): ArrowStyleConfig {
    return {
        type: opts.type,
        size: opts.size ?? 1.0,
        color: opts.color ?? "#FFFFFF",
        opacity: opts.opacity ?? 1.0,
    };
}

/**
 * Create a complete edge style config with defaults filled in
 */
export function edgeStyleConfig(opts: {
    lineType?: NonNullable<EdgeStyleConfig["line"]>["type"];
    lineColor?: string;
    arrowHead?: ArrowStyleConfig["type"];
    arrowHeadColor?: string;
}): EdgeStyleConfig {
    return {
        line: {
            type: opts.lineType ?? "solid",
            color: opts.lineColor ?? "#AAAAAA",
        },
        arrowHead: opts.arrowHead ? arrowConfig({ type: opts.arrowHead, color: opts.arrowHeadColor }) : undefined,
    };
}

/**
 * Set part of the behaviour half of a graph's configuration document.
 *
 * Goes through the graph's own public verb, which merges one level deep, so naming
 * `layout.preSteps` leaves the other pacing settings alone.
 * @param graph - The graph to configure.
 * @param behavior - The settings to merge in. Anything left out keeps the value it had.
 */
export function setBehavior(
    graph: Graph,
    behavior: {
        layout?: Partial<StyleSchemaV1["behavior"]["layout"]>;
        node?: Partial<StyleSchemaV1["behavior"]["node"]>;
    },
): void {
    graph.setLayoutBehavior(behavior);
}

/**
 * Configure a graph the way a test needs it, in one call.
 *
 * WHAT THIS REPLACES. Every one of these settings used to arrive as a whole style template --
 * forty lines of document to say "2D, circular layout, do not pin on drag" -- and applying one
 * rewrote every other setting in it. Each is its own verb now, and this is only their order:
 * the behaviour document first, because the layout reads it as it starts, then the view mode,
 * then the layout.
 * @param graph - The graph to configure.
 * @param options - What to set. Anything left out keeps the value it had.
 * @param options.viewMode - "2d" or "3d".
 * @param options.layout - The layout to place the graph with.
 * @param options.layoutOptions - The layout's own options, such as `{dim: 2}`.
 * @param options.pinOnDrag - Whether dragging a node pins it.
 */
export async function configureGraph(
    graph: Graph,
    options: {
        viewMode?: ViewMode;
        layout?: string;
        layoutOptions?: object;
        pinOnDrag?: boolean;
    },
): Promise<void> {
    if (options.pinOnDrag !== undefined) {
        setBehavior(graph, { node: { pinOnDrag: options.pinOnDrag } });
    }

    if (options.viewMode !== undefined) {
        await graph.setViewMode(options.viewMode);
    }

    if (options.layout !== undefined) {
        await graph.setLayout(options.layout, options.layoutOptions ?? {});
    }
}

/**
 * Put one style layer on a graph, which means putting it on the session's stack.
 *
 * THERE IS ONE STACK. A test that wants a node or an edge to look a particular way says so here;
 * the style template that used to carry a parallel stack of jmespath layers is gone, and so is
 * the rule that decided which of the two painted. Awaiting this means the repaint it drove has
 * finished, so the meshes are the ones the layer asked for by the time the next line runs.
 * @param graph - The graph to style.
 * @param spec - The layer.
 */
export async function addStyleLayer(graph: Graph, spec: LayerSpec): Promise<void> {
    await graph.getSession().styles.add(spec);
}

/**
 * Paint every node in a graph the same way.
 * @param graph - The graph to style.
 * @param set - The channels to write, such as `{"node.color": "#4CAF50", "node.size": 10}`.
 * @param name - What to call the layer, for a test that wants to find it again.
 */
export async function styleEveryNode(graph: Graph, set: StaticStyle, name = "test nodes"): Promise<void> {
    await addStyleLayer(graph, { name, target: "node", selector: { match: "everything" }, set });
}

/**
 * Paint every edge in a graph the same way.
 * @param graph - The graph to style.
 * @param set - The channels to write, such as `{"edge.color": "#666666", "edge.width": 3}`.
 * @param name - What to call the layer, for a test that wants to find it again.
 */
export async function styleEveryEdge(graph: Graph, set: StaticStyle, name = "test edges"): Promise<void> {
    await addStyleLayer(graph, { name, target: "edge", selector: { match: "everything" }, set });
}

/**
 * Creates a test graph instance.
 * By default uses NullEngine for unit tests.
 * Pass useRealEngine: true for interaction tests that need WebGL picking.
 */
export async function createTestGraph(options: { useRealEngine?: boolean } = {}): Promise<Graph> {
    // Create a container element
    const container = document.createElement("div");
    container.id = "test-graph-container";
    container.style.width = "414px";
    container.style.height = "207px";
    document.body.appendChild(container);

    // Create graph instance
    const graph = new Graph(container);

    // For unit tests, use NullEngine to avoid WebGL requirements
    // For interaction tests, use real engine for proper picking
    if (!options.useRealEngine) {
        const graphWithEngine = graph as Graph & { createEngine: () => unknown; engine: unknown };
        const originalCreateEngine = graphWithEngine.createEngine;
        graphWithEngine.createEngine = function () {
            this.engine = new NullEngine();
            return this.engine;
        };

        // Initialize
        await graph.init();

        // Restore original method
        graphWithEngine.createEngine = originalCreateEngine;
    } else {
        // Use real WebGL engine
        await graph.init();
    }

    return graph;
}

/**
 * Creates a minimal test scene with NullEngine
 */
export function createTestScene(): Scene {
    const engine = new NullEngine();
    return new Scene(engine);
}

/**
 * Cleans up test graph instance
 */
export function cleanupTestGraph(graph: Graph): void {
    graph.shutdown();
    const container = document.getElementById("test-graph-container");
    if (container) {
        container.remove();
    }
}
