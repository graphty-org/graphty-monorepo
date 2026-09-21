import jmespath from "jmespath";
import { defaultsDeep, isEqual } from "lodash";

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

export type NodeStyleId = number & { __brand: "NodeStyleId" };
export type EdgeStyleId = number & { __brand: "EdgeStyleId" };

/**
 * Manages style layers and computes styles for nodes and edges.
 *
 * THE 1.x STACK, AND THE ONLY THING STILL HOLDING IT UP. Every layer it resolves comes from the
 * `layers` array of a style template, and it resolves them by calling `jmespath.search()` once per
 * element per layer -- which re-parses the expression on every call. The session's own stack
 * (`src/session/styles/`) compiles a selector once into a closure and repaints from a columnar
 * dirty set instead, and `StylePainter` decides which of the two draws: the session's, unless a
 * template put layers here.
 *
 * WHAT BLOCKS DELETING THIS FILE, precisely. A template layer's `style` is a `NodeStyleConfig` or
 * an `EdgeStyleConfig` -- the element's whole drawing vocabulary, including the ~50-field
 * `RichTextStyle` behind a label, a gradient `texture.color`, arrow head and tail decoration and
 * their own rich-text captions. The session's layers write CHANNELS, and the channel set is
 * closed: it has no spelling for any of those. Translating a template layer into channels would
 * therefore silently stop drawing things the element draws today. Closing that gap is an API
 * decision -- new channels, and a `LabelStyle` that carries what the element's labels can
 * actually do -- not a deletion, so it is not made here.
 *
 * NOT EXPORTED FROM THE PACKAGE. `Styles`, `StylesOpts`, `NodeStyleId` and `EdgeStyleId` left the
 * published surface with the 2.0 style system; a consumer reads and writes layers through
 * `session.styles`.
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
        warnAboutCalculatedStyles(this.#layers);

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

/**
 * Say, once per layer, that a `calculatedStyle` in a loaded template is not being applied.
 *
 * ANNOUNCED RATHER THAN SWALLOWED. The mechanism it replaces failed silently in both of its two
 * failure modes -- a throw part way through a repaint, and a Content Security Policy that refused
 * the evaluator outright -- and a capability that vanishes without a word is the outcome this
 * whole migration exists to stop. The template still loads, and everything else in it still
 * applies; only the expression is gone, and the layer is named so the reader knows which picture
 * changed.
 * @param layers - The layers the template carried.
 */
function warnAboutCalculatedStyles(layers: readonly StyleLayerType[]): void {
    for (const [at, layer] of layers.entries()) {
        if (layer.node?.calculatedStyle === undefined && layer.edge?.calculatedStyle === undefined) {
            continue;
        }

        const name = layer.metadata?.name ?? `layer ${String(at)}`;

        console.warn(
            `[graphty] The style layer "${name}" carries a calculatedStyle, which was removed in 2.0 and is not applied. ` +
                "An expression string cannot be validated, legended or run under a Content Security Policy; " +
                "bind the value to a channel with session.styles.encode() instead.",
        );
    }
}
