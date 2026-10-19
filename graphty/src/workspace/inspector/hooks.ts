import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useRef, useState } from "react";

/** The element's events that change what the inspector reads. */
const EVENTS = ["project:changed", "run:changed", "selection:changed", "style:changed", "visibility:changed"] as const;

/**
 * Re-renders the caller whenever the element reports a change the inspector reads: the data,
 * the runs, the selection or the style stack.
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
 * The value of an element read that answers with a promise (`selection.statistics()`,
 * `scope.count()`), read again whenever `key` changes; undefined until it settles, and after a
 * refusal.
 * @param read - the read, or a function returning null when there is nothing to read.
 * @param key - what the read depends on, as one value.
 * @returns the value, or undefined.
 */
export function useAsyncValue<T>(read: () => Promise<T> | null, key: string | number): T | undefined {
    const [value, setValue] = useState<T | undefined>(undefined);
    const latest = useRef(read);
    latest.current = read;
    useEffect(() => {
        let live = true;
        setValue(undefined);
        latest.current()?.then(
            (next) => {
                if (live) {
                    setValue(next);
                }
            },
            () => undefined,
        );
        return () => {
            live = false;
        };
    }, [key]);
    return value;
}
