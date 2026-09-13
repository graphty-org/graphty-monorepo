/**
 * The canvas region: the graphty-element host and its whole overlay stack.
 *
 * It fills the space the rail, the activity panel and the inspector leave, and it is
 * the only region that draws inside the canvas element. Build spec 01 sections 1, 2,
 * 3, 5, 7 and 9; spec 04 section 11.1 for the host.
 *
 * The two rules the whole region turns on:
 *
 * 1. **Docks shorten the live canvas rect; overlays never do.** The graph host is
 *    inset by the data table drawer's height, so the drawer really does take canvas
 *    away, while the minimap, the legend, the Insights strip, the time slider and the
 *    canvas toolbar are drawn over the full rect and take none.
 * 2. **One baseline, one ladder.** The canvas toolbar rides 12 px above whichever of
 *    the canvas floor, the time slider and the drawer is uppermost -- the four
 *    documented offsets 12 / 82 / 272 / 342 -- and the minimap and the legend ride the
 *    same baseline, rising 48 onto a second line below 622 (650 with the narrow bar)
 *    rather than either of them being hidden. Both are computed in `canvasLayout.ts`
 *    as pure functions of state and are read from here, never re-derived.
 *
 * DOM order inside the canvas element is the one section 2 fixes: graph, Insights
 * strip, minimap, legend, pop-out, canvas toolbar -- the last two arriving as
 * `children` from the shell.
 *
 * The graph itself is the app's EXISTING `components/Graphty.tsx` wrapper, imported
 * rather than forked: it owns the `<graphty-element>`, its imperative handle and the
 * asynchronous graph-ready poll.
 */

import { type DataTableColumn, PopoutRegion } from "@graphty/compact-mantine";
import React, { useCallback, useMemo, useRef } from "react";

import { Graphty,type GraphtyHandle, type SelectionChangedDetail, type StylesChangedDetail } from "../../Graphty";
import type { LayerItem } from "../../layout/LeftSidebar";
import { CANVAS_TOOLBAR_Z_INDEX, type CanvasBottomStackState, INSIGHTS_STRIP_TOP, OVERLAY_INSET } from "../constants";
import { useShell } from "../ShellContext";
import type { CanvasRegionProps } from "../types";
import { CANVAS_SPACE, canvasBottomStack, type CanvasBottomStackLayout } from "./canvasLayout";
import { CanvasOverlayLayer } from "./CanvasOverlayLayer";
import { type DataDrawerTab, DataTableDrawer, GraphTableSegment } from "./DataTableDrawer";
import { type FilterStatusChip, type FilterStatusNote, FilterStatusStrip } from "./FilterStatusStrip";
import { type InsightCard, InsightsStrip } from "./InsightsStrip";
import { Legend,type LegendChannel } from "./Legend";
import { Minimap,type MinimapPoint, type MinimapViewport } from "./Minimap";
import { TimeSlider,type TimeSliderWindow } from "./TimeSlider";
import { useCanvasRect } from "./useCanvasRect";
import { WelcomeState } from "./WelcomeState";

/**
 * What the canvas hands the graphty-element wrapper. It mirrors the wrapper's own
 * props, which that module does not export.
 *
 * Built by the caller and handed to {@link CanvasRegionOwnProps.graph}.
 * @public
 */
export interface CanvasGraphConfig {
    /** The style layers graphty-element owns. */
    readonly layers?: LayerItem[];
    /** The view mode the canvas toolbar's 2D / 3D control sets. */
    readonly viewMode?: "2d" | "3d" | "ar" | "vr";
    /** The data source format. */
    readonly dataSource?: string;
    /** The data source's own configuration. */
    readonly dataSourceConfig?: Record<string, unknown>;
    /** Whether loading replaces the graph rather than adding to it. */
    readonly replaceExisting?: boolean;
    /** The layout engine's name. */
    readonly layout?: string;
    /** The layout engine's own configuration. */
    readonly layoutConfig?: Record<string, unknown>;
    /** Selection changed on the canvas. */
    readonly onSelectionChange?: (detail: SelectionChangedDetail) => void;
    /** Style layers changed inside graphty-element. */
    readonly onStylesChange?: (detail: StylesChangedDetail) => void;
}

/**
 * What the Insights strip draws, when there is anything to draw. Built by the caller and handed
 * to {@link CanvasRegionOwnProps.insights}.
 * @public
 */
export interface CanvasInsightsConfig {
    /** The cards the rule table produced. */
    readonly cards: readonly InsightCard[];
    /** The strip-level X. 6.5 remembers the dismissal globally across datasets. */
    readonly onDismiss: () => void;
    /** Delete on a focused card. */
    readonly onDismissCard?: (id: string) => void;
}

/**
 * What the filter status strip draws. Built by the caller and handed to
 * {@link CanvasRegionOwnProps.filterStatus}.
 * @public
 */
export interface CanvasFilterStatusConfig {
    /** The active chips. */
    readonly chips: readonly FilterStatusChip[];
    /** The criterion-and-override line, above the render ceiling. */
    readonly note?: FilterStatusNote | null;
    /** Opens Explore, where the chips live while that panel is open. */
    readonly onOpenExplore?: () => void;
}

/**
 * What the minimap draws. Built by the caller and handed to
 * {@link CanvasRegionOwnProps.minimap}.
 * @public
 */
export interface CanvasMinimapConfig {
    /** How many nodes the graph holds; above 10,000 it takes its heatmap form. */
    readonly nodeCount: number;
    /** The scaled drawing. */
    readonly points?: readonly MinimapPoint[];
    /** The heatmap's cell counts, row-major over the 64 x 32 grid. */
    readonly density?: readonly number[];
    /** The viewport rectangle. */
    readonly viewport?: MinimapViewport;
    /** Click centres the view; drag scrubs it. */
    readonly onScrub?: (x: number, y: number) => void;
}

/**
 * What the legend draws. Built by the caller and handed to {@link CanvasRegionOwnProps.legend}.
 * @public
 */
export interface CanvasLegendConfig {
    /** One entry per ENCODED channel. With none, the legend does not render. */
    readonly channels: readonly LegendChannel[];
}

/**
 * What the data table drawer draws. Built by the caller and handed to
 * {@link CanvasRegionOwnProps.drawer}.
 * @public
 */
export interface CanvasDrawerConfig<TRow extends object> {
    /** Which half of the dataset is showing. */
    readonly tab: DataDrawerTab;
    /** Tab change. */
    readonly onTabChange: (tab: DataDrawerTab) => void;
    /** The rows. */
    readonly rows: readonly TRow[];
    /** The columns. */
    readonly columns: readonly DataTableColumn<TRow>[];
    /** A stable id per row; the row selection IS the canvas selection. */
    readonly getRowId?: (row: TRow, index: number) => string;
    /** The Show control's value, e.g. "Selected". */
    readonly showLabel: string;
    /** The Show control's count, e.g. "3". */
    readonly showCount: string;
    /** The Show control's total, e.g. "of 200". */
    readonly showTotal: string;
    /** Opens the Show menu. */
    readonly onOpenShowMenu?: () => void;
    /** A drag on the drawer's top edge. */
    readonly onHeightChange: (height: number) => void;
    /** The drawer's X. */
    readonly onClose: () => void;
    /** Table maximises the drawer to the full canvas height; Graph restores it. */
    readonly onSurfaceChange?: (surface: "graph" | "table") => void;
    /** The selected row ids. */
    readonly selectedIds?: readonly string[];
    /** Row selection change. */
    readonly onSelectionChange?: (ids: string[]) => void;
}

/**
 * What the time slider draws. Built by the caller and handed to
 * {@link CanvasRegionOwnProps.timeSlider}.
 * @public
 */
export interface CanvasTimeSliderConfig {
    /** Whether playback is running. */
    readonly playing: boolean;
    /** The step size, as the transport titles print it, e.g. "7 days". */
    readonly stepLabel: string;
    /** The readout, e.g. "Viewing: 2026-01-05 to 2026-02-04". */
    readonly viewingLabel: string;
    /** The attribute the window runs over, e.g. "by opened". */
    readonly byLabel?: string;
    /** Step back one step. */
    readonly onStepBack: () => void;
    /** Start playback. */
    readonly onPlay: () => void;
    /** Pause playback. */
    readonly onPause: () => void;
    /** Step forward one step. */
    readonly onStepForward: () => void;
    /** Opens the slider's settings pop-out. */
    readonly onOpenSettings: () => void;
    /** Whether that pop-out is open. */
    readonly settingsOpen?: boolean;
    /** The weekly density behind the track. */
    readonly density?: readonly number[];
    /** The window the two handles hold. */
    readonly window?: TimeSliderWindow;
}

/**
 * What Welcome draws in the Empty state. Built by the caller and handed to
 * {@link CanvasRegionOwnProps.welcome}.
 * @public
 */
export interface CanvasWelcomeConfig {
    /** Opens the file picker. */
    readonly onOpenFile: () => void;
    /** Opens the paste-or-URL route. */
    readonly onPasteOrOpenFromUrl: () => void;
    /** A file dropped on the zone. */
    readonly onFilesDropped?: (files: FileList) => void;
    /** Sample datasets, recent files and recipes, from the Data activity. */
    readonly children?: React.ReactNode;
}

/**
 * Props of the canvas region.
 *
 * The shared `CanvasRegionProps` in `shell/types.ts` fixes the region's contract --
 * the state axis, the docks, the overlay visibility, the narrow tap handler and the
 * children. Everything added here is the CONTENT those decisions are about, which the
 * shared type does not carry and which the region cannot invent: the graph's own
 * configuration and one config object per overlay. Each is optional, and an absent
 * config is an overlay that does not render.
 */
export interface CanvasRegionOwnProps<TRow extends object = Record<string, unknown>> extends CanvasRegionProps {
    /** What the graphty-element wrapper is handed. */
    readonly graph?: CanvasGraphConfig;
    /** A ref onto the wrapper's imperative handle. */
    readonly graphRef?: React.Ref<GraphtyHandle>;
    /** The Insights strip's cards. */
    readonly insights?: CanvasInsightsConfig;
    /** The filter status strip's chips. */
    readonly filterStatus?: CanvasFilterStatusConfig;
    /** The minimap's drawing. */
    readonly minimap?: CanvasMinimapConfig;
    /** The legend's encoded channels. */
    readonly legend?: CanvasLegendConfig;
    /** The data table drawer's contents. */
    readonly drawer?: CanvasDrawerConfig<TRow>;
    /** The time slider's transport and readout. */
    readonly timeSlider?: CanvasTimeSliderConfig;
    /** Welcome's two routes in. */
    readonly welcome?: CanvasWelcomeConfig;
}

const NO_LAYERS: LayerItem[] = [];

/**
 * The bottom stack this canvas measured, for the overlays the SHELL passes in as
 * children -- the canvas toolbar above all.
 *
 * The ladder of section 3 is one pure function of state, and only this region knows the
 * live canvas rect it is measured against: the drawer's height is clamped to the canvas
 * it docks into, so a remembered 700 px drawer in a 416 px canvas is 416 px of stack and
 * not 700. A caller that recomputed the offset outside the region would not know that,
 * and would put the bar, the minimap and the legend above the top of the canvas. So the
 * region publishes what it decided and its children read it here instead.
 */
const CanvasBottomStackContext = React.createContext<CanvasBottomStackLayout | null>(null);

/**
 * The bottom stack the enclosing canvas region measured.
 * @returns the stack's offsets and visibility decisions, or null outside a canvas region.
 */
export function useCanvasBottomStack(): CanvasBottomStackLayout | null {
    return React.useContext(CanvasBottomStackContext);
}

/**
 * Draws the canvas region: the graph, the overlay stack and the bottom docks.
 * @param props - the state axis, the docks, the overlay visibility and the content.
 * @returns the canvas element.
 */
export function CanvasRegion<TRow extends object = Record<string, unknown>>(
    props: CanvasRegionOwnProps<TRow>,
): React.JSX.Element {
    const {
        children,
        docks,
        drawer,
        filterStatus,
        graph,
        graphRef,
        insights,
        legend,
        minimap,
        onCanvasTap,
        overlays,
        stateAxis,
        timeSlider,
        welcome,
    } = props;
    const { breakpoint, shellWidth } = useShell();
    const canvasRef = useRef<HTMLDivElement>(null);
    const rect = useCanvasRect(canvasRef, shellWidth);
    const empty = stateAxis === "empty";

    const stack = useMemo<CanvasBottomStackState>(
        () => ({
            drawerOpen: !empty && docks.drawerOpen,
            drawerHeight: docks.drawerHeight,
            drawerMaximised: docks.drawerMaximised,
            // The slider's 70 px rung of the offset ladder is taken only when a slider
            // is actually on screen. `overlays.timeSlider` is the Views/Explore state;
            // `timeSlider !== undefined` is whether there is a transport and a readout
            // to draw. Without the second, raising the toolbar, the minimap and the
            // legend by 70 would leave them floating over an empty band.
            timeSliderOn: !empty && overlays.timeSlider && timeSlider !== undefined,
        }),
        [docks.drawerHeight, docks.drawerMaximised, docks.drawerOpen, empty, overlays.timeSlider, timeSlider],
    );

    const channels = legend?.channels ?? [];

    const layout = useMemo(
        () =>
            canvasBottomStack({
                stack,
                canvasWidth: rect.width,
                canvasHeight: rect.height,
                profile: rect.profile,
                minimapVisible: overlays.minimap,
                legendVisible: overlays.legend,
                encodedChannelCount: channels.length,
                // Spec 01 section 7 item 3: below 1280 "the Data table drawer overlays
                // from the bottom", so it shortens nothing. On desktop it is a dock and
                // the graph host gives up its height.
                drawerOverlaysCanvas: breakpoint === "narrow",
            }),
        [
            breakpoint,
            channels.length,
            overlays.legend,
            overlays.minimap,
            rect.height,
            rect.profile,
            rect.width,
            stack,
        ],
    );

    // Spec 01 section 7 items 4 and 5: below 1280 a tap on the canvas closes an open
    // overlay, and a tap on the canvas TOOLBAR is not a tap on the canvas. Every
    // overlay is a descendant of a node carrying `data-canvas-overlay`, so one
    // `closest` call separates the graph from everything drawn over it.
    //
    // The other carve-out design 5.2 makes -- a tap that SELECTED a node is not a tap
    // away either -- is not made here and must not be: this region knows only what was
    // under the pointer, and what the pick produced is the shell's fact. `AppShell`
    // filters the call this handler makes; this contract is unchanged by that.
    const handleClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (onCanvasTap === undefined || breakpoint !== "narrow") {
                return;
            }

            const { target } = event;

            if (target instanceof Element && target.closest("[data-canvas-overlay]") !== null) {
                return;
            }

            onCanvasTap();
        },
        [breakpoint, onCanvasTap],
    );

    return (
        <CanvasBottomStackContext.Provider value={layout}>
        <div
            ref={canvasRef}
            data-shell-region="canvas"
            data-reflowed={layout.reflowed ? "true" : "false"}
            data-toolbar-drawn={layout.toolbarBottom === null ? "false" : "true"}
            data-toolbar-bottom={layout.toolbarBottom === null ? undefined : String(layout.toolbarBottom)}
            onClick={handleClick}
            style={{
                flex: "1 1 auto",
                minWidth: 0,
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* 1. The graph. Docks shorten its rect; overlays do not.

                It is mounted in EVERY state, Empty included, and Welcome is drawn over
                it. Loading data is a call on the host's own imperative handle, so a
                host that arrives only once data is loaded can never receive the first
                load: the shell would sit in Empty for ever. What the Empty state
                withholds is listed on Welcome.dc.html:48 -- "No canvas toolbar, minimap
                or legend in Empty (6.1); the toolbar arrives with the first graph" --
                and the host is not on that list; spec 5.1 requires the canvas to host
                graphty-element. */}
            <div
                data-canvas-graph="true"
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: layout.dockedHeight,
                }}
            >
                <Graphty
                    ref={graphRef}
                    layers={graph?.layers ?? NO_LAYERS}
                    viewMode={graph?.viewMode}
                    dataSource={graph?.dataSource}
                    dataSourceConfig={graph?.dataSourceConfig}
                    replaceExisting={graph?.replaceExisting}
                    layout={graph?.layout}
                    layoutConfig={graph?.layoutConfig}
                    onSelectionChange={graph?.onSelectionChange}
                    onStylesChange={graph?.onStylesChange}
                />
            </div>

            {empty ? (
                <WelcomeState
                    onOpenFile={welcome?.onOpenFile ?? noop}
                    onPasteOrOpenFromUrl={welcome?.onPasteOrOpenFromUrl ?? noop}
                    onFilesDropped={welcome?.onFilesDropped}
                >
                    {welcome?.children}
                </WelcomeState>
            ) : null}

            {empty ? null : (
                <CanvasOverlayLayer reflowed={layout.reflowed}>
                    {/* 2. The top-centre column: Graph / Table, the Insights strip, the
                        filter status strip directly under it. */}
                    <div
                        style={{
                            position: "absolute",
                            top: INSIGHTS_STRIP_TOP,
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: CANVAS_SPACE.MD,
                            maxWidth: "100%",
                            zIndex: CANVAS_TOOLBAR_Z_INDEX,
                        }}
                    >
                        {docks.drawerOpen ? (
                            <GraphTableSegment
                                value={docks.drawerMaximised ? "table" : "graph"}
                                onChange={drawer?.onSurfaceChange ?? noop}
                            />
                        ) : null}

                        {overlays.insightsStrip && insights !== undefined ? (
                            <InsightsStrip
                                cards={insights.cards}
                                variant={breakpoint === "narrow" ? "chips" : "cards"}
                                onDismiss={insights.onDismiss}
                                onDismissCard={insights.onDismissCard}
                            />
                        ) : null}

                        {filterStatus === undefined ? null : (
                            <FilterStatusStrip
                                chips={filterStatus.chips}
                                note={filterStatus.note}
                                onOpenExplore={filterStatus.onOpenExplore}
                            />
                        )}
                    </div>

                    {/* 3. The minimap, bottom left on the shared baseline. */}
                    {minimap === undefined ? null : (
                        <Minimap
                            visible={layout.minimapDrawn}
                            raised={layout.reflowed}
                            bottom={layout.overlayBottom ?? OVERLAY_INSET}
                            nodeCount={minimap.nodeCount}
                            points={minimap.points}
                            density={minimap.density}
                            viewport={minimap.viewport}
                            onScrub={minimap.onScrub}
                        />
                    )}

                    {/* 4. The legend, bottom right on the same baseline. */}
                    <Legend
                        visible={layout.legendDrawn}
                        raised={layout.reflowed}
                        compact={layout.legendCompact}
                        channels={channels}
                        bottom={layout.overlayBottom ?? OVERLAY_INSET}
                        maxHeight={layout.legendMaxHeight}
                    />

                    {/* 5. The docks and the slider, under the baseline overlays. A dock
                        is a region of its own (6.11): a pop-out opened from the drawer
                        counts against the drawer, not against the canvas. */}
                    {drawer === undefined ? null : (
                        <PopoutRegion id="drawer">
                            <DataTableDrawer<TRow>
                                open={docks.drawerOpen}
                                height={docks.drawerHeight}
                                maximised={docks.drawerMaximised}
                                canvasHeight={rect.height}
                                tab={drawer.tab}
                                onTabChange={drawer.onTabChange}
                                rows={drawer.rows}
                                columns={drawer.columns}
                                getRowId={drawer.getRowId}
                                showLabel={drawer.showLabel}
                                showCount={drawer.showCount}
                                showTotal={drawer.showTotal}
                                onOpenShowMenu={drawer.onOpenShowMenu}
                                onHeightChange={drawer.onHeightChange}
                                onClose={drawer.onClose}
                                selectedIds={drawer.selectedIds}
                                onSelectionChange={drawer.onSelectionChange}
                            />
                        </PopoutRegion>
                    )}

                    {layout.timeSliderBottom === null || timeSlider === undefined ? null : (
                        <TimeSlider
                            bottom={layout.timeSliderBottom}
                            playing={timeSlider.playing}
                            stepLabel={timeSlider.stepLabel}
                            viewingLabel={timeSlider.viewingLabel}
                            byLabel={timeSlider.byLabel}
                            onStepBack={timeSlider.onStepBack}
                            onPlay={timeSlider.onPlay}
                            onPause={timeSlider.onPause}
                            onStepForward={timeSlider.onStepForward}
                            onOpenSettings={timeSlider.onOpenSettings}
                            settingsOpen={timeSlider.settingsOpen}
                            density={timeSlider.density}
                            window={timeSlider.window}
                        />
                    )}

                    {/* 6. The pop-out and the canvas toolbar, last in DOM order. The
                        toolbar owns its own offset -- the shell passes it
                        `canvasToolbarBottomOffset`, whose null means "not drawn", which
                        is the state a drawer maximised to the full canvas height
                        produces -- so the region draws its children unconditionally and
                        publishes the decision as `data-toolbar-drawn` instead of
                        withholding a pop-out along with the bar. */}
                    <div data-canvas-overlay="extras" style={{ display: "contents" }}>
                        {children}
                    </div>
                </CanvasOverlayLayer>
            )}
        </div>
        </CanvasBottomStackContext.Provider>
    );
}

function noop(): void {
    // Welcome's two routes are the Data activity's; without them the block still
    // draws, because the floor's names may not be hidden for want of a handler.
}
