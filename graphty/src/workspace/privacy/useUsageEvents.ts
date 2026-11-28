/**
 * Usage data from the project's graphty-element (design/graphty/usage-analytics.md, sections 4.1
 * and 4.2): the session's public events mapped to the app's own counts. Every value sent is checked
 * against graphty-element's catalogs or the app's own lists here, in the workspace chunk, before it
 * reaches `count()` or `detail()`; anything else is "other". Ids, names, labels and command
 * payloads are never read.
 */

import { sourceDescriptors, STYLE_PATCH_ACTIONS } from "@graphty/graphty-element/catalog";
import {
    CAMERA_GESTURE_KINDS,
    type GraphSession,
    isGraphtyErrorCode,
    type JournalEntry,
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
    graphSizeBucket,
    isGraphActionOp,
    type LoadAllowlists,
    SELECT_VIA,
    sourceLoadedEvent,
    type UsageProps,
} from "../../lib/analytics";
import { DISCARD_DIALOG, KEEP_ASSETS_DIALOG, SAVE_AS_DIALOG } from "../project/actions";
import { EXPAND_DIALOG, SERVER_DIALOG } from "../server/commands";
import { NETWORK_DIALOG } from "../start/NetworkDataDialog";
import type { WorkspaceStore } from "../state/store";
import { TOOLBAR_POPOVERS } from "../toolbar/popover";

/** A run's endings `algorithm_run` sends: the element's own terminal statuses. */
const RUN_OUTCOMES: ReadonlySet<RunStatus> = new Set(TERMINAL_RUN_STATUSES);
/** The camera gestures `camera_used` sends: the element's own list. */
const CAMERA_KINDS: ReadonlySet<string> = new Set(CAMERA_GESTURE_KINDS);
/** The `style.patch` actions `style_changed` names: the element's own list. */
const PATCH_ACTIONS: ReadonlySet<string> = new Set(STYLE_PATCH_ACTIONS);
/** The style ops sent as `style_changed` (section 4.1), never as `graph_action`. */
const STYLE_OPS: ReadonlySet<string> = new Set<SessionCommand["op"]>([
    "style.encode",
    "style.patch",
    "style.template",
    "shader.set",
]);

/**
 * The ids `panel_opened` may send (section 4.2): every dialog id the app sets in the store, the
 * places and the pages. The dialogs that have a constant are named by it.
 */
const PANEL_IDS: ReadonlySet<string> = new Set([
    // dialogs
    ...TOOLBAR_POPOVERS,
    "about",
    "custom-model",
    "export",
    "generators",
    "report",
    "samples",
    "score",
    "settings",
    "shader-editor",
    "shortcuts",
    NETWORK_DIALOG,
    SERVER_DIALOG,
    EXPAND_DIALOG,
    SAVE_AS_DIALOG,
    DISCARD_DIALOG,
    KEEP_ASSETS_DIALOG,
    // The version 2 Open and Save report dialogs (project/saveV2.ts, a lazy chunk this one does
    // not import; panelIds.test.ts holds these to its constants).
    "open-v2",
    "report-v2",
    // places
    "graph",
    "data",
    "views",
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
function knownCode(code: unknown): string {
    return isGraphtyErrorCode(code) ? code : "other";
}

/**
 * The allowlists a `source:loaded` is checked against: graphty-element's catalogs and the app's own
 * start-screen samples.
 * @param session - the project's session.
 * @returns the allowlists.
 */
function loadAllowlists(session: GraphSession): LoadAllowlists {
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
function countLoaded(session: GraphSession, loaded: SourceLoaded): void {
    const mapped = sourceLoadedEvent(loaded, loadAllowlists(session));
    if (mapped !== null) {
        count(mapped.name, {
            ...mapped.props,
            size: graphSizeBucket(session.data.statistics({ scope: "all" }).nodeCount),
        });
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
 * The count of section 4.1 a journal entry is sent as: a style edit, 2D or 3D, VR or AR, or a
 * saved view, each never a `graph_action`.
 * @param entry - the entry.
 * @param by - "assistant" when the assistant made its step.
 * @returns the name and properties; null for one of these ops that sends nothing (the 2D or 3D
 * setup at construction, leaving VR or AR); undefined for any other op.
 */
function journalCount(entry: JournalEntry, by: "assistant" | undefined): [string, UsageProps] | null | undefined {
    const { command } = entry;
    if (command.op === "style.patch" || STYLE_OPS.has(command.op)) {
        return [
            "style_changed",
            {
                op: command.op,
                action: command.op === "style.patch" ? allowlisted(command.action, PATCH_ACTIONS) : undefined,
                suggested: entry.trigger === "suggestion" ? true : undefined,
                by,
            },
        ];
    }
    switch (command.op) {
        case "view.dimension":
            return command.setup === true ? null : ["view_mode", { mode: command.dimension, by }];
        case "view.immersive":
            // A refused entry is counted where it fails (toolbar/commands.ts).
            return command.mode === null ? null : ["xr_entered", { mode: command.mode, outcome: "entered" }];
        case "view.save":
            return ["camera_saved", {}];
        default:
            return undefined;
    }
}

/**
 * Subscribes the project's session's events to usage counts.
 * @param session - the project's session.
 * @returns a function that unsubscribes every one.
 */
function watchSession(session: GraphSession): () => void {
    // The last journal count sent (graph_action, style_changed or a view count), by its
    // coalesceKey and the undo step it went into: one slider drag sends one event, at its start.
    // The key alone names a target (a layer's color, a filter), not a gesture, so a later edit of
    // the same target is a new gesture once the element has put it in a step of its own.
    let lastKey: string | undefined;
    let lastStep: string | undefined;
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
            // The entry's own step says who made it; an entry that recorded none is no one's.
            const step =
                entry.step === undefined ? undefined : session.history.steps.find(({ id }) => id === entry.step);
            // An entry that recorded no step changed nothing: within a gesture (a slider's handle
            // that sends its last value again before it draws it), it is that gesture's, and the
            // gesture's next edit still goes into the step it started.
            if (
                entry.coalesceKey !== undefined &&
                entry.coalesceKey === lastKey &&
                (entry.step === lastStep || entry.step === undefined)
            ) {
                return;
            }
            const own = journalCount(entry, step?.provenance.via === "assistant" ? "assistant" : undefined);
            if (own === null || (own === undefined && !isGraphActionOp(op))) {
                return;
            }
            lastKey = entry.coalesceKey;
            lastStep = entry.step;
            if (own === undefined) {
                detail("graph_action", {
                    kind: entry.kind,
                    op,
                    suggested: entry.trigger === "suggestion" ? true : undefined,
                });
            } else {
                count(...own);
            }
        }),
        session.on("selection:changed", ({ cause, nodes, edges, via }) => {
            if (cause !== "user") {
                return;
            }
            detail("canvas_selected", {
                target: selectionTarget(nodes, edges),
                count: sizeBucket(nodes + edges),
                via: allowlisted(via, SELECT_VIA),
            });
        }),
        session.on("camera:gesture-end", ({ kind }) => {
            if (CAMERA_KINDS.has(kind)) {
                count("camera_used", { kind });
            }
        }),
        session.on("progress:changed", ({ task, phase, outcome, error }) => {
            if ((task === "load" || task === "prepare") && phase === "end" && outcome === "failed") {
                count("load_failed", { code: knownCode(error?.code), task });
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
function watchPanels(store: WorkspaceStore): () => void {
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
