/**
 * The math behind the recorder's human-like hand, kept free of the browser so path.test.mjs can
 * check it: seeded randomness, aim points, Fitts's-law durations, curved paths with a minimum-jerk
 * speed profile, an occasional overshoot, and typing rhythm. Tuned calmer than a real hand so a
 * viewer can follow it on video.
 */

/**
 * A seeded random source (mulberry32): the same seed gives the same clip on every re-record.
 * @param seed - a number, or any text (the clip id)
 * @returns a function giving numbers in [0, 1), with `range(lo, hi)` and `normal()` beside it
 */
export function rng(seed) {
    let a = typeof seed === "number" ? seed >>> 0 : hash(String(seed));
    const next = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.range = (lo, hi) => lo + (hi - lo) * next();
    // standard normal, Box-Muller
    next.normal = () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
    return next;
}

// FNV-1a of a text, for seeding
function hash(s) {
    let h = 2166136261;
    for (const c of s) h = Math.imul(h ^ c.codePointAt(0), 16777619);
    return h >>> 0;
}

/**
 * Smooth start and stop: position along the path (0..1) at time fraction s (0..1).
 * @param s - the fraction of the move's time gone
 * @returns the fraction of the way covered
 */
export const minJerk = (s) => {
    const x = Math.min(1, Math.max(0, s));
    return x * x * x * (10 - 15 * x + 6 * x * x);
};

export const MOVE = { a: 320, b: 170, min: 380, max: 1400 }; // ms; calmer than a real hand

/**
 * Fitts's law: time to reach a target of `size` px at `dist` px.
 * @param dist - how far, px
 * @param size - the target's smaller side, px
 * @returns ms, clamped to [MOVE.min, MOVE.max]
 */
export function fittsMs(dist, size) {
    if (dist < 2) return 0;
    const ms = MOVE.a + MOVE.b * Math.log2(dist / Math.max(8, size) + 1);
    return Math.round(Math.min(MOVE.max, Math.max(MOVE.min, ms)));
}

/**
 * Where a hand lands in a box: a random point in its inner area (the middle 50% of each side,
 * normal around the center), never dead center every time.
 * @param box - the target, {x, y, width, height}
 * @param r - the clip's random source
 * @returns the point aimed at
 */
export function aimPoint(box, r) {
    const pick = (lo, len) => {
        const v = Math.max(-1, Math.min(1, r.normal() / 2.2)); // mostly within the inner half
        return lo + len / 2 + v * len * 0.25;
    };
    return { x: pick(box.x, box.width), y: pick(box.y, box.height) };
}

/**
 * Whether a point is inside a box's inner area (the middle 50% of each side).
 * @param p - the point
 * @param b - the box
 * @returns true when it is
 */
export const inInner = (p, b) =>
    p.x >= b.x + b.width * 0.25 - 1e-6 &&
    p.x <= b.x + b.width * 0.75 + 1e-6 &&
    p.y >= b.y + b.height * 0.25 - 1e-6 &&
    p.y <= b.y + b.height * 0.75 + 1e-6;

const lerp = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

const clampTo = (p, b) => (b ? { x: Math.min(b.x1, Math.max(b.x0, p.x)), y: Math.min(b.y1, Math.max(b.y0, p.y)) } : p);
const inside = (p, b) => !b || (p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1);

/**
 * A cubic Bezier from p0 to p3 with a small random bend to one side. A long move always bends a
 * little (a hand rarely moves dead straight). Within `bounds` the curve stays on screen: it bends
 * away from an edge it would cross, and its control points are kept inside (a Bezier stays inside
 * its control points, so every point of it does).
 * @param p0 - start
 * @param p3 - end
 * @param r - the clip's random source
 * @param bendScale - how much of the usual bend (a correction bends less)
 * @param bounds - {x0, y0, x1, y1} the curve stays in, or null
 * @returns the four control points
 */
function curve(p0, p3, r, bendScale = 1, bounds = null) {
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    const d = Math.hypot(dx, dy) || 1;
    const n = { x: -dy / d, y: dx / d }; // unit normal
    const side = r() < 0.5 ? -1 : 1;
    const frac = r.range(0.04, 0.14);
    const bend = d * (d > 250 && bendScale === 1 ? Math.max(frac, 0.07) : frac) * bendScale;
    const c1 = lerp(p0, p3, r.range(0.25, 0.4));
    const c2 = lerp(p0, p3, r.range(0.6, 0.75));
    const k2 = r.range(0.5, 1);
    const controls = (s) => [
        { x: c1.x + n.x * bend * s, y: c1.y + n.y * bend * s },
        { x: c2.x + n.x * bend * k2 * s, y: c2.y + n.y * bend * k2 * s },
    ];
    let c = controls(side);
    if (!c.every((p) => inside(p, bounds)) && controls(-side).every((p) => inside(p, bounds))) c = controls(-side);
    return [p0, clampTo(c[0], bounds), clampTo(c[1], bounds), p3];
}

// the point at t (0..1) on a cubic Bezier
function bezier([p0, p1, p2, p3], t) {
    const u = 1 - t;
    return {
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
}

/**
 * A planned move: one or two segments (the second a short correction after an overshoot), each a
 * curve run at minimum-jerk speed over its Fitts's-law time.
 * @param from start point
 * @param to the aim point
 * @param size the target's smaller side, px (Fitts's width)
 * @param r - the clip's random source
 * @param options - how to move
 * @param options.slow - a factor on every duration (drags are slower)
 * @param options.bounds - {x0, y0, x1, y1}: the path stays inside (the screen, inset a little;
 *   grown to hold both ends), so the drawn cursor, which only follows the mouse on screen, never sticks
 * @returns the segments, the total ms, and at(t): the point t ms into the move and its progress s (0..1)
 */
export function planMove(from, to, size, r, { slow = 1, bounds = null } = {}) {
    const b = bounds && {
        x0: Math.min(bounds.x0, from.x, to.x),
        y0: Math.min(bounds.y0, from.y, to.y),
        x1: Math.max(bounds.x1, from.x, to.x),
        y1: Math.max(bounds.y1, from.y, to.y),
    };
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const segments = [];
    if (dist > 450 && r() < 0.3) {
        // overshoot by 3-6% of the distance along the way, a little off to the side, then correct
        const k = r.range(0.03, 0.06);
        const dx = (to.x - from.x) / dist;
        const dy = (to.y - from.y) / dist;
        const lateral = r.range(-0.4, 0.4) * k * dist;
        const over = clampTo({ x: to.x + dx * k * dist - dy * lateral, y: to.y + dy * k * dist + dx * lateral }, b);
        segments.push(
            { curve: curve(from, over, r, 1, b), ms: fittsMs(dist, size) * slow },
            { curve: curve(over, to, r, 0.3, b), ms: Math.round(r.range(200, 280) * slow) },
        );
    } else {
        segments.push({ curve: curve(from, to, r, 1, b), ms: fittsMs(dist, size) * slow });
    }
    const ms = segments.reduce((t, s) => t + s.ms, 0);
    const at = (t) => {
        if (ms === 0) return { ...to, s: 1 };
        let rest = Math.max(0, Math.min(ms, t));
        let done = 0;
        for (const seg of segments) {
            if (rest <= seg.ms || seg === segments.at(-1)) {
                const p = bezier(seg.curve, minJerk(seg.ms ? rest / seg.ms : 1));
                return { ...p, s: (done + Math.min(rest, seg.ms)) / ms };
            }
            rest -= seg.ms;
            done += seg.ms;
        }
        return { ...to, s: 1 };
    };
    return { segments, ms, at };
}

// 5.5 characters a second (66 wpm): a competent typist, a little above the 52 wpm mean of 168,000
// typists (Dhakal et al., CHI 2018); round 1's 9.5 (114 wpm) looked unreal. `think` is the look at the
// field before the first key, `after` the beat after the last (tmp/demo-video/rework/research-craft.md, rule 7).
export const TYPE = { cps: 5.5, sigma: 0.28, min: 80, max: 420, think: [350, 600], after: [300, 500] };

/**
 * Per-key delays for typing `text`, log-normal around TYPE.cps characters a second, longer after a
 * space and before a capital. No typos.
 * @param text - what is typed
 * @param r - the clip's random source
 * @returns ms before each character
 */
export function typingDelays(text, r) {
    const median = 1000 / TYPE.cps;
    return [...text].map((ch, i) => {
        let ms = median * Math.exp(TYPE.sigma * r.normal());
        if (i > 0 && text[i - 1] === " ") ms *= 1.45;
        if (/[A-Z]/.test(ch)) ms *= 1.35;
        return Math.round(Math.min(TYPE.max, Math.max(TYPE.min, ms)));
    });
}
