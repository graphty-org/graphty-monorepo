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
 * - A run whose primary field leaves the node colour free, and which also puts nodes in named
 *   groups -- a node field of type string: the two sides of a pairing or a cut, the source and the
 *   sink of a flow -- also colours those nodes by their group, categorically. Only the nodes
 *   carrying the group are painted, and every one of them is part of the result.
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
import type { RunStyle } from "../runs/types";
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

/**
 * The node size range `style: { size: true }` uses.
 *
 * It starts at 1, the default node size, so the node the run ranks lowest looks exactly as it did
 * and the encoding only ever makes nodes bigger. It stops at 3 because at the element's default
 * layout spacing a node three times the default still leaves its neighbours and their edges in
 * view; the Combined stories' [1, 5] reads well on 20 nodes and swallows neighbours on a dense
 * graph.
 */
export const DEFAULT_SIZE_RANGE: readonly [number, number] = Object.freeze([1, 3]);

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
 *
 * `style` adds to the suggestions and never takes from them: `{ size }` appends a node size over
 * the same field for a node measurement, and everything else -- `true`, `false`, left off --
 * suggests the colour alone. Whether to paint at all is the auto-apply policy's question.
 * @param run - The run, read for its shape and the fields it published.
 * @param style - The run's style option, read only for `size`.
 * @returns What to draw, empty when the run's result is read rather than painted.
 */
export function suggestStyles(run: EncodingRun, style: RunStyle = true): readonly StyleSuggestion[] {
    const { layer, primaryField } = resultShapeContract(run.shape);

    if (layer === "none" || primaryField === null) {
        return NOTHING;
    }

    const halves = halvesCarrying(run.fields, primaryField);

    if (halves.length === 0) {
        return NOTHING;
    }

    const primary =
        layer === "highlight"
            ? [highlightOf(run, primaryField, halves)]
            : halves.map((half) => encodingOf(run, primaryField, half));
    const grouping = groupingOf(run, primaryField, primary);
    const size = sizeOf(run, primaryField, halves, style);

    return Object.freeze([...primary, ...(grouping === null ? [] : [grouping]), ...(size === null ? [] : [size])]);
}

/**
 * The node size a run started with `style: { size }` asks for.
 *
 * Only a node measurement has a size to give: a group id is not an amount, and an edge has no
 * node to size. Anything else is ignored rather than refused, the same way the colour suggestion
 * depends on the shape.
 * @param run - The run.
 * @param field - Its primary field.
 * @param halves - The halves carrying it.
 * @param style - The run's style option.
 * @returns The encoding, or null when no size was asked for or the result has none to give.
 */
function sizeOf(
    run: EncodingRun,
    field: string,
    halves: readonly SelectorTarget[],
    style: RunStyle,
): EncodingSuggestion | null {
    const size = typeof style === "object" ? style.size : undefined;

    if (size === undefined || size === false || run.shape !== "node-metric" || !halves.includes("node")) {
        return null;
    }

    const [min, max] = size === true ? DEFAULT_SIZE_RANGE : size;

    return {
        as: "encoding",
        channels: Object.freeze(["node.size"] as const),
        spec: { run: run.id, field, channel: "node.size", range: [min, max] },
    };
}

/**
 * The highlight a chosen subset suggests.
 * @param run - The run.
 * @param field - Its primary field.
 * @param halves - The halves carrying it.
 * @returns The highlight.
 */
function highlightOf(run: EncodingRun, field: string, halves: readonly SelectorTarget[]): HighlightSuggestion {
    // One suggestion for the whole run, not one per half: `highlight()` paints every half the
    // run chose in a single exclusive call, because a route is one thing however many kinds of
    // element it runs through.
    return {
        as: "highlight",
        channels: Object.freeze(halves.map((half) => COLOR_CHANNEL[half])),
        spec: { run: run.id, field },
    };
}

/**
 * The colour encoding of one field on one half.
 * @param run - The run.
 * @param field - The field.
 * @param half - The half it is published on.
 * @returns The encoding.
 */
function encodingOf(run: EncodingRun, field: string, half: SelectorTarget): EncodingSuggestion {
    const channel = COLOR_CHANNEL[half];

    return {
        as: "encoding",
        channels: Object.freeze([channel]),
        spec: { run: run.id, field, channel },
    };
}

/**
 * The categorical node colour for the group a run put its nodes in, when the node colour is free.
 * @param run - The run.
 * @param primaryField - The field its shape declares primary, which is never the group.
 * @param primary - What the primary field already suggests.
 * @returns The encoding, or null when there is no group or the node colour is already taken.
 */
function groupingOf(
    run: EncodingRun,
    primaryField: string,
    primary: readonly StyleSuggestion[],
): EncodingSuggestion | null {
    if (primary.some((suggestion) => suggestion.channels.includes(COLOR_CHANNEL.node))) {
        return null;
    }

    const group = run.fields.find(
        (field) => field.kind === "node" && field.type === "string" && field.name !== primaryField,
    );

    return group === undefined ? null : encodingOf(run, group.name, "node");
}
