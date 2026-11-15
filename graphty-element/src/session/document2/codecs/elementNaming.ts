/**
 * @file Which style layers name elements (spec 4.2 rule 5): owned by the style codec, which
 * leaves them out of a style section, and read by the view codec, which writes them in its
 * `layers`. Experimental (`save-files-v2`).
 */

import type { GraphSession } from "../../types";
import { throwNotImplemented } from "../notImplemented";

/**
 * Whether a layer names elements: an `ids` selector, a `member` of a picked or path set, a rule
 * leaf naming an element, or a run source whose `params` name a node.
 * @param _layer - The layer, as `session.styles` holds it.
 * @param _session - The session, to resolve the sets a layer names.
 * @returns True when the layer belongs in the view section.
 */
export function layerNamesElements(_layer: unknown, _session: GraphSession): boolean {
    return throwNotImplemented("style.elementNaming");
}
