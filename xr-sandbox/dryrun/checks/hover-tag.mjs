#!/usr/bin/env node
// Dry-run checks for the hover name tag (plan section 3.1), on an emulated headset. For each
// profile it opens `preset=empty&on=hover-tag`, enters VR, and checks: the tag on the Strozzi
// before any result is shown (degree and rank) and after PageRank is shown (exactly
// "Strozzi 0.088, #3"); angular size within 10% of the setting at 0.5 m and 1.5 m; no redraw over
// 60 held frames; a seeded noisy aim changes the tag's target at most once per second; with every
// input a transient pointer, the tag hides and the gear panel names the reason; switched off and
// on again, the tag hides and returns and the scene's mesh and observer counts come back.
//
// Run inside a browser slot:
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/hover-tag.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-hover-tag
// Options: --profiles (default quest3-controllers,quest3-hands,galaxyxr-hands), --noise 1.0 (deg).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-hover-tag" },
        profiles: { type: "string", default: "quest3-controllers,quest3-hands,galaxyxr-hands" },
        noise: { type: "string", default: "1.0" },
    },
});
if (!args.url) {
    console.error("usage: hover-tag.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b] [--noise deg]");
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
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const tag = async (page, hand = "right") => (await ev(page, () => window.__hoverTag.tags()))[hand];
const press = async (page, hand, kind) => {
    await ev(page, ([h, k]) => window.__sandbox.press(h, k, true), [hand, kind]);
    await frames(page, 6);
    await ev(page, ([h, k]) => window.__sandbox.press(h, k, false), [hand, kind]);
    await frames(page, 10);
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
        url.search = new URLSearchParams({ preset: "empty", on: "hover-tag", emulate: profile, still: "1" }).toString();
        await page.goto(url.toString());
        await until(page, () => window.__sandbox?.ready === true && !!window.__hoverTag);
        await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
        await until(page, () => window.__sandbox.inXR() && window.__sandbox.xrFrames() > 10);
        await frames(page, 60);
        const tech = (await ev(page, () => window.__sandbox.techniques())).find((t) => t.id === "hover-tag");
        check("switchedOn", tech?.on && tech.reason === null, { tech });

        // Before any result: degree and its rank.
        await ev(page, () => window.__sandbox.aim("right", "Strozzi"));
        await frames(page, 20);
        const before = await tag(page);
        check("beforeResults", before.visible && /^Strozzi degree 4, #\d+$/.test(before.text), { text: before.text });

        // PageRank shown (arranged): exactly the design's string.
        await ev(page, () => window.__sandbox.run("run", { result: "pagerank" }));
        await frames(page, 10);
        const after = await tag(page);
        check("afterPageRank", after.visible && after.text === "Strozzi 0.088, #3", { text: after.text });
        await page.screenshot({ path: join(args.out, `${profile}--tag.png`) });

        // Held still: zero redraws after the first.
        const r0 = (await tag(page)).redraws;
        await frames(page, 60);
        const r1 = (await tag(page)).redraws;
        check("noRedrawsHeld", r1 === r0, { frames: 60, redraws: r1 - r0 });

        // Constant angular size at 0.5 m and 1.5 m.
        const sizes = {};
        for (const m of [0.5, 1.5]) {
            await ev(page, (d) => window.__hoverTag.nodeAt("Strozzi", d), m);
            await ev(page, () => window.__sandbox.aim("right", "Strozzi"));
            await frames(page, 15);
            const a = await ev(page, () => window.__hoverTag.angular("right"));
            sizes[m] = { ...a, node: (await tag(page)).node, error: Math.abs(a.deg / a.wantDeg - 1) };
        }
        await ev(page, () => window.__hoverTag.restoreGraph());
        check(
            "angularSize",
            Object.values(sizes).every((s) => s.node === "Strozzi" && s.error < 0.1),
            { sizes },
        );

        // Seeded noisy aim: the tag's target changes at most once per second.
        await ev(page, () => window.__sandbox.aim("right", "Strozzi"));
        await frames(page, 20);
        const t0 = await ev(page, () => performance.now());
        const noise = Number(args.noise);
        await ev(page, (sd) => window.__sandbox.noisyAim("right", "Strozzi", sd, 240, 7), noise);
        const t1 = await ev(page, () => performance.now());
        const changes = (await tag(page)).changes.filter((t) => t >= t0 && t <= t1);
        let worst = 0;
        for (const t of changes) {
            worst = Math.max(worst, changes.filter((u) => u >= t && u < t + 1000).length);
        }
        const afterNoise = await tag(page);
        check("noisyAimStable", worst <= 1, {
            noiseDeg: noise,
            frames: 240,
            ms: Math.round(t1 - t0),
            changes: changes.length,
            maxPerSecond: worst,
            endedOn: afterNoise.node,
        });

        // Hover unavailable: every input a transient pointer.
        await ev(page, () => window.__sandbox.aim("right", "Strozzi"));
        await ev(page, () => window.__hoverTag.transient(true));
        await frames(page, 10);
        const why = (await ev(page, () => window.__sandbox.techniques())).find((t) => t.id === "hover-tag").reason;
        const hidden = !(await tag(page)).visible;
        await ev(page, () => window.__sandbox.place("left", -0.12, 1.2, 0.08));
        await ev(page, () => window.__sandbox.aim("left", "gear"));
        await frames(page, 15);
        await press(page, "left", hands ? "pinch" : "trigger");
        const gearOpen = await ev(page, () => window.__sandbox.gearOpen());
        const gearTexts = await ev(page, () => window.__hoverTag.guiTexts("needs hover"));
        check("unavailableWhenTransient", /transient pointer/.test(why ?? "") && hidden && gearTexts.length > 0, {
            reason: why,
            tagHidden: hidden,
            gearOpen,
            gearTexts,
        });
        if (gearOpen) {
            await page.screenshot({ path: join(args.out, `${profile}--gear-transient.png`) });
            await press(page, "left", hands ? "pinch" : "trigger");
        }
        await ev(page, () => window.__hoverTag.transient(false));
        await frames(page, 10);

        // Off and on again.
        await ev(page, () => window.__sandbox.aim("right", "Strozzi"));
        await frames(page, 15);
        const c0 = await ev(page, () => window.__sandbox.counts());
        const shownBefore = (await tag(page)).visible;
        await ev(page, () => window.__sandbox.setOn("hover-tag", false));
        await frames(page, 20);
        const off = await tag(page);
        const offOn = (await ev(page, () => window.__sandbox.techniques())).find((t) => t.id === "hover-tag").on;
        await ev(page, () => window.__sandbox.setOn("hover-tag", true));
        await frames(page, 20);
        const on = await tag(page);
        const c1 = await ev(page, () => window.__sandbox.counts());
        check(
            "offAndOn",
            shownBefore &&
                !offOn &&
                !off.visible &&
                on.visible &&
                on.text === "Strozzi 0.088, #3" &&
                c0.meshes === c1.meshes &&
                c0.beforeRender === c1.beforeRender,
            { shownBefore, offHidden: !off.visible, onText: on.text, counts: [c0, c1] },
        );
        const f = await ev(page, () => window.__sandbox.frames(300));
        check("frameTime", f.over50 === 0 && f.hooksP95 < 2, { jsP95: f.jsP95, jsMax: f.jsMax, hooksP95: f.hooksP95 });
    } catch (e) {
        check("ran", false, { error: String(e).slice(0, 500) });
    }
    check("noErrors", r.consoleErrors.length === 0 && r.pageErrors.length === 0, {
        consoleErrors: r.consoleErrors,
        pageErrors: r.pageErrors,
    });
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
    console.log(`${r.pass ? "PASS" : "FAIL"} ${profile}${failed.length ? `  failed: ${failed.join(", ")}` : ""}`);
}
await browser.close();
const report = { url: args.url, time: new Date().toISOString(), pass: results.every((r) => r.pass), results };
writeFileSync(join(args.out, "report.json"), JSON.stringify(report, null, 2));
console.log(`${results.filter((r) => r.pass).length} of ${results.length} passed; ${join(args.out, "report.json")}`);
process.exit(report.pass ? 0 : 1);
