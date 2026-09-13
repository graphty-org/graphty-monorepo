/**
 * The sample dataset library the Welcome (Empty) state and the Data panel both draw.
 *
 * Spec 7.1 item 2 asks for "a manifest (name, file, counts, size, description, tags,
 * suggested first card, credit) seeded from the test corpus", and it asks for the
 * counts to be pre-computed so a row can draw "20 nodes, 29 edges" before anything is
 * loaded. That is all this module is: data plus the one size-string formatter. It
 * performs no loading. The caller switches on `source.kind` and drives the shell's
 * existing load paths, so a sample arrives through the ordinary load path rather than
 * around it, and the counts the graph reports come from the graph's own data events.
 *
 * Only three of the six rows Welcome.dc.html:340-430 draws ship here, and the omission
 * is deliberate rather than unfinished work:
 *
 * - Fraud ring (synthetic) and Ovarian cancer DE genes are marked INVENTED in
 *   design/ui/mockups/system/FIXTURES.md -- no such file exists in the repo -- and
 *   FIXTURES.md section 5 residual 1 leaves the fifth and sixth library slots
 *   unsettled. Patent citations has no file either.
 * - Shipping a row for any of them would mean fabricating a dataset, so the row is
 *   absent instead. Dropping the fraud ring also drops the only Timed sample and the
 *   only Directed one; dropping Patent citations drops the only Large badge, which is
 *   why `large` is false and `bytes` unset on every record here.
 *
 * Every visible string is copied character for character from Welcome.dc.html:340-430,
 * which is the current board; the five underlay boards in that file are stale. Two
 * strings depart from the board, each for a cited reason:
 *
 * - Karate Club's credit is "Zachary 1977" with no comma, per REGISTER-1.5.md 11.3.
 * - College football's blurb drops its "Try coloring by conference." hint, because
 *   spec 5643 says "A sample with no suggested card renders its blurb as plain text"
 *   and colouring by a categorical attribute is not built. A link that promises an
 *   unbuilt action is the defect AiPanel.dc.html:833 deleted from a reading.
 *
 * Spec: design/ui/app-shell-progressive-disclosure-design.md section 7.1 (lines
 * 5621-5665).
 */

import { CAT_SOCIAL_NETWORK, CAT_SOCIAL_NETWORK_NAME } from "./sampleGraphs";

/** A tag pill on a sample row. The four the spec names, and no others. @public */
export type SampleTag = "Directed" | "Timed" | "Types" | "Weighted";

/** The capability a sample's closing imperative runs. Only one ships this slice. @public */
export type SampleSuggestedCapability = "community-detection";

/** Pre-computed counts, so a row draws its size before anything is loaded. @public */
export interface SampleSizeFacts {
    /** Node count, exact. */
    readonly nodes: number;
    /** Edge count, exact. */
    readonly edges: number;
    /** File size in bytes. Present ONLY where the size is the decision (the Large badge row). */
    readonly bytes?: number;
}

/** How a sample reaches the graph. One switch for the caller's loader. @public */
export type SampleSource =
    | {
          readonly kind: "inline";
          /** The graphty-element DataSource type, e.g. "json". */
          readonly format: string;
          /** The object the caller JSON.stringifies into `handle.loadData(format, {data})`. */
          readonly payload: unknown;
      }
    | {
          readonly kind: "url";
          /** The graphty-element DataSource type, e.g. "gml". */
          readonly format: string;
          /** Site-root-relative, e.g. "/samples/karate.gml". */
          readonly url: string;
      };

/** One row of the sample library (spec 7.1 item 2). @public */
export interface SampleRecord {
    /** Stable id, also the DataSample id. */
    readonly id: string;
    /** The dataset's own name, e.g. "Karate Club". */
    readonly name: string;
    /** The name the load is recorded under, e.g. "karate.gml". */
    readonly fileName: string;
    /** Where the data comes from. */
    readonly source: SampleSource;
    /** Pre-computed counts. */
    readonly size: SampleSizeFacts;
    /** Tag pills, in the order they are drawn. */
    readonly tags: readonly SampleTag[];
    /** Whether the row carries the Large badge. False on every shipped row. */
    readonly large: boolean;
    /** The human credit, e.g. "Zachary 1977". */
    readonly credit: string;
    /** Where the credit link points. */
    readonly creditHref: string;
    /** The plain half of the blurb, ending in a space when `hint` is present. */
    readonly blurb: string;
    /** The closing imperative, drawn as a link. Absent when there is no suggested card. */
    readonly hint?: string;
    /** What `hint` runs. Absent exactly when `hint` is absent. */
    readonly suggestedCapability?: SampleSuggestedCapability;
}

/**
 * The sample library, in the order Welcome draws it.
 *
 * Karate Club leads because spec 5641 names it first; the cat social network follows
 * because it is the one row with a suggested card, so the "cold start to a coloured
 * graph in one interaction" path spec 7.1 item 2 describes is reachable from the
 * second row down. College football closes the list, as on the board.
 */
export const SAMPLE_MANIFEST: readonly SampleRecord[] = [
    {
        id: "karate",
        name: "Karate Club",
        fileName: "karate.gml",
        source: {
            kind: "url",
            format: "gml",
            url: "/samples/karate.gml",
        },
        size: {
            nodes: 34,
            edges: 78,
        },
        tags: [],
        large: false,
        credit: "Zachary 1977",
        creditHref: "http://www-personal.umich.edu/~mejn/netdata/",
        blurb: "A club that split in two. The classic test for finding groups.",
    },
    {
        id: "cat-social-network",
        name: "Cat social network",
        fileName: CAT_SOCIAL_NETWORK_NAME,
        source: {
            kind: "inline",
            format: "json",
            payload: CAT_SOCIAL_NETWORK,
        },
        size: {
            nodes: 20,
            edges: 29,
        },
        tags: ["Weighted"],
        large: false,
        credit: "graphty samples",
        creditHref: "https://graphty.app/",
        // The trailing space is load-bearing: the hint is drawn as a nested span inside
        // the same text run, so the blurb supplies the separator.
        blurb: "Small enough to see every relationship. ",
        hint: "Try finding the groups.",
        suggestedCapability: "community-detection",
    },
    {
        id: "college-football",
        name: "College football",
        fileName: "football.gml",
        source: {
            kind: "url",
            format: "gml",
            url: "/samples/football.gml",
        },
        size: {
            nodes: 115,
            edges: 613,
        },
        tags: ["Types"],
        large: false,
        credit: "Girvan and Newman 2002",
        creditHref: "http://www-personal.umich.edu/~mejn/netdata/",
        // No hint: see the file comment. Colouring by a categorical attribute is not
        // built, so the board's "Try coloring by conference." would be a dead promise.
        blurb: "Teams that played each other in one season, tagged by conference.",
    },
];

/** Bytes per megabyte, decimal -- the unit a file manager shows, not the binary one. */
const BYTES_PER_MEGABYTE = 1_000_000;

/**
 * The ONE size string both the canvas row and the panel row use (spec 5648).
 * "34 nodes, 78 edges", or "65,000 nodes, 210,000 edges, 14 MB" when `bytes` is set.
 *
 * The MB clause is appended only where a record carries `bytes`, which DEF-3 and spec
 * 5.3 Data restrict to the row where the size is the decision -- the Large badge row.
 * No shipped record sets it. Grouping goes through `toLocaleString("en-US")` so the
 * thousands separator is an ASCII comma on every machine, whatever the host locale.
 * @param size - the record's pre-computed counts.
 * @returns the one size string both surfaces draw.
 */
export function sampleSizeString(size: SampleSizeFacts): string {
    const parts = [
        `${size.nodes.toLocaleString("en-US")} nodes`,
        `${size.edges.toLocaleString("en-US")} edges`,
    ];

    if (size.bytes !== undefined) {
        const megabytes = Math.round(size.bytes / BYTES_PER_MEGABYTE);

        parts.push(`${megabytes.toLocaleString("en-US")} MB`);
    }

    return parts.join(", ");
}

/**
 * Looks a record up by id.
 * @param id - the record's stable id, as stored on the DataSample row.
 * @returns the record, or undefined when no sample carries that id.
 */
export function findSample(id: string): SampleRecord | undefined {
    return SAMPLE_MANIFEST.find((record) => record.id === id);
}

/**
 * The frozen section hint (SAV-2). Never rewritten.
 *
 * SAV-2 retires "Load" from the saved-thing vocabulary only; this hint sits on data,
 * and the word is spent on data, which is the whole reason a style or a recipe may not
 * borrow it. Do not rewrite it to "Click one to apply it".
 */
export const SAMPLE_SECTION_HINT = "Click one to load it";

/** The frozen section name on both surfaces. */
export const SAMPLE_SECTION_NAME = "Sample datasets";
