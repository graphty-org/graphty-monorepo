import { AlignmentMatrix } from "@graphty/compact-mantine";
import type { LabelStyle, LayerId } from "@graphty/graphty-element/schema";
import type { Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Checkbox, Group, Popover, Stack, Text, Tooltip } from "@mantine/core";
import { Minus, Plus } from "lucide-react";
import React, { useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { FromDataList } from "./FromDataList";
import { type DataChoice, lineOf, propose, removeLine, setBeneath, sourceName, type Target, writeLine } from "./row";
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
export function LabelSection({ target, row, layers }: LabelSectionProps): React.JSX.Element | null {
    const { session, element, store } = useWorkspace();
    const [empty, setEmpty] = useState(false);
    const [listOpen, setListOpen] = useState(false);
    const [positionOpen, setPositionOpen] = useState(false);
    if (session === null) {
        return null;
    }
    const channel = target === "node" ? "node.label" : "edge.label";
    const styleChannel = target === "node" ? "node.labelStyle" : "edge.labelStyle";
    const line = lineOf(layers, channel);
    const styleValue = lineOf(layers, styleChannel)?.value;
    const labelStyle: LabelStyle = typeof styleValue === "object" && !("r" in styleValue) ? styleValue : {};
    const fail = (): void => {
        store.set({ notice: { message: "The label could not be changed" } });
    };
    const writeStyle = (change: LabelStyle): void => {
        writeLine(session, row, target, styleChannel, { value: { ...labelStyle, ...change } }).catch(fail);
    };
    const pick = (choice: DataChoice): void => {
        setListOpen(false);
        const proposal = propose(session, choice, channel);
        if (proposal.ok) {
            setEmpty(false);
            writeLine(session, row, target, channel, { binding: proposal.binding }).catch(fail);
        }
    };
    let blocked: string | null = null;
    if (line !== undefined) {
        blocked = ONE_LINE;
    } else if (empty) {
        blocked = PICK_FIRST;
    }
    const add = (): void => {
        if (blocked === null) {
            setEmpty(true);
            setListOpen(true);
        }
    };
    const position = positionWord(labelStyle.location);
    const source = line?.binding === undefined ? null : sourceName(session, line.binding);
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
            {line === undefined && !empty ? null : (
                <Group gap={4} h={24} wrap="nowrap" data-line={channel}>
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
                                value={cellOfLocation(labelStyle.location)}
                                onChange={(cell) => {
                                    writeStyle({ location: locationOfCell(cell) });
                                }}
                            />
                        </Popover.Dropdown>
                    </Popover>
                    <Text size="xs" w={52} style={{ flexShrink: 0 }}>
                        {position}
                    </Text>
                    <Popover opened={listOpen} onChange={setListOpen} position="left-start" trapFocus>
                        <Popover.Target>
                            <Button
                                size="compact-xs"
                                variant="subtle"
                                color={line === undefined ? "gray" : "dark"}
                                style={{ flex: 1, minWidth: 0 }}
                                justify="flex-start"
                                aria-label={
                                    line === undefined
                                        ? `Label, ${position}: no attribute, draws nothing`
                                        : `Label, ${position}: ${source ?? "reads nothing"}`
                                }
                                onClick={() => {
                                    setListOpen(!listOpen);
                                }}
                            >
                                {line === undefined ? "Pick an attribute" : `Abc ${source ?? "reads nothing"}`}
                            </Button>
                        </Popover.Target>
                        <Popover.Dropdown p={0}>
                            <FromDataList
                                target={target}
                                channel={channel}
                                inUse={line?.binding === undefined ? [] : [line.binding.by]}
                                onPick={pick}
                                onClose={() => {
                                    setListOpen(false);
                                }}
                            />
                        </Popover.Dropdown>
                    </Popover>
                    <Tooltip label="Remove label line">
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label="Remove label line"
                            onClick={() => {
                                if (line === undefined) {
                                    setEmpty(false);
                                    return;
                                }
                                if (!line.layer.locked) {
                                    removeLine(session, line.layer, channel).catch(fail);
                                }
                            }}
                        >
                            <Minus size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            )}
            {line !== undefined && target === "node" && element !== null ? (
                <Text size="xs" c="dimmed" pl={4} aria-live="polite">
                    {labelStatement(element.nodeLabelCounts, declutter)}
                </Text>
            ) : null}
        </Stack>
    );
}
