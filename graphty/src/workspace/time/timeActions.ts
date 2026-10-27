/**
 * What the timeline's controls do, shared by the dock, the Time section and the keys. Each one is
 * a call on graphty-element's `session.time` and the words the app writes about it.
 */

import type { CodedFact, GraphSession, TimeField, TimeNoticeCode, TimeUnit } from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";
import { countWords, instantWords, intervalOf, noticeOf, refusalWords, unitLabel, windowWords } from "./timeWords";

/**
 * The unit the designated field reads numbers in.
 * @param session - the element's session.
 * @returns the unit.
 */
export function unitOf(session: GraphSession): TimeUnit {
    const { field } = session.time;
    return field?.edges?.unit ?? field?.nodes?.unit ?? "ms";
}

/**
 * Says where the window is on the status line, for a step and a pause (never every playback frame).
 * @param session - the element's session.
 * @param store - the chrome store.
 */
export function announceWindow(session: GraphSession, store: WorkspaceStore): void {
    const window = session.time.current;
    if (window === null) {
        return;
    }
    const { visibleNodes, visibleEdges } = session.visibility.summary;
    store.set({
        announcement: `${windowWords(window, unitOf(session))}: ${countWords(visibleNodes, "node")}, ${countWords(visibleEdges, "edge")}`,
    });
}

/**
 * Moves the window by whole steps and says where it went.
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param count - how many steps; negative goes back.
 */
export function stepWindow(session: GraphSession, store: WorkspaceStore, count: number): void {
    session.time.pause();
    session.time.stepBy(count).then(
        () => {
            announceWindow(session, store);
        },
        () => {
            store.set({ notice: { message: "The time window could not move." } });
        },
    );
}

/**
 * Starts or stops playback at the reader's speed.
 * @param session - the element's session.
 * @param store - the chrome store.
 */
export function togglePlay(session: GraphSession, store: WorkspaceStore): void {
    const { time } = session;
    if (time.playing) {
        time.pause();
        announceWindow(session, store);
        return;
    }
    try {
        time.play({ interval: intervalOf(store.get().timeSpeed) });
    } catch {
        store.set({ notice: { message: "The timeline could not play." } });
    }
}

/**
 * Says what the element found in the designated field's values: one notice, with a button that
 * sets the unit it suggests.
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param notices - the element's notices.
 */
export function showNotices(
    session: GraphSession,
    store: WorkspaceStore,
    notices: readonly CodedFact<TimeNoticeCode>[],
): void {
    if (notices.length === 0) {
        return;
    }
    const read = notices.map(noticeOf);
    const suggested = read.find((each) => each.unit !== undefined)?.unit;
    const { field } = session.time;
    const designated = field?.edges ?? field?.nodes;
    store.set({
        notice: {
            message: read.map((each) => each.message).join(". "),
            ...(suggested === undefined || designated === undefined
                ? {}
                : {
                      action: {
                          label: unitLabel(suggested),
                          run: () => {
                              const source = { start: designated.start, unit: suggested };
                              designate(
                                  session,
                                  store,
                                  field?.edges === undefined ? { nodes: source } : { edges: source },
                              );
                          },
                      },
                  }),
        },
    });
}

/**
 * Designates a column as the time field (or none), and says what the element found in it or why
 * it refused.
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param field - the field, or null.
 */
export function designate(session: GraphSession, store: WorkspaceStore, field: TimeField | null): void {
    session.time.pause();
    session.time.setField(field).then(
        (result) => {
            if (field !== null) {
                store.set({ timelineOpen: true });
            }
            showNotices(session, store, result.notices);
        },
        (error: unknown) => {
            const column = field?.edges?.start ?? field?.nodes?.start ?? "";
            const reason = (error as { details?: { reason?: unknown } }).details?.reason;
            store.set({ notice: { message: refusalWords(column, reason) } });
        },
    );
}

/**
 * Moves the window to the first or the last one, and says where it went.
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param end - which end.
 */
export function seekEdge(session: GraphSession, store: WorkspaceStore, end: "start" | "end"): void {
    session.time.pause();
    session.time.seek(end).then(
        () => {
            announceWindow(session, store);
        },
        () => {
            store.set({ notice: { message: "The time window could not move." } });
        },
    );
}

/** Puts focus on the dock's brush, at the window's start. */
export function focusBrush(): void {
    document.querySelector<HTMLElement>('.tl-dock [role="slider"][aria-label="Window start"]')?.focus();
}

/**
 * Says in words why the element refused a timeline change, instead of discarding it.
 * @param store - the chrome store.
 * @returns a rejection handler.
 */
export function reportTimeError(store: WorkspaceStore): (error: unknown) => void {
    return (error) => {
        const { code, details } = error as { code?: string; details?: { reason?: unknown } };
        const words =
            code === "E_BAD_COMMAND" && details?.reason === "calendar-step-on-ordinal"
                ? "A number timeline steps by numbers"
                : "The time window could not change";
        store.set({ notice: { message: words, error: true } });
    };
}

/**
 * A value of the designated time column in the timeline's date words, as the dock writes them;
 * any other value as it is.
 * @param session - the element's session.
 * @param kind - nodes or edges.
 * @param column - the column.
 * @param value - the value.
 * @returns "Jan 31, 2025" for a time, else the value.
 */
export function timeValue(session: GraphSession, kind: "node" | "edge", column: string, value: unknown): unknown {
    const { field } = session.time;
    const source = kind === "node" ? field?.nodes : field?.edges;
    if (source?.start !== column || value === null || value === undefined || value === "") {
        return value;
    }
    const at = typeof value === "string" || typeof value === "number" ? session.time.parse(String(value)) : null;
    return at === null ? value : instantWords(at, unitOf(session));
}
