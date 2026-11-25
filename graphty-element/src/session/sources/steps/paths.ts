/**
 * @file The readable paths every element of a source-steps build answers (design
 * design/data/multiple-data-sources-design.md, section 3.9), kept apart from the build so the style
 * and filter readers can name them without loading it.
 */

/** The paths every built element answers, besides its own columns. */
export const READABLE_PATHS = [
    "graphty.type",
    "graphty.load",
    "_source.loads",
    "graphty.space",
    "graphty.key",
    "graphty.time",
    "graphty.weight",
] as const;

/**
 * The readable paths the session writes on each record under the experiment, so rules, styles and
 * filters read them as columns. `_source.loads` is left to the save, which writes it from the
 * provenance.
 */
export const RECORD_PATHS: readonly string[] = READABLE_PATHS.filter((path) => path !== "_source.loads");

/** The default name of each path a record carries, as `readableValues` lists it. */
export const RECORD_NAMES: Readonly<Record<string, string>> = {
    "graphty.type": "Type",
    "graphty.load": "Source",
    "graphty.space": "Id space",
    "graphty.key": "Key",
    "graphty.time": "Time",
    "graphty.weight": "Weight",
};

/**
 * The path a style or filter reads to tell what a shown draft does to an element (design 10, row
 * 12): `"merged"`, `"new"`, `"changed"`, `"removed"` or `"unchanged"`, and nothing while no draft
 * is shown. Answered by the session from the draft, never written on a record or saved.
 * @experimental source-steps
 */
export const DRAFT_PATH = "graphty.draft";

/** Every value {@link DRAFT_PATH} reads, in the order a key lists them. */
export const DRAFT_MARKS = ["merged", "new", "changed", "removed", "unchanged"] as const;
