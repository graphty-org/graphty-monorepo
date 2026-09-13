/**
 * The status bar's typed model.
 *
 * `../types.ts` is the frozen shell contract and already carries the nine slots of
 * build spec 02 section 4.2. Three things the status bar also owns have no home
 * there yet -- the three loading phases of section 6, the completion toast of the
 * same section, and the layout chip's caret menu of section 5 -- so this module
 * extends the frozen contract rather than duplicating it. Every addition widens
 * `StatusBarProps`, so a caller holding the frozen type still type-checks, and the
 * integration agent can fold these declarations into `../types.ts` unchanged.
 *
 * Type-only module: nothing here draws, measures or formats.
 */

import type { StatusBarLayout, StatusBarProps, StatusBarRunning, StatusBarSlots } from "../types";

/**
 * One of the four Style quick picks the layout chip's caret menu mirrors
 * (spec 02 section 5): `Force directed (ngraph)`, `Hierarchical`, `Radial` and
 * `More`, each with its size estimate and its disabled reason, the active engine
 * checked.
 */
export interface LayoutQuickPick {
    /** Stable id, used as the row key and by the tests. */
    readonly id: string;
    /** The visible name, e.g. `Force directed`, `Hierarchical`, `From file`. */
    readonly label: string;
    /**
     * The row's tooltip: the plain-then-technical pair the Style panel draws, e.g.
     * `Force directed (ngraph)`, `Hierarchical (sugiyama). Coming`.
     */
    readonly title: string;
    /** The size estimate, e.g. `about 4 min`. Absent where the engine needs none. */
    readonly estimate?: string;
    /** Whether this engine is in force; it draws checked. */
    readonly active: boolean;
    /**
     * Whether the engine is not built yet. The row draws disabled at the unshipped
     * ink with a muted `Coming` tag (spec 04 section 5.8's drawing rule).
     */
    readonly coming?: boolean;
    /**
     * Why the row is disabled, when the reason is not `Coming`. A disabled row always
     * states its reason (floor item 4), so this string joins the row's tooltip.
     */
    readonly disabledReason?: string;
    /** Applies this engine. */
    readonly onSelect: () => void;
}

/**
 * The layout slot, widened with the caret menu's own three verbs.
 *
 * `onRerun` is shared: it is the chip body's click and the menu's `Re-run` row.
 */
export interface StatusBarLayoutModel extends StatusBarLayout {
    /** The four quick picks. An empty list draws the menu's verbs alone. */
    readonly picks?: readonly LayoutQuickPick[];
    /** The menu's `Stop` row. */
    readonly onStop?: () => void;
    /** The menu's `Layout settings...` row, which opens Style with the list focused. */
    readonly onOpenSettings?: () => void;
}

/**
 * The running slot, widened with the two facts spec 02 section 4.2 slot 5 draws that
 * a single `label` cannot carry.
 */
export interface StatusBarRunningModel extends StatusBarRunning {
    /**
     * The percentage on its own, e.g. `42%`. It is what the compaction rule leaves on
     * screen while the Analyze card carries the rest. Absent until the algorithm
     * reports progress -- and while it is absent the slot shows elapsed time and an
     * indeterminate spinner, never a percentage.
     */
    readonly percentLabel?: string;
    /** Elapsed time, e.g. `1.8 s`, drawn with the spinner while no progress is reported. */
    readonly elapsed?: string;
}

/**
 * The slot model, with the two widened slots substituted.
 */
export interface StatusBarSlotsModel extends StatusBarSlots {
    /** Slot 4. */
    readonly layout?: StatusBarLayoutModel;
    /** Slot 5. */
    readonly running?: StatusBarRunningModel;
}

/**
 * A load in progress. It takes over the layout slot, which is why the layout chip
 * draws no caret while it runs: there is no engine to pick until the graph is built
 * (spec 02 section 6).
 */
export interface StatusBarLoading {
    /**
     * The phase sentence, built by `loadingPhases.ts`, e.g.
     * `Building graph: 48,000 of about 120,000 nodes (40%), about 12 s left`.
     */
    readonly label: string;
    /**
     * How far the phase has got, 0 to 1, drawn as the 120 x 4 bar. Absent while the
     * phase is indeterminate -- `Parsing...` and a build with no known total.
     */
    readonly progress?: number;
    /** Whether Cancel can act on this load. Cancel is drawn in every phase either way. */
    readonly cancellable: boolean;
    /** Cancels the load; it stops within 1 s and the shell returns to Empty. */
    readonly onCancel?: () => void;
}

/**
 * The completion toast, shown for a few seconds after a load finishes
 * (spec 02 section 6).
 */
export interface StatusBarCompletion {
    /**
     * The sentence, e.g. `Loaded 51,000 nodes and 212,000 edges in 34 s.`, with the
     * mapping clause appended when roles were guessed or changed.
     */
    readonly message: string;
    /**
     * Opens Data with the Loaded data section expanded, scrolled to the mapping line
     * and highlighting it for two seconds.
     */
    readonly onDetails: () => void;
    /** Dismisses the toast. */
    readonly onDismiss?: () => void;
}

/**
 * Props of the status bar region: the frozen contract plus the three things the bar
 * owns that the contract has no member for yet.
 */
export interface StatusBarRegionProps extends StatusBarProps {
    /** What each slot holds; an absent member does not render. */
    readonly slots: StatusBarSlotsModel;
    /** A load in progress, which takes over the layout slot. */
    readonly loading?: StatusBarLoading;
    /** The completion toast, drawn above the bar for a few seconds after a load. */
    readonly completion?: StatusBarCompletion;
    /**
     * Whether Explore is open with its Notes section expanded. The notes chip hides
     * while it is, because the expanded section is then the fact's own region
     * (spec 02 section 4.2 slot 7b).
     */
    readonly exploreNotesExpanded?: boolean;
}
