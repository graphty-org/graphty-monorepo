import { AlignmentMatrix, FieldRow, SegmentedControl } from "@graphty/compact-mantine";
import {
    type Channel,
    type LabelStyle,
    labelTemplateLine,
    labelTemplateRow,
    type LayerId,
} from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Checkbox, Group, Popover, Stack, Text, Tooltip } from "@mantine/core";
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

/** Why the Label "+" adds nothing now, or null when it adds a line. */
const ONE_LINE = "One label line per row for now";
const PICK_FIRST = "Pick an attribute for the new label line first";

/** The label channel and its style channel, by target. */
const CHANNELS = {
    node: { label: "node.label", style: "node.labelStyle" },
    edge: { label: "edge.label", style: "edge.labelStyle" },
} as const satisfies Record<Target, { label: Channel; style: Channel }>;

/**
 * Why the Label "+" adds nothing now.
 * @param line - the row's label line, if it has one.
 * @param empty - whether an empty line is waiting for its attribute.
 * @returns the reason, or null when "+" adds a line.
 */
function blockedReason(line: Line | undefined, empty: boolean): string | null {
    if (line !== undefined) {
        return ONE_LINE;
    }
    return empty ? PICK_FIRST : null;
}

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
 * The Label section (tier1-design.md section 3, item 1, and 5.T10): the Label "+" and the heading
 * word both add an empty label line at the next free position (Above) and open its attribute list.
 * The Show checkbox sits on the header, only when a layer beneath this row draws a label. One
 * label line per row until the element has labels keyed by position. The line states its result
 * from the element's `nodeLabelCounts`. An empty line writes nothing and is dropped when the
 * selection changes (the Style tab remounts this section per row).
 * @param props - Component props
 * @param props.target - nodes or edges
 * @param props.row - the row's layers
 * @param props.layers - the row's layers on this side
 * @returns The section
 */
export function LabelSection({ target, row, layers }: Readonly<LabelSectionProps>): React.JSX.Element | null {
    const { session, element, store } = useWorkspace();
    const [empty, setEmpty] = useState(false);
    const [listOpen, setListOpen] = useState(false);
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
    const card = isCard(labelStyle);
    // Card: the card look, and the plain label's one value as the card's first row, in bold.
    // Plain: the look taken off, and the card's first row as the label's one value. One undo step each.
    const setKind = (kind: string): void => {
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
        if (proposal.ok) {
            setEmpty(false);
            writeLine(session, row, target, channel, { binding: proposal.binding }).catch(fail);
        }
    };
    const blocked = blockedReason(line, empty);
    const add = (): void => {
        if (blocked === null) {
            setEmpty(true);
            setListOpen(true);
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
                    onClick={add}
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
                <Tooltip label={blocked ?? "Add label line"}>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        ml="auto"
                        aria-label="Add label line"
                        aria-disabled={blocked !== null}
                        data-disabled={blocked === null ? undefined : true}
                        onClick={add}
                    >
                        <Plus size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </Group>
            {line === undefined ? null : (
                <SegmentedControl
                    size="xs"
                    aria-label="Label kind"
                    value={card ? "card" : "plain"}
                    onChange={setKind}
                    data={[
                        { value: "plain", label: "Plain" },
                        { value: "card", label: "Card" },
                    ]}
                />
            )}
            {line !== undefined && card ? (
                <>
                    <FieldRow>
                        <Text size="xs">Position</Text>
                        <Position
                            location={labelStyle.location}
                            onLocation={(location) => {
                                writeStyle({ location });
                            }}
                        />
                    </FieldRow>
                    <CardContents
                        session={session}
                        target={target}
                        channel={channel}
                        lines={cardLines(line)}
                        onLines={(lines) => {
                            writeLine(session, row, target, channel, { template: lines }).catch(fail);
                        }}
                        onFail={(message) => {
                            store.set({ notice: { message } });
                        }}
                    />
                    <CardOptions style={labelStyle} onChange={writeStyle} />
                </>
            ) : null}
            {(line === undefined && !empty) || (line !== undefined && card) ? null : (
                <LabelLine
                    session={session}
                    target={target}
                    channel={channel}
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
                        setEmpty(false);
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
                <Tooltip label="Remove label line">
                    <ActionIcon variant="subtle" size="sm" aria-label="Remove label line" onClick={remove}>
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
                                ? `Label, ${position}: no attribute, draws nothing`
                                : `Label, ${position}: ${reads ?? ""}`
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
