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

/** The version of that member's shape; a newer one is refused, an older one upgraded. Experimental. */
export const SOURCE_RECORD_VERSION = 1;

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
