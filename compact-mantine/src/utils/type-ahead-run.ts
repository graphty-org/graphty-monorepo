/**
 * A type-ahead run: letters typed with no pause longer than the window are one search ("Bo"), and
 * a pause, or a letter on another control, starts a new one.
 *
 * The pause runs from when the page finished taking the last letter to when the next one was
 * typed (its `event.timeStamp`), never between the times the page handled them. On a busy page
 * each letter is handled late, after the work the one before it caused (a render, a scroll, a list
 * opening), so handling times would split a quick run in two.
 */
export class TypeAheadRun {
    private text = "";
    private lastAt = Number.NEGATIVE_INFINITY;
    private on: unknown = null;

    /**
     * A run with no keys yet.
     * @param windowMs - the longest pause inside one run
     */
    constructor(private readonly windowMs = 500) {}

    /**
     * Adds a typed key to the run, or starts a new run with it.
     * @param event - the key, with the time it was typed
     * @param event.key - the key's character
     * @param event.timeStamp - when it was typed, on the clock of `performance.now()`
     * @param on - the control it was typed on; a key on another control starts a new run
     * @returns the run so far
     */
    add(event: { key: string; timeStamp: number }, on: unknown = null): string {
        const typedAt = event.timeStamp;
        this.text = typedAt - this.lastAt > this.windowMs || on !== this.on ? event.key : this.text + event.key;
        this.on = on;
        this.taken(typedAt);
        return this.text;
    }

    /**
     * Notes that the page has finished the work the last key caused: the next pause runs from now.
     * @param typedAt - when the key was typed, if the page took it before then (never later than now)
     */
    taken(typedAt = Number.NEGATIVE_INFINITY): void {
        this.lastAt = Math.max(this.lastAt, typedAt, performance.now());
    }
}
