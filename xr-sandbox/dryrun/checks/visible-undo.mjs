#!/usr/bin/env node
// The visible undo's own checks (plan section 3.2), on an emulated headset with the module on and
// off, with controllers and with hands. Arrange through the hook, act through emulated input (the
// A button, a trigger or a pinch aimed at the strip's buttons), assert through the log and the hook.
//
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/visible-undo.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-visible-undo
// Options: --profiles a,b (default quest3-controllers,quest3-hands).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-visible-undo" },
        profiles: { type: "string", default: "quest3-controllers,quest3-hands" },
    },
});
if (!args.url) {
    console.error("usage: visible-undo.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b]");
    process.exit(2);
}
mkdirSync(args.out, { recursive: true });
process.env.FC_FONTATIONS = "1";
const browser = await chromium.launch({
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const until = (page, fn, arg, timeout = 60_000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
const frames = async (page, n) => {
    const start = await page.evaluate(() => window.__sandbox.xrFrames());
    await until(page, ([s, k]) => window.__sandbox.xrFrames() >= s + k, [start, n]);
};
const sb = (page, fn, arg) => page.evaluate(fn, arg);
/** Log entries since `t0` whose message starts with `prefix`. */
const logSince = async (page, t0, prefix) =>
    (await sb(page, () => window.__sandbox.log(400))).filter((e) => e.time >= t0 && e.message.startsWith(prefix));
const now = (page) => sb(page, () => Date.now());

/** Aim the right hand at `target`, press and release. */
const pressAt = async (page, target, kind) => {
    await sb(page, (t) => window.__sandbox.aim("right", t), target);
    await frames(page, 15);
    const hover = await sb(page, () => window.__sandbox.hover("right"));
    await sb(page, (k) => window.__sandbox.press("right", k, true), kind);
    await frames(page, 6);
    await sb(page, (k) => window.__sandbox.press("right", k, false), kind);
    await frames(page, 10);
    return { context: hover.context, uiMesh: hover.uiMesh };
};

const open = async (profile, query) => {
    const r = { consoleErrors: [], pageErrors: [] };
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && r.consoleErrors.push(m.text().slice(0, 300)));
    page.on("pageerror", (e) => r.pageErrors.push(String(e).slice(0, 300)));
    const url = new URL(args.url);
    url.search = new URLSearchParams({ ...query, emulate: profile, still: "1" }).toString();
    await page.goto(url.toString());
    await until(page, () => window.__sandbox?.ready === true);
    await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
    await until(page, () => window.__sandbox.inXR() && window.__sandbox.xrFrames() > 10);
    await frames(page, 30);
    return { page, context, r };
};

/** Color by PageRank as the owner would: the example module's A button, or (hands) the arranged command. */
const colorByPageRank = async (page, hands) => {
    if (hands) {
        await sb(page, () => window.__sandbox.run("colorBy", { result: "pagerank" }));
    } else {
        await sb(page, () => window.__sandbox.press("right", "a", true));
        await frames(page, 5);
        await sb(page, () => window.__sandbox.press("right", "a", false));
    }
    await frames(page, 5);
};

const runOn = async (profile) => {
    const hands = profile.endsWith("hands");
    const press = hands ? "pinch" : "trigger";
    const checks = {};
    const check = (name, pass, detail) => (checks[name] = { pass: !!pass, ...detail });
    const { page, context, r } = await open(profile, { preset: "example" });
    try {
        const on = (await sb(page, () => window.__sandbox.techniques())).find((t) => t.id === "visible-undo");
        check("moduleOn", on?.on, { reason: on?.reason });

        // 1. The toast beside the acting hand, once, for 2 s.
        let t0 = await now(page);
        await colorByPageRank(page, hands);
        const toasts = await logSince(page, t0, "visible-undo.toast");
        const shown = toasts.filter((e) => e.message === "visible-undo.toast");
        const idle = await sb(page, () => window.__sandbox.jitter(20));
        await until(
            page,
            (t) => window.__sandbox.log(400).some((e) => e.time >= t && e.message === "visible-undo.toast.hidden"),
            t0,
            10_000,
        );
        const hidden = (await logSince(page, t0, "visible-undo.toast.hidden"))[0];
        check(
            "toast",
            shown.length === 1 &&
                shown[0].data.text === "Colored by PageRank -- Undo" &&
                shown[0].data.hand === "right" &&
                hidden.data.afterMs >= 2000 &&
                hidden.data.afterMs < 2500,
            {
                shown: shown.map((e) => `${e.data.text} (${e.data.hand})`),
                hiddenAfterMs: hidden?.data.afterMs,
                acting: hands ? "arranged command (no hand: dominant)" : "A button, right controller",
            },
        );
        check("toastNotRedrawnPerFrame", idle.chipRedraws === 0 && idle.panelRenders === 0, {
            chipRedrawsOver20Frames: idle.chipRedraws,
            panelRendersOver20Frames: idle.panelRenders,
        });

        // 2. The strip's Undo names the step; pressing it undoes.
        const strip = (await logSince(page, t0, "visible-undo.strip.shown")).at(-1);
        t0 = await now(page);
        const hit = await pressAt(page, "visible-undo-undo", press);
        const undos = (await logSince(page, t0, "command")).filter((e) => e.data.code === "undo");
        let s = await sb(page, () => window.__sandbox.state());
        check(
            "undoButton",
            strip?.data.undo === "Undo: Color by PageRank" &&
                undos.length === 1 &&
                s.colorBy === null &&
                s.history.length === 0,
            {
                buttonText: strip?.data.undo,
                hover: hit,
                undoLogged: undos.map((e) => e.data.label),
                colorBy: s.colorBy,
            },
        );

        // 3. Five steps, then the third strip item: two steps left, state as after the second.
        t0 = await now(page);
        const steps = [
            ["colorBy", { result: "pagerank" }],
            ["sizeBy", { result: "degree" }],
            ["run", { result: "betweenness" }],
            ["colorBy", { result: "degree" }],
            ["hide", { ids: [0] }],
        ];
        let afterSecond;
        for (const [i, [code, params]] of steps.entries()) {
            await sb(page, ([c, p]) => window.__sandbox.run(c, p), [code, params]);
            await frames(page, 3);
            if (i === 1) {
                afterSecond = await sb(page, () => window.__sandbox.state());
            }
        }
        const fiveToasts = (await logSince(page, t0, "visible-undo.toast")).filter(
            (e) => e.message === "visible-undo.toast",
        );
        const before = await sb(page, () => window.__sandbox.state());
        const hit3 = await pressAt(page, "visible-undo-strip-2", press);
        s = await sb(page, () => window.__sandbox.state());
        const pressLog = (await logSince(page, t0, "visible-undo.strip.press"))[0];
        check(
            "stripUndoTo",
            before.history.length === 5 &&
                s.history.length === 2 &&
                JSON.stringify(s.history) === JSON.stringify(afterSecond.history) &&
                s.colorBy === afterSecond.colorBy,
            {
                before: before.history,
                after: s.history,
                expected: afterSecond.history,
                pressed: pressLog?.data,
                hover: hit3,
            },
        );
        await page.screenshot({ path: join(args.out, `${profile}--strip.png`) });
        // One toast and one texture redraw per history entry: 1 + 5 so far.
        check("toastOncePerEntry", fiveToasts.length === 5 && fiveToasts.at(-1).data.redraws === 6, {
            toasts: fiveToasts.map((e) => e.data.text),
            redraws: fiveToasts.at(-1)?.data.redraws,
        });

        // 4. Selections are never steps: a real tap select and an arranged one.
        t0 = await now(page);
        const top = await sb(page, () => window.__sandbox.topNode());
        await pressAt(page, top, press);
        await sb(page, () => window.__sandbox.run("select", { ids: [1, 2], mode: "add" }));
        await frames(page, 5);
        const sel = await sb(page, () => window.__sandbox.state());
        // A toast from the fifth step may time out meanwhile; only a new toast or strip change counts.
        const touched = (await logSince(page, t0, "visible-undo.")).filter((e) =>
            ["visible-undo.toast", "visible-undo.strip.shown"].includes(e.message),
        );
        check("selectionsNeverSteps", sel.selection.length > 0 && sel.history.length === 2 && touched.length === 0, {
            selection: sel.selection,
            history: sel.history,
            visibleUndoEntries: touched.map((e) => e.message),
        });

        // 5. Switched off in the headset: the strip is gone and a press where it was undoes nothing.
        await sb(page, () => window.__sandbox.setOn("visible-undo", false));
        await frames(page, 5);
        t0 = await now(page);
        await pressAt(page, "visible-undo-undo", press);
        s = await sb(page, () => window.__sandbox.state());
        const offUndos = (await logSince(page, t0, "command")).filter((e) => e.data.code === "undo");
        check("switchedOff", offUndos.length === 0 && s.history.length === 2, {
            undos: offUndos.length,
            history: s.history,
        });
    } catch (e) {
        check("ran", false, { error: String(e).slice(0, 500) });
    }
    check("noErrors", r.consoleErrors.length + r.pageErrors.length === 0, r);
    await page.screenshot({ path: join(args.out, `${profile}--on.png`) }).catch(() => undefined);
    await context.close();
    return checks;
};

const runOff = async (profile) => {
    const hands = profile.endsWith("hands");
    const checks = {};
    const check = (name, pass, detail) => (checks[name] = { pass: !!pass, ...detail });
    const { page, context, r } = await open(profile, { preset: "example", off: "visible-undo" });
    try {
        const t0 = await now(page);
        await colorByPageRank(page, hands);
        await frames(page, 10);
        const mine = await logSince(page, t0, "visible-undo.");
        const s = await sb(page, () => window.__sandbox.state());
        // The framework still names the step; the module adds nothing.
        check("offAddsNothing", mine.length === 0 && s.undoLabel === "Undo: Color by PageRank", {
            visibleUndoEntries: mine.length,
            undoLabel: s.undoLabel,
        });
        const j = await sb(page, () => window.__sandbox.jitter(60));
        check("offStill", j.maxMm < 0.05 && j.maxDeg < 0.01, { maxMm: j.maxMm, maxDeg: j.maxDeg });
    } catch (e) {
        check("ran", false, { error: String(e).slice(0, 500) });
    }
    check("noErrors", r.consoleErrors.length + r.pageErrors.length === 0, r);
    await page.screenshot({ path: join(args.out, `${profile}--off.png`) }).catch(() => undefined);
    await context.close();
    return checks;
};

const results = [];
for (const profile of args.profiles.split(",")) {
    for (const [mode, fn] of [
        ["on", runOn],
        ["off", runOff],
    ]) {
        const checks = await fn(profile);
        const pass = Object.values(checks).every((c) => c.pass);
        const failed = Object.entries(checks)
            .filter(([, c]) => !c.pass)
            .map(([n]) => n);
        console.log(
            `${pass ? "PASS" : "FAIL"} ${profile} visible-undo ${mode}${failed.length ? `  failed: ${failed.join(", ")}` : ""}`,
        );
        results.push({ profile, mode, pass, checks });
    }
}
await browser.close();
const report = { url: args.url, time: new Date().toISOString(), pass: results.every((x) => x.pass), results };
writeFileSync(join(args.out, "report.json"), JSON.stringify(report, null, 2));
console.log(
    `${results.filter((x) => x.pass).length} of ${results.length} runs passed; report: ${join(args.out, "report.json")}`,
);
process.exit(report.pass ? 0 : 1);
