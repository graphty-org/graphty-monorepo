/**
 * The Insights strip's rule table: which suggestion cards a loaded graph earns.
 *
 * Spec 7.3 "Insights strip" (app-shell-progressive-disclosure-design.md lines 5693 to
 * 5754) states the table as eight prioritised rows, a deterministic replacement set
 * above the large-graph threshold, a cap of four cards with Search always last, and a
 * 60 s estimate ceiling. This module is that table and nothing else: it is pure and it
 * performs no side effects. The caller maps {@link InsightCardSpec} onto `InsightCard`
 * and binds the activation.
 *
 * WHAT THE TABLE STOPPED DECIDING FOR ITSELF. Two of its inputs used to be the app's own
 * answers about a GRAPH, and both are now the element's:
 *
 * - WHETHER A CARD CAN RUN AT ALL. The table used to offer whatever its rules named and
 *   leave the element to refuse it later. `session.catalog.metrics()` says, per algorithm,
 *   whether this graph can support it and why not when it cannot, so a card for something
 *   the element has already said it will not run is never offered. The listing arrives on
 *   {@link InsightsGraphShape.metrics}.
 * - WHAT A RUN WOULD COST. The 60 s ceiling used to read a per-capability record the shell
 *   assembled for three metrics and nothing else, so every other card passed the ceiling by
 *   never being measured. The same listing carries `estimateSeconds` for every algorithm the
 *   element ships, from the same cost model the Run button asks, so the strip and the button
 *   cannot quote different numbers.
 *
 * The large-graph threshold is the element's `DEFAULT_LIMITS.largeGraphThreshold` unless a
 * caller names one. It was a constant of the app's own, ten times the element's, and nothing
 * between the two could notice they disagreed.
 *
 * WHAT IS STILL THIS PRODUCT'S, and stays: the eight-row priority order, the cap of four,
 * Search always last, the 60 s ceiling itself, the above-threshold replacement set, and every
 * card's copy. Which analysis a reader is OFFERED, in what order, is a decision about this
 * interface; whether the element can perform it is a fact about the graph.
 *
 * WHY a pure table rather than logic inside the strip: the strip component is already
 * built and takes its cards as props, and the interesting part of 7.3 is the choice,
 * not the drawing. A pure choice is testable against the boards that drew it --
 * Main.dc.html:702 (three cards on the cat graph), InsightsWide.dc.html:22 to 28 (six
 * candidates, four shown, two dropped) and ExplorerLargeGraph.dc.html:2867 (the
 * deterministic above-threshold set).
 *
 * Every user-visible string here is frozen copy read off those boards. MIN-14 collapsed
 * the plain and technical names onto one line, so `technicalName` carries no
 * parentheses and no line of its own; the strip adds the parentheses when it draws the
 * pair.
 */

import type { AlgorithmKey, MetricAvailability } from "@graphty/graphty-element/catalog";
import { DEFAULT_LIMITS, type GraphStatistics } from "@graphty/graphty-element/session";

/**
 * The capabilities the 7.3 rule table can offer. Also the card ids.
 * @public
 */
export type InsightCapability =
    | "centrality-betweenness"
    | "centrality-degree"
    | "centrality-pagerank"
    | "community-detection"
    | "component-analysis"
    | "data-validation"
    | "narrow-the-view"
    | "search"
    | "temporal-navigation";

/**
 * Which way the graph's edges run, as graphty-element reports it.
 *
 * It is the element's own four-state answer rather than a copy of three of its values,
 * because the table has to keep branching correctly on whatever the element can say. Rule
 * 3 fires on "directed" alone; rule 4's "Not directed" is satisfied by every other value,
 * including "mixed" -- a graph whose edges do not agree is not a directed graph, and the
 * Influence reading needs one that is.
 *
 * "unknown" is a real answer and means the question is not settled: an empty graph the
 * element has been told nothing about. Neither rule treats it as directed.
 * @public
 */
export type Directedness = GraphStatistics["directedness"];

/**
 * Everything the rule table reads. Plain values and the element's own metric listing, so a
 * board can state a graph in a literal and the table stays testable without a live element.
 * @public
 */
export interface InsightsGraphShape {
    /** Nodes loaded. */
    readonly nodeCount: number;
    /** Edges loaded. */
    readonly edgeCount: number;
    /** Which way the edges run, as the element reports it. */
    readonly directedness: Directedness;
    /** Whether a time role has been assigned. False until a column-role model exists. */
    readonly hasTimeRole: boolean;
    /** How many KINDS of validation issue were found. 0 means rule 1 does not fire. */
    readonly validationIssueTypeCount: number;
    /** The highest-degree node's label, for the Search card's example. */
    readonly searchExample?: string;
    /**
     * The node count above which 7.2's Performance branch and 7.3's replacement set apply.
     *
     * Omitted, it is the element's own `DEFAULT_LIMITS.largeGraphThreshold`, which is the
     * size the element itself starts drawing less detail at. A caller names one only to
     * exercise the above-threshold branch on a graph small enough to state in a literal.
     */
    readonly largeGraphThreshold?: number;
    /**
     * What the element says about every algorithm it ships, from `session.catalog.metrics()`.
     *
     * Two things the table used to guess at: whether a run is possible on THIS graph
     * (`available`, with a `reason` when it is not) and what it would cost
     * (`estimateSeconds`, from the same cost model the Run button asks). A capability whose
     * algorithm the element lists as unavailable is never offered, whatever the rules say.
     *
     * Omitted, or missing the algorithm behind a capability, the card is treated exactly as
     * an unestimated one always has been: allowed below the threshold, where a run is cheap
     * by construction, and above it only if it belongs to the deterministic set.
     */
    readonly metrics?: readonly MetricAvailability[];
}

/**
 * One card, ready for the caller to map onto `InsightCard`.
 * @public
 */
export interface InsightCardSpec {
    /** Same value as `capability`; the strip wants a stable id. */
    readonly id: InsightCapability;
    /** What the card runs. */
    readonly capability: InsightCapability;
    /** The plain name, e.g. "Find groups". */
    readonly title: string;
    /** The technical half WITHOUT parentheses, e.g. "Communities, Louvain". */
    readonly technicalName: string;
    /** One sentence of body. */
    readonly body: string;
    /** Always INSIGHT_ACTION_LABEL. */
    readonly actionLabel: string;
}

/**
 * The strip's whole model: what is shown and what the cap dropped.
 * @public
 */
export interface InsightsStripModel {
    /** At most INSIGHTS_CARD_CAP cards, in priority order, Search last. */
    readonly cards: readonly InsightCardSpec[];
    /** How many candidates the cap dropped (the "N more in Help" count). */
    readonly droppedCount: number;
    /** The dropped candidates themselves, in priority order. */
    readonly droppedCards: readonly InsightCardSpec[];
}

/** Spec 7.3: "Up to four cards". */
export const INSIGHTS_CARD_CAP = 4;

/** Spec 7.3: "The strip never offers a card whose estimate exceeds 60 s." */
export const INSIGHTS_ESTIMATE_CEILING_SECONDS = 60;

/** Spec 7.3: the Narrow the view card is shown only when nodes exceed this. */
export const NARROW_VIEW_NODE_FLOOR = 50000;

/** The affordance label on every card, in every form. */
export const INSIGHT_ACTION_LABEL = "Try it";

/**
 * The above-threshold deterministic set, in the order ExplorerLargeGraph.dc.html:2867 draws it.
 *
 * Membership here exempts a card from needing a MEASUREMENT above the threshold: the spec names
 * these as the set that IS shown, so refusing them because nothing measured them would empty the
 * strip on exactly the graphs that most need it. It is not an exemption from the 60 s ceiling
 * or from the element's refusal. A card the element has measured at more than a minute, or has
 * said it will not run on this graph, is dropped from the set like any other -- the ceiling is
 * unconditional in 7.3, and a card promising a run that cannot happen is worse than a short
 * strip.
 */
const ABOVE_THRESHOLD_DETERMINISTIC_SET: readonly InsightCapability[] = [
    "data-validation",
    "narrow-the-view",
    "component-analysis",
    "centrality-degree",
    "search",
];

/**
 * Builds one card. Every string a caller sees passes through here, so the frozen copy
 * lives in one place per capability.
 * @param capability - what the card runs; also its id.
 * @param title - the plain name.
 * @param technicalName - the technical half, with no parentheses (MIN-14).
 * @param body - the one-sentence body.
 * @returns the card spec.
 */
function buildCard(
    capability: InsightCapability,
    title: string,
    technicalName: string,
    body: string,
): InsightCardSpec {
    return {
        id: capability,
        capability,
        title,
        technicalName,
        body,
        actionLabel: INSIGHT_ACTION_LABEL,
    };
}

/**
 * Rule 1's card. The title counts issue KINDS, as InsightsWide's "Check 4 data issues"
 * does over its four warning types.
 *
 * The board's body enumerates the kinds -- "14 edges with no amount, 6 values that are
 * not dates, 5 repeated pairs and 2 edges that point at their own node." -- but that is
 * the fraud fixture's instance, not a template: nothing in the app computes an issue
 * breakdown (DataManager hardcodes its warning count to 0), so the body points at the
 * report instead of inventing a tally. The enumerated form returns the day a validation
 * pass ships and can supply the per-kind counts.
 * @param issueTypeCount - how many kinds of issue were found.
 * @returns the validation card.
 */
function validationCard(issueTypeCount: number): InsightCardSpec {
    return buildCard(
        "data-validation",
        `Check ${String(issueTypeCount)} data issues`,
        "Data validation",
        "Open the validation report to see what needs attention.",
    );
}

/**
 * Rule 2's card (Main.dc.html:713, InsightsWide.dc.html:470).
 * @returns the community detection card.
 */
function communityCard(): InsightCardSpec {
    return buildCard(
        "community-detection",
        "Find groups",
        "Communities, Louvain",
        "Cluster nodes that interact more with each other than with the rest.",
    );
}

/**
 * Rule 3's card (InsightsWide.dc.html:480).
 * @returns the PageRank card.
 */
function pagerankCard(): InsightCardSpec {
    return buildCard("centrality-pagerank", "Who has influence", "PageRank", "Nodes with well-linked neighbors.");
}

/**
 * Rule 4's card (Main.dc.html:724, ExplorerLargeGraph.dc.html:2894).
 * @returns the degree centrality card.
 */
function degreeCard(): InsightCardSpec {
    return buildCard(
        "centrality-degree",
        "Who is most connected",
        "Degree centrality",
        "Rank nodes by how many links they have.",
    );
}

/**
 * Rule 5's card. No board draws its body, so the body is the string AnalyzePanel
 * already ships for the same capability -- reusing it keeps one sentence per
 * capability across the two surfaces rather than minting a second.
 * @returns the betweenness card.
 */
function betweennessCard(): InsightCardSpec {
    return buildCard(
        "centrality-betweenness",
        "Find the bridges",
        "Betweenness centrality",
        "Nodes that link otherwise separate groups.",
    );
}

/**
 * Rule 6's card. The title is drawn (7.3's rule table names it); the body is
 * UNATTESTED -- no board draws a body for this card -- so it is the plainest sentence
 * that describes what the time slider does, and should be replaced by drawn copy when
 * a board supplies one.
 * @returns the temporal navigation card.
 */
function temporalCard(): InsightCardSpec {
    return buildCard(
        "temporal-navigation",
        "See how it changed over time",
        "Time slider",
        "Step through the graph as it changed.",
    );
}

/**
 * Rule 7's card (ExplorerLargeGraph.dc.html:2888).
 * @returns the component analysis card.
 */
function componentCard(): InsightCardSpec {
    return buildCard(
        "component-analysis",
        "Find connected parts",
        "Components",
        "Split the graph into pieces that are not linked to each other.",
    );
}

/**
 * The above-threshold filter card. The board draws its technical half as "Filter
 * builder (Explore)"; MIN-14's one-line collapse turns a nested parenthesis into a
 * comma, exactly as "Communities, Louvain" does. The body is frozen in VOCAB.md.
 * @returns the narrow-the-view card.
 */
function narrowViewCard(): InsightCardSpec {
    return buildCard(
        "narrow-the-view",
        "Narrow the view",
        "Filter builder, Explore",
        "Filter by type, attribute, or a result you have already run.",
    );
}

/**
 * The last card, always. Its example is the highest-degree labelled node (7.3); above
 * the threshold it adds "Exact ids are fastest."
 * (ExplorerLargeGraph.dc.html:2908).
 * @param searchExample - the example node label.
 * @param aboveThreshold - whether the Performance branch was taken.
 * @returns the search card.
 */
function searchCard(searchExample: string, aboveThreshold: boolean): InsightCardSpec {
    return buildCard(
        "search",
        "Search for something you know",
        "Search",
        aboveThreshold
            ? `Try ${searchExample}. Exact ids are fastest.`
            : `Type a name like ${searchExample} to find it on the canvas.`,
    );
}

/**
 * Which of the element's algorithms each card would run.
 *
 * The capability names are this interface's, the keys are the element's catalogue's, and this
 * is the one place the two are spelled side by side. Four capabilities are deliberately
 * absent: Search, Narrow the view, the validation report and the time slider run no algorithm,
 * so the element has nothing to say about whether they are possible or what they cost.
 */
const INSIGHT_CAPABILITY_ALGORITHMS: Readonly<Partial<Record<InsightCapability, AlgorithmKey>>> = {
    "centrality-betweenness": "betweenness",
    "centrality-degree": "degree",
    "centrality-pagerank": "pagerank",
    "community-detection": "louvain",
    "component-analysis": "components",
};

/**
 * What the element said about the algorithm behind one card.
 * @param shape - the loaded graph's shape.
 * @param capability - the candidate capability.
 * @returns the element's entry, or undefined when the card runs no algorithm or the element
 * was not asked.
 */
function elementListing(shape: InsightsGraphShape, capability: InsightCapability): MetricAvailability | undefined {
    const key = INSIGHT_CAPABILITY_ALGORITHMS[capability];

    if (key === undefined) {
        return undefined;
    }

    return shape.metrics?.find((metric) => metric.key === key);
}

/**
 * Whether a card may be offered: the element has to be willing to run it, and the run has to
 * fit under the 60 s ceiling.
 *
 * A metric the element reports as unavailable is refused outright, in both branches. There is
 * no card to draw for a run that cannot happen -- the element's `reason` says why, and 7.3 has
 * nowhere to print it, so the honest strip leaves the slot to a card that works.
 *
 * A run at or above the ceiling is refused in both branches too ("The strip never offers a card
 * whose estimate exceeds 60 s"). A card the element said NOTHING about -- one that runs no
 * algorithm, or a listing the caller did not supply -- is permitted below the threshold, where
 * a run is cheap by construction, and refused above it unless it belongs to the deterministic
 * set: above the threshold an unmeasured run is the thing the gate exists to stop.
 * @param shape - the loaded graph's shape.
 * @param capability - the candidate capability.
 * @param aboveThreshold - whether the Performance branch was taken.
 * @returns whether the card may be offered.
 */
function mayBeOffered(shape: InsightsGraphShape, capability: InsightCapability, aboveThreshold: boolean): boolean {
    const listed = elementListing(shape, capability);

    if (listed === undefined) {
        return !aboveThreshold || ABOVE_THRESHOLD_DETERMINISTIC_SET.includes(capability);
    }

    if (!listed.available) {
        return false;
    }

    return listed.estimateSeconds < INSIGHTS_ESTIMATE_CEILING_SECONDS;
}

/**
 * Whether the Performance branch is taken. Strictly above, so a graph of exactly the
 * threshold size is still a small graph.
 * @param shape - the loaded graph's shape.
 * @returns whether the graph is above the large-graph threshold.
 */
function isAboveThreshold(shape: InsightsGraphShape): boolean {
    return shape.nodeCount > (shape.largeGraphThreshold ?? DEFAULT_LIMITS.largeGraphThreshold);
}

/**
 * Every candidate the rule table produces for this shape, in priority order with
 * Search last, before the cap and before retirement.
 *
 * Below the threshold this is spec 7.3's eight-row table. Above it, the deterministic
 * set replaces the table: Check N data issues (when there are issues), Narrow the view
 * (only past {@link NARROW_VIEW_NODE_FLOOR}), Find connected parts, Who is most
 * connected, then Search -- with Find groups appended as the one extra card the spec
 * allows, which the estimate gate then keeps or drops. Find the bridges is never
 * offered above the threshold.
 * @param shape - the loaded graph's shape.
 * @returns the candidates, highest priority first.
 */
export function insightCandidates(shape: InsightsGraphShape): readonly InsightCardSpec[] {
    const aboveThreshold = isAboveThreshold(shape);
    const candidates: InsightCardSpec[] = [];

    if (aboveThreshold) {
        if (shape.validationIssueTypeCount > 0) {
            candidates.push(validationCard(shape.validationIssueTypeCount));
        }

        if (shape.nodeCount > NARROW_VIEW_NODE_FLOOR) {
            candidates.push(narrowViewCard());
        }

        candidates.push(componentCard());
        candidates.push(degreeCard());

        // Spec 7.3: "Between the threshold and 1M nodes Find groups may appear as a
        // fourth card only when its label-propagation estimate is under 60 s." The gate
        // below refuses it outright when the element said nothing about it, so pushing it
        // here is safe.
        candidates.push(communityCard());
    } else {
        // Rule 1.
        if (shape.validationIssueTypeCount > 0) {
            candidates.push(validationCard(shape.validationIssueTypeCount));
        }

        // Rule 2: always.
        candidates.push(communityCard());

        // Rule 3: directed. Only "directed" counts; "mixed" and "unknown" do not.
        //
        // The gate is consulted HERE rather than only in the filter below, because rule 4
        // reads whether the Influence card actually survived: a PageRank card the element
        // refuses, or one the 60 s ceiling refuses, is a card that is "not shown", and rule
        // 4's second disjunct exists so the degree card takes its slot.
        const influenceShown =
            shape.directedness === "directed" && mayBeOffered(shape, "centrality-pagerank", aboveThreshold);

        if (influenceShown) {
            candidates.push(pagerankCard());
        }

        // Rule 4: "Not directed, or Influence not shown".
        if (shape.directedness !== "directed" || !influenceShown) {
            candidates.push(degreeCard());
        }

        // Rule 5: nodes > 20, and below the threshold -- which this branch already is.
        if (shape.nodeCount > 20) {
            candidates.push(betweennessCard());
        }

        // Rule 6: a time role has been assigned.
        if (shape.hasTimeRole) {
            candidates.push(temporalCard());
        }

        // Rule 7 belongs to the above-threshold branch and cannot fire here.
    }

    // Last, always -- but only with an example to name. With no example the body would
    // read "Type a name like  to find it on the canvas.", so there is no honest card.
    if (typeof shape.searchExample === "string" && shape.searchExample !== "") {
        candidates.push(searchCard(shape.searchExample, aboveThreshold));
    }

    return candidates.filter((candidate) => mayBeOffered(shape, candidate.capability, aboveThreshold));
}

/**
 * The strip's model: candidates, less the retired ones, capped with Search always
 * last.
 *
 * Retirement is applied BEFORE the cap, so a retired card frees its slot for a card the
 * cap had dropped. The cap keeps Search plus as many of the highest-priority remaining
 * cards as fit under {@link INSIGHTS_CARD_CAP}; when there is no Search card (no
 * example to name) the freed slot goes to another card rather than being wasted.
 * @param shape - the loaded graph's shape.
 * @param retiredCapabilities - capabilities already run from their own panel.
 * @returns what to show, and what the cap dropped.
 */
export function insightsStripModel(
    shape: InsightsGraphShape,
    retiredCapabilities: readonly string[],
): InsightsStripModel {
    const retired = new Set<string>(retiredCapabilities);
    const kept = insightCandidates(shape).filter((candidate) => !retired.has(candidate.capability));
    const searchCards = kept.filter((candidate) => candidate.capability === "search");
    const otherCards = kept.filter((candidate) => candidate.capability !== "search");
    const room = Math.max(INSIGHTS_CARD_CAP - searchCards.length, 0);
    const shown = otherCards.slice(0, room);
    const dropped = otherCards.slice(shown.length);

    return {
        cards: [...shown, ...searchCards],
        droppedCount: dropped.length,
        droppedCards: dropped,
    };
}

/**
 * The capabilities this slice can complete end to end.
 *
 * A card promises three things AT ONCE (7.3, "Clicking a card does three things at
 * once", lines 7289 to 7297): it runs the capability with size-aware defaults, it opens
 * its home panel and highlights the control, and it writes a plain-language reading into
 * the inspector. A capability that can keep only two of the three makes a card that is
 * a lie about the third, which is what this list exists to prevent -- and why it is
 * narrower than the rule table above.
 *
 * The three centrality capabilities now keep all three. The shell runs them through
 * `analysis/nodeMetrics.ts`, the card opens Analyze, and `readings/nodeMetricReading.ts`
 * writes the reading. Community detection has kept all three since the novice path
 * shipped, and Search keeps them trivially because it runs nothing and writes no reading
 * -- it focuses the Explore query field.
 *
 * What is still excluded, one clause each: component-analysis has no run behind it;
 * data-validation has no validation pass, so there is no report to open and no issue
 * breakdown to read (see {@link validationCard}); narrow-the-view would open a filter
 * builder this shell does not draw; and temporal-navigation has no time slider to
 * toggle. Each would therefore be inert, or would claim a reading nothing can write, so
 * the CALLER filters them out. The TABLE itself stays complete, because
 * {@link insightCandidates} is spec 7.3's rule table rather than this slice's menu: a
 * capability dropped from the table would stop being offered on the day it ships, and
 * nothing would fail to say so -- the card would simply never appear again.
 *
 * One gate this widening now leans on. "Find the bridges" needs BOTH of the rule-5
 * conditions (spec line 7268: nodes > 20 AND below the large-graph threshold) and, on
 * top of them, whatever the element says about betweenness on this graph -- its
 * availability and its estimate against the 60 s ceiling, both read off
 * {@link InsightsGraphShape.metrics}. Without that listing an unmeasured betweenness card
 * below the threshold is permitted BY DESIGN, as {@link mayBeOffered} already records:
 * below the threshold a run is cheap by construction, and refusing every unmeasured
 * card there would empty the strip on the small graphs the novice path is written for.
 */
export const SLICE_AVAILABLE_CAPABILITIES: readonly InsightCapability[] = [
    "centrality-betweenness",
    "centrality-degree",
    "centrality-pagerank",
    "community-detection",
    "search",
];

/**
 * Whether a capability is one this slice can actually run.
 * @param capability - the capability to check.
 * @returns whether it is available.
 */
export function isSliceAvailable(capability: InsightCapability): boolean {
    return SLICE_AVAILABLE_CAPABILITIES.includes(capability);
}
