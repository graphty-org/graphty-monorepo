/**
 * Usage data from the project's graphty-element (design/graphty/usage-analytics.md, sections 4.1
 * and 4.2): the session's public events mapped to the app's own counts. Every value sent is checked
 * against graphty-element's catalogs or the app's own lists here, in the workspace chunk, before it
 * reaches `count()` or `detail()`; anything else is "other". Ids, names, labels and command
 * payloads are never read.
 */

import { sourceDescriptors } from "@graphty/graphty-element/catalog";
import {
    CAMERA_GESTURE_KINDS,
    type GraphSession,
    isGraphtyErrorCode,
    type RunStatus,
    type SessionCommand,
    type SourceLoaded,
    TERMINAL_RUN_STATUSES,
} from "@graphty/graphty-element/session";
import { useEffect } from "react";

import { START_SAMPLES } from "../../data/sampleManifest";
import {
    allowlisted,
    count,
    detail,
    isGraphActionOp,
    type LoadAllowlists,
    sourceLoadedEvent,
    type UsageProps,
} from "../../lib/analytics";
import { DISCARD_DIALOG, KEEP_ASSETS_DIALOG, SAVE_AS_DIALOG } from "../project/actions";
import { EXPAND_DIALOG, SERVER_DIALOG } from "../server/commands";
import { NETWORK_DIALOG } from "../start/NetworkDataDialog";
import type { WorkspaceStore } from "../state/store";

/** A run's endings `algorithm_run` sends: the element's own terminal statuses. */
const RUN_OUTCOMES: ReadonlySet<RunStatus> = new Set(TERMINAL_RUN_STATUSES);
/** The camera gestures `camera_used` sends: the element's own list. */
const CAMERA_KINDS: ReadonlySet<string> = new Set(CAMERA_GESTURE_KINDS);
/** The `style.patch` actions `graph_action` names. */
const PATCH_ACTIONS: ReadonlySet<string> = new Set<Extract<SessionCommand, { op: "style.patch" }>["action"]>([
    "mark",
    "highlight",
]);

/**
 * The ids `panel_opened` may send (section 4.2): every dialog id the app sets in the store, the
 * places and the pages. The dialogs that have a constant are named by it.
 */
export const PANEL_IDS: ReadonlySet<string> = new Set([
    // dialogs
    "about",
    "analyze",
    "custom-model",
    "export",
    "generators",
    "layout",
    "path",
    "quick-actions",
    "report",
    "samples",
    "score",
    "settings",
    "shader-editor",
    "shortcuts",
    "view",
    NETWORK_DIALOG,
    SERVER_DIALOG,
    EXPAND_DIALOG,
    SAVE_AS_DIALOG,
    DISCARD_DIALOG,
    KEEP_ASSETS_DIALOG,
    // places
    "graph",
    "data",
    "assistant",
    "notes",
    // pages
    "panels",
    "data-page",
]);

/**
 * The id `panel_opened` sends for a dialog id, place or page.
 * @param id - the store's value.
 * @returns the id, "settings" for any `settings:<tab>`, else "other".
 */
export function panelId(id: string): string {
    const base = id.startsWith("settings:") ? "settings" : id;
    return PANEL_IDS.has(base) ? base : "other";
}

/**
 * An error code when graphty-element's catalog knows it, else "other".
 * @param code - the code, if any.
 * @returns the code or "other".
 */
export function knownCode(code: unknown): string {
    return isGraphtyErrorCode(code) ? code : "other";
}

/**
 * The allowlists a `source:loaded` is checked against: graphty-element's catalogs and the app's own
 * start-screen samples.
 * @param session - the project's session.
 * @returns the allowlists.
 */
export function loadAllowlists(session: GraphSession): LoadAllowlists {
    const { catalog } = session;
    return {
        datasets: new Set(catalog.datasets().map((dataset) => dataset.name)),
        generators: new Set(catalog.generators().map((generator) => generator.name)),
        examples: new Set(
            sourceDescriptors().flatMap((entry) => entry.descriptor.examples?.map((example) => example.id) ?? []),
        ),
        startSamples: new Set(START_SAMPLES.map((sample) => sample.id)),
        formats: new Set(catalog.formats().map((format) => format.id)),
    };
}

/**
 * Counts a layout the reader applied (`layout_changed`), its id checked against the catalog.
 * @param session - the project's session.
 * @param layout - the layout id.
 * @param outcome - whether it applied.
 */
export function layoutChanged(session: GraphSession, layout: string, outcome: "applied" | "failed"): void {
    const known = new Set(session.catalog.layouts().map((descriptor) => descriptor.id));
    count("layout_changed", { layout: allowlisted(layout, known), outcome });
}

/**
 * Maps one `source:loaded` to `sample_loaded` or `own_file_opened`.
 * @param session - the project's session.
 * @param loaded - the event.
 */
export function countLoaded(session: GraphSession, loaded: SourceLoaded): void {
    const mapped = sourceLoadedEvent(loaded, loadAllowlists(session));
    if (mapped !== null) {
        count(mapped.name, mapped.props);
    }
}

/**
 * A selection size as its bucket.
 * @param total - nodes plus edges selected.
 * @returns "0", "1", "2-10" or "11+".
 */
function sizeBucket(total: number): string {
    if (total <= 1) {
        return String(Math.max(total, 0));
    }
    return total <= 10 ? "2-10" : "11+";
}

/**
 * What a selection holds, as a target.
 * @param nodes - nodes selected.
 * @param edges - edges selected.
 * @returns "node", "edge", "both" or "none".
 */
function selectionTarget(nodes: number, edges: number): string {
    if (nodes > 0 && edges > 0) {
        return "both";
    }
    if (nodes > 0) {
        return "node";
    }
    return edges > 0 ? "edge" : "none";
}

/**
 * Subscribes the project's session's events to usage counts.
 * @param session - the project's session.
 * @returns a function that unsubscribes every one.
 */
export function watchSession(session: GraphSession): () => void {
    // The coalesceKey of the last graph_action sent: one slider drag sends one event, at its start.
    let lastKey: string | undefined;
    const offs = [
        session.on("source:loaded", (loaded) => {
            countLoaded(session, loaded);
        }),
        session.on("run:changed", ({ run, phase, cause, trigger }) => {
            // A re-run the session made by itself (the timeline) is not the reader's run.
            if (phase !== "end" || cause !== "command" || trigger !== undefined || !RUN_OUTCOMES.has(run.status)) {
                return;
            }
            const known = new Set(session.catalog.algorithms().map((descriptor) => descriptor.key));
            const props: UsageProps = { algorithm: allowlisted(run.algorithm, known), outcome: run.status };
            count(
                "algorithm_run",
                run.status === "failed" ? { ...props, code: knownCode(session.runs.get(run.id)?.error?.code) } : props,
            );
        }),
        session.on("journal:appended", ({ entry }) => {
            const { op } = entry.command;
            // Only the reader's own commands and suggestions applied as their own entries; a
            // project open's members, any trigger not known yet and the app's own writes (they
            // carry a callerKey) are never sent.
            if ((entry.trigger !== undefined && entry.trigger !== "suggestion") || entry.callerKey !== undefined) {
                return;
            }
            if (op === "positions.set") {
                if (entry.trigger === undefined) {
                    detail("nodes_dragged");
                }
                return;
            }
            if (!isGraphActionOp(op)) {
                return;
            }
            if (entry.coalesceKey !== undefined && entry.coalesceKey === lastKey) {
                return;
            }
            lastKey = entry.coalesceKey;
            const action = "action" in entry.command ? entry.command.action : undefined;
            detail("graph_action", {
                kind: entry.kind,
                op,
                action:
                    op === "style.patch" && typeof action === "string" && PATCH_ACTIONS.has(action)
                        ? action
                        : undefined,
                suggested: entry.trigger === "suggestion" ? true : undefined,
            });
        }),
        session.on("selection:changed", ({ cause, nodes, edges, via }) => {
            if (cause !== "user") {
                return;
            }
            detail("canvas_selected", {
                target: selectionTarget(nodes, edges),
                count: sizeBucket(nodes + edges),
                via: via ?? "other",
            });
        }),
        session.on("camera:gesture-end", ({ kind }) => {
            if (CAMERA_KINDS.has(kind)) {
                detail("camera_used", { kind });
            }
        }),
        session.on("progress:changed", ({ task, phase, outcome, error }) => {
            if ((task === "load" || task === "prepare") && phase === "end" && outcome === "failed") {
                detail("load_failed", { code: knownCode(error?.code), task });
            }
        }),
        session.on("source:expanded", () => {
            detail("source_expanded", { outcome: "expanded" });
        }),
        session.on("source:expand-failed", () => {
            detail("source_expanded", { outcome: "failed" });
        }),
    ];
    return () => {
        for (const off of offs) {
            off();
        }
    };
}

/**
 * Sends `panel_opened` when the store's dialog, place or page changes to a new value because of
 * the reader. A change the app makes itself is not sent: one in the same write that opens or
 * closes a project, and any while a project's open (its load, a restore) is still running.
 * @param store - the workspace store.
 * @returns a function that stops listening.
 */
export function watchPanels(store: WorkspaceStore): () => void {
    let { dialog, place, page, project, opened } = store.get();
    let opening = false;
    const follow = (run: Promise<void> | null): void => {
        if (run === null) {
            return;
        }
        opening = true;
        const settled = (): void => {
            if (store.get().opened === run) {
                opening = false;
            }
        };
        run.then(settled, settled);
    };
    follow(opened);
    return store.subscribe(() => {
        const next = store.get();
        if (next.opened !== opened) {
            follow(next.opened);
        }
        if (next.project === null) {
            // An open whose project closed never settles: nothing is opening any more.
            opening = false;
        }
        const own = !opening && next.project?.id === project?.id;
        for (const [was, now] of [
            [dialog, next.dialog],
            [place, next.place],
            [page, next.page],
        ] as const) {
            if (own && now !== null && now !== was) {
                detail("panel_opened", { panel: panelId(now) });
            }
        }
        ({ dialog, place, page, project, opened } = next);
    });
}

/**
 * Usage counts from the project's session and the workspace's panels. Never the start screen's
 * drawing: only the project's session is passed.
 * @param session - the project's session, or null while none is up.
 * @param store - the workspace store.
 */
export function useUsageEvents(session: GraphSession | null, store: WorkspaceStore): void {
    useEffect(() => (session === null ? undefined : watchSession(session)), [session]);
    useEffect(() => watchPanels(store), [store]);
}
