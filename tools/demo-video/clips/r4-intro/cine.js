// Round 4, the cinematic intro: what its shots share. A .js file, so record.mjs does not take it for
// a clip. The intro is filmed like a film, not a screen recording: no cursor on screen, the camera
// flown by script and never still, light moving through shader styles on a dark canvas, and slow
// motion shot in the app (long layout and camera moves) to be sped up in the edit (assemble.mjs
// `speed` / `ramp`). So unlike every other clip, these shots drive graphty-element's public API with
// page.evaluate in `run` (README.md, "Cinematic shots"): the camera, layouts, style layers and
// settings, exactly as a third-party page would.
import { DARK, INTRO_CLIP } from "../r3-intro/intro.js";

export { bankIntro, canvasColor, DARK, everythingSize } from "../r3-intro/intro.js";

/** Spread into a cinematic clip: the intro's experiments off, no still lead-in. */
export const CINE_CLIP = { ...INTRO_CLIP, leadMs: 0 };

/**
 * The workspace's graphty-element (the start page draws another, behind the workspace).
 * @param h - the hand
 * @returns its locator
 */
export const element = (h) => h.page.getByRole("region", { name: "Graph drawing" }).locator("graphty-element");

/**
 * Run a function in the page on the workspace's graphty-element.
 * @param h - the hand
 * @param fn - (el, arg) => value, run in the page
 * @param [arg] - a JSON value handed to it
 * @returns its value
 */
export const onElement = (h, fn, arg) => element(h).evaluate(fn, arg);

/**
 * The cursor off screen and the app's notices dismissed: nothing on screen but the app. Call it at
 * the end of `setup` (and again after anything that raises a notice).
 * @param h - the hand
 */
export async function noCursor(h) {
    await h.park({ x: -300, y: -300 });
    await h.app.closeToast();
    for (const b of await h.page.getByRole("button", { name: "Dismiss", exact: true }).all())
        if (await b.isVisible()) await b.click();
}

/**
 * Fly the camera through keyframes, in the page, one eased move after another; resolves when the
 * last move has landed. Each key is a camera state plus how to get there:
 *   3D: { position: {x, y, z}, target: {x, y, z} } or { alpha, beta, radius, target }
 *   2D: { zoom, pan: {x, y}, rotation }
 *   close on a node: { node: "<id>", distance, azimuth, elevation } (radians: azimuth turns about
 *     the vertical, elevation lifts; the camera looks at the node from `distance` world units)
 * and { ms (default 2000), easing: "easeInOut" (default) | "easeIn" | "easeOut" | "linear", mark }.
 * A `mark` is logged when that key's move starts (assemble.mjs `at`), and "<mark>:end" when it lands.
 * To keep the camera moving across keys, chain easeIn, linear..., easeOut: easeInOut stops at each key.
 * The element's camera transition time (slowMotion `cameraMs`) is lifted while flying, as it would
 * override every `ms`.
 * @param h - the hand
 * @param keys - the keyframes, in order
 */
export async function fly(h, keys) {
    const times = await onElement(
        h,
        async (el, list) => {
            const saved = el.cameraTransitionDuration;
            el.cameraTransitionDuration = undefined;
            const out = [];
            try {
                for (const k of list) {
                    const {
                        ms = 2000,
                        easing = "easeInOut",
                        mark,
                        node,
                        distance = 8,
                        azimuth = 0,
                        elevation = 0.3,
                        ...state
                    } = k;
                    if (node !== undefined) {
                        const p = el.getNode(node)?.getPosition();
                        if (!p) throw new Error(`fly: no node ${node}`);
                        const c = Math.cos(elevation);
                        state.target = p;
                        state.position = {
                            x: p.x + distance * c * Math.sin(azimuth),
                            y: p.y + distance * Math.sin(elevation),
                            z: p.z - distance * c * Math.cos(azimuth),
                        };
                    }
                    const t0 = Date.now();
                    await el.setCameraState(state, { animate: ms > 0, duration: ms, easing });
                    out.push({ mark, t0, t1: Date.now() });
                }
            } finally {
                el.cameraTransitionDuration = saved;
            }
            return out;
        },
        keys,
    );
    // the page's clock is this machine's clock, so its times go straight into the clip's marks
    for (const { mark, t0, t1 } of times)
        if (mark) h.events.push({ t: t0, type: "mark", name: mark }, { t: t1, type: "mark", name: `${mark}:end` });
}

/**
 * Where the camera is now (getCameraState), to plan keys from.
 * @param h - the hand
 * @returns the camera state
 */
export const camera = (h) => onElement(h, (el) => el.getCameraState());

/**
 * A node's drawn position, to aim keys at.
 * @param h - the hand
 * @param id - the node's id
 * @returns its x, y and z, or null for no such node
 */
export const nodePosition = (h, id) => onElement(h, (el, n) => el.getNode(n)?.getPosition() ?? null, id);

/**
 * Slow motion, shot in the app: how nodes travel to a new layout (the project setting
 * `layoutTransition`) and how long the element's own camera moves take (Fit, a preset view, the
 * glide to a picked node). Shoot at `k` times the wanted length and give the cut item `speed: k`
 * (or a `ramp`), so a loaded machine still delivers smooth 30 fps. Shader loops run on their own
 * clock: divide their speed parameter by k too.
 * @param h - the hand
 * @param o - what to slow
 * @param [o.layoutSeconds] - how long a layout change travels (0-30 s); null turns transitions off
 * @param [o.transition] - the transition: "glide" (default), "arc-move", "swirl", "staggered-glide",
 *     "particle-morph", "collapse-bloom", "fade-through"
 * @param [o.params] - the transition's parameters
 * @param [o.cameraMs] - every element camera move takes this long; null gives each its own again
 */
export async function slowMotion(h, { layoutSeconds, transition = "glide", params, cameraMs } = {}) {
    await onElement(
        h,
        async (el, o) => {
            if (o.layoutSeconds !== undefined)
                await el.session.config.set({
                    layoutTransition:
                        o.layoutSeconds === null
                            ? undefined
                            : {
                                  transition: o.transition,
                                  seconds: o.layoutSeconds,
                                  ...(o.params ? { params: o.params } : {}),
                              },
                });
            if (o.cameraMs !== undefined) el.cameraTransitionDuration = o.cameraMs ?? undefined;
        },
        { layoutSeconds, transition, params, cameraMs },
    );
}

/**
 * Run a layout (element.setLayout): with slowMotion's transition the nodes travel there. Resolves
 * once the layout is built, not when the travel ends: wait with h.app.settled().
 * @param h - the hand
 * @param type - the layout id ("circular", "force", "ngraph", "spiral", "random", ...)
 * @param [opts] - its options ({ seed, dim, ... })
 */
export async function layout(h, type, opts = {}) {
    await onElement(h, (el, [t, o]) => el.setLayout(t, o), [type, opts]);
}

/**
 * Light in the frame: a style layer on top of the stack that adds shaders to what it selects
 * (session.styles.add, as the Style panel's Shaders section writes them). Preset ids
 * (graphty-element/src/shaders/presets): nodes "lock-on-reticle", "shockwave", "glass", "hologram",
 * "change-flash", "pearl", ...; edges "neon-line", "fiber-packets", "comet-tracers", ...
 * @param h - the hand
 * @param o - the layer
 * @param o.shader - a preset id, or a list of { shader, params } for several on one layer
 * @param [o.params] - its parameters over the defaults ({ hudColor: "#5cffb0", spin: 1.2 })
 * @param [o.nodes] - only these node ids (a lock-on on one node); default every node
 * @param [o.edges] - only these edge ids; default every edge
 * @param [o.name] - the layer's name (default the shader id)
 * @returns the layer's id, for unshade
 */
export async function shade(h, { shader, params, nodes, edges, name }) {
    return onElement(
        h,
        async (el, o) => {
            const uses = Array.isArray(o.shader)
                ? o.shader
                : [{ shader: o.shader, ...(o.params ? { params: o.params } : {}) }];
            const target = el.session.shaders.describe(uses[0].shader)?.target === "edge" ? "edge" : "node";
            const ids = target === "edge" ? o.edges : o.nodes;
            let selector = { match: "everything" };
            if (ids) selector = target === "edge" ? { match: "ids", edges: ids } : { match: "ids", nodes: ids };
            const layer = await el.session.styles.add({
                name: o.name ?? uses[0].shader,
                target,
                selector,
                set: { [`${target}.shaders`]: uses },
            });
            return layer.id;
        },
        { shader, params, nodes, edges, name },
    );
}

/**
 * Take a shade layer away again.
 * @param h - the hand
 * @param id - what shade returned
 * @returns when the layer is gone
 */
export const unshade = (h, id) => onElement(h, (el, i) => el.session.styles.remove(i).then(() => null), id);

/**
 * The canvas behind the graph: a flat color, and optionally a background shader drawn over it
 * ("nebula"), through the project setting `background`.
 * @param h - the hand
 * @param o - the background
 * @param [o.color] - hex without "#" (default the intro's deep navy)
 * @param [o.shader] - a background shader id ("nebula"), or none
 * @param [o.params] - its parameters ({ drift: 0.3, stars: 0.8 })
 */
export async function backdrop(h, { color = DARK, shader, params } = {}) {
    await onElement(
        h,
        (el, o) =>
            el.session.config.set({
                background: {
                    backgroundType: "color",
                    color: `#${o.color}`,
                    ...(o.shader ? { shader: { id: o.shader, ...(o.params ? { params: o.params } : {}) } } : {}),
                },
            }),
        { color, shader, params },
    );
}

/**
 * A style layer of plain channel values on top of the stack (session.styles.add), such as a veil
 * that dims everything: `{ name, target: "node", selector: { match: "everything" }, set: {
 * "node.opacity": 0.1 } }`.
 * @param h - the hand
 * @param spec - the layer (session.styles LayerSpec)
 * @returns the layer's id, for tween and unshade
 */
export const addLayer = (h, spec) => onElement(h, async (el, s) => (await el.session.styles.add(s)).id, spec);

/**
 * Animate a layer's numeric channels from one set of values to another, in the page, about 15
 * steps a second (session.styles.update with the whole `set` each step, so tween only layers whose
 * every channel it names, such as addLayer's). Resolves when the last value is written.
 * @param h - the hand
 * @param id - the layer
 * @param from - { channel: value } at the start ({ "node.opacity": 0 })
 * @param to - { channel: value } at the end
 * @param ms - how long
 */
export async function tween(h, id, from, to, ms) {
    await onElement(
        h,
        async (el, o) => {
            const t0 = performance.now();
            for (;;) {
                const k = Math.min(1, (performance.now() - t0) / o.ms);
                const e = k * k * (3 - 2 * k); // smoothstep: eased in and out
                const set = {};
                for (const c of Object.keys(o.to)) set[c] = o.from[c] + (o.to[c] - o.from[c]) * e;
                await el.session.styles.update(o.id, { set });
                if (k >= 1) return;
                await new Promise((r) => setTimeout(r, 66));
            }
        },
        { id, from, to, ms },
    );
}

/**
 * Show or hide a style row (a folder such as an algorithm's "Louvain", or a layer) by its name, as
 * its eye in the layer panel does (session.styles.hideRow).
 * @param h - the hand
 * @param name - the row's name
 * @param [shown] - false to hide it
 */
export async function showRow(h, name, shown = true) {
    await onElement(
        h,
        async (el, [n, s]) => {
            const find = (rows) => {
                for (const r of rows) {
                    if (r.name === n) return r;
                    const c = find(r.children);
                    if (c) return c;
                }
                return null;
            };
            const row = find(el.session.styles.tree());
            if (!row) throw new Error(`showRow: no row ${n}`);
            await el.session.styles.hideRow(row.id, !s);
        },
        [name, shown],
    );
}

/**
 * The ids of the edges whose two ends are both among some nodes (session.data.edges), to light
 * one group's edges.
 * @param h - the hand
 * @param nodes - node ids
 * @returns edge ids
 */
export const edgesAmong = (h, nodes) =>
    onElement(
        h,
        (el, ids) => {
            const s = new Set(ids);
            return el.session.data
                .edges()
                .filter((e) => s.has(e.source) && s.has(e.target))
                .map((e) => e.id);
        },
        nodes,
    );

/**
 * Keys that circle a node: from azimuth `from` to `to` (radians) at `distance`, in `steps` linear
 * moves of equal length, so the camera arcs round it instead of cutting a chord. Ease the first and
 * last yourself if the orbit starts or ends the shot.
 * @param o - the orbit
 * @param o.node - the node circled
 * @param o.distance - how far from it (world units), or [start, end] to spiral in or out
 * @param o.from - start azimuth
 * @param o.to - end azimuth
 * @param o.ms - how long, in all
 * @param [o.elevation] - the lift (radians), or [start, end]
 * @param [o.steps] - how many moves (default 6)
 * @returns fly keys
 */
export function orbit({ node, distance, from, to, ms, elevation = 0.3, steps = 6 }) {
    const lerp = (v, k) => (Array.isArray(v) ? v[0] + (v[1] - v[0]) * k : v);
    return Array.from({ length: steps }, (_, i) => {
        const k = (i + 1) / steps;
        return {
            node,
            distance: lerp(distance, k),
            azimuth: from + (to - from) * k,
            elevation: lerp(elevation, k),
            ms: ms / steps,
            easing: "linear",
        };
    });
}

/**
 * Animate one numeric parameter of a shade layer's first shader, in the page, as fast as the
 * element takes updates (session.styles.update once a frame, the layer's other shaders and
 * parameters kept). Use it to play a one-shot effect by hand -- a shockwave's `ringAge`, a
 * reticle's `lockTime` -- or to fade a glow out.
 * @param h - the hand
 * @param id - the layer (shade's id)
 * @param param - the parameter ("ringAge")
 * @param from - its value at the start
 * @param to - its value at the end
 * @param ms - how long
 * @param [ease] - true to ease in and out (smoothstep); default linear, as a clock runs
 */
export async function tweenShader(h, id, param, from, to, ms, ease = false) {
    await onElement(
        h,
        async (el, o) => {
            const layer = el.session.styles.list().find((l) => l.id === o.id);
            const key = Object.keys(layer.set).find((k) => k.endsWith(".shaders"));
            const [first, ...rest] = layer.set[key];
            const t0 = performance.now();
            for (;;) {
                const k = Math.min(1, (performance.now() - t0) / o.ms);
                const e = o.ease ? k * k * (3 - 2 * k) : k;
                const params = { ...first.params, [o.param]: o.from + (o.to - o.from) * e };
                await el.session.styles.update(o.id, { set: { ...layer.set, [key]: [{ ...first, params }, ...rest] } });
                if (k >= 1) return;
                await new Promise((r) => globalThis.requestAnimationFrame(r));
            }
        },
        { id, param, from, to, ms, ease },
    );
}
