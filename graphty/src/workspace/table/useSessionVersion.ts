import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

/** The element's events that change what the table reads: records, runs and the selection. */
const EVENTS = ["project:changed", "run:changed", "selection:changed"] as const;

/**
 * Re-renders the caller whenever the element reports a change to its records, its runs or its
 * selection, so the table re-reads its page.
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
