/**
 * The shell's composition root: the one place the seven regions meet.
 *
 * Frame (build spec 01 section 1, as amended -- see below):
 *
 * ```
 * +------------------------------------------------------+
 * |  top bar (40), full shell width                      |   <- crosses above the rail
 * +----+-------------------------------------------------+
 * |rail|  panel (280) | canvas | inspector (280)         |   <- main row
 * |(48)|                                                 |
 * +----+-------------------------------------------------+
 * |  status bar (24), full shell width                   |   <- crosses under the rail
 * +------------------------------------------------------+
 * ```
 *
 * The two frame rules that decide the nesting: BOTH bars are full shell width, the top
 * bar above the main row and the status bar below it, so the rail spans neither. The
 * outer grid is therefore three rows -- top bar, main row, status bar -- and the main
 * row holds the rail beside the body row. The main row is the `position: relative` box
 * the Help menu hangs off (left 56, bottom 4) and it does not clip its overflow; the
 * body row is the positioned ancestor the narrow overlays, the Settings overlay and the
 * shortcuts surface land on.
 *
 * Spec 01 section 1 and spec 02 section 1.1 put the top bar to the RIGHT of the rail,
 * and 59 of the 62 artboards still draw that frame. The product owner reversed it on
 * 2026-09-12 ("make the top bar go all the way across the top, not stop at the mode
 * selector on the left"); the amendment is recorded at design 5.1 and the boards were
 * deliberately left alone in that pass. Nothing measured changed with the move: the body
 * row, the canvas rect and the toolbar's centring are identical, because the rail still
 * occupies a 48 px column to the left of panel, canvas and inspector.
 *
 * The frame Box is a CSS grid with three EXPLICIT rows, so the two children that follow
 * the status bar -- the command palette and the feedback dialog -- must keep rendering
 * through portals, as they do. Keep the top bar first and the status bar third.
 *
 * What this file owns, beyond layout:
 *
 * 1. `ShellProvider` and exactly one `PopoutManager`, mounted above every region --
 *    compact-mantine's `Popout.Panel` throws without a manager, and 6.11 allows one
 *    open pop-out per region, not per mount.
 * 2. The single key dispatcher. No region installs a listener; every binding's handler
 *    and all five Escape rungs are passed from here (PLAN ground rule 5).
 * 3. The routing the store deliberately refuses: Settings opens a full-panel overlay
 *    and Help opens the rail-anchored menu, so neither becomes the active activity and
 *    the rail's active marker stays on the open panel.
 * 4. The application state the regions read -- the graph host and its layers, the
 *    loaded dataset, the selection, the canvas docks and overlay visibility, the one
 *    history store -- and the real graph calls behind the toolbar's verbs.
 *
 * Where the application has no fact yet, the slot is NOT rendered rather than filled
 * with a plausible-looking number: an absent status bar slot, an absent overlay config
 * and an empty history store are each honest, and a fabricated zoom percentage or a
 * fabricated validation count would not be.
 *
 * What that leaves out, on purpose, so the gaps are not read as wiring slips:
 *
 * - **The status bar's zoom slot.** graphty-element emits `camera-state-changed` only
 *   for the camera moves the shell itself asks for, never for a wheel or a drag, and it
 *   publishes no fit extent to measure 100% against. A percentage fed from that would
 *   be stale and wrong the moment anyone scrolled, which is worse than an absent slot:
 *   the bar would be asserting a number nobody can trust. The slot arrives when
 *   graphty-element publishes a camera-change event and its fit extent.
 * - **Escape rungs 1 and 4.** Rung 1 cancels an in-progress node drag or marquee, and
 *   graphty-element publishes no drag-cancel call. Rung 4 pauses time slider playback,
 *   and no time slider can be drawn until a Time role can be assigned. Both are
 *   recorded on the `escapeLadder` call below.
 * - **The filter status strip.** Nothing holds an active filter yet, so there is nothing
 *   to draw and no control claims otherwise. The Insights strip is no longer in this
 *   group -- the 7.3 rule table computes its cards and the strip is drawn from them.
 * - **The minimap.** It has nothing to project until graphty-element publishes node
 *   positions and camera changes (#293), and drawn before then it was an empty dark box.
 *   Its Views row carries the Coming tag and its M binding is unshipped, so no control
 *   claims it is shown.
 * - **The legend's channels.** With nothing encoded the legend renders nothing by
 *   design (spec 01 section 9), so an empty channel list is the correct state, not a
 *   missing one.
 * - **A reproducible scatter on a large graph.** `recommendLayout` picks the Scattered
 *   arrangement above the large-graph threshold and says of it that the result is "the same
 *   every time", but the recommendation is a descriptor with no configuration and the random
 *   engine's own seed defaults to null, so each load scatters differently. The shell applies
 *   the arrangement the element named and adds no seed of its own: a layout option written
 *   down here would be the copy of the element's catalogue this file has just finished
 *   deleting. The promise holds the day the recommendation carries the configuration it
 *   describes.
 */

import {
    type DataTableColumn,
    PANEL_INK,
    PopoutManager,
    PopoutRegion,
    usePopoutManager,
} from "@graphty/compact-mantine";
import type { ScreenshotOptions } from "@graphty/graphty-element";
import type { MetricAvailability } from "@graphty/graphty-element/catalog";
import {
    type AccelerationPolicy,
    type AccelerationStatus,
    type Channel,
    type GraphStatistics,
    isGraphtyError,
    type LayerSpec,
    recommendLayout,
    type RunId,
    type SelectionDelta,
} from "@graphty/graphty-element/session";
import { Box, Button, Group, Modal, Text } from "@mantine/core";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getLayoutMetadata, LAYOUT_METADATA } from "../../data/layoutMetadata";
import { CAT_SOCIAL_NETWORK, CAT_SOCIAL_NETWORK_NAME } from "../../data/sampleGraphs";
import { SAMPLE_MANIFEST, type SampleRecord, sampleSizeString } from "../../data/sampleManifest";
import { useAiKeyStorage } from "../../hooks/useAiKeyStorage";
import { useAiManager } from "../../hooks/useAiManager";
import type { ProviderType } from "../../types/ai";
import type { ChatMessage } from "../ai/AiMessageBubble";
import { FeedbackModal } from "../FeedbackModal";
import type { GraphtyHandle, SelectionChangedDetail, StylesChangedDetail } from "../Graphty";
import type { LayerItem } from "../layout/LeftSidebar";
import type { LoadDataRequest } from "../LoadDataModal";
import { asElementGraph, elementSession } from "./analysis/elementBridge";
import {
    edgeEndpoints,
    EMPTY_GRAPH_STATISTICS,
    readGraphStatistics,
    smallPartsAreSingleNodes,
} from "./analysis/graphShape";
import { metricCost, type MetricCostEstimate, metricCosts, readMetricAvailability } from "./analysis/metricCost";
import {
    metricDistribution,
    NODE_METRIC_DEFINITIONS,
    NODE_METRIC_IDS,
    type NodeMetricId,
    runNodeMetric,
} from "./analysis/nodeMetrics";
import {
    COMMUNITY_METHOD_NAME,
    type DegreeResults,
    NO_DEGREE_DISTRIBUTION,
    runCommunityDetection,
    runDegreePass,
} from "./analysis/runs";
import { readPersistedCanvasLayout, resolveCanvasLayout, writePersistedCanvasLayout } from "./canvas/canvasMemory";
import { CanvasRegion, type CanvasRegionOwnProps, useCanvasBottomStack } from "./canvas/CanvasRegion";
import type { DataDrawerTab } from "./canvas/DataTableDrawer";
import type { InsightCard } from "./canvas/InsightsStrip";
import type { LegendChannel } from "./canvas/Legend";
import { legendAvailable } from "./canvas/legendAvailability";
import { legendChannels as canvasLegendChannels } from "./canvas/legendChannels";
import { type WelcomeSample, WelcomeSampleList } from "./canvas/WelcomeSampleList";
import { CommandPalette, type CommandPaletteItem } from "./CommandPalette";
import {
    ACTIVITIES_REQUIRING_DATA,
    ACTIVITY_RAIL_WIDTH,
    CANVAS_MENU_Z_INDEX,
    canvasToolbarProfile,
    SCREEN_TOO_SMALL_DETAIL_FONT_SIZE,
    SCREEN_TOO_SMALL_GAP,
    SCREEN_TOO_SMALL_PAD,
    SCREEN_TOO_SMALL_TITLE,
    SCREEN_TOO_SMALL_TITLE_FONT_SIZE,
    SCREEN_TOO_SMALL_Z_INDEX,
    screenTooSmallDetail,
    STATUS_BAR_HEIGHT,
    TOP_BAR_HEIGHT,
} from "./constants";
import {
    readPersistedAccelerationSettings,
    resolveAccelerationSettings,
    writePersistedAccelerationSettings,
} from "./defaults/accelerationSettings";
import {
    colourHeldBy,
    removeRunLayers,
    runColourBlock,
    topSwatchColour,
} from "./defaults/encodingReport";
import { loadDefaults } from "./defaults/loadDefaults";
import { METRIC_VALUE_FIELD, SHELL_DEFAULTS_TEMPLATE_ID, topDegreeLabelLayer } from "./defaults/styleDescriptors";
import {
    graphDeselectNode,
    graphDisableBuiltInXrButtons,
    graphOnDataChanged,
    graphResetView,
    graphSelectNode,
    graphViewPreset,
    graphZoomStep,
    graphZoomToFit,
    graphZoomToSelection,
} from "./graphCommands";
import {
    readPersistedInsightsMemory,
    resolveInsightsMemory,
    withRetiredCapability,
    writePersistedInsightsMemory,
} from "./insights/insightsMemory";
import {
    insightCandidates,
    type InsightCapability,
    type InsightsGraphShape,
    insightsStripModel,
    isSliceAvailable,
} from "./insights/insightsRules";
import { Inspector } from "./inspector/Inspector";
import { InspectorBody, type InspectorSelection } from "./inspector/InspectorBody";
import { COUNTS_ROW_LABELS, INSPECTOR_KIND_LABELS, MOST_CONNECTED_TOP_N } from "./inspector/inspectorConstants";
import type { NeighborRow } from "./inspector/NodeInspector";
import type { ResultBodyRow } from "./inspector/ResultInspector";
import { KeyboardShortcutsOverlay } from "./KeyboardShortcutsOverlay";
import { ActivityPanel } from "./panel/ActivityPanel";
import { AiPanel } from "./panel/AiPanel";
import { AnalyzePanel, type AnalyzeResultCard } from "./panel/AnalyzePanel";
import { DataPanel, type LoadedDataSummary } from "./panel/DataPanel";
import { ExplorePanel, type ExploreSearchScope } from "./panel/ExplorePanel";
import { PresentPanel } from "./panel/PresentPanel";
import { SettingsOverlay } from "./panel/SettingsOverlay";
import { StylePanel } from "./panel/StylePanel";
import { ActivityRail } from "./rail/ActivityRail";
import { HelpMenu, type HelpMenuRowId } from "./rail/HelpMenu";
import { communityHeadline, communityReading, communityResultBody } from "./readings/communityReading";
import { DEFAULT_EDGE_NOUN, GRAPH_SUMMARY_EMPTY_READING, graphSummaryReading } from "./readings/graphSummaryReading";
import { nodeMetricHeadline, nodeMetricReading, nodeMetricResultBody } from "./readings/nodeMetricReading";
import { formatCount } from "./readings/readingFormat";
import { caveatsLine, runRecordLine } from "./readings/runRecord";
import { ShellProvider, useShell } from "./ShellContext";
import { formatAcceleration } from "./statusbar/formatAcceleration";
import { formatCountPair, formatCountsTitle } from "./statusbar/formatCounts";
import { StatusBar } from "./statusbar/StatusBar";
import type { LayoutQuickPick, StatusBarCompletion, StatusBarIssuesModel, StatusBarSlotsModel } from "./statusbar/statusBarModel";
import { CanvasToolbar, type CanvasToolbarComponentProps } from "./toolbar/CanvasToolbar";
import { TopBar } from "./topbar/TopBar";
import { historyRows, useUndoStore } from "./topbar/undoStore";
import type { ActivityId, CanvasViewMode, PrimaryActivityId, SelectionKind, ShellStateAxis } from "./types";
import { useShellKeyBindings } from "./useShellKeyBindings";

/**
 * Which node metric each frozen Suggested row runs (AnalyzePanel.tsx:136-166).
 *
 * Two vocabularies meet here and neither is renamed to suit the other: the panel's row
 * ids are the artboard's, the metric ids are the element's registry types, and the map
 * between them lives at the seam rather than inside either side. `groups` is deliberately
 * absent -- it is community detection, not a node metric, and it keeps its own branch.
 */
const SUGGESTED_CARD_METRICS: Readonly<Record<string, NodeMetricId>> = {
    "most-connected": "degree",
    bridges: "betweenness",
    influence: "pagerank",
};

/** An image format graphty-element's `captureScreenshot` takes. */
type ImageFormat = NonNullable<ScreenshotOptions["format"]>;

/**
 * Whether the Present panel's format select handed back a format the element can capture.
 * @param value - the select's value.
 * @returns true for png, jpeg and webp.
 */
function isImageFormat(value: string): value is ImageFormat {
    return value === "png" || value === "jpeg" || value === "webp";
}

/**
 * The community run's identity on the Results list.
 *
 * One result is on the list at a time -- the one the last run wrote -- so a per-run-KIND
 * id is stable for exactly as long as the result is on the list, which is what the
 * Analyze panel asks of it. The node metrics take `result-${metric}` on the same rule.
 */
const COMMUNITY_RESULT_ID = "groups";



/**
 * The community run's PLAIN name, which is the half floor item 6 insists is the same on
 * every surface. The layer is named "Groups (Communities, Louvain)" and the History row
 * reads "Found groups (Communities, Louvain)"; both carry the technical half after the
 * plain one, and this is that plain one.
 */
const COMMUNITY_RESULT_TITLE = "Groups";

/**
 * Which 7.3 insight card each node metric retires when it is run from its own panel.
 *
 * The third vocabulary: the rule table names capabilities, not metrics and not panel
 * rows. Mapping here is what lets `insightsRules` stay pure of anything it does not own
 * -- its own doc asks for exactly that -- and what lets the estimate record, which is
 * keyed by metric, reach the strip's 60 s gate, which is keyed by capability.
 */
const NODE_METRIC_INSIGHT_CAPABILITIES: Readonly<Record<NodeMetricId, InsightCapability>> = {
    degree: "centrality-degree",
    pagerank: "centrality-pagerank",
    betweenness: "centrality-betweenness",
};

/**
 * One order to run a node metric, and everything the ROUTE decides about it.
 *
 * The flags are per route rather than per metric, which is why they travel with the
 * order instead of being read off the shell's state: 7.3 retires a capability's insight
 * card when it is run from its own panel and explicitly does NOT when it is run from the
 * strip card itself, and the size gate's dialog re-enters the same callback later, so the
 * run it finally performs has to remember which route asked for it. Both facts used to
 * live at the call sites, where the panel's handler retired the card BEFORE the run and a
 * Cancel on the confirm therefore retired a card for a run that never happened.
 */
interface MetricRunRequest {
    /** Which metric to run. */
    readonly metric: NodeMetricId;
    /** Whether the reader has already agreed to the estimate. */
    readonly confirmed: boolean;
    /** Whether a COMPLETED run retires this metric's Insights card (7.3, panel routes). */
    readonly retiresInsightCard: boolean;
}

/** The Data panel's own overflow row (spec 03 section 2.1, rev 1.8). */
const CLOSE_DATASET_ROW = "Close dataset. Starts a new session";

/**
 * What the failed load's toast calls its one link.
 *
 * Not "Details": the toast's own word goes to a mapping line in the Loaded data section
 * (spec 02 section 6) and a load that never arrived has no mapping to show. 6.10 floor
 * item 4 asks a control to say what it will do before it does it, so this one says where
 * it goes -- the Data panel, which is the surface the reader loads from.
 */
const OPEN_DATA_ACTION = "Open Data";

/** The DOM event graphty-element mirrors every acceleration transition onto. */
const CAPABILITIES_CHANGE_EVENT = "graphty-capabilities-change";

/** The device-lost toast's link: it says where it goes, because there is no mapping line to scroll to. */
const OPEN_SETTINGS_ACTION = "Open Settings";

/** The Style panel's own overflow row (spec 03 section 2.4). */
const RESET_STYLES_ROW = "Reset styles to defaults";

/** The activity name each panel header prints (spec 02 section 1.2). */
const ACTIVITY_TITLES: Readonly<Record<PrimaryActivityId, string>> = {
    data: "Data",
    explore: "Explore",
    analyze: "Analyze",
    style: "Style",
    present: "Present",
    ai: "AI",
};

/** The rail's own names for the two pinned items, for the palette's Go to group. */
const PINNED_TITLES: Readonly<Record<"help" | "settings", string>> = {
    settings: "Settings",
    help: "Help and keyboard shortcuts",
};

/** How many layout engines the quick-pick menus offer. Spec 02 section 5 asks for four. */
const LAYOUT_PICK_COUNT = 4;

/**
 * The graph host's default layout, the same engine `Graphty` defaults to.
 *
 * Spec 7.2 names the force layout by name for a graph below the large-graph threshold,
 * and the engine it names is ngraph (`NGraphLayoutEngine.ts:86`, `static type =
 * "ngraph"`), which is also what graphty-element's own `Graph` constructor defaults to.
 * Only the shell had overridden it to d3. `loadDefaults` decides the layout per load;
 * this is the value the shell starts from, before anything is loaded.
 */
const DEFAULT_LAYOUT = "ngraph";

/** How often the shell retries turning graphty-element's XR buttons off, in ms. */
const GRAPH_READY_POLL_MS = 250;

/**
 * The status bar's selection slot. Once the element has reported a selection change its count
 * is the only answer; before that, a clicked node reads as one.
 * @param selectedCount - Nodes plus edges in the element's selection, or null before the
 * element has reported any change.
 * @param hasSelectedNode - Whether a node is selected by a click.
 * @returns The slot, or undefined when nothing is selected.
 */
function selectionSlotOf(selectedCount: number | null, hasSelectedNode: boolean): { label: string } | undefined {
    if (selectedCount === null) {
        return hasSelectedNode ? { label: "1 selected" } : undefined;
    }

    return selectedCount > 0 ? { label: `${selectedCount.toLocaleString()} selected` } : undefined;
}

/** How long the Explore search waits after the last keystroke before it asks the element. */
const EXPLORE_SEARCH_DEBOUNCE_MS = 200;

/** How many times it retries before giving up. The graph initialises asynchronously. */
const GRAPH_READY_POLL_LIMIT = 40;

/**
 * How long the shell waits for a panel to mount before it looks for the field a
 * "focus X" binding names, in animation frames. One frame is enough -- React has
 * committed by then -- and a second is the retry a slower commit needs.
 */
const FOCUS_FRAMES = 2;

/** What F6 considers a place to put focus when it lands on a region. */
const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The layout engines the Style panel's quick picks and the status bar's layout menu
 * both offer, read from the app's own layout registry rather than retyped. Spec 02
 * section 5 fixes the count at four and the artboard's own four at the time it was
 * drawn; the registry is what the application can actually run.
 */
const LAYOUT_PICKS = LAYOUT_METADATA.slice(0, LAYOUT_PICK_COUNT).map((entry) => ({
    value: entry.type,
    label: entry.label,
}));

/**
 * One column of the data table drawer, for one key of the row records.
 * @param key - the attribute the column draws.
 * @returns the column definition.
 */
function drawerColumn(key: string): DataTableColumn<Record<string, unknown>> {
    return {
        id: key,
        header: key,
        value: (row) => {
            const value = row[key];

            if (value === null || value === undefined) {
                return value;
            }

            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                return value;
            }

            return JSON.stringify(value);
        },
    };
}

/**
 * The drawer's columns for a set of rows: every key any of the rows carries, in the
 * order the rows first mention them.
 * @param rows - the rows the drawer is about to draw.
 * @returns one column per key.
 */
function drawerColumns(rows: readonly Record<string, unknown>[]): readonly DataTableColumn<Record<string, unknown>>[] {
    const keys: string[] = [];

    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!keys.includes(key)) {
                keys.push(key);
            }
        }
    }

    return keys.map(drawerColumn);
}

/** How many bytes make one kilobyte, as a file size is printed. */
const BYTES_PER_KB = 1024;

/**
 * A file's size in the words the artboard prints ("84 KB").
 * @param bytes - the file's size in bytes.
 * @returns the size, rounded to whole kilobytes.
 */
function fileSizeLabel(bytes: number): string {
    return `${Math.max(1, Math.round(bytes / BYTES_PER_KB)).toLocaleString()} KB`;
}

/**
 * What the Loaded data section's RT-2 compound can say about a load, from the request
 * alone.
 *
 * Only measured facts go in. The format is there when the request NAMED one; with
 * "auto" the loader detected it and publishes no answer, so the compound is not drawn
 * rather than drawn with a guess. The size is there when a real file was read. The
 * direction is in neither, and not because it is unknown: the element measures it and the
 * Counts "Type" row prints that. It is absent from THIS compound because the compound
 * describes the REQUEST -- what the reader asked for and what was read -- and the direction
 * is a fact about the graph that came back.
 * @param request - the load request that just succeeded.
 * @returns the compound's values, or undefined when the request measured none of them.
 */
function loadedDataSummary(request: LoadDataRequest): LoadedDataSummary | undefined {
    if (request.format === "auto") {
        return undefined;
    }

    const size = request.file === undefined ? undefined : fileSizeLabel(request.file.size);

    return { format: request.format, size };
}

/**
 * Puts focus in the first element matching a selector, once the region that holds it
 * has mounted.
 *
 * The bindings that focus a field -- `/` on Explore's search, the backtick on the
 * assistant input -- open a panel first, so the field does not exist in the frame the
 * key was pressed in. The shell waits for React's commit rather than guessing at a
 * delay, and gives up quietly if the field never arrives: a binding that cannot find
 * its receiver does nothing, which is what an absent handler would have done.
 * @param selector - the field to focus.
 */
function focusWhenMounted(selector: string): void {
    let frames = 0;

    const attempt = (): void => {
        const target = document.querySelector<HTMLElement>(selector);

        if (target !== null) {
            target.focus();

            return;
        }

        frames += 1;

        if (frames < FOCUS_FRAMES) {
            window.requestAnimationFrame(attempt);
        }
    };

    window.requestAnimationFrame(attempt);
}

/*
 * A private `edgeEndpoint(value)` helper stood here, and with it a second reader of an
 * edge's ends. It is gone: `neighborsOf` calls `edgeEndpoints` from
 * `analysis/graphShape.ts`, which is the shell's one reader of that fact. Keep it that
 * way -- a second reader here is free to invent a spelling the first one does not use.
 */

/**
 * The canvas toolbar, taking its bottom offset from the canvas region above it.
 *
 * The offset ladder of spec 01 section 3 is one pure function of state, and the canvas
 * region is the only place that knows the live rect it is measured against -- the
 * drawer's height is clamped to the canvas it docks into. Computing the same ladder up
 * here with the REMEMBERED drawer height put the bar (and the minimap and the legend
 * riding its baseline) above the top of a shorter canvas, where `overflow: hidden`
 * clipped them away. So the region publishes what it decided and the bar reads it.
 * @param props - the toolbar's props, minus the offset it no longer supplies.
 * @returns the toolbar, or nothing when the stack says it is not drawn.
 */
function CanvasToolbarSlot(props: Omit<CanvasToolbarComponentProps, "bottomOffset">): React.JSX.Element {
    const stack = useCanvasBottomStack();

    return <CanvasToolbar {...props} bottomOffset={stack === null ? null : stack.toolbarBottom} />;
}

/**
 * Which inspector surface the shell's facts choose, in one rule.
 *
 * A selected node outranks a picked style layer, which outranks a result, which outranks
 * the graph summary. It needs no new machinery: a card click clears the selection before
 * it sets the result, and the next pick replaces the result surface -- so a stale result
 * can never outlive a fresh selection, and `ShellStateAxis` stays empty / loaded /
 * selected.
 *
 * It must agree with `inspectorSelection`'s own chain, because this decides the header's
 * title and that decides the body. A disagreement reads as "Graph summary" drawn over a
 * style layer's properties.
 * @param hasSelectedNode - whether a node is selected.
 * @param hasResult - whether a result is being drawn.
 * @param hasSelectedLayer - whether a style layer is picked in the Style panel.
 * @returns the surface kind the inspector draws.
 */
function selectedNodeSelectionKind(
    hasSelectedNode: boolean,
    hasResult: boolean,
    hasSelectedLayer = false,
): SelectionKind {
    if (hasSelectedNode) {
        return "node";
    }

    /* The same precedence `inspectorSelection` uses, and it has to be, or the header
       names one surface while the body draws another. */
    if (hasSelectedLayer) {
        return "style-layer";
    }

    return hasResult ? "algorithm-result" : "none";
}

/**
 * The graph data the shell holds on to: what `GraphtyHandle.getData` last reported.
 */
interface ShellGraphData {
    /** The node records. */
    readonly nodes: Record<string, unknown>[];
    /** The edge records. */
    readonly edges: Record<string, unknown>[];
}

const NO_GRAPH_DATA: ShellGraphData = { nodes: [], edges: [] };

/** What the shell reports as pinned before the element is up to be asked. */
const EMPTY_PINNED_NODES: ReadonlySet<string | number> = new Set<string | number>();

/**
 * The event graphty-element publishes when a data source has finished loading.
 *
 * `DataManager.addDataFromSource` walks its source in chunks with an await between them
 * and emits `data-added` per chunk (DataManager.ts:480-499), then exactly ONE
 * `data-loaded` after the last chunk (DataManager.ts:543). The element forwards every
 * internal graph event as a DOM CustomEvent that bubbles and is composed
 * (graphty-element.ts:97), so an ancestor of the canvas hears it -- and can stop
 * hearing it again, which `Graph.addListener` does not allow.
 */
const DATA_LOADED_EVENT = "data-loaded";

/**
 * The event graphty-element publishes when the reader finishes dragging a node.
 *
 * It is the only way a pin the reader made with the POINTER reaches this shell. `pinOnDrag`
 * is on by default, so letting go of a dragged node pins it, and nothing else in the shell
 * is told: the Pin verb below knows about the pins it makes itself and about no others.
 * The element mirrors its node events to the DOM under a `graphty-` prefix, bubbling and
 * composed, so the frame hears this the same way it hears a load completing.
 */
const NODE_DRAG_END_EVENT = "graphty-node-drag-end";

/**
 * What the shell says about a load that did not arrive.
 *
 * Two fields because the surfaces need two facts and 6.10 makes each of them a floor
 * item in its own right: floor item 7 keeps the user's own data on screen at every
 * density -- "ids, labels, attribute names, values and filenames" -- so the sentence
 * leads with the file the reader chose, and floor item 4 asks for the reason a thing did
 * not happen, in plain language, rather than a bare refusal.
 */
interface LoadFailure {
    /** The file name, the tail of the URL, or what a pasted graph is called. */
    readonly fileName: string;
    /** Why it did not load, as a finished sentence. */
    readonly reason: string;
}

/**
 * The load now in flight, held for the failure that may arrive after it "succeeded".
 *
 * Every field here is a fact that has already been overwritten by the time the element
 * reports the failure: `finishLoad` has named the new dataset in the top bar and set the
 * state axis to Loaded, so the shell can no longer say what was on screen when the load
 * began, and the element's own message names the FORMAT and sometimes the URL but never
 * the file the reader picked.
 */
interface PendingLoad {
    /** What the reader called the source (6.10 floor item 7). */
    readonly fileName: string;
    /**
     * Whether a dataset is still drawn if this load fails: any load over one. A replacing
     * load swaps the graph only once the new data has parsed, so a failed one leaves the
     * previous graph on the canvas exactly as an additive one does.
     */
    readonly survivesFailure: boolean;
    /** The dataset the top bar named before this load began. */
    readonly previousName: string | null;
    /**
     * What the Loaded data section said about that dataset before this load began.
     *
     * Carried for the same reason the name is, and it was the half that was missed:
     * `finishLoad` writes the SUMMARY unconditionally, so a surviving failure that put the
     * name back left the section describing the file that never arrived --
     * "GraphML, 12 KB" under a top bar naming a JSON sample -- or, on the drop route
     * whose format is "auto" and whose summary is therefore undefined, rendered the whole
     * section in its empty form for a dataset that is still drawn.
     */
    readonly previousSummary: LoadedDataSummary | undefined;
}

/** What a pasted graph is called, wherever a load has to name its source. */
const PASTED_DATA_NAME = "pasted-data";

/** What the failure sentence calls the source when the load named none. */
const UNNAMED_LOAD_SOURCE = "the data you opened";

/** The throw the load path uses when the graph host has not initialised yet. */
const GRAPH_NOT_INITIALISED = "the graph is not initialised yet";

/** The throw the load path uses when the request carried no file, URL or text. */
const NO_SOURCE_NAMED = "the load request named no source";

/**
 * The throws on the load path that are addressed to a developer, and what to say instead.
 *
 * Of the five throws that can reach the shell's `.catch`, three already name the file or
 * the URL and read as English to the person who chose it ("Could not detect file format
 * from 'graph.txt'. Supported formats: ...", "Failed to fetch URL: 404 Not Found"). These
 * two do not: they are notes to whoever wired the host up, and printing either one at a
 * reader would be the same failure as printing nothing -- a sentence that cannot be acted
 * on. 6.10 floor item 4 asks for the reason in plain language AND a route back, so each
 * replacement says what the reader can do next.
 */
const DEVELOPER_LOAD_FAILURES: Readonly<Record<string, string>> = {
    [GRAPH_NOT_INITIALISED]: "The graph view is not ready yet. Try again in a moment.",
    "Graph element not initialized": "The graph view is not ready yet. Try again in a moment.",
    [NO_SOURCE_NAMED]: "No file, URL or pasted text reached the load, so there was nothing to read.",
};

/**
 * What the shell says when the element could not tell what format a file is in.
 *
 * The element's own message for this ends in the call a DEVELOPER would type to name the
 * format, which is no route for a reader; the Load data dialog's format menu is.
 */
const UNRECOGNISED_FORMAT_REASON =
    "Its format was not recognised. Open it with Open file and pick the format from the list.";

/** What the shell says when the failure carried no message of its own. */
const UNREADABLE_LOAD_REASON = "The data could not be read, and the loader gave no reason.";

/**
 * What a thrown value actually says, or nothing when it says nothing.
 *
 * `throw` accepts any value and the load path crosses three authors -- the wrapper's own
 * detector, `fetch`, and graphty-element's parser -- so what arrives is not always an
 * `Error`. A string and a number are read as written; anything else, an object included,
 * says nothing here rather than being stringified, because the one sentence a plain
 * object produces is "[object Object]" and printing that at a reader is the silent
 * failure again with a box drawn round it.
 * @param error - the rejection, or whatever the element's event carried.
 * @returns the message, or the empty string when the value carries none.
 */
function thrownMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    if (typeof error === "number" || typeof error === "boolean") {
        return String(error);
    }

    return "";
}

/**
 * Turns whatever the load path threw, or whatever the element reported, into a sentence.
 *
 * The message is printed as its author wrote it wherever it is readable, because the
 * author is the only one who knows what went wrong: "Could not detect file format from
 * 'notes.txt'. Supported formats: ..." is a better sentence than any wording invented
 * here. Where the value says nothing -- an `Error` with an empty message, a thrown
 * object, a rejection with no value at all -- the shell supplies its own sentence rather
 * than printing an empty line, because a reader told only that a load failed has been
 * told nothing they can act on (6.10 floor item 4).
 * @param error - the rejection, or the error the element's event carried.
 * @returns one plain-language sentence, ending in a full stop.
 */
function loadFailureReason(error: unknown): string {
    if (isGraphtyError(error) && error.code === "E_UNKNOWN_FORMAT") {
        return UNRECOGNISED_FORMAT_REASON;
    }

    const message = thrownMessage(error).trim();
    const developer = DEVELOPER_LOAD_FAILURES[message];

    if (developer !== undefined) {
        return developer;
    }

    if (message === "") {
        return UNREADABLE_LOAD_REASON;
    }

    return /[!.?]$/.test(message) ? message : `${message}.`;
}

/**
 * The one sentence both failure surfaces draw, with the file name FIRST.
 *
 * One formatter because it is one fact told in two places -- inline in the Welcome drop
 * zone while the canvas is empty (spec 4105), and in the status bar toast once a dataset
 * is drawn -- and two spellings of one fact are how the two come to disagree. The file
 * leads because 6.10 floor item 7 makes it a floor item: a reader who dropped four files
 * needs to know which one this is about before they are told anything else.
 * @param failure - what did not load, and why.
 * @returns the sentence.
 */
function loadFailureSentence(failure: LoadFailure): string {
    return `Could not load ${failure.fileName}. ${failure.reason}`;
}

/**
 * What the reader called the source of a load request.
 *
 * The same three branches the load itself takes, so the name the failure prints and the
 * name a success puts in the top bar cannot drift apart. A request that named no source
 * returns null rather than a placeholder: the load is about to throw for that reason and
 * the sentence it throws with is a better one than any name invented here.
 * @param request - the load request, as the dialog or a drop built it.
 * @returns the name, or null when the request named no source at all.
 */
function loadRequestName(request: LoadDataRequest): string | null {
    if (request.inputMethod === "url" && request.url !== undefined) {
        return request.url.split("/").pop() ?? request.url;
    }

    if (request.inputMethod === "file" && request.file !== undefined) {
        return request.file.name;
    }

    if (request.inputMethod === "paste" && request.data !== undefined) {
        return PASTED_DATA_NAME;
    }

    return null;
}

/**
 * What the Counts "Type" row says about direction.
 *
 * It states what graphty-element says the graph IS -- the direction the snapshot is
 * frozen with, which is the direction every run, every layout and every degree uses.
 *
 * THE PROVENANCE CLAUSE IS GONE, and its absence is the honest half of this row. Spec
 * line 843 writes it as "Direction (Directed / Undirected, from the file where the format
 * carries it)", and the row used to print "(from file)". The element publishes what the
 * graph is and not where that came from: under `data.directed: "auto"` a format that
 * states nothing leaves the element's own default standing, and the row cannot tell that
 * apart from a file header that said so. Claiming the file said it would be inventing a
 * source. The clause comes back the day the element publishes where the direction was
 * settled -- see the element note in this module's header.
 *
 * "unknown" survives as the empty graph's answer: nothing has settled the question yet,
 * and there is no 6.3 pair for a fact nobody read, so a plain-language phrase alone is
 * the whole vocabulary that case has.
 */
const COUNTS_TYPE_ROW: Readonly<Record<GraphStatistics["directedness"], string>> = {
    directed: "Directed",
    undirected: "Undirected",
    mixed: "Mixed directions",
    unknown: "Not stated yet",
};

/**
 * The Type row: what the graph is, and where that came from when a file is what settled it.
 * @param statistics - the element's statistics for the loaded graph
 * @returns the row text
 */
function countsTypeRow(statistics: GraphStatistics): string {
    const claim = COUNTS_TYPE_ROW[statistics.directedness];

    // The source qualifies the claim only when data said so. A direction the reader themselves
    // configured, or one nothing has stated, is still true of the graph -- but "(from file)" on
    // either would credit the file with a decision it did not make.
    return statistics.directednessSource.by === "file" ? `${claim} (from file)` : claim;
}

/**
 * Props of {@link AppShell}.
 * @public
 */
export interface AppShellProps {
    /**
     * The viewport width the store starts from, before its first measurement. Tests
     * pass it to pin a breakpoint; the application leaves it alone.
     */
    readonly initialShellWidth?: number;
    /** Whether the shell reads and writes its remembered layout. Tests turn it off. */
    readonly persist?: boolean;
    /** Whether the store measures the window and follows resizes. Tests turn it off. */
    readonly measureViewport?: boolean;
}

/**
 * The shell's frame and every region inside it.
 *
 * Split from {@link AppShell} because almost everything here reads the store, and
 * `useShell` only works below `ShellProvider`.
 * @param props - the frame's props.
 * @param props.persist - whether the remembered canvas layout is read and written.
 * @returns the whole shell.
 */
function ShellFrame(props: { readonly persist: boolean }): React.JSX.Element {
    const { persist } = props;
    const shell = useShell();
    const {
        activeActivity,
        breakpoint,
        inspectorWidth,
        isSectionOpen,
        openActivity,
        panelWidth,
        selectActivity,
        setInspectorWidth,
        setPanelWidth,
        setStateAxis,
        sidebarsHidden,
        toggleSidebars,
    } = shell;

    /* Both sidebars are drawn together or not at all. This is the WHOLE of the shell's
       show/hide model since 2026-09-14, and it is one derivation rather than two facts
       so the top bar's switch, the panel, the inspector and the rail's marker cannot
       come to disagree about which sidebars are on screen. */
    const sidebarsShown = !sidebarsHidden;

    /* ---------------------------------------------------------------------- */
    /* The graph host and what the application knows about the data           */
    /* ---------------------------------------------------------------------- */

    const graphtyRef = useRef<GraphtyHandle>(null);
    const [datasetName, setDatasetName] = useState<string | null>(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    /* The load that did not arrive, or null while nothing has failed since the last
       attempt began. Read by exactly two surfaces -- the Welcome drop zone and the status
       bar toast -- and written by two producers; see the load-failure block below. */
    const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(null);
    /* Where acceleration stands, as graphty-element last published it, or null while it has
       said nothing. The shell never asks the machine anything: it holds the element's own
       document and draws it. `null` and `"probing"` both draw nothing. */
    const [acceleration, setAcceleration] = useState<AccelerationStatus | null>(null);
    const [loadedSummary, setLoadedSummary] = useState<LoadedDataSummary | undefined>(undefined);
    const [graphData, setGraphData] = useState<ShellGraphData>(NO_GRAPH_DATA);
    /*
     * The graph's shape, as graphty-element last reported it.
     *
     * Held beside the records rather than derived from them, because it is not derivable
     * from them: the element measures the snapshot it froze, and the records are a copy
     * the shell keeps for its data table. Both are re-read together in `refreshGraphData`,
     * on the element's own data events, so the two can never describe different graphs.
     */
    const [graphStatistics, setGraphStatistics] = useState<GraphStatistics>(EMPTY_GRAPH_STATISTICS);
    /*
     * What the element says each metric would cost on the graph it is holding.
     *
     * It feeds two surfaces that must agree: the Suggested Run's own label and tooltip,
     * and the Insights strip's 60 s ceiling. The strip's gate is inert without it -- an
     * unestimated betweenness card is offered whatever the graph's size -- so a 200k-node
     * graph would have gone on suggesting a pass measured in hours as a one-click card.
     *
     * Read beside the statistics, on the same data events, because the same thing makes
     * both answers move: the estimate is O(1) over the shape the session maintains, so
     * asking for all three costs no more than reading the shape once. The number the
     * reader is asked to ACCEPT is asked for again on the click -- see `runNodeMetricCard`
     * -- because by then the element may have timed a real run and know better.
     */
    const [metricEstimates, setMetricEstimates] = useState<Readonly<Record<NodeMetricId, MetricCostEstimate>>>(() =>
        metricCosts(null),
    );
    /* What the element says this graph can support and what each analysis would cost, one
       entry per algorithm it ships. The Insights strip reads it so that a card is offered
       only for a run the element will actually perform, and so that the 60 s ceiling has a
       number for every card rather than for the three this shell estimates for its own Run
       buttons. Empty until the element is up, which is what it also answers for a graph of
       no size. */
    const [elementMetrics, setElementMetrics] = useState<readonly MetricAvailability[]>([]);
    /* How many loads the element has reported COMPLETE since the last dataset boundary.
       The 7.2 defaults wait on it rather than on the first data event: a chunked load
       publishes `data-added` per chunk, and a decision taken on the first one is taken
       over a partial graph. */
    const [loadCompletions, setLoadCompletions] = useState(0);
    const [layers, setLayers] = useState<readonly LayerItem[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    /* The Explore search field and the set it runs over.
       They are held HERE, beside `selectedLayerId` and the canvas layout's
       `timeSlider`, rather than inside `ExplorePanel`, because `renderPanelBody`
       builds the panel body per activity: leaving Explore for Style unmounts the
       panel, so state held inside it is state the reader loses on a panel switch.
       Every other value the panel remembers already lives at this level for that
       reason. Product owner, 2026-09-13: "I can't type in the search nodes and edges
       textbox under explore" -- the field was a controlled input with neither prop
       supplied, so its value was pinned to the empty string and every keystroke was
       discarded. */
    const [exploreQuery, setExploreQuery] = useState("");
    const [exploreScope, setExploreScope] = useState<ExploreSearchScope>("graph");
    /* Why the element refused the Explore query, in its own words, or undefined. */
    const [exploreError, setExploreError] = useState<string | undefined>(undefined);
    /* Whether the Explore field has selected anything, so emptying it clears what it chose
       and an empty field on mount leaves a clicked selection alone. */
    const exploreSelectedRef = useRef(false);
    /* How many elements the element's selection holds, from its own change event; null
       until the element has reported one. */
    const [selectedCount, setSelectedCount] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<CanvasViewMode>("3d");
    const [layoutType, setLayoutType] = useState<string>(DEFAULT_LAYOUT);
    const [layoutConfig, setLayoutConfig] = useState<Record<string, unknown>>({});
    const [selectedNode, setSelectedNode] = useState<{
        readonly id: string;
        /*
         * The same node, as the ELEMENT spells its id. Kept beside the printed form because the
         * element looks a node up by exact map key: `element.pin("34")` finds nothing on a graph
         * whose ids are numbers, and unlike `selectNode` the pin verbs return nothing, so a miss
         * cannot even be detected and retried. Every call on the element made from this state
         * passes this field.
         */
        readonly elementId: string | number;
        readonly attributes: Record<string, unknown> | null;
    } | null>(null);
    /*
     * Which nodes the element has pinned, as the inspector's Pinned badge and its Pin/Unpin verb
     * read it. Re-read from the element rather than tracked here, because the element pins on
     * drag as well (`pinOnDrag` is on by default) and a copy kept up to date only by this shell's
     * own calls would say "Pin" over a node the reader has already fixed by dragging it. The two
     * things that move it are this shell's own Pin verb and {@link NODE_DRAG_END_EVENT}.
     */
    const [pinnedNodes, setPinnedNodes] = useState<ReadonlySet<string | number>>(EMPTY_PINNED_NODES);
    const layerCounter = useRef(1);
    const firstLoadDone = useRef(false);
    /* Whether the 7.2 defaults have been applied to the dataset now loaded. They are a
       per-dataset one-shot: re-applying them would fight a layout or a label budget the
       user has since changed, and the graph's own data events fire more than once per
       load. `crossDatasetBoundary` clears it. */
    const loadDefaultsAppliedRef = useRef(false);
    /** graphty-element's sentence for why this load got fewer degree labels than its budget. */
    const [labelShortfall, setLabelShortfall] = useState<string | null>(null);
    /* The card a sample row's closing hint asked for, consumed once the defaults have
       landed, so the suggested run happens on a graph that already has its neutral base
       and its degrees (7.1 item 2: one interaction, in the right order). */
    const pendingSuggestedRef = useRef<InsightCapability | null>(null);
    /* The load in flight, as its failure will need it. A ref and not state because the
       failure arrives AFTER the optimistic `finishLoad`, so by then nothing in state can say
       what the reader chose or what was on screen before. */
    const pendingLoadRef = useRef<PendingLoad | null>(null);
    /* What the top bar and the state axis were saying at the last commit, which is what
       was true when a load started from an event handler. The load-failure path restores
       it, and it cannot read the state directly for the reason above. */
    const drawnDatasetRef = useRef<{
        loaded: boolean;
        name: string | null;
        summary: LoadedDataSummary | undefined;
    }>({ loaded: false, name: null, summary: undefined });
    const frameRef = useRef<HTMLDivElement>(null);
    /* The id the last `selection-changed` reported, or null when that pick hit nothing.
       It is a ref and not state because its one reader is an event handler in the same
       gesture, and a re-render for it would be a re-render for nothing. */
    const lastSelectionRef = useRef<string | null>(null);

    /* ---------------------------------------------------------------------- */
    /* The surfaces the shell owns the open state of                          */
    /* ---------------------------------------------------------------------- */

    const [helpOpen, setHelpOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    /* The Settings section a caller asked for, or `undefined` when it asked for none.
       Spec 5.3 AI tier 3 sends the assistant's setup prompt to "Settings > AI
       providers", not merely to Settings: a user who has no provider is the one user
       who cannot find the pane by hunting, because the pane is the thing they have
       never seen. */
    const [settingsSection, setSettingsSection] = useState<string | undefined>(undefined);

    /* What the reader last chose about GPU acceleration. Seeded from storage in the
       initialiser rather than in an effect, because the policy rides on the
       <graphty-element> tag and has to be there on its FIRST render: the element starts
       probing for an accelerator in connectedCallback, and a policy that arrives after
       that has already let a reader who asked for none be probed. */
    const [accelerationPolicy, setAccelerationPolicy] = useState<AccelerationPolicy>(
        () => resolveAccelerationSettings(readPersistedAccelerationSettings()).policy,
    );

    /* The shell writes storage because the shell owns the state: storage is the reader's
       memory and the element is the reader's canvas, and both are written from the one
       place. The Settings pane reports the click and keeps nothing. */
    const changeAccelerationPolicy = useCallback((policy: AccelerationPolicy): void => {
        setAccelerationPolicy(policy);
        writePersistedAccelerationSettings({ policy });
    }, []);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    /* The Present panel's image format. The capture itself is graphty-element's
       `captureScreenshot`; the shell only remembers which format the reader picked. */
    const [imageFormat, setImageFormat] = useState<ImageFormat>("png");

    /**
     * Captures the canvas through graphty-element, to a download or to the clipboard.
     * @param options - what the element should capture and where it should send it.
     */
    const captureImage = useCallback((options: ScreenshotOptions) => {
        const handle = graphtyRef.current;

        if (handle === null) {
            console.error(`[shell] ${GRAPH_NOT_INITIALISED}`);

            return;
        }

        handle.captureScreenshot(options).then(
            (result) => {
                /* A clipboard write that fails still resolves: the reason is in the result. */
                if (options.destination?.clipboard === true && result.clipboardStatus !== "success") {
                    console.error(`[shell] the image was not copied to the clipboard: ${result.clipboardStatus}`);
                }
            },
            (error: unknown) => {
                console.error("[shell] the element could not capture the image:", error);
            },
        );
    }, []);
    const { closeAll: closeAllPopouts } = usePopoutManager();

    /**
     * Opens one of the two full-panel overlays, Settings or the shortcuts sheet, and closes
     * everything that would otherwise be left on screen with it: every open pop-out, the Help
     * menu and the other overlay.
     *
     * Every route goes through here -- the rail, the palette, the Help menu, the ? key and the
     * assistant's setup prompt -- because only a mouse click outside a pop-out closes pop-outs by
     * itself. A key press or a palette row closes nothing, and a pop-out left open is drawn over
     * the overlay that was meant to replace it.
     * @param overlay - which overlay to open.
     * @param section - the Settings pane to open on, or undefined for the one it was left on.
     */
    const openFullPanelOverlay = useCallback(
        (overlay: "settings" | "shortcuts", section?: string) => {
            closeAllPopouts();
            setHelpOpen(false);
            setSettingsOpen(overlay === "settings");
            setShortcutsOpen(overlay === "shortcuts");

            if (overlay === "settings") {
                setSettingsSection(section);
            }
        },
        [closeAllPopouts],
    );
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
    const [compareActive, setCompareActive] = useState(false);
    const [inspectorPinned, setInspectorPinned] = useState(false);
    // Bumped by every dataset boundary, so the focus effect below runs after the
    // Empty tree is committed rather than against the tree that is leaving.
    const [boundaryCrossings, setBoundaryCrossings] = useState(0);

    /* ---------------------------------------------------------------------- */
    /* The canvas: its docks, its overlays, and the region's own memory (6.5)  */
    /* ---------------------------------------------------------------------- */

    const [canvasLayout, setCanvasLayout] = useState(() =>
        resolveCanvasLayout(persist ? readPersistedCanvasLayout() : {}),
    );
    const [drawerMaximised, setDrawerMaximised] = useState(false);
    const [drawerTab, setDrawerTab] = useState<DataDrawerTab>("nodes");
    const [xrSupport, setXrSupport] = useState({ vr: false, ar: false });

    useEffect(() => {
        if (!persist) {
            return;
        }

        writePersistedCanvasLayout(canvasLayout);
    }, [canvasLayout, persist]);

    /* ---------------------------------------------------------------------- */
    /* The Insights strip's own memory, and what a load and a run produce      */
    /* ---------------------------------------------------------------------- */

    /* Card retirement (7.3), in a fourth versioned key of its own. It is separate from
       the canvas layout's key on purpose: the global "suggestions dismissed" boolean
       and the per-capability retirement list are two different facts, Help > Show
       suggestions restores only the first, and one key cannot corrupt the other. */
    const [insightsMemory, setInsightsMemory] = useState(() =>
        resolveInsightsMemory(persist ? readPersistedInsightsMemory() : {}),
    );

    useEffect(() => {
        if (!persist) {
            return;
        }

        writePersistedInsightsMemory(insightsMemory);
    }, [insightsMemory, persist]);

    /* The degree pass 7.2 runs in the background at import. It feeds node size, the
       label selector's cut, the inspector's Most connected rows and the Search card's
       own example, so it is read back once and held rather than re-run per reader.

       Stamped with the graph it was measured over, because the pass runs ONCE per dataset
       and the graph it describes can move underneath it: every reader of it -- the degree
       card's short circuit, the summary's Most connected rows, its ranked count, the
       degree histogram and the Search card's example -- would otherwise go on describing
       the records that were there when the pass ran. The stamp is on the state rather
       than at one call site for exactly that reason: five surfaces read this, and a
       freshness test written at one of them leaves the other four lying. */
    const [degreePass, setDegreePass] = useState<{
        readonly results: DegreeResults;
        /** The node count the pass was measured over. */
        readonly nodeCount: number;
        /** The edge count the pass was measured over. */
        readonly edgeCount: number;
    } | null>(null);


    /* The result the inspector's Algorithm-result surface is drawing, or null. A
       selected node still wins over it (see `selectionKind`), so this is kept in state
       rather than recomputed when a selection clears. */
    const [activeResult, setActiveResult] = useState<{
        /**
         * The result's own identity, stable for as long as the result is on screen. It is
         * what the Analyze panel's Results row is keyed on, what `activeResultId` marks
         * and what `onOpenResult` is called with -- never a rendering index, which would
         * re-target the route back the moment a second result existed.
         */
        readonly id: string;
        /**
         * The run's PLAIN name -- "Groups", "Most connected". Floor item 6: one run is
         * not called three things on three surfaces, so this is the same plain half the
         * style layer, the legend block and the History row carry.
         */
        readonly title: string;
        /**
         * The collapsed one-liner the Results row draws beside the title: "6 groups,
         * modularity 0.447". Built by `communityHeadline` / `nodeMetricHeadline` beside
         * the reading templates they belong to, never assembled here, so the collapsed
         * line and the expanded reading cannot come to disagree about what was found.
         */
        readonly headline: string;
        readonly reading: string;
        /* Floor item 2. Absent for an exact, complete, converged run, and that ABSENCE is
           the feature: a caveats line drawn on every result is a line nobody reads, which
           is what would make "Approximate (sample of 200)" invisible when it matters. */
        readonly caveats?: string;
        readonly runRecord: string;
        readonly body: readonly ResultBodyRow[];
        /* The RT-9 chart row under the body. Only the node-metric shape has one so far;
           the community shape draws none rather than a 0-to-0 axis. */
        readonly distribution?: {
            readonly caption: string;
            readonly bins: readonly { readonly label: string; readonly count: number }[];
            readonly axisMin: string;
            readonly axisMax: string;
        };
        /* All four optional together, because a run whose encoding was SUPPRESSED painted
           nothing and the card must draw its un-applied form rather than name a layer that
           is not there (spec 2222-2226). A result either painted -- and then it names the
           layer, shows a colour that layer really paints, carries the TAG its two layer
           verbs act on and the count Remove result states before it acts -- or it did not,
           and carries none of the four.

           `layerRunId` is here rather than in a state field beside it because the verb acts
           on the layers belonging to THE RESULT THE READER IS LOOKING AT. Inferring the run
           from a separate "which metric is applied" field is how Delete layer on a Groups
           card came to delete the degree ramp: the field was never cleared by a community
           run, and the card and the field disagreed about which result was on screen. */
        readonly layerName?: string;
        readonly stateSwatch?: string;
        /** The run every layer this result painted names as its source. */
        readonly layerRunId?: RunId;
        /** How many layers name that run, which is the count Remove result states. */
        readonly layerCount?: number;
    } | null>(null);

    /*
     * The legend's blocks, translated from whatever the element's style stack is painting.
     *
     * Every figure in them is the ELEMENT's: the field's plain and technical names, the scale
     * in words out of the scale catalogue, the domain, the swatches and their colours, and the
     * departures as finished sentences. The shell used to rebuild all of it from a ranking it
     * had summarised itself, which is a second reading of the picture free to disagree with
     * the canvas -- and one of them did: a metric's result swatch was drawn at the palette's
     * top end rather than at the top node's own fraction.
     *
     * It is the home of the sentence the community reading no longer carries. Design line 201
     * gives the legend the channel header "Color: groups, categorical", and 5808 has Copy
     * reading pick up "the legend's channel lines" -- so what the colours MEAN is the legend's
     * fact, and repeating it as a third sentence in the reading both broke RT-10's
     * two-sentence budget and said the same thing twice. Empty until something encodes a
     * channel the canvas legend draws, because an unencoded channel is absent rather than
     * empty (spec 4121).
     *
     * It is held HERE, immediately beside the state it reads, rather than beside the canvas
     * props it feeds, because the key dispatcher is wired further down the file and
     * `toggleLegend` below has to know whether there is a legend to toggle.
     */
    const [legendChannels, setColourChannel] = useState<readonly LegendChannel[]>([]);

    /*
     * Whether the legend CAN be drawn: whether anything is encoded at all.
     *
     * ONE derivation feeding every control that reports on the legend -- the Views menu
     * row, the Style panel's switch and the L binding -- because until 2026-09-14 each of
     * the three read the remembered boolean on its own and reported "on" while no legend
     * could exist. The product owner's report was "the legend doesn't show up, even when
     * checked"; three controls were describing a state independent of the thing they
     * named, which is a 6.14 violation and reads to a novice as "the app is broken".
     * `legendAvailability.ts` carries the full account and the six conditions.
     */
    const legendIsAvailable = legendAvailable(legendChannels.length);

    /*
     * L, the Views row and the Style switch all land here.
     *
     * It is a NO-OP while nothing is encoded, and deliberately so rather than disabled at
     * the key: the two controls are drawn disabled with their reason, but a key press has
     * no ink to grey out, so the only honest thing it can do is nothing. Flipping the
     * remembered boolean instead would leave the reader having changed a state whose
     * effect they cannot see -- and worse, having changed it invisibly, so the next run
     * that DOES paint an encoding would surprise them with a legend they never asked for
     * (or none, having toggled it off by accident).
     */
    const toggleLegend = useCallback(() => {
        if (!legendIsAvailable) {
            return;
        }

        setCanvasLayout((current) => ({ ...current, legend: !current.legend }));
    }, [legendIsAvailable]);

    /*
     * The node-metric run in flight and the confirm it is waiting on.
     *
     * `runningMetric` is what disables every Suggested Run with a reason while a pass is
     * out; there is no Cancel beside it, because graphty-element offers no cancellation a
     * caller can reach -- `runAlgorithm` returns `Promise<void>` and its abort signal is
     * read once, before the algorithm starts -- and a Cancel that cannot stop the thing it
     * names is worse than no Cancel (spec 2053-2055).
     *
     * There is deliberately no "which metric is painted" field beside them any more. The
     * tag the inspector's two layer verbs act on is carried on the RESULT that painted it
     * ({@link activeResult}`.layerSource`), because the verb belongs to the card the reader
     * is looking at. A separate field could not stay in step with that card: a community
     * run never wrote it, so Delete layer pressed on a Groups result read the metric that
     * had run before it and deleted the wrong layers.
     */
    const [runningMetric, setRunningMetric] = useState<NodeMetricId | null>(null);
    const [metricConfirm, setMetricConfirm] = useState<{
        readonly metric: NodeMetricId;
        readonly estimate: MetricCostEstimate;
        /** The route's own flag, carried across the door so a confirmed run keeps it. */
        readonly retiresInsightCard: boolean;
    } | null>(null);

    /* ---------------------------------------------------------------------- */
    /* The one history store (section 3). Producers are not wired yet, so it   */
    /* stays empty and the pop-out honestly reads "0 entries, 0 undone".       */
    /* ---------------------------------------------------------------------- */

    const undoStore = useUndoStore();

    /* ---------------------------------------------------------------------- */
    /* AI                                                                      */
    /* ---------------------------------------------------------------------- */

    const aiKeyStorage = useAiKeyStorage();

    /* The provider the assistant opens with, chosen on the Settings > AI providers
       pane ("Default provider", Settings.dc.html:767). Until one is chosen the first
       provider that has a key is the one used, which is what this shell did before the
       pane existed and is still the right answer for a user with exactly one key. */
    const [aiDefaultProvider, setAiDefaultProvider] = useState<ProviderType | null>(null);
    const aiProvider = aiDefaultProvider ?? aiKeyStorage.configuredProviders[0];

    const aiManager = useAiManager({
        graph: graphtyRef.current?.graph ?? undefined,
        defaultProvider: aiProvider,
        getKey: aiKeyStorage.getKey,
    });
    const [aiMessages, setAiMessages] = useState<readonly ChatMessage[]>([]);

    /* The key store's own surface, as Settings takes it. Assembled here rather than in
       the overlay: this shell holds the ONE `useAiKeyStorage` instance, and a pane that
       called the hook itself would be a second `ApiKeyManager` with a second copy of
       the user's keys. */
    const aiProviderSettings = useMemo(
        () => ({
            ready: aiKeyStorage.isReady,
            getKey: aiKeyStorage.getKey,
            setKey: aiKeyStorage.setKey,
            removeKey: aiKeyStorage.removeKey,
            hasKey: aiKeyStorage.hasKey,
            configuredProviders: aiKeyStorage.configuredProviders,
            defaultProvider: aiProvider ?? null,
            onDefaultProviderChange: setAiDefaultProvider,
            isPersistenceEnabled: aiKeyStorage.isPersistenceEnabled,
            onEnablePersistence: aiKeyStorage.enablePersistence,
            onDisablePersistence: aiKeyStorage.disablePersistence,
        }),
        [
            aiKeyStorage.configuredProviders,
            aiKeyStorage.disablePersistence,
            aiKeyStorage.enablePersistence,
            aiKeyStorage.getKey,
            aiKeyStorage.hasKey,
            aiKeyStorage.isPersistenceEnabled,
            aiKeyStorage.isReady,
            aiKeyStorage.removeKey,
            aiKeyStorage.setKey,
            aiProvider,
        ],
    );

    /* ---------------------------------------------------------------------- */
    /* What is still true of the graph the shell last measured                 */
    /* ---------------------------------------------------------------------- */

    /*
     * The held degree pass, or null when it no longer describes the graph on the canvas.
     *
     * Null rather than stale is the whole point: a ranking of file A's nodes drawn beside
     * file B's is not a smaller truth, it is a wrong one, and every consumer here already
     * draws its absent form for null (no Most connected rows, no histogram, a ranked count
     * of 0) while the degree card falls through to an actual pass over the live graph.
     */
    const degreeResults = useMemo<DegreeResults | null>(() => {
        if (degreePass === null) {
            return null;
        }

        const fresh =
            degreePass.nodeCount === graphStatistics.nodeCount && degreePass.edgeCount === graphStatistics.edgeCount;

        return fresh ? degreePass.results : null;
    }, [degreePass, graphStatistics.edgeCount, graphStatistics.nodeCount]);

    /* ---------------------------------------------------------------------- */
    /* The 6.1 state axis, derived rather than stored twice                    */
    /* ---------------------------------------------------------------------- */

    const stateAxis: ShellStateAxis = useMemo(() => {
        if (!dataLoaded) {
            return "empty";
        }

        return selectedNode === null ? "loaded" : "selected";
    }, [dataLoaded, selectedNode]);

    useEffect(() => {
        setStateAxis(stateAxis);
    }, [setStateAxis, stateAxis]);

    /* ---------------------------------------------------------------------- */
    /* graphty-element's own XR buttons stay off, so the legend owns bottom     */
    /* right (spec 01 section 2). The graph initialises asynchronously.         */
    /* ---------------------------------------------------------------------- */

    /* The counts are read on the graph's own data events rather than after a load
       call returns, because `loadData` queues the load and returns before a single
       node exists. This ref carries the current reader into the mount-only effect
       below, which registers once and must not re-run when the reader changes. */
    const refreshGraphDataRef = useRef<() => void>(() => undefined);

    /* The graph the data listeners are already attached to.
       `Graph` publishes `addListener` and no matching remove, and `addListener`
       returns nothing to remove WITH, so an attach cannot be undone. The effect
       below therefore has to be idempotent by itself: under StrictMode it runs,
       tears down and runs again on the same graph, and without this guard every
       data event would be handled twice for the life of the session. */
    const dataListenerGraphRef = useRef<unknown>(null);

    /* Whether the graph instance exists yet. The `?test` load below waits on this:
       graphty-element initialises asynchronously, and a load issued before it has is
       the "the graph is not initialised yet" path, which drops the data silently. */
    const [graphReady, setGraphReady] = useState(false);

    useEffect(() => {
        let attempts = 0;

        const timer = window.setInterval(() => {
            const { graph } = graphtyRef.current ?? { graph: null };

            attempts += 1;

            if (graph !== null) {
                graphDisableBuiltInXrButtons(graph);

                if (dataListenerGraphRef.current !== graph) {
                    dataListenerGraphRef.current = graph;
                    graphOnDataChanged(graph, () => {
                        refreshGraphDataRef.current();
                    });
                }

                setGraphReady(true);
                window.clearInterval(timer);

                return;
            }

            if (attempts >= GRAPH_READY_POLL_LIMIT) {
                window.clearInterval(timer);
            }
        }, GRAPH_READY_POLL_MS);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    /* The Explore search. graphty-element runs it: the query goes to the element's selection
       as a text target, and the element reads the id:, type:, exact: and regex: prefixes and
       a leading `=` itself. A refusal -- an expression that does not parse -- is the element's
       sentence, shown under the field. `loadCompletions` is a dependency so a query still in
       the field runs again over a newly loaded dataset. */
    useEffect(() => {
        const session = elementSession(graphtyRef.current?.graph);
        const text = exploreQuery.trim();

        if (session === null || (text === "" && !exploreSelectedRef.current)) {
            return undefined;
        }

        const search = async (): Promise<void> => {
            try {
                if (text === "") {
                    session.selection.clear();
                    exploreSelectedRef.current = false;
                } else {
                    await session.selection.apply({ text, scope: exploreScope });
                    exploreSelectedRef.current = true;
                }

                setExploreError(undefined);
            } catch (error) {
                setExploreError(error instanceof Error ? error.message : String(error));
            }
        };
        const timer = window.setTimeout(() => {
            void search();
        }, EXPLORE_SEARCH_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [exploreQuery, exploreScope, graphReady, loadCompletions]);

    /* The status bar's selection slot reads the element's own selection change, so every
       route into the selection -- a click, a search, a command -- counts the same way. */
    useEffect(() => {
        const frame = frameRef.current;

        const onSelectionChange = (event: Event): void => {
            if (event instanceof CustomEvent) {
                const { nodes, edges, cause } = event.detail as SelectionDelta;
                setSelectedCount(nodes + edges);

                /* The search is the app's only "api" selection; a click ("user") or a command
                   replaced what it chose, so emptying the field must not clear that. */
                if (cause !== "api") {
                    exploreSelectedRef.current = false;
                }
            }
        };

        frame?.addEventListener("graphty-selection-change", onSelectionChange);

        return () => {
            frame?.removeEventListener("graphty-selection-change", onSelectionChange);
        };
    }, []);

    useEffect(() => {
        if (typeof navigator === "undefined" || navigator.xr === undefined) {
            return;
        }

        const probe = async (): Promise<void> => {
            const [vr, ar] = await Promise.all([
                navigator.xr?.isSessionSupported("immersive-vr").catch(() => false) ?? false,
                navigator.xr?.isSessionSupported("immersive-ar").catch(() => false) ?? false,
            ]);

            // Only a change is a render: in a browser that reports neither, this
            // leaves the first state alone rather than re-rendering the whole shell.
            setXrSupport((current) => (current.vr === vr && current.ar === ar ? current : { vr, ar }));
        };

        void probe();
    }, []);

    /* ---------------------------------------------------------------------- */
    /* Data loading                                                            */
    /* ---------------------------------------------------------------------- */

    const refreshGraphData = useCallback(() => {
        const data = graphtyRef.current?.getData() ?? NO_GRAPH_DATA;
        const session = elementSession(graphtyRef.current?.graph);
        const statistics = readGraphStatistics(session);

        /* The counts travel with the rest of the shape, in {@link graphStatistics}, so the
           number in the status bar and the number every reading is written from are the same
           field of the same object. They are the nodes and edges the element actually froze,
           which is not always the length of the record lists: an edge naming a node no record
           declared is still an edge of the graph. */
        setGraphData({ nodes: data.nodes, edges: data.edges });
        setGraphStatistics(statistics);
        setMetricEstimates(metricCosts(session));
        setElementMetrics(readMetricAvailability(session));
    }, []);

    useEffect(() => {
        refreshGraphDataRef.current = refreshGraphData;
    }, [refreshGraphData]);

    /*
     * Counts the loads graphty-element has reported COMPLETE, on the frame the event
     * bubbles to ({@link DATA_LOADED_EVENT}), and settles the wait that load is holding.
     *
     * The counts are refreshed in the same callback, so the completion and the records
     * it completed reach React in one batch: no reader can see the flag move ahead of
     * the data it stands for, whatever order the element's own listeners run in.
     */
    useEffect(() => {
        const frame = frameRef.current;

        const onDataLoaded = (): void => {
            refreshGraphDataRef.current();
            setLoadCompletions((count) => count + 1);
        };

        frame?.addEventListener(DATA_LOADED_EVENT, onDataLoaded);

        return () => {
            frame?.removeEventListener(DATA_LOADED_EVENT, onDataLoaded);
        };
    }, []);

    /*
     * Keeps the Pinned badge honest for a pin the READER made with the pointer.
     *
     * The whole set is re-read rather than the event's own `pinned` flag applied, because the
     * element is where a pin lives and it is the only thing that knows about pins this shell
     * did not make. The event says WHEN to look, not what the answer is.
     */
    useEffect(() => {
        const frame = frameRef.current;

        const onNodeDragEnd = (): void => {
            setPinnedNodes(new Set(graphtyRef.current?.pinnedNodes ?? EMPTY_PINNED_NODES));
        };

        frame?.addEventListener(NODE_DRAG_END_EVENT, onNodeDragEnd);

        return () => {
            frame?.removeEventListener(NODE_DRAG_END_EVENT, onNodeDragEnd);
        };
    }, []);

    useEffect(() => {
        drawnDatasetRef.current = { loaded: dataLoaded, name: datasetName, summary: loadedSummary };
    }, [dataLoaded, datasetName, loadedSummary]);

    /* ---------------------------------------------------------------------- */
    /* The load that did not arrive                                            */
    /* ---------------------------------------------------------------------- */

    /**
     * Reports a load that did not arrive, and unwinds the success the shell had claimed.
     *
     * Every load the shell starts goes through one of graphty-element's awaited methods, so
     * the failure arrives here as the rejection of that load's own promise -- a malformed
     * file, a 404 URL and unparsable pasted text alike -- rather than as an event the shell
     * would have to match to a load.
     *
     * What it unwinds is the claim, not only the silence. `finishLoad` named the new dataset
     * optimistically while it arrived, so the shell puts back what was true.
     *
     * Where a dataset was drawn before the load, it is still drawn: the element keeps the
     * previous graph when a replacing load fails, and an additive load's failure leaves the
     * graph it was adding to. That dataset keeps its own name AND its own summary rather than
     * the name and the summary of the file that failed. And because a replacing load crossed
     * the dataset boundary before it began -- clearing the shell's defaults with it -- the
     * surviving graph is counted as a completed load again, so the load-defaults effect paints
     * it as it does any dataset.
     *
     * Where nothing was drawn, spec 4105 makes a failed load a SUB-STATE of Empty -- "Failed
     * load is a sub-state of Empty: the error appears inline in the drop zone" -- so the shell
     * says Empty, Welcome comes back, and the reader has a route in rather than a populated
     * chrome around a blank canvas. The session's first-load latch is released with it: spec
     * 4107 spends it on "the session's first load", and a load that showed the reader nothing
     * is not one.
     * @param reason - why the load did not arrive, as a finished sentence.
     */
    const reportLoadFailure = useCallback(
        (reason: string) => {
            const pending = pendingLoadRef.current;

            /* 6.10 floor item 7: "the user's own data: ids, labels, attribute names,
               values and filenames". The sentence names the file the reader chose, which
               is carried here from the top of the load because the element's own message
               never does. */
            setLoadFailure({ fileName: pending?.fileName ?? UNNAMED_LOAD_SOURCE, reason });

            /* The suggested card belonged to the dataset that did not arrive; left armed,
               the load-defaults effect would run it over whatever is drawn instead. */
            pendingSuggestedRef.current = null;

            if (pending?.survivesFailure === true) {
                setDatasetName(pending.previousName);
                setLoadedSummary(pending.previousSummary);
                setLoadCompletions((count) => count + 1);
                refreshGraphData();

                return;
            }

            firstLoadDone.current = false;

            setDataLoaded(false);
            setDatasetName(null);
            setLoadedSummary(undefined);
            refreshGraphData();

            /* The reader was moved onto Explore by the optimistic `finishLoad` and the rail
               disables Explore in the Empty state, so leaving them there leaves an open
               panel for an activity the rail itself says is unavailable. Data is where a
               reader goes to get a dataset, and it is where both failure surfaces -- the
               toast's "Open Data" and Welcome's "Open file" -- already point. */
            if (ACTIVITIES_REQUIRING_DATA.includes(activeActivity)) {
                openActivity("data");
            }
        },
        [activeActivity, openActivity, refreshGraphData],
    );

    /* The current reporter, for a load's `catch` that runs seconds after the render that
       started it. Same shape as `refreshGraphDataRef` and for the same reason. */
    const reportLoadFailureRef = useRef<(reason: string) => void>(() => undefined);

    useEffect(() => {
        reportLoadFailureRef.current = reportLoadFailure;
    }, [reportLoadFailure]);

    /* The element's acceleration status, as it publishes it: a bubbling, composed DOM event on
       every controller transition, read here on the frame the way the load events are. The one
       read after subscribing is not a fallback: on a host with no WebGPU the probe's rejection is
       a short microtask chain that can settle before this passive effect runs, and the document
       the element keeps is correct at any time. Nothing here probes, constructs or recovers. */
    useEffect(() => {
        const frame = frameRef.current;

        const onCapabilitiesChange = (event: Event): void => {
            const { detail } = event as CustomEvent<{ capabilities?: { acceleration?: AccelerationStatus } }>;
            const status = detail.capabilities?.acceleration;

            if (status !== undefined) {
                setAcceleration(status);
            }
        };

        frame?.addEventListener(CAPABILITIES_CHANGE_EVENT, onCapabilitiesChange);

        const current = graphtyRef.current?.session?.capabilities.acceleration;

        if (current !== undefined) {
            setAcceleration(current);
        }

        return () => {
            frame?.removeEventListener(CAPABILITIES_CHANGE_EVENT, onCapabilitiesChange);
        };
    }, []);

    /**
     * Everything a dataset boundary clears, whichever event crossed it.
     *
     * 6.12 makes Close dataset and a replacing load ONE rule, because the second is
     * the first with a load on the end, and two implementations of one rule are how
     * they come to disagree. What goes is what was true of the graph that has gone:
     * the selection, a pinned inspector card (5.4 says this of a reload and this is
     * the general case), the style layers that encoded it, and the transients that
     * describe an object which no longer exists. What stays is what 6.5 says is true of the user, so nothing here
     * touches widths, section states or the remembered activity.
     *
     * Focus moves to the canvas. At a boundary the openers are going too, so the
     * ladder's first two rungs have nothing to offer, and the one landing place
     * 6.12 forbids is the document body -- which is exactly where it went before
     * this existed, leaving the next Tab to start at the top of the page.
     *
     * The Data table drawer needs no clause: the canvas draws no overlay layer in
     * the Empty state, so the drawer leaves with it and its remembered open state
     * and height survive untouched, which is what 6.5 asks for.
     */
    const crossDatasetBoundary = useCallback(() => {
        setSelectedNode(null);
        setInspectorPinned(false);
        setPaletteOpen(false);
        setViewsMenuOpen(false);
        setDrawerMaximised(false);

        /* And the sentence about a load that did not arrive: it named a file that was
           being read into the dataset now leaving, so whichever event crossed the
           boundary -- Close dataset, or the next replacing load starting -- it is no
           longer about anything on screen. */
        setLoadFailure(null);

        /* The 7.2 defaults, the degree pass and any result describe the graph that has
           gone, so they go with it: the latch is cleared so the next load applies its
           own defaults, the completion count is zeroed so a completion reported for the
           load that has gone cannot arm them early, and neither a stale degree ranking
           nor a stale community reading outlives the data it was measured from. */
        loadDefaultsAppliedRef.current = false;
        pendingSuggestedRef.current = null;
        setLoadCompletions(0);
        setDegreePass(null);
        setLabelShortfall(null);
        setActiveResult(null);
        setColourChannel([]);
        /* A metric run describes the graph that has gone exactly as a community run does:
           a pass still in flight is about to write over records that no longer exist, and a
           pending confirm names a size that is no longer the graph's. The tag of whatever
           was painted went with `activeResult` four lines above, which is where it lives. */
        setRunningMetric(null);
        setMetricConfirm(null);

        /* The style layers that describe the graph that has gone go with it: the shell's own
           7.2 defaults, whose selector names a run over nodes that have left, and every layer
           a run painted, whose binding reads a column that is no longer there. Without this a
           replacing load stacked a second set on top of the first, and every later load one
           more.

           BY SOURCE, never by position. The shell's layers carry its template id and a run's
           carry the run, so a sweep names a category rather than a set of indices; and an
           element-owned layer is never swept whatever the predicate says. The index walk this
           replaces took graphty-element's own base layer with it -- the one carrying every
           node's shape type -- and the next load then died in mesh building with "shape with
           type required to create mesh" and drew nothing at all. */
        const session = elementSession(graphtyRef.current?.graph);

        if (session !== null) {
            void session.styles.removeBySource(
                (source) =>
                    (source.by === "template" && source.templateId === SHELL_DEFAULTS_TEMPLATE_ID) ||
                    source.by === "run",
            );
        }

        // Focus cannot move here. The same state change empties the canvas, so any
        // element chosen now is about to be unmounted and focus would fall to the
        // body anyway -- which is what it did before this was a two-step. The
        // effect below moves it once React has committed the Empty tree.
        setBoundaryCrossings((n) => n + 1);
    }, []);

    /**
     * Moves focus to the canvas after a dataset boundary has been committed.
     *
     * It targets the region container rather than a focusable inside it, because at
     * a boundary the insides are exactly what has gone: the overlay layer, the
     * toolbar and the docks all leave with the Empty state, so the container is the
     * only thing still there to receive it.
     */
    useEffect(() => {
        if (boundaryCrossings === 0) {
            return;
        }

        const canvas = frameRef.current?.querySelector<HTMLElement>('[data-shell-region="canvas"]');

        if (canvas === null || canvas === undefined) {
            return;
        }

        canvas.tabIndex = -1;
        canvas.focus();
    }, [boundaryCrossings]);

    /**
     * Everything that is true once a load has been accepted, whatever started it.
     *
     * A load from the dialog, a dropped file and the `?test` sample all land here, so
     * the dataset name reaches the top bar, the Loaded data section gets its summary and
     * the counts are re-read, by one route rather than three that can drift.
     *
     * The session's first-load switch to Explore is NOT here, though it was: see the
     * effect below. Everything that is left is reversible by `reportLoadFailure`, which
     * is what lets this stay optimistic while the element is still reading.
     */
    const finishLoad = useCallback(
        (name: string, type: string, summary: LoadedDataSummary | undefined) => {
            setDatasetName(name);
            setDataLoaded(true);
            setLoadedSummary(summary);
            refreshGraphData();
        },
        [refreshGraphData],
    );

    /**
     * Spec 02 section 1.5: on the session's FIRST successful load the panel switches to
     * Explore, whatever was remembered -- and it waits for graphty-element to say the
     * load actually arrived.
     *
     * It used to fire from `finishLoad`, which runs as soon as the element ACCEPTS the
     * data, and that made it the last thing standing between a reader and their own
     * pasted text. `renderPanelBody` builds the panel body per activity, so switching the
     * activity unmounts the Data panel -- and the Load data dialog is the Data panel's,
     * with the reader's file, URL and pasted text inside it. On the session's first load
     * the switch therefore tore the dialog off the screen a beat after the Load button was
     * pressed and long before the element had said whether the data parsed, which is the
     * same lost input the dialog's whole stay-open contract exists to prevent, arriving by
     * a second door. A load that has not arrived has not "succeeded" in the sense 4107
     * spends this latch on, either -- `reportLoadFailure` already says so in as many words
     * when it puts the latch back.
     *
     * The completion count is the one signal every route shares: a dropped file, a sample
     * row, the dialog and the `?test` fixture all end in the element's own `data-loaded`.
     * Driving the switch from it keeps the rule in one place rather than in each of them.
     */
    useEffect(() => {
        if (loadCompletions === 0 || firstLoadDone.current) {
            return;
        }

        firstLoadDone.current = true;
        openActivity("explore");
    }, [loadCompletions, openActivity]);

    /* ---------------------------------------------------------------------- */
    /* `?test`: the built-in sample, so a developer can reach a populated shell */
    /* without going through the dialog. The fixture is defined once, in        */
    /* src/data/sampleGraphs.ts, which is also what FIXTURES.md measures.       */
    /* ---------------------------------------------------------------------- */

    const sampleLoaded = useRef(false);

    useEffect(() => {
        if (!graphReady || sampleLoaded.current) {
            return;
        }

        if (!new URLSearchParams(window.location.search).has("test")) {
            return;
        }

        const handle = graphtyRef.current;

        if (handle === null) {
            return;
        }

        sampleLoaded.current = true;

        // Through the ordinary load path, not around it: the counts are read from the
        // graph's own data events, the top bar gets the fixture's name rather than
        // `pasted-data`, and the first-load switch to Explore fires the way it does for
        // a file. The older shell wrote its counts by hand from the fixture's length,
        // which is the read-too-early bug this shell exists not to have.
        handle.loadData("json", { data: JSON.stringify(CAT_SOCIAL_NETWORK) }).catch((error: unknown) => {
            reportLoadFailureRef.current(loadFailureReason(error));
        });
        finishLoad(CAT_SOCIAL_NETWORK_NAME, "json", { format: "json", size: undefined });
    }, [finishLoad, graphReady]);

    /**
     * Loads what the dialog, a drop or a URL asked for, and says so either way.
     *
     * It returns its promise chain rather than floating it, because the Load data dialog
     * awaits it to decide whether to close: a dialog that closes on a refused load has
     * already called `resetState` and destroyed the file, URL or pasted text the reader
     * needs to try again (spec 1107-1108, "Errors stop the import"). The failure is
     * reported to the shell's own surfaces first and then re-thrown, so one rejection
     * serves both places it is needed.
     *
     * The chain ends in graphty-element's own awaited load, which resolves once the data
     * has arrived and rejects when it did not, so the dialog closes over a load that really
     * arrived. A load over a drawn dataset that asks to replace it passes `replace`: the
     * element keeps the current graph until the new data has parsed, so a bad file costs the
     * reader nothing. A load over nothing replaces too, so a failure leaves nothing half-read
     * on the canvas. A load that asks not to replace adds to the graph.
     *
     * `finishLoad` runs as the load starts, not after it: the status bar, the Loading
     * sub-state of 6.1 and the Data table drawer name the load while the element reads it,
     * and the failure path unwinds every claim it makes (`reportLoadFailure`). A replacing
     * load's records appear all at once when it completes, because the element swaps the
     * graph only once the new data has parsed; that includes a load into an empty graph,
     * which replaces so a failed first load leaves no half-read graph behind the Empty state. The session's
     * first-load switch to Explore waits for the element's `data-loaded` instead, because
     * that one unmounts the dialog: see the effect beside `finishLoad`.
     *
     * What it rejects with is the SENTENCE, not the raw throw. The dialog draws whatever
     * reaches it, and the element's own message names the format and never the file
     * ("Unexpected end of JSON input"), while 6.10 floor item 7 makes the reader's own
     * filenames a floor item -- so the rejection carries the same one sentence
     * {@link loadFailureSentence} draws on the Welcome zone and in the status bar toast,
     * built by the same formatter from the same two facts.
     * @param request - what to load, as the dialog or a drop built it.
     * @returns a promise that resolves once graphty-element has loaded the data, and rejects
     * when the load was refused or the element reported it did not arrive.
     */
    const handleLoad = useCallback(
        async (request: LoadDataRequest): Promise<void> => {
            /* A new attempt clears the last one's sentence. The two surfaces draw whatever
               this holds, and a failure that outlived the load it described would be a
               second wrong claim in place of the first. */
            setLoadFailure(null);

            const drawn = drawnDatasetRef.current;
            /* Held in a local as well as on the ref, because the rejection is built seconds
               later and the ref belongs to whatever load is most recent by then. */
            const requestName = loadRequestName(request);
            const fileName = requestName ?? UNNAMED_LOAD_SOURCE;

            /* Recorded BEFORE the load starts: see {@link PendingLoad}. */
            const pending: PendingLoad = {
                fileName,
                survivesFailure: drawn.loaded,
                previousName: drawn.name,
                previousSummary: drawn.summary,
            };
            pendingLoadRef.current = pending;

            const format = request.format === "auto" ? undefined : request.format;
            const options = { replace: request.replaceExisting || !drawn.loaded };

            try {
                const handle = graphtyRef.current;

                /* Checked before anything is claimed, so a host that is not up yet reaches
                   the reader as a sentence instead of returning quietly. */
                if (handle === null) {
                    throw new Error(GRAPH_NOT_INITIALISED);
                }

                let loading: Promise<unknown>;
                if (request.inputMethod === "url" && request.url !== undefined) {
                    loading = handle.loadFromUrl(request.url, format, options);
                } else if (request.inputMethod === "file" && request.file !== undefined) {
                    loading = handle.loadFromFile(request.file, format, options);
                } else if (request.inputMethod === "paste" && request.data !== undefined) {
                    loading = handle.loadData(format ?? "json", { data: request.data }, options);
                } else {
                    throw new Error(NO_SOURCE_NAMED);
                }

                if (request.replaceExisting) {
                    // A replacing load crosses the same boundary as Close dataset (6.12). After
                    // the load has started is soon enough: the element swaps nothing until the
                    // new data has parsed, and a request that named no source never gets here.
                    //
                    // KNOWN GAP: the boundary is crossed when the load STARTS, so a replacing
                    // load that then fails has already dropped the selection, the result and
                    // the run layers of the graph it leaves on screen. It cannot simply move to
                    // when the load resolves: the element emits `data-loaded` before the
                    // promise settles, and the load-defaults effect that event drives would by
                    // then have applied the new dataset's defaults, which a late boundary would
                    // wipe along with its latch, completion count and pending suggested card.
                    crossDatasetBoundary();
                }

                finishLoad(fileName, format ?? "auto", loadedDataSummary(request));

                await loading;
            } catch (error: unknown) {
                console.error("[shell] failed to load data:", error);

                const reason = loadFailureReason(error);

                /* Through the ref, not through the captured callback: this `catch` runs
                   SECONDS after the render that captured `reportLoadFailure`, which closes
                   over `activeActivity` -- after the first-load switch to Explore, in fact
                   -- and the stale copy would strand the reader on a panel the rail has
                   just disabled. Only while this load is still the latest: a newer load owns
                   the ref by now, and an overtaken load (graphty-element rejects it with
                   E_SUPERSEDED) must not unwind the newer load's claims. */
                if (pendingLoadRef.current === pending) {
                    reportLoadFailureRef.current(reason);
                }

                /* The sentence, not the raw throw: the dialog prints what it is handed and
                   the element's message never names the file the reader chose (6.10 floor
                   item 7). Both drop routes discard this rejection, so the dialog is its
                   only reader. */
                throw new Error(loadFailureSentence({ fileName, reason }));
            }
        },
        [crossDatasetBoundary, finishLoad],
    );

    /**
     * Loads one row of the sample library, and optionally runs its suggested first card.
     *
     * It goes through the ordinary load paths rather than around them -- the `?test`
     * fixture's `loadData` for an inline sample, `handleLoad`'s own `loadFromUrl` for a
     * served one -- so the counts come from the graph's own data events and the first
     * load switches the panel to Explore exactly as a file does. It crosses the dataset
     * boundary first, as `handleLoad` does for a replacing load, because a sample click
     * IS a replacing load.
     *
     * The suggested card is NOT run here. It is recorded on a ref and run by the
     * load-defaults effect once the 7.2 defaults have landed, so the grouping colours are
     * painted over the neutral base rather than under it, and the degrees the labels need
     * are already read back. That is what makes the hint one interaction instead of two.
     * @param record - the manifest row the reader clicked.
     * @param runSuggested - whether the row's closing hint was what was clicked.
     */
    const loadSample = useCallback(
        (record: SampleRecord, runSuggested: boolean) => {
            setLoadFailure(null);

            /* Recorded before the load starts, exactly as `handleLoad` records it and for
               the same reason: a sample whose file does not parse fails long after this
               function has returned. A sample click is a REPLACING load, which keeps the
               graph already drawn when it fails. */
            const pending: PendingLoad = {
                fileName: record.fileName,
                survivesFailure: drawnDatasetRef.current.loaded,
                previousName: drawnDatasetRef.current.name,
                previousSummary: drawnDatasetRef.current.summary,
            };
            pendingLoadRef.current = pending;

            const handle = graphtyRef.current;

            if (handle === null) {
                console.error("[shell] the graph is not initialised yet");
                reportLoadFailure(loadFailureReason(new Error(GRAPH_NOT_INITIALISED)));

                return;
            }

            /* A sample click is a REPLACING load, so it takes `handleLoad`'s route
               through the 6.12 boundary rather than merging into whatever is drawn: the
               selection, the stale result, the layers that encoded the old graph and the
               latch that would otherwise deny the new dataset its own 7.2 defaults all go,
               and the element swaps the records once the sample has parsed. */
            crossDatasetBoundary();

            // After the boundary, which clears it: the pending card belongs to the load
            // that is starting, not to the dataset that has just gone.
            pendingSuggestedRef.current = runSuggested ? (record.suggestedCapability ?? null) : null;

            const { source } = record;

            const loading =
                source.kind === "inline"
                    ? handle.loadData(source.format, { data: JSON.stringify(source.payload) }, { replace: true })
                    : handle.loadFromUrl(source.url, source.format, { replace: true });

            finishLoad(record.fileName, source.format, { format: source.format, size: undefined });

            loading.catch((error: unknown) => {
                console.error("[shell] failed to load the sample:", error);

                /* Which also clears the pending suggested card: the hint belonged to the
                   sample that did not arrive. Through the ref, and only while this is still
                   the latest load, for the reasons `handleLoad` gives. */
                if (pendingLoadRef.current === pending) {
                    reportLoadFailureRef.current(loadFailureReason(error));
                }
            });
        },
        [crossDatasetBoundary, finishLoad, reportLoadFailure],
    );

    /* ---------------------------------------------------------------------- */
    /* Style layers, from graphty-element as the single source of truth        */
    /* ---------------------------------------------------------------------- */

    /**
     * The stack, as the element publishes it after every edit.
     *
     * The element's OWN layers are dropped on the way in. They are the floor every picture is
     * painted on -- the node and edge appearance before anything else is asked for -- they are
     * locked against removal, editing and reordering, and a list that drew them would offer a
     * reader three controls that all refuse. `locked` is exactly `source.by === "element"`,
     * which replaces identifying them BY NAME from a list of two strings: the shell used to do
     * that, and its own comment admitted a reader who called their layer "default" lost the
     * suppression.
     * @param detail - what the element published.
     */
    const handleStylesChange = useCallback((detail: StylesChangedDetail) => {
        setLayers(detail.layers.filter((layer) => !layer.locked));
    }, []);

    /**
     * Applies a patch to one layer, by id.
     *
     * The one write path for everything the style-layer inspector edits: a channel's fixed
     * value, the selector, the name. `update` merges the patch one key deep over the layer's
     * current specification, checks the result exactly as a new layer would be checked, and
     * repaints before it commits -- so a refused edit leaves the stack exactly as it was rather
     * than leaving the list saying one thing and the canvas showing another.
     *
     * There is no repaint call beside it. The verb repaints; the wrapper that used to do it by
     * hand existed because the old `addLayer` was a push with a "TODO: recalculate" comment.
     * @param layerId - the layer to change.
     * @param patch - what to change about it.
     */
    const updateLayer = useCallback((layerId: string, patch: Partial<LayerSpec>) => {
        const session = elementSession(graphtyRef.current?.graph);

        if (session === null) {
            return;
        }

        void session.styles.update(layerId, patch).then(
            () => undefined,
            (error: unknown) => {
                console.error("[shell] the element refused the layer edit:", error);
            },
        );
    }, []);

    /**
     * Turns one channel's rule into the fixed value it currently produces, so it can be edited.
     *
     * The paired verb of `styles.explain()`, which reports a channel worked out from the data
     * as not editable: a control offered there would take a value, write it, and be painted
     * over by the rule on the same repaint.
     * @param layerId - the layer carrying the rule.
     * @param channel - the channel the rule paints.
     */
    const resolveLayerChannel = useCallback((layerId: string, channel: Channel) => {
        const session = elementSession(graphtyRef.current?.graph);

        if (session === null) {
            return;
        }

        void session.styles.resolveToStatic(layerId, channel).then(
            () => undefined,
            (error: unknown) => {
                console.error("[shell] the element refused to fix the channel's value:", error);
            },
        );
    }, []);

    /**
     * What the layer list reports: a rename, or a reorder.
     *
     * Those are the only two edits the list itself makes -- every channel edit comes through
     * {@link updateLayer} from the inspector -- and both are said by ID. The reconciliation
     * this replaces compared positional ids (`layer-${index}`) to tell a rename from a move,
     * read the live layer back out of the manager, spread it, and wrote the whole thing again;
     * one off-by-one in the index arithmetic beside it once took the element's own base layer
     * with it and the next load died in mesh building.
     * @param next - the list as the reader left it.
     */
    const handleLayersChange = useCallback(
        (next: LayerItem[]) => {
            const session = elementSession(graphtyRef.current?.graph);

            if (session === null) {
                return;
            }

            for (const item of next) {
                const before = layers.find((layer) => layer.id === item.id);

                if (before !== undefined && before.name !== item.name) {
                    updateLayer(item.id, { name: item.name });
                }
            }

            /* A drag moves ONE layer, so the lists differ over one span and the dragged layer
               sits at one end of it: at the start when it moved down the stack (the old span's
               last entry is now its first), at the end when it moved up. Taking the first
               mismatch instead named a layer that was only pushed aside when the drag went up
               two or more places, and moving that one was a no-op.

               The move is said as "put this one below that one", which is the element's own
               verb. `null` is the top of the stack, where the dropped layer has nothing above it. */
            const first = next.findIndex((item, at) => layers[at]?.id !== item.id);

            if (first !== -1) {
                let last = next.length - 1;

                while (last > first && layers[last]?.id === next[last].id) {
                    last -= 1;
                }

                const at = next[first].id === layers[last]?.id ? first : last;
                const above = next[at + 1];

                void session.styles.move(next[at].id, above?.id ?? null).then(
                    () => undefined,
                    (error: unknown) => {
                        console.error("[shell] the element refused the reorder:", error);
                    },
                );
            }
        },
        [layers, updateLayer],
    );

    /**
     * Adds an empty layer over every node, for a reader to paint into.
     *
     * The element mints the id. A layer added here says it is the READER's --
     * `source.by === "user"` is what a specification with no source of its own becomes -- which
     * is what makes a later run's encoding stand aside for it rather than paint over it.
     */
    const handleAddLayer = useCallback(() => {
        const session = elementSession(graphtyRef.current?.graph);

        if (session === null) {
            return;
        }

        const name = `New Layer ${String(layerCounter.current)}`;

        layerCounter.current += 1;

        void session.styles.add({ name, target: "node", selector: { match: "everything" } }).then(
            () => undefined,
            (error: unknown) => {
                console.error("[shell] the element refused the new layer:", error);
            },
        );
    }, []);

    const handleApplyLayout = useCallback((type: string, config: Record<string, unknown>) => {
        setLayoutType(type);
        setLayoutConfig(config);
    }, []);

    const handleSelectionChange = useCallback((detail: SelectionChangedDetail) => {
        /* What the last pointer gesture picked, written synchronously so the canvas tap
           handler below can read it inside the same gesture. graphty-element fires
           `selection-changed` on POINTERUP, one event before React's click, and fires it
           with a null id when the pick hit nothing -- measured, and asserted by
           `__tests__/AppShell.test.tsx`, which is what makes this a ref and not a timer. */
        lastSelectionRef.current = detail.currentNodeId === null ? null : String(detail.currentNodeId);

        if (detail.currentNodeId === null) {
            setSelectedNode(null);

            return;
        }

        setSelectedNode({
            id: String(detail.currentNodeId),
            elementId: detail.currentNodeId,
            attributes: detail.currentNodeData,
        });
    }, []);

    /*
     * A `handleCanvasTap` callback stood here until 2026-09-14. A tap on the canvas below
     * 1280 px dismissed whichever region overlay was open, unless the tap had SELECTED
     * something (the carve-out that stopped the tap which fills the inspector from also
     * being the tap that dismissed it) and unless a latch vetoed it.
     *
     * It went with the narrow layout itself. Below `NARROW_BREAKPOINT` the shell now
     * draws a "screen too small" state instead of laying out, so there is no canvas to
     * tap and no overlay for a tap to dismiss; at or above it both sidebars are docked
     * columns that nothing but the reader's own control may hide. `CanvasRegion` still
     * accepts an `onCanvasTap`, and the shell deliberately passes none: an unused hook is
     * cheaper to leave than a behaviour nobody can predict.
     */

    /* ---------------------------------------------------------------------- */
    /* Rail routing. Settings and Help never become the active activity, so    */
    /* the rail's marker stays on the open panel (spec 03 sections 2.7, 2.8).  */
    /* ---------------------------------------------------------------------- */

    const handleActivityClick = useCallback(
        (activity: ActivityId) => {
            if (activity === "settings") {
                /* The rail names no section, so Settings opens where it was left --
                   6.5's memory. Only a caller that came looking for one pane asks
                   for one, which today is the assistant's setup prompt. */
                if (settingsOpen) {
                    setSettingsOpen(false);
                } else {
                    openFullPanelOverlay("settings");
                }

                return;
            }

            if (activity === "help") {
                // Symmetric with Settings above, and 6.11 requires it: no two
                // transients of different classes are open at once, and a surface
                // replaces an open menu rather than leaving it behind a scrim. Help is
                // a menu and Settings is a full-panel overlay, so one has to go. The
                // rail is not covered by Settings -- it starts at the rail's right
                // edge -- so this row stays clickable while Settings is open, and
                // without this the menu opened underneath it and read as a dead button.
                setSettingsOpen(false);
                setHelpOpen((open) => !open);

                return;
            }

            setHelpOpen(false);
            setSettingsOpen(false);
            selectActivity(activity);
        },
        [openFullPanelOverlay, selectActivity, settingsOpen],
    );

    const openPanelAt = useCallback(
        (activity: PrimaryActivityId) => {
            setHelpOpen(false);
            setSettingsOpen(false);
            openActivity(activity);
        },
        [openActivity],
    );

    /* ---------------------------------------------------------------------- */
    /* The one capability this slice can run end to end (7.3 item 3)           */
    /* ---------------------------------------------------------------------- */

    /**
     * Runs community detection, paints the groups and writes the reading.
     *
     * 7.3 asks a card click to do three things at once: run the method with size-aware
     * defaults, open its home panel, and write the reading into the inspector. Two of the
     * three are here; the third -- scrolling to the control and highlighting it for two
     * seconds -- is not built, because nothing in the DOM identifies a panel section (see
     * the file header's list of what is deliberately absent).
     *
     * The order is load-bearing. The run comes first, its results are read back, the
     * colour layers are built from what came back and only then added, because
     * graphty-element's own style-changed handler re-evaluates selectors WITHOUT
     * `algorithmResults` -- a layer added before the run would match nothing. The group
     * ids are only knowable after the run in any case.
     *
     * It leaves exactly ONE history entry (7.1 item 2). The encoding does not get a second
     * one: nothing in this slice can undo a style layer independently of the result, so a
     * second row would carry an Undo that does nothing.
     *
     * The insight card is retired by the run, not by the click, and only for the routes
     * 7.3 says retire one -- hence the flag rather than a retirement at the call site. A
     * click on the strip card itself retires nothing (spec 7300: that is the Done badge's
     * job), and neither does a run that never happened.
     * @param options - what this route asks of the run.
     * @param options.retiresInsightCard - whether a COMPLETED run retires the Groups card.
     */
    const runFindGroups = useCallback(
        async (options: { readonly retiresInsightCard: boolean }): Promise<void> => {
            const graph = asElementGraph(graphtyRef.current?.graph);

            if (graph === null) {
                console.error("[shell] the graph is not initialised yet");

                return;
            }

            const session = graph.getSession();
            const stats = await runCommunityDetection(graph);

            /* The RUN painted the groups, not the shell. A community result publishes a group
               per node, so the session derives a categorical colour encoding from the result's
               shape on the run's first completion -- scoped to the nodes the run actually
               grouped, with a palette out of the element's own catalogue. The shell used to
               build one layer per group by hand, capped at eight because the element's palette
               helper cycles past that and group 9 would have been painted like group 1.

               Every other run's layers stay: layers stack, and the reader decides which one is
               on top. A re-served run keeps its place; when a layer above hides its colours,
               the legend says so ("painted over by"). */
            const { runId } = stats;

            const block = runColourBlock(session, runId);
            const colouredGroupCount = block === undefined ? 0 : block.swatches.length;

            const statistics = {
                ...stats,
                colouredGroupCount: Math.min(stats.groupCount, colouredGroupCount),
                encodingApplied: block !== undefined,
            };

            /* A selected node outranks a result on this surface, so the result is only
               reachable once the selection is cleared -- which is also what 7.3 means by the
               reading being what the reader sees immediately after the click.

               The ELEMENT is told too, and that is not a tidiness clause. SelectionManager.select
               returns early when the node handed to it is the one it already holds, emitting
               nothing -- so a shell that cleared only its own state left the element still
               holding that node, and every route back to it (its ranked row, its Most connected
               row, a click on the node itself) was inert until the reader picked something
               else. */
            setSelectedNode(null);
            graphDeselectNode(graphtyRef.current?.graph ?? null);
            setActiveResult({
                /* Stable per run KIND: a re-run of Groups is the same result identity,
                   which is what the reader means by it. */
                id: COMMUNITY_RESULT_ID,
                title: COMMUNITY_RESULT_TITLE,
                headline: communityHeadline(statistics),
                reading: communityReading(statistics),
                runRecord: runRecordLine({
                    method: COMMUNITY_METHOD_NAME,
                    /* No parameter was moved off its default, so none is named, and the run
                       was exact, complete and unfiltered, so no caveats line is passed at
                       all -- which is what keeps "Approximate (sample of 200)" loud when one
                       day there is one (spec 4843). */
                    nonDefaultParameters: [],
                    scope: `${formatCount(stats.nodeCount)} nodes`,
                }),
                body: communityResultBody(statistics),
                /* The applied half, all four fields together or none of them: the layer's own
                   name, a colour some node really carries, the TAG the two layer verbs act on,
                   and how many layers that tag holds, which is the count Remove result names
                   before it acts (spec 2241-2249). A run that coloured nothing passes none of
                   them and the card draws its un-applied form. */
                ...(block === undefined
                    ? {}
                    : {
                          layerName: session.styles.get(block.layerId)?.name ?? COMMUNITY_METHOD_NAME,
                          ...(topSwatchColour(block) === undefined
                              ? {}
                              : { stateSwatch: topSwatchColour(block) }),
                          layerRunId: runId,
                          layerCount: session.styles.list().filter((layer) => layer.source.by === "run" && layer.source.runId === runId).length,
                      }),
            });
            setColourChannel(canvasLegendChannels(session.styles.legend()));
            openPanelAt("analyze");
            undoStore.push({
                id: `groups-${String(Date.now())}`,
                category: "algorithmResult",
                title: "Found groups (Communities, Louvain)",
                activity: "analyze",
                activityLabel: ACTIVITY_TITLES.analyze,
                at: Date.now(),
                destinationTitle: "Ran Groups (Communities, Louvain). Opens Analyze at its card",
            });

            /* Spec 5643-5648 and 7300: the card is retired once the reader has been taken
               where it was taking them. After the run, never before it -- a run that threw,
               or one the reader never confirmed, has retired nothing. */
            if (options.retiresInsightCard) {
                setInsightsMemory((current) => withRetiredCapability(current, "community-detection"));
            }
        },
        [openPanelAt, undoStore],
    );

    /* ---------------------------------------------------------------------- */
    /* The three node metrics (spec 2307), and the size gate in front of them  */
    /* ---------------------------------------------------------------------- */

    /*
     * What each Suggested row's Run says about what it will cost, per card id.
     *
     * Every string comes from the gate and none is composed here: the label, the tooltip
     * and the warning sentence are one register, and the card and the confirm dialog draw
     * the SAME sentence (spec 2043-2047) precisely because neither builds it. A cost
     * string formatted at a call site would also escape the table-driven test that holds
     * all of them to spec 1918-1927.
     */
    const suggestedRunCosts = useMemo(() => {
        const labels: Record<string, string> = {};
        const titles: Record<string, string> = {};
        const warnings: Record<string, string> = {};

        for (const [cardId, metric] of Object.entries(SUGGESTED_CARD_METRICS)) {
            const estimate = metricEstimates[metric];

            labels[cardId] = estimate.runLabel;
            titles[cardId] = estimate.runTitle;

            if (estimate.warningSentence !== undefined) {
                warnings[cardId] = estimate.warningSentence;
            }
        }

        return { labels, titles, warnings };
    }, [metricEstimates]);

    /* Which Suggested ROW is in flight, in the panel's own vocabulary. The panel keys by
       card id and the shell holds a metric id, so the map is read backwards here rather
       than either side being renamed to suit the other. */
    const runningSuggestedCardId = useMemo(
        () =>
            runningMetric === null
                ? undefined
                : Object.keys(SUGGESTED_CARD_METRICS).find((id) => SUGGESTED_CARD_METRICS[id] === runningMetric),
        [runningMetric],
    );

    /**
     * Runs one node metric, paints its colour ramp and writes the reading.
     *
     * This mirrors `runFindGroups` line for line and for the same reasons; what differs is
     * named here rather than left to be inferred.
     *
     * The order is load-bearing and identical: the run comes first, the ranking is read
     * back from it, the layer is built and only then added, because graphty-element's own
     * style-changed handler re-evaluates selectors WITHOUT `algorithmResults` and never
     * runs calculated values -- a layer added before the pass matches nothing and paints
     * nothing.
     *
     * What is new, in order:
     *
     * 1. The SIZE GATE. Unless the caller has already confirmed, the estimate decides:
     *    "run" falls straight through, "ask" and "warn" open the dialog and RETURN, and
     *    the dialog re-enters here with `confirmed` true. Every string the gate is allowed
     *    to say comes from `estimateMetricCost`, which is the one place a table-driven test
     *    can hold it to spec 1918-1927 (no cost-class word ever reaches the reader).
     * 2. The DEGREE SHORT CIRCUIT. The 7.2 load already ran a degree pass and the shell is
     *    still holding it, so the degree card reads that rather than running a second
     *    identical pass over the same graph (ruling 3).
     * 3. AUTO-APPLY, as a decision rather than an assumption. A hand-authored layer that
     *    already drives node colour holds the channel (limit 2), so the run adds nothing,
     *    the legend gets no channel, and the result still appears -- which is the whole
     *    point: the reading is a floor item and the encoding is not.
     * 4. ONE encoding at a time, across BOTH families. Every metric tag comes off before
     *    this metric's goes on, and so does the community tag -- by tag and never by
     *    index, exactly as one community run owns one set of layers. Node colour has one
     *    owner, whichever shape holds it: a metric ramp painted over live group colours
     *    won on the canvas (calculated values merge over the static style, Node.ts:151)
     *    while the legend and the card went on naming the groups underneath it.
     *
     * It leaves exactly ONE history entry (7.1 item 2). The encoding does not get a second
     * one: nothing here can undo the layer independently of the result.
     * @param request - what to run, and what this route asks of the run.
     */
    const runNodeMetricCard = useCallback(
        async (request: MetricRunRequest): Promise<void> => {
            const { metric, confirmed } = request;
            const graph = asElementGraph(graphtyRef.current?.graph);

            if (graph === null) {
                console.error("[shell] the graph is not initialised yet");

                return;
            }

            if (!confirmed) {
                /* Asked again HERE rather than read off the memo above, because this is the
                   click and the memo is a frame old. The element's estimate improves as it
                   learns: a run of the same algorithm on this machine is timed and the next
                   estimate is scaled from that timing rather than modelled, so the number
                   the reader is asked to accept should be the freshest one the element has.
                   It is O(1) over the shape the session already maintains. */
                const estimate = metricCost(graph.getSession(), metric);

                if (estimate.verdict === "unavailable") {
                    /* The element will not run this on this graph and said why. Nothing is
                       confirmed, because there is nothing a Run button could do: the card
                       is already drawing the same sentence under its own Run. */
                    console.error(`[shell] the element cannot run ${metric}:`, estimate.warningSentence);

                    return;
                }

                if (estimate.verdict !== "run") {
                    /* The route's own flag rides along on the confirm, because the dialog
                       re-enters this callback and the run it finally performs is still the
                       panel's run or still the strip's. Retiring a card for a run the
                       reader has not yet agreed to -- which is what a retirement at the
                       call site did -- takes the card away for a Cancel. */
                    setMetricConfirm({ metric, estimate, retiresInsightCard: request.retiresInsightCard });

                    return;
                }
            }

            setRunningMetric(metric);

            try {
                /* The shell no longer decides whether the degree pass already covers this
                   graph, because the element decides it better. Starting a run the session
                   already holds returns that run untouched when nothing it measured has
                   moved, and re-executes it when the graph has -- compared by the scope's
                   own membership digest rather than by a flag the shell keeps in sync by
                   hand. The short circuit this replaces was the shell keeping that flag,
                   and it got it wrong on an additive load: the held pass described one file
                   while the ranking reported its node count as the whole graph. */
                const ranking = await runNodeMetric(graph, metric);
                const top = ranking.byValueDescending[0];

                if (top === undefined) {
                    /* Nothing was measured, so there is no top node and no reading to
                       write. A result card drawn from an empty ranking would have to
                       invent both, which is the one thing this surface may not do. */
                    console.error("[shell] the run measured no node, so there is no reading to write");

                    return;
                }

                /* The RUN painted the ramp, if it painted one. A node metric publishes a value
                   per node, so the session derives a sequential colour encoding from the
                   result's shape on the run's first completion, scoped to the nodes the run
                   measured -- and it stands aside when a layer somebody wrote by hand already
                   drives node colour. The shell used to build the ramp, decide whether it was
                   allowed to paint, and mark the reader's own edits so a later run would not
                   overwrite them; all three are the element's now.

                   Every other run's layers stay, under this one: the stack order decides which
                   colour wins, and the reader can reorder, hide or remove any of them. */
                const session = graph.getSession();
                const { runId } = ranking;

                /* A degree ranking read back off the load's own pass has a run behind it that
                   was deliberately told not to paint (`{ style: false }`, analysis/runs.ts), so
                   the picture has to be asked for here -- unless a layer somebody wrote by hand
                   already drives node colour, which is the one case a run stands aside for. */
                if (runId !== undefined) {
                    if (runColourBlock(session, runId) === undefined && colourHeldBy(layers) === undefined) {
                        await session.styles.encode({ run: runId, channel: "node.color" }).then(
                            () => undefined,
                            (error: unknown) => {
                                console.error("[shell] the element refused the metric encoding:", error);
                            },
                        );
                    }
                }

                const block = runId === undefined ? undefined : runColourBlock(session, runId);
                const heldBy = block === undefined ? colourHeldBy(layers) : undefined;

                if (heldBy !== undefined) {
                    /* Spec 2222-2226 asks the suppressed card's TITLE to name the layer that
                       holds the channel instead, and `ResultInspector` has no title field for
                       it, so that half waits on a surface this slice does not build. Saying it
                       once here is better than the reader being told nothing at all. */
                    console.warn(`[shell] the encoding was not applied: ${heldBy} holds node colour`);
                }

                const definition = NODE_METRIC_DEFINITIONS[metric];

                /* PageRank is the only one of the three that reports convergence, and it
                   reports it by ABSENCE as well as by value: an absent flag means the
                   element said nothing, not that the run failed to converge. So the test
                   is `=== false`, never `!converged`. */
                const caveats = caveatsLine(
                    ranking.converged === false && ranking.iterations !== undefined
                        ? { notConvergedAfterIterations: ranking.iterations }
                        : {},
                );

                /* The spine's last hop: a ranked row selects the node it names, by the
                   same route the inspector's own neighbour rows take. The aggregate tie
                   row carries no node id and stays inert text (RT-6).

                   `row.nodeId` is the ELEMENT's own id and `row.name` is the printed one,
                   and the two are different types on two of the three shipped samples:
                   karate.gml and football.gml declare integer ids, GMLDataSource parses
                   them with parseInt, and the element's node Map is keyed on the number.
                   The ranking used to carry `String(node.id)`, so `selectById("1")` missed
                   the key `1`, returned false, emitted nothing, and every ranked row on
                   those two samples was inert. Print the label, select the id. */
                const body: ResultBodyRow[] = nodeMetricResultBody(ranking).map((row) => {
                    const { nodeId } = row;

                    return {
                        name: row.name,
                        value: row.value,
                        ...(row.rank === undefined ? {} : { rank: row.rank }),
                        ...(nodeId === undefined
                            ? {}
                            : {
                                  onSelect: () => {
                                      graphSelectNode(graphtyRef.current?.graph ?? null, nodeId);
                                  },
                              }),
                    };
                });

                /* A selected node outranks a result on this surface, so the result is only
                   reachable once the selection is cleared -- the same clause runFindGroups
                   carries, and for the same reason, including telling the ELEMENT: it
                   ignores a select for the node it already holds, so a node selected when
                   the run started could not be re-selected by any route afterwards. */
                setSelectedNode(null);
                graphDeselectNode(graphtyRef.current?.graph ?? null);
                /* ONE statistics literal feeding BOTH the expanded reading and the
                   collapsed headline. Two literals would be two spellings of one
                   measurement, free to drift the moment either template grew a field. */
                const metricStatistics = {
                    metric,
                    topId: top.id,
                    topValue: top.value,
                    medianValue: ranking.medianValue,
                    nodeCount: ranking.nodeCount,
                    rankedCount: ranking.rankedCount,
                    tiedAtMinimum: ranking.tiedAtMinimum,
                };

                setActiveResult({
                    id: metric,
                    title: definition.plainName,
                    headline: nodeMetricHeadline(metricStatistics),
                    reading: nodeMetricReading(metricStatistics),
                    /* None of the three takes a non-default parameter: degree and
                       betweenness publish no options schema at all, and PageRank runs at
                       its own defaults, so there is nothing to name. */
                    runRecord: runRecordLine({
                        method: definition.methodName,
                        nonDefaultParameters: [],
                        scope: `${formatCount(ranking.rankedCount)} nodes`,
                    }),
                    ...(caveats === undefined ? {} : { caveats }),
                    body,
                    distribution: metricDistribution(ranking),
                    /* Applied: the card names the layer that holds the channel, the
                       colour the TOP node of this run actually carries, the tag the two
                       layer verbs act on and the one layer it holds. Suppressed: NONE of
                       them is passed, so the card draws its un-applied form. Spec 2222-2226
                       asks the suppressed card's TITLE to name the layer that holds the
                       channel instead -- `decision.heldBy` is carrying exactly that string
                       -- and ResultInspector has no title field for it, so that half waits
                       on a surface this slice does not build.

                       The swatch is read off `ranking.maxFraction`, which is the same
                       number the legend's top stop and the top node on the canvas are read
                       off (legendChannels.ts:234). It was `viridisAt(1)` -- the palette's
                       emblem rather than a colour on the canvas -- so a run whose fractions
                       are all 0 (degree on an edgeless graph, betweenness on a ring) drew a
                       yellow swatch beside three deep-purple legend stops and a deep-purple
                       graph. */
                    ...(block === undefined || runId === undefined
                        ? {}
                        : {
                              layerName: session.styles.get(block.layerId)?.name ?? definition.plainName,
                              ...(topSwatchColour(block) === undefined
                                  ? {}
                                  : { stateSwatch: topSwatchColour(block) }),
                              layerRunId: runId,
                              layerCount: session.styles
                                  .list()
                                  .filter((layer) => layer.source.by === "run" && layer.source.runId === runId).length,
                          }),
                });

                /* Only a run that PAINTED touches the channel. A suppressed run painted
                   nothing, so whatever is on the canvas is still what the last encoding
                   put there and the legend must go on naming it: clearing the channel here
                   took the legend off the screen while the colours it named were still on
                   it, which is exactly the obligation floor item 5 states. */
                if (block !== undefined) {
                    setColourChannel(canvasLegendChannels(session.styles.legend()));
                }

                openPanelAt("analyze");
                undoStore.push({
                    id: `${metric}-${String(Date.now())}`,
                    category: "algorithmResult",
                    title: `Ran ${definition.plainName} (${definition.technicalName})`,
                    activity: "analyze",
                    activityLabel: ACTIVITY_TITLES.analyze,
                    at: Date.now(),
                    destinationTitle: `Ran ${definition.plainName} (${definition.technicalName}). Opens Analyze at its card`,
                });

                /* 7.3 conditions the retirement on the capability having been RUN, so it
                   happens here -- after the result is on screen -- and not at the call
                   site. Before this, cancelling the size gate's confirm retired the card
                   for a run that never started, permanently and for every dataset, because
                   nothing un-retires one. */
                if (request.retiresInsightCard) {
                    setInsightsMemory((current) =>
                        withRetiredCapability(current, NODE_METRIC_INSIGHT_CAPABILITIES[metric]),
                    );
                }
            } finally {
                /* In a `finally` so a throw inside the pass cannot leave every Suggested
                   Run disabled for the rest of the session with no way back. */
                setRunningMetric(null);
            }
        },
        [degreeResults, layers, openPanelAt, undoStore],
    );

    /* ---------------------------------------------------------------------- */
    /* 7.2: what a load decides, and the degree pass it runs in the background */
    /* ---------------------------------------------------------------------- */

    /*
     * The arrangement and the label budget, applied once per dataset. Nothing else runs
     * (7.2).
     *
     * WHICH ARRANGEMENT IS THE ELEMENT'S ANSWER, not this file's and not the defaults
     * module's. `recommendLayout` reads the graph's shape and how many nodes already carry
     * a coordinate, resolves each candidate against the element's own layout catalogue, and
     * never names one the element cannot serve at this size or without an input nobody has
     * supplied. What it replaced was the same three cases decided here from a copy of that
     * catalogue -- a copy that named "grid" as 7.2's first choice for years after the engine
     * behind it stopped existing.
     *
     * The degree pass is awaited because three of the four decisions need it: the size
     * scale reads `degreePct`, the label selector needs the labelCount-th degree as its
     * cut, and the Search card's example is the highest-degree node's id.
     *
     * It waits for the load to be COMPLETE rather than for its first chunk, which is what
     * `loadCompletions` counts. graphty-element loads in chunks with an await between
     * them, so on any file over about a thousand nodes every fact 7.2 branches on -- the
     * layout, the label budget, the size scale, Most connected, the Search example, and
     * the above-threshold Performance branch itself -- would otherwise be measured over
     * whatever arrived first and never corrected. The element says when the last chunk is
     * in (DATA_LOADED_EVENT), so the one-shot latches on that instead of recomputing per
     * chunk: the numbers are right the first time, the layers are added once, and the
     * suggested card of 7.1 item 2 runs once, on the whole graph.
     */
    useEffect(() => {
        if (!dataLoaded || loadCompletions === 0 || loadDefaultsAppliedRef.current) {
            return;
        }

        if (graphData.nodes.length === 0) {
            return;
        }

        const graph = asElementGraph(graphtyRef.current?.graph);

        if (graph === null) {
            return;
        }

        loadDefaultsAppliedRef.current = true;

        const defaults = loadDefaults({ nodeCount: graphStatistics.nodeCount });
        const session = graph.getSession();

        /* `seededNodeCount`, NOT `positions.placedCount`, and the difference is the whole
           decision. The position array is written by the importer AND by every running layout,
           so one animation frame after a file with no coordinates loads, every node carries a
           position -- the layout put it there. This effect runs after that frame, so reading the
           live count answered "keep the arrangement the data arrived with" for a file that
           arrived with none, and froze the graph at whatever the first step of a force layout
           reached. The seeded count is what the importer itself placed and nothing else writes. */
        const arrangement = recommendLayout(graphStatistics, { placedNodes: session.seededNodeCount });

        if (arrangement !== undefined) {
            /* `engine` and not `id`: `id` is the arrangement's public name ("force"), and
               `setLayout` takes the engine that draws it ("ngraph"). No configuration of the
               shell's own goes with it -- the element's recommendation is the whole decision,
               and options belong to the Layout panel, where a reader can see them. */
            setLayoutType(arrangement.layout.engine);
            setLayoutConfig({});
        }

        const apply = async (): Promise<void> => {
            const degrees = await runDegreePass(graph);

            /* Stamped with the graph it was just measured over. Both counts, not only the
               nodes: a file that adds edges between nodes that are already here changes
               every degree in the ranking without changing its length. */
            setDegreePass({ results: degrees, nodeCount: graphStatistics.nodeCount, edgeCount: graphStatistics.edgeCount });

            /* NO node colour or size layer, which is a deliberate departure from 7.2's
               "node size by degree on a square-root scale" and "a single neutral node
               color".

               The element's own `default` layer carries node and edge values that were
               tuned by hand over a long stretch, and both of ours overrode them from the
               first frame. The size layer was the worse of the two: `degreePct` is
               `degree / maxDegree`, so on a graph whose smallest degree is half its
               largest -- the cat fixture, degrees 2 to 4 -- every node landed between
               3.12x and 4.00x the base. That is 7.2's 4x ceiling honoured and its point
               missed, because the spread a reader could actually see was 1.28x while the
               whole graph grew three-fold. Restoring the tuned defaults is the product
               owner's call (2026-09-13); re-proposing either layer means fixing the
               normalisation first, against the observed degree RANGE rather than the
               maximum alone. Labels stay: they add a channel rather than overriding a
               tuned value. */
            const degreeRunId = degrees.runId;
            const { labelCount } = defaults;

            /* The layer asks graphty-element for the top `labelCount` nodes of the RUN that
               measured the degrees; the element decides where the cut falls and what a tie
               across the budget does. A budget of zero is the reader's switch turned off, and
               no run means nothing for the layer to read. */
            if (labelCount > 0 && degreeRunId !== undefined) {
                await session.styles.add(topDegreeLabelLayer({ degreeRunId, labelCount })).then(
                    () => undefined,
                    (error: unknown) => {
                        console.error("[shell] the element refused the top-degree label layer:", error);
                    },
                );

                /* The layer and this sentence read the same cut, so when a tie across the budget
                   leaves labels out, Settings > Performance says why in the element's words. */
                setLabelShortfall(
                    session.runs.get(degreeRunId)?.result?.top(METRIC_VALUE_FIELD, labelCount).reason ?? null,
                );
            }

            const pending = pendingSuggestedRef.current;

            pendingSuggestedRef.current = null;

            if (pending === "community-detection") {
                /* Spec 5643-5648: the hint's click ends "one undoable history entry, that
                   card retired". The reader has been taken where the card was taking
                   them, so the card has done its job, and the retirement outlives the
                   session in the insights key. The run itself retires it, on the far side
                   of the work: a run that threw has retired nothing. */
                await runFindGroups({ retiresInsightCard: true });
            }
        };

        apply().catch((error: unknown) => {
            console.error("[shell] could not apply the load defaults:", error);
        });
    }, [
        dataLoaded,
        graphData.nodes.length,
        graphStatistics.edgeCount,
        graphStatistics.nodeCount,
        loadCompletions,
        runFindGroups,
    ]);

    /* ---------------------------------------------------------------------- */
    /* The canvas's docks and overlays                                        */
    /* ---------------------------------------------------------------------- */

    /*
     * `closePanelForNarrowDrawer` stood here until 2026-09-14. Spec 01 section 7 item 3
     * had the Data table drawer "close the activity panel" when it opened below 1280, so
     * the drawer would not be covered by the panel overlay -- with a latch able to veto
     * it, which made the drawer's own guarantee conditional on a state the reader had set
     * somewhere else entirely.
     *
     * It is gone twice over. Opening a dock may not hide a sidebar under the one-button
     * model, and below `NARROW_BREAKPOINT` the shell does not lay out at all. Spec 5.2
     * line 448's promise that the drawer never covers the panel or the inspector STANDS
     * and is kept by INSETTING the drawer against the live canvas strip instead -- see
     * `canvas/canvasLayout.ts`.
     */
    const setDrawerOpen = useCallback((open: boolean) => {
        setCanvasLayout((current) => ({ ...current, drawerOpen: open }));

        if (!open) {
            setDrawerMaximised(false);
        }
    }, []);

    const toggleDrawer = useCallback(() => {
        setCanvasLayout((current) => ({ ...current, drawerOpen: !current.drawerOpen }));
        setDrawerMaximised(false);
    }, []);

    const toggleOverlay = useCallback((key: "insightsDismissed" | "legend" | "timeSlider" | "toolbar") => {
        setCanvasLayout((current) => ({ ...current, [key]: !current[key] }));
    }, []);

    const openDrawerOn = useCallback(
        (tab: DataDrawerTab) => {
            setDrawerTab(tab);
            refreshGraphData();
            setDrawerOpen(true);
        },
        [refreshGraphData, setDrawerOpen],
    );

    /* ---------------------------------------------------------------------- */
    /* The graph calls behind the toolbar, the Views menu and the bindings     */
    /* ---------------------------------------------------------------------- */

    const zoomIn = useCallback(() => {
        graphZoomStep(graphtyRef.current?.graph ?? null, "in");
    }, []);
    const zoomOut = useCallback(() => {
        graphZoomStep(graphtyRef.current?.graph ?? null, "out");
    }, []);
    const zoomToFit = useCallback(() => {
        graphZoomToFit(graphtyRef.current?.graph ?? null);
    }, []);
    const zoomToSelection = useCallback(() => {
        graphZoomToSelection(graphtyRef.current?.graph ?? null, selectedNode?.id ?? null);
    }, [selectedNode]);
    const resetView = useCallback(() => {
        graphResetView(graphtyRef.current?.graph ?? null);
    }, []);
    const viewTop = useCallback(() => {
        graphViewPreset(graphtyRef.current?.graph ?? null, "top");
    }, []);
    const viewFront = useCallback(() => {
        graphViewPreset(graphtyRef.current?.graph ?? null, "front");
    }, []);
    const viewSide = useCallback(() => {
        graphViewPreset(graphtyRef.current?.graph ?? null, "side");
    }, []);
    const toggleViewMode = useCallback(() => {
        setViewMode((mode) => (mode === "3d" ? "2d" : "3d"));
    }, []);

    /* ---------------------------------------------------------------------- */
    /* Transient surfaces, and the Escape ladder's second rung                 */
    /* ---------------------------------------------------------------------- */

    const closeTopmostTransient = useCallback((): boolean => {
        if (paletteOpen) {
            setPaletteOpen(false);

            return true;
        }

        if (viewsMenuOpen) {
            setViewsMenuOpen(false);

            return true;
        }

        if (helpOpen) {
            setHelpOpen(false);

            return true;
        }

        if (shortcutsOpen) {
            setShortcutsOpen(false);

            return true;
        }

        if (settingsOpen) {
            setSettingsOpen(false);

            return true;
        }

        if (feedbackOpen) {
            setFeedbackOpen(false);

            return true;
        }

        return false;
    }, [feedbackOpen, helpOpen, paletteOpen, settingsOpen, shortcutsOpen, viewsMenuOpen]);

    const clearSelection = useCallback((): boolean => {
        if (selectedNode === null) {
            return false;
        }

        graphDeselectNode(graphtyRef.current?.graph ?? null);
        setSelectedNode(null);

        return true;
    }, [selectedNode]);

    /**
     * Opens a result in the inspector from its Results row.
     *
     * ALL THREE CLEARS ARE LOAD-BEARING and none is tidiness. `selectedNodeSelectionKind`
     * puts a selected node ABOVE a picked style layer, which is above a result: leave
     * either standing and the reader clicks a result row and the inspector goes on drawing
     * something else, which reads as a dead control.
     *
     * The ELEMENT has to be told as well, and that is the clause that is easy to drop.
     * `SelectionManager.select` returns early for the node it already holds and emits
     * nothing, so a shell that cleared only its own state left the element still holding
     * that node -- and every route back to it (its ranked row, its Most connected row, a
     * click on the node itself) was inert until the reader picked something else. Both run
     * functions already carry exactly this clause for exactly this reason.
     * @param id - the {@link AnalyzeResultCard.id} of the row that was clicked.
     */
    const openResult = useCallback(
        (id: string) => {
            if (activeResult === null || activeResult.id !== id) {
                return;
            }

            setSelectedNode(null);
            graphDeselectNode(graphtyRef.current?.graph ?? null);
            setSelectedLayerId(null);
        },
        [activeResult],
    );

    const handleHelpSelect = useCallback(
        (row: HelpMenuRowId) => {
            setHelpOpen(false);

            switch (row) {
                case "keyboardShortcuts":
                    openFullPanelOverlay("shortcuts");
                    break;
                case "showSuggestions":
                    setCanvasLayout((current) => ({ ...current, insightsDismissed: false }));
                    break;
                case "sendFeedback":
                    setFeedbackOpen(true);
                    break;
                case "documentation":
                    window.open("https://graphty.app/docs/", "_blank", "noopener");
                    break;
                case "whatTheMarksMean":
                    openFullPanelOverlay("shortcuts");
                    break;
                case "moreSuggestions":
                case "alreadyRun":
                    // The two counted rows carry submenus of this session's suggestion
                    // and result cards. Both live in Analyze, so the row opens it.
                    openPanelAt("analyze");
                    break;
                default:
                    break;
            }
        },
        [openFullPanelOverlay, openPanelAt],
    );

    /* ---------------------------------------------------------------------- */
    /* F6: cycle the regions (spec 04 section 10.1)                            */
    /* ---------------------------------------------------------------------- */

    const cycleRegions = useCallback((reverse: boolean): void => {
        const root = frameRef.current;

        if (root === null) {
            return;
        }

        // Each region marks itself with `data-shell-region`, so the ring is DOM order,
        // which is the order the spec lists: rail, panel, canvas, inspector, status bar.
        const regions = Array.from(root.querySelectorAll<HTMLElement>("[data-shell-region]"));

        if (regions.length === 0) {
            return;
        }

        const active = document.activeElement;
        const current = regions.findIndex((region) => active instanceof Node && region.contains(active));
        const step = reverse ? -1 : 1;
        const next = regions[(current + step + regions.length) % regions.length];
        const focusable = next.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

        if (focusable !== null) {
            focusable.focus();

            return;
        }

        next.tabIndex = -1;
        next.focus();
    }, []);

    /* ---------------------------------------------------------------------- */
    /* The one dispatcher                                                      */
    /* ---------------------------------------------------------------------- */

    useShellKeyBindings({
        // Two of the ladder's four rungs. The two that are missing have no receiver
        // in this build, and that is a fact about the application rather than a wiring
        // slip: rung 1 cancels an in-progress node drag or marquee, and graphty-element
        // publishes no drag-cancel call (see `graphCommands.ts`, which says so); the
        // penultimate rung pauses time slider playback, and no time slider can be drawn
        // while no Time role can be assigned (`toggleTimeSlider` is unshipped for the
        // same reason). `runEscapeLadder` skips a missing rung, so a press falls through
        // to the next one that exists, in order.
        //
        // A `closeNarrowOverlay` rung sat between them until 2026-09-14 and is gone from
        // the table itself: Escape dismissed whichever region overlay was open below
        // 1280, and there are no region overlays any more. Escape has never closed a
        // docked sidebar and still does not -- the one control and Cmd/Ctrl+B are the
        // only routes.
        escapeLadder: { clearSelection, closeTopmostTransient },
        handlers: {
            commandPalette: () => {
                /* A key press closes no pop-out, and pop-outs are drawn over the palette. */
                closeAllPopouts();
                setPaletteOpen(true);
            },
            cycleRegions: () => {
                cycleRegions(false);
            },
            cycleRegionsReverse: () => {
                cycleRegions(true);
            },
            focusAssistant: () => {
                openPanelAt("ai");
                focusWhenMounted('[data-testid="ai-input"]');
            },
            focusExploreSearch: () => {
                openPanelAt("explore");
                focusWhenMounted('[data-testid="explore-search-input"]');
            },
            keyboardShortcuts: () => {
                openFullPanelOverlay("shortcuts");
            },
            redo: undoStore.redo,
            resetView,
            toggleDataDrawer: toggleDrawer,
            toggleLegend,
            toggleSidebars,
            toggleViewMode,
            undo: undoStore.undo,
            viewFront,
            viewSide,
            viewTop,
            zoomIn,
            zoomOut,
            zoomToFit,
            zoomToSelection,
        },
        // 5.6 suppresses every binding but Escape while a modal is up. The command
        // palette and the feedback dialog are tier 3b dialogs, and the Settings overlay
        // covers the whole body row with its own scrim, so it counts as one too.
        modalOpen: paletteOpen || feedbackOpen || settingsOpen,
    });

    /* ---------------------------------------------------------------------- */
    /* Region props                                                            */
    /* ---------------------------------------------------------------------- */

    /* Always docked. The `overlay` presentation existed for the sub-1280 layout, which
       was deleted on 2026-09-14 -- below `NARROW_BREAKPOINT` this frame draws a "screen
       too small" state and never reaches this line. The prop stays on both region
       components because their own tests and stories still exercise the overlay form. */
    const presentation = "docked";
    const { nodeCount } = graphStatistics;
    const { edgeCount } = graphStatistics;

    /* Which activity the 280 px panel is drawing, or null when the sidebars are hidden.
       The store always holds an activity -- there is no "no panel" state any more -- so
       this reads the ONE boolean rather than a second nullable fact, and the top bar's
       switch, the panel's render and the rail's marker all follow from it. */
    const panelActivity: PrimaryActivityId | null = sidebarsShown ? activeActivity : null;

    /*
     * The Results tab's body: a LIST holding one card, or none.
     *
     * A list rather than a single optional card, even though only the last run's result
     * is shown today. A second result is then a DATA change rather
     * than a rewrite of the panel. What it replaced is the defect: the panel took a bare
     * `resultCount: number` and drew NOTHING for it, so the tab read "Results (1)" over a
     * body that still showed the Suggested cards -- a badge and a body that were two
     * independently passed facts about the same thing, and only one of them reached the
     * reader.
     *
     * The applied half is all-or-nothing, exactly as the inspector's card is: a run whose
     * encoding was suppressed painted nothing, so it names no layer, shows no swatch and
     * offers no "Change encoding" verb rather than one that opens Style for a layer that
     * is not there.
     */
    const analyzeResults = useMemo<readonly AnalyzeResultCard[]>(() => {
        if (activeResult === null) {
            return [];
        }

        return [
            {
                id: activeResult.id,
                title: activeResult.title,
                headline: activeResult.headline,
                ...(activeResult.layerName === undefined
                    ? {}
                    : {
                          layerName: activeResult.layerName,
                          ...(activeResult.stateSwatch === undefined ? {} : { stateSwatch: activeResult.stateSwatch }),
                          /* The same destination the inspector's own Change encoding verb
                             uses, so the two routes to one layer cannot land in two
                             places. */
                          onChangeEncoding: () => {
                              openPanelAt("style");
                          },
                      }),
            },
        ];
    }, [activeResult, openPanelAt]);

    const overflowItems = useMemo(() => {
        if (activeActivity === "data") {
            return [
                {
                    id: "closeDataset",
                    label: CLOSE_DATASET_ROW,
                    separatorBefore: true,
                    onSelect: () => {
                        graphtyRef.current?.clearData();
                        setDataLoaded(false);
                        setDatasetName(null);
                        setGraphData(NO_GRAPH_DATA);
                        setLoadedSummary(undefined);
                        /* The WHOLE shape goes, not just the two counts. Every field of it
                           describes the dataset being closed -- the density, the parts, the
                           direction -- so leaving the rest standing beside a node count of
                           zero would have the Counts rows describing a graph nobody can see. */
                        setGraphStatistics(EMPTY_GRAPH_STATISTICS);
                        crossDatasetBoundary();
                    },
                },
            ];
        }

        if (activeActivity === "style") {
            return [
                {
                    id: "resetStyles",
                    label: RESET_STYLES_ROW,
                    separatorBefore: true,
                    onSelect: () => {
                        const session = elementSession(graphtyRef.current?.graph);

                        if (session === null) {
                            return;
                        }

                        /* One sweep, and the element's own layers survive it whatever the
                           predicate says. The loop this replaces walked the list in reverse
                           removing by index, which is where the off-by-one that took
                           graphty-element's base layer -- and with it every node's shape type
                           -- came from. */
                        void session.styles.removeBySource(() => true).then(
                            () => undefined,
                            (error: unknown) => {
                                console.error("[shell] the element refused to reset the styles:", error);
                            },
                        );
                    },
                },
            ];
        }

        return [];
    }, [activeActivity, crossDatasetBoundary]);

    const panelBody = useMemo(() => {
        switch (activeActivity) {
            case "data":
                return (
                    <DataPanel
                        stateAxis={stateAxis}
                        onLoad={handleLoad}
                        /*
                            Not the node and edge counts: spec 01 section 8 gives that
                            fact to the status bar and names "the Loaded data header"
                            as one of the places it is not repeated, and the artboard
                            draws no count in this section -- it draws what the FILE is
                            (DataPanelLoaded.dc.html:274-310). What the shell knows of
                            that goes in; what it has not measured stays out.
                        */
                        loadedSummary={loadedSummary}
                        /*
                            The same manifest Welcome draws, so the two surfaces cannot
                            drift (spec 5648): "The same size string ("20 nodes, 29
                            edges") appears in the panel and the canvas", so the row is
                            fed the string from the ONE formatter the canvas row uses.
                            The credit is the row's hover title; the size string and the
                            tags share the row's trailing value, size first, as spec 622
                            asks ("Small samples show counts alone" plus "each row
                            carries small tags").
                        */
                        samples={SAMPLE_MANIFEST.map((record) => ({
                            id: record.id,
                            name: record.name,
                            sizeString: sampleSizeString(record.size),
                            tags: record.tags,
                            source: record.credit,
                            onOpen: () => {
                                loadSample(record, false);
                            },
                        }))}
                        dataTableOpen={canvasLayout.drawerOpen}
                        onDataTableOpenChange={setDrawerOpen}
                    />
                );
            case "explore":
                return (
                    <ExplorePanel
                        query={exploreQuery}
                        onQueryChange={setExploreQuery}
                        scope={exploreScope}
                        onScopeChange={setExploreScope}
                        searchError={exploreError}
                        visibleScopeLabel={`${nodeCount.toLocaleString()} nodes`}
                        timeSliderOn={canvasLayout.timeSlider}
                        onTimeSliderChange={(on) => {
                            setCanvasLayout((current) => ({ ...current, timeSlider: on }));
                        }}
                    />
                );
            case "analyze":
                // `persist` reaches every store in the shell, not only the two the
                // shell itself owns: this panel keeps its own 6.5 key, and a board
                // rendered with `persist={false}` must not write it.
                return (
                    <AnalyzePanel
                        graphtyRef={graphtyRef}
                        persist={persist}
                        /*
                            7.3: a capability run from its OWN panel retires its insight
                            card, because the reader has already been where the card was
                            taking them. A click on the card itself does not retire it --
                            that is the "Done" badge's job, and the strip has no field for
                            one. Only the Groups card runs anything in this build.
                        */
                        onRunSuggested={(id) => {
                            if (id === "groups") {
                                void runFindGroups({ retiresInsightCard: true });

                                return;
                            }

                            const metric = SUGGESTED_CARD_METRICS[id];

                            if (metric === undefined) {
                                return;
                            }

                            /* The retirement rides ALONG with the run and lands on the far
                               side of it. Retiring here took the card for a run the size
                               gate had not yet asked about, so a Cancel on the confirm
                               retired a capability that never ran -- permanently, on every
                               dataset, since nothing un-retires one. */
                            void runNodeMetricCard({ metric, confirmed: false, retiresInsightCard: true });
                        }}
                        results={analyzeResults}
                        {...(activeResult === null ? {} : { activeResultId: activeResult.id })}
                        onOpenResult={openResult}
                        runLabels={suggestedRunCosts.labels}
                        runTitles={suggestedRunCosts.titles}
                        runWarnings={suggestedRunCosts.warnings}
                        {...(runningSuggestedCardId === undefined ? {} : { runningId: runningSuggestedCardId })}
                    />
                );
            case "style":
                return (
                    <StylePanel
                        layers={[...layers]}
                        selectedLayerId={selectedLayerId}
                        onLayersChange={handleLayersChange}
                        onLayerSelect={setSelectedLayerId}
                        onAddLayer={handleAddLayer}
                        layoutPicks={LAYOUT_PICKS}
                        layout={layoutType}
                        layoutConfig={layoutConfig}
                        onApplyLayout={handleApplyLayout}
                        is2DMode={viewMode === "2d"}
                        legendShown={canvasLayout.legend}
                        /* The switch reports whether a legend CAN be drawn, not only
                           whether the reader asked for one. Straight after a load nothing
                           is encoded, and before this the switch sat checked over a canvas
                           with no legend on it. */
                        legendAvailable={legendIsAvailable}
                        onLegendShownChange={(shown) => {
                            setCanvasLayout((current) => ({ ...current, legend: shown }));
                        }}
                    />
                );
            case "present":
                return (
                    <PresentPanel
                        imageFormat={imageFormat}
                        onImageFormatChange={(format) => {
                            if (isImageFormat(format)) {
                                setImageFormat(format);
                            }
                        }}
                        onExportImage={() => {
                            captureImage({ format: imageFormat, destination: { download: true } });
                        }}
                        onCopyImage={() => {
                            captureImage({ destination: { clipboard: true } });
                        }}
                    />
                );
            case "ai":
                return (
                    <AiPanel
                        messages={aiMessages}
                        providerConfigured={aiKeyStorage.hasAnyProvider}
                        providerLabel={aiManager.currentProvider ?? undefined}
                        isProcessing={aiManager.isProcessing}
                        onSend={(text) => {
                            const id = `${Date.now()}`;

                            setAiMessages((current) => [
                                ...current,
                                { id, role: "user", content: text, timestamp: Date.now() },
                            ]);

                            void aiManager.execute(text).then((result) => {
                                setAiMessages((current) => [
                                    ...current,
                                    {
                                        id: `${id}-reply`,
                                        role: "assistant",
                                        content: result.success
                                            ? (result.message ?? result.text ?? result.llmText ?? "Done.")
                                            : (result.error?.message ?? "The assistant could not answer."),
                                        timestamp: Date.now(),
                                        isError: !result.success,
                                    },
                                ]);
                            });
                        }}
                        onCancel={aiManager.cancel}
                        onOpenSettings={() => {
                            openFullPanelOverlay("settings", "ai");
                        }}
                    />
                );
            default:
                return null;
        }
    }, [
        activeActivity,
        activeResult,
        captureImage,
        imageFormat,
        openFullPanelOverlay,
        aiKeyStorage.hasAnyProvider,
        aiManager,
        aiMessages,
        analyzeResults,
        canvasLayout.drawerOpen,
        canvasLayout.legend,
        canvasLayout.timeSlider,
        legendIsAvailable,
        openResult,
        exploreError,
        exploreQuery,
        exploreScope,
        handleAddLayer,
        handleApplyLayout,
        handleLayersChange,
        handleLoad,
        layers,
        layoutConfig,
        layoutType,
        loadedSummary,
        loadSample,
        nodeCount,
        persist,
        runFindGroups,
        runNodeMetricCard,
        runningSuggestedCardId,
        selectedLayerId,
        setDrawerOpen,
        stateAxis,
        suggestedRunCosts.labels,
        suggestedRunCosts.titles,
        suggestedRunCosts.warnings,
        viewMode,
    ]);

    /* ---------------------------------------------------------------------- */
    /* The inspector                                                           */
    /* ---------------------------------------------------------------------- */

    /*
     * The precedence rule, in one place: a selected node outranks a result, and a result
     * outranks the graph summary. It is the only rule that needs no new machinery, and it
     * keeps a stale result from outliving a fresh selection -- the card click clears the
     * selection first, and the next pick replaces the result surface.
     */
    const selectionKind: SelectionKind = selectedNodeSelectionKind(
        selectedNode !== null,
        activeResult !== null,
        selectedLayerId !== null && layers.some((layer) => layer.id === selectedLayerId),
    );

    /**
     * The distinct neighbours of one node, as the inspector's Neighbors block draws them.
     *
     * The ends come from `edgeEndpoints`, the shell's one reader of that fact, which reads
     * the two names the element resolved and publishes. Nothing here probes for a second
     * spelling, and nothing here should: the element answers the endpoint question once,
     * per load, and refuses a file it cannot answer it for.
     *
     * `direction` is derived from which end matched, and it is only MEANINGFUL on a
     * directed graph -- on an undirected one it is an artefact of the order the loader
     * happened to write the endpoints in. It is safe to pass unconditionally because the
     * one consumer, `NodeInspector`, filters on it only while `directed === true`, and the
     * shell passes the element's MEASURED direction for that -- `graphStatistics.directedness`,
     * not the handle's default, which is the constant true. Do not start drawing an arrow from
     * this field without re-checking that guard.
     * @param nodeId - the node whose neighbours are wanted.
     * @returns one row per DISTINCT neighbour, in edge-record order.
     */
    const neighborsOf = useCallback(
        (nodeId: string): readonly NeighborRow[] => {
            const rows: NeighborRow[] = [];
            const seen = new Set<string>();

            for (const edge of graphData.edges) {
                const { source, target } = edgeEndpoints(edge);
                let other: string | null = null;

                if (source === nodeId) {
                    other = target;
                } else if (target === nodeId) {
                    other = source;
                }

                if (other === null || seen.has(other)) {
                    continue;
                }

                seen.add(other);
                rows.push({
                    id: other,
                    label: other,
                    edgeType: typeof edge.label === "string" ? edge.label : "edge",
                    direction: source === nodeId ? "out" : "in",
                    value: "",
                });
            }

            return rows;
        },
        [graphData.edges],
    );

    /**
     * Pins the node where it is, or releases one already pinned.
     *
     * The inspector's Pin row and its Pinned badge's Unpin button are the same verb, and both
     * are the reader's only way back out of a pin: `pinOnDrag` is on by default and a pin now
     * survives a layout change, a 2D/3D switch and a template apply, so every node the reader
     * has ever dragged stays where they put it until this is called.
     *
     * The set is re-read from the element afterwards rather than edited here. The element is
     * where a pin lives, and it is the only thing that knows about the pins this shell did not
     * make.
     * @param elementId - the node, as the element spells its id.
     */
    const togglePin = useCallback((elementId: string | number) => {
        const handle = graphtyRef.current;

        if (handle === null) {
            return;
        }

        if (handle.pinnedNodes.has(elementId)) {
            handle.unpin(elementId);
        } else {
            handle.pin(elementId);
        }

        setPinnedNodes(new Set(handle.pinnedNodes));
    }, []);

    const copyReading = useCallback((text: string) => {
        navigator.clipboard?.writeText(text).catch((error: unknown) => {
            console.error("[shell] could not copy the reading:", error);
        });
    }, []);

    /*
     * The graph-summary reading (7.5). It is the template's, not a sentence assembled
     * here, and every fact in it is one the element published.
     *
     * Two clauses the spec draws are deliberately absent. The type clause ("17 cats, 1 dog
     * and 2 humans") needs a node-type ROLE, and no column-role model exists in either
     * package -- the cat fixture's `breed` carries 17 values with counts of 1 to 3, so the
     * drawn string is not derivable from the data. The "at most 5 steps" clause needs an
     * exact diameter, which is above the O(n+m) ceiling spec 5843 sets for a template and
     * which the element's statistics do not carry. The template accepts `nodeTypes` and
     * `exactDiameter` for the day either lands.
     */
    const graphReading = dataLoaded
        ? graphSummaryReading({
              nodeCount: graphStatistics.nodeCount,
              edgeCount: graphStatistics.edgeCount,
              edgeNoun: DEFAULT_EDGE_NOUN,
              connectedPartCount: graphStatistics.components.count,
              largestPartNodeCount: graphStatistics.components.largestSize,
              smallPartsMostlySingleNodes: smallPartsAreSingleNodes(graphStatistics.components),
          })
        : GRAPH_SUMMARY_EMPTY_READING;

    /* The distribution the histogram draws, from the same degree pass Most connected
       reads. Both are absent together: with no pass there are no ranked rows, and
       `GraphSummary` draws the histogram inside the Most connected section. */
    const degreeDistribution = degreeResults?.distribution ?? NO_DEGREE_DISTRIBUTION;

    const mostConnected = useMemo(
        () =>
            (degreeResults?.byDegreeDescending ?? []).slice(0, MOST_CONNECTED_TOP_N).map((reading) => ({
                id: reading.id,
                // The node's id IS its label here: nothing in this build assigns a label
                // role to an attribute, so a second column would be the same string twice.
                label: reading.id,
                value: formatCount(reading.degree),
            })),
        [degreeResults],
    );

    /**
     * Takes off every layer a result painted, by the RUN that painted them.
     *
     * By SOURCE and never by index: a run-made layer records the run that made it, so the
     * sweep names the run rather than a set of positions that go stale the moment anything
     * else moves -- and an element-owned layer is never swept whatever the predicate says.
     * The index walk this replaces took graphty-element's own base layer with it, the one
     * carrying every node's shape type, after which the next load died in mesh building with
     * "shape with type required to create mesh" and drew nothing at all.
     *
     * A result that painted nothing names no run and this removes nothing, which is the
     * un-applied card's whole point: its two layer verbs have no layer to act on.
     * @param layerRunId - the run the result's layers name, or undefined for a result that
     * painted none.
     */
    const removeResultLayers = useCallback((layerRunId: RunId | undefined) => {
        const session = elementSession(graphtyRef.current?.graph);

        if (session === null || layerRunId === undefined) {
            return;
        }

        void removeRunLayers(session, layerRunId).then(
            () => undefined,
            (error: unknown) => {
                console.error("[shell] the element refused to remove the result's layers:", error);
            },
        );
    }, []);

    const inspectorSelection = useMemo<InspectorSelection>(() => {
        /* A layer picked in the Style panel opens that layer's surface. It outranks the
           result and the graph summary because it is the reader's own most recent pick,
           and it yields to a selected node for the same reason -- a node selection is
           made on the canvas, later and more deliberately. `InspectorBody` has drawn this
           kind since the shell was built; nothing ever constructed it, so the properties
           panel was unreachable and the Style panel could only reorder and rename. */
        if (selectedNode === null && selectedLayerId !== null) {
            const picked = layers.find((layer) => layer.id === selectedLayerId);

            if (picked !== undefined) {
                return {
                    kind: "style-layer",
                    layer: {
                        layer: picked,
                        onUpdate: updateLayer,
                        onResolveToStatic: resolveLayerChannel,
                    },
                };
            }
        }

        if (selectedNode === null && activeResult !== null) {
            return {
                kind: "algorithm-result",
                result: {
                    reading: activeResult.reading,
                    ...(activeResult.caveats === undefined ? {} : { caveats: activeResult.caveats }),
                    runRecord: activeResult.runRecord,
                    body: activeResult.body,
                    ...(activeResult.distribution === undefined ? {} : { distribution: activeResult.distribution }),
                    ...(activeResult.layerName === undefined ? {} : { layerName: activeResult.layerName }),
                    ...(activeResult.stateSwatch === undefined ? {} : { stateSwatch: activeResult.stateSwatch }),
                    /* Floor item 4: the layer count is named BEFORE the act (spec
                       2241-2249), in the verb's own line, and it now states what the verb
                       really does -- "Remove result deletes the run and every layer that
                       reads it" (spec 2241-2244). The sentence used to read "Keeps 1 style
                       layer painted", the inverted contract: the two verbs were swapped,
                       so the words described the opposite of the acts. The count is the
                       result's own, because a Groups run owns one layer per coloured group
                       and a metric run owns one. */
                    ...(activeResult.layerCount === undefined
                        ? {}
                        : {
                              removeResultCost: `Removes ${formatCount(activeResult.layerCount)} style ${
                                  activeResult.layerCount === 1 ? "layer" : "layers"
                              }.`,
                          }),
                    onChangeEncoding: () => {
                        openPanelAt("style");
                    },
                    /* Spec 2241-2243: "Delete layer removes the picture and leaves the
                       run, and the card reverts to its un-applied form." It used to remove
                       the layer AND the result, taking floor items 1, 2 and 3 -- the
                       reading, the departures and the run record, the citable provenance of
                       the run -- off the screen with the picture, which is not what its
                       words say and not what the reader asked for. */
                    onDeleteLayer: () => {
                        removeResultLayers(activeResult.layerRunId);

                        /* The un-applied form of the SAME result: the reading, caveats, run
                           record, body and chart stay exactly as they were, and the four
                           applied fields go, which is what the card's un-applied form is. */
                        setActiveResult((current) =>
                            current === null
                                ? null
                                : {
                                      /* The identity and the 6.3 pair survive: this is the
                                         SAME run, which is why the Results row keeps its
                                         place and its headline while losing its encoding
                                         verb. */
                                      id: current.id,
                                      title: current.title,
                                      headline: current.headline,
                                      reading: current.reading,
                                      ...(current.caveats === undefined ? {} : { caveats: current.caveats }),
                                      runRecord: current.runRecord,
                                      body: current.body,
                                      ...(current.distribution === undefined
                                          ? {}
                                          : { distribution: current.distribution }),
                                  },
                        );
                        // The colours went with the layers, so the channel naming them goes too.
                        setColourChannel([]);
                    },
                    /* Spec 2243-2244: "Remove result deletes the run and every layer that
                       reads it." Both, in that order, which is what the count above says it
                       will do. It used to take only the card, leaving the ramp painting and
                       the legend naming it with the one tag-aware removal control gone from
                       the screen. */
                    onRemoveResult: () => {
                        removeResultLayers(activeResult.layerRunId);
                        setActiveResult(null);
                        setColourChannel([]);
                    },
                },
            };
        }

        if (selectedNode === null) {
            return {
                kind: "none",
                summary: {
                    reading: graphReading,
                    counts: dataLoaded
                        ? {
                              nodes: nodeCount.toLocaleString(),
                              edges: edgeCount.toLocaleString(),
                              types: countsTypeRow(graphStatistics),
                              /* The element's density, which excludes self loops from both
                                 halves of the fraction and knows the direction the pairs
                                 should be counted in. */
                              density: graphStatistics.density.toFixed(3),
                              densityTitle: graphStatistics.density.toExponential(2),
                              averageDegree: graphStatistics.meanDegree.toFixed(1),
                              connectedParts: formatCount(graphStatistics.components.count),
                              // 6.2's zero rule: a count of nothing is not a row.
                              selfLoops:
                                  graphStatistics.selfLoopCount === 0 ? undefined : formatCount(graphStatistics.selfLoopCount),
                              parallelEdges:
                                  graphStatistics.repeatedEdgeCount === 0
                                      ? undefined
                                      : formatCount(graphStatistics.repeatedEdgeCount),
                          }
                        : null,
                    mostConnected,
                    /* Every node the degree pass ranked, which is what "See all N
                       ranked" opens the table on -- not the five rows above it. */
                    rankedCount: degreeResults?.byDegreeDescending.length ?? 0,
                    degreeBins: degreeDistribution.bins,
                    degreeAxisMin: degreeDistribution.axisMin,
                    degreeAxisMax: degreeDistribution.axisMax,
                    degreeLogScale: degreeDistribution.logX,
                    schema: { ready: false, summary: "measuring...", nodeTypes: [], edgeTypes: [] },
                    attributes: { nodes: [], edges: [] },
                    caseNoteCount: 0,
                    onShowInTable: () => {
                        openDrawerOn("nodes");
                    },
                    /* The same spine, from the graph summary: a Most connected row selects
                       the node it names. `GraphSummary` has wired this since it was built
                       and the shell had never passed it, so every one of those rows was
                       inert text that looked like a control. */
                    onSelectNode: (nodeId: string) => {
                        graphSelectNode(graphtyRef.current?.graph ?? null, nodeId);
                    },
                    onExportTop: () => undefined,
                    onExportRanked: () => undefined,
                    onSeeAllRanked: () => {
                        openDrawerOn("nodes");
                    },
                    onExportSchemaJson: () => undefined,
                    onFilterToType: () => undefined,
                    onSelectAllOfType: () => undefined,
                    onOpenCaseNotes: () => {
                        openPanelAt("explore");
                    },
                    onMoreInAnalyze: () => {
                        openPanelAt("analyze");
                    },
                },
            };
        }

        const neighbors = neighborsOf(selectedNode.id);
        const { attributes } = selectedNode;

        return {
            kind: "node",
            node: {
                nodeId: selectedNode.id,
                label: selectedNode.id,
                attributes,
                attributeCount: attributes === null ? 0 : Object.keys(attributes).length,
                metrics: [],
                notes: [],
                neighborCount: neighbors.length,
                neighborBreakdown: [],
                /* The MEASURED answer. The shell used to carry its own graph-type record whose
                   `directed` was the constant `true`, so the inspector split every node's
                   neighbours into incoming and outgoing on graphs that have no direction, three
                   feet from a Counts row that says "Undirected". The element knows which it is;
                   this reads that. */
                directed: graphStatistics.directedness === "directed",
                neighbors,
                onCopyId: () => {
                    copyReading(selectedNode.id);
                },
                onLocate: zoomToSelection,
                onShowAllAttributes: () => {
                    openDrawerOn("nodes");
                },
                onAddNote: () => {
                    openPanelAt("explore");
                },
                onToggleNoteDone: () => undefined,
                onDeleteNote: () => undefined,
                onSelectNeighbor: (nodeId: string) => {
                    graphSelectNode(graphtyRef.current?.graph ?? null, nodeId);
                },
                onNoteRelationship: () => {
                    openPanelAt("explore");
                },
                onShowNeighborsInTable: () => {
                    openDrawerOn("edges");
                },
                onSelectNeighbors: () => undefined,
                onSeeAllNeighbors: () => {
                    openDrawerOn("edges");
                },
                pinnedToCanvas: pinnedNodes.has(selectedNode.elementId),
                onUnpinFromCanvas: () => {
                    togglePin(selectedNode.elementId);
                },
                onAction: (action) => {
                    if (action === "pinNode") {
                        togglePin(selectedNode.elementId);
                    }
                },
            },
        };
    }, [
        activeResult,
        copyReading,
        dataLoaded,
        degreeDistribution,
        degreeResults,
        edgeCount,
        graphReading,
        graphStatistics.components.count,
        graphStatistics.density,
        graphStatistics.directedness,
        graphStatistics.repeatedEdgeCount,
        graphStatistics.selfLoopCount,
        handleLayersChange,
        layers,
        mostConnected,
        neighborsOf,
        nodeCount,
        openDrawerOn,
        openPanelAt,
        pinnedNodes,
        removeResultLayers,
        selectedLayerId,
        selectedNode,
        togglePin,
        zoomToSelection,
    ]);

    /*
     * What the header's copy verb puts on the clipboard (spec 5808): the reading, then the
     * facts the surface is drawing beside it, one per line.
     *
     * The legend's channels are part of the spec's list and are NOT here, because nothing
     * paints a legend channel until an encoding does, and copying an empty channel list
     * would be copying a claim the screen does not make.
     */
    const inspectorReadingForCopy = useMemo(() => {
        if (inspectorSelection.kind === "algorithm-result") {
            return [inspectorSelection.result.reading, inspectorSelection.result.runRecord].join("\n");
        }

        if (inspectorSelection.kind !== "none") {
            return graphReading;
        }

        const { counts } = inspectorSelection.summary;

        if (counts === null) {
            return graphReading;
        }

        const rows: string[] = [
            `${COUNTS_ROW_LABELS.nodes}: ${counts.nodes}`,
            `${COUNTS_ROW_LABELS.edges}: ${counts.edges}`,
            `${COUNTS_ROW_LABELS.type}: ${counts.types}`,
            `${COUNTS_ROW_LABELS.density}: ${counts.density}`,
            `${COUNTS_ROW_LABELS.averageDegree}: ${counts.averageDegree}`,
            `${COUNTS_ROW_LABELS.connectedParts}: ${counts.connectedParts}`,
        ];

        if (counts.selfLoops !== undefined) {
            rows.push(`${COUNTS_ROW_LABELS.selfLoops}: ${counts.selfLoops}`);
        }

        if (counts.parallelEdges !== undefined) {
            rows.push(`${COUNTS_ROW_LABELS.parallelEdges}: ${counts.parallelEdges}`);
        }

        return [graphReading, ...rows].join("\n");
    }, [graphReading, inspectorSelection]);

    /* ---------------------------------------------------------------------- */
    /* The status bar                                                          */
    /* ---------------------------------------------------------------------- */

    const layoutLabel = getLayoutMetadata(layoutType)?.label ?? layoutType;

    const layoutPicks = useMemo<readonly LayoutQuickPick[]>(
        () =>
            LAYOUT_PICKS.map((pick) => ({
                id: pick.value,
                label: pick.label,
                title: `${pick.label} (${pick.value})`,
                active: pick.value === layoutType,
                onSelect: () => {
                    handleApplyLayout(pick.value, {});
                },
            })),
        [handleApplyLayout, layoutType],
    );

    /* The issues slot's FIRST producer in this app, and the only slot that draws with no
       dataset: whether this machine has a GPU is not a property of the data, and the Welcome
       state is where a reader goes to change the policy. Nothing while the element is still
       probing (or has not spoken): a chip that says off for 30 ms and then on reads as a fault. */
    const accelerationIssues = useMemo<StatusBarIssuesModel | undefined>(() => {
        const text = acceleration === null ? null : formatAcceleration(acceleration);

        if (text === null) {
            return undefined;
        }

        return {
            acceleration: {
                ...text,
                onClick: () => {
                    setSettingsSection("performance");
                    setSettingsOpen(true);
                },
            },
        };
    }, [acceleration]);

    const slots = useMemo<StatusBarSlotsModel>(() => {
        if (!dataLoaded) {
            return accelerationIssues === undefined ? {} : { issues: accelerationIssues };
        }

        const nodes = { shown: nodeCount, loaded: nodeCount, total: nodeCount };
        const edges = { shown: edgeCount, loaded: edgeCount, total: edgeCount };

        return {
            counts: {
                nodes: formatCountPair(nodes, "nodes"),
                edges: formatCountPair(edges, "edges"),
                title: formatCountsTitle(nodes, edges),
                onClick: () => {
                    openDrawerOn(drawerTab);
                },
            },
            layout: {
                label: layoutLabel,
                title: `${layoutLabel} (${layoutType})`,
                caret: true,
                picks: layoutPicks,
                onRerun: () => {
                    handleApplyLayout(layoutType, layoutConfig);
                },
                onOpenSettings: () => {
                    openPanelAt("style");
                },
            },
            selection: selectionSlotOf(selectedCount, selectedNode !== null),
            issues: accelerationIssues,
        };
    }, [
        accelerationIssues,
        dataLoaded,
        drawerTab,
        edgeCount,
        handleApplyLayout,
        layoutConfig,
        layoutLabel,
        layoutPicks,
        layoutType,
        nodeCount,
        openDrawerOn,
        openPanelAt,
        selectedCount,
        selectedNode,
    ]);

    /*
     * The one toast: what the bar says when something ended, whether or not it was a load.
     *
     * Two producers feed it and the failed load wins when both are present -- the reader just
     * acted, and the GPU fact is still on the chip beside it. The lost device leaves by itself:
     * the element attempts a fresh accelerator and the next transition it publishes clears the
     * status, so this is derived from the element's document rather than a queue of its own.
     *
     * The failed load's second surface, and its only one once a dataset is drawn.
     *
     * Spec 4105 puts the sentence inline in the Welcome drop zone, and Welcome is not on
     * screen in the Loaded state -- so a file dropped on a populated canvas that failed to
     * parse had nowhere at all to be reported, which is the additive route of the defect.
     * The toast is where the status bar already reports the end of a load (spec 02
     * section 6), so it reports this end too, at the ERROR severity.
     *
     * `onDismiss` is deliberately absent. The toast documents that contract itself
     * (LoadCompleteToast.tsx): given one it dismisses after
     * `STATUS_BAR_GEOMETRY.TOAST_DURATION_MS`, and without one it stays until the host
     * stops passing a completion. An error that erases itself six seconds later is the
     * silent failure again in a nicer font, so it stays until the next load clears it.
     */
    const statusCompletion = useMemo<StatusBarCompletion | undefined>(() => {
        if (loadFailure !== null) {
            return {
                message: loadFailureSentence(loadFailure),
                severity: "error",
                actionLabel: OPEN_DATA_ACTION,
                onDetails: () => {
                    openPanelAt("data");
                },
            };
        }

        if (acceleration === null || acceleration.state !== "error") {
            return undefined;
        }

        return {
            message: acceleration.reason ?? "The GPU device was lost.",
            severity: "error",
            actionLabel: OPEN_SETTINGS_ACTION,
            onDetails: () => {
                setSettingsSection("performance");
                setSettingsOpen(true);
            },
        };
    }, [acceleration, loadFailure, openPanelAt]);

    /* ---------------------------------------------------------------------- */
    /* The command palette's rows: the full-text twin of every icon control    */
    /* ---------------------------------------------------------------------- */

    const paletteItems = useMemo<readonly CommandPaletteItem[]>(() => {
        const items: CommandPaletteItem[] = [];

        for (const [activity, title] of Object.entries(ACTIVITY_TITLES)) {
            items.push({
                id: `goto-${activity}`,
                group: "Go to",
                label: title,
                onSelect: () => {
                    openPanelAt(activity as PrimaryActivityId);
                },
            });
        }

        items.push({
            id: "goto-settings",
            group: "Go to",
            label: PINNED_TITLES.settings,
            onSelect: () => {
                openFullPanelOverlay("settings");
            },
        });
        items.push({
            id: "goto-help",
            group: "Go to",
            label: PINNED_TITLES.help,
            chipFor: "keyboardShortcuts",
            onSelect: () => {
                setHelpOpen(true);
            },
        });

        items.push(
            { id: "view-zoom-in", group: "View", label: "Zoom in", chipFor: "zoomIn", onSelect: zoomIn },
            { id: "view-zoom-out", group: "View", label: "Zoom out", chipFor: "zoomOut", onSelect: zoomOut },
            { id: "view-zoom-fit", group: "View", label: "Zoom to fit", chipFor: "zoomToFit", onSelect: zoomToFit },
            {
                id: "view-zoom-selection",
                group: "View",
                label: "Zoom to selection",
                chipFor: "zoomToSelection",
                onSelect: zoomToSelection,
            },
            { id: "view-reset", group: "View", label: "Reset view", chipFor: "resetView", onSelect: resetView },
            { id: "view-top", group: "View", label: "Top", chipFor: "viewTop", onSelect: viewTop },
            { id: "view-front", group: "View", label: "Front", chipFor: "viewFront", onSelect: viewFront },
            { id: "view-side", group: "View", label: "Side", chipFor: "viewSide", onSelect: viewSide },
            {
                id: "view-mode",
                group: "View",
                label: viewMode === "3d" ? "2D" : "3D",
                chipFor: "toggleViewMode",
                onSelect: toggleViewMode,
            },
            {
                id: "view-legend",
                group: "View",
                label: "Legend",
                chipFor: "toggleLegend",
                /* Through the same no-op-while-unencoded callback the L key uses, so the
                   palette row cannot flip a remembered boolean the Views row and the
                   Style switch both refuse to flip. */
                onSelect: toggleLegend,
            },
            {
                // Spec 01 section 4: once the Views menu's Toolbar row is unchecked,
                // this row is the only way back.
                id: "view-toolbar",
                group: "View",
                label: "Show canvas toolbar",
                onSelect: () => {
                    setCanvasLayout((current) => ({ ...current, toolbar: true }));
                },
            },
            {
                id: "view-drawer",
                group: "View",
                label: "Data table",
                chipFor: "toggleDataDrawer",
                onSelect: toggleDrawer,
            },
            {
                /* ONE row where "Toggle inspector" used to sit. The palette is the
                   full-text twin of every control, so it carries the same one verb and
                   the same one chip the top bar's switch does -- both read this from
                   `bindings.ts`, so they cannot drift. */
                id: "view-sidebars",
                group: "View",
                label: "Toggle sidebars",
                chipFor: "toggleSidebars",
                onSelect: toggleSidebars,
            },
        );

        /* One row per capability this build runs, labelled with the 6.3 pair on one line.
           Nothing leaves the palette index because it left a resting panel (spec
           4389-4390): the palette is the full-text twin of every control, including the
           ones a reader would otherwise have to open Analyze to find. */
        for (const metric of NODE_METRIC_IDS) {
            const definition = NODE_METRIC_DEFINITIONS[metric];

            items.push({
                id: `analyze-${metric}`,
                group: "Analyze",
                label: `${definition.plainName} (${definition.technicalName})`,
                onSelect: () => {
                    /* The palette is not the capability's own panel, so it retires no card
                       (7.3): the reader has not been where the card was taking them. */
                    void runNodeMetricCard({ metric, confirmed: false, retiresInsightCard: false });
                },
            });
        }

        items.push(
            {
                id: "help-shortcuts",
                group: "Help",
                label: "Keyboard shortcuts",
                chipFor: "keyboardShortcuts",
                onSelect: () => {
                    openFullPanelOverlay("shortcuts");
                },
            },
            {
                id: "help-show-suggestions",
                group: "Help",
                label: "Show suggestions",
                onSelect: () => {
                    setCanvasLayout((current) => ({ ...current, insightsDismissed: false }));
                },
            },
            {
                id: "help-marks",
                group: "Help",
                label: "What the marks mean",
                onSelect: () => {
                    openFullPanelOverlay("shortcuts");
                },
            },
            {
                id: "help-documentation",
                group: "Help",
                label: "Documentation",
                onSelect: () => {
                    window.open("https://graphty.app/docs/", "_blank", "noopener");
                },
            },
            {
                id: "help-feedback",
                group: "Help",
                label: "Send feedback",
                onSelect: () => {
                    setFeedbackOpen(true);
                },
            },
        );

        return items;
    }, [
        openFullPanelOverlay,
        openPanelAt,
        resetView,
        runNodeMetricCard,
        toggleDrawer,
        toggleLegend,
        toggleSidebars,
        toggleViewMode,
        viewFront,
        viewMode,
        viewSide,
        viewTop,
        zoomIn,
        zoomOut,
        zoomToFit,
        zoomToSelection,
    ]);

    /* ---------------------------------------------------------------------- */
    /* The canvas region's own configuration                                   */
    /* ---------------------------------------------------------------------- */

    const drawerRows = drawerTab === "nodes" ? graphData.nodes : graphData.edges;
    const drawerColumnDefs = useMemo(() => drawerColumns(drawerRows), [drawerRows]);

    /* ---------------------------------------------------------------------- */
    /* The Insights strip (7.3)                                                */
    /* ---------------------------------------------------------------------- */

    /*
     * The rule table is implemented in full and is pure; what reaches the strip is
     * filtered by `isSliceAvailable`, so only the capabilities this build can carry
     * through to a reading are drawn. On the cat fixture that is Find groups and Search,
     * which is also the card set Main.dc.html:702 draws minus the degree card that has no
     * reading yet.
     *
     * Two inputs are honestly zero rather than plausibly filled: `hasTimeRole` is false
     * because no column-role model exists, and `validationIssueTypeCount` is 0 because
     * `DataManager` hardcodes its warning count to 0 and nothing computes a validation
     * pass. Rule 1 and rule 6 are therefore implemented and never fire.
     */
    const insightCards = useMemo<readonly InsightCard[]>(() => {
        if (!dataLoaded) {
            return [];
        }

        const shape: InsightsGraphShape = {
            nodeCount: graphStatistics.nodeCount,
            edgeCount: graphStatistics.edgeCount,
            directedness: graphStatistics.directedness,
            hasTimeRole: false,
            validationIssueTypeCount: 0,
            searchExample: degreeResults?.byDegreeDescending[0]?.id,
            /* Whether a run is possible on this graph and what it would cost, for every
               algorithm the element ships. It replaces a three-entry record this file
               assembled by hand: the 60 s ceiling had a number for Most connected, Influence
               and Bridges and none for anything else, so every other card passed the ceiling
               by never having been measured. The threshold the strip branches on is not
               passed either -- the element publishes its own, and the shell's was ten times
               larger with nothing between them able to notice. */
            metrics: elementMetrics,
        };

        /* The cap of four is spent only on cards this build can carry through to a
           reading. Filtering AFTER the model let an unavailable card eat a slot and draw
           a strip of two where three were available, so the unavailable capabilities join
           the retired ones instead: the model already drops those BEFORE it applies the
           cap, which is the one place a "not this one" decision belongs. */
        const unavailable = insightCandidates(shape)
            .filter((candidate) => !isSliceAvailable(candidate.capability))
            .map((candidate) => candidate.capability);

        return insightsStripModel(shape, [...insightsMemory.retiredCapabilities, ...unavailable]).cards.map((card) => ({
            id: card.id,
            title: card.title,
            technicalName: card.technicalName,
            body: card.body,
            actionLabel: card.actionLabel,
            onActivate: () => {
                if (card.capability === "community-detection") {
                    /* A click on the card itself retires nothing -- that is the "Done"
                       badge's job (7.3), and the strip has no field for one. */
                    void runFindGroups({ retiresInsightCard: false });

                    return;
                }

                /* The three centrality cards 7.3's rule table has always produced and
                   this build can now carry through to a reading. Each runs through the
                   same gate the panel's own Run does, so a card click on a large graph
                   asks before it spends the time rather than after. */
                if (card.capability === "centrality-degree") {
                    void runNodeMetricCard({ metric: "degree", confirmed: false, retiresInsightCard: false });

                    return;
                }

                if (card.capability === "centrality-pagerank") {
                    void runNodeMetricCard({ metric: "pagerank", confirmed: false, retiresInsightCard: false });

                    return;
                }

                if (card.capability === "centrality-betweenness") {
                    void runNodeMetricCard({ metric: "betweenness", confirmed: false, retiresInsightCard: false });

                    return;
                }

                if (card.capability === "search") {
                    openPanelAt("explore");
                    focusWhenMounted('[data-testid="explore-search-input"]');
                }
            },
        }));
    }, [
        dataLoaded,
        degreeResults,
        elementMetrics,
        graphStatistics.directedness,
        graphStatistics.edgeCount,
        graphStatistics.nodeCount,
        insightsMemory.retiredCapabilities,
        openPanelAt,
        runFindGroups,
        runNodeMetricCard,
    ]);

    /* ---------------------------------------------------------------------- */
    /* Welcome's sample list (7.1 items 1-2), from the one manifest             */
    /* ---------------------------------------------------------------------- */

    const welcomeSamples = useMemo<readonly WelcomeSample[]>(
        () =>
            SAMPLE_MANIFEST.map((record) => ({
                id: record.id,
                name: record.name,
                tags: record.tags,
                large: record.large,
                credit: record.credit,
                creditHref: record.creditHref,
                sizeString: sampleSizeString(record.size),
                blurb: record.blurb,
                hint: record.hint,
                onOpen: () => {
                    loadSample(record, false);
                },
                // Bound only where the manifest carries a hint, so a row with no
                // suggested card cannot grow a link that promises an unbuilt action.
                onOpenAndRun:
                    record.hint === undefined
                        ? undefined
                        : () => {
                              loadSample(record, true);
                          },
            })),
        [loadSample],
    );

    const canvasProps: CanvasRegionOwnProps = {
        stateAxis,
        docks: {
            drawerOpen: canvasLayout.drawerOpen,
            drawerHeight: canvasLayout.drawerHeight,
            drawerMaximised,
            compareOpen: compareActive,
        },
        overlays: {
            minimap: canvasLayout.minimap,
            legend: canvasLayout.legend,
            toolbar: canvasLayout.toolbar,
            timeSlider: canvasLayout.timeSlider,
            insightsStrip: !canvasLayout.insightsDismissed,
        },
        ...(legendChannels.length === 0 ? {} : { legend: { channels: legendChannels } }),
        graphRef: graphtyRef,
        graph: {
            layers: [...layers],
            acceleration: accelerationPolicy,
            viewMode,
            layout: layoutType,
            layoutConfig,
            onSelectionChange: handleSelectionChange,
            onStylesChange: handleStylesChange,
        },
        drawer: {
            tab: drawerTab,
            onTabChange: setDrawerTab,
            rows: drawerRows,
            columns: drawerColumnDefs,
            showLabel: "All",
            showCount: drawerRows.length.toLocaleString(),
            showTotal: `of ${drawerRows.length.toLocaleString()}`,
            onHeightChange: (height: number) => {
                setCanvasLayout((current) => ({ ...current, drawerHeight: height }));
            },
            onClose: () => {
                setDrawerOpen(false);
            },
            onSurfaceChange: (surface) => {
                setDrawerMaximised(surface === "table");
            },
        },
        welcome: {
            onOpenFile: () => {
                openPanelAt("data");
            },
            onPasteOrOpenFromUrl: () => {
                openPanelAt("data");
            },
            onFilesDropped: (files: FileList) => {
                const file = files.item(0);

                if (file !== null) {
                    /* A drop on the Empty state's zone has nothing to replace, so it is
                       not a replacing load and crosses no dataset boundary.

                       The rejection is consumed here rather than left to the runtime:
                       there is no dialog on this route to hold open, and the failure has
                       already been reported to `loadFailure`, which is what draws the
                       sentence in the zone this file was dropped on. */
                    void handleLoad({ inputMethod: "file", file, format: "auto", replaceExisting: false }).catch(
                        () => undefined,
                    );
                }
            },
            /* Spec 4105: a failed load is a sub-state of EMPTY, and the sentence is
               drawn inline in the drop zone. The file leads it (6.10 floor item 7). */
            error: loadFailure === null ? undefined : loadFailureSentence(loadFailure),
            children: <WelcomeSampleList samples={welcomeSamples} />,
        },
        /*
         * 7.3: the strip is drawn only when the rule table produced a card this build can
         * run. Dismissal goes through the canvas layout's own remembered flag, which 6.5
         * keeps globally across datasets and which Help > Show suggestions and the command
         * palette both restore; it pushes no history entry, because panel state is not
         * undoable. Per-card retirement goes to the insights memory instead, and survives
         * Show suggestions -- a capability that has been run has still been run.
         */
        insights:
            dataLoaded && insightCards.length > 0
                ? {
                      cards: insightCards,
                      onDismiss: () => {
                          setCanvasLayout((current) => ({ ...current, insightsDismissed: true }));
                      },
                      onDismissCard: (id: string) => {
                          setInsightsMemory((current) => withRetiredCapability(current, id));
                      },
                  }
                : undefined,
    };

    const visibleNodeCount = nodeCount;
    const visibleEdgeCount = edgeCount;

    /*
     * BELOW 1280 px THE SHELL DOES NOT LAY OUT AT ALL.
     *
     * Product owner, 2026-09-14: "there will be no more auto-hide. below 1280 should just
     * say 'screen too small' or something similar." What stood here instead was a second
     * layout: both regions became 280 px absolutely positioned overlays over a canvas that
     * was never resized under them, only one could be open at a time, a canvas tap or
     * Escape's third rung dismissed whichever it was, and a latch could veto either
     * dismissal. Five mechanisms arranging which half of an unusable layout to hide.
     *
     * The measurement is the spec's own (SPEC:5790-5796): at 1024x900 the two overlays
     * took [48,328] and [744,1024] while the Welcome sheet spanned [219,853], so 109 px
     * of the sheet sat under each overlay and its heading read "aph to get started"; at
     * 600 and at 375 there was no canvas and no Welcome content at all. A layout that
     * cannot show the graph it exists to show is not a layout.
     *
     * It is drawn as an OVERLAY OVER the still-mounted shell rather than INSTEAD of it,
     * and that distinction is the whole of this comment. An early return here unmounted
     * the shell subtree, and `<graphty-element>` with it. React then remounted a FRESH
     * element on the way back up past 1280 -- a new Babylon scene with no data -- while
     * this component's own state still said a graph was loaded, so nothing ever reloaded
     * it. Measured 2026-09-15 by driving the built app: load the cat fixture, resize to
     * 1100, resize back to 1440, and the canvas is empty at 3.25% non-background pixels
     * against 6.48% before, while the status bar still reads "20 nodes 29 edges" and the
     * graph summary still lists Mr_Whiskers. Keeping the shell mounted and merely hidden
     * costs one hidden WebGL canvas at a width nobody is working at, and keeps the one
     * thing the reader would lose.
     *
     * `visibility: hidden` rather than `display: none`: the canvas keeps its box, so
     * Babylon's resize observer never sees a 0x0 drawing buffer. `inert` takes the hidden
     * shell out of the tab order and off the pointer, so the overlay is the only thing a
     * reader at this width can reach.
     */
    const screenTooSmall = breakpoint === "narrow";

    const screenTooSmallOverlay = (
        <Box
            data-testid="screen-too-small"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: SCREEN_TOO_SMALL_Z_INDEX,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: SCREEN_TOO_SMALL_GAP,
                padding: SCREEN_TOO_SMALL_PAD,
                boxSizing: "border-box",
                textAlign: "center",
                background: PANEL_INK.PANEL,
            }}
        >
            <Box
                component="h1"
                style={{
                    margin: 0,
                    fontSize: SCREEN_TOO_SMALL_TITLE_FONT_SIZE,
                    fontWeight: 500,
                    color: PANEL_INK.VALUE,
                }}
            >
                {SCREEN_TOO_SMALL_TITLE}
            </Box>
            <Box style={{ margin: 0, fontSize: SCREEN_TOO_SMALL_DETAIL_FONT_SIZE, color: PANEL_INK.CHROME }}>
                {screenTooSmallDetail()}
            </Box>
        </Box>
    );

    return (
        <>
            {screenTooSmall ? screenTooSmallOverlay : null}
        <Box
            ref={frameRef}
            data-testid="app-shell"
            inert={screenTooSmall}
            aria-hidden={screenTooSmall ? true : undefined}
            style={{
                height: "100vh",
                display: "grid",
                gridTemplateRows: `${TOP_BAR_HEIGHT}px minmax(0, 1fr) ${STATUS_BAR_HEIGHT}px`,
                gridTemplateColumns: "minmax(0, 1fr)",
                overflow: "hidden",
                visibility: screenTooSmall ? "hidden" : undefined,
            }}
        >
            {/* The top bar spans the full shell width, above the rail. */}
            <TopBar
                datasetName={datasetName}
                dataLoaded={dataLoaded}
                canUndo={undoStore.canUndo}
                canRedo={undoStore.canRedo}
                onUndo={undoStore.undo}
                onRedo={undoStore.redo}
                onOpenHistory={() => undefined}
                onOpenCommandPalette={() => {
                    setPaletteOpen(true);
                }}
                onExport={() => {
                    openPanelAt("present");
                }}
                onShare={() => {
                    openPanelAt("present");
                }}
                compareActive={compareActive}
                onToggleCompare={() => {
                    setCompareActive((active) => !active);
                }}
                sidebarsShown={sidebarsShown}
                onToggleSidebars={toggleSidebars}
                history={{
                    rows: historyRows(undoStore),
                    entryCount: undoStore.entries.length,
                    undoneCount: undoStore.undoneCount,
                    onRestore: (entry) => {
                        undoStore.restoreTo(entry.id);
                    },
                    onOpenOwningPanel: (entry) => {
                        if (entry.activity !== "settings" && entry.activity !== "help") {
                            openPanelAt(entry.activity);
                        }
                    },
                }}
            />

            {/* The main row: the rail, then everything to the right of it. It is the
                positioned ancestor the Help menu hangs off, and it does not clip its
                overflow, so the menu may stand outside the rail's 48 px column. */}
            <Box
                data-testid="shell-main-row"
                style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: `${ACTIVITY_RAIL_WIDTH}px minmax(0, 1fr)`,
                    minHeight: 0,
                    overflow: "visible",
                }}
            >
                <Box data-shell-region="rail" style={{ display: "contents" }}>
                    <ActivityRail
                        activeActivity={panelActivity}
                        disabledActivities={stateAxis === "empty" ? ACTIVITIES_REQUIRING_DATA : undefined}
                        onActivityClick={handleActivityClick}
                    />
                </Box>

                {/* The body row: the panel, the canvas and the inspector. It is
                    the positioned ancestor of the narrow overlays, the Settings
                    overlay and the shortcuts surface. */}
                <Box
                    data-testid="shell-body-row"
                    style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "row",
                        minHeight: 0,
                        minWidth: 0,
                        overflow: "hidden",
                    }}
                >
                    {panelActivity !== null && (
                        <Box data-shell-region="panel" style={{ display: "contents" }}>
                            <PopoutRegion id="panel">
                                <ActivityPanel
                                    activity={panelActivity}
                                    width={panelWidth}
                                    presentation={presentation}
                                    title={ACTIVITY_TITLES[panelActivity]}
                                    overflowItems={overflowItems}
                                    onWidthChange={setPanelWidth}
                                >
                                    {panelBody}
                                </ActivityPanel>
                            </PopoutRegion>
                        </Box>
                    )}

                    {/* The canvas overlay is one region; the Data table drawer nests
                            its own inside it, because 6.11 makes a dock a region of its own. */}
                    <PopoutRegion id="canvas">
                        <CanvasRegion {...canvasProps}>
                            <CanvasToolbarSlot
                                viewMode={viewMode}
                                onViewModeChange={setViewMode}
                                zoomToSelectionEnabled={selectedNode !== null}
                                onZoomOut={zoomOut}
                                onZoomIn={zoomIn}
                                onZoomToFit={zoomToFit}
                                onZoomToSelection={zoomToSelection}
                                profileId={canvasToolbarProfile(shell.shellWidth).id}
                                viewsMenuOpen={viewsMenuOpen}
                                onViewsMenuOpenChange={setViewsMenuOpen}
                                views={{
                                    legendShown: canvasLayout.legend,
                                    /* Same fact, same source as the Style panel's switch
                                       and the L binding: one derivation, so the three
                                       cannot report three different legends. */
                                    legendAvailable: legendIsAvailable,
                                    toolbarShown: canvasLayout.toolbar,
                                    vrSupported: xrSupport.vr,
                                    arSupported: xrSupport.ar,
                                    visibleNodeCount,
                                    visibleEdgeCount,
                                    onResetView: resetView,
                                    onViewPreset: (preset) => {
                                        graphViewPreset(graphtyRef.current?.graph ?? null, preset);
                                    },
                                    onToggleToolbar: () => {
                                        toggleOverlay("toolbar");
                                        setViewsMenuOpen(false);
                                    },
                                    onToggleLegend: toggleLegend,
                                    onEnterVr: () => undefined,
                                    onEnterAr: () => undefined,
                                }}
                            />
                        </CanvasRegion>
                    </PopoutRegion>

                    <Box data-shell-region="inspector" style={{ display: "contents" }}>
                        <PopoutRegion id="inspector">
                            <Inspector
                                open={sidebarsShown}
                                width={inspectorWidth}
                                presentation={presentation}
                                selectionKind={selectionKind}
                                kindLabel={INSPECTOR_KIND_LABELS[selectionKind]}
                                identityLabel={selectedNode?.id}
                                pinned={dataLoaded && inspectorPinned}
                                onCopyReading={() => {
                                    copyReading(inspectorReadingForCopy);
                                }}
                                onPin={() => {
                                    setInspectorPinned(true);
                                }}
                                onWidthChange={setInspectorWidth}
                            >
                                <InspectorBody selection={inspectorSelection} />
                            </Inspector>
                        </PopoutRegion>
                    </Box>

                    {/* Settings is a full-panel overlay over the body row, not a
                            280 px panel and not a route (spec 03 section 2.7). */}
                    <PopoutRegion id="settings">
                        <SettingsOverlay
                            opened={settingsOpen}
                            section={settingsSection}
                            aiProviders={aiProviderSettings}
                            accelerationPolicy={accelerationPolicy}
                            onAccelerationPolicyChange={changeAccelerationPolicy}
                            labelShortfall={labelShortfall}
                            onClose={() => {
                                setSettingsOpen(false);
                            }}
                        />
                    </PopoutRegion>

                    <KeyboardShortcutsOverlay
                        opened={shortcutsOpen}
                        onClose={() => {
                            setShortcutsOpen(false);
                        }}
                    />
                </Box>

                {/* The Help menu is a sibling of the rail, not a child of it: the rail
                    clips its own overflow. It lands at left 56, bottom 4 with the menu
                    z-index (spec 02 section 1.3). */}
                <Box style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: CANVAS_MENU_Z_INDEX }}>
                    <Box style={{ position: "absolute", inset: 0, pointerEvents: "auto", display: "contents" }}>
                        <HelpMenu
                            opened={helpOpen}
                            onOpenChange={setHelpOpen}
                            onSelect={handleHelpSelect}
                            moreSuggestionsCount={0}
                            alreadyRunCount={0}
                        />
                    </Box>
                </Box>
            </Box>

            <Box data-shell-region="statusbar" style={{ display: "contents" }}>
                <StatusBar
                    slots={slots}
                    completion={statusCompletion}
                    exploreNotesExpanded={activeActivity === "explore" && isSectionOpen("explore.notes")}
                />
            </Box>

            {/*
                The size gate's one door (spec 1918-1927). It draws the estimate module's
                own sentence and the estimate module's own Run label, and NOTHING about
                the cost CLASS: the words instant, iterative, heavy and sampled are the
                implementation's vocabulary, not the reader's, and naming one here would
                hand a reader a category they cannot act on in place of the time they can.
                Cancel is a plain refusal that leaves the graph exactly as it was.
            */}
            {metricConfirm !== null && (
                <Modal
                    opened
                    onClose={() => {
                        setMetricConfirm(null);
                    }}
                    title={`Run ${NODE_METRIC_DEFINITIONS[metricConfirm.metric].plainName} (${NODE_METRIC_DEFINITIONS[metricConfirm.metric].technicalName})`}
                >
                    <Text size="sm" data-testid="metric-confirm-sentence">
                        {metricConfirm.estimate.confirmSentence}
                    </Text>
                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="default"
                            onClick={() => {
                                setMetricConfirm(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                const { metric, retiresInsightCard } = metricConfirm;

                                setMetricConfirm(null);
                                void runNodeMetricCard({ metric, confirmed: true, retiresInsightCard });
                            }}
                        >
                            {metricConfirm.estimate.runLabel}
                        </Button>
                    </Group>
                </Modal>
            )}

            <CommandPalette
                opened={paletteOpen}
                onClose={() => {
                    setPaletteOpen(false);
                }}
                items={paletteItems}
            />

            <FeedbackModal
                opened={feedbackOpen}
                onClose={() => {
                    setFeedbackOpen(false);
                }}
            />
        </Box>
        </>
    );
}

/**
 * The application shell: the store, the one pop-out manager, and the seven regions.
 * @param props - the store's starting width and whether it persists, for tests.
 * @returns the shell.
 */
export function AppShell(props: AppShellProps = {}): React.JSX.Element {
    const { initialShellWidth, measureViewport, persist = true } = props;

    return (
        <ShellProvider
            initialShellWidth={initialShellWidth}
            measureViewport={measureViewport}
            persist={persist}
            initialStateAxis="empty"
        >
            <PopoutManager>
                <ShellFrame persist={persist} />
            </PopoutManager>
        </ShellProvider>
    );
}
