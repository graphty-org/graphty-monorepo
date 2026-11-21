// Intro "Genesis", shots 1-3 in one continuous take, scored to the music (the run's clock is the
// video's: beat n of the cut lands at run time -6.12 + 0.8427 n s, so the take is cut in at 1x and
// nothing needs to be re-timed). Deep space; a far cloud of proteins drifts into the frame (the real
// Alzheimer's network, every protein in glass, comets on every edge, all communities mixed in one
// ball); gravity: the force layout pulls the storm into galaxies by community while the camera
// circles; on the swell the camera dives into APOE's galaxy along the comets, lingers on APOE and APP;
// on the first big hit a reticle and a shockwave lock onto APOE and the camera pulls out until the
// whole network is one bright reticle in the middle of the frame (the match cut to the globe).
import { backdrop, CINE_CLIP, layout, noCursor, onElement, shade } from "../r4-intro/cine.js";
import { rig } from "../r4-intro-shape/shape.js";
import { extent, labels, layoutRest, NEBULA, SPECK, universe } from "./genesis.js";

/** The protein the dive lands on. */
const HERO = "APOE";

/** The force layout, seeded: the galaxies land in the same places on every take. */
const GRAVITY = ["ngraph", { dim: 3, seed: 7 }];

/**
 * Run times (ms) of the music's events: beat 15 the swell, 23 the first big hit, 24.5 the loudest.
 * @param n - the beat
 * @returns its time in the take
 */
const beat = (n) => Math.round((-6.12 + (n * 60) / 71.2) * 1000);

/**
 * The clearest line for the dive: the view angles round HERO (alpha, beta) whose close drift and
 * first pull out keep the camera farthest from every other protein, so no node passes through the
 * lens (a near node filled a third of the frame in an earlier take). Prefers the angles that keep
 * APP in the frame. Searched over the settled drawing, in the page.
 * @param h - the hand
 * @returns the angles where the close drift ends (alpha, beta), and the nearest miss (clear)
 */
const clearLine = (h) =>
    onElement(
        h,
        (el, hero) => {
            const t = el.getNode(hero).getPosition();
            const app = el.getNode("APP")?.getPosition();
            const others = el
                .getNodes()
                .map((n) => n.getPosition())
                .filter((p) => Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z) > 1e-3);
            const at = (a, b, r) => ({
                x: t.x + r * Math.cos(a) * Math.sin(b),
                y: t.y + r * Math.cos(b),
                z: t.z + r * Math.sin(a) * Math.sin(b),
            });
            const near = (c) => Math.min(...others.map((p) => Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z)));
            // whether APP is within about 0.3 rad of the frame's center, seen from (a, b)
            const appIn = (a, b) => {
                if (!app) return false;
                const c = at(a, b, 28);
                const ax = { x: t.x - c.x, y: t.y - c.y, z: t.z - c.z };
                const ap = { x: app.x - c.x, y: app.y - c.y, z: app.z - c.z };
                const dot = ax.x * ap.x + ax.y * ap.y + ax.z * ap.z;
                return dot / (Math.hypot(ax.x, ax.y, ax.z) * Math.hypot(ap.x, ap.y, ap.z)) > Math.cos(0.3);
            };
            // the dive's last stretch, the close drift and the start of the pull, seen from (a, b)
            const path = (a, b) => [
                ...Array.from({ length: 9 }, (_, k) =>
                    at(a - 0.45 * (1 - k / 8), b + 0.05 * (1 - k / 8), 34 - (6 * k) / 8),
                ),
                ...[45, 60, 80, 110, 150].map((r) => at(a, b, r)),
            ];
            let best = null;
            for (let a = -Math.PI; a < Math.PI; a += 0.1)
                for (let b = 0.9; b <= 1.65; b += 0.075) {
                    const clear = Math.min(...path(a, b).map((c) => near(c)));
                    const seen = appIn(a, b);
                    // APP in the frame counts as 6 units of clearance
                    const score = clear + (seen ? 6 : 0);
                    if (!best || score > best.score) best = { alpha: a, beta: b, clear, score, appIn: seen };
                }
            return best;
        },
        HERO,
    );

export default {
    id: "genesis-storm",
    ...CINE_CLIP,
    caption: "",
    async setup(h) {
        await universe(h);
        // where the galaxies come to rest, to aim the camera at
        await layout(h, ...GRAVITY);
        await layoutRest(h);
        h.end = await extent(h);
        h.line = await clearLine(h);
        console.log(`genesis-storm: dive line ${JSON.stringify(h.line)}`);
        // the storm: the same layout started again, which throws every node into one small ball of
        // every color; held still until the take rolls
        await layout(h, ...GRAVITY);
        await h.app.frames(2);
        await onElement(h, (el) => el.session.layout.pause());
        h.start = await extent(h);
        await labels(h, [HERO, "APP"]);
        await backdrop(h, NEBULA);
        await noCursor(h);
        await h.app.frames(30);
    },
    async run(h) {
        const t0 = Date.now();
        const until = (ms) => h.pause(Math.max(0, t0 + ms - Date.now()));
        const { center: c } = h.start;
        const { center: e, radius: R } = h.end;
        // every angle counted back from where the close drift ends (clearLine)
        const { alpha: L, beta: B } = h.line;
        const A = L - 1.6;
        // the first frame: the camera already moving, aimed at empty space to the side of the cloud
        const side = 520;
        const from = {
            alpha: A - 0.25,
            beta: 1.2,
            radius: R * 2.2,
            target: { x: c.x - Math.sin(A) * side, y: c.y, z: c.z + Math.cos(A) * side },
        };
        const flight = rig(
            h,
            [
                // the cloud swings into the frame (about 0.8 s in) and the camera settles on it
                {
                    alpha: A,
                    beta: 1.22,
                    radius: R * 1.9,
                    target: c,
                    ms: beat(11) - 500,
                    easing: "easeOut",
                    mark: "cloud",
                },
                // gravity pulls the storm into galaxies while the camera circles them
                {
                    alpha: A + 0.55,
                    beta: 1.15,
                    radius: R * 1.8,
                    target: e,
                    ms: beat(15) - beat(11) + 500,
                    easing: "easeInOut",
                    mark: "storm",
                },
                // the swell: the dive into APOE's galaxy, fast, landing slowly
                { node: HERO, alpha: L - 0.45, beta: B + 0.05, radius: 34, ms: 1600, easing: "easeOut", mark: "dive" },
                // close: a slow drift round APOE
                {
                    node: HERO,
                    alpha: L,
                    beta: B,
                    radius: 28,
                    ms: beat(23) - beat(15) - 1600,
                    easing: "easeInOut",
                    mark: "close",
                },
                // the first big hit: the pull out begins, slow ...
                {
                    node: HERO,
                    alpha: L + 0.05,
                    beta: B,
                    radius: 70,
                    ms: beat(24.5) - beat(23),
                    easing: "easeIn",
                    mark: "pull",
                },
                // ... and on the loudest hit it races out until the network is one point
                { node: HERO, alpha: L + 0.1, beta: B, radius: 4000, ms: 800, easing: "easeOut", mark: "point" },
                { node: HERO, alpha: L + 0.15, beta: B, radius: 4400, ms: 2500, easing: "linear", mark: "speck" },
            ],
            from,
        );
        await until(2000);
        h.mark("gravity");
        await onElement(h, (el) => el.session.layout.play());
        await until(beat(23));
        h.mark("hit");
        await shade(h, {
            shader: "lock-on-reticle",
            nodes: [HERO],
            params: { hudColor: SPECK, spin: 0.4, lineWidth: 2.4 },
        });
        await shade(h, { shader: "shockwave", nodes: [HERO], params: { ringColor: SPECK, ringGlow: 1.3 } });
        await flight;
    },
    holdMs: 1500,
};
