import { FieldRow, MenuCheckItem } from "@graphty/compact-mantine";
import {
    type Channel,
    labelTemplateLine,
    type LabelTemplateRow,
    labelTemplateRow,
} from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Menu, Popover, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { Ellipsis, Plus } from "lucide-react";
import React, { useState } from "react";

import { type DataChoice, type Line, propose, sourceName, type Target } from "./row";
import { ValuePicker } from "./ValuePicker";

/**
 * A card's lines: the template's, or the one value a plain label reads, as one row.
 * @param line - the label line.
 * @returns the lines.
 */
export function cardLines(line: Line): readonly string[] {
    if (line.template !== undefined) {
        return line.template;
    }
    return line.binding === undefined ? [] : [labelTemplateLine({ text: "", path: line.binding.by })];
}

/**
 * What a card shows first, and how many rows follow: "name +2".
 * @param session - the element's session.
 * @param lines - the card's lines.
 * @returns the words.
 */
export function cardSummary(session: GraphSession, lines: readonly string[]): string {
    const first = lines.map(labelTemplateRow).find((row) => row !== null);
    const name = first === undefined ? (lines[0] ?? "Empty") : (sourceName(session, { by: first.path }) ?? first.path);
    return lines.length > 1 ? `${name} +${String(lines.length - 1)}` : name;
}

/** Props for CardContents. */
interface CardContentsProps {
    session: GraphSession;
    target: Target;
    /** The label channel. */
    channel: Channel;
    /** The template's lines, as the layer holds them. */
    lines: readonly string[];
    /** Writes the new lines. */
    onLines: (lines: string[]) => void;
    /** Reports a change that cannot be written. */
    onFail: (message: string) => void;
}

/**
 * The card's contents: one row per template line, each its words and one value from the data,
 * bold or not. A line that is not one row (written by hand: two values, a count or a rank) is
 * shown as written and kept; it can be moved, removed, or replaced by a value. graphty-element
 * reads and writes the lines (`labelTemplateRow`, `labelTemplateLine`) and leaves out a row whose
 * value is missing.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.target - nodes or edges
 * @param props.channel - the label channel
 * @param props.lines - the template's lines
 * @param props.onLines - writes the new lines
 * @param props.onFail - reports a refused change
 * @returns The rows
 */
export function CardContents({
    session,
    target,
    channel,
    lines,
    onLines,
    onFail,
}: Readonly<CardContentsProps>): React.JSX.Element {
    const [adding, setAdding] = useState(false);
    const pathOf = (choice: DataChoice): string | null => {
        const proposal = propose(session, choice, channel);
        return proposal.ok && "by" in proposal.binding ? proposal.binding.by : null;
    };
    const put = (at: number, row: LabelTemplateRow): void => {
        let line: string;
        try {
            line = labelTemplateLine(row);
        } catch {
            onFail("A card row's words cannot hold { or }");
            return;
        }
        const next = [...lines];
        next.splice(at, at < lines.length ? 1 : 0, line);
        onLines(next);
    };
    const move = (from: number, to: number): void => {
        const next = [...lines];
        const [line] = next.splice(from, 1);
        next.splice(to, 0, line);
        onLines(next);
    };

    return (
        <Stack gap={2} role="group" aria-label="Card contents">
            <Group gap={4} h={24} wrap="nowrap" justify="space-between">
                <Text size="xs" fw={600} pl={4}>
                    Card contents
                </Text>
                {/* Lists and menus here open in the Card settings popover's own tree, so a click in
                    one is not a click outside that closes it (Mantine's rule for nested popovers). */}
                <Popover opened={adding} onChange={setAdding} position="left-start" trapFocus withinPortal={false}>
                    <Popover.Target>
                        <Tooltip label="Add card row">
                            <ActionIcon
                                variant="subtle"
                                size="sm"
                                aria-label="Add card row"
                                onClick={() => {
                                    setAdding(!adding);
                                }}
                            >
                                <Plus size={14} aria-hidden />
                            </ActionIcon>
                        </Tooltip>
                    </Popover.Target>
                    <Popover.Dropdown p={0}>
                        <ValuePicker
                            title="Add card row"
                            target={target}
                            channel={channel}
                            onPick={(choice) => {
                                setAdding(false);
                                const path = pathOf(choice);
                                if (path !== null) {
                                    put(lines.length, { text: "", path, bold: lines.length === 0 });
                                }
                            }}
                            onClose={() => {
                                setAdding(false);
                            }}
                        />
                    </Popover.Dropdown>
                </Popover>
            </Group>
            {lines.map((line, at) => (
                <CardRow
                    // The line and its place: an edit, a move or Undo redraws the row with the new words.
                    key={`${String(at)} ${line}`}
                    session={session}
                    target={target}
                    channel={channel}
                    at={at}
                    count={lines.length}
                    line={line}
                    pathOf={pathOf}
                    onRow={(row) => {
                        put(at, row);
                    }}
                    onMove={(to) => {
                        move(at, to);
                    }}
                    onRemove={() => {
                        onLines(lines.filter((_, i) => i !== at));
                    }}
                />
            ))}
        </Stack>
    );
}

/** Props for CardRow. */
interface CardRowProps {
    session: GraphSession;
    target: Target;
    channel: Channel;
    /** The row's place, from 0. */
    at: number;
    /** How many rows the card has. */
    count: number;
    /** The template line. */
    line: string;
    /** The path a pick reads, or null when the element refuses it. */
    pathOf: (choice: DataChoice) => string | null;
    /** Writes the row in this place. */
    onRow: (row: LabelTemplateRow) => void;
    onMove: (to: number) => void;
    onRemove: () => void;
}

/**
 * One card row: its words, the value it reads (opening the value list), and a menu to make it
 * bold, move it or remove it. A line that is not a row shows its text as written instead.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.target - nodes or edges
 * @param props.channel - the label channel
 * @param props.at - the row's place
 * @param props.count - how many rows the card has
 * @param props.line - the template line
 * @param props.pathOf - the path a pick reads
 * @param props.onRow - writes the row
 * @param props.onMove - moves the row
 * @param props.onRemove - removes the row
 * @returns The row
 */
function CardRow({
    session,
    target,
    channel,
    at,
    count,
    line,
    pathOf,
    onRow,
    onMove,
    onRemove,
}: Readonly<CardRowProps>): React.JSX.Element {
    const [picking, setPicking] = useState(false);
    const row = labelTemplateRow(line);
    const place = `Card row ${String(at + 1)}`;
    const value = row === null ? "" : (sourceName(session, { by: row.path }) ?? row.path);

    const menu = (
        <Menu position="bottom-end" withinPortal={false}>
            <Menu.Target>
                <Tooltip label={`${place} actions`}>
                    <ActionIcon variant="subtle" size="sm" aria-label={`${place} actions`}>
                        <Ellipsis size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
                {row === null ? null : (
                    <MenuCheckItem
                        checked={row.bold === true}
                        onClick={() => {
                            onRow({ ...row, bold: row.bold !== true });
                        }}
                    >
                        Bold
                    </MenuCheckItem>
                )}
                <Menu.Item
                    disabled={at === 0}
                    onClick={() => {
                        onMove(at - 1);
                    }}
                >
                    Move up
                </Menu.Item>
                <Menu.Item
                    disabled={at === count - 1}
                    onClick={() => {
                        onMove(at + 1);
                    }}
                >
                    Move down
                </Menu.Item>
                <Menu.Item onClick={onRemove}>Remove</Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );

    const picker = (
        <Popover opened={picking} onChange={setPicking} position="left-start" trapFocus withinPortal={false}>
            <Popover.Target>
                <Button
                    size="compact-xs"
                    variant="subtle"
                    color="dark"
                    fw={row?.bold === true ? 700 : undefined}
                    fullWidth
                    justify="flex-start"
                    title={row === null ? undefined : value}
                    aria-label={row === null ? `${place}: replace with a value` : `${place} value: ${value}`}
                    onClick={() => {
                        setPicking(!picking);
                    }}
                >
                    {row === null ? "Replace with a value" : value}
                </Button>
            </Popover.Target>
            <Popover.Dropdown p={0}>
                <ValuePicker
                    title={place}
                    target={target}
                    channel={channel}
                    inUse={row === null ? [] : [row.path]}
                    onPick={(choice) => {
                        setPicking(false);
                        const path = pathOf(choice);
                        if (path !== null) {
                            onRow({ text: row?.text ?? "", path, bold: row?.bold });
                        }
                    }}
                    onClose={() => {
                        setPicking(false);
                    }}
                />
            </Popover.Dropdown>
        </Popover>
    );

    if (row === null) {
        // Written by hand: kept exactly as it is, shown as written.
        return (
            <Stack gap={0} data-card-row={at}>
                <FieldRow trailing={menu}>
                    <Text size="xs" c="dimmed" truncate title={line} aria-label={`${place}, written by hand: ${line}`}>
                        {line}
                    </Text>
                </FieldRow>
                <FieldRow>{picker}</FieldRow>
            </Stack>
        );
    }

    return (
        <FieldRow trailing={menu} data-card-row={at}>
            <TextInput
                size="xs"
                aria-label={`${place} words`}
                placeholder="Words"
                defaultValue={row.text}
                onBlur={(event) => {
                    if (event.currentTarget.value !== row.text) {
                        onRow({ ...row, text: event.currentTarget.value });
                    }
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.currentTarget.blur();
                    }
                }}
            />
            {picker}
        </FieldRow>
    );
}
