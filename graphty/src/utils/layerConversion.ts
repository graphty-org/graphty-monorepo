/**
 * Utilities for converting between graphty-element StyleLayer and graphty LayerItem formats.
 */

import type { StyleLayer } from "../components/Graphty";
import type { LayerItem } from "../components/layout/LeftSidebar";

/**
 * Extended LayerItem that includes the index in graphty-element's layer array.
 * This allows us to map UI operations back to the correct layer.
 */
export interface IndexedLayerItem extends LayerItem {
    /** Index in graphty-element's layer array */
    index: number;
}

/**
 * Convert a StyleLayer from graphty-element to a LayerItem for the UI.
 * @param layer - The StyleLayer from graphty-element
 * @param index - The index in graphty-element's layer array
 * @returns The converted LayerItem with index
 */
export function styleLayerToLayerItem(layer: StyleLayer, index: number): IndexedLayerItem {
    const { metadata } = layer;
    const name = (metadata?.name as string | undefined) ?? `Layer ${index + 1}`;

    return {
        id: `layer-${index}`,
        name,
        index,
        metadata,
        styleLayer: {
            node: layer.node
                ? {
                      selector: layer.node.selector ?? "",
                      style: layer.node.style ?? {},
                      calculatedStyle: layer.node.calculatedStyle,
                  }
                : undefined,
            edge: layer.edge
                ? {
                      selector: layer.edge.selector ?? "",
                      style: layer.edge.style ?? {},
                      calculatedStyle: layer.edge.calculatedStyle,
                  }
                : undefined,
        },
    };
}

/**
 * Convert an array of StyleLayers to LayerItems.
 * All layers are treated equally - there's no special handling for any layer type.
 * @param layers - Array of StyleLayers from graphty-element
 * @returns Array of IndexedLayerItems
 */
export function styleLayersToLayerItems(layers: StyleLayer[]): IndexedLayerItem[] {
    return layers.map((layer, index) => styleLayerToLayerItem(layer, index));
}

/**
 * Convert a LayerItem back to a StyleLayer for graphty-element.
 * @param item - The LayerItem from the UI
 * @returns The StyleLayer for graphty-element
 */
export function layerItemToStyleLayer(item: LayerItem): StyleLayer {
    // Pass through full metadata, updating name if changed
    const metadata: Record<string, unknown> = {
        ...item.metadata,
        name: item.name,
    };

    return {
        metadata,
        node: item.styleLayer.node
            ? {
                  selector: item.styleLayer.node.selector,
                  style: item.styleLayer.node.style,
                  calculatedStyle: item.styleLayer.node.calculatedStyle,
              }
            : undefined,
        edge: item.styleLayer.edge
            ? {
                  selector: item.styleLayer.edge.selector,
                  style: item.styleLayer.edge.style,
                  calculatedStyle: item.styleLayer.edge.calculatedStyle,
              }
            : undefined,
    };
}

/**
 * Create a new empty StyleLayer with default values.
 * @param name - Name for the new layer
 * @returns A new StyleLayer
 */
export function createEmptyStyleLayer(name: string): StyleLayer {
    return {
        metadata: {
            name,
        },
        node: {
            selector: "",
            style: {
                enabled: true,
            },
        },
        edge: {
            selector: "",
            style: {
                enabled: true,
            },
        },
    };
}
