/**
 * What a finished run PAINTED, read back off the element rather than decided here.
 *
 * WHAT THIS REPLACES. `defaults/nodeMetricStyle.ts` was 608 lines and four separate pieces of
 * machinery, and the element now owns every one of them:
 *
 * - it built the viridis colour ramp a metric run painted, as a layer with an empty selector
 *   and a JavaScript expression in a `calculatedStyle`. A run now derives its own encoding
 *   from its result shape, scoped to the elements it measured;
 * - it decided whether that ramp was allowed to paint, by scanning the layer list for one that
 *   already drove node colour. That is the auto-apply policy's second rule, applied identically
 *   whichever door the run came in by;
 * - it wrote a `handBound` flag into a metadata bag so a later run would not paint over a
 *   reader's own edit, because a run-made layer and a hand-made one were otherwise
 *   indistinguishable. A layer now carries its {@link Layer.source};
 * - it identified graphty-element's OWN layers BY NAME, from a list of two strings, and its own
 *   comment admitted that a reader who called their layer "default" lost the suppression. An
 *   element-owned layer is now `source.by === "element"` and `locked`.
 *
 * WHAT IS LEFT is the one question the shell still has to answer for the reader: the run has
 * finished, so what is on the canvas -- this run's encoding, or somebody's own colour that the
 * element declined to paint over? The element answers it; this file asks.
 */

import type { GraphSession, Layer, LegendBlock, RunId } from "@graphty/graphty-element/session";

/** The channel a node metric and a community run both compete for. */
const NODE_COLOUR_CHANNEL = "node.color";

/** What a layer with no name of its own is called when the shell has to name it in a sentence. */
const UNNAMED_LAYER_NAME = "an unnamed layer";

/**
 * The legend block one run painted on one channel, or undefined when it painted none.
 *
 * The legend is derived from the prepared bindings the repaint painted from, so a block for
 * this run is proof that the encoding reached the canvas -- not a second model of it that can
 * drift. It is also where every fact the result card prints comes from: the field's plain and
 * technical names, the scale in words, the swatches and their colours.
 * @param session - the element's session.
 * @param runId - the run that has just finished.
 * @returns the block, or undefined when nothing this run produced is painting that channel.
 * @public
 */
export function runColourBlock(session: GraphSession, runId: RunId): LegendBlock | undefined {
    return session.styles.legend().find((block) => block.runId === runId && block.channel === NODE_COLOUR_CHANNEL);
}

/**
 * The name of the layer holding node colour against a run, or undefined when none does.
 *
 * Asked only when {@link runColourBlock} found nothing, which is the element telling the shell
 * that the suggestion was dropped rather than painted over a decision somebody made. Spec
 * 2222-2226 asks the suppressed result card to name that layer, so the shell has to be able to
 * say which one it was.
 *
 * A layer the ELEMENT owns is never the answer: it is the floor every picture is painted on
 * top of, it suppresses nothing, and naming it would tell a reader their own encoding lost to
 * something they cannot see or change.
 * @param layers - the stack, as `styles.list()` answers it.
 * @returns the layer's name, or undefined when nothing of the reader's drives node colour.
 * @public
 */
export function colourHeldBy(layers: readonly Layer[]): string | undefined {
    for (let at = layers.length - 1; at >= 0; at--) {
        const layer = layers[at];

        if (layer.locked || !layer.enabled || layer.source.by !== "user") {
            continue;
        }

        if (layer.set?.[NODE_COLOUR_CHANNEL] === undefined && layer.encode?.[NODE_COLOUR_CHANNEL] === undefined) {
            continue;
        }

        return layer.name === "" ? UNNAMED_LAYER_NAME : layer.name;
    }

    return undefined;
}

/**
 * The colour the top of a run's ramp is painted, for the swatch beside its result card.
 *
 * Read off the legend's own last swatch rather than off the palette's top end, because those
 * two are not the same colour: a run whose values are all equal -- degree on an edgeless
 * graph, betweenness on a ring -- lands every node at one end of the ramp, and a swatch drawn
 * at the palette's emblem would be a chip no node on the canvas carries.
 * @param block - the block this run painted.
 * @returns the colour, or undefined when the block carries no coloured swatch.
 * @public
 */
export function topSwatchColour(block: LegendBlock): string | undefined {
    for (let at = block.swatches.length - 1; at >= 0; at--) {
        const { color } = block.swatches[at];

        if (color !== undefined) {
            return color;
        }
    }

    return undefined;
}

/**
 * Takes every layer one run painted out of the stack.
 *
 * By SOURCE, never by position: a run-made layer records the run that made it, so a sweep names
 * the run rather than a set of indices that go stale the moment anything else moves. An
 * element-owned layer is never swept whatever the predicate says, which is what used to take
 * graphty-element's own base layer with it and kill the next load in mesh building.
 * @param session - the element's session.
 * @param runId - the run whose layers to remove, or undefined to remove every run's.
 * @returns the run that resolves when the layers are gone.
 * @public
 */
export function removeRunLayers(session: GraphSession, runId?: RunId): PromiseLike<readonly string[]> {
    return session.styles.removeBySource(
        (source) => source.by === "run" && (runId === undefined || source.runId === runId),
    );
}
