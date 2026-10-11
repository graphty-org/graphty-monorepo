#!/usr/bin/env node
// The journey runner (design section 7.2): walks the Florentine families journey -- Enter, then the
// ten steps of the step list -- in one preset on one emulated headset, doing each step with the
// techniques that preset has on, pressing Done and a rating on the step panel, and checking that
// each step's commands and its `step` entry reach the log (and the log server, with --logs). A step
// the mix has no way to do is pressed Done anyway and reported as a gap: that is a finding about the
// mix, not a failure of the run.
//
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/journey.mjs --url https://dev.ato.ms:<port>/ --logs http://127.0.0.1:<log port> \
//     --out <main>/tmp/xr-sandbox/journey
// Options: --mixes preset:profile,... (default baseline:quest3-controllers,figma:quest3-hands).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/journey" },
        logs: { type: "string" },
        mixes: { type: "string", default: "baseline:quest3-controllers,figma:quest3-hands" },
    },
});
if (!args.url) {
    console.error("usage: journey.mjs --url https://dev.ato.ms:<port>/ [--logs http://127.0.0.1:<port>] [--out dir]");
    process.exit(2);
}
mkdirSync(args.out, { recursive: true });
process.env.FC_FONTATIONS = "1";
const browser = await chromium.launch({
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const ev = (page, fn, arg) => page.evaluate(fn, arg);
const until = (page, fn, arg, timeout = 60_000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
const frames = async (page, n) => {
    const start = await ev(page, () => globalThis.__sandbox.xrFrames());
    await until(page, ([s, k]) => globalThis.__sandbox.xrFrames() >= s + k, [start, n]);
};
const now = (page) => ev(page, () => Date.now());
const logSince = async (page, t0) => (await ev(page, () => globalThis.__sandbox.log(600))).filter((e) => e.time >= t0);
const add = (a, b, s = 1) => a.map((v, i) => v + b[i] * s);

/** One mix: a preset on a profile. */
const runMix = async (preset, profile) => {
    const hands = profile.endsWith("hands");
    const sel = hands ? "pinch" : "trigger";
    const out = { preset, profile, steps: [], gaps: [], consoleErrors: [], pageErrors: [] };
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && out.consoleErrors.push(m.text().slice(0, 300)));
    page.on("pageerror", (e) => out.pageErrors.push(String(e).slice(0, 300)));

    /** The right hand back at a resting reach, so a ray starts well short of every panel. */
    const rest = async () => {
        await ev(page, () => globalThis.__sandbox.place("right", 0.18, 1.3, 0.25));
        await frames(page, 3);
    };
    /** Aim at a world point, press for two frames (timed in the page), release. */
    const tapPoint = async (point, kind = sel) => {
        await ev(page, ([p]) => globalThis.__sandbox.aimAt("right", p[0], p[1], p[2]), [point]);
        await frames(page, 12);
        const hover = await ev(page, () => globalThis.__sandbox.hover("right"));
        await ev(
            page,
            async ([k]) => {
                const s = globalThis.__sandbox;
                const f = s.xrFrames();
                s.press("right", k, true);
                while (s.xrFrames() < f + 2) {
                    await new Promise((r) => setTimeout(r, 1));
                }
                s.press("right", k, false);
            },
            [kind],
        );
        await frames(page, 10);
        return { context: hover.context, uiMesh: hover.uiMesh, node: hover.node };
    };
    /** A GUI control on a framework or technique panel, by name. */
    const tapControl = async (name, kind) => {
        await rest();
        const p = await ev(page, (n) => globalThis.__sandbox.control(n), name);
        if (!p) {
            throw new Error(`no shown control ${name}`);
        }
        return tapPoint(p, kind);
    };
    /** A node or any named mesh. */
    const tapMesh = async (name, kind = sel) => {
        await rest();
        await ev(page, (n) => globalThis.__sandbox.aim("right", n), name);
        await frames(page, 12);
        const hover = await ev(page, () => globalThis.__sandbox.hover("right"));
        // Timed in the page, as in run.mjs: held across round trips it could read as a hold.
        await ev(
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
        return { context: hover.context, uiMesh: hover.uiMesh, node: hover.node };
    };
    /** Open the node menu on a node (or "space"): B on controllers, a 350 ms still pinch on hands. */
    const openMenu = async (what) => {
        await rest();
        await ev(page, (n) => globalThis.__sandbox.aim("right", n), what);
        await frames(page, 12);
        if (hands) {
            await ev(page, () => globalThis.__sandbox.press("right", "pinch", true));
            await page.waitForTimeout(400);
            await frames(page, 3);
            await ev(page, () => globalThis.__sandbox.press("right", "pinch", false));
        } else {
            await ev(page, () => globalThis.__sandbox.press("right", "b", true));
            await frames(page, 2);
            await ev(page, () => globalThis.__sandbox.press("right", "b", false));
        }
        await frames(page, 8);
    };
    /** Write a short note into whatever text request is open: the keyboard, or the canned chips. */
    const answerText = async () => {
        await frames(page, 5);
        const kbOpen = await ev(page, () => globalThis.__textEntry?.open() ?? false);
        if (!kbOpen) {
            return { by: "canned chips", hit: await tapControl("text-fallback-check") };
        }
        const panel = await ev(page, () => globalThis.__textEntry.panel());
        const keys = await ev(page, () => globalThis.__textEntry.keys());
        const pressKey = async (point) => {
            if (hands) {
                // A fingertip poke: in front, through, back.
                await ev(page, (p) => globalThis.__textEntry.mark(p), point);
                await ev(page, () => globalThis.__sandbox.aim("right", "text-entry-aim"));
                const p0 = add(point, panel.normal, -0.15);
                await ev(page, (p) => globalThis.__sandbox.place("right", ...p), p0);
                await frames(page, 4);
                const tip = await ev(page, () => globalThis.__textEntry.tip("right"));
                const offset = tip.map((v, i) => v - p0[i]);
                for (const d of [-0.05, 0.004, -0.06]) {
                    await ev(
                        page,
                        (p) => globalThis.__sandbox.place("right", ...p),
                        add(add(point, offset, -1), panel.normal, d),
                    );
                    await frames(page, 5);
                }
                await ev(page, (p) => globalThis.__sandbox.place("right", ...p), add(point, panel.normal, -0.25));
                await frames(page, 3);
            } else {
                await ev(page, () => globalThis.__sandbox.place("right", 0.15, 1.2, 0.1));
                await tapPoint(point);
            }
        };
        for (const k of ["o", "k"]) {
            await pressKey(keys[k].center);
        }
        await pressKey(keys[String.fromCodePoint(0x21b5)].center);
        return { by: "keyboard", typed: "ok" };
    };
    const state = () => ev(page, () => globalThis.__sandbox.state());
    const on = async (id) => (await ev(page, () => globalThis.__sandbox.techniques())).find((t) => t.id === id)?.on;

    /** Press Done, then a rating, on the step panel; return the step entry it logged. */
    const done = async (stepId) => {
        const t0 = await now(page);
        const hitDone = await tapControl("steps-done");
        const hitRate = await tapControl("steps-rate-4");
        const entry = (await logSince(page, t0)).find((e) => e.message === "step" && e.data?.step === stepId);
        return { hitDone, hitRate, entry: entry?.data ?? null };
    };

    try {
        const url = new URL(args.url);
        url.search = new URLSearchParams({ preset, emulate: profile, still: "1", steps: "journey" }).toString();
        await page.goto(url.toString());
        await until(page, () => globalThis.__sandbox?.ready === true);
        out.sessionId = await ev(page, () => globalThis.__sandbox.sessionId);
        await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
        await until(page, () => globalThis.__sandbox.inXR() && globalThis.__sandbox.xrFrames() > 10);
        await frames(page, 40);
        const opened = (await ev(page, () => globalThis.__sandbox.log(600))).find(
            (e) => e.message === "step" && e.data?.event === "open",
        );
        const texts = opened?.data?.steps ?? [];
        out.seed = opened?.data?.seed;
        out.steps.push({ id: "enter", pass: !!opened && texts.length === 10, texts });
        const family = /Find the (.+)$/.exec(texts[1] ?? "")?.[1];
        const rank = Number(/#(\d+)/.exec(texts[4] ?? "")?.[1]);
        const noteFamily = /note on the (.+)$/.exec(texts[7] ?? "")?.[1];
        const nm = await on("node-menus");
        const figma = await on("figma-menus");

        const doStep = async (id, act) => {
            const t0 = await now(page);
            let did;
            try {
                did = await act();
            } catch (e) {
                did = { error: String(e).slice(0, 300) };
            }
            const cmds = (await logSince(page, t0)).filter((e) => e.message === "command").map((e) => e.data.label);
            const d = await done(id);
            const ok = !did?.error && d.entry?.outcome === "done";
            out.steps.push({ id, pass: ok && did?.pass !== false, did, commands: cmds, done: d });
            if (did?.gap) {
                out.gaps.push(`${id}: ${did.gap}`);
            }
            await page.screenshot({ path: join(args.out, `${preset}--${profile}--${id}.png`) });
        };

        await doStep("orient", async () => {
            const head = await ev(page, () => globalThis.__sandbox.dispatch("get_transform", { device: "headset" }));
            for (const x of [-1, 1]) {
                await ev(page, (t) => globalThis.__sandbox.dispatch("look_at", { device: "headset", target: t }), {
                    x,
                    y: 1.4,
                    z: -1.5,
                });
                await frames(page, 10);
            }
            await ev(page, (h) => globalThis.__sandbox.dispatch("set_transform", { device: "headset", ...h }), {
                position: head.position,
                orientation: head.orientation ?? head.quaternion,
            });
            await frames(page, 30);
            return { pass: true };
        });

        await doStep("find", async () => {
            await rest();
            await ev(page, (n) => globalThis.__sandbox.aim("right", n), family);
            await frames(page, 25);
            const hover = await ev(page, () => globalThis.__sandbox.hover("right"));
            const tag = await ev(page, () => globalThis.__hoverTag?.tags().right ?? null);
            // hover.node is the node's index; the tag names it.
            return { pass: hover.node >= 0 && (!tag || tag.node === family), hover: hover.node, tag: tag?.text };
        });

        await doStep("married", async () => {
            if (nm) {
                await openMenu(family);
                const hit = await tapMesh("node-menus-node-1BackMesh");
                const s = await state();
                return {
                    how: "node menu, Neighbors",
                    hit,
                    pass: s.selection.includes(family) && s.selection.length > 1,
                };
            }
            if (figma) {
                await tapMesh(family);
                const hit = await tapControl("figma-pop-1hop");
                const s = await state();
                return {
                    how: "Figma popover, 1 hop",
                    hit,
                    pass: s.selection.includes(family) && s.selection.length > 1,
                };
            }
            return { gap: "no technique in this mix selects a neighborhood" };
        });

        await doStep("pagerank", async () => {
            if (figma) {
                const hit = await tapControl("figma-tb-pagerank");
                return { how: "Figma toolbar, PageRank", hit, pass: (await state()).colorBy === "pagerank" };
            }
            if (nm) {
                await openMenu("space");
                const hit = await tapMesh("node-menus-graph-0BackMesh");
                return {
                    how: "graph menu, Show PageRank",
                    hit,
                    pass: (await state()).colorBy === "pagerank",
                    gap: "no separate Run PageRank: the graph menu's Show PageRank colors at once",
                };
            }
            return { gap: "no technique in this mix runs PageRank" };
        });

        await doStep("read", async () => {
            const name = await ev(page, (k) => globalThis.__sandbox.byRank(k), rank);
            await rest();
            await ev(page, (n) => globalThis.__sandbox.aim("right", n), name);
            await frames(page, 25);
            const tag = await ev(page, () => globalThis.__hoverTag?.tags().right ?? null);
            return { rank, answer: name, tag: tag?.text, pass: !tag || tag.text?.includes(`#${rank}`) };
        });

        await doStep("color", async () => {
            const s = await state();
            return {
                colorBy: s.colorBy,
                pass: s.colorBy === "pagerank",
                gap: "no size-by in this mix: only color by PageRank is reachable",
            };
        });

        await doStep("keep", async () => {
            if (nm) {
                await openMenu("space");
                const hit = await tapMesh("node-menus-graph-1BackMesh");
                const cmd = (await ev(page, () => globalThis.__sandbox.log(50))).findLast(
                    (e) => e.message === "command",
                )?.data;
                return {
                    how: "graph menu, Filter",
                    hit,
                    command: cmd?.label,
                    pass: cmd?.code === "filter",
                    gap: "the graph menu filters at the median; the step's threshold cannot be set",
                };
            }
            return { gap: "no filter in this mix (the sieve needs physical tools)" };
        });

        await doStep("note", async () => {
            const t0 = await now(page);
            if (figma) {
                await tapMesh(noteFamily);
                await tapControl("figma-pop-Note");
            } else if (nm) {
                await openMenu(noteFamily);
                await tapMesh("node-menus-node-3BackMesh");
            } else {
                return { gap: "no technique in this mix leaves a note" };
            }
            const ans = await answerText();
            await frames(page, 10);
            const note = (await logSince(page, t0)).find((e) => e.message === "command" && e.data?.code === "note");
            return { ...ans, note: note?.data?.label, text: note?.data?.params?.text, pass: !!note };
        });

        await doStep("undo", async () => {
            let gap;
            if (figma) {
                await tapControl("figma-tb-degree");
            } else {
                gap = "no color by degree in this mix; undoes the last step instead";
            }
            const before = await state();
            const hit = await tapControl("visible-undo-undo-button");
            const after = await state();
            return {
                hit,
                undid: before.undoLabel,
                colorBy: [before.colorBy, after.colorBy],
                pass: after.history.length === before.history.length - 1,
                gap,
            };
        });

        await doStep("save", async () => {
            const t0 = await now(page);
            await ev(page, () => globalThis.__sandbox.place("left", -0.12, 1.2, 0.08));
            await ev(page, () => globalThis.__sandbox.aim("left", "gear"));
            await frames(page, 12);
            await ev(page, (k) => globalThis.__sandbox.press("left", k, true), sel);
            await frames(page, 4);
            await ev(page, (k) => globalThis.__sandbox.press("left", k, false), sel);
            await frames(page, 8);
            await tapControl("gear-tab-framework");
            await tapControl("gear-save");
            await tapControl("gear-close");
            const saved = (await logSince(page, t0)).some((e) => e.message === "save");
            return { how: "gear panel, Framework, Save", pass: saved };
        });

        const finished = await ev(page, () => globalThis.__sandbox.control("steps-close"));
        out.finished = !!finished;
        if (args.logs) {
            await page.waitForTimeout(1500);
            const all = await (await fetch(new URL("/logs", args.logs))).json();
            const mine = all[out.sessionId] ?? [];
            out.serverStepEntries = mine.filter((e) => e.message === "step").length;
        }
    } catch (e) {
        out.error = String(e).slice(0, 500);
    }
    await context.close();
    out.pass =
        !out.error &&
        out.finished &&
        out.steps.length === 11 &&
        out.steps.every((s) => s.pass) &&
        out.consoleErrors.length + out.pageErrors.length === 0 &&
        (!args.logs || out.serverStepEntries >= 11);
    return out;
};

const results = [];
for (const mix of args.mixes.split(",")) {
    const [preset, profile] = mix.split(":");
    const r = await runMix(preset, profile);
    results.push(r);
    console.log(
        `${r.pass ? "PASS" : "FAIL"} ${preset} ${profile}  steps ${r.steps.filter((s) => s.pass).length}/${r.steps.length}` +
            (r.error ? `  error: ${r.error}` : "") +
            (r.steps.some((s) => !s.pass)
                ? `  failed: ${r.steps
                      .filter((s) => !s.pass)
                      .map((s) => s.id)
                      .join(", ")}`
                : "") +
            (r.gaps.length ? `  gaps: ${r.gaps.length}` : ""),
    );
}
await browser.close();
writeFileSync(join(args.out, "journey.json"), JSON.stringify(results, null, 2));
process.exit(results.every((r) => r.pass) ? 0 : 1);
