/**
 * The status bar's overflow rule, build spec 02 section 4.3, verbatim from 5.1:
 *
 * > When the bar overflows, slots drop from right to left in this order: AI status,
 * > layout name, zoom, Viewing; counts, progress with Cancel, the issues chip and the
 * > Performance mode chip never drop.
 *
 * The order itself is the foundation's `STATUS_BAR_DROP_ORDER`, and the slots that
 * never drop are its `STATUS_BAR_NEVER_DROP`. This module is the function over those
 * two tables plus a measurement: `statusBarDrops` decides, and `useStatusBarOverflow`
 * feeds it the real geometry of a real bar.
 *
 * Dropping `layout` drops the chip's NAME only -- the chip and its caret remain -- so
 * the layout slot's recorded width is the width of its name span and carries no slot
 * gap, while every other droppable slot's width is its whole box plus the 12 px gap
 * that vanishes with it.
 */

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { STATUS_BAR_DROP_ORDER, STATUS_BAR_NEVER_DROP } from "../constants";
import type { StatusBarSlotId } from "../types";
import { STATUS_BAR_GEOMETRY } from "./statusBarGeometry";

/**
 * What each droppable slot gives back when it drops, in CSS pixels.
 * {@link statusBarDrops}'s third parameter, which the caller measures.
 * @public
 */
export type StatusBarSlotWidths = Readonly<Partial<Record<StatusBarSlotId, number>>>;

/**
 * Which slots the bar has to drop, in drop order.
 *
 * Slots are taken from `STATUS_BAR_DROP_ORDER` one at a time, each one subtracting
 * its own width, until what is left fits. A slot in `STATUS_BAR_NEVER_DROP` is never
 * taken however tight the bar gets, and a slot whose width has never been measured is
 * skipped rather than guessed -- it will have been measured by the next pass, because
 * a slot that is not dropped is drawn.
 * @param availableWidth - The bar's content width, inside its padding.
 * @param contentWidth - The width the bar's content wants with nothing dropped.
 * @param widths - What each droppable slot gives back when it drops.
 * @returns The slots to drop, in `STATUS_BAR_DROP_ORDER`.
 */
export function statusBarDrops(
    availableWidth: number,
    contentWidth: number,
    widths: StatusBarSlotWidths,
): readonly StatusBarSlotId[] {
    if (!Number.isFinite(availableWidth) || availableWidth <= 0) {
        return [];
    }

    const dropped: StatusBarSlotId[] = [];
    let remaining = contentWidth;

    for (const slot of STATUS_BAR_DROP_ORDER) {
        if (remaining <= availableWidth) {
            break;
        }

        if (STATUS_BAR_NEVER_DROP.includes(slot)) {
            continue;
        }

        const width = widths[slot];

        if (width === undefined || width <= 0) {
            continue;
        }

        dropped.push(slot);
        remaining -= width;
    }

    return dropped;
}

/**
 * Whether two drop lists hold the same slots in the same order.
 * @param a - One list.
 * @param b - The other list.
 * @returns True when the two lists are equal.
 */
function sameDrops(a: readonly StatusBarSlotId[], b: readonly StatusBarSlotId[]): boolean {
    return a.length === b.length && a.every((slot, index) => slot === b[index]);
}

/**
 * The width the bar's content wants right now, measured from its own children.
 *
 * The `flex: 1 1 auto` spacer between the issues slot and the AI slot stretches to
 * fill whatever is left, so it contributes no width of its own while still costing a
 * gap on each side; anything floating above the bar, such as the completion toast,
 * contributes neither.
 * @param bar - The bar element.
 * @returns The content width in CSS pixels, gaps included.
 */
function measureContentWidth(bar: HTMLElement): number {
    let width = 0;
    let items = 0;

    for (const child of Array.from(bar.children)) {
        if (!(child instanceof HTMLElement) || child.dataset.statusFloat === "true") {
            continue;
        }

        items += 1;

        if (child.dataset.statusSpacer !== "true") {
            width += child.offsetWidth;
        }
    }

    if (items === 0) {
        return 0;
    }

    return width + STATUS_BAR_GEOMETRY.SLOT_GAP * (items - 1);
}

/**
 * What the hook hands back to the bar.
 * @public
 */
export interface StatusBarOverflow {
    /** Ref callback for the bar element itself. */
    readonly barRef: (node: HTMLElement | null) => void;
    /**
     * Ref callback factory for one droppable slot. Attach it to the element that
     * DISAPPEARS when the slot drops: the whole box for AI status, zoom and Viewing,
     * and the name span alone for the layout chip.
     * @param slot - Which slot the element belongs to.
     * @returns The ref callback for that slot.
     */
    readonly measureSlot: (slot: StatusBarSlotId) => (node: HTMLElement | null) => void;
    /** The slots to drop right now, in `STATUS_BAR_DROP_ORDER`. */
    readonly droppedSlots: readonly StatusBarSlotId[];
}

/**
 * Measures the status bar and reports which slots the overflow rule drops.
 *
 * The widths of the droppable slots are recorded while they are drawn and kept, so
 * the bar's natural width stays known after a slot has been dropped and the decision
 * settles instead of oscillating: the content measured now plus the widths of what is
 * currently dropped is the width the bar wanted in the first place.
 * @returns The bar ref, the per-slot ref factory and the current drop list.
 */
export function useStatusBarOverflow(): StatusBarOverflow {
    const barElement = useRef<HTMLElement | null>(null);
    const slotElements = useRef(new Map<StatusBarSlotId, HTMLElement>());
    const widths = useRef<Partial<Record<StatusBarSlotId, number>>>({});
    const dropped = useRef<readonly StatusBarSlotId[]>([]);
    const [droppedSlots, setDroppedSlots] = useState<readonly StatusBarSlotId[]>([]);

    const measure = useCallback(() => {
        const bar = barElement.current;

        if (bar === null) {
            return;
        }

        for (const [slot, node] of slotElements.current) {
            const gap = slot === "layout" ? 0 : STATUS_BAR_GEOMETRY.SLOT_GAP;

            widths.current[slot] = node.offsetWidth + gap;
        }

        const hidden = dropped.current.reduce((total, slot) => total + (widths.current[slot] ?? 0), 0);
        const natural = measureContentWidth(bar) + hidden;
        const available = bar.clientWidth - STATUS_BAR_GEOMETRY.PADDING_X * 2;
        const next = statusBarDrops(available, natural, widths.current);

        if (!sameDrops(next, dropped.current)) {
            dropped.current = next;
            setDroppedSlots(next);
        }
    }, []);

    const barRef = useCallback(
        (node: HTMLElement | null) => {
            barElement.current = node;
            measure();
        },
        [measure],
    );

    const measureSlot = useCallback(
        (slot: StatusBarSlotId) => {
            return (node: HTMLElement | null): void => {
                if (node === null) {
                    slotElements.current.delete(slot);
                    return;
                }

                slotElements.current.set(slot, node);
            };
        },
        [],
    );

    useLayoutEffect(() => {
        measure();
    });

    useLayoutEffect(() => {
        const bar = barElement.current;

        if (bar === null || typeof ResizeObserver === "undefined") {
            return undefined;
        }

        const observer = new ResizeObserver(() => {
            measure();
        });

        observer.observe(bar);

        return () => {
            observer.disconnect();
        };
    }, [measure]);

    return { barRef, measureSlot, droppedSlots };
}
