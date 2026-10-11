#!/usr/bin/env node
// The dry run (design section 11): opens each preset in headless Chromium on an emulated headset
// (IWER, installed by the page with ?emulate=<profile>), enters VR, and checks that nothing
// catastrophic happens before the owner puts a headset on: console errors, frame time, still-head
// jitter, idle GUI textures, selecting a node by controller trigger or hand pinch, opening the gear
// panel, and the log reaching the log server. Writes report.json and one screenshot per run, and
// exits non-zero on any failure.
//
// Run it inside a browser slot, against the preview server (the build the headsets get):
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/run.mjs --url https://dev.ato.ms:<port>/ --logs http://127.0.0.1:<log port> \
//     --out <main>/tmp/xr-sandbox/dryrun
// Options: --profiles a,b (default quest3-controllers,quest3-hands), --presets a,b (default all),
// --frames 300, --alone (also every technique alone).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun" },
        logs: { type: "string" },
        profiles: { type: "string", default: "quest3-controllers,quest3-hands" },
        presets: { type: "string" },
        frames: { type: "string", default: "300" },
        // Also run every technique alone (preset=empty&on=<id>) after the presets.
        alone: { type: "boolean", default: false },
    },
});
if (!args.url) {
    console.error(
        "usage: run.mjs --url https://dev.ato.ms:<port>/ [--logs http://127.0.0.1:<port>] [--out dir] [--profiles a,b] [--presets a,b]",
    );
    process.exit(2);
}
const base = new URL(args.url);
const FRAMES = Number(args.frames);
// Tolerances (design section 11.2).
const JITTER_MM = 0.05;
const JITTER_DEG = 0.01;
const JS_FRAME_MS = 50;
const HOOKS_P95_MS = 2;

mkdirSync(args.out, { recursive: true });
// Headless Chromium crashes at startup on this machine without it (a font-thread env race).
process.env.FC_FONTATIONS = "1";
const browser = await chromium.launch({
    headless: true,
    args: [
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--ignore-gpu-blocklist",
        "--autoplay-policy=no-user-gesture-required",
    ],
});

/** Wait until `fn` (run in the page) is truthy. */
const until = (page, fn, arg, timeout = 60_000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
/** Wait until the session has rendered `n` more XR frames. */
const frames = async (page, n) => {
    const start = await page.evaluate(() => globalThis.__sandbox.xrFrames());
    await until(page, ([s, k]) => globalThis.__sandbox.xrFrames() >= s + k, [start, n]);
};

/**
 * Aim, press and release; return the hover at the press and the arbiter and command entries logged.
 */
const pressAt = async (page, hand, target, kind) => {
    await page.evaluate(([h, t]) => globalThis.__sandbox.aim(h, t), [hand, target]);
    await frames(page, 15);
    const t0 = await page.evaluate(() => Date.now());
    const hover = await page.evaluate((h) => globalThis.__sandbox.hover(h), hand);
    // Pressed for two frames, timed in the page: held across Playwright round trips for six frames,
    // a press on the software renderer's 80 ms frames (the dense graph) outlasted the 300 ms hold and
    // opened the node menu instead of selecting.
    await page.evaluate(
        async ([h, k]) => {
            const s = globalThis.__sandbox;
            const f = s.xrFrames();
            s.press(h, k, true);
            while (s.xrFrames() < f + 2) {
                await new Promise((r) => setTimeout(r, 1));
            }
            s.press(h, k, false);
        },
        [hand, kind],
    );
    await frames(page, 10);
    const log = await page.evaluate(() => globalThis.__sandbox.log(400));
    return {
        hover,
        entries: log.filter((e) => e.time >= t0 && (e.message === "command" || e.message.startsWith("arbiter"))),
    };
};

const runOne = async (profile, preset) => {
    const r = { profile, preset, checks: {}, consoleErrors: [], pageErrors: [], offOrigin: [] };
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    page.on("console", (m) => {
        if (m.type() === "error") {
            r.consoleErrors.push(m.text().slice(0, 300));
        }
    });
    page.on("pageerror", (e) => r.pageErrors.push(String(e).slice(0, 300)));
    page.on("request", (req) => {
        const u = new URL(req.url());
        if (!["data:", "blob:"].includes(u.protocol) && u.origin !== base.origin) {
            r.offOrigin.push(req.url());
        }
    });
    const check = (name, pass, detail) => {
        r.checks[name] = { pass: !!pass, ...detail };
    };
    try {
        const url = new URL(base);
        // "alone:<id>" is one technique alone, as the landing page links it (preset=empty&on=<id>).
        const alone = preset.startsWith("alone:") ? preset.slice(6) : undefined;
        url.search = new URLSearchParams(
            alone
                ? { preset: "empty", on: alone, emulate: profile, still: "1" }
                : { preset, emulate: profile, still: "1" },
        ).toString();
        await page.goto(url.toString());
        await until(page, () => globalThis.__sandbox?.ready === true);
        r.sessionId = await page.evaluate(() => globalThis.__sandbox.sessionId);
        // Enter VR the way the owner does: a click on the page's button.
        await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
        await until(page, () => globalThis.__sandbox.inXR() && globalThis.__sandbox.xrFrames() > 10);
        await frames(page, 60); // warm-up
        check("startsCleanly", true, {});

        await frames(page, FRAMES);
        const f = await page.evaluate((n) => globalThis.__sandbox.frames(n), FRAMES);
        check("frameTime", f.over50 === 0 && f.hooksP95 < HOOKS_P95_MS, {
            ...f,
            limits: `no frame JS over ${JS_FRAME_MS} ms; hooks p95 under ${HOOKS_P95_MS} ms`,
        });

        const j = await page.evaluate(() => globalThis.__sandbox.jitter(120));
        check("stillHeadJitter", j.maxMm < JITTER_MM && j.maxDeg < JITTER_DEG, j);
        check("guiTexturesIdle", j.panelRenders === 0 && j.chipRedraws === 0 && j.rebuilds === 0, {
            panelRenders: j.panelRenders,
            chipRedraws: j.chipRedraws,
            rebuilds: j.rebuilds,
        });

        const hands = profile.endsWith("hands") && profile !== "galaxyxr-no-hands";
        const top = await page.evaluate(() => globalThis.__sandbox.topNode());
        const sel = await pressAt(page, "right", top, hands ? "pinch" : "trigger");
        const state = await page.evaluate(() => globalThis.__sandbox.state());
        check(hands ? "handsSelect" : "controllersSelect", state.selection.length === 1 && state.selection[0] === top, {
            target: top,
            hover: { node: sel.hover.node, context: sel.hover.context, isHand: sel.hover.isHand },
            selection: state.selection,
            log: sel.entries.map((e) => `${e.message} ${e.data?.label ?? e.data?.technique ?? e.data?.reason ?? ""}`),
        });

        // The off hand held low and close to the body, as when reaching for the gear.
        await page.evaluate(() => globalThis.__sandbox.place("left", -0.12, 1.2, 0.08));
        await pressAt(page, "left", "gear", hands ? "pinch" : "trigger");
        const gearByRay = await page.evaluate(() => globalThis.__sandbox.gearOpen());
        const gear = { byRay: gearByRay };
        if (!hands) {
            // The off-hand stick click toggles it (closed again here).
            await page.evaluate(() => globalThis.__sandbox.press("left", "stick", true));
            await frames(page, 5);
            await page.evaluate(() => globalThis.__sandbox.press("left", "stick", false));
            await frames(page, 5);
            gear.byStickClick = gearByRay && !(await page.evaluate(() => globalThis.__sandbox.gearOpen()));
        }
        check("gearPanelReachable", gear.byRay && gear.byStickClick !== false, gear);

        const techniques = await page.evaluate(() => globalThis.__sandbox.techniques());
        if (!hands && techniques.some((t) => t.id === "example" && t.on)) {
            await page.evaluate(() => globalThis.__sandbox.press("right", "a", true));
            await frames(page, 5);
            await page.evaluate(() => globalThis.__sandbox.press("right", "a", false));
            await frames(page, 5);
            const s = await page.evaluate(() => globalThis.__sandbox.state());
            check("exampleModule", s.colorBy === "pagerank" && s.undoLabel === "Undo: Color by PageRank", {
                colorBy: s.colorBy,
                undoLabel: s.undoLabel,
            });
        }

        if (args.logs) {
            await page.evaluate(() => new Promise((res) => setTimeout(res, 1500)));
            const all = await (await fetch(new URL("/logs", args.logs))).json();
            const mine = all[r.sessionId] ?? [];
            const probe = mine.find((e) => e.message === "probe" && e.data?.phase === "session");
            check("loggingEndToEnd", mine.length > 0 && probe, {
                entries: mine.length,
                sessionProbe: !!probe,
                inputs: probe?.data?.inputs,
            });
        }
        check("noErrors", r.consoleErrors.length === 0 && r.pageErrors.length === 0 && r.offOrigin.length === 0, {
            consoleErrors: r.consoleErrors.length,
            pageErrors: r.pageErrors.length,
            offOrigin: r.offOrigin.length,
        });
    } catch (e) {
        check("ran", false, { error: String(e).slice(0, 500) });
    }
    try {
        await page.screenshot({ path: join(args.out, `${profile}--${preset}.png`) });
    } catch {
        // a crashed page has nothing to show
    }
    await context.close();
    r.pass = Object.values(r.checks).every((c) => c.pass);
    return r;
};

// The preset list comes from the page itself, so a new preset is covered with no edit here.
let presets = args.presets?.split(",");
if (!presets) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const url = new URL(base);
    url.search = "?preset=empty&emulate=quest3-controllers";
    await page.goto(url.toString());
    await until(page, () => globalThis.__sandbox?.ready === true);
    presets = await page.evaluate(() => globalThis.__sandbox.presets);
    if (args.alone) {
        const ids = await page.evaluate(() => globalThis.__sandbox.techniques().map((t) => t.id));
        presets.push(...ids.map((id) => `alone:${id}`));
    }
    await context.close();
}

const results = [];
for (const profile of args.profiles.split(",")) {
    for (const preset of presets) {
        const r = await runOne(profile, preset);
        results.push(r);
        const failed = Object.entries(r.checks)
            .filter(([, c]) => !c.pass)
            .map(([n]) => n);
        const f = r.checks.frameTime;
        const j = r.checks.stillHeadJitter;
        console.log(
            `${r.pass ? "PASS" : "FAIL"} ${profile} ${preset}` +
                (f
                    ? `  js p95 ${f.jsP95} max ${f.jsMax} ms, hooks p95 ${f.hooksP95} ms, frame p50 ${f.deltaP50} ms`
                    : "") +
                (j ? `  jitter ${j.maxMm.toFixed(4)} mm ${j.maxDeg.toFixed(5)} deg` : "") +
                (failed.length ? `  failed: ${failed.join(", ")}` : ""),
        );
    }
}
await browser.close();

const report = { url: args.url, time: new Date().toISOString(), pass: results.every((r) => r.pass), results };
writeFileSync(join(args.out, "report.json"), JSON.stringify(report, null, 2));
console.log(
    `${results.filter((r) => r.pass).length} of ${results.length} runs passed; report: ${join(args.out, "report.json")}`,
);
process.exit(report.pass ? 0 : 1);
