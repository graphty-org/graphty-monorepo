import { ContextMenu } from "@graphty/compact-mantine";
import { shaderAnimates, type ShaderDescriptor, type ShaderPlace } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Chip, Group, Menu, Text, TextInput, Tooltip, UnstyledButton, VisuallyHidden } from "@mantine/core";
import React, { useId, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import {
    GALLERY_WORDS,
    layersWord,
    matchesWordStart,
    OPTION_TILE_WORDS,
    ORIGIN_FILTERS,
    placeWords,
    SHADER_FACT_WORDS,
    shaderMatches,
    shaderProblemWords,
    type ShaderTab,
} from "./words";

/** The gallery's columns, which Up and Down move across. */
const COLUMNS = 2;

/** A tile for one of the tab's own style options (Outline, Glow, Halo, Wireframe, Band), found by search. */
export interface OptionTile {
    /** What a pick hands back: the option's key in its section's "+". */
    readonly key: string;
    readonly label: string;
}

/**
 * A small picture of where a place draws, beside its words: a node (a circle) and what the place
 * adds. A diagram explains the words; it never stands for them.
 * @param props - Component props
 * @param props.place - the place
 * @param props.tab - the tab, for an edge's line
 * @returns The picture
 */
export function PlaceDiagram({
    place,
    tab = "node",
}: Readonly<{ place: ShaderPlace | undefined; tab?: ShaderTab }>): React.JSX.Element {
    const ink = "currentColor";
    let body: React.ReactNode;
    if (tab === "edge") {
        body =
            place === "along" ? (
                <>
                    <line x1={1} y1={8} x2={15} y2={8} stroke={ink} strokeWidth={1} />
                    <circle cx={5} cy={8} r={1.6} fill={ink} />
                    <circle cx={11} cy={8} r={1.6} fill={ink} />
                </>
            ) : (
                <line x1={1} y1={8} x2={15} y2={8} stroke={ink} strokeWidth={3} />
            );
    } else {
        switch (place) {
            case "replace":
                body = (
                    <>
                        <circle cx={8} cy={8} r={4} fill="none" stroke={ink} strokeDasharray="1.5 1.5" />
                        <path
                            d="M8 3.5 L9.4 6.6 L12.6 6.8 L10.1 8.9 L10.9 12 L8 10.3 L5.1 12 L5.9 8.9 L3.4 6.8 L6.6 6.6 Z"
                            fill={ink}
                        />
                    </>
                );
                break;
            case "around":
                body = (
                    <>
                        <circle cx={8} cy={8} r={3.5} fill={ink} />
                        <circle cx={8} cy={8} r={6.5} fill="none" stroke={ink} />
                    </>
                );
                break;
            case "behind":
                body = (
                    <>
                        <circle cx={9.5} cy={9.5} r={5.5} fill={ink} opacity={0.35} />
                        <circle cx={7} cy={7} r={4} fill="none" stroke={ink} />
                    </>
                );
                break;
            case "group":
                body = (
                    <>
                        <rect x={1.5} y={2.5} width={13} height={11} rx={5} fill="none" stroke={ink} />
                        <circle cx={5} cy={6.5} r={1.5} fill={ink} />
                        <circle cx={10.5} cy={6} r={1.5} fill={ink} />
                        <circle cx={8} cy={10.5} r={1.5} fill={ink} />
                    </>
                );
                break;
            default:
                body = <circle cx={8} cy={8} r={5} fill={ink} />;
        }
    }
    return (
        <svg className="ws-place-diagram" viewBox="0 0 16 16" width={14} height={14} aria-hidden>
            {body}
        </svg>
    );
}

/**
 * The tile's three neutral facts as small icons, each with its words as its text alternative:
 * whether it animates, its cost, whether it reacts to the scene's light.
 * @param props - Component props
 * @param props.descriptor - the shader
 * @returns The icons
 */
export function ShaderFacts({ descriptor }: Readonly<{ descriptor: ShaderDescriptor }>): React.JSX.Element {
    return (
        <span className="ws-shader-facts">
            {factsOf(descriptor).map(({ key, icon: Icon, words }) => (
                <span key={key} title={words} data-fact={key} data-cost={key === "cost" ? descriptor.cost : undefined}>
                    <Icon size={11} role="img" aria-label={words} />
                </span>
            ))}
        </span>
    );
}

/**
 * A shader's three neutral facts, each with its icon and its words.
 * @param descriptor - the shader
 * @returns The facts that apply, in order.
 */
function factsOf(descriptor: ShaderDescriptor): { key: string; icon: (typeof GLYPHS)["cost"]; words: string }[] {
    return [
        ...(shaderAnimates(descriptor)
            ? [{ key: "animates", icon: GLYPHS.animates, words: SHADER_FACT_WORDS.animates }]
            : []),
        { key: "cost", icon: GLYPHS.cost, words: SHADER_FACT_WORDS.cost(descriptor.cost) },
        ...(descriptor.reads.includes("light")
            ? [{ key: "light", icon: GLYPHS.light, words: SHADER_FACT_WORDS.light }]
            : []),
    ];
}

/**
 * The shaders a tab's gallery lists: node and group-outline shaders on the Node tab, edge shaders
 * on the Edge tab, background shaders on the Background.
 * @param descriptor - the catalog's entry.
 * @param tab - the tab.
 * @returns true when the tab lists it.
 */
function onTab(descriptor: ShaderDescriptor, tab: ShaderTab): boolean {
    return tab === "node" ? descriptor.target === "node" || descriptor.target === "group" : descriptor.target === tab;
}

/**
 * Whether a shader passes the origin filter.
 * @param descriptor - the catalog's entry.
 * @param origin - the chip picked.
 * @returns true when it shows.
 */
function inOrigin(descriptor: ShaderDescriptor, origin: string): boolean {
    if (origin === "builtIn") {
        return descriptor.origin === "element";
    }
    return origin === "project" ? descriptor.origin === "pasted" : true;
}

/**
 * Where a shader that is not built in came from: "This project", or its registrant's namespace.
 * @param descriptor - the catalog's entry.
 * @returns the words, or undefined for a built-in shader.
 */
function originWords(descriptor: ShaderDescriptor): string | undefined {
    if (descriptor.origin === "pasted") {
        return GALLERY_WORDS.project;
    }
    return descriptor.origin === "registered" ? descriptor.id.split("/")[0] : undefined;
}

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

/** Props for ShaderGallery. */
interface ShaderGalleryProps {
    readonly session: GraphSession;
    /** The list it opens for: a tab's Shaders, or the Background. */
    readonly tab: ShaderTab;
    /** The tab's own style options, shown as tiles when a search finds them. */
    readonly options?: readonly OptionTile[];
    /** The ids already in the list, marked. */
    readonly marked?: readonly string[];
    /** Picks a shader by id. */
    readonly onPick: (id: string) => void;
    /** Picks one of the tab's style options by its key. */
    readonly onOption?: (key: string) => void;
    /** Opens the code dialog, whose first field is the place; absent: no "New shader...". */
    readonly onNew?: () => void;
    /** Deletes a project shader from the project; absent: no Delete from project. */
    readonly onDelete?: (id: string) => void;
}

/**
 * The one shader gallery (decisions-v2, section 2.2), the same from the Node tab, the Edge tab and
 * the Background: "New shader..." first, at the top of the box; a search field with focus; under it
 * the origin filter, a row of chips that wraps; then the tiles, buttons the arrows move through,
 * each its picture, name, place badge and the animates, cost and light facts. Choosing a shader
 * asks no place: each shader draws at its own, and the place is asked only by New shader. A search
 * also finds the tab's own style options (Outline, Glow, Halo, Wireframe; Band), shown as tiles marked as Shape or Line options, so a reader who types "glow"
 * learns it is an option. Enter in the search picks the tile whose name the search names, else
 * the first. Hovering a tile changes nothing on the canvas: only a pick writes.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.tab - the list it opens for
 * @param props.options - the tab's own style options
 * @param props.marked - ids already in the list
 * @param props.onPick - picks a shader
 * @param props.onOption - picks a style option
 * @param props.onNew - opens the code dialog
 * @param props.onDelete - deletes a project shader, from its tile's context menu
 * @returns The gallery
 */
export function ShaderGallery({
    session,
    tab,
    options = [],
    marked = [],
    onPick,
    onOption,
    onNew,
    onDelete,
}: Readonly<ShaderGalleryProps>): React.JSX.Element {
    const [query, setQuery] = useState("");
    const [origin, setOrigin] = useState("all");
    const root = useRef<HTMLDivElement>(null);
    // The tile that is the gallery's one Tab stop: the last one focused, else the first.
    const [stop, setStop] = useState<string | null>(null);
    const shaders = session.catalog
        .shaders()
        .filter(
            (descriptor) => onTab(descriptor, tab) && inOrigin(descriptor, origin) && shaderMatches(descriptor, query),
        );
    const found = query.trim() === "" ? [] : options.filter((option) => matchesWordStart(option.label, query));
    const reasons = new Map(
        shaders.map((descriptor) => {
            const available = session.shaders.availability(descriptor.id);
            return [descriptor.id, available.ok ? undefined : shaderProblemWords(available.problem)] as const;
        }),
    );
    const pickable = [
        ...found.map((option) => `option:${option.key}`),
        ...shaders.filter((descriptor) => reasons.get(descriptor.id) === undefined).map((descriptor) => descriptor.id),
    ];
    const tabStop = [stop, ...marked].find((id) => id !== null && pickable.includes(id)) ?? pickable[0];
    const pick = (id: string): void => {
        if (id.startsWith("option:")) {
            onOption?.(id.slice("option:".length));
            return;
        }
        onPick(id);
    };
    // Enter in the search: the tile whose name is the search, else the first that can be picked.
    const best = (): string | undefined => {
        const said = query.trim().toLowerCase();
        const named = [
            ...found.map((option) => ({ id: `option:${option.key}`, name: option.label })),
            ...shaders.map((descriptor) => ({ id: descriptor.id, name: descriptor.plainName })),
        ].find((each) => each.name.toLowerCase() === said && pickable.includes(each.id));
        return named?.id ?? pickable[0];
    };
    const tile = (descriptor: ShaderDescriptor): React.JSX.Element => {
        const reason = reasons.get(descriptor.id);
        const inUse = marked.includes(descriptor.id);
        // What a screen reader hears after the name: what the tile shows besides it.
        const description = [
            reason,
            inUse ? GALLERY_WORDS.inUse : undefined,
            tab === "background" ? undefined : placeWords(descriptor.place, tab),
            ...factsOf(descriptor).map((fact) => fact.words),
            reason === undefined ? originWords(descriptor) : undefined,
        ]
            .filter((part) => part !== undefined)
            .join(", ");
        const button = (
            <GalleryTile
                key={descriptor.id}
                id={descriptor.id}
                name={descriptor.plainName}
                picture={descriptor.thumbnail}
                badge={
                    tab === "background" ? undefined : (
                        <span className="ws-place-badge">
                            <PlaceDiagram place={descriptor.place} tab={tab} />
                            <span>{placeWords(descriptor.place, tab)}</span>
                        </span>
                    )
                }
                facts={<ShaderFacts descriptor={descriptor} />}
                second={reason ?? originWords(descriptor)}
                description={description}
                disabled={reason !== undefined}
                marked={inUse}
                stop={tabStop === descriptor.id}
                onPick={pick}
            />
        );
        if (descriptor.origin !== "pasted" || onDelete === undefined) {
            return button;
        }
        return (
            <ContextMenu key={descriptor.id} target={button}>
                <Menu.Item
                    rightSection={layersWord(
                        session.shaders.list().find((each) => each.id === descriptor.id)?.usedBy ?? 0,
                    )}
                    onClick={() => {
                        onDelete(descriptor.id);
                    }}
                >
                    Delete from project
                </Menu.Item>
            </ContextMenu>
        );
    };
    return (
        <div // NOSONAR(S6848): catches arrow keys and focus bubbling from its own tiles to rove the tab stop
            ref={root}
            className="ws-gallery"
            data-testid="shader-gallery"
            data-tab={tab}
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
            {onNew !== undefined && (
                <UnstyledButton className="ws-gallery-paste" onClick={onNew}>
                    <Text size="xs">{GALLERY_WORDS.newShader}</Text>
                </UnstyledButton>
            )}
            <TextInput
                size="xs"
                aria-label={GALLERY_WORDS.search(tab)}
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
                    } else if (event.key === "Enter") {
                        event.preventDefault();
                        const id = best();
                        if (id !== undefined) {
                            pick(id);
                        }
                    }
                }}
            />
            <Chip.Group
                value={origin}
                onChange={(value) => {
                    setOrigin(typeof value === "string" ? value : "all");
                }}
            >
                <Group gap={4} wrap="wrap" role="radiogroup" aria-label={GALLERY_WORDS.origin} data-filter="origin">
                    {ORIGIN_FILTERS.map((each) => (
                        <Chip key={each.key} value={each.key} size="xs" variant="outline">
                            {each.label}
                        </Chip>
                    ))}
                </Group>
            </Chip.Group>
            <div // NOSONAR(S6819): an ARIA group naming a two-column grid of tile buttons; a fieldset would draw its own border and legend
                className="ws-gallery-grid"
                role="group"
                aria-label={GALLERY_WORDS.tiles}
            >
                {found.map((option) => (
                    <GalleryTile
                        key={option.key}
                        id={`option:${option.key}`}
                        name={option.label}
                        second={tab === "background" ? undefined : OPTION_TILE_WORDS[tab]}
                        description={tab === "background" ? undefined : OPTION_TILE_WORDS[tab]}
                        marked={false}
                        stop={tabStop === `option:${option.key}`}
                        onPick={pick}
                    />
                ))}
                {shaders.map(tile)}
            </div>
            {shaders.length + found.length === 0 && (
                <Text size="xs" c="dimmed">
                    {GALLERY_WORDS.none}
                </Text>
            )}
        </div>
    );
}

/**
 * One gallery tile, a button that adds what it shows: the picture, the name, the place badge and
 * the facts, and a second line when there is one (its origin, an option's section, or why it cannot
 * be picked). Its name is the shader's name; everything else it shows, and whether it is already in
 * use, is its description, so a screen reader hears it all and not only the name.
 * @param props - Component props
 * @param props.id - what a pick hands back
 * @param props.name - the name
 * @param props.picture - the still picture, if any
 * @param props.badge - the place badge
 * @param props.facts - the facts' icons
 * @param props.second - the second line
 * @param props.description - what it says after its name: its place, facts, origin, whether in use
 * @param props.disabled - whether it cannot be picked here
 * @param props.marked - whether it is already in the list
 * @param props.stop - whether it is the gallery's one Tab stop
 * @param props.onPick - picks it
 * @returns The tile
 */
function GalleryTile({
    id,
    name,
    picture,
    badge,
    facts,
    second,
    description,
    disabled = false,
    marked,
    stop,
    onPick,
    ...handlers
}: Readonly<
    // A context menu's handlers, on the tile.
    Omit<React.HTMLAttributes<HTMLButtonElement>, "id"> & {
        id: string;
        name: string;
        picture?: string;
        badge?: React.ReactNode;
        facts?: React.ReactNode;
        second?: string;
        description?: string;
        disabled?: boolean;
        marked: boolean;
        stop: boolean;
        onPick: (id: string) => void;
    }
>): React.JSX.Element {
    const describedBy = useId();
    const button = (
        <UnstyledButton
            {...handlers}
            className="ws-gallery-tile"
            aria-label={name}
            aria-describedby={description === undefined || description === "" ? undefined : describedBy}
            data-shader={id}
            data-marked={marked ? "" : undefined}
            aria-disabled={disabled ? true : undefined}
            tabIndex={stop && !disabled ? 0 : -1}
            onClick={() => {
                if (!disabled) {
                    onPick(id);
                }
            }}
            onKeyDown={(event) => {
                // A project tile's context menu opens on Shift+F10 and the ContextMenu key.
                handlers.onKeyDown?.(event);
                if (event.defaultPrevented) {
                    return;
                }
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (!disabled) {
                        onPick(id);
                    }
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
            {badge}
            {facts}
            {second !== undefined && (
                <Text size="xs" c="dimmed" truncate>
                    {second}
                </Text>
            )}
            {description !== undefined && description !== "" && (
                <VisuallyHidden id={describedBy}>{description}</VisuallyHidden>
            )}
        </UnstyledButton>
    );
    return disabled && second !== undefined ? <Tooltip label={second}>{button}</Tooltip> : button;
}
