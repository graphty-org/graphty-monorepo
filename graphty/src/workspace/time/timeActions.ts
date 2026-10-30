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
 * Makes a text column about to become the time a date column, when every one of its values reads
 * as a date (the element's preview says so): the column's kind and the timeline then say the same
 * thing (tier 4 round 1: a time drawn as dates over a column still marked text was a false done).
 * @param session - the element's session.
 * @param field - the field about to be designated.
 * @returns settles once any conversion is recorded.
 */
async function asDates(session: GraphSession, field: TimeField | null): Promise<void> {
    const sides = [
        ["node", field?.nodes],
        ["edge", field?.edges],
    ] as const;
    for (const [kind, source] of sides) {
        if (source === undefined || source.unit !== undefined) {
            continue;
        }
        const name = source.start.replace(/^data\./, "");
        const column = session.data.attributes().find((each) => each.kind === kind && each.name === name);
        if (column?.type !== "string") {
            continue;
        }
        const preview = session.data.previewType({ kind, name }, "date");
        if (preview.fails === 0) {
            await session.data.setType({ kind, name }, "date");
        }
    }
}

/**
 * Designates a column as the time field (or none), and says what the element found in it or why
 * it refused. A text column whose values all read as dates becomes a date column first.
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param field - the field, or null.
 */
export function designate(session: GraphSession, store: WorkspaceStore, field: TimeField | null): void {
    session.time.pause();
    // A Time window card added for the last field does not come back on its own for this one.
    store.set({ timeWindowCard: false });
    asDates(session, field)
        .then(async () => session.time.setField(field))
        .then(
            (result) => {
                // Setting the field sets only the field: the dock opens from the toolbar's clock button.
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
 * A value of a column typed date in the timeline's date words, written to the day; any other
 * value as it is. A column's kind alone decides: the Time role on a text or number column leaves
 * its values as they are, as its header's glyph and sort caption say.
 * @param session - the element's session, which reads the date.
 * @param value - the value.
 * @param date - whether the column is typed date.
 * @returns "Jan 31, 2025" for a date, else the value.
 */
export function timeValue(session: GraphSession, value: unknown, date: boolean): unknown {
    if (!date || value === null || value === undefined || value === "") {
        return value;
    }
    let at: number | null = null;
    if (value instanceof Date) {
        at = value.getTime();
    } else if (typeof value === "string" || typeof value === "number") {
        at = session.time.parse(String(value));
    }
    return at === null ? value : instantWords(at, "ms");
}
