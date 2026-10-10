// The shared command layer (design section 6.2): every technique changes the graph through these
// commands, so "how long did color by PageRank take" means the same thing whatever technique did
// it, and undo can always name its step. Records are { code, params }; the English label is written
// here, by one function, so a port to graphty-element keeps facts and words apart.

import { type Filter, type GraphState, passes, restore, snapshot, type StateSnapshot } from "./state";

/** Every command, with its params. */
export interface CommandParams {
    select: { ids: number[]; mode?: "replace" | "add" };
    neighbors: { id: number; hops: number };
    run: { result: string };
    colorBy: { result: string | null };
    sizeBy: { result: string | null };
    filter: Filter;
    clearFilter: Record<string, never>;
    hide: { ids: number[] };
    show: { ids: number[] };
    note: { target: number | "graph"; text: string };
    probe: { id: number | null };
    save: Record<string, never>;
}

/** A command's code. */
export type CommandCode = keyof CommandParams;

/** Who issued a command: a technique id, or "framework". */
export interface CommandSource {
    technique: string;
    hand?: string;
}

/** One step in the history. */
export interface HistoryEntry {
    code: CommandCode;
    params: unknown;
    technique: string;
    time: number;
    label: string;
    before: StateSnapshot;
    after?: StateSnapshot;
}

/** What a command run reports, for the log. */
export interface CommandRecord {
    code: CommandCode | "undo" | "redo";
    params: unknown;
    technique: string;
    hand?: string;
    label: string;
    history: boolean;
}

/** A live preview: tints the graph without touching the state until commit. */
export interface Preview {
    update(params: unknown): void;
    commit(): void;
    cancel(): void;
}

/** What the view shows while a preview is open: the nodes it keeps; the rest dim. */
export interface PreviewView {
    code: CommandCode;
    keep: Set<number>;
    owner: string;
}

/** How commands turn indices and result ids into words, and reach the graph. */
interface CommandDeps {
    nodeName(i: number): string;
    resultName(id: string): string;
    /** Singular and plural noun for nodes ("family", "families"). */
    noun: [string, string];
    nodeCount: number;
    /** Node indices within `hops` of `id`, including `id`. */
    neighbors(id: number, hops: number): number[];
    /** Called after every command, undo, redo and preview change. */
    onRecord?(record: CommandRecord): void;
    onChange?(): void;
}

const HISTORY: ReadonlySet<CommandCode> = new Set([
    "run",
    "colorBy",
    "sizeBy",
    "filter",
    "clearFilter",
    "hide",
    "show",
    "note",
]);

/** The command layer bound to one graph state. */
export interface Commands {
    readonly state: GraphState;
    readonly history: readonly HistoryEntry[];
    readonly future: readonly HistoryEntry[];
    readonly preview: PreviewView | null;
    run<C extends CommandCode>(code: C, params: CommandParams[C], source: CommandSource): CommandRecord;
    startPreview<C extends "neighbors" | "filter">(code: C, params: CommandParams[C], source: CommandSource): Preview;
    undo(source: CommandSource): CommandRecord | null;
    redo(source: CommandSource): CommandRecord | null;
    /** Undo back to and including history entry `index`. */
    undoTo(index: number, source: CommandSource): void;
    label<C extends CommandCode>(code: C, params: CommandParams[C]): string;
    /** "Undo: Color by PageRank", or null when there is nothing to undo. */
    undoLabel(): string | null;
    redoLabel(): string | null;
}

/**
 * Create the command layer over a state.
 * @param state - the graph state; the command layer is its only writer
 * @param deps - names and graph lookups
 * @returns the commands
 */
export function createCommands(state: GraphState, deps: CommandDeps): Commands {
    const history: HistoryEntry[] = [];
    const future: HistoryEntry[] = [];
    let preview: (PreviewView & { cancel(): void }) | null = null;

    const count = (n: number): string => `${n} ${n === 1 ? deps.noun[0] : deps.noun[1]}`;
    const names = (ids: number[]): string => (ids.length === 1 ? deps.nodeName(ids[0]) : count(ids.length));
    const kept = (f: Filter): number => {
        let n = 0;
        for (let i = 0; i < deps.nodeCount; i++) {
            if (passes(state, f, i)) {
                n++;
            }
        }
        return n;
    };

    const label = <C extends CommandCode>(code: C, params: CommandParams[C]): string => {
        const p = params as CommandParams[CommandCode] & Record<string, unknown>;
        switch (code) {
            case "select": {
                const { ids } = p as CommandParams["select"];
                return ids.length === 0 ? "Clear selection" : `Select ${names(ids)}`;
            }
            case "neighbors": {
                const { id, hops } = p as CommandParams["neighbors"];
                const n = deps.neighbors(id, hops).length - 1;
                return `Select ${deps.nodeName(id)} and ${hops} ${hops === 1 ? "hop" : "hops"} (${n})`;
            }
            case "run":
                return `Run ${deps.resultName((p as CommandParams["run"]).result)}`;
            case "colorBy":
            case "sizeBy": {
                const { result } = p as CommandParams["colorBy"];
                const verb = code === "colorBy" ? "Color" : "Size";
                return result ? `${verb} by ${deps.resultName(result)}` : `${verb} by nothing`;
            }
            case "filter": {
                const f = p as Filter;
                const v = f.value.toFixed(3);
                const word = f.op === ">=" ? "at least" : "at most";
                return `Keep ${deps.resultName(f.result)} ${word} ${v} (${kept(f)} of ${deps.nodeCount})`;
            }
            case "clearFilter":
                return "Remove filter";
            case "hide":
                return `Hide ${names((p as CommandParams["hide"]).ids)}`;
            case "show":
                return `Show ${names((p as CommandParams["show"]).ids)}`;
            case "note": {
                const { target } = p as CommandParams["note"];
                return `Note on ${target === "graph" ? "the graph" : deps.nodeName(target)}`;
            }
            case "probe": {
                const { id } = p as CommandParams["probe"];
                return id === null ? "Probe the result" : `Probe ${deps.nodeName(id)}`;
            }
            case "save":
                return "Save";
            default:
                return String(code);
        }
    };

    const apply = <C extends CommandCode>(code: C, params: CommandParams[C]): void => {
        const p = params as unknown;
        switch (code) {
            case "select": {
                const { ids, mode } = p as CommandParams["select"];
                if (mode !== "add") {
                    state.selection.clear();
                }
                ids.forEach((i) => state.selection.add(i));
                break;
            }
            case "neighbors": {
                const { id, hops } = p as CommandParams["neighbors"];
                state.selection = new Set(deps.neighbors(id, hops));
                break;
            }
            case "run":
                state.shown.add((p as CommandParams["run"]).result);
                break;
            case "colorBy":
                state.colorBy = (p as CommandParams["colorBy"]).result;
                break;
            case "sizeBy":
                state.sizeBy = (p as CommandParams["sizeBy"]).result;
                break;
            case "filter":
                state.filter = { ...(p as Filter) };
                break;
            case "clearFilter":
                state.filter = null;
                break;
            case "hide":
                (p as CommandParams["hide"]).ids.forEach((i) => state.hidden.add(i));
                break;
            case "show":
                (p as CommandParams["show"]).ids.forEach((i) => state.hidden.delete(i));
                break;
            case "note":
                state.notes.push({ ...(p as CommandParams["note"]) });
                break;
            default:
                // probe and save change nothing in the state
                break;
        }
    };

    const record = (r: CommandRecord): CommandRecord => {
        deps.onRecord?.(r);
        deps.onChange?.();
        return r;
    };

    const cancelPreview = (): boolean => {
        if (!preview) {
            return false;
        }
        preview.cancel();
        return true;
    };

    const commands: Commands = {
        state,
        history,
        future,
        get preview() {
            return preview;
        },
        label,
        run(code, params, source) {
            const inHistory = HISTORY.has(code);
            const text = label(code, params);
            if (inHistory) {
                history.push({
                    code,
                    params,
                    technique: source.technique,
                    time: Date.now(),
                    label: text,
                    before: snapshot(state),
                });
                future.length = 0;
            }
            apply(code, params);
            return record({
                code,
                params,
                technique: source.technique,
                hand: source.hand,
                label: text,
                history: inHistory,
            });
        },
        startPreview(code, params, source) {
            cancelPreview();
            let current: unknown = params;
            const keepOf = (p: unknown): Set<number> => {
                if (code === "neighbors") {
                    const { id, hops } = p as CommandParams["neighbors"];
                    return new Set(deps.neighbors(id, hops));
                }
                const f = p as Filter;
                const keep = new Set<number>();
                for (let i = 0; i < deps.nodeCount; i++) {
                    if (passes(state, f, i)) {
                        keep.add(i);
                    }
                }
                return keep;
            };
            const view = {
                code,
                keep: keepOf(params),
                owner: source.technique,
                cancel: () => {
                    if (preview === view) {
                        preview = null;
                        record({ code, params: current, technique: source.technique, label: "cancel", history: false });
                    }
                },
            };
            preview = view;
            deps.onChange?.();
            return {
                update(p) {
                    current = p;
                    view.keep = keepOf(p);
                    deps.onChange?.();
                },
                commit() {
                    if (preview !== view) {
                        return;
                    }
                    preview = null;
                    commands.run(code, current as CommandParams[typeof code], source);
                },
                cancel: view.cancel,
            };
        },
        undo(source) {
            if (cancelPreview()) {
                return null;
            }
            const entry = history.pop();
            if (!entry) {
                return null;
            }
            entry.after = snapshot(state);
            restore(state, entry.before);
            future.push(entry);
            return record({
                code: "undo",
                params: { step: entry.label },
                technique: source.technique,
                hand: source.hand,
                label: `Undo: ${entry.label}`,
                history: false,
            });
        },
        redo(source) {
            const entry = future.pop();
            if (!entry?.after) {
                return null;
            }
            restore(state, entry.after);
            history.push(entry);
            return record({
                code: "redo",
                params: { step: entry.label },
                technique: source.technique,
                hand: source.hand,
                label: `Redo: ${entry.label}`,
                history: false,
            });
        },
        undoTo(index, source) {
            while (history.length > index) {
                commands.undo(source);
            }
        },
        undoLabel: () => (history.length ? `Undo: ${history[history.length - 1].label}` : null),
        redoLabel: () => (future.length ? `Redo: ${future[future.length - 1].label}` : null),
    };
    return commands;
}
