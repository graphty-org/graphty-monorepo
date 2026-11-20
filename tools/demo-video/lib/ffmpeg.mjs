/** ffmpeg (a static build in <main>/tmp/demo-video/bin) and the frame statistics the capture choice rests on. */
import { spawn } from "node:child_process";

import { FFMPEG } from "./env.mjs";

const ended = (code, signal) => (signal ? "killed by " + signal : "exited " + code);

/**
 * Run ffmpeg; rejects with the last lines of its log.
 * @param args - ffmpeg's arguments after the common ones
 * @param options - how much it logs
 * @param options.quiet - errors only (false: the full log, for filters that report through it)
 * @returns its stderr
 */
export function run(args, { quiet = true } = {}) {
    return new Promise((ok, no) => {
        const p = spawn(FFMPEG, ["-hide_banner", "-y", "-loglevel", quiet ? "error" : "info", ...args]);
        let err = "";
        p.stderr.on("data", (d) => (err += d));
        p.on("error", no);
        // a kill has no stderr of its own: say which signal ended it
        p.on("exit", (code, signal) =>
            code === 0
                ? ok(err)
                : no(
                      new Error(
                          `ffmpeg ${ended(code, signal)}: ${args.join(" ")}\n${err.split("\n").slice(-15).join("\n")}`,
                      ),
                  ),
        );
    });
}

/**
 * Length of a media file in seconds, from ffmpeg's own probe line.
 * @param file - the media file
 * @returns seconds
 */
export async function duration(file) {
    const err = await new Promise((ok) => {
        const p = spawn(FFMPEG, ["-hide_banner", "-i", file]);
        let e = "";
        p.stderr.on("data", (d) => (e += d));
        p.on("exit", () => ok(e));
    });
    const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(err);
    if (!m) throw new Error(`no duration for ${file}`);
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/**
 * How smooth a video is: every decoded frame, and the frames that differ from the one before
 * (mpdecimate with tight thresholds, so only true repeats count as duplicates).
 * @param file - the video
 * @param span - the part to measure
 * @param span.from - its start, s
 * @param span.to - its end, s
 * @returns frames, unique frames, their rates, the longest gap between unique frames, and
 *   stutters: gaps between unique frames longer than 2.5 frames of the file's own rate
 */
export async function smoothness(file, { from = 0, to = 1e9 } = {}) {
    const span = ["-ss", String(from), "-t", String(to - from)];
    const all = await run([...span, "-i", file, "-vf", "showinfo", "-f", "null", "-"], { quiet: false });
    const kept = await run(
        [...span, "-i", file, "-vf", "mpdecimate=hi=64*2:lo=64:frac=0.1:max=0,showinfo", "-f", "null", "-"],
        { quiet: false },
    );
    const times = (s) => [...s.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]));
    const t = times(all);
    const u = times(kept);
    const seconds = t.length > 1 ? t.at(-1) - t[0] : 0;
    const step = seconds / Math.max(1, t.length - 1);
    let maxGap = 0;
    let stutters = 0;
    for (let i = 1; i < u.length; i++) {
        const g = u[i] - u[i - 1];
        maxGap = Math.max(maxGap, g);
        if (g > step * 2.5) stutters++;
    }
    return {
        frames: t.length,
        fileFps: +(t.length / Math.max(seconds, 1e-9)).toFixed(2),
        unique: u.length,
        seconds: +seconds.toFixed(2),
        uniqueFps: +(u.length / Math.max(seconds, 1e-9)).toFixed(2),
        duplicates: t.length - u.length,
        maxGapMs: Math.round(maxGap * 1000),
        stutters,
    };
}
