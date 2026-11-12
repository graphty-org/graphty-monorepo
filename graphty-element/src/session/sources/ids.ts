/**
 * @file The names a network-source load writes where others read them: the project-file member,
 * its version, the reserved `_source.` node attributes and the event names. Nothing else in the
 * element spells them, so a rename is one edit here.
 *
 * Experimental: the record's member name and shape await the owner's final word, as do the
 * attribute names (design section 22, items 2 and 4).
 */

import { SOURCE_ENTITY_ATTR, SOURCE_STUB_ATTR } from "@graphty/graph-io";

/** The project-file member that holds the source load records. Experimental. */
export const SOURCE_RECORD_MEMBER = "graphty-sources";

/**
 * The version of the experimental load record shape graphty-element 3.x wrote, which
 * `data.loads()` still lists its records in. Experimental.
 * @deprecated A project file's `graphty-sources` member is written at
 *     {@link SOURCES_MEMBER_VERSION}; a version 1 member is read and upgraded.
 */
export const SOURCE_RECORD_VERSION = 1;

/**
 * The version of the `graphty-sources` member a project file is written with
 * (design/documents/sources.md). Experimental.
 * @since 3.30.0
 */
export const SOURCES_MEMBER_VERSION = 2;

/**
 * The reserved node attributes a source load and click-to-expand write: neutral facts, never
 * styling. Experimental.
 */
export const SOURCE_ATTR = Object.freeze({
    /** The keys of every load and expansion that brought the node. */
    loads: "_source.loads",
    /** `"none"`, `"partial"` or `"complete"`: how much of the node's neighborhood is loaded. */
    expansion: "_source.expansion",
    /** The node's degree at the source, when the source gives it for free; else null. */
    degree: "_source.degree",
    /** The degree minus the neighbors loaded; null when the degree is unknown. */
    hidden: "_source.hidden",
    /** The cursor a capped expansion of the node continues from. */
    next: "_source.next",
    /** True on a node known only by its id. */
    stub: SOURCE_STUB_ATTR,
    /** The entity a stub is. */
    entity: SOURCE_ENTITY_ATTR,
});

/** The session events of click-to-expand, and the DOM events `<graphty-element>` mirrors them as. */
export const SOURCE_EVENT_DOM_NAMES = Object.freeze({
    "source:expand-start": "graphty-source-expand-start",
    "source:expanded": "graphty-source-expanded",
    "source:expand-failed": "graphty-source-expand-failed",
} as const);

/** The prefix of every `_source.` fact: each is its own attribute, `_source.loads` and so on. */
const SOURCE_FACT_PREFIX = "_source.";

/**
 * Whether a record key is one of the `_source.` facts.
 * @param key - the key
 * @returns true for `_source.loads`, `_source.expansion` and the rest
 */
export function isSourceFactKey(key: string): boolean {
    return key.startsWith(SOURCE_FACT_PREFIX);
}

/**
 * A record's `_source.` facts, by their short names (`loads`, `expansion`, ...).
 * @param record - a node or edge record
 * @returns the facts, a fresh object
 */
export function sourceFactsOf(record: Readonly<Record<string, unknown>> | undefined): Record<string, unknown> {
    const facts: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record ?? {})) {
        if (isSourceFactKey(key)) {
            facts[key.slice(SOURCE_FACT_PREFIX.length)] = value;
        }
    }

    return facts;
}

/**
 * Facts by their short names, as the record keys they are written under.
 * @param facts - `{ loads, expansion, ... }`
 * @returns `{ "_source.loads": ..., "_source.expansion": ... }`
 */
export function sourceFactKeys(facts: Readonly<Record<string, unknown>>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(facts).map(([name, value]) => [`${SOURCE_FACT_PREFIX}${name}`, value]));
}

/**
 * The load and expansion keys that brought a record.
 * @param record - a node or edge record
 * @returns the keys, empty when none did
 */
export function sourceLoadsOf(record: Readonly<Record<string, unknown>> | undefined): readonly string[] {
    const { loads } = sourceFactsOf(record);
    return Array.isArray(loads) ? loads.filter((key): key is string => typeof key === "string") : [];
}
