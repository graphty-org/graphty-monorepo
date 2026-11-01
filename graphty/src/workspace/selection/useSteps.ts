/**
 * A selection read live from graphty-element (`scope.watchSteps`).
 */

import type { GraphSession, StepsReading, UnionLeaf } from "@graphty/graphty-element/session";
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
