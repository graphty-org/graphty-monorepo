#!/usr/bin/env node
/**
 * The large-graph stories drawn WITH WebGPU on a real NVIDIA card, compared with the reference images in
 * test/gpu-screenshots/. The release train runs `--check` on its T4 (.github/workflows/gpu.yml); a developer runs it
 * on their own NVIDIA card (this package's CLAUDE.md, "GPU screenshots").
 *
 *   node scripts/gpu-screenshots.mjs --check   capture every story, compare each with its reference; exit 1 on any
 *                                              difference, a missing reference, or a story that did not run on the GPU
 *   node scripts/gpu-screenshots.mjs --update  capture every story and write the captures as the new references
 *
 * Options: --storybook <dir> (default storybook-static), --out <dir> (default ../tmp/gpu-screenshots), --stories
 * <name,...> (a subset of STORIES). GRAPHTY_EGL_LIB_DIR, when set, goes first on Chromium's LD_LIBRARY_PATH (a machine
 * without a system libEGL.so.1 needs it to reach the card; webgpu-graph-algorithms/CLAUDE.md).
 *
 * Each story is captured the way visual review captures (visual-review/capture/capture.mjs): its serve(), storyUrl()
 * and screenshotWholePage(), the pinned fonts, a 1200 x 900 viewport at device scale factor 2, UTC, a fixed start
 * time, and the wait on the story root's whenDone(). Two things differ, on purpose: WebGPU is left in the page and
 * Chromium gets the NVIDIA flag set, and the page is rasterized on the CPU (--disable-gpu-rasterization
 * --disable-accelerated-2d-canvas) so the picture depends on the positions the GPU computed and not on the card that
 * drew the canvas. The story's status line must say the layout ran on the GPU (it names the adapter's vendor,
 * "nvidia", on both the T4 and the RTX 4070 SUPER), and the page must offer a hardware adapter. The comparison is the gate's own (visual-review/trusted/lib/compare.mjs compareImages) at its defaults: the default
 * threshold, anti-aliased pixels not counted.
 *
 * The output directory holds report.json, index.html (every story's reference, capture and diff side by side),
 * captures/, references/ (the ones compared against) and diffs/.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

/* global document, requestAnimationFrame -- read only inside the page */

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(PKG, "..");
const { pinnedFonts, screenshotWholePage, serve, storyUrl } = await import(`${ROOT}/visual-review/capture/capture.mjs`);
const { compareImages, DEFAULT_THRESHOLD, readBaseline } = await import(
    `${ROOT}/visual-review/trusted/lib/compare.mjs`
);
const { default: pixelmatch } = await import(`${ROOT}/visual-review/trusted/vendor/pixelmatch.mjs`);
const requireVR = createRequire(`${ROOT}/visual-review/package.json`);
const { chromium } = requireVR("playwright");
const { PNG } = requireVR("pngjs");

/** The stories, by name; the folder they are in is found in the Storybook (FOLDERS). Each reference is <name>.png. */
export const STORIES = ["force-atlas-2", "fruchterman-reingold", "spring-electrical"].flatMap((layout) =>
    [2000, 10000, 50000].map((n) => `${layout}-at-${n}`),
);
/** The story folders' id prefixes, newest first: "Large graphs", and the older "Demo/Force Layouts By Size". */
export const FOLDERS = ["large-graphs", "demo-force-layouts-by-size"];
export const REFERENCES = join(PKG, "test/gpu-screenshots");

/** webgpu-graph-algorithms' NVIDIA flag set (vitest.config.ts BROWSER_FLAGS.nvidia), then CPU raster and the capture's text settings. */
const CHROMIUM_ARGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-angle=vulkan",
    "--disable-vulkan-surface",
    "--disable-gpu-rasterization",
    "--disable-accelerated-2d-canvas",
    "--force-color-profile=srgb",
    "--disable-lcd-text",
    "--font-render-hinting=none",
];
/** visual-review/capture/capture.mjs CLOCK_START. */
const CLOCK_START = "2026-01-01T12:00:00Z";
/** A 50,000-node story takes about two minutes; ten is a hang. */
const STORY_TIMEOUT = 600_000;

/**
 * The story id of each name in a Storybook's index.json.
 * @param {{ entries: Record<string, unknown> }} index the parsed index.json
 * @param {string[]} names story names
 * @returns {Map<string, string | null>} name to id, null when no folder has it
 */
export function resolveIds(index, names) {
    return new Map(names.map((n) => [n, FOLDERS.map((f) => `${f}--${n}`).find((id) => id in index.entries) ?? null]));
}

/**
 * Appends one line to the journal and flushes it to disk, so a crash during GPU work leaves its last command.
 * @param {string} file the journal
 * @param {string} line what is about to happen, or what just happened
 */
function journal(file, line) {
    appendFileSync(file, `${new Date().toISOString()} ${line}\n`);
    execFileSync("sync");
}

/**
 * Captures one story: the PNG and what the page says about the GPU.
 * @param {import("playwright").Browser} browser the browser
 * @param {string} url the story's URL
 * @returns {Promise<{ png: Buffer | null, status: string, adapter: object | null, error: string | null }>} the capture
 */
async function shoot(browser, url) {
    const context = await browser.newContext({
        viewport: { width: 1200, height: 900 },
        deviceScaleFactor: 2,
        timezoneId: "UTC",
        locale: "en-US",
    });
    const lines = [];
    try {
        const page = await context.newPage();
        page.setDefaultTimeout(STORY_TIMEOUT);
        page.on("console", (m) => lines.push(m.text()));
        page.on("pageerror", (e) => lines.push(e.message));
        await page.clock.install({ time: CLOCK_START });
        await page.clock.resume();
        await page.goto(url, { waitUntil: "load" });
        await page.waitForSelector("[data-demo]");
        await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all([...document.querySelectorAll("[data-demo]")].map((el) => el.whenDone()));
            await document.fonts.ready;
            await new Promise((r) => requestAnimationFrame(() => r()));
        });
        const adapter = await page.evaluate(async () => {
            const a = await navigator.gpu?.requestAdapter();
            return a
                ? {
                      vendor: a.info.vendor,
                      architecture: a.info.architecture,
                      device: a.info.device,
                      description: a.info.description,
                      isFallbackAdapter: a.info.isFallbackAdapter,
                  }
                : null;
        });
        const status = await page.evaluate(() => document.querySelector('[data-testid="status"]')?.textContent ?? "");
        const failed = lines.find((l) => l.includes("graphty demo failed"));
        if (failed) {
            return { png: null, status, adapter, error: failed };
        }
        if (!adapter || adapter.isFallbackAdapter) {
            return { png: null, status, adapter, error: "this Chromium has no hardware WebGPU adapter" };
        }
        if (!/^ran on GPU\b/m.test(status)) {
            return {
                png: null,
                status,
                adapter,
                error: `the layout did not run on the GPU: "${status.replaceAll("\n", " / ")}"`,
            };
        }
        return { png: await screenshotWholePage(page), status, adapter, error: null };
    } catch (e) {
        return {
            png: null,
            status: "",
            adapter: null,
            error: lines.length
                ? `${e.message.split("\n")[0]} (console: ${lines.slice(-3).join(" | ")})`
                : e.message.split("\n")[0],
        };
    } finally {
        await context.close();
    }
}

/**
 * A diff image: changed pixels red over a faded reference, as pixelmatch draws it. Null when the sizes differ.
 * @param {Buffer} a the reference PNG
 * @param {Buffer} b the capture PNG
 * @returns {Buffer | null} the diff PNG
 */
function diffImage(a, b) {
    const [x, y] = [PNG.sync.read(a), PNG.sync.read(b)];
    if (x.width !== y.width || x.height !== y.height) {
        return null;
    }
    const out = new PNG({ width: x.width, height: x.height });
    pixelmatch(x.data, y.data, out.data, x.width, x.height, { threshold: DEFAULT_THRESHOLD, includeAA: false });
    return PNG.sync.write(out);
}

const esc = (s) =>
    String(s).replaceAll(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * The report page: one row per story, its reference, capture and diff.
 * @param {object} report report.json's contents
 * @returns {string} the HTML
 */
function page(report) {
    const img = (p) => (p ? `<a href="${esc(p)}"><img src="${esc(p)}" loading="lazy"></a>` : "<p>none</p>");
    const rows = report.stories
        .map(
            (
                s,
            ) => `<section><h2 class="${s.result === "PASS" || s.result === "UPDATED" ? "ok" : "bad"}">${esc(s.result)} ${esc(s.name)}</h2>
<p>${esc(s.id ?? "not in this Storybook")} -- ${esc(s.detail)}</p><pre>${esc(s.status)}</pre>
<div class="row"><figure>${img(s.reference)}<figcaption>reference</figcaption></figure><figure>${img(s.capture)}<figcaption>capture</figcaption></figure><figure>${img(s.diff)}<figcaption>diff</figcaption></figure></div></section>`,
        )
        .join("\n");
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GPU screenshots</title>
<style>:root{color-scheme:light dark;--ok:#14532d;--bad:#b00020}body{font:14px system-ui,sans-serif;margin:16px;background:Canvas;color:CanvasText}
.row{display:flex;gap:8px;flex-wrap:wrap}figure{margin:0;flex:1 1 300px;min-width:0}img{width:100%;border:1px solid #888}
.ok{color:var(--ok)}.bad{color:var(--bad)}pre{white-space:pre-wrap}@media (prefers-color-scheme:dark){:root{--ok:#6ee7a0;--bad:#ff8a9a}}</style></head>
<body><h1>GPU screenshots: ${esc(report.mode)}, ${esc(report.summary)}</h1><p>${esc(report.when)}; adapter ${esc(JSON.stringify(report.adapter))}</p>
${rows}</body></html>\n`;
}

const DONE = { check: "passed", update: "updated" };

/**
 * Captures one story into its report entry, which keeps the reason when it cannot.
 * @param {object} entry the story's report entry
 * @param {{ browser: import("playwright").Browser, base: string, log: string, storybook: string }} ctx where to run
 * @returns {Promise<object | null>} shoot()'s result, or null when the Storybook has no such story
 */
async function captureStory(entry, { browser, base, log, storybook }) {
    if (!entry.id) {
        const tried = FOLDERS.map((f) => `${f}--${entry.name}`).join(" or ");
        entry.detail = `no story ${tried} in ${storybook}`;
        return null;
    }
    journal(log, `STORY BEGIN ${entry.id}`);
    const t0 = Date.now();
    const shot = await shoot(browser, `${base}${storyUrl(entry.id, null)}`);
    journal(log, `STORY END ${entry.id} ${Date.now() - t0} ms ${shot.error ?? "captured"}`);
    entry.status = shot.status;
    entry.seconds = Math.round((Date.now() - t0) / 1000);
    entry.detail = shot.error ?? "";
    return shot;
}

/**
 * Writes a capture, then either makes it the reference (update) or compares it with the reference (check).
 * @param {object} entry the story's report entry, given its result and detail
 * @param {Buffer} png the capture
 * @param {"check" | "update"} mode the mode
 * @param {string} out the output directory
 */
async function judge(entry, png, mode, out) {
    const { name } = entry;
    entry.capture = `captures/${name}.png`;
    await writeFile(join(out, entry.capture), png);
    const refPath = join(REFERENCES, `${name}.png`);
    if (mode === "update") {
        await mkdir(REFERENCES, { recursive: true });
        await writeFile(refPath, png);
        entry.result = "UPDATED";
        entry.detail = `wrote ${refPath}`;
        return;
    }
    const ref = existsSync(refPath) ? await readBaseline(refPath) : null;
    if (!ref) {
        entry.detail = `no reference ${refPath}: run --update on a GPU machine`;
        return;
    }
    entry.reference = `references/${name}.png`;
    await copyFile(refPath, join(out, entry.reference));
    const r = compareImages(ref, png, { threshold: DEFAULT_THRESHOLD, includeAA: false });
    entry.changedPixels = r.changedPixels;
    entry.bbox = r.bbox;
    if (r.status === "unchanged") {
        entry.result = "PASS";
        entry.detail = r.baseline === r.capture ? "byte-identical" : "no pixel past the threshold";
        return;
    }
    const diff = diffImage(ref, png);
    if (diff) {
        entry.diff = `diffs/${name}.png`;
        await writeFile(join(out, entry.diff), diff);
    }
    entry.detail = `${r.changedPixels} pixels differ (reference ${r.baselineSize.join("x")}, capture ${r.size.join("x")}, box ${JSON.stringify(r.bbox)})`;
}

async function main() {
    const { values } = parseArgs({
        options: {
            check: { type: "boolean" },
            update: { type: "boolean" },
            storybook: { type: "string", default: join(PKG, "storybook-static") },
            out: { type: "string", default: join(ROOT, "tmp/gpu-screenshots") },
            stories: { type: "string" },
        },
    });
    if (values.check === values.update) {
        console.error("usage: gpu-screenshots.mjs --check | --update [--storybook dir] [--out dir] [--stories a,b]");
        process.exit(2);
    }
    const mode = values.check ? "check" : "update";
    const names = values.stories ? values.stories.split(",") : STORIES;
    const out = resolve(values.out);
    await rm(out, { recursive: true, force: true });
    for (const d of ["captures", "references", "diffs"]) {
        await mkdir(join(out, d), { recursive: true });
    }
    const log = join(out, "journal.log");
    const ids = resolveIds(JSON.parse(await readFile(join(values.storybook, "index.json"), "utf8")), names);

    const fontconfig = join(ROOT, "visual-fonts/fonts.conf");
    await pinnedFonts(fontconfig); // throws on a font that is still a Git LFS pointer
    const cache = await mkdtemp(join(tmpdir(), "gpu-screenshots-fonts-"));
    const egl = process.env.GRAPHTY_EGL_LIB_DIR;
    const env = { ...process.env, FONTCONFIG_FILE: fontconfig, XDG_CACHE_HOME: cache, TZ: "UTC" };
    if (egl) {
        env.LD_LIBRARY_PATH = [egl, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":");
    }
    journal(log, `BEGIN ${mode} storybook=${values.storybook} egl=${egl ?? "-"} args=${CHROMIUM_ARGS.join(" ")}`);
    const [server, base] = await serve(values.storybook);
    const browser = await chromium.launch({ args: CHROMIUM_ARGS, env });
    const stories = [];
    let adapter = null;
    try {
        for (const name of names) {
            const entry = {
                name,
                id: ids.get(name),
                result: "FAIL",
                detail: "",
                status: "",
                capture: null,
                reference: null,
                diff: null,
            };
            stories.push(entry);
            const shot = await captureStory(entry, { browser, base, log, storybook: values.storybook });
            adapter ??= shot?.adapter ?? null;
            if (shot?.png) {
                await judge(entry, shot.png, mode, out);
            }
            console.log(
                entry.result === "PASS" ? `PASS ${name} (${entry.detail})` : `${entry.result} ${name}: ${entry.detail}`,
            );
        }
    } finally {
        await browser.close();
        server.close();
        await rm(cache, { recursive: true, force: true });
    }
    const failed = stories.filter((s) => s.result === "FAIL").map((s) => s.name);
    const report = {
        mode,
        when: new Date().toISOString(),
        adapter,
        threshold: DEFAULT_THRESHOLD,
        summary: failed.length
            ? `${failed.length} of ${stories.length} failed: ${failed.join(", ")}`
            : `all ${stories.length} ${DONE[mode]}`,
        failed,
        stories,
    };
    await writeFile(join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(join(out, "index.html"), page(report));
    journal(log, `END ${report.summary}`);
    console.log(`${report.summary}; report: ${join(out, "index.html")}`);
    process.exit(failed.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await main();
}
