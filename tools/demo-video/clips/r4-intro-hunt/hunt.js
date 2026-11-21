// Round 4, intro "The Hunt": what its shots share. A .js file, so record.mjs does not take it for a
// clip. A fraud thriller on the synthetic bank: the camera chases money round the twelve-account ring,
// whips back to the whole network, the communities snap into color, and it pushes in until a reticle
// locks onto one account of the ring (tmp/demo-video/intros/hunt/shots.md has the shot list).
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { OUT } from "../../lib/env.mjs";
import { add, cross, len, mul, sub, unit } from "../../lib/vec.mjs";
import {
    addLayer,
    dimAll,
    backdrop,
    bankIntro,
    camera,
    edgesAmong,
    onElement,
    shade,
    showRow,
    tween,
    tweenShader,
    unshade,
} from "../r4-intro/cine.js";

export { noCursor } from "../r4-intro/cine.js";

/** The ring, in the order its money goes round (ACC-1480 pays ACC-1481, ... ACC-1491 pays ACC-1480). */
export const RING = Array.from({ length: 12 }, (_, i) => `ACC-${1480 + i}`);
/** The flat all twelve share; the ring's center. */
export const FLAT = "ADDR-R";
/** The account the reticle locks onto. */
export const MARK = "ACC-1484";

/** Every hunt shot is synthetic bank data and filmed as cine.js films (no cursor, no lead-in). */
export const HUNT = { caption: "The Hunt", tag: "Synthetic data" };

/**
 * The money moving: comets of warm light running along edges (comet-tracers; fiber-packets
 * was tried first and its packets barely showed through the neon glow). A comet is drawn inside
 * its edge's ribbon, so it shows only on a wide edge, and only as a streak on a dark one: the
 * trail (huntLook) is both. Short tails, far apart, so each comet reads as one packet.
 * @param h - the hand
 * @param [k] - the undercrank: the comets run k times slower, for footage sped up k times
 * @param [edges] - only these edge ids (the ring's transfers); default every edge
 * @returns the layer's id
 */
export const comets = (h, k = 1, edges = undefined) =>
    shade(h, {
        shader: "comet-tracers",
        edges,
        params: {
            speed: 2.6 / k,
            spacing: 700,
            tail: 60,
            headColor: "#fff6e0",
            tailColor: "#ff8a2a",
            intensity: 3,
            bloom: 3,
        },
    });

/**
 * The ring's twelve accounts as the heroes: larger than the rest, amber like their money, and
 * finely tessellated (a node is an icosphere; 24 subdivisions keep its outline round in close-up).
 */
export const HERO = { "node.size": 2.6, "node.color": "#ffb24a", "node.meshDetail": 24 };

/**
 * The look every shot opens on: the bank in 3D as it opens (force layout, settled), Louvain run with
 * its colors hidden, a dark nebula behind, blue neon edges, the ring's transfers a wide dark trail
 * for the comets, and its accounts large, amber and pearl-shaded (HERO). A looping shader keeps the drawing
 * changing, so h.app.settled never returns once one is on: the camera is framed (Fit) before them,
 * and the shots wait on h.app.frames after. Writes where the ring's nodes are drawn to
 * tmp/demo-video/intros/hunt/<id>.positions.json, to plan camera keys from.
 * @param h - the hand
 * @param id - the clip's id
 * @returns `wide`, the camera at Fit, and `ring`: its `radius` (the farthest ring account from the flat),
 *     `edges` (the ids of the edges among the ring and the flat) and `trail` (the ring's transfers);
 *     `pos`, where the ring's nodes and the flat are drawn; `size`, the layer that sizes every node
 */
export async function huntLook(h, id) {
    await bankIntro(h, { colors: false, flat: false });
    await h.app.camera("Fit");
    await h.app.settled();
    await backdrop(h, {
        shader: "nebula",
        params: {
            density: 0.3,
            sky: 0.5,
            stars: 0.6,
            twinkle: 0.4,
            drift: 0.1,
            gasA: "#120a24",
            gasB: "#3a1450",
            gasC: "#0e2a4a",
        },
    });
    await addLayer(h, {
        name: "Edge color",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#5b8cff", "edge.width": 0.5, "edge.arrowHead": "none" },
    });
    await shade(h, { shader: "neon-line", params: { glow: 0.6, glowWidth: 2, glintSpeed: 0.2, bloom: 0.4 } });
    // every node a little larger, so the wide shots still show nodes, not dust
    const size = await addLayer(h, {
        name: "Size",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 2 },
    });
    // the money trail: the ring's transfers (account to account) wide and dark, so only the comets
    // running along them shine (comets); its twelve accounts the heroes, pearl-shaded so a
    // close-up has light and depth
    const trail = await edgesAmong(h, RING);
    await addLayer(h, {
        name: "Trail",
        target: "edge",
        selector: { match: "ids", edges: trail },
        set: { "edge.width": 12, "edge.color": "#3a2008" },
    });
    await addLayer(h, { name: "Ring accounts", target: "node", selector: { match: "ids", nodes: RING }, set: HERO });
    await shade(h, { shader: "pearl", nodes: RING, name: "Ring pearl" });
    const wide = await camera(h);
    const pos = await onElement(
        h,
        (el, ids) => Object.fromEntries(ids.map((n) => [n, el.getNode(n)?.getPosition() ?? null])),
        [...RING, FLAT],
    );
    const c = pos[FLAT];
    const radius = Math.max(...RING.map((n) => Math.hypot(pos[n].x - c.x, pos[n].y - c.y, pos[n].z - c.z)));
    const ringEdges = await edgesAmong(h, [...RING, FLAT]);
    writeFileSync(
        join(OUT, "intros/hunt", `${id}.positions.json`),
        JSON.stringify({ wide, radius, ringEdges: ringEdges.length, pos }, null, 1),
    );
    return { wide, pos, size, ring: { radius, edges: ringEdges, trail } };
}

/**
 * The payoff: a reticle locks onto MARK (mark "lock"), a shockwave runs round the ring account by
 * account from it ("shock"), then everything else fades dark and only the ring glows red ("dark").
 * Real time (the reticle and the shockwave run on the clock). Run it beside a camera move.
 * @param h - the hand
 * @param ring - huntLook's ring (its `edges`)
 */
export async function lockRing(h, ring) {
    const at = RING.indexOf(MARK);
    h.mark("lock");
    await shade(h, { shader: "lock-on-reticle", nodes: [MARK], params: { spin: 0.8, lineWidth: 2.4 } });
    await h.pause(900);
    h.mark("shock");
    for (let i = 0; i < RING.length; i++) {
        const n = RING[(at + i) % RING.length];
        await shade(h, { shader: "shockwave", nodes: [n], params: { ringGlow: 1.3 }, name: `Shock ${n}` });
        await h.pause(70);
    }
    await h.pause(300);
    h.mark("dark");
    const dim = await dimAll(h);
    await addLayer(h, {
        name: "Ring",
        target: "node",
        selector: { match: "ids", nodes: [...RING, FLAT] },
        set: { "node.opacity": 1, "node.color": "#ff3b30", "node.size": 2 },
    });
    await addLayer(h, {
        name: "Ring edges",
        target: "edge",
        selector: { match: "ids", edges: ring.edges },
        set: { "edge.opacity": 1, "edge.color": "#ff6a3d", "edge.width": 1 },
    });
    await shade(h, { shader: "lantern", nodes: [...RING, FLAT], params: { flicker: 0.5, bloom: 1.2 } });
    await Promise.all([
        tween(h, dim.nodes, { "node.opacity": 1 }, { "node.opacity": 0.05 }, 900),
        tween(h, dim.edges, { "edge.opacity": 1 }, { "edge.opacity": 0.03 }, 900),
    ]);
}

// ---------------------------------------------------------------- round 5: camera geometry

const UP = { x: 0, y: 1, z: 0 };
/**
 * A direction as rig's orbit angles.
 * @param o - the direction
 * @returns alpha (about the vertical) and beta (down from it)
 */
const angles = (o) => ({ alpha: Math.atan2(o.z, o.x), beta: Math.acos(o.y / len(o)) });

/**
 * The opening close-up's angle on RING[0]: square to the plane of its two transfers (in from
 * RING[11], out to RING[1]), so both edges run out across the frame, tilted a little behind them.
 * @param pos - huntLook's pos
 * @returns alpha and beta
 */
export function wakeView(pos) {
    const p = pos[RING[0]];
    const e1 = unit(sub(pos[RING[1]], p));
    const e2 = unit(sub(pos[RING[11]], p));
    let n = unit(cross(e1, e2));
    if (n.y < 0) n = mul(n, -1);
    return angles(add(n, mul(unit(add(e1, e2)), -0.35)));
}

/**
 * One hop of the chase, as rig keys: a jump (a cut inside the take, mark `mark`) to a camera side
 * on to the transfer from RING[i] to RING[i + 1], partway along it, looking a little ahead; then
 * one eased move (fast, then a slow landing) along the edge with the comets onto RING[i + 1],
 * which ends about a third of the frame high. Hops alternate sides, so the money crosses the
 * frame one way, then the other.
 * @param pos - huntLook's pos
 * @param i - the hop (0: RING[0] to RING[1])
 * @param ms - the move's length
 * @param mark - the jump's mark
 * @returns the keys
 */
export function hopKeys(pos, i, ms, mark) {
    const a = pos[RING[i]];
    const b = pos[RING[i + 1]];
    const span = len(sub(b, a));
    const u = unit(sub(b, a));
    let n = cross(u, UP);
    if (len(n) < 0.2) n = cross(u, { x: 1, y: 0, z: 0 });
    n = mul(unit(n), i % 2 ? -1 : 1);
    const o = add(add(mul(n, Math.cos(0.3)), mul(UP, Math.sin(0.3))), mul(u, -0.45));
    const { alpha, beta } = angles(o);
    const start = add(a, mul(u, Math.max(0.5 * span, span - 12)));
    return [
        { target: start, alpha, beta, radius: 19, ms: 1, mark },
        { target: b, alpha: alpha + (i % 2 ? -0.35 : 0.35), beta, radius: 14, ms, easing: "easeOut" },
    ];
}

/**
 * The angle to look at a point from with the fewest nodes in the way: of a grid of directions,
 * the one whose line from `distance` away to the point passes fewest other nodes (not the ring),
 * so a push in along it has nothing rushing past the lens.
 * @param h - the hand
 * @param center - the point (x, y, z)
 * @param distance - how far out the camera starts
 * @returns alpha and beta
 */
export const clearView = (h, center, distance) =>
    onElement(
        h,
        (el, o) => {
            const skip = new Set(o.skip);
            const ps = el
                .getNodes()
                .filter((n) => !skip.has(n.id))
                .map((n) => n.getPosition());
            // how many nodes stand near the line from `distance` out along d to the center
            const crowd = (d) => {
                let cost = 0;
                for (const p of ps) {
                    const v = { x: p.x - o.c.x, y: p.y - o.c.y, z: p.z - o.c.z };
                    const t = v.x * d.x + v.y * d.y + v.z * d.z;
                    const off = Math.hypot(v.x - t * d.x, v.y - t * d.y, v.z - t * d.z);
                    // a node near the lens counts most: it would fill the frame
                    const near = t >= o.distance * 0.3 && t <= o.distance && off < 2 + 0.12 * (o.distance - t);
                    if (near) cost += 1 + (3 * t) / o.distance;
                }
                return cost;
            };
            let best = null;
            for (let beta = 0.75; beta <= 1.95; beta += 0.15)
                for (let alpha = -Math.PI; alpha < Math.PI; alpha += 0.15) {
                    const d = {
                        x: Math.cos(alpha) * Math.sin(beta),
                        y: Math.cos(beta),
                        z: Math.sin(alpha) * Math.sin(beta),
                    };
                    const cost = Math.abs(beta - 1.2) * 4 + crowd(d);
                    if (!best || cost < best.cost) best = { cost, alpha, beta };
                }
            return best;
        },
        { c: center, distance, skip: [...RING, FLAT] },
    );

// ---------------------------------------------------------------- round 5: the communities snap

/** Saturated community colors, none of them the ring's amber or its final red. */
export const PALETTE = [
    "#00e5ff",
    "#7dff3a",
    "#ff3df2",
    "#9b5cff",
    "#2f7bff",
    "#00ffa8",
    "#ff5c9a",
    "#fff23d",
    "#00c2b2",
    "#d06bff",
    "#6ad1ff",
    "#c8ff00",
];

/**
 * Get the communities snap ready, hidden (setup only): Louvain's group layers recolored with
 * PALETTE, and one edge layer per community, switched off, that colors the edges inside it the
 * same (the neon glows in that color). A node's community is read from the color it is drawn in
 * while the Louvain folder is briefly shown.
 * @param h - the hand
 * @returns the edge layers' ids, for snap
 */
export async function prepareCommunities(h) {
    const groups = await onElement(
        h,
        async (el, o) => {
            const ls = el.session.styles.list().filter((l) => l.selector?.where?.attribute === o.field);
            for (const [i, l] of ls.entries())
                await el.session.styles.update(l.id, {
                    set: { ...l.set, "node.color": o.palette[i % o.palette.length] },
                });
            return ls.length;
        },
        { field: "results.louvain.group", palette: PALETTE },
    );
    await showRow(h, "Louvain");
    await h.app.frames(10);
    const buckets = await onElement(
        h,
        (el, skip) => {
            const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
            const color = new Map(el.getNodes().map((n) => [n.id, n.drawnColor ? hex(n.drawnColor) : null]));
            const out = {};
            const no = new Set(skip);
            for (const e of el.session.data.edges()) {
                const c = color.get(e.source);
                if (!c || no.has(e.id) || c !== color.get(e.target)) continue;
                if (!out[c]) out[c] = [];
                out[c].push(e.id);
            }
            return out;
        },
        await edgesAmong(h, RING),
    );
    await showRow(h, "Louvain", false);
    const ids = [];
    for (const [c, edges] of Object.entries(buckets))
        if (PALETTE.includes(c))
            ids.push(
                await addLayer(h, {
                    name: `Community edges ${c}`,
                    target: "edge",
                    selector: { match: "ids", edges },
                    set: { "edge.color": c, "edge.width": 0.9 },
                }),
            );
    await enable(h, ids, false);
    console.log(`  hunt: ${groups} communities, ${ids.length} edge colors`);
    return ids;
}

/**
 * Switch layers on or off (each layer's switch).
 * @param h - the hand
 * @param ids - the layers
 * @param on - true to switch them on
 * @returns when they are switched
 */
export const enable = (h, ids, on = true) =>
    onElement(
        h,
        async (el, o) => {
            await Promise.all(o.ids.map((id) => el.session.styles.update(id, { enabled: o.on })));
        },
        { ids, on },
    );

/**
 * The snap: the Louvain communities and their edges colored at once (mark "color"), and every
 * node punched up in size and back, so the moment reads with the sound off.
 * @param h - the hand
 * @param edgeLayers - prepareCommunities' layers
 * @param sizeLayer - huntLook's `size`
 */
export async function snap(h, edgeLayers, sizeLayer) {
    h.mark("color");
    await Promise.all([showRow(h, "Louvain"), enable(h, edgeLayers)]);
    await tween(h, sizeLayer, { "node.size": 2 }, { "node.size": 3 }, 140);
    await tween(h, sizeLayer, { "node.size": 3 }, { "node.size": 2 }, 520);
}

// ---------------------------------------------------------------- round 5: the payoff

/**
 * What the payoff needs, made in setup so nothing is added on the beat: everything else's
 * dimmers (at full opacity), and the ring's red, switched off.
 * @param h - the hand
 * @param ring - huntLook's ring
 * @returns the layer ids
 */
export async function preparePayoff(h, ring) {
    const all = (target, channel) =>
        addLayer(h, { name: `Dim ${target}s`, target, selector: { match: "everything" }, set: { [channel]: 1 } });
    const dimNodes = await all("node", "node.opacity");
    const dimEdges = await all("edge", "edge.opacity");
    const red = [
        await addLayer(h, {
            name: "Ring red",
            target: "node",
            selector: { match: "ids", nodes: RING },
            set: { "node.opacity": 1, "node.color": "#ff3b30" },
        }),
        await addLayer(h, {
            name: "Ring trail red",
            target: "edge",
            selector: { match: "ids", edges: ring.trail },
            set: { "edge.opacity": 1, "edge.color": "#5a0d06" },
        }),
    ];
    await enable(h, red, false);
    const neon = await onElement(h, (el) => el.session.styles.list().find((l) => l.name === "neon-line").id);
    return { dimNodes, dimEdges, red, neon };
}

/**
 * The payoff, beside a camera move: a reticle swings in onto MARK and locks (mark "lock"); then
 * the whole ring turns red and rings out with a shockwave while everything else fades to nothing
 * ("dark"). Each step starts when the one before has played: on a
 * loaded machine the element takes restyles one at a time and late, so steps sent at once arrive
 * seconds apart; the edit puts each on its beat. The effects' own clocks do not run in this build,
 * so their time parameters are played by hand. The neon goes as the ring turns red (lowering its
 * glow only whitens it, and opacity does not dim it).
 * @param h - the hand
 * @param p - preparePayoff's layers
 * @param [k] - the undercrank: everything k times slower, for footage sped up k times
 */
export async function payoff(h, p, k = 1) {
    const ring = async (nodes, name, ms) => {
        const id = await shade(h, {
            shader: "shockwave",
            nodes,
            name,
            params: { ringGlow: 1.5, ringColor: "#ffd9a0", chroma: 1.5, ringAge: 0 },
        });
        await tweenShader(h, id, "ringAge", 0, 0.7, ms * k);
    };
    h.mark("lock");
    const reticle = await shade(h, {
        shader: "lock-on-reticle",
        nodes: [MARK],
        params: { lineWidth: 5, spin: 0.8 / k, hudColor: "#5cffb0", lockTime: 0, leaveTime: 0 },
    });
    await tweenShader(h, reticle, "lockTime", 0, 0.55, 1100 * k);
    h.mark("dark");
    await Promise.all([enable(h, p.red), unshade(h, p.neon)]);
    await Promise.all([
        // not MARK: a layer's shaders replace those beneath, and MARK keeps its reticle
        ring(
            RING.filter((n) => n !== MARK),
            "Ring shock",
            900,
        ),
        tween(h, p.dimNodes, { "node.opacity": 1 }, { "node.opacity": 0.02 }, 1000 * k),
    ]);
    await tween(h, p.dimEdges, { "edge.opacity": 1 }, { "edge.opacity": 0.02 }, 600 * k);
}
