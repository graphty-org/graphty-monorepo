/**
 * Where things are, and the browser the recorder drives: the built graphty app served in-process
 * on loopback, in headless Chromium drawn on this machine's NVIDIA card, with the dry run's own
 * server and GPU browser (graphty/acceptance/run.mjs `serve` and `gpuContext`: its GPU flags, the
 * extracted libEGL) and its rule that anything but the NVIDIA renderer is refused.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { gpuContext, serve as serveDist } from "../../../graphty/acceptance/run.mjs";

export const TOOL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const REPO = resolve(TOOL, "../..");
const common = spawnSync("git", ["-C", TOOL, "rev-parse", "--path-format=absolute", "--git-common-dir"], {
    encoding: "utf8",
});
/** The main checkout: every generated file goes under its tmp/demo-video, never into a worktree. */
export const MAIN = dirname(common.stdout.trim());
export const OUT = process.env.DEMO_VIDEO_OUT || join(MAIN, "tmp/demo-video");
export const FFMPEG = process.env.DEMO_FFMPEG || join(OUT, "bin/ffmpeg");
export const DIST = process.env.DEMO_DIST || join(REPO, "graphty/dist");
export const GATE = join(REPO, "design/ui/studio/tool/with-browser.sh");
export const W = 1920;
export const H = 1080;
// 30, not 60: the CDP screencast delivers about 30 frames a second at 1920x1080 while the app draws 55-60
// (bench/capture-bench.mjs; README.md, "How the page is filmed").
export const FPS = Number(process.env.DEMO_FPS) || 30;

const EGL = process.env.DRY_RUN_EGL_DIR || join(MAIN, "tmp/egl/root/usr/lib/x86_64-linux-gnu");

/** Every experiment id graphty-element declares, read from its registry so a new one is never missed. */
export const FEATURE_IDS = [
    ...readFileSync(join(REPO, "graphty-element/src/features/registry.ts"), "utf8")
        .split("export type FeatureId =")[1]
        .split(";")[0]
        .matchAll(/"([a-z0-9-]+)"/g),
].map((m) => m[1]);

/**
 * Make a folder (and its parents) if missing.
 * @param d - the folder
 * @returns the folder
 */
export function mkdirp(d) {
    mkdirSync(d, { recursive: true });
    return d;
}

/**
 * The built app on 127.0.0.1 at an ephemeral port, served in-process the way the dry run serves it.
 * @param dist - the built app's folder
 * @returns its origin and a close function
 */
export async function serve(dist = DIST) {
    if (!existsSync(join(dist, "index.html")))
        throw new Error(`no built app at ${dist}: run tools/low-priority.sh pnpm exec nx run graphty:build`);
    const http = await serveDist(dist);
    return { origin: `http://127.0.0.1:${http.address().port}/`, close: () => http.close() };
}

/**
 * The app's address with every experiment switched on (DEMO_FEATURES_OFF=a,b leaves some off, for comparison).
 * @param origin - the server's origin
 * @param extra - more query, starting with "&"
 * @param featuresOff - experiments this clip leaves off (a clip's `featuresOff`: an experiment whose defect would spoil the shot)
 * @returns the address
 */
export const appUrl = (origin, extra = "", featuresOff = []) => {
    const off = new Set([...(process.env.DEMO_FEATURES_OFF ?? "").split(","), ...featuresOff]);
    return `${origin}?features=${FEATURE_IDS.filter((id) => !off.has(id)).join(",")}${extra}`;
};

/**
 * A browser on the NVIDIA card at 1920x1080, or a loud failure: SwiftShader is never used.
 * @param [o] - options
 * @param [o.args] - extra Chromium flags
 * @param [o.context] - extra context options (recordVideo for the capture comparison)
 * @param [o.channel] - "chromium" for full Chromium in new headless mode (tab capture needs it)
 * @returns the context, its page, the renderer's name and a close function
 */
export async function launch(o = {}) {
    if (process.env.DEMO_GATED !== "1")
        throw new Error("launch browsers through the gate: BROWSER_GPU=1 design/ui/studio/tool/with-browser.sh ...");
    if (!existsSync(join(EGL, "libEGL.so.1"))) throw new Error(`the GPU flags need libEGL.so.1 in ${EGL}`);
    const { chromium } = await import("playwright");
    const profile = await mkdtemp(join(tmpdir(), "graphty-demo-video-"));
    const { context, page, renderer } = await gpuContext(chromium, profile, {
        ...(o.channel ? { channel: o.channel } : {}),
        args: o.args ?? [],
        viewport: { width: W, height: H },
        deviceScaleFactor: 1,
        colorScheme: "light",
        ...o.context,
    });
    const close = () => context.close().finally(() => rm(profile, { recursive: true, force: true }));
    if (!/NVIDIA/i.test(renderer)) {
        await close();
        throw new Error(`the browser draws with "${renderer}", not the NVIDIA card; recording runs only on the GPU`);
    }
    return { context, page, renderer, close };
}
