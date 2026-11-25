/**
 * Style panel v2's items of structured text channels (design/ui/style-panel-v2/design.md, section 6,
 * R15), drawn by `ItemListEditor`: inner lines and shape parts (polylines), polygon points and bends
 * (points), a Record's fields, an end's stack of caps and an edge Record's table rows. Each item is a
 * line with a "-"; "+" on the list's legend adds one. The channel keeps graphty-element's own text form,
 * read and written by its `readChannelItems` and `writeChannelItems`, one write an edit.
 */

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
import React from "react";

import { shownChannel } from "../offered";
import { ValueListbox } from "../parts/ValueListbox";
import type { RowContext } from "../PropertyRow";
import { AddButton } from "../Section";
import { PointPair, WordsField } from "./ItemFields";
import { coordinateDescriptor, type ItemList } from "./lists";
import { LineFrame } from "./RubricLine";
import { sectionsOf } from "./valueSections";

/** A point at the middle. */
const ORIGIN: ChannelPoint = { x: 0, y: 0 };

/** A new cell: words, never an empty input (design "Input rules"). */
const NEW_CELL = { lines: [{ text: "Cell" }] };

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
    const { ctx, list, descriptor } = args;
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
                        <AddButton
                            kind={ctx.side}
                            title={list.name}
                            name={`Add a point to ${name.toLowerCase()}`}
                            inRow
                            options={[{ key: "item", label: list.item }]}
                            onAdd={() => {
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
            // No point: graphty-element places a field a line below the one before (the app places none).
            // A new field has words, never an empty input (design "Input rules").
            put([...texts, { text: `Field ${String(texts.length + 1)}` }]);
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
                    // Named as every pair is ("Offset", "W / H"): where the field's words sit.
                    "X / Y",
                    <PointPair
                        descriptor={coordinateDescriptor(descriptor)}
                        label={`${name} point`}
                        point={field.x === undefined || field.y === undefined ? undefined : { x: field.x, y: field.y }}
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
    const { ctx, list, descriptor } = args;
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
                        <AddButton
                            kind={ctx.side}
                            title={list.name}
                            name={`Add a cell to ${name.toLowerCase()}`}
                            inRow
                            options={[{ key: "item", label: list.item }]}
                            onAdd={() => {
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
/** Each structured list's lines and "+", by its kind: what `ItemListEditor` draws. */
export const ITEM_KINDS = {
    points: pointsKind,
    polylines: polylinesKind,
    texts: textsKind,
    caps: capsKind,
    table: tableKind,
} as const;
