import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

/** The element's events that change what the Graph place reads. */
const EVENTS = ["project:changed", "run:changed", "style:changed", "selection:changed", "history:changed"] as const;

/**
 * Re-renders the caller whenever the element reports a change to its data, runs, styles or
 * selection, so a row, a count or the footer reads the session fresh.
 * @param session - the element's session, or null.
 * @returns a number that changes with each reported change.
 */
export function useSessionVersion(session: GraphSession | null): number {
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
