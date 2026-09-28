import { createContext, useContext } from "react";

import type { ShellContextValue } from "./types";

/** The shell store, published by `ShellProvider` in `ShellContext.tsx`. */
export const ShellContext = createContext<ShellContextValue | null>(null);

/**
 * Reads the shell store.
 * @returns the shell store's value.
 * @throws when called outside a `ShellProvider`.
 */
export function useShell(): ShellContextValue {
    const value = useContext(ShellContext);

    if (value === null) {
        throw new Error("useShell must be used inside a ShellProvider");
    }

    return value;
}
