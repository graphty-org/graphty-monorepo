import type { Channel, Layer, StylesApi } from "@graphty/graphty-element/session";

import { topSwatchColour } from "../defaults/encodingReport";

/** What a row shows beside the layer's name, read from graphty-element. */
export interface LayerRowFacts {
    /** How many nodes (or edges, for an edge layer) the layer's selector matched. */
    readonly matched?: number;
    /** The colour the layer paints, for its paint chip. */
    readonly color?: string;
}

/**
 * The paint chip and match count of every layer, as graphty-element reports them: the count is
 * `styles.counts(id).matched`, the colour the top swatch of the layer's own colour block in
 * `styles.legendOf(id)`. A hidden layer paints nothing, so it has no chip.
 * @param styles - the session's styles surface.
 * @param layers - the layers to read.
 * @returns the facts, by layer id.
 */
export function readLayerRowFacts(
    styles: Pick<StylesApi, "counts" | "legendOf">,
    layers: readonly Layer[],
): ReadonlyMap<string, LayerRowFacts> {
    const facts = new Map<string, LayerRowFacts>();

    for (const layer of layers) {
        const channel: Channel = layer.target === "edge" ? "edge.color" : "node.color";

        try {
            const block = styles.legendOf(layer.id).find((b) => b.channel === channel);

            facts.set(layer.id, {
                matched: styles.counts(layer.id).matched,
                color: block === undefined ? undefined : topSwatchColour(block),
            });
        } catch {
            // A layer the stack no longer holds (E_UNKNOWN_LAYER): nothing until the next read.
        }
    }

    return facts;
}
