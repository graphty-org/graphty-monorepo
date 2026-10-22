import { ControlSection } from "@graphty/compact-mantine";
import type { BasemapStatusEvent } from "@graphty/graphty-element";
import { BASEMAP_SOURCE_DESCRIPTORS, type BasemapSourceDescriptor } from "@graphty/graphty-element/catalog";
import type { BasemapConfig, BasemapSourceId } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Select, Stack, TextInput } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { choiceOf, type Custom, CUSTOM_WORDS, MAP_SOURCE_FIELD_ID } from "./mapSource";

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
 * The address a custom basemap draws from.
 * @param basemap - the project's basemap, or undefined.
 * @returns the tile template or image URL, or "" for a named source.
 */
function addressOf(basemap: BasemapConfig | undefined): string {
    if (basemap === undefined || "source" in basemap) {
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
 * The basemap a custom address and credit make.
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
 * @param props.error - why the value does not work, shown beside it
 * @param props.onCommit - writes a new value
 * @returns The field
 */
function CommitField({
    label,
    value,
    error,
    onCommit,
}: Readonly<{ label: string; value: string; error?: string; onCommit: (next: string) => void }>): React.JSX.Element {
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
            error={error}
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
 * The Map section of Graph settings, drawn while the layout draws a map: which map lies under the
 * graph (the element's named sources by kind, None, or the reader's own tiles or image with its
 * credit). The basemap is the project's and goes through the session, one undo step per change.
 * The element draws the map's credits on the canvas.
 * @param props - Component props
 * @param props.session - The element's session
 * @returns The section
 */
export function MapSettings({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element {
    const { basemap } = session.config;
    const unreachable = useBasemapUnreachable();
    const set = choiceOf(basemap);
    // A custom entry is picked before its address is typed: an empty address is refused, so the
    // choice waits here until the address is written.
    const [picked, setPicked] = useState<Custom | null>(null);
    // A credit typed before the address waits here for it.
    const [pendingCredit, setPendingCredit] = useState("");
    // Once the setting changes (written here, undone, or a project opened), it is what shows.
    useEffect(() => {
        setPicked(null);
    }, [set]);
    const shown = picked ?? set;
    const custom: Custom | null = shown === "tiles" || shown === "image" ? shown : null;
    const address = addressOf(basemap);
    const credit = basemap !== undefined && !("source" in basemap) ? (basemap.attribution ?? "") : "";
    const sameKind = custom !== null && custom === set;

    return (
        <ControlSection label="Map" collapsible={false} headingLevel={3}>
            <Stack gap={6}>
                <Select
                    id={MAP_SOURCE_FIELD_ID}
                    size="xs"
                    label="Source"
                    allowDeselect={false}
                    value={shown}
                    data={CHOICES}
                    onChange={(value) => {
                        if (value === null) {
                            return;
                        }
                        if (value === "tiles" || value === "image") {
                            setPicked(value);
                            return;
                        }
                        const source = sourceId(value);
                        setPicked(null);
                        if (source !== undefined) {
                            void session.config.set({ basemap: { source } });
                        }
                    }}
                />
                {custom === null ? null : (
                    <>
                        <CommitField
                            label="Address"
                            error={sameKind && unreachable ? "Not reachable" : undefined}
                            value={sameKind ? address : ""}
                            onCommit={(next) => {
                                if (next !== "") {
                                    void session.config.set({
                                        basemap: customBasemap(custom, next, sameKind ? credit : pendingCredit),
                                    });
                                }
                            }}
                        />
                        <CommitField
                            label="Credit"
                            value={sameKind ? credit : pendingCredit}
                            onCommit={(next) => {
                                if (sameKind && address !== "") {
                                    void session.config.set({ basemap: customBasemap(custom, address, next) });
                                } else {
                                    setPendingCredit(next);
                                }
                            }}
                        />
                    </>
                )}
            </Stack>
        </ControlSection>
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
