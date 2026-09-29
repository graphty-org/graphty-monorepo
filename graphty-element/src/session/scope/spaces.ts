/**
 * @file A snapshot's node and edge identity spaces, for masks over its rows. Kept apart from the
 * scope resolver so a reader of ids (the simple tier's graph view, the style selector source) does
 * not load the resolver and, through its sets, the session's dispatcher.
 */

import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeId, NodeId } from "../../catalog/types";
import { edgeCounterOf, edgeIdOf } from "../../data/edgeIdentity";
import type { MaskIdSpace } from "./ElementMask";

/**
 * One snapshot's node identity space, for a mask over its nodes.
 * @param snapshot - The snapshot to read.
 * @returns The space, which is the snapshot's own id map.
 */
export function nodeSpaceOf(snapshot: GraphSnapshot): MaskIdSpace<NodeId> {
    return {
        indexOf: (id: NodeId): number => snapshot.ids.indexOf(id),
        idOf: (index: number): NodeId => snapshot.ids.idOf(index),
    };
}

/**
 * One snapshot's edge identity space, for a mask over its edges.
 *
 * It READS the element-assigned counter the store stamped into every edge's `graphty.edgeId`
 * column rather than minting an id out of the endpoints, and that is the whole difference. A
 * minted pair string could not name two edges between one pair -- so under parallel edges only the
 * last of a repeated pair was addressable at all -- and it collided for any node id containing a
 * colon.
 *
 * The reverse lookup is `snapshot.edgeIndexOf`, a lazily built index graph-format already owns
 * over the same column, so there is no hand-built map here to fall out of step with it.
 * @param snapshot - The snapshot to read.
 * @returns The space.
 */
export function edgeSpaceOf(snapshot: GraphSnapshot): MaskIdSpace<EdgeId> {
    const column = snapshot.edges.byRole("id");

    return {
        indexOf: (id: EdgeId): number => {
            const counter = edgeCounterOf(id);
            return counter === INVALID_INDEX ? INVALID_INDEX : snapshot.edgeIndexOf(counter);
        },
        idOf: (edge: number): EdgeId => {
            const counter = column !== null && column.isSet(edge) ? column.value(edge) : undefined;
            return edgeIdOf(typeof counter === "number" ? counter : INVALID_INDEX);
        },
    };
}
