/**
 * Style panel v2's parallel color lists (design/ui/style-panel-v2/design.md, section 6, R15 and R15r),
 * drawn by `ItemListEditor`: a list thing's items (a pie's slices, stripes, a chart's values) as lines
 * under a legend whose "+" adds one, each line its color chip and its numbers, a "-" taking it out. The
 * items are graphty-element's parallel space-separated list channels (`listOf`), read and written with the
 * catalog's one reader and writer, every list of one edit in one undo step.
 */

import { CompactColorInput } from "@graphty/compact-mantine";
import { type Channel, type ChannelDescriptor, listItemAddress } from "@graphty/graphty-element/catalog";
import { Group } from "@mantine/core";
import React from "react";

import { shownChannel } from "../offered";
import type { RowContext } from "../PropertyRow";
import { writeIn } from "../row";
import { drawnItems, type ListNumber, type ListSpec, nextColor, writeList } from "./lists";
import { LineFrame, NumberLine } from "./RubricLine";

/**
 * A number descriptor for one item of a number list.
 * @param descriptor - the list channel.
 * @param number - the number's spec.
 * @returns the descriptor a number field reads.
 */
function itemDescriptor(descriptor: ChannelDescriptor, number: ListNumber): ChannelDescriptor {
    return number.percent === true
        ? { ...descriptor, accepts: "number", min: 0, max: 1, step: 0.01 }
        : { ...descriptor, accepts: "number", min: 0 };
}

/**
 * A parallel color list's lines and "+", for `ItemListEditor`: see the file header.
 * @param args - the list.
 * @param args.ctx - the row.
 * @param args.list - the list.
 * @param args.fail - reports a write that failed.
 * @returns its lines, and what its "+" adds.
 */
export function colorItems({
    ctx,
    list,
    fail,
}: Readonly<{ ctx: RowContext; list: ListSpec; fail: (error: unknown) => void }>): {
    readonly lines: React.ReactNode;
    readonly add: () => void;
} {
    // A list the layers beneath draw shows here; an edit to one of its items writes that item alone.
    const drawn = drawnItems(ctx, list.colors);
    const colors = drawn.items;
    const numbers = Object.fromEntries(
        list.numbers.map(({ channel }) => [channel, drawnItems(ctx, channel).items]),
    ) as Record<Channel, string[]>;
    const write = (nextColors: readonly string[], nextNumbers: Partial<Record<Channel, readonly string[]>>): void => {
        writeList(ctx, list, nextColors, { ...numbers, ...nextNumbers }).catch(fail);
    };
    const writeItem = (channel: Channel, at: number, value: string): void => {
        writeIn(ctx, listItemAddress(channel, at), { value }).catch(fail);
    };
    const add = (): void => {
        write([...colors, nextColor(ctx, colors)], {});
    };
    const remove = (at: number): void => {
        const drop = (items: readonly string[]): string[] => items.filter((_, index) => index !== at);
        if (colors.length <= 1) {
            // The last item takes the whole list off: a list thing with no items draws nothing.
            writeIn(ctx, list.colors, { value: "" }).catch(fail);
            return;
        }
        write(drop(colors), Object.fromEntries(list.numbers.map(({ channel }) => [channel, drop(numbers[channel])])));
    };
    const setNumber = (channel: Channel, at: number, value: number | undefined, fill: number): void => {
        if (!drawn.own && value !== undefined && at < numbers[channel].length) {
            writeItem(channel, at, String(value));
            return;
        }
        const items = [...numbers[channel]];
        while (items.length <= at) {
            items.push(String(fill));
        }
        items[at] = String(value ?? fill);
        write(colors, { [channel]: items });
    };
    return {
        add,
        lines: colors.map((color, at) => {
            const name = `${list.item} ${String(at + 1)}`;
            return (
                <LineFrame
                    // eslint-disable-next-line react/no-array-index-key -- an item is its place in the list
                    key={at}
                    line={`${list.colors}:${String(at)}`}
                    name={null}
                    set
                    rule="R15"
                    control={
                        <Group gap={4} wrap="nowrap">
                            <CompactColorInput
                                variant="chip"
                                aria-label={`${name} color`}
                                color={color}
                                defaultColor={color}
                                showOpacity={false}
                                showReset={false}
                                swatches={ctx.documentColors}
                                onChange={(next) => {
                                    if (next === undefined) {
                                        return;
                                    }
                                    if (drawn.own) {
                                        write(
                                            colors.map((each, index) => (index === at ? next : each)),
                                            {},
                                        );
                                    } else {
                                        writeItem(list.colors, at, next);
                                    }
                                }}
                            />
                            {list.numbers.map((number) => {
                                const descriptor = shownChannel(ctx.session, ctx.side, number.channel, true);
                                if (descriptor === undefined) {
                                    return null;
                                }
                                const items = numbers[number.channel];
                                const fill = number.percent === true ? 1 : 1 / colors.length;
                                return (
                                    <NumberLine
                                        key={number.channel}
                                        descriptor={itemDescriptor(descriptor, number)}
                                        label={`${name} ${number.name.toLowerCase()}`}
                                        percent={number.percent === true}
                                        value={at < items.length ? Number(items[at]) : undefined}
                                        onWrite={(next) => {
                                            setNumber(number.channel, at, next, fill);
                                        }}
                                    />
                                );
                            })}
                        </Group>
                    }
                    modifier={null}
                    removeName={`Remove ${name.toLowerCase()}`}
                    onRemove={() => {
                        remove(at);
                    }}
                />
            );
        }),
    };
}

/**
 * A parallel color list's swatches, as the CSS background its row's value button draws (R15r).
 * @param ctx - the row.
 * @param list - the list.
 * @returns the background, or "" for an empty list.
 */
export function swatchesOf(ctx: RowContext, list: ListSpec): string {
    const colors = drawnItems(ctx, list.colors).items;
    const stops = colors.flatMap((color, at) => [
        `${color} ${String((at / colors.length) * 100)}%`,
        `${color} ${String(((at + 1) / colors.length) * 100)}%`,
    ]);
    return colors.length === 0 ? "" : `linear-gradient(to right, ${stops.join(", ")})`;
}
