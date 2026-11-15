/**
 * Every surface that draws a graph waits for `<graphty-element>` the same way: it loads the
 * element's code, waits for the tag to be defined, and on a failure (a network error, or a chunk
 * gone stale after a deploy) says so and offers Retry, which loads it again.
 */

import { useCallback, useEffect, useState } from "react";

import { loadGraphtyElement } from "./elementLoader";

/** Where loading `<graphty-element>` stands. */
export interface ElementDefined {
    /** Whether the tag is defined, so it can be rendered with its props set as properties. */
    defined: boolean;
    /** Whether the element's code could not be loaded. */
    failed: boolean;
    /** Loads the element's code again, after a failure. */
    retry: () => void;
}

/**
 * Loads graphty-element and follows whether its tag is defined, or failed to load.
 * @param where - Names the surface in the console message for a failure
 * @param load - Loads the element's code; a test hands in one that fails
 * @returns Whether the tag is defined, whether loading it failed, and Retry
 */
export function useElementDefined(where: string, load: () => Promise<void> = loadGraphtyElement): ElementDefined {
    const [defined, setDefined] = useState(() => customElements.get("graphty-element") !== undefined);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (defined) {
            return undefined;
        }
        let live = true;
        load()
            .then(() => customElements.whenDefined("graphty-element"))
            .then(
                () => {
                    if (live) {
                        setDefined(true);
                    }
                },
                (error: unknown) => {
                    if (live) {
                        console.error(`[${where}] graphty-element could not be loaded:`, error);
                        setFailed(true);
                    }
                },
            );
        return () => {
            live = false;
        };
    }, [defined, attempt, where, load]);
    const retry = useCallback(() => {
        setFailed(false);
        setAttempt((before) => before + 1);
    }, []);
    return { defined, failed, retry };
}
