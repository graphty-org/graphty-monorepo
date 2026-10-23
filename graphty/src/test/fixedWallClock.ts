/** The real Date, as the page had it when this module loaded. */
const RealDate = globalThis.Date;

/** The instant a story's "now" reads: the start of the visual capture's clock. */
const FIXED = RealDate.parse("2026-01-01T12:00:00Z");

/** Date, except that `new Date()` with no argument reads {@link FIXED}. */
class StoryDate extends RealDate {
    constructor(...args: unknown[]) {
        if (args.length === 0) {
            super(FIXED);
        } else {
            super(...(args as ConstructorParameters<DateConstructor>));
        }
    }
}

/**
 * A story fixture: from now until the returned cleanup, `new Date()` with no argument reads one
 * fixed instant. graphty-element stamps a run's start with `new Date()`, and the inspector shows it
 * to the second, so without this a run's "ran Jan 1, 12:00:03 PM" depends on how long the story
 * took to get there. `Date.now()` and timers keep running, so nothing that waits on time stalls.
 * Calling it again while it is in force changes nothing.
 * @returns the cleanup that puts the real Date back.
 */
export function fixWallClock(): () => void {
    globalThis.Date = StoryDate as DateConstructor;
    return () => {
        globalThis.Date = RealDate;
    };
}
