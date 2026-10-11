#!/usr/bin/env node
// The gestures technique's own checks (plan section 3.7), on an emulated headset. Arrange through
// the hooks, act through emulated input, assert through the log and the hooks.
//
// - quest3-hands: thumbs up held 300 ms gives exactly one pose event and one bound command, not
//   repeated while held; held 100 ms, flickering with the default pose every two frames, or made
//   while pinching gives nothing; palm-toward-face and palm-forward pinch bindings (passed in the
//   URL) are refused at load with their reasons logged; the recorder logs a 25-joint pose; an
//   injected microgesture swipe runs its binding (weaker: IWER emulates no microgestures, so the
//   check adds buttons 5 to 9 to the hand's gamepad); switched off, thumbs up does nothing.
// - galaxyxr-hands: the microgesture bindings are logged unavailable and an injected swipe runs
//   nothing; thumbs up still works.
// - quest3-controllers: the technique is on, names "needs hand tracking", and nothing fires.
//
// IWER has no thumbs-up pose. The check adds one to the emulated hands, built from the module's
// own thumbs-up template (handy-work's fist with its flat hand's thumb) placed on IWER's default
// wrist, so the emulated hand matches the template by construction: this checks the pipeline and
// the guards, not how well the template fits a real hand.
//
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/gestures.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-gestures
// Options: --profiles a,b (default quest3-hands,galaxyxr-hands,quest3-controllers).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-gestures" },
        profiles: { type: "string", default: "quest3-hands,galaxyxr-hands,quest3-controllers" },
    },
});
if (!args.url) {
    console.error("usage: gestures.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b]");
    process.exit(2);
}
mkdirSync(args.out, { recursive: true });
process.env.FC_FONTATIONS = "1";
const browser = await chromium.launch({
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const EXTRA = "point@palm-face+pinch:undo;flat@palm-forward+pinch:redo";
const until = (page, fn, arg, timeout = 60_000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
const frames = async (page, n) => {
    const start = await page.evaluate(() => globalThis.__sandbox.xrFrames());
    await until(page, ([s, k]) => globalThis.__sandbox.xrFrames() >= s + k, [start, n]);
};
const ev = (page, fn, arg) => page.evaluate(fn, arg);

/** In the page: IWER's device and a hand's private state, reached through IWER's own symbols. */
const IWER = `
    globalThis.__iwer = (() => {
        const sym = (o, d) => Object.getOwnPropertySymbols(o).find((s) => s.description === d);
        const device = navigator.xr[sym(navigator.xr, "@iwer/xr-system")].device;
        const hand = (h) => device.hands[h];
        const poses = (h) => hand(h)[sym(hand(h), "@iwer/xr-hand-input")].poses;
        // Call fn(time, k) at every XR frame (k counts from 0) until it returns true. A pose set
        // here shows from the next frame, so holds are timed in frames, not by page timers that
        // lag on a loaded machine.
        const perFrame = (fn) =>
            new Promise((resolve) => {
                const session = navigator.xr[sym(navigator.xr, "@iwer/xr-system")].activeSession;
                let k = 0;
                const step = (time) => (fn(time, k++) ? resolve() : session.requestAnimationFrame(step));
                session.requestAnimationFrame(step);
            });
        return { device, hand, poses, perFrame };
    })();
`;

/** Add a "thumbs-up" pose to the emulated hands, from the module's template on IWER's default wrist. */
const addThumbsUp = (page) =>
    ev(page, () => {
        const poses = globalThis.__iwer.poses("right");
        const def = poses.default;
        const tmpl = globalThis.__gestures.template("thumbs-up", "left");
        const mul = (a, b) => {
            const o = new Array(16).fill(0);
            for (let c = 0; c < 4; c++) {
                for (let r = 0; r < 4; r++) {
                    for (let k = 0; k < 4; k++) {
                        o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
                    }
                }
            }
            return o;
        };
        const w = def.jointTransforms.wrist.offsetMatrix;
        const jointTransforms = {};
        Object.keys(def.jointTransforms).forEach((j, i) => {
            jointTransforms[j] = {
                offsetMatrix: mul(w, tmpl.slice(i * 16, i * 16 + 16)),
                radius: def.jointTransforms[j].radius,
            };
        });
        // Both hands share IWER's hand config, so this adds the pose to the left hand too.
        poses["thumbs-up"] = { jointTransforms, gripOffsetMatrix: def.gripOffsetMatrix };
    });

/**
 * Hold the right hand in `pose` from one XR frame until the first frame `ms` later, then back to
 * the default pose.
 */
const holdPose = (page, pose, ms) =>
    ev(
        page,
        ([p, t]) => {
            let t0 = 0;
            return globalThis.__iwer.perFrame((time, k) => {
                if (k === 0) {
                    t0 = time;
                    globalThis.__iwer.hand("right").poseId = p;
                    return false;
                }
                if (time - t0 < t) {
                    return false;
                }
                globalThis.__iwer.hand("right").poseId = "default";
                return true;
            });
        },
        [pose, ms],
    );

/** Alternate the right hand between thumbs up and the default pose every two XR frames. */
const flicker = (page, total) =>
    ev(
        page,
        (n) =>
            globalThis.__iwer.perFrame((_, k) => {
                const done = k >= n;
                globalThis.__iwer.hand("right").poseId = !done && Math.floor(k / 2) % 2 === 0 ? "thumbs-up" : "default";
                return done;
            }),
        total,
    );

/** Pose events and commands the gestures technique logged since `t0` (page time). */
const since = async (page, t0) => {
    const events = (await ev(page, () => globalThis.__gestures.events())).filter((e) => e.time >= t0);
    const log = await ev(page, () => globalThis.__sandbox.log(400));
    return {
        poses: events.filter((e) => e.type === "pose"),
        micro: events.filter((e) => e.type === "micro"),
        log,
    };
};
const now = (page) => ev(page, () => performance.now());
const wall = (page) => ev(page, () => Date.now());

/** Press a microgesture (gamepad button 5 to 9) on the right hand for a few frames. */
const swipe = async (page, index) => {
    await ev(
        page,
        (i) => {
            const b = globalThis.__iwer.hand("right").inputSource.gamepad.buttons;
            while (b.length < 10) {
                b.push({ pressed: false, touched: false, value: 0 });
            }
            Object.assign(b[i], { pressed: true, touched: true, value: 1 });
        },
        index,
    );
    await frames(page, 8);
    await ev(
        page,
        (i) => {
            Object.assign(globalThis.__iwer.hand("right").inputSource.gamepad.buttons[i], {
                pressed: false,
                touched: false,
                value: 0,
            });
        },
        index,
    );
    await frames(page, 8);
};

const runOne = async (profile) => {
    const r = { profile, checks: {}, consoleErrors: [], pageErrors: [] };
    const check = (name, pass, detail) => {
        r.checks[name] = { pass: !!pass, ...detail };
    };
    const hands = profile.endsWith("hands") && profile !== "galaxyxr-no-hands";
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && r.consoleErrors.push(m.text().slice(0, 300)));
    page.on("pageerror", (e) => r.pageErrors.push(String(e).slice(0, 300)));
    try {
        const url = new URL(args.url);
        url.search = new URLSearchParams({
            preset: "empty",
            on: "gestures",
            emulate: profile,
            still: "1",
            "s.gestures.extra": EXTRA,
            // Recorded into a pose bound to nothing, so the recording cannot fire later checks.
            "s.gestures.recordAs": "vulcan",
        }).toString();
        await page.goto(url.toString());
        await until(page, () => globalThis.__sandbox?.ready === true && !!globalThis.__gestures);
        await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
        await until(page, () => globalThis.__sandbox.inXR() && globalThis.__sandbox.xrFrames() > 10);
        await frames(page, 60);
        const tech = (await ev(page, () => globalThis.__sandbox.techniques())).find((t) => t.id === "gestures");
        check("switchedOn", tech?.on && (hands ? tech.reason === null : tech.reason === "needs hand tracking"), {
            tech,
        });

        const log0 = await ev(page, () => globalThis.__sandbox.log(400));
        const refused = log0.filter((e) => e.message === "gestures.refused").map((e) => e.data);
        check(
            "palmPinchRefusedAtLoad",
            refused.length === 2 &&
                /Quest's system gesture/.test(refused[0]?.reason) &&
                /Galaxy XR's navigation/.test(refused[1]?.reason),
            { refused },
        );

        if (!hands) {
            // Controllers: the technique stays on but nothing fires; the A button and trigger are untouched.
            const t0 = await now(page);
            await ev(page, () => globalThis.__sandbox.press("right", "trigger", true));
            await frames(page, 10);
            await ev(page, () => globalThis.__sandbox.press("right", "trigger", false));
            await frames(page, 30);
            const s = await since(page, t0);
            check("controllersNothingFires", s.poses.length === 0 && s.micro.length === 0, {
                poses: s.poses.length,
                micro: s.micro.length,
            });
        } else {
            await ev(page, IWER);
            await addThumbsUp(page);
            // The hand aimed at empty space, so a stray pinch selects nothing.
            await ev(page, () => globalThis.__sandbox.aim("right", "space"));
            await frames(page, 10);

            // Held 300 ms: exactly one pose event and one bound command.
            let t0 = await now(page);
            let w0 = await wall(page);
            const before = (await ev(page, () => globalThis.__sandbox.state())).colorBy;
            await holdPose(page, "thumbs-up", 300);
            await frames(page, 20);
            let s = await since(page, t0);
            const cmds = s.log.filter(
                (e) => e.time >= w0 && e.message === "command" && e.data?.technique === "gestures",
            );
            const after = (await ev(page, () => globalThis.__sandbox.state())).colorBy;
            check(
                "thumbsUp300msOnce",
                s.poses.length === 1 && s.poses[0].gesture === "thumbs-up" && cmds.length === 1 && after !== before,
                {
                    poses: s.poses,
                    commands: cmds.map((e) => e.data?.label),
                    colorBy: [before, after],
                },
            );

            // Held 100 ms: nothing.
            t0 = await now(page);
            await holdPose(page, "thumbs-up", 100);
            await frames(page, 20);
            s = await since(page, t0);
            check("thumbsUp100msNothing", s.poses.length === 0, { poses: s.poses.length });

            // Flickering every two frames: nothing.
            t0 = await now(page);
            await flicker(page, 60);
            await frames(page, 20);
            s = await since(page, t0);
            check("flickerNothing", s.poses.length === 0, { frames: 60, poses: s.poses.length });

            // While pinching: the hand shows thumbs up but the platform reports a pinch (select).
            t0 = await now(page);
            await ev(page, () => {
                const p = globalThis.__iwer.poses("right");
                globalThis.__savedPinch = p.pinch;
                // IWER blends the joints toward its pinch pose by the pinch value, and the same value
                // presses select: with the pinch pose swapped for thumbs up, both change together.
                p.pinch = p["thumbs-up"];
                globalThis.__iwer.hand("right").updatePinchValue(1);
            });
            await ev(page, () => {
                let t0 = 0;
                return globalThis.__iwer.perFrame((time, k) => {
                    t0 = k === 0 ? time : t0;
                    return time - t0 >= 400;
                });
            });
            // Back to a real pinch while still pinching, then release, so thumbs up never shows unpinched.
            await ev(page, () => {
                globalThis.__iwer.poses("right").pinch = globalThis.__savedPinch;
            });
            await frames(page, 4);
            await ev(page, () => globalThis.__iwer.hand("right").updatePinchValue(0));
            await frames(page, 20);
            s = await since(page, t0);
            const sel = s.log.filter((e) => e.message === "arbiter.win" && e.data?.channel === "select");
            check("whilePinchingNothing", s.poses.length === 0 && sel.length > 0, {
                poses: s.poses.length,
                selectPresses: sel.length,
            });

            // The recorder (the gear panel action's effect, started through the module's hook).
            w0 = await wall(page);
            await ev(page, () => globalThis.__gestures.record(300));
            await until(
                page,
                (t) => globalThis.__sandbox.log(50).some((e) => e.time >= t && e.message === "gestures.recorded"),
                w0,
            );
            const rec = (await ev(page, () => globalThis.__sandbox.log(100))).find(
                (e) => e.time >= w0 && e.message === "gestures.recorded",
            )?.data;
            const bytes = rec?.handpose ? Buffer.from(rec.handpose, "base64").length : 0;
            check(
                "recorderLogs25Joints",
                rec?.joints === 25 && rec.floats === 851 && bytes === 851 * 4 && rec.hands?.length === 2,
                { joints: rec?.joints, floats: rec?.floats, bytes, hands: rec?.hands, name: rec?.name },
            );

            // Microgesture swipe right (injected: weaker).
            t0 = await now(page);
            w0 = await wall(page);
            const c0 = (await ev(page, () => globalThis.__sandbox.state())).colorBy;
            await swipe(page, 6);
            s = await since(page, t0);
            const microWins = s.log.filter(
                (e) => e.time >= w0 && e.message === "arbiter.win" && e.data?.channel === "micro",
            );
            const microLog = s.log.filter((e) => e.time >= w0 && e.message === "gestures.micro").map((e) => e.data);
            const c1 = (await ev(page, () => globalThis.__sandbox.state())).colorBy;
            const bindings = (await ev(page, () => globalThis.__sandbox.log(400))).find(
                (e) => e.message === "gestures.bindings",
            )?.data;
            if (profile.startsWith("quest3")) {
                check(
                    "microSwipeRunsBinding",
                    microWins.some((e) => e.data?.technique === "gestures") &&
                        microLog.length === 1 &&
                        microLog[0].ran &&
                        c1 !== c0,
                    { weaker: "injected gamepad buttons", wins: microWins.length, microLog, colorBy: [c0, c1] },
                );
            } else {
                check(
                    "microUnavailable",
                    bindings?.unavailable?.length === 5 &&
                        /no thumb microgestures/.test(bindings.unavailableReason ?? "") &&
                        microLog.every((m) => m.ran === false) &&
                        c1 === c0,
                    { unavailable: bindings?.unavailable, reason: bindings?.unavailableReason, microLog },
                );
            }

            // Switched off: thumbs up does nothing; on again it works.
            await ev(page, () => globalThis.__sandbox.setOn("gestures", false));
            t0 = await now(page);
            await holdPose(page, "thumbs-up", 300);
            await frames(page, 20);
            const off = (await since(page, t0)).poses.length;
            await ev(page, () => globalThis.__sandbox.setOn("gestures", true));
            t0 = await now(page);
            await holdPose(page, "thumbs-up", 300);
            await frames(page, 20);
            const on = (await since(page, t0)).poses.length;
            check("offAndOn", off === 0 && on === 1, { offPoses: off, onPoses: on });
        }
        const f = await ev(page, () => globalThis.__sandbox.frames(120));
        // This technique's cost is its hook time; whole-frame JS over 50 ms on this shared machine
        // is reported, and judged by the generic dry run.
        check("hookTime", f.hooksP95 < 2, { ...f });
        check("noErrors", r.consoleErrors.length === 0 && r.pageErrors.length === 0, {
            consoleErrors: r.consoleErrors,
            pageErrors: r.pageErrors,
        });
    } catch (e) {
        check("ran", false, { error: String(e).slice(0, 500) });
    }
    try {
        await page.screenshot({ path: join(args.out, `${profile}--gestures.png`) });
    } catch {
        // a crashed page has nothing to show
    }
    await context.close();
    r.pass = Object.values(r.checks).every((c) => c.pass);
    return r;
};

const results = [];
for (const profile of args.profiles.split(",")) {
    const r = await runOne(profile);
    results.push(r);
    const failed = Object.entries(r.checks)
        .filter(([, c]) => !c.pass)
        .map(([n]) => n);
    const failedNote = failed.length ? `  failed: ${failed.join(", ")}` : "";
    console.log(`${r.pass ? "PASS" : "FAIL"} ${profile}${failedNote}`);
}
await browser.close();
const report = { url: args.url, time: new Date().toISOString(), pass: results.every((r) => r.pass), results };
writeFileSync(join(args.out, "report.json"), JSON.stringify(report, null, 2));
console.log(
    `${results.filter((r) => r.pass).length} of ${results.length} profiles passed; ${join(args.out, "report.json")}`,
);
process.exit(report.pass ? 0 : 1);
