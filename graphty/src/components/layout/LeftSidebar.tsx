import {closestCenter, DndContext, DragEndEvent} from "@dnd-kit/core";
import {SortableContext, useSortable, verticalListSortingStrategy} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {ActionIcon, Box, Group, Text, TextInput} from "@mantine/core";
import {Layers, Plus} from "lucide-react";
import React, {useEffect, useRef, useState} from "react";

interface LeftSidebarProps {
    className?: string;
    style?: React.CSSProperties;
    layers: LayerItem[];
    selectedLayerId: string | null;
    onLayersChange: (layers: LayerItem[]) => void;
    onLayerSelect: (layerId: string) => void;
    onAddLayer: () => void;
}

export interface LayerItem {
    id: string;
    name: string;
    styleLayer: {
        node?: {
            selector: string;
            style: Record<string, unknown>;
        };
        edge?: {
            selector: string;
            style: Record<string, unknown>;
        };
    };
}

interface SortableLayerItemProps {
    layer: LayerItem;
    isSelected: boolean;
    onSelect: (layerId: string) => void;
    onNameChange: (layerId: string, newName: string) => void;
}

function SortableLayerItem({layer, isSelected, onSelect, onNameChange}: SortableLayerItemProps): React.JSX.Element {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({id: layer.id});

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(layer.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = (): void => {
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
                    <Text size="sm">
                        {layer.name}
                    </Text>
                    <Box
                        {...attributes}
                        {...listeners}
                        style={{cursor: "grab", display: "flex", alignItems: "center"}}
                    >
                        <Text size="xs" c="dimmed">
                            ⋮⋮
                        </Text>
                    </Box>
                </Group>
            )}
        </Box>
    );
}

export function LeftSidebar({
    className,
    style,
    layers,
    selectedLayerId,
    onLayersChange,
    onLayerSelect,
    onAddLayer,
}: LeftSidebarProps): React.JSX.Element {
    const handleDragEnd = (event: DragEndEvent): void => {
        const {active, over} = event;

        if (over && active.id !== over.id) {
            const oldIndex = layers.findIndex((item) => item.id === active.id);
            const newIndex = layers.findIndex((item) => item.id === over.id);

            const newItems = [... layers];
            const [movedItem] = newItems.splice(oldIndex, 1);
            newItems.splice(newIndex, 0, movedItem);

            onLayersChange(newItems);
        }
    };

    const handleNameChange = (layerId: string, newName: string): void => {
        const updatedLayers = layers.map((layer) =>
            layer.id === layerId ? {... layer, name: newName} : layer,
        );
        onLayersChange(updatedLayers);
    };

    return (
        <Box
            component="aside"
            className={className}
            style={{
                backgroundColor: "var(--mantine-color-body)",
                borderRight: "1px solid var(--mantine-color-default-border)",
                display: "flex",
                flexDirection: "column",
                width: "280px",
                minWidth: "280px",
                height: "100%",
                overflow: "hidden",
                ... style,
            }}
        >
            {/* Sidebar Header */}
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
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={onAddLayer}
                    aria-label="Add layer"
                >
                    <Plus size={16} />
                </ActionIcon>
            </Box>

            {/* Sidebar Content */}
            <Box style={{flex: 1, padding: "16px", overflowY: "auto"}}>
                {layers.length > 0 ? (
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={layers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                            <Box style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                                {layers.map((layer) => (
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
                    <Box style={{textAlign: "center", paddingTop: "32px", paddingBottom: "32px"}}>
                        <Text size="sm" c="dimmed">
                            Click the + button to add layers
                        </Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
