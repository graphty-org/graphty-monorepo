/**
 * What the release that ships the simple tier adds to the element class: the consumer calls of
 * SimpleTierElementControls (simple.d.ts). The element's own declarations already map
 * "graphty-element" to `Graphty` in HTMLElementTagNameMap, so with this addition
 * `document.querySelector("graphty-element")?.playCameraMotion(...)` type-checks with no cast.
 *
 * It augments the element package, so it compiles only with the element's types present;
 * check-examples.mjs compiles every "use it" line against the element with this file included.
 */
import type { SimpleTierElementControls } from "./simple";

declare module "@graphty/graphty-element" {
    interface Graphty extends SimpleTierElementControls {}
}
