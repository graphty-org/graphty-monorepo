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
 *   group -- the 7.3 rule table computes its cards and the strip is drawn from them --
 *   and neither is the minimap: its M binding and its Views checkmark do claim it is
 *   shown, which is why it is passed a config.
 * - **The legend's channels.** With nothing encoded the legend renders nothing by
 *   design (spec 01 section 9), so an empty channel list is the correct state, not a
 *   missing one.
 */

import { type DataTableColumn, type HistogramBin, PopoutManager, PopoutRegion } from "@graphty/compact-mantine";
import { Box } from "@mantine/core";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getLayoutMetadata, LAYOUT_METADATA } from "../../data/layoutMetadata";
import { CAT_SOCIAL_NETWORK, CAT_SOCIAL_NETWORK_NAME } from "../../data/sampleGraphs";
import { SAMPLE_MANIFEST, type SampleRecord, sampleSizeString } from "../../data/sampleManifest";
import { useAiKeyStorage } from "../../hooks/useAiKeyStorage";
import { useAiManager } from "../../hooks/useAiManager";
import { useGraphInfo } from "../../hooks/useGraphInfo";
import type { ProviderType } from "../../types/ai";
import { createEmptyStyleLayer, type IndexedLayerItem, styleLayersToLayerItems } from "../../utils/layerConversion";
import type { ChatMessage } from "../ai/AiMessageBubble";
import { FeedbackModal } from "../FeedbackModal";
import type { GraphtyHandle, SelectionChangedDetail, StyleLayer, StylesChangedDetail } from "../Graphty";
import type { LayerItem } from "../layout/LeftSidebar";
import type { LoadDataRequest } from "../LoadDataModal";
import type { AlgorithmStyleLayer } from "../RunAlgorithmModal";
import {
    addStyleLayers,
    asElementGraph,
    type ElementStyleLayerLike,
    removeLayersFromSource,
    repaintStyles,
} from "./analysis/elementBridge";
import { computeGraphShape, type GraphShape } from "./analysis/graphShape";
import { COMMUNITY_METHOD_NAME, type DegreeResults, runCommunityDetection, runDegreePass } from "./analysis/runs";
import { readPersistedCanvasLayout, resolveCanvasLayout, writePersistedCanvasLayout } from "./canvas/canvasMemory";
import { CanvasRegion, type CanvasRegionOwnProps, useCanvasBottomStack } from "./canvas/CanvasRegion";
import type { DataDrawerTab } from "./canvas/DataTableDrawer";
import type { InsightCard } from "./canvas/InsightsStrip";
import type { LegendChannel } from "./canvas/Legend";
import { communityColourChannel } from "./canvas/legendChannels";
import { type WelcomeSample, WelcomeSampleList } from "./canvas/WelcomeSampleList";
import { CommandPalette, type CommandPaletteItem } from "./CommandPalette";
import {
    ACTIVITIES_REQUIRING_DATA,
    ACTIVITY_RAIL_WIDTH,
    CANVAS_MENU_Z_INDEX,
    canvasToolbarProfile,
    STATUS_BAR_HEIGHT,
    TOP_BAR_HEIGHT,
} from "./constants";
import { labelDegreeThreshold, LARGE_GRAPH_NODE_THRESHOLD, loadDefaults } from "./defaults/loadDefaults";
import {
    COMMUNITY_LAYER_NAME,
    COMMUNITY_LAYER_SOURCE,
    COMMUNITY_PALETTE,
    communityColourLayers,
    LOAD_DEFAULTS_LAYER_SOURCE,
    type StyleLayerDescriptor,
    topDegreeLabelLayer,
} from "./defaults/styleDescriptors";
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
import { AnalyzePanel } from "./panel/AnalyzePanel";
import { DataPanel, type LoadedDataSummary } from "./panel/DataPanel";
import { ExplorePanel, type ExploreSearchScope } from "./panel/ExplorePanel";
import { PresentPanel } from "./panel/PresentPanel";
import { SettingsOverlay } from "./panel/SettingsOverlay";
import { StylePanel } from "./panel/StylePanel";
import { ActivityRail } from "./rail/ActivityRail";
import { HelpMenu, type HelpMenuRowId } from "./rail/HelpMenu";
import { communityReading, communityResultBody } from "./readings/communityReading";
import { DEFAULT_EDGE_NOUN, GRAPH_SUMMARY_EMPTY_READING, graphSummaryReading } from "./readings/graphSummaryReading";
import { formatCount } from "./readings/readingFormat";
import { runRecordLine } from "./readings/runRecord";
import { ShellProvider, useShell } from "./ShellContext";
import { formatCountPair, formatCountsTitle } from "./statusbar/formatCounts";
import { StatusBar } from "./statusbar/StatusBar";
import type { LayoutQuickPick, StatusBarSlotsModel } from "./statusbar/statusBarModel";
import { CanvasToolbar, type CanvasToolbarComponentProps } from "./toolbar/CanvasToolbar";
import { TopBar } from "./topbar/TopBar";
import { historyRows, useUndoStore } from "./topbar/undoStore";
import type { ActivityId, CanvasViewMode, PrimaryActivityId, SelectionKind, ShellStateAxis } from "./types";
import { useShellKeyBindings } from "./useShellKeyBindings";

/** The Data panel's own overflow row (spec 03 section 2.1, rev 1.8). */
const CLOSE_DATASET_ROW = "Close dataset. Starts a new session";

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
 * direction is in neither: nothing in this build reads it off the data --
 * `useGraphInfo`'s `directed` is its own default, not a measurement -- and the one
 * place a wrong direction would do its damage is silently, in every algorithm after it.
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

/**
 * One end of an edge record, as an id.
 *
 * An edge's endpoints are the user's own ids, which a loader may have left as strings or
 * as numbers. Anything else -- an object, an absent value -- is not an id the shell can
 * match a node against, and is read as no endpoint rather than stringified into one.
 * @param value - the raw `source` or `target` the edge record carries.
 * @returns the endpoint's id, or null when the record carries none.
 */
function edgeEndpoint(value: unknown): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    return null;
}

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
 * One style-layer descriptor, as the element bridge takes it.
 *
 * The two modules meet here and nowhere else: `defaults/styleDescriptors.ts` owns the
 * descriptor VOCABULARY as named interfaces, and `analysis/elementBridge.ts` takes a
 * layer as open records, because that is what graphty-element's `StyleManager` accepts.
 * A named interface carries no index signature, so the two shapes are structurally
 * compatible in one direction only; spreading each half produces the anonymous object
 * type the bridge asks for. Nothing is renamed, dropped or nested -- in particular
 * `calculatedStyle` stays a SIBLING of `style`, which is the one mistake that would make
 * a calculated value silently vanish.
 * @param layer - the descriptor a builder in `defaults/` produced.
 * @returns the same layer, shaped as the bridge takes it.
 */
function elementStyleLayer(layer: StyleLayerDescriptor): ElementStyleLayerLike {
    return { metadata: { ...layer.metadata }, node: { ...layer.node } };
}

/**
 * One half of a layer as the list and the inspector hand it back: the node half or the
 * edge half of a `LayerItem`, absent on a layer that does not style that end.
 */
type LayerItemHalf = LayerItem["styleLayer"]["node"] | LayerItem["styleLayer"]["edge"];

/**
 * Whether two halves of a layer say the same thing.
 *
 * Compared by VALUE and not by reference: the inspector rebuilds the half it edits on
 * every keystroke (`StyleLayerPropertiesPanel.handleColorChange` restates the whole
 * style), so a reference test would call every edit a change -- including the halves a
 * rename leaves alone. A half holds only what graphty-element's `StyleLayer` holds --
 * a selector string and two plain records of style values -- so serialising it is a
 * true value test, and the worst a key-order difference can cost is one write of the
 * same values.
 * @param before - the half the shell last read from the element.
 * @param after - the half that just came up the list's channel.
 * @returns true when nothing in the half changed.
 */
function sameStyleHalf(before: LayerItemHalf, after: LayerItemHalf): boolean {
    if (before === undefined || after === undefined) {
        return before === after;
    }

    return JSON.stringify(before) === JSON.stringify(after);
}

/**
 * One half of a layer, shaped as graphty-element's `StyleLayer` takes it.
 *
 * `calculatedStyle` is written only when the half carries one, so a half without one
 * does not plant an `undefined` beside `style` -- the element's own schema reads the
 * two as siblings, and a present-but-undefined calculated style is not the same fact as
 * an absent one.
 * @param half - the half the list or the inspector handed back.
 * @returns the same half, as the element's layer takes it.
 */
function elementStyleHalf(half: NonNullable<LayerItemHalf>): NonNullable<StyleLayer["node"]> {
    return {
        selector: half.selector,
        style: half.style,
        ...(half.calculatedStyle === undefined ? {} : { calculatedStyle: half.calculatedStyle }),
    };
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

/** How many bars the degree histogram draws at most. Past that, degrees share a bar. */
const DEGREE_HISTOGRAM_MAX_BINS = 20;

/** A degree distribution, ready for `GraphSummary`'s histogram row. */
interface DegreeHistogram {
    /** One bar per degree, or per band of degrees once there are more than the cap. */
    readonly bins: readonly HistogramBin[];
    /** The lowest degree measured, as the axis's left end. */
    readonly axisMin: string;
    /** The highest degree measured, as the axis's right end. */
    readonly axisMax: string;
}

/** An empty distribution: no bar, and an axis that claims no range. */
const NO_DEGREE_HISTOGRAM: DegreeHistogram = { bins: [], axisMin: "0", axisMax: "0" };

/**
 * The degree distribution the graph summary's "Links per node" histogram draws.
 *
 * It is measured from the degree pass the load already ran (7.2) and from nothing else:
 * one bar per distinct degree while that fits under {@link DEGREE_HISTOGRAM_MAX_BINS},
 * and equal-width bands of degrees once it does not, so a graph whose degrees run to the
 * thousands draws twenty bars rather than thousands. A band's label names the degrees it
 * holds, so no bar reports a number the reader cannot place.
 *
 * With no pass there is no distribution, and the empty one draws no bar. The section
 * that holds the histogram is not drawn at all in that state -- `GraphSummary` renders
 * it inside Most connected, which renders only when there is a ranked row -- so nothing
 * on screen claims a distribution the shell has not measured.
 * @param degreesDescending - every node's degree, highest first, from the degree pass.
 * @returns the bars and the axis ends.
 */
function degreeHistogram(degreesDescending: readonly number[]): DegreeHistogram {
    const highest = degreesDescending[0];
    const lowest = degreesDescending[degreesDescending.length - 1];

    if (highest === undefined || lowest === undefined) {
        return NO_DEGREE_HISTOGRAM;
    }

    const span = highest - lowest + 1;
    const width = Math.ceil(span / Math.min(span, DEGREE_HISTOGRAM_MAX_BINS));
    const counts = new Array<number>(Math.ceil(span / width)).fill(0);

    for (const degree of degreesDescending) {
        const index = Math.min(Math.floor((degree - lowest) / width), counts.length - 1);

        counts[index] += 1;
    }

    return {
        bins: counts.map((count, index) => {
            const from = lowest + index * width;
            const to = Math.min(from + width - 1, highest);
            const links = from === to ? formatCount(from) : `${formatCount(from)} to ${formatCount(to)}`;

            return { label: `${links} links: ${formatCount(count)} nodes`, count };
        }),
        axisMin: formatCount(lowest),
        axisMax: formatCount(highest),
    };
}

/**
 * What the Counts "Type" row may say about direction.
 *
 * The row's string is a claim plus where the claim was read: "Directed (from file),
 * weighted (amount), timed (opened)" (inspectorConstants.ts:336), which is spec line 843
 * -- "Direction (Directed / Undirected, from the file where the format carries it)". A
 * measured direction therefore keeps its provenance, and where the format carried none
 * the row says that and claims nothing. It does NOT read
 * `graphInfo.graphType.directed`, which defaults to true and measures nothing, and there
 * is no 6.3 pair for a fact nobody read: a plain-language phrase alone is the whole
 * vocabulary the unknown case has.
 */
const COUNTS_TYPE_ROW: Readonly<Record<GraphShape["directedness"], string>> = {
    directed: "Directed (from file)",
    undirected: "Undirected (from file)",
    unknown: "Not stated in the file",
};

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
        closeNarrowOverlay,
        closePanel,
        inspectorKeptOpen,
        inspectorOpen,
        inspectorWidth,
        isSectionOpen,
        openActivity,
        panelKeptOpen,
        panelWidth,
        selectActivity,
        setInspectorKeptOpen,
        setInspectorWidth,
        setPanelKeptOpen,
        setPanelWidth,
        setStateAxis,
        toggleInspector,
    } = shell;

    /* ---------------------------------------------------------------------- */
    /* The graph host and what the application knows about the data           */
    /* ---------------------------------------------------------------------- */

    const graphtyRef = useRef<GraphtyHandle>(null);
    const { graphInfo, updateStats, addDataSource } = useGraphInfo();
    const [datasetName, setDatasetName] = useState<string | null>(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [loadedSummary, setLoadedSummary] = useState<LoadedDataSummary | undefined>(undefined);
    const [graphData, setGraphData] = useState<ShellGraphData>(NO_GRAPH_DATA);
    /* How many loads the element has reported COMPLETE since the last dataset boundary.
       The 7.2 defaults wait on it rather than on the first data event: a chunked load
       publishes `data-added` per chunk, and a decision taken on the first one is taken
       over a partial graph. */
    const [loadCompletions, setLoadCompletions] = useState(0);
    const [layers, setLayers] = useState<IndexedLayerItem[]>([]);
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
    const [exploreScope, setExploreScope] = useState<ExploreSearchScope>("all");
    const [viewMode, setViewMode] = useState<CanvasViewMode>("3d");
    const [layoutType, setLayoutType] = useState<string>(DEFAULT_LAYOUT);
    const [layoutConfig, setLayoutConfig] = useState<Record<string, unknown>>({});
    const [selectedNode, setSelectedNode] = useState<{
        readonly id: string;
        readonly attributes: Record<string, unknown> | null;
    } | null>(null);
    const layerCounter = useRef(1);
    const firstLoadDone = useRef(false);
    /* Whether the 7.2 defaults have been applied to the dataset now loaded. They are a
       per-dataset one-shot: re-applying them would fight a layout or a label budget the
       user has since changed, and the graph's own data events fire more than once per
       load. `crossDatasetBoundary` clears it. */
    const loadDefaultsAppliedRef = useRef(false);
    /* The card a sample row's closing hint asked for, consumed once the defaults have
       landed, so the suggested run happens on a graph that already has its neutral base
       and its degrees (7.1 item 2: one interaction, in the right order). */
    const pendingSuggestedRef = useRef<InsightCapability | null>(null);
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
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
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
       own example, so it is read back once and held rather than re-run per reader. */
    const [degreeResults, setDegreeResults] = useState<DegreeResults | null>(null);

    /* The result the inspector's Algorithm-result surface is drawing, or null. A
       selected node still wins over it (see `selectionKind`), so this is kept in state
       rather than recomputed when a selection clears. */
    const [activeResult, setActiveResult] = useState<{
        readonly reading: string;
        readonly runRecord: string;
        readonly body: readonly ResultBodyRow[];
        readonly layerName: string;
        readonly stateSwatch: string;
    } | null>(null);

    /*
     * The colour channel the legend draws, set by whatever painted the canvas.
     *
     * It is the home of the sentence the community reading no longer carries. Design line
     * 201 gives the legend the channel header "Color: groups, categorical", and 5808 has
     * Copy reading pick up "the legend's channel lines" -- so what the colours MEAN is the
     * legend's fact, and repeating it as a third sentence in the reading both broke RT-10's
     * two-sentence budget and said the same thing twice. Null until something encodes
     * colour, because an unencoded channel is absent rather than empty (spec 4121).
     */
    const [colourChannel, setColourChannel] = useState<LegendChannel | null>(null);

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
    /* What one O(n+m) pass over the loaded records can honestly say            */
    /* ---------------------------------------------------------------------- */

    /* Components, isolated nodes, self-loops, parallel edges and the direction the
       records actually carry -- the facts the graph-summary reading and the 7.3 rule
       table both read. Nothing above O(n+m) is in here: no diameter, no path lengths,
       and no direction guessed from `graphInfo.graphType.directed`, which defaults to
       true and is therefore not a measurement. */
    const graphShape = useMemo(() => computeGraphShape(graphData), [graphData]);

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

        setGraphData({ nodes: data.nodes, edges: data.edges });
        updateStats(data.nodes.length, data.edges.length);
    }, [updateStats]);

    useEffect(() => {
        refreshGraphDataRef.current = refreshGraphData;
    }, [refreshGraphData]);

    /*
     * Counts the loads graphty-element has reported COMPLETE, on the frame the event
     * bubbles to ({@link DATA_LOADED_EVENT}).
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

        /* The 7.2 defaults, the degree pass and any result describe the graph that has
           gone, so they go with it: the latch is cleared so the next load applies its
           own defaults, the completion count is zeroed so a completion reported for the
           load that has gone cannot arm them early, and neither a stale degree ranking
           nor a stale community reading outlives the data it was measured from. */
        loadDefaultsAppliedRef.current = false;
        pendingSuggestedRef.current = null;
        setLoadCompletions(0);
        setDegreeResults(null);
        setActiveResult(null);
        setColourChannel(null);

        /* The style layers the SHELL added encode the graph that has gone -- every
           selector in them matches on a node id or on an `algorithmResults` value that
           left with it -- so they go too. Without this a replacing load stacked a second
           set of 7.2 layers on top of the first, and every later load one more.

           Scoped by tag, never by index. graphty-element's own stack opens with its
           `default` layer, which carries every node's shape type (Styles.ts:54-67), and
           an index walk took that with it: the next load then died in mesh building with
           "shape with type required to create mesh" and drew nothing at all. The shell
           removes what the shell added and leaves the element's own layers alone. */
        const graph = asElementGraph(graphtyRef.current?.graph);

        if (graph !== null) {
            removeLayersFromSource(graph, LOAD_DEFAULTS_LAYER_SOURCE);
            removeLayersFromSource(graph, COMMUNITY_LAYER_SOURCE);
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
     * Everything that is true once a load has succeeded, whatever started it.
     *
     * A load from the dialog, a dropped file and the `?test` sample all land here, so
     * the dataset name reaches the top bar, the Loaded data section gets its summary,
     * the counts are re-read and the session's first load switches the panel to Explore
     * exactly once, by one route rather than three that can drift.
     */
    const finishLoad = useCallback(
        (name: string, type: string, summary: LoadedDataSummary | undefined) => {
            addDataSource({ name, type });
            setDatasetName(name);
            setDataLoaded(true);
            setLoadedSummary(summary);
            refreshGraphData();

            // Spec 02 section 1.5: on the session's FIRST successful load the
            // panel switches to Explore, whatever was remembered.
            if (!firstLoadDone.current) {
                firstLoadDone.current = true;
                openActivity("explore");
            }
        },
        [addDataSource, openActivity, refreshGraphData],
    );

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
        handle.loadData("json", { data: JSON.stringify(CAT_SOCIAL_NETWORK) });
        finishLoad(CAT_SOCIAL_NETWORK_NAME, "json", { format: "json", size: undefined });
    }, [finishLoad, graphReady]);

    const handleLoad = useCallback(
        (request: LoadDataRequest) => {
            const handle = graphtyRef.current;

            if (handle === null) {
                console.error("[shell] the graph is not initialised yet");

                return;
            }

            const format = request.format === "auto" ? undefined : request.format;

            const load = async (): Promise<string> => {
                if (request.replaceExisting) {
                    // A replacing load crosses the same boundary as Close dataset
                    // (6.12), so it clears the same things by the same route.
                    handle.clearData();
                    crossDatasetBoundary();
                }

                if (request.inputMethod === "url" && request.url !== undefined) {
                    await handle.loadFromUrl(request.url, format);

                    return request.url.split("/").pop() ?? request.url;
                }

                if (request.inputMethod === "file" && request.file !== undefined) {
                    await handle.loadFromFile(request.file, format);

                    return request.file.name;
                }

                if (request.inputMethod === "paste" && request.data !== undefined) {
                    handle.loadData(format ?? "json", { data: request.data });

                    return "pasted-data";
                }

                throw new Error("the load request named no source");
            };

            load()
                .then((name) => {
                    finishLoad(name, format ?? "auto", loadedDataSummary(request));
                })
                .catch((error: unknown) => {
                    console.error("[shell] failed to load data:", error);
                });
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
            const handle = graphtyRef.current;

            if (handle === null) {
                console.error("[shell] the graph is not initialised yet");

                return;
            }

            /* A sample click is a REPLACING load, so it takes `handleLoad`'s route
               through the 6.12 boundary rather than merging into whatever is drawn: the
               old records go, and with them the selection, the stale result, the layers
               that encoded the old graph and the latch that would otherwise deny the new
               dataset its own 7.2 defaults. Before this, a sample clicked from the Data
               panel in the Loaded state renamed the dataset in the top bar while the
               graph kept the old one's nodes -- the shell asserting a dataset that was
               never loaded. */
            handle.clearData();
            crossDatasetBoundary();

            // After the boundary, which clears it: the pending card belongs to the load
            // that is starting, not to the dataset that has just gone.
            pendingSuggestedRef.current = runSuggested ? (record.suggestedCapability ?? null) : null;

            const { source } = record;

            if (source.kind === "inline") {
                handle.loadData(source.format, { data: JSON.stringify(source.payload) });
                finishLoad(record.fileName, source.format, { format: source.format, size: undefined });

                return;
            }

            handle
                .loadFromUrl(source.url, source.format)
                .then(() => {
                    finishLoad(record.fileName, source.format, { format: source.format, size: undefined });
                })
                .catch((error: unknown) => {
                    pendingSuggestedRef.current = null;
                    console.error("[shell] failed to load the sample:", error);
                });
        },
        [crossDatasetBoundary, finishLoad],
    );

    /* ---------------------------------------------------------------------- */
    /* Style layers, from graphty-element as the single source of truth        */
    /* ---------------------------------------------------------------------- */

    const handleStylesChange = useCallback((detail: StylesChangedDetail) => {
        setLayers(styleLayersToLayerItems(detail.layers));
    }, []);

    /**
     * Repaints after a layer-list write, through the bridge's own repaint.
     *
     * This callback holds the element's `Graph`, which the bridge's `ElementGraph` view is
     * a subset of, so it goes through `asElementGraph` like every other call here.
     * @param graph - the element graph, as this callback holds it.
     */
    const repaintElementStyles = useCallback((graph: unknown) => {
        const bridged = asElementGraph(graph);

        if (bridged !== null) {
            repaintStyles(bridged);
        }
    }, []);

    const handleLayersChange = useCallback(
        (next: LayerItem[]) => {
            const graph = graphtyRef.current?.graph ?? null;

            if (graph === null) {
                return;
            }

            const manager = graph.getStyleManager();
            const currentIds = layers.map((layer) => layer.id);
            const nextIds = next.map((layer) => layer.id);

            /* The list has one upward channel and it carries every kind of edit, so it has
               to say which this was. Layer ids are positional (`layer-${index}`,
               layerConversion.ts:29), so the SAME ids in the SAME order cannot be a reorder:
               the list was edited IN PLACE. Before this branch existed every rename fell
               through the loop below on `continue` and reached graphty-element -- the single
               source of truth these names are drawn from -- never at all, so the row kept
               drawing the old name while the editor held the new one. */
            const inPlace =
                currentIds.length === nextIds.length && currentIds.every((id, index) => id === nextIds[index]);

            if (inPlace) {
                const live = manager.getLayers();

                for (const item of next) {
                    const before = layers.find((layer) => layer.id === item.id);

                    if (before === undefined) {
                        continue;
                    }

                    /* An in-place edit is not only a rename. The same channel carries the
                       style-layer inspector's own edits -- `onUpdate` for the node half,
                       `onEdgeUpdate` for the edge half -- so the branch asks WHAT changed
                       instead of assuming. It used to read the live layer back, spread it and
                       override `metadata.name` alone, which spread a style edit away: product
                       owner, 2026-09-13, "changing the color of a style in the style inspector
                       doesn't change the color in component or in the graph". */
                    const renamed = before.name !== item.name;
                    const nodeEdited = !sameStyleHalf(before.styleLayer.node, item.styleLayer.node);
                    const edgeEdited = !sameStyleHalf(before.styleLayer.edge, item.styleLayer.edge);

                    if (!renamed && !nodeEdited && !edgeEdited) {
                        continue;
                    }

                    const layer = live[before.index];

                    if (layer === undefined) {
                        continue;
                    }

                    /* The live layer is read from the manager and spread, rather than rebuilt
                       from the `LayerItem`: the item is a lossy projection of a layer
                       (layerConversion.ts:23-49 keeps only selector, style and
                       calculatedStyle), so only the halves that actually changed are written
                       over. Metadata is spread rather than replaced so a layer created by a run
                       keeps its `algorithmSource` binding -- which is what DECISIONS-1.7:1829
                       and :1962 mean by "the typed name once renamed" and "a renamed layer
                       never re-derives". */
                    manager.updateLayerByIndex(before.index, {
                        ...layer,
                        /* The name is written only by a rename. `LayerItem.name` falls back to
                           `Layer ${index + 1}` when a layer carries none (layerConversion.ts:25),
                           so writing it unconditionally would turn that display fallback into a
                           name the element then owns, on the back of an edit to a colour. */
                        ...(renamed ? { metadata: { ...layer.metadata, name: item.name } } : {}),
                        ...(nodeEdited && item.styleLayer.node !== undefined
                            ? { node: elementStyleHalf(item.styleLayer.node) }
                            : {}),
                        ...(edgeEdited && item.styleLayer.edge !== undefined
                            ? { edge: elementStyleHalf(item.styleLayer.edge) }
                            : {}),
                    });
                }

                /* Repaint, always. `updateLayerByIndex` re-evaluates selectors through the
                   element's own style-changed handler, which runs WITHOUT algorithmResults
                   and never runs calculated values (elementBridge.ts:142-151). So any edit
                   to the list -- a bare rename included -- silently dropped every
                   algorithmResults-driven encoding on the canvas, and the top-degree labels
                   never came back. Found in review, 2026-09-13. */
                repaintElementStyles(graph);

                return;
            }

            for (let index = 0; index < nextIds.length; index += 1) {
                if (currentIds[index] === nextIds[index]) {
                    continue;
                }

                const movedId = nextIds[index];
                const from = layers.find((layer) => layer.id === movedId);
                const to = layers[index] as IndexedLayerItem | undefined;

                if (from !== undefined && to !== undefined) {
                    manager.reorderLayers(from.index, to.index);
                    // Same reason as the edit path above: reordering re-evaluates the stack.
                    repaintElementStyles(graph);
                }

                break;
            }
        },
        [layers, repaintElementStyles],
    );

    const handleAddLayer = useCallback(() => {
        const graph = graphtyRef.current?.graph ?? null;

        if (graph === null) {
            return;
        }

        const name = `New Layer ${layerCounter.current}`;

        layerCounter.current += 1;
        graph.getStyleManager().addLayer(createEmptyStyleLayer(name));
    }, []);

    const handleAddAlgorithmLayers = useCallback((algorithmLayers: AlgorithmStyleLayer[]) => {
        const graph = graphtyRef.current?.graph ?? null;

        if (graph === null) {
            return;
        }

        for (const algorithmLayer of algorithmLayers) {
            const styleLayer: StyleLayer = {
                metadata: { name: algorithmLayer.name, algorithmSource: algorithmLayer.id },
                node: algorithmLayer.styleLayer.node,
                edge: algorithmLayer.styleLayer.edge,
            };

            graph.getStyleManager().addLayer(styleLayer);
        }
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

        setSelectedNode({ id: String(detail.currentNodeId), attributes: detail.currentNodeData });
    }, []);

    /**
     * A tap on the canvas below 1280 px dismisses the open overlay -- unless the tap
     * SELECTED something.
     *
     * Design 5.2 already writes the same carve-out for the canvas toolbar ("Tapping the
     * canvas toolbar is not tapping the canvas"); this is the node case, which the spec
     * never wrote and which made the reported bug: the tap that fills the inspector was
     * also the tap that dismissed it, so a selection could not be explored on an iPad.
     *
     * It lives here rather than in `CanvasRegion` because the region knows only what was
     * under the pointer, while the shell is the only place that knows what the pick
     * produced. The region's contract is unchanged: it still reports every tap that was
     * not on its own chrome.
     */
    const handleCanvasTap = useCallback(() => {
        if (lastSelectionRef.current !== null) {
            return;
        }

        closeNarrowOverlay();
    }, [closeNarrowOverlay]);

    /* ---------------------------------------------------------------------- */
    /* Rail routing. Settings and Help never become the active activity, so    */
    /* the rail's marker stays on the open panel (spec 03 sections 2.7, 2.8).  */
    /* ---------------------------------------------------------------------- */

    const handleActivityClick = useCallback(
        (activity: ActivityId) => {
            if (activity === "settings") {
                setHelpOpen(false);
                /* The rail names no section, so Settings opens where it was left --
                   6.5's memory. Only a caller that came looking for one pane asks
                   for one, which today is the assistant's setup prompt. */
                setSettingsSection(undefined);
                setSettingsOpen((open) => !open);

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
        [selectActivity],
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
     */
    const runFindGroups = useCallback(async () => {
        const graph = asElementGraph(graphtyRef.current?.graph);

        if (graph === null) {
            console.error("[shell] the graph is not initialised yet");

            return;
        }

        const stats = await runCommunityDetection(graph);
        const colourLayers = communityColourLayers(stats.groups);

        /* One result owns one set of layers, so the previous run's colours come off
           before these go on -- by the same tag and the same helper the inspector's
           Delete layer uses. Without the removal a second run left two full stacks of
           community colours on the graph for one result. */
        removeLayersFromSource(graph, COMMUNITY_LAYER_SOURCE);
        addStyleLayers(graph, colourLayers.map(elementStyleLayer));

        const statistics = {
            ...stats,
            colouredGroupCount: Math.min(stats.groupCount, colourLayers.length),
            encodingApplied: colourLayers.length > 0,
        };

        /* A selected node outranks a result on this surface, so the result is only
           reachable once the selection is cleared -- which is also what 7.3 means by the
           reading being what the reader sees immediately after the click. */
        setSelectedNode(null);
        setActiveResult({
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
            layerName: COMMUNITY_LAYER_NAME,
            stateSwatch: COMMUNITY_PALETTE[0],
        });
        setColourChannel(communityColourChannel(statistics));
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
    }, [openPanelAt, undoStore]);

    /* ---------------------------------------------------------------------- */
    /* 7.2: what a load decides, and the degree pass it runs in the background */
    /* ---------------------------------------------------------------------- */

    /*
     * The layout, the label budget, the size scale and the one neutral colour, applied
     * once per dataset from the loaded graph's size alone. Nothing else runs (7.2), and
     * every number and every hex comes from the defaults module rather than from here.
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

        const defaults = loadDefaults({ nodeCount: graphShape.nodeCount });

        setLayoutType(defaults.layout.type);
        setLayoutConfig(defaults.layout.config);

        const apply = async (): Promise<void> => {
            const degrees = await runDegreePass(graph);

            setDegreeResults(degrees);

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
            const styleLayers: StyleLayerDescriptor[] = [];

            const degreeThreshold = labelDegreeThreshold(degrees.degreesDescending, defaults.labelCount);

            if (degreeThreshold !== undefined) {
                styleLayers.push(topDegreeLabelLayer({degreeThreshold}));
            }

            // `addStyleLayers` repaints, which is what makes the calculated size and the
            // `algorithmResults` selector take effect at all.
            addStyleLayers(graph, styleLayers.map(elementStyleLayer));

            const pending = pendingSuggestedRef.current;

            pendingSuggestedRef.current = null;

            if (pending === "community-detection") {
                await runFindGroups();

                /* Spec 5643-5648: the hint's click ends "one undoable history entry, that
                   card retired". The reader has been taken where the card was taking
                   them, so the card has done its job, and the retirement outlives the
                   session in the insights key. It happens after the run, not before: a
                   run that threw has retired nothing. */
                setInsightsMemory((current) => withRetiredCapability(current, pending));
            }
        };

        apply().catch((error: unknown) => {
            console.error("[shell] could not apply the load defaults:", error);
        });
    }, [dataLoaded, graphData.nodes.length, graphShape.nodeCount, loadCompletions, runFindGroups]);

    /**
     * Shows or hides the activity panel: the Mod+B binding and the top bar's panel
     * switch are the SAME callback, so the key and the button cannot come to disagree.
     *
     * With no panel open it opens Data, which is where a reader goes to get a dataset and
     * is the only destination that is not arbitrary; with one open it closes it. It never
     * consults the latch: this is the user's own control, and the latch only ever vetoes
     * a close the shell performs on its own (6.12).
     */
    const togglePanel = useCallback(() => {
        if (activeActivity === null) {
            openActivity("data");

            return;
        }

        closePanel();
    }, [activeActivity, closePanel, openActivity]);

    /* ---------------------------------------------------------------------- */
    /* The canvas's docks and overlays                                        */
    /* ---------------------------------------------------------------------- */

    /*
     * Spec 01 section 7 item 3 and spec 5.2: the Data table drawer "overlays the canvas
     * from the bottom, coexists with the inspector, and closes the activity panel".
     * Only the PANEL goes -- the inspector is explicitly allowed to stay -- and only
     * below 1280, where the panel is an overlay rather than a column. `closePanel` is
     * the store's own path, so the narrow-overlay bookkeeping stays in one place.
     */
    const closePanelForNarrowDrawer = useCallback(() => {
        // A latched panel is not displaced by the drawer either: 6.12's latch refuses
        // every close the shell performs on its own, and this is one of them. The two
        // can share the screen -- the drawer is a bottom dock and 5.2 already says it
        // never covers the panel -- so the refusal costs the drawer nothing.
        if (breakpoint === "narrow" && !panelKeptOpen) {
            closePanel();
        }
    }, [breakpoint, closePanel, panelKeptOpen]);

    const setDrawerOpen = useCallback(
        (open: boolean) => {
            setCanvasLayout((current) => ({ ...current, drawerOpen: open }));

            if (open) {
                closePanelForNarrowDrawer();

                return;
            }

            setDrawerMaximised(false);
        },
        [closePanelForNarrowDrawer],
    );

    const toggleDrawer = useCallback(() => {
        if (!canvasLayout.drawerOpen) {
            closePanelForNarrowDrawer();
        }

        setCanvasLayout((current) => ({ ...current, drawerOpen: !current.drawerOpen }));
        setDrawerMaximised(false);
    }, [canvasLayout.drawerOpen, closePanelForNarrowDrawer]);

    const toggleOverlay = useCallback((key: "insightsDismissed" | "legend" | "minimap" | "timeSlider" | "toolbar") => {
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

    const handleHelpSelect = useCallback(
        (row: HelpMenuRowId) => {
            setHelpOpen(false);

            switch (row) {
                case "keyboardShortcuts":
                    setShortcutsOpen(true);
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
                    setShortcutsOpen(true);
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
        [openPanelAt],
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
        // Three of the ladder's five rungs. The two that are missing have no receiver
        // in this build, and that is a fact about the application rather than a wiring
        // slip: rung 1 cancels an in-progress node drag or marquee, and graphty-element
        // publishes no drag-cancel call (see `graphCommands.ts`, which says so); rung 4
        // pauses time slider playback, and no time slider can be drawn while no Time
        // role can be assigned (`toggleTimeSlider` is unshipped for the same reason).
        // `runEscapeLadder` skips a missing rung, so a press falls through to the next
        // one that exists, in order.
        escapeLadder: { clearSelection, closeNarrowOverlay, closeTopmostTransient },
        handlers: {
            commandPalette: () => {
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
                setShortcutsOpen(true);
            },
            redo: undoStore.redo,
            resetView,
            toggleDataDrawer: toggleDrawer,
            toggleInspector,
            toggleLegend: () => {
                toggleOverlay("legend");
            },
            toggleMinimap: () => {
                toggleOverlay("minimap");
            },
            togglePanel,
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

    const presentation = breakpoint === "narrow" ? "overlay" : "docked";
    const { nodeCount } = graphInfo;
    const { edgeCount } = graphInfo;

    /* Which activity the 280 px panel is drawing, or null when no panel is on screen.
       Settings and Help are rail destinations that never become a panel (spec 03
       sections 2.7, 2.8), so they resolve to null here -- and this one derivation is
       what the panel's render, the top bar's switch and the Cmd+B handler all read, so
       the switch cannot light for a panel that is not drawn. */
    const panelActivity: PrimaryActivityId | null =
        activeActivity === null || activeActivity === "settings" || activeActivity === "help" ? null : activeActivity;
    const panelOpen = panelActivity !== null;

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
                        updateStats(0, 0);
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
                        const styleManager = graphtyRef.current?.graph?.getStyleManager() ?? null;

                        if (styleManager === null) {
                            return;
                        }

                        for (const layer of [...layers].reverse()) {
                            styleManager.removeLayerByIndex(layer.index);
                        }
                    },
                },
            ];
        }

        return [];
    }, [activeActivity, crossDatasetBoundary, layers, updateStats]);

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
                        onAddLayers={handleAddAlgorithmLayers}
                        persist={persist}
                        /*
                            7.3: a capability run from its OWN panel retires its insight
                            card, because the reader has already been where the card was
                            taking them. A click on the card itself does not retire it --
                            that is the "Done" badge's job, and the strip has no field for
                            one. Only the Groups card runs anything in this build.
                        */
                        onRunSuggested={(id) => {
                            if (id !== "groups") {
                                return;
                            }

                            setInsightsMemory((current) => withRetiredCapability(current, "community-detection"));
                            void runFindGroups();
                        }}
                    />
                );
            case "style":
                return (
                    <StylePanel
                        layers={layers}
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
                        onLegendShownChange={(shown) => {
                            setCanvasLayout((current) => ({ ...current, legend: shown }));
                        }}
                    />
                );
            case "present":
                return <PresentPanel />;
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
                            setSettingsSection("ai");
                            setSettingsOpen(true);
                        }}
                    />
                );
            default:
                return null;
        }
    }, [
        activeActivity,
        aiKeyStorage.hasAnyProvider,
        aiManager,
        aiMessages,
        canvasLayout.drawerOpen,
        canvasLayout.legend,
        canvasLayout.timeSlider,
        exploreQuery,
        exploreScope,
        handleAddAlgorithmLayers,
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
        selectedLayerId,
        setDrawerOpen,
        stateAxis,
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

    const neighborsOf = useCallback(
        (nodeId: string): readonly NeighborRow[] => {
            const rows: NeighborRow[] = [];
            const seen = new Set<string>();

            for (const edge of graphData.edges) {
                const source = edgeEndpoint(edge.source);
                const target = edgeEndpoint(edge.target);
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

    const copyReading = useCallback((text: string) => {
        navigator.clipboard?.writeText(text).catch((error: unknown) => {
            console.error("[shell] could not copy the reading:", error);
        });
    }, []);

    /*
     * The graph-summary reading (7.5). It is the template's, not a sentence assembled
     * here, and it is fed only facts one O(n+m) pass measured.
     *
     * Two clauses the spec draws are deliberately absent. The type clause ("17 cats, 1 dog
     * and 2 humans") needs a node-type ROLE, and no column-role model exists in either
     * package -- the cat fixture's `breed` carries 17 values with counts of 1 to 3, so the
     * drawn string is not derivable from the data. The "at most 5 steps" clause needs an
     * exact diameter, which is above the O(n+m) ceiling spec 5843 sets for a template. The
     * template accepts `nodeTypes` and `exactDiameter` for the day either lands.
     */
    const graphReading = dataLoaded
        ? graphSummaryReading({
              nodeCount: graphShape.nodeCount,
              edgeCount: graphShape.edgeCount,
              edgeNoun: DEFAULT_EDGE_NOUN,
              connectedPartCount: graphShape.connectedPartCount,
              largestPartNodeCount: graphShape.largestPartNodeCount,
              smallPartsMostlySingleNodes: graphShape.smallPartsMostlySingleNodes,
          })
        : GRAPH_SUMMARY_EMPTY_READING;

    /* The distribution the histogram draws, from the same degree pass Most connected
       reads. Both are absent together: with no pass there are no ranked rows, and
       `GraphSummary` draws the histogram inside the Most connected section. */
    const degreeDistribution = useMemo(() => degreeHistogram(degreeResults?.degreesDescending ?? []), [degreeResults]);

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
                        onUpdate: (layerId, updates) => {
                            handleLayersChange(
                                layers.map((layer) =>
                                    layer.id === layerId
                                        ? {
                                              ...layer,
                                              styleLayer: {
                                                  ...layer.styleLayer,
                                                  /* The half's required fields are restated, not spread
                                                     from an optional: `styleLayer.node` may be absent on a
                                                     layer that only styles edges, and spreading `undefined`
                                                     would leave `selector` missing. */
                                                  node: {
                                                      selector: layer.styleLayer.node?.selector ?? "",
                                                      style: layer.styleLayer.node?.style ?? {},
                                                      ...(layer.styleLayer.node?.calculatedStyle === undefined
                                                          ? {}
                                                          : { calculatedStyle: layer.styleLayer.node.calculatedStyle }),
                                                      ...updates,
                                                  },
                                              },
                                          }
                                        : layer,
                                ),
                            );
                        },
                        onEdgeUpdate: (layerId, updates) => {
                            handleLayersChange(
                                layers.map((layer) =>
                                    layer.id === layerId
                                        ? {
                                              ...layer,
                                              styleLayer: {
                                                  ...layer.styleLayer,
                                                  edge: {
                                                      selector: layer.styleLayer.edge?.selector ?? "",
                                                      style: layer.styleLayer.edge?.style ?? {},
                                                      ...(layer.styleLayer.edge?.calculatedStyle === undefined
                                                          ? {}
                                                          : { calculatedStyle: layer.styleLayer.edge.calculatedStyle }),
                                                      ...updates,
                                                  },
                                              },
                                          }
                                        : layer,
                                ),
                            );
                        },
                    },
                };
            }
        }

        if (selectedNode === null && activeResult !== null) {
            return {
                kind: "algorithm-result",
                result: {
                    reading: activeResult.reading,
                    runRecord: activeResult.runRecord,
                    body: activeResult.body,
                    layerName: activeResult.layerName,
                    stateSwatch: activeResult.stateSwatch,
                    onChangeEncoding: () => {
                        openPanelAt("style");
                    },
                    onDeleteLayer: () => {
                        const graph = asElementGraph(graphtyRef.current?.graph);

                        if (graph !== null) {
                            removeLayersFromSource(graph, COMMUNITY_LAYER_SOURCE);
                        }

                        setActiveResult(null);
                        // The colours went with the layers, so the channel naming them goes too.
                        setColourChannel(null);
                    },
                    onRemoveResult: () => {
                        /* Only the result leaves. The layers stay painted, so the legend
                           keeps naming the colours that are still on the canvas. */
                        setActiveResult(null);
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
                              /* What the O(n+m) pass READ off the edge records, never
                                 `graphInfo.graphType.directed`, which defaults to true
                                 and measures nothing. */
                              types: COUNTS_TYPE_ROW[graphShape.directedness],
                              density: graphInfo.density.toFixed(3),
                              densityTitle: graphInfo.density.toExponential(2),
                              averageDegree: nodeCount === 0 ? "0" : ((edgeCount * 2) / nodeCount).toFixed(1),
                              connectedParts: formatCount(graphShape.connectedPartCount),
                              // 6.2's zero rule: a count of nothing is not a row.
                              selfLoops:
                                  graphShape.selfLoopCount === 0 ? undefined : formatCount(graphShape.selfLoopCount),
                              parallelEdges:
                                  graphShape.parallelEdgeCount === 0
                                      ? undefined
                                      : formatCount(graphShape.parallelEdgeCount),
                          }
                        : null,
                    mostConnected,
                    /* Every node the degree pass ranked, which is what "See all N
                       ranked" opens the table on -- not the five rows above it. */
                    rankedCount: degreeResults?.byDegreeDescending.length ?? 0,
                    degreeBins: degreeDistribution.bins,
                    degreeAxisMin: degreeDistribution.axisMin,
                    degreeAxisMax: degreeDistribution.axisMax,
                    schema: { ready: false, summary: "measuring...", nodeTypes: [], edgeTypes: [] },
                    attributes: { nodes: [], edges: [] },
                    caseNoteCount: 0,
                    onShowInTable: () => {
                        openDrawerOn("nodes");
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
                directed: graphInfo.graphType.directed,
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
                onAction: () => undefined,
            },
        };
    }, [
        activeResult,
        copyReading,
        dataLoaded,
        degreeDistribution,
        degreeResults,
        edgeCount,
        graphInfo.density,
        graphInfo.graphType.directed,
        graphReading,
        graphShape.connectedPartCount,
        graphShape.directedness,
        graphShape.parallelEdgeCount,
        graphShape.selfLoopCount,
        handleLayersChange,
        layers,
        mostConnected,
        neighborsOf,
        nodeCount,
        openDrawerOn,
        openPanelAt,
        selectedLayerId,
        selectedNode,
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

    const slots = useMemo<StatusBarSlotsModel>(() => {
        if (!dataLoaded) {
            return {};
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
            selection: selectedNode === null ? undefined : { label: "1 selected" },
        };
    }, [
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
        selectedNode,
    ]);

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
                setSettingsSection(undefined);
                setSettingsOpen(true);
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
                id: "view-minimap",
                group: "View",
                label: "Minimap",
                chipFor: "toggleMinimap",
                onSelect: () => {
                    toggleOverlay("minimap");
                },
            },
            {
                id: "view-legend",
                group: "View",
                label: "Legend",
                chipFor: "toggleLegend",
                onSelect: () => {
                    toggleOverlay("legend");
                },
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
                id: "view-inspector",
                group: "View",
                label: "Toggle inspector",
                chipFor: "toggleInspector",
                onSelect: toggleInspector,
            },
        );

        items.push(
            {
                id: "help-shortcuts",
                group: "Help",
                label: "Keyboard shortcuts",
                chipFor: "keyboardShortcuts",
                onSelect: () => {
                    setShortcutsOpen(true);
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
                    setShortcutsOpen(true);
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
        openPanelAt,
        resetView,
        toggleDrawer,
        toggleInspector,
        toggleOverlay,
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
            nodeCount: graphShape.nodeCount,
            edgeCount: graphShape.edgeCount,
            directedness: graphShape.directedness,
            hasTimeRole: false,
            validationIssueTypeCount: 0,
            searchExample: degreeResults?.byDegreeDescending[0]?.id,
            largeGraphThreshold: LARGE_GRAPH_NODE_THRESHOLD,
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
                    void runFindGroups();

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
        graphShape.directedness,
        graphShape.edgeCount,
        graphShape.nodeCount,
        insightsMemory.retiredCapabilities,
        openPanelAt,
        runFindGroups,
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

    /*
     * The legend's encoded channels: colour, from whatever painted the canvas last.
     *
     * Colour is the only channel the shell encodes now. The 7.2 size-by-degree layer was
     * reverted with the node defaults, and naming a size channel the canvas does not apply
     * would be the legend asserting an encoding that is not there. An unencoded channel is
     * absent rather than empty (spec 4121), so with nothing painted no `legend` config is
     * passed at all and the legend draws nothing.
     */
    const legendChannels = useMemo<readonly LegendChannel[]>(
        () => (colourChannel === null ? [] : [colourChannel]),
        [colourChannel],
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
        onCanvasTap: handleCanvasTap,
        ...(legendChannels.length === 0 ? {} : { legend: { channels: legendChannels } }),
        graphRef: graphtyRef,
        /*
         * Spec 01 section 5: the minimap "is never hidden, because ... a hidden minimap
         * would leave its M toggle and its Views menu checkmark describing an invisible
         * state". Withholding this config is what hid it: the region draws no overlay it
         * has no config for. The node count is the real one; the projection is the
         * Minimap's own documented placeholder ("it renders the points, the density grid
         * and the viewport rectangle it is handed") and waits on graphty-element
         * publishing node positions and a settle event -- it is not invented here.
         */
        minimap: { nodeCount },
        graph: {
            layers,
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
                       not a replacing load and crosses no dataset boundary. */
                    handleLoad({ inputMethod: "file", file, format: "auto", replaceExisting: false });
                }
            },
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

    return (
        <Box
            ref={frameRef}
            data-testid="app-shell"
            style={{
                height: "100vh",
                display: "grid",
                gridTemplateRows: `${TOP_BAR_HEIGHT}px minmax(0, 1fr) ${STATUS_BAR_HEIGHT}px`,
                gridTemplateColumns: "minmax(0, 1fr)",
                overflow: "hidden",
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
                panelOpen={panelOpen}
                onTogglePanel={togglePanel}
                inspectorOpen={inspectorOpen}
                onToggleInspector={toggleInspector}
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
                        activeActivity={activeActivity}
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
                                    keptOpen={panelKeptOpen}
                                    onKeepOpenChange={setPanelKeptOpen}
                                    onClose={closePanel}
                                    onWidthChange={presentation === "docked" ? setPanelWidth : undefined}
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
                                    minimapShown: canvasLayout.minimap,
                                    legendShown: canvasLayout.legend,
                                    toolbarShown: canvasLayout.toolbar,
                                    vrSupported: xrSupport.vr,
                                    arSupported: xrSupport.ar,
                                    visibleNodeCount,
                                    visibleEdgeCount,
                                    onResetView: resetView,
                                    onViewPreset: (preset) => {
                                        graphViewPreset(graphtyRef.current?.graph ?? null, preset);
                                    },
                                    onToggleMinimap: () => {
                                        toggleOverlay("minimap");
                                    },
                                    onToggleToolbar: () => {
                                        toggleOverlay("toolbar");
                                        setViewsMenuOpen(false);
                                    },
                                    onToggleLegend: () => {
                                        toggleOverlay("legend");
                                    },
                                    onEnterVr: () => undefined,
                                    onEnterAr: () => undefined,
                                }}
                            />
                        </CanvasRegion>
                    </PopoutRegion>

                    <Box data-shell-region="inspector" style={{ display: "contents" }}>
                        <PopoutRegion id="inspector">
                            <Inspector
                                open={inspectorOpen}
                                width={inspectorWidth}
                                presentation={presentation}
                                selectionKind={selectionKind}
                                kindLabel={INSPECTOR_KIND_LABELS[selectionKind]}
                                identityLabel={selectedNode?.id}
                                pinned={dataLoaded && inspectorPinned}
                                keptOpen={inspectorKeptOpen}
                                onCopyReading={() => {
                                    copyReading(inspectorReadingForCopy);
                                }}
                                onKeepOpenChange={setInspectorKeptOpen}
                                onPin={() => {
                                    setInspectorPinned(true);
                                }}
                                onToggle={toggleInspector}
                                onWidthChange={presentation === "docked" ? setInspectorWidth : undefined}
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
                    exploreNotesExpanded={activeActivity === "explore" && isSectionOpen("explore.notes")}
                />
            </Box>

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
