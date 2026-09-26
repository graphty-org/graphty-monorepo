/**
 * What a load decides for itself about LABELS, and nothing else.
 *
 * Spec 7.2 "Defaults on load" (design/ui/app-shell-progressive-disclosure-design.md
 * lines 5666-5692) names one set of defaults below the large-graph threshold and a
 * different set above it. What survives here is the half that is about this product's
 * canvas: how many nodes carry a label.
 *
 * THREE THINGS LEFT THIS MODULE, and all of them were facts about a GRAPH rather than
 * about this product.
 *
 * - THE LARGE-GRAPH THRESHOLD. It was declared here as 100,000 nodes. The element now
 *   publishes its own -- `DEFAULT_LIMITS.largeGraphThreshold`, 10,000 -- as the shipped
 *   default it runs its own renderer under, and the element is the party that knows what
 *   its renderer costs. The two disagreed by a factor of ten and nothing between them
 *   could notice, which is the defect a second declaration always produces. Every branch
 *   here now reads the element's number.
 * - THE LAYOUT CHOICE. Which arrangement suits a graph is `recommendLayout` in
 *   `@graphty/graphty-element/session`: it reads the graph's shape, resolves every
 *   candidate against the element's own layout catalogue, and never names an arrangement
 *   the element cannot serve at that size or without an input nobody supplied. The rule
 *   this module held was the same three cases -- every node already placed, above the
 *   threshold, otherwise force -- decided from a copy of a catalogue it could not see.
 *   AppShell asks the element instead, and passes `session.positions.placedCount` for the
 *   "already placed" case, which is a live count the element keeps and the app had to be
 *   told.
 * - WHERE THE LABEL CUT FALLS. Which nodes are the top N by degree, and what to do with a
 *   tie group that straddles N, is graphty-element's `{ match: "top" }` selector: a tie
 *   group is labelled whole, and only when all of it fits inside the budget. This module
 *   used to walk the sorted degrees itself to choose a degree threshold.
 *
 * This module decides and returns numbers and performs no side effects on the graph: the
 * caller sets the layout, adds the layers and runs the degree pass. That split is what
 * lets the decisions be tested as arithmetic rather than through a mounted canvas.
 *
 * Its one reading of the outside world is {@link readPersistedLabelSettings}, the
 * reader's own Performance setting, which {@link loadDefaults} consults when the caller
 * does not hand it one. That read is total -- an absent key, an unreadable store,
 * malformed JSON and a value of the wrong shape all come back as "nothing was
 * remembered" -- so every decision below stays a pure function of the node count and
 * that record. The record lives here rather than in a module of its own because the
 * setting it holds is an INPUT to this file's arithmetic and nowhere else's.
 */

import { DEFAULT_LIMITS } from "@graphty/graphty-element/session";

/** Spec 7.2: labels on clamp(round(sqrt(n)), 5, 50) nodes. */
export const LABEL_COUNT_MIN = 5;

/** Spec 7.2: the below-threshold ceiling. */
export const LABEL_COUNT_MAX = 50;

/** Spec 7.2: "at most 20 labels" in Performance mode. */
export const PERFORMANCE_LABEL_COUNT = 20;

/**
 * Versioned local-storage key for the reader's own label settings.
 *
 * The read, the write and the resolve below copy `readPersistedInsightsMemory` field for
 * field -- a versioned key so a shape change becomes a missing key rather than a corrupt
 * read, a try/catch round the store, JSON.parse in its own try, non-objects and arrays
 * refused, and each field validated on its own. A separate key from
 * `graphty.shell.layout.v2` because these are not layout: they are what the reader wants
 * DRAWN, and neither record may corrupt the other.
 */
export const LABEL_SETTINGS_STORAGE_KEY = "graphty.shell.labels.v1";

/**
 * The label settings Settings > Performance owns, and nothing more.
 *
 * Spec 7.2 puts the label budget under Settings > Performance; the switch is the product
 * owner's 2026-09-13 requirement that the top-degree label layer "have a setting that can
 * disable that feature".
 * @public
 */
export interface PersistedLabelSettings {
    /** Whether a load adds the top-degree label layer at all. */
    readonly topDegreeLabelsOn: boolean;
    /**
     * The reader's own budget, or null to follow the graph's size.
     *
     * Null rather than absent so the record is complete and one field cannot be mistaken
     * for the other: `null` is "decide for me", a number is "this many". It is still
     * capped -- above the large-graph threshold by {@link PERFORMANCE_LABEL_COUNT} and
     * below it by {@link LABEL_COUNT_MAX} -- because a reader cannot ask for a budget
     * that 7.2's Performance branch forbids.
     */
    readonly labelCount: number | null;
}

/** Labels on, budget decided from the graph's size. What a reader who has chosen nothing gets. */
export const DEFAULT_LABEL_SETTINGS: PersistedLabelSettings = {
    topDegreeLabelsOn: true,
    labelCount: null,
};

/**
 * Reads the reader's label settings, surviving an absent key, an unreadable store
 * (private mode, disabled site data), malformed JSON and a value of the wrong shape.
 * Each field is validated on its own, so one bad field costs only that field.
 *
 * A stored `labelCount` is kept only when it is null or a finite number of at least one:
 * zero would be "labels on, none drawn", which is the switch's job and not the budget's.
 * @returns whatever of the stored settings could be trusted.
 */
export function readPersistedLabelSettings(): Partial<PersistedLabelSettings> {
    let raw: string | null = null;

    try {
        raw = window.localStorage.getItem(LABEL_SETTINGS_STORAGE_KEY);
    } catch {
        return {};
    }

    if (raw === null || raw === "") {
        return {};
    }

    let parsed: unknown = null;

    try {
        parsed = JSON.parse(raw);
    } catch {
        return {};
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {};
    }

    const record = parsed as Record<string, unknown>;
    const result: { topDegreeLabelsOn?: boolean; labelCount?: number | null } = {};

    if (typeof record.topDegreeLabelsOn === "boolean") {
        result.topDegreeLabelsOn = record.topDegreeLabelsOn;
    }

    if (record.labelCount === null) {
        result.labelCount = null;
    } else if (typeof record.labelCount === "number" && Number.isFinite(record.labelCount) && record.labelCount >= 1) {
        result.labelCount = record.labelCount;
    }

    return result;
}

/**
 * Writes the reader's label settings. A full or unavailable store is not an error the
 * shell can act on: the choice simply does not survive the session.
 * @param settings - the settings to remember.
 */
export function writePersistedLabelSettings(settings: PersistedLabelSettings): void {
    try {
        window.localStorage.setItem(LABEL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Deliberately ignored: see the JSDoc above.
    }
}

/**
 * The settings to work from: the defaults, overwritten by whatever of the stored record
 * could be trusted.
 * @param persisted - the result of {@link readPersistedLabelSettings}.
 * @returns a complete settings record.
 */
export function resolveLabelSettings(persisted: Partial<PersistedLabelSettings>): PersistedLabelSettings {
    return { ...DEFAULT_LABEL_SETTINGS, ...persisted };
}

/**
 * Whether a node count is above the large-graph threshold.
 *
 * The threshold is the element's own `DEFAULT_LIMITS.largeGraphThreshold` rather than a number
 * declared here, so 7.2's Performance branch and 7.3's replacement set open at the same size the
 * element itself starts drawing less detail at. Strictly above, so a graph of exactly that size
 * is still a small graph.
 * @param nodeCount - nodes loaded.
 * @returns true when the Performance branch of 7.2 applies.
 */
export function isAboveLargeGraphThreshold(nodeCount: number): boolean {
    return nodeCount > DEFAULT_LIMITS.largeGraphThreshold;
}

/**
 * clamp(round(sqrt(n)), 5, 50) below the threshold; PERFORMANCE_LABEL_COUNT above it --
 * unless the reader has said otherwise in Settings > Performance.
 *
 * The switch off is a budget of ZERO, and zero is what turns the layer off: the caller
 * adds the label layer only for a budget above zero. That is one gate rather than two, so a load cannot draw labels the
 * reader has switched off by taking some other branch.
 * @param nodeCount - nodes loaded.
 * @param settings - the reader's own settings; omitted means the automatic budget.
 * @returns how many nodes get labels.
 */
export function labelCountFor(nodeCount: number, settings?: PersistedLabelSettings): number {
    if (settings !== undefined && !settings.topDegreeLabelsOn) {
        return 0;
    }

    const ceiling = isAboveLargeGraphThreshold(nodeCount) ? PERFORMANCE_LABEL_COUNT : LABEL_COUNT_MAX;
    const chosen = settings?.labelCount ?? null;

    if (chosen !== null) {
        return Math.min(ceiling, Math.max(0, Math.round(chosen)));
    }

    if (isAboveLargeGraphThreshold(nodeCount)) {
        return PERFORMANCE_LABEL_COUNT;
    }

    const scaled = Math.round(Math.sqrt(Math.max(0, nodeCount)));

    return Math.min(LABEL_COUNT_MAX, Math.max(LABEL_COUNT_MIN, scaled));
}

/** What 7.2 decides on load. Numbers only: this module performs no side effects. @public */
export interface LoadDefaults {
    /** Whether the Performance branch was taken. */
    readonly aboveThreshold: boolean;
    /** How many nodes get labels. */
    readonly labelCount: number;
}

/**
 * The label budget a load should apply, from the loaded graph's size alone.
 *
 * Below the large-graph threshold the budget is clamp(round(sqrt(n)), 5, 50); above it 7.2's
 * Performance branch drops it to 20. THE LAYOUT IS NOT DECIDED HERE and has not been since the
 * element began publishing `recommendLayout`, which reads the same graph shape against the
 * element's own catalogue of arrangements -- see this module's header for what that replaced.
 *
 * The budget is the one decision a reader may overrule, in Settings > Performance (2026-09-13).
 * A caller that names `labels` gets exactly those; a caller that names none gets what the reader
 * last chose, read from local storage. A budget of zero is how the switch turns the feature off:
 * the caller adds no label layer.
 * @param input - the loaded graph's size and the reader's label settings when the caller holds
 * them already.
 * @param input.nodeCount - nodes loaded.
 * @param input.labels - the reader's label settings; omitted reads the stored ones.
 * @returns what the caller applies.
 */
export function loadDefaults(input: {
    /** Nodes loaded. */
    readonly nodeCount: number;
    /** The reader's own label settings. Omitted, the stored ones are read. */
    readonly labels?: PersistedLabelSettings;
}): LoadDefaults {
    const labels = input.labels ?? resolveLabelSettings(readPersistedLabelSettings());

    return {
        aboveThreshold: isAboveLargeGraphThreshold(input.nodeCount),
        labelCount: labelCountFor(input.nodeCount, labels),
    };
}
