import { AdvancedButton, AlignmentMatrix, FieldRow } from "@graphty/compact-mantine";
import {
    type Channel,
    type LabelStyle,
    labelTemplateLine,
    labelTemplateRow,
    type LayerId,
} from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Checkbox, ColorSwatch, Group, Menu, Popover, Stack, Text, Tooltip } from "@mantine/core";
import { Minus, Plus } from "lucide-react";
import React, { useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { CARD_LOOK, isCard, plainLook } from "./cardLook";
import { FromDataList } from "./FromDataList";
import { CardContents, CardOptions } from "./LabelCard";
import {
    type DataChoice,
    type Line,
    lineOf,
    type LineWrite,
    propose,
    readsNothing,
    removeLine,
    setBeneath,
    sourceName,
    type Target,
    writeLine,
    writeLines,
} from "./row";
import { cellOfLocation, labelStatement, locationOfCell, positionWord } from "./words";

/** Props for LabelSection. */
interface LabelSectionProps {
    /** Nodes or edges. */
    target: Target;
    /** The row's layers. */
    row: readonly LayerId[];
    /** The row's layers on this side, bottom first. */
    layers: readonly Layer[];
}

/** Why the Label "+" adds nothing now. */
const PICK_FIRST = "Pick an attribute for the new label line first";

/** The "+" name and tooltip. */
const ADD = "Add label or card";

/** The two ways a layer shows its label: a plain label line, or a card. */
type Kind = "label" | "card";

/** Each kind's name, in the "+" menu and on its row. */
const KIND_WORD = { label: "Label", card: "Card" } as const satisfies Record<Kind, string>;

/** The label channel and its style channel, by target. */
const CHANNELS = {
    node: { label: "node.label", style: "node.labelStyle" },
    edge: { label: "edge.label", style: "edge.labelStyle" },
} as const satisfies Record<Target, { label: Channel; style: Channel }>;

/**
 * What the line draws: the bound attribute's name, graphty-element's own "nothing answers this
 * path", or the literal text the row writes.
 * @param session - the element's session.
 * @param target - nodes or edges.
 * @param channel - the label channel.
 * @param line - the row's label line, if it has one.
 * @returns the words, or null without a line.
 */
function readsOf(session: GraphSession, target: Target, channel: Channel, line: Line | undefined): string | null {
    if (line === undefined) {
        return null;
    }
    if (line.template !== undefined) {
        return "Several values";
    }
    if (line.binding === undefined) {
        return JSON.stringify(line.value) ?? "";
    }
    return readsNothing(session, target, channel, line.binding)
        ? "reads nothing"
        : (sourceName(session, line.binding) ?? line.binding.by);
}

/**
 * The Label section (tier1-design.md section 3, item 1, and 5.T10), Figma's add-with-type list:
 * the "+" (and the heading word) offers Label or Card. Either starts as an empty row at Above with
 * its attribute list open; picking writes it. A layer shows its label one way, so once a row is
 * there "+" offers only the other kind, which replaces it and keeps what it reads (one undo step).
 * A plain label is one row (position, value, "-"); a card is one row (position, panel color and
 * contents, the Card settings button that opens everything else in a popover, "-"). The Show
 * checkbox sits on the header, only when a layer beneath this row draws a label. The line states
 * its result from the element's `nodeLabelCounts`. An empty row writes nothing and is dropped when
 * the selection changes (the Style tab remounts this section per row).
 * @param props - Component props
 * @param props.target - nodes or edges
 * @param props.row - the row's layers
 * @param props.layers - the row's layers on this side
 * @returns The section
 */
export function LabelSection({ target, row, layers }: Readonly<LabelSectionProps>): React.JSX.Element | null {
    const { session, element, store } = useWorkspace();
    const [empty, setEmpty] = useState<Kind | null>(null);
    const [listOpen, setListOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    // Off when a pick opens a new row's attribute list, so the closing menu leaves focus in the list.
    const [menuReturnsFocus, setMenuReturnsFocus] = useState(true);
    if (session === null) {
        return null;
    }
    const { label: channel, style: styleChannel } = CHANNELS[target];
    const line = lineOf(layers, channel);
    const styleValue = lineOf(layers, styleChannel)?.value;
    const labelStyle: LabelStyle = typeof styleValue === "object" && !("r" in styleValue) ? styleValue : {};
    const fail = (): void => {
        store.set({ notice: { message: "The label could not be changed" } });
    };
    const writeStyle = (change: LabelStyle): void => {
        writeLine(session, row, target, styleChannel, { value: { ...labelStyle, ...change } }).catch(fail);
    };
    const card = line !== undefined && isCard(labelStyle);
    // Card: the card look, and the plain label's one value as the card's first row, in bold.
    // Label: the look taken off, and the card's first row as the label's one value. One undo step each.
    const setKind = (kind: Kind): void => {
        const lines: [Channel, LineWrite][] = [];
        if (kind === "card") {
            lines.push([styleChannel, { value: { ...labelStyle, ...CARD_LOOK } }]);
            if (line?.binding !== undefined) {
                lines.push([
                    channel,
                    { template: [labelTemplateLine({ text: "", path: line.binding.by, bold: true })] },
                ]);
            }
        } else {
            lines.push([styleChannel, { value: plainLook(labelStyle) }]);
            const first = line?.template?.map(labelTemplateRow).find((r) => r !== null);
            if (first !== undefined) {
                lines.push([channel, { binding: { by: first.path } }]);
            }
        }
        writeLines(session, row, target, lines).catch(fail);
    };
    const pick = (choice: DataChoice): void => {
        setListOpen(false);
        const proposal = propose(session, choice, channel);
        if (!proposal.ok) {
            return;
        }
        const kind = empty;
        setEmpty(null);
        if (kind === "card" && "by" in proposal.binding) {
            // The new card: its look and the picked value as its first row, in bold. One undo step.
            writeLines(session, row, target, [
                [styleChannel, { value: { ...labelStyle, ...CARD_LOOK } }],
                [channel, { template: [labelTemplateLine({ text: "", path: proposal.binding.by, bold: true })] }],
            ]).catch(fail);
        } else {
            writeLine(session, row, target, channel, { binding: proposal.binding }).catch(fail);
        }
    };
    const blocked = empty === null ? null : PICK_FIRST;
    // A layer shows its label one way: with a row there, "+" offers the other kind, which replaces it.
    let offered: readonly Kind[] = ["label", "card"];
    if (line !== undefined) {
        offered = card ? ["label"] : ["card"];
    }
    const add = (kind: Kind): void => {
        if (line === undefined) {
            setMenuReturnsFocus(false);
            setEmpty(kind);
            setListOpen(true);
        } else {
            setKind(kind);
        }
    };
    const reads = readsOf(session, target, channel, line);
    const declutter = element?.layoutBehavior?.labels?.declutter === true;

    return (
        <Stack gap={2} role="group" aria-label="Label" data-section="label">
            <Group gap={4} h={24} wrap="nowrap">
                <Button
                    size="compact-xs"
                    variant="subtle"
                    color="dark"
                    fw={600}
                    aria-disabled={blocked !== null}
                    onClick={() => {
                        setMenuReturnsFocus(true);
                        setMenuOpen(blocked === null);
                    }}
                >
                    Label
                </Button>
                {setBeneath(session, row, channel) ? (
                    <Checkbox
                        size="xs"
                        label="Show"
                        checked={labelStyle.enabled !== false}
                        onChange={(event) => {
                            writeStyle({ enabled: event.currentTarget.checked });
                        }}
                    />
                ) : null}
                <Menu
                    opened={menuOpen}
                    onChange={(opened) => {
                        if (opened) {
                            setMenuReturnsFocus(true);
                        }
                        setMenuOpen(opened && blocked === null);
                    }}
                    returnFocus={menuReturnsFocus}
                    position="bottom-end"
                >
                    <Menu.Target>
                        <Tooltip label={blocked ?? ADD}>
                            <ActionIcon
                                variant="subtle"
                                size="sm"
                                ml="auto"
                                aria-label={ADD}
                                aria-disabled={blocked !== null}
                                data-disabled={blocked === null ? undefined : true}
                            >
                                <Plus size={14} aria-hidden />
                            </ActionIcon>
                        </Tooltip>
                    </Menu.Target>
                    <Menu.Dropdown>
                        {offered.map((kind) => (
                            <Menu.Item
                                key={kind}
                                onClick={() => {
                                    add(kind);
                                }}
                            >
                                <div>{KIND_WORD[kind]}</div>
                                {line === undefined ? null : (
                                    <Text size="xs" c="dimmed">
                                        Replaces the {card ? "card" : "label"}
                                    </Text>
                                )}
                            </Menu.Item>
                        ))}
                    </Menu.Dropdown>
                </Menu>
            </Group>
            {line !== undefined && card ? (
                <CardLine
                    session={session}
                    target={target}
                    channel={channel}
                    line={line}
                    labelStyle={labelStyle}
                    onStyle={writeStyle}
                    onLines={(lines) => {
                        writeLine(session, row, target, channel, { template: lines }).catch(fail);
                    }}
                    onRemove={() => {
                        if (!line.layer.locked) {
                            removeLine(session, line.layer, [channel, styleChannel]).catch(fail);
                        }
                    }}
                    onFail={(message) => {
                        store.set({ notice: { message } });
                    }}
                />
            ) : null}
            {(line === undefined && empty === null) || card ? null : (
                <LabelLine
                    session={session}
                    target={target}
                    channel={channel}
                    kind={KIND_WORD[line === undefined ? (empty ?? "label") : "label"]}
                    line={line}
                    reads={reads}
                    location={labelStyle.location}
                    listOpen={listOpen}
                    onListOpen={setListOpen}
                    onPick={pick}
                    onLocation={(location) => {
                        writeStyle({ location });
                    }}
                    onDropEmpty={() => {
                        setEmpty(null);
                    }}
                    onFail={fail}
                />
            )}
            {line !== undefined && target === "node" && element !== null ? (
                <Text size="xs" c="dimmed" pl={4} aria-live="polite">
                    {labelStatement(element.nodeLabelCounts, declutter)}
                </Text>
            ) : null}
        </Stack>
    );
}

/** Props for CardLine. */
interface CardLineProps {
    session: GraphSession;
    target: Target;
    /** The label channel. */
    channel: Channel;
    /** The row's label line. */
    line: Line;
    /** The label's style. */
    labelStyle: LabelStyle;
    /** Merges a change into the label's style. */
    onStyle: (change: LabelStyle) => void;
    /** Writes the card's lines. */
    onLines: (lines: string[]) => void;
    /** Removes the card. */
    onRemove: () => void;
    /** Reports a change that cannot be written. */
    onFail: (message: string) => void;
}

/**
 * The card's one row (Figma's effect row): its position, its panel color and what it shows first,
 * and the Card settings button, which opens everything else in a popover beside the panel: the
 * contents rows, shadow, close button, keep in view, screen size, corners and colors. "-" removes
 * the card, its look with it. Escape closes the popover (an open list inside it first) and focus
 * goes back to the button.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.target - nodes or edges
 * @param props.channel - the label channel
 * @param props.line - the row's label line
 * @param props.labelStyle - the label's style
 * @param props.onStyle - merges a style change
 * @param props.onLines - writes the card's lines
 * @param props.onRemove - removes the card
 * @param props.onFail - reports a refused change
 * @returns The row
 */
function CardLine({
    session,
    target,
    channel,
    line,
    labelStyle,
    onStyle,
    onLines,
    onRemove,
    onFail,
}: Readonly<CardLineProps>): React.JSX.Element {
    const [open, setOpen] = useState(false);
    const lines = cardLines(line);
    const first = lines.map(labelTemplateRow).find((r) => r !== null);
    const firstName =
        first === undefined ? (lines[0] ?? "Empty") : (sourceName(session, { by: first.path }) ?? first.path);
    const summary = lines.length > 1 ? `${firstName} +${String(lines.length - 1)}` : firstName;
    return (
        <FieldRow
            data-line={channel}
            data-card
            groupLabel={`Card, ${positionWord(labelStyle.location)}: ${summary}`}
            trailing={
                <Tooltip label="Remove card">
                    <ActionIcon variant="subtle" size="sm" aria-label="Remove card" onClick={onRemove}>
                        <Minus size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            }
        >
            <Position
                location={labelStyle.location}
                onLocation={(location) => {
                    onStyle({ location });
                }}
            />
            <Group gap={4} wrap="nowrap" miw={0}>
                <Popover
                    opened={open}
                    onChange={setOpen}
                    position="left-start"
                    width={264}
                    trapFocus
                    returnFocus
                    // Escape is handled below, so it closes an open list inside first.
                    closeOnEscape={false}
                >
                    <Popover.Target>
                        <AdvancedButton
                            label="Card settings"
                            aria-expanded={open}
                            onClick={() => {
                                setOpen(!open);
                            }}
                        />
                    </Popover.Target>
                    <Popover.Dropdown
                        aria-label="Card settings"
                        onKeyDown={(event) => {
                            // Only an Escape from the popover itself, not from a list or menu open in it.
                            const from = event.target instanceof Element ? event.target : null;
                            if (
                                event.key === "Escape" &&
                                from?.closest('[role="dialog"], [role="menu"]') === event.currentTarget
                            ) {
                                setOpen(false);
                            }
                        }}
                    >
                        <Stack gap={8}>
                            <CardContents
                                session={session}
                                target={target}
                                channel={channel}
                                lines={lines}
                                onLines={onLines}
                                onFail={onFail}
                            />
                            <CardOptions style={labelStyle} onChange={onStyle} />
                        </Stack>
                    </Popover.Dropdown>
                </Popover>
                <ColorSwatch size={14} radius="sm" color={labelStyle.background ?? "#ffffff"} aria-hidden />
                <Text size="xs" truncate title={summary}>
                    {summary}
                </Text>
            </Group>
        </FieldRow>
    );
}

/**
 * The card's lines: the template's, or the one value a plain label read, as one row.
 * @param line - the row's label line.
 * @returns the lines.
 */
function cardLines(line: Line): readonly string[] {
    if (line.template !== undefined) {
        return line.template;
    }
    return line.binding === undefined ? [] : [labelTemplateLine({ text: "", path: line.binding.by })];
}

/**
 * Where the label sits: its position word, and the button that opens the alignment matrix.
 * @param props - Component props
 * @param props.location - where the label sits
 * @param props.onLocation - called with a new position
 * @returns The control
 */
function Position({
    location,
    onLocation,
}: Readonly<{
    location: LabelStyle["location"];
    onLocation: (location: LabelStyle["location"]) => void;
}>): React.JSX.Element {
    const [positionOpen, setPositionOpen] = useState(false);
    return (
        <Group gap={4} wrap="nowrap">
            <Popover opened={positionOpen} onChange={setPositionOpen} position="left-start" trapFocus>
                <Popover.Target>
                    <Tooltip label="Label position">
                        <ActionIcon
                            variant="default"
                            size="sm"
                            aria-label="Label position"
                            onClick={() => {
                                setPositionOpen(!positionOpen);
                            }}
                        >
                            <Text size="xs" component="span">
                                Aa
                            </Text>
                        </ActionIcon>
                    </Tooltip>
                </Popover.Target>
                <Popover.Dropdown>
                    <AlignmentMatrix
                        label="Label position"
                        value={cellOfLocation(location)}
                        onChange={(cell) => {
                            onLocation(locationOfCell(cell));
                        }}
                    />
                </Popover.Dropdown>
            </Popover>
            <Text size="xs" truncate>
                {positionWord(location)}
            </Text>
        </Group>
    );
}

/** Props for LabelLine. */
interface LabelLineProps {
    session: GraphSession;
    target: Target;
    /** The label channel. */
    channel: Channel;
    /** What the row is: Label, or Card while a new card waits for its first value. */
    kind: string;
    /** The row's label line, or undefined for the empty line waiting for its attribute. */
    line: Line | undefined;
    /** What the line draws, in words. */
    reads: string | null;
    /** Where the label sits. */
    location: LabelStyle["location"];
    /** Whether the attribute list is open. */
    listOpen: boolean;
    onListOpen: (open: boolean) => void;
    onPick: (choice: DataChoice) => void;
    onLocation: (location: LabelStyle["location"]) => void;
    /** Drops the empty line. */
    onDropEmpty: () => void;
    /** Reports a change the element refused. */
    onFail: () => void;
}

/**
 * The label line: its position, the attribute it reads with its list, and its remove button.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.target - nodes or edges
 * @param props.channel - the label channel
 * @param props.kind - Label, or Card for a new card's empty row
 * @param props.line - the row's label line, or undefined for the empty line
 * @param props.reads - what the line draws, in words
 * @param props.location - where the label sits
 * @param props.listOpen - whether the attribute list is open
 * @param props.onListOpen - opens or closes the attribute list
 * @param props.onPick - called with the picked attribute
 * @param props.onLocation - called with a new position
 * @param props.onDropEmpty - drops the empty line
 * @param props.onFail - reports a refused change
 * @returns The line
 */
function LabelLine({
    session,
    target,
    channel,
    kind,
    line,
    reads,
    location,
    listOpen,
    onListOpen,
    onPick,
    onLocation,
    onDropEmpty,
    onFail,
}: Readonly<LabelLineProps>): React.JSX.Element {
    const position = positionWord(location);
    const remove = (): void => {
        if (line === undefined) {
            onDropEmpty();
        } else if (!line.layer.locked) {
            removeLine(session, line.layer, channel).catch(onFail);
        }
    };

    return (
        <FieldRow
            data-line={channel}
            trailing={
                <Tooltip label={`Remove ${kind.toLowerCase()} line`}>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        aria-label={`Remove ${kind.toLowerCase()} line`}
                        onClick={remove}
                    >
                        <Minus size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            }
        >
            <Position location={location} onLocation={onLocation} />
            <Popover opened={listOpen} onChange={onListOpen} position="left-start" trapFocus>
                <Popover.Target>
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        color={line === undefined ? "gray" : "dark"}
                        fullWidth
                        justify="flex-start"
                        aria-label={
                            line === undefined
                                ? `${kind}, ${position}: no attribute, draws nothing`
                                : `${kind}, ${position}: ${reads ?? ""}`
                        }
                        onClick={() => {
                            onListOpen(!listOpen);
                        }}
                    >
                        {line === undefined ? "Pick an attribute" : `Abc ${reads ?? ""}`}
                    </Button>
                </Popover.Target>
                <Popover.Dropdown p={0}>
                    <FromDataList
                        target={target}
                        channel={channel}
                        inUse={line?.binding === undefined ? [] : [line.binding.by]}
                        onPick={onPick}
                        onClose={() => {
                            onListOpen(false);
                        }}
                    />
                </Popover.Dropdown>
            </Popover>
        </FieldRow>
    );
}
