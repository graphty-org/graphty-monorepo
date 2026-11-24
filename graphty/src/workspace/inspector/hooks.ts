import { useEffect, useRef, useState } from "react";

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
