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
 * - **The Insights strip and the filter status strip.** Nothing computes an insight card
 *   or holds an active filter yet, so there is nothing to draw and no control claims
 *   otherwise. The minimap is NOT in this group: its M binding and its Views checkmark
 *   do claim it is shown, which is why it is passed a config.
 * - **The legend's channels.** With nothing encoded the legend renders nothing by
 *   design (spec 01 section 9), so an empty channel list is the correct state, not a
 *   missing one.
 */

import { type DataTableColumn, PopoutManager, PopoutRegion } from "@graphty/compact-mantine";
import { Box } from "@mantine/core";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getLayoutMetadata, LAYOUT_METADATA } from "../../data/layoutMetadata";
import { CAT_SOCIAL_NETWORK, CAT_SOCIAL_NETWORK_NAME } from "../../data/sampleGraphs";
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
import { readPersistedCanvasLayout, resolveCanvasLayout, writePersistedCanvasLayout } from "./canvas/canvasMemory";
import { CanvasRegion, type CanvasRegionOwnProps, useCanvasBottomStack } from "./canvas/CanvasRegion";
import type { DataDrawerTab } from "./canvas/DataTableDrawer";
import { CommandPalette, type CommandPaletteItem } from "./CommandPalette";
import {
    ACTIVITIES_REQUIRING_DATA,
    ACTIVITY_RAIL_WIDTH,
    CANVAS_MENU_Z_INDEX,
    canvasToolbarProfile,
    STATUS_BAR_HEIGHT,
    TOP_BAR_HEIGHT,
} from "./constants";
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
import { Inspector } from "./inspector/Inspector";
import { InspectorBody, type InspectorSelection } from "./inspector/InspectorBody";
import { INSPECTOR_KIND_LABELS } from "./inspector/inspectorConstants";
import type { NeighborRow } from "./inspector/NodeInspector";
import { KeyboardShortcutsOverlay } from "./KeyboardShortcutsOverlay";
import { ActivityPanel } from "./panel/ActivityPanel";
import { AiPanel } from "./panel/AiPanel";
import { AnalyzePanel } from "./panel/AnalyzePanel";
import { DataPanel, type LoadedDataSummary } from "./panel/DataPanel";
import { ExplorePanel } from "./panel/ExplorePanel";
import { PresentPanel } from "./panel/PresentPanel";
import { SettingsOverlay } from "./panel/SettingsOverlay";
import { StylePanel } from "./panel/StylePanel";
import { ActivityRail } from "./rail/ActivityRail";
import { HelpMenu, type HelpMenuRowId } from "./rail/HelpMenu";
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

/** The graph host's default layout, the same engine `Graphty` defaults to. */
const DEFAULT_LAYOUT = "d3";

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
    const [layers, setLayers] = useState<IndexedLayerItem[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<CanvasViewMode>("3d");
    const [layoutType, setLayoutType] = useState<string>(DEFAULT_LAYOUT);
    const [layoutConfig, setLayoutConfig] = useState<Record<string, unknown>>({});
    const [selectedNode, setSelectedNode] = useState<{
        readonly id: string;
        readonly attributes: Record<string, unknown> | null;
    } | null>(null);
    const layerCounter = useRef(1);
    const firstLoadDone = useRef(false);
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

    /**
     * Everything a dataset boundary clears, whichever event crossed it.
     *
     * 6.12 makes Close dataset and a replacing load ONE rule, because the second is
     * the first with a load on the end, and two implementations of one rule are how
     * they come to disagree. What goes is what was true of the graph that has gone:
     * the selection, a pinned inspector card (5.4 says this of a reload and this is
     * the general case), and the transients that describe an object which no longer
     * exists. What stays is what 6.5 says is true of the user, so nothing here
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

    /* ---------------------------------------------------------------------- */
    /* Style layers, from graphty-element as the single source of truth        */
    /* ---------------------------------------------------------------------- */

    const handleStylesChange = useCallback((detail: StylesChangedDetail) => {
        setLayers(styleLayersToLayerItems(detail.layers));
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

            /* The list has one upward channel and it carries two different edits, so it has
               to say which this was. Layer ids are positional (`layer-${index}`,
               layerConversion.ts:29), so the SAME ids in the SAME order cannot be a reorder:
               the list was edited in place, which today means the row's inline rename. Before
               this branch existed every rename fell through the loop below on `continue` and
               reached graphty-element -- the single source of truth these names are drawn
               from -- never at all, so the row kept drawing the old name while the editor held
               the new one. */
            const inPlace =
                currentIds.length === nextIds.length && currentIds.every((id, index) => id === nextIds[index]);

            if (inPlace) {
                const live = manager.getLayers();

                for (const item of next) {
                    const before = layers.find((layer) => layer.id === item.id);

                    if (before === undefined || before.name === item.name) {
                        continue;
                    }

                    const layer = live[before.index];

                    if (layer === undefined) {
                        continue;
                    }

                    /* The live layer is read from the manager and spread, rather than rebuilt
                       from the `LayerItem`: the item is a lossy projection of a layer
                       (layerConversion.ts:23-49 keeps only selector, style and
                       calculatedStyle), and metadata is spread rather than replaced so a layer
                       created by a run keeps its `algorithmSource` binding -- which is what
                       DECISIONS-1.7:1829 and :1962 mean by "the typed name once renamed" and
                       "a renamed layer never re-derives". */
                    manager.updateLayerByIndex(before.index, {
                        ...layer,
                        metadata: { ...layer.metadata, name: item.name },
                    });
                }

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
                }

                break;
            }
        },
        [layers],
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
    const {nodeCount} = graphInfo;
    const {edgeCount} = graphInfo;

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
                        dataTableOpen={canvasLayout.drawerOpen}
                        onDataTableOpenChange={setDrawerOpen}
                    />
                );
            case "explore":
                return (
                    <ExplorePanel
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
                    <AnalyzePanel graphtyRef={graphtyRef} onAddLayers={handleAddAlgorithmLayers} persist={persist} />
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
        handleAddAlgorithmLayers,
        handleAddLayer,
        handleApplyLayout,
        handleLayersChange,
        handleLoad,
        layers,
        layoutConfig,
        layoutType,
        loadedSummary,
        nodeCount,
        persist,
        selectedLayerId,
        setDrawerOpen,
        stateAxis,
        viewMode,
    ]);

    /* ---------------------------------------------------------------------- */
    /* The inspector                                                           */
    /* ---------------------------------------------------------------------- */

    const selectionKind: SelectionKind = selectedNode === null ? "none" : "node";

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

    const graphReading = dataLoaded
        ? `This graph holds ${nodeCount.toLocaleString()} nodes and ${edgeCount.toLocaleString()} edges.`
        : "Nothing is loaded yet. Open a file, a URL or pasted data to see a reading here.";

    const inspectorSelection = useMemo<InspectorSelection>(() => {
        if (selectedNode === null) {
            return {
                kind: "none",
                summary: {
                    reading: graphReading,
                    counts: dataLoaded
                        ? {
                              nodes: nodeCount.toLocaleString(),
                              edges: edgeCount.toLocaleString(),
                              types: graphInfo.graphType.directed ? "Directed" : "Undirected",
                              density: graphInfo.density.toFixed(3),
                              densityTitle: graphInfo.density.toExponential(2),
                              averageDegree:
                                  nodeCount === 0 ? "0" : ((edgeCount * 2) / nodeCount).toFixed(1),
                              connectedParts: "Not computed",
                          }
                        : null,
                    mostConnected: [],
                    rankedCount: 0,
                    degreeBins: [],
                    degreeAxisMin: "0",
                    degreeAxisMax: "0",
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
        const {attributes} = selectedNode;

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
        copyReading,
        dataLoaded,
        edgeCount,
        graphInfo.density,
        graphInfo.graphType.directed,
        graphReading,
        neighborsOf,
        nodeCount,
        openDrawerOn,
        openPanelAt,
        selectedNode,
        zoomToSelection,
    ]);

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
        },
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
                                    copyReading(graphReading);
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
