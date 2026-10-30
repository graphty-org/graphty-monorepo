/**
 * The position-matched drawing (`<sample>@matched`): graphty's nodes moved to where the program drew them, so a second
 * comparison judges style with the layout taken out. Shared by the oracle tests (`run-oracle.ts`) and the matched
 * fidelity stories in graph-io's fidelity Storybook, so both draw the same thing. Runs in any browser page.
 */
import { fitSimilarity } from "../../../../graph-io/test/fidelity/compare";
import type { Graphty } from "../../../index.js";
import { pairNodes } from "./compare-oracle";
import type { OracleComparison } from "./oracle-library";
import { boxOfPoints, placeUndrawn, type Pt } from "./primitives";

/** The floors key of a sample's position-matched comparison. */
export const matchedKey = (id: string): string => `${id}@matched`;

/** The inverse of a fitted similarity: the point it takes to `q`. */
function unapply(t: NonNullable<ReturnType<typeof fitSimilarity>>, q: Pt): Pt {
    const x = q[0] - t.tx;
    const y = q[1] - t.ty;
    const c = Math.cos(-t.rotation) / t.scale;
    const s = Math.sin(-t.rotation) / t.scale;
    const ry = s * x + c * y;
    return [c * x - s * y, t.reflect ? -ry : ry];
}

/**
 * Moves graphty's nodes to where the program drew them, pinned, so a second comparison judges style with the layout
 * taken out: each oracle node's center is taken into graphty's pixels through the comparison's frame (between
 * unrelated layouts, about the two drawings' middles at the scale their node sizes fit, so the nodes stand as far
 * apart beside their sizes as the program drew them), and from there into the world through graphty's own
 * camera, read off where it draws its nodes.
 * @param element - the mounted element
 * @param first - the first comparison
 * @param mirror - the program's drawing is known to be mirrored
 * @returns whether any node was moved
 */
export async function matchPositions(element: Graphty, first: OracleComparison, mirror: boolean): Promise<boolean> {
    const pairs = pairNodes(first.association.scene, first.graphty).pairs.filter(
        ([o, g]) => Number.isFinite(o.cx + o.cy) && Number.isFinite(g.cx + g.cy),
    );
    if (pairs.length < 2) {
        return false;
    }
    const world = new Map<string, { key: string | number; at: Pt }>();
    for (const [key, node] of element.graph.getDataManager().nodes) {
        world.set(first.names.get(String(key)) ?? String(key), {
            key,
            at: [node.mesh.position.x, node.mesh.position.y],
        });
    }
    const finite = (p: Pt): boolean => Number.isFinite(p[0]) && Number.isFinite(p[1]);
    const drawn = first.graphty.nodes.filter((n) => {
        const w = world.get(n.id);
        return w !== undefined && finite(w.at) && finite([n.cx, n.cy]);
    });
    const toPx = fitSimilarity(
        drawn.map((n) => world.get(n.id)?.at ?? [0, 0]),
        drawn.map((n): Pt => [n.cx, n.cy]),
    );
    if (toPx === null) {
        return false;
    }
    const anchors = pairs.filter(([o]) => o.id.startsWith("anchor-"));
    const frame = anchors.length >= 2 ? anchors : pairs;
    const fit =
        first.report.transform?.unrelatedLayout === false
            ? fitSimilarity(
                  frame.map(([, g]): Pt => [g.cx, g.cy]),
                  frame.map(([o]): Pt => [o.cx, o.cy]),
                  { reflect: mirror },
              )
            : null;
    // between unrelated layouts: the oracle's middle onto graphty's, at the scale the node sizes fit (oracle pixels per
    // graphty pixel), so the program's spacing beside its node sizes is kept; matching extents instead drew the
    // program's arrangement at graphty's own spacing, and every node then failed its size against the fitted frame
    const bo = boxOfPoints(pairs.map(([o]): Pt => [o.cx, o.cy]));
    const bg = boxOfPoints(pairs.map(([, g]): Pt => [g.cx, g.cy]));
    const k = 1 / Math.max(first.report.transform?.lengthScale ?? 1, 1e-9);
    const intoGraphty = (p: Pt): Pt =>
        fit === null
            ? [
                  (bg.x0 + bg.x1) / 2 + (p[0] - (bo.x0 + bo.x1) / 2) * k,
                  (bg.y0 + bg.y1) / 2 + (p[1] - (bo.y0 + bo.y1) / 2) * k,
              ]
            : unapply(fit, p);
    const inGraphty = new Map(pairs.map(([o, g]): [string, Pt] => [g.id, intoGraphty([o.cx, o.cy])]));
    // between unrelated layouts, a node the program's drawing does not show goes among its neighbours, not where
    // graphty's own layout put it
    const undrawn =
        fit === null
            ? placeUndrawn(
                  inGraphty,
                  [...world.keys()],
                  first.graphty.edges.map((e): [string, string] => [e.source, e.target]),
              )
            : new Map<string, Pt>();
    const entries = [...inGraphty, ...undrawn].flatMap(([id, p]) => {
        const w = world.get(id);
        if (w === undefined) {
            return [];
        }
        const [x, y] = unapply(toPx, p);
        // a node either side drew with no center (Graphviz's shape=plain with no label box) stays where it is
        return Number.isFinite(x) && Number.isFinite(y) ? [{ id: w.key, x, y, z: 0 }] : [];
    });
    if (entries.length === 0) {
        return false;
    }
    // ponytail: edge bends a file stores stay where they were; the nodes move by the layout residual only where the
    // layouts are related, and a related layout's bends were already placed by the file.
    await element.session.positions.set(entries);
    await element.session.positions.pin(entries.map((e) => e.id));
    // between unrelated layouts, framed as graphty frames a drawing it loads: the program's spacing can be wider or
    // narrower than graphty's own
    if (fit === null) {
        element.zoomToFit();
    }
    await element.waitForSettled();
    await element.waitForStableFrame();
    return true;
}
