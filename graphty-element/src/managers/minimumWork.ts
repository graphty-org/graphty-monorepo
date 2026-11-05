/**
 * @file The minimum-work-per-frame test mode (issue #4218). No entry point exports it.
 *
 * graphty-element splits work across frames by the clock: a repaint is applied in batches within a
 * frame budget, a layout catches up several steps on a slow frame, and the render loop skips ticks
 * for the GPU or the frame guard. On a fast machine most of that work fits in one frame, so a wait
 * that reads half-finished work is only caught when a slow one happens to split it. Switched on,
 * this mode splits it every time: one small paint batch per frame, one layout round per frame, and
 * every other tick of the render loop skipped. The waits must still hold, because every piece of
 * split work is in the record of pending work (`PendingWork`).
 */

let on = false;

/**
 * Whether the mode is on.
 * @returns True while every frame does the least work it can.
 */
export function minimumWorkPerFrame(): boolean {
    return on;
}

/**
 * Switch the mode on or off, for every graph on the page.
 * @param value - True to split work across as many frames as it can take.
 */
export function setMinimumWorkPerFrame(value: boolean): void {
    on = value;
}

/** How many elements one paint batch holds in the mode. */
export const MINIMUM_PAINT_BATCH = 4;
