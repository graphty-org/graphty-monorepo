/**
 * @file What the layout examples' "use it" lines talk to: the `<graphty-element>` on the page
 * (`document.querySelector("graphty-element")`). Only its `setLayout` is used, so a test can hand
 * the examples the element or the `Graph` behind it.
 */

import type { Graphty } from "../../../src/graphty-element";

/** The part of the element a layout example's "use it" line calls. */
export type LayoutElement = Pick<Graphty, "setLayout">;
