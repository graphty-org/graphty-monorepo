import { ContextMenu } from "@graphty/compact-mantine";
import type { ShaderDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Menu, Text, TextInput, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useRef, useState } from "react";

import {
    HEAVY_TIP,
    HEAVY_WORD,
    layersWord,
    shaderMatches,
    shaderProblemWords,
    type ShaderSlotKind,
    shaderSlotKindOf,
} from "./words";

/** The gallery's columns, which Up and Down move across. */
const COLUMNS = 2;

/**
 * Moves focus among the gallery's tiles, one Tab stop for all of them (decided.md's grids): the
 * arrows move by one tile or one row and stop at the ends, Home and End go to the first and last.
 * Disabled tiles are passed over.
 * @param event - the key, on a tile.
 * @param root - the gallery.
 */
function roveKey(event: React.KeyboardEvent, root: HTMLElement | null): void {
    const tiles = [...(root?.querySelectorAll<HTMLElement>(".ws-gallery-tile:not([aria-disabled])") ?? [])];
    const at = tiles.indexOf(event.target as HTMLElement);
    if (at < 0) {
        return;
    }
    const moves: Record<string, number> = {
        ArrowRight: at + 1,
        ArrowLeft: at - 1,
        ArrowDown: at + COLUMNS,
        ArrowUp: at - COLUMNS,
        Home: 0,
        End: tiles.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) {
        return;
    }
    event.preventDefault();
    tiles[Math.max(0, Math.min(next, tiles.length - 1))]?.focus();
}

/** A gallery choice that is not a shader: the Material row's Plain and Wireframe. */
export interface GalleryChoice {
    readonly value: string;
    readonly label: string;
    /** Its still picture, as a shader's thumbnail. */
    readonly picture?: string;
}

/** Props for ShaderGallery. */
interface ShaderGalleryProps {
    readonly session: GraphSession;
    /** The kinds of shader the row takes. */
    readonly kinds: readonly ShaderSlotKind[];
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
 * name; the shaders pasted into the project after them, under "In this project"; Paste shader...
 * pinned at the foot. The tiles are one Tab stop: the arrows move among them (ArrowDown from the
 * search box enters them), and the one on the layer is marked as current. Hovering a tile changes
 * nothing on the canvas: only a pick writes. A heavy tile says so on a second line, with a
 * tooltip; a tile the element cannot draw here is disabled with its reason and is passed over.
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
    const root = useRef<HTMLDivElement>(null);
    // The tile that is the gallery's one Tab stop: the last one focused, else the first.
    const [stop, setStop] = useState<string | null>(null);
    const shaders = session.catalog
        .shaders()
        .filter((descriptor) => kinds.includes(shaderSlotKindOf(descriptor)) && shaderMatches(descriptor, query));
    const shown = choices.filter((choice) => shaderMatches({ id: choice.value, plainName: choice.label }, query));
    const own = shaders.filter((descriptor) => descriptor.origin !== "pasted");
    const pasted = shaders.filter((descriptor) => descriptor.origin === "pasted");
    const reasons = new Map(
        shaders.map((descriptor) => {
            const available = session.shaders.availability(descriptor.id);
            return [descriptor.id, available.ok ? undefined : shaderProblemWords(available.problem)] as const;
        }),
    );
    // The Tab stop: the tile last focused while it is still shown and can be picked, else the one
    // on the layer, else the first.
    const pickable = [
        ...shown.map((choice) => choice.value),
        ...[...own, ...pasted]
            .filter((descriptor) => reasons.get(descriptor.id) === undefined)
            .map((descriptor) => descriptor.id),
    ];
    const tabStop = [stop, ...marked].find((id) => id !== null && pickable.includes(id)) ?? pickable[0];
    const tile = (descriptor: ShaderDescriptor): React.JSX.Element => {
        const reason = reasons.get(descriptor.id);
        return (
            <GalleryTile
                key={descriptor.id}
                id={descriptor.id}
                name={descriptor.plainName}
                picture={descriptor.thumbnail}
                second={reason ?? (descriptor.cost === "heavy" ? HEAVY_WORD : undefined)}
                tip={reason === undefined && descriptor.cost === "heavy" ? HEAVY_TIP : undefined}
                disabled={reason !== undefined}
                marked={marked.includes(descriptor.id)}
                stop={tabStop === descriptor.id}
                onPick={onPick}
            />
        );
    };
    return (
        <div // NOSONAR(S6848): catches arrow keys and focus bubbling from its own tiles to rove the tab stop
            ref={root}
            className="ws-gallery"
            data-testid="shader-gallery"
            onKeyDown={(event) => {
                roveKey(event, root.current);
            }}
            onFocus={(event) => {
                const id = (event.target as HTMLElement).dataset.shader;
                if (id !== undefined && (event.target as HTMLElement).classList.contains("ws-gallery-tile")) {
                    setStop(id);
                }
            }}
        >
            <TextInput
                size="xs"
                aria-label={label}
                placeholder="Search"
                data-autofocus
                value={query}
                onChange={(event) => {
                    setQuery(event.currentTarget.value);
                }}
                onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                        event.preventDefault();
                        root.current?.querySelector<HTMLElement>('.ws-gallery-tile[tabindex="0"]')?.focus();
                    }
                }}
            />
            <div // NOSONAR(S6819): a CSS grid of tiles; a ul would bring its own margin, padding and bullets
                className="ws-gallery-grid"
                role="list"
                aria-label={label}
            >
                {shown.map((choice) => (
                    <GalleryTile
                        key={choice.value}
                        id={choice.value}
                        name={choice.label}
                        picture={choice.picture}
                        marked={marked.includes(choice.value)}
                        stop={tabStop === choice.value}
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
                    <div // NOSONAR(S6819): a CSS grid of tiles; a ul would bring its own margin, padding and bullets
                        className="ws-gallery-grid"
                        role="list"
                        aria-label="In this project"
                    >
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
                // Pinned at the foot of the pop-out, so it is in view however long the grid is.
                <div className="ws-gallery-foot">
                    <UnstyledButton className="ws-gallery-paste" onClick={onPaste}>
                        <Text size="xs">Paste shader...</Text>
                    </UnstyledButton>
                </div>
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
 * @param props.tip - the tooltip, for a second line that needs saying more (Heavy)
 * @param props.disabled - whether it cannot be picked here
 * @param props.marked - whether it is already on the layer
 * @param props.stop - whether it is the gallery's one Tab stop
 * @param props.onPick - picks it
 * @returns The tile
 */
function GalleryTile({
    id,
    name,
    picture,
    second,
    tip,
    disabled = false,
    marked,
    stop,
    onPick,
    ...handlers
}: Readonly<
    // A context menu's handlers, on the tile's list item.
    Omit<React.HTMLAttributes<HTMLDivElement>, "id"> & {
        id: string;
        name: string;
        picture?: string;
        second?: string;
        tip?: string;
        disabled?: boolean;
        marked: boolean;
        stop: boolean;
        onPick: (id: string) => void;
    }
>): React.JSX.Element {
    const button = (
        <UnstyledButton
            className="ws-gallery-tile"
            data-shader={id}
            data-marked={marked ? "" : undefined}
            aria-current={marked ? "true" : undefined}
            aria-disabled={disabled ? true : undefined}
            aria-description={disabled ? second : tip}
            tabIndex={stop && !disabled ? 0 : -1}
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
    );
    return (
        <div // NOSONAR(S6819): an item of the gallery's ARIA list, a div for the same reason as the list
            role="listitem"
            {...handlers}
        >
            {tip === undefined ? button : <Tooltip label={tip}>{button}</Tooltip>}
        </div>
    );
}
