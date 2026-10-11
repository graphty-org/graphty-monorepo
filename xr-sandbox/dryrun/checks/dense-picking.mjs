#!/usr/bin/env node
// Dry-run checks for dense picking (plan section 3.12), on an emulated headset, with the module on
// and off. For each profile:
//   on  (`preset=dense&n=480&seed=7`): hint tags latch for exactly the nodes in the ray's cone
//       (recomputed here from the graph view's positions and the logged ray), two letters each,
//       prefix-free; typing the beacon's tag on the mini keyboard by ray and trigger or pinch logs
//       `select` of the beacon; the slab pushed through the graph holds exactly the nodes within half
//       its thickness and inside its square, the rest dim; the ray on the plate at a node's dot
//       hovers that node, and a tap selects it in the full graph; switched off, the plate, tags,
//       keyboard and dimming go, and the mesh count comes back.
//   off (`preset=dense&off=dense-picking`): no tags, no plate, and a plain trigger or pinch selects.
//   n=2000: tags latched and the slab swept through the graph; no frame's JavaScript over 50 ms.
// The beacon is the node with the highest PageRank (the sandbox has no beacons yet).
//
// Run inside a browser slot:
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/dense-picking.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-dense-picking
// Options: --profiles (default quest3-controllers,quest3-hands).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-dense-picking" },
        profiles: { type: "string", default: "quest3-controllers,quest3-hands" },
    },
});
if (!args.url) {
    console.error("usage: dense-picking.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b]");
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
    // Software rendering of 2,000 nodes with tracked hands can take a second a frame.
    await until(page, ([s, k]) => globalThis.__sandbox.xrFrames() >= s + k, [start, n], 240_000);
};
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const dp = (page) => ev(page, () => globalThis.__densePicking.state());
const press = async (page, hand, kind) => {
    await ev(page, ([h, k]) => globalThis.__sandbox.press(h, k, true), [hand, kind]);
    await frames(page, 6);
    await ev(page, ([h, k]) => globalThis.__sandbox.press(h, k, false), [hand, kind]);
    await frames(page, 10);
};
const sub = (a, b) => a.map((v, k) => v - b[k]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
    const l = Math.hypot(...a) || 1;
    return a.map((v) => v / l);
};
let step = "";
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** Open a page on a URL query and enter VR. */
const open = async (profile, query, r) => {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && r.consoleErrors.push(m.text().slice(0, 300)));
    page.on("pageerror", (e) => r.pageErrors.push(String(e).slice(0, 300)));
    const url = new URL(args.url);
    url.search = new URLSearchParams({ ...query, emulate: profile, still: "1" }).toString();
    step = `open ${url.search}`;
    await page.goto(url.toString());
    await until(page, () => globalThis.__sandbox?.ready === true && !!globalThis.__densePicking, undefined, 240_000);
    step = "enter VR";
    await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
    await until(page, () => globalThis.__sandbox.inXR() && globalThis.__sandbox.xrFrames() > 10, undefined, 240_000);
    await frames(page, 60);
    return { context, page };
};

/** Hold the off hand low and aim it up, so the plate is far above the graph. */
const parkLeft = async (page) => {
    await ev(page, () => globalThis.__sandbox.place("left", -0.3, 1, 0.05));
    await ev(page, () => globalThis.__sandbox.aim("left", "space"));
    await frames(page, 20);
};

/**
 * Aim a hand's actual pointer ray at a point on the plate: the pointer ray starts away from the
 * grip that aimAt turns, so correct by where the ray really meets the plate, a few times.
 */
const aimOnPlate = async (page, hand, target, plate) => {
    let p = target;
    let miss = Infinity;
    for (let k = 0; k < 6 && miss > 5e-4; k++) {
        await ev(page, ([h, x, y, z]) => globalThis.__sandbox.aimAt(h, x, y, z), [hand, ...p]);
        await frames(page, 6);
        const ray = await ev(page, (h) => globalThis.__densePicking.ray(h), hand);
        const t = dot(sub(plate.center, ray.origin), plate.normal) / dot(ray.dir, plate.normal);
        const err = sub(
            target,
            ray.origin.map((v, i) => v + ray.dir[i] * t),
        );
        miss = Math.hypot(...err);
        p = p.map((v, i) => v + err[i]);
    }
    return miss;
};

/** Put the plate through a point: the off hand `reach` before it, on the line from the head. */
const slabThrough = async (page, p, reach) => {
    const cam = (await ev(page, () => globalThis.__sandbox.debug())).camera;
    const d = norm(sub(p, cam));
    const h = p.map((v, k) => v - d[k] * reach);
    await ev(page, ([x, y, z]) => globalThis.__sandbox.place("left", x, y, z), h);
    await ev(page, ([x, y, z]) => globalThis.__sandbox.aimAt("left", x, y, z), p);
};

const runOn = async (profile, r, check) => {
    const hands = profile.endsWith("hands");
    const kind = hands ? "pinch" : "trigger";
    const { context, page } = await open(
        profile,
        { preset: "empty", on: "dense-picking", graph: "dense", n: "480", seed: "7" },
        r,
    );
    try {
        const tech = (await ev(page, () => globalThis.__sandbox.techniques())).find((t) => t.id === "dense-picking");
        check("switchedOn", tech?.on && tech.reason === null, { tech });
        const meshes0 = (await ev(page, () => globalThis.__sandbox.counts())).meshes;
        const pos = await ev(page, () => globalThis.__densePicking.positions());
        const beacon = await ev(page, () => globalThis.__sandbox.topNode());

        step = "hint tags";
        await parkLeft(page);
        await ev(page, (b) => globalThis.__sandbox.aim("right", b), beacon);
        await until(
            page,
            (b) => Object.values(globalThis.__densePicking.state().latched?.tags ?? {}).includes(b),
            beacon,
            30_000,
        );
        const s1 = await dp(page);
        const tags = Object.keys(s1.latched.tags);
        const { origin, dir, coneDeg } = s1.lastLatch;
        const cos = Math.cos((coneDeg * Math.PI) / 180);
        const inCone = Object.entries(pos)
            .filter(([, p]) => {
                const v = sub(p, origin);
                const t = dot(v, dir);
                return t > 0 && t / Math.hypot(...v) >= cos;
            })
            .map(([n]) => n);
        const twoLetters = tags.every((t) => /^[a-z]{2}$/.test(t));
        const prefixFree = tags.every((a) => tags.every((b) => a === b || !b.startsWith(a)));
        check(
            "tagsAreTheCone",
            s1.latched.mode === "cone" && sameSet(Object.values(s1.latched.tags), inCone) && twoLetters && prefixFree,
            { count: tags.length, inCone: inCone.length, twoLetters, prefixFree, coneDeg, tags: s1.latched.tags },
        );
        await page.screenshot({ path: join(args.out, `${profile}--tags.png`) });

        step = "type the beacon's tag";
        const tag = tags.find((t) => s1.latched.tags[t] === beacon);
        const typedLog = [];
        for (const ch of tag) {
            const at = await ev(page, (k) => globalThis.__densePicking.keyWorld(k), ch);
            if (!at) {
                typedLog.push(`${ch}: no key`);
                break;
            }
            await ev(page, ([x, y, z]) => globalThis.__sandbox.aimAt("right", x, y, z), at);
            await frames(page, 10);
            await press(page, "right", kind);
            typedLog.push(`${ch}: typed "${(await dp(page)).typed}"`);
        }
        const sel = await ev(page, () => globalThis.__sandbox.state());
        const log = await ev(page, () => globalThis.__sandbox.log(200));
        const pick = log.find((e) => e.message === "dense-picking.pick");
        const cmd = log.find(
            (e) => e.message === "command" && e.data?.code === "select" && e.data?.technique === "dense-picking",
        );
        check("typeBeaconTag", sel.selection.length === 1 && sel.selection[0] === beacon && !!pick && !!cmd, {
            beacon,
            tag,
            typedLog,
            selection: sel.selection,
            pick: pick?.data,
            command: cmd?.data?.label,
        });

        step = "slab through the beacon";
        await ev(page, () => globalThis.__sandbox.aim("right", "space"));
        await ev(page, () => globalThis.__sandbox.run("select", { ids: [] }));
        await slabThrough(page, pos[beacon], 0.3);
        await frames(page, 30);
        const s2 = (await dp(page)).slab;
        const n = s2.normal;
        const right = norm(cross([0, 1, 0], n));
        const up = norm(cross(n, right));
        const want = Object.entries(pos)
            .filter(([, p]) => {
                const v = sub(p, s2.center);
                return (
                    Math.abs(dot(v, n)) <= s2.halfThickness &&
                    Math.abs(dot(v, right)) <= s2.size / 2 &&
                    Math.abs(dot(v, up)) <= s2.size / 2
                );
            })
            .map(([k]) => k);
        check(
            "slabSlice",
            s2.shown &&
                s2.slice.length > 0 &&
                sameSet(s2.slice, want) &&
                s2.dimmed === Object.keys(pos).length - want.length,
            { slice: s2.slice.length, want: want.length, dimmed: s2.dimmed, beaconInSlice: s2.slice.includes(beacon) },
        );

        step = "hover and tap on the plate";
        // The dot farthest from its nearest neighbor, so a millimeter of aim cannot pick another.
        const dots = await ev(page, (names) => names.map((n) => globalThis.__densePicking.dotWorld(n)), s2.slice);
        const gap = (k) => Math.min(...dots.map((d, m) => (m === k ? Infinity : Math.hypot(...sub(d, dots[k])))));
        const gaps = dots.map((_, k) => gap(k));
        const target = s2.slice[gaps.indexOf(Math.max(...gaps))];
        const dotAt = await ev(page, (t) => globalThis.__densePicking.dotWorld(t), target);
        const miss = await aimOnPlate(page, "right", dotAt, s2);
        await frames(page, 15);
        const names = Object.keys(pos);
        const hover = await ev(page, () => globalThis.__sandbox.hover("right"));
        await press(page, "right", kind);
        const sel2 = await ev(page, () => globalThis.__sandbox.state());
        check(
            "slabHoverAndTap",
            names[hover.node] === target &&
                hover.context === "node" &&
                sel2.selection.length === 1 &&
                sel2.selection[0] === target,
            {
                target,
                gapMm: Math.round(Math.max(...gaps) * 1e4) / 10,
                missMm: Math.round(miss * 1e4) / 10,
                hover: names[hover.node],
                context: hover.context,
                selection: sel2.selection,
                wins: (await ev(page, () => globalThis.__sandbox.wins())).slice(-2),
            },
        );
        await page.screenshot({ path: join(args.out, `${profile}--slab.png`) });

        const f = await ev(page, () => globalThis.__sandbox.frames(300));
        check("frameTime480", f.over50 === 0, {
            jsP95: f.jsP95,
            jsMax: f.jsMax,
            over50: f.over50,
            hooksP95: f.hooksP95,
        });

        step = "switch off and on";
        await ev(page, () => globalThis.__sandbox.setOn("dense-picking", false));
        await frames(page, 15);
        const off = await dp(page);
        const meshes1 = (await ev(page, () => globalThis.__sandbox.counts())).meshes;
        await ev(page, () => globalThis.__sandbox.setOn("dense-picking", true));
        await frames(page, 15);
        const back = await dp(page);
        check(
            "toggleOffOn",
            !off.slab.shown &&
                off.latched === null &&
                !off.keyboard &&
                off.slab.dimmed === 0 &&
                meshes1 === meshes0 &&
                back.slab.shown &&
                back.slab.holdHand === "left",
            {
                off: { shown: off.slab.shown, tags: !!off.latched, keyboard: off.keyboard, dimmed: off.slab.dimmed },
                meshes0,
                meshes1,
                back: back.slab.holdHand,
            },
        );
    } finally {
        await context.close();
    }
};

const runOff = async (profile, r, check) => {
    const kind = profile.endsWith("hands") ? "pinch" : "trigger";
    const { context, page } = await open(profile, { preset: "empty", graph: "dense", n: "480", seed: "7" }, r);
    try {
        const top = await ev(page, () => globalThis.__sandbox.topNode());
        await ev(page, (b) => globalThis.__sandbox.aim("right", b), top);
        await frames(page, 40);
        const s = await dp(page);
        await press(page, "right", kind);
        const sel = await ev(page, () => globalThis.__sandbox.state());
        check("offNothingShown", !s.slab.shown && s.latched === null && !s.keyboard, {
            slab: s.slab.shown,
            tags: !!s.latched,
        });
        check("offPlainSelect", sel.selection.length === 1 && sel.selection[0] === top, { selection: sel.selection });
    } finally {
        await context.close();
    }
};

const run2000 = async (profile, r, check) => {
    const { context, page } = await open(
        profile,
        { preset: "empty", on: "dense-picking", graph: "dense", n: "2000", seed: "7" },
        r,
    );
    try {
        const pos = await ev(page, () => globalThis.__densePicking.positions());
        const top = await ev(page, () => globalThis.__sandbox.topNode());
        await ev(page, (b) => globalThis.__sandbox.aim("right", b), top);
        await until(page, () => !!globalThis.__densePicking.state().latched, undefined, 30_000);
        const start = await ev(page, () => globalThis.__sandbox.xrFrames());
        // Sweep the plate through the graph, 15 cm either side of the top node, in 1 cm steps.
        const c = pos[top];
        let maxSlice = 0;
        for (let k = -15; k <= 15; k++) {
            await slabThrough(page, [c[0], c[1], c[2] + k / 100], 0.3);
            await frames(page, 3);
            maxSlice = Math.max(maxSlice, (await dp(page)).slab.slice.length);
        }
        const used = (await ev(page, () => globalThis.__sandbox.xrFrames())) - start;
        const s = await dp(page);
        const f = await ev(page, (k) => globalThis.__sandbox.frames(k), used);
        check("frameTime2000", f.over50 === 0 && s.latched && s.slab.shown && maxSlice > 0, {
            maxSlice,
            frames: used,
            tags: Object.keys(s.latched?.tags ?? {}).length,
            slice: s.slab.slice.length,
            jsP95: f.jsP95,
            jsMax: f.jsMax,
            over50: f.over50,
            hooksP95: f.hooksP95,
        });
        await page.screenshot({ path: join(args.out, `${profile}--n2000.png`) });
    } finally {
        await context.close();
    }
};

const results = [];
for (const profile of args.profiles.split(",")) {
    const r = { profile, checks: {}, consoleErrors: [], pageErrors: [] };
    const check = (name, pass, detail) => {
        r.checks[name] = { pass: !!pass, ...detail };
    };
    for (const [name, fn] of [
        ["on", runOn],
        ["off", runOff],
        ["n2000", run2000],
    ]) {
        try {
            await fn(profile, r, check);
        } catch (e) {
            check(`${name}Ran`, false, { step, error: String(e).slice(0, 500) });
        }
    }
    check("noErrors", r.consoleErrors.length === 0 && r.pageErrors.length === 0, {
        consoleErrors: r.consoleErrors,
        pageErrors: r.pageErrors,
    });
    r.pass = Object.values(r.checks).every((c) => c.pass);
    results.push(r);
    const failed = Object.entries(r.checks)
        .filter(([, c]) => !c.pass)
        .map(([k]) => k);
    const failedNote = failed.length ? `  failed: ${failed.join(", ")}` : "";
    console.log(`${r.pass ? "PASS" : "FAIL"} ${profile}${failedNote}`);
}
await browser.close();
const report = { url: args.url, time: new Date().toISOString(), pass: results.every((r) => r.pass), results };
writeFileSync(join(args.out, "report.json"), JSON.stringify(report, null, 2));
console.log(`report: ${join(args.out, "report.json")}`);
process.exit(report.pass ? 0 : 1);
