import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

/** The element's events that change what the toolbar, Analyze and Layout read. */
const EVENTS = ["project:changed", "run:changed", "selection:changed"] as const;

/**
 * Re-renders the caller whenever the element reports a change to its project, its runs or its
 * selection, so a control reading the session (a disabled reason, a Recent list, the current
 * layout) reads it fresh.
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

/**
 * Why the canvas tools cannot run: nothing is drawn until the element holds a node.
 * @param session - the element's session, or null.
 * @returns "Nothing is drawn", or null when there is a graph.
 */
export function nothingDrawn(session: GraphSession | null): string | null {
    return session === null || session.data.statistics().nodeCount === 0 ? "Nothing is drawn" : null;
}
