/**
 * The reader's own preferences from Settings, kept in this browser: never in a project file,
 * never sent anywhere. Each read falls back to its default when storage is blocked or holds
 * something unknown.
 */

import { ACCELERATION_POLICIES, ACCELERATION_POLICY_DEFAULT } from "@graphty/graphty-element/session";

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
 * GPU acceleration (Settings > Performance): the policy written on the element's `acceleration`
 * attribute. The element applies it but never remembers it, so the app keeps the reader's word.
 */
export const ACCELERATION = {
    key: "graphty.acceleration.v1",
    values: ACCELERATION_POLICIES,
    fallback: ACCELERATION_POLICY_DEFAULT,
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
