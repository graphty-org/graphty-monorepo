#!/usr/bin/env node
// The Figma-like menus' own checks (plan section 3.8), on an emulated headset with the module on and
// off, with controllers and with hands. Arrange through the hook, act through emulated input (a
// trigger or a pinch aimed at a GUI control, a hand moved while pressing), assert through the log
// and the hooks (`__sandbox`, and the module's `__figmaMenus`).
//
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/figma-menus.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-figma-menus
// Options: --profiles a,b (default quest3-controllers,quest3-hands), --preset (default figma; any
// preset, the module is switched on or off on top of it).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-figma-menus" },
        profiles: { type: "string", default: "quest3-controllers,quest3-hands" },
        preset: { type: "string", default: "figma" },
    },
});
if (!args.url) {
    console.error("usage: figma-menus.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b]");
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
    const start = await page.evaluate(() => globalThis.__sandbox.xrFrames());
    await until(page, ([s, k]) => globalThis.__sandbox.xrFrames() >= s + k, [start, n]);
};
const sb = (page, fn, arg) => page.evaluate(fn, arg);
const now = (page) => sb(page, () => Date.now());
const logSince = async (page, t0, prefix) =>
    (await sb(page, () => globalThis.__sandbox.log(400))).filter((e) => e.time >= t0 && e.message.startsWith(prefix));

/**
 * Aim the right hand at a node, "space", or a mesh by name; press and release. The press is held
 * one frame: a headless frame takes 50 to 100 ms, so a longer one reads as the node menu's hold.
 */
const pressAt = async (page, target, kind) => {
    await sb(page, (t) => globalThis.__sandbox.aim("right", t), target);
    await frames(page, 15);
    const hover = await sb(page, () => globalThis.__sandbox.hover("right"));
    // Timed in the page: held across Playwright round trips, a tap on slow headless frames outlasted
    // the 300 ms hold and opened the node menu instead (as in run.mjs).
    await sb(
        page,
        async ([h, k]) => {
            const s = globalThis.__sandbox;
            const f = s.xrFrames();
            s.press(h, k, true);
            while (s.xrFrames() < f + 2) {
                await new Promise((r) => setTimeout(r, 1));
            }
            s.press(h, k, false);
        },
        ["right", kind],
    );
    await frames(page, 10);
    return { context: hover.context, uiMesh: hover.uiMesh };
};

/** Press one of the module's GUI controls by name. */
const pressControl = async (page, control, kind) => {
    const m = await sb(page, (c) => globalThis.__figmaMenus.mark(c), control);
    if (!m) {
        return { missing: control };
    }
    return pressAt(page, m.mesh, kind);
};

/** Whether two world boxes intersect. */
const overlaps = (a, b) => [0, 1, 2].every((k) => a.min[k] < b.max[k] && b.min[k] < a.max[k]);
const union = (list) => ({
    name: list.map((b) => b.name).join("+"),
    min: [0, 1, 2].map((k) => Math.min(...list.map((b) => b.min[k]))),
    max: [0, 1, 2].map((k) => Math.max(...list.map((b) => b.max[k]))),
});

const open = async (profile, query) => {
    const r = { consoleErrors: [], pageErrors: [] };
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && r.consoleErrors.push(m.text().slice(0, 300)));
    page.on("pageerror", (e) => r.pageErrors.push(String(e).slice(0, 300)));
    const url = new URL(args.url);
    url.search = new URLSearchParams({ ...query, emulate: profile, still: "1" }).toString();
    await page.goto(url.toString());
    await until(page, () => globalThis.__sandbox?.ready === true && !!globalThis.__figmaMenus);
    await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
    await until(page, () => globalThis.__sandbox.inXR() && globalThis.__sandbox.xrFrames() > 10);
    await frames(page, 30);
    return { page, context, r };
};

const isOn = async (page) =>
    (await sb(page, () => globalThis.__sandbox.techniques())).find((t) => t.id === "figma-menus")?.on;

const runOn = async (profile) => {
    const hands = profile.endsWith("hands");
    const press = hands ? "pinch" : "trigger";
    const checks = {};
    const check = (name, pass, detail) => (checks[name] = { pass: !!pass, ...detail });
    const { page, context, r } = await open(profile, { preset: args.preset });
    try {
        check("moduleOn", await isOn(page), {});

        // 1. Toolbar below, layer list left, inspector right; no overlap with each other or a framework zone.
        const b = await sb(page, () => globalThis.__figmaMenus.bounds());
        const mine = Object.entries(b.mine).map(([k, list]) => ({
            k,
            ...union(list),
            enabled: list.every((x) => x.enabled),
        }));
        const clashes = [];
        for (let i = 0; i < mine.length; i++) {
            for (const o of [...mine.slice(i + 1), ...b.framework]) {
                if (overlaps(mine[i], o)) {
                    clashes.push(`${mine[i].k} x ${o.name}`);
                }
            }
        }
        const c = Object.fromEntries(mine.map((m) => [m.k, m.min.map((v, k) => (v + m.max[k]) / 2)]));
        const bar = await sb(page, () => globalThis.__figmaMenus.inspectorBar());
        // Left and right along the panels' own right axis; below in world y.
        const along = (p) => p[0] * bar.right[0] + p[2] * bar.right[2];
        const arranged =
            along(c.layers) < along(c.toolbar) &&
            along(c.toolbar) < along(c.inspector) &&
            c.toolbar[1] < Math.min(c.layers[1], c.inspector[1]);
        check("layout", arranged && clashes.length === 0 && mine.every((m) => m.enabled), {
            centers: c,
            clashes,
            frameworkMeshes: b.framework.map((f) => f.name),
        });
        const tex = await sb(page, () => globalThis.__figmaMenus.textureSizes());
        check(
            "textures768",
            tex.every((t) => t.width <= 768 && t.height <= 768),
            { textures: tex },
        );

        // 2. Show PageRank logs run, the layer list gains a PageRank row, its remove is a history command.
        let t0 = await now(page);
        const hitShow = await pressControl(page, "figma-tb-pagerank", press);
        const runs = (await logSince(page, t0, "command")).filter((e) => e.data.technique === "figma-menus");
        const rows = await sb(page, () => globalThis.__figmaMenus.rows());
        check(
            "showPageRank",
            runs.some((e) => e.data.code === "run" && e.data.params.result === "pagerank") &&
                rows.includes("Color by PageRank"),
            { hover: hitShow, commands: runs.map((e) => e.data.label), rows },
        );
        t0 = await now(page);
        const hitRemove = await pressControl(page, "figma-layer-x-color", press);
        const removed = (await logSince(page, t0, "command")).filter((e) => e.data.technique === "figma-menus");
        check(
            "removeLayer",
            removed.some((e) => e.data.history === true && e.data.code === "colorBy" && e.data.params.result === null),
            {
                hover: hitRemove,
                commands: removed.map((e) => `${e.data.label} (history ${e.data.history})`),
                rows: await sb(page, () => globalThis.__figmaMenus.rows()),
            },
        );

        // 3. A tap on the Medici: inspector facts and a popover of three to five verbs; clearing removes it.
        const tTap = await now(page);
        const tap = await pressAt(page, "Medici", press);
        const insp = await sb(page, () => globalThis.__figmaMenus.inspector());
        const pop = await sb(page, () => globalThis.__figmaMenus.popover());
        const sel = (await sb(page, () => globalThis.__sandbox.state())).selection;
        // Idle with the popover up: nothing redraws or moves while the head and hands are still.
        const idle = await sb(page, () => globalThis.__sandbox.jitter(60));
        // Cleared with the layer list's selection row: a press on empty space can read as the
        // node menu's hold when a headless frame runs long.
        const hitClear = await pressControl(page, "figma-layer-x-selection", press);
        const popAfter = await sb(page, () => globalThis.__figmaMenus.popover());
        const selAfter = (await sb(page, () => globalThis.__sandbox.state())).selection;
        const arbiter = (await logSince(page, tTap, "")).filter(
            (e) => e.message.startsWith("arbiter") || e.message === "command" || e.message === "cancel",
        );
        check(
            "tapMedici",
            sel.join() === "Medici" &&
                insp[0] === "Medici" &&
                insp.some((l) => l.startsWith("PageRank:")) &&
                pop.visible &&
                pop.verbs.length >= 3 &&
                pop.verbs.length <= 5 &&
                selAfter.length === 0 &&
                !popAfter.visible,
            {
                tap,
                selection: sel,
                inspector: insp,
                popover: pop,
                afterClear: { hover: hitClear, selection: selAfter, popover: popAfter },
                arbiter: arbiter.map(
                    (e) =>
                        `${e.message} ${e.data.technique ?? ""} ${e.data.context ?? ""} ${e.data.label ?? e.data.reason ?? e.data.how ?? ""}`,
                ),
            },
        );
        check(
            "idle60",
            idle.panelRenders === 0 && idle.chipRedraws === 0 && idle.maxMm < 0.05 && idle.maxDeg < 0.01,
            idle,
        );

        // 4. Sieve: hands the sieve over through the tools seam, or is grayed with the reason.
        const reason = await sb(page, () => globalThis.__figmaMenus.toolReason("sieve"));
        t0 = await now(page);
        const hitSieve = await pressControl(page, "figma-tb-sieve", press);
        const click = (await logSince(page, t0, "figma-menus.click")).find((e) => e.data.item === "sieve");
        check("sieve", click && (reason ? click.data.reason : !click.data.reason), {
            hover: hitSieve,
            grayedReason: reason,
            logged: click?.data,
        });

        // 5. Dragging the inspector's bar 20 cm moves it 20 cm.
        const cam = (await sb(page, () => globalThis.__sandbox.debug())).camera;
        const start = [cam[0] + 0.15, cam[1] - 0.3, cam[2] + 0.2];
        await sb(page, (p) => globalThis.__sandbox.place("right", p[0], p[1], p[2]), start);
        await frames(page, 5);
        const from = await sb(page, () => globalThis.__figmaMenus.inspectorBar());
        await sb(page, (n) => globalThis.__sandbox.aim("right", n), from.name);
        await frames(page, 15);
        const hoverBar = await sb(page, () => globalThis.__sandbox.hover("right"));
        await sb(page, (k) => globalThis.__sandbox.press("right", k, true), press);
        await frames(page, 6);
        for (let i = 1; i <= 20; i++) {
            const p = start.map((v, k) => v + from.right[k] * 0.01 * i);
            await sb(page, (q) => globalThis.__sandbox.place("right", q[0], q[1], q[2]), p);
            await frames(page, 2);
        }
        await frames(page, 10);
        await sb(page, (k) => globalThis.__sandbox.press("right", k, false), press);
        await frames(page, 30);
        const to = await sb(page, () => globalThis.__figmaMenus.inspectorBar());
        const d = to.position.map((v, k) => v - from.position[k]);
        const movedCm = Math.hypot(...d) * 100;
        const alongCm = (d[0] * from.right[0] + d[1] * from.right[1] + d[2] * from.right[2]) * 100;
        check("dragInspector", Math.abs(movedCm - 20) < 1 && Math.abs(alongCm - 20) < 1, {
            hover: { context: hoverBar.context, uiMesh: hoverBar.uiMesh },
            movedCm: Math.round(movedCm * 100) / 100,
            alongCm: Math.round(alongCm * 100) / 100,
        });
        await page.screenshot({ path: join(args.out, `${profile}--${args.preset}--on.png`) });
    } catch (e) {
        check("ran", false, { error: String(e).slice(0, 500) });
    }
    check("noErrors", r.consoleErrors.length === 0 && r.pageErrors.length === 0, r);
    await context.close();

    // Off: nothing of the module shows; switched on in the session it appears, switched off it goes.
    const off = await open(profile, { preset: args.preset, off: "figma-menus" });
    try {
        const visible = async () =>
            Object.values((await sb(off.page, () => globalThis.__figmaMenus.bounds())).mine)
                .flat()
                .filter((m) => m.enabled).length;
        const wasOn = await isOn(off.page);
        const shownOff = await visible();
        await sb(off.page, () => globalThis.__sandbox.setOn("figma-menus", true));
        await frames(off.page, 10);
        const fOn = await sb(off.page, () => globalThis.__sandbox.frames(10));
        const shownOn = await visible();
        await pressAt(off.page, "Medici", press);
        const popOn = (await sb(off.page, () => globalThis.__figmaMenus.popover())).visible;
        await sb(off.page, () => globalThis.__sandbox.setOn("figma-menus", false));
        await frames(off.page, 10);
        const fOff = await sb(off.page, () => globalThis.__sandbox.frames(10));
        const shownAfter = await visible();
        const popAfter = (await sb(off.page, () => globalThis.__figmaMenus.popover())).visible;
        check(
            "offAndToggle",
            !wasOn &&
                shownOff === 0 &&
                shownOn === 5 &&
                popOn &&
                shownAfter === 0 &&
                !popAfter &&
                fOn.over50 + fOff.over50 === 0,
            {
                wasOn,
                shownOff,
                shownOn,
                popoverWhenOn: popOn,
                shownAfter,
                popoverAfter: popAfter,
                jsMaxMsAfterOn: fOn.jsMax,
                jsMaxMsAfterOff: fOff.jsMax,
            },
        );
    } catch (e) {
        check("offRan", false, { error: String(e).slice(0, 500) });
    }
    check("noErrorsOff", off.r.consoleErrors.length === 0 && off.r.pageErrors.length === 0, off.r);
    await off.context.close();
    return { profile, pass: Object.values(checks).every((x) => x.pass), checks };
};

const results = [];
for (const profile of args.profiles.split(",")) {
    const res = await runOn(profile);
    results.push(res);
    const failed = Object.entries(res.checks)
        .filter(([, x]) => !x.pass)
        .map(([n]) => n);
    const failedNote = failed.length ? `  failed: ${failed.join(", ")}` : "";
    console.log(`${res.pass ? "PASS" : "FAIL"} ${profile}${failedNote}`);
}
await browser.close();
const report = { url: args.url, time: new Date().toISOString(), pass: results.every((x) => x.pass), results };
writeFileSync(join(args.out, "report.json"), JSON.stringify(report, null, 2));
console.log(`report: ${join(args.out, "report.json")}`);
process.exit(report.pass ? 0 : 1);
