/**
 * @file What to call a node, as distinct from how to address it.
 *
 * A result card naming the busiest node wants a name a reader recognises, and an id is only
 * sometimes one -- a GML file keys its nodes by integer while carrying the name beside it. So a
 * result is built with a way to look a label up, and `RunResult` uses it for the rows in a
 * ranking, the entries in a summary and the node the plain-language reading names first.
 *
 * WHY IT LIVES HERE RATHER THAN IN ONE BASE CLASS. The element ships two algorithm pipelines --
 * a metric measures a column, a declared algorithm hands back a whole output -- and until now
 * NEITHER filled this in: `RunResult` has always accepted a label reader and nothing anywhere
 * supplied one, so every result the element produced named its rows by printed id. Putting the
 * lookup in a base class would have fixed one pipeline and left the other, and the one a third
 * party can subclass is the declared base -- so the half that got fixed would decide whether a
 * plugin can name a node. One reader, read by both, is what makes that question not arise.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: the `Graph` import is type-only and the
 * emitter erases it.
 */

import type { NodeId } from "../../catalog/types";
import type { Graph } from "../../Graph";

/**
 * How to read a node's display name, or undefined when the graph has not been told of one.
 *
 * Optional all the way down on purpose: a graph assembled without a configuration document has
 * not been told a label attribute, which is the same answer as being told there is none. Nothing
 * here invents a name -- the caller falls back to the printed id, which is honest, because an id
 * a person chose usually IS the name.
 * @param graph - The graph the run is reading.
 * @returns A label lookup, or undefined when no label attribute is configured.
 */
export function nodeLabelReader(graph: Graph): ((id: NodeId) => string | undefined) | undefined {
    const labelPath = graph.styles?.config.data.knownFields.nodeLabelPath ?? null;

    if (labelPath === null) {
        return undefined;
    }

    const data = graph.getDataManager();

    return (id: NodeId): string | undefined => {
        const value = data.getNode(id)?.data[labelPath];

        return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
    };
}
