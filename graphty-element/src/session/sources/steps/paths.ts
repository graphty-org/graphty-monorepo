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
