/**
 * Shared types for the app shell's seven regions.
 *
 * Type-only module: nothing here emits runtime code, so every value the shell needs
 * (orders, geometry, binding tables) lives in `constants.ts` or `bindings.ts`.
 *
 * Citations name the build specs in tmp/shell-spec and, through them, the sections of
 * design/ui/app-shell-progressive-disclosure-design.md.
 */

import type { ReactNode } from "react";

import type { HelpMenuProps } from "./rail/HelpMenu";

/* -------------------------------------------------------------------------- */
/* Activities (build spec 02 sections 1.2, 1.3)                                */
/* -------------------------------------------------------------------------- */

/**
 * The six activities that open a 280 px panel, top to bottom in the rail.
 */
export type PrimaryActivityId = "data" | "explore" | "analyze" | "style" | "present" | "ai";

/**
 * The two rail items a spacer pushes to the bottom. Neither opens a 280 px panel:
 * Settings is a full-panel overlay and Help is a menu (spec 03 sections 2.7, 2.8).
 */
export type PinnedActivityId = "settings" | "help";

/**
 * Every rail destination.
 */
export type ActivityId = PinnedActivityId | PrimaryActivityId;

/* -------------------------------------------------------------------------- */
/* The state axis (build spec 04 section 5.1)                                  */
/* -------------------------------------------------------------------------- */

/**
 * The state axis of 6.1 -- what exists. States are cumulative: "selected" implies
 * "loaded", "result" implies "loaded". Spec 04 section 5.1.
 */
export type ShellStateAxis = "empty" | "loaded" | "loaded-subset" | "loading" | "result" | "selected";

/*
 * The tier axis of 6.2 (spec 04 section 5.2) -- 1 inline, 2 collapsed section, 3a
 * pop-out, 3b dialog -- has no type here. Nothing branches on a tier at runtime: each
 * surface is written at the one tier the spec assigns it, and cites that tier in its own
 * doc comment. A `ShellTier` union existed and had no reference anywhere, so it was
 * removed rather than carried as an unused export. Reintroduce it the day a component
 * takes a tier as a prop.
 */

/* -------------------------------------------------------------------------- */
/* Selection (build spec 03 sections 4, 5, 6; spec 5.4)                        */
/* -------------------------------------------------------------------------- */

/**
 * What the inspector is currently showing. "none" is the Graph summary surface, which
 * is a real surface and not an empty state. Spec 03 sections 4 to 6.
 */
export type SelectionKind =
    | "algorithm-result"
    | "cleaning-step"
    | "edge"
    | "multiple"
    | "node"
    | "none"
    | "pattern-match"
    | "style-layer";

/* -------------------------------------------------------------------------- */
/* Layout state (build spec 01 section 7; build spec 04 section 6)             */
/* -------------------------------------------------------------------------- */

/**
 * Which side of the 1280 px breakpoint the shell is on.
 */
export type ShellBreakpoint = "desktop" | "narrow";

/**
 * How a panel or the inspector is presented: docked into the row on desktop, or
 * overlaid over the canvas below 1280 px. Spec 01 section 7.
 *
 * Named in {@link ActivityPanelProps.presentation} and in the inspector's own, so a caller can
 * say which it is drawing.
 * @public
 */
export type RegionPresentation = "docked" | "overlay";

/*
 * There was a `NarrowOverlay` union here ("inspector" | "none" | "panel"), naming which
 * of the two regions was the one dismissible overlay below 1280 px. It went with the
 * whole narrow layout on 2026-09-14: the shell does not lay out below
 * `NARROW_BREAKPOINT` at all any more, it draws a "screen too small" state, so there is
 * no overlay to name and nothing for a tap or an Escape press to dismiss.
 */

/**
 * Per-section open/closed state, keyed by a stable section id. Section ids are owned
 * by the panel that draws them and must be unique shell-wide, because this map is one
 * of the four things the shell persists (6.5).
 */
export type SectionOpenMap = Readonly<Record<string, boolean>>;

/**
 * The shell's layout state, as the store exposes it.
 *
 * {@link ShellContextValue} extends it, so a caller can name the layout half on its own.
 * @public
 */
export interface ShellLayoutState {
    /**
     * Which activity the panel draws. NON-NULLABLE since 2026-09-14: under the one-button
     * panel model there is no such thing as "no panel" while the sidebars are shown, and
     * no such thing as an active activity while they are hidden, so the two facts are
     * {@link ShellLayoutState.sidebarsHidden} and this, never a null here.
     */
    readonly activeActivity: PrimaryActivityId;
    /** The activity panel's width, already clamped for the current viewport. */
    readonly panelWidth: number;
    /** The inspector's width, already clamped for the current viewport. */
    readonly inspectorWidth: number;
    /**
     * Whether BOTH sidebars are hidden. The whole of the shell's show/hide model, and
     * the only thing the reader's one top-bar control writes.
     *
     * It replaced, on 2026-09-14, five interlocking mechanisms: two "Keep open" latches,
     * a width-aware first-visit layout built on them, three auto-close rules they could
     * veto, `inspectorOpen` as an axis independent of the panel, and the rail's
     * close-on-active-click. The product owner's verdict was "our panel open / closed /
     * autohide is a confusing nightmare"; the failure mode was that no reader could
     * predict which gesture would take a surface away, because six of them could.
     *
     * Default false -- both sidebars shown -- at every width the shell lays out at.
     * Below `NARROW_BREAKPOINT` it lays out at none, and draws a "screen too small"
     * state instead.
     */
    readonly sidebarsHidden: boolean;
    /** Per-section open/closed state. */
    readonly sectionOpen: SectionOpenMap;
    /** The 6.1 state axis. */
    readonly stateAxis: ShellStateAxis;
    /**
     * Which side of the breakpoint the shell is on. It no longer selects between two
     * LAYOUTS -- there is only one -- but the frame reads it to decide whether to lay
     * out at all, and the canvas region reads it for its own chip-versus-card form.
     */
    readonly breakpoint: ShellBreakpoint;
    /** The shell's measured width in CSS pixels. */
    readonly shellWidth: number;
}

/**
 * Exactly what the shell store writes to local storage, and nothing more. The 6.5
 * list has more entries than these five, but the rest belong to the regions and
 * features that own them, not to this store. Spec 04 section 6.1.
 *
 * REWRITTEN 2026-09-14 with the panel model. `inspectorOpen`, `panelKeptOpen` and
 * `inspectorKeptOpen` all left, and `activeActivity` lost its null. The key moved to
 * `graphty.shell.layout.v3` in the same change -- see `SHELL_LAYOUT_STORAGE_KEY`'s own
 * comment for why a shape that only SHRINKS still needed a new key.
 */
export interface PersistedShellLayout {
    /** 6.5 "last active activity". Never null: the panel always draws one. */
    readonly activeActivity: PrimaryActivityId;
    /** 6.5 "panel widths" -- the requested width, before the viewport clamp. */
    readonly panelWidth: number;
    /** 6.5 "panel widths" -- the requested width, before the viewport clamp. */
    readonly inspectorWidth: number;
    /**
     * Whether both sidebars are hidden. The one remembered fact about how the reader
     * wants the shell laid out, replacing the four this record used to carry.
     *
     * It is written unconditionally, including on mount. The old record could not be:
     * a latch default written on mount was indistinguishable from a deliberate unlatch
     * on the next visit, so the store carried a `latchChosen` ref and a first-paint
     * comparison to keep defaults out of it (6.5a, "a default is not a choice"). One
     * boolean whose default is false is not ambiguous, so all of that collapsed.
     */
    readonly sidebarsHidden: boolean;
    /** 6.5 "tier 2 section open states". */
    readonly sectionOpen: SectionOpenMap;
}

/**
 * The shell store's public surface. Side effects (measuring the viewport, writing
 * local storage) live in effects inside the provider, never in render.
 *
 * SIX MEMBERS LEFT ON 2026-09-14 and are not coming back one at a time: `closePanel`,
 * `setInspectorOpen`, `toggleInspector`, `setPanelKeptOpen`, `setInspectorKeptOpen` and
 * `closeNarrowOverlay`. Each was a separate route by which one sidebar could vanish, and
 * together they were the "confusing nightmare" the product owner named. What replaced
 * all six is {@link ShellContextValue.setSidebarsHidden} and
 * {@link ShellContextValue.toggleSidebars}, which move both sidebars together and are
 * reached from exactly one control and one binding.
 */
export interface ShellContextValue extends ShellLayoutState {
    /**
     * Rail click: draws that activity's panel, and reveals the sidebars if they are
     * hidden.
     *
     * It no longer applies spec:153's close-on-active-click -- clicking the icon of the
     * already-active activity is now a no-op rather than a close, because the rail is a
     * pure activity chooser and the one top-bar control is the only thing that hides a
     * sidebar. That change needs the product owner's explicit assent: it contradicts
     * spec:153 and changes long-standing muscle memory.
     */
    readonly selectActivity: (activity: PrimaryActivityId) => void;
    /**
     * Draws an activity's panel WITHOUT revealing hidden sidebars. The programmatic
     * route: the first-load rule (spec 02 section 1.5), a run function opening its own
     * panel, a failure surface pointing at Data. A reader who hid the sidebars asked for
     * the canvas, and a background completion pulling them back is the kind of
     * shell-performed layout change this model exists to abolish.
     */
    readonly openActivity: (activity: PrimaryActivityId) => void;
    /** Requests an activity panel width; the clamp is applied before it is exposed. */
    readonly setPanelWidth: (width: number) => void;
    /** Requests an inspector width; the clamp is applied before it is exposed. */
    readonly setInspectorWidth: (width: number) => void;
    /** Hides or shows BOTH sidebars. The one writer of the one boolean. */
    readonly setSidebarsHidden: (hidden: boolean) => void;
    /** Flips {@link ShellLayoutState.sidebarsHidden}. The top bar's one control and Cmd/Ctrl+B both land here. */
    readonly toggleSidebars: () => void;
    /** Reads a section's open state, falling back to the section's own default. */
    readonly isSectionOpen: (sectionId: string, defaultOpen?: boolean) => boolean;
    /** Sets one section's open state. */
    readonly setSectionOpen: (sectionId: string, open: boolean) => void;
    /** Toggles one section's open state against its default. */
    readonly toggleSection: (sectionId: string, defaultOpen?: boolean) => void;
    /**
     * Sets many sections at once. This is what "Expand all sections", "Collapse all
     * sections" and the alt-click sibling toggle are stored as -- the individual
     * section states they set, so no new mode exists (6.5).
     */
    readonly setSectionsOpen: (sectionIds: readonly string[], open: boolean) => void;
    /** Moves the shell along the 6.1 state axis. */
    readonly setStateAxis: (state: ShellStateAxis) => void;
}

/* -------------------------------------------------------------------------- */
/* Region props: activity rail (build spec 02 section 1)                       */
/* -------------------------------------------------------------------------- */

/**
 * The numbered badge on the Present rail icon: the sum of pinned items and unresolved
 * notes, with the breakdown in its title. No badge is drawn when the sum is zero.
 * Spec 02 section 1.4.
 */
export interface RailBadge {
    /** The sum the badge prints. */
    readonly count: number;
    /** The breakdown, e.g. "4 pinned items, 3 open notes". */
    readonly title: string;
}

/**
 * Props of the activity rail region.
 */
export interface ActivityRailProps {
    /**
     * The active activity, or null when no panel is on screen -- which since 2026-09-14
     * means "the sidebars are hidden", not "no activity is chosen". The store always
     * holds an activity; the shell passes null while the panel is not drawn, so the
     * rail's marker never claims a panel the reader cannot see.
     */
    readonly activeActivity: ActivityId | null;
    /**
     * Activities drawn but disabled. Their title is the activity name plus
     * ". Load data first" (spec 02 section 1.2).
     */
    readonly disabledActivities?: readonly ActivityId[];
    /**
     * Whether the Data icon carries its unnumbered warning dot. Never a number: the
     * count belongs to the status bar issues chip (spec 02 section 1.4).
     */
    readonly dataHasWarnings?: boolean;
    /** The Present badge, or null when the sum is zero. */
    readonly presentBadge?: RailBadge | null;
    /**
     * Rail click. The shell decides what each id does: the six primary ids draw that
     * activity's panel and reveal the sidebars if they are hidden, "settings" opens the
     * full-panel overlay and "help" opens the rail-anchored menu. Clicking the
     * already-active icon is a no-op -- spec:153's close-on-active-click was struck on
     * 2026-09-14, because the rail is a pure activity chooser and the top bar's one
     * control is the only thing that hides a sidebar.
     */
    readonly onActivityClick: (activity: ActivityId) => void;
    /**
     * The Help menu the Help item opens, or undefined for a rail without one. The rail
     * makes its Help item the menu's opener, so a click on Help both reports "help"
     * and asks, through `onOpenChange`, to toggle the menu.
     */
    readonly helpMenu?: Omit<HelpMenuProps, "children">;
}

/* -------------------------------------------------------------------------- */
/* Region props: activity panel (build spec 03 section 1)                      */
/* -------------------------------------------------------------------------- */

/**
 * One row of a panel header's overflow menu. Every panel's overflow opens with
 * "Expand all sections" then "Collapse all sections"; panel-specific rows follow.
 * A saved-thing verb never appears here (spec 03 section 1.3).
 */
export interface PanelOverflowItem {
    /** Stable id, unique within the menu. */
    readonly id: string;
    /** The row's full text. */
    readonly label: string;
    /** Whether the row is drawn disabled. */
    readonly disabled?: boolean;
    /** The reason, carried in the row's title when it is disabled (floor item 4). */
    readonly disabledReason?: string;
    /** Whether a separator is drawn above this row. */
    readonly separatorBefore?: boolean;
    /** What the row does. */
    readonly onSelect: () => void;
}

/**
 * Props of the activity panel chrome. The body of each activity is supplied as
 * children by the panel region's own activity components.
 */
export interface ActivityPanelProps {
    /** Which activity's panel this is. */
    readonly activity: PrimaryActivityId;
    /** The panel's width, already clamped by the store. */
    readonly width: number;
    /** Docked on desktop, overlaid below 1280 px. */
    readonly presentation: RegionPresentation;
    /** The header's activity name, at 12 px / weight 500 (spec 03 section 1.2). */
    readonly title: string;
    /**
     * Overflow rows beyond the two universal ones. When this is empty the More button
     * is not rendered at all and the header takes its no-More padding.
     */
    readonly overflowItems?: readonly PanelOverflowItem[];
    /*
     * `keptOpen`, `onKeepOpenChange` and `onClose` all left on 2026-09-14. The panel
     * header carried a "Keep open" latch and an X; both were individual controls over one
     * sidebar, and the product owner asked for "one button to hide / show both at the
     * same time and not individual buttons". The panel is drawn whenever the sidebars
     * are shown and is not drawn when they are not, so it has nothing of its own to
     * report and nothing of its own to close.
     */
    /** Desktop boundary drag. Absent below 1280 px, where the panel does not resize. */
    readonly onWidthChange?: (width: number) => void;
    /** The panel body. */
    readonly children: ReactNode;
}

/* -------------------------------------------------------------------------- */
/* Region props: canvas (build spec 01 sections 2, 3, 5)                       */
/* -------------------------------------------------------------------------- */

/**
 * The canvas docks. Docks shorten the live canvas rect; overlays never do.
 * Spec 01 section 2.
 */
export interface CanvasDockState {
    /** Whether the data table drawer is docked open along the bottom edge. */
    readonly drawerOpen: boolean;
    /** The drawer's height; drag to resize, remembered per 6.5. */
    readonly drawerHeight: number;
    /**
     * Whether the drawer is maximised to the full canvas height. In that state the
     * toolbar, the minimap and the legend are not drawn at all (spec 01 section 3).
     */
    readonly drawerMaximised: boolean;
    /** Whether the Compare split is on. */
    readonly compareOpen: boolean;
}

/**
 * Which canvas overlays are currently shown. Each of these three is remembered
 * per 6.5 and each has a checked row in the Views menu.
 */
export interface CanvasOverlayVisibility {
    /** Minimap, bottom left, M in the Views menu. */
    readonly minimap: boolean;
    /** Legend, bottom right, L in the Views menu. */
    readonly legend: boolean;
    /** The canvas toolbar. Hiding it hides its own Views menu (spec 01 section 4). */
    readonly toolbar: boolean;
    /** The time slider, full width on the bottom edge of whatever rect remains. */
    readonly timeSlider: boolean;
    /** The Insights strip, top centre, dismissible. */
    readonly insightsStrip: boolean;
}

/**
 * Props of the canvas region: the graphty-element host plus its overlay stack.
 */
export interface CanvasRegionProps {
    /** The 6.1 state axis, which decides whether Welcome or the graph is drawn. */
    readonly stateAxis: ShellStateAxis;
    /** The docks that shorten the live canvas rect. */
    readonly docks: CanvasDockState;
    /** Which overlays are shown. */
    readonly overlays: CanvasOverlayVisibility;
    /**
     * Tapping the canvas below 1280 px closes an open overlay. Tapping the canvas
     * TOOLBAR is not tapping the canvas, even though the toolbar is drawn inside the
     * canvas element (spec 01 section 7 item 5).
     *
     * This region reports every tap that was not on its own chrome; whether the tap
     * SELECTED something -- which design 5.2 also carves out, since the tap that fills
     * the inspector must not dismiss it -- is known only to the shell, so that decision
     * lives in the shell's handler and this contract is unchanged by it.
     */
    readonly onCanvasTap?: () => void;
    /** The graphty-element wrapper and any additional overlay content. */
    readonly children?: ReactNode;
}

/* -------------------------------------------------------------------------- */
/* Region props: canvas toolbar (build spec 01 sections 3, 4, 6)               */
/* -------------------------------------------------------------------------- */

/**
 * The canvas's view mode. The 2D / 3D segmented control is always visible on the
 * toolbar, which is why there is no 3D chip in the status bar (spec 02 section 4.2).
 */
export type CanvasViewMode = "2d" | "3d";

/**
 * Props of the bottom-centre canvas toolbar. Nothing in the bar appears or disappears
 * with selection or state -- a centred container that changes width moves every item
 * under the pointer (spec 01 section 4).
 */
export interface CanvasToolbarProps {
    /** The current view mode, drawn on the segmented control. */
    readonly viewMode: CanvasViewMode;
    /** Segmented control change. */
    readonly onViewModeChange: (mode: CanvasViewMode) => void;
    /**
     * Whether Zoom to selection is enabled. The item is permanently drawn and merely
     * disables, with the title "Zoom to selection (F). Select something first".
     */
    readonly zoomToSelectionEnabled: boolean;
    /** Zoom out (-). */
    readonly onZoomOut: () => void;
    /** Zoom in (=). */
    readonly onZoomIn: () => void;
    /** Zoom to fit (0). */
    readonly onZoomToFit: () => void;
    /** Zoom to selection (F). */
    readonly onZoomToSelection: () => void;
    /** The bar's bottom offset, from `canvasToolbarBottomOffset`; null means not drawn. */
    readonly bottomOffset: number | null;
    /** Which size profile is in force. Nothing else changes between the two. */
    readonly profileId: "desktop" | "narrow";
    /** Whether the Views menu is open. It opens UPWARD from the Views button. */
    readonly viewsMenuOpen: boolean;
    /** Views menu open/close. */
    readonly onViewsMenuOpenChange: (open: boolean) => void;
}

/* -------------------------------------------------------------------------- */
/* Region props: inspector (build spec 03 section 3)                           */
/* -------------------------------------------------------------------------- */

/**
 * Props of the inspector region.
 */
export interface InspectorProps {
    /**
     * Whether the inspector column is shown, which since 2026-09-14 is exactly
     * "the sidebars are not hidden". The inspector has no open state of its own.
     */
    readonly open: boolean;
    /** The inspector's width, already clamped by the store. */
    readonly width: number;
    /** Docked on desktop, overlaid below 1280 px. */
    readonly presentation: RegionPresentation;
    /** What the inspector is showing. */
    readonly selectionKind: SelectionKind;
    /**
     * The surface KIND, at 12 px / weight 500, which never truncates -- e.g.
     * "Graph summary" (spec 03 sections 3.2 and 4).
     */
    readonly kindLabel: string;
    /** The surface IDENTITY, at 11 px muted, which ellipsizes into its own title. */
    readonly identityLabel?: string;
    /**
     * Whether a pinned card A is shown above the live content. One pin at a time;
     * below 1280 px the pinned card becomes a second tab (spec 03 section 3.3).
     */
    readonly pinned?: boolean;
    /*
     * `keptOpen`, `onKeepOpenChange` and `onToggle` all left on 2026-09-14, for the same
     * reason the panel header's pair did: the latch and the collapse chevron were
     * individual controls over one sidebar. `pinned` STAYS -- it is the comparison pin,
     * which freezes the CONTENT, and it never held the column.
     */
    /** Header "Copy reading". */
    readonly onCopyReading: () => void;
    /** Header "Pin as A". Absent for the Nothing-selected surface, which has no pin. */
    readonly onPin?: () => void;
    /** Desktop boundary drag. Absent below 1280 px. */
    readonly onWidthChange?: (width: number) => void;
    /** The inspector body. */
    readonly children?: ReactNode;
}

/* -------------------------------------------------------------------------- */
/* Region props: top bar (build spec 02 section 2)                             */
/* -------------------------------------------------------------------------- */

/**
 * Props of the top bar region. There is no saved / unsaved indicator and no
 * hamburger: file actions live in the Data panel, view toggles on the canvas toolbar,
 * AI settings in Settings (spec 02 section 2.1).
 */
export interface TopBarProps {
    /**
     * The loaded file name, which the top bar OWNS and the Data panel therefore does
     * not repeat. Null in the Empty state.
     */
    readonly datasetName: string | null;
    /** Whether data is loaded; Export, Share and Compare are disabled until it is. */
    readonly dataLoaded: boolean;
    /** Whether the undo half is enabled. The caret half is never disabled by this. */
    readonly canUndo: boolean;
    /** Whether Redo is enabled. */
    readonly canRedo: boolean;
    /** Undo (Cmd+Z). */
    readonly onUndo: () => void;
    /** Redo (Shift+Cmd+Z). */
    readonly onRedo: () => void;
    /** History, from the caret half, a right-click or a long-press on the main half. */
    readonly onOpenHistory: () => void;
    /** The command palette trigger pill, and the Cmd+K binding, share this. */
    readonly onOpenCommandPalette: () => void;
    /** Export menu: exactly two rows, Image and Data, both landing in Present. */
    readonly onExport: (target: "data" | "image") => void;
    /** Share menu: Export data with a CX2 or GraphML preset, and Copy image. */
    readonly onShare: (target: "copy-image" | "export-data") => void;
    /** Whether Compare mode is on; the toggle draws active. */
    readonly compareActive: boolean;
    /** Compare two views. */
    readonly onToggleCompare: () => void;
    /**
     * Whether BOTH sidebars are on screen; the one switch draws active and reports
     * `aria-pressed="true"` while they are.
     *
     * This ONE pair replaced `panelOpen` / `onTogglePanel` / `inspectorOpen` /
     * `onToggleInspector` on 2026-09-14. Two mirrored switches, each owning one sidebar,
     * were exactly the "individual buttons" the product owner asked to be rid of.
     */
    readonly sidebarsShown: boolean;
    /** Toggle sidebars (Cmd/Ctrl+B). One verb in every state, per 6.8 and REGISTER-1.5 10.2. */
    readonly onToggleSidebars: () => void;
}

/* -------------------------------------------------------------------------- */
/* Region props: status bar (build spec 02 section 4)                          */
/* -------------------------------------------------------------------------- */

/**
 * Every status bar slot, left to right. An empty slot is `display: none`.
 * Spec 02 section 4.2.
 */
export type StatusBarSlotId =
    | "ai"
    | "counts"
    | "issues"
    | "layout"
    | "running"
    | "selection"
    | "viewing"
    | "xr"
    | "zoom";

/**
 * Slot 1. Owns node and edge counts and "shown of loaded of total"; neither is
 * repeated anywhere else. Clicking opens the data table drawer.
 */
export interface StatusBarCounts {
    /** The node span, e.g. "20 nodes", "120 of 200 nodes", "412k of 1.0M nodes". */
    readonly nodes: string;
    /** The edge span, e.g. "29 edges", "500k of 1.1M edges". */
    readonly edges: string;
    /** The exact values, e.g. "120,418 nodes. 500,000 of 1,104,206 edges drawn". */
    readonly title: string;
    /** The sample line, e.g. "Sample: 50,000 of 1,000,000", in the subset state. */
    readonly sample?: string;
    /** Opens the data table drawer. */
    readonly onClick: () => void;
}

/**
 * Slot 2. The zoom percentage lives here and never joins the canvas toolbar.
 */
export interface StatusBarZoom {
    /** The readout, e.g. "Zoom 100%". */
    readonly label: string;
    /** Opens the small menu: Fit, Zoom to selection, 50%, 100%, 200%. */
    readonly onClick: () => void;
}

/**
 * Slot 3. Rendered only while an XR session is active. There is no 3D chip.
 */
export interface StatusBarXr {
    /** "VR" or "AR". */
    readonly mode: "AR" | "VR";
    /** Ends the session. Escape never leaves XR. */
    readonly onExit: () => void;
}

/**
 * Slot 4. The layout chip, which is also the home of the three loading phases and,
 * in Compare mode, "Comparing: A | B". No "Layout:" label and no state dot.
 */
export interface StatusBarLayout {
    /** The visible text, e.g. "Force directed - settled", "Positions from file". */
    readonly label: string;
    /** The technical name, e.g. "Force directed (ngraph) - settled". */
    readonly title: string;
    /**
     * Whether the trailing caret is drawn. While a load is running the slot takes NO
     * caret -- there is no layout engine to pick until the graph is built.
     */
    readonly caret: boolean;
    /** Chip body click: re-runs the layout. */
    readonly onRerun?: () => void;
    /** Caret click: opens the layout menu. */
    readonly onOpenMenu?: () => void;
}

/**
 * Slot 5. Mirrors the Analyze card's progress row. Never drops.
 */
export interface StatusBarRunning {
    /** e.g. "Computing Bridges (betweenness)... 42%". */
    readonly label: string;
    /** e.g. "and 2 queued". */
    readonly queued?: string;
    /** Whether Cancel is enabled. */
    readonly cancellable: boolean;
    /** The disabled reason, e.g. "Cannot cancel this run". */
    readonly cancelTitle?: string;
    /** Cancels the run; it takes effect within 1 s. */
    readonly onCancel?: () => void;
    /**
     * While the Analyze panel is open with the running card in view the slot shows
     * the spinner and the percentage only, so exactly one Cancel is on screen.
     */
    readonly compact?: boolean;
}

/**
 * Slot 6. Rendered only while the time slider is on; owns the time window with the
 * slider readout, which is why the filter strip drops its time chip.
 */
export interface StatusBarViewing {
    /** e.g. "Viewing: 2026-01-05 to 2026-02-04". */
    readonly label: string;
}

/**
 * Slot 7a. Kinds first, the instance total in parentheses.
 *
 * Named in {@link StatusBarIssues.validation}, which the caller fills in.
 * @public
 */
export interface StatusBarValidationIssues {
    /** e.g. "4 issue types (27)". */
    readonly label: string;
    /** e.g. "4 issue types, 27 issues". */
    readonly title: string;
    /** Opens the validation report in Data. */
    readonly onClick: () => void;
}

/**
 * Slot 7b. Dataset-scoped; hidden while Explore is open with Notes expanded.
 *
 * Named in {@link StatusBarIssues.notes}, which the caller fills in.
 * @public
 */
export interface StatusBarNotes {
    /** e.g. "5 notes", or "N of M notes" while a filter hides some targets. */
    readonly label: string;
    /** Opens Explore with the Notes section expanded. */
    readonly onClick: () => void;
}

/**
 * Slot 7c. Names the label cap only; the full rule list is the tooltip.
 *
 * Named in {@link StatusBarIssues.performance}, which the caller fills in.
 * @public
 */
export interface StatusBarPerformanceMode {
    /** e.g. "Performance mode: labels 20". */
    readonly label: string;
    /** The full rule list. */
    readonly title: string;
    /** Opens Settings > Performance. */
    readonly onClick: () => void;
}

/**
 * Slot 7, holding up to three chips in this order. Never drops.
 */
export interface StatusBarIssues {
    /** The validation issues chip. */
    readonly validation?: StatusBarValidationIssues;
    /** The notes chip. */
    readonly notes?: StatusBarNotes;
    /** The Performance mode chip. */
    readonly performance?: StatusBarPerformanceMode;
}

/**
 * Slot 8. Rendered only when a provider is configured or a call is in flight --
 * "AI: not configured" is never drawn. Drops first on overflow.
 */
export interface StatusBarAi {
    /** e.g. "AI: Anthropic ready", of the form "AI: <provider> <state>". */
    readonly label: string;
    /** Which ink the 6 px status dot takes. */
    readonly state: "busy" | "error" | "ready";
}

/**
 * Slot 9. Rendered only when the selection is non-zero. A selected style layer or a
 * selected result is not a selection and never fills this slot.
 */
export interface StatusBarSelection {
    /** e.g. "12 selected (+8)", "7 nodes, 4 edges selected", "1 selected". */
    readonly label: string;
}

/**
 * The status bar's slot model: an absent member is a slot that does not render.
 */
export interface StatusBarSlots {
    /** Slot 1. */
    readonly counts?: StatusBarCounts;
    /** Slot 2. */
    readonly zoom?: StatusBarZoom;
    /** Slot 3. */
    readonly xr?: StatusBarXr;
    /** Slot 4. */
    readonly layout?: StatusBarLayout;
    /** Slot 5. */
    readonly running?: StatusBarRunning;
    /** Slot 6. */
    readonly viewing?: StatusBarViewing;
    /** Slot 7. */
    readonly issues?: StatusBarIssues;
    /** Slot 8. */
    readonly ai?: StatusBarAi;
    /** Slot 9. */
    readonly selection?: StatusBarSelection;
}

/**
 * Props of the status bar region.
 */
export interface StatusBarProps {
    /** What each slot holds; an absent member does not render. */
    readonly slots: StatusBarSlots;
    /**
     * Slots the overflow pass has dropped, in `STATUS_BAR_DROP_ORDER`. Dropping
     * "layout" drops the chip's NAME text only -- the chip and its caret remain.
     */
    readonly droppedSlots?: readonly StatusBarSlotId[];
}
