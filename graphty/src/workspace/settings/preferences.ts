/**
 * The reader's own preferences from Settings, kept in this browser: never in a project file,
 * never sent anywhere. Each read falls back to its default when storage is blocked or holds
 * something unknown.
 */

/** Number format (Settings > General). */
export const NUMBER_FORMAT = {
    key: "graphty.numberFormat.v1",
    values: ["system", "period", "comma", "space"],
    fallback: "system",
} as const;

/** Single-key shortcuts, WCAG 2.1.4 (Settings > Accessibility and input). */
export const SINGLE_KEY_SHORTCUTS = {
    key: "graphty.singleKeyShortcuts.v1",
    values: ["on", "off"],
    fallback: "on",
} as const;

/**
 * Import styles from files (Settings > General, the Load Data dialog and the Data page): whether a
 * load draws a file's own colors, sizes and shapes as style layers.
 */
export const IMPORT_FILE_STYLES = {
    key: "graphty.importFileStyles.v1",
    values: ["on", "off"],
    fallback: "on",
} as const;

/** One preference: where it is kept, what it may hold, and its default. */
interface Preference<T extends string> {
    readonly key: string;
    readonly values: readonly T[];
    readonly fallback: T;
}

/**
 * Reads a preference.
 * @param preference - the preference.
 * @returns its stored value, or its default.
 */
export function readPreference<T extends string>(preference: Preference<T>): T {
    try {
        const stored = localStorage.getItem(preference.key);
        return preference.values.find((value) => value === stored) ?? preference.fallback;
    } catch {
        return preference.fallback;
    }
}

/**
 * Keeps a preference.
 * @param preference - the preference.
 * @param value - the new value.
 */
export function writePreference<T extends string>(preference: Preference<T>, value: T): void {
    try {
        localStorage.setItem(preference.key, value);
    } catch {
        // Storage blocked: the choice holds for this page view only.
    }
}

/**
 * The load choice the import-styles preference stands for, as graphty-element's `LoadChoices.styles`.
 * @returns "file" when a load draws the file's styles, else "none".
 */
export function fileStylesChoice(): "file" | "none" {
    return readPreference(IMPORT_FILE_STYLES) === "on" ? "file" : "none";
}

/**
 * Keeps the import-styles preference.
 * @param on - whether loads draw a file's styles.
 */
export function writeFileStylesChoice(on: boolean): void {
    writePreference(IMPORT_FILE_STYLES, on ? "on" : "off");
}
