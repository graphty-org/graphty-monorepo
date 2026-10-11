#!/usr/bin/env node
// Dry-run checks for pull to grow (plan section 3.6), on an emulated headset. For each profile it
// opens `preset=baseline-pull`, enters VR, and with the right hand or controller on the Medici:
//   - pinch (or trigger) and pull 10 cm in 150 ms: `arbiter.win` names pull to grow (node menus
//     among the losers when node menus is on); the readout says "1 hop: 6" and the preview keeps 7;
//   - 1.5 cm of oscillation across the 14 cm boundary, from either side: no hop change;
//   - 18 cm: "2 hops: +5"; release: `neighbors` Medici 2 hops and 12 selected, no preview left;
//   - pull out to 2 hops and back to 3 cm, release: a `cancel`, no `neighbors`, no preview left;
//   - in every press, readout redraws equal the hop changes;
//   - switched off while it holds a press: the preview is cancelled and the press logs `cancel`;
//   - switched off, the same pinch and pull grows nothing.
//
// Run inside a browser slot:
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/pull-to-grow.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-pull-to-grow
// Options: --profiles (default quest3-hands,quest3-controllers,galaxyxr-hands), --preset baseline-pull.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-pull-to-grow" },
        profiles: { type: "string", default: "quest3-hands,quest3-controllers,galaxyxr-hands" },
        preset: { type: "string", default: "baseline-pull" },
    },
});
if (!args.url) {
    console.error("usage: pull-to-grow.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b] [--preset p]");
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
// A committed neighbors command; a cancelled preview logs code neighbors with the label "cancel".
const committed = (e) => e.message === "command" && e.data.code === "neighbors" && e.data.label !== "cancel";

// Where the hand starts (Babylon world, meters); a pull moves it toward the body (-z).
const P0 = { x: 0.12, y: 1.35, z: 0.2 };

const runOne = async (profile) => {
    const r = { profile, checks: {}, consoleErrors: [], pageErrors: [] };
    const check = (name, pass, detail) => {
        r.checks[name] = { pass: !!pass, ...detail };
    };
    const hands = profile.endsWith("hands") && profile !== "galaxyxr-no-hands";
    const kind = hands ? "pinch" : "trigger";
    const device = hands ? "hand-right" : "controller-right";
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && r.consoleErrors.push(m.text().slice(0, 300)));
    page.on("pageerror", (e) => r.pageErrors.push(String(e).slice(0, 300)));

    const now = () => ev(page, () => Date.now());
    const logSince = async (t0) =>
        (await ev(page, () => globalThis.__sandbox.log(400))).filter(
            (e) =>
                e.time >= t0 &&
                (e.message === "command" ||
                    e.message === "cancel" ||
                    e.message.startsWith("arbiter") ||
                    e.message.startsWith("pull-to-grow.")),
        );
    const readout = () => ev(page, () => globalThis.__pullToGrow.readout());
    const state = () => ev(page, () => globalThis.__sandbox.state());
    /** Move the hand to `cm` of pull over `ms`, through IWER's animate_to (XR z is Babylon's -z). */
    const pullTo = (cm, ms) =>
        ev(page, ([d, p, s]) => globalThis.__sandbox.dispatch("animate_to", { device: d, position: p, duration: s }), [
            device,
            { x: P0.x, y: P0.y, z: -(P0.z - cm / 100) },
            ms / 1000,
        ]);
    /** Put the hand at the start, aim at the Medici and press. */
    const grab = async () => {
        await ev(page, ([p]) => globalThis.__sandbox.place("right", p.x, p.y, p.z), [P0]);
        await ev(page, () => globalThis.__sandbox.aim("right", "Medici"));
        await frames(page, 15);
        await ev(page, ([k]) => globalThis.__sandbox.press("right", k, true), [kind]);
    };
    const release = async () => {
        await ev(page, ([k]) => globalThis.__sandbox.press("right", k, false), [kind]);
        await frames(page, 10);
    };
    /** Hold still until the filtered pull distance settles. */
    const settle = () => frames(page, 45);

    try {
        const url = new URL(args.url);
        url.search = new URLSearchParams({ preset: args.preset, emulate: profile, still: "1" }).toString();
        await page.goto(url.toString());
        await until(page, () => globalThis.__sandbox?.ready === true && !!globalThis.__pullToGrow);
        await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
        await until(page, () => globalThis.__sandbox.inXR() && globalThis.__sandbox.xrFrames() > 10);
        await frames(page, 60);
        const techs = await ev(page, () => globalThis.__sandbox.techniques());
        const on = (id) => techs.find((t) => t.id === id)?.on;
        check("switchedOn", on("pull-to-grow"), { reason: techs.find((t) => t.id === "pull-to-grow")?.reason });

        // 1. Pinch the Medici and pull 10 cm in 150 ms.
        let t0 = await now();
        await grab();
        await pullTo(10, 150);
        await settle();
        let log = await logSince(t0);
        const win = log.find((e) => e.message === "arbiter.win" && e.data.hand === "right");
        const menusOn = !!on("node-menus");
        check(
            "pullWins",
            win?.data.technique === "pull-to-grow" &&
                win.data.target === "Medici" &&
                (!menusOn || win.data.losers.includes("node-menus")),
            { winner: win?.data.technique, target: win?.data.target, losers: win?.data.losers, nodeMenusOn: menusOn },
        );
        let ro = await readout();
        let st = await state();
        check("oneHop", ro.visible && ro.text === "1 hop: 6" && st.preview?.keep === 7, {
            readout: ro,
            preview: st.preview,
        });

        // 2. Tremble 1.5 cm across the 14 cm boundary from below: no hop change.
        await pullTo(13.25, 100);
        await settle();
        const osc = async () => {
            const t = await now();
            for (let i = 0; i < 6; i++) {
                await pullTo(i % 2 === 0 ? 14.75 : 13.25, 150);
            }
            await settle();
            return (await logSince(t)).filter((e) => e.message === "pull-to-grow.hop").length;
        };
        const below = await osc();
        const roBelow = await readout();

        // 3. Out to 18 cm: 2 hops; then the same tremble from above.
        await pullTo(18, 200);
        await settle();
        ro = await readout();
        st = await state();
        check("twoHops", ro.text === "2 hops: +5" && st.preview?.keep === 12, { readout: ro, preview: st.preview });
        await pullTo(14.75, 100);
        await settle();
        const above = await osc();
        const roAbove = await readout();
        check(
            "noFlickerAcrossBoundary",
            below === 0 && above === 0 && roBelow.text === "1 hop: 6" && roAbove.text === "2 hops: +5",
            { hopChangesFromBelow: below, hopChangesFromAbove: above, below: roBelow.text, above: roAbove.text },
        );

        // 4. Release at 2 hops: neighbors Medici 2, 12 selected.
        await pullTo(18, 100);
        await settle();
        await release();
        log = await logSince(t0);
        st = await state();
        ro = await readout();
        const cmd = log.find((e) => committed(e));
        const commit = log.find((e) => e.message === "pull-to-grow.commit");
        check(
            "releaseCommits",
            cmd?.data.params.hops === 2 &&
                cmd.data.technique === "pull-to-grow" &&
                /^Select Medici and 2 hops/.test(cmd.data.label) &&
                st.selection.length === 12 &&
                st.selection.includes("Medici") &&
                st.preview === null &&
                !ro.visible,
            { command: cmd?.data.label, params: cmd?.data.params, selected: st.selection.length, preview: st.preview },
        );
        const redrawsMatch = [];
        redrawsMatch.push({ press: "commit", hopChanges: commit?.data.hopChanges, redraws: commit?.data.redraws });

        // 5. Out to 2 hops and back into the dead zone, release: a cancel, nothing changed, no tint.
        t0 = await now();
        await grab();
        await pullTo(18, 200);
        await settle();
        await pullTo(3, 200);
        await settle();
        const roBack = await readout();
        await release();
        log = await logSince(t0);
        st = await state();
        ro = await readout();
        const cancel = log.find((e) => e.message === "pull-to-grow.cancel");
        check(
            "deadZoneCancels",
            cancel?.data.reason === "released in the dead zone" &&
                !log.some((e) => committed(e)) &&
                st.preview === null &&
                st.selection.length === 12 &&
                roBack.text === "Release to cancel" &&
                !ro.visible,
            {
                cancel: cancel?.data,
                backInDeadZone: roBack.text,
                readoutVisible: ro.visible,
                preview: st.preview,
                selected: st.selection.length,
                log: log.map((e) => `${e.message} ${e.data.code ?? ""} ${e.data.label ?? e.data.technique ?? ""}`),
            },
        );
        redrawsMatch.push({ press: "cancel", hopChanges: cancel?.data.hopChanges, redraws: cancel?.data.redraws });
        check(
            "redrawsEqualHopChanges",
            redrawsMatch.every((p) => p.hopChanges > 0 && p.hopChanges === p.redraws),
            { presses: redrawsMatch },
        );

        // 6. Switched off while it holds a press: preview cancelled, press logged as cancel.
        t0 = await now();
        await grab();
        await pullTo(10, 150);
        await settle();
        const during = (await state()).preview;
        await ev(page, () => globalThis.__sandbox.setOn("pull-to-grow", false));
        await frames(page, 5);
        log = await logSince(t0);
        st = await state();
        ro = await readout();
        check(
            "offWhilePressed",
            during?.owner === "pull-to-grow" &&
                st.preview === null &&
                !ro.visible &&
                log.some((e) => e.message === "cancel" && e.data.technique === "pull-to-grow"),
            { previewBefore: during, previewAfter: st.preview, readoutVisible: ro.visible },
        );
        await release();

        // 7. Switched off: the same pinch and pull grows nothing.
        t0 = await now();
        await grab();
        await pullTo(10, 150);
        await settle();
        await release();
        log = await logSince(t0);
        st = await state();
        const offWin = log.find((e) => e.message === "arbiter.win" && e.data.hand === "right");
        check(
            "offGrowsNothing",
            offWin?.data.technique !== "pull-to-grow" &&
                !log.some((e) => e.message.startsWith("pull-to-grow.")) &&
                !log.some((e) => committed(e)) &&
                st.preview === null,
            { winner: offWin?.data.technique ?? null, how: offWin?.data.how, log: log.map((e) => e.message) },
        );

        const f = await ev(page, () => globalThis.__sandbox.frames(300));
        check("frameTime", f.over50 === 0, { jsP95: f.jsP95, jsMax: f.jsMax, hooksP95: f.hooksP95, over50: f.over50 });
        check("noErrors", r.consoleErrors.length === 0 && r.pageErrors.length === 0, {
            consoleErrors: r.consoleErrors,
            pageErrors: r.pageErrors,
        });
    } catch (e) {
        check("ran", false, { error: String(e).slice(0, 500) });
    }
    try {
        await page.screenshot({ path: join(args.out, `${profile}--pull-to-grow.png`) });
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
