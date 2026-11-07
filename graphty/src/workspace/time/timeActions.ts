/**
 * What the timeline's controls do, shared by the dock, the Time section and the keys. Each one is
 * a call on graphty-element's `session.time` and the words the app writes about it.
 */

import type {
    CodedFact,
    GraphSession,
    TimeField,
    TimeNoticeCode,
    TimeStepEvent,
    TimeUnit,
} from "@graphty/graphty-element/session";

import { formatCount } from "../settings/numberFormat";
import type { WorkspaceStore } from "../state/store";
import { countWords, instantWords, intervalOf, noticeOf, refusalWords, unitLabel, windowWords } from "./timeWords";

/** Where the dock gives way to the phone's: the width frame.css folds the workspace's columns at. */
export const PHONE_WIDTH = "(max-width: 720px)";

/**
 * Whether the timeline experiment is on, as graphty-element reports it.
 * @param session - the element's session, or null.
 * @returns true when it is on.
 */
export function timelineOn(session: GraphSession | null): boolean {
    return session?.features.enabled.includes("timeline") === true;
}

/**
 * The unit the designated field reads numbers in.
 * @param session - the element's session.
 * @returns the unit.
 */
export function unitOf(session: GraphSession): TimeUnit {
    const { field } = session.time;
    return field?.edges?.unit ?? field?.nodes?.unit ?? "ms";
}

/** How many elements a move brought into the window and took out of it. */
interface WindowMoved {
    readonly entered: number;
    readonly left: number;
}

/** A play the reader started: what it moved so far, and how to stop counting. */
interface PlayTally {
    entered: number;
    left: number;
    stop: () => void;
}

/** Each session's play, from Play to the Pause that reads it. */
const plays = new WeakMap<GraphSession, PlayTally>();

/**
 * What one move brought in and took out.
 * @param event - the move.
 * @returns the counts.
 */
function movedBy(event: TimeStepEvent): WindowMoved {
    return { entered: event.entered.nodes + event.entered.edges, left: event.left.nodes + event.left.edges };
}

/**
 * Starts counting what a play moves, frame by frame: a pause has only the sum to report, since
 * `time.changes()` then holds the last frame alone.
 * @param session - the element's session.
 */
function tallyPlay(session: GraphSession): void {
    plays.get(session)?.stop();
    const tally: PlayTally = { entered: 0, left: 0, stop: () => undefined };
    tally.stop = session.on("time:step", (event) => {
        const moved = movedBy(event);
        tally.entered += moved.entered;
        tally.left += moved.left;
    });
    plays.set(session, tally);
}

/**
 * Says where the window is on the status line (never every playback frame), and what entered and
 * left it after a step or a pause.
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param moved - what entered and left; left out where no count describes the move.
 */
export function announceWindow(session: GraphSession, store: WorkspaceStore, moved?: WindowMoved): void {
    const window = session.time.current;
    if (window === null) {
        return;
    }
    const { visibleNodes, visibleEdges } = session.visibility.summary;
    const counts =
        moved === undefined ? "" : `, ${formatCount(moved.entered)} entered, ${formatCount(moved.left)} left`;
    store.set({
        announcement: `${windowWords(window, unitOf(session), session.time.timeZone)}: ${countWords(visibleNodes, "node")}, ${countWords(visibleEdges, "edge")}${counts}`,
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
        (event) => {
            announceWindow(session, store, movedBy(event));
        },
        () => {
            store.set({ notice: { message: "The time window could not move." } });
        },
    );
}

/**
 * Starts playback at a speed. Stepped playback waits for each frame, so it never outruns the drawing.
 * @param session - the element's session.
 * @param speed - the speed.
 */
export function playAt(session: GraphSession, speed: number): void {
    session.time.play({ interval: intervalOf(speed), waitForRender: true });
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
        const tally = plays.get(session);
        tally?.stop();
        plays.delete(session);
        announceWindow(session, store, tally);
        return;
    }
    tallyPlay(session);
    try {
        playAt(session, store.get().timeSpeed);
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
        (event) => {
            announceWindow(session, store, movedBy(event));
        },
        () => {
            store.set({ notice: { message: "The time window could not move." } });
        },
    );
}

/**
 * The time span of the selection, with the edges at its nodes.
 * @param session - the element's session.
 * @returns the span; null with nothing selected or nothing in it timed.
 */
export function selectionSpan(session: GraphSession): { readonly from: number; readonly to: number } | null {
    const { nodes, edges } = session.selection;
    return nodes.length + edges.length === 0 ? null : session.time.spanOf({ nodes, edges, incident: true });
}

/**
 * Sets the window to the selection's span, and says where it went. With no span it does nothing:
 * `window(null)` would clear the reader's window.
 * @param session - the element's session.
 * @param store - the chrome store.
 */
export function jumpToSelection(session: GraphSession, store: WorkspaceStore): void {
    const span = selectionSpan(session);
    if (span === null) {
        return;
    }
    session.time.pause();
    session.time.window(span).then(() => {
        announceWindow(session, store);
    }, reportTimeError(store));
}

/**
 * Whether the window is a phone's, where the brush lives in a sheet and the dock replaces the panels.
 * @returns true on a phone.
 */
function onPhone(): boolean {
    return globalThis.matchMedia(PHONE_WIDTH).matches;
}

/**
 * What going to a place writes besides the place: a phone's open dock hides the panels the place
 * shows in, so it closes.
 * @returns the store's change.
 */
export function panelsInView(): { readonly timelineOpen?: boolean } {
    return onPhone() ? { timelineOpen: false } : {};
}

/** Puts focus on the brush, at the window's start. */
export function focusWindowStart(): void {
    document.querySelector<HTMLElement>('.tl-dock [role="slider"][aria-label="Window start"]')?.focus();
}

/**
 * Brings up the phone's sheet, paused, since nothing in it could stop a play. The dock comes with
 * it: the sheet is the dock's.
 * @param session - the element's session.
 * @param store - the chrome store.
 */
export function openTimeSheet(session: GraphSession, store: WorkspaceStore): void {
    session.time.pause();
    store.set({ timelineOpen: true, timeSheetOpen: true });
}

/**
 * Takes the reader to the brush: focus on the dock's, or the sheet that holds a phone's, which
 * focuses it as it comes up.
 * @param session - the element's session.
 * @param store - the chrome store.
 */
export function focusBrush(session: GraphSession, store: WorkspaceStore): void {
    if (onPhone()) {
        openTimeSheet(session, store);
    } else {
        focusWindowStart();
    }
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
    return at === null ? value : instantWords(at, "ms", undefined, session.time.timeZone);
}
