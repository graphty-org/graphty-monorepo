// Frame pacing (design section 10.2, rule 17): XR frame deltas, the JavaScript time of each frame
// and the time spent in technique hooks, summarized to the log every 2 s. "Jittery images" in a
// headset are almost always missed frames, so this is logged from the first build.

import type { Scene } from "@babylonjs/core";

const N = 600;

/** Rolling frame samples and their summary. */
export interface FrameStats {
    /** Call at the start of each XR frame. */
    xrFrame(now: number): void;
    addHookMs(ms: number): void;
    readonly count: number;
    /** Summary of the last `n` frames (all kept frames by default). */
    summary(n?: number): FrameSummary;
}

/** A frame summary, in ms. */
export interface FrameSummary {
    frames: number;
    deltaP50: number;
    deltaP95: number;
    deltaMax: number;
    misses: number;
    jsP50: number;
    jsP95: number;
    jsMax: number;
    over50: number;
    hooksP95: number;
}

const pct = (xs: Float32Array, p: number): number => {
    if (xs.length === 0) {
        return 0;
    }
    const s = Float32Array.from(xs).sort();
    return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 100) / 100;
};

/**
 * Start collecting frame statistics.
 * @param scene - the scene whose render is timed
 * @param report - called every 2 s with a summary of those 2 s, while XR frames arrive
 * @returns the stats
 */
export function createFrameStats(scene: Scene, report: (s: FrameSummary) => void): FrameStats {
    const delta = new Float32Array(N);
    const js = new Float32Array(N);
    const hooks = new Float32Array(N);
    let i = 0;
    let count = 0;
    let last = 0;
    let start = 0;
    let lastReport = 0;
    let sinceReport = 0;

    scene.onBeforeRenderObservable.add(
        () => {
            start = performance.now();
        },
        undefined,
        true,
    );
    scene.onAfterRenderObservable.add(() => {
        js[i] = performance.now() - start;
    });

    const stats: FrameStats = {
        get count() {
            return count;
        },
        xrFrame(now) {
            i = (i + 1) % N;
            delta[i] = last ? now - last : 0;
            hooks[i] = 0;
            js[i] = 0;
            last = now;
            count++;
            sinceReport++;
            if (now - lastReport >= 2000) {
                if (lastReport) {
                    report(stats.summary(sinceReport));
                }
                lastReport = now;
                sinceReport = 0;
            }
        },
        addHookMs(ms) {
            hooks[i] += ms;
        },
        summary(n = Math.min(count, N)) {
            const take = (a: Float32Array): Float32Array => {
                const out = new Float32Array(Math.min(n, N));
                for (let k = 0; k < out.length; k++) {
                    out[k] = a[(i - k + N) % N];
                }
                return out;
            };
            const d = take(delta);
            const j = take(js);
            const p50 = pct(d, 0.5);
            return {
                frames: d.length,
                deltaP50: p50,
                deltaP95: pct(d, 0.95),
                deltaMax: pct(d, 1),
                misses: d.filter((x) => x > p50 * 1.5).length,
                jsP50: pct(j, 0.5),
                jsP95: pct(j, 0.95),
                jsMax: pct(j, 1),
                over50: j.filter((x) => x > 50).length,
                hooksP95: pct(take(hooks), 0.95),
            };
        },
    };
    return stats;
}
