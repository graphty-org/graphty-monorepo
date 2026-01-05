import type { StyleLayerType } from "../config";
import type { Node } from "../Node";
import { Styles } from "../Styles";
import type { DataManager } from "./DataManager";
import type { EventManager } from "./EventManager";
import type { Manager } from "./interfaces";
import type { StyleManager } from "./StyleManager";

/**
 * Default selection style - gold/yellow color.
 * Uses color change instead of outline because HighlightLayer doesn't work
 * well with InstancedMesh (which MeshCache uses for performance).
 * This can be customized by users by modifying or replacing the selection layer.
 *
 * Selection state is stored in algorithmResults.graphty.selected rather than data._selected
 * to keep the data object clean and ensure proper style layer interaction with algorithm styles.
 *
 * The selection layer is added last in the layer stack (highest precedence)
 * to ensure it overrides other layers.
 */
const DEFAULT_SELECTION_STYLE: StyleLayerType = {
    metadata: {
        name: "selection",
    },
    node: {
        selector: "algorithmResults.graphty.selected == `true`",
        style: {
            enabled: true,
            texture: {
                color: "#FFD700", // Gold color for selected nodes
            },
        },
    },
};

/**
 * Manages node selection state within the graph.
 *
 * Features:
 * - Single node selection (one node selected at a time)
 * - Emits selection-changed events
 * - Manages selection style layer
 * - Updates node data with _selected property for style matching
 */
export class SelectionManager implements Manager {
    private selectedNode: Node | null = null;
    private selectionStyleLayer: StyleLayerType;
    private dataManager: DataManager | null = null;
    private styleManager: StyleManager | null = null;

    /**
     * Creates a new selection manager
     * @param eventManager - Event manager for emitting selection events
     */
    constructor(private eventManager: EventManager) {
        // Clone the default selection style to allow customization
        this.selectionStyleLayer = structuredClone(DEFAULT_SELECTION_STYLE);
    }

    /**
     * Initialize the selection manager
     */
    async init(): Promise<void> {
        // No async initialization needed
    }

    /**
     * Dispose the selection manager and clear selection
     */
    dispose(): void {
        // Clear selection on dispose
        if (this.selectedNode) {
            this.updateNodeSelectionData(this.selectedNode, false);
        }

        this.selectedNode = null;
    }

    /**
     * Set the DataManager reference.
     * Required for selectById() functionality.
     * @param dataManager - The data manager instance
     */
    setDataManager(dataManager: DataManager): void {
        this.dataManager = dataManager;
    }

    /**
     * Set the StyleManager reference.
     * Required for triggering style updates when selection changes.
     * @param styleManager - The style manager instance
     */
    setStyleManager(styleManager: StyleManager): void {
        this.styleManager = styleManager;
    }

    /**
     * Get the currently selected node.
     * @returns The selected node, or null if nothing is selected.
     */
    getSelectedNode(): Node | null {
        return this.selectedNode;
    }

    /**
     * Check if a specific node is currently selected.
     * @param node - The node to check.
     * @returns True if the node is selected, false otherwise.
     */
    isSelected(node: Node): boolean {
        return this.selectedNode === node;
    }

    /**
     * Select a node.
     * If another node is currently selected, it will be deselected first.
     * Emits a selection-changed event.
     * @param node - The node to select.
     */
    select(node: Node): void {
        // No-op if selecting the same node
        if (this.selectedNode === node) {
            return;
        }

        const previousNode = this.selectedNode;

        // Deselect previous node if any
        if (previousNode) {
            this.updateNodeSelectionData(previousNode, false);
        }

        // Select new node
        this.selectedNode = node;
        this.updateNodeSelectionData(node, true);

        // Emit event
        this.eventManager.emitSelectionChanged(previousNode, node);
    }

    /**
     * Select a node by its ID.
     * Requires DataManager to be set via setDataManager().
     * @param nodeId - The ID of the node to select.
     * @returns True if the node was found and selected, false if not found.
     */
    selectById(nodeId: string | number): boolean {
        if (!this.dataManager) {
            console.warn("[SelectionManager] Cannot selectById: DataManager not set");
            return false;
        }

        const node = this.dataManager.getNode(nodeId);
        if (!node) {
            return false;
        }

        this.select(node);
        return true;
    }

    /**
     * Deselect the currently selected node.
     * Emits a selection-changed event if a node was selected.
     */
    deselect(): void {
        if (!this.selectedNode) {
            return; // No-op if nothing selected
        }

        const previousNode = this.selectedNode;
        this.updateNodeSelectionData(previousNode, false);
        this.selectedNode = null;

        // Emit event
        this.eventManager.emitSelectionChanged(previousNode, null);
    }

    /**
     * Get the selection style layer.
     * This layer can be modified to customize the appearance of selected nodes.
     * @returns The selection style layer configuration.
     */
    getSelectionStyleLayer(): StyleLayerType {
        return this.selectionStyleLayer;
    }

    /**
     * Update the selection style layer.
     * Use this to customize the appearance of selected nodes.
     * @param layer - The new selection style layer configuration.
     */
    setSelectionStyleLayer(layer: StyleLayerType): void {
        // Ensure the layer has a name in metadata
        const metadata = layer.metadata ?? {};
        const name = (metadata as { name?: string }).name ?? "selection";
        this.selectionStyleLayer = {
            ...layer,
            metadata: { ...metadata, name },
        };
    }

    /**
     * Handle node removal.
     * Should be called when a node is removed from the graph.
     * If the removed node was selected, the selection is cleared.
     * @param node - The node being removed.
     */
    onNodeRemoved(node: Node): void {
        if (this.selectedNode === node) {
            this.selectedNode = null;
            // Don't emit event since the node is being removed
            // The event would reference a disposed node
        }
    }

    /**
     * Update the graphty.selected property in algorithmResults and trigger style recalculation.
     * Selection state is stored in algorithmResults.graphty.selected rather than data._selected
     * to keep the data object clean and ensure proper style layer interaction with algorithm styles.
     * @param node - The node to update
     * @param selected - Whether the node is selected
     */
    private updateNodeSelectionData(node: Node, selected: boolean): void {
        // Update the node algorithmResults with selection state
        // Uses the graphty namespace for graphty-specific computed values
        if (!node.algorithmResults.graphty) {
            node.algorithmResults.graphty = {};
        }
        node.algorithmResults.graphty.selected = selected;

        // Trigger style recalculation
        // StyleManager caches styles by data, so we need to recalculate
        if (this.styleManager) {
            const styles = this.styleManager.getStyles();
            const styleId = this.styleManager.getStyleForNode(node.data, node.algorithmResults);
            node.updateStyle(styleId);

            // Reload calculated values (e.g., HITS color/size, selection color) which repopulates styleUpdates
            // This is necessary because styleUpdates is cleared after each merge in update()
            // Pass algorithmResults so selection-based calculatedStyle selectors can match
            node.changeManager.loadCalculatedValues(
                styles.getCalculatedStylesForNode(node.data, node.algorithmResults),
                true,
            );

            // Call update() to merge the calculated style updates with the new base style
            // This ensures algorithm-computed styles like HITS colors/sizes are preserved
            node.update();
        } else {
            // Fallback: directly compute style via Styles class
            // This happens in tests where StyleManager isn't available
            const styles = Styles.default();
            const styleId = styles.getStyleForNode(node.data, node.algorithmResults);
            node.updateStyle(styleId);
        }
    }
}
