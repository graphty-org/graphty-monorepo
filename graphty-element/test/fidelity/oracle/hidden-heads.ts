/**
 * The oracle's arrowheads a node drawn after them hides, left out, as graphty's side leaves out a head wholly inside
 * a node it draws over its edges (`capUnderNode` in drawn-primitives.ts).
 */
import type { PArrow, PBox, PEdge, Prim, PScene } from "./primitives";

/** A fill this opaque hides what is under it. */
const OPAQUE = 0.99;

/**
 * How far round an arrowhead, as a share of its box's larger side, must lie under the nodes too: only a head well
 * under them is hidden on both drawings alike, where one at a node's rim shows on one and not the other by a pixel.
 */
const MARGIN = 0.25;

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

/**
 * The oracle's scene without the arrowheads wholly under round or square opaque nodes drawn after them (one or several
 * together, `underCovers`), other than their own edge's ends: the program paints the node over the head, so neither drawing shows it (cx2-signor-aml's
 * 10 -> 90, whose head lies under MECP2 in both). A head under its own end node stays, as graphty's side keeps one.
 * @param scene - the oracle's scene
 * @param prims - the primitives it was read from, in document order
 * @returns the scene, unchanged where no head is hidden
 */
export function withoutHiddenHeads(scene: PScene, prims: readonly Prim[]): PScene {
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
        const arrows = e.arrows.filter((a) => {
            const p = headPrim(a, prims);
            return (
                p === undefined ||
                !underCovers(
                    p.box,
                    covers.filter((c) => !ends.includes(c.id) && c.order > p.index),
                )
            );
        });
        if (arrows.length === e.arrows.length) {
            return e;
        }
        changed = true;
        return { ...e, arrows };
    });
    return changed ? { ...scene, edges } : scene;
}
