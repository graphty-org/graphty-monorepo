#!/usr/bin/env node
// The voice module's own checks (plan section 3.13), on an emulated headset, with the module on and
// off, with hands and with controllers. Galaxy XR profiles get a stub Web Speech recognizer the
// check speaks through (`__say`); Quest profiles get no Web Speech API and a session that reports a
// system keyboard, as Quest Browser does, and the check "dictates" by filling the focused input.
// Talking is X held on controllers and the mic chip held on hands; chips are pressed by ray.
// Arrange through the hooks, act through emulated input, assert through the log.
//
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/voice.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-voice
// Options: --profiles a,b (default galaxyxr-controllers,quest3-hands,galaxyxr-hands,quest3-controllers).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-voice" },
        profiles: { type: "string", default: "galaxyxr-controllers,quest3-hands,galaxyxr-hands,quest3-controllers" },
    },
});
if (!args.url) {
    console.error("usage: voice.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b]");
    process.exit(2);
}
mkdirSync(args.out, { recursive: true });
process.env.FC_FONTATIONS = "1";
const browser = await chromium.launch({
    headless: true,
    args: [
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--ignore-gpu-blocklist",
        // A microphone the landing page's arming box can open.
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
    ],
});

const until = (page, fn, arg, timeout = 60_000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
const frames = async (page, n) => {
    const start = await page.evaluate(() => globalThis.__sandbox.xrFrames());
    await until(page, ([s, k]) => globalThis.__sandbox.xrFrames() >= s + k, [start, n]);
};
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const now = (page) => ev(page, () => Date.now());
const logSince = async (page, t0) => (await ev(page, () => globalThis.__sandbox.log(400))).filter((e) => e.time >= t0);
const lastChips = async (page) =>
    (await ev(page, () => globalThis.__sandbox.log(400))).findLast((e) => e.message === "voice.chips")?.data?.chips ??
    [];

/** Galaxy XR: a stub recognizer the check speaks through. Quest: no Web Speech API, a system keyboard. */
const initScript = ({ quest }) => {
    delete globalThis.webkitSpeechRecognition;
    delete globalThis.SpeechRecognition;
    if (quest) {
        return;
    }
    globalThis.__rec = null;
    globalThis.SpeechRecognition = class {
        start() {
            globalThis.__rec = this;
        }
        stop() {
            setTimeout(() => {
                globalThis.__rec = null;
                this.onend?.();
            }, 20);
        }
    };
    globalThis.__say = (text, isFinal) => {
        const result = Object.assign([{ transcript: text }], { isFinal });
        globalThis.__rec?.onresult?.({ resultIndex: 0, results: [result] });
    };
};

const open = async (profile, preset, { arm }) => {
    const r = { consoleErrors: [], pageErrors: [] };
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && r.consoleErrors.push(m.text().slice(0, 300)));
    page.on("pageerror", (e) => r.pageErrors.push(String(e).slice(0, 300)));
    const quest = profile.startsWith("quest");
    await page.addInitScript(initScript, { quest });
    const url = new URL(args.url);
    url.search = new URLSearchParams({ preset, emulate: profile, still: "1" }).toString();
    await page.goto(url.toString());
    await until(page, () => globalThis.__sandbox?.ready === true);
    if (quest) {
        // IWER's sessions always report false; report true, as Quest Browser does.
        await ev(page, () =>
            Object.defineProperty(globalThis.XRSession.prototype, "isSystemKeyboardSupported", { get: () => true }),
        );
    }
    if (arm) {
        await page.locator("#arm-mic").check();
        await until(page, () => globalThis.__sandbox.log(400).some((e) => e.message === "arm"));
    }
    await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
    await until(page, () => globalThis.__sandbox.inXR() && globalThis.__sandbox.xrFrames() > 10);
    // Warm-up, as the framework dry run does: first-frame shader and texture work is not pacing.
    await frames(page, 60);
    return { page, context, r };
};

/** Aim at a node or mesh by name, press and release. */
const pressAt = async (page, hand, target, kind) => {
    await ev(page, ([h, t]) => globalThis.__sandbox.aim(h, t), [hand, target]);
    await frames(page, 12);
    await ev(page, ([h, k]) => globalThis.__sandbox.press(h, k, true), [hand, kind]);
    await frames(page, 6);
    await ev(page, ([h, k]) => globalThis.__sandbox.press(h, k, false), [hand, kind]);
    await frames(page, 10);
};

const runOne = async (profile) => {
    const out = { profile, checks: {}, consoleErrors: [], pageErrors: [] };
    const check = (name, pass, detail) => {
        out.checks[name] = { pass: !!pass, ...detail };
    };
    const hands = profile.endsWith("hands");
    const quest = profile.startsWith("quest");
    const kind = hands ? "pinch" : "trigger";
    const engineKind = quest ? "system-keyboard" : "web-speech";
    const collect = async (s, name) => {
        out.consoleErrors.push(...s.r.consoleErrors);
        out.pageErrors.push(...s.r.pageErrors);
        try {
            await s.page.screenshot({ path: join(args.out, `${profile}--${name}.png`) });
        } catch {
            // nothing to show
        }
        await s.context.close();
    };
    const poke = (page, mesh) => pressAt(page, "right", mesh, kind);

    /** Talk: `steps` are [text, final] pairs, the last one final; ends the listen the way the device does. */
    const say = async (page, steps) => {
        if (hands) {
            await ev(page, () => globalThis.__sandbox.aim("right", "voice-mic"));
            await frames(page, 12);
            await ev(page, (k) => globalThis.__sandbox.press("right", k, true), kind);
        } else {
            await ev(page, () => globalThis.__sandbox.press("left", "x", true));
        }
        await frames(page, 6);
        const shown = [];
        let focused = null;
        if (quest) {
            if (hands) {
                // The release of the pinch is the select event that opens the keyboard.
                await ev(page, (k) => globalThis.__sandbox.press("right", k, false), kind);
            } else {
                await ev(page, () => globalThis.__sandbox.press("left", "x", false));
                await frames(page, 4);
                await pressAt(page, "right", "space", "trigger");
            }
            await frames(page, 6);
            focused = await ev(page, () => document.activeElement?.tagName ?? null);
            for (const [text] of steps) {
                await ev(
                    page,
                    (t) => {
                        const el = document.activeElement;
                        el.value = t;
                        el.dispatchEvent(new Event("input"));
                    },
                    text,
                );
                await frames(page, 4);
                shown.push(await lastChips(page));
            }
            await ev(page, () => document.activeElement?.blur());
        } else {
            for (const [text, final] of steps) {
                await ev(page, ([t, f]) => globalThis.__say(t, f), [text, final]);
                await frames(page, 4);
                shown.push(await lastChips(page));
            }
            if (hands) {
                await ev(page, (k) => globalThis.__sandbox.press("right", k, false), kind);
            } else {
                await ev(page, () => globalThis.__sandbox.press("left", "x", false));
            }
        }
        await frames(page, 10);
        return { during: shown, after: await lastChips(page), focused };
    };
    const texts = (chips) => chips.map((c) => c.text).join("/");

    // Module on (armed), the voice preset.
    let s = await open(profile, "voice", { arm: true });
    try {
        const { page } = s;
        const t0 = await now(page);
        const on = (await ev(page, () => globalThis.__sandbox.techniques())).find((t) => t.id === "voice");
        check("armedSwitchesOn", on?.on, { voice: on });

        const f = await ev(page, () => globalThis.__sandbox.frames(200));
        const j = await ev(page, () => globalThis.__sandbox.jitter(120));
        check("framesAndJitter", f.over50 === 0 && j.maxMm < 0.05 && j.maxDeg < 0.01, {
            jsP95: f.jsP95,
            jsMax: f.jsMax,
            hooksP95: f.hooksP95,
            over50: f.over50,
            jitterMm: j.maxMm,
            jitterDeg: j.maxDeg,
        });
        check("idleChipsDoNotRedraw", j.panelRenders === 0 && j.chipRedraws === 0, {
            panelRenders: j.panelRenders,
            chipRedraws: j.chipRedraws,
        });

        if (hands) {
            await ev(page, () => globalThis.__sandbox.place("right", 0.15, 1.3, 0.1));
        }
        await pressAt(page, "right", "Medici", kind);
        const sel = await ev(page, () => globalThis.__sandbox.state().selection);

        const heard = await say(page, [
            ["color these", false],
            ["color these by PageRank", true],
        ]);
        const log1 = await logSince(page, t0);
        const start = log1.find((e) => e.message === "voice.engine.start");
        const interimGray = heard.during[0]?.slice(0, 2).every((c) => c.style === "interim");
        check(
            "talkInterimThenFinal",
            sel.join() === "Medici" &&
                start?.data?.engine === engineKind &&
                interimGray &&
                texts(heard.after) === "color/these/by/PageRank/Run" &&
                heard.after.slice(0, 4).every((c) => c.style === "solid") &&
                heard.after[4].style === "run",
            {
                selection: sel,
                start: start?.data ?? null,
                during: heard.during.map((c) => c.map((x) => `${x.text}:${x.style}`)),
                after: heard.after.map((x) => `${x.text}:${x.style}`),
                focused: heard.focused,
                log: log1
                    .filter((e) => /^(voice\.|arbiter|cancel|input)/.test(e.message))
                    .map((e) => `${e.message} ${JSON.stringify(e.data ?? {}).slice(0, 160)}`),
            },
        );

        // Poke PageRank: three alternatives, then the vocabulary; choose Degree; Run.
        const t1 = await now(page);
        await poke(page, "voice-chip-3");
        const alts = (await logSince(page, t1)).find((e) => e.message === "voice.alternatives")?.data;
        const offered = alts ? [...alts.top, ...alts.all] : [];
        const di = offered.indexOf("Degree");
        if (di >= 0) {
            await poke(page, `voice-alt-${di}`);
        }
        const fixed = await lastChips(page);
        await poke(page, "voice-chip-4");
        const cmd = (await logSince(page, t1)).find((e) => e.message === "command");
        check(
            "pokeFixesOneWord",
            alts?.top.length === 3 &&
                alts.all.length > 0 &&
                texts(fixed) === "color/these/by/Degree/Run" &&
                cmd?.data?.code === "colorBy" &&
                cmd.data.params?.result === "degree" &&
                cmd.data.technique === "voice",
            { alternatives: alts ?? null, fixed: texts(fixed), command: cmd?.data ?? null },
        );

        // An unparsed word is a red "?" chip.
        const bad = await say(page, [["color these by banana", true]]);
        const q = bad.after.find((c) => c.text.endsWith("?"));
        check(
            "unparsedIsRed",
            q?.text === "banana?" && q.style === "unparsed" && bad.after.at(-1).style === "run-off",
            {
                after: bad.after.map((x) => `${x.text}:${x.style}`),
            },
        );

        // The same command by poking alone, verb first.
        const t2 = await now(page);
        await poke(page, "voice-clear");
        await poke(page, "voice-chip-0");
        const verbs = (await logSince(page, t2)).find((e) => e.message === "voice.alternatives")?.data;
        const vlist = verbs ? [...verbs.top, ...verbs.all] : [];
        await poke(page, `voice-alt-${vlist.indexOf("color")}`);
        const built = await lastChips(page);
        const t3 = await now(page);
        await poke(page, "voice-chip-3");
        const ralts = (await logSince(page, t3)).find((e) => e.message === "voice.alternatives")?.data;
        const rlist = ralts ? [...ralts.top, ...ralts.all] : [];
        await poke(page, `voice-alt-${rlist.indexOf("Degree")}`);
        await poke(page, "voice-chip-4");
        const cmd2 = (await logSince(page, t3)).find((e) => e.message === "command");
        check(
            "pokeOnlyBuildsSameCommand",
            texts(built) === "color/all/by/?/Run" &&
                cmd2?.data?.code === "colorBy" &&
                cmd2.data.params?.result === "degree" &&
                cmd2.data.technique === "voice",
            { built: texts(built), command: cmd2?.data ?? null },
        );

        const all = await logSince(page, t0);
        const starts = all.filter((e) => e.message === "voice.engine.start");
        const ends = all.filter((e) => e.message === "voice.engine.end");
        check(
            "everyStartAndEndLogged",
            starts.length === 2 &&
                ends.length === 2 &&
                starts.every((e) => e.data?.by) &&
                ends.every((e) => (quest ? e.data?.reason === "keyboard-closed" : e.data?.reason === "user")),
            { starts: starts.map((e) => e.data), ends: ends.map((e) => e.data) },
        );
    } catch (e) {
        check("ranOn", false, { error: String(e).slice(0, 500) });
    }
    await collect(s, "on");

    // Not armed: the switch is off, grayed, with the reason; the gear panel is opened for the screenshot.
    s = await open(profile, "voice", { arm: false });
    try {
        const { page } = s;
        // The same preset with voice off, for comparison with the armed run's frames.
        const f = await ev(page, () => globalThis.__sandbox.frames(200));
        check("framesWithVoiceOff", true, { jsP95: f.jsP95, jsMax: f.jsMax, over50: f.over50 });
        const t = (await ev(page, () => globalThis.__sandbox.techniques())).find((x) => x.id === "voice");
        await ev(page, () => globalThis.__sandbox.setOn("voice", true));
        const still = (await ev(page, () => globalThis.__sandbox.techniques())).find((x) => x.id === "voice");
        await ev(page, () => globalThis.__sandbox.place("left", -0.12, 1.2, 0.08));
        await pressAt(page, "left", "gear", hands ? "pinch" : "trigger");
        check("unarmedRefused", !t.on && !still.on && /^unarmed/.test(t.reason ?? ""), {
            reason: t.reason,
            gearOpen: await ev(page, () => globalThis.__sandbox.gearOpen()),
        });
    } catch (e) {
        check("ranUnarmed", false, { error: String(e).slice(0, 500) });
    }
    await collect(s, "unarmed-gear");

    // Module off (armed, empty preset): X or a pinch reaches no voice code.
    s = await open(profile, "empty", { arm: true });
    try {
        const { page } = s;
        const t0 = await now(page);
        if (hands) {
            await pressAt(page, "right", "space", "pinch");
        } else {
            await ev(page, () => globalThis.__sandbox.press("left", "x", true));
            await frames(page, 6);
            await ev(page, () => globalThis.__sandbox.press("left", "x", false));
            await frames(page, 6);
        }
        const log = await logSince(page, t0);
        check("offIsSilent", !log.some((e) => e.message.startsWith("voice.")), {
            entries: log.map((e) => e.message),
        });
    } catch (e) {
        check("ranOff", false, { error: String(e).slice(0, 500) });
    }
    await collect(s, "off");

    check("noErrors", out.consoleErrors.length === 0 && out.pageErrors.length === 0, {
        consoleErrors: out.consoleErrors.slice(0, 5),
        pageErrors: out.pageErrors.slice(0, 5),
    });
    out.pass = Object.values(out.checks).every((c) => c.pass);
    return out;
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
    `${results.filter((r) => r.pass).length} of ${results.length} profiles passed; report: ${join(args.out, "report.json")}`,
);
process.exit(report.pass ? 0 : 1);
