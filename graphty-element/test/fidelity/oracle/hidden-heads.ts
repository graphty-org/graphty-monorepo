/**
 * Arrowheads a third node hides: each side marks its own (`markHiddenHeads` here for the oracle, `capUnderNode` in
 * drawn-primitives.ts for graphty), and the comparator leaves a head out only where the paired edge's head at the same
 * end is hidden in both drawings (`withoutHiddenInBoth`). A head one drawing hides and the other shows, because node
 * sizes or places differ (gexf-sigma-ediaspora), is a difference a reader sees, and is judged.
 */
import { extendToTip } from "./associate";
import type { ArrowEnd, PArrow, PBox, PEdge, Prim, PScene, Pt } from "./primitives";

/** A fill this opaque hides what is under it. */
const OPAQUE = 0.99;

/**
 * How far round an arrowhead, as a share of its box's larger side, must lie under the nodes too: a pixel or two for a
 * head's usual size, so one at a node's rim, which a pixel of its tip may show, is not hidden. A head is left out only
 * where both drawings hide it, so a head at the rim in one drawing alone is judged anyway; a wider margin missed
 * heads both drawings hide (cx2-signor-aml's 27 -> 68 under node 13, its box's corners past the rim).
 */
const MARGIN = 0.1;

/** A node that can hide what is drawn under it: its box out to its outline's outer edge, and whether it is round. */
export interface Cover {
    id: string;
    box: PBox;
    ellipse: boolean;
}

/**
 * Whether a box lies well under the nodes covering it, one node or several together (a head under a stack of
 * overlapping nodes, pajek-iliad): the corners and the middles of the sides of the box grown by `MARGIN` each lie
 * under one of them.
 * @param box - what is drawn under them, an arrowhead's box
 * @param covers - the nodes drawn over it
 * @returns true when no part of the box shows
 */
export function underCovers(box: PBox, covers: readonly Cover[]): boolean {
    const grow = MARGIN * Math.max(box.x1 - box.x0, box.y1 - box.y0);
    const b = { x0: box.x0 - grow, y0: box.y0 - grow, x1: box.x1 + grow, y1: box.y1 + grow };
    const [mx, my] = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
    const points: [number, number][] = [
        [b.x0, b.y0],
        [mx, b.y0],
        [b.x1, b.y0],
        [b.x1, my],
        [b.x1, b.y1],
        [mx, b.y1],
        [b.x0, b.y1],
        [b.x0, my],
    ];
    const under = ([x, y]: [number, number], c: Cover): boolean => {
        const { x0, y0, x1, y1 } = c.box;
        if (!c.ellipse) {
            return x0 <= x && x <= x1 && y0 <= y && y <= y1;
        }
        const [rx, ry] = [(x1 - x0) / 2, (y1 - y0) / 2];
        return ((x - (x0 + x1) / 2) / rx) ** 2 + ((y - (y0 + y1) / 2) / ry) ** 2 <= 1;
    };
    return covers.length > 0 && points.every((q) => covers.some((c) => under(q, c)));
}

/**
 * The primitive an arrowhead was read from: a filled piece of its color round its middle, no bigger than the head.
 * @param a - the arrowhead
 * @param prims - the drawing's primitives
 * @returns the smallest such piece, or undefined when none is
 */
function headPrim(a: PArrow, prims: readonly Prim[]): Prim | undefined {
    const { at } = a;
    if (at === undefined || a.color === null) {
        return undefined;
    }
    const most = 1.5 * Math.max(a.length, a.width) + 2;
    const color = a.color.toLowerCase();
    const area = (b: PBox): number => (b.x1 - b.x0) * (b.y1 - b.y0);
    return prims
        .filter(
            (p) =>
                (p.kind === "shape" || p.kind === "path") &&
                p.fill?.color.toLowerCase() === color &&
                p.box.x0 <= at[0] &&
                at[0] <= p.box.x1 &&
                p.box.y0 <= at[1] &&
                at[1] <= p.box.y1 &&
                Math.max(p.box.x1 - p.box.x0, p.box.y1 - p.box.y0) <= most,
        )
        .sort((p, q) => area(p.box) - area(q.box))[0];
}

/** The most a head's box spans, in the side's pixels, for a piece no arrowhead was read from. */
const HEAD_MOST = 30;

/**
 * A filled piece at a line's end no arrowhead was read from, no bigger than a head: what the program drew there, which
 * the reader left unattached (cx2-signor-aml's 113 -> 92, whose head lies under PML-RARalpha).
 * @param at - the line's end
 * @param prims - the drawing's primitives
 * @returns the smallest such piece, or undefined when none is
 */
function headAt(at: readonly [number, number], prims: readonly Prim[]): Prim | undefined {
    const area = (b: PBox): number => (b.x1 - b.x0) * (b.y1 - b.y0);
    return prims
        .filter(
            (p) =>
                (p.kind === "shape" || p.kind === "path") &&
                p.closed &&
                p.fill !== null &&
                Math.max(p.box.x1 - p.box.x0, p.box.y1 - p.box.y0) <= HEAD_MOST &&
                p.box.x0 - 1 <= at[0] &&
                at[0] <= p.box.x1 + 1 &&
                p.box.y0 - 1 <= at[1] &&
                at[1] <= p.box.y1 + 1,
        )
        .sort((p, q) => area(p.box) - area(q.box))[0];
}

/**
 * The oracle's scene with its arrowheads wholly under round or square opaque nodes drawn after them (one or several
 * together, `underCovers`), other than their own edge's ends, marked `hidden`: the program paints the node over the
 * head (cx2-signor-aml's 10 -> 90, whose head lies under MECP2). An end with no head read whose line ends in such a
 * hidden piece goes in `hiddenEnds` (113 -> 92 under PML-RARalpha). A head under its own end node is not marked, as
 * graphty's side marks none.
 * @param scene - the oracle's scene
 * @param prims - the primitives it was read from, in document order
 * @returns the scene, unchanged where no head is hidden
 */
export function markHiddenHeads(scene: PScene, prims: readonly Prim[]): PScene {
    const covers = scene.nodes.flatMap((n) => {
        const order = n.fillOrder ?? n.order;
        if (
            order === undefined ||
            n.fill === null ||
            n.fill.opacity < OPAQUE ||
            (n.shape !== "ellipse" && n.shape !== "rect")
        ) {
            return [];
        }
        const out = (n.stroke?.width ?? 0) / 2;
        const box = {
            x0: n.cx - n.w / 2 - out,
            y0: n.cy - n.h / 2 - out,
            x1: n.cx + n.w / 2 + out,
            y1: n.cy + n.h / 2 + out,
        };
        return [{ id: n.id, order, box, ellipse: n.shape === "ellipse" }];
    });
    let changed = false;
    const edges = scene.edges.map((e): PEdge => {
        const ends = [e.source, e.target, e.ownEnds?.source, e.ownEnds?.target];
        const hidden = (p: Prim | undefined): boolean =>
            p !== undefined &&
            underCovers(
                p.box,
                covers.filter((c) => !ends.includes(c.id) && c.order > p.index),
            );
        let marked = false;
        const arrows = e.arrows.map((a) => {
            if (!hidden(headPrim(a, prims))) {
                return a;
            }
            marked = true;
            return { ...a, hidden: true };
        });
        const lineEnds = { source: e.points[0], target: e.points.at(-1) };
        // the line stops at the hidden head's back, as at a head read: the route carried on to its tip (`toHiddenTips`)
        const hiddenTips: { source?: Pt; target?: Pt } = {};
        const hiddenEnds = (["source", "target"] as const).filter((end) => {
            const at = lineEnds[end];
            const piece = at === undefined || e.arrows.some((a) => a.end === end) ? undefined : headAt(at, prims);
            if (piece === undefined || !hidden(piece)) {
                return false;
            }
            const carried = extendToTip(e.points, piece.points, end, piece.stroke);
            if (carried.length > e.points.length) {
                hiddenTips[end] = end === "target" ? carried.at(-1) : carried[0];
            }
            return true;
        });
        if (!marked && hiddenEnds.length === 0) {
            return e;
        }
        changed = true;
        return { ...e, arrows, ...(hiddenEnds.length > 0 ? { hiddenEnds, hiddenTips } : {}) };
    });
    return changed ? { ...scene, edges } : scene;
}

/**
 * Two paired edges' arrowheads without those hidden in both drawings: an end whose heads are all `hidden` on
 * graphty's side, and on the oracle's all `hidden` or none read and the end in its `hiddenEnds`, is left out of both,
 * together; every other head stays, hidden or not, so a head one
 * drawing hides and the other shows is still judged.
 * @param oracle - the oracle edge: its arrowheads and its hidden ends
 * @param graphty - graphty's, with their ends already turned to the oracle edge's direction
 * @returns both lists, with the heads hidden in both left out
 */
export function withoutHiddenInBoth(
    oracle: Pick<PEdge, "arrows" | "hiddenEnds">,
    graphty: readonly PArrow[],
): [PArrow[], PArrow[]] {
    const gone = hiddenInBoth(oracle, graphty);
    return [oracle.arrows.filter((a) => !gone.has(a.end)), graphty.filter((a) => !gone.has(a.end))];
}

/**
 * The ends whose heads both drawings hide: all `hidden` on graphty's side, and on the oracle's all `hidden` or none
 * read and the end in its `hiddenEnds`.
 * @param oracle - the oracle edge
 * @param graphty - graphty's arrowheads, their ends turned to the oracle edge's direction
 * @returns those ends
 */
function hiddenInBoth(oracle: Pick<PEdge, "arrows" | "hiddenEnds">, graphty: readonly PArrow[]): Set<ArrowEnd> {
    const hiddenAt = (list: readonly PArrow[], end: ArrowEnd): boolean => {
        const at = list.filter((a) => a.end === end);
        return at.length > 0 && at.every((a) => a.hidden === true);
    };
    return new Set(
        (["source", "target", "middle"] as const).filter(
            (end) =>
                (hiddenAt(oracle.arrows, end) || (oracle.hiddenEnds?.includes(end) ?? false)) && hiddenAt(graphty, end),
        ),
    );
}

/**
 * The oracle edge with its route carried on to the tip of each hidden head graphty hides too (`hiddenTips`): the
 * program stops its line at the head's back, and graphty's route runs to its head's tip, so judged as drawn the oracle's
 * reads a head's length short (cx2-signor-aml 23 -> 144, whose head lies under MTOR: 0.14 of its chord). Where graphty
 * draws no head there, the piece under the node says nothing of where the line ends (json-cyjs-perf n109 -> n571).
 * @param oracle - the oracle edge
 * @param graphty - graphty's arrowheads, their ends turned to the oracle edge's direction
 * @returns the edge, its points carried on where both hide the head
 */
export function toHiddenTips(oracle: PEdge, graphty: readonly PArrow[]): PEdge {
    const tips = oracle.hiddenTips;
    if (tips === undefined) {
        return oracle;
    }
    const gone = hiddenInBoth(oracle, graphty);
    const [from, to] = [gone.has("source") ? tips.source : undefined, gone.has("target") ? tips.target : undefined];
    if (from === undefined && to === undefined) {
        return oracle;
    }
    return {
        ...oracle,
        points: [...(from === undefined ? [] : [from]), ...oracle.points, ...(to === undefined ? [] : [to])],
    };
}
