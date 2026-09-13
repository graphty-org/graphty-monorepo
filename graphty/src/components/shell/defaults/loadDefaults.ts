/**
 * What a load decides for itself, from the loaded graph's size alone.
 *
 * Spec 7.2 "Defaults on load" (design/ui/app-shell-progressive-disclosure-design.md
 * lines 5666-5692) names one set of defaults below the large-graph threshold and a
 * different set above it. Both sets branch on the same threshold, and spec 7.3's rule
 * table branches on it too, so the number is declared here once and read from here by
 * everything that branches on it -- a second declaration would drift.
 *
 * This module is PURE: it decides and returns descriptors, and performs no side
 * effects. The caller sets the layout, adds the layers and runs the degree pass. That
 * split is what lets the decisions be tested as arithmetic rather than through a
 * mounted canvas.
 *
 * The colours here are the two the canvas itself paints (a Babylon node mesh and its
 * label), not controls, so they are artboard hexes rather than compact-mantine tokens:
 * CONTRAST-DIVERGENCE.md's precedence clause gives compact-mantine the colour of a
 * shipped CONTROL, and ColorStyle runs its string through colorjs.io, which rejects a
 * CSS variable or a light-dark() pair.
 */

/**
 * The large-graph threshold every 7.2 and 7.3 branch reads. Declared once here
 * because two sections branch on it and a second declaration would drift. Settings >
 * Performance cannot expose it yet (SettingsOverlay ships only appearance, shortcuts
 * and ai), so it is a code constant and nothing pretends otherwise.
 */
export const LARGE_GRAPH_NODE_THRESHOLD = 100000;

/** Spec 7.2: labels on clamp(round(sqrt(n)), 5, 50) nodes. */
export const LABEL_COUNT_MIN = 5;

/** Spec 7.2: the below-threshold ceiling. */
export const LABEL_COUNT_MAX = 50;

/** Spec 7.2: "at most 20 labels" in Performance mode. */
export const PERFORMANCE_LABEL_COUNT = 20;

/** The one neutral node colour the canvas paints (Main.dc.html:644). */
export const UNENCODED_NODE_COLOR = "#6366F1";

/** Label ink on the canvas ground; RichTextStyle would otherwise default to #000000. */
export const LABEL_TEXT_COLOR = "#d5d7da";

/**
 * Whether a node count is above the threshold.
 * @param nodeCount - nodes loaded.
 * @returns true when the Performance branch of 7.2 applies.
 */
export function isAboveLargeGraphThreshold(nodeCount: number): boolean {
    return nodeCount > LARGE_GRAPH_NODE_THRESHOLD;
}

/**
 * clamp(round(sqrt(n)), 5, 50) below the threshold; PERFORMANCE_LABEL_COUNT above it.
 * @param nodeCount - nodes loaded.
 * @returns how many nodes get labels.
 */
export function labelCountFor(nodeCount: number): number {
    if (isAboveLargeGraphThreshold(nodeCount)) {
        return PERFORMANCE_LABEL_COUNT;
    }

    const scaled = Math.round(Math.sqrt(Math.max(0, nodeCount)));

    return Math.min(LABEL_COUNT_MAX, Math.max(LABEL_COUNT_MIN, scaled));
}

/**
 * The degree at which the label selector cuts, from degrees sorted descending.
 * Undefined when there is nothing to label.
 *
 * The cut is a degree, not a rank, because the selector it feeds is a JMESPath
 * comparison and no algorithm publishes a 1-based ordinal. Ties at the cut are
 * therefore KEPT: when several nodes share the cut degree, more than `labelCount`
 * nodes are labelled. That is the honest reading of "top N by degree" for a selector,
 * and it is stable -- no node is arbitrarily dropped for sharing a degree with a node
 * that was kept.
 * @param degreesDescending - every degree in the graph, highest first.
 * @param labelCount - how many nodes the label budget covers.
 * @returns the degree at or above which a node is labelled, or undefined when there is
 * nothing to label.
 */
export function labelDegreeThreshold(degreesDescending: readonly number[], labelCount: number): number | undefined {
    if (degreesDescending.length === 0 || labelCount <= 0) {
        return undefined;
    }

    return degreesDescending[Math.min(labelCount, degreesDescending.length) - 1];
}

/** A layout choice, ready for `graph.setLayout`. @public */
export interface LayoutDescriptor {
    /** A registered LayoutEngine id, e.g. "ngraph". */
    readonly type: string;
    /** Its options, e.g. {seed: 1}. */
    readonly config: Readonly<Record<string, unknown>>;
}

/** What 7.2 decides on load. Descriptors only: this module performs no side effects. @public */
export interface LoadDefaults {
    /** Whether the Performance branch was taken. */
    readonly aboveThreshold: boolean;
    /** The layout to set. */
    readonly layout: LayoutDescriptor;
    /** How many nodes get labels. */
    readonly labelCount: number;
}

/**
 * What a load should apply, from the loaded graph's size alone.
 *
 * Below the threshold: ngraph, size by degree, labels on clamp(round(sqrt(n)), 5, 50)
 * nodes, one neutral colour.
 *
 * Above the threshold: Fixed when the file carried a position for every node,
 * otherwise Random with a fixed seed. Spec 7.2's FIRST choice above the threshold is
 * Quick grid, and it is unavailable: the registered LayoutEngine ids are d3, ngraph,
 * forceatlas2, spring, kamada-kawai, arf, circular, spiral, shell, random, planar,
 * spectral, bfs, bipartite, multipartite and fixed, so `graph.setLayout("grid")` would
 * fail. Random with a fixed seed is the spec's own named fallback for exactly this
 * case ("with the Random layout with a fixed seed as the fallback"), so the
 * substitution is the spec's, not an invention. Size stays uniform and the label
 * budget drops to 20, both as 7.2 requires.
 * @param input - the loaded graph's size, and whether it carried complete positions.
 * @param input.nodeCount - nodes loaded.
 * @param input.hasPositionsForEveryNode - whether the file carried a position for every node.
 * @returns the descriptors the caller applies.
 */
export function loadDefaults(input: {
    /** Nodes loaded. */
    readonly nodeCount: number;
    /** Whether the file carried a position for EVERY node. */
    readonly hasPositionsForEveryNode?: boolean;
}): LoadDefaults {
    const aboveThreshold = isAboveLargeGraphThreshold(input.nodeCount);

    if (!aboveThreshold) {
        return {
            aboveThreshold: false,
            layout: { type: "ngraph", config: {} },
            labelCount: labelCountFor(input.nodeCount),
        };
    }

    return {
        aboveThreshold: true,
        layout:
            input.hasPositionsForEveryNode === true
                ? { type: "fixed", config: {} }
                : { type: "random", config: { seed: 1 } },
        labelCount: PERFORMANCE_LABEL_COUNT,
    };
}
