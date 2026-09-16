import jmespath from "jmespath";
import { defaultsDeep, isEqual } from "lodash";

import { CalculatedValue } from "./CalculatedValue";
import {
    AdHocData,
    AppliedNodeStyleConfig,
    defaultEdgeStyle,
    defaultNodeStyle,
    EdgeStyle,
    EdgeStyleConfig,
    NodeStyle,
    NodeStyleConfig,
    StyleLayerType,
    StyleSchemaV1,
    StyleTemplate,
} from "./config";

export interface StylesOpts {
    layers?: object;
    addDefaultStyle?: boolean;
}

export type NodeStyleId = number & { __brand: "NodeStyleId" };
export type EdgeStyleId = number & { __brand: "EdgeStyleId" };

/**
 * Manages style layers and computes styles for nodes and edges.
 */
export class Styles {
    readonly config: StyleSchemaV1;
    #layers: StyleLayerType[];
    #emptyNodeStyle: NodeStyleConfig;
    #emptyEdgeStyle: EdgeStyleConfig;

    /**
     * Gets the read-only array of style layers.
     * @returns Array of style layers
     */
    get layers(): readonly StyleLayerType[] {
        return this.#layers;
    }

    /**
     * Creates a new Styles instance from a style configuration.
     * @param config - Style schema configuration
     */
    constructor(config: StyleSchemaV1) {
        this.config = config;
        this.#layers = config.layers;
        this.#emptyNodeStyle = NodeStyle.parse({});
        this.#emptyEdgeStyle = EdgeStyle.parse({});

        if (this.config.graph.addDefaultStyle) {
            this.#layers.unshift({
                metadata: {
                    name: "default",
                },
                node: {
                    selector: "",
                    style: NodeStyle.parse(defaultNodeStyle),
                },
                edge: {
                    selector: "",
                    style: EdgeStyle.parse(defaultEdgeStyle),
                },
            });
        }
    }

    /**
     * Creates a Styles instance from a JSON string.
     * @param json - JSON string containing style configuration
     * @returns New Styles instance
     */
    static fromJson(json: string): Styles {
        const o = JSON.parse(json);
        return this.fromObject(o);
    }

    /**
     * Creates a Styles instance from a plain object.
     * @param obj - Object containing style configuration
     * @returns New Styles instance
     */
    static fromObject(obj: object): Styles {
        const config = StyleTemplate.parse(obj);
        // if (!config.graphtyTemplate) {
        //     throw new TypeError("styles config does not appear to be a graphty template");
        // }

        // if (config.majorVersion !== "1") {
        //     throw new TypeError(`unsupported graphty template version: ${config.majorVersion}`);
        // }

        return new Styles(config);
    }

    /**
     * Fetches and creates a Styles instance from a URL.
     * @param url - URL to fetch style configuration from
     * @returns Promise resolving to new Styles instance
     */
    static async fromUrl(url: string): Promise<Styles> {
        const response = await fetch(url);
        if (!response.body) {
            throw new Error("JSON response had no body");
        }

        const data = await response.json();

        return Styles.fromObject(data);
    }

    /**
     * Creates a default Styles instance with minimal configuration.
     * @returns New default Styles instance
     */
    static default(): Styles {
        return Styles.fromObject({
            graphtyTemplate: true,
            majorVersion: "1",
        });
    }

    /**
     * Adds a new style layer to the end of the layer stack.
     * @param layer - Style layer to add
     */
    addLayer(layer: StyleLayerType): void {
        this.#layers.push(layer);
        // TODO: recalculate
    }

    /**
     * Inserts a style layer at a specific position in the layer stack.
     * @param position - Index position to insert the layer
     * @param layer - Style layer to insert
     */
    insertLayer(position: number, layer: StyleLayerType): void {
        this.#layers.splice(position, 0, layer);
        // TODO: recalculate
    }

    /**
     * Removes style layers matching a metadata predicate.
     * @param predicate - Function to test layer metadata for removal
     * @returns True if any layers were removed
     */
    removeLayersByMetadata(predicate: (metadata: unknown) => boolean): boolean {
        const originalLength = this.#layers.length;
        this.#layers = this.#layers.filter((layer) => !predicate(layer.metadata));
        return this.#layers.length !== originalLength;
    }

    /**
     * Removes a layer at a specific index.
     * @param index - Index of the layer to remove
     * @returns True if the layer was removed
     */
    removeLayerByIndex(index: number): boolean {
        if (index < 0 || index >= this.#layers.length) {
            return false;
        }
        this.#layers.splice(index, 1);
        return true;
    }

    /**
     * Updates a layer at a specific index.
     * @param index - Index of the layer to update
     * @param layer - New layer configuration
     * @returns True if the layer was updated
     */
    updateLayerByIndex(index: number, layer: StyleLayerType): boolean {
        if (index < 0 || index >= this.#layers.length) {
            return false;
        }
        this.#layers[index] = layer;
        return true;
    }

    /**
     * Reorders layers by moving a layer from one index to another.
     * @param fromIndex - Current index of the layer
     * @param toIndex - Target index for the layer
     * @returns True if the layer was moved
     */
    reorderLayers(fromIndex: number, toIndex: number): boolean {
        if (
            fromIndex < 0 ||
            fromIndex >= this.#layers.length ||
            toIndex < 0 ||
            toIndex >= this.#layers.length ||
            fromIndex === toIndex
        ) {
            return false;
        }

        const [layer] = this.#layers.splice(fromIndex, 1);
        // Adjust target index if we removed an element before the target
        const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
        this.#layers.splice(adjustedToIndex, 0, layer);
        return true;
    }

    /**
     * Computes the merged style for a node by applying matching layers.
     * @param data - Node data for selector matching
     * @param algorithmResults - Optional algorithm results for selector matching
     * @returns Style ID for the computed node style
     */
    getStyleForNode(data: AdHocData, algorithmResults?: AdHocData): NodeStyleId {
        // Combine data and algorithmResults for selector matching
        const combinedData = algorithmResults ? { ...data, algorithmResults } : data;

        const styles: NodeStyleConfig[] = [];
        for (const layer of this.layers) {
            const { node } = layer;

            const nodeMatch = selectorMatchesNode(node, combinedData);

            if (nodeMatch && node?.style) {
                styles.unshift(node.style);
            }
        }

        const mergedStyle: NodeStyleConfig = defaultsDeep({}, ...styles, this.#emptyNodeStyle);
        if (styles.length === 0) {
            mergedStyle.enabled = false;
        }

        return Styles.getNodeIdForStyle(mergedStyle);
    }

    /**
     * Retrieves calculated style values for a node from every layer whose node selector matches.
     *
     * THE RETURNED ARRAY IS IN ASCENDING LAYER ORDER -- bottom layer first, top layer last -- and
     * that is the OPPOSITE of the order `getStyleForNode` builds. Both orders exist to produce the
     * SAME precedence rule, "the top layer wins", because the two arrays feed consumers with
     * opposite merge semantics:
     *
     * - `getStyleForNode` hands its array to lodash `defaultsDeep`, which is FIRST-wins. So it
     *   unshifts, putting the topmost matching layer at index 0.
     * - This array is handed to `ChangeManager.loadCalculatedValues`, which inserts it into a Set
     *   in array order; `runAllCalculatedValues` then iterates that Set in insertion order and
     *   every `CalculatedValue.run` ends in an unconditional `deepSet` into the node's
     *   `styleUpdates` (CalculatedValue.ts:84). That is LAST-writer-wins. So this method pushes,
     *   putting the topmost matching layer last, where its write lands on top.
     *
     * THE DEFECT THIS FIXES. This method used to `unshift`, copying `getStyleForNode`'s descending
     * order without copying its first-wins consumer. The two halves of one layer stack therefore
     * disagreed about which layer was on top: two live layers both writing `style.texture.color`
     * through `calculatedStyle` gave the colour to the BOTTOM one, while the same two layers
     * writing it through `style` gave it to the TOP one. Nothing shipped in the app hits that pair,
     * which is why it was never reported as a bug, but algorithm suggested-styles and generated
     * layers are user-extensible, so it was an inversion waiting for the first layer stack that
     * shared an output path.
     *
     * WHY THIS ONLY BECAME MEANINGFUL RECENTLY. Until `ChangeManager.loadCalculatedValues` began
     * clearing `calculatedValues` as well as `watchedInputs`, the Set held every value the node had
     * ever been handed and iterated in accumulation order ACROSS loads -- an order this method did
     * not control at all. Now that a load replaces the set, the order built here is exactly the
     * order the values run in, so it is load-bearing.
     * @param data - Node data for selector matching
     * @param algorithmResults - Optional algorithm results for selector matching
     * @returns Calculated values to apply to the node, in ascending layer order (bottom first), so
     * that the last one to run -- the topmost matching layer -- wins a shared output path
     */
    getCalculatedStylesForNode(data: AdHocData, algorithmResults?: AdHocData): CalculatedValue[] {
        // Combine data and algorithmResults for selector matching
        const combinedData = algorithmResults ? { ...data, algorithmResults } : data;

        const ret: CalculatedValue[] = [];
        for (const layer of this.layers) {
            const { node } = layer;

            const nodeMatch = selectorMatchesNode(node, combinedData);

            if (nodeMatch && node?.calculatedStyle) {
                const { inputs, output, expr } = node.calculatedStyle;
                const cv = new CalculatedValue(inputs, output, expr);
                ret.push(cv);
            }
        }

        return ret;
    }

    /**
     * Retrieves calculated style values for an edge from every layer whose edge selector matches.
     *
     * THE RETURNED ARRAY IS IN ASCENDING LAYER ORDER -- bottom layer first, top layer last -- for
     * the same reason as `getCalculatedStylesForNode`, and it is deliberately the OPPOSITE of the
     * order `getStyleForEdge` builds. `getStyleForEdge` feeds lodash `defaultsDeep`, which is
     * FIRST-wins, so it unshifts. This array is fed to `ChangeManager.loadCalculatedValues` ->
     * `runAllCalculatedValues` -> `CalculatedValue.run`, which ends in an unconditional `deepSet`
     * (CalculatedValue.ts:84) and is therefore LAST-writer-wins, so it pushes. Two opposite array
     * orders, one precedence rule: the top layer wins.
     *
     * THE DEFECT THIS FIXES. This method used to `unshift` like its static sibling, so the BOTTOM
     * layer won a shared calculated output path -- `style.line.color`, say -- while the TOP layer
     * won a shared static one. One layer stack, two contradictory answers to "which layer is on
     * top".
     * @param data - Edge data for selector matching
     * @returns Calculated values to apply to the edge, in ascending layer order (bottom first), so
     * that the last one to run -- the topmost matching layer -- wins a shared output path
     */
    getCalculatedStylesForEdge(data: AdHocData): CalculatedValue[] {
        const ret: CalculatedValue[] = [];
        for (const layer of this.layers) {
            const { edge } = layer;

            // Check if edge selector matches (empty selector matches all)
            let edgeMatch = edge?.selector === "";
            if (!edgeMatch && edge?.selector) {
                // try JMES match
                const searchResult = jmespath.search(data, `[${edge.selector}]`);
                if (Array.isArray(searchResult) && typeof searchResult[0] === "boolean") {
                    edgeMatch = searchResult[0];
                }
            }

            if (edgeMatch && edge?.calculatedStyle) {
                const { inputs, output, expr } = edge.calculatedStyle;
                const cv = new CalculatedValue(inputs, output, expr);
                ret.push(cv);
            }
        }

        return ret;
    }

    /**
     * Computes the merged style for an edge by applying matching layers.
     * @param data - Edge data for selector matching
     * @param algorithmResults - Optional algorithm results for selector matching
     * @returns Style ID for the computed edge style
     */
    getStyleForEdge(data: AdHocData, algorithmResults?: AdHocData): EdgeStyleId {
        // Combine data and algorithmResults for selector matching
        const combinedData = algorithmResults ? { ...data, algorithmResults } : data;

        const styles: EdgeStyleConfig[] = [];
        for (const layer of this.layers) {
            const { edge } = layer;
            let edgeMatch = edge?.selector === "";
            if (!edgeMatch) {
                // try JMES match
                const searchResult = jmespath.search(combinedData, `[${edge?.selector ?? ""}]`);
                if (Array.isArray(searchResult) && typeof searchResult[0] === "boolean") {
                    edgeMatch = searchResult[0];
                }
            }

            if (edgeMatch && edge?.style) {
                styles.unshift(edge.style);
            }
        }

        const mergedStyle: EdgeStyleConfig = defaultsDeep({}, ...styles, this.#emptyEdgeStyle);
        if (styles.length === 0) {
            mergedStyle.enabled = false;
        }

        return Styles.getEdgeIdForStyle(mergedStyle);
    }

    /**
     * Retrieves the node style configuration for a given style ID.
     * @param id - Node style identifier
     * @returns Node style configuration
     */
    static getStyleForNodeStyleId(id: NodeStyleId): NodeStyleConfig {
        const ret = nodeStyleMap.get(id);
        if (!ret) {
            throw new TypeError(`couldn't find NodeStyleId: ${id}`);
        }

        return ret;
    }

    /**
     * Retrieves the edge style configuration for a given style ID.
     * @param id - Edge style identifier
     * @returns Edge style configuration
     */
    static getStyleForEdgeStyleId(id: EdgeStyleId): EdgeStyleConfig {
        const ret = edgeStyleMap.get(id);
        if (!ret) {
            throw new TypeError(`couldn't find NodeStyleId: ${id}`);
        }

        return ret;
    }

    /**
     * Gets or creates a style ID for a node style configuration.
     * @param style - Node style configuration
     * @returns Node style identifier
     */
    static getNodeIdForStyle(style: NodeStyleConfig): NodeStyleId {
        return styleToId(nodeStyleMap, style);
    }

    /**
     * Gets or creates a style ID for an edge style configuration.
     * @param style - Edge style configuration
     * @returns Edge style identifier
     */
    static getEdgeIdForStyle(style: EdgeStyleConfig): EdgeStyleId {
        return styleToId(edgeStyleMap, style);
    }
}

const nodeStyleMap = new Map<NodeStyleId, NodeStyleConfig>();
const edgeStyleMap = new Map<EdgeStyleId, EdgeStyleConfig>();

function styleToId<IdT, StyleT>(map: Map<IdT, StyleT>, style: StyleT): IdT {
    let ret: IdT | undefined;

    // iterate through all defined styles to find a match
    for (const [k, v] of map.entries()) {
        if (isEqual(v, style)) {
            ret = k;
            break;
        }
    }

    // no matching style found, create a new one
    if (ret === undefined) {
        ret = map.size as IdT;
        map.set(ret, style);
    }

    return ret;
}

function selectorMatchesNode(node: AppliedNodeStyleConfig | undefined, data: AdHocData): boolean {
    if (!node) {
        return false;
    }

    let nodeMatch = node.selector.length === 0;
    if (!nodeMatch) {
        // try JMES match
        const searchResult = jmespath.search(data, `[${node.selector}]`);
        if (Array.isArray(searchResult) && typeof searchResult[0] === "boolean") {
            nodeMatch = searchResult[0];
        }
    }

    return nodeMatch;
}
