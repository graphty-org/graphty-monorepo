/**
 * Stand-in nodes and edges for driving a layout engine without an element.
 *
 * A layout engine reads only a few members of a Node or an Edge; these builders type those
 * members and keep the one cast to the full class here, so a test names what it fakes.
 */
import type { Edge } from "../../src/Edge";
import type { Node, NodeIdType } from "../../src/Node";

/** What every layout engine reads from a node: its id, and the row it owns in the position array. */
export type LayoutNodeFields = Pick<Node, "id"> & Partial<Pick<Node, "index">>;

/** What every layout engine reads from an edge: its two end ids, and the two nodes they name. */
export type LayoutEdgeFields = Pick<Edge, "srcId" | "dstId"> &
    Partial<Pick<Edge, "srcNode" | "dstNode" | "id" | "index">>;

/** Members a test adds beyond the typed ones, such as pin state, a radius or a parent graph stand-in. */
export type FakeExtras = Record<string, unknown>;

/**
 * A node as a layout engine sees one.
 * @param id - the node id, which is how a layout keys its answer
 * @param extra - further members, such as `index` (left out, the node has none)
 * @returns the stand-in
 */
export function fakeNode(id: NodeIdType, extra?: Partial<Pick<Node, "index">> & FakeExtras): Node {
    const fields: LayoutNodeFields & FakeExtras = { id, ...extra };
    return fields as unknown as Node;
}

/**
 * An edge as a layout engine sees one. An end given as a node is named by its id and carried as
 * `srcNode` or `dstNode`; an end given as an id is named only.
 * @param src - the source node, or its id
 * @param dst - the destination node, or its id
 * @param extra - further members, such as `id`, `index` or `columnEnd`
 * @returns the stand-in
 */
export function fakeEdge(
    src: Node | NodeIdType,
    dst: Node | NodeIdType,
    extra?: Partial<Pick<Edge, "id" | "index">> & FakeExtras,
): Edge {
    const fields: LayoutEdgeFields & FakeExtras = {
        ...(typeof src === "object" ? { srcId: src.id, srcNode: src } : { srcId: src }),
        ...(typeof dst === "object" ? { dstId: dst.id, dstNode: dst } : { dstId: dst }),
        ...extra,
    };
    return fields as unknown as Edge;
}
