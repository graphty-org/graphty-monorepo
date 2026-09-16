/**
 * The node-metric encoding layer, the tag that retires it, and the decision to paint it.
 *
 * A NEW file beside styleDescriptors.ts rather than three more functions inside it.
 * Ruling 2 stands: styleDescriptors.ts ships only topDegreeLabelLayer and
 * communityColourLayers, because those two are what a LOAD paints, and nothing this
 * slice builds may be painted at load time.
 *
 * THE THREE RULES FROM styleDescriptors.ts's HEADER bind this file identically, because
 * the layer below reaches the same StyleManager through the same door:
 *
 * 1. `calculatedStyle` is a SIBLING of `style` and is never nested inside it.
 *    Styles.getCalculatedStylesForNode reads only the sibling, so a nested
 *    calculatedStyle is silently dropped: no error, no encoding, nothing to debug from.
 *    The canvas simply stays the colour it already was, and the only symptom is a
 *    result card claiming an encoding the user cannot see.
 * 2. A calculatedStyle's inputs must match /^data\.|algorithmResults\./ and its output
 *    must start with "style.". The layer below reads one `algorithmResults.*` path and
 *    writes `style.texture.color`, which is the pair the element's own DegreeAlgorithm
 *    suggests (DegreeAlgorithm.ts:19-24).
 * 3. A JMESPath literal needs backticks round it, the form graphty-element's own
 *    KruskalAlgorithm.ts:41 ships. This file writes no selector at all -- the layer
 *    matches every node -- so the rule binds nothing here today. It is written down so
 *    that whoever adds a selector does not have to learn it from a layer that matches
 *    nothing and reports no fault.
 *
 * NOTHING HERE IS PAINTED BY A LOAD. Spec 7.2's size-by-degree layer and its neutral
 * colour layer were REVERTED on 2026-09-13 in favour of graphty-element's own
 * hand-tuned defaults, and the standing rule since is that only an EXPLICIT run paints.
 * Every layer this module builds is therefore built inside a run's completion callback
 * and nowhere else: no load path, no dataset boundary and no restore may call
 * {@link nodeMetricColourLayer}.
 *
 * AUTO-APPLY, and why there is no switch for it. Spec 2209-2218: "On its first
 * completion a run applies the primary action of its shape as a style layer
 * automatically, and identically from every route" -- the Insights strip card, the
 * panel's Run, the palette's Enter, the console, an AI tool call -- because "one
 * capability must not produce two pictures depending on which of principle 3's routes
 * the user took". And: "there is no preference for turning it off: a switch would ship
 * two products with two pictures, and the escape already exists twice, since the
 * application is one undoable step separate from the result and the layer can be
 * deleted while the run stays."
 *
 * Spec 2219-2231 bounds it with three limits. This file implements two of them:
 *
 * - Limit 2, "not over a hand", BOTH of its clauses: suppressed when a user-authored
 *   layer already drives the channel, and suppressed for the same reason once the user
 *   has re-bound that channel by hand. That is {@link handAuthoredColourLayerName}
 *   feeding {@link autoApplyDecision}. The second clause used to be claimed here and
 *   implemented nowhere: a run's layer keeps its `algorithmSource` across an in-place
 *   hand edit -- deliberately, so the tag can still retire it -- so an edited run layer
 *   read as "a run made this" forever, the next run decided "apply", and
 *   removeLayersFromSource deleted the reader's edit without a word. The second clause
 *   now rides on {@link HAND_BOUND_METADATA_KEY}, which the shell writes with
 *   {@link markHandBound} when it commits an edit to a layer's node half; see that
 *   constant for why a flag and not a dropped tag.
 * - Limit 3, "one per batch ... six runs never paint six times": that is
 *   {@link autoApplyDecision}'s `alreadyAppliedInBatch`.
 * - Limit 1, "once, on first completion", is satisfied STRUCTURALLY rather than by any
 *   code here: the shell applies only inside the run callback, and a card re-opened,
 *   re-selected, expanded from its collapsed form or restored from a History position
 *   never re-enters that callback, so it never repaints. There is no flag to forget to
 *   clear, because there is no flag.
 *
 * THE TAG, and the real failure it prevents, in styleDescriptors.ts's own words: the
 * stack is removed by TAG, never by index, because graphty-element's own stack opens
 * with its `default` layer carrying every node's shape type (Styles.ts:54-67), and an
 * index walk took that with it -- after which the next load died in mesh building with
 * "shape with type required to create mesh" and drew nothing at all.
 * {@link NODE_METRIC_LAYER_SOURCES} is that tag for this slice, in the same
 * "<namespace>:<type>" shape COMMUNITY_LAYER_SOURCE uses, so one route retires
 * everything.
 *
 * THE RAMP IS EVALUATED INSIDE THE EXPRESSION AND THE SWATCHES ARE COMPUTED OUTSIDE IT.
 * A calculatedStyle expr runs with the element's own StyleHelpers in scope
 * -- DegreeAlgorithm.ts:23 ships exactly the call this file writes -- so the CANVAS asks
 * the element for its colour and no palette is shipped into the layer. The LEGEND,
 * however, runs in React, and graphty/src/types/graphty-element.d.ts does not re-export
 * the palettes, so a swatch cannot reach that helper at all. The swatch hexes are
 * therefore COPIED, exactly as COMMUNITY_PALETTE is copied, with the source cited:
 * graphty-element/src/config/palettes/sequential.ts VIRIDIS_COLORS, interpolated by
 * graphty-element/src/utils/styleHelpers/color/interpolation.ts interpolatePalette.
 * {@link viridisAt} is that interpolation, copied step for step, so the swatch beside
 * the legend's domain endpoints and the mesh on the canvas are the same colour.
 *
 * Pure, like every other module under defaults/ and readings/: it imports nothing from
 * graphty-element, performs no side effect, and returns descriptors the caller hands on.
 *
 * App shell progressive disclosure design, sections 2209-2231 (auto-apply and its three
 * limits) and 2307 (the Node metric shape).
 */

import { NODE_METRIC_DEFINITIONS, type NodeMetricId } from "../analysis/nodeMetrics";
import { UNENCODED_NODE_COLOR } from "./loadDefaults";
import type { StyleLayerDescriptor } from "./styleDescriptors";

/**
 * The algorithmSource tag each metric's encoding layer carries.
 *
 * "<namespace>:<type>" is the SAME shape graphty-element's own applySuggestedStyles
 * writes into `metadata.algorithmSource` (Graph.ts:1305-1313), and the same shape
 * COMMUNITY_LAYER_SOURCE already uses, so `removeLayersFromSource` -- which matches on
 * exactly that field and nothing else -- takes a shell-built layer off by the same route
 * it takes an element-suggested one off. One retirement route for both kinds is the
 * whole point: an index walk over the stack would take the element's `default` layer
 * with it and kill the next load in mesh building.
 *
 * The three strings are written out rather than derived from NODE_METRIC_DEFINITIONS.
 * A derivation could never disagree with the definitions, which sounds like a virtue and
 * is not: the tag is a value written into a layer that OUTLIVES the run, so a silent
 * rename of a definition's `type` would silently orphan every layer already tagged with
 * the old string. Written out, the rename is a failing board in this file's tests
 * instead (they assert each tag against NODE_METRIC_DEFINITIONS), which is where a
 * person can see it.
 * @public
 */
export const NODE_METRIC_LAYER_SOURCES: Readonly<Record<NodeMetricId, string>> = {
    degree: "graphty:degree",
    pagerank: "graphty:pagerank",
    betweenness: "graphty:betweenness",
};

/**
 * Every tag {@link NODE_METRIC_LAYER_SOURCES} holds, frozen.
 *
 * A caller clearing the colour channel -- a dataset boundary, a "Remove result", a rerun
 * that replaces -- walks these without knowing which metric produced which layer, so the
 * clearing code never has to grow a branch per metric.
 * @public
 */
export const NODE_METRIC_LAYER_SOURCE_TAGS: readonly string[] = Object.freeze([
    NODE_METRIC_LAYER_SOURCES.degree,
    NODE_METRIC_LAYER_SOURCES.pagerank,
    NODE_METRIC_LAYER_SOURCES.betweenness,
]);

/**
 * The algorithmSource tag one metric's encoding layer carries.
 * @param metric - which metric the layer encodes.
 * @returns the "<namespace>:<type>" tag, e.g. "graphty:betweenness".
 * @public
 */
export function nodeMetricLayerSource(metric: NodeMetricId): string {
    return NODE_METRIC_LAYER_SOURCES[metric];
}

/**
 * The name one metric's encoding layer carries in the layer list.
 *
 * The 6.3 pair on one line -- plain name first, technical name in parentheses -- which
 * is the shape COMMUNITY_LAYER_NAME already takes ("Groups (Communities, Louvain)").
 * The layer list has one line per layer and no room for the dimmed second line the
 * Analyze panel's rows draw, so the pair collapses into the one string rather than
 * losing the technical half: a reader who opens Style days later must still be able to
 * tell which measure painted the graph.
 * @param metric - which metric the layer encodes.
 * @returns the layer name, e.g. "Bridges (Betweenness centrality)".
 * @public
 */
export function nodeMetricLayerName(metric: NodeMetricId): string {
    const definition = NODE_METRIC_DEFINITIONS[metric];

    return `${definition.plainName} (${definition.technicalName})`;
}

/**
 * The ten viridis anchors, copied verbatim from graphty-element's own VIRIDIS_COLORS
 * (graphty-element/src/config/palettes/sequential.ts).
 *
 * Copied, not imported, for the reason COMMUNITY_PALETTE records: the app cannot reach
 * the element's palettes, because graphty/src/types/graphty-element.d.ts does not
 * re-export them. The citation is the only guard there is, so it is stated twice -- here
 * and in the module header -- and {@link viridisAt}'s tests pin every anchor.
 * @public
 */
export const VIRIDIS_RAMP: readonly string[] = Object.freeze([
    "#440154",
    "#482878",
    "#3e4989",
    "#31688e",
    "#26828e",
    "#1f9e89",
    "#35b779",
    "#6ece58",
    "#b5de2b",
    "#fde724",
]);

/**
 * The three channels of a six-digit hex, as numbers.
 *
 * The element's own hexToRgb runs a regex and throws on a miss. This one slices, because
 * every string it is ever handed is an entry of {@link VIRIDIS_RAMP} -- a frozen array of
 * ten literals in this file -- so a malformed input is not a runtime possibility but an
 * edit to the array three lines above.
 * @param hex - a "#rrggbb" string.
 * @returns its red, green and blue channels, each 0..255.
 */
function channelsOf(hex: string): readonly [number, number, number] {
    return [
        Number.parseInt(hex.slice(1, 3), 16),
        Number.parseInt(hex.slice(3, 5), 16),
        Number.parseInt(hex.slice(5, 7), 16),
    ];
}

/**
 * One channel as two lowercase hex digits, rounded and clamped exactly as the element's
 * rgbToHex rounds and clamps.
 * @param value - the channel, which may be fractional and may sit outside 0..255.
 * @returns two lowercase hex digits.
 */
function hexChannel(value: number): string {
    return Math.round(Math.max(0, Math.min(255, value)))
        .toString(16)
        .padStart(2, "0");
}

/**
 * The colour at `fraction` along the viridis ramp, by the element's own rule.
 *
 * A faithful copy of interpolatePalette
 * (graphty-element/src/utils/styleHelpers/color/interpolation.ts): clamp to [0,1],
 * return the first anchor at exactly 0 and the last at exactly 1, otherwise scale by
 * (length - 1), take the floor and the next index, and interpolate each RGB channel
 * linearly, rounding and clamping to 0..255. The behaviour has to match the element's
 * rather than merely look like it, because the legend's swatch and the canvas's mesh are
 * two drawings of the same number: a swatch computed by a colour library with its own
 * interpolation space would sit next to a mesh of a visibly different colour and the
 * legend would stop being a key. No colour library is reached for; the arithmetic is
 * nine lines and the element's nine lines are the specification.
 *
 * ONE DEPARTURE, deliberate. The element's version throws on a non-finite input: NaN
 * survives its clamp, indexes the palette as `colors[NaN]`, and its hexToRgb then throws
 * "Invalid hex color: undefined". A legend swatch is drawn during render, so a throw
 * there takes the panel down over a number that is merely missing. This returns the
 * ramp's first anchor instead -- the same thing the element returns for 0, and the value
 * a caller with no measurement should never be asking for in the first place, since an
 * unmeasured node keeps the neutral colour rather than a ramp colour (see
 * {@link nodeMetricColourLayer}).
 *
 * The anchors sit at ninths, not tenths, so the teal #1f9e89 that the element's own doc
 * block labels "viridis(0.5)" is in fact the value at 5/9; 0.5 itself lands between two
 * anchors. The doc block is loose, the arithmetic is not, and the tests pin both.
 * @param fraction - where on the ramp to sample, 0..1. Outside that range it clamps, and
 * a non-finite value returns the ramp's first anchor.
 * @returns a lowercase "#rrggbb" string.
 * @public
 */
export function viridisAt(fraction: number): string {
    const lastIndex = VIRIDIS_RAMP.length - 1;

    if (!Number.isFinite(fraction)) {
        return VIRIDIS_RAMP[0];
    }

    const clamped = Math.max(0, Math.min(1, fraction));

    if (clamped === 0) {
        return VIRIDIS_RAMP[0];
    }

    if (clamped === 1) {
        return VIRIDIS_RAMP[lastIndex];
    }

    const scaled = clamped * lastIndex;
    const lower = Math.floor(scaled);
    const upper = Math.min(lower + 1, lastIndex);
    const mix = scaled - lower;
    const [lowRed, lowGreen, lowBlue] = channelsOf(VIRIDIS_RAMP[lower]);
    const [highRed, highGreen, highBlue] = channelsOf(VIRIDIS_RAMP[upper]);

    return `#${hexChannel(lowRed + (highRed - lowRed) * mix)}${hexChannel(
        lowGreen + (highGreen - lowGreen) * mix,
    )}${hexChannel(lowBlue + (highBlue - lowBlue) * mix)}`;
}

/**
 * Where a node-colour encoding writes, and the prefix a hand-authored one is recognised
 * by. Declared once because {@link nodeMetricColourLayer} writes it and
 * {@link handAuthoredColourLayerName} reads it, and two spellings would let a layer this
 * file wrote fail to be recognised as one that drives colour.
 */
const NODE_COLOUR_OUTPUT_PATH = "style.texture.color";

/**
 * The encoding layer one metric's run applies: a viridis ramp over the metric's own
 * normalised field (spec 2307, "Node metric ... Encode as style ... a value per node ...
 * encoding layer").
 *
 * COLOUR, not size. PageRank's own suggested layer writes `style.shape.size`
 * (PageRankAlgorithm.ts:170-173), which is the channel graphty-element's hand-tuned
 * defaults own and which Ruling 2 keeps the shell's hands off. Colour is also the
 * channel the community slice already proved through this exact code path, so the leaf
 * is known to validate and the repaint is known to work.
 *
 * THE typeof GUARD is the same guard topDegreeLabelLayer needs, for a sharper reason
 * here. A node the run never reached carries no result at all, so `arguments[0]` arrives
 * as `undefined`; handed to the ramp it would be clamped to viridis(0), and viridis(0) is
 * the ramp's MINIMUM -- deep purple, the colour of a node measured at the very bottom.
 * An unmeasured node would then be painted as though it had been measured and found
 * least important, which is the fabricated-zero failure runs.ts:118-120 already refuses
 * for the ranking. Keeping {@link UNENCODED_NODE_COLOR} instead is the only honest
 * fallback, and the legend carries a "Not measured (N nodes)" departure line beside the
 * channel so the neutral colour is stated rather than merely left there.
 *
 * The layer names NO label colour, for the reason styleDescriptors.ts records: the canvas
 * ground is the element's clear colour #F5F5F5, so the element's #000000 label default
 * reads 19.26:1 against it, while the dark-panel ink that was once set here read about
 * 1.1:1 and the glyph fill vanished. This layer writes one output, `style.texture.color`,
 * and says nothing whatever about text.
 * @param metric - which metric to encode.
 * @returns the layer, shaped exactly as graphty-element's StyleManager takes it.
 * @public
 */
export function nodeMetricColourLayer(metric: NodeMetricId): StyleLayerDescriptor {
    const definition = NODE_METRIC_DEFINITIONS[metric];
    const input = `algorithmResults.${definition.namespace}.${definition.type}.${definition.fractionField}`;

    return {
        metadata: {
            name: nodeMetricLayerName(metric),
            description: `Colors nodes by ${definition.technicalName} (spec 2307).`,
            algorithmSource: nodeMetricLayerSource(metric),
        },
        node: {
            selector: "",
            style: {},
            calculatedStyle: {
                inputs: [input],
                output: NODE_COLOUR_OUTPUT_PATH,
                expr: `{ return typeof arguments[0] === "number" ? StyleHelpers.color.sequential.viridis(arguments[0]) : "${UNENCODED_NODE_COLOR}" }`,
            },
        },
    };
}

/**
 * The name graphty-element gives its own base layer.
 *
 * Styles.ts:54-67 unshifts a layer whose metadata is exactly `{ name: "default" }`,
 * carrying `NodeStyle.parse(defaultNodeStyle)` -- which sets `texture.color` to #6366F1
 * (config/NodeStyle.ts:84-92) -- and no algorithmSource at all.
 * @public
 */
export const ELEMENT_DEFAULT_LAYER_NAME = "default";

/**
 * The name graphty-element gives its own selection layer.
 *
 * SelectionManager.ts:21-34 adds a layer whose metadata is exactly `{ name: "selection" }`
 * and whose node half sets `texture.color` to #FFD700 behind the selector
 * `algorithmResults.graphty.selected == \`true\``, with no algorithmSource. It is on every
 * graph, exactly as the base layer is.
 * @public
 */
export const ELEMENT_SELECTION_LAYER_NAME = "selection";

/**
 * Every layer name graphty-element owns, which a hand-authored check must skip.
 *
 * Both of these write node colour, neither carries an algorithmSource, and both stand on
 * EVERY graph, so either one alone is enough to suppress auto-apply forever. The
 * selection layer was the one that actually did it: the base layer is documented and was
 * excluded from the first pass, and the selection layer -- added by a different manager,
 * under a different file -- was not, so no metric ever painted on a real graph while the
 * unit test, which seeded only a bare `{ name: "selection" }`, went on passing.
 * @public
 */
export const ELEMENT_OWN_LAYER_NAMES: readonly string[] = Object.freeze([
    ELEMENT_DEFAULT_LAYER_NAME,
    ELEMENT_SELECTION_LAYER_NAME,
]);

/**
 * The metadata key that records a hand on a layer a RUN created.
 *
 * Limit 2 has two clauses (spec 2222-2226): auto-apply is suppressed when a
 * user-authored layer already drives the channel, "and suppressed for the same reason
 * once the user has re-bound that channel by hand". The first clause is the ABSENCE of a
 * string `metadata.algorithmSource`. The second one cannot be, because a run's layer
 * edited in place KEEPS that tag: AppShell's in-place edit branch spreads `metadata`
 * deliberately so a layer a run created stays retirable by
 * {@link NODE_METRIC_LAYER_SOURCE_TAGS}, which is what DECISIONS-1.7:1829 means by "the
 * typed name once renamed". So there was nothing anywhere recording that a person had
 * touched a run's layer, and the second clause had no implementation at all while this
 * module's header claimed {@link handAuthoredColourLayerName} was it.
 *
 * THE DEFECT THAT WAS: run "Most connected"; take the card's own "Change encoding" into
 * Style, which spec 2238 builds for exactly this; edit that layer; run "Influence". The
 * edited layer still carried `algorithmSource: "graphty:degree"`, so
 * {@link handAuthoredColourLayerName} skipped it, {@link autoApplyDecision} answered
 * "apply", and the run's removeLayersFromSource deleted the reader's own edit with no
 * warning and no undo of its own. Every hand edit to a run layer was a dead end.
 *
 * A FLAG, NOT A DROPPED TAG. Un-tagging the layer would mark the hand just as well and
 * would break the one route that retires it: "Delete layer" on the result card removes
 * BY TAG, a dataset boundary clears by tag, and a rerun that replaces removes by tag, so
 * an untagged layer is an orphan nothing can take off -- the same failure
 * {@link NODE_METRIC_LAYER_SOURCES}'s own comment refuses for a renamed definition, and
 * one index walk away from the "shape with type required to create mesh" death the tag
 * exists to prevent. The flag is additive, so both facts stay true at once: a run made
 * this layer, AND a person has since taken it over.
 *
 * It survives a template round-trip, which is wanted: graphty-element's
 * StyleLayerMetadata schema is `.loose()` (StyleTemplate.ts:35-39), so a saved and
 * reloaded stack still remembers whose hand holds the channel.
 * @public
 */
export const HAND_BOUND_METADATA_KEY = "handBound";

/**
 * The layer metadata a hand edit leaves behind: everything that was there, plus the hand.
 *
 * The shell calls this when it COMMITS an edit to a layer's node half -- the in-place
 * branch of handLayersChange, where `nodeEdited` is true -- and nowhere else. Not on a
 * rename, because renaming a layer re-binds no channel; not on an edge edit, because the
 * channel limit 2 guards here is node colour. Metadata is spread rather than rebuilt so
 * `name`, `description` and `algorithmSource` all survive: the tag must survive, or the
 * layer becomes unretirable (see {@link HAND_BOUND_METADATA_KEY}).
 *
 * Pure, and returns a NEW object: the caller hands the result to
 * `manager.updateLayerByIndex`, and mutating the live layer's metadata in place would
 * change the object React is still holding in `layers` without any state change to
 * notice it by.
 * @param metadata - the layer's metadata before the edit, or undefined when it had none.
 * @returns a new metadata object carrying {@link HAND_BOUND_METADATA_KEY} set to true.
 * @public
 */
export function markHandBound(metadata: Readonly<Record<string, unknown>> | undefined): Record<string, unknown> {
    return { ...metadata, [HAND_BOUND_METADATA_KEY]: true };
}

/**
 * Whether a person has taken a layer over by hand.
 *
 * Strictly `=== true`, not truthiness: metadata is a loose bag that survives template
 * save and reload, so a stray `"false"` from a hand-written template must not be read as
 * a hand -- a wrong true here suppresses auto-apply forever and no metric ever paints.
 * @param metadata - the layer's metadata.
 * @returns true when {@link markHandBound} has written the flag.
 */
function isHandBound(metadata: Readonly<Record<string, unknown>> | undefined): boolean {
    return metadata?.[HAND_BOUND_METADATA_KEY] === true;
}

/**
 * What {@link handAuthoredColourLayerName} calls a colour layer that has no readable
 * name. It still holds the channel, so it must still suppress; the suppressed card then
 * says a true thing rather than naming nothing.
 */
const UNNAMED_LAYER_NAME = "an unnamed layer";

/**
 * The reason {@link autoApplyDecision} gives when the batch, not a hand, holds the
 * channel (spec 2231, "Six runs never paint six times").
 */
const BATCH_HELD_BY = "an earlier run in this batch";

/**
 * A style layer as the shell's own layer list holds it, narrowed to the parts that
 * answer "does this drive node colour, and did a person write it?".
 *
 * Structurally a `LayerItem` (components/layout/LeftSidebar.tsx) and therefore also an
 * IndexedLayerItem, so the shell hands its live layer list straight in without a mapping
 * step. Everything else a LayerItem carries -- its id, its index, its edge half -- is
 * irrelevant to the question and is left out, so this function cannot come to depend on
 * it.
 * @public
 */
export interface ColourLayerLike {
    /** The layer's own name, as the layer list shows it. */
    readonly name?: string;
    /**
     * The element's metadata, which carries `algorithmSource` when a run produced it and
     * {@link HAND_BOUND_METADATA_KEY} once a person has edited that layer's node half.
     */
    readonly metadata?: Readonly<Record<string, unknown>>;
    /** The element layer itself. */
    readonly styleLayer: {
        /** The node half. A layer with no node half drives no node colour. */
        readonly node?: {
            /** The static NodeStyle fragment. */
            readonly style?: Readonly<Record<string, unknown>>;
            /** The calculated half, a SIBLING of `style`. */
            readonly calculatedStyle?: Readonly<Record<string, unknown>>;
        };
    };
}

/**
 * Whether a static node style reaches `texture.color`.
 * @param style - the node half's static style fragment.
 * @returns true when it sets a node colour.
 */
function styleSetsNodeColour(style: Readonly<Record<string, unknown>> | undefined): boolean {
    if (style === undefined) {
        return false;
    }

    const { texture } = style;

    if (typeof texture !== "object" || texture === null || !("color" in texture)) {
        return false;
    }

    return texture.color !== undefined;
}

/**
 * Whether a calculated node style writes into `style.texture.color`.
 *
 * `startsWith` rather than equality, because a calculated value may legitimately address
 * a deeper path under the colour (a gradient stop, say) and a layer that writes one is
 * still holding the channel.
 * @param calculated - the node half's calculatedStyle.
 * @returns true when it drives node colour.
 */
function calculatedStyleSetsNodeColour(calculated: Readonly<Record<string, unknown>> | undefined): boolean {
    if (calculated === undefined) {
        return false;
    }

    const { output } = calculated;

    return typeof output === "string" && output.startsWith(NODE_COLOUR_OUTPUT_PATH);
}

/**
 * A layer's name as a reader would say it, preferring the name the layer list shows over
 * the element metadata's copy of it. A layer renamed in the list must be named by that
 * new name in the suppressed card, or the card sends the reader looking for a layer that
 * is not there.
 * @param layer - the layer.
 * @returns its readable name, or undefined when it has none.
 */
function readableName(layer: ColourLayerLike): string | undefined {
    if (typeof layer.name === "string" && layer.name !== "") {
        return layer.name;
    }

    const fromMetadata = layer.metadata?.name;

    if (typeof fromMetadata === "string" && fromMetadata !== "") {
        return fromMetadata;
    }

    return undefined;
}

/**
 * The name of the first hand-authored layer that drives node colour, if any.
 *
 * "Drives node colour" is either half of the node style: a static `texture.color`, or a
 * calculatedStyle whose `output` starts `style.texture.color`. "Hand-authored" is TWO
 * things, because spec 2222-2226 names two: a layer the user made from scratch, which is
 * the absence of a string `metadata.algorithmSource` -- a run's layer always carries one,
 * whether the shell tagged it ({@link NODE_METRIC_LAYER_SOURCES}, COMMUNITY_LAYER_SOURCE)
 * or the element did (Graph.ts:1305-1313), so what is left is what a person made -- AND a
 * layer a run made that the user has since re-bound by hand, which is
 * {@link HAND_BOUND_METADATA_KEY} standing on it.
 *
 * THE TAG ALONE USED TO DECIDE IT, and that made the second clause unimplementable: an
 * in-place hand edit deliberately preserves `algorithmSource`, so an edited run layer was
 * skipped here exactly like a pristine one and the next run's removeLayersFromSource
 * deleted the reader's edit. The flag is the difference, and only the flag: a PRISTINE
 * run layer must still be skipped, or the second metric a user runs never paints, because
 * the first one's layer would hold the channel forever.
 *
 * THE ELEMENT-OWNED EXCLUSIONS ARE LOAD-BEARING. graphty-element puts TWO colour-writing
 * layers into every stack and gives neither an algorithmSource: the base layer named
 * "default", carrying a full `NodeStyle.parse(defaultNodeStyle)` (Styles.ts:54-67), and
 * the selection layer named "selection", carrying the gold highlight
 * (SelectionManager.ts:21-34). Without BOTH exclusions the naive reading of "no
 * algorithmSource means a person wrote it" finds one of them on EVERY graph, and
 * auto-apply is suppressed forever: no metric ever paints, on any file, and the card
 * draws its un-applied form for a hand that does not exist. That is not hypothetical --
 * the selection layer did exactly this on the first integration, while the unit board,
 * which seeded a bare `{ name: "selection" }` with no style at all, went on passing.
 * Suppressing correctly is what this function is for; suppressing always is the failure
 * it exists to avoid.
 *
 * The exclusion is by name, which means a person who renames their own layer to
 * "default" loses the suppression on it. That is the cheaper mistake: the layer list is
 * ordered above the element's base layer anyway, the user can delete the metric layer in
 * one click, and the alternative -- identifying the base layer by the shape of its style
 * -- would match any hand-authored layer that happened to set the same defaults.
 *
 * FIRST, not last: the answer is a name for a sentence ("the channel is held by ..."), and
 * the first one found is the one a reader scanning the list from the top will recognise.
 * A found-but-unnamed layer still suppresses and comes back as
 * "an unnamed layer" -- returning undefined for it would silently let a hand be painted
 * over, which is the one thing limit 2 forbids.
 * @param layers - the current layer list, in list order.
 * @returns the holding layer's readable name, or undefined when no hand holds the channel.
 * @public
 */
export function handAuthoredColourLayerName(layers: readonly ColourLayerLike[]): string | undefined {
    for (const layer of layers) {
        const name = readableName(layer);

        if (name !== undefined && ELEMENT_OWN_LAYER_NAMES.includes(name)) {
            continue;
        }

        const source = layer.metadata?.algorithmSource;

        if (typeof source === "string" && !isHandBound(layer.metadata)) {
            continue;
        }

        const { node } = layer.styleLayer;

        if (styleSetsNodeColour(node?.style) || calculatedStyleSetsNodeColour(node?.calculatedStyle)) {
            return name ?? UNNAMED_LAYER_NAME;
        }
    }

    return undefined;
}

/**
 * Whether a completed run paints, and when it does not, what is holding the channel.
 * @public
 */
export type AutoApplyDecision = { readonly kind: "apply" } | { readonly kind: "suppressed"; readonly heldBy: string };

/**
 * The auto-apply decision for one completed run (spec 2219-2231).
 *
 * THE HAND IS CHECKED FIRST, because a hand always outranks a batch. Both can be true at
 * once -- a batch's second run over a graph whose colour a person has already re-bound --
 * and the reason the card must give is the user's own layer, not a sibling run they may
 * never have thought of as a batch. The suppressed card names the holder either way, so
 * naming the wrong one is a visible wrong answer rather than an internal detail.
 *
 * `alreadyAppliedInBatch` exists NOW, before any batch surface ships, precisely so that
 * the batch work -- Run all (N), a group's Run all node rankings, a sweep, Replay all --
 * sets a flag rather than re-deriving limit 3 at a second call site. A rule stated twice
 * is a rule that will disagree with itself; DEFER 57 requires this one to survive the
 * arrival of Run all (N) intact, and a parameter on a tested pure function is the form
 * that does.
 *
 * Limit 1 is not here and is not an omission: "once, on first completion" holds because
 * the shell calls this from inside the run's completion callback and nowhere else, so a
 * card re-opened, re-selected, expanded or restored from History never reaches it.
 * @param input - the layer list and whether this run's batch has already painted.
 * @param input.layers - the current layer list, in list order.
 * @param input.alreadyAppliedInBatch - whether an earlier run of the same batch already applied.
 * @returns apply, or suppressed with the name of whatever holds the channel.
 * @public
 */
export function autoApplyDecision(input: {
    /** The current layer list, in list order. */
    readonly layers: readonly ColourLayerLike[];
    /** Whether an earlier run in the same batch has already applied its encoding. */
    readonly alreadyAppliedInBatch: boolean;
}): AutoApplyDecision {
    const heldByHand = handAuthoredColourLayerName(input.layers);

    if (heldByHand !== undefined) {
        return { kind: "suppressed", heldBy: heldByHand };
    }

    if (input.alreadyAppliedInBatch) {
        return { kind: "suppressed", heldBy: BATCH_HELD_BY };
    }

    return { kind: "apply" };
}
