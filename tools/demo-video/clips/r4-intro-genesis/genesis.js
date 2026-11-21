// Round 4, intro "Genesis" (from chaos to understanding): what its shots share. A .js file, so
// record.mjs does not take it for a clip. Builds on the cinematic helpers (../r4-intro/cine.js):
// no cursor, the camera flown through graphty-element's public API, light from shader styles.
import { ALZ } from "../r2-2-alzheimer/alz.js";
import { closeTable } from "../../lib/app.mjs";
import { analyze } from "../r2-1-fraud-ring/bank.js";
import { hideLegend } from "../r2-5b-and-more/more.js";
import { canvasColor, everythingSize, onElement, shade } from "../r4-intro/cine.js";

/** The reticle's color: the speck the network shrinks to, and the airport the globe opens on. */
export const SPECK = "#5cffb0";

/**
 * Wait until the running layout has come to rest (session.layout.motion is "settled"), checked
 * once a frame in the page: a condition, not a clock.
 * @param h - the hand
 * @returns when it has
 */
export const layoutRest = (h) =>
    onElement(
        h,
        (el) =>
            new Promise((done) => {
                const look = () =>
                    el.session.layout.motion === "settled" ? done() : globalThis.requestAnimationFrame(look);
                look();
            }),
    );

/** Deep space behind every shot: a dark nebula, its gas slow, stars bright (cine.js backdrop). */
export const NEBULA = {
    shader: "nebula",
    params: { gasA: "#04030c", gasB: "#3b1d6e", gasC: "#0c2b52", density: 0.45, drift: 0.25, stars: 1, twinkle: 0.8 },
};

/**
 * A style layer over every edge (session.styles.add, as the Style panel's Edge tab writes it).
 * @param h - the hand
 * @param set - the edge channels ({ "edge.opacity": 0.3 })
 * @returns when it is added
 */
export const edgeLook = (h, set) =>
    onElement(
        h,
        (el, s) => el.session.styles.add({ name: "Edges", target: "edge", selector: { match: "everything" }, set: s }),
        set,
    );

/**
 * The universe: the real Alzheimer's network (Open Targets' targets, STRING links; 308 proteins),
 * opened as a file (setup only), colored by Louvain community, on the dark canvas with no legend:
 * every protein in glass, every edge carrying comets of its source's community color, the plain
 * edge lines dim so the comets carry the light, no arrowheads.
 * @param h - the hand
 */
export async function universe(h) {
    const { page } = h;
    await h.app.openFile(h.file(ALZ));
    await closeTable(page);
    await analyze(h, "louv", "Louvain");
    await hideLegend(page);
    await canvasColor(page);
    await everythingSize(page, "1.6");
    await edgeLook(h, { "edge.colorFrom": "source", "edge.opacity": 0.15, "edge.arrowHead": "none" });
    await h.app.settled();
    // glass kept low: brighter sparkle and bloom blew the near proteins out to flat white
    await shade(h, { shader: "glass", params: { sparkle: 0.8, bloom: 0.2, tint: 1 } });
    await shade(h, {
        shader: "comet-tracers",
        params: { useEdgeColor: true, intensity: 3, bloom: 2, tail: 160, spacing: 300, speed: 1.2 },
    });
    await hideLegend(page);
}

/**
 * Where the drawing is: the mean of the nodes' positions and the distance that holds 90% of them,
 * to aim camera keys at a drawing whose size a layout decides.
 * @param h - the hand
 * @returns its center (x, y, z) and that radius
 */
export const extent = (h) =>
    onElement(h, (el) => {
        const ps = el.getNodes().map((n) => n.getPosition());
        const c = { x: 0, y: 0, z: 0 };
        for (const p of ps) for (const k of ["x", "y", "z"]) c[k] += p[k] / ps.length;
        const d = ps.map((p) => Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z)).sort((a, b) => a - b);
        return { center: c, radius: d[Math.floor(d.length * 0.9)] };
    });

/**
 * Text over chosen nodes: one style layer per node with its id as the label, white bold sans-serif at
 * a fixed size on screen, above the node, with a soft dark shadow (no box: an on-top box drew offset
 * from its text), drawn over everything, fading with distance (session.styles.add with the label
 * settings the Style panel's Label settings write).
 * @param h - the hand
 * @param ids - the node ids
 * @param [px] - the text size in screen pixels
 * @param [fade] - camera distances at which the text starts to fade and is gone
 */
export async function labels(h, ids, px = 64, fade = [70, 160]) {
    for (const id of ids)
        await onElement(
            h,
            (el, [n, size, fade]) =>
                el.session.styles.add({
                    name: `Label ${n}`,
                    target: "node",
                    selector: { match: "ids", nodes: [n] },
                    set: {
                        "node.label": n,
                        "node.labelStyle": {
                            color: "#ffffff",
                            font: "sans-serif",
                            weight: "bold",
                            sizeMode: "screen",
                            sizePx: size,
                            location: "top",
                            onTop: true,
                            shadow: true,
                            shadowColor: "#000000",
                            shadowBlur: 12,
                            // a name belongs to a close look: it fades as the camera pulls away
                            depthFade: true,
                            depthFadeNear: fade[0],
                            depthFadeFar: fade[1],
                        },
                    },
                }),
            [id, px, fade],
        );
}
