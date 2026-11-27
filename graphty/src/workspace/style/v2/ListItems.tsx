/**
 * A parallel color list's lines (stripes design 3.1): one item's line (grip, chip, share or value, link, "-"), a bound
 * item's or a whole list's sub-line, and the legend's Equal shares and Reverse order buttons. `colorItems.tsx`
 * arranges them.
 */

import { CompactColorInput, ControlGroup, ScrollArea } from "@graphty/compact-mantine";
import { type Channel, listItemAddress, listShares, setListShare } from "@graphty/graphty-element/catalog";
import { ActionIcon, Group, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import { lineIn, sourceName, writeIn } from "../row";
import { altArrowMove, useRowDrag } from "../useRowDrag";
import { colorPalettes } from "../words";
import { unsetIn } from "./lineWrites";
import { itemDescriptor, type ListState, movedOrder, type Part, reorder, takeRevealed, writeAll } from "./listState";
import { shownPaint, writtenPaint } from "./paint";
import { ByDataLink, LineFrame, NumberLine } from "./RubricLine";
import { ValueButton } from "./ValueButton";

/** What can take focus in a line. */
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A bound item's sub-line under its line: its caption above, the column's name, its link and its "-" (stop varying).
 * @param props - Component props
 * @param props.state - the lists
 * @param props.part - the bound list
 * @param props.at - the item, or undefined for a whole-list binding
 * @returns The line, or nothing when the item is not bound
 */
export function BoundLine({
    state,
    part,
    at,
}: Readonly<{ state: ListState; part: Part; at: number | undefined }>): React.JSX.Element | null {
    const { ctx } = state;
    const to = at === undefined ? part.channel : listItemAddress(part.channel, at);
    const binding = lineIn(ctx, to)?.binding;
    if (binding === undefined) {
        return null;
    }
    const plural = part.name === "Color" ? "Colors" : `${part.name}s`;
    const caption = `${at === undefined ? plural : part.name} from data`;
    const descriptor =
        part.name === "Color" ? { ...part.descriptor, accepts: "color" as const } : itemDescriptor(part.descriptor);
    return (
        <LineFrame
            line={`${to}:bound`}
            name={caption}
            set
            rule="R15"
            wide
            control={
                <ValueButton
                    label={caption}
                    words={sourceName(ctx.session, binding) ?? binding.by}
                    onClick={() => undefined}
                />
            }
            modifier={
                <ByDataLink
                    ctx={ctx}
                    targets={[{ name: part.name, descriptor, to }]}
                    label={`${
                        at === undefined ? plural : `${state.list.item} ${String(at + 1)} ${part.name.toLowerCase()}`
                    } by attribute`}
                />
            }
            removeName={`Stop varying ${caption.toLowerCase()}`}
            onRemove={() => {
                unsetIn(ctx, [to]).catch(state.fail);
            }}
        />
    );
}

/**
 * One item's line: grip, chip, share or value, link and "-"; Alt+Up and Alt+Down move it.
 * @param props - Component props
 * @param props.state - the lists
 * @param props.at - the item
 * @param props.onPreview - shows the shares a share drag would leave on every line (null: what draws)
 * @returns The line and its bound sub-lines
 */
export function ItemLine({
    state,
    at,
    onPreview,
}: Readonly<{
    state: ListState;
    at: number;
    onPreview: (shares: readonly number[] | null) => void;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const { ctx, list, colors, share, opacity, value, own } = state;
    const box = useRef<HTMLDivElement>(null);
    const count = colors.items.length;
    const name = `${list.item} ${String(at + 1)}`;
    const move = (to: number): void => {
        if (to < 0 || to >= count) {
            return;
        }
        store.set({ announcement: `${name} moved to place ${String(to + 1)} of ${String(count)}` });
        reorder(state, movedOrder(count, at, to));
        // Lines are keyed by place, so the moved stripe is drawn in the line at its new place: focus follows it there,
        // to the same control.
        const row = box.current;
        const controls = (line: Element | null | undefined): HTMLElement[] => [
            ...(line?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
        ];
        const nth = controls(row).indexOf(document.activeElement as HTMLElement);
        const target = row?.parentElement?.querySelector(`:scope > [data-item-line="${String(to)}"]`);
        const next = controls(target).at(Math.max(nth, 0));
        next?.focus();
        next?.scrollIntoView({ block: "nearest" });
    };
    useEffect(() => {
        if (at === count - 1 && takeRevealed(list.colors)) {
            box.current?.scrollIntoView({ block: "nearest" });
        }
    }, [at, count, list.colors]);
    const { dragging, handlers } = useRowDrag(
        box,
        at,
        (from, to) => {
            reorder(state, movedOrder(count, from, to));
        },
        (row) => [...(row.parentElement?.querySelectorAll<HTMLElement>(":scope > [data-item-line]") ?? [])],
    );
    const opacityAt =
        opacity === undefined || opacity.bound ? 1 : Number(opacity.items[at] === "" ? 1 : (opacity.items[at] ?? 1));
    const paint = shownPaint(colors.items[at], opacityAt);
    const writeItem = (channel: Channel, item: string): void => {
        writeIn(ctx, listItemAddress(channel, at), { value: item }).catch(state.fail);
    };
    const pickPaint = (next: string | undefined, percent: number | undefined): void => {
        if (next === undefined) {
            return;
        }
        const written =
            opacity === undefined || opacity.bound ? { color: next, opacity: 1 } : writtenPaint(next, percent ?? 100);
        const opacityText = String(written.opacity);
        if (!own) {
            writeItem(colors.channel, written.color);
            if (opacity !== undefined && !opacity.bound && Math.abs(written.opacity - opacityAt) > 1e-6) {
                writeItem(opacity.channel, opacityText);
            }
            return;
        }
        const nextColors = colors.items.map((each, index) => (index === at ? written.color : each));
        const numbers: Partial<Record<Channel, string[]>> = {};
        if (opacity !== undefined && !opacity.bound && Math.abs(written.opacity - opacityAt) > 1e-6) {
            const items = [...opacity.items];
            while (items.length <= at) {
                items.push("");
            }
            items[at] = opacityText;
            numbers[opacity.channel] = items;
        }
        writeAll(state, nextColors, numbers);
    };
    // Each value of the line its link binds: Color, Share, Opacity (or a chart's Value), "Which value" choosing.
    const targets = [
        {
            name: "Color",
            descriptor: { ...colors.descriptor, accepts: "color" as const },
            to: listItemAddress(colors.channel, at),
        },
        ...[share, value, opacity].flatMap((part) =>
            part === undefined || part.bound
                ? []
                : [
                      {
                          name: part.name,
                          descriptor: itemDescriptor(part.descriptor),
                          to: listItemAddress(part.channel, at),
                      },
                  ],
        ),
    ];
    const number = share ?? value;
    let numberControl: React.ReactNode = null;
    if (share !== undefined && !share.bound) {
        const sizes = share.items.map((item) => (item === "" ? "auto" : item)).join(" ");
        numberControl = (
            <div className="ws-share" style={{ flex: 1, minWidth: 0 }}>
                <NumberLine
                    descriptor={itemDescriptor(share.descriptor)}
                    label={`${name} share`}
                    percent
                    plain
                    value={state.shares[at] ?? 0}
                    onMove={(next) => {
                        // A drag computes from the list as it was when it began: nothing is written until release.
                        onPreview(
                            next === null
                                ? null
                                : listShares(share.channel, setListShare(share.channel, sizes, count, at, next), count),
                        );
                    }}
                    onWrite={(next) => {
                        // The edited share as typed, the others giving way (graphty-element's `setListShare`).
                        const text = setListShare(share.channel, sizes, count, at, next);
                        const items = text === "" ? [] : text.split(" ").map((item) => (item === "auto" ? "" : item));
                        if (!own || items.length === 0) {
                            writeAll(state, colors.items, { [share.channel]: items });
                            if (items.length === 0) {
                                unsetIn(ctx, [share.channel]).catch(state.fail);
                            }
                            return;
                        }
                        writeAll(state, colors.items, { [share.channel]: items });
                    }}
                />
            </div>
        );
    } else if (value !== undefined && !value.bound) {
        numberControl = (
            <div style={{ flex: 1, minWidth: 0 }}>
                <NumberLine
                    descriptor={itemDescriptor(value.descriptor)}
                    label={`${name} ${value.name.toLowerCase()}`}
                    slider={false}
                    value={value.items[at] === "" ? 1 : Number(value.items[at])}
                    onWrite={(next) => {
                        const items = [...value.items];
                        while (items.length <= at) {
                            items.push("1");
                        }
                        items[at] = String(next ?? 1);
                        if (own) {
                            writeAll(state, colors.items, { [value.channel]: items });
                        } else {
                            writeItem(value.channel, items[at]);
                        }
                    }}
                />
            </div>
        );
    }
    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- catches Alt+ArrowUp/Down bubbling from the line's own controls to move the item
        <div
            ref={box}
            data-item-line={at}
            data-dragging={dragging ? "" : undefined}
            onKeyDown={altArrowMove(box, (by) => {
                move(at + by);
            })}
        >
            <LineFrame
                line={`${list.colors}:${String(at)}`}
                name={null}
                set
                rule="R15"
                control={
                    <Group gap={4} wrap="nowrap">
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            className="ws-drag-handle ws-list-grip"
                            aria-label={`${name} of ${String(count)}. Drag, or Alt+Up and Alt+Down`}
                            {...handlers}
                        >
                            <GLYPHS.drag size={14} aria-hidden />
                        </ActionIcon>
                        {colors.bound ? null : (
                            <CompactColorInput
                                palettes={colorPalettes(ctx.session)}
                                variant="chip"
                                aria-label={`${name} color`}
                                color={paint.color}
                                defaultColor={paint.color}
                                opacity={opacity === undefined || opacity.bound ? undefined : paint.percent}
                                showOpacity={opacity !== undefined && !opacity.bound}
                                showReset={false}
                                swatches={ctx.documentColors}
                                allowHexAlpha
                                onChange={pickPaint}
                            />
                        )}
                        {number === undefined ? null : numberControl}
                    </Group>
                }
                // One link for the line's values (Color, Share, Opacity): named for the item, not its color.
                modifier={<ByDataLink ctx={ctx} targets={targets} label={`${name} by attribute`} />}
                removeName={`Remove ${name.toLowerCase()}`}
                onRemove={() => {
                    if (count <= 1) {
                        // The last item takes the whole list off: a list thing with no items draws nothing.
                        const all = [colors, share, opacity, value].flatMap((part) =>
                            part === undefined ? [] : [part.channel],
                        );
                        unsetIn(ctx, all).catch(state.fail);
                        return;
                    }
                    reorder(
                        state,
                        Array.from({ length: count }, (_, index) => index).filter((index) => index !== at),
                    );
                }}
            />
            {[colors, share, opacity, value].map((part) =>
                part === undefined ? null : <BoundLine key={part.channel} state={state} part={part} at={at} />,
            )}
        </div>
    );
}

/**
 * The legend's tool buttons: Equal shares and Reverse order, each with a tooltip on hover, focus and long press.
 * @param props - Component props
 * @param props.state - the lists
 * @returns The buttons
 */
export function ListTools({ state }: Readonly<{ state: ListState }>): React.JSX.Element | null {
    const { ctx, colors, share } = state;
    if (colors.bound) {
        return null;
    }
    const count = colors.items.length;
    const literal =
        share === undefined
            ? []
            : colors.items
                  .map((_, at) => listItemAddress(share.channel, at))
                  .filter((address) => {
                      const line = lineIn(ctx, address);
                      return line?.value !== undefined && line.binding === undefined;
                  });
    const anySet =
        share !== undefined && !share.bound && (share.items.some((item) => item !== "") || literal.length > 0);
    const tip = (label: string, button: React.ReactNode): React.ReactNode => (
        <Tooltip label={label} events={{ hover: true, focus: true, touch: true }}>
            {button}
        </Tooltip>
    );
    return (
        <>
            {share === undefined
                ? null
                : tip(
                      "Equal shares",
                      <ActionIcon
                          variant="subtle"
                          size="sm"
                          aria-label="Equal shares"
                          disabled={!anySet}
                          onClick={() => {
                              // Every literal share unset in one write: each band an equal part.
                              unsetIn(ctx, [share.channel, ...literal]).catch(state.fail);
                          }}
                      >
                          <GLYPHS.equalShares size={14} aria-hidden />
                      </ActionIcon>,
                  )}
            {tip(
                "Reverse order",
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label="Reverse order"
                    disabled={count < 2}
                    onClick={() => {
                        reorder(
                            state,
                            Array.from({ length: count }, (_, at) => count - 1 - at),
                        );
                    }}
                >
                    <GLYPHS.swap size={14} aria-hidden />
                </ActionIcon>,
            )}
        </>
    );
}

/** How tall the scroll region is: four rows of a line's height (stripes design 3.1, item 6). */
const REGION = 4 * 28;

/**
 * The legend and the scroll region of a list's lines. A share being dragged shows its value, and the shares
 * giving way theirs, on every line while the drag lasts; the write lands once, on release (stripes design 3.2).
 * @param props - Component props
 * @param props.state - the lists
 * @returns The lines
 */
export function ColorLines({ state }: Readonly<{ state: ListState }>): React.JSX.Element {
    const { colors, share, value } = state;
    // on reload: fresh: pointer: a drag's preview
    const [preview, setPreview] = useState<readonly number[] | null>(null);
    // A drag's write landed (or the list changed under it): the lines show what draws again.
    const drawn = state.shares.join(" ");
    useEffect(() => {
        setPreview(null);
    }, [drawn]);
    const number = share ?? value;
    const wholeBound = [colors, share, state.opacity, value].flatMap((part) =>
        part?.bound === true ? [<BoundLine key={part.channel} state={state} part={part} at={undefined} />] : [],
    );
    const shown = preview === null ? state : { ...state, shares: preview };
    const region = (
        // Its scrollbar takes its own room beside the lines, never over a "-"; it never scrolls sideways.
        <ScrollArea.Autosize
            mah={REGION}
            type="auto"
            scrollbars="y"
            offsetScrollbars="y"
            className="ws-list-region"
            classNames={{ content: "ws-list-content" }}
        >
            <div className="ws-list-items">
                {wholeBound}
                {colors.bound
                    ? null
                    : colors.items.map((_, at) => (
                          <ItemLine
                              // eslint-disable-next-line react/no-array-index-key -- an item is its place in the list
                              key={at}
                              state={shown}
                              at={at}
                              onPreview={setPreview}
                          />
                      ))}
            </div>
        </ScrollArea.Autosize>
    );
    // compact-mantine's legend names the lines' two inputs, chip then number; none when only chips are left.
    return colors.bound || number === undefined || number.bound ? (
        region
    ) : (
        <ControlGroup label={`Color / ${number.name}`}>{region}</ControlGroup>
    );
}
