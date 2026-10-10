import { ComboInput, CompactColorInput, FieldRow, SegmentedControl } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor, toColorValue } from "@graphty/graphty-element/catalog";
import { DEFAULT_SELECTION_STYLE, type LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Group, Indicator, Menu, Stack, Text, Tooltip, VisuallyHidden } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { GLYPHS } from "../glyphs";
import { edgeName } from "../inspector/words";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { LabelSection } from "./LabelSection";
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
import { CompoundSetLine, PAINT_FIELD_WIDTH, PaintLine, SetLine } from "./SetLine";
import { focusLineNext, openListNext, useFocusLine } from "./useFocusLine";
import { useStyleVersion } from "./useStyleVersion";
import { channelWord, type CompoundLine, compoundOf, isLineChannel, SECTIONS, type StyleSection } from "./words";

/** Props for StyleTab. */
interface StyleTabProps {
    /**
     * The row's style layers (one per side it paints). Left out, the row is the inspected row's.
     */
    layers?: readonly LayerId[];
}

/**
 * The row the Style tab edits when the caller names none, read from `inspected` as the paint tree
 * writes it (`{ kind, id }`, the inspector's kinds): the Everything row while nothing is inspected
 * or the Everything row is; a run's row (measure or run) is the run's layers, its id being the run
 * id; a reader's own layer row is that layer. Anything else (a group, an element, the selection)
 * has no row here, so an edit never lands on a row the reader is not looking at.
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
 * Every color the document's layers set, for the Color popover's swatches.
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
 * The Style tab of every row that paints (tier1-design.md section 2.8): the Nodes | Edges switch,
 * the fixed sections, each listing only what the row sets, with "+" adding what it does not.
 * Generated from graphty-element's channel descriptors (`channelsFor`), never typed.
 * @param props - Component props
 * @param props.layers - the row's style layers
 * @returns The tab, or nothing before the element has come up
 */
export function StyleTab({ layers }: Readonly<StyleTabProps>): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    const inspected = useWorkspaceState((state) => state.inspected);
    if (session === null) {
        return null;
    }
    const row = layers ?? defaultRow(session, inspected);
    if (row === null) {
        return null;
    }
    // Only the Everything row adds a layer of its own; a run's or a layer's row writes to its own.
    const everything = layers === undefined && (inspected?.kind ?? "everything-row") === "everything-row";
    // Keyed by the row, so an empty label line and the side are dropped when the selection changes.
    return (
        <RowStyle key={row.join(" ")} session={session} row={row} fresh={everything ? EVERYTHING_LAYER : undefined} />
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
 * whose `{ match: "ids" }` selector names exactly what is selected. The first edit adds it above
 * the topmost row, named after the selection, and selects it, so later edits land on it.
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

/**
 * One row's Style tab.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.row - the row's layers
 * @param props.sides - the sides the row can paint; one side draws no Nodes | Edges switch
 * @param props.fresh - the layer the row's first edit adds; left out, the row adds none, so a
 *   side the row has no layer on is not offered
 * @returns The tab
 */
function RowStyle({
    session,
    row,
    sides: offered = ["node", "edge"],
    fresh,
}: Readonly<{
    session: GraphSession;
    row: readonly LayerId[];
    sides?: readonly Target[];
    fresh?: NewLayer;
}>): React.JSX.Element {
    // A side with no layer of the row's, and no layer to add, has no lines to offer.
    const sides = offered.filter((t) => fresh !== undefined || rowLayers(session, row, t).length > 0);
    // The reader's own lines only: the element's locked base layers set something on both sides
    // of the Everything row, which would make the dot say nothing.
    const sets = (target: Target): boolean =>
        rowLayers(session, row, target).some((l) => !l.locked && (l.set !== undefined || l.encode !== undefined));
    const [side, setSide] = useState<Target>(() => {
        if (sides.length === 1) {
            return sides[0];
        }
        return !sets("node") && sets("edge") ? "edge" : "node";
    });
    const scope = useFocusLine<HTMLDivElement>();
    const layers = rowLayers(session, row, side);
    const colors = documentColors(session);
    // The dot marks a side this row sets something on. It sits clear of the word, and the
    // side's tooltip says what it means: unexplained, it read as a stray mark.
    const sideLabel = (target: Target, words: string): React.JSX.Element =>
        sets(target) ? (
            <Tooltip label={`This row sets ${target} properties`}>
                <Indicator size={5} offset={-8} position="middle-end">
                    <span aria-hidden>{words}</span>
                    <VisuallyHidden>{words}, set</VisuallyHidden>
                </Indicator>
            </Tooltip>
        ) : (
            <span>{words}</span>
        );

    return (
        <Stack ref={scope} gap={8} p={8} data-testid="style-tab">
            {sides.length > 1 && (
                <SegmentedControl
                    size="xs"
                    aria-label="Paints"
                    value={side}
                    onChange={(value) => {
                        setSide(value === "edge" ? "edge" : "node");
                    }}
                    data={[
                        { value: "node", label: sideLabel("node", "Nodes") },
                        { value: "edge", label: sideLabel("edge", "Edges") },
                    ]}
                />
            )}
            {SECTIONS[side].map((section) =>
                section.id === "label" ? (
                    <LabelSection key={section.id} target={side} row={row} layers={layers} fresh={fresh} />
                ) : (
                    <Section
                        key={section.id}
                        section={section}
                        target={side}
                        row={row}
                        layers={layers}
                        documentColors={colors}
                        fresh={fresh}
                    />
                ),
            )}
        </Stack>
    );
}

/** One line a section can list: a channel of its own, or a compound line covering several. */
interface Entry {
    /** The line's name. */
    readonly name: string;
    /** The channels it covers. */
    readonly descriptors: readonly ChannelDescriptor[];
    /** The channel adding it writes. */
    readonly adds: ChannelDescriptor;
    /** The compound line, when it is one. */
    readonly compound?: CompoundLine;
}

/**
 * One fixed section: its header with "+", and a line for each property the row sets. "+" adds the
 * one property left, or opens a menu of the unset ones; one the element cannot draw is listed
 * disabled with the reason.
 * @param props - Component props
 * @param props.section - the section
 * @param props.target - nodes or edges
 * @param props.row - the row's layers
 * @param props.layers - the row's layers on this side
 * @param props.documentColors - colors the document uses
 * @param props.fresh - the layer the row's first edit adds, when the row adds one
 * @returns The section
 */
function Section({
    section,
    target,
    row,
    layers,
    documentColors: colors,
    fresh,
}: Readonly<{
    section: StyleSection;
    target: Target;
    row: readonly LayerId[];
    layers: readonly Layer[];
    documentColors: readonly string[];
    fresh?: NewLayer;
}>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    if (session === null) {
        return null;
    }
    const channels = channelsFor(target).filter((d) => section.holds(d) && isLineChannel(d));
    // One entry per line: a channel of its own, or a compound line in place of its parts.
    const entries: Entry[] = [];
    for (const d of channels) {
        const compound = compoundOf(d.channel);
        if (compound === undefined) {
            entries.push({ name: channelWord(d.channel), descriptors: [d], adds: d });
        } else if (!entries.some((e) => e.compound === compound)) {
            const parts = channels.filter((c) => compoundOf(c.channel) === compound);
            const adds = parts.find((c) => c.channel === compound.adds) ?? d;
            entries.push({ name: compound.name, descriptors: parts, adds, compound });
        }
    }
    const isSet = (e: Entry): boolean => e.descriptors.some((d) => lineOf(layers, d.channel) !== undefined);
    const set = entries.filter(isSet);
    const unset = entries.filter((e) => !isSet(e));
    const add = (entry: Entry): void => {
        const from = channels.find((d) => d.channel === entry.compound?.startsFrom) ?? entry.adds;
        if (entry.adds.channel === "node.size") {
            // A fixed size changes nothing visible, so a new Size line asks at once what the sizes
            // follow, "Fixed size" first; the list takes focus.
            openListNext(entry.adds.channel);
        } else {
            // The pick can remove "+" itself, so focus goes to the new line rather than back to it.
            focusLineNext(entry.adds.channel);
        }
        // The layer the line lands on: the row's own topmost, else the one its first edit adds.
        const selector = ([...layers].reverse().find((layer) => !layer.locked) ?? fresh)?.selector;
        writeLine(
            session,
            row,
            target,
            entry.adds.channel,
            { value: startingValue(from, session, selector) },
            fresh,
        ).catch(() => {
            openListNext(null);
            focusLineNext(null);
            store.set({ notice: { message: `${entry.name} could not be added` } });
        });
    };
    const addLabel = `Add to ${section.title}`;
    let plus: React.JSX.Element | null = null;
    if (unset.length === 1 && unset[0].adds.renderable) {
        plus = (
            <Tooltip label={`Add ${unset[0].name}`}>
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={`Add ${unset[0].name}`}
                    onClick={() => {
                        add(unset[0]);
                    }}
                >
                    <GLYPHS.add size={14} aria-hidden />
                </ActionIcon>
            </Tooltip>
        );
    } else if (unset.length > 0) {
        plus = (
            <Menu position="bottom-end">
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

    return (
        <Stack gap={2} role="group" aria-label={section.title} data-section={section.id}>
            <Group gap={4} h={24} wrap="nowrap" justify="space-between">
                <Text size="xs" fw={600} pl={4}>
                    {section.title}
                </Text>
                {plus}
            </Group>
            {set.map((e) => {
                const line = lineOf(layers, e.adds.channel);
                if (e.compound !== undefined) {
                    return (
                        <CompoundSetLine
                            key={e.adds.channel}
                            compound={e.compound}
                            descriptors={e.descriptors}
                            layers={layers}
                            row={row}
                            documentColors={colors}
                            fresh={fresh}
                        />
                    );
                }
                return line === undefined ? null : (
                    <SetLine
                        key={e.adds.channel}
                        descriptor={e.adds}
                        line={line}
                        row={row}
                        documentColors={colors}
                        fresh={fresh}
                    />
                );
            })}
        </Stack>
    );
}

/**
 * A section's header, as the Style tab's sections draw it.
 * @param props - Component props
 * @param props.title - the section's name
 * @returns The header
 */
function SectionTitle({ title }: Readonly<{ title: string }>): React.JSX.Element {
    return (
        <Group gap={4} h={24} wrap="nowrap">
            <Text size="xs" fw={600} pl={4}>
                {title}
            </Text>
        </Group>
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
                    <SectionTitle title={part.title} />
                    <PaintLine name="Color">
                        <CompactColorInput
                            width={PAINT_FIELD_WIDTH}
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
                    </PaintLine>
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
            <SectionTitle title="Fill" />
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
