import { ContextMenu } from "@graphty/compact-mantine";
import type { ShaderDescriptor, ShaderKind } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Menu, Text, TextInput, UnstyledButton } from "@mantine/core";
import React, { useState } from "react";

import { HEAVY_WORD, layersWord, shaderMatches, shaderProblemWords } from "./words";

/** A gallery choice that is not a shader: the Material row's Plain and Wireframe. */
export interface GalleryChoice {
    readonly value: string;
    readonly label: string;
}

/** Props for ShaderGallery. */
interface ShaderGalleryProps {
    readonly session: GraphSession;
    /** The kinds of shader the row takes. */
    readonly kinds: readonly ShaderKind[];
    /** Its search box's name. */
    readonly label: string;
    /** Choices before the shaders (Plain, Wireframe), picked by their value. */
    readonly choices?: readonly GalleryChoice[];
    /** The ids already on the layer, marked. */
    readonly marked?: readonly string[];
    /** Picks a shader by id, or a choice by its value. */
    readonly onPick: (id: string) => void;
    /** Opens Paste shader; absent: no Paste shader item. */
    readonly onPaste?: () => void;
    /** Deletes a pasted shader from the project; absent: no Delete from project. */
    readonly onDelete?: (id: string) => void;
}

/**
 * The shader gallery (shader-styles design, section 6.2): a search box first, with focus, then a
 * two-column grid of the catalog's shaders of the kinds the row takes, each its still picture and
 * name; the shaders pasted into the project after them, under "In this project". Hovering a tile
 * changes nothing on the canvas: only a pick writes. A heavy tile says so on a second line; a tile
 * the element cannot draw here is disabled with its reason, and is no Tab stop.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.kinds - the kinds the row takes
 * @param props.label - the search box's name
 * @param props.choices - choices before the shaders
 * @param props.marked - ids already on the layer
 * @param props.onPick - picks one
 * @param props.onPaste - opens Paste shader, the last item
 * @param props.onDelete - deletes a pasted shader, from its tile's context menu
 * @returns The gallery
 */
export function ShaderGallery({
    session,
    kinds,
    label,
    choices = [],
    marked = [],
    onPick,
    onPaste,
    onDelete,
}: Readonly<ShaderGalleryProps>): React.JSX.Element {
    const [query, setQuery] = useState("");
    const shaders = session.catalog
        .shaders()
        .filter((descriptor) => kinds.includes(descriptor.kind) && shaderMatches(descriptor, query));
    const shown = choices.filter((choice) => shaderMatches({ id: choice.value, plainName: choice.label }, query));
    const own = shaders.filter((descriptor) => descriptor.origin !== "pasted");
    const pasted = shaders.filter((descriptor) => descriptor.origin === "pasted");
    const tile = (descriptor: ShaderDescriptor): React.JSX.Element => {
        const available = session.shaders.availability(descriptor.id);
        const reason = available.ok ? undefined : shaderProblemWords(available.problem);
        return (
            <GalleryTile
                key={descriptor.id}
                id={descriptor.id}
                name={descriptor.plainName}
                picture={descriptor.thumbnail}
                second={reason ?? (descriptor.cost === "heavy" ? HEAVY_WORD : undefined)}
                disabled={reason !== undefined}
                marked={marked.includes(descriptor.id)}
                onPick={onPick}
            />
        );
    };
    return (
        <div className="ws-gallery" data-testid="shader-gallery">
            <TextInput
                size="xs"
                aria-label={label}
                placeholder="Search"
                data-autofocus
                value={query}
                onChange={(event) => {
                    setQuery(event.currentTarget.value);
                }}
            />
            <div className="ws-gallery-grid" role="list" aria-label={label}>
                {shown.map((choice) => (
                    <GalleryTile
                        key={choice.value}
                        id={choice.value}
                        name={choice.label}
                        marked={marked.includes(choice.value)}
                        onPick={onPick}
                    />
                ))}
                {own.map(tile)}
            </div>
            {pasted.length > 0 && (
                <>
                    <Text size="xs" c="dimmed" mt={4}>
                        In this project
                    </Text>
                    <div className="ws-gallery-grid" role="list" aria-label="In this project">
                        {pasted.map((descriptor) =>
                            onDelete === undefined ? (
                                tile(descriptor)
                            ) : (
                                <ContextMenu key={descriptor.id} target={tile(descriptor)}>
                                    <Menu.Item
                                        rightSection={layersWord(
                                            session.shaders.list().find((each) => each.id === descriptor.id)?.usedBy ??
                                                0,
                                        )}
                                        onClick={() => {
                                            onDelete(descriptor.id);
                                        }}
                                    >
                                        Delete from project
                                    </Menu.Item>
                                </ContextMenu>
                            ),
                        )}
                    </div>
                </>
            )}
            {own.length + pasted.length + shown.length === 0 && (
                <Text size="xs" c="dimmed">
                    No match
                </Text>
            )}
            {onPaste !== undefined && (
                <UnstyledButton className="ws-gallery-paste" onClick={onPaste}>
                    <Text size="xs">Paste shader...</Text>
                </UnstyledButton>
            )}
        </div>
    );
}

/**
 * One gallery tile: the still picture and the name, a second line when there is one.
 * @param props - Component props
 * @param props.id - what a pick hands back
 * @param props.name - the name
 * @param props.picture - the still picture, if any
 * @param props.second - the second line: Heavy, or why it cannot be picked
 * @param props.disabled - whether it cannot be picked here
 * @param props.marked - whether it is already on the layer
 * @param props.onPick - picks it
 * @returns The tile
 */
function GalleryTile({
    id,
    name,
    picture,
    second,
    disabled = false,
    marked,
    onPick,
    ...handlers
}: Readonly<
    // A context menu's handlers, on the tile's list item.
    Omit<React.HTMLAttributes<HTMLDivElement>, "id"> & {
        id: string;
        name: string;
        picture?: string;
        second?: string;
        disabled?: boolean;
        marked: boolean;
        onPick: (id: string) => void;
    }
>): React.JSX.Element {
    return (
        <div role="listitem" {...handlers}>
            <UnstyledButton
                className="ws-gallery-tile"
                data-shader={id}
                data-marked={marked ? "" : undefined}
                aria-pressed={marked}
                aria-disabled={disabled ? true : undefined}
                aria-description={disabled ? second : undefined}
                tabIndex={disabled ? -1 : undefined}
                title={disabled ? second : undefined}
                onClick={() => {
                    if (!disabled) {
                        onPick(id);
                    }
                }}
            >
                {picture === undefined ? (
                    <span className="ws-gallery-picture" aria-hidden />
                ) : (
                    <img className="ws-gallery-picture" src={picture} alt="" />
                )}
                <Text size="xs" truncate>
                    {name}
                </Text>
                {second !== undefined && (
                    <Text size="xs" c="dimmed" truncate>
                        {second}
                    </Text>
                )}
            </UnstyledButton>
        </div>
    );
}
