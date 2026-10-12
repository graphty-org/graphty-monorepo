#!/usr/bin/env node
// Dry-run checks for physical tools (plan section 3.9), on an emulated headset. For each profile it
// opens `preset=empty&on=physical-tools`, enters VR, and acts only through emulated input:
//   - the sieve grabbed off the rack docks in the hand; set on its slider to PageRank 0.070 (a ray
//     press from the other hand) it reads "keeps 5 of 15" and dims 10 nodes by color and scale,
//     with every graph material's alpha still 1 and no alpha blending;
//   - "Keep" on its handle logs `filter` labeled "Keep PageRank at least 0.070 (5 of 15)";
//   - taken again and put back (grip on controllers, the "Put back" button with hands), it logs a
//     cancel and leaves no tint; taken again, the holding hand's own trigger or pinch commits;
//   - the probe touching the Medici shows degree 6, PageRank 0.146 and rank 1, and community;
//     pointed at the Medici it reads the same by pointing; pointed at space it shows the range and
//     top three; readings log `probe` and never enter the history;
//   - switching the technique off while the sieve is held puts it back, cancels the preview and
//     hides the rack; the tools seam then names the reason.
//
// Run inside a browser slot:
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/physical-tools.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-physical-tools
// Options: --profiles (default quest3-controllers,quest3-hands).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

import { instrumentFit } from "../fit.mjs";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-physical-tools" },
        profiles: { type: "string", default: "quest3-controllers,quest3-hands" },
    },
});
if (!args.url) {
    console.error("usage: physical-tools.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b]");
    process.exit(2);
}
mkdirSync(args.out, { recursive: true });
process.env.FC_FONTATIONS = "1";
const browser = await chromium.launch({
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const fit = instrumentFit(browser, join(args.out, "fit"));

const until = (page, fn, arg, timeout = 60_000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
const frames = async (page, n) => {
    const start = await page.evaluate(() => globalThis.__sandbox.xrFrames());
    await until(page, ([s, k]) => globalThis.__sandbox.xrFrames() >= s + k, [start, n]);
};
const ev = (page, fn, arg) => page.evaluate(fn, arg);

const runOne = async (profile) => {
    const r = { profile, checks: {}, consoleErrors: [], pageErrors: [] };
    const check = (name, pass, detail) => {
        r.checks[name] = { pass: !!pass, ...detail };
    };
    const hands = profile.endsWith("hands") && profile !== "galaxyxr-no-hands";
    const click = hands ? "pinch" : "trigger";
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && r.consoleErrors.push(m.text().slice(0, 300)));
    page.on("pageerror", (e) => r.pageErrors.push(String(e).slice(0, 300)));

    const press = async (hand, kind, hold = 6) => {
        await ev(page, ([h, k]) => globalThis.__sandbox.press(h, k, true), [hand, kind]);
        await frames(page, hold);
        await ev(page, ([h, k]) => globalThis.__sandbox.press(h, k, false), [hand, kind]);
        await frames(page, 10);
    };
    const place = async (hand, [x, y, z]) => {
        await ev(page, ([h, p]) => globalThis.__sandbox.place(h, ...p), [hand, [x, y, z]]);
    };
    const aim = async (hand, what) => {
        await ev(page, ([h, w]) => globalThis.__sandbox.aim(h, w), [hand, what]);
        await frames(page, 15);
    };
    const since = async (t0) => (await ev(page, () => globalThis.__sandbox.log(600))).filter((e) => e.time >= t0);
    const now = () => ev(page, () => Date.now());
    const look = () => ev(page, () => globalThis.__physicalTools.look());
    const RIGHT = [0.15, 1.35, 0.25];
    const LEFT = [-0.15, 1.35, 0.25];

    /** Grab a tool off the rack with the right hand, pull it 5 cm toward the body, let go. */
    const take = async (tool) => {
        const t = await now();
        await place("right", RIGHT);
        await aim("right", `physical-tools-${tool}`);
        await ev(page, ([h, k]) => globalThis.__sandbox.press(h, k, true), ["right", click]);
        await frames(page, 8);
        await place("right", [RIGHT[0], RIGHT[1] + 0.02, RIGHT[2] - 0.05]);
        await frames(page, 40);
        await ev(page, ([h, k]) => globalThis.__sandbox.press(h, k, false), ["right", click]);
        await frames(page, 10);
        await place("right", RIGHT);
        await frames(page, 10);
        const got = (await ev(page, () => globalThis.__physicalTools.held())).right;
        r.takes = [
            ...(r.takes ?? []),
            {
                tool,
                got,
                log: (await since(t))
                    .filter((e) => !/^frames/.test(e.message))
                    .map((e) => `${e.message} ${e.data?.tool ?? e.data?.reason ?? e.data?.context ?? ""}`),
            },
        ];
        return got;
    };
    /**
     * Left-hand ray presses on the sieve's slider until it reads `value`. A hand's ray starts a
     * little off the wrist, so its first press can land a step or two away; like a person, it
     * presses again, corrected by what it read (at most four presses).
     */
    const setSieve = async (value) => {
        let aimAt = value;
        let after;
        for (let k = 0; k < 4; k++) {
            const mark = await ev(page, (v) => globalThis.__physicalTools.sliderMark(v), aimAt);
            await place("left", LEFT);
            await aim("left", mark);
            await press("left", click);
            after = await ev(page, () => globalThis.__physicalTools.sieve());
            r.sets = [...(r.sets ?? []), { value, aimAt, after }];
            if (Math.abs(after.value - value) < 1e-6) {
                break;
            }
            aimAt += value - after.value;
        }
        await place("left", [-0.3, 1.1, 0.1]);
        await aim("left", "space");
        return after;
    };
    /** Compare two looks: how many nodes dimmed (color moved, scale down) and how many unchanged. */
    const compare = (a, b) => {
        let dimmed = 0;
        let kept = 0;
        for (let i = 0; i < a.scales.length; i++) {
            if (a.scales[i] === 0) {
                continue;
            }
            const ratio = b.scales[i] / a.scales[i];
            const dc = Math.hypot(...[0, 1, 2].map((k) => b.colors[i][k] - a.colors[i][k]));
            if (ratio < 0.8 && dc > 0.05) {
                dimmed++;
            } else if (ratio > 0.95 && ratio < 1.25) {
                kept++;
            }
        }
        return { dimmed, kept };
    };
    const same = (a, b) =>
        a.scales.every((s, i) => Math.abs(s - b.scales[i]) < 1e-4) &&
        a.colors.every((c, i) => c.every((v, k) => Math.abs(v - b.colors[i][k]) < 1e-4));

    try {
        const url = new URL(args.url);
        url.search = new URLSearchParams({
            preset: "empty",
            on: "physical-tools",
            emulate: profile,
            still: "1",
        }).toString();
        await page.goto(url.toString());
        await until(page, () => globalThis.__sandbox?.ready === true && !!globalThis.__physicalTools);
        await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
        await until(page, () => globalThis.__sandbox.inXR() && globalThis.__sandbox.xrFrames() > 10);
        await frames(page, 60);
        await place("left", [-0.3, 1.1, 0.1]);
        await aim("left", "space");
        const tech = (await ev(page, () => globalThis.__sandbox.techniques())).find((t) => t.id === "physical-tools");
        check("switchedOn", tech?.on && tech.reason === null, { tech });
        check("rackShown", await ev(page, () => globalThis.__physicalTools.rackVisible()), {});

        // 1. Take the sieve, set 0.070, read and look, commit on the handle.
        const look0 = await look();
        let t0 = await now();
        const held = await take("sieve");
        check("sieveTaken", held === "sieve", {
            held,
            log: (await since(t0)).filter((e) => e.message.startsWith("physical-tools")).map((e) => e.message),
        });
        const s1 = await setSieve(0.07);
        const look1 = await look();
        const cmp = compare(look0, look1);
        await page.screenshot({ path: join(args.out, `${profile}--sieve-preview.png`) });
        check(
            "sieveReadsAndDims",
            s1.previewing && /keeps 5 of 15$/.test(s1.readout) && cmp.dimmed === 10 && cmp.kept === 5,
            {
                readout: s1.readout,
                value: s1.value,
                ...cmp,
                sample: [
                    look0.scales.slice(0, 4),
                    look1.scales.slice(0, 4),
                    look0.colors.slice(0, 2),
                    look1.colors.slice(0, 2),
                ],
            },
        );
        check(
            "graphOpaque",
            look1.alpha.every((a) => a === 1) &&
                look1.blending.every((b) => !b) &&
                look1.colors.every((c) => c[3] === 1),
            { alpha: look1.alpha, blending: look1.blending },
        );
        t0 = await now();
        await place("left", LEFT);
        await aim("left", "physical-tools-sieve-keep");
        await press("left", click);
        let log = await since(t0);
        const filterCmd = log.find((e) => e.message === "command" && e.data?.code === "filter");
        let state = await ev(page, () => globalThis.__sandbox.state());
        check(
            "handleCommits",
            filterCmd?.data?.label === "Keep PageRank at least 0.070 (5 of 15)" &&
                state.history.includes("Keep PageRank at least 0.070 (5 of 15)") &&
                (await ev(page, () => globalThis.__physicalTools.held())).right === null,
            { label: filterCmd?.data?.label, history: state.history },
        );
        await place("left", [-0.3, 1.1, 0.1]);
        await aim("left", "space");

        // 2. Take it again, set 0.100, put it back: a cancel and no tint.
        const look2 = await look();
        await take("sieve");
        await setSieve(0.1);
        const look2b = await look();
        t0 = await now();
        if (hands) {
            await place("left", LEFT);
            await aim("left", "physical-tools-sieve-back");
            await press("left", click);
            await place("left", [-0.3, 1.1, 0.1]);
            await aim("left", "space");
        } else {
            await press("right", "squeeze");
        }
        await frames(page, 5);
        log = await since(t0);
        const cancel = log.find(
            (e) => e.message === "command" && e.data?.label === "cancel" && e.data?.technique === "physical-tools",
        );
        const look3 = await look();
        check("putBackCancels", cancel && same(look2, look3) && !same(look2, look2b), {
            how: hands ? "Put back button" : "grip",
            cancel: !!cancel,
            dimmedBefore: compare(look2, look2b).dimmed,
            log: log.map((e) => `${e.message} ${e.data?.label ?? e.data?.tool ?? ""}`),
        });

        // 3. Take it again: the holding hand's own trigger or pinch commits (context "tool").
        await take("sieve");
        await setSieve(0.1);
        t0 = await now();
        await aim("right", "space");
        await press("right", click);
        log = await since(t0);
        const win = log.find((e) => e.message === "arbiter.win");
        const cmd3 = log.find((e) => e.message === "command" && e.data?.code === "filter");
        check(
            "holdingHandCommits",
            win?.data?.context === "tool" &&
                win?.data?.technique === "physical-tools" &&
                /^Keep PageRank at least 0\.100/.test(cmd3?.data?.label ?? ""),
            {
                win: win?.data && { context: win.data.context, technique: win.data.technique },
                label: cmd3?.data?.label,
                log: log
                    .filter((e) => !/^frames/.test(e.message))
                    .map(
                        (e) =>
                            `${e.message} ${JSON.stringify(e.data?.filter ?? e.data?.label ?? e.data?.context ?? "")}`,
                    ),
            },
        );

        // 4. The probe: touch, point, space.
        const probe = await take("probe");
        check("probeTaken", probe === "probe", { probe });
        // 35 cm from the Medici, toward the head.
        const medici = await ev(page, () => globalThis.__physicalTools.node("Medici"));
        const head = [0, 1.6, 0];
        const away = Math.hypot(...head.map((v, k) => v - medici[k]));
        const P0 = medici.map((v, k) => v + ((head[k] - v) / away) * 0.35);
        await place("right", P0);
        await aim("right", "Medici");
        t0 = await now();
        const tip = await ev(page, () => globalThis.__physicalTools.probeTip());
        await place(
            "right",
            P0.map((v, k) => v + medici[k] - tip[k]),
        );
        await frames(page, 15);
        const touch = {
            reading: await ev(page, () => globalThis.__physicalTools.reading()),
            card: await ev(page, () => globalThis.__physicalTools.card()),
        };
        await page.screenshot({ path: join(args.out, `${profile}--probe-touch.png`) });
        const facts = (t) =>
            /^Medici\n/.test(t) && /degree 6/.test(t) && /PageRank 0\.146, rank 1/.test(t) && /community \d+/.test(t);
        check(
            "probeTouch",
            touch.reading?.target === "Medici" &&
                touch.reading.via === "touch" &&
                touch.card.visible &&
                facts(touch.card.text),
            touch,
        );
        await place("right", P0);
        await aim("right", "Medici");
        const point = {
            reading: await ev(page, () => globalThis.__physicalTools.reading()),
            card: await ev(page, () => globalThis.__physicalTools.card()),
        };
        check(
            "probePoint",
            point.reading?.target === "Medici" && point.reading.via === "point" && facts(point.card.text),
            point,
        );
        await aim("right", "space");
        const space = {
            reading: await ev(page, () => globalThis.__physicalTools.reading()),
            card: await ev(page, () => globalThis.__physicalTools.card()),
        };
        check(
            "probeSpace",
            space.reading?.via === "summary" &&
                /^PageRank 0\.\d{3} to 0\.146\ntop: Medici, \w+, \w+$/.test(space.card.text),
            space,
        );
        log = await since(t0);
        state = await ev(page, () => globalThis.__sandbox.state());
        const probes = log.filter((e) => e.message === "command" && e.data?.code === "probe");
        const readings = log.filter((e) => e.message === "physical-tools.reading");
        check(
            "probeLoggedNotInHistory",
            probes.length >= 3 &&
                probes.every((e) => e.data.history === false) &&
                readings.length >= 3 &&
                !state.history.some((h) => /probe/i.test(h)),
            {
                probes: probes.map((e) => e.data.label),
                readings: readings.map((e) => e.data.via),
                history: state.history,
            },
        );
        await press("right", hands ? "pinch" : "squeeze");
        check(
            "probePutBack",
            (await ev(page, () => globalThis.__physicalTools.held())).right === null &&
                !(await ev(page, () => globalThis.__physicalTools.card())).visible,
            {},
        );

        // 5. Switched off while the sieve is held: put back, preview cancelled, rack hidden.
        const look5 = await look();
        await take("sieve");
        await setSieve(0.1);
        t0 = await now();
        await ev(page, () => globalThis.__sandbox.setOn("physical-tools", false));
        await frames(page, 5);
        log = await since(t0);
        const look6 = await look();
        const reasonOff = await ev(page, () => globalThis.__physicalTools.reason("sieve"));
        check(
            "switchOff",
            same(look5, look6) &&
                !(await ev(page, () => globalThis.__physicalTools.rackVisible())) &&
                (await ev(page, () => globalThis.__physicalTools.held())).right === null &&
                log.some((e) => e.data?.label === "cancel") &&
                reasonOff === "Physical tools is off",
            { reasonOff, log: log.map((e) => `${e.message} ${e.data?.label ?? e.data?.tool ?? ""}`) },
        );
        await ev(page, () => globalThis.__sandbox.setOn("physical-tools", true));
        await frames(page, 5);
        check(
            "switchOnAgain",
            (await ev(page, () => globalThis.__physicalTools.rackVisible())) &&
                (await ev(page, () => globalThis.__physicalTools.reason("sieve"))) === null,
            {},
        );
        check("noErrors", r.consoleErrors.length === 0 && r.pageErrors.length === 0, {
            consoleErrors: r.consoleErrors,
            pageErrors: r.pageErrors,
        });
    } catch (e) {
        check("ran", false, { error: String(e).slice(0, 800) });
    }
    try {
        await page.screenshot({ path: join(args.out, `${profile}--end.png`) });
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
report.textFit = fit.summary();
report.pass &&= report.textFit.pass;
writeFileSync(join(args.out, "report.json"), JSON.stringify(report, null, 2));
console.log(
    `${results.filter((r) => r.pass).length} of ${results.length} runs passed; report: ${join(args.out, "report.json")}`,
);
process.exit(report.pass ? 0 : 1);
