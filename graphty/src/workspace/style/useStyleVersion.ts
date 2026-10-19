import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

/** The session's events that change what the Style tab reads: the layers, the runs, the data. */
const EVENTS = ["style:changed", "run:changed", "project:changed", "history:changed"] as const;

/**
 * Re-renders the caller whenever the element reports a change to its styles, runs or data, or to
 * its label counts, so the Style tab reads the element fresh.
 * @param session - the element's session, or null.
 * @param element - the element, or null.
 * @returns a number that changes with each reported change.
 */
export function useStyleVersion(session: GraphSession | null, element: GraphtyElement | null): number {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        const bump = (): void => {
            setVersion((v) => v + 1);
        };
        const offs = session === null ? [] : EVENTS.map((event) => session.on(event, bump));
        element?.addEventListener("graphty-label-change", bump);
        return () => {
            offs.forEach((off) => {
                off();
            });
            element?.removeEventListener("graphty-label-change", bump);
        };
    }, [session, element]);
    return version;
}
