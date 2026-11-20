/**
 * Ways to film the page. record.mjs uses `screencast`, the winner of bench/capture-bench.mjs
 * (README.md, "How the page is filmed"); the others stay for that comparison.
 *
 *   screencast    CDP Page.startScreencast: a JPEG per compositor frame with its timestamp, put on
 *                 the constant-fps grid (lib/grid.mjs) and encoded as an image sequence
 *   displaymedia  in-page getDisplayMedia of the current tab + MediaRecorder (VP9 webm, 40 Mbps)
 *   recordvideo   Playwright's recordVideo (launch with context.recordVideo; nothing to start here)
 *
 * Each start() returns { stop() -> { file, frames?, t0, t1 } }; t0/t1 are epoch ms of the first and
 * last moment filmed, so input events logged with Date.now() line up with the video.
 */
import { createWriteStream, linkSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { FPS, H, W } from "./env.mjs";
import { run } from "./ffmpeg.mjs";
import { gridSlots } from "./grid.mjs";

/**
 * CDP screencast into a folder of JPEGs plus a constant-fps H.264 file.
 * @param page - the Playwright page
 * @param dir - where the frames go (emptied first)
 * @param out - the mp4 to write on stop
 * @param options - how
 * @param options.quality - JPEG quality of each frame
 * @param options.fps - the mp4's constant rate
 * @returns `{ stop() }`, which writes the mp4 and resolves with `{ file, frames, t0, t1 }`
 */
export async function screencast(page, dir, out, { quality = Number(process.env.DEMO_JPEG) || 92, fps = FPS } = {}) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const cdp = await page.context().newCDPSession(page);
    const frames = []; // { file, t } t in epoch ms
    let pending = Promise.resolve();
    cdp.on("Page.screencastFrame", (f) => {
        // ack first: the browser sends the next frame only after the ack
        pending = cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
        const file = join(dir, `f${String(frames.length).padStart(6, "0")}.jpg`);
        frames.push({ file, t: f.metadata.timestamp * 1000 });
        writeFileSync(file, Buffer.from(f.data, "base64"));
    });
    const t0 = Date.now();
    await cdp.send("Page.startScreencast", { format: "jpeg", quality, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    // the browser sends the current picture at once, then a frame each time the page changes
    return {
        async stop() {
            const t1 = Date.now();
            await cdp.send("Page.stopScreencast").catch(() => {});
            await pending;
            await cdp.detach().catch(() => {});
            if (!frames.length) throw new Error("the screencast sent no frames");
            const T0 = Math.min(t0, frames[0].t);
            const grid = gridSlots(frames, T0, t1, fps);
            // one numbered file per slot (a hard link: no copy), read back at exactly `fps`
            grid.files.forEach((f, i) => linkSync(f, join(dir, `s${String(i).padStart(6, "0")}.jpg`)));
            await run([
                "-framerate",
                String(fps),
                "-i",
                join(dir, "s%06d.jpg"),
                "-vf",
                `scale=${W}:${H}:flags=lanczos,format=yuv420p`,
                "-c:v",
                "libx264",
                "-preset",
                "slow",
                "-crf",
                "14",
                "-r",
                String(fps),
                "-movflags",
                "+faststart",
                out,
            ]);
            return {
                file: out,
                frames: frames.map((f) => f.t),
                t0: T0,
                t1,
                slots: grid.files.length,
                filled: grid.filled,
            };
        },
    };
}

/**
 * Tab capture inside the page. Needs Chromium launched with --auto-accept-this-tab-capture and a
 * user activation (a click) shortly before.
 * @param page - the Playwright page
 * @param out - the webm to write
 * @param options - how
 * @param options.mimeType - MediaRecorder's type
 * @param options.bitrate - bits a second
 * @returns `{ stop() }`, which resolves with `{ file, t0, t1 }`
 */
export async function displaymedia(page, out, { mimeType = "video/webm;codecs=vp9", bitrate = 40_000_000 } = {}) {
    const ws = createWriteStream(out);
    await page.exposeFunction("__demoChunk", (b64) => ws.write(Buffer.from(b64, "base64")));
    const t0 = Date.now();
    await page.evaluate(recordTab, [mimeType, bitrate]);
    return {
        async stop() {
            const t1 = Date.now();
            await page.evaluate(() => globalThis.__demoStop());
            await new Promise((ok) => ws.end(ok));
            return { file: out, t0, t1 };
        },
    };
}

// runs in the page: records the tab, sending each chunk to Node as base64
async function recordTab([mimeType, bitrate]) {
    const stream = await globalThis.navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 60, max: 60 }, width: 1920, height: 1080, cursor: "never" },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
    });
    const rec = new globalThis.MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
    const send = async (blob) => {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let s = "";
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCodePoint(...bytes.subarray(i, i + 0x8000));
        await globalThis.__demoChunk(globalThis.btoa(s));
    };
    let chain = Promise.resolve();
    rec.ondataavailable = (e) => {
        chain = chain.then(() => send(e.data));
    };
    // stopping the tab-capture track segfaults headless Chromium 143's browser process: only the
    // recorder stops, and the track ends with the browser
    const stopped = new Promise((ok) => {
        rec.onstop = () => ok(chain);
    });
    globalThis.__demoStop = () => {
        rec.stop();
        return stopped;
    };
    rec.start(500);
}
