// Round 4, intro "Shape-shifter": what its takes share. A .js file, so record.mjs does not take it for
// a clip. One graph -- the bank -- transforms under a camera that never stops, cut on the music's
// beats; each take starts where the one before ended, so the cuts hide inside fast camera moves.
// Setup reaches each take's starting state through the app's UI (bankIntro) and graphty-element's
// public API (cine.js); a picture is waited for (h.app.settled) BEFORE any moving shader goes on,
// because a canvas with a drifting nebula never holds still.
import { addLayer, backdrop, bankIntro, layout, onElement, shade, tween } from "../r4-intro/cine.js";

/** The nebula behind every take: deep blue gas and stars, so the community colors carry the frame. */
const NEBULA = { gasA: "#0a0f2a", gasB: "#3550c8", gasC: "#1a6a8a", density: 0.55, stars: 0.8, twinkle: 0.4 };

/**
 * The look of every take: the nebula drifting behind the graph. Called last in setup, once the
 * drawing is settled (h.app.settled never returns after it: the canvas no longer holds still). Its
 * drift is divided by `k`, the take's slow-motion factor, so it drifts at one speed in the cut.
 * (Neon edges were tried: on 1,752 edges their glow burns the circle and the tangle to white.)
 * @param h - the hand
 * @param [k] - the take's slow-motion factor (1 = real time)
 */
export async function shapeLook(h, k = 1) {
    await backdrop(h, { shader: "nebula", params: { ...NEBULA, drift: 0.5 / k } });
    await onElement(h, async (el) => {
        // the script flies the camera: the element's own framing (after each layout) would fight it
        el.autoFrame = false;
        // the bank's edges are directed: close up, their arrowheads crowd the models
        await el.session.styles.add({
            name: "No arrows",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "none" },
        });
    });
}

/**
 * The bank as the takes start it: opened, Louvain run and shown, dark canvas, large nodes, laid out
 * flat (bankIntro).
 * @param h - the hand
 */
export async function shapeBank(h) {
    await bankIntro(h);
}

/** The community column Louvain writes on every node (its group layers select on it). */
export const COMMUNITY = "results.louvain.group";

/**
 * The Louvain run's group layers (one per community, each a rule on COMMUNITY), largest first as
 * the run made them.
 * @param h - the hand
 * @returns their layer ids
 */
export const communities = (h) =>
    onElement(
        h,
        (el, field) =>
            el.session.styles
                .list()
                .filter((l) => l.selector?.where?.attribute === field)
                .map((l) => l.id),
        COMMUNITY,
    );

/**
 * Turn some community colors off or on, one after another (each group layer's switch, as its eye
 * in Style layers does): off, a community's nodes are drawn as the layers beneath paint them.
 * @param h - the hand
 * @param ids - the group layers
 * @param on - true to paint them
 * @param [gapMs] - a pause between one community and the next (0: all at once)
 */
export async function paintCommunities(h, ids, on, gapMs = 0) {
    await onElement(
        h,
        async (el, o) => {
            for (const id of o.ids) {
                await el.session.styles.update(id, { enabled: o.on });
                if (o.gapMs) await new Promise((ok) => setTimeout(ok, o.gapMs));
            }
        },
        { ids, on, gapMs },
    );
}

/**
 * Layouts with no travel: for setup, to put the graph somewhere at once.
 * @param h - the hand
 * @param type - the layout id
 * @param [opts] - its options
 */
export async function placeNow(h, type, opts = {}) {
    await onElement(
        h,
        async (el, [t, o]) => {
            const saved = el.session.config.get?.("layoutTransition");
            await el.session.config.set({ layoutTransition: undefined });
            await el.setLayout(t, o);
            await el.waitForSettled();
            if (saved) await el.session.config.set({ layoutTransition: saved });
        },
        [type, opts],
    );
}

/**
 * The tangle take 1 opens on: every node scattered in a 60-unit square, a seeded scatter, so the
 * force layout that pulls it apart makes the same drawing on every take. Wide enough that a close
 * view of its middle holds a knot of about 40 nodes, not a wall of overlapping ones. Centered on the
 * origin, where the force layout centers its drawing, so the knot does not jump when it starts.
 * @param h - the hand
 * @returns when it is placed
 */
export const tangle = (h) => placeNow(h, "random", { scalingFactor: 60, center: [0, 0], seed: 7 });

/**
 * The force layout that pulls the tangle apart (seeded, so takes 1 and 2 share its drawing). ngraph,
 * with no `dim`: in 3D a caller's `dim` wins, so `dim: 2` kept the drawing flat after the switch, and
 * the "force" layout does not lift into depth on a 2D-to-3D switch (#9372 lifts ngraph's drawing).
 */
export const FORCE = ["ngraph", { seed: 1 }];

/**
 * Shaders at full quality, always moving, and the frame guard off (element.shaderSettings): on a
 * loaded recording machine the guard reads the slow frames as a slow GPU and turns the nebula and
 * every heavy shader off mid-take, for good. A film shot slowed down does not need it.
 * @param h - the hand
 * @returns when set
 */
export const steadyShaders = (h) =>
    onElement(h, (el) => {
        el.shaderSettings = { ...el.shaderSettings, quality: "high", motion: "on", guard: false };
    });

/**
 * Light in the bank: thin blue edges with packets of light running along them (fiber-packets), a
 * faint neon glow on them (`neon`), the shaders held steady (steadyShaders), every node a glowing lantern (`lanterns`; a lantern draws a
 * sphere, so leave it off under 3D models), all at size `size` through one layer (returned, to
 * tween). Shader speeds are divided by `k`, the take's slow-motion factor. Call after shapeLook.
 * @param h - the hand
 * @param o - options
 * @param [o.k] - the take's slow-motion factor (1 = real time)
 * @param [o.size] - the node size the size layer starts at
 * @param [o.edgeOpacity] - the edges' opacity (lower where many long edges cross the frame)
 * @param [o.neon] - false for no neon glow on the edges
 * @param [o.lanterns] - false for no lantern glow on the nodes
 * @returns the size layer's id
 */
export async function glowLook(h, { k = 1, size = 0.8, edgeOpacity = 0.55, neon = true, lanterns = true } = {}) {
    await steadyShaders(h);
    await addLayer(h, {
        name: "Thin edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#3d63ff", "edge.width": 0.35, "edge.opacity": edgeOpacity },
    });
    if (neon)
        await shade(h, { shader: "neon-line", params: { glow: 0.25, glowWidth: 2, glintSpeed: 0.3 / k, bloom: 0.3 } });
    await shade(h, {
        shader: "fiber-packets",
        params: { packets: 3, speed: 1.2 / k, tail: 14, glint: 0.9, bloom: 0.9 },
    });
    if (lanterns) await shade(h, { shader: "lantern", params: { intensity: 1.3, flicker: 0.3, bloom: 0.9 } });
    return addLayer(h, {
        name: "Node size",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": size },
    });
}

/**
 * Grow every node from one size to another, eased, through glowLook's size layer.
 * @param h - the hand
 * @param id - glowLook's layer
 * @param from - the size now
 * @param to - the size at the end
 * @param ms - how long
 * @returns when the last size is written
 */
export const grow = (h, id, from, to, ms) => tween(h, id, { "node.size": from }, { "node.size": to }, ms);

/**
 * The community group layers in the order their nodes sit across the drawing, left to right (by
 * the mean X of their nodes), so switching them on in turn sweeps a wave of color across the frame.
 * Falls back to the order given when the nodes' community cannot be read.
 * @param h - the hand
 * @param ids - the group layers (communities)
 * @returns the same ids, reordered
 */
export const leftToRight = (h, ids) =>
    onElement(
        h,
        (el, [list, field]) => {
            const path = (o) => o?.[field] ?? field.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
            const rows = new Map((el.session.data.nodes?.() ?? []).map((r) => [String(r.id), r]));
            const value = (n) => path(n.data) ?? path(rows.get(String(n.id))) ?? path(rows.get(String(n.id))?.data);
            const x = {};
            for (const n of el.getNodes()) {
                const v = String(value(n));
                x[v] ??= [0, 0];
                x[v][0] += n.getPosition().x;
                x[v][1] += 1;
            }
            const layers = el.session.styles.list();
            const at = (id) => {
                const v = x[String(layers.find((l) => l.id === id)?.selector?.where?.value)];
                return v ? v[0] / v[1] : null;
            };
            if (list.some((id) => at(id) === null)) return list;
            return [...list].sort((a, b) => at(a) - at(b));
        },
        [ids, COMMUNITY],
    );

/**
 * A shockwave rings out of every node at once (a new shockwave layer: its ring starts when a node
 * matches), replacing the one before: the accent on a layout snap.
 * @param h - the hand
 * @param [old] - the last shock's layer, removed first
 * @returns the new layer's id
 */
export async function shock(h, old) {
    if (old) await onElement(h, (el, i) => el.session.styles.remove(i).then(() => null), old);
    return shade(h, { shader: "shockwave", params: { ringGlow: 1.2 }, name: "Shock" });
}

/**
 * Take 1's drawing as take 2 starts from it: the tangle pulled apart by the force layout and left to
 * settle, still flat.
 * @param h - the hand
 */
export async function pulledApart(h) {
    await tangle(h);
    await layout(h, ...FORCE);
    await h.app.settled();
}

/**
 * Where the flat drawing is, and the views that frame it: the 2D camera (pan on its middle, zoom so
 * it fills `fill` of the canvas) and the 3D camera that sees the same picture straight on (vertical
 * field of view `fov`), so switching to 3D does not jump.
 * @param h - the hand
 * @param [fill] - the share of the canvas the drawing fills
 * @returns the views: `flat` (zoom, pan, rotation), `front` (position, target) and `size`
 */
export const frameOf = (h, fill = 0.85) =>
    onElement(
        h,
        (el, f) => {
            const ps = el.getNodes().map((n) => n.getPosition());
            const xs = ps.map((p) => p.x);
            const ys = ps.map((p) => p.y);
            const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
            const mid = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: 0 };
            const { width: cw, height: ch } = el.getCanvasSize();
            const cam = el.getCameraState();
            // pixels per world unit now, from where two corners land on screen
            const a = el.worldToScreen({ x: x0, y: y0, z: 0 });
            const b = el.worldToScreen({ x: x1, y: y1, z: 0 });
            const scale = Math.min((f * cw) / Math.abs(b.x - a.x), (f * ch) / Math.abs(b.y - a.y));
            const halfTan = Math.tan((cam.fov ?? 0.8) / 2);
            const dist = Math.max((x1 - x0) / f / (2 * halfTan * (cw / ch)), (y1 - y0) / f / (2 * halfTan));
            return {
                flat: {
                    zoom: cam.zoom === undefined ? undefined : cam.zoom * scale,
                    pan: { x: mid.x, y: mid.y },
                    rotation: 0,
                },
                front: { position: { x: mid.x, y: mid.y, z: -dist }, target: mid },
                size: Math.max(x1 - x0, y1 - y0),
            };
        },
        fill,
    );

/**
 * A 3D camera state as orbit angles around a target (Babylon's ArcRotate convention, as
 * setCameraState reads alpha and beta), from a position and target.
 * @param position - where the camera is
 * @param target - what it looks at
 * @returns the state: alpha, beta, radius and target
 */
export function orbitOf(position, target) {
    const d = { x: position.x - target.x, y: position.y - target.y, z: position.z - target.z };
    const radius = Math.hypot(d.x, d.y, d.z);
    return { alpha: Math.atan2(d.z, d.x), beta: Math.acos(d.y / radius), radius, target };
}

/**
 * The camera rig: the camera flown through keys by the page itself, one jump a frame
 * (setCameraState with skipQueue), so no layout, style change or framing queued in the element can
 * hold it up or cancel it -- an animated setCameraState waits in the element's operation queue
 * behind a layout and is dropped by the next camera call. A key is a 3D orbit state { alpha, beta,
 * radius, target } or a 2D state { zoom, pan, rotation }, with ms, easing ("linear", "easeIn",
 * "easeOut", "easeInOut") and an optional mark (logged when the key starts). Each key starts where
 * the one before ends; the first starts at `from` (the same kind of state), or where the camera is.
 * A 3D key may give `node: "<id>"` instead of a target: the camera then follows that node where it
 * is drawn on every frame (smoothed over about 0.15 s), so it rides along while a layout moves it.
 * With `along: ["<a>", "<b>"]` its alpha and beta come from the line from node a to node b (plus
 * `dAlpha` and `dBeta`), so the camera looks down that line wherever the layout puts them.
 * Zoom and radius travel in log scale, so a long push or pull keeps one speed. Returns at once with
 * a promise of the landing, so layouts and styles change while it flies.
 * @param h - the hand
 * @param keys - the keys, in order
 * @param [from] - the starting state (default: the camera now)
 * @returns the flight, resolving when the last key lands
 */
export async function rig(h, keys, from) {
    const times = await onElement(
        h,
        (el, [list, start]) =>
            new Promise((done, fail) => {
                const ease = {
                    linear: (t) => t,
                    easeIn: (t) => t * t * t,
                    easeOut: (t) => 1 - (1 - t) ** 3,
                    easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
                };
                const now = el.getCameraState();
                let prev = start;
                if (!prev && now.mode === "2d") prev = { zoom: now.zoom, pan: now.pan, rotation: now.rotation ?? 0 };
                if (!prev) {
                    const d = {
                        x: now.position.x - now.target.x,
                        y: now.position.y - now.target.y,
                        z: now.position.z - now.target.z,
                    };
                    const r = Math.hypot(d.x, d.y, d.z);
                    prev = { alpha: Math.atan2(d.z, d.x), beta: Math.acos(d.y / r), radius: r, target: now.target };
                    // the camera's angle comes back in (-pi, pi]: take the turn nearest the first key,
                    // or a key at 4.6 would swing the long way round from -1.68
                    const goal = list[0]?.alpha ?? prev.alpha;
                    prev.alpha += 2 * Math.PI * Math.round((goal - prev.alpha) / (2 * Math.PI));
                }
                const lin = (a, b, f) => a + (b - a) * f;
                const log = (a, b, f) => Math.exp(lin(Math.log(a), Math.log(b), f));
                // a node key's target: where the node is drawn, smoothed, updated once a frame
                const seen = {};
                let tick = performance.now();
                const follow = (keys) => {
                    const t = performance.now();
                    const w = 1 - Math.exp(-(t - tick) / 150);
                    tick = t;
                    const ids = [];
                    for (const k of keys) ids.push(k.node, ...(k.along ?? []));
                    for (const id of ids) {
                        const p = id === undefined ? null : el.getNode(id)?.getPosition();
                        if (!p) continue;
                        const s = seen[id];
                        if (!s) seen[id] = { x: p.x, y: p.y, z: p.z };
                        else for (const c of ["x", "y", "z"]) s[c] += (p[c] - s[c]) * w;
                    }
                };
                const live = (k, near) => {
                    if (k.node === undefined) return k;
                    if (!k.along) return { ...k, target: seen[k.node] };
                    const p = seen[k.along[0]];
                    const q = seen[k.along[1]];
                    const d = { x: q.x - p.x, y: q.y - p.y, z: q.z - p.z };
                    let alpha = Math.atan2(d.z, d.x) + (k.dAlpha ?? 0);
                    // the turn nearest the key before, so the camera never swings the long way round
                    if (near !== undefined) alpha += 2 * Math.PI * Math.round((near - alpha) / (2 * Math.PI));
                    const beta = Math.acos(d.y / Math.hypot(d.x, d.y, d.z)) + (k.dBeta ?? 0);
                    return { ...k, alpha, beta, target: seen[k.node] };
                };
                const at = (key0, key1, f) => {
                    const a = live(key0, key1.along ? undefined : key1.alpha);
                    const b = live(key1, a.alpha);
                    if ("zoom" in b)
                        return {
                            zoom: log(a.zoom, b.zoom, f),
                            pan: { x: lin(a.pan.x, b.pan.x, f), y: lin(a.pan.y, b.pan.y, f) },
                            rotation: lin(a.rotation ?? 0, b.rotation ?? 0, f),
                        };
                    const alpha = lin(a.alpha, b.alpha, f);
                    const beta = lin(a.beta, b.beta, f);
                    const radius = log(a.radius, b.radius, f);
                    const target = {
                        x: lin(a.target.x, b.target.x, f),
                        y: lin(a.target.y, b.target.y, f),
                        z: lin(a.target.z, b.target.z, f),
                    };
                    return {
                        target,
                        position: {
                            x: target.x + radius * Math.cos(alpha) * Math.sin(beta),
                            y: target.y + radius * Math.cos(beta),
                            z: target.z + radius * Math.sin(alpha) * Math.sin(beta),
                        },
                    };
                };
                const out = [];
                let i = 0;
                let t0 = performance.now();
                out.push({ mark: list[0]?.mark, t: Date.now() });
                const frame = () => {
                    const k = list[i];
                    const f = Math.min(1, (performance.now() - t0) / Math.max(1, k.ms ?? 2000));
                    follow([prev, k]);
                    el.setCameraState(at(prev, k, (ease[k.easing ?? "easeInOut"] ?? ease.easeInOut)(f)), {
                        skipQueue: true,
                    }).catch(fail);
                    if (f >= 1) {
                        prev = k;
                        i += 1;
                        if (i === list.length) return done(out);
                        t0 = performance.now();
                        out.push({ mark: list[i].mark, t: Date.now() });
                    }
                    globalThis.requestAnimationFrame(frame);
                };
                globalThis.requestAnimationFrame(frame);
            }),
        [keys, from ?? null],
    );
    for (const { mark, t } of times) if (mark) h.events.push({ t, type: "mark", name: mark });
}

/**
 * Where take 1's swing lands and take 2 starts: turned about 57 degrees to the side of the
 * straight-on view, raised to look down on it a little and closer, so the lifted drawing's depth
 * shows in the parallax.
 * @param front - the straight-on view as orbit angles (orbitOf)
 * @returns the swung view
 */
export const swingEnd = (front) => ({
    alpha: front.alpha + 1,
    beta: 1.1,
    radius: front.radius * 0.75,
    target: front.target,
});

/**
 * Where take 2's orbit lands and take 3 starts: around the origin, where the layouts are centered,
 * turned back from the swing to a little past the face of their plane (alpha -pi/2 looks straight
 * at it), so the circle, rings and spiral are seen nearly face on, never edge on.
 */
export const MORPH_END = { alpha: -1.92, beta: 1.35, radius: 270, target: { x: 0, y: 0, z: 0 } };

/** Where take 3's push lands and its whip starts: low and close among the models. */
export const MODELS_END = { alpha: -2.5, beta: 1.38, radius: 110, target: { x: 0, y: 0, z: 0 } };
