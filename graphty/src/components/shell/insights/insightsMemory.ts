/**
 * The Insights strip's own slice of remembered state: which cards have retired.
 *
 * Spec 7.3 (app-shell-progressive-disclosure-design.md line 5752): "A card retires once
 * its capability has been run directly from its panel. Card retirement is stored in
 * local storage." That is a different fact from the strip-level dismissal, which is a
 * 6.5 canvas entry and lives in `canvas/canvasMemory.ts` as `insightsDismissed`. The two
 * are kept in two keys on purpose: they have different lifetimes (Help > "Show
 * suggestions" restores the dismissal, and must NOT un-retire a capability that really
 * has been run) and two keys mean one cannot corrupt the other.
 *
 * The read, the write and the resolve below copy `readPersistedCanvasLayout` field for
 * field -- a versioned key so a shape change becomes a missing key rather than a corrupt
 * read, a try/catch round the store, JSON.parse in its own try, non-objects and arrays
 * refused, and each field validated on its own.
 */

/** Versioned local-storage key for 7.3's "Card retirement is stored in local storage". */
export const INSIGHTS_MEMORY_STORAGE_KEY = "graphty.shell.insights.v1";

/**
 * Exactly what the insights layer remembers, and nothing more.
 * @public
 */
export interface PersistedInsightsMemory {
    /** Capability ids already run from their own panel. */
    readonly retiredCapabilities: readonly string[];
}

/** No card retired. */
export const DEFAULT_INSIGHTS_MEMORY: PersistedInsightsMemory = {
    retiredCapabilities: [],
};

/**
 * Reads the insights layer's remembered state, surviving an absent key, an unreadable
 * store (private mode, disabled site data), malformed JSON and a value of the wrong
 * shape. A capability id is kept only when it is a string, so one bad member costs only
 * that member.
 * @returns whatever of the insights memory could be trusted.
 */
export function readPersistedInsightsMemory(): Partial<PersistedInsightsMemory> {
    let raw: string | null = null;

    try {
        raw = window.localStorage.getItem(INSIGHTS_MEMORY_STORAGE_KEY);
    } catch {
        return {};
    }

    if (raw === null || raw === "") {
        return {};
    }

    let parsed: unknown = null;

    try {
        parsed = JSON.parse(raw);
    } catch {
        return {};
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {};
    }

    const record = parsed as Record<string, unknown>;
    const result: { retiredCapabilities?: readonly string[] } = {};

    if (Array.isArray(record.retiredCapabilities)) {
        result.retiredCapabilities = record.retiredCapabilities.filter(
            (entry): entry is string => typeof entry === "string",
        );
    }

    return result;
}

/**
 * Writes the insights layer's remembered state. A full or unavailable store is not an
 * error the shell can act on: retirement simply does not survive the session.
 * @param memory - the insights memory to remember.
 */
export function writePersistedInsightsMemory(memory: PersistedInsightsMemory): void {
    try {
        window.localStorage.setItem(INSIGHTS_MEMORY_STORAGE_KEY, JSON.stringify(memory));
    } catch {
        // Deliberately ignored: see the JSDoc above.
    }
}

/**
 * The insights memory to start a session with: the defaults, overwritten by whatever of
 * the stored record could be trusted.
 * @param persisted - the result of {@link readPersistedInsightsMemory}.
 * @returns a complete insights memory.
 */
export function resolveInsightsMemory(persisted: Partial<PersistedInsightsMemory>): PersistedInsightsMemory {
    return { ...DEFAULT_INSIGHTS_MEMORY, ...persisted };
}

/**
 * The memory with one more capability retired. Idempotent, and the existing order is
 * preserved, so the record reads as the order the capabilities were actually run in.
 * @param memory - the current insights memory.
 * @param capability - the capability that has now been run from its own panel.
 * @returns the memory with that capability retired.
 */
export function withRetiredCapability(memory: PersistedInsightsMemory, capability: string): PersistedInsightsMemory {
    if (memory.retiredCapabilities.includes(capability)) {
        return memory;
    }

    return { ...memory, retiredCapabilities: [...memory.retiredCapabilities, capability] };
}
