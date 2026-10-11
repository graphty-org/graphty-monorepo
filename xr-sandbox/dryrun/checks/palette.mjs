#!/usr/bin/env node
// The palette's own checks (plan section 3.10), on an emulated headset with the module on and off,
// with controllers and with hands. Arrange through the hooks (globalThis.__sandbox, and the module's
// globalThis.__palette), act through emulated input (IWER stick axes, trigger, pinch, a fingertip poke,
// animate_to), assert through the log and the hooks.
//
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/palette.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-palette
// Options: --profiles a,b (default quest3-controllers,quest3-hands,galaxyxr-hands).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-palette" },
        profiles: { type: "string", default: "quest3-controllers,quest3-hands,galaxyxr-hands" },
    },
});
if (!args.url) {
    console.error("usage: palette.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b]");
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
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const pal = (page, method, arg) => page.evaluate(([m, a]) => globalThis.__palette[m](a), [method, arg]);
const logSince = async (page, t0, prefix) =>
    (await ev(page, () => globalThis.__sandbox.log(400))).filter((e) => e.time >= t0 && e.message.startsWith(prefix));
const now = (page) => ev(page, () => Date.now());
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mm = (v) => Math.round(v * 10000) / 10;

/** IWER pose of a device, in Babylon world coordinates (z flipped). */
const posOf = async (page, device) => {
    const t = await ev(page, (d) => globalThis.__sandbox.dispatch("get_transform", { device: d }), device);
    return [t.position.x, t.position.y, -t.position.z];
};
const setPos = (page, hand, p) => ev(page, ([h, q]) => globalThis.__sandbox.place(h, q[0], q[1], q[2]), [hand, p]);
const press = async (page, hand, kind, down) =>
    ev(page, ([h, k, d]) => globalThis.__sandbox.press(h, k, d), [hand, kind, down]);

/** One flick of the left stick to the given side, held for a few frames, then released. */
const flick = async (page, x) => {
    await ev(
        page,
        (v) =>
            globalThis.__sandbox.dispatch("set_gamepad_state", {
                device: "controller-left",
                axes: [{ index: 0, value: v }],
            }),
        x,
    );
    await frames(page, 8);
    await ev(page, () =>
        globalThis.__sandbox.dispatch("set_gamepad_state", {
            device: "controller-left",
            axes: [{ index: 0, value: 0 }],
        }),
    );
    await frames(page, 25);
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
    await until(page, () => globalThis.__sandbox?.ready === true);
    await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
    await until(page, () => globalThis.__sandbox.inXR() && globalThis.__sandbox.xrFrames() > 10);
    await frames(page, 40);
    return { page, context, r };
};

/** Turn the prism to face `want` with the rim: pinch-drag (or trigger-drag) sideways, one face per drag. */
const rimTurn = async (page, hand, kind, steps) => {
    const turns = [];
    for (let i = 0; i < steps; i++) {
        const rim = await pal(page, "rim");
        let source = "hand-left";
        if (hand === "right") {
            source = kind === "pinch" ? "hand-right" : "controller-right";
        }
        const at = await posOf(page, source);
        await ev(page, ([h, p]) => globalThis.__sandbox.aimAt(h, p[0], p[1], p[2]), [hand, rim]);
        await frames(page, 10);
        const hover = await ev(page, (h) => globalThis.__sandbox.hover(h), hand);
        const t0 = await now(page);
        const before = await pal(page, "face");
        await press(page, hand, kind, true);
        await frames(page, 6);
        // About one face of arc (r * 72 degrees is 12 cm at a 14 cm face), in steps, sideways (+x).
        for (let k = 1; k <= 10; k++) {
            await setPos(page, hand, add(at, [0.011 * k, 0, 0]));
            await frames(page, 2);
        }
        await press(page, hand, kind, false);
        await frames(page, 30);
        await setPos(page, hand, at);
        await frames(page, 5);
        turns.push({
            uiMesh: hover.uiMesh,
            before,
            after: await pal(page, "face"),
            logs: (await logSince(page, t0, "palette.turn")).map((e) => e.data),
        });
    }
    return turns;
};

/** Poke a card control with the right index fingertip: approach from 3 cm in front, push 1 cm through, back out. */
const poke = async (page, control) => {
    const c = await pal(page, "control", control);
    const toward = c.normal; // the card's forward: from its front face into it
    const path = [-0.04, -0.02, -0.01, 0, 0.006, 0.012, 0.006, -0.02, -0.05];
    for (const d of path) {
        const tip = await pal(page, "indexTip", "right");
        const hand = await posOf(page, "hand-right");
        const want = add(c.pos, scale(toward, d));
        await setPos(page, "right", add(hand, sub(want, tip)));
        await frames(page, 4);
    }
    return c;
};

const runOn = async (profile) => {
    const hands = profile.endsWith("hands");
    const checks = {};
    const check = (name, pass, detail) => (checks[name] = { pass: !!pass, ...detail });

    // --- Module ON: the palette preset (palette, physical tools, hover tag, handling, visible undo).
    let { page, context, r } = await open(profile, { preset: "palette" });
    try {
        // The off hand raised in front, the dominant hand low and to the right, as when using a palette.
        await setPos(page, "left", [-0.12, 1.25, 0.32]);
        await setPos(page, "right", [0.18, 1.15, 0.22]);
        await frames(page, 15);
        const t = (await ev(page, () => globalThis.__sandbox.techniques())).find((x) => x.id === "palette");
        check("moduleOn", t?.on && (await pal(page, "visible")), { reason: t?.reason });

        // The front card looks at the eyes: its normal (toward the viewer) against the way to the head.
        const facing = async () => {
            const cam = await ev(page, () => globalThis.__sandbox.debug().camera);
            const name = { Analyze: "palette-analyze-pagerank", Style: "palette-style-color-pagerank" }[
                await pal(page, "faceName")
            ];
            const c = await pal(page, "control", name);
            const to = sub(cam, c.pos);
            return -dot(c.normal, to) / Math.hypot(...to);
        };
        const cosFace = await facing();
        check("frontCardFacesEyes", cosFace > 0.95, { cos: Math.round(cosFace * 1000) / 1000 });

        if (!hands) {
            // Above the off controller: the anchor is the off grip.
            const root = await pal(page, "root");
            const a = await ev(page, () => globalThis.__palette.anchorMatrix());
            const grip = [a[12], a[13], a[14]];
            // In the grip's own frame: its up axis is the matrix's second row.
            const d = sub(root, grip);
            const up = [a[4], a[5], a[6]];
            const above = dot(d, up) / Math.hypot(...up);
            const across = Math.sqrt(Math.max(0, dot(d, d) - above * above));
            check("aboveController", above > 0.05 && above < 0.2 && across < 0.04 && d[1] > 0.03, {
                aboveGripCm: Math.round(above * 1000) / 10,
                offAxisCm: Math.round(across * 1000) / 10,
                aboveInWorldCm: Math.round(d[1] * 1000) / 10,
            });

            // One flick, one face; and back.
            let t0 = await now(page);
            const f0 = await pal(page, "face");
            await flick(page, 0.95);
            const f1 = await pal(page, "face");
            const turns1 = (await logSince(page, t0, "palette.turn")).length;
            t0 = await now(page);
            await flick(page, -0.95);
            const f2 = await pal(page, "face");
            const turns2 = (await logSince(page, t0, "palette.turn")).length;
            check("stickFlickOneFace", f1 === (f0 + 1) % 5 && turns1 === 1 && f2 === f0 && turns2 === 1, {
                faces: [f0, f1, f2],
                turnsLogged: [turns1, turns2],
            });

            // Held UI lag: the off controller animated with IWER's animate_to.
            const left = await posOf(page, "controller-left");
            const lagP = pal(page, "lag", 40);
            await ev(
                page,
                (p) =>
                    globalThis.__sandbox.dispatch("animate_to", {
                        device: "controller-left",
                        position: { x: p[0] + 0.25, y: p[1] + 0.12, z: -p[2] - 0.1 },
                        duration: 0.5,
                    }),
                left,
            );
            const lag = await lagP;
            await ev(
                page,
                (p) =>
                    globalThis.__sandbox.dispatch("animate_to", {
                        device: "controller-left",
                        position: { x: p[0], y: p[1], z: -p[2] },
                        duration: 0.3,
                    }),
                left,
            );
            await frames(page, 10);
            check("heldUiLag", lag && lag.maxMm <= 1 && lag.maxGripMoveMm > 3, {
                ...lag,
                note: "maxGripMoveMm is the gap a one-frame lag would show; it proves the controller moved",
            });

            // Turn to Style (face 1) with one flick for the next steps.
            await flick(page, 0.95);
        } else {
            // The back of the off hand: on the side the palm faces away from.
            const palm = await pal(page, "palm");
            const root = await pal(page, "root");
            const v = sub(root, palm.center);
            check("ridesBackOfHand", dot(v, palm.normal) < -0.03 && Math.hypot(...v) < 0.16, {
                backCm: Math.round(-dot(v, palm.normal) * 1000) / 10,
                fromPalmCm: Math.round(Math.hypot(...v) * 1000) / 10,
            });
            // The rim: a pinch-drag turns exactly one face (the hands path; Galaxy XR has no microgestures).
            const turns = await rimTurn(page, "right", "pinch", 1);
            check(
                "rimPinchDragTurnsOneFace",
                turns[0].after === (turns[0].before + 1) % 5 && turns[0].logs.length === 1,
                { turns },
            );
        }

        // Color by PageRank from the Style face: a fingertip poke with hands, a ray press with controllers.
        let t0 = await now(page);
        const face = await pal(page, "faceName");
        let how;
        if (hands) {
            await poke(page, "palette-style-color-pagerank");
            how = "poke";
        } else {
            const c = await pal(page, "control", "palette-style-color-pagerank");
            await ev(page, (p) => globalThis.__sandbox.aimAt("right", p[0], p[1], p[2]), c.pos);
            await frames(page, 10);
            await press(page, "right", "trigger", true);
            await frames(page, 5);
            await press(page, "right", "trigger", false);
            await frames(page, 10);
            how = "ray and trigger";
        }
        const cmds = (await logSince(page, t0, "command")).filter((e) => e.data.code === "colorBy");
        const s = await ev(page, () => globalThis.__sandbox.state());
        check(
            "styleColorByPageRank",
            cmds.length === 1 && cmds[0].data.technique === "palette" && s.colorBy === "pagerank",
            {
                how,
                frontFace: face,
                logged: cmds.map((e) => `${e.data.label} (${e.data.technique})`),
                colorBy: s.colorBy,
            },
        );

        // Tear the Style card off 30 cm, drop it: world-locked. Drag it back: it snaps home.
        if (!hands) {
            const card = () => pal(page, "cards").then((cs) => cs.find((c) => c.face === "Style"));
            const c0 = await card();
            const right = await posOf(page, "controller-right");
            /** Grab the bar by ray and trigger; move sideways by dx, or steer the card home; release. */
            const drag = async (dx) => {
                const c = await card();
                await ev(page, (p) => globalThis.__sandbox.aimAt("right", p[0], p[1], p[2]), c.pos);
                await frames(page, 10);
                const hover = await ev(page, () => globalThis.__sandbox.hover("right"));
                let at = await posOf(page, "controller-right");
                await press(page, "right", "trigger", true);
                await frames(page, 5);
                if (dx === "home") {
                    // Steer: move the controller by part of what is left, until the card is within
                    // 1 cm of its slot (the off hand has moved and come back since the tear).
                    for (let k = 0; k < 40; k++) {
                        const now = await card();
                        const left = sub(now.home, now.pos);
                        if (Math.hypot(...left) < 0.01) {
                            break;
                        }
                        at = add(at, scale(left, 0.4));
                        await setPos(page, "right", at);
                        await frames(page, 12);
                    }
                } else {
                    for (let k = 1; k <= 10; k++) {
                        await setPos(page, "right", add(at, [(dx * k) / 10, 0, 0]));
                        await frames(page, 2);
                    }
                }
                await frames(page, 40); // the behavior eases toward the controller
                await press(page, "right", "trigger", false);
                await frames(page, 10);
                return hover.uiMesh;
            };
            t0 = await now(page);
            const grabbed = await drag(0.3);
            const c1 = await card();
            // Move the off hand: a world-locked card stays put.
            const left = await posOf(page, "controller-left");
            await setPos(page, "left", add(left, [0, 0.1, 0.05]));
            await frames(page, 20);
            const c2 = await card();
            await setPos(page, "left", left);
            await frames(page, 20);
            const movedCm = Math.round(dist(c1.pos, c0.pos) * 1000) / 10;
            // With the reach boost off (the default), the card moves 1:1 with the controller.
            check("tearOffWorldLocked", !c1.docked && movedCm > 27 && movedCm < 33 && dist(c2.pos, c1.pos) < 0.001, {
                controllerMovedCm: 30,
                grabbed,
                movedCm,
                driftWhileOffHandMovedMm: mm(dist(c2.pos, c1.pos)),
            });
            const regrabbed = await drag("home");
            const c3 = await card();
            const logs = (await logSince(page, t0, "palette.")).filter((e) =>
                ["palette.tear", "palette.drop", "palette.dock"].includes(e.message),
            );
            const seq = logs.map((e) => e.message.slice(8));
            check("snapsBack", c3.docked && dist(c3.pos, c0.pos) < 0.002 && seq.join(",") === "tear,drop,dock", {
                regrabbed,
                docked: c3.docked,
                offHomeMm: mm(dist(c3.pos, c0.pos)),
                log: logs.map((e) => `${e.message} ${e.data.face} ${e.data.distCm} cm`),
            });
            await setPos(page, "right", right);
        }

        // The Filter face hands over the sieve through ctx.tools, or is grayed with the reason.
        const sieve = await pal(page, "control", "palette-filter-sieve");
        const phys = (await ev(page, () => globalThis.__sandbox.techniques())).find((x) => x.id === "physical-tools");
        check("filterFaceSieve", sieve && sieve.enabled === (sieve.text === "Take the sieve"), {
            physicalTools: phys?.on ? "on" : `off (${phys?.reason ?? "not in preset"})`,
            button: sieve?.text,
            enabled: sieve?.enabled,
        });

        check("noErrorsOn", r.consoleErrors.length === 0 && r.pageErrors.length === 0, {
            consoleErrors: r.consoleErrors,
            pageErrors: r.pageErrors,
        });
        await page.screenshot({ path: join(args.out, `${profile}--on.png`) });
    } catch (e) {
        check("ranOn", false, { error: String(e).slice(0, 500) });
    }
    await context.close();

    // --- The off hand set to carry the held copy: the palette hides.
    ({ page, context, r } = await open(profile, { preset: "palette", "s.framework.offHand": "held copy" }));
    try {
        await frames(page, 20);
        const vis = await pal(page, "visible");
        check("hiddenWithHeldCopy", !vis && r.pageErrors.length === 0, {
            paletteVisible: vis,
            pageErrors: r.pageErrors,
        });
    } catch (e) {
        check("ranHeldCopy", false, { error: String(e).slice(0, 500) });
    }
    await context.close();

    // --- Physical tools off: the Filter face's sieve is grayed and says why.
    ({ page, context } = await open(profile, { preset: "palette", off: "physical-tools" }));
    try {
        await frames(page, 20);
        const sieve = await pal(page, "control", "palette-filter-sieve");
        check("sieveGrayedWhenToolsOff", sieve && !sieve.enabled && /off/.test(sieve.text), {
            button: sieve?.text,
            enabled: sieve?.enabled,
        });
    } catch (e) {
        check("ranToolsOff", false, { error: String(e).slice(0, 500) });
    }
    await context.close();

    // --- Module OFF: the same preset with the palette switched off.
    ({ page, context, r } = await open(profile, { preset: "palette", off: "palette" }));
    try {
        const t = (await ev(page, () => globalThis.__sandbox.techniques())).find((x) => x.id === "palette");
        const t0 = await now(page);
        if (!hands) {
            await flick(page, 0.95);
        }
        const turns = await logSince(page, t0, "palette.turn");
        const vis = await pal(page, "visible");
        check(
            "moduleOff",
            !t.on && !vis && turns.length === 0 && r.consoleErrors.length === 0 && r.pageErrors.length === 0,
            {
                on: t.on,
                paletteVisible: vis,
                turnsLogged: turns.length,
                consoleErrors: r.consoleErrors,
                pageErrors: r.pageErrors,
            },
        );
    } catch (e) {
        check("ranOff", false, { error: String(e).slice(0, 500) });
    }
    await context.close();

    const pass = Object.values(checks).every((c) => c.pass);
    return { profile, pass, checks };
};

const results = [];
for (const profile of args.profiles.split(",")) {
    const res = await runOn(profile);
    results.push(res);
    const failed = Object.entries(res.checks)
        .filter(([, c]) => !c.pass)
        .map(([n]) => n);
    const failedNote = failed.length ? `  failed: ${failed.join(", ")}` : "";
    console.log(`${res.pass ? "PASS" : "FAIL"} ${profile}${failedNote}`);
}
await browser.close();
const report = { url: args.url, time: new Date().toISOString(), pass: results.every((x) => x.pass), results };
writeFileSync(join(args.out, "report.json"), JSON.stringify(report, null, 2));
console.log(
    `${results.filter((x) => x.pass).length} of ${results.length} profiles passed; report: ${join(args.out, "report.json")}`,
);
process.exit(report.pass ? 0 : 1);
