import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

/** The session's events that change what the Style tab reads: the layers, the runs, the data. */
const EVENTS = ["style:changed", "run:changed", "project:derived", "history:changed"] as const;

/**
 * A number bumped by every call of `bump` that `listen` wires up, and by the element's label
 * counts, unwired when the session or the element goes.
 * @param session - the element's session, or null.
 * @param element - the element, or null.
 * @param listen - subscribes `bump` to the session's events, returning the unsubscribes; pass a
 *     module-level function, since a new one subscribes again.
 * @returns a number that changes with each bump.
 */
function useBumpedVersion(
    session: GraphSession | null,
    element: GraphtyElement | null,
    listen: (session: GraphSession, bump: () => void) => (() => void)[],
): number {
    // on reload: fresh: derived: a redraw counter for graphty-element's events
    const [version, setVersion] = useState(0);
    useEffect(() => {
        const bump = (): void => {
            setVersion((v) => v + 1);
        };
        const offs = session === null ? [] : listen(session, bump);
        element?.addEventListener("graphty-label-change", bump);
        return () => {
            offs.forEach((off) => {
                off();
            });
            element?.removeEventListener("graphty-label-change", bump);
        };
    }, [session, element, listen]);
    return version;
}

/**
 * Subscribes to every event the Style tab reads.
 * @param session - the session.
 * @param bump - what each event calls.
 * @returns the unsubscribes.
 */
const listenAll = (session: GraphSession, bump: () => void): (() => void)[] =>
    EVENTS.map((event) => session.on(event, bump));

/**
 * Re-renders the caller whenever the element reports a change to its styles, runs or data, or to
 * its label counts, so the Style tab reads the element fresh.
 * @param session - the element's session, or null.
 * @param element - the element, or null.
 * @returns a number that changes with each reported change.
 */
export function useStyleVersion(session: GraphSession | null, element: GraphtyElement | null): number {
    return useBumpedVersion(session, element, listenAll);
}

/**
 * Subscribes to the changes that write more than the style layers.
 * @param session - the session.
 * @param bump - what each such change calls.
 * @returns the unsubscribes.
 */
function listenData(session: GraphSession, bump: () => void): (() => void)[] {
    // A change that wrote more than the layers is read again once the picture has caught up.
    let derivedPending = false;
    return [
        session.on("run:changed", bump),
        session.on("project:changed", ({ slices }) => {
            if (slices.some((slice) => slice !== "styles")) {
                derivedPending = true;
                bump();
            }
        }),
        session.on("project:derived", () => {
            if (derivedPending) {
                derivedPending = false;
                bump();
            }
        }),
    ];
}

/**
 * Re-renders the caller after every change the Style tab reads that is not to the style layers
 * alone: a run, the data, a label count. The history is not one: an undo or redo is a project
 * change, and the sections read the history only when they write. A change to
 * the layers alone (an animation's `styles.update` once a frame) does not bump it, so a panel that
 * reads the layers itself can skip a change to layers it does not show (#9423).
 * @param session - the element's session, or null.
 * @param element - the element, or null.
 * @returns a number that changes with each such change.
 */
export function useDataVersion(session: GraphSession | null, element: GraphtyElement | null): number {
    return useBumpedVersion(session, element, listenData);
}
