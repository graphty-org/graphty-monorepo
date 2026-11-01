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

/**
 * Import styles from files (Settings > General and the Data page): whether a
 * load draws a file's own colors, sizes and shapes as style layers.
 */
export const IMPORT_FILE_STYLES = {
    key: "graphty.importFileStyles.v1",
    values: ["on", "off"],
    fallback: "on",
} as const;

/**
 * Opening web addresses a project names (the "Don't ask again" of the question before a project
 * opens one): "ask" asks each time, "allow" opens them without asking. Written on the element as
 * `session.network.setPolicy`, which never remembers it, so the app keeps the reader's word.
 */
export const OPEN_PROJECT_URLS = {
    key: "graphty.openProjectUrls.v1",
    values: ["ask", "allow"],
    fallback: "ask",
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
 * How the app draws a file's styles: at the spacing the file's own program lays it out at, so a file with no
 * positions shows its nodes as large beside the gaps as that program does (graphty-element's `lengths: "spacing"`).
 */
export const FILE_STYLE_OPTIONS = { lengths: "spacing" } as const;

/**
 * Keeps the import-styles preference.
 * @param on - whether loads draw a file's styles.
 */
export function writeFileStylesChoice(on: boolean): void {
    writePreference(IMPORT_FILE_STYLES, on ? "on" : "off");
}

/**
 * "Don't ask again for this project": the sites the reader let each project open without asking,
 * by graphty-element's `session.project.id`. Kept in this browser, never in the project file, so
 * a copy of the project on another machine asks again.
 */
export const PROJECT_HOSTS_KEY = "graphty.projectHosts.v1";

/**
 * Reads every project's remembered sites.
 * @returns project id to host names; empty when storage is blocked or holds something unknown.
 */
function readAllProjectHosts(): Record<string, string[]> {
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(PROJECT_HOSTS_KEY) ?? "{}");
        return typeof stored === "object" && stored !== null && !Array.isArray(stored)
            ? (stored as Record<string, string[]>)
            : {};
    } catch {
        return {};
    }
}

/**
 * The sites the reader let one project open without asking.
 * @param projectId - graphty-element's `session.project.id`.
 * @returns host names.
 */
export function readProjectHosts(projectId: string): readonly string[] {
    const hosts = readAllProjectHosts()[projectId];
    return Array.isArray(hosts) ? hosts.filter((host) => typeof host === "string") : [];
}

/**
 * Remembers that the reader let one project open a site without asking.
 * @param projectId - graphty-element's `session.project.id`.
 * @param host - the site's host name.
 */
export function rememberProjectHost(projectId: string, host: string): void {
    const all = readAllProjectHosts();
    all[projectId] = [...new Set([...readProjectHosts(projectId), host])];
    try {
        localStorage.setItem(PROJECT_HOSTS_KEY, JSON.stringify(all));
    } catch {
        // Storage blocked: the choice holds for this page view only.
    }
}
