import { useState } from "react";

import type { ChangeHandler } from "../types/events";

/**
 * A field's chosen value: the caller's when it passes one, else the last one set here.
 *
 * Not Mantine's `useUncontrolled`: that keeps its own copy only while the caller passes
 * `undefined`, so a value picked at the default came back from that stale copy once the caller
 * returned to `undefined` (a reset, an undo), and picking it again reported nothing. Here every
 * set updates the copy, and any change of the caller's value drops it, so a caller that goes back
 * to `undefined` shows the default again.
 * @param value - The caller's value, `undefined` when it has chosen none
 * @param onChange - Told of each set
 * @returns The value and its setter
 */
export function useChosen<T>(
    value: T | undefined,
    onChange: ChangeHandler<T | undefined> | undefined,
): [T | undefined, ChangeHandler<T | undefined>] {
    const [own, setOwn] = useState<T | undefined>(undefined);
    const [seen, setSeen] = useState<T | undefined>(value);
    if (!Object.is(seen, value)) {
        // React's "adjust state when a prop changes" pattern: no effect, no extra paint.
        setSeen(value);
        setOwn(undefined);
    }
    // The event is passed on only when there is one, as Mantine's hook does.
    const set: ChangeHandler<T | undefined> = (next, ...event) => {
        setOwn(next);
        onChange?.(next, ...event);
    };
    return [value ?? own, set];
}
