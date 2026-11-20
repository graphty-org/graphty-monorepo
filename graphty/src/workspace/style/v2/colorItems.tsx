/**
 * Style panel v2's list editor (design/ui/style-panel-v2/design.md, section 6, R15 and R15r): a
 * list thing's items (a pie's slices, stripes, a chart's values) as lines under a legend whose "+"
 * adds one, each line its color chip and its numbers, a "-" taking it out; and the row's swatch
 * strip, which opens the thing's pop-over on the list. The items are graphty-element's parallel
 * space-separated list channels (`listOf`), read and written with the catalog's one reader and
 * writer, every list of one edit in one undo step.
 */

import { CompactColorInput, ControlGroup } from "@graphty/compact-mantine";
import type { Channel, ChannelDescriptor } from "@graphty/graphty-element/catalog";
import { ActionIcon, Button, Group, Tooltip } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import { shownChannel } from "../offered";
import type { RowContext } from "../PropertyRow";
import { writeIn } from "../row";
import { failureWords } from "../words";
import { itemsOf, type ListNumber, type ListSpec, nextColor, writeList } from "./lists";
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
 * The list's lines: see the file header.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.list - the list
 * @returns The sub-group
 */
export function ListGroup({ ctx, list }: Readonly<{ ctx: RowContext; list: ListSpec }>): React.JSX.Element {
    const { store } = useWorkspace();
    const colors = itemsOf(ctx, list.colors);
    const numbers = Object.fromEntries(list.numbers.map(({ channel }) => [channel, itemsOf(ctx, channel)])) as Record<
        Channel,
        string[]
    >;
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords(list.name, "changed", error), error: true } });
    };
    const write = (nextColors: readonly string[], nextNumbers: Partial<Record<Channel, readonly string[]>>): void => {
        writeList(ctx, list, nextColors, { ...numbers, ...nextNumbers }).catch(fail);
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
        const items = [...numbers[channel]];
        while (items.length <= at) {
            items.push(String(fill));
        }
        items[at] = String(value ?? fill);
        write(colors, { [channel]: items });
    };
    return (
        <ControlGroup
            label={list.name}
            actions={
                <Tooltip label={`Add ${list.item.toLowerCase()}`}>
                    <ActionIcon variant="subtle" size="sm" aria-label={`Add ${list.item.toLowerCase()}`} onClick={add}>
                        <GLYPHS.add size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            }
        >
            {colors.map((color, at) => {
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
                                        if (next !== undefined) {
                                            write(
                                                colors.map((each, index) => (index === at ? next : each)),
                                                {},
                                            );
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
            })}
        </ControlGroup>
    );
}

/**
 * A list thing's row control (R15r): its colors as a strip of swatches; pressing it opens the
 * thing's pop-over on the list.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.list - the list
 * @param props.label - the strip's accessible name
 * @param props.onOpen - opens the pop-over
 * @returns The strip
 */
export function SwatchStrip({
    ctx,
    list,
    label,
    onOpen,
}: Readonly<{ ctx: RowContext; list: ListSpec; label: string; onOpen: () => void }>): React.JSX.Element {
    const colors = itemsOf(ctx, list.colors);
    const stops = colors.flatMap((color, at) => [
        `${color} ${String((at / colors.length) * 100)}%`,
        `${color} ${String(((at + 1) / colors.length) * 100)}%`,
    ]);
    return (
        <Button
            variant="default"
            size="compact-xs"
            fullWidth
            aria-label={label}
            className="ws-gradient-button"
            style={colors.length === 0 ? undefined : { background: `linear-gradient(to right, ${stops.join(", ")})` }}
            onClick={onOpen}
        />
    );
}
