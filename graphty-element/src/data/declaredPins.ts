/**
 * The nodes a reader's last load marked fixed -- graph-io's `fixed` column role: a Graphviz
 * `pos="x,y!"` or `pin=true`, a Cytoscape.js `"locked": true`. A load with `pins: "data"` pins them
 * in its own step (`session/commands/data.ts`).
 */
import type { GraphSnapshot, NodeId } from "@graphty/graph-format";

const DECLARED = new WeakMap<object, readonly NodeId[]>();

/**
 * Record the nodes the file a reader is parsing marks fixed.
 * @param reader - The data source.
 * @param snapshot - The imported graph.
 */
export function declarePins(reader: object, snapshot: GraphSnapshot): void {
    const column = snapshot.nodes.byRole("fixed");
    const ids: NodeId[] = [];
    for (let row = 0; column !== null && row < snapshot.nodeCount; row++) {
        if (column.isSet(row) && column.value(row) === true) {
            ids.push(snapshot.ids.idOf(row));
        }
    }

    DECLARED.set(reader, Object.freeze(ids));
}

/**
 * The nodes a reader's last load marked fixed.
 * @param reader - The data source.
 * @returns Their ids; empty when it marked none.
 */
export function declaredPinsOf(reader: object): readonly NodeId[] {
    return DECLARED.get(reader) ?? [];
}
