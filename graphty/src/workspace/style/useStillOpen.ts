import { useCallback, useEffect, useRef } from "react";

/**
 * Whether what was added while a pop-over was open may still land in it: closing it, or its going,
 * makes every add started before stale, so a file or address that finishes loading afterwards
 * writes no layer, opens nothing and shows no chip.
 * @param opened - whether the pop-over is open.
 * @returns a function to call as an add starts; the check it returns is true while that add is current.
 */
export function useStillOpen(opened: boolean): () => () => boolean {
    const turn = useRef(0);
    useEffect(() => {
        if (!opened) {
            turn.current += 1;
        }
    }, [opened]);
    useEffect(
        () => () => {
            turn.current += 1;
        },
        [],
    );
    return useCallback(() => {
        const started = turn.current;
        return () => started === turn.current;
    }, []);
}
