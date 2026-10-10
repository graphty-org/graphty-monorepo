#!/usr/bin/env node
// The text entry module's own checks (plan section 3.11), on an emulated headset, with the module on
// and off, with hands and with controllers. Arrange through the hooks (`__textEntry.requestNote`
// asks for a note as a node menu would), act through emulated input (a fingertip poke with hands, a
// ray and trigger with controllers, a pinch for the system keyboard), assert through the log.
//
//   <main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
//     node xr-sandbox/dryrun/checks/text-entry.mjs --url https://dev.ato.ms:<port>/ \
//     --out <main>/tmp/xr-sandbox/dryrun-text-entry
// Options: --profiles a,b (default quest3-hands,galaxyxr-hands,quest3-controllers,galaxyxr-controllers).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

const { values: args } = parseArgs({
    options: {
        url: { type: "string" },
        out: { type: "string", default: "tmp/xr-sandbox/dryrun-text-entry" },
        profiles: { type: "string", default: "quest3-hands,galaxyxr-hands,quest3-controllers,galaxyxr-controllers" },
    },
});
if (!args.url) {
    console.error("usage: text-entry.mjs --url https://dev.ato.ms:<port>/ [--out dir] [--profiles a,b]");
    process.exit(2);
}
mkdirSync(args.out, { recursive: true });
process.env.FC_FONTATIONS = "1";
const browser = await chromium.launch({
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const ENTER = "↵";
const until = (page, fn, arg, timeout = 60_000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
const frames = async (page, n) => {
    const start = await page.evaluate(() => window.__sandbox.xrFrames());
    await until(page, ([s, k]) => window.__sandbox.xrFrames() >= s + k, [start, n]);
};
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const now = (page) => ev(page, () => Date.now());
const logSince = async (page, t0) => (await ev(page, () => window.__sandbox.log(400))).filter((e) => e.time >= t0);
const add = (a, b, s = 1) => a.map((v, i) => v + b[i] * s);

/** Init scripts: a prompt() that counts (any call fails the run), and an optional stub recognizer. */
const initScript = ({ stubSpeech, noSpeech }) => {
    window.__promptCalls = 0;
    window.prompt = () => {
        window.__promptCalls++;
        return null;
    };
    if (noSpeech) {
        // Quest Browser has no Web Speech API; headless Chromium does.
        delete window.webkitSpeechRecognition;
        delete window.SpeechRecognition;
    }
    if (stubSpeech) {
        window.SpeechRecognition = class {
            start() {
                setTimeout(() => {
                    const interim = Object.assign([{ transcript: "three word" }], { isFinal: false });
                    this.onresult?.({ resultIndex: 0, results: [interim] });
                    setTimeout(() => {
                        const final = Object.assign([{ transcript: "three word note" }], { isFinal: true });
                        this.onresult?.({ resultIndex: 0, results: [final] });
                        this.onend?.();
                    }, 150);
                }, 150);
            }
            stop() {}
        };
    }
};

const open = async (profile, query, { stubSpeech = false, systemKeyboard = false } = {}) => {
    const r = { consoleErrors: [], pageErrors: [] };
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && r.consoleErrors.push(m.text().slice(0, 300)));
    page.on("pageerror", (e) => r.pageErrors.push(String(e).slice(0, 300)));
    await page.addInitScript(initScript, { stubSpeech, noSpeech: systemKeyboard });
    const url = new URL(args.url);
    url.search = new URLSearchParams({ ...query, emulate: profile, still: "1" }).toString();
    await page.goto(url.toString());
    await until(page, () => window.__sandbox?.ready === true && !!window.__textEntry);
    if (systemKeyboard) {
        // IWER's sessions always report false; report true, as Quest Browser does.
        await ev(page, () =>
            Object.defineProperty(window.XRSession.prototype, "isSystemKeyboardSupported", { get: () => true }),
        );
    }
    await page.locator("#enter-vr:not([disabled])").click({ timeout: 30_000 });
    await until(page, () => window.__sandbox.inXR() && window.__sandbox.xrFrames() > 10);
    await frames(page, 30);
    return { page, context, r };
};

/** A fingertip poke: aim the hand at the point, bring the index tip in front of it, through, back. */
const poke = async (page, hand, point, normal) => {
    await ev(page, (p) => window.__textEntry.mark(p), point);
    await ev(page, ([h]) => window.__sandbox.aim(h, "text-entry-aim"), [hand]);
    const p0 = add(point, normal, -0.15);
    await ev(page, ([h, p]) => window.__sandbox.place(h, ...p), [hand, p0]);
    await frames(page, 4);
    const tip = await ev(page, (h) => window.__textEntry.tip(h), hand);
    const offset = tip.map((v, i) => v - p0[i]);
    const at = (d) => add(add(point, offset, -1), normal, d);
    for (const d of [-0.05, 0.004, -0.06]) {
        await ev(page, ([h, p]) => window.__sandbox.place(h, ...p), [hand, at(d)]);
        await frames(page, 5);
    }
    // Park the hand away from the panel, so the next poke starts clear of it.
    await ev(page, ([h, p]) => window.__sandbox.place(h, ...p), [hand, add(point, normal, -0.25)]);
    await frames(page, 3);
};

/**
 * A ray press: aim the controller at the point and press. The controller is held 28 cm short of the
 * panel first: within 10 cm of it Babylon's near interaction turns the ray off and the tip pokes.
 */
const rayPress = async (page, hand, point, kind) => {
    await ev(page, ([h]) => window.__sandbox.place(h, 0.15, 1.2, 0.1), [hand]);
    await ev(page, (p) => window.__textEntry.mark(p), point);
    await ev(page, ([h]) => window.__sandbox.aim(h, "text-entry-aim"), [hand]);
    await frames(page, 10);
    await ev(page, ([h, k]) => window.__sandbox.press(h, k, true), [hand, kind]);
    await frames(page, 6);
    await ev(page, ([h, k]) => window.__sandbox.press(h, k, false), [hand, kind]);
    await frames(page, 10);
};

const runOne = async (profile) => {
    const out = { profile, checks: {}, consoleErrors: [], pageErrors: [] };
    const check = (name, pass, detail) => {
        out.checks[name] = { pass: !!pass, ...detail };
    };
    const hands = profile.endsWith("hands");
    const press = async (page, point, normal) =>
        hands ? poke(page, "right", point, normal) : rayPress(page, "right", point, "trigger");
    const collect = async (s) => {
        out.consoleErrors.push(...s.r.consoleErrors);
        out.pageErrors.push(...s.r.pageErrors);
        try {
            await s.page.screenshot({ path: join(args.out, `${profile}--${Object.keys(out.checks).length}.png`) });
        } catch {
            // nothing to show
        }
        await s.context.close();
    };

    // Module on, with a stub recognizer.
    let s = await open(profile, { preset: "empty", on: "text-entry" }, { stubSpeech: true });
    try {
        const { page } = s;
        const t0 = await now(page);
        await ev(page, () => window.__textEntry.requestNote("Medici"));
        await frames(page, 5);
        const panel = await ev(page, () => window.__textEntry.panel());
        const dbg = await ev(page, () => window.__sandbox.debug());
        const head = dbg.camera;
        const d = panel.center.map((v, i) => v - head[i]);
        const horizontal = Math.hypot(d[0], d[2]);
        const below = -d[1];
        const tip = hands ? await ev(page, () => window.__textEntry.tip("right")) : null;
        check(
            "opensAtReach",
            (await ev(page, () => window.__textEntry.open())) &&
                horizontal > 0.3 &&
                horizontal < 0.5 &&
                below > 0.15 &&
                Math.atan2(below, horizontal) > (20 * Math.PI) / 180,
            {
                horizontalFromHeadM: +horizontal.toFixed(3),
                belowEyesM: +below.toFixed(3),
                degBelowGaze: +((Math.atan2(below, horizontal) * 180) / Math.PI).toFixed(1),
                fromRightHandM: tip ? +Math.hypot(...panel.center.map((v, i) => v - tip[i])).toFixed(3) : null,
            },
        );
        const keys = await ev(page, () => window.__textEntry.keys());
        const small = Object.entries(keys).filter(([, k]) => k.widthM < 0.02 || k.heightM < 0.02);
        const minW = Math.min(...Object.values(keys).map((k) => k.widthM));
        check("keysAtLeast2cm", small.length === 0, { keys: Object.keys(keys).length, minWidthM: +minW.toFixed(4) });

        for (const key of ["c", "a", "t"]) {
            await press(page, keys[key].center, panel.normal);
        }
        const typed = await ev(page, () => window.__textEntry.field());
        await press(page, keys[ENTER].center, panel.normal);
        const log = await logSince(page, t0);
        const note = log.find((e) => e.message === "command" && e.data?.code === "note");
        const closeEntry = log.find((e) => e.message === "text-entry.close");
        check(
            "typesCat",
            note?.data?.params?.text === "cat" &&
                note?.data?.label === "Note on Medici" &&
                !(await ev(page, () => window.__textEntry.open())),
            {
                typed,
                note: note ? { label: note.data.label, text: note.data.params?.text } : null,
                close: closeEntry?.data,
            },
        );

        // Dictation with the stub recognizer: the words are added to the field.
        const t1 = await now(page);
        await ev(page, () => window.__textEntry.requestNote("Strozzi"));
        await frames(page, 5);
        await press(page, keys.o.center, panel.normal);
        const dk = await ev(page, () => window.__textEntry.dictateKey());
        const p2 = await ev(page, () => window.__textEntry.panel());
        await press(page, p2.dictate, p2.normal);
        await until(page, () => window.__textEntry.field().endsWith("three word note"), undefined, 10_000).catch(
            () => undefined,
        );
        const dictated = await ev(page, () => window.__textEntry.field());
        await press(page, keys[ENTER].center, panel.normal);
        const log2 = await logSince(page, t1);
        const note2 = log2.find((e) => e.message === "command" && e.data?.code === "note");
        check("dictationAppends", dictated === "o three word note" && note2?.data?.params?.text === dictated, {
            route: dk.route,
            field: dictated,
            dictation: log2.filter((e) => e.message.startsWith("text-entry.dictation")).map((e) => e.data),
        });

        // Switched off while open: the request ends with nothing and the keyboard hides.
        await ev(page, () => window.__textEntry.requestNote("Medici"));
        await frames(page, 3);
        await ev(page, () => window.__sandbox.setOn("text-entry", false));
        await frames(page, 3);
        check("offWhileOpen", !(await ev(page, () => window.__textEntry.open())), {});
        check("promptNeverCalled", (await ev(page, () => window.__promptCalls)) === 0, {
            calls: await ev(page, () => window.__promptCalls),
        });
    } catch (e) {
        check("ranOn", false, { error: String(e).slice(0, 500) });
    }
    await collect(s);

    // Module off: the framework's canned chips answer the request instead.
    s = await open(profile, { preset: "empty" });
    try {
        const { page } = s;
        const t0 = await now(page);
        await ev(page, () => window.__textEntry.requestNote("Medici"));
        await frames(page, 5);
        // The framework's fallback: a row of canned chips; press "check".
        const geo = await ev(page, () => window.__textEntry.fallback());
        await press(page, geo.check, geo.normal);
        const log = await logSince(page, t0);
        const note = log.find((e) => e.message === "command" && e.data?.code === "note");
        check(
            "offCannedChips",
            geo.visible && !(await ev(page, () => window.__textEntry.open())) && note?.data?.params?.text === "check",
            {
                fallbackVisible: geo.visible,
                note: note?.data?.params?.text ?? null,
            },
        );
    } catch (e) {
        check("ranOff", false, { error: String(e).slice(0, 500) });
    }
    await collect(s);

    // Quest with its system keyboard: a pinch on the dictation key focuses the hidden input inside
    // the select event; what the system keyboard types is added to the field, not put in its place.
    if (profile === "quest3-hands") {
        s = await open(profile, { preset: "empty", on: "text-entry" }, { systemKeyboard: true });
        try {
            const { page } = s;
            const t0 = await now(page);
            await ev(page, () => window.__textEntry.requestNote("Medici"));
            await frames(page, 5);
            const panel = await ev(page, () => window.__textEntry.panel());
            const keys = await ev(page, () => window.__textEntry.keys());
            await poke(page, "right", keys.a.center, panel.normal);
            const dk = await ev(page, () => window.__textEntry.dictateKey());
            // Pinch with the hand's ray on the key, from well away from the panel.
            await ev(page, () => window.__sandbox.place("right", 0.2, 1.3, 0.05));
            await ev(page, (n) => window.__sandbox.aim("right", n), dk.name);
            await frames(page, 10);
            await ev(page, () => window.__sandbox.press("right", "pinch", true));
            await frames(page, 6);
            await ev(page, () => window.__sandbox.press("right", "pinch", false));
            await frames(page, 6);
            const focused = await ev(page, () => document.activeElement?.tagName ?? null);
            // The system keyboard types "dog" (each showing starts empty) and is dismissed.
            await ev(page, () => {
                const el = document.activeElement;
                el.value = "dog";
                el.dispatchEvent(new Event("input"));
                el.blur();
            });
            await frames(page, 3);
            await ev(page, () => new Promise((res) => setTimeout(res, 500)));
            const field = await ev(page, () => window.__textEntry.field());
            const log = await logSince(page, t0);
            const opened = log.find((e) => e.message === "text-entry.systemKeyboard.open");
            // A pinch that opened the keyboard must not also show the "pinch me" hint meant for pokes.
            const hint = log.some((e) => e.message === "text-entry.dictation.hint");
            check(
                "systemKeyboardAppends",
                dk.route === "system-keyboard" &&
                    opened?.data?.event === "select" &&
                    focused === "INPUT" &&
                    field === "a dog" &&
                    !hint,
                { route: dk.route, opened: opened?.data ?? null, focused, field, hint },
            );
        } catch (e) {
            check("ranSystemKeyboard", false, { error: String(e).slice(0, 500) });
        }
        await collect(s);
    }
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
    console.log(`${r.pass ? "PASS" : "FAIL"} ${profile}${failed.length ? `  failed: ${failed.join(", ")}` : ""}`);
}
await browser.close();
const report = { url: args.url, time: new Date().toISOString(), pass: results.every((r) => r.pass), results };
writeFileSync(join(args.out, "report.json"), JSON.stringify(report, null, 2));
console.log(
    `${results.filter((r) => r.pass).length} of ${results.length} profiles passed; report: ${join(args.out, "report.json")}`,
);
process.exit(report.pass ? 0 : 1);
