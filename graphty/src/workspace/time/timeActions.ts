/**
 * What the timeline's controls do, shared by the dock, the Time section and the keys. Each one is
 * a call on graphty-element's `session.time` and the words the app writes about it.
 */

import type { GraphSession, TimeUnit } from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";
import { countWords, intervalOf, windowWords } from "./timeWords";

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
