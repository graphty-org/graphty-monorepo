import { closestCenter, DndContext, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ActionIcon, Box, Group, Text, TextInput } from "@mantine/core";
import { Layers, Plus } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { LEFT_SIDEBAR_WIDTH } from "../../constants/layout";

interface LeftSidebarProps {
    className?: string;
    style?: React.CSSProperties;
    /**
     * Draw the list only, with no header and no padding of its own: the
     * enclosing `ControlSection` supplies the RT-8 header (32px, name
     * 12px/500) and the 16 | content | 8 band, per spec 6.9 and
     * StylePanel.dc.html:353-388.
     */
    embedded?: boolean;
    layers: LayerItem[];
    selectedLayerId: string | null;
    onLayersChange: (layers: LayerItem[]) => void;
    onLayerSelect: (layerId: string) => void;
    onAddLayer: () => void;
}

export interface LayerItem {
    id: string;
    name: string;
    /** Full metadata object from graphty-element */
    metadata?: Record<string, unknown>;
    styleLayer: {
        node?: {
            selector: string;
            style: Record<string, unknown>;
            calculatedStyle?: Record<string, unknown>;
        };
        edge?: {
            selector: string;
            style: Record<string, unknown>;
            calculatedStyle?: Record<string, unknown>;
        };
    };
}

interface SortableLayerItemProps {
    layer: LayerItem;
    isSelected: boolean;
    onSelect: (layerId: string) => void;
    onNameChange: (layerId: string, newName: string) => void;
}


/**
 * The drag handle's accessible name. The control is a grip with no word beside it,
 * so the name has to come from here (spec 04 section 8.2).
 */
const DRAG_HANDLE_LABEL = "Reorder this layer";

/**
 * The drag handle: a two-column grip of six dots.
 *
 * Drawn rather than typed. The row used to print the literal "\u22ee\u22ee" (two
 * VERTICAL ELLIPSIS characters), which breaks this project's plain-ASCII rule for
 * file content and depends on a glyph the user's font may not carry. The register
 * (REGISTER-1.5) publishes no drag verb, so this follows the same rule the panel
 * header's `MoreGlyph` already follows: the drawing comes from the board that draws
 * it rather than from a new register entry, at the register's 1.5 stroke weight.
 * @returns the six-dot grip.
 */
function DragHandleGlyph(): React.JSX.Element {
    return (
        <svg
            width={12}
            height={12}
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
        >
            <circle cx="6" cy="3.5" r="1.1" />
            <circle cx="6" cy="8" r="1.1" />
            <circle cx="6" cy="12.5" r="1.1" />
            <circle cx="10" cy="3.5" r="1.1" />
            <circle cx="10" cy="8" r="1.1" />
            <circle cx="10" cy="12.5" r="1.1" />
        </svg>
    );
}

function SortableLayerItem({ layer, isSelected, onSelect, onNameChange }: SortableLayerItemProps): React.JSX.Element {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layer.id });

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(layer.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    /*
     * The editor never outlives the name the app actually holds. `editName` is React
     * state on a row that survives a rename -- the React key is `layer.id`, which a
     * rename does not change -- so a single mount-time seed would let the box keep text
     * the app never accepted. That is the half of the rename defect a user sees as
     * "double-click it again and the new name IS in the box": the row was showing its
     * own uncommitted state. Re-seed while the editor is closed, so the only text it can
     * ever open on is the committed one, and so a deletion cannot carry a stale name
     * across: layer ids are index-derived (`layer-${index}`, layerConversion.ts:29), so
     * removing a layer makes the same id -- and therefore this same row instance -- name
     * a DIFFERENT layer.
     */
    useEffect(() => {
        if (!isEditing) {
            setEditName(layer.name);
        }
    }, [isEditing, layer.name]);

    const handleDoubleClick = (): void => {
        setEditName(layer.name);
        setIsEditing(true);
    };

    const handleBlur = (): void => {
        setIsEditing(false);
        if (editName.trim() !== "") {
            onNameChange(layer.id, editName.trim());
        } else {
            setEditName(layer.name);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === "Enter") {
            setIsEditing(false);
            if (editName.trim() !== "") {
                onNameChange(layer.id, editName.trim());
            } else {
                setEditName(layer.name);
            }
        } else if (e.key === "Escape") {
            setIsEditing(false);
            setEditName(layer.name);
        }
    };

    let backgroundColor = "var(--mantine-color-default-hover)";
    if (isSelected) {
        backgroundColor = "var(--mantine-color-blue-9)";
    } else if (isDragging) {
        backgroundColor = "var(--mantine-color-default)";
    }

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        padding: "4px 6px",
        backgroundColor,
        borderRadius: "4px",
        border: `1px solid ${isSelected ? "var(--mantine-color-blue-7)" : "var(--mantine-color-default-border)"}`,
        cursor: isDragging ? "grabbing" : "pointer",
        userSelect: "none" as const,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Box
            ref={setNodeRef}
            style={style}
            onClick={() => {
                onSelect(layer.id);
            }}
            onDoubleClick={handleDoubleClick}
        >
            {isEditing ? (
                <TextInput
                    ref={inputRef}
                    value={editName}
                    onChange={(e) => {
                        setEditName(e.currentTarget.value);
                    }}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    size="sm"
                    styles={{
                        input: {
                            backgroundColor: "var(--mantine-color-body)",
                            border: "1px solid var(--mantine-color-blue-5)",
                            padding: "0 4px",
                            height: "24px",
                            minHeight: "24px",
                        },
                    }}
                />
            ) : (
                <Group gap="xs" justify="space-between">
                    <Text size="sm">{layer.name}</Text>
                    <Box
                        {...attributes}
                        {...listeners}
                        aria-label={DRAG_HANDLE_LABEL}
                        data-testid="layer-drag-handle"
                        style={{ cursor: "grab", display: "flex", alignItems: "center" }}
                    >
                        <DragHandleGlyph />
                    </Box>
                </Group>
            )}
        </Box>
    );
}

/**
 * Left sidebar showing the layers list with drag-and-drop reordering.
 * @param root0 - Component props
 * @param root0.className - Optional CSS class name
 * @param root0.style - Optional inline styles
 * @param root0.embedded - Draw the list alone, letting an enclosing `ControlSection` draw the RT-8 header and its `+`
 * @param root0.layers - List of layer items
 * @param root0.selectedLayerId - ID of the currently selected layer
 * @param root0.onLayersChange - Called when layers are reordered
 * @param root0.onLayerSelect - Called when a layer is selected
 * @param root0.onAddLayer - Called when add layer button is clicked
 * @returns The left sidebar component
 */
export function LeftSidebar({
    className,
    style,
    embedded = false,
    layers,
    selectedLayerId,
    onLayersChange,
    onLayerSelect,
    onAddLayer,
}: LeftSidebarProps): React.JSX.Element {
    // The UI displays layers in reverse order (top = highest precedence),
    // but graphty-element stores them in order (last = highest precedence).
    // Create a reversed view for finding positions in the UI order.
    const reversedLayers = [...layers].reverse();

    const handleDragEnd = (event: DragEndEvent): void => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            // Find positions in the reversed (UI display) order
            const oldUIIndex = reversedLayers.findIndex((item) => item.id === active.id);
            const newUIIndex = reversedLayers.findIndex((item) => item.id === over.id);

            // Reorder in the reversed array (UI order)
            const newReversedItems = [...reversedLayers];
            const [movedItem] = newReversedItems.splice(oldUIIndex, 1);
            newReversedItems.splice(newUIIndex, 0, movedItem);

            // Reverse back to graphty-element order before calling the handler
            onLayersChange([...newReversedItems].reverse());
        }
    };

    const handleNameChange = (layerId: string, newName: string): void => {
        const updatedLayers = layers.map((layer) => (layer.id === layerId ? { ...layer, name: newName } : layer));
        onLayersChange(updatedLayers);
    };

    return (
        <Box
            /*
             * A panel section is already a `<section>` inside the panel's own landmark, so
             * the embedded path must not nest a second `<aside>` landmark inside it. The
             * standalone sidebar IS the complementary region and keeps its `<aside>`.
             */
            component={embedded ? "div" : "aside"}
            className={className}
            style={{
                display: "flex",
                flexDirection: "column",
                /*
                 * None of the sidebar's own chrome belongs inside a panel: the 260px width,
                 * the body fill, the divider on its right edge and the full-height stretch
                 * are what make it a region of the legacy shell, and the panel supplies all
                 * four itself. `overflow: hidden` goes with them -- the panel's scroll
                 * region owns the scrolling, and clipping here would cut a row mid-drag.
                 */
                ...(embedded
                    ? {}
                    : {
                          backgroundColor: "var(--mantine-color-body)",
                          borderRight: "1px solid var(--mantine-color-default-border)",
                          width: `${LEFT_SIDEBAR_WIDTH}px`,
                          minWidth: `${LEFT_SIDEBAR_WIDTH}px`,
                          height: "100%",
                          overflow: "hidden",
                      }),
                ...style,
            }}
        >
            {/* Sidebar Header -- the legacy shell's only.
                16 + 22 + 16 + 1 measures 55px, where spec 6.9 and VOCAB RT-8 fix a section
                header at 32px with `0 8px 0 16px` padding, a 12px/500 name, a chevron in the
                16px lead slot and no rule beneath it (StylePanel.dc.html:353-388). Rather
                than keep a second hand-built copy of an RT-8 header in the app, the embedded
                path draws none of this and the enclosing `ControlSection` draws the real one,
                with the `+` in its actions slot as `SectionAddButton`. */}
            {!embedded && (
                <Box
                    style={{
                        padding: "16px",
                        borderBottom: "1px solid var(--mantine-color-default-border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Group gap="xs">
                        <Layers size={16} />
                        <Text size="sm" fw={500}>
                            Layers
                        </Text>
                    </Group>
                    <ActionIcon variant="subtle" color="gray" size="sm" onClick={onAddLayer} aria-label="Add layer">
                        <Plus size={16} />
                    </ActionIcon>
                </Box>
            )}

            {/* Sidebar Content */}
            {/* Layers are displayed in reverse order so the TOP layer has HIGHEST precedence.
                graphty-element stores layers in order [low priority, ..., high priority]
                but in the UI, users expect the top layer to override lower layers. */}
            {/* Embedded, the band is `ControlSection`'s: it already pads 16 leading, 8
                trailing and 8 below (ControlSection.tsx:455-463), so a second 16px band here
                is the doubled padding the defect reports, and a nested `overflowY: auto`
                inside Mantine's `Collapse` would clip the list mid-animation. */}
            <Box style={embedded ? { padding: 0, overflow: "visible" } : { flex: 1, padding: "16px", overflowY: "auto" }}>
                {layers.length > 0 ? (
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext
                            items={[...layers].reverse().map((l) => l.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <Box style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {[...layers].reverse().map((layer) => (
                                    <SortableLayerItem
                                        key={layer.id}
                                        layer={layer}
                                        isSelected={layer.id === selectedLayerId}
                                        onSelect={onLayerSelect}
                                        onNameChange={handleNameChange}
                                    />
                                ))}
                            </Box>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <Box style={{ textAlign: "center", paddingTop: "32px", paddingBottom: "32px" }}>
                        <Text size="sm" c="dimmed">
                            Click the + button to add layers
                        </Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
