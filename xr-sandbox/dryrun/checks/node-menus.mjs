#!/usr/bin/env node
// The node menus' own checks (plan section 3.5), on an emulated headset with the module on and off,
// with hands and with controllers. Arrange through the hook, act through emulated input (pinches,
// triggers, the B button, aiming and turning the hand), assert through the log and the hook.
//
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/node-menus.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-node-menus
// Options: --profiles a,b (default quest3-hands,quest3-controllers).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-node-menus" },
        profiles: { type: "string", default: "quest3-hands,quest3-controllers" },
    },
});
if (!args.url) {
    console.error("usage: node-menus.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b]");
    process.exit(2);
}
mkdirSync(args.out, { recursive: true });
process.env.FC_FONTATIONS = "1";
const browser = await chromium.launch({
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const TARGET = "Medici";
const until = (page, fn, arg, timeout = 60_000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
const frames = async (page, n) => {
    const start = await page.evaluate(() => window.__sandbox.xrFrames());
    await until(page, ([s, k]) => window.__sandbox.xrFrames() >= s + k, [start, n]);
};
const sb = (page, fn, arg) => page.evaluate(fn, arg);
const now = (page) => sb(page, () => Date.now());
/** The longest frame's JavaScript since frame `f0` (to tell which step made a long frame). */
const jsMaxSince = async (page, f0) =>
    (await sb(page, (k) => window.__sandbox.frames(window.__sandbox.xrFrames() - k), f0)).jsMax;
const frameNo = (page) => sb(page, () => window.__sandbox.xrFrames());
/** Log entries since `t0` whose message starts with `prefix`. */
const logSince = async (page, t0, prefix) =>
    (await sb(page, () => window.__sandbox.log(400))).filter((e) => e.time >= t0 && e.message.startsWith(prefix));
const commandsSince = async (page, t0) => (await logSince(page, t0, "command")).map((e) => e.data);
const press = (page, hand, kind, down) => sb(page, ([h, k, d]) => window.__sandbox.press(h, k, d), [hand, kind, down]);
const aim = async (page, hand, what) => {
    await sb(page, ([h, w]) => window.__sandbox.aim(h, w), [hand, what]);
    await frames(page, 15);
};
/** Aim, press and release quickly (a tap or a click on a button). */
const tap = async (page, hand, what, kind) => {
    await aim(page, hand, what);
    const hover = await sb(page, (h) => window.__sandbox.hover(h), hand);
    // Pressed for two frames, timed in the page: round trips from here must not stretch a tap past
    // the 300 ms hold on a slow emulated frame.
    const heldMs = await sb(
        page,
        async ([h, k]) => {
            const s = window.__sandbox;
            const f = s.xrFrames();
            const t = performance.now();
            s.press(h, k, true);
            while (s.xrFrames() < f + 2) {
                await new Promise((r) => setTimeout(r, 1));
            }
            s.press(h, k, false);
            return Math.round(performance.now() - t);
        },
        [hand, kind],
    );
    await frames(page, 10);
    return { context: hover.context, uiMesh: hover.uiMesh, node: hover.node, heldMs };
};
/** Aim, press and hold for `ms` of wall time (the arena runs on the page's clock), leaving it held. */
const hold = async (page, hand, what, kind, ms = 350) => {
    await aim(page, hand, what);
    await press(page, hand, kind, true);
    await page.waitForTimeout(ms);
    await frames(page, 3);
};

// IWER's poses are in XR coordinates; Babylon's world is the same with z negated.
const rotate = (q, v) => {
    const [x, y, z] = v;
    const ix = q.w * x + q.y * z - q.z * y;
    const iy = q.w * y + q.z * x - q.x * z;
    const iz = q.w * z + q.x * y - q.y * x;
    const iw = -q.x * x - q.y * y - q.z * z;
    return [
        ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
        iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
        iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
    ];
};
const transform = async (page, device) => {
    const t = await sb(page, (d) => window.__sandbox.dispatch("get_transform", { device: d }), device);
    const p = t.position;
    const q = t.orientation ?? t.quaternion;
    return { pos: [p.x, p.y, -p.z], fwd: (([x, y, z]) => [x, y, -z])(rotate(q, [0, 0, -1])) };
};
const norm = (v) => {
    const l = Math.hypot(...v) || 1;
    return v.map((c) => c / l);
};
/** Turn a hand or controller `deg` degrees to the viewer's right about its own position. */
const turnRight = async (page, hand, device, deg) => {
    const { pos, fwd } = await transform(page, device);
    // Babylon is left-handed: right = up x forward.
    const right = norm([fwd[2], 0, -fwd[0]]);
    const a = (deg * Math.PI) / 180;
    const dir = fwd.map((c, i) => c * Math.cos(a) + right[i] * Math.sin(a));
    await sb(page, ([h, p]) => window.__sandbox.aimAt(h, p[0], p[1], p[2]), [
        hand,
        pos.map((c, i) => c + dir[i] * 0.5),
    ]);
    await frames(page, 8);
};
/** The framework's canned-chip panel (text-seam.ts): its first chip, "check", in world meters. */
const cannedCheckPoint = async (page) => {
    const head = await transform(page, "headset");
    const yaw = Math.atan2(head.fwd[0], head.fwd[2]);
    const c = [head.pos[0] + Math.sin(yaw) * 0.4, head.pos[1] - 0.3, head.pos[2] + Math.cos(yaw) * 0.4];
    const z = norm(c.map((v, i) => v - head.pos[i]));
    const x = norm([z[2], 0, -z[0]]);
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    // 0.3 x 0.075 m panel at 600 x 150 px: a 44 px title, then four 140 px chips centered in a row.
    const xm = ((90 - 300) / 600) * 0.3;
    const ym = (-(92 - 75) / 150) * 0.075;
    return c.map((v, i) => v + x[i] * xm + y[i] * ym);
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

const ON = { preset: "empty", on: "node-menus" };

const runList = async (profile) => {
    const hands = profile.endsWith("hands");
    const sel = hands ? "pinch" : "trigger";
    const checks = {};
    let f0 = 0;
    let page;
    const check = async (name, pass, detail) => {
        checks[name] = { pass: !!pass, ...detail, stepJsMax: await jsMaxSince(page, f0) };
        f0 = await frameNo(page);
    };
    const o = await open(profile, { ...ON, "s.node-menus.style": "list" });
    page = o.page;
    const { context, r } = o;
    f0 = await frameNo(page);
    try {
        const t = (await sb(page, () => window.__sandbox.techniques())).find((x) => x.id === "node-menus");
        await check("moduleOn", t?.on, { reason: t?.reason });

        if (hands) {
            // A quick tap selects and opens no menu.
            let t0 = await now(page);
            const hit = await tap(page, "right", TARGET, "pinch");
            const s = await sb(page, () => window.__sandbox.state());
            const opened = await logSince(page, t0, "node-menus.open");
            await check("tapSelectsNoMenu", s.selection.join() === TARGET && opened.length === 0, {
                hover: hit,
                selection: s.selection,
                menusOpened: opened.length,
            });

            // Held still for 350 ms: the menu opens, and the arbiter names node menus.
            t0 = await now(page);
            await hold(page, "right", TARGET, "pinch");
            const win = (await logSince(page, t0, "arbiter.win")).at(-1)?.data;
            const op = (await logSince(page, t0, "node-menus.open")).at(-1)?.data;
            await press(page, "right", "pinch", false);
            await frames(page, 5);
            await check(
                "holdOpensMenu",
                win?.technique === "node-menus" && op?.style === "list" && op?.target === TARGET,
                {
                    win: win && `${win.technique} (${win.how}, losers ${win.losers?.join("/") || "-"})`,
                    open: op,
                },
            );
        } else {
            // B while pointing at the node opens the menu at once.
            const t0 = await now(page);
            await aim(page, "right", TARGET);
            await press(page, "right", "b", true);
            await frames(page, 2);
            const win = (await logSince(page, t0, "arbiter.win")).at(-1)?.data;
            const op = (await logSince(page, t0, "node-menus.open")).at(-1)?.data;
            await press(page, "right", "b", false);
            await frames(page, 5);
            await check(
                "bOpensAtOnce",
                win?.technique === "node-menus" && win?.how === "start" && op?.target === TARGET,
                {
                    win: win && `${win.technique} (${win.how})`,
                    open: op,
                },
            );
        }
        await page.screenshot({ path: join(args.out, `${profile}--list-open.png`) });

        // A ray press on Probe logs probe for the node.
        let t0 = await now(page);
        const hitProbe = await tap(page, "right", "node-menus-node-2BackMesh", sel);
        let cmds = await commandsSince(page, t0);
        const probe = cmds.find((c) => c.code === "probe");
        await check("listProbe", probe?.label === `Probe ${TARGET}` && cmds.every((c) => c.code !== "select"), {
            hover: hitProbe,
            commands: cmds.map((c) => c.label),
        });

        // Note asks ctx.text: text entry is off, so the canned chips appear; "check" logs a note.
        if (hands) {
            await hold(page, "right", TARGET, "pinch");
            await press(page, "right", "pinch", false);
        } else {
            await aim(page, "right", TARGET);
            await press(page, "right", "b", true);
            await frames(page, 2);
            await press(page, "right", "b", false);
        }
        await frames(page, 5);
        t0 = await now(page);
        const hitNote = await tap(page, "right", "node-menus-node-3BackMesh", sel);
        const req = (await logSince(page, t0, "text.request")).at(-1)?.data;
        const p = await cannedCheckPoint(page);
        await sb(page, ([h, q]) => window.__sandbox.aimAt(h, q[0], q[1], q[2]), ["right", p]);
        await frames(page, 15);
        const onChip = await sb(page, () => window.__sandbox.hover("right"));
        await press(page, "right", sel, true);
        await frames(page, 2);
        await press(page, "right", sel, false);
        await frames(page, 10);
        cmds = await commandsSince(page, t0);
        const note = cmds.find((c) => c.code === "note");
        check(
            "noteCannedChips",
            req?.by === "canned chips" && note?.label === `Note on ${TARGET}` && note?.params?.text === "check",
            {
                hover: hitNote,
                request: req,
                chipHover: onChip.uiMesh,
                commands: cmds.map((c) => `${c.label} ${JSON.stringify(c.params)}`),
            },
        );

        // Held still on empty space (or B there): the graph verbs.
        t0 = await now(page);
        if (hands) {
            await hold(page, "right", "space", "pinch");
            await press(page, "right", "pinch", false);
        } else {
            await aim(page, "right", "space");
            await press(page, "right", "b", true);
            await frames(page, 2);
            await press(page, "right", "b", false);
        }
        await frames(page, 5);
        const graphOpen = (await logSince(page, t0, "node-menus.open")).at(-1)?.data;
        await page.screenshot({ path: join(args.out, `${profile}--graph-menu.png`) });
        await check(
            "emptySpaceGraphVerbs",
            graphOpen?.target === "the graph" && graphOpen?.verbs?.join() === "show,filter,clear,note",
            {
                open: graphOpen,
            },
        );
        // Show PageRank from it colors by PageRank, and undo names it.
        t0 = await now(page);
        const hitShow = await tap(page, "right", "node-menus-graph-0BackMesh", sel);
        const s = await sb(page, () => window.__sandbox.state());
        await check("graphVerbRuns", s.colorBy === "pagerank" && s.undoLabel === "Undo: Color by PageRank", {
            hover: hitShow,
            colorBy: s.colorBy,
            undoLabel: s.undoLabel,
        });

        // Choosing closed the list: its buttons are no longer UI under the ray.
        await aim(page, "right", "node-menus-graph-0BackMesh");
        const gone = await sb(page, () => window.__sandbox.hover("right"));
        await check("listClosesAfterChoice", gone.context !== "ui", { context: gone.context, uiMesh: gone.uiMesh });

        const f = await sb(page, () => window.__sandbox.frames(600));
        await check("noLongFrames", f.over50 === 0, { jsMax: f.jsMax, jsP95: f.jsP95, hooksP95: f.hooksP95 });
        const j = await sb(page, () => window.__sandbox.jitter(60));
        await check("stillAfter", j.maxMm < 0.05 && j.maxDeg < 0.01 && j.chipRedraws === 0, j);
    } catch (e) {
        await check("ran", false, { error: String(e).slice(0, 500) });
    }
    await check("noErrors", r.consoleErrors.length + r.pageErrors.length === 0, r);
    await context.close();
    return checks;
};

const runRing = async (profile) => {
    const hands = profile.endsWith("hands");
    const kind = hands ? "pinch" : "b";
    const device = hands ? "hand-right" : "controller-right";
    const checks = {};
    let f0 = 0;
    let page;
    const check = async (name, pass, detail) => {
        checks[name] = { pass: !!pass, ...detail, stepJsMax: await jsMaxSince(page, f0) };
        f0 = await frameNo(page);
    };
    const o = await open(profile, { ...ON, "s.node-menus.style": "ring" });
    page = o.page;
    const { context, r } = o;
    f0 = await frameNo(page);
    try {
        // Open, turn the wrist 40 degrees to the right: the highlight moves to Neighbors; release runs it.
        let t0 = await now(page);
        await hold(page, "right", TARGET, kind);
        const op = (await logSince(page, t0, "node-menus.open")).at(-1)?.data;
        await page.screenshot({ path: join(args.out, `${profile}--ring-open.png`) });
        await turnRight(page, "right", device, 40);
        const lit = (await logSince(page, t0, "node-menus.highlight")).at(-1)?.data;
        await page.screenshot({ path: join(args.out, `${profile}--ring-turned.png`) });
        await press(page, "right", kind, false);
        await frames(page, 8);
        const cmds = await commandsSince(page, t0);
        const nb = cmds.find((c) => c.code === "neighbors");
        await check(
            "ringWristTurn",
            op?.style === "ring" &&
                lit?.verb === "neighbors" &&
                nb?.params?.hops === 1 &&
                nb?.label?.startsWith(`Select ${TARGET} and 1 hop`) &&
                cmds.length === 1,
            { open: op, highlight: lit, commands: cmds.map((c) => c.label) },
        );

        // A small turn stays in the dead zone: release chooses nothing.
        t0 = await now(page);
        await hold(page, "right", TARGET, kind);
        await turnRight(page, "right", device, 5);
        await press(page, "right", kind, false);
        await frames(page, 8);
        const dismissed = (await logSince(page, t0, "node-menus.dismiss")).length;
        const after = await commandsSince(page, t0);
        await check("ringDeadZone", dismissed === 1 && after.length === 0, {
            dismissed,
            commands: after.map((c) => c.label),
        });
        const f = await sb(page, () => window.__sandbox.frames(600));
        await check("noLongFrames", f.over50 === 0, { jsMax: f.jsMax, jsP95: f.jsP95 });
    } catch (e) {
        await check("ran", false, { error: String(e).slice(0, 500) });
    }
    await check("noErrors", r.consoleErrors.length + r.pageErrors.length === 0, r);
    await context.close();
    return checks;
};

const runOff = async (profile) => {
    const hands = profile.endsWith("hands");
    const checks = {};
    const check = (name, pass, detail) => (checks[name] = { pass: !!pass, ...detail });
    const { page, context, r } = await open(profile, { preset: "empty" });
    try {
        const t0 = await now(page);
        if (hands) {
            await hold(page, "right", TARGET, "pinch", 450);
            await press(page, "right", "pinch", false);
        } else {
            await aim(page, "right", TARGET);
            await press(page, "right", "b", true);
            await frames(page, 3);
            await press(page, "right", "b", false);
        }
        await frames(page, 8);
        const mine = await logSince(page, t0, "node-menus.");
        const wins = (await logSince(page, t0, "arbiter.win")).map((e) => e.data.technique);
        const s = await sb(page, () => window.__sandbox.state());
        check("offOpensNothing", mine.length === 0 && !wins.includes("node-menus"), {
            nodeMenuEntries: mine.length,
            wins,
            selection: s.selection,
        });
        // Off, its hidden buttons are not under the ray and a press there probes nothing.
        const t1 = await now(page);
        const hit = await tap(page, "right", "node-menus-node-2BackMesh", hands ? "pinch" : "trigger");
        const probes = (await commandsSince(page, t1)).filter((c) => c.code === "probe");
        check("offListHidden", hit.context !== "ui" && probes.length === 0, { hover: hit, probes: probes.length });
        const j = await sb(page, () => window.__sandbox.jitter(60));
        check("offStill", j.maxMm < 0.05 && j.maxDeg < 0.01, { maxMm: j.maxMm, maxDeg: j.maxDeg });
    } catch (e) {
        check("ran", false, { error: String(e).slice(0, 500) });
    }
    check("noErrors", r.consoleErrors.length + r.pageErrors.length === 0, r);
    await context.close();
    return checks;
};

const results = [];
for (const profile of args.profiles.split(",")) {
    for (const [mode, fn] of [
        ["list", runList],
        ["ring", runRing],
        ["off", runOff],
    ]) {
        const checks = await fn(profile);
        const pass = Object.values(checks).every((c) => c.pass);
        const failed = Object.entries(checks)
            .filter(([, c]) => !c.pass)
            .map(([n]) => n);
        console.log(
            `${pass ? "PASS" : "FAIL"} ${profile} node-menus ${mode}${failed.length ? `  failed: ${failed.join(", ")}` : ""}`,
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
