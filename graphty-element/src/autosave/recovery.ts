/**
 * The facts recovery compares: what a load came from (its source digest), what the page set (its
 * page-config digests), and how a stored meta reads as a public `AutosaveEntry`.
 * @module autosave
 */

import { canonicalize, stableDigest } from "../session/runs/runId";
import type { AutosaveEntry, AutosaveEntryMeta } from "./types";

/**
 * Where a page-supplied load came from. Each kind holds only what identifies the data: the
 * declared attributes' strings, the rows the page assigned, a URL, a file's name, size and
 * modification time, or a pasted document's text.
 */
export type PageSource =
    | { readonly kind: "attributes"; readonly values: Readonly<Record<string, string>> }
    | { readonly kind: "rows"; readonly nodes?: readonly unknown[]; readonly edges?: readonly unknown[] }
    | { readonly kind: "url"; readonly url: string }
    | { readonly kind: "file"; readonly name: string; readonly size: number; readonly lastModified: number }
    | { readonly kind: "text"; readonly text: string };

/**
 * A digest of any value: equal values give equal digests, whatever their key order.
 * @param value - The value.
 * @returns The digest.
 */
function digestOf(value: unknown): string {
    let text: string;
    try {
        text = canonicalize(value);
    } catch {
        // A value with no canonical form (a class instance): its JSON, key order and all.
        text = JSON.stringify(value) ?? "undefined";
    }

    return stableDigest(text);
}

/**
 * The digest of a page-supplied load: equal for the same data on every reload.
 * @param source - What the load came from.
 * @returns The digest.
 */
export function sourceDigest(source: PageSource): string {
    return digestOf(source);
}

/**
 * One digest per setting the page made.
 * @param config - The settings, by name.
 * @returns Their digests, by name.
 */
export function pageConfigDigests(config: Readonly<Record<string, unknown>>): Record<string, string> {
    return Object.fromEntries(Object.entries(config).map(([name, value]) => [name, digestOf(value)]));
}

/**
 * The settings whose value differs from what an entry was written with; a setting the entry
 * never saw counts as changed.
 * @param now - The page's digests now.
 * @param then - The entry's `pageConfig`.
 * @returns The names, sorted.
 */
export function changedSettings(now: Readonly<Record<string, string>>, then: unknown): string[] {
    const before = (typeof then === "object" && then !== null ? then : {}) as Record<string, unknown>;
    return Object.keys(now)
        .filter((name) => before[name] !== now[name])
        .sort();
}

/**
 * A meta field that holds text.
 * @param value - The field.
 * @returns The text, or "" for anything else.
 */
export function textOf(value: unknown): string {
    return typeof value === "string" ? value : "";
}

/**
 * A stored meta as the public description of an entry.
 * @param meta - The meta.
 * @param live - Whether a tab holds it now.
 * @returns The entry.
 */
export function entryOfMeta(meta: AutosaveEntryMeta, live: boolean): AutosaveEntry {
    const entry: AutosaveEntry = {
        id: meta.id,
        key: meta.key,
        name: typeof meta.name === "string" ? meta.name : "",
        createdAt: textOf(meta.createdAt),
        savedAt: textOf(meta.savedAt),
        revision: Number(meta.revision ?? 0),
        nodes: Number(meta.nodes ?? 0),
        edges: Number(meta.edges ?? 0),
        dirty: meta.dirty === true,
        live,
    };
    return meta.ended === "replaced" ? { ...entry, ended: "replaced" } : entry;
}

/**
 * Whether code that writes `current` can read an entry of this format: an integer from 0 to
 * `current`. A malformed version counts as unreadable.
 * @param formatVersion - The entry's `formatVersion`.
 * @param current - The format this code writes.
 * @returns True when it can.
 */
export function canRead(formatVersion: unknown, current: number): boolean {
    return Number.isInteger(formatVersion) && (formatVersion as number) >= 0 && (formatVersion as number) <= current;
}

/**
 * The navigation facts of this page load, where the browser reports them.
 * @returns `wasDiscarded` and the navigation's type, or nulls.
 */
export function navigationFacts(): { wasDiscarded: boolean | null; navigationType: string | null } {
    const doc = globalThis.document as (Document & { wasDiscarded?: boolean }) | undefined;
    const wasDiscarded = typeof doc?.wasDiscarded === "boolean" ? doc.wasDiscarded : null;
    let navigationType: string | null = null;
    try {
        const [entry] = globalThis.performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
        navigationType = typeof entry?.type === "string" ? entry.type : null;
    } catch {
        // No navigation timing here (Node): unknown.
    }

    return { wasDiscarded, navigationType };
}
