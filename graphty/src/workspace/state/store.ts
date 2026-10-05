/**
 * The workspace's chrome state: what is open, where, and how big.
 *
 * Nothing about the graph lives here. The graph, its runs, styles, selection and history are
 * graphty-element's, read through its session; this store holds only the reader's chrome (which
 * place, which dialog, panel sizes, the notice). One store per mounted workspace, so stories and
 * tests each get their own.
 */

import type { GraphSession } from "@graphty/graphty-element/session";
import { useSyncExternalStore } from "react";

import type { InspectedKind } from "../commands/registry";

/** A left-panel place on the rail (tier1-design.md section 2.2). */
type Place = "graph" | "data";

/** What takes the area right of the rail: the panels, or the Data page (section 2.10). */
type Page = "panels" | "data-page";

/** One notice (section 2.4): one message and at most one action. */
export interface Notice {
    readonly message: string;
    readonly action?: { readonly label: string; readonly run: () => void };
}

/** What the inspector shows: a kind and, for an element or row, its id. */
interface Inspected {
    readonly kind: string;
    readonly id?: string;
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
    readonly inspected: Inspected | null;
    /** The tab last chosen per inspected kind. */
    readonly tabs: Readonly<Record<string, "style" | "values">>;
    readonly leftWidth: number;
    readonly rightWidth: number;
    readonly dockHeight: number;
    readonly dockOpen: boolean;
    /** The one legend switch (round 7): the canvas card and Export read it. */
    readonly legendShown: boolean;
    /**
     * Where the Export dialog opens (section T13): on Image, or on Data with the nodes or the
     * edges table. The table dock's Export... sets the table that is showing.
     */
    readonly exportOn: "image" | "nodes" | "edges";
    /** Single-key shortcuts on (WCAG 2.1.4); Settings > Accessibility writes it. */
    readonly singleKeyShortcuts: boolean;
    readonly notice: Notice | null;
    /**
     * What to load once the element of a project that was just opened has come up (a sample or
     * a file from the start screen), with the name it is known by; run once, then cleared.
     */
    readonly opening: { readonly name: string; readonly load: (session: GraphSession) => Promise<void> } | null;
}

/** Panel sizes: 240 is the design's panel width (PANEL_GRID.WIDTH). */
export const PANEL_MIN = 240;
export const PANEL_MAX = 480;
export const DOCK_MIN = 120;
export const DOCK_MAX = 480;

const INITIAL: WorkspaceState = {
    project: null,
    page: "panels",
    place: "graph",
    dialog: null,
    renaming: false,
    inspected: null,
    tabs: {},
    leftWidth: PANEL_MIN,
    rightWidth: PANEL_MIN,
    dockHeight: 240,
    dockOpen: false,
    legendShown: true,
    exportOn: "image",
    singleKeyShortcuts: true,
    notice: null,
    opening: null,
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
            state = { ...state, ...(typeof change === "function" ? change(state) : change) };
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
