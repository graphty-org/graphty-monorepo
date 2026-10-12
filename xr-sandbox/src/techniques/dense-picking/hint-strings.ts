// Pure logic of the hint tags: the tag strings, the cone of nodes around a ray, and what a typed
// prefix matches. No Babylon and no DOM, so the Node tests import it.
//
// `hintStrings` is copied from Vimium (content_scripts/link_hints.js, `hintStrings`), with two
// changes: a minimum tag length (the sandbox always shows two letters) and the leaves sorted before
// they are cut to `count`, so a small set of tags has distinct first letters instead of all sharing
// one. Vimium's license:
//
//   Copyright (c) 2010 Phil Crosby, Ilya Sukhar.
//
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
//   associated documentation files (the "Software"), to deal in the Software without restriction,
//   including without limitation the rights to use, copy, modify, merge, publish, distribute,
//   sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
//   furnished to do so, subject to the following conditions:
//
//   The above copyright notice and this permission notice shall be included in all copies or
//   substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
//   NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//   NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
//   OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
//   CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/** Letters whose spoken names are easy to tell apart: a to z without b, d, e, p, t, v. */
export const VOICE_SAFE = "acfghijklmnoqrsuwxyz";
/** Vimium's default alphabet (home row first), for a keyboard-only owner. */
export const HOME_ROW = "sadfjklewcmpgh";

/**
 * Tags for `count` targets, none a prefix of another (Vimium's algorithm).
 * @param count - how many tags
 * @param chars - the alphabet
 * @param minLength - the shortest tag
 * @returns `count` tags
 */
export function hintStrings(count: number, chars: string, minLength = 2): string[] {
    if (count <= 0) {
        return [];
    }
    let hints = [""];
    let offset = 0;
    while (hints.length - offset < count || hints.length === 1 || hints[offset].length < minLength) {
        const hint = hints[offset++];
        for (const ch of chars) {
            hints.push(ch + hint);
        }
    }
    // Sorted before the cut (Vimium sorts after it), then reversed: the first `chars.length` tags
    // differ in their first letter, so the first keystroke already narrows to one target.
    hints = hints
        .slice(offset)
        .sort((a, b) => a.localeCompare(b))
        .slice(0, count);
    return hints.map((s) => Array.from(s).reverse().join(""));
}

/** A ray, in the graph's world coordinates. */
interface RayLike {
    origin: ArrayLike<number>;
    dir: ArrayLike<number>;
}

/**
 * The nodes within `halfAngleRad` of a ray, nearest the ray's axis first.
 * @param world - x y z per node, world meters
 * @param ray - origin and unit direction
 * @param halfAngleRad - the cone's half angle
 * @param include - whether a node may be tagged (visible), or undefined for all
 * @returns node indices
 */
export function coneMembers(
    world: ArrayLike<number>,
    ray: RayLike,
    halfAngleRad: number,
    include?: (i: number) => boolean,
): number[] {
    const [ox, oy, oz] = [ray.origin[0], ray.origin[1], ray.origin[2]];
    const [dx, dy, dz] = [ray.dir[0], ray.dir[1], ray.dir[2]];
    const cos = Math.cos(halfAngleRad);
    const hits: { i: number; c: number }[] = [];
    const n = world.length / 3;
    for (let i = 0; i < n; i++) {
        const vx = world[i * 3] - ox;
        const vy = world[i * 3 + 1] - oy;
        const vz = world[i * 3 + 2] - oz;
        const t = vx * dx + vy * dy + vz * dz;
        if (t <= 0) {
            continue;
        }
        const c = t / Math.hypot(vx, vy, vz);
        if (c >= cos && (!include || include(i))) {
            hits.push({ i, c });
        }
    }
    hits.sort((a, b) => b.c - a.c || a.i - b.i);
    return hits.map((h) => h.i);
}

/**
 * The letters that may come next after a typed prefix.
 * @param tags - every tag shown
 * @param typed - what was typed so far
 * @returns the next letters, sorted, no repeats
 */
export function nextLetters(tags: readonly string[], typed: string): string[] {
    const out = new Set<string>();
    for (const t of tags) {
        if (t.length > typed.length && t.startsWith(typed)) {
            out.add(t[typed.length]);
        }
    }
    return [...out].sort((a, b) => a.localeCompare(b));
}
