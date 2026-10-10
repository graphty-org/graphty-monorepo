#!/usr/bin/env node
// The wrist menu's own checks (plan section 3.3), on an emulated headset with the module on and off,
// with hands and with controllers. Arrange through the hook (a command to undo, where the head looks),
// act through emulated input (the off hand's pose, a poke or a ray press by the other hand, IWER's
// animate_to), assert through the log, the hook and the module's read-only probe (`__wristMenu`).
//
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/wrist-menu.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-wrist-menu
// Options: --profiles a,b (default quest3-hands,quest3-controllers,galaxyxr-no-hands).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-wrist-menu" },
        profiles: { type: "string", default: "quest3-hands,quest3-controllers,galaxyxr-no-hands" },
    },
});
if (!args.url) {
    console.error("usage: wrist-menu.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b]");
    process.exit(2);
}
mkdirSync(args.out, { recursive: true });
process.env.FC_FONTATIONS = "1";
const browser = await chromium.launch({
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

/** The off (left) hand's orientations, IWER Euler degrees, found by reading the palm normal back. */
const POSE = {
    sideways: { pitch: 0, yaw: 0, roll: 90 }, // left palm faces right, across the body
    palmUp: { pitch: 0, yaw: 0, roll: 180 },
    palmFace: { pitch: -90, yaw: 0, roll: 0 },
    gripNeutral: { pitch: 0, yaw: 0, roll: 0 }, // controller held thumb up, pointing ahead
    gripToFace: { pitch: 0, yaw: -90, roll: 0 }, // forearm across the chest, inner wrist to the face
};
/** Where the off hand is held (XR coordinates: -z is ahead). */
const HELD = { x: -0.1, y: 1.4, z: -0.35 };
const SHOW_MS = 200;
/**
 * Headless frames run 30 to 120 ms on the software renderer, so the 200 ms budget is also checked
 * as frames at the slowest headset rate (72 Hz): 14 frames. The module adds no time-based hold.
 */
const SHOW_FRAMES = Math.floor(SHOW_MS / (1000 / 72));
const LAG_MM = 1;

const until = (page, fn, arg, timeout = 60_000) => page.waitForFunction(fn, arg, { timeout, polling: 20 });
const frames = async (page, n) => {
    const start = await page.evaluate(() => window.__sandbox.xrFrames());
    await until(page, ([s, k]) => window.__sandbox.xrFrames() >= s + k, [start, n]);
};
const sb = (page, fn, arg) => page.evaluate(fn, arg);
const now = (page) => sb(page, () => Date.now());
const logSince = async (page, t0, prefix) =>
    (await sb(page, () => window.__sandbox.log(400))).filter((e) => e.time >= t0 && e.message.startsWith(prefix));
const menu = (page) => sb(page, () => window.__wristMenu.state());
const dispatch = (page, method, params) => sb(page, ([m, p]) => window.__sandbox.dispatch(m, p), [method, params]);
const add = (p, d, s) => p.map((v, i) => v + d[i] * s);

/**
 * Put the off hand at HELD with an orientation; return how long until the menu's visibility changed
 * to `expect` (ms, page clock), or null if it did not within 2 s.
 */
const poseOff = async (page, device, orientation, expect) => {
    const [t0, f0] = await sb(page, () => [performance.now(), window.__wristMenu.state().frame]);
    await dispatch(page, "set_transform", { device, position: HELD, orientation });
    try {
        await until(page, (e) => window.__wristMenu.state().visible === e, expect, 2000);
    } catch {
        return null;
    }
    const s = await menu(page);
    lastFrames = s.changedFrame - f0;
    return Math.round(s.changedAt - t0);
};
/** Frames the last poseOff took, counted by the module's frame hook. */
let lastFrames = 0;

/** Poke a wrist-menu button with the right index fingertip: approach, push through, withdraw. */
const poke = async (page, name) => {
    const b = await sb(page, (n) => window.__wristMenu.button(n), name);
    await sb(page, (p) => window.__sandbox.aimAt("right", p[0], p[1], p[2]), b.point);
    const placeTip = async (target) => {
        // The tip's offset from the hand's position is fixed for this orientation: measure, then move.
        const hand = (await dispatch(page, "get_transform", { device: "hand-right" })).position;
        const tip = await sb(page, () => window.__wristMenu.tip("right"));
        const delta = target.map((v, i) => v - tip[i]);
        await dispatch(page, "set_transform", {
            device: "hand-right",
            position: { x: hand.x + delta[0], y: hand.y + delta[1], z: hand.z - delta[2] },
        });
        await frames(page, 3);
    };
    for (const d of [0.08, 0.04, 0.02, 0.005, -0.008, -0.008, 0.04, 0.12]) {
        await placeTip(add(b.point, b.toward, d));
        await frames(page, 4);
    }
};

/** The right hand back at arm's length, out of near-touch range of the menu. */
const restRight = async (page) => {
    const device = (await sb(page, () => window.__sandbox.hover("right"))).isHand ? "hand-right" : "controller-right";
    await dispatch(page, "set_transform", { device, position: { x: 0.25, y: 1.5, z: -0.4 } });
    await frames(page, 3);
};

/** A ray press on a wrist-menu button by the right hand (pinch or trigger). */
const rayPress = async (page, name, kind) => {
    await restRight(page);
    const b = await sb(page, (n) => window.__wristMenu.button(n), name);
    await sb(page, (p) => window.__sandbox.aimAt("right", p[0], p[1], p[2]), b.point);
    await frames(page, 10);
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

/** Hold the off hand sideways and look at it; the menu should show. */
const showMenu = async (page, hands) => {
    await dispatch(page, "look_at", { device: "headset", target: HELD });
    return poseOff(page, hands ? "hand-left" : "controller-left", hands ? POSE.sideways : POSE.gripToFace, true);
};

const runOn = async (profile) => {
    const hands = profile === "quest3-hands" || profile === "galaxyxr-hands";
    const press = hands ? "pinch" : "trigger";
    const checks = {};
    const check = (name, pass, detail) => (checks[name] = { pass: !!pass, ...detail });
    const off = hands ? "hand-left" : "controller-left";

    // --- Module on ---
    let { page, context, r } = await open(profile, { preset: "empty", on: "wrist-menu" });
    try {
        const on = (await sb(page, () => window.__sandbox.techniques())).find((t) => t.id === "wrist-menu");
        check("moduleOn", on?.on, { reason: on?.reason });

        await dispatch(page, "look_at", { device: "headset", target: HELD });
        if (hands) {
            const hiddenStart = await poseOff(page, off, POSE.palmUp, false);
            const showMs = await poseOff(page, off, POSE.sideways, true);
            const showFrames = lastFrames;
            const s = await menu(page);
            check("palmSidewaysShows", showMs !== null && (showMs <= SHOW_MS || showFrames <= SHOW_FRAMES), {
                showMs,
                showFrames,
                limit: `${SHOW_MS} ms, or ${SHOW_FRAMES} frames (${SHOW_MS} ms at 72 Hz)`,
                across: s.across,
                level: s.level,
                mode: s.mode,
                startedHidden: hiddenStart !== null || !s.visible,
            });
            const upMs = await poseOff(page, off, POSE.palmUp, false);
            await poseOff(page, off, POSE.sideways, true);
            const faceMs = await poseOff(page, off, POSE.palmFace, false);
            const sf = await menu(page);
            check("palmUpOrFaceHides", upMs !== null && faceMs !== null, {
                palmUpHidMs: upMs,
                palmFaceHidMs: faceMs,
                palmFacePose: sf.poses.palmFace,
            });
            // Looking away hides it too (Babylon's gaze test).
            await poseOff(page, off, POSE.sideways, true);
            await dispatch(page, "look_at", { device: "headset", target: { x: 0.6, y: 1.6, z: -1 } });
            await frames(page, 6);
            const away = await menu(page);
            check("lookAwayHides", !away.visible, { visible: away.visible, want: away.want });
        } else {
            await poseOff(page, off, POSE.gripNeutral, false);
            const s0 = await menu(page);
            const showMs = await poseOff(page, off, POSE.gripToFace, true);
            const showFrames = lastFrames;
            const s = await menu(page);
            const fast = showMs !== null && (showMs <= SHOW_MS || showFrames <= SHOW_FRAMES);
            check("gripToFaceShows", !s0.visible && fast && s.mode === "controller", {
                showFrames,
                neutralFacing: s0.facing,
                neutralVisible: s0.visible,
                showMs,
                facing: s.facing,
                mode: s.mode,
            });
            const backMs = await poseOff(page, off, POSE.gripNeutral, false);
            check("gripNeutralHides", backMs !== null, { hidMs: backMs });
        }

        // Undo: arrange a command, then the other hand presses Undo (poke with hands, ray with controllers).
        const shown = await showMenu(page, hands);
        await sb(page, () => window.__sandbox.run("colorBy", { result: "pagerank" }));
        await frames(page, 4);
        const label = (await menu(page)).undo;
        let t0 = await now(page);
        if (hands) {
            await poke(page, "undo");
        } else {
            await rayPress(page, "undo", press);
        }
        let cmds = (await logSince(page, t0, "command")).map((e) => e.data);
        let items = (await logSince(page, t0, "wrist-menu.item")).map((e) => e.data);
        let state = await sb(page, () => window.__sandbox.state());
        check(hands ? "pokeUndo" : "rayUndo", cmds.some((c) => c.code === "undo") && state.colorBy !== "pagerank", {
            shownMs: shown,
            buttonText: label,
            items: items.map((i) => `${i.item} by ${i.hand}`),
            commands: cmds.map((c) => `${c.code} ${c.technique ?? ""} ${c.hand ?? ""}`),
            colorByAfter: state.colorBy,
        });

        if (hands) {
            // The menu hand's own pinch does nothing on the menu.
            await sb(page, () => window.__sandbox.run("colorBy", { result: "degree" }));
            await showMenu(page, hands);
            t0 = await now(page);
            await sb(page, () => window.__sandbox.press("left", "pinch", true));
            await frames(page, 8);
            await sb(page, () => window.__sandbox.press("left", "pinch", false));
            await frames(page, 8);
            cmds = (await logSince(page, t0, "command")).map((e) => e.data);
            items = await logSince(page, t0, "wrist-menu.item");
            state = await sb(page, () => window.__sandbox.state());
            const stillShown = (await menu(page)).visible;
            check(
                "menuHandPinchDoesNothing",
                items.length === 0 && !cmds.some((c) => c.code === "undo") && state.colorBy === "degree",
                {
                    items: items.length,
                    commands: cmds.map((c) => c.code),
                    colorBy: state.colorBy,
                    menuStillShown: stillShown,
                },
            );
        }

        // Settings opens the gear panel; pressing it again closes it.
        await showMenu(page, hands);
        if (hands) {
            await poke(page, "settings");
        } else {
            await rayPress(page, "settings", press);
        }
        const gearOpen = await sb(page, () => window.__sandbox.gearOpen());
        await showMenu(page, hands);
        if (hands) {
            await poke(page, "settings");
        } else {
            await rayPress(page, "settings", press);
        }
        const gearClosed = !(await sb(page, () => window.__sandbox.gearOpen()));
        check("settingsOpensGear", gearOpen && gearClosed, { opened: gearOpen, closedAgain: gearClosed });

        // Flag logs a flag entry (by ray, both kinds of input).
        await showMenu(page, hands);
        t0 = await now(page);
        const flagHover = await rayPress(page, "flag", press);
        const flags = await logSince(page, t0, "flag");
        check("flagLogs", flags.length === 1, { flags: flags.map((e) => e.data.id), hover: flagHover });

        // Recenter re-places the graph from where the head now looks (at the wrist, down and left).
        await showMenu(page, hands);
        const before = await sb(page, () => window.__wristMenu.graphRoot());
        t0 = await now(page);
        await rayPress(page, "recenter", press);
        const after = await sb(page, () => window.__wristMenu.graphRoot());
        const recenters = await logSince(page, t0, "recenter");
        const moved = Math.hypot(...after.map((v, i) => v - before[i]));
        check("recenterReplacesGraph", recenters.length === 1 && moved > 0.05, {
            logged: recenters.length,
            movedM: Math.round(moved * 1000) / 1000,
        });

        // Held UI lag: the off hand moved with animate_to; the menu keeps its offset in the same frame.
        await showMenu(page, hands);
        const lagP = sb(page, () => window.__wristMenu.lag(45));
        await dispatch(page, "animate_to", {
            device: off,
            position: { x: HELD.x + 0.15, y: HELD.y + 0.1, z: HELD.z },
            duration: 0.5,
        });
        const lag = await lagP;
        await dispatch(page, "set_transform", { device: off, position: HELD });
        check("heldUiLag", lag.maxMm < LAG_MM && lag.movedMm > 50, { ...lag, limitMm: LAG_MM });

        await restRight(page);
        await sb(page, () => window.__sandbox.aim("right", "space"));
        await frames(page, 20);
        const idle = await sb(page, () => window.__sandbox.jitter(30));
        check("menuIdle", idle.panelRenders === 0 && idle.maxMm < 0.05, {
            panelRenders: idle.panelRenders,
            maxMm: idle.maxMm,
            worst: idle.worst,
        });
        check("noErrors", r.consoleErrors.length === 0 && r.pageErrors.length === 0, r);
        await showMenu(page, hands);
        await page.screenshot({ path: join(args.out, `${profile}--on.png`) });
    } catch (e) {
        check("ran", false, { error: String(e).slice(0, 500) });
    }
    await context.close();

    // --- Detector sanity (hands): with Babylon's default smoothing the lag check must fail ---
    if (hands) {
        ({ page, context, r } = await open(profile, {
            preset: "empty",
            on: "wrist-menu",
            "s.wrist-menu.followLagMs": "100",
        }));
        try {
            await showMenu(page, hands);
            const lagP = sb(page, () => window.__wristMenu.lag(45));
            await dispatch(page, "animate_to", {
                device: off,
                position: { x: HELD.x + 0.15, y: HELD.y + 0.1, z: HELD.z },
                duration: 0.5,
            });
            const lag = await lagP;
            check("lagDetectorWorks", lag.maxMm > LAG_MM, { ...lag, followLagMs: 100, expect: `over ${LAG_MM} mm` });
        } catch (e) {
            check("lagDetectorWorks", false, { error: String(e).slice(0, 500) });
        }
        await context.close();
    }

    // --- Module off: the same pose shows nothing ---
    ({ page, context, r } = await open(profile, { preset: "empty" }));
    try {
        const on = (await sb(page, () => window.__sandbox.techniques())).find((t) => t.id === "wrist-menu");
        await dispatch(page, "look_at", { device: "headset", target: HELD });
        await dispatch(page, "set_transform", {
            device: off,
            position: HELD,
            orientation: hands ? POSE.sideways : POSE.gripToFace,
        });
        await frames(page, 15);
        const s = await menu(page);
        const logged = await logSince(page, 0, "wrist-menu.");
        check("offShowsNothing", !on?.on && !s.visible && logged.length === 0, {
            on: on?.on,
            visible: s.visible,
            entries: logged.length,
        });
        check("offNoErrors", r.consoleErrors.length === 0 && r.pageErrors.length === 0, r);
        await page.screenshot({ path: join(args.out, `${profile}--off.png`) });
    } catch (e) {
        check("offRan", false, { error: String(e).slice(0, 500) });
    }
    await context.close();

    return { profile, pass: Object.values(checks).every((c) => c.pass), checks };
};

const results = [];
for (const profile of args.profiles.split(",")) {
    const res = await runOn(profile);
    results.push(res);
    const failed = Object.entries(res.checks)
        .filter(([, c]) => !c.pass)
        .map(([n]) => n);
    console.log(
        `${res.pass ? "PASS" : "FAIL"} ${profile}  ${Object.keys(res.checks).length} checks${failed.length ? `  failed: ${failed.join(", ")}` : ""}`,
    );
}
await browser.close();
const report = { url: args.url, time: new Date().toISOString(), pass: results.every((x) => x.pass), results };
writeFileSync(join(args.out, "report.json"), JSON.stringify(report, null, 2));
console.log(`report: ${join(args.out, "report.json")}`);
process.exit(report.pass ? 0 : 1);
