/**
 * The inspector's own named numbers, section ids and frozen strings.
 *
 * Authority split (design/ui/mockups/system/CONTRAST-DIVERGENCE.md section 5): this
 * module owns WHERE a thing goes, HOW MANY of it there are and WHAT it says. It owns
 * no colour -- colour comes from `PANEL_INK`, the Mantine theme and CSS variables.
 *
 * Every geometry member below is derived from `PANEL_GRID` or `COMPACT_SIZING` rather
 * than written down, so the panel grid stays the single source of the 280 px column.
 * The documented totals (52, 195) are asserted in
 * `__tests__/Inspector.test.tsx` and appear nowhere else.
 *
 * Citations name build spec 03 (tmp/shell-spec/03-panel-and-inspector.md) and build
 * spec 04 (tmp/shell-spec/04-system-and-platform.md).
 */

import { COMPACT_SIZING, PANEL_GRID } from "@graphty/compact-mantine";

import { KEEP_OPEN_LABEL } from "../constants";
import type { SelectionKind } from "../types";

/* -------------------------------------------------------------------------- */
/* Geometry (build spec 03 sections 3.1 and 3.2)                               */
/* -------------------------------------------------------------------------- */

/**
 * The inspector's 1 px `border-left`, which is what makes its content band one pixel
 * narrower than an activity panel's. Spec 03 section 3.1 (ART-MAIN:1031).
 */
export const INSPECTOR_BORDER_WIDTH = 1;

/**
 * The gap between two controls of the header's trailing cluster, and between the
 * kind and the identity of its leading cluster. Spec 03 section 3.2.
 */
export const INSPECTOR_CLUSTER_GAP = COMPACT_SIZING.SECTION_GAP;

/**
 * The header's trailing cluster: three 24 px hit boxes and two gaps, "3 x 24 + 2 x 4 =
 * 80" -- the same arithmetic INSPECTOR-TITLE-1.9 section 4 already tabulates for its
 * three-icon state.
 *
 * The cluster is measured at the icons that are ALWAYS drawn -- `Copy reading`,
 * `Keep open` and the collapse control -- because the band may not move when a
 * conditional icon appears. `Pin as A` is the one conditional: it is drawn for a node,
 * edge, selection or result, and where it is drawn the cluster is 108 and the name band
 * falls to 139 (see {@link INSPECTOR_HEADER_NAME_BAND}).
 *
 * It was two boxes and 52 px until 2026-09-12, when the product owner asked for the
 * latch and the row took a fourth slot; the override and its measured cost are recorded
 * in INSPECTOR-TITLE-1.9.
 */
export const INSPECTOR_HEADER_CLUSTER_WIDTH = PANEL_GRID.TRAIL * 3 + INSPECTOR_CLUSTER_GAP * 2;

/**
 * The header's name band -- what the kind and its identity share. Spec 03 section 3.2
 * wrote this as 195 against a 52 px cluster; with the latch always drawn the cluster is
 * 80 and the band is 167: the 280 column, less its 1 px left border, less the 16 / 8
 * padding, less the 8 px gap to the cluster, less the cluster.
 *
 * This is the maximum, not a reservation. Where `Pin as A` is also drawn the cluster
 * grows by 28 and the band yields to it, down to 139 -- so a name longer than 139 px
 * ellipsizes into its own title in that state, which is the cost INSPECTOR-TITLE-1.9
 * measured and the product owner accepted on 2026-09-12.
 */
export const INSPECTOR_HEADER_NAME_BAND =
    PANEL_GRID.WIDTH -
    INSPECTOR_BORDER_WIDTH -
    PANEL_GRID.PAD_LEFT -
    PANEL_GRID.PAD_RIGHT -
    PANEL_GRID.TRAIL_GAP -
    INSPECTOR_HEADER_CLUSTER_WIDTH;

/**
 * The kind's type size: the panel's 12 px body face. The compact scale steps 11 to 13,
 * so this role names its own size exactly as `ProseBlock` does. Spec 04 section 3.2.
 */
export const INSPECTOR_KIND_FONT_SIZE = 12;

/**
 * The kind's line height. Spec 04 section 3.2 ("panel title", 12 px / 500 / 1.2).
 */
export const INSPECTOR_KIND_LINE_HEIGHT = 1.2;

/**
 * The width of the boundary the desktop drag grabs. Narrower than a control, because
 * it is a seam rather than a target, and it carries a keyboard route of its own.
 */
export const INSPECTOR_RESIZE_HANDLE_WIDTH = PANEL_GRID.TRIPLE_GAP;

/**
 * How much one arrow press moves the boundary, so the drag has a keyboard twin.
 */
export const INSPECTOR_RESIZE_KEYBOARD_STEP = PANEL_GRID.PAD_RIGHT;

/**
 * The gap between the words of a tooltip and its key chip. Build spec 04 section 10.3:
 * a binding is the last element of the tooltip sentence, after a 6 px gap.
 */
export const KEY_CHIP_GAP = 6;

/**
 * A colour swatch's corner radius. Build spec 04 section 3.3 ("colour swatch 14px,
 * radius 2, 1px border") -- the one radius the compact radius scale does not publish,
 * because it sits below its `xs` step.
 */
export const SWATCH_RADIUS = 2;

/* -------------------------------------------------------------------------- */
/* The `Coming` tag (design 5.8; build spec 04 sections 4.5 and 8.2)           */
/* -------------------------------------------------------------------------- */

/*
 * The pill's numbers and its word belong to the whole shell, not to the inspector: the
 * activity panel and the Views menu draw the same tag, so the values live in
 * `shell/ComingTag.tsx` beside the one drawing that uses them. Only the two this
 * region's own callers actually reach through this module are re-exported here -- the
 * height and the radius. The other four (font size, font weight, horizontal padding,
 * and the `COMING_LABEL` word, which was re-exported as `COMING_TAG_LABEL`) had no
 * caller on this path at all, so they are imported from `shell/ComingTag.tsx` directly
 * rather than duplicated onto this surface.
 */
export { COMING_TAG_HEIGHT, COMING_TAG_RADIUS } from "../ComingTag";

/**
 * The one info-circle sentence a dimmed group of unshipped rows carries, verbatim from
 * design 5.8.
 */
export const UNSHIPPED_GROUP_INFO = "Dimmed rows are not built yet.";

/**
 * How many contiguous unshipped rows it takes before the tag rises to the group header
 * and the rows are dimmed and disabled instead of tagged one by one. Design 5.8.
 */
export const UNSHIPPED_GROUP_THRESHOLD = 3;

/**
 * How many rows the actions block draws before the rest go into its `More` menu.
 *
 * DECISIONS-1.8 D4: "The inspector action block caps at four rows in every selection
 * state, with the remainder in the block's More menu, each verb keeping its full
 * text." The cap is what keeps the block a footer rather than a second panel -- the
 * block is pinned OUTSIDE the scroll region (spec 03 section 5), so every row it
 * draws is a row the inspector's own content does not get, and an uncapped list of
 * sixteen verbs took 418 px of a 900 px column and squeezed neighbours and computed
 * metrics into a sliver.
 *
 * A row carrying a `cost` does not count against the cap and is never moved into
 * `More`: D4 exempts "the split button's cost estimate and its 'All 12,412 may slow
 * the canvas down. Expand all anyway', because floor item 4 binds the estimate to
 * the control that spends it", and a departure line read from a menu is an estimate
 * separated from the control it belongs to.
 */
export const INSPECTOR_ACTION_ROW_CAP = 4;

/* -------------------------------------------------------------------------- */
/* Caps and thresholds the spec fixes (build spec 03 sections 4 and 5)         */
/* -------------------------------------------------------------------------- */

/** Most connected lists the top five by degree. Spec 03 section 4 item 3. */
export const MOST_CONNECTED_TOP_N = 5;

/**
 * The download menu's first row is `Export top 20 (CSV)`. Spec 03 section 4 item 3. Exported
 * with the row label it builds, so the number the menu prints and the number a download writes
 * cannot drift apart.
 * @public
 */
export const MOST_CONNECTED_EXPORT_TOP_N = 20;

/** Each schema table caps at five rows, then one "N more" row. Spec 03 section 4 item 4. */
export const SCHEMA_TYPE_ROW_CAP = 5;

/** Attributes shows the first 20, then "N more". Spec 03 section 4 item 5. */
export const ATTRIBUTE_ROW_CAP = 20;

/** A node's Attributes grid gains a filter box above ten rows. Spec 03 section 5 item 2. */
export const ATTRIBUTE_FILTER_THRESHOLD = 10;

/** A neighbour breakdown caps at the top five edge types, then "N more types". Spec 03 section 5 item 5. */
export const NEIGHBOR_TYPE_CAP = 5;

/** The neighbour list draws 20 rows before it hands off to the data table. Spec 03 section 5 item 5. */
export const NEIGHBOR_ROW_CAP = 20;

/**
 * Above this many neighbours `Expand neighbors` stops offering all of them and reads
 * "Expand top 50 of N by weight (Choose which)". Spec 03 section 5 item 6.
 */
export const EXPAND_NEIGHBORS_CHOICE_THRESHOLD = 500;

/**
 * How many neighbours the above-threshold form of `Expand neighbors` takes.
 * Spec 03 section 5 item 6 ("Expand top 50 of 12,412 by weight").
 */
export const EXPAND_NEIGHBORS_TOP_N = 50;

/**
 * The widest rung of 6.11's pop-out ladder, which the Schema detail matrix takes
 * because a two-dimensional table has no honest form in the 256 px band.
 * Build spec 04 section 9.3.
 */
export const INSPECTOR_POPOUT_WIDE_WIDTH = 480;

/* -------------------------------------------------------------------------- */
/* Section ids (build spec PLAN section 1.2: `<region>.<section>`)             */
/* -------------------------------------------------------------------------- */

/**
 * Every tier 2 section id the inspector owns. They are shell-wide unique strings,
 * because the store's section map is one of the four things the shell persists (6.5).
 */
export const INSPECTOR_SECTION_IDS = {
    /** Graph summary, the Counts section. Collapsed by default. */
    counts: "inspector.counts",
    /** Graph summary, Most connected (Degree centrality). Open by default. */
    mostConnected: "inspector.mostConnected",
    /** Graph summary, Schema. Open by default, and it expands in place. */
    schema: "inspector.schema",
    /** Graph summary, Attributes. Collapsed by default. */
    attributes: "inspector.attributes",
    /** One node, the Attributes grid. */
    nodeAttributes: "inspector.node.attributes",
    /** One node, Computed metrics. */
    nodeMetrics: "inspector.node.metrics",
    /** One node, Notes. */
    nodeNotes: "inspector.node.notes",
    /** One node, Neighbors. */
    nodeNeighbors: "inspector.node.neighbors",
    /** One edge, Attributes. */
    edgeAttributes: "inspector.edge.attributes",
    /** One edge, Notes. */
    edgeNotes: "inspector.edge.notes",
    /** Multiple, Selection statistics. */
    multiStatistics: "inspector.multiple.statistics",
    /** Multiple, Notes on the set. */
    multiNotes: "inspector.multiple.notes",
    /** Style layer, Source -- drawn only when the layer came from a run. */
    layerSource: "inspector.layer.source",
    /** Style layer, the encoding channels. */
    layerEncoding: "inspector.layer.encoding",
    /** Algorithm result, the body for its result shape. */
    resultBody: "inspector.result.body",
    /** Pattern match, the ranked match list. */
    patternMatches: "inspector.pattern.matches",
    /** Cleaning step, before and after. */
    cleaningBeforeAfter: "inspector.cleaning.beforeAfter",
} as const;

/* -------------------------------------------------------------------------- */
/* Frozen strings (build spec 03 sections 3.2, 4 and 5)                        */
/* -------------------------------------------------------------------------- */

/**
 * The header's trailing cluster, in this order: `Copy reading`, `Pin as A` when the
 * selection takes it, `Keep open`, and the collapse control. Spec 03 section 3.2 and
 * INSPECTOR-TITLE-1.9 section 4 fixed the first, second and fourth of those and refused
 * any fourth slot; the product owner asked for the latch on 2026-09-12 and the override
 * is recorded in INSPECTOR-TITLE-1.9.
 */
export const INSPECTOR_HEADER_LABELS = {
    /** Copies the reading, the caveats line, the Counts rows and the legend's channel lines. */
    copyReading: "Copy reading",
    /** Freezes a copy of the current content as card A above the live content. */
    pinAsA: "Pin as A",
    /**
     * Latches the column open (6.12). It holds the SURFACE, where `pinAsA` freezes the
     * CONTENT -- two objects, two words, two drawings, in one row.
     */
    keepOpen: KEEP_OPEN_LABEL,
    /** Collapses the column. The chip comes from the one dispatcher, never from here. */
    toggleInspector: "Toggle inspector",
    /** Releases the pinned card. Spec 03 section 3.3. */
    unpin: "Unpin",
} as const;

/**
 * The Graph summary surface's frozen strings. Spec 03 section 4 and ART-MAIN:1042.
 */
export const GRAPH_SUMMARY_LABELS = {
    /** The header kind string. */
    kind: "Graph summary",
    /** Tier 2, collapsed by default. */
    counts: "Counts",
    /** The 6.3 pair, rendered on first mention in this surface. */
    mostConnected: "Most connected (Degree centrality)",
    /** Rule 9's unit word, which rides on the column caption and never on a row. */
    linksUnit: "links",
    /** Tier 1, expands in place. */
    schema: "Schema",
    /** Tier 2, collapsed. */
    attributes: "Attributes",
    /** The two-column captions of the schema tables. */
    nodeTypeColumn: "Node type",
    /** The node table's count column. */
    nodeCountColumn: "Nodes",
    /** The edge table's name column. */
    edgeTypeColumn: "Edge type",
    /** The edge table's count column. */
    edgeCountColumn: "Edges",
    /** The schema section's RT-7 verb row, first verb. */
    filterToType: "Filter to type",
    /** The schema section's RT-7 verb row, second verb. */
    selectAllOfType: "Select all of type",
    /** The schema header's resident verb. It carries a format, so 6.8 keeps its words. */
    exportSchemaJson: "Export schema JSON",
    /** The schema header's gear, which opens the 480 pop-out to the LEFT. */
    schemaDetail: "Schema detail. Per-type completeness, edges by type pair",
    /** What the closed schema header reads until SchemaExtractor is ready. */
    schemaMeasuring: "measuring...",
    /** Most connected's header verb; its binding rides in the tooltip. */
    showInTable: "Show in table",
    /** Most connected's download menu opener. */
    exportMenu: "Export",
    /** The download menu's first row. */
    exportTopCsv: `Export top ${MOST_CONNECTED_EXPORT_TOP_N} (CSV)`,
    /** The download menu's second row. */
    exportRankedCsv: "Export ranked list (CSV)",
    /** The graph-level annotation at zero. Spec 03 section 4 item 6. */
    addCaseNote: "Add a case note",
    /** The one link row that replaces every other pointer into that panel. */
    moreInAnalyze: "More in Analyze",
    /** What a row reads while its background pass is still running. */
    computing: "Computing...",
} as const;

/**
 * The Counts section's row names, in the order spec 03 section 4 item 2 fixes.
 * The 6.3 pair is spelled out on first mention, which for these rows is here.
 */
export const COUNTS_ROW_LABELS = {
    /** Node total. */
    nodes: "Nodes",
    /** Edge total. */
    edges: "Edges",
    /** One row: "Directed (from file), weighted (amount), timed (opened)". */
    type: "Type",
    /** Plain form on screen, scientific notation in the row's own title. */
    density: "How tightly linked (density)",
    /** Mean degree. */
    averageDegree: "Average links per node (mean degree)",
    /** Components. */
    connectedParts: "Connected parts (components)",
    /** Drawn only when non-zero. */
    selfLoops: "Self-loops",
    /** Drawn only when non-zero. */
    parallelEdges: "Parallel edges",
} as const;

/**
 * The surface KIND string the header draws for each selection, at 12 px / weight 500.
 * The kind never truncates, which is why every one of these is short.
 */
export const INSPECTOR_KIND_LABELS: Readonly<Record<SelectionKind, string>> = {
    "algorithm-result": "Result",
    "cleaning-step": "Cleaning step",
    edge: "Edge",
    multiple: "Selection",
    node: "Node",
    none: GRAPH_SUMMARY_LABELS.kind,
    "pattern-match": "Pattern match",
    "style-layer": "Style layer",
};

/**
 * Whether `Pin as A` is drawn for a selection kind. Spec 03 section 3.2: the pin
 * appears ONLY when a node, edge, selection or result is shown -- never for Nothing
 * selected, and not for the three kinds that are neither a selection nor a result.
 * @param kind - what the inspector is showing.
 * @returns true when the header's trailing cluster carries the pin.
 */
export function kindTakesPin(kind: SelectionKind): boolean {
    return kind === "node" || kind === "edge" || kind === "multiple" || kind === "algorithm-result";
}
