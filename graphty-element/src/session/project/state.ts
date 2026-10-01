/**
 * @file Project state: the fixed list of slices that make up a project, and nothing else.
 *
 * Everything a project file would save lives in one of the eleven slices below, and a change to a
 * slice is undoable. Anything outside them (camera, hover, selection, a run still computing) is
 * exempt. See design/undo/undo-design.md section 3.
 *
 * The only writer of this state is a `Draft` (`./draft.ts`). The maps are typed read-only here so
 * that no other module can write them; the draft module holds the mutable handles.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: the session entry point will reach it.
 */

import type { CameraState } from "../../camera/types";
import type { EdgeId, LayoutId, NodeId, RunId, Scope, SetId } from "../../catalog/types";
import type { Note, NoteId, NoteStatus } from "../notes/types";
import type { AlgorithmRunCommand } from "../planning";
import type { RunResult } from "../results/types";
import type { RunRecord } from "../runs/types";
import type { HeldCaptures } from "../sets/captures";
import type { ElementSet } from "../sets/types";
import type { CompiledLayer } from "../styles/Layer";
import type { RuleTree, TimeWindow } from "../visibility/filter";

/** One node or edge record as the graph holds it: the attributes it arrived with. */
export type GraphRecord = Readonly<Record<string | number, unknown>>;

/**
 * The `graph` slice: an op-log. The topology (rows, endpoints, weights and the builder's columns)
 * lives in the session's `GraphStore`; the slice holds what is keyed by id beside it. Only the
 * graph primitives (`./graphOps.ts`) write it. See design/undo/undo-design.md section 3.4.
 */
export interface GraphSlice {
    /** Names one exact row order. Never reissued (see {@link Counter}). */
    readonly token: number;
    /** Names one dataset's coordinate space. Never reissued. */
    readonly epoch: number;
    /** Node records by node id. */
    readonly nodes: ReadonlyMap<NodeId, GraphRecord>;
    /** Edge records by the element-assigned edge id. */
    readonly edges: ReadonlyMap<EdgeId, GraphRecord>;
    /** Graph-level values by name: the import report, graph-level results. */
    readonly values: ReadonlyMap<string, unknown>;
}

/**
 * An empty `graph` slice.
 * @param token - Its graph token.
 * @param epoch - Its graph epoch.
 * @returns The slice, frozen; its maps are its own.
 */
export function emptyGraphSlice(token = 0, epoch = 0): GraphSlice {
    return Object.freeze({ token, epoch, nodes: new Map(), edges: new Map(), values: new Map() });
}

/** The `layout` slice: which layout draws the graph, with what, and in how many dimensions. */
export interface LayoutChoice {
    /** The catalogue id. */
    readonly id: LayoutId;
    /** The registered engine that draws it; several engines can draw one id. */
    readonly engine: string;
    /** The options it was chosen with. */
    readonly options: Readonly<Record<string, unknown>>;
    /** The one home of the dimension. */
    readonly dimension: "2d" | "3d";
    /**
     * What the layout runs over, canonical, carried from one choice to the next; absent for the
     * whole graph. A scope that resolves to nothing leaves the layout over the whole graph.
     */
    readonly scope?: Scope;
}

/**
 * The `arrangement` slice: node coordinates at rest, copied out of the positions lane. Immutable
 * once taken; see `./arrangement.ts`.
 */
export interface ArrangementCapture {
    /** The node ids of the snapshot the coordinates belong to, in row order. */
    readonly ids: readonly NodeId[];
    /** The graph token of that snapshot. */
    readonly token: number;
    /** The graph epoch the coordinates were taken in. */
    readonly epoch: number;
    /** The coordinates, stride 3. */
    readonly coords: Float32Array;
}

/** One finished run, as the `runs` slice keeps it. */
export interface RunEntry {
    /** The command that produced it; the dedupe identity is computed from this. */
    readonly command: AlgorithmRunCommand;
    /** Its run record. */
    readonly record: RunRecord;
    /** Its result, held by reference: a published result is already frozen. */
    readonly result: RunResult;
    /**
     * The token of the execution that produced `result` (design/sets 5.2), minted by a counter no
     * undo rewinds. Absent for a result published by an executor outside the runs API.
     */
    readonly execution?: string;
    /**
     * What live references held of earlier executions' items when a re-run replaced them
     * (design/sets 5.2), so a layer restored by undo paints from them. Absent when none.
     */
    readonly held?: HeldCaptures;
    /** Whether auto-apply has painted it. */
    readonly painted: boolean;
    /** Whether its id was derived rather than author-assigned. */
    readonly derived: boolean;
    /** Whether the graph changed while it computed. */
    readonly stale: boolean;
}

/** The `visibility` slice. The masks are derived from it, not state. */
export interface VisibilityState {
    readonly filter: RuleTree | null;
    readonly window: TimeWindow | null;
    readonly showContext: boolean;
}

/** One note, as the `notes` slice keeps it: the record, and where it was opened from. */
export interface NoteEntry {
    /** The frozen record: exactly what is saved with the note. */
    readonly note: Note;
    /** The file it was opened from, when it was; session-only, never written into a notes file. */
    readonly source?: NoteStatus["source"];
}

/** The whole project, as readers see it. */
export interface ProjectState {
    readonly graph: GraphSlice;
    /** The pinned node ids. An op-log slice, written by the graph primitives. */
    readonly pins: ReadonlySet<NodeId>;
    /** One key per leaf of `ProjectConfig`, by dotted path. */
    readonly config: ReadonlyMap<string, unknown>;
    /** Null until a layout is chosen. */
    readonly layout: LayoutChoice | null;
    /** The capture the lane was last sealed into or restored from; null until the first. */
    readonly arrangement: ArrangementCapture | null;
    readonly runs: ReadonlyMap<RunId, RunEntry>;
    /** The frozen, compiled layer stack, index 0 the bottom. */
    readonly styles: readonly CompiledLayer[];
    readonly visibility: VisibilityState;
    /** The kept sets, by id: deep-frozen records. */
    readonly sets: ReadonlyMap<SetId, ElementSet>;
    /** Saved camera views, by name. */
    readonly views: ReadonlyMap<string, CameraState>;
    /** The notes, by id. */
    readonly notes: ReadonlyMap<NoteId, NoteEntry>;
}

/** A counter that only ever increases, so a value it issued never names two different things. */
interface Counter {
    /** @returns A value this counter has never returned before. */
    next(): number;
}

/**
 * Make a never-reissuing counter.
 * @returns A counter whose first value is 1.
 */
export function createCounter(): Counter {
    let last = 0;

    return {
        next: () => ++last,
    };
}

/**
 * The state a session starts from: its baseline. History begins after it.
 * @param init - Slices that start with something other than their empty value.
 * @returns A fresh state. The slice maps are owned by it; pass copies if you keep yours.
 */
export function createProjectState(init: Partial<ProjectState> = {}): ProjectState {
    return {
        graph: init.graph ?? emptyGraphSlice(),
        pins: new Set(init.pins),
        config: new Map(init.config),
        layout: init.layout ?? null,
        arrangement: init.arrangement ?? null,
        runs: new Map(init.runs),
        styles: init.styles ?? Object.freeze([]),
        visibility: init.visibility ?? Object.freeze({ filter: null, window: null, showContext: false }),
        sets: new Map(init.sets),
        views: new Map(init.views),
        notes: new Map(init.notes),
    };
}
