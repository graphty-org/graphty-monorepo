import {
    DataTable,
    type DataTableColumn,
    MenuShortcut,
    StyleNumberInput,
    StyleSelect,
    ToggleIconButton,
    ToggleRow,
} from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor, toColorValue } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue, LayerId, RuleTree } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer, ValueGroup } from "@graphty/graphty-element/session";
import { ActionIcon, Box, Button, Group, Menu, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { count as countOf } from "../inspector/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { type DataBinding, sourceName, startingValue } from "./row";
import { focusLineNext } from "./useFocusLine";
import { ValueField } from "./ValueField";
import { channelWord, failureWords, SECTIONS, takesBinding, valueFieldKind, valueWords } from "./words";

/** How many groups the list shows before "N more" (tier3 decisions, round 6). */
const GROUPS_SHOWN = 8;

/** How many rows the full list is tall before it scrolls. */
const FULL_ROWS = 10;

/** A list row's height and its header's, in pixels. */
const ROW_HEIGHT = 28;

/** How wide a row's field for the popover's property is, by its kind: a chit, else a narrow field. */
const FIELD_WIDTH: Readonly<Record<string, number>> = { color: 44, number: 60, choice: 64, text: 68 };

/** The width the group grid has in a 240 px popover. */
const GRID_WIDTH = 236;

/** The size and actions columns' widths. */
const COUNT_WIDTH = 48;
const ACTIONS_WIDTH = 56;

/** How the full list is sorted. */
type GroupSort = "size" | "name" | "value";

/** The sort choices, in words. */
const SORT_WORDS: readonly { value: GroupSort; label: string }[] = [
    { value: "size", label: "Largest first" },
    { value: "name", label: "Name" },
    { value: "value", label: "Value" },
];

/** The fold a list starts from when a reader turns it on: groups under 3 elements. */
const FOLD_START = 3;

/** One group as the list draws it. */
interface GroupRow {
    /** The value as the legend spells it: the row's id. */
    readonly key: string;
    readonly group: ValueGroup;
    /** The name the reader knows it by. */
    readonly name: string;
    /** The selected element it holds, when it is the selected element's group. */
    readonly has?: string;
}

/** A value as `styles.setValueEntries` takes it. */
type Scalar = string | number | boolean;

/**
 * Each value of a path by the name the key gives it: the reader's own name, else a run's group by
 * its rank ("Group 3"), else the value as it is. One read of the run's ranks for every row.
 * @param session - the element's session.
 * @param path - the category path.
 * @param groups - its groups.
 * @returns the names, by key.
 */
function groupNames(session: GraphSession, path: string, groups: readonly ValueGroup[]): Map<string, string> {
    const run = session.runs.list().find((each) => session.results.path(each.id) === path);
    const ranks = new Map((run?.result?.summary().groups ?? []).map((g) => [String(g.group), g.rank]));
    return new Map(
        groups.map((group) => {
            const key = String(group.value);
            const rank = ranks.get(key);
            return [key, group.name ?? (rank === undefined ? key : `Group ${String(rank)}`)];
        }),
    );
}

/**
 * The channels of a layer that read a path, in the Style tab's order.
 * @param layer - the layer.
 * @param path - the path.
 * @returns the channels.
 */
function channelsBy(layer: Layer, path: string): Channel[] {
    const bound = (Object.entries(layer.encode ?? {}) as [Channel, DataBinding | { value: unknown } | undefined][])
        .filter(([, binding]) => binding !== undefined && "by" in binding && binding.by === path)
        .map(([channel]) => channel);
    const order = SECTIONS[layer.target].flatMap((section) => section.channels);
    return bound.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/**
 * What each channel of a layer that reads a path paints each of its values now, from the
 * element's preview of each binding.
 * @param session - the element's session.
 * @param layer - the layer.
 * @param path - the path.
 * @returns per channel, per value key, the paint.
 */
function paintsOf(session: GraphSession, layer: Layer, path: string): Map<Channel, Map<string, unknown>> {
    return new Map(
        channelsBy(layer, path).map((channel) => {
            const binding = layer.encode?.[channel];
            let bins: readonly { value?: unknown; paints?: unknown }[] = [];
            if (binding !== undefined && "by" in binding) {
                try {
                    ({ bins } = session.styles.preview(binding, { channel, span: "data" }));
                } catch {
                    // A binding the element refuses paints nothing to show.
                }
            }
            return [channel, new Map(bins.map((bin) => [String(bin.value), bin.paints]))];
        }),
    );
}

/**
 * A painted value as a layer writes it back: a color's hex, else the value.
 * @param paint - what the element paints.
 * @returns the value, or undefined when it paints nothing a layer can hold.
 */
function literalOf(paint: unknown): ChannelValue | undefined {
    if (typeof paint === "number" || typeof paint === "string" || typeof paint === "boolean") {
        return paint;
    }
    if (paint === null || paint === undefined) {
        return undefined;
    }
    return toColorValue(paint as Parameters<typeof toColorValue>[0])
        ?.hex.slice(0, 7)
        .toUpperCase();
}

/**
 * The descriptor of a channel of one kind of element.
 * @param target - nodes or edges.
 * @param channel - the channel.
 * @returns the descriptor.
 */
function descriptorOf(target: Layer["target"], channel: Channel): ChannelDescriptor | undefined {
    return channelsFor(target).find((d) => d.channel === channel);
}

/**
 * What a group looks like, in words, for its row's accessible name: "color orange, shape star".
 * @param target - nodes or edges.
 * @param paints - what each channel paints it.
 * @param key - the group.
 * @returns the words.
 */
function lookWords(target: Layer["target"], paints: Map<Channel, Map<string, unknown>>, key: string): string {
    return [...paints]
        .flatMap(([channel, values]) => {
            const descriptor = descriptorOf(target, channel);
            const paint = values.get(key);
            return descriptor === undefined || paint === undefined
                ? []
                : [`${channelWord(channel).toLowerCase()} ${valueWords(descriptor, paint)}`];
        })
        .join(", ");
}

/**
 * Selects the elements of some groups on the canvas, as a reader picks them: an edge's group
 * selects its edges with their end nodes, as the Values tab's rows do.
 * @param session - the element's session.
 * @param target - nodes or edges.
 * @param path - the category path.
 * @param keys - the groups.
 */
function selectGroups(session: GraphSession, target: Layer["target"], path: string, keys: readonly string[]): void {
    const where: RuleTree = {
        kind: "categories",
        attribute: path,
        values: [...keys],
        ...(target === "edge" ? { nodes: "ends" as const } : {}),
    };
    void session.selection.apply({ scope: { define: { kind: "rule", where, reading: "clipped" } } });
}

/**
 * "New layer for <group>": a layer whose rule is the groups, carrying every setting they have --
 * the layer's own values and what each varied property paints them -- placed directly above its
 * source, so the drawing does not change until the reader edits it.
 * @param session - the element's session.
 * @param layer - the source layer.
 * @param path - the category path.
 * @param keys - the groups.
 * @param name - the new layer's name.
 * @returns the new layer's id.
 */
async function layerForGroups(
    session: GraphSession,
    layer: Layer,
    path: string,
    keys: readonly string[],
    name: string,
): Promise<LayerId> {
    const set: Partial<Record<Channel, ChannelValue>> = { ...layer.set };
    const [first] = keys;
    for (const [channel, values] of paintsOf(session, layer, path)) {
        const value = literalOf(values.get(first ?? ""));
        if (value !== undefined) {
            set[channel] = value;
        }
    }
    const added = await session.styles.add(
        {
            name,
            target: layer.target,
            selector: { match: "rule", where: { kind: "categories", attribute: path, values: [...keys] } },
            set,
        },
        { above: layer.id },
    );
    return added.id;
}

/** Props for the group list and the group detail. */
interface GroupsProps {
    readonly session: GraphSession;
    /** The property whose popover lists the groups. */
    readonly descriptor: ChannelDescriptor;
    readonly layerId: LayerId;
    readonly binding: DataBinding;
    /** What the binding reads, in words. */
    readonly source: string;
    /** Told when a group's detail opens or closes, so the popover can hide what is the list's. */
    readonly onDetailChange?: (open: boolean) => void;
}

/**
 * The groups of a property that varies by a category (tier3 decisions, round 6, "any property per
 * group" and "dozens or hundreds of groups"): a grid of the largest 8, then "N more", which opens
 * the whole list -- virtualized, searched by names and raw values, sorted by size, name or value,
 * with small groups folded into Other. The selected element's group is pinned first. Each row has
 * its chit for this property, name, size, eye and menu; a click (or Enter) opens the group's
 * detail, Shift or Control picks several, and Enter on a picked row opens all of them.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.descriptor - the property
 * @param props.layerId - the layer
 * @param props.binding - the binding
 * @param props.source - what it reads, in words
 * @param props.onDetailChange - told when a group's detail opens or closes
 * @returns The list, or one group's detail
 */
export function GroupList({
    session,
    descriptor,
    layerId,
    binding,
    source,
    onDetailChange,
}: GroupsProps): React.JSX.Element | null {
    const { store } = useWorkspace();
    const [opened, setOpened] = useState<readonly string[] | null>(null);
    const [all, setAll] = useState(false);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<GroupSort>("size");
    const [selected, setSelected] = useState<string[]>([]);
    const [renaming, setRenaming] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [menuHost, setMenuHost] = useState<HTMLDivElement | null>(null);
    const layer = session.styles.get(layerId);
    if (layer === undefined) {
        return null;
    }
    const { channel, target } = descriptor;
    const path = binding.by;
    const groups = session.styles.groups(layerId, path);
    const names = groupNames(session, path, groups);
    const paints = paintsOf(session, layer, path);
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords(channelWord(channel), "changed", error), error: true } });
    };

    if (opened !== null) {
        const keys = opened.filter((key) => groups.some((g) => String(g.value) === key));
        if (keys.length > 0) {
            return (
                <GroupDetail
                    session={session}
                    layer={layer}
                    path={path}
                    source={source}
                    keys={keys}
                    onBack={() => {
                        setOpened(null);
                        onDetailChange?.(false);
                        // Back on the list, focus returns to the row of the group just left (the
                        // first picked one), so the arrow keys carry on from there.
                        const back = keys[0];
                        requestAnimationFrame(() => {
                            const list = listRef.current;
                            const cell =
                                list
                                    ?.querySelector(`[data-group-row="${CSS.escape(back ?? "")}"]`)
                                    ?.closest("[role=gridcell]") ?? list?.querySelector("[role=gridcell]");
                            if (cell instanceof HTMLElement) {
                                cell.focus();
                            }
                        });
                    }}
                />
            );
        }
    }

    // The selected element's group, read from the element, pinned first.
    const selectedNode = session.selection.nodes.at(0);
    const selectedEdge = session.selection.edges.at(0);
    let at: { node: (typeof session.selection.nodes)[number] } | { edge: string } | undefined;
    if (target === "node" && selectedNode !== undefined) {
        at = { node: selectedNode };
    } else if (target === "edge" && selectedEdge !== undefined) {
        at = { edge: selectedEdge };
    }
    let pinnedKey: string | undefined;
    let has: string | undefined;
    if (at !== undefined) {
        try {
            const value = session.styles.valueAt(at, path);
            pinnedKey =
                typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                    ? String(value)
                    : undefined;
            has = "node" in at ? (session.data.name(at.node) ?? String(at.node)) : "the selected edge";
        } catch {
            pinnedKey = undefined;
        }
    }

    const needle = search.trim().toLowerCase();
    let rows: GroupRow[] = groups.map((group) => {
        const key = String(group.value);
        return {
            key,
            group,
            name: names.get(key) ?? key,
            ...(key === pinnedKey && has !== undefined ? { has } : {}),
        };
    });
    if (all && needle !== "") {
        rows = rows.filter((row) => row.name.toLowerCase().includes(needle) || row.key.toLowerCase().includes(needle));
    }
    if (all && sort !== "size") {
        const collator = new Intl.Collator(undefined, { numeric: true });
        rows = [...rows].sort((a, b) =>
            sort === "name" ? collator.compare(a.name, b.name) : collator.compare(a.key, b.key),
        );
    }
    const pinned = rows.find((row) => row.has !== undefined);
    const rest = rows.filter((row) => row !== pinned);
    const shown = [...(pinned === undefined ? [] : [pinned]), ...(all ? rest : rest.slice(0, GROUPS_SHOWN))];
    const more = groups.length - (pinned === undefined ? 0 : 1) - Math.min(rest.length, GROUPS_SHOWN);
    const fold = binding.other?.threshold;

    const entryOf = (row: GroupRow): string | number | undefined => row.group.entries[channel];
    const open = (keys: readonly string[]): void => {
        setOpened(keys);
        onDetailChange?.(true);
    };
    const fieldWidth = FIELD_WIDTH[valueFieldKind(descriptor) ?? "text"] ?? 64;
    const clear = (row: GroupRow): void => {
        Promise.resolve(
            session.styles.setValueEntries(layerId, path, [
                { channel, value: row.group.value as Scalar, entry: undefined },
            ]),
        ).catch(fail);
    };
    const columns: DataTableColumn<GroupRow>[] = [
        {
            id: "field",
            header: channelWord(channel),
            value: (row) => {
                const entry = entryOf(row);
                return entry === undefined ? null : String(entry);
            },
            width: fieldWidth,
            sortable: false,
            filterable: false,
            // The field edits this property for the group; its clicks and keys are its own.
            cell: (row) => (
                <Box
                    style={{ display: "flex", minWidth: 0 }}
                    onClick={(event) => {
                        event.stopPropagation();
                    }}
                    onKeyDown={(event) => {
                        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
                            event.stopPropagation();
                        }
                    }}
                >
                    <ValueField
                        descriptor={descriptor}
                        compact
                        label={`${source} ${row.name} ${channelWord(channel).toLowerCase()}`}
                        value={entryOf(row)}
                        shown={paints.get(channel)?.get(row.key)}
                        onChange={(next) => {
                            Promise.resolve(
                                session.styles.setValueEntries(layerId, path, [
                                    { channel, value: row.group.value as Scalar, entry: next },
                                ]),
                            ).catch(fail);
                        }}
                    />
                </Box>
            ),
        },
        {
            id: "name",
            header: "Group",
            value: (row) => row.name,
            width: GRID_WIDTH - fieldWidth - COUNT_WIDTH - ACTIONS_WIDTH,
            sortable: false,
            cell: (row) => (
                <Box style={{ minWidth: 0, width: "100%" }} data-group-row={row.key}>
                    {renaming === row.key ? (
                        <TextInput
                            size="xs"
                            aria-label={`Name of ${source} ${row.name}`}
                            defaultValue={row.name}
                            autoFocus
                            onClick={(event) => {
                                event.stopPropagation();
                            }}
                            onKeyDown={(event) => {
                                event.stopPropagation();
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    event.currentTarget.blur();
                                } else if (event.key === "Escape") {
                                    event.preventDefault();
                                    setRenaming(null);
                                }
                            }}
                            onBlur={(event) => {
                                rename(session, store, path, row, event.currentTarget.value.trim());
                                setRenaming(null);
                            }}
                        />
                    ) : (
                        <Text size="xs" truncate data-group-name title={row.name}>
                            {row.name}
                            {row.has === undefined ? null : (
                                <Text span size="xs" c="var(--cm-text-secondary)">{` has ${row.has}`}</Text>
                            )}
                            {row.group.folded === true ? (
                                <Text span size="xs" c="var(--cm-text-secondary)">
                                    {" in Other"}
                                </Text>
                            ) : null}
                            {/* What a screen reader hears after the name: size and every property. */}
                            <span style={VISUALLY_HIDDEN}>
                                {`, ${countOf(row.group.count, target)}${
                                    paints.size === 0 ? "" : `, ${lookWords(target, paints, row.key)}`
                                }`}
                            </span>
                        </Text>
                    )}
                </Box>
            ),
        },
        {
            id: "count",
            header: target === "node" ? "Nodes" : "Edges",
            value: (row) => row.group.count,
            align: "end",
            width: COUNT_WIDTH,
            sortable: false,
        },
        {
            id: "actions",
            header: "Actions",
            value: () => "",
            width: ACTIONS_WIDTH,
            sortable: false,
            filterable: false,
            cell: (row) => (
                <Group
                    gap={0}
                    wrap="nowrap"
                    justify="flex-end"
                    onClick={(event) => {
                        event.stopPropagation();
                    }}
                    onKeyDown={(event) => {
                        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
                            event.stopPropagation();
                        }
                    }}
                >
                    <ToggleIconButton
                        variant="swap"
                        label={`Hide ${source} ${row.name}`}
                        checked={row.group.hidden}
                        icon={<GLYPHS.show size={14} />}
                        checkedIcon={<GLYPHS.hide size={14} />}
                        onChange={(hide) => {
                            Promise.resolve(
                                session.styles.setValueHidden(layerId, channel, row.group.value as Scalar, hide),
                            ).catch(fail);
                        }}
                    />
                    {/* Drawn in the list's own box, not in the row, whose cell would clip it. */}
                    <Menu withinPortal portalProps={{ target: menuHost ?? undefined }} position="bottom-end">
                        <Menu.Target>
                            <ActionIcon variant="subtle" size="sm" aria-label={`${source} ${row.name} actions`}>
                                <GLYPHS.more size={14} aria-hidden />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item
                                onClick={() => {
                                    open([row.key]);
                                }}
                            >{`Set properties for ${row.name}`}</Menu.Item>
                            <Menu.Item
                                onClick={() => {
                                    selectGroups(session, target, path, [row.key]);
                                }}
                            >{`Select these ${countOf(row.group.count, target)}`}</Menu.Item>
                            <Menu.Item
                                onClick={() => {
                                    openNewLayer(session, store, layer, path, [row.key], `${source} ${row.name}`);
                                }}
                            >{`New layer for ${row.name}`}</Menu.Item>
                            <Menu.Item
                                rightSection={<MenuShortcut>F2</MenuShortcut>}
                                onClick={() => {
                                    setRenaming(row.key);
                                }}
                            >
                                Rename
                            </Menu.Item>
                            {entryOf(row) === undefined ? null : (
                                <Menu.Item
                                    onClick={() => {
                                        clear(row);
                                    }}
                                >{`Clear ${channelWord(channel).toLowerCase()}: back to the layer's`}</Menu.Item>
                            )}
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            ),
        },
    ];

    // The header and the rows on show, each with its 1 px grid line, and the frame's 1 px.
    const height = (Math.max(1, Math.min(shown.length, all ? FULL_ROWS : shown.length)) + 1) * (ROW_HEIGHT + 1) + 4;
    return (
        <Stack gap={6} ref={setMenuHost} pos="relative">
            {all ? (
                <>
                    <TextInput
                        size="xs"
                        aria-label={`Search ${source} groups`}
                        placeholder="Search names and values"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.currentTarget.value);
                        }}
                    />
                    <StyleSelect
                        label="Sort by"
                        value={sort}
                        defaultValue="size"
                        showReset={false}
                        options={SORT_WORDS.map((each) => ({ ...each }))}
                        onChange={(next) => {
                            setSort(next === "name" || next === "value" ? next : "size");
                        }}
                    />
                    <Group gap={6} wrap="nowrap" align="flex-end">
                        <Box style={{ flex: 1 }}>
                            <ToggleRow
                                label="Fold small groups into Other"
                                control="switch"
                                checked={fold !== undefined}
                                onChange={(on) => {
                                    Promise.resolve(
                                        session.styles.setFoldBelow(layerId, path, on ? FOLD_START : undefined),
                                    ).catch(fail);
                                }}
                            />
                        </Box>
                        {fold === undefined ? null : (
                            <Box w={72}>
                                <StyleNumberInput
                                    label="Under"
                                    value={fold}
                                    defaultValue={FOLD_START}
                                    min={1}
                                    step={1}
                                    onChange={(below) => {
                                        if (below !== undefined && Number.isInteger(below) && below >= 1) {
                                            Promise.resolve(session.styles.setFoldBelow(layerId, path, below)).catch(
                                                fail,
                                            );
                                        }
                                    }}
                                />
                            </Box>
                        )}
                    </Group>
                </>
            ) : null}
            {selected.length > 1 ? (
                <Group gap={6} wrap="nowrap">
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            open(selected);
                        }}
                    >
                        {`Set properties for ${String(selected.length)} groups`}
                    </Button>
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        onClick={() => {
                            selectGroups(session, target, path, selected);
                        }}
                    >
                        Select these
                    </Button>
                </Group>
            ) : null}
            <div
                ref={listRef}
                onKeyDownCapture={(event) => {
                    // F2 renames the focused group, as it does a tree row.
                    if (event.key !== "F2") {
                        return;
                    }
                    const index = Number(
                        (event.target as HTMLElement).closest("[data-index]")?.getAttribute("data-index"),
                    );
                    const row = shown[index];
                    if (row !== undefined) {
                        event.preventDefault();
                        event.stopPropagation();
                        setRenaming(row.key);
                    }
                }}
            >
                <DataTable
                    label={`${source} groups`}
                    density="compact"
                    columns={columns}
                    data={shown}
                    getRowId={(row) => row.key}
                    height={height}
                    rowHeight={ROW_HEIGHT}
                    headerHeight={ROW_HEIGHT}
                    selectionMode="multiple"
                    selectedIds={selected}
                    onSelectionChange={(ids) => {
                        setSelected(ids);
                    }}
                    onRowClick={(row, event, meta) => {
                        if (meta.source === "keyboard") {
                            open(selected.length > 1 && selected.includes(row.key) ? selected : [row.key]);
                            return;
                        }
                        if ("shiftKey" in event && (event.shiftKey || event.ctrlKey || event.metaKey)) {
                            return;
                        }
                        open([row.key]);
                    }}
                    empty={
                        <Text size="xs" c="dimmed" p={6}>
                            No group matches
                        </Text>
                    }
                />
            </div>
            {groups.length > GROUPS_SHOWN + (pinned === undefined ? 0 : 1) ? (
                <Button
                    size="compact-xs"
                    variant="subtle"
                    style={{ alignSelf: "flex-start" }}
                    onClick={() => {
                        setAll(!all);
                    }}
                >
                    {all ? `Show the largest ${String(GROUPS_SHOWN)}` : `${String(more)} more`}
                </Button>
            ) : null}
        </Stack>
    );
}

/** A visually hidden span, read by a screen reader. */
const VISUALLY_HIDDEN: React.CSSProperties = {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
};

/**
 * Names a group: the element's value label, kept with the data and shown wherever the value is.
 * An empty name returns to the default.
 * @param session - the element's session.
 * @param store - the workspace store.
 * @param path - the category path.
 * @param row - the group.
 * @param label - the new name.
 */
function rename(
    session: GraphSession,
    store: ReturnType<typeof useWorkspace>["store"],
    path: string,
    row: Pick<GroupRow, "group" | "name">,
    label: string,
): void {
    if (label === row.name) {
        return;
    }
    Promise.resolve(session.data.setValueLabel(path, row.group.value as Scalar, label === "" ? null : label)).catch(
        (error: unknown) => {
            store.set({ notice: { message: failureWords("The name", "changed", error), error: true } });
        },
    );
}

/**
 * Makes the layer for some groups, opens it, hands focus to its Style tab and says so.
 * @param session - the element's session.
 * @param store - the workspace store.
 * @param layer - the source layer.
 * @param path - the category path.
 * @param keys - the groups.
 * @param name - the new layer's name.
 */
function openNewLayer(
    session: GraphSession,
    store: ReturnType<typeof useWorkspace>["store"],
    layer: Layer,
    path: string,
    keys: readonly string[],
    name: string,
): void {
    layerForGroups(session, layer, path, keys, name)
        .then((id) => {
            store.set({
                inspected: { kind: "layer-row", id },
                announcement: `Layer ${name} added above ${layer.name}`,
            });
            const [first] = channelsBy(layer, path);
            if (first !== undefined) {
                focusLineNext(first);
            }
        })
        .catch((error: unknown) => {
            store.set({ notice: { message: failureWords("The layer", "added", error), error: true } });
        });
}

/** Props for GroupDetail. */
interface GroupDetailProps {
    readonly session: GraphSession;
    readonly layer: Layer;
    /** The category path. */
    readonly path: string;
    /** What the path is, in words. */
    readonly source: string;
    /** The groups, as the legend spells them. */
    readonly keys: readonly string[];
    /** Back to the list; absent where the detail stands alone (a group row's Style tab). */
    readonly onBack?: () => void;
}

/**
 * One group's detail, or several groups' at once: Name, then one field for every property the
 * layer varies by the path, each in the control its kind needs, and "+ Set another property for
 * <group>". Where the groups differ a field reads "Mixed"; one change writes every group as one
 * undo step. A property already varying by another value is offered with the reason it cannot be.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.layer - the layer
 * @param props.path - the category path
 * @param props.source - what the path is, in words
 * @param props.keys - the groups
 * @param props.onBack - back to the list
 * @returns The detail
 */
export function GroupDetail({
    session,
    layer,
    path,
    source,
    keys,
    onBack,
}: Readonly<GroupDetailProps>): React.JSX.Element {
    const { store } = useWorkspace();
    const box = useRef<HTMLDivElement>(null);
    const [focusChannel, setFocusChannel] = useState<Channel | null>(null);
    const groups = session.styles.groups(layer.id, path).filter((g) => keys.includes(String(g.value)));
    const names = groupNames(session, path, groups);
    const paints = paintsOf(session, layer, path);
    const bound = channelsBy(layer, path);
    const single = groups.length === 1 ? groups[0] : undefined;
    const title = single === undefined ? `${String(groups.length)} groups` : (names.get(String(single.value)) ?? "");
    const { target } = layer;

    // Opened from the list, the detail takes focus (its Back button): the row that was clicked
    // is gone, and focus left on the page would let Escape close the whole popover.
    const fromList = onBack !== undefined;
    useEffect(() => {
        if (fromList) {
            box.current?.querySelector<HTMLElement>("[data-group-back]")?.focus();
        }
    }, [fromList]);
    // Focus moves to a property just added, once its field is drawn.
    useEffect(() => {
        if (focusChannel === null) {
            return;
        }
        const field = box.current?.querySelector<HTMLElement>(
            `[data-group-field="${focusChannel}"] input, [data-group-field="${focusChannel}"] button`,
        );
        if (field !== null && field !== undefined) {
            field.focus();
            setFocusChannel(null);
        }
    }, [focusChannel, groups]);

    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords("The group", "changed", error), error: true } });
    };
    const write = (channel: Channel, entry: string | number | undefined): Promise<unknown> =>
        Promise.resolve(
            session.styles.setValueEntries(
                layer.id,
                path,
                groups.map((g) => ({ channel, value: g.value as Scalar, entry })),
            ),
        );

    // Every property the Style tab draws that can vary, by section, for "+ Set another property".
    const offered = SECTIONS[target].map((section) => ({
        title: section.title,
        items: section.channels.flatMap((channel) => {
            const descriptor = descriptorOf(target, channel);
            if (descriptor === undefined || !takesBinding(descriptor) || bound.includes(channel)) {
                return [];
            }
            const other = layer.encode?.[channel];
            const reason =
                other !== undefined && "by" in other
                    ? `${channelWord(channel)} already varies by ${sourceName(session, other) ?? other.by}`
                    : undefined;
            return [{ descriptor, reason }];
        }),
    }));

    return (
        <Stack
            gap={8}
            ref={box}
            role="group"
            aria-label={`${title} properties`}
            onKeyDown={(event) => {
                // Escape returns to the list, and stays in the popover.
                if (event.key === "Escape" && onBack !== undefined && !event.defaultPrevented) {
                    const inMenu = (event.target as HTMLElement).closest(
                        "[role=menu], [role=listbox], [role=dialog] [role=dialog]",
                    );
                    if (inMenu === null) {
                        event.preventDefault();
                        event.stopPropagation();
                        onBack();
                    }
                }
            }}
        >
            <Group gap={4} wrap="nowrap">
                {onBack === undefined ? null : (
                    <Tooltip label="Back to the groups">
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label="Back to the groups"
                            data-group-back
                            onClick={onBack}
                        >
                            <GLYPHS.back size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                )}
                <Text size="xs" fw={600} truncate>
                    {title}
                </Text>
                <Text size="xs" c="var(--cm-text-secondary)" style={{ flex: "none" }}>
                    {countOf(
                        groups.reduce((sum, g) => sum + g.count, 0),
                        target,
                    )}
                </Text>
            </Group>
            {single === undefined ? null : (
                <TextInput
                    key={title}
                    size="xs"
                    label="Name"
                    aria-label={`Name of ${source} ${title}`}
                    defaultValue={title}
                    onBlur={(event) => {
                        rename(session, store, path, { group: single, name: title }, event.currentTarget.value.trim());
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.currentTarget.blur();
                        }
                    }}
                />
            )}
            {bound.map((channel) => {
                const descriptor = descriptorOf(target, channel);
                if (descriptor === undefined) {
                    return null;
                }
                const entries = groups.map((g) => g.entries[channel]);
                const same = entries.every((entry) => entry === entries[0]);
                const anySet = entries.some((entry) => entry !== undefined);
                const name = channelWord(channel);
                return (
                    <Group key={channel} gap={4} wrap="nowrap" data-group-field={channel}>
                        <Text size="xs" w={64} style={{ flex: "none" }} aria-hidden>
                            {name}
                        </Text>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <ValueField
                                descriptor={descriptor}
                                label={`${title} ${name.toLowerCase()}`}
                                value={same ? entries[0] : undefined}
                                shown={paints.get(channel)?.get(keys[0] ?? "")}
                                mixed={!same}
                                onChange={(next) => {
                                    write(channel, typeof next === "boolean" ? String(next) : next).catch(fail);
                                }}
                            />
                        </Box>
                        <Box w={24} style={{ flex: "none" }}>
                            {anySet ? (
                                <Tooltip label="Clear: back to the layer's value">
                                    <ActionIcon
                                        variant="subtle"
                                        size="sm"
                                        aria-label={`Clear ${title} ${name.toLowerCase()}`}
                                        onClick={() => {
                                            write(channel, undefined).catch(fail);
                                        }}
                                    >
                                        <GLYPHS.remove size={14} aria-hidden />
                                    </ActionIcon>
                                </Tooltip>
                            ) : null}
                        </Box>
                    </Group>
                );
            })}
            <Menu position="bottom-start" withinPortal={false}>
                <Menu.Target>
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        style={{ alignSelf: "flex-start" }}
                        leftSection={<GLYPHS.add size={12} aria-hidden />}
                    >
                        {`Set another property for ${title}`}
                    </Button>
                </Menu.Target>
                <Menu.Dropdown mah={280} style={{ overflowY: "auto" }}>
                    {offered
                        .filter((section) => section.items.length > 0)
                        .map((section) => (
                            <React.Fragment key={section.title}>
                                <Menu.Label>{section.title}</Menu.Label>
                                {section.items.map(({ descriptor, reason }) => (
                                    <Menu.Item
                                        key={descriptor.channel}
                                        disabled={reason !== undefined}
                                        aria-label={
                                            reason === undefined
                                                ? channelWord(descriptor.channel)
                                                : `${channelWord(descriptor.channel)}: ${reason}`
                                        }
                                        onClick={() => {
                                            const own = layer.set?.[descriptor.channel];
                                            const start = literalOf(
                                                own ?? startingValue(descriptor, session, layer.selector),
                                            );
                                            setFocusChannel(descriptor.channel);
                                            write(
                                                descriptor.channel,
                                                typeof start === "string" || typeof start === "number" ? start : "",
                                            ).catch(fail);
                                        }}
                                    >
                                        <Text size="xs">{channelWord(descriptor.channel)}</Text>
                                        {reason === undefined ? null : (
                                            <Text size="xs" c="var(--cm-text-secondary)">
                                                {reason}
                                            </Text>
                                        )}
                                    </Menu.Item>
                                ))}
                            </React.Fragment>
                        ))}
                </Menu.Dropdown>
            </Menu>
            <Group gap={6} wrap="nowrap">
                <Button
                    size="compact-xs"
                    variant="default"
                    onClick={() => {
                        selectGroups(session, target, path, keys);
                    }}
                >
                    {`Select these ${countOf(
                        groups.reduce((sum, g) => sum + g.count, 0),
                        target,
                    )}`}
                </Button>
                <Button
                    size="compact-xs"
                    variant="subtle"
                    onClick={() => {
                        openNewLayer(session, store, layer, path, keys, `${source} ${title}`);
                    }}
                >
                    {`New layer for ${title}`}
                </Button>
            </Group>
        </Stack>
    );
}
