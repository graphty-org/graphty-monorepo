import {useEffect, useState} from "react";

export interface UseLocalValueResult {
    localValue: string | number;
    setLocalValue: (value: string | number) => void;
    commitValue: () => number;
}

/**
 * Hook for managing local input state that syncs with external prop.
 * Useful for NumberInput blur-on-commit pattern where the input value
 * should be editable locally but commit only on blur.
 *
 * @param externalValue - The external prop value to sync with
 * @param fallbackValue - The fallback value to use when parsing fails
 * @returns Object with localValue, setLocalValue, and commitValue
 */
export function useLocalValue(
    externalValue: number,
    fallbackValue: number,
): UseLocalValueResult {
    const [localValue, setLocalValue] = useState<string | number>(externalValue);

    useEffect(() => {
        setLocalValue(externalValue);
    }, [externalValue]);

    const commitValue = (): number => {
        return typeof localValue === "string" ?
            parseFloat(localValue) || fallbackValue :
            localValue;
    };

    return {localValue, setLocalValue, commitValue};
}
