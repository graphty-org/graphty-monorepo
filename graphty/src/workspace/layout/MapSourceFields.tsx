import { FileSource } from "@graphty/compact-mantine";
import type { BasemapStatusEvent } from "@graphty/graphty-element";
import { BASEMAP_SOURCE_DESCRIPTORS, type BasemapSourceDescriptor } from "@graphty/graphty-element/catalog";
import type { BasemapConfig, BasemapSourceId } from "@graphty/graphty-element/schema";
import { Input, Select, Stack, TextInput } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { readDataUrl } from "../start/open";
import { useWorkspace } from "../state/WorkspaceContext";

/** The list's values for a map of the reader's own, beside the catalog's source ids. */
type Custom = "tiles" | "image";

/** The app's word for a map of the reader's own, by kind. */
const CUSTOM_WORDS: Readonly<Record<Custom, string>> = { tiles: "Tiles", image: "Image" };

/** The bundled world map, drawn when no map is set. */
const DEFAULT_SOURCE = "natural-earth";

/**
 * Which list entry a map is.
 * @param basemap - the layout's map, or null or undefined for the bundled world.
 * @returns the entry's value.
 */
function choiceOf(basemap: BasemapConfig | null | undefined): string {
    if (basemap === undefined || basemap === null) {
        return DEFAULT_SOURCE;
    }
    if ("source" in basemap) {
        return basemap.source;
    }
    return "tiles" in basemap ? "tiles" : "image";
}

/** The app's word for each kind of map the element's catalog names, in the order the list shows them. */
const KIND_WORDS: Readonly<Record<BasemapSourceDescriptor["kind"], string>> = {
    plain: "Plain",
    light: "Light",
    satellite: "Satellite",
    streets: "Streets",
    terrain: "Topographic",
};

/** The Map list: the catalog's sources grouped by kind, then None and the reader's own. */
const CHOICES = [
    ...(Object.keys(KIND_WORDS) as BasemapSourceDescriptor["kind"][]).map((kind) => ({
        group: KIND_WORDS[kind],
        items: BASEMAP_SOURCE_DESCRIPTORS.filter((source) => source.kind === kind).map((source) => ({
            value: source.id,
            label: source.coverage === "us" ? `${source.plainName} (US)` : source.plainName,
        })),
    })),
    {
        group: "Custom",
        items: [
            { value: "tiles", label: CUSTOM_WORDS.tiles },
            { value: "image", label: CUSTOM_WORDS.image },
        ],
    },
    { group: "Off", items: [{ value: "none", label: "None" }] },
];

/**
 * The address a custom map draws from.
 * @param basemap - the layout's map, or null or undefined.
 * @returns the tile template or image URL, or "" for a named source.
 */
function addressOf(basemap: BasemapConfig | null | undefined): string {
    if (basemap === undefined || basemap === null || "source" in basemap) {
        return "";
    }
    return "tiles" in basemap ? basemap.tiles : basemap.image;
}

/**
 * A named source's id, from a list value.
 * @param value - the list value.
 * @returns the id, or undefined when the value names no source.
 */
function sourceId(value: string): BasemapSourceId | undefined {
    return value === "none" ? "none" : BASEMAP_SOURCE_DESCRIPTORS.find((source) => source.id === value)?.id;
}

/**
 * The map a custom address and credit make.
 * @param kind - tiles or one image.
 * @param address - the URL (a tile template for tiles).
 * @param credit - the credit the provider requires.
 * @returns the basemap.
 */
function customBasemap(kind: Custom, address: string, credit: string): BasemapConfig {
    if (kind === "tiles") {
        return { tiles: address, attribution: credit };
    }
    return credit === "" ? { image: address } : { image: address, attribution: credit };
}

/**
 * A text field written when it is left or Enter is pressed.
 * @param props - Component props
 * @param props.label - the field's label
 * @param props.value - the value in effect
 * @param props.onCommit - writes a new value
 * @returns The field
 */
function CommitField({
    label,
    value,
    onCommit,
}: Readonly<{ label: string; value: string; onCommit: (next: string) => void }>): React.JSX.Element {
    const commit = (event: React.SyntheticEvent<HTMLInputElement>): void => {
        const next = event.currentTarget.value.trim();
        if (next !== value) {
            onCommit(next);
        }
    };
    return (
        <TextInput
            key={value}
            size="xs"
            label={label}
            defaultValue={value}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    commit(event);
                }
            }}
        />
    );
}

/**
 * The Map layout's map: which map lies under the graph (the element's named sources by kind, None,
 * or the reader's own tiles or image with its credit), written as the layout's `map` option. The
 * element draws the map's credits on the canvas.
 * @param props - Component props
 * @param props.value - The `map` option, or null or undefined for the bundled world
 * @param props.onChange - Writes a new map
 * @returns The fields
 */
export function MapSourceFields({
    value,
    onChange,
}: Readonly<{ value: BasemapConfig | null | undefined; onChange: (next: BasemapConfig) => void }>): React.JSX.Element {
    const unreachable = useBasemapUnreachable();
    const set = choiceOf(value);
    // A custom entry is picked before its address is typed: an empty address is refused, so the
    // choice waits here until the address is written.
    const [picked, setPicked] = useState<Custom | null>(null);
    // A credit typed before the address waits here for it.
    const [pendingCredit, setPendingCredit] = useState("");
    // Once the map changes (written here, undone, or a project opened), it is what shows.
    useEffect(() => {
        setPicked(null);
    }, [set]);
    const shown = picked ?? set;
    const custom: Custom | null = shown === "tiles" || shown === "image" ? shown : null;
    const address = addressOf(value);
    const credit = value !== undefined && value !== null && !("source" in value) ? (value.attribution ?? "") : "";
    const sameKind = custom !== null && custom === set;

    return (
        <Stack gap={6}>
            <Select
                size="xs"
                label="Map"
                allowDeselect={false}
                // The list stays inside the popover, so picking from it is not an outside click.
                comboboxProps={{ withinPortal: false }}
                value={shown}
                data={CHOICES}
                onChange={(next) => {
                    if (next === null) {
                        return;
                    }
                    if (next === "tiles" || next === "image") {
                        setPicked(next);
                        return;
                    }
                    const source = sourceId(next);
                    setPicked(null);
                    if (source !== undefined) {
                        onChange({ source });
                    }
                }}
            />
            {custom === null ? null : (
                <>
                    {/* An address typed in (Enter), or an image from this computer, chosen or
                        dropped on the row, which makes the map one image. */}
                    <Input.Wrapper
                        size="xs"
                        label="Address"
                        error={sameKind && unreachable ? "Not reachable" : undefined}
                    >
                        <FileSource
                            variant="row"
                            url
                            accept="image/*"
                            placeholder="Address"
                            defaultValue={sameKind && !address.startsWith("data:") ? address : ""}
                            label="Upload image"
                            onUrl={(next) => {
                                onChange(customBasemap(custom, next, sameKind ? credit : pendingCredit));
                            }}
                            onFiles={([file]) => {
                                void readDataUrl(file).then((data) => {
                                    onChange(customBasemap("image", data, sameKind ? credit : pendingCredit));
                                });
                            }}
                        />
                    </Input.Wrapper>
                    <CommitField
                        label="Credit"
                        value={sameKind ? credit : pendingCredit}
                        onCommit={(next) => {
                            if (sameKind && address !== "") {
                                onChange(customBasemap(custom, address, next));
                            } else {
                                setPendingCredit(next);
                            }
                        }}
                    />
                </>
            )}
        </Stack>
    );
}

/**
 * Whether the element says the map's tiles cannot be reached (it fell back to the bundled world),
 * read from its `basemap-status` event.
 * @returns True while they cannot.
 */
function useBasemapUnreachable(): boolean {
    const { element } = useWorkspace();
    const [unreachable, setUnreachable] = useState(element?.basemapStatus.state === "fallback");
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        const onStatus = (event: CustomEvent<BasemapStatusEvent>): void => {
            setUnreachable(event.detail.error?.code === "E_BASEMAP_UNREACHABLE");
        };
        setUnreachable(element.basemapStatus.state === "fallback");
        element.addEventListener("basemap-status", onStatus);
        return () => {
            element.removeEventListener("basemap-status", onStatus);
        };
    }, [element]);
    return unreachable;
}
