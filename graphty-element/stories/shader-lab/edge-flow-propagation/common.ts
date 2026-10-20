/**
 * Helpers shared by the motion-along-edges stories: ribbon pixel coordinates, a dark glass node
 * that lets bright edges carry the picture, a cheap bloom, and selection tracking for the
 * propagation stories (which recompute per-edge data whenever the clicked node changes).
 */
import type { LabContext, LabGraph } from "../harness";

export { BLOOM_POST, DARK_NODE_FRAGMENT } from "../edge-ribbon-patterns/common";

/**
 * Edge fragment GLSL: the fragment's position on the ribbon in device pixels. x runs from the
 * source (0) to the target (vLengthPx), y across (0 on the center line).
 */
export const RIBBON = `
float ribbonX() { return vT * vLengthPx; }
float ribbonY() { return vSide * vWidthPx * 0.5; }
float edgeLit() { return max(abs(vTouch.x), abs(vTouch.y)); }
`;

/**
 * The k highest-degree nodes, highest first.
 * @param graph - the graph
 * @param k - how many
 * @returns node indices
 */
export function hubs(graph: LabGraph, k: number): number[] {
    return Array.from(graph.degree.keys())
        .sort((a, b) => graph.degree[b] - graph.degree[a])
        .slice(0, k);
}

/**
 * Calls `onChange(selected)` whenever the selected node changes (a click, or ctx.select), and
 * once at start. The harness marks the selected node in nodeState slot 1.
 * @param ctx - the lab context
 * @param onChange - receives the selected node index, -1 for none
 * @param fallback - a node to select again whenever the selection is cleared (a click on empty
 *   space), so a propagation demo never goes dark; -1 lets the selection clear
 */
export function onSelection(ctx: LabContext, onChange: (selected: number) => void, fallback = -1): void {
    let last = -2;
    ctx.onFrame(() => {
        const state = ctx.nodes?.buffers.nodeState;
        let sel = -1;
        if (state) {
            for (let i = 0; i < ctx.graph.n; i++) {
                if (state[i * 4 + 1] === 1) {
                    sel = i;
                    break;
                }
            }
        }
        if (sel < 0 && fallback >= 0) {
            ctx.select(fallback);
            return;
        }
        if (sel !== last) {
            last = sel;
            onChange(sel);
        }
    });
}
