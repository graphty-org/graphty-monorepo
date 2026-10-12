// The hover tag's pure parts: what it says about a node, and when it moves to another node. No
// Babylon, so the Node unit tests can import it.

import type { GraphState } from "../../core/state";

/** What the tag needs from the loaded graph (a subset of GraphData). */
interface TagData {
    names: string[];
    results: Record<string, Float64Array>;
    rank: Record<string, Uint32Array>;
    resultNames: Record<string, string>;
    categorical: Record<string, boolean>;
}

/**
 * The result the graph shows now: the color-by result, else the latest one revealed by "run",
 * skipping categorical results (a community id has no meaningful rank). Null when none is shown.
 * @param data - the graph
 * @param state - the graph state
 * @returns a result id, or null
 */
function currentResult(data: TagData, state: Readonly<GraphState>): string | null {
    if (state.colorBy && !data.categorical[state.colorBy]) {
        return state.colorBy;
    }
    let last: string | null = null;
    for (const r of state.shown) {
        if (!data.categorical[r]) {
            last = r;
        }
    }
    return last;
}

/**
 * The tag text: "Strozzi 0.088, #3" for the shown result; with no result shown (or a fixed
 * `which` other than the shown one) the result is named: "Strozzi degree 4, #5".
 * @param data - the graph
 * @param state - the graph state
 * @param node - node index
 * @param which - "current" or a result id
 * @returns the text
 */
export function tagText(data: TagData, state: Readonly<GraphState>, node: number, which: string): string {
    const shown = currentResult(data, state);
    const result = which === "current" ? (shown ?? "degree") : which;
    const values = data.results[result];
    if (!values) {
        return data.names[node];
    }
    const v = values[node];
    const value = Number.isInteger(v) ? String(v) : v.toFixed(3);
    const named = result === shown ? "" : ` ${data.resultNames[result] ?? result}`;
    return `${data.names[node]}${named} ${value}, #${data.rank[result][node]}`;
}

/**
 * Decides which node the tag shows, from the hovered node each frame. The targeting layer already
 * has hysteresis between nodes; this adds a dwell before showing a new node and a linger before
 * hiding, so a hand that slips off its node for a moment does not blink the tag.
 */
export class TagTarget {
    /** The node shown, or -1. */
    shown = -1;
    /** Times (ms) the shown node changed, newest last, at most 64. */
    readonly changes: number[] = [];
    private candidate = -1;
    private since = 0;

    /**
     * Feed one frame.
     * @param hovered - the hovered node, or -1
     * @param now - ms
     * @param dwellMs - how long a new node must be hovered before it is shown
     * @param lingerMs - how long the tag stays after the hover leaves every node
     * @returns whether the shown node changed
     */
    update(hovered: number, now: number, dwellMs: number, lingerMs: number): boolean {
        if (hovered !== this.candidate) {
            this.candidate = hovered;
            this.since = now;
        }
        if (this.candidate === this.shown) {
            return false;
        }
        const wait = this.candidate < 0 ? lingerMs : dwellMs;
        if (now - this.since < wait) {
            return false;
        }
        this.shown = this.candidate;
        this.changes.push(now);
        if (this.changes.length > 64) {
            this.changes.shift();
        }
        return true;
    }

    /** Forget everything (switched off, or hover unavailable). */
    reset(): void {
        this.shown = -1;
        this.candidate = -1;
    }
}
