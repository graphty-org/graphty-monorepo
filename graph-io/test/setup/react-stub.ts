/**
 * The two React hooks the documentation's React example imports, for running it without React: the example
 * defines a hook and calls neither at its top level, so these only have to exist.
 */

/**
 * A state hook that never re-renders.
 * @param initial - the initial value
 * @returns the value and a setter that does nothing
 */
export function useState<T>(initial: T): [T, (value: T) => void] {
    return [initial, (): void => undefined];
}

/**
 * An effect hook that runs the effect once.
 * @param effect - the effect
 */
export function useEffect(effect: () => unknown): void {
    effect();
}
