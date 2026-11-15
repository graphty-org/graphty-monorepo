import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

/** The element events after which the timeline's controls read the session again. */
const EVENTS = [
    "time:field",
    "time:ready",
    "time:step",
    "time:play",
    "time:pause",
    "time:end",
    "visibility:changed",
    "selection:changed",
    "project:changed",
] as const;

/**
 * The events after which a panel that shows the time field and its settings, and not the window,
 * reads the session again: not each step of a play, nor the visibility and selection every step
 * moves. Re-rendered on every step, the Data place's Fields and time card read every column's
 * values again for each frame a play drew (#4196).
 */
const FIELD_EVENTS = ["time:field", "time:ready", "time:play", "time:pause", "time:end", "project:changed"] as const;

/**
 * A number that changes after each of the element's events named.
 * @param session - the element's session, or null.
 * @param events - the events.
 * @returns the number.
 */
function useVersionOf(session: GraphSession | null, events: typeof EVENTS | typeof FIELD_EVENTS): number {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        const bump = (): void => {
            setVersion((v) => v + 1);
        };
        const offs = events.map((event) => session.on(event, bump));
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session, events]);
    return version;
}

/**
 * Re-renders on every change graphty-element reports to the timeline, its window or the selection.
 * @param session - the element's session, or null.
 * @returns a number that changes with each.
 */
export function useTimeVersion(session: GraphSession | null): number {
    return useVersionOf(session, EVENTS);
}

/**
 * Re-renders when the time field, its settings or whether time plays change; see FIELD_EVENTS.
 * @param session - the element's session, or null.
 * @returns a number that changes with each.
 */
export function useTimeFieldVersion(session: GraphSession | null): number {
    return useVersionOf(session, FIELD_EVENTS);
}
