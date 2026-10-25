/**
 * The workspace's chrome state: what is open, where, and how big.
 *
 * Nothing about the graph lives here. The graph, its runs, styles, selection and history are
 * graphty-element's, read through its session; this store holds only the reader's chrome (which
 * place, which dialog, panel sizes, the notice). One store per mounted workspace, so stories and
 * tests each get their own.
 */

import type { AutosaveEntry, Graphty as GraphtyElement, Lighting } from "@graphty/graphty-element";
import type { Channel } from "@graphty/graphty-element/schema";
import type {
    DataSourceInput,
    GraphSession,
    LoadDraft,
    NoteTargetInput,
    SourceKey,
} from "@graphty/graphty-element/session";
import { type ReactNode, useSyncExternalStore } from "react";

import type { InspectedKind } from "../commands/registry";

/** A left-panel place on the rail (tier1-design.md section 2.2). */
type Place = "graph" | "data" | "notes";

/** What takes the area right of the rail: the panels, or the Data page (section 2.10). */
type Page = "panels" | "data-page";

/** One notice (section 2.4): one message and at most one action. */
export interface Notice {
    /** Its words; the notice shows them unless it has content. */
    readonly message: string;
    /** A failure: it stays until the reader dismisses it, rather than going after 6 s. */
    readonly error?: boolean;
    /** Describes the selection that just went: a new selection takes it down at once. */
    readonly endsWithSelection?: boolean;
    /** What it shows instead of the words, such as the replace receipt's chips. */
    readonly content?: ReactNode;
    readonly action?: { readonly label: string; readonly run: () => void };
}

/** What the inspector shows: a kind and, for an element or row, its id. */
interface Inspected {
    readonly kind: string;
    readonly id?: string;
    /** The tab to open on, for a link that opens a row for one tab's contents (a layer's look). */
    readonly tab?: "style" | "values";
}

/** The chrome state. */
export interface WorkspaceState {
    /**
     * The open project, or null for the start screen (section 2.11).
     *
     * The name is held here only until graphty-element publishes `session.project.name` with the
     * project file (#301, tier1-real-app/plan.md section 2 item 10); the Project package moves it.
     * `id` changes when another project opens, which mounts a fresh element.
     */
    readonly project: { readonly name: string; readonly id: number } | null;
    readonly page: Page;
    readonly place: Place;
    /** The open modal, by the id its package gives it ("export", "settings"), or null. */
    readonly dialog: string | null;
    /** Whether the project name is being renamed in place. */
    readonly renaming: boolean;
    /** The paint-tree row whose name is being edited in place, or null. */
    readonly renamingRow: string | null;
    readonly inspected: Inspected | null;
    /** The tab last chosen per inspected kind. */
    readonly tabs: Readonly<Record<string, "style" | "values">>;
    /**
     * The Style tab's Node or Edge tab, one for the whole panel: kept while the next row styles
     * that kind, else the kind the row styles (combined Style panel, 2026-10-16).
     */
    readonly styleSide: "node" | "edge";
    readonly leftWidth: number;
    readonly rightWidth: number;
    readonly dockHeight: number;
    readonly dockOpen: boolean;
    /** How fast the timeline plays: 1, 2 or 4 steps a second. The reader's choice, not saved with the project. */
    readonly timeSpeed: 1 | 2 | 4;
    /**
     * The table dock's tab: "nodes", "edges" or a group run's "g:<run id>". Kept while the dock
     * is closed, and set by whatever opens the dock on a table (the Data place's source rows).
     */
    readonly dockTab: string;
    /**
     * A table column to bring into view once the dock shows it (`a:<attribute>`), set by Show in
     * table and cleared by the dock; null when none is asked for.
     */
    readonly dockColumn: string | null;
    /**
     * Whether the open table dock fills the canvas area, with the configuration beside it (data
     * prototype spec section 3.5). A file with problems opens it so.
     */
    readonly dockMaximized: boolean;
    /**
     * A table read to join onto the graph, waiting for the join screen (spec section 3.6): a second
     * file dropped, picked, pasted or chosen in Samples while the graph holds data. The join screen
     * loads or disposes the draft and sets this back to null.
     */
    readonly joining: {
        readonly name: string;
        readonly draft: LoadDraft;
        /** What the draft was read from, for Replace data and Open as a separate graph. */
        readonly source?: DataSourceInput;
    } | null;
    /** A joined table whose join the join screen is editing (its row's Edit join), or null. */
    readonly editingJoin: SourceKey | null;
    /**
     * The edge ends picked for a load whose rows are still nodes (Fields' Rows are, or a header's
     * Role): the load is read again as edges once both are picked.
     */
    readonly ends: { readonly load: SourceKey; readonly source: string | null; readonly target: string | null } | null;
    /**
     * Whether the timeline dock is shown under the canvas while a time field is set;
     * `timeline.toggle` (T) flips it, and designating a field shows it.
     */
    readonly timelineOpen: boolean;
    /** The one legend switch (round 7): the canvas card and Export read it. */
    readonly legendShown: boolean;
    /**
     * Whether the graph has anything a key lists: the canvas reads it from the element's legend.
     * The Legend toggle reads pressed while the switch is on and there is a key to draw, or the
     * reader asked for it (`legendAsked`).
     */
    readonly keyHasEntries: boolean;
    /**
     * Whether the reader pressed Legend to turn it on: then the key shows, and the toggle reads
     * pressed, even with nothing keyed, and says nothing is styled yet.
     */
    readonly legendAsked: boolean;
    /**
     * Show all labels (section 2.7): off, a label that would overlap another is hidden. The
     * reader's preference, not the project's; the element's tag carries it.
     */
    readonly allLabelsShown: boolean;
    /**
     * A kind of text the Style tab is asked to add or show, by its words channel ("node.label"),
     * set by "Add label line" with no attribute open and cleared by the Text section that takes it.
     */
    readonly textNext: Channel | null;
    /**
     * Graph settings, Labels: move a label off the nodes and edges it would cover, and with the
     * overlap rule on, hide one with no place clear of labels and nodes. On by default: without it a
     * name is drawn across the nodes in front of and behind it, which the overlap rule alone (labels
     * against labels) never looks at.
     */
    readonly labelsAvoid: boolean;
    /**
     * Graph settings, Same size at any depth: null follows whether a node size is bound to data;
     * true or false is the reader's own choice.
     */
    readonly sameSizeAtAnyDepth: boolean | null;
    /** Graph settings, Lighting: how the 3D nodes are lit. A view preference, never saved. */
    readonly lighting: Lighting;
    /** Graph settings, Outline width: every outline's width, or null for the element's own. */
    readonly outlineWidth: number | null;
    /**
     * Where the Export dialog opens (section T13): on Image, or on Data with the nodes or the
     * edges table. The table dock's Export... sets the table that is showing.
     */
    readonly exportOn: "image" | "nodes" | "edges";
    /** Single-key shortcuts on (WCAG 2.1.4); Settings > Accessibility writes it. */
    readonly singleKeyShortcuts: boolean;
    readonly notice: Notice | null;
    /**
     * The note being written in the Notes place: what it is about, fixed when its door opened
     * it, and the text so far, kept until it is saved or cleared. Null when no editor is open.
     */
    readonly noteDraft: { readonly targets: readonly NoteTargetInput[]; readonly text: string } | null;
    /**
     * The one polite status line for the core path: a load finished with its size, a run
     * started, a run finished. Each replaces the last.
     */
    readonly announcement: string;
    /**
     * How many times the status line has been written, counting a write of the same words again,
     * so the line can be spoken again when a repeat is a new event.
     */
    readonly announced: number;
    /**
     * What to load once the element of a project that was just opened has come up (a sample or
     * a file from the start screen), with the name it is known by; run once, then cleared.
     */
    readonly opening: {
        readonly name: string;
        readonly load: (session: GraphSession, element: GraphtyElement) => Promise<void>;
    } | null;
    /**
     * Whether graphty-element keeps the reader's work in the browser (its autosave). The
     * application turns it on; stories and tests leave it off, so one never reopens another's work.
     */
    readonly autosave: boolean;
    /** Work kept from an earlier visit that the start screen offers to restore, or null. */
    readonly recovered: AutosaveEntry | null;
}

/** Panel sizes: 240 is the design's panel width (PANEL_GRID.WIDTH). */
export const PANEL_MIN = 240;
export const PANEL_MAX = 480;
export const DOCK_MIN = 120;
export const DOCK_MAX = 480;
/**
 * The table opens with room for ten whole rows: its 65 px of chrome (TableDock), then the header
 * and ten rows, each 32 px and a 1 px rule (rounded up to twelve 32 px rows).
 */
export const DOCK_DEFAULT = 65 + 32 * 12;

const INITIAL: WorkspaceState = {
    project: null,
    page: "panels",
    place: "graph",
    dialog: null,
    renaming: false,
    renamingRow: null,
    inspected: null,
    tabs: {},
    styleSide: "node",
    leftWidth: PANEL_MIN,
    rightWidth: PANEL_MIN,
    dockHeight: DOCK_DEFAULT,
    dockOpen: false,
    timeSpeed: 1,
    dockTab: "nodes",
    dockColumn: null,
    dockMaximized: false,
    joining: null,
    editingJoin: null,
    ends: null,
    timelineOpen: true,
    legendShown: true,
    keyHasEntries: false,
    legendAsked: false,
    allLabelsShown: false,
    textNext: null,
    labelsAvoid: true,
    sameSizeAtAnyDepth: null,
    lighting: "studio",
    outlineWidth: null,
    exportOn: "image",
    singleKeyShortcuts: true,
    notice: null,
    noteDraft: null,
    announcement: "",
    announced: 0,
    opening: null,
    autosave: false,
    recovered: null,
};

/** The store. */
export interface WorkspaceStore {
    /**
     * The state now.
     * @returns the state.
     */
    get: () => WorkspaceState;
    /**
     * Merges a change and tells every subscriber.
     * @param change - the fields to change, or a function of the state returning them.
     */
    set: (change: Partial<WorkspaceState> | ((state: WorkspaceState) => Partial<WorkspaceState>)) => void;
    /**
     * Listens for changes.
     * @param listener - called after each change.
     * @returns a function that stops listening.
     */
    subscribe: (listener: () => void) => () => void;
}

let lastProjectId = 0;

/**
 * An id for a project that is about to open: never one this page has given before, nor the open
 * project's, so state kept per project (where Save writes, its Recent projects entry) never
 * carries over to another project.
 * @param state - the state now.
 * @returns the id.
 */
export function newProjectId(state: WorkspaceState): number {
    lastProjectId = Math.max(lastProjectId, state.project?.id ?? 0) + 1;
    return lastProjectId;
}

/**
 * Makes a store.
 * @param initial - fields to start from (a story's or test's state).
 * @returns the store.
 */
export function createWorkspaceStore(initial: Partial<WorkspaceState> = {}): WorkspaceStore {
    let state: WorkspaceState = { ...INITIAL, ...initial };
    const listeners = new Set<() => void>();
    return {
        get: () => state,
        set: (change) => {
            const given = typeof change === "function" ? change(state) : change;
            // A notice that is not a failure is spoken once, politely, by the status line (its
            // toast is not an alert); a failure's toast is its own alert. A write that says its
            // own words keeps them.
            const fields =
                given.notice !== undefined &&
                given.notice !== null &&
                given.notice.error !== true &&
                !("announcement" in given)
                    ? { ...given, announcement: given.notice.message }
                    : given;
            state = {
                ...state,
                ...fields,
                ...("announcement" in fields ? { announced: state.announced + 1 } : {}),
            };
            listeners.forEach((listener) => {
                listener();
            });
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}

/**
 * Reads one value from the store and re-renders when it changes.
 * @param store - the workspace store.
 * @param select - picks the value; return a primitive or a stable object.
 * @returns the value.
 */
export function useStoreValue<T>(store: WorkspaceStore, select: (state: WorkspaceState) => T): T {
    return useSyncExternalStore(store.subscribe, () => select(store.get()));
}

/**
 * The tab an inspected kind opens on: its fixed tab, else the reader's last choice, else its
 * default, else its first tab.
 * @param kind - the kind, or undefined when it is not registered.
 * @param remembered - the tab memory.
 * @returns the tab, or null for a kind with no tabs.
 */
export function tabFor(kind: InspectedKind | undefined, remembered: WorkspaceState["tabs"]): "style" | "values" | null {
    if (kind === undefined || kind.tabs.length === 0) {
        return null;
    }
    return kind.alwaysOpenOn ?? remembered[kind.kind] ?? kind.defaultTab ?? kind.tabs[0];
}
