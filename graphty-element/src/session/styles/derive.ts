/**
 * @file What a finished run suggests be drawn from it: one derivation, for every algorithm.
 *
 * A run already declares everything a first picture needs. Its SHAPE says whether it measured
 * every element, named a subset of them, or produced a table that is read rather than painted;
 * the shape's contract says which field carries the answer and which half of the graph carries
 * the field. So the layer is DERIVED from those declarations rather than written out per
 * algorithm -- and the twenty-four hand-written `suggestedStyles` blocks the element ships today,
 * ten of which paint the whole graph from one algorithm's result, have nothing to replace them
 * with here, because there is one derivation and it has no per-algorithm branch to get wrong.
 *
 * WHAT COMES OUT, BY SHAPE:
 *
 * - A node or edge metric measured every element it looked at, so its primary field drives a
 *   colour on that half -- continuous, because the values are a measurement.
 * - A community, a layered grouping or a category table puts each element in a group, so its
 *   primary field drives a colour too -- categorical, because group 7 is not seven of anything.
 * - A route, a chosen set of nodes or a chosen set of edges names a subset rather than measuring
 *   everything, so it is a HIGHLIGHT: "these ones", not "this much".
 * - A list of scored pairs, a time series and a bare fact publish nothing per element, so they
 *   suggest nothing. A picture would have to invent the thing it painted.
 *
 * NOTHING HERE WRITES A SELECTOR, A SCALE OR A PALETTE, AND THAT IS THE POINT. A suggestion names
 * the run, the field and the channel; `planEncoding` writes the selector -- `{ match: "has" }`,
 * scoped to exactly the elements carrying that run's value -- and settles the scale and the
 * palette from the shape. A derivation that restated any of them would be a second opinion about
 * decisions that already have one place to live, and the first time the two disagreed the picture
 * would stop matching its own legend.
 *
 * THE RULE THIS EXISTS TO KEEP: a derived layer paints ONLY the elements carrying that run's
 * result. An element the algorithm measured nothing about is not the algorithm's to paint -- not
 * to a default, not to a muted grey, not to full opacity. Dimming what an algorithm did not
 * choose is a reader's decision and belongs to whoever is reading, never to the run.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Channel, FieldDescriptor } from "../../catalog/types";
import { resultShapeContract } from "../results/types";
import type { EncodingRun, EncodingSpec } from "./EncodingSpec";
import type { SelectorTarget } from "./predicate";
import type { HighlightSpec } from "./StylesApi";

// ---------------------------------------------------------------------------------------------
// What a run suggests
// ---------------------------------------------------------------------------------------------

/** Binding one of a run's measurements to a channel, which is what `styles.encode` takes. */
export interface EncodingSuggestion {
    /** Which verb applies it. */
    readonly as: "encoding";
    /** The channel it would paint, which is the one thing another layer can be checked against. */
    readonly channels: readonly Channel[];
    /** The encoding itself. */
    readonly spec: EncodingSpec;
}

/** Painting the elements a run chose, which is what `styles.highlight` takes. */
export interface HighlightSuggestion {
    /** Which verb applies it. */
    readonly as: "highlight";
    /**
     * The channels it would paint: the colour of each half the run chose.
     *
     * A route publishes its membership on nodes and on edges, so it names both. Said here rather
     * than left for the caller to work out, because whether a suggestion clashes with a layer
     * somebody wrote by hand is a question about channels and nothing else.
     */
    readonly channels: readonly Channel[];
    /** The highlight itself. */
    readonly spec: HighlightSpec;
}

/** One thing a run suggests be drawn from it. */
export type StyleSuggestion = EncodingSuggestion | HighlightSuggestion;

// ---------------------------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------------------------

/** A run whose shape has nothing per element to draw suggests nothing, and says so once. */
const NOTHING: readonly StyleSuggestion[] = Object.freeze([]);

/** The colour channel that paints one half of the graph. */
const COLOR_CHANNEL = {
    node: "node.color",
    edge: "edge.color",
} as const satisfies Record<SelectorTarget, Channel>;

/**
 * The halves of the graph a run published its primary field on.
 *
 * Read from the fields the run ACTUALLY published rather than from the shape's contract: a run
 * that stopped early, or an algorithm that fills fewer fields than it declares, publishes what it
 * publishes, and a suggestion naming a field nothing carries would be refused on application and
 * paint nothing either way.
 * @param fields - The fields the run published.
 * @param name - The field the shape declares primary.
 * @returns The halves carrying it, node before edge, empty when neither does.
 */
function halvesCarrying(fields: readonly FieldDescriptor[], name: string): readonly SelectorTarget[] {
    const halves: SelectorTarget[] = [];

    for (const half of ["node", "edge"] as const) {
        if (fields.some((field) => field.name === name && field.kind === half)) {
            halves.push(half);
        }
    }

    return halves;
}

// ---------------------------------------------------------------------------------------------
// The derivation
// ---------------------------------------------------------------------------------------------

/**
 * What one finished run suggests be drawn from it.
 *
 * Pure, and cheap: it reads what the run declares about its own result and never the values
 * behind it, so a consumer can ask before it decides whether to paint, and the auto-apply policy
 * asks the same question the same way.
 * @param run - The run, read for its shape and the fields it published.
 * @returns What to draw, empty when the run's result is read rather than painted.
 */
export function suggestStyles(run: EncodingRun): readonly StyleSuggestion[] {
    const { layer, primaryField } = resultShapeContract(run.shape);

    if (layer === "none" || primaryField === null) {
        return NOTHING;
    }

    const halves = halvesCarrying(run.fields, primaryField);

    if (halves.length === 0) {
        return NOTHING;
    }

    if (layer === "highlight") {
        // One suggestion for the whole run, not one per half: `highlight()` paints every half the
        // run chose in a single exclusive call, because a route is one thing however many kinds of
        // element it runs through.
        const suggestion: HighlightSuggestion = {
            as: "highlight",
            channels: Object.freeze(halves.map((half) => COLOR_CHANNEL[half])),
            spec: { run: run.id, field: primaryField },
        };

        return Object.freeze([suggestion]);
    }

    return Object.freeze(
        halves.map((half): EncodingSuggestion => {
            const channel = COLOR_CHANNEL[half];

            return {
                as: "encoding",
                channels: Object.freeze([channel]),
                spec: { run: run.id, field: primaryField, channel },
            };
        }),
    );
}
