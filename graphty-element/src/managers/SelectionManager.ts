/**
 * @file Selection, on the view side.
 *
 * WHAT THIS USED TO BE, and why it had to change. Selection was expressed by writing
 * `algorithmResults.graphty.selected = true` onto a node's result bag and adding a style layer
 * whose selector read that flag. Three things were wrong with it and all three were structural:
 * the element's own highlight sat in the reader's layer stack and competed with the layers they
 * had actually asked for; selection rode on the algorithm-result path, so it was one of the sites
 * keeping the legacy result bags alive; and a second node could not be selected at all.
 *
 * WHAT IT IS NOW. The selection is TWO SETS held as masks by the session -- one byte per element,
 * addressed by the dense index every node and edge already carries -- and this class is a view-
 * side adapter over them. It owns no selection state: it writes through to the session's sets and
 * reads back from them, and the only thing it keeps of its own is an index from a selected id to
 * the render object for it, which is what the element's long-standing single-node API is answered
 * from.
 *
 * The highlight itself is drawn BY CONSTRUCTION -- `Node.setSelected` puts a halo mesh the element
 * owns around the node -- so it is not a layer, cannot be reordered, removed or overwritten by a
 * reader's styling, and never touches a material.
 */

import type { Node, NodeIdType } from "../Node";
import type { SelectionCause, SelectionOwner } from "../session/selection";
import type { DataManager } from "./DataManager";
import type { EventManager } from "./EventManager";
import type { Manager } from "./interfaces";

/**
 * Manages which nodes and edges are selected, as a view over the session's selection.
 *
 * The single-node surface (`select`, `deselect`, `getSelectedNode`, `isSelected`, `selectById`)
 * is what the element, the app and the XR input path have always called, and it keeps working:
 * `select` replaces the selection with one node, which is exactly what a click has always done.
 * The set-algebra surface belongs to the session's selection API, which this class writes to.
 */
export class SelectionManager implements Manager {
    /** The session's selection, once a host has bound one. */
    private selection: SelectionOwner | null = null;

    /**
     * The render objects for the selected nodes, in selection order.
     *
     * NOT the selection: the masks are. This is the view's index from a selected id to the `Node`
     * that draws it, which is what `getSelectedNode()` answers from and what lets the highlight be
     * switched on and off without a lookup through the data manager on every frame.
     */
    private readonly selectedNodes = new Map<NodeIdType, Node>();

    private dataManager: DataManager | null = null;

    /**
     * Creates a new selection manager
     * @param eventManager - Event manager for emitting selection events
     */
    constructor(private eventManager: EventManager) {}

    /**
     * Initialize the selection manager
     */
    async init(): Promise<void> {
        // No async initialization needed
    }

    /**
     * Dispose the selection manager and clear the selection it is showing
     */
    dispose(): void {
        for (const node of this.selectedNodes.values()) {
            node.setSelected(false);
        }

        this.selectedNodes.clear();
        this.selection?.clear();
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
     * Hand this view the session's selection to read and write.
     *
     * One selection per session, shared by every view of the dataset: binding is how this view
     * joins that rather than keeping a second, disagreeing answer.
     * @param selection - The session's selection.
     */
    bindSelection(selection: SelectionOwner): void {
        this.selection = selection;
    }

    /**
     * Get the currently selected node.
     * @returns The first selected node, or null if nothing is selected.
     */
    getSelectedNode(): Node | null {
        // The session's selection is the answer whenever there is one, because a caller can
        // change it without coming through this manager at all -- `Graph.select()` goes straight
        // to it. Answering from the local index instead made these two disagree: after
        // `select({ nodes: [1] })` the highlight drew and `isNodeSelected(1)` was true while this
        // returned null. The index below is only how a selected id is resolved to the object that
        // draws it.
        if (this.selection) {
            for (const id of this.selection.nodes) {
                const node = this.selectedNodes.get(id) ?? this.dataManager?.getNode(id);
                if (node) {
                    return node;
                }
            }

            return null;
        }

        for (const node of this.selectedNodes.values()) {
            return node;
        }

        return null;
    }

    /**
     * Check if a specific node is currently selected.
     * @param node - The node to check.
     * @returns True if the node is selected, false otherwise.
     */
    isSelected(node: Node): boolean {
        // Same rule as getSelectedNode: the session's masks are the selection, and this manager's
        // map is a view index. A node the mask cannot address -- one with no dense index, because
        // it never reached the store -- is not selected, which is the same answer the renderer
        // and `Graph.isNodeSelected()` already give for it.
        if (this.selection) {
            return this.selection.has(node.id);
        }

        return this.selectedNodes.get(node.id) === node;
    }

    /**
     * Select a node, replacing whatever was selected before.
     *
     * That is what a click means, and it is what this method has always done. Adding to, removing
     * from, toggling or intersecting the selection is the session selection's `apply`, which takes
     * the same five verbs for every target shape.
     * @param node - The node to select.
     */
    select(node: Node): void {
        if (this.selectedNodes.size === 1 && this.isSelected(node)) {
            return;
        }

        const previousNode = this.getSelectedNode();

        this.write([node], "user");

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
     * Deselect everything.
     * Emits a selection-changed event if anything was selected.
     */
    deselect(): void {
        const previousNode = this.getSelectedNode();

        if (previousNode === null) {
            return; // No-op if nothing selected
        }

        this.write([], "user");

        this.eventManager.emitSelectionChanged(previousNode, null);
    }

    /**
     * Handle node removal.
     * Should be called when a node is removed from the graph.
     * If the removed node was selected, it leaves the selection.
     * @param node - The node being removed.
     */
    onNodeRemoved(node: Node): void {
        if (this.selectedNodes.get(node.id) !== node) {
            return;
        }

        // No event: the node is on its way out, and an event carrying it would hand every
        // listener a reference to something that is about to be disposed.
        this.selectedNodes.delete(node.id);
        this.selection?.applyNow({ nodes: [node.id] }, "remove", "api");
    }

    /**
     * Write one selection through to the session and onto the render objects.
     *
     * The masks are the record; the highlight is switched by `Node.setSelected`, which is a mesh
     * operation and touches no style, no material and no layer. Nodes leaving the selection are
     * un-highlighted before the new ones are highlighted, so a node in both sets is never flashed
     * off and on again.
     * @param nodes - The nodes that should be selected afterwards.
     * @param cause - Who asked.
     */
    private write(nodes: readonly Node[], cause: SelectionCause): void {
        const next = new Map<NodeIdType, Node>();

        for (const node of nodes) {
            next.set(node.id, node);
        }

        for (const [id, node] of this.selectedNodes) {
            if (next.get(id) !== node) {
                node.setSelected(false);
            }
        }

        this.selectedNodes.clear();

        for (const [id, node] of next) {
            this.selectedNodes.set(id, node);
            node.setSelected(true);
        }

        this.selection?.applyNow({ nodes: nodes.map((node) => node.id) }, "replace", cause);
    }
}
