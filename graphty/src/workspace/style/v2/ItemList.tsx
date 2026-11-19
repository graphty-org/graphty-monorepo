/**
 * Style panel v2's list editor for structured text channels (design/ui/style-panel-v2/design.md,
 * section 6, R15): inner lines and shape parts (polylines), polygon points and bends (points), a
 * Record's fields, an end's stack of caps and an edge Record's table rows. Each item is a line
 * with a "-"; "+" on the list's legend adds one. The channel keeps graphty-element's own text form,
 * read and written by its `readChannelItems` and `writeChannelItems`, one write an edit.
 */

import { ControlGroup } from "@graphty/compact-mantine";
import {
    type Channel,
    type ChannelDescriptor,
    type ChannelItemTypes,
    type ChannelPoint,
    type ItemChannel,
    type LabelTableRow,
    readChannelItems,
    type ShapeTextItem,
    writeChannelItems,
} from "@graphty/graphty-element/catalog";
import { ActionIcon, Group, TextInput, Tooltip } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import { shownChannel } from "../offered";
import { ValueListbox } from "../parts/ValueListbox";
import type { RowContext } from "../PropertyRow";
import { lineIn, writeIn } from "../row";
import { failureWords } from "../words";
import { unsetIn } from "./lineWrites";
import { coordinateDescriptor, type ItemList } from "./lists";
import { LineFrame, NumberLine } from "./RubricLine";
import { sectionsOf } from "./valueSections";

/**
 * A "+" with its tooltip.
 * @param props - Component props
 * @param props.label - its name ("Add line")
 * @param props.onClick - what it adds
 * @returns The button
 */
export function AddItemButton({ label, onClick }: Readonly<{ label: string; onClick: () => void }>): React.JSX.Element {
    return (
        <Tooltip label={label}>
            <ActionIcon variant="subtle" size="sm" aria-label={label} onClick={onClick}>
                <GLYPHS.add size={14} aria-hidden />
            </ActionIcon>
        </Tooltip>
    );
}

/**
 * Words typed into a field, written on Enter or blur (R14).
 * @param props - Component props
 * @param props.label - its accessible name
 * @param props.value - its words
 * @param props.onWrite - writes new words
 * @returns The field
 */
function WordsField({
    label,
    value,
    onWrite,
}: Readonly<{ label: string; value: string; onWrite: (words: string) => void }>): React.JSX.Element {
    return (
        <TextInput
            key={value}
            size="xs"
            aria-label={label}
            defaultValue={value}
            onBlur={(event) => {
                if (event.currentTarget.value !== value) {
                    onWrite(event.currentTarget.value);
                }
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    event.currentTarget.blur();
                }
            }}
        />
    );
}

/**
 * A point as an X | Y pair (design 2.2).
 * @param props - Component props
 * @param props.descriptor - a number descriptor for its coordinates
 * @param props.label - its name ("Line 1 point 2")
 * @param props.point - its coordinates
 * @param props.onWrite - writes new coordinates
 * @returns The pair
 */
export function PointPair({
    descriptor,
    label,
    point,
    onWrite,
}: Readonly<{
    descriptor: ChannelDescriptor;
    label: string;
    point: ChannelPoint | undefined;
    onWrite: (point: ChannelPoint | undefined) => void;
}>): React.JSX.Element {
    const write = (at: "x" | "y", next: number | undefined): void => {
        // Both emptied takes the point off; one emptied reads as 0. A length after a fraction stays.
        const other = at === "x" ? point?.y : point?.x;
        onWrite(next === undefined && other === undefined ? undefined : { ...(point ?? ORIGIN), [at]: next ?? 0 });
    };
    return (
        <Group grow gap={4} wrap="nowrap">
            {(["X", "Y"] as const).map((letter, at) => (
                <NumberLine
                    key={letter}
                    descriptor={descriptor}
                    label={`${label} ${letter.toLowerCase()}`}
                    percent={false}
                    value={at === 0 ? point?.x : point?.y}
                    glyph={letter}
                    onWrite={(next) => {
                        write(at === 0 ? "x" : "y", next);
                    }}
                />
            ))}
        </Group>
    );
}

/** A point at the middle. */
const ORIGIN: ChannelPoint = { x: 0, y: 0 };

/** A table cell with empty words. */
const NEW_CELL = { lines: [{ text: "" }] };

/** What each kind's lines need. */
interface KindArgs {
    readonly ctx: RowContext;
    readonly list: ItemList;
    readonly descriptor: ChannelDescriptor;
    readonly value: unknown;
    readonly write: (text: string | undefined) => void;
}

/**
 * A list's items as graphty-element reads them, and the write of new ones in its text form.
 * @param args - the list.
 * @param channel - its channel, as the kind's channels.
 * @returns the items, and their write.
 */
function itemsIn<C extends ItemChannel>(
    args: KindArgs,
    channel: C,
): { items: readonly ChannelItemTypes[C][]; put: (next: readonly ChannelItemTypes[C][]) => void } {
    return {
        items: readChannelItems(channel, args.value),
        put: (next) => {
            args.write(next.length === 0 ? undefined : writeChannelItems(channel, next, args.value));
        },
    };
}

/**
 * One line of a list.
 * @param key - its React key.
 * @param line - what it edits, for `data-line`.
 * @param name - its name, or null.
 * @param control - its control.
 * @param remove - its "-", if it has one.
 * @param remove.label - the "-"'s name.
 * @param remove.onRemove - what the "-" takes off.
 * @param modifier - its modifier slot.
 * @returns The line.
 */
function itemLine(
    key: string,
    line: string,
    name: string | null,
    control: React.ReactNode,
    remove?: { readonly label: string; readonly onRemove: () => void },
    modifier: React.ReactNode = null,
): React.JSX.Element {
    return (
        <LineFrame
            key={key}
            line={line}
            name={name}
            set
            rule="R15"
            control={control}
            modifier={modifier}
            removeName={remove?.label}
            onRemove={remove?.onRemove ?? (() => undefined)}
        />
    );
}

/**
 * Points (`node.shapePoints`, `edge.bends`), one X | Y line each.
 * @param args - the list.
 * @returns The lines, and what "+" adds.
 */
function pointsKind(args: KindArgs): { lines: React.ReactNode; add: () => void } {
    const { list, descriptor } = args;
    const { items: points, put } = itemsIn(args, list.channel as "node.shapePoints" | "edge.bends");
    return {
        add: () => {
            put([...points, ORIGIN]);
        },
        lines: points.map((point, at) => {
            const name = `${list.item} ${String(at + 1)}`;
            return itemLine(
                String(at),
                `${descriptor.channel}:${String(at)}`,
                name,
                <PointPair
                    descriptor={coordinateDescriptor(descriptor)}
                    label={name}
                    point={point}
                    onWrite={(next) => {
                        put(
                            next === undefined
                                ? points.filter((_, i) => i !== at)
                                : points.map((p, i) => (i === at ? next : p)),
                        );
                    }}
                />,
                {
                    label: `Remove ${name.toLowerCase()}`,
                    onRemove: () => {
                        put(points.filter((_, i) => i !== at));
                    },
                },
            );
        }),
    };
}

/**
 * Polylines (`node.shapeLines`, `node.shapeParts`): each its name and first point, a "+" adding a
 * point, then its other points, each with a "-" while it keeps two.
 * @param args - the list.
 * @returns The lines, and what "+" adds.
 */
function polylinesKind(args: KindArgs): { lines: React.ReactNode; add: () => void } {
    const { list, descriptor } = args;
    const channel = list.channel as "node.shapeLines" | "node.shapeParts";
    const { items: lines, put } = itemsIn(args, channel);
    const coordinates = coordinateDescriptor(descriptor);
    return {
        add: () => {
            put([...lines, ...readChannelItems(channel, list.fresh)]);
        },
        lines: lines.flatMap((points, at) => {
            const name = `${list.item} ${String(at + 1)}`;
            // The first point's "-" takes the whole line off; another's, that point, while two stay.
            const removeOf = (index: number): { label: string; onRemove: () => void } | undefined => {
                if (index === 0) {
                    return {
                        label: `Remove ${name.toLowerCase()}`,
                        onRemove: () => {
                            put(lines.filter((_, i) => i !== at));
                        },
                    };
                }
                return points.length > 2
                    ? {
                          label: `Remove ${name.toLowerCase()} point ${String(index + 1)}`,
                          onRemove: () => {
                              setPoint(index, undefined);
                          },
                      }
                    : undefined;
            };
            const setPoint = (index: number, next: ChannelPoint | undefined): void => {
                const kept =
                    next === undefined
                        ? points.filter((_, i) => i !== index)
                        : points.map((p, i) => (i === index ? next : p));
                put(lines.map((each, i) => (i === at ? kept : each)));
            };
            return points.map((point, index) =>
                itemLine(
                    `${String(at)}-${String(index)}`,
                    `${descriptor.channel}:${String(at)}:${String(index)}`,
                    index === 0 ? name : null,
                    <PointPair
                        descriptor={coordinates}
                        label={`${name} point ${String(index + 1)}`}
                        point={point}
                        onWrite={(next) => {
                            setPoint(index, next);
                        }}
                    />,
                    removeOf(index),
                    index === 0 ? (
                        <AddItemButton
                            label={`Add a point to ${name.toLowerCase()}`}
                            onClick={() => {
                                put(lines.map((each, i) => (i === at ? [...each, each.at(-1) ?? ORIGIN] : each)));
                            }}
                        />
                    ) : null,
                ),
            );
        }),
    };
}

/**
 * A Record's fields (`node.shapeTexts`): each its words, then its point.
 * @param args - the list.
 * @returns The lines, and what "+" adds.
 */
function textsKind(args: KindArgs): { lines: React.ReactNode; add: () => void } {
    const { list, descriptor } = args;
    const { items: texts, put } = itemsIn(args, "node.shapeTexts");
    const change = (at: number, next: Partial<ShapeTextItem>): void => {
        put(texts.map((each, i) => (i === at ? { ...each, ...next } : each)));
    };
    return {
        add: () => {
            put([...texts, { ...ORIGIN, text: "" }]);
        },
        lines: texts.flatMap((field, at) => {
            const name = `${list.item} ${String(at + 1)}`;
            return [
                itemLine(
                    `${String(at)}-text`,
                    `${descriptor.channel}:${String(at)}`,
                    name,
                    <WordsField
                        label={`${name} text`}
                        value={field.text}
                        onWrite={(text) => {
                            change(at, { text });
                        }}
                    />,
                    {
                        label: `Remove ${name.toLowerCase()}`,
                        onRemove: () => {
                            put(texts.filter((_, i) => i !== at));
                        },
                    },
                ),
                itemLine(
                    `${String(at)}-point`,
                    `${descriptor.channel}:${String(at)}:point`,
                    null,
                    <PointPair
                        descriptor={coordinateDescriptor(descriptor)}
                        label={`${name} point`}
                        point={field}
                        onWrite={(point) => {
                            change(at, { x: point?.x ?? 0, y: point?.y ?? 0 });
                        }}
                    />,
                ),
            ];
        }),
    };
}

/**
 * An end's stack of caps: each its cap from today's arrow list.
 * @param args - the list.
 * @returns The lines, and what "+" adds.
 */
function capsKind(args: KindArgs): { lines: React.ReactNode; add: () => void } {
    const { ctx, list, descriptor } = args;
    const channel = list.channel as "edge.arrowHeadStack" | "edge.arrowTailStack";
    const { items: caps, put } = itemsIn(args, channel);
    const arrow = shownChannel(ctx.session, ctx.side, descriptor.channel.replace(/Stack$/, "") as Channel, true);
    return {
        add: () => {
            put([...caps, ...readChannelItems(channel, list.fresh)]);
        },
        lines: caps.map((cap, at) => {
            const name = `${list.item} ${String(at + 1)}`;
            return itemLine(
                String(at),
                `${descriptor.channel}:${String(at)}`,
                null,
                arrow === undefined ? null : (
                    <ValueListbox
                        session={ctx.session}
                        descriptor={arrow}
                        label={name}
                        value={cap.type}
                        shown={undefined}
                        sections={sectionsOf(arrow.channel)}
                        counts={false}
                        onPick={(type) => {
                            put(caps.map((each, i) => (i === at ? { ...each, type } : each)));
                        }}
                    />
                ),
                {
                    label: `Remove ${name.toLowerCase()}`,
                    onRemove: () => {
                        put(caps.filter((_, i) => i !== at));
                    },
                },
            );
        }),
    };
}

/**
 * An edge Record's table: each row its name and first cell, a "+" adding a cell, then its other
 * cells, each with a "-" while the row keeps one.
 * @param args - the list.
 * @returns The lines, and what "+" adds.
 */
function tableKind(args: KindArgs): { lines: React.ReactNode; add: () => void } {
    const { list, descriptor } = args;
    const { items: rows, put } = itemsIn(args, list.channel as "node.labelTable" | "edge.labelTable");
    return {
        add: () => {
            put([...rows, { cells: [NEW_CELL] }]);
        },
        lines: rows.flatMap((row, at) => {
            const name = `${list.item} ${String(at + 1)}`;
            const putCells = (cells: LabelTableRow["cells"]): void => {
                put(rows.map((each, i) => (i === at ? { ...each, cells } : each)));
            };
            // A cell's words are its first line's; its other lines and settings stay.
            const setCell = (index: number, words: string | undefined): void => {
                putCells(
                    words === undefined
                        ? row.cells.filter((_, i) => i !== index)
                        : row.cells.map((cell, i) => {
                              const [first, ...more] = cell.lines ?? [];
                              return i === index ? { ...cell, lines: [{ ...first, text: words }, ...more] } : cell;
                          }),
                );
            };
            const cells = row.cells.map((cell) => cell.lines?.[0]?.text ?? "");
            return cells.map((words, index) =>
                itemLine(
                    `${String(at)}-${String(index)}`,
                    `${descriptor.channel}:${String(at)}:${String(index)}`,
                    index === 0 ? name : null,
                    <WordsField
                        label={`${name} cell ${String(index + 1)}`}
                        value={words}
                        onWrite={(next) => {
                            setCell(index, next);
                        }}
                    />,
                    index === 0
                        ? {
                              label: `Remove ${name.toLowerCase()}`,
                              onRemove: () => {
                                  put(rows.filter((_, i) => i !== at));
                              },
                          }
                        : {
                              label: `Remove ${name.toLowerCase()} cell ${String(index + 1)}`,
                              onRemove: () => {
                                  setCell(index, undefined);
                              },
                          },
                    index === 0 ? (
                        <AddItemButton
                            label={`Add a cell to ${name.toLowerCase()}`}
                            onClick={() => {
                                putCells([...row.cells, NEW_CELL]);
                            }}
                        />
                    ) : null,
                ),
            );
        }),
    };
}

/** Each kind's lines. */
const KINDS = {
    points: pointsKind,
    polylines: polylinesKind,
    texts: textsKind,
    caps: capsKind,
    table: tableKind,
} as const;

/**
 * A structured channel's list: see the file header.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the channel
 * @param props.list - its list
 * @param props.legend - "group": its own sub-group under a legend (a thing's whole Main, Inner
 *     lines' Lines); "line": a named line holding "+", inside the sub-group it belongs to
 * @returns The list
 */
export function ItemListEditor({
    ctx,
    channel,
    list,
    legend,
}: Readonly<{
    ctx: RowContext;
    channel: Channel;
    list: ItemList;
    legend: "group" | "line";
}>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const descriptor = shownChannel(ctx.session, ctx.side, channel, true);
    if (descriptor === undefined) {
        return null;
    }
    const value = lineIn(ctx, channel)?.value;
    const write = (text: string | undefined): void => {
        const done = text === undefined ? unsetIn(ctx, [channel]) : writeIn(ctx, channel, { value: text });
        done.catch((error: unknown) => {
            store.set({ notice: { message: failureWords(list.name, "changed", error), error: true } });
        });
    };
    const { lines, add } = KINDS[list.kind]({ ctx, list, descriptor, value, write });
    const plus = <AddItemButton label={`Add ${list.item.toLowerCase()}`} onClick={add} />;
    if (legend === "group") {
        return (
            <ControlGroup label={list.name} actions={plus}>
                {lines}
            </ControlGroup>
        );
    }
    const set = value !== undefined && value !== "";
    return (
        <>
            <LineFrame
                line={channel}
                name={list.name}
                set={set}
                rule="R15"
                control={null}
                modifier={plus}
                removeName={set ? `Remove ${list.name.toLowerCase()}` : undefined}
                onRemove={() => {
                    write(undefined);
                }}
            />
            {lines}
        </>
    );
}
