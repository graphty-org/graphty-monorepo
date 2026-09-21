/**
 * What a load decides for itself about LABELS, and nothing else.
 *
 * Spec 7.2 "Defaults on load" (design/ui/app-shell-progressive-disclosure-design.md
 * lines 5666-5692) names one set of defaults below the large-graph threshold and a
 * different set above it. What survives here is the half that is about this product's
 * canvas: how many nodes carry a label, where the cut falls, and the sentence a reader
 * is owed when no cut can be drawn at all.
 *
 * TWO THINGS LEFT THIS MODULE, and both of them were facts about a GRAPH rather than
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
 * asks {@link labelDegreeThreshold} for a cut, gets undefined for a budget of zero, and
 * adds no layer. That is one gate rather than two, so a load cannot draw labels the
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

/**
 * How far past the budget a single tie group may spill when it is the SMALLEST set a
 * degree rule can name at all: twice the budget, and not a node more.
 *
 * A rule of the form `degree >= cut` can only ever draw a whole tie group, so on a
 * near-regular graph there is no cut that spends the budget exactly. The choice is
 * between a group somewhat larger than the budget and NOTHING, and the spec asks for
 * labels: 7.2 says "labels on the top clamp(round(sqrt(n)), 5, 50) nodes by degree" and
 * names no exemption for graphs whose degrees are similar. Twice is the allowance because
 * it keeps the overshoot the same ORDER as the budget -- 11 labels asked for, at most 22
 * drawn -- which is a readable canvas, where the unbounded version is not: the top tie
 * group of a regular 100k-node lattice is every node in it.
 *
 * The College football sample is the case this number is set against: 115 nodes, 12 of
 * degree 12, 66 of degree 11, budget 11. The top group of 12 is one node over the budget
 * and well inside the allowance, so the sample gets 12 labels rather than the none it got
 * between 2026-09-13 and this change.
 */
export const LABEL_OVERSHOOT_FACTOR = 2;

/**
 * What the label rule decided, and why. Every branch of {@link labelCutFor} names itself,
 * so a caller can both draw the layer and SAY what happened -- the one thing the cut alone
 * could not do.
 * @public
 */
export type LabelCutOutcome =
    | {
          /** The reader switched labels off, or set a budget of zero. */
          readonly kind: "labels-off";
      }
    | {
          /** No degrees were handed in: nothing is loaded, so nothing is labelled. */
          readonly kind: "empty-graph";
      }
    | {
          /** A cut exists that covers the budget or fewer nodes. The ordinary case. */
          readonly kind: "within-budget";
          /** The degree at or above which a node is labelled. */
          readonly degreeThreshold: number;
          /** How many nodes that cut covers. At most `budget`. */
          readonly labelledCount: number;
          /** The budget this cut was chosen against. */
          readonly budget: number;
      }
    | {
          /**
           * No cut fits the budget, so the highest tie group is drawn whole -- more labels
           * than the budget, but inside {@link LABEL_OVERSHOOT_FACTOR} times it. What a
           * near-regular graph gets.
           */
          readonly kind: "tie-overshoot";
          /** The highest degree in the graph; the cut. */
          readonly degreeThreshold: number;
          /** The size of that tie group. Over `budget`, within the allowance. */
          readonly labelledCount: number;
          /** The budget that was overshot. */
          readonly budget: number;
      }
    | {
          /**
           * Even the highest tie group is past the allowance, so no cut can be drawn and
           * NO labels are added. {@link labelCutExplanation} is the sentence a reader has
           * to be shown when this happens.
           */
          readonly kind: "too-regular";
          /** The highest degree in the graph. */
          readonly topDegree: number;
          /** How many nodes carry it. */
          readonly tiedCount: number;
          /** How many nodes the graph has, for the "N of M" the explanation draws. */
          readonly nodeCount: number;
          /** The budget that could not be met. */
          readonly budget: number;
      };

/**
 * The label rule's whole decision, from degrees sorted descending.
 *
 * The cut is a degree, not a rank, because the rule it feeds is a comparison against a
 * per-node degree and no algorithm publishes a 1-based ordinal (DegreeAlgorithm writes
 * degree, inDegree, outDegree and the three percentages, and nothing else). A degree rule
 * therefore cannot split a tie, and every branch below is a consequence of that:
 *
 * 1. Prefer the deepest cut that stays INSIDE the budget. A tie group that would spill
 *    past it is dropped whole (the change of 2026-09-13): cutting at the budget-th degree
 *    and keeping the ties overshoots by the size of the tie group, and on the cat fixture
 *    (3 nodes of degree 4, 12 of degree 3, 5 of degree 2) a budget of 5 cut at degree 3
 *    and labelled 15 of 20. The cut there is degree 4 and three nodes are labelled.
 * 2. When dropping whole leaves NOTHING -- the highest tie group is itself over the
 *    budget, which is every near-regular graph -- draw that group anyway, up to
 *    {@link LABEL_OVERSHOOT_FACTOR} times the budget. Spec 7.2 asks for labels on the top
 *    sqrt(n) nodes and does not say "unless the degrees are similar", and the walk-up of
 *    2026-09-13 read as if it did: College football (115 nodes, 12 of degree 12) got no
 *    label layer at all while the Settings switch still read ON.
 * 3. Only past that allowance is there no cut. A graph whose top tie group is more than
 *    twice the budget cannot be labelled BY THIS RULE at all, and saying so is
 *    {@link labelCutExplanation}'s job -- a reader must never be left with a switch that
 *    reads ON over a canvas with no labels and nothing anywhere explaining it.
 *
 * Pure arithmetic over the sorted degrees: the same distribution gives the same answer
 * however the node ids are spelled, which is what makes this a rule that survives a
 * reload and a change of data rather than a list that has to be rebuilt.
 * @param degreesDescending - every degree in the graph, highest first.
 * @param labelCount - how many nodes the label budget covers.
 * @returns which branch was taken, with the numbers that branch decided.
 */
export function labelCutFor(degreesDescending: readonly number[], labelCount: number): LabelCutOutcome {
    if (labelCount <= 0) {
        return { kind: "labels-off" };
    }

    if (degreesDescending.length === 0) {
        return { kind: "empty-graph" };
    }

    let kept = Math.min(labelCount, degreesDescending.length);

    // Walk the cut up while the node just past it ties with the node just inside it:
    // keeping the one means keeping them all, which is more than the budget allows.
    while (kept > 0 && kept < degreesDescending.length && degreesDescending[kept] === degreesDescending[kept - 1]) {
        kept--;
    }

    if (kept > 0) {
        return {
            kind: "within-budget",
            degreeThreshold: degreesDescending[kept - 1],
            labelledCount: kept,
            budget: labelCount,
        };
    }

    /* The walk ran out of graph, so every candidate cut sat inside the highest tie group:
       that group is the smallest set any degree rule can name here. */
    const topDegree = degreesDescending[0];
    const firstBelow = degreesDescending.findIndex((degree) => degree !== topDegree);
    const tiedCount = firstBelow === -1 ? degreesDescending.length : firstBelow;

    if (tiedCount <= labelCount * LABEL_OVERSHOOT_FACTOR && tiedCount < degreesDescending.length) {
        return {
            kind: "tie-overshoot",
            degreeThreshold: topDegree,
            labelledCount: tiedCount,
            budget: labelCount,
        };
    }

    /* Two refusals in one: a tie group past the allowance, and a group that is the WHOLE
       graph. The second matters on its own because a cut every node meets distinguishes
       none of them -- labelling all of them is what the budget exists to prevent -- and it
       is the only reason a four-node regular graph still gets no labels. */
    return {
        kind: "too-regular",
        topDegree,
        tiedCount,
        nodeCount: degreesDescending.length,
        budget: labelCount,
    };
}

/**
 * The degree at which the label rule cuts, or undefined when this graph cannot be
 * labelled by the rule. {@link labelCutFor} is the same decision WITH its reason, and a
 * caller that has to explain itself to a reader should ask that instead.
 * @param degreesDescending - every degree in the graph, highest first.
 * @param labelCount - how many nodes the label budget covers.
 * @returns the degree at or above which a node is labelled, or undefined when there is
 * nothing to label.
 */
export function labelDegreeThreshold(degreesDescending: readonly number[], labelCount: number): number | undefined {
    const outcome = labelCutFor(degreesDescending, labelCount);

    if (outcome.kind === "within-budget" || outcome.kind === "tie-overshoot") {
        return outcome.degreeThreshold;
    }

    return undefined;
}

/**
 * The sentence a reader must be shown, or undefined when nothing needs explaining.
 *
 * It is defined exactly where a reader would otherwise be SURPRISED: labels are on, the
 * graph has nodes, and none of them got a label. Every other branch returns undefined --
 * the two that draw labels need no apology, the switch is its own explanation when it is
 * off, and an empty canvas explains an empty canvas.
 *
 * This module owns no pixels, so the sentence has to be rendered by whoever adds the
 * layer: today that is AppShell's 7.2 effect, and the place a reader looks is the same
 * Settings > Performance pane that carries the switch. Until it is drawn somewhere, the
 * defect this function exists for is only half fixed.
 * @param outcome - what {@link labelCutFor} decided.
 * @returns the plain-text reason no labels were drawn, or undefined when some were.
 */
export function labelCutExplanation(outcome: LabelCutOutcome): string | undefined {
    if (outcome.kind !== "too-regular") {
        return undefined;
    }

    const smallestUsefulBudget = Math.ceil(outcome.tiedCount / LABEL_OVERSHOOT_FACTOR);
    const remedy =
        smallestUsefulBudget <= LABEL_COUNT_MAX
            ? ` Set the label budget in Settings > Performance to ${String(smallestUsefulBudget)} or more to label them.`
            : " No label budget can cover a tie that large, so this graph needs an analysis that tells its nodes apart.";

    const tied = String(outcome.tiedCount);

    return `Labels are on, but ${tied} of ${String(outcome.nodeCount)} nodes share the highest degree (${String(outcome.topDegree)}), and a rule that compares degrees cannot pick ${String(outcome.budget)} out of ${tied} equals, so none are labelled.${remedy}`;
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
 * the caller asks for a cut, is told there is none, and adds no layer.
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
