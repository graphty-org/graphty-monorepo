import {
    moveTreeItem,
    PANEL_GRID,
    PANEL_INK,
    renameTreeItem,
    ToggleIconButton,
    Tree,
    UiGlyph,
} from "@graphty/compact-mantine";
import type { Layer } from "@graphty/graphty-element/session";
import { ActionIcon, ColorSwatch } from "@mantine/core";
import React, { useMemo } from "react";

import type { LayerRowFacts } from "./layerRowFacts";

/**
 * One row of the layer list: the element's own layer, unchanged. The element mints a stable
 * {@link Layer.id}, so the list draws the layer itself and every write names it by id.
 */
export type LayerItem = Layer;

export type { LayerRowFacts } from "./layerRowFacts";

/** The show/hide toggle's name; pressed means hidden. */
const HIDE_LAYER_LABEL = "Hide layer";
/** The delete button's name. */
const DELETE_LAYER_LABEL = "Delete layer";
/** Why an element-owned (locked) layer's delete is disabled, in floor item 4's "Verb. Reason" form. */
export const BASE_LAYER_DELETE_REASON = `${DELETE_LAYER_LABEL}. The base layer cannot be deleted: add a layer above it to restyle`;
/** Why an element-owned (locked) layer cannot be hidden. */
export const BASE_LAYER_HIDE_REASON = `${HIDE_LAYER_LABEL}. The base layer cannot be hidden: add a layer above it to restyle`;

/** Props of the style layer list. */
interface StyleLayerListProps {
    /** The style layers, in graphty-element's own order (last = highest precedence). */
    readonly layers: LayerItem[];
    /** Which layer is selected, or null. */
    readonly selectedLayerId: string | null;
    /**
     * Called with the reader's layers (locked ones left out) after a rename or a reorder, in
     * graphty-element's order.
     */
    readonly onLayersChange: (layers: LayerItem[]) => void;
    /** Selects a layer. */
    readonly onLayerSelect: (layerId: string) => void;
    /** Shows (true) or hides (false) a layer. */
    readonly onLayerEnabledChange?: (layerId: string, enabled: boolean) => void;
    /** Deletes a layer. */
    readonly onLayerDelete?: (layerId: string) => void;
    /** Each layer's match count and paint chip colour, by id. */
    readonly facts?: ReadonlyMap<string, LayerRowFacts>;
}

/**
 * The paint chip: the layer's colour, square for a box-shaped node layer, round otherwise.
 * @param props - the chip's props.
 * @param props.layer - the layer.
 * @param props.color - its colour.
 * @returns the chip.
 */
function PaintChip({ layer, color }: { readonly layer: LayerItem; readonly color: string }): React.JSX.Element {
    return (
        <ColorSwatch
            component="span"
            color={color}
            size={11}
            radius={layer.set?.["node.shape"] === "box" ? 2 : "xl"}
            withShadow={false}
            data-testid="layer-paint-chip"
        />
    );
}

/**
 * The style layers as a flat compact-mantine `Tree`: the topmost layer (highest precedence)
 * first, so the reader reads the stack top down, while graphty-element stores it bottom first.
 * No item has `children`, so a drop can only reorder, never nest. Double-click or F2 renames;
 * drag or Alt+ArrowUp / Alt+ArrowDown reorders. Each row carries the layer's paint chip, its
 * match count, and hover actions to hide and delete it. graphty-element's own (locked) layers
 * are drawn too, with their actions disabled and the reason in the title.
 * @param props - the list's props.
 * @param props.layers - the style layers, bottom first.
 * @param props.selectedLayerId - the selected layer's id, or null.
 * @param props.onLayersChange - called with the renamed or reordered list.
 * @param props.onLayerSelect - called with the selected layer's id.
 * @param props.onLayerEnabledChange - called to show or hide a layer.
 * @param props.onLayerDelete - called to delete a layer.
 * @param props.facts - each layer's match count and paint colour.
 * @returns the style layer list.
 */
export function StyleLayerList({
    layers,
    selectedLayerId,
    onLayersChange,
    onLayerSelect,
    onLayerEnabledChange,
    onLayerDelete,
    facts,
}: StyleLayerListProps): React.JSX.Element {
    const reversed = useMemo(() => [...layers].reverse(), [layers]);
    const lockedIds = useMemo(() => new Set(layers.filter((l) => l.locked).map((l) => l.id)), [layers]);
    const report = (next: LayerItem[]): void => {
        onLayersChange(next.filter((layer) => !layer.locked));
    };

    const items = reversed.map((layer) => {
        const { color, matched } = facts?.get(layer.id) ?? {};

        return {
            id: layer.id,
            name: layer.name,
            dimmed: !layer.enabled,
            swatch: color === undefined ? undefined : <PaintChip layer={layer} color={color} />,
            count: matched?.toLocaleString(),
            description: layer.enabled ? undefined : "Hidden",
            actions: (
                <>
                    <ToggleIconButton
                        variant="swap"
                        label={HIDE_LAYER_LABEL}
                        withTooltip={!layer.locked}
                        title={layer.locked ? BASE_LAYER_HIDE_REASON : undefined}
                        disabled={layer.locked}
                        checked={!layer.enabled}
                        icon={<UiGlyph name="eye" size={PANEL_GRID.GLYPH} />}
                        checkedIcon={<UiGlyph name="eyeClosed" size={PANEL_GRID.GLYPH} />}
                        onChange={(hidden) => {
                            onLayerEnabledChange?.(layer.id, !hidden);
                        }}
                    />
                    <ActionIcon
                        type="button"
                        variant="subtle"
                        size={PANEL_GRID.CONTROL_HEIGHT}
                        radius="sm"
                        c={layer.locked ? PANEL_INK.DISABLED : PANEL_INK.CHROME}
                        title={layer.locked ? BASE_LAYER_DELETE_REASON : DELETE_LAYER_LABEL}
                        aria-label={DELETE_LAYER_LABEL}
                        // `aria-disabled`, never `disabled`: a disabled button answers no pointer,
                        // so its reason (floor item 4) could never be read from its title.
                        aria-disabled={layer.locked || undefined}
                        data-disabled={layer.locked || undefined}
                        style={layer.locked ? { background: "transparent" } : undefined}
                        onClick={() => {
                            if (!layer.locked) {
                                onLayerDelete?.(layer.id);
                            }
                        }}
                    >
                        <UiGlyph name="minus" size={PANEL_GRID.GLYPH} />
                    </ActionIcon>
                </>
            ),
        };
    });

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
                if (trimmed !== "" && !lockedIds.has(id)) {
                    report(renameTreeItem(layers, id, trimmed));
                }
            }}
            onMove={(move) => {
                if (!lockedIds.has(move.id)) {
                    report(moveTreeItem(reversed, move).reverse());
                }
            }}
        />
    );
}
