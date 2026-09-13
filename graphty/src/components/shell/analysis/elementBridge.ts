/**
 * The narrow seam between the React shell and graphty-element's Graph object.
 *
 * WHY this module exists rather than a cast at each call site: the app's own handle
 * type (`Graphty.tsx`'s `Graph`) carries an index signature, so every method on it
 * reads as `unknown` and the shipped precedent (`RunAlgorithmModal.tsx`) reaches the
 * element by casting. A cast is a claim; this module makes a runtime check instead, so
 * "the element is not ready yet" becomes a branch the load path can take rather than a
 * crash on the first method call.
 *
 * The second thing it owns is the repaint. Spec 7.2 and 7.3 both apply style layers
 * that read `algorithmResults` -- node size from degree, colours from community id.
 * Graph's own style-changed handler evaluates node selectors WITHOUT algorithmResults
 * and never runs calculated values, so a layer added after an algorithm run neither
 * matches an `algorithmResults.*` selector nor executes its calculated value until
 * something re-applies styles to the nodes that already exist. Every caller therefore
 * adds layers through {@link addStyleLayers}, which repaints, and never through
 * `getStyleManager().addLayer` directly.
 *
 * App shell progressive disclosure design, section 7 "Novice path" (7.2 Defaults on
 * load, 7.3 Insights strip, 7.5 Plain-language readings).
 */

/** One node, as this module needs to read it. @public */
export interface ElementNodeLike {
    /** The node's id. */
    readonly id: number | string;
    /** Nested `algorithmResults.<namespace>.<type>.<name>`. */
    readonly algorithmResults?: unknown;
}

/** The data manager doors this module uses. @public */
export interface ElementDataManagerLike {
    /** Nested `<namespace>.<type>.<name>`. */
    readonly graphResults?: unknown;
    /** Re-evaluates node selectors WITH algorithmResults and runs calculated values. */
    applyStylesToExistingNodes: () => void;
    /** The same for edges. */
    applyStylesToExistingEdges: () => void;
}

/** A style layer, shaped as StyleManager takes it. Structurally the defaults module's descriptor. @public */
export interface ElementStyleLayerLike {
    /** The layer's metadata. */
    readonly metadata?: Readonly<Record<string, unknown>>;
    /** The node half. */
    readonly node?: Readonly<Record<string, unknown>>;
    /** The edge half. */
    readonly edge?: Readonly<Record<string, unknown>>;
}

/** The style manager doors this module uses. @public */
export interface ElementStyleManagerLike {
    /** Appends a layer to the end of the layer list. */
    addLayer: (layer: ElementStyleLayerLike) => void;
    /** The current layer list, lowest index first. */
    getLayers: () => readonly ElementStyleLayerLike[];
    /** Drops the layer at one index, returning whether anything was removed. */
    removeLayerByIndex: (index: number) => boolean;
}

/** Exactly the graph surface this slice touches. @public */
export interface ElementGraph {
    /** Queues an algorithm run and resolves when it has finished. */
    runAlgorithm: (
        namespace: string,
        type: string,
        options?: {
            readonly algorithmOptions?: Readonly<Record<string, unknown>>;
        },
    ) => Promise<void>;
    /** Every node currently loaded. */
    getNodes: () => readonly ElementNodeLike[];
    /** The data manager. */
    getDataManager: () => ElementDataManagerLike;
    /** The style manager. */
    getStyleManager: () => ElementStyleManagerLike;
}

/** The four methods a candidate must carry to be an {@link ElementGraph}. */
const REQUIRED_GRAPH_METHODS = ["runAlgorithm", "getNodes", "getDataManager", "getStyleManager"] as const;

/**
 * Reads a candidate as a plain string-keyed record, or null when it is not one.
 * Arrays are records too as far as property access goes, so they are not excluded
 * here; the method check below rejects them.
 * @param candidate - anything at all.
 * @returns the candidate viewed as a record, or null when it has no properties to read.
 */
function asRecord(candidate: unknown): Record<string, unknown> | null {
    if (typeof candidate !== "object" || candidate === null) {
        return null;
    }

    return candidate as Record<string, unknown>;
}

/**
 * Narrows the app's structurally-typed graph handle to {@link ElementGraph}, or null
 * when it is not ready. A runtime guard rather than a cast, so the caller needs no
 * assertion and a missing method is a branch instead of a crash.
 * @param candidate - the value behind `graphtyRef.current?.graph`, whatever it is.
 * @returns the graph, or null when the element has not finished coming up.
 */
export function asElementGraph(candidate: unknown): ElementGraph | null {
    const record = asRecord(candidate);
    if (record === null) {
        return null;
    }

    for (const method of REQUIRED_GRAPH_METHODS) {
        if (typeof record[method] !== "function") {
            return null;
        }
    }

    return record as unknown as ElementGraph;
}

/**
 * Reads a nested result path, e.g. ["graphty", "louvain", "modularity"].
 * @param root - the object the path starts at, typically a node's `algorithmResults`
 * or the data manager's `graphResults`.
 * @param path - the keys to walk, in order.
 * @returns the value at the path, or undefined when any step is missing.
 */
export function readResultPath(root: unknown, path: readonly string[]): unknown {
    let current: unknown = root;

    for (const key of path) {
        const record = asRecord(current);
        if (record === null) {
            return undefined;
        }

        current = record[key];
    }

    return current;
}

/**
 * Re-applies styles to existing nodes and edges. Required after adding a layer that
 * reads algorithmResults: Graph's own style-changed handler evaluates selectors
 * WITHOUT algorithmResults and never runs calculated values.
 * @param graph - the element graph to repaint.
 */
export function repaintStyles(graph: ElementGraph): void {
    const dataManager = graph.getDataManager();
    dataManager.applyStylesToExistingNodes();
    dataManager.applyStylesToExistingEdges();
}

/**
 * Adds layers in order, then repaints so algorithmResults selectors and calculated
 * values take effect. An empty list still repaints, because the caller's intent is
 * "the encoding is now what these layers say", and repainting nothing is cheap.
 * @param graph - the element graph to add to.
 * @param layers - the layers, lowest precedence first.
 */
export function addStyleLayers(graph: ElementGraph, layers: readonly ElementStyleLayerLike[]): void {
    const styleManager = graph.getStyleManager();
    for (const layer of layers) {
        styleManager.addLayer(layer);
    }

    repaintStyles(graph);
}

/**
 * Removes every layer carrying this algorithmSource tag, highest index first.
 *
 * Highest index first because `removeLayerByIndex` re-indexes the list, so removing
 * from the front would shift every later match by one.
 * @param graph - the element graph to remove from.
 * @param algorithmSource - the "<namespace>:<type>" tag a run's layers carry.
 */
export function removeLayersFromSource(graph: ElementGraph, algorithmSource: string): void {
    const styleManager = graph.getStyleManager();
    const layers = styleManager.getLayers();
    const doomed: number[] = [];

    for (let index = 0; index < layers.length; index++) {
        if (layers[index].metadata?.algorithmSource === algorithmSource) {
            doomed.push(index);
        }
    }

    for (let i = doomed.length - 1; i >= 0; i--) {
        styleManager.removeLayerByIndex(doomed[i]);
    }

    if (doomed.length > 0) {
        repaintStyles(graph);
    }
}
