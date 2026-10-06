import { moveTreeItem, renameTreeItem, Tree } from "@graphty/compact-mantine";
import type { Layer } from "@graphty/graphty-element/session";
import React, { useMemo } from "react";

/**
 * One row of the layer list: the element's own layer, unchanged. The element mints a stable
 * {@link Layer.id}, so the list draws the layer itself and every write names it by id.
 */
export type LayerItem = Layer;

/** Props of the style layer list. */
interface StyleLayerListProps {
    /** The style layers, in graphty-element's own order (last = highest precedence). */
    readonly layers: LayerItem[];
    /** Which layer is selected, or null. */
    readonly selectedLayerId: string | null;
    /** Called with the whole list after a rename or a reorder, in graphty-element's order. */
    readonly onLayersChange: (layers: LayerItem[]) => void;
    /** Selects a layer. */
    readonly onLayerSelect: (layerId: string) => void;
}

/**
 * The style layers as a flat compact-mantine `Tree`: the topmost layer (highest precedence)
 * first, so the reader reads the stack top down, while graphty-element stores it bottom first.
 * No item has `children`, so a drop can only reorder, never nest. Double-click or F2 renames;
 * drag or Alt+ArrowUp / Alt+ArrowDown reorders.
 * @param props - the list's props.
 * @param props.layers - the style layers, bottom first.
 * @param props.selectedLayerId - the selected layer's id, or null.
 * @param props.onLayersChange - called with the renamed or reordered list.
 * @param props.onLayerSelect - called with the selected layer's id.
 * @returns the style layer list.
 */
export function StyleLayerList({
    layers,
    selectedLayerId,
    onLayersChange,
    onLayerSelect,
}: StyleLayerListProps): React.JSX.Element {
    const reversed = useMemo(() => [...layers].reverse(), [layers]);
    const items = useMemo(() => reversed.map(({ id, name }) => ({ id, name })), [reversed]);

    return (
        <Tree
            items={items}
            label="Style layers"
            renameLabel="Layer name"
            multiselect={false}
            selected={selectedLayerId === null ? [] : [selectedLayerId]}
            onSelect={(ids) => {
                if (ids.length > 0) {
                    onLayerSelect(ids[0]);
                }
            }}
            onRename={(id, name) => {
                const trimmed = name.trim();
                if (trimmed !== "") {
                    onLayersChange(renameTreeItem(layers, id, trimmed));
                }
            }}
            onMove={(move) => {
                onLayersChange(moveTreeItem(reversed, move).reverse());
            }}
        />
    );
}
