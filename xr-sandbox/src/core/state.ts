// The graph state every technique acts on (design section 6.1). Plain data, no Babylon: the graph
// view derives its buffers from it, and the command layer is the only writer.

/** A filter that keeps the nodes whose value of one result passes a threshold. */
export interface Filter {
    result: string;
    op: ">=" | "<=";
    value: number;
}

/** A note on a node (by index) or on the whole graph. */
export interface Note {
    target: number | "graph";
    text: string;
}

/** Everything a command can change. */
export interface GraphState {
    selection: Set<number>;
    hidden: Set<number>;
    /** Every result, computed at load and shared, never copied. */
    results: Record<string, Float64Array>;
    /** Results revealed by "run". */
    shown: Set<string>;
    colorBy: string | null;
    sizeBy: string | null;
    filter: Filter | null;
    notes: Note[];
}

/** The state without the selection: what a history entry restores (selection is not a step). */
export type StateSnapshot = Omit<GraphState, "selection" | "results">;

/**
 * A fresh state over results computed at load.
 * @param results - every result vector, by id
 * @returns the state with nothing selected, hidden or shown
 */
export function createState(results: Record<string, Float64Array>): GraphState {
    return {
        selection: new Set(),
        hidden: new Set(),
        results,
        shown: new Set(),
        colorBy: null,
        sizeBy: null,
        filter: null,
        notes: [],
    };
}

/**
 * Copy the parts of the state a history step can change.
 * @param s - the state
 * @returns a snapshot that later changes to `s` do not touch
 */
export function snapshot(s: GraphState): StateSnapshot {
    return {
        hidden: new Set(s.hidden),
        shown: new Set(s.shown),
        colorBy: s.colorBy,
        sizeBy: s.sizeBy,
        filter: s.filter ? { ...s.filter } : null,
        notes: s.notes.map((n) => ({ ...n })),
    };
}

/**
 * Put a snapshot back into the state, leaving the selection alone.
 * @param s - the state to change
 * @param snap - what to restore
 */
export function restore(s: GraphState, snap: StateSnapshot): void {
    const copy = snapshot({ ...s, ...snap });
    s.hidden = copy.hidden;
    s.shown = copy.shown;
    s.colorBy = copy.colorBy;
    s.sizeBy = copy.sizeBy;
    s.filter = copy.filter;
    s.notes = copy.notes;
}

/**
 * Whether a node passes a filter.
 * @param s - the state holding the results
 * @param f - the filter
 * @param i - node index
 * @returns true when the node is kept
 */
export function passes(s: GraphState, f: Filter, i: number): boolean {
    const v = s.results[f.result]?.[i] ?? 0;
    return f.op === ">=" ? v >= f.value : v <= f.value;
}

/**
 * Whether a node is drawn: not hidden and not filtered out.
 * @param s - the state
 * @param i - node index
 * @returns true when the node is visible
 */
export function isVisible(s: GraphState, i: number): boolean {
    return !s.hidden.has(i) && (!s.filter || passes(s, s.filter, i));
}
