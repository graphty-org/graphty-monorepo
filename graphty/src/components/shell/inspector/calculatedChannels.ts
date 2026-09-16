/**
 * Reading a style layer's CALCULATED half -- the rule an algorithm attached to it --
 * into something the style inspector can draw.
 *
 * THE DEFECT THIS MODULE EXISTS TO CLOSE. `StyleLayerPropertiesPanel` read exactly two
 * fields off a layer, `styleLayer.node?.style` and `styleLayer.edge?.style`, and
 * `grep -c calculatedStyle` over it returned zero. The data was always there --
 * `LayerItem` declares `calculatedStyle` on both halves and `layerConversion.ts` copies
 * it off the element's layer verbatim -- and the panel simply ignored a field it was
 * handed. Selecting the shell's own "Top degree labels" layer, whose ONLY job is drawing
 * labels through a calculated value, therefore showed: an empty node selector, "Label:
 * Enabled" UNCHECKED, shape Icosphere at size 1, colour #6366F1, and an edge line 8 units
 * wide in #A9A9A9. Every one of those was the ELEMENT's default drawn as though the layer
 * had chosen it, and the one thing the layer actually did was nowhere on the surface.
 *
 * WHY A CALCULATED CHANNEL CANNOT BE AN EDITABLE CONTROL, which is the decision the rest
 * of this module is built on. `DataManager.applyStylesToExistingNodes` applies the static
 * style FIRST (`updateStyle(newStyleId)`), then calls
 * `loadCalculatedValues(..., true)`, which runs every calculated value into
 * `node.styleUpdates`, and then `Node.update()` merges the two with
 * `_.defaultsDeep(plainStyleUpdates, style)` -- `styleUpdates` FIRST, and lodash's
 * `defaultsDeep` gives its first argument the win. So the rule beats the hand edit on the
 * SAME repaint, not merely on the next one. A control offered as editable there would
 * take a value, write it into the layer, and be overwritten before the frame was drawn:
 * design 6.15's "a surface that draws a value writes THROUGH the state it reads" forbids
 * offering it at all.
 *
 * WHAT IS DRAWN INSTEAD, and why it is not a read-only expression in a corner. Design
 * 6.16 check 2 requires every encoding to have a row at the surface where a reader would
 * go looking for it, and spec:3428 with spec:2487 fix the model as ONE ROW PER CHANNEL
 * whose MODE is what its field contains -- a literal means fixed, an attribute chip means
 * bound. Calculated IS the bound mode of that row. So the channel keeps its own row,
 * drawn BOUND, with the control DISABLED and carrying its reason (floor item 4 and
 * spec:6641 require the reason, appended to the control's own title after a full stop),
 * plus one explicit verb that converts the rule to a fixed value the reader can then
 * edit.
 *
 * AN UNRECOGNISED OUTPUT PATH IS REPORTED, NEVER SWALLOWED. `calculatedChannelOf`
 * returns `channel: undefined` for a path this module has no row for, and the panel still
 * draws the Computed section for it. Dropping it silently is this very defect repeating
 * itself for the next algorithm that writes `style.opacity`.
 */

/**
 * The channels of a style layer that a calculated rule is known to write.
 *
 * These five are the only output paths in use anywhere in the repository: 29 layers write
 * `style.texture.color`, 7 write `style.line.color`, 5 write `style.label.enabled`, 2
 * write `style.shape.size` and 1 writes `style.line.width`.
 * @public
 */
export type LayerChannelId = "node.color" | "node.size" | "node.label" | "edge.color" | "edge.width";

/**
 * Which inspector row owns each calculated output path.
 *
 * Keyed by the element's own dotted path into `NodeStyle` / `EdgeStyle`, which is what
 * `CalculatedStyle.output` holds (graphty-element/src/config/StyleTemplate.ts:12-16
 * constrains it to a string starting `style.`).
 */
const CHANNEL_BY_OUTPUT_PATH: Readonly<Record<string, LayerChannelId>> = {
    "style.texture.color": "node.color",
    "style.shape.size": "node.size",
    "style.label.enabled": "node.label",
    "style.line.color": "edge.color",
    "style.line.width": "edge.width",
};

/**
 * The word the inspector puts beside "Channel" for each known channel.
 *
 * Sentence case with no trailing punctuation, matching every other row name in the panel.
 */
const CHANNEL_WORDS: Readonly<Record<LayerChannelId, string>> = {
    "node.color": "Node color",
    "node.size": "Node size",
    "node.label": "Node label",
    "edge.color": "Edge color",
    "edge.width": "Edge width",
};

/**
 * The verb each channel takes in the one-sentence reading.
 *
 * Written so that `"This layer " + verb + " every node whose degree is 3 or more."` reads
 * as English for all five.
 */
const CHANNEL_VERBS: Readonly<Record<LayerChannelId, string>> = {
    "node.color": "colors",
    "node.size": "sizes",
    "node.label": "draws a label on",
    "edge.color": "colors",
    "edge.width": "sets the width of",
};

/**
 * What the reader is told when a rule names no input at all.
 *
 * A calculated style with an empty `inputs` array is legal against the element's schema,
 * and "Computed from . Convert it..." is not a sentence. This is the one place a word is
 * invented, and it is invented rather than left blank so the reason still parses as
 * English.
 */
const UNNAMED_SOURCE = "the data";

/**
 * One layer half's calculated rule, read into the shape the inspector draws.
 * @public
 */
export interface CalculatedChannel {
    /** The row that owns this rule, or undefined when the output path has no row yet. */
    readonly channel: LayerChannelId | undefined;
    /** The element-shaped output path, verbatim -- e.g. `style.label.enabled`. */
    readonly output: string;
    /** The input paths the rule reads, verbatim. */
    readonly inputs: readonly string[];
    /** The rule's JavaScript expression, verbatim. Never drawn as reader-facing prose. */
    readonly expr: string;
    /** The last segment of the first input, e.g. "degree". Reader-facing. */
    readonly sourceWord: string;
}

/**
 * The half of a style layer this module reads: only the field it cares about.
 *
 * Declared structurally rather than imported from `LayerItem` so this module stays pure
 * and testable with no React and no app types in its way.
 * @public
 */
export interface CalculatedStyleCarrier {
    /**
     * The rule the element attached to this half, if any.
     *
     * Typed `unknown` rather than a record on purpose. A layer reaches the panel from a
     * saved template, from an algorithm's suggested styles and from the app's own
     * descriptors, and those three declare the field with three different (compatible but
     * not assignable) types. Validating it here -- which this module does regardless,
     * because only some of those went through the element's Zod parser -- is strictly
     * safer than making every caller cast to satisfy a declaration.
     */
    readonly calculatedStyle?: unknown;
}

/**
 * Narrows an unknown value to a plain record.
 * @param source - the value to narrow.
 * @returns the record, or undefined when it is not one.
 */
function asRecord(source: unknown): Record<string, unknown> | undefined {
    if (source === null || typeof source !== "object" || Array.isArray(source)) {
        return undefined;
    }

    return source as Record<string, unknown>;
}

/**
 * The reader-facing word for a calculated rule's source.
 *
 * The LAST SEGMENT of the FIRST input, so the element's
 * `algorithmResults.graphty.degree.degree` reads "degree" rather than a dotted path
 * nobody typed. The raw `expr` is never used for this: it is a JavaScript string, and
 * putting `typeof arguments[0] === "number" && arguments[0] >= 3` in front of a reader
 * as an explanation is not an explanation.
 * @param inputs - the rule's input paths.
 * @returns the source word, or "the data" when the rule names no usable input.
 * @public
 */
export function calculatedSourceWord(inputs: readonly string[]): string {
    const first = inputs.find((input) => typeof input === "string" && input.trim().length > 0);

    if (first === undefined) {
        return UNNAMED_SOURCE;
    }

    const segments = first.split(".").filter((segment) => segment.length > 0);
    const last = segments[segments.length - 1];

    return last === undefined ? UNNAMED_SOURCE : last;
}

/**
 * The one sentence a disabled calculated control appends to its own title.
 *
 * Floor item 4 and spec:6641: a disabled control names the reason it is disabled, drawn
 * in its title after a full stop and joined into its accessible description. The library
 * composes the punctuation -- `disabledReason` is appended to the control's label by
 * compact-mantine -- so this sentence must NOT restate the control's name and must NOT
 * carry a trailing full stop.
 *
 * It names the fix as well as the fact, because "Computed from degree" alone leaves the
 * reader with a control they cannot use and no route forward; "Convert it to a fixed
 * value" is the verb that sits in the Computed section directly above.
 * @param source - the source word from {@link calculatedSourceWord}.
 * @returns the reason sentence, ASCII only.
 * @public
 */
export function calculatedReason(source: string): string {
    return `Computed from ${source}. Convert it to a fixed value to edit it`;
}

/**
 * The name the Computed section puts beside "Channel".
 * @param channel - the channel, or undefined for an output path with no row.
 * @param output - the raw output path, used when the channel is unknown.
 * @returns a reader-facing channel name.
 * @public
 */
export function calculatedChannelWord(channel: LayerChannelId | undefined, output: string): string {
    return channel === undefined ? output : CHANNEL_WORDS[channel];
}

/**
 * Reads a layer half's `calculatedStyle` into the shape the inspector draws.
 *
 * VALIDATES rather than casts. A layer reaches the panel from three places -- a saved
 * template, an algorithm's suggested styles, and the app itself -- and only some of those
 * went through the element's Zod parser, so a malformed rule must produce no section
 * rather than a crash inside a render. `inputs` must be an array of strings, `output` and
 * `expr` must be non-empty strings; anything else reads as "this half has no rule".
 * @param half - the layer's node or edge half, or undefined when it has none.
 * @returns the rule, or undefined when the half carries none this module can read.
 * @public
 */
export function calculatedChannelOf(half: CalculatedStyleCarrier | undefined): CalculatedChannel | undefined {
    const rule = asRecord(half?.calculatedStyle);

    if (rule === undefined) {
        return undefined;
    }

    const { output, expr, inputs } = rule;

    if (typeof output !== "string" || output.length === 0) {
        return undefined;
    }

    if (typeof expr !== "string" || expr.length === 0) {
        return undefined;
    }

    if (!Array.isArray(inputs)) {
        return undefined;
    }

    const readInputs = inputs.filter((input): input is string => typeof input === "string");

    return {
        /* undefined, NOT dropped: the section is still drawn for an output path this
           build has no row for, because a silent drop is exactly the blind spot this
           module was written to close. */
        channel: CHANNEL_BY_OUTPUT_PATH[output],
        output,
        inputs: readInputs,
        expr,
        sourceWord: calculatedSourceWord(readInputs),
    };
}

/**
 * The threshold a `>= N` rule compares against, when the rule has that shape.
 *
 * `styleDescriptors.topDegreeLabelLayer` writes
 * `typeof arguments[0] === "number" && arguments[0] >= 3`, and that shape -- a numeric
 * lower bound -- is the only one this reading claims to understand. Every other
 * expression falls back to the shapeless sentence, because guessing at an arbitrary
 * JavaScript expression and getting it wrong is worse than saying less.
 * @param expr - the rule's expression.
 * @returns the threshold, or undefined when the expression is not a numeric lower bound.
 */
function thresholdOf(expr: string): number | undefined {
    const match = /(?:^|[^<>=!])>=\s*(-?\d+(?:\.\d+)?)\s*$/.exec(expr.trim());

    if (match === null) {
        return undefined;
    }

    const parsed = Number(match[1]);

    return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * One sentence saying what the layer actually does, for the Computed section's reading.
 *
 * This is the sentence the reader gets instead of a JavaScript expression. For the
 * shell's own "Top degree labels" layer it reads "This layer draws a label on every node
 * whose degree is 3 or more." -- which is the whole of what that layer does, and which
 * was nowhere on the surface before this module existed.
 * @param calculated - the rule, from {@link calculatedChannelOf}.
 * @param side - which half of the layer the rule belongs to.
 * @returns the sentence, ASCII only, ending in a full stop.
 * @public
 */
export function calculatedSentence(calculated: CalculatedChannel, side: "node" | "edge"): string {
    const subject = side === "edge" ? "edge" : "node";
    const threshold = thresholdOf(calculated.expr);
    const scope =
        threshold === undefined
            ? `every ${subject} from its ${calculated.sourceWord}`
            : `every ${subject} whose ${calculated.sourceWord} is ${String(threshold)} or more`;

    if (calculated.channel === undefined) {
        /* The unmapped case still says something true and still names the path, so the
           next algorithm to write a new output path is visible to the reader and to
           whoever adds its row. */
        return `This layer computes ${calculated.output} for ${scope}.`;
    }

    return `This layer ${CHANNEL_VERBS[calculated.channel]} ${scope}.`;
}
