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
 * Re-renders on every change graphty-element reports to the timeline, its window or the selection.
 * @param session - the element's session, or null.
 * @returns a number that changes with each.
 */
export function useTimeVersion(session: GraphSession | null): number {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        const bump = (): void => {
            setVersion((v) => v + 1);
        };
        const offs = EVENTS.map((event) => session.on(event, bump));
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session]);
    return version;
}
