/**
 * A style layer as the element hands one over, for the boards that draw one.
 *
 * Every field the element fills in is here, because `Layer` has no optional identity: a layer
 * knows what it paints (`target`), which elements (`selector`), who put it there (`source`) and
 * whether a consumer may touch it (`locked`). A fixture that left any of them out would be
 * testing a shape the element never produces.
 */

import type { Layer, LayerSource, Selector, StaticStyle } from "@graphty/graphty-element/session";

/** What a board wants to say about the layer it is drawing. */
interface LayerFixtureOptions {
    /** Whether it paints nodes or edges. Defaults to nodes. */
    readonly target?: "node" | "edge";
    /** Which elements it paints. Defaults to every one of its target. */
    readonly selector?: Selector;
    /** Who put it in the stack. Defaults to the reader. */
    readonly source?: LayerSource;
    /** The literal values it writes. */
    readonly set?: StaticStyle;
    /** The declarative bindings it writes. */
    readonly encode?: Layer["encode"];
    /** Whether the element owns it, which is what makes it locked. */
    readonly locked?: boolean;
}

/**
 * One layer, as the element holds it.
 * @param id - the layer id.
 * @param name - what it is called.
 * @param options - what the board wants to say about it.
 * @returns the layer.
 */
export function makeLayer(id: string, name: string, options: LayerFixtureOptions = {}): Layer {
    return {
        id,
        name,
        kind: "custom",
        source: options.source ?? { by: "user" },
        locked: options.locked ?? false,
        enabled: true,
        target: options.target ?? "node",
        selector: options.selector ?? { match: "everything" },
        ...(options.set === undefined ? {} : { set: options.set }),
        ...(options.encode === undefined ? {} : { encode: options.encode }),
    };
}
