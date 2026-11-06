/**
 * A selection read live from graphty-element (`scope.watchSteps`).
 */

import type { BranchesView, GraphSession, StepsReading, UnionLeaf } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

/**
 * Reads a selection live: the element calls back whenever data, runs, sets, hover or the
 * selection change what it holds. The first reading is synchronous.
 * @param session - the element's session.
 * @param rule - the selection.
 * @returns the reading.
 */
export function useSteps(session: GraphSession, rule: UnionLeaf): StepsReading {
    const key = JSON.stringify(rule);
    const [held, setHeld] = useState<{ key: string; reading: StepsReading } | null>(null);
    useEffect(() => {
        const watch = session.scope.watchSteps(JSON.parse(key) as UnionLeaf, (reading) => {
            setHeld({ key, reading });
        });
        setHeld({ key, reading: watch.current });
        return () => {
            watch.end();
        };
    }, [session, key]);
    if (held?.key === key) {
        return held.reading;
    }
    const peek = session.scope.watchSteps(rule, () => undefined);
    peek.end();
    return peek.current;
}

/**
 * The selection open in an editor, read live from graphty-element (`scope.watchSteps`), for the
 * table's Group column and Matches only, and the canvas key's preview (design/ui/selection-groups/spec.md, section 8).
 * @param session - the element's session.
 * @param rule - the open selection, or null.
 * @returns the reading, or null while none is open.
 */
export function useEditedSelection(session: GraphSession | null, rule: UnionLeaf | null): StepsReading | null {
    const key = rule === null ? null : JSON.stringify(rule);
    const [reading, setReading] = useState<StepsReading | null>(null);
    useEffect(() => {
        if (session === null || key === null) {
            setReading(null);
            return undefined;
        }
        const watch = session.scope.watchSteps(JSON.parse(key) as UnionLeaf, setReading);
        setReading(watch.current);
        return () => {
            watch.end();
        };
    }, [session, key]);
    return key === null ? null : reading;
}

/**
 * Whether graphty-element draws a branches view now.
 * @param session - the element's session.
 * @returns true while it does.
 */
export function useShowingBranches(session: GraphSession): boolean {
    const [shown, setShown] = useState(session.styles.showingBranches);
    useEffect(() => {
        setShown(session.styles.showingBranches);
        return session.on("style:branches-shown-changed", (change) => {
            setShown(change.shown);
        });
    }, [session]);
    return shown;
}

/**
 * The branches view graphty-element draws now, whoever drew it: what the canvas key describes.
 * @param session - the element's session.
 * @returns the view, or null.
 */
export function useShownBranches(session: GraphSession): BranchesView | null {
    const [shown, setShown] = useState(session.styles.shownBranches);
    useEffect(() => {
        setShown(session.styles.shownBranches);
        return session.on("style:branches-shown-changed", () => {
            setShown(session.styles.shownBranches);
        });
    }, [session]);
    return shown;
}
