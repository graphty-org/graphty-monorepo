/**
 * The start page's hover highlight as four ordinary style layers built with the selection editor
 * (design/ui/selection-groups/spec.md, section 7): fade what the pointed-at node (else a lone
 * selected node) is not linked to, fade the links it does not have, draw its links darker, and ring
 * it. Each layer's selector is a `union` leaf, so the reader opens and edits it like any other.
 * With nothing pointed at or selected all four match nothing.
 */

import type { RowSpec, UnionLeaf, UnionStep } from "@graphty/graphty-element/session";

import { EDGE_WIDTH, HIGHLIGHT_OPACITY, LOOK } from "../start/heroLook";

/** The reference every step reads: the hovered node, else a lone selected node. */
const FOCUS = "hovered-or-selected";

/**
 * A selection of one group.
 * @param side - nodes or edges.
 * @param start - what the group starts with.
 * @param steps - its steps.
 * @returns the `union` leaf.
 */
function oneGroup(side: UnionLeaf["side"], start: "all" | "none", steps: readonly UnionStep[]): UnionLeaf {
    return { kind: "union", side, within: "visible", branches: [{ start, steps }] };
}

/** "Keep, while Hovered or selected has nodes": nothing at all while nothing is in focus. */
const WHILE_FOCUSED: UnionStep = { op: "keep", rule: { kind: "nonempty", of: FOCUS } };

/**
 * The four layers, bottom first, in the start page's light colors (the canvas stays light in dark
 * mode).
 * @returns the rows.
 */
export function hoverRecipe(): RowSpec[] {
    const look = LOOK.light;
    return [
        {
            name: "Fade nodes",
            target: "node",
            selector: {
                match: "rule",
                where: oneGroup("nodes", "all", [
                    WHILE_FOCUSED,
                    { op: "except", rule: { kind: "hops", of: FOCUS, max: 1 } },
                ]),
            },
            set: { "node.opacity": 0.3 },
        },
        {
            name: "Fade edges",
            target: "edge",
            selector: {
                match: "rule",
                where: oneGroup("edges", "all", [
                    WHILE_FOCUSED,
                    { op: "except", rule: { kind: "touching", of: FOCUS, ends: "either" } },
                ]),
            },
            set: { "edge.opacity": 0.15 },
        },
        {
            name: "Its edges",
            target: "edge",
            selector: {
                match: "rule",
                where: oneGroup("edges", "none", [
                    { op: "add", rule: { kind: "touching", of: FOCUS, ends: "either" } },
                ]),
            },
            set: { "edge.color": look.hot, "edge.opacity": 1, "edge.width": EDGE_WIDTH * 1.25 },
        },
        {
            name: "Halo",
            target: "node",
            selector: {
                match: "rule",
                where: oneGroup("nodes", "none", [{ op: "add", rule: { kind: "hops", of: FOCUS, max: 0 } }]),
            },
            set: { "node.haloColor": look.ring, "node.haloOpacity": HIGHLIGHT_OPACITY },
        },
    ];
}
