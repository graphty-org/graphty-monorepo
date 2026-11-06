/**
 * The dock's zoom: a stretch of the timeline its histogram shows, held here and not saved. The wheel
 * over the bars, a trackpad pinch (which arrives as a ctrl-wheel) and two fingers that started in
 * the dock narrow it; the window stays where it is. graphty-element picks each view's bars, so the
 * bars grow finer as the view narrows.
 */

import type { GraphSession } from "@graphty/graphty-element/session";
import { useCallback, useEffect, useState } from "react";

/** The stretch of the timeline the histogram shows. */
export interface TimeView {
    readonly from: number;
    readonly to: number;
}

/** How far a pixel of wheel zooms, as a power of e. */
const WHEEL_RATE = 0.002;
/** The same for a trackpad pinch, whose deltas are far smaller. */
const PINCH_RATE = 0.01;
/** A wheel that counts in lines moves about this many pixels a line. */
const LINE_HEIGHT = 16;
/** The zoom stops before the view would hold fewer bars, each one step the element chose. */
const MIN_BARS = 2;

/**
 * The view after one zoom about a point of the axis.
 * @param time - the element's timeline.
 * @param view - the view now, or null for the whole timeline.
 * @param share - where on the axis, from 0 at its start to 1 at its end.
 * @param factor - the new width over the old: below 1 zooms in.
 * @param maxCount - the most bars the dock draws.
 * @returns the new view: null for the whole timeline, and `view` when the zoom has gone as far as it goes.
 */
function zoomed(
    time: GraphSession["time"],
    view: TimeView | null,
    share: number,
    factor: number,
    maxCount: number,
): TimeView | null {
    const whole = time.bins({ maxCount });
    const shown = view === null ? whole : time.bins({ ...view, maxCount });
    const min = whole?.at(0)?.start;
    const max = whole?.at(-1)?.end;
    const first = shown?.at(0)?.start;
    const last = shown?.at(-1)?.end;
    if (min === undefined || max === undefined || first === undefined || last === undefined) {
        return view;
    }
    const base = view ?? { from: min, to: max };
    const width = (base.to - base.from) * factor;
    if (width >= max - min) {
        return null;
    }
    const anchor = first + share * (last - first);
    const from = Math.max(min, Math.min(max - width, anchor - (anchor - base.from) * factor));
    const next = { from, to: from + width };
    return (time.bins({ ...next, maxCount })?.length ?? 0) < MIN_BARS ? view : next;
}

/**
 * Follows two fingers that started in the dock. While they are down, and until the last one lifts,
 * their moves reach nothing else in the dock, so a pinch over the brush does not also drag it.
 * @param dock - the dock.
 * @param zoomAt - zooms by a factor about a screen x.
 * @returns stops following.
 */
function followPinch(dock: HTMLElement, zoomAt: (x: number, factor: number) => void): () => void {
    const fingers = new Map<number, { x: number; y: number }>();
    let pinching = false;
    const spread = (): number => {
        const [a, b] = [...fingers.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (event: PointerEvent): void => {
        if (event.pointerType !== "touch") {
            return;
        }
        fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (fingers.size > 1) {
            pinching = true;
            event.stopPropagation();
        }
    };
    const move = (event: PointerEvent): void => {
        if (!pinching || !fingers.has(event.pointerId)) {
            return;
        }
        event.stopPropagation();
        const before = fingers.size === 2 ? spread() : 0;
        fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (before > 0 && spread() > 0) {
            const [a, b] = [...fingers.values()];
            zoomAt((a.x + b.x) / 2, before / spread());
        }
    };
    const up = (event: PointerEvent): void => {
        fingers.delete(event.pointerId);
        pinching = pinching && fingers.size > 0;
    };
    dock.addEventListener("pointerdown", down, true);
    dock.addEventListener("pointermove", move, true);
    dock.addEventListener("pointerup", up, true);
    dock.addEventListener("pointercancel", up, true);
    return () => {
        dock.removeEventListener("pointerdown", down, true);
        dock.removeEventListener("pointermove", move, true);
        dock.removeEventListener("pointerup", up, true);
        dock.removeEventListener("pointercancel", up, true);
    };
}

/**
 * The dock's zoom. A new field shows the whole timeline again, and so does a window that moves
 * out of the view, so a jump or a play is never out of sight.
 * @param session - the element's session, or null.
 * @param maxCount - the most bars the dock draws.
 * @returns the view (null for the whole timeline), its reset, and the ref for the chart.
 */
export function useTimeZoom(
    session: GraphSession | null,
    maxCount: number,
): { view: TimeView | null; reset: () => void; chartRef: (chart: HTMLElement | null) => void } {
    const [view, setView] = useState<TimeView | null>(null);
    const [chart, chartRef] = useState<HTMLElement | null>(null);
    const reset = useCallback(() => {
        setView(null);
    }, []);

    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        const offField = session.on("time:field", reset);
        const offStep = session.on("time:step", ({ from, to }) => {
            setView((held) => (held !== null && (to <= held.from || from >= held.to) ? null : held));
        });
        return () => {
            offField();
            offStep();
        };
    }, [session, reset]);

    useEffect(() => {
        const dock = chart?.closest<HTMLElement>(".tl-dock");
        if (session === null || chart === null || dock === null || dock === undefined) {
            return undefined;
        }
        const zoomAt = (x: number, factor: number): void => {
            const box = chart.getBoundingClientRect();
            const share = Math.max(0, Math.min(1, (x - box.left) / box.width));
            setView((held) => zoomed(session.time, held, share, factor, maxCount));
        };
        const wheel = (event: WheelEvent): void => {
            // The dock does not scroll, and a ctrl-wheel left alone zooms the page.
            event.preventDefault();
            const pixels = event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINE_HEIGHT : 1);
            zoomAt(event.clientX, Math.exp(pixels * (event.ctrlKey ? PINCH_RATE : WHEEL_RATE)));
        };
        chart.addEventListener("wheel", wheel, { passive: false });
        const stopPinch = followPinch(dock, zoomAt);
        return () => {
            chart.removeEventListener("wheel", wheel);
            stopPinch();
        };
    }, [session, chart, maxCount]);

    return { view, reset, chartRef };
}
