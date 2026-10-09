import { AlignmentMatrix, FieldRow, Popout, PopoutButton } from "@graphty/compact-mantine";
import type { Channel, LabelStyle, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Checkbox, Group, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { FromDataList } from "./FromDataList";
import {
    type DataChoice,
    type Line,
    lineOf,
    type NewLayer,
    propose,
    readsNothing,
    removeLine,
    setBeneath,
    sourceName,
    type Target,
    writeLine,
} from "./row";
import { focusLineNext, focusSectionNext } from "./useFocusLine";
import { cellOfLocation, labelStatement, locationOfCell, positionWord } from "./words";

/** Props for LabelSection. */
interface LabelSectionProps {
    /** Nodes or edges. */
    target: Target;
    /** The row's layers. */
    row: readonly LayerId[];
    /** The row's layers on this side, bottom first. */
    layers: readonly Layer[];
    /** The layer the row's first edit adds, when it is not the Everything row. */
    fresh?: NewLayer;
}

/** Why the Label "+" adds nothing now, or null when it adds a line. */
const ONE_LINE = "One label line per row for now";
const PICK_FIRST = "Pick an attribute for the new label line first";

/** The width of the label line's pop-outs, as wide as the panel's own rows. */
const POPOUT_WIDTH = 248;

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
 * from the element's `nodeLabelCounts`, beside Show all labels (off by default), which the
 * element host writes to the element's `layoutBehavior.labels.declutter`. An empty line writes
 * nothing and is dropped when the selection changes (the Style tab remounts this section per row).
 * @param props - Component props
 * @param props.target - nodes or edges
 * @param props.row - the row's layers
 * @param props.layers - the row's layers on this side
 * @param props.fresh - the layer the row's first edit adds, when it is not the Everything row
 * @returns The section
 */
export function LabelSection({ target, row, layers, fresh }: Readonly<LabelSectionProps>): React.JSX.Element | null {
    const { session, element, store } = useWorkspace();
    const [empty, setEmpty] = useState(false);
    const [listOpen, setListOpen] = useState(false);
    const allLabelsShown = useWorkspaceState((state) => state.allLabelsShown);
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
        writeLine(session, row, target, styleChannel, { value: { ...labelStyle, ...change } }, fresh).catch(fail);
    };
    const pick = (choice: DataChoice): void => {
        setListOpen(false);
        const proposal = propose(session, choice, channel);
        if (proposal.ok) {
            setEmpty(false);
            // The list closes and the line is redrawn bound; focus goes to the line, not the body.
            focusLineNext(channel, true);
            writeLine(session, row, target, channel, { binding: proposal.binding }, fresh).catch(() => {
                focusLineNext(null);
                fail();
            });
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

    return (
        <Stack gap={2} role="group" aria-label="Label" data-section="label">
            <Group gap={4} h={24} wrap="nowrap">
                {/* The heading word adds a line too, so it is a button drawn as the other sections' headings. */}
                <UnstyledButton aria-disabled={blocked !== null} onClick={add}>
                    <Text size="xs" fw={600} pl={4}>
                        Label
                    </Text>
                </UnstyledButton>
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
                        <GLYPHS.add size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </Group>
            {line === undefined && !empty ? null : (
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
                <Group gap={8} pl={4} wrap="nowrap">
                    <Text size="xs" c="dimmed" aria-live="polite">
                        {labelStatement(element.nodeLabelCounts, !allLabelsShown)}
                    </Text>
                    <Checkbox
                        size="xs"
                        ml="auto"
                        label="Show all labels"
                        checked={allLabelsShown}
                        onChange={(event) => {
                            store.set({ allLabelsShown: event.currentTarget.checked });
                        }}
                    />
                </Group>
            ) : null}
        </Stack>
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
    const [positionOpen, setPositionOpen] = useState(false);
    const position = positionWord(location);
    const remove = (event: React.MouseEvent): void => {
        if (line === undefined) {
            focusSectionNext(event.currentTarget, channel);
            onDropEmpty();
        } else if (!line.layer.locked) {
            focusSectionNext(event.currentTarget, channel);
            removeLine(session, line.layer, channel).catch(() => {
                focusLineNext(null);
                onFail();
            });
        }
    };

    return (
        <FieldRow
            data-line={channel}
            data-bound={line?.binding === undefined ? undefined : true}
            trailing={
                <Tooltip label="Remove label line">
                    <ActionIcon variant="subtle" size="sm" aria-label="Remove label line" onClick={remove}>
                        <GLYPHS.remove size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            }
        >
            <Group gap={4} wrap="nowrap">
                <Popout opened={positionOpen} onOpenChange={setPositionOpen}>
                    <Popout.Trigger>
                        {/* The Tooltip passes the trigger's click and ref to the button, but not
                            its ARIA, so the button states its own. */}
                        <Tooltip label="Label position">
                            <PopoutButton
                                icon={
                                    <Text size="xs" component="span">
                                        Aa
                                    </Text>
                                }
                                aria-label="Label position"
                                aria-haspopup="dialog"
                                aria-expanded={positionOpen}
                            />
                        </Tooltip>
                    </Popout.Trigger>
                    <Popout.Panel
                        width={POPOUT_WIDTH}
                        placement="left"
                        alignment="start"
                        header={{ variant: "title", title: "Label position" }}
                    >
                        <Popout.Content>
                            <AlignmentMatrix
                                label="Label position"
                                value={cellOfLocation(location)}
                                onChange={(cell) => {
                                    onLocation(locationOfCell(cell));
                                }}
                            />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
                <Text size="xs" truncate>
                    {position}
                </Text>
            </Group>
            <Popout opened={listOpen} onOpenChange={onListOpen}>
                <Popout.Trigger>
                    {/* A boxed field, as the other values are. */}
                    <Button
                        size="compact-xs"
                        variant="default"
                        c={line === undefined ? "dimmed" : undefined}
                        fullWidth
                        justify="flex-start"
                        aria-label={
                            line === undefined
                                ? `Label, ${position}: no attribute, draws nothing`
                                : `Label, ${position}: ${reads ?? ""}`
                        }
                    >
                        {line === undefined ? "Pick an attribute" : `Abc ${reads ?? ""}`}
                    </Button>
                </Popout.Trigger>
                <Popout.Panel
                    width={POPOUT_WIDTH}
                    placement="left"
                    alignment="start"
                    header={{ variant: "title", title: "Label" }}
                >
                    <FromDataList
                        target={target}
                        channel={channel}
                        inUse={line?.binding === undefined ? [] : [line.binding.by]}
                        onPick={onPick}
                        onClose={() => {
                            onListOpen(false);
                        }}
                    />
                </Popout.Panel>
            </Popout>
        </FieldRow>
    );
}
