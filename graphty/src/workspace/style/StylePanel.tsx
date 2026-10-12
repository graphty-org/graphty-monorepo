import "./style.css";

import { ComboInput, CompactColorInput, ControlSection, FieldRow } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor, toColorValue } from "@graphty/graphty-element/catalog";
import { type Channel, DEFAULT_SELECTION_STYLE, type LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { ActionIcon, Group, Menu, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { GLYPHS } from "../glyphs";
import { findTreeRow, isHidden, isLocked, rowLayers as treeRowLayers } from "../graph-place/rows";
import { edgeName } from "../inspector/words";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { Effects } from "./Effects";
import { LabelSection } from "./LabelSection";
import { type BeneathValue, Field, PropertyRow, type RowContext } from "./PropertyRow";
import {
    colorBlockOf,
    EVERYTHING_LAYER,
    everythingRow,
    lineOf,
    type NewLayer,
    rowLayers,
    runColorOf,
    selectionLayer,
    selectionRow,
    startingValue,
    type Target,
    writeGroupColor,
    writeLine,
} from "./row";
import { focusLineNext, openListNext, useFocusLine } from "./useFocusLine";
import { useStyleVersion } from "./useStyleVersion";
import { WhichElements } from "./WhichElements";
import { type Beneath, channelWord, CORE_ROWS, LISTS, type ListSpec, valueWords } from "./words";

/**
 * The row the Style tab edits when the caller names none, read from `inspected` as the inspector
 * writes it (`{ kind, id }`): the Everything row while nothing is inspected or the Everything row
 * is; a run's row (measure or run) is the run's layers, its id being the run id; a reader's own
 * layer row is that layer. Anything else (a group, an element, the selection) has no row here, so
 * an edit never lands on a row the reader is not looking at.
 * @param session - the element's session.
 * @param inspected - what is inspected, if anything.
 * @returns the row's layer ids, or null when the inspected thing has no layers to edit.
 */
function defaultRow(
    session: GraphSession,
    inspected: { readonly kind: string; readonly id?: string } | null | undefined,
): readonly LayerId[] | null {
    const id = inspected?.id;
    switch (inspected?.kind) {
        case undefined:
        case "everything-row":
            return everythingRow(session);
        case "measure-row":
        case "run-row": {
            // A run that has painted nothing yet (queued, failed, styled off) has no row to edit.
            const layers = id === undefined ? [] : session.runs.bindings(id);
            return layers.length === 0 ? null : layers;
        }
        case "layer-row":
            return id !== undefined && session.styles.get(id) !== undefined ? [id] : null;
        default:
            return null;
    }
}

/**
 * Every color the document's layers set, for the color picker's swatches.
 * @param session - the element's session.
 * @returns the colors as hex, each once.
 */
function documentColors(session: GraphSession): string[] {
    const colors = new Set<string>();
    for (const layer of session.styles.list()) {
        for (const [channel, value] of Object.entries(layer.set ?? {})) {
            const descriptor = channelsFor(layer.target).find((d) => d.channel === channel);
            if (descriptor?.accepts === "color" && (typeof value === "string" || typeof value === "object")) {
                const color = toColorValue(value as Parameters<typeof toColorValue>[0]);
                if (color !== null) {
                    colors.add(color.hex.toUpperCase());
                }
            }
        }
    }
    return [...colors];
}

/**
 * What the layers beneath a row give each channel, from graphty-element's own answer
 * (`styles.agreement` below the row): one value and the layer that paints it, the layers when the
 * value differs, or the channel's default when nothing beneath paints it.
 * @param session - the element's session.
 * @param below - the tree row the answer reads beneath, or undefined for the stack as it is.
 * @returns a reader by channel.
 */
function beneathOf(session: GraphSession, below: string | undefined): (channel: Channel) => BeneathValue {
    // ponytail: read over the whole graph, not the row's own elements -- the element publishes no
    // scope for "what a layer matches" yet (owed with "Select what it paints"); one pass per panel
    // render over every element, fine at Les Miserables' size.
    let agreement: ReturnType<GraphSession["styles"]["agreement"]>;
    try {
        agreement = session.styles.agreement("graph", undefined, below === undefined ? undefined : { below });
    } catch {
        agreement = session.styles.agreement("graph");
    }
    const nameOf = (id: string): string => session.styles.get(id)?.name ?? id;
    const descriptorOf = (channel: Channel): ChannelDescriptor | undefined =>
        channelsFor(channel.startsWith("node.") ? "node" : "edge").find((d) => d.channel === channel);
    return (channel) => {
        const descriptor = descriptorOf(channel);
        const entry = agreement.channels.find((c) => c.channel === channel);
        if (descriptor === undefined) {
            return {};
        }
        if (entry === undefined) {
            return descriptor.default === undefined
                ? {}
                : {
                      value: descriptor.default,
                      words: { value: valueWords(descriptor, descriptor.default), from: undefined },
                  };
        }
        if (entry.state === "agree") {
            return {
                value: entry.value,
                words: { value: valueWords(descriptor, entry.value), from: nameOf(entry.layerId) },
            };
        }
        const values = new Set(entry.breakdown.map((share) => JSON.stringify(share.value)));
        const layers = [...new Set(entry.breakdown.map((share) => nameOf(share.layerId)))];
        // One value from several layers is still that value; only differing values are "Mixed".
        const words: Beneath =
            values.size === 1
                ? { value: valueWords(descriptor, entry.breakdown[0].value), from: layers.join(" and ") }
                : { mixed: layers.slice(0, 3) };
        return values.size === 1 ? { value: entry.breakdown[0].value, words } : { words };
    };
}

/** Props for StylePanel. */
interface StylePanelProps {
    /** The row's style layers (one per kind it paints). Left out, the row is the inspected row's. */
    layers?: readonly LayerId[];
    /** The style tree row it is, which draws the panel's header and reads what lies beneath it. */
    rowId?: string;
}

/**
 * The Style tab (tier3 design, section 2.2): for a tree row, a header (kind glyph, name, row
 * menu); Which elements for a reader's own layer; then a Nodes group and an Edges group, each only
 * when the row paints that kind, with the core properties always drawn on paired rows, their rare
 * properties behind settings buttons, the label, and the lists. Generated from graphty-element's
 * channel descriptors (`channelsFor`), never typed.
 * @param props - Component props
 * @param props.layers - the row's style layers
 * @param props.rowId - the style tree row, when the panel is a tree row's
 * @returns The tab, or nothing before the element has come up
 */
export function StylePanel({ layers, rowId }: Readonly<StylePanelProps>): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    const inspected = useWorkspaceState((state) => state.inspected);
    if (session === null) {
        return null;
    }
    if (rowId !== undefined) {
        return <TreeRowPanel session={session} rowId={rowId} />;
    }
    const row = layers ?? defaultRow(session, inspected);
    if (row === null) {
        return null;
    }
    // Only the Everything row adds a layer of its own; a run's or a layer's row writes to its own.
    const everything = layers === undefined && (inspected?.kind ?? "everything-row") === "everything-row";
    // Keyed by the row, so an empty label line is dropped when the row changes.
    return (
        <RowStyle key={row.join(" ")} session={session} row={row} fresh={everything ? EVERYTHING_LAYER : undefined} />
    );
}

/**
 * A style tree row's panel: a line while it is locked or hidden, and its Style tab, disabled while
 * it or a folder holding it is locked. The inspector's header names the row and carries its menu.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rowId - the row
 * @returns The panel
 */
function TreeRowPanel({ session, rowId }: Readonly<{ session: GraphSession; rowId: string }>): React.JSX.Element {
    const found = findTreeRow(session.styles.tree(), rowId);
    if (found === undefined) {
        return <StateLine>This row is gone</StateLine>;
    }
    const row = treeRowLayers(session, rowId);
    const locked = isLocked(found);
    // A reader's own layer says which elements it paints, and its find field picks them anew.
    const own = row.length > 0 && row.every((id) => session.styles.get(id)?.source.by === "user");
    return (
        <>
            {locked && <StateLine>This layer is locked</StateLine>}
            {isHidden(found) && <StateLine>Hidden: changes will not show until it is shown</StateLine>}
            {/* A native disabled fieldset: the platform disables every control in it. */}
            <fieldset disabled={locked} className="ws-row-fieldset">
                <RowStyle
                    key={row.join(" ")}
                    session={session}
                    row={row}
                    below={rowId}
                    head={own ? <WhichElements session={session} layer={row[0]} /> : undefined}
                />
            </fieldset>
        </>
    );
}

/**
 * A quiet line at the top of a panel.
 * @param props - Component props
 * @param props.children - the words
 * @returns The line
 */
function StateLine({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
    return (
        <Text size="xs" c="dimmed" px="md" py={4}>
            {children}
        </Text>
    );
}

/**
 * One row's Style tab: a group per kind the row paints, Nodes then Edges, each heading sticking to
 * the top of the panel while it scrolls (tier3 design, decisions 1.3 and 1.4).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.row - the row's layers
 * @param props.sides - the kinds the row may paint; a row that adds no layer shows only the kinds
 *   it has a layer on
 * @param props.fresh - the layer the row's first edit adds; left out, the row adds none
 * @param props.below - the tree row whose beneath the placeholders read
 * @param props.head - what the tab shows above the groups (a layer's Which elements)
 * @returns The tab
 */
function RowStyle({
    session,
    row,
    sides: offered = ["node", "edge"],
    fresh,
    below,
    head,
}: Readonly<{
    session: GraphSession;
    row: readonly LayerId[];
    sides?: readonly Target[];
    fresh?: NewLayer;
    below?: string;
    head?: React.ReactNode;
}>): React.JSX.Element {
    const scope = useFocusLine<HTMLDivElement>();
    const sides = offered.filter((t) => fresh !== undefined || rowLayers(session, row, t).length > 0);
    // Beneath the row: its tree row, else its lowest layer's, else (a row not written yet) the stack.
    const lowest = session.styles.list().find((layer) => row.includes(layer.id));
    const beneath = beneathOf(session, below ?? (lowest === undefined ? undefined : (lowest.row ?? lowest.id)));
    const colors = documentColors(session);
    return (
        <Stack ref={scope} gap={0} data-testid="style-tab" className="ws-style-panel">
            {head === undefined ? null : <div className="ws-style-panel-which">{head}</div>}
            {sides.map((side) => {
                const ctx: RowContext = {
                    session,
                    row,
                    side,
                    layers: rowLayers(session, row, side),
                    fresh,
                    beneath,
                    documentColors: colors,
                };
                const descriptors = channelsFor(side);
                return (
                    <div key={side} className="ws-style-group" data-group={side}>
                        <ControlSection
                            label={side === "node" ? "Nodes" : "Edges"}
                            collapsible={false}
                            headingLevel={3}
                        >
                            <Stack gap={4}>
                                {CORE_ROWS[side].map((spec) => (
                                    <PropertyRow key={spec.id} ctx={ctx} spec={spec} descriptors={descriptors} />
                                ))}
                                <LabelSection target={side} row={row} layers={ctx.layers} fresh={fresh} />
                                {LISTS[side].map((list) =>
                                    list.id === "effects" ? (
                                        <Effects key={list.id} ctx={ctx} />
                                    ) : (
                                        <ListSection key={list.id} ctx={ctx} list={list} descriptors={descriptors} />
                                    ),
                                )}
                            </Stack>
                        </ControlSection>
                    </div>
                );
            })}
        </Stack>
    );
}

/** One entry of a list: a channel of its own. */
interface Entry {
    readonly name: string;
    /** The channel adding it writes. */
    readonly adds: ChannelDescriptor;
}

/**
 * A list (Tooltip; Effects has its own component): its title with "+", and an entry for each one
 * the row writes. "+" adds the one entry left, or opens a menu of the rest; clicking the title of
 * an empty list opens the same menu, as Figma's empty Fill title does.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.list - the list
 * @param props.descriptors - the element's descriptors for this side
 * @returns The list
 */
function ListSection({
    ctx,
    list,
    descriptors,
}: Readonly<{ ctx: RowContext; list: ListSpec; descriptors: readonly ChannelDescriptor[] }>): React.JSX.Element {
    const { store } = useWorkspace();
    const [menuOpen, setMenuOpen] = useState(false);
    const channels = list.channels.flatMap((c) => descriptors.filter((d) => d.channel === c));
    const entries: Entry[] = channels.map((d) => ({ name: channelWord(d.channel), adds: d }));
    const isSet = (e: Entry): boolean => {
        const line = lineOf(ctx.layers, e.adds.channel);
        return line !== undefined && !line.layer.locked;
    };
    const set = entries.filter(isSet);
    const unset = entries.filter((e) => !isSet(e));
    const add = (entry: Entry): void => {
        setMenuOpen(false);
        if (entry.adds.channel === "node.tooltip") {
            // An empty tooltip says nothing, so a new Tooltip asks at once what it reads.
            openListNext(entry.adds.channel);
        } else {
            focusLineNext(entry.adds.channel);
        }
        // The layer the entry lands on: the row's own topmost, else the one its first edit adds.
        const selector = ([...ctx.layers].reverse().find((layer) => !layer.locked) ?? ctx.fresh)?.selector;
        writeLine(
            ctx.session,
            ctx.row,
            ctx.side,
            entry.adds.channel,
            { value: startingValue(entry.adds, ctx.session, selector) },
            ctx.fresh,
        ).catch(() => {
            focusLineNext(null);
            openListNext(null);
            store.set({ notice: { message: `${entry.name} could not be added` } });
        });
    };
    // Named by kind: both groups are on screen at once, and no two controls share a name.
    const groupName = `${ctx.side === "node" ? "Node" : "Edge"} ${list.title.toLowerCase()}`;
    const addLabel = unset.length === 1 ? `Add ${unset[0].name}` : `Add to ${groupName.toLowerCase()}`;
    let plus: React.JSX.Element | null = null;
    if (unset.length === 1) {
        plus = (
            <Tooltip label={addLabel}>
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={addLabel}
                    disabled={!unset[0].adds.renderable}
                    onClick={() => {
                        add(unset[0]);
                    }}
                >
                    <GLYPHS.add size={14} aria-hidden />
                </ActionIcon>
            </Tooltip>
        );
    } else if (unset.length > 1) {
        plus = (
            <Menu position="bottom-end" opened={menuOpen} onChange={setMenuOpen}>
                <Menu.Target>
                    <Tooltip label={addLabel}>
                        <ActionIcon variant="subtle" size="sm" aria-label={addLabel}>
                            <GLYPHS.add size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                    {unset.map((e) => (
                        <Menu.Item
                            key={e.adds.channel}
                            disabled={!e.adds.renderable}
                            onClick={() => {
                                add(e);
                            }}
                        >
                            <div>{e.name}</div>
                            {e.adds.renderable ? null : (
                                <Text size="xs" c="dimmed">
                                    Not drawn yet
                                </Text>
                            )}
                        </Menu.Item>
                    ))}
                </Menu.Dropdown>
            </Menu>
        );
    }
    // An empty list's title does what its "+" does: adds the one entry, or opens the menu.
    const onTitle = (): void => {
        if (unset.length === 1) {
            add(unset[0]);
        } else {
            setMenuOpen(true);
        }
    };
    return (
        <Stack gap={2} role="group" aria-label={groupName} data-section={list.id}>
            <Group gap={4} h={24} wrap="nowrap" justify="space-between">
                {set.length === 0 && unset.length > 0 ? (
                    // An empty list's title does what its "+" does, for a pointer; the "+" is the one
                    // control a keyboard or a screen reader reaches.
                    <UnstyledButton tabIndex={-1} aria-hidden onClick={onTitle}>
                        <Text size="xs" fw={600} pl={4} c="dimmed">
                            {list.title}
                        </Text>
                    </UnstyledButton>
                ) : (
                    <Text size="xs" fw={600} pl={4}>
                        {list.title}
                    </Text>
                )}
                {plus}
            </Group>
            {set.map((e) => (
                <div key={e.adds.channel} className="ws-property-row">
                    <span className="ws-property-row-gap" />
                    <Field ctx={ctx} descriptor={e.adds} />
                </div>
            ))}
        </Stack>
    );
}

/**
 * The name of the selection's own row: the rule that selected it (its text without the "="), a
 * node's label, an edge's ends, or how many are selected.
 * @param session - the element's session.
 * @returns the name.
 */
function selectionName(session: GraphSession): string {
    const { nodes, edges, origin } = session.selection;
    if (origin !== null && "text" in origin && origin.text.startsWith("=")) {
        return origin.text.slice(1).trim();
    }
    // A node is named by its id until graphty-element publishes its name (#895), as the header does.
    if (nodes.length === 1 && edges.length === 0) {
        return String(nodes[0]);
    }
    const edge = edges.length === 1 && nodes.length === 0 ? session.data.edge(edges[0]) : undefined;
    if (edge !== undefined) {
        return edgeName(session, edge);
    }
    const count = (n: number, word: string): string[] => (n === 0 ? [] : [`${String(n)} ${word}${n === 1 ? "" : "s"}`]);
    return [...count(nodes.length, "node"), ...count(edges.length, "edge")].join(", ");
}

/**
 * The Style tab of a node, an edge or several selected: the selection's own row, a reader layer
 * whose selector names exactly what is selected. The first edit adds it above the topmost row,
 * named after the selection, and selects it, so later edits land on it.
 * @returns The tab, or nothing before the element has come up
 */
export function SelectionRowStyle(): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    if (session === null) {
        return null;
    }
    const { nodes, edges } = session.selection;
    // Keyed by what is selected, so whether the row already existed is read afresh per selection.
    return <SelectionRow key={JSON.stringify([nodes, edges])} session={session} />;
}

/**
 * The selection's row, once the element has come up.
 * @param props - Component props
 * @param props.session - the element's session
 * @returns The tab
 */
function SelectionRow({ session }: Readonly<{ session: GraphSession }>): React.JSX.Element {
    const { store } = useWorkspace();
    const row = selectionRow(session);
    const [had] = useState(row.length > 0);
    const added = had ? undefined : row.at(-1);
    useEffect(() => {
        if (added !== undefined) {
            store.set({ inspected: { kind: "layer-row", id: added } });
        }
    }, [added, store]);
    const { nodes, edges } = session.selection;
    const sides: Target[] = [
        ...(nodes.length > 0 ? ["node" as const] : []),
        ...(edges.length > 0 ? ["edge" as const] : []),
    ];
    return (
        <RowStyle
            key={row.join(" ")}
            session={session}
            row={row}
            sides={sides}
            fresh={selectionLayer(session, selectionName(session))}
        />
    );
}

/** The element's selection highlight, as `session.config.selectionStyle` reads. */
type Highlight = GraphSession["config"]["selectionStyle"];

/**
 * The two parts of the highlight: the halo a selected node is drawn with and the band a selected
 * edge is drawn with, each its own color, opacity and size in the element's `selectionStyle`.
 */
const HIGHLIGHT_PARTS = [
    { title: "Nodes", color: "color", opacity: "opacity", scale: "scale" },
    { title: "Edges", color: "edgeColor", opacity: "edgeOpacity", scale: "edgeScale" },
] as const satisfies readonly {
    title: string;
    color: keyof Highlight;
    opacity: keyof Highlight;
    scale: keyof Highlight;
}[];

/**
 * The Selection row's Style: the highlight selected nodes and edges are drawn with, which is the
 * element's `selectionStyle` setting rather than a style layer. Each settled change is one
 * undoable step.
 * @returns The section, or nothing before the element has come up
 */
export function SelectionStyle(): React.JSX.Element | null {
    const { session, element, store } = useWorkspace();
    useStyleVersion(session, element);
    if (session === null) {
        return null;
    }
    const current = session.config.selectionStyle;
    const write = (patch: Partial<Highlight>): void => {
        // `selectionStyle` is replaced whole, so the settings not changed are written back as they are.
        session.config.set({ selectionStyle: { ...current, ...patch } }).catch(() => {
            store.set({ notice: { message: "The highlight could not be changed", error: true } });
        });
    };
    const hex = (color: string): string => color.slice(0, 7).toUpperCase();
    return (
        <Stack gap={8} p={8} data-testid="selection-style" role="group" aria-label="Highlight">
            {HIGHLIGHT_PARTS.map((part) => (
                <Stack key={part.title} gap={2} role="group" aria-label={part.title}>
                    <Text size="xs" fw={600} pl={4}>
                        {part.title}
                    </Text>
                    <div // NOSONAR(S6819): an ARIA group naming the paint field's controls; a fieldset would draw its own border and legend
                        role="group"
                        aria-label="Color"
                    >
                        <Text size="xs" aria-hidden>
                            Color
                        </Text>
                        <CompactColorInput
                            color={hex(current[part.color])}
                            defaultColor={hex(DEFAULT_SELECTION_STYLE[part.color])}
                            opacity={Math.round(current[part.opacity] * 100)}
                            defaultOpacity={Math.round(DEFAULT_SELECTION_STYLE[part.opacity] * 100)}
                            onChangeEnd={(color, opacity) => {
                                write({
                                    [part.color]: color ?? DEFAULT_SELECTION_STYLE[part.color],
                                    [part.opacity]: (opacity ?? DEFAULT_SELECTION_STYLE[part.opacity] * 100) / 100,
                                });
                            }}
                        />
                    </div>
                    <FieldRow>
                        <Text size="xs" truncate>
                            Size
                        </Text>
                        <ComboInput
                            label="Size"
                            width="100%"
                            numeric
                            options={[]}
                            value={current[part.scale]}
                            min={0.1}
                            step={0.05}
                            onChange={(scale) => {
                                if (typeof scale === "number" && scale > 0) {
                                    write({ [part.scale]: scale });
                                }
                            }}
                        />
                    </FieldRow>
                </Stack>
            ))}
        </Stack>
    );
}

/**
 * A group row's Style: the color its run paints the group, written into the run's color binding
 * as that group's own entry. A run that paints no color has nothing here to edit.
 * @param props - Component props
 * @param props.run - the run
 * @param props.group - the group, as the run's summary spells it
 * @returns The section, or nothing before the element has come up
 */
export function GroupStyle({
    run,
    group,
}: Readonly<{ run: string; group: string | number }>): React.JSX.Element | null {
    const { session, element, store } = useWorkspace();
    useStyleVersion(session, element);
    if (session === null) {
        return null;
    }
    const bound = runColorOf(session, run);
    if (bound === undefined) {
        return (
            <Text size="xs" c="dimmed" p="md">
                This run paints no color
            </Text>
        );
    }
    const block = colorBlockOf(session, run);
    const mapped = bound.binding.map?.[String(group)];
    const painted = (
        typeof mapped === "string" ? mapped : block?.swatches.find((swatch) => swatch.value === group)?.color
    )
        ?.slice(0, 7)
        .toUpperCase();
    return (
        <Stack gap={8} p={8} data-testid="group-style" role="group" aria-label="Fill">
            <Text size="xs" fw={600} pl={4}>
                Fill
            </Text>
            <CompactColorInput
                label="Color"
                color={painted}
                defaultColor={painted ?? "#000000"}
                showOpacity={false}
                onChangeEnd={(color) => {
                    if (color !== undefined) {
                        writeGroupColor(session, bound, block?.palette, group, color).catch(() => {
                            store.set({ notice: { message: "The group's color could not be changed", error: true } });
                        });
                    }
                }}
            />
        </Stack>
    );
}
