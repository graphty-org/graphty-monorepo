#!/usr/bin/env node
// Dry-run checks for handling the graph (plan section 3.4), on an emulated headset. For each profile
// and each two-hand setting ("ours", "stock") it opens `preset=empty&on=handling` with the held copy
// on, enters VR, and checks:
// - one hand (grip, or the fist pose with hands): move 10 cm and turn 30 degrees, and the graph root
//   follows the grip rigidly within 1 mm and 1 degree, then does not drift for 60 frames after
//   release; the camera never gets a parent;
// - the held copy: above the off controller, or above the off palm turned up; the dominant ray on
//   the copy's Medici hovers the Medici of the full graph, and a tap selects it;
// - two hands moved apart to twice their distance scale the graph 2x within 2%; held still, the
//   graph's per-frame movement stays within the dry run's jitter tolerance; ten times the distance
//   clamps at 5x ("ours") or runs unclamped ("stock", Babylon's own behavior);
// - switching handling off mid-hold cancels the hold and puts the graph back.
// Plus one run with handling off: a grip moves nothing.
//
// Run inside a browser slot:
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/handling.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-handling
// Options: --profiles (default quest3-controllers,quest3-hands), --modes (default ours,stock).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-handling" },
        profiles: { type: "string", default: "quest3-controllers,quest3-hands" },
        modes: { type: "string", default: "ours,stock" },
    },
});
if (!args.url) {
    console.error(
        "usage: handling.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b] [--modes ours,stock]",
    );
    process.exit(2);
}
// The dry run's tolerances (design section 11.2).
const JITTER_MM = 0.05;
const JITTER_DEG = 0.01;

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
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const V = (a) => Vector3.FromArray(a);
const Q = (a) => Quaternion.FromArray(a);
// Normalized first: a quaternion a hair under unit length reads as a turn against itself.
const deg = (a, b) =>
    (2 * Math.acos(Math.min(1, Math.abs(Quaternion.Dot(a.normalizeToNew(), b.normalizeToNew())))) * 180) / Math.PI;
const r4 = (x) => Math.round(x * 1e4) / 1e4;

const open = async (r, profile, query) => {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && r.consoleErrors.push(m.text().slice(0, 300)));
    page.on("pageerror", (e) => r.pageErrors.push(String(e).slice(0, 300)));
    const url = new URL(args.url);
    url.search = new URLSearchParams({ preset: "empty", emulate: profile, still: "1", ...query }).toString();
    await page.goto(url.toString());
    await until(page, () => window.__sandbox?.ready === true && !!window.__handling);
    await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
    await until(page, () => window.__sandbox.inXR() && window.__sandbox.xrFrames() > 10);
    await frames(page, 60);
    return { context, page };
};

/** Point a hand straight along a direction from where it is (Babylon world). */
const point = async (page, hand, [x, y, z], [dx, dy, dz]) => {
    await ev(page, ([h, p]) => window.__sandbox.place(h, ...p), [hand, [x, y, z]]);
    await ev(page, (p) => window.__handling.mark(...p), [x + dx, y + dy, z + dz]);
    await ev(page, (h) => window.__sandbox.aim(h, "handling-aim"), hand);
};

/** Grip (controllers) or fist (hands), and wait until handling holds that hand or lets it go. */
const hold = async (page, hand, hands, down) => {
    await ev(page, ([h, k, d]) => window.__sandbox.press(h, k, d), [hand, hands ? "fist" : "squeeze", down]);
    await until(page, ([h, d]) => window.__handling.held().includes(h) === d, [hand, down], 10_000);
};

const runOne = async (profile, mode) => {
    const r = { profile, mode, checks: {}, consoleErrors: [], pageErrors: [] };
    const check = (name, pass, detail) => {
        r.checks[name] = { pass: !!pass, ...detail };
    };
    const hands = profile.endsWith("hands") && profile !== "galaxyxr-no-hands";
    let context;
    let page;
    try {
        ({ context, page } = await open(r, profile, {
            on: "handling",
            "s.handling.twoHand": mode,
            "s.handling.copy": "true",
        }));
        const tech = (await ev(page, () => window.__sandbox.techniques())).find((t) => t.id === "handling");
        check("switchedOn", tech?.on && tech.reason === null, { tech });

        // One hand: hold, move 10 cm, turn 30 degrees about the vertical, wait for the easing.
        await point(page, "right", [0.15, 1.3, 0.35], [0, 0, 1]);
        await frames(page, 20);
        await hold(page, "right", hands, true);
        await frames(page, 5);
        const g0 = await ev(page, () => window.__handling.grip("right"));
        const r0 = await ev(page, () => window.__handling.root());
        const t = Math.PI / 6;
        await point(page, "right", [0.25, 1.3, 0.35], [Math.sin(t), 0, Math.cos(t)]);
        await frames(page, 90);
        const g1 = await ev(page, () => window.__handling.grip("right"));
        const r1 = await ev(page, () => window.__handling.root());
        await hold(page, "right", hands, false);
        await frames(page, 2);
        const r2 = await ev(page, () => window.__handling.root());
        await frames(page, 60);
        const r3 = await ev(page, () => window.__handling.root());
        // Rigid with the grip: the root's pose relative to the grip is what it was at the press.
        const turn = Q(g1.rotation).multiply(Quaternion.Inverse(Q(g0.rotation)));
        const want = V(r0.position)
            .subtract(V(g0.position))
            .rotateByQuaternionToRef(turn, new Vector3())
            .addInPlace(V(g1.position));
        const wantRot = turn.multiply(Q(r0.rotation));
        const errMm = Vector3.Distance(want, V(r1.position)) * 1000;
        const errDeg = deg(wantRot, Q(r1.rotation));
        const gripMovedCm = Vector3.Distance(V(g0.position), V(g1.position)) * 100;
        const gripTurnedDeg = deg(Q(g0.rotation), Q(g1.rotation));
        // The controller moved 10 cm and turned 30 degrees; its grip, offset from the controller's
        // origin, moves a little less. The root must follow the grip rigidly.
        const rootMovedCm = Vector3.Distance(V(r0.position), V(r1.position)) * 100;
        check("oneHand", errMm < 1 && errDeg < 1 && Math.abs(gripTurnedDeg - 30) < 1 && rootMovedCm > 5, {
            errMm: r4(errMm),
            errDeg: r4(errDeg),
            gripMovedCm: r4(gripMovedCm),
            gripTurnedDeg: r4(gripTurnedDeg),
            rootMovedCm: r4(rootMovedCm),
            rootTurnedDeg: r4(deg(Q(r0.rotation), Q(r1.rotation))),
        });
        const driftMm = Vector3.Distance(V(r2.position), V(r3.position)) * 1000;
        const driftDeg = deg(Q(r2.rotation), Q(r3.rotation));
        const cameraParent = await ev(page, () => window.__handling.cameraParent());
        check("noDriftAfterRelease", driftMm < 0.01 && driftDeg < 0.001 && cameraParent === null, {
            driftMm: r4(driftMm),
            driftDeg: r4(driftDeg),
            cameraParent,
        });

        // The held copy: off hand (left) palm up, or the off controller; the dominant ray on its Medici.
        await point(page, "left", [-0.12, 1.2, 0.3], [0, 0, 1]);
        let roll = null;
        if (hands) {
            // Rolled 180 degrees about its pointing axis, IWER's left hand faces up (and, held below
            // the head, toward the face too, as a real palm you look at does).
            await ev(page, () => window.__sandbox.turn("left", [0, 0, 1], 180));
            await frames(page, 20);
            roll = (await ev(page, () => window.__handling.poses("left"))).palmUp ? 180 : null;
        }
        await frames(page, 10);
        const copy = await ev(page, () => window.__handling.copy());
        const medici = await ev(page, () => window.__handling.copyNode("Medici"));
        await point(page, "right", [0.12, 1.25, 0.3], [0, 0, 1]);
        await ev(page, (p) => window.__handling.mark(...p), medici);
        await ev(page, () => window.__sandbox.aim("right", "handling-aim"));
        await frames(page, 20);
        const hover = await ev(page, () => window.__sandbox.hover("right"));
        const hoverName = await ev(page, (i) => window.__handling.name(i), hover.node);
        await ev(page, (k) => window.__sandbox.press("right", k, true), hands ? "pinch" : "trigger");
        await frames(page, 6);
        await ev(page, (k) => window.__sandbox.press("right", k, false), hands ? "pinch" : "trigger");
        await frames(page, 10);
        const selection = (await ev(page, () => window.__sandbox.state())).selection;
        check(
            "heldCopy",
            copy.shown && hoverName === "Medici" && hover.context === "node" && selection.join() === "Medici",
            {
                shown: copy.shown,
                palmUpRoll: roll,
                hover: hoverName,
                context: hover.context,
                selection,
            },
        );
        if (hands) {
            // Palm back down: the copy goes.
            await point(page, "left", [-0.12, 1.2, 0.3], [0, 0, 1]);
            await frames(page, 20);
            check("copyHidesPalmDown", !(await ev(page, () => window.__handling.copy())).shown, {});
        }

        // Two hands: apart to twice their grip distance, held still, then ten times.
        await point(page, "left", [-0.15, 1.3, 0.35], [0, 0, 1]);
        await point(page, "right", [0.15, 1.3, 0.35], [0, 0, 1]);
        await frames(page, 20);
        await hold(page, "left", hands, true);
        await hold(page, "right", hands, true);
        await frames(page, 5);
        const twoMode = await ev(page, () => window.__handling.mode());
        const gl0 = V((await ev(page, () => window.__handling.grip("left"))).position);
        const gr0 = V((await ev(page, () => window.__handling.grip("right"))).position);
        const s0 = (await ev(page, () => window.__handling.root())).scale[0];
        const d0 = Vector3.Distance(gl0, gr0);
        const u = gr0.subtract(gl0).normalize();
        const spread = async (k) => {
            const half = ((k - 1) * d0) / 2;
            await ev(page, ([h, p]) => window.__sandbox.place(h, ...p), [
                "left",
                new Vector3(-0.15, 1.3, 0.35).subtract(u.scale(half)).asArray(),
            ]);
            await ev(page, ([h, p]) => window.__sandbox.place(h, ...p), [
                "right",
                new Vector3(0.15, 1.3, 0.35).add(u.scale(half)).asArray(),
            ]);
            await frames(page, 150);
            const gl = V((await ev(page, () => window.__handling.grip("left"))).position);
            const gr = V((await ev(page, () => window.__handling.grip("right"))).position);
            return {
                ratio: Vector3.Distance(gl, gr) / d0,
                scale: (await ev(page, () => window.__handling.root())).scale[0] / s0,
            };
        };
        const two = await spread(2);
        check(
            "twoHandScale2x",
            twoMode === mode && Math.abs(two.ratio - 2) < 0.01 && Math.abs(two.scale / two.ratio - 1) < 0.02,
            {
                mode: twoMode,
                handRatio: r4(two.ratio),
                scale: r4(two.scale),
            },
        );
        const j = await ev(page, () => window.__sandbox.jitter(120));
        check("twoStillHandsJitter", j.maxMm < JITTER_MM && j.maxDeg < JITTER_DEG, {
            maxMm: r4(j.maxMm),
            maxDeg: j.maxDeg,
            worst: j.worst,
        });
        const ten = await spread(10);
        // Ours clamps at 5x; Babylon's stock two-pointer drag has no clamp.
        const wantTen = mode === "ours" ? 5 : ten.ratio;
        check("twoHandScale10x", Math.abs(ten.scale / wantTen - 1) < 0.02, {
            handRatio: r4(ten.ratio),
            scale: r4(ten.scale),
            want: r4(wantTen),
        });
        await hold(page, "left", hands, false);
        await hold(page, "right", hands, false);

        // Switched off mid-hold: the hold is cancelled and the graph goes back.
        await point(page, "right", [0.15, 1.3, 0.35], [0, 0, 1]);
        await frames(page, 10);
        const c0 = await ev(page, () => window.__handling.root());
        await hold(page, "right", hands, true);
        await point(page, "right", [0.25, 1.3, 0.35], [0, 0, 1]);
        await frames(page, 30);
        const moved = await ev(page, () => window.__handling.root());
        await ev(page, () => window.__sandbox.setOn("handling", false));
        await frames(page, 5);
        const c1 = await ev(page, () => window.__handling.root());
        await ev(page, (k) => window.__sandbox.press("right", k, false), hands ? "fist" : "squeeze");
        await ev(page, () => window.__sandbox.setOn("handling", true));
        check(
            "cancelRestores",
            Vector3.Distance(V(moved.position), V(c0.position)) > 0.05 &&
                Vector3.Distance(V(c0.position), V(c1.position)) < 1e-6,
            {
                movedCm: r4(Vector3.Distance(V(moved.position), V(c0.position)) * 100),
                backMm: r4(Vector3.Distance(V(c0.position), V(c1.position)) * 1000),
            },
        );

        const log = await ev(page, () => window.__sandbox.log(400));
        check(
            "logged",
            log.some((e) => e.message === "handling.grab") && log.some((e) => e.message === "handling.twoHand"),
            {
                entries: log.filter((e) => e.message.startsWith("handling.")).map((e) => e.message),
            },
        );
        await page.screenshot({ path: join(args.out, `${profile}--${mode}.png`) });
    } catch (e) {
        check("ran", false, { error: String(e).slice(0, 500) });
    }
    check("noErrors", r.consoleErrors.length === 0 && r.pageErrors.length === 0, {
        consoleErrors: r.consoleErrors,
        pageErrors: r.pageErrors,
    });
    await context?.close();
    r.pass = Object.values(r.checks).every((c) => c.pass);
    return r;
};

/** Handling off: a grip moves nothing. */
const runOff = async (profile) => {
    const r = { profile, mode: "off", checks: {}, consoleErrors: [], pageErrors: [] };
    const hands = profile.endsWith("hands") && profile !== "galaxyxr-no-hands";
    let context;
    try {
        let page;
        ({ context, page } = await open(r, profile, {}));
        await point(page, "right", [0.15, 1.3, 0.35], [0, 0, 1]);
        await frames(page, 10);
        const a = await ev(page, () => window.__handling.root());
        await ev(page, (k) => window.__sandbox.press("right", k, true), hands ? "fist" : "squeeze");
        await frames(page, 20);
        await point(page, "right", [0.25, 1.3, 0.35], [0, 0, 1]);
        await frames(page, 30);
        const b = await ev(page, () => window.__handling.root());
        await ev(page, (k) => window.__sandbox.press("right", k, false), hands ? "fist" : "squeeze");
        const on = (await ev(page, () => window.__sandbox.techniques())).find((t) => t.id === "handling").on;
        r.checks.offMovesNothing = {
            pass: !on && Vector3.Distance(V(a.position), V(b.position)) === 0,
            on,
            movedMm: Vector3.Distance(V(a.position), V(b.position)) * 1000,
        };
    } catch (e) {
        r.checks.ran = { pass: false, error: String(e).slice(0, 500) };
    }
    r.checks.noErrors = {
        pass: r.consoleErrors.length === 0 && r.pageErrors.length === 0,
        consoleErrors: r.consoleErrors,
        pageErrors: r.pageErrors,
    };
    await context?.close();
    r.pass = Object.values(r.checks).every((c) => c.pass);
    return r;
};

const results = [];
for (const profile of args.profiles.split(",")) {
    for (const mode of args.modes.split(",")) {
        results.push(await runOne(profile, mode));
    }
    results.push(await runOff(profile));
}
await browser.close();
for (const r of results) {
    const failed = Object.entries(r.checks)
        .filter(([, c]) => !c.pass)
        .map(([n]) => n);
    console.log(
        `${r.pass ? "PASS" : "FAIL"} ${r.profile} ${r.mode}${failed.length ? `  failed: ${failed.join(", ")}` : ""}`,
    );
}
const report = { url: args.url, time: new Date().toISOString(), pass: results.every((r) => r.pass), results };
writeFileSync(join(args.out, "report.json"), JSON.stringify(report, null, 2));
console.log(
    `${results.filter((r) => r.pass).length} of ${results.length} runs passed; report: ${join(args.out, "report.json")}`,
);
process.exit(report.pass ? 0 : 1);
