#!/usr/bin/env node
// Drives the real graphty app (the tier 1 workspace, from a production build) the way a study
// participant does: one live browser per session, a step at a time, a numbered PNG after each.
//
//   node real.mjs --start <session dir> [empty | setup:<setup file>] [--sr]
//       opens the app with clean storage in a browser held for the whole session, runs the setup
//       steps (never shown to the participant), saves 01.png and writes session.json (the commit
//       under study, the URL). A setup file holds one step per line, "--click Open the ... sample";
//       a blank line or one starting with # is skipped. A setup step that misses fails the start.
//       --sr (screen-reader mode): after every step, prints what a screen reader would say: the
//       focused element's role, accessible name, value and states ("focus: ..."), and the text of
//       every live region that appeared or changed ("live: ..."). A focused control that points at a
//       highlighted option (aria-activedescendant) is reported with that option, as a screen reader
//       reads it. A region that arrived with its text already in it is marked unconfirmed: many
//       screen readers read only a change to a region already on the page (role=alert excepted).
//   node real.mjs --step <session dir> <steps...>
//       acts on the live session, waits for the drawing to settle, saves the next NN.png and prints
//       what a participant would notice
//   node real.mjs --end <session dir>
//       closes the browser and frees its browser slot
//   node real.mjs --prove
//       a self-test against the real app; exit 1 on any miss
//
// Steps (the same as the mock study tool's, plus pointing, dragging and files):
//   --click | --rclick | --dblclick | --shift-click | --ctrl-click | --alt-click | --hover "<name>"
//       <name> is what a control says, its accessible name or its label; "<name>#2" takes the second
//       of that name, "role=<role>:<name>" only that role. Exact names before partial ones. A name no
//       control has falls back to a node whose label is drawn on the canvas, clicked at its center.
//   --click-at | --rclick-at | --dblclick-at | --hover-at x,y
//       a point on the last screenshot (CSS pixels of the 1440 x 900 window); prints what is there
//   --hover-icon <n>       hovers the nth icon-only control (aria-label, no text), prints its tooltip
//   --drag x1,y1 x2,y2     presses at the first point, moves to the second, releases
//   --wheel x,y,delta      turns the mouse wheel at a point (negative delta zooms in)
//   --key <Key>            a key or chord: Enter, Escape, Control+o, ...
//   --type "<text>"        types into what has focus, a key at a time; nothing focused fails
//   --upload <file>        answers the open file chooser (or the next one, for 3 s), the app's
//                          project-file picker included
//   --reopen               closes the tab and opens the app again in a new one, same browser storage
//   --drop <file>          drops a file on the middle of the window
//   --wait <ms>            lets the app run on its own for a moment
//   --read                 reads the open dialog, or else the region around focus, as a screen
//                          reader's browse mode would: text, headings and controls in order
//   --expect | --expect-not "<text>"  (role=<role>, role=<role>:<name>, selected=N)
// A file is a path, or a bare name from files/ beside this tool.
//
// Headless Chromium cancels the File System Access pickers at once, so the tool answers them: the
// save picker with its suggested name, in the browser's private file system (a real handle, kept in
// IndexedDB as Chromium keeps it), each save copied to <session dir>/saved/; the open picker with
// the next --upload. While a dialog with aria-modal is open, names resolve only inside it (and in
// the lists it opens). After every step, captures of the canvas half a second apart must stop
// changing, or the step prints "the drawing is still moving".
//
// Every browser runs inside one of the shared browser slots (with-browser.sh beside this file), and
// a session holds its slot until --end. The app is served from graphty/dist on a loopback port of
// the session's own, so nothing outside this machine is involved.
process.env.FC_FONTATIONS = "1"; // headless Chromium crashes on startup on this host without it

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, openSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { connect, createServer as netServer } from "node:net";
import { basename, dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

import {
    axeViolations,
    focusOnPage,
    openWork,
    plant,
    sameNames,
    unplant,
    wordsOnScreen,
    workGone,
} from "./measure.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../..");
// REAL_DIST serves a copy of a build instead, one a rebuild cannot replace mid-session
const dist = process.env.REAL_DIST ? resolve(process.env.REAL_DIST) : join(repo, "graphty/dist");
const files = join(here, "files");
const tier2 = join(here, "../tier2");
const setups = join(here, "../rounds/tier-2/setups");
const gate = join(here, "with-browser.sh");
// The tier 1 workspace is reached with ?next until the Switch-over makes it the default (graphty/src/App.tsx)
const TIER1 = "/?next";
// REAL_VIEWPORT=<w>x<h> sets the window for a screenshot audit at other sizes; studies keep 1440 x 900
const [vw, vh] = (process.env.REAL_VIEWPORT || "1440x900").split("x").map(Number);
const VIEWPORT = { width: vw, height: vh };
// A session nobody steps for this long is closed, so one whose agent was stopped before --end frees
// its browser slot soon (two stopped agents held slots for 45 minutes in round 1, 2026-10-06).
// REAL_IDLE_SECONDS overrides it (the --prove check uses a few seconds).
const IDLE_MS = (Number(process.env.REAL_IDLE_SECONDS) || 15 * 60) * 1000;

// a fixed folder, not TMPDIR, so every agent finds the same session from the same session dir
const sockOf = (dir) =>
    join("/tmp", `graphty-real-${createHash("sha1").update(resolve(dir)).digest("hex").slice(0, 12)}.sock`);
const fileArg = (f) => (existsSync(resolve(f)) ? resolve(f) : join(files, f));

// ---------- the participant's side of the study: briefing, follow-up, clean folder ----------
// A session folder rounds/round-N/sessions/<id>/ has its task, half, persona and start in the
// round's plan.md table ("| r1-s04 | T20 | B: hiking trails ... | Jordan (analyst) | `empty` |").
// An explicit --task T17A (with --persona <name> for --brief) stands in for a folder with no plan.
function sessionTask(dir, task, persona) {
    let start = null;
    if (!task) {
        const plan = join(dirname(dirname(resolve(dir))), "plan.md");
        const row =
            existsSync(plan) &&
            readFileSync(plan, "utf8")
                .split("\n")
                .map((l) => l.split("|").map((c) => c.trim()))
                .find((c) => c[1] === basename(resolve(dir)));
        if (!row) return null;
        task = row[2] + (row[3].match(/^([AB]):/)?.[1] ?? "");
        persona ??= row[4];
        start = row[5]?.replaceAll("`", "") || null;
    }
    const m = task.match(/^(T\d+R?)([AB])$/);
    return m && { task: m[1], half: m[2], persona: persona?.split(/[\s(]/)[0] ?? null, start };
}
const tasksText = () => readFileSync(join(tier2, "tasks.md"), "utf8");
const sectionOf = (text, head) => {
    const at = text.search(new RegExp(`^### ${head}\\.`, "m"));
    if (at < 0) return null;
    const rest = text.slice(at + 4);
    const end = rest.search(/^#{2,3} /m);
    return end < 0 ? rest : rest.slice(0, end);
};
const oneLine = (t) => t.replace(/\s+/g, " ").trim();
// The half's prompt and its follow-up (T17 and T18 have one), word for word from tasks.md
function taskWords(t) {
    const sec = sectionOf(tasksText(), t.task);
    if (!sec) return null;
    const prompt = sec.match(new RegExp(`^- \\*\\*Prompt ${t.half}\\b[^*]*\\*\\* "([\\s\\S]*?)"\\s*$`, "m"))?.[1];
    const fu = sec.match(/^- \*\*Follow-up[\s\S]*?(?=^- \*\*|$(?![\s\S]))/m)?.[0];
    const followUp = fu?.match(new RegExp(`^\\s+- ${t.half}: "([\\s\\S]*?)"`, "m"))?.[1];
    return { prompt: prompt && oneLine(prompt), followUp: followUp && oneLine(followUp) };
}
// Files nobody playing a participant may see. In round 1 a participant agent, sent to tasks.md to
// find its prompt, read the task's avoided words and the persona's facilitator notes (r1-s03).
const FACILITATOR_NAMES = /^(answers|tasks|criteria|roster|plan|scores|insights|decisions|grade)\.md$/;
const FACILITATOR_WORDS =
    /Words avoided|Words kept on purpose|Facilitator notes|success path|Success definitions|answer key/i;
function facilitatorFiles(dir) {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { recursive: true })
        .map(String)
        .filter((f) => {
            if (FACILITATOR_NAMES.test(basename(f))) return true;
            if (!/\.(md|txt|json|ya?ml)$/.test(f)) return false;
            const p = join(dir, f);
            return statSync(p).isFile() && FACILITATOR_WORDS.test(readFileSync(p, "utf8"));
        });
}
// Persona sections written for the study team, never for the agent playing the persona
const TEAM_ONLY = /facilitator|study team|for the real study/i;
function personaText(text) {
    return text
        .split(/^(?=## )/m)
        .filter((s) => !TEAM_ONLY.test(s.split("\n")[0]))
        .join("")
        .trim();
}
// --brief: writes <dir>/briefing.md, everything a participant gets (tasks.md, "Rules for whoever runs
// a session"): the persona files and the history under their name, the prompt word for word, the
// start command and the tool's participant instructions. Never the follow-up, the avoided words,
// the success path or another persona.
async function brief(dir, task, persona) {
    const t = sessionTask(dir, task, persona);
    if (!t)
        return `--brief: no task for ${dir} (no row for it in the round's plan.md; pass --task T17A --persona <name>)`;
    const words = taskWords(t);
    if (!words?.prompt) return `--brief: tasks.md has no Prompt ${t.half} for ${t.task}`;
    const roster = readFileSync(join(tier2, "roster.md"), "utf8");
    const hist = t.persona && sectionOf(roster.replace(/^### (\S+) -- /gm, "### $1. "), t.persona);
    if (!hist) return `--brief: roster.md has no history for "${t.persona}"`;
    const S = resolve(repo, roster.match(/`S\/` = `([^`]+)`/)[1]);
    const P = roster.match(/`P\/` =\s*`([^`]+)`/)[1];
    const fileLine = hist.match(/^Files: (.*)$/m)?.[1] ?? "";
    const personas = [...fileLine.matchAll(/`([SP])\/([^`]+\.md)`/g)].map(([, k, f]) => join(k === "S" ? S : P, f));
    const history = hist
        .replace(/^.*\n/, "")
        .replace(/^Files: .*\n/m, "")
        .trim();
    const readme = readFileSync(join(here, "README.md"), "utf8");
    const part = (h) => readme.match(new RegExp(`^## ${h}\\n[\\s\\S]*?(?=^## )`, "m"))?.[0].trim() ?? "";
    const distLine = readFileSync(join(tier2, "criteria.md"), "utf8").match(/served from `([^`]+)`/)?.[1];
    // the start: the plan's, or else the task's half in the roster's "Where each session starts"
    const cell = roster.match(new RegExp(`^\\| ${t.task} +\\|([^|]*)\\|([^|]*)\\|`, "m"))?.[t.half === "A" ? 1 : 2];
    const fromRoster = cell && (/empty/.test(cell) ? "empty" : `setup:${cell.replaceAll("`", "").trim()}`);
    const start = t.start ?? fromRoster ?? "<the start you were given>";
    const doc = [
        `# Your session`,
        ``,
        `You are taking part in a study of a program, as the person described below. This file is everything you get: do not open any other file of this project (no source code, no other notes, tasks or answers).`,
        ``,
        `## Who you are`,
        ``,
        ...personas.map((p) => personaText(readFileSync(p, "utf8")) + "\n"),
        `## Your earlier sessions with this program`,
        ``,
        history,
        ``,
        `## What you are asked to do`,
        ``,
        `"${words.prompt}"`,
        ``,
        `## How you use the program`,
        ``,
        "Start with this command, then take one step at a time and look at each new screenshot before the next:",
        "",
        "```bash",
        `REAL_DIST=${distLine ?? "<the study build>"} node ${join(here, "real.mjs")} --start ${resolve(dir)} ${start}`,
        "```",
        "",
        `Every later command takes the same REAL_DIST. When you are done, or would give up, run \`--end\`.`,
        ``,
        part("A session").replace(/^## /m, "### "),
        ``,
        part("Steps").replace(/^## /m, "### "),
        ``,
        part("Names, dialogs and lists").replace(/^## /m, "### "),
        ``,
    ].join("\n");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "briefing.md"), doc);
    const bad = facilitatorFiles(dir);
    return bad.length
        ? `--brief: the briefing still holds facilitator words (${bad.join(", ")}); fix the persona or task files`
        : null;
}

// ---------- steps: what each takes, checked before anything opens ----------
const CLICKS = {
    "--click": {},
    "--hover": {},
    "--rclick": { button: "right" },
    "--dblclick": {},
    "--shift-click": { modifiers: ["Shift"] },
    "--ctrl-click": { modifiers: ["Control"] },
    "--alt-click": { modifiers: ["Alt"] },
};
const AT = {
    "--click-at": {},
    "--rclick-at": { button: "right" },
    "--dblclick-at": { clickCount: 2 },
    "--hover-at": null,
};
const ARITY = {
    ...Object.fromEntries(
        [
            ...Object.keys(CLICKS),
            ...Object.keys(AT),
            "--hover-icon",
            "--key",
            "--type",
            "--wait",
            "--expect",
            "--expect-not",
            "--upload",
            "--drop",
            "--wheel",
        ].map((k) => [k, 1]),
    ),
    "--drag": 2,
    "--reopen": 0,
    "--read": 0,
};
const KEYS = new Set([
    "Shift",
    "Control",
    "Alt",
    "Meta",
    "ControlOrMeta",
    "Enter",
    "Tab",
    "Backspace",
    "Delete",
    "Escape",
    "Space",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
    "PageUp",
    "PageDown",
    "Insert",
    "ContextMenu",
    ...Array.from({ length: 12 }, (_, i) => "F" + (i + 1)),
]);
const keyOk = (v) =>
    v.split(/\+(?!$)/).every((k) => k.length === 1 || KEYS.has(k) || /^(Key[A-Z]|Digit\d|Numpad\d)$/.test(k));
const XY = /^\d+,\d+$/;
// Splits argv into [step, values] pairs; returns { steps } or { refused }
function parseSteps(list) {
    const steps = [];
    for (let i = 0; i < list.length;) {
        const a = list[i];
        const n = ARITY[a];
        if (n === undefined) return { refused: `unknown step "${a}"; steps: ${Object.keys(ARITY).join(", ")}` };
        const v = list.slice(i + 1, i + 1 + n);
        if (v.length < n || v.some((x) => x === undefined))
            return { refused: `${a} needs ${n === 1 ? "a value" : `${n} values`}` };
        if (a in AT && !XY.test(v[0])) return { refused: `${a} takes x,y in pixels, not "${v[0]}"` };
        if (a === "--drag" && !v.every((p) => XY.test(p)))
            return { refused: `--drag takes two points, x1,y1 x2,y2, not "${v.join(" ")}"` };
        if (a === "--wheel" && !/^\d+,\d+,-?\d+$/.test(v[0]))
            return { refused: `--wheel takes x,y,delta, not "${v[0]}"` };
        if (a === "--hover-icon" && !/^[1-9]\d*$/.test(v[0]))
            return { refused: `--hover-icon takes a number from 1, not "${v[0]}"` };
        if (a === "--wait" && !/^\d{1,5}$/.test(v[0])) return { refused: `--wait takes milliseconds, not "${v[0]}"` };
        if (a === "--key" && !keyOk(v[0]))
            return {
                refused: `--key takes a key name such as Enter, Escape, ArrowDown, F2, a, or a chord such as Control+f; not "${v[0]}"`,
            };
        if ((a === "--upload" || a === "--drop") && !existsSync(fileArg(v[0])))
            return { refused: `${a}: no file "${v[0]}" (a path, or a name in ${files})` };
        steps.push([a, ...v]);
        i += 1 + n;
    }
    return { steps };
}
// A setup file: one step per line, the flag then its value(s) unquoted
function parseSetup(text) {
    const list = [];
    for (const line of text.split("\n").map((l) => l.trim())) {
        if (!line || line.startsWith("#")) continue;
        const m = line.match(/^(--[a-z-]+)\s*(.*)$/);
        if (!m) return { refused: `setup line is not a step: "${line}"` };
        list.push(m[1], ...(ARITY[m[1]] === 0 ? [] : m[1] === "--drag" ? m[2].split(/\s+/) : [m[2]]));
    }
    return parseSteps(list);
}

// ---------- the client side: --start, --step, --end ----------
function ask(dir, req) {
    return new Promise((ok, fail) => {
        const s = connect(sockOf(dir));
        let buf = "";
        s.on("data", (d) => (buf += d));
        s.on("end", () => {
            try {
                ok(JSON.parse(buf));
            } catch {
                fail(new Error(`the session answered nothing readable: ${buf.slice(0, 200)}`));
            }
        });
        s.on("error", fail);
        s.end(JSON.stringify(req) + "\n");
    });
}
const say = (r) => {
    for (const l of r.out) console.log(l);
    return r.code;
};

async function start(dir, how, sr, task) {
    dir = resolve(dir);
    if (existsSync(sockOf(dir))) {
        const alive = await ask(dir, { op: "ping" }).catch(() => null);
        if (alive) {
            console.error(`a session is already running in ${dir}; end it with --end first`);
            return 2;
        }
        await rm(sockOf(dir), { force: true });
    }
    let setup = [];
    if (how && how !== "empty") {
        const m = how.match(/^setup:(.+)$/);
        if (!m) {
            console.error(`--start takes empty or setup:<file>, not "${how}"`);
            return 2;
        }
        // a setup file is looked up from the folder the command runs in, then the tier 2 folder
        // (tasks.md gives paths relative to it), then the setups folder itself
        const file = [process.cwd(), tier2, setups].map((d) => resolve(d, m[1])).find((f) => existsSync(f));
        if (!file) {
            console.error(`SETUP FAILED: no such setup file ${m[1]} (looked in ${process.cwd()}, ${tier2}, ${setups})`);
            return 2;
        }
        const p = parseSetup(await readFile(file, "utf8"));
        if (p.refused) {
            console.error(p.refused);
            return 2;
        }
        setup = p.steps;
    }
    await mkdir(dir, { recursive: true });
    if (readdirSync(dir).some((f) => /^\d+\.png$/.test(f))) {
        console.error(`${dir} already holds a session's screenshots; use a new folder`);
        return 2;
    }
    const bad = facilitatorFiles(dir);
    if (bad.length) {
        console.error(
            `${dir} holds facilitator files a participant must not see (${bad.join(", ")}); move them out first`,
        );
        return 2;
    }
    // T17 and T18 hold a follow-up prompt, given at --end (see "op end" in serve)
    const t = sessionTask(dir, task);
    const followUp = t ? taskWords(t)?.followUp : null;
    // the session process holds a browser slot for its whole life, so it runs inside the gate
    const log = openSync(join(dir, "session.log"), "a");
    const child = spawn(
        gate,
        [process.execPath, fileURLToPath(import.meta.url), "--serve", dir, ...(sr ? ["--sr"] : [])],
        {
            detached: true,
            stdio: ["ignore", log, log],
            env: { ...process.env, BROWSER_SLOTS: process.env.BROWSER_SLOTS || "4" },
        },
    );
    let exited = null;
    child.on("exit", (c) => (exited = c));
    let waited = 0;
    while (!existsSync(sockOf(dir))) {
        if (exited !== null) {
            console.error(`the session process stopped (exit ${exited}); see ${join(dir, "session.log")}`);
            return 1;
        }
        if (waited === 10) console.log("waiting for a free browser slot ...");
        await new Promise((r) => setTimeout(r, 500));
        waited++;
    }
    child.unref();
    const r = await ask(dir, { op: "start", setup, task: t && t.task + t.half, followUp });
    return say(r);
}

// ---------- the session process: one browser, one page, a socket ----------
const TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".wasm": "application/wasm",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".map": "application/json",
    ".gml": "text/plain",
    ".txt": "text/plain",
};
async function serve(dir, sr) {
    const { chromium } = await import(join(repo, "node_modules/playwright/index.mjs"));
    if (!existsSync(join(dist, "index.html")))
        throw new Error(`no production build at ${dist}; run pnpm exec nx run graphty:build`);
    // the app at / (so /samples/*.gml resolve); any path that is not a file is the app's page
    const http = createServer(async (req, res) => {
        const f = join(
            dist,
            normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, ""),
        );
        let body,
            type = TYPES[extname(f)] ?? "application/octet-stream";
        if (!f.startsWith(dist)) return res.writeHead(403).end();
        try {
            body = await readFile(f);
        } catch {
            if (extname(f)) return res.writeHead(404).end();
            // a rebuild in progress removes the page for a moment; that must not kill the session
            body = await readFile(join(dist, "index.html")).catch(() => null);
            if (!body) return res.writeHead(503).end();
            type = "text/html";
        }
        res.writeHead(200, { "content-type": type }).end(body);
    });
    await new Promise((ok) => http.listen(0, "127.0.0.1", ok));
    const origin = `http://127.0.0.1:${http.address().port}`;
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    const s = {
        dir,
        sr,
        context,
        origin,
        errors: [],
        downloads: [],
        chooser: null,
        picker: null,
        picked: [],
        saved: {},
    };
    await answerPickers(s);
    // every session records live regions: a notice that times out while a slow step settles is
    // still reported (goneNotices), as a person would have seen it
    await s.context.addInitScript(watchLive);
    await newTab(s);

    const sock = sockOf(dir);
    let queue = Promise.resolve();
    let idle;
    const close = async () => {
        clearTimeout(idle);
        await browser.close().catch(() => {});
        http.close();
        server.close();
        await rm(sock, { force: true });
        process.exit(0);
    };
    const touch = () => {
        clearTimeout(idle);
        idle = setTimeout(() => {
            console.log(`no step for ${IDLE_MS / 1000} seconds; closing the session`);
            close();
        }, IDLE_MS);
    };
    const server = netServer({ allowHalfOpen: true }, (c) => {
        // a client that went away before its answer (its agent was stopped) must not kill the session
        c.on("error", (e) => console.log(`a client left before its answer: ${e.code || e.message}`));
        let buf = "";
        c.on("data", (d) => {
            buf += d;
            if (!buf.includes("\n")) return;
            const req = JSON.parse(buf.slice(0, buf.indexOf("\n")));
            // idle time counts from the end of the last request, never during a long one
            clearTimeout(idle);
            // one request at a time, in the order they came
            queue = queue.then(async () => {
                let r;
                try {
                    if (req.op === "ping") r = { out: [], code: 0 };
                    else if (req.op === "start") {
                        [s.task, s.followUp] = [req.task, req.followUp];
                        r = await opStart(s, req.setup);
                    } else if (req.op === "step") r = await opStep(s, req.steps);
                    else if (req.op === "plant-spin") r = await plantSpin(s, req.on);
                    else if (req.op === "plant-live") r = await plantLive(s);
                    else if (req.op === "plant-ticker") r = await plantTicker(s);
                    else if (req.op === "hovered") r = await hovered(s);
                    else if (req.op === "measure") r = await measure(s, req.plant);
                    else if (req.op === "work") r = { out: [], code: 0, data: await s.page.evaluate(openWork) };
                    else if (req.op === "plant-removal") r = await plantRemoval(s);
                    else if (req.op === "end" && s.followUp && !s.followUpGiven) r = await giveFollowUp(s);
                    else if (req.op === "end") r = await opEnd(s);
                    else r = { out: [`unknown request ${req.op}`], code: 2 };
                } catch (e) {
                    r = { out: [`the tool failed: ${e.stack || e.message}`], code: 1 };
                }
                c.end(JSON.stringify(r) + "\n");
                if (r.end) setTimeout(close, 50);
                else touch();
            });
        });
    });
    await rm(sock, { force: true });
    await new Promise((ok) => server.listen(sock, ok));
    touch();
    for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(sig, close);
}

// A tab of the session's browser: its errors, file choosers and downloads reported to the session
async function newTab(s) {
    const page = (s.page = await s.context.newPage());
    s.cdp = null;
    const { origin } = s;
    page.on("pageerror", (e) => s.errors.push(`script error: ${e.message.split("\n")[0]}`));
    page.on("console", (m) => m.type() === "error" && s.errors.push(`console error: ${m.text().slice(0, 300)}`));
    page.on(
        "response",
        (r) => r.status() >= 400 && s.errors.push(`failed request: ${r.status()} ${r.url().replace(origin, "")}`),
    );
    page.on("requestfailed", (r) =>
        s.errors.push(`failed request: ${r.url().replace(origin, "")} (${r.failure()?.errorText})`),
    );
    page.on("filechooser", (c) => {
        s.chooser = c;
    });
    page.on("download", (d) => s.downloads.push(saveDownload(s, d)));
    return page;
}

// The app's project files go through showSaveFilePicker / showOpenFilePicker, which headless
// Chromium cancels at once. These stand-ins answer them in the origin's private file system, so the
// handles are real ones: writable, storable in IndexedDB, readable again after the tab is reopened.
async function answerPickers(s) {
    await s.context.exposeBinding("__studioPicker", (_src, req) => {
        if (req.kind === "save") {
            s.picked.push(`the save picker chose ${req.name}`);
            return null;
        }
        // an open picker waits for --upload, as a file chooser does
        return new Promise((answer) => (s.picker = { answer }));
    });
    await s.context.addInitScript(() => {
        const root = () => navigator.storage.getDirectory();
        window.showSaveFilePicker = async (o = {}) => {
            const name = o.suggestedName || "untitled";
            await window.__studioPicker({ kind: "save", name });
            return (await root()).getFileHandle(name, { create: true });
        };
        window.showOpenFilePicker = async () => {
            const f = await window.__studioPicker({ kind: "open" });
            if (!f) throw new DOMException("The user aborted a request.", "AbortError");
            const h = await (await root()).getFileHandle(f.name, { create: true });
            const w = await h.createWritable();
            await w.write(Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0)));
            await w.close();
            return [h];
        };
    });
}
// ---------- screen-reader mode (--sr) ----------
// In the page: records the text of every live region when it appears or changes, in window.__srLive.
// ponytail: light DOM only; graphty-element's shadow root has no live region today
function watchLive() {
    const LIVE = "[aria-live]:not([aria-live=off]), [role=status], [role=alert], [role=log]";
    const last = new WeakMap();
    window.__srLive = [];
    const scan = () => {
        for (const r of document.querySelectorAll(LIVE)) {
            // a region inside another is read as part of it; a hidden one is not read at all
            if (r.parentElement?.closest(LIVE) || r.closest("[aria-hidden=true]") || !r.checkVisibility()) continue;
            const text = r.textContent.replace(/\s+/g, " ").trim();
            if (last.get(r) === text) continue;
            // a region first seen with its text already in it was never changed while on the page
            const arrivedFilled = !last.has(r);
            last.set(r, text);
            const role = r.getAttribute("role");
            const level = r.getAttribute("aria-live") || (role === "alert" ? "assertive" : "polite");
            if (text)
                window.__srLive.push(
                    `${role || "region"} (${level}): ${JSON.stringify(text)}${
                        arrivedFilled && role !== "alert"
                            ? " -- unconfirmed: the region arrived with this text already in it, which many screen readers do not read"
                            : ""
                    }`,
                );
        }
    };
    new MutationObserver(scan).observe(document, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
    });
}
const SR_STATES = new Set(["checked", "pressed", "expanded", "selected", "disabled", "invalid", "required"]);
// What a screen reader says for the focused element (through shadow roots), from Chromium's own
// accessibility tree, and the live-region text recorded since the last call
const FOCUSED =
    "(() => { let e = document.activeElement; while (e?.shadowRoot?.activeElement) e = e.shadowRoot.activeElement; return e === document.body ? null : e; })()";
// role "name" value "..." states, for one accessibility node. A range's value is its valuetext
// when it has one, as a screen reader speaks it: Chromium keeps a range's number as a 32-bit
// float, so the bare value of aria-valuenow="0.85" comes back as 0.8500000238418579.
function axSays(n) {
    const states = (n.properties || [])
        .filter((p) => SR_STATES.has(p.name) && p.value.value !== false && p.value.value !== "false")
        .map((p) => (p.value.value === true || p.value.value === "true" ? p.name : `${p.name}=${p.value.value}`));
    const valuetext = (n.properties || []).find((p) => p.name === "valuetext")?.value.value;
    const value = valuetext || n.value?.value;
    return [
        n.role?.value || "unknown role",
        n.name?.value ? JSON.stringify(n.name.value) : "(no name)",
        value !== undefined && value !== "" ? `value ${JSON.stringify(String(value))}` : "",
        states.join(", "),
    ]
        .filter(Boolean)
        .join(" ");
}
// A table row has no name of its own; its cells carry what it says, so it reads as their text
function rowSays(n, byId) {
    const textOf = (c) =>
        c.role?.value === "StaticText"
            ? c.name?.value || ""
            : (c.childIds || [])
                  .map((id) => byId.get(id))
                  .filter((x) => x && !x.ignored)
                  .map(textOf)
                  .join(" ");
    const cells = (n.childIds || [])
        .map((id) => byId.get(id))
        .filter((c) => c && !c.ignored)
        .map((c) => textOf(c).replace(/\s+/g, " ").trim())
        .filter(Boolean);
    return cells.length ? `row ${cells.map((t) => JSON.stringify(t)).join(" | ")}` : axSays(n);
}
async function axOf(s, objectId) {
    const { nodes } = await s.cdp.send("Accessibility.getPartialAXTree", { objectId, fetchRelatives: false });
    return nodes[0];
}
const evalObject = async (s, expression) => (await s.cdp.send("Runtime.evaluate", { expression })).result.objectId;
async function srReport(s, out) {
    s.cdp ??= await s.context.newCDPSession(s.page);
    let said = "nothing (the page itself)";
    const focused = await evalObject(s, FOCUSED);
    if (focused) {
        const n = await axOf(s, focused);
        said = !n || n.ignored ? "an element screen readers skip (no role in the accessibility tree)" : axSays(n);
        // a combobox, listbox or grid keeps focus and points at the highlighted item: a screen
        // reader reads that item, so the tool does too
        const active = await evalObject(
            s,
            `(() => { const e = ${FOCUSED}; const id = e?.getAttribute("aria-activedescendant"); return id ? e.getRootNode().getElementById(id) : null; })()`,
        );
        if (active) {
            const a = await axOf(s, active);
            said += `; highlighted: ${!a || a.ignored ? "an element screen readers skip" : axSays(a)}`;
        }
    }
    out.push(`focus: ${said}`);
    await srLive(s, out);
}
// What browse mode reads in the open dialog, or else in the region, landmark or form around focus:
// text a line at a time, headings and controls as role "name", in document order
async function srRead(s, out) {
    // read as one item, not walked into (ROLES: every control a click can name)
    const items = new Set([...ROLES, "heading", "img", "image", "slider", "spinbutton", "progressbar", "meter", "row"]);
    s.cdp ??= await s.context.newCDPSession(s.page);
    const where = await evalObject(
        s,
        `(() => {
            const modal = [...document.querySelectorAll("[aria-modal=true], dialog[open]")].filter((m) => m.checkVisibility()).pop();
            if (modal) return modal;
            const e = ${FOCUSED};
            return e?.closest("[role=dialog], [role=alertdialog], [role=region], [role=main], [role=navigation], [role=complementary], [role=banner], [role=contentinfo], [role=search], [role=form], main, nav, aside, header, footer, form, section[aria-label], section[aria-labelledby]") || document.body;
        })()`,
    );
    const { node } = await s.cdp.send("DOM.describeNode", { objectId: where });
    const { nodes } = await s.cdp.send("Accessibility.getFullAXTree");
    const byId = new Map(nodes.map((n) => [n.nodeId, n]));
    const root = nodes.find((n) => n.backendDOMNodeId === node.backendNodeId);
    if (!root) return out.push("read: nothing (the region is not in the accessibility tree)");
    const lines = [];
    let text = [];
    const flush = () => {
        const t = text.join(" ").replace(/\s+/g, " ").trim();
        if (t) lines.push(t);
        text = [];
    };
    const walk = (n, top) => {
        const role = n.role?.value;
        if (!n.ignored && role === "StaticText") text.push(n.name?.value || "");
        else if (!n.ignored && !top && items.has(role)) {
            flush();
            const level = (n.properties || []).find((p) => p.name === "level")?.value.value;
            lines.push(
                role === "heading" && level
                    ? axSays(n).replace(/^heading/, `heading level ${level}`)
                    : role === "row" && !n.name?.value
                      ? rowSays(n, byId)
                      : axSays(n),
            );
            return;
        } else if (role === "InlineTextBox") return;
        for (const id of n.childIds || []) {
            const c = byId.get(id);
            if (c) walk(c, false);
        }
    };
    if (!root.ignored) lines.push(`${axSays(root)}:`);
    walk(root, true);
    flush();
    const MAX = 80;
    for (const l of lines.slice(0, MAX)) out.push(`read: ${l}`);
    if (lines.length > MAX) out.push(`read: ... and ${lines.length - MAX} more lines`);
}
// A notice shown during the step and gone before its screenshot (the app takes a notice down after
// 6 s, and a step can take longer to settle): a person watching would have read it
async function goneNotices(s, out) {
    const gone = await s.page
        .evaluate(() => {
            const shown = [...document.querySelectorAll("[role=alert]")]
                .filter((r) => r.checkVisibility())
                .map((r) => r.textContent.replace(/\s+/g, " ").trim());
            return (window.__srLive || [])
                .splice(0)
                .map((l) => /^alert \(\w+\): (".*")$/.exec(l))
                .filter(Boolean)
                .map((m) => JSON.parse(m[1]))
                .filter((t) => !shown.includes(t));
        })
        .catch(() => []);
    for (const t of gone) out.push(`a notice showed and went before this screenshot: "${t}"`);
}
async function srLive(s, out) {
    const live = await s.page.evaluate(() => (window.__srLive || []).splice(0)).catch(() => []);
    for (const l of live) out.push(`live: ${l}`);
}

// Copies every file the app wrote through a save picker into <session dir>/saved/ and says so
async function copySaves(s, out) {
    const now = await s.page
        .evaluate(async () => {
            const got = [];
            for await (const [name, h] of await navigator.storage.getDirectory())
                if (h.kind === "file") got.push([name, await (await h.getFile()).text()]);
            return got;
        })
        .catch(() => []);
    for (const [name, text] of now) {
        if (s.saved[name] === text) continue;
        s.saved[name] = text;
        const path = join(s.dir, "saved", name);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, text);
        out.push(
            `a project file was written: ${name}, ${Buffer.byteLength(text).toLocaleString("en-US")} bytes (${path})`,
        );
    }
}

async function saveDownload(s, d) {
    const dir = join(s.dir, "downloads");
    await mkdir(dir, { recursive: true });
    let name = d.suggestedFilename() || "download";
    for (let k = 2; existsSync(join(dir, name)); k++) name = d.suggestedFilename().replace(/(\.[^.]*)?$/, ` (${k})$1`);
    const path = join(dir, name);
    await d.saveAs(path);
    const buf = readFileSync(path);
    // a PNG's size is in its header; anything else is described by its length
    const what =
        buf.length > 24 && buf.toString("ascii", 1, 4) === "PNG"
            ? `${buf.readUInt32BE(16)} x ${buf.readUInt32BE(20)}`
            : `${buf.length.toLocaleString("en-US")} bytes`;
    return `a file was saved: ${name}, ${what} (${path})`;
}

// The commit under study is the served build's own (its stamp, or a frozen copy's folder name such as
// tier2-r1d2-909b19b57), not this checkout's HEAD, which is only the tool's (`toolSha`).
const commitOf = () => {
    const git = (...a) => spawnSync("git", ["-C", repo, ...a], { encoding: "utf8" }).stdout.trim();
    const toolSha = git("rev-parse", "HEAD");
    const dirty = git("status", "--porcelain", "--", "graphty", "graphty-element") !== "";
    let stamp = null;
    try {
        stamp = readFileSync(join(dist, "index.html"), "utf8").match(/<meta name="graphty-build" content="([^"]*)"/)[1];
    } catch {
        // no stamp, or a rebuild in progress removed the page for a moment: unknown, not fatal
    }
    const short = (stamp ?? "").match(/^[0-9a-f]{7,40}\b/)?.[0] ?? basename(dist).match(/-([0-9a-f]{7,40})$/)?.[1];
    const sha = short ? git("rev-parse", "--verify", "--quiet", `${short}^{commit}`) || short : null;
    return { sha, toolSha, dirty, build: stamp };
};

// Opens the app in the session's tab and waits for its window
async function opening(s, out) {
    await s.page
        .goto(s.origin + TIER1, { waitUntil: "networkidle", timeout: 60000 })
        .catch(() => out.push("the app did not finish loading in 60 s"));
    await s.page
        .waitForFunction(
            () => document.querySelector("#root")?.children.length > 0 && document.querySelector("main, [role=main]"),
            null,
            { timeout: 30000 },
        )
        .catch(() => out.push("the app never drew its window"));
}
async function opStart(s, setup) {
    const out = [];
    await opening(s, out);
    await settle(s, out);
    const commit = commitOf();
    await writeFile(
        join(s.dir, "session.json"),
        JSON.stringify(
            {
                commit: commit.sha,
                toolCommit: commit.toolSha,
                uncommittedChanges: commit.dirty,
                buildStamp: commit.build,
                url: TIER1,
                screenReaderMode: !!s.sr,
                viewport: VIEWPORT,
                started: new Date().toISOString(),
                setup: setup.map((x) => x.join(" ")),
                task: s.task ?? null,
                // the follow-up's words stay out of the participant's folder; only whether it was given
                followUp: s.followUp ? "held until --end" : "none",
            },
            null,
            1,
        ) + "\n",
    );
    let code = 0;
    if (setup.length) {
        // run before 01.png and never shown to the participant: its lines go to setup.log only,
        // and anything that does not work fails the start loudly
        const said = [];
        const r = await run(s, setup, said);
        // a reopened project has nothing focused: the last setup step's control must not wear a focus ring
        await s.page.evaluate(`${FOCUSED}?.blur()`);
        // nor a hover: the setup's last click left the pointer on a control (a row stays lit in 01.png)
        await s.page.mouse.move(-1, -1);
        await writeFile(join(s.dir, "setup.log"), said.join("\n") + "\n");
        if (r.code || r.missed) {
            out.push(`SETUP FAILED: a setup step did not work (setup.log):`, ...said.map((l) => "  " + l));
            code = 1;
        }
    }
    // bar 2: the open work the participant arrives to, compared with the end's at --end
    await writeFile(
        join(s.dir, "work-start.json"),
        JSON.stringify(await s.page.evaluate(openWork).catch((e) => ({ error: e.message.split("\n")[0] })), null, 1) +
            "\n",
    );
    s.errors.length = 0; // what loading and setup printed is in session.log, not the participant's view
    if (s.sr) await srReport(s, out);
    out.push(
        `commit ${commit.sha ?? "unknown"}, build ${commit.build}; tool checkout ${commit.toolSha}${commit.dirty ? " (with uncommitted changes)" : ""}`,
    );
    out.push(await shot(s));
    return { out, code };
}

// The first --end of a T17 or T18 session does not end it: it hands the participant the follow-up,
// word for word, and the session carries on. In round 1 two sessions that left the follow-up to the
// participant's own reading of tasks.md never got it (r1-s22, r1-s23). A second --end ends.
async function giveFollowUp(s) {
    s.followUpGiven = true;
    const f = join(s.dir, "session.json");
    const rec = JSON.parse(await readFile(f, "utf8"));
    await writeFile(f, JSON.stringify({ ...rec, followUp: `given ${new Date().toISOString()}` }, null, 1) + "\n");
    return {
        out: [
            "The session is still open. If you finished what you were asked, here is the next request, word for word:",
            `  "${s.followUp}"`,
            "Carry on in this same session, then run --end again. If you gave up instead, run --end again now.",
        ],
        code: 3,
    };
}

// Bar 2: the open work at the end beside the start's, and what is gone, in work.json for the graders
// (whether each loss was the participant's own choice is theirs to judge); never shown to the participant
async function opEnd(s) {
    let end = null;
    try {
        end = await s.page.evaluate(openWork);
    } catch (e) {
        end = { error: e.message.split("\n")[0] };
    }
    const start = JSON.parse(await readFile(join(s.dir, "work-start.json"), "utf8").catch(() => "null"));
    await writeFile(
        join(s.dir, "work.json"),
        JSON.stringify({ start, end, gone: workGone(start, end) }, null, 1) + "\n",
    );
    return { out: [`session ended: ${s.dir}`], code: 0, end: true };
}
// What the studio's bars read on the page as it is now (bars.mjs): axe, controls sharing a name,
// focus fallen to the page, the app's words on screen. A plant ("img", "twins", "blur") puts a
// known failure on the page first and takes it away after, to prove each check can fail.
async function measure(s, planted) {
    const { page } = s;
    s.cdp ??= await s.context.newCDPSession(page);
    if (planted) await page.evaluate(plant, planted);
    try {
        return {
            out: [],
            code: 0,
            data: {
                focusOnPage: await page.evaluate(focusOnPage),
                axe: await axeViolations(page),
                names: await sameNames(s.cdp),
                words: await page.evaluate(wordsOnScreen),
            },
        };
    } finally {
        if (planted) await page.evaluate(unplant);
    }
}
// --prove only: clears the graph through the element, as a lost table would go; says the source's name
async function plantRemoval(s) {
    const [name] = (await s.page.evaluate(openWork)).sources;
    await s.page.evaluate(() => document.querySelector("graphty-element").session.data.clear());
    return { out: [name], code: 0 };
}
// --prove only: holds the orbit camera's yaw key on the focused canvas (or lets it go), a real spin
async function plantSpin(s, on) {
    if (on) {
        await s.page.evaluate(() => {
            const el = document.querySelector("graphty-element");
            (el?.querySelector("canvas") || el?.shadowRoot?.querySelector("canvas"))?.focus();
        });
        await s.page.keyboard.down("a");
    } else await s.page.keyboard.up("a");
    return { out: [], code: 0 };
}

// --prove only: a counter that changes every 100 ms, beside the focused box (in an open popover over
// the canvas), standing in for a caret or a suggestion list that keeps repainting over a still drawing
async function plantTicker(s) {
    await s.page.evaluate(() => {
        const t = document.createElement("span");
        let n = 0;
        setInterval(() => (t.textContent = `planted ${n++}`), 100);
        document.activeElement.parentElement.append(t);
    });
    return { out: [], code: 0 };
}

// --prove only: the innermost element under the pointer, as CSS :hover sees it ("" when none)
async function hovered(s) {
    const at = await s.page.evaluate(() => {
        const all = [...document.querySelectorAll(":hover")];
        const el = all[all.length - 1];
        return el && el !== document.documentElement && el !== document.body ? el.outerHTML.slice(0, 120) : "";
    });
    return { out: [at], code: 0 };
}

// --prove only: a status region added with its text already in it, and one added empty and then filled
async function plantLive(s) {
    await s.page.evaluate(() => {
        const region = (text) => {
            const r = document.createElement("div");
            r.setAttribute("role", "status");
            r.textContent = text;
            document.body.append(r);
            return r;
        };
        region("Planted already filled");
        const later = region("");
        setTimeout(() => (later.textContent = "Planted change"), 100);
    });
    return { out: [], code: 0 };
}

// In screen-reader mode the participant has no pointer: these steps are refused before anything runs
const POINTER = new Set([...Object.keys(CLICKS), ...Object.keys(AT), "--hover-icon", "--drag", "--wheel", "--drop"]);

async function opStep(s, steps) {
    const pointer = s.sr && steps.find(([a]) => POINTER.has(a));
    if (pointer) return { out: [`${pointer[0]} is refused in screen-reader mode: use --key and --type`], code: 2 };
    const out = [];
    const r = await run(s, steps, out);
    out.push(await shot(s));
    return { out, code: r.code };
}

// The screenshot is always saved for graders; a screen-reader participant is not told where
async function shot(s) {
    const n = readdirSync(s.dir).filter((f) => /^\d+\.png$/.test(f)).length + 1;
    const file = join(s.dir, `${String(n).padStart(2, "0")}.png`);
    await s.page.screenshot({ path: file });
    return s.sr ? "(a screenshot was kept for the graders)" : file;
}

// The DOM stops changing, then the drawing settles: graphty-element's waitForStableFrame
async function settle(s, out, ms = 15000) {
    const { page } = s;
    let last = -1;
    for (let i = 0; i < 30; i++) {
        const n = await page.evaluate(() => document.body.innerHTML.length).catch(() => -1);
        if (n === last) break;
        last = n;
        await page.waitForTimeout(100);
    }
    const moving = await page
        .evaluate(async (ms) => {
            const el = document.querySelector("graphty-element");
            if (!el || typeof el.waitForStableFrame !== "function") return null;
            try {
                await el.waitForStableFrame({ timeoutMs: ms });
                return null;
            } catch (e) {
                return String(e.message || e);
            }
        }, ms)
        .catch(() => null);
    if (moving) out.push(`the drawing is still moving (${moving.split("\n")[0].slice(0, 160)})`);
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    // waitForStableFrame watches the layout, not the camera: captures of the canvas's area half a
    // second apart catch a turning or drifting drawing it lets through
    if (!moving && (await canvasMoves(page)))
        out.push("the drawing is still moving (the canvas kept changing for a second with no input)");
}
// Only a plain capture of the window: hiding the rest with a style would blur the canvas, which
// lets go of a held camera key and so stops the very spin this looks for. So the captures include
// whatever lies over the canvas (an open popover, its suggestion list, a caret, a notice), and only
// the canvas's own pixels are compared: a cell of the canvas's area that something else covers,
// in any of the captures, is left out.
async function canvasMoves(page) {
    const clip = await page
        .locator("graphty-element")
        .first()
        .boundingBox()
        .catch(() => null);
    if (!clip || clip.width < 1 || clip.height < 1) return false;
    const covered = new Set();
    const grab = async () => {
        for (const i of await coveredCells(page, clip)) covered.add(i);
        const png = await page.screenshot({ clip, animations: "disabled", timeout: 5000 }).catch(() => null);
        return png && PNG.sync.read(png);
    };
    // three captures, and moving only when each differs from the one before: a one-off change (a
    // notice arriving over the canvas, a late repaint) is not motion, a spin or a drift changes every time
    const shots = [];
    for (let i = 0; i < 3; i++) {
        if (i) await page.waitForTimeout(500);
        shots.push(await grab());
    }
    const [a, b, c] = shots;
    return !!a && !!b && !!c && canvasDiffers(a, b, clip, covered) && canvasDiffers(b, c, clip, covered);
}

// Cells (CELL x CELL CSS pixels, row by row over the clip) where something other than the graph's
// canvas is on top, with the cells around each, so an overlay's edge and shadow are left out too.
// ponytail: hit testing misses overlays that take no pointer events (a tooltip); add their rects if one shows up
const CELL = 16;
async function coveredCells(page, clip) {
    return page
        .evaluate(
            ({ x, y, width, height, cell }) => {
                const host = document.querySelector("graphty-element");
                const canvas = host?.querySelector("canvas") || host?.shadowRoot?.querySelector("canvas");
                const cols = Math.ceil(width / cell),
                    rows = Math.ceil(height / cell);
                const out = [];
                for (let r = 0; r < rows; r++)
                    for (let c = 0; c < cols; c++) {
                        const hit = document.elementFromPoint(
                            x + Math.min(c * cell + cell / 2, width - 1),
                            y + Math.min(r * cell + cell / 2, height - 1),
                        );
                        if (hit === host || hit === canvas) continue;
                        for (let dr = -1; dr <= 1; dr++)
                            for (let dc = -1; dc <= 1; dc++) {
                                const rr = r + dr,
                                    cc = c + dc;
                                if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
                            }
                    }
                return out;
            },
            { ...clip, cell: CELL },
        )
        .catch(() => []);
}

// Whether two decoded captures of the clip differ anywhere outside the covered cells
function canvasDiffers(a, b, clip, covered) {
    if (a.width !== b.width || a.height !== b.height) return true;
    const scale = a.width / clip.width; // device pixels per CSS pixel
    const cols = Math.ceil(clip.width / CELL);
    for (let py = 0; py < a.height; py++) {
        const row = Math.floor(py / scale / CELL) * cols;
        for (let px = 0; px < a.width; px++) {
            if (covered.has(row + Math.floor(px / scale / CELL))) continue;
            const i = (py * a.width + px) * 4;
            if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2])
                return true;
        }
    }
    return false;
}

// ---------- finding controls, nodes and points ----------
const ROLES = [
    "button",
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "tab",
    "treeitem",
    "switch",
    "option",
    "checkbox",
    "radio",
    "combobox",
    "textbox",
    "searchbox",
];
const TIP = "[role=tooltip], .mantine-Tooltip-tooltip";
// The control a click names: "<name>", "<name>#2" or "role=<role>:<name>". Exact names before partial
// ones, controls before text, a text box's placeholder only when no name matches; a name several
// controls share is refused with the list of them. With no control of that name, a node whose label is drawn on the canvas,
// at its center.
async function find(page, raw, out) {
    let name = raw,
        role = null,
        nth = 0;
    const r = raw.match(/^role=([a-z]+):(.+)$/);
    if (r) [role, name] = [r[1], r[2]];
    const n = name.match(/^(.*\S)#(\d+)$/);
    if (n) [name, nth] = [n[1], +n[2]];
    for (const exact of [true, false]) {
        const locs = role
            ? [page.getByRole(role, { name, exact })]
            : [
                  ...ROLES.map((x) => page.getByRole(x, { name, exact })),
                  page.getByLabel(name, { exact }),
                  page.getByText(name, { exact }),
              ];
        const seen = new Map(); // one entry per control: text inside a button is that button
        let behind = 0; // controls of that name behind an open modal dialog, which a person cannot reach
        // a box is also named by the words it shows: its placeholder, when no accessible name matches
        for (let loc of [...locs, ...(role ? [] : ["placeholder"])]) {
            if (loc === "placeholder") {
                if (seen.size || behind) break;
                loc = page.getByPlaceholder(name, { exact });
            }
            let handles = await loc.filter({ visible: true }).elementHandles();
            // a radio or checkbox drawn only by its label (a segmented control hides its input):
            // the label is what a person sees and clicks
            if (role && !handles.length)
                handles = (
                    await Promise.all(
                        (await loc.elementHandles()).map(async (h) =>
                            (
                                await h.evaluateHandle((e) => (e.labels?.[0]?.checkVisibility() ? e.labels[0] : null))
                            ).asElement(),
                        ),
                    )
                ).filter(Boolean);
            for (const el of handles) {
                const [key, desc, control] = await el.evaluate((e, tip) => {
                    // a tooltip bubble, hidden text and the graph's canvas are not controls
                    if (e.closest(`${tip}, [aria-hidden=true], graphty-element, canvas`)) return [null];
                    // with a modal dialog open, only it (and a list or menu it opened) can be used
                    const modal = [...document.querySelectorAll("[aria-modal=true]")]
                        .filter((m) => m.checkVisibility())
                        .pop();
                    if (modal && !modal.contains(e) && !e.closest("[role=listbox],[role=menu]")) return ["behind"];
                    const found = e.closest(
                        "button,a[href],input,select,textarea,label,tr,[tabindex],[role=button],[role=link],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],[role=tab],[role=treeitem],[role=switch],[role=option],[role=row],[role=checkbox],[role=radio],[role=combobox]",
                    );
                    const hit = found || e;
                    // a label and the control it labels are one control to a person
                    const c = hit.tagName === "LABEL" && hit.control ? hit.control : hit;
                    c.dataset.tryKey ??= String((window.__tryKeys = (window.__tryKeys || 0) + 1));
                    const said = (c.getAttribute("aria-label") || c.innerText || c.value || "")
                        .trim()
                        .replace(/\s+/g, " ")
                        .slice(0, 40);
                    return [
                        c.dataset.tryKey,
                        `${c.getAttribute("role") || c.tagName.toLowerCase()} "${said}"`,
                        found !== null,
                    ];
                }, TIP);
                if (key === "behind") behind++;
                else if (key && !seen.has(key)) seen.set(key, { el, desc, control });
            }
        }
        let all = [...seen.values()];
        // controls before text: words that only read the name (a stat's label and its group) give way
        if (all.some((x) => x.control)) all = all.filter((x) => x.control);
        if (!all.length && behind)
            return { miss: `nothing in the open dialog is called "${name}" (a control behind the dialog is)` };
        if (!all.length && !role) all = await nodesNamed(page, name, exact);
        if (!all.length) continue;
        if (nth > all.length)
            return {
                miss: `"${raw}": only ${all.length} control${all.length === 1 ? " is" : "s are"} called "${name}" (${all.map((x) => x.desc).join(", ")})`,
            };
        // a shared name is refused, never resolved to the first: in round 1 that clicked the wrong
        // table row (the first of five "Enjolras" cells) and a panel heading for a list row
        if (!nth && all.length > 1)
            return {
                miss: `ambiguous: "${name}" matches ${all.length} controls, so the step did nothing; name one: ${all.map((x, i) => `"${name}#${i + 1}" ${x.desc}`).join(", ")}`,
            };
        return all[Math.max(nth, 1) - 1];
    }
    return { miss: `nothing on screen is called "${name}"` };
}
// Nodes whose label reads <name> and is drawn, on screen: graphty-element's labelOf and nodeScreenPosition
async function nodesNamed(page, name, exact) {
    return page
        .evaluate(
            ([w, exact]) => {
                const el = document.querySelector("graphty-element");
                if (!el || typeof el.labelOf !== "function") return [];
                const box = el.getBoundingClientRect();
                const hits = [];
                for (const node of el.getNodes()) {
                    const label = el.labelOf(node.id);
                    if (!label?.drawn) continue;
                    const text = label.text.trim();
                    if (exact ? text !== w : !text.toLowerCase().includes(w.toLowerCase())) continue;
                    const at = el.nodeScreenPosition(node.id);
                    if (!at?.visible) continue;
                    const x = Math.round(box.x + at.x),
                        y = Math.round(box.y + at.y);
                    hits.push({ at: [x, y], desc: `node "${text}" on the canvas, at ${x},${y}` });
                }
                return hits;
            },
            [name, exact],
        )
        .catch(() => []);
}
// What is at a point of the window: a node (graphty-element's elementAt), empty canvas, or a control
async function whatIsAt(page, x, y) {
    return page.evaluate(
        ([x, y]) => {
            const el = document.querySelector("graphty-element");
            const top = document.elementFromPoint(x, y);
            if (
                el &&
                top &&
                (top === el ||
                    el.contains(top) ||
                    el.shadowRoot?.contains(top) ||
                    (top.tagName === "CANVAS" && el.contains(top)))
            ) {
                const box = el.getBoundingClientRect();
                const hit =
                    typeof el.elementAt === "function" ? el.elementAt({ x: x - box.x, y: y - box.y }) : undefined;
                if (hit === undefined) return "the graph's canvas";
                if (hit === null) return "empty canvas";
                const label = hit.kind === "node" ? el.labelOf?.(hit.id) : undefined;
                return `${hit.kind} ${label?.text ? `"${label.text}"` : `with id ${JSON.stringify(hit.id)}`}${label && !label.drawn ? " (its label is not drawn)" : ""}`;
            }
            if (!top) return "nothing (outside the window)";
            const c = top.closest("button,a[href],input,select,textarea,label,[role]") || top;
            const said = (c.getAttribute("aria-label") || c.innerText || "").trim().replace(/\s+/g, " ").slice(0, 50);
            return `${c.getAttribute("role") || c.tagName.toLowerCase()}${said ? ` "${said}"` : ""}`;
        },
        [x, y],
    );
}
// The pointer's shape at a point (a screenshot never draws the pointer), through open shadow roots
async function cursorAt(page, x, y) {
    return page.evaluate(
        ([x, y]) => {
            let el = document.elementFromPoint(x, y);
            while (el?.shadowRoot) {
                const inner = el.shadowRoot.elementFromPoint(x, y);
                if (!inner || inner === el) break;
                el = inner;
            }
            return el ? getComputedStyle(el).cursor : "none (outside the window)";
        },
        [x, y],
    );
}
// The "Call log:" lines of a Playwright error, the last 8 (the retries repeat the same reason)
const callLog = (e) => {
    const lines = e.message.replace(/\x1b\[[0-9;]*m/g, "").split("\n"); // without the terminal colors
    const i = lines.findIndex((l) => /^Call log:/.test(l.trim()));
    return i < 0
        ? []
        : lines
              .slice(i + 1)
              .filter((l) => l.trim())
              .slice(-8)
              .map((l) => "    " + l.trim());
};
async function act(page, f, verb, opt) {
    if (f.el) return f.el[verb](Object.assign({ timeout: 3000 }, opt));
    const [x, y] = f.at;
    if (verb === "hover") return page.mouse.move(x, y);
    for (const m of opt.modifiers || []) await page.keyboard.down(m);
    await page.mouse.click(x, y, { button: opt.button || "left", clickCount: verb === "dblclick" ? 2 : 1 });
    for (const m of opt.modifiers || []) await page.keyboard.up(m);
}
// A tooltip already on the page before a hover (the last one, still fading out) is not this hover's:
// forgetTips marks them before the pointer moves and tipNow skips the marked ones. One still showing
// after the wait is not fading out: the pointer stayed on its control, so it is this hover's.
const forgetTips = (page) =>
    page.evaluate((tip) => document.querySelectorAll(tip).forEach((e) => (e.dataset.realStale = "")), TIP);
const tipNow = (page, stale = false) =>
    page.evaluate(
        ([tip, stale]) => {
            const t = [...document.querySelectorAll(tip)].find(
                (e) => (stale || !("realStale" in e.dataset)) && e.checkVisibility(),
            );
            return t ? t.innerText.replace(/\s+/g, " ").trim() : null;
        },
        [TIP, stale],
    );
// The tooltip of what the pointer rests on: the shared theme opens one 1000 ms after the pointer
// arrives (compact-mantine TOOLTIP_OPEN_DELAY), so this waits up to 2 s for it, or null
async function tooltip(page) {
    for (let i = 0; i < 20; i++) {
        const t = await tipNow(page);
        if (t) return t;
        await page.waitForTimeout(100);
    }
    return tipNow(page, true);
}

// Runs the steps; pushes what a participant would notice onto out; returns { code, missed }
async function run(s, steps, out) {
    let { page } = s;
    let code = 0,
        missed = 0;
    for (const [a, v, v2] of steps) {
        if (a === "--expect" || a === "--expect-not") {
            let seen;
            const sel = v.match(/^selected=(\d+)$/);
            if (sel) {
                const n = await page.locator("[aria-selected=true]:not([role=tab])").filter({ visible: true }).count();
                seen = n === +sel[1];
                if (seen !== (a === "--expect")) {
                    out.push(
                        `${n} row${n === 1 ? " is" : "s are"} selected; ${a === "--expect" ? "expected" : "expected other than"} ${sel[1]}`,
                    );
                    code = 1;
                }
                continue;
            }
            const rn = v.match(/^role=([a-z]+)(?::(.+))?$/);
            const byRole = async () => {
                for (const exact of [true, false]) {
                    const l = page.getByRole(rn[1], { name: rn[2], exact });
                    if ((await l.filter({ visible: true }).count()) > 0) return l;
                }
                return page.getByRole(rn[1], { name: rn[2] });
            };
            const loc = rn ? (rn[2] ? await byRole() : page.getByRole(rn[1])) : page.getByText(v, { exact: false });
            seen =
                (await loc.filter({ visible: true }).count()) > 0 ||
                (!rn &&
                    (await page.evaluate(
                        (w) =>
                            [...document.querySelectorAll("input, textarea")].some(
                                (f) => f.checkVisibility() && f.value.includes(w),
                            ),
                        v,
                    )));
            if (seen !== (a === "--expect")) {
                out.push(
                    `${a === "--expect" ? "expected on screen, not there" : "expected gone, still on screen"}: "${v}"`,
                );
                code = 1;
            }
            continue;
        }
        if (a in CLICKS) {
            const verb = a === "--hover" ? "hover" : a === "--dblclick" ? "dblclick" : "click";
            const f = await find(page, v, out);
            if (f.miss) {
                out.push(f.miss);
                missed++;
            } else {
                if (f.at) out.push(`${verb === "hover" ? "hovered" : "clicked"} ${f.desc}`);
                if (verb === "hover") await forgetTips(page);
                await act(page, f, verb, CLICKS[a]).catch((e) => {
                    // Playwright's call log names the actionability check that failed (covered, not stable, ...)
                    out.push(`could not ${verb} "${v}": ${e.message.split("\n")[0]}`, ...callLog(e));
                    missed++;
                });
            }
            if (verb !== "hover") await page.waitForTimeout(400);
            if (verb === "hover" && !f.miss) out.push(`tooltip: ${JSON.stringify(await tooltip(page))}`);
        } else if (a in AT) {
            const [x, y] = v.split(",").map(Number);
            out.push(`at ${x},${y}: ${await whatIsAt(page, x, y)}`);
            if (a === "--hover-at") {
                await forgetTips(page);
                await page.mouse.move(x, y);
                out.push(`cursor: ${await cursorAt(page, x, y)}`);
                out.push(`tooltip: ${JSON.stringify(await tooltip(page))}`);
            } else {
                await page.mouse.click(x, y, { button: AT[a].button || "left", clickCount: AT[a].clickCount || 1 });
                await page.waitForTimeout(400);
            }
        } else if (a === "--hover-icon") {
            // the nth control with an accessible name and no text of its own, counted in page order
            const icons = await page
                .locator("button[aria-label], [role=button][aria-label], a[aria-label], [role=tab][aria-label]")
                .filter({ visible: true })
                .evaluateAll((els) =>
                    els
                        .filter((e) => !e.innerText.trim())
                        .map((e) => {
                            const b = e.getBoundingClientRect();
                            return [
                                Math.round(b.x + b.width / 2),
                                Math.round(b.y + b.height / 2),
                                e.getAttribute("aria-label"),
                            ];
                        }),
                );
            if (+v > icons.length) {
                out.push(`there are ${icons.length} icon-only controls on screen, no icon ${v}`);
                missed++;
                continue;
            }
            const [x, y] = icons[+v - 1];
            out.push(`icon ${v} of ${icons.length}, at ${x},${y}`);
            await forgetTips(page);
            await page.mouse.move(x, y);
            out.push(`tooltip: ${JSON.stringify(await tooltip(page))}`);
        } else if (a === "--drag") {
            const [[x1, y1], [x2, y2]] = [v, v2].map((p) => p.split(",").map(Number));
            out.push(`drag from ${x1},${y1} (${await whatIsAt(page, x1, y1)}) to ${x2},${y2}`);
            await page.mouse.move(x1, y1);
            await page.mouse.down();
            await page.mouse.move(x2, y2, { steps: 12 });
            await page.mouse.up();
            await page.waitForTimeout(400);
        } else if (a === "--wheel") {
            const [x, y, d] = v.split(",").map(Number);
            await page.mouse.move(x, y);
            await page.mouse.wheel(0, d);
            await page.waitForTimeout(400);
        } else if (a === "--wait") {
            await page.waitForTimeout(+v);
        } else if (a === "--read") {
            await srRead(s, out);
        } else if (a === "--key") {
            await page.keyboard.press(v);
            await page.waitForTimeout(400);
        } else if (a === "--type") {
            const into = await page.evaluate(() => {
                const e = document.activeElement;
                if (
                    e &&
                    (e.tagName === "TEXTAREA" ||
                        e.isContentEditable ||
                        (e.tagName === "INPUT" &&
                            !/^(checkbox|radio|button|submit|reset|range|color|file|image)$/.test(e.type)))
                )
                    return null;
                return !e || e === document.body
                    ? "the page"
                    : `${e.getAttribute("role") || e.tagName.toLowerCase()} "${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 40)}"`;
            });
            if (into) {
                out.push(`nothing that takes text has focus (focus is on ${into}); typed nothing, not "${v}"`);
                code = 1;
                continue;
            }
            await page.keyboard.type(v, { delay: 20 });
            await page.waitForTimeout(400);
        } else if (a === "--upload") {
            for (let i = 0; !s.chooser && !s.picker && i < 30; i++) await page.waitForTimeout(100);
            if (!s.chooser && !s.picker) {
                out.push(`no file chooser is open; nothing was uploaded (click the control that opens one first)`);
                code = 1;
                continue;
            }
            if (s.picker) {
                const bytes = readFileSync(fileArg(v));
                s.saved[basename(v)] = bytes.toString(); // what goes in is not a save
                s.picker.answer({ name: basename(v), b64: bytes.toString("base64") });
                s.picker = null;
            } else {
                await s.chooser.setFiles(fileArg(v));
                s.chooser = null;
            }
            out.push(`chose the file ${basename(v)}`);
            await page.waitForTimeout(400);
        } else if (a === "--reopen") {
            // a picker left open dies with its tab
            s.picker?.answer(null);
            [s.picker, s.chooser] = [null, null];
            await page.close();
            page = await newTab(s);
            await opening(s, out);
            out.push("closed the tab and opened the app again in a new tab (the same browser storage)");
        } else if (a === "--drop") {
            // A real drag from outside the window, through the browser's own input path (trusted
            // events, a real File), not page-made DragEvents, which the app may ignore. A page that
            // does not take the drop never sees a drop event; then the tool says so, because a real
            // browser would open the file itself in place of the app, which headless cannot show.
            const path = fileArg(v);
            const [x, y] = [Math.round(VIEWPORT.width / 2), Math.round(VIEWPORT.height / 2)];
            await page.evaluate(() => {
                window.__realDrop = null;
                addEventListener("drop", (e) => setTimeout(() => (window.__realDrop = { taken: e.defaultPrevented })), {
                    capture: true,
                    once: true,
                });
            });
            const at = await whatIsAt(page, x, y).catch(() => "?");
            s.cdp ??= await s.context.newCDPSession(page);
            const data = { items: [], files: [path], dragOperationsMask: 1 };
            for (const type of ["dragEnter", "dragOver", "drop"])
                await s.cdp.send("Input.dispatchDragEvent", { type, x, y, data });
            await page.waitForTimeout(400);
            const got = await page.evaluate(() => window.__realDrop).catch(() => null);
            out.push(
                got?.taken
                    ? `dropped the file ${basename(path)} on the middle of the window (${at}); the page took it`
                    : `the drop was not delivered: nothing in the middle of the window (${at}) takes a dropped file; a real browser would open ${basename(path)} itself in place of the app`,
            );
        }
        for (const p of s.picked.splice(0)) out.push(p);
        if ((s.chooser || s.picker) && a !== "--upload")
            out.push("a file chooser is open (answer it with --upload <file>)");
        if (s.sr) await srReport(s, out);
    }
    await settle(s, out);
    // what was announced while the drawing settled
    if (s.sr) await srLive(s, out);
    else await goneNotices(s, out);
    await copySaves(s, out);
    // downloads that started during these steps: saved into the session folder and named
    if (s.downloads.length) {
        await page.waitForTimeout(300);
        for (const line of await Promise.all(s.downloads.splice(0))) out.push(line);
    }
    for (const e of s.errors.splice(0)) {
        out.push(e);
        code = 1;
    }
    return { code, missed };
}

// ---------- --prove: the tool against the real app ----------
async function prove() {
    const self = fileURLToPath(import.meta.url);
    // REAL_PROVE_DIR keeps two self-tests run at once from clearing each other's sessions
    const base = resolve(process.env.REAL_PROVE_DIR || join(repo, "design/ui/studio/tmp/prove"));
    await rm(base, { recursive: true, force: true });
    let bad = 0;
    const node = (args, cwd) =>
        spawnSync(process.execPath, [self, ...args], { encoding: "utf8", env: process.env, ...(cwd && { cwd }) });
    const check = (name, ok, detail) => {
        console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `: ${detail}`}`);
        if (!ok) bad++;
        return ok;
    };
    const step = (dir, ...a) => {
        const r = node(["--step", dir, ...a]);
        return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
    };
    const pngs = (dir) =>
        existsSync(dir)
            ? readdirSync(dir)
                  .filter((f) => /^\d+\.png$/.test(f))
                  .sort()
            : [];

    // a range reads as its valuetext, not Chromium's single-precision number
    check(
        "a spinbutton reads as its valuetext",
        axSays({
            role: { value: "spinbutton" },
            name: { value: "Damping factor" },
            value: { value: 0.8500000238418579 },
            properties: [{ name: "valuetext", value: { value: "0.85" } }],
        }) === 'spinbutton "Damping factor" value "0.85"',
        "it read the 32-bit value",
    );

    // a nameless table row reads as its cells' text
    const cell = (id, t) => [
        { nodeId: id, role: { value: "cell" }, childIds: [`${id}t`] },
        { nodeId: `${id}t`, role: { value: "StaticText" }, name: { value: t } },
    ];
    const rowTree = new Map([...cell("c1", "0.10 - 0.20"), ...cell("c2", "7")].map((x) => [x.nodeId, x]));
    check(
        "a nameless table row reads as its cells",
        rowSays({ role: { value: "row" }, childIds: ["c1", "c2"] }, rowTree) === 'row "0.10 - 0.20" | "7"',
        "it read the row as (no name)",
    );

    // the browser gate: one machine-wide pool of four, shared with every other browser run
    {
        const g = spawnSync(gate, ["printenv", "BROWSER_SLOT_FILE"], { encoding: "utf8" });
        const pool = join(
            dirname(
                spawnSync("git", ["-C", here, "rev-parse", "--path-format=absolute", "--git-common-dir"], {
                    encoding: "utf8",
                }).stdout.trim(),
            ),
            "tmp/browser-slots/",
        );
        check(
            "the gate takes its slot from the machine's shared pool (the main checkout's tmp/browser-slots)",
            g.status === 0 && g.stdout.startsWith(pool),
            `exit ${g.status} ${g.stdout}${g.stderr}`,
        );
        const five = spawnSync(gate, ["true"], { encoding: "utf8", env: { ...process.env, BROWSER_SLOTS: "5" } });
        check(
            "the gate refuses BROWSER_SLOTS above 4",
            five.status === 2 && /BROWSER_SLOTS must be 1 to 4/.test(five.stderr),
            `exit ${five.status} ${five.stderr}`,
        );
    }

    // the participant's side: a briefing with the prompt only, and no facilitator file in the folder
    {
        const P = join(base, "brief");
        const b = node(["--brief", P, "--task", "T18B", "--persona", "Ruth"]);
        const text = existsSync(join(P, "briefing.md")) ? readFileSync(join(P, "briefing.md"), "utf8") : "";
        check(
            "a briefing holds the prompt word for word, the start and the history, and nothing for facilitators",
            b.status === 0 &&
                text.includes("The Strozzi want a message carried to the Pazzi") &&
                text.includes("setup:florentine-ranked.txt") &&
                text.includes("## Your earlier sessions") &&
                !/Peruzzi|Words avoided|Facilitator notes|Suits:/.test(text),
            `exit ${b.status} ${b.stderr}`,
        );
        const Q = join(base, "dirty");
        await mkdir(Q, { recursive: true });
        await writeFile(join(Q, "notes.md"), "- **Words avoided:** filter, keep\n");
        const q = node(["--start", Q, "empty"]);
        check(
            "a start refuses a folder that holds a facilitator file",
            q.status === 2 && /facilitator files .*notes\.md/.test(q.stderr) && !existsSync(sockOf(Q)),
            `exit ${q.status} ${q.stderr}`,
        );
    }

    // refused before anything opens
    const refused = node(["--step", join(base, "none"), "--bogus", "x"]);
    check(
        "an unknown step is refused with exit 2",
        refused.status === 2 && /unknown step "--bogus"/.test(refused.stderr),
        `exit ${refused.status} ${refused.stderr.trim()}`,
    );

    const A = join(base, "session-a");
    let r = node(["--start", A, "empty"]);
    const json = existsSync(join(A, "session.json")) ? JSON.parse(readFileSync(join(A, "session.json"), "utf8")) : {};
    if (
        !check(
            "start opens the empty app and saves 01.png with the commit",
            r.status === 0 && pngs(A)[0] === "01.png" && /^[0-9a-f]{40}$/.test(json.commit || ""),
            `exit ${r.status}; ${r.stdout}${r.stderr}`,
        )
    )
        return finish(bad, [A]);
    {
        const c = commitOf();
        check(
            "session.json names the served build's commit, and the checkout's HEAD apart from it",
            !!c.build && json.commit.startsWith(c.build.split(" ")[0]) && json.toolCommit === c.toolSha,
            `commit ${json.commit}, toolCommit ${json.toolCommit}, build ${c.build}, HEAD ${c.toolSha}`,
        );
    }
    try {
        let x = step(A, "--click", "No thanks", "--expect", "Samples");
        check("a click by a control's name", x.code === 0 && pngs(A).length === 2, x.out);
        check("a session without --sr prints no screen-reader lines", !/^(focus|live): /m.test(x.out), x.out);
        x = step(
            A,
            "--click",
            "Open project or file",
            "--upload",
            "florentine.gml",
            // a data file opened from the start screen goes to the Data page first
            "--click",
            "Load",
            "--expect",
            "role=button:Project: florentine",
        );
        check(
            "an upload answers the file chooser and the file opens",
            x.code === 0 && /chose the file florentine\.gml/.test(x.out),
            x.out,
        );
        x = step(A, "--hover", "Undo");
        check("a hover prints the tooltip", x.code === 0 && /^tooltip: "Undo/m.test(x.out), x.out);
        // the "Local only" tooltip is still fading out when the pointer reaches the Everything row,
        // which has none of its own: the line must not be the fading one
        step(A, "--hover", "Local only");
        x = step(A, "--hover", "Everything");
        check(
            "a hover right after another prints its own tooltip, not the one fading out",
            x.code === 0 && /^tooltip: /m.test(x.out) && !/Nothing is sent/.test(x.out),
            x.out,
        );
        x = step(A, "--hover", "Redo");
        check("hovering the same control again prints its tooltip", /^tooltip: "Nothing to redo"$/m.test(x.out), x.out);
        // nothing to redo yet, so Redo is disabled: Playwright's call log says why the click failed
        x = step(A, "--click", "Redo");
        check(
            "a click that times out prints the reason from Playwright's call log",
            /could not click "Redo"/.test(x.out) && /not enabled/.test(x.out),
            x.out,
        );
        // a client stopped mid-step (its agent was stopped): the session answers the next step
        const gone = spawn(process.execPath, [self, "--step", A, "--wait", "2000"], { stdio: "ignore" });
        await new Promise((ok) => setTimeout(ok, 600));
        gone.kill("SIGKILL");
        await new Promise((ok) => setTimeout(ok, 2500));
        x = step(A, "--wait", "10");
        check(
            "a client killed mid-step leaves the session running",
            x.code === 0 &&
                existsSync(sockOf(A)) &&
                /a client left before its answer/.test(readFileSync(join(A, "session.log"), "utf8")),
            x.out,
        );
        // Tornabuoni: the label legend lists the first twelve names, so this one is only on the canvas
        x = step(A, "--click", "Tornabuoni");
        check(
            "a node with no label drawn is a miss, said plainly",
            /nothing on screen is called "Tornabuoni"/.test(x.out),
            x.out,
        );
        x = step(
            A,
            "--click",
            "role=treeitem:Everything",
            "--click",
            "role=tab:Style",
            "--click",
            "Add label line",
            "--click",
            "name",
            "--key",
            "Escape",
        );
        check("labels are turned on as a participant would", x.code === 0 && !/nothing on screen/.test(x.out), x.out);
        x = step(A, "--click", "Tornabuoni");
        const at = x.out.match(/clicked node "Tornabuoni" on the canvas, at (\d+),(\d+)/);
        check("a click by a node's drawn label lands on that node", x.code === 0 && !!at, x.out);
        if (at) {
            x = step(A, "--click-at", `${at[1]},${at[2]}`);
            check(
                "a click-at reports the node under the point",
                x.code === 0 && new RegExp(`^at ${at[1]},${at[2]}: node "Tornabuoni"`, "m").test(x.out),
                x.out,
            );
        }
        x = step(A, "--click-at", "1430,890");
        check(
            "a click-at off the canvas names what is there",
            x.code === 0 && /^at 1430,890: /m.test(x.out) && !/node "/.test(x.out),
            x.out,
        );
        x = step(A, "--click", "Find", "--type", "Strozzi", "--expect", "Strozzi");
        check("a type goes into the focused box", x.code === 0, x.out);
        x = step(A, "--key", "Escape", "--click", "Find nodes, edges, values", "--type", "Pazzi", "--expect", "Pazzi");
        check(
            "a click by a text box's placeholder focuses that box",
            x.code === 0 && !/nothing on screen is called/.test(x.out),
            x.out,
        );
        // a segmented control hides its radio inputs; role=radio:<name> clicks the label a person sees
        x = step(A, "--key", "Enter", "--key", "g", "--click", "role=radio:2", "--expect", "within 2 hops");
        check("role=radio clicks a segment whose input is hidden", x.code === 0, x.out);
        x = step(A, "--key", "Escape", "--click", "Main menu", "--click", "Export...", "--click", "role=button:Export");
        check(
            "a download is saved into the session folder and printed",
            x.code === 0 && /^a file was saved: .*\.png, \d+ x \d+/m.test(x.out),
            x.out,
        );
        // with a modal dialog open, a name resolves inside it; a control behind it is out of reach
        x = step(A, "--key", "Control+e", "--click", "Data");
        check("a name resolves inside the open dialog first", x.code === 0 && !/ambiguous/.test(x.out), x.out);
        x = step(A, "--click", "Graph");
        check(
            "a control behind an open dialog is a miss, said plainly",
            /nothing in the open dialog is called "Graph"/.test(x.out),
            x.out,
        );
        // the save picker is answered, the file lands in the session folder, and a new tab on the
        // same storage lists it under Recent projects and reopens it
        // the first Save of a project asks for its name (Save as), then keeps it in this browser
        x = step(
            A,
            "--key",
            "Escape",
            "--key",
            "Control+s",
            "--click",
            "Save",
            "--expect",
            "Saved florentine in this browser",
        );
        check("a first save names the project and keeps it in this browser", x.code === 0, x.out);
        x = step(A, "--reopen", "--click", "florentine", "--expect", "role=button:Project: florentine");
        check(
            "a reopened tab keeps the browser storage: Recent projects reopens the saved file",
            x.code === 0 && /closed the tab and opened the app again/.test(x.out),
            x.out,
        );
        // a planted spin (the camera's yaw key held on the canvas) must be reported
        await ask(A, { op: "plant-spin", on: true });
        x = step(A, "--wait", "100");
        await ask(A, { op: "plant-spin", on: false });
        check("a turning drawing is reported", /the drawing is still moving/.test(x.out), x.out);
        x = step(A, "--wait", "2000");
        check("a still drawing is not", !/the drawing is still moving/.test(x.out), x.out);
        // what changes over the canvas is not the drawing moving: typing into an open popover whose
        // box keeps repainting
        x = step(A, "--key", "p");
        await ask(A, { op: "plant-ticker" });
        x = step(A, "--type", "Pazzi");
        check(
            "typing in an open popover over a still drawing is not motion",
            x.code === 0 && !/the drawing is still moving/.test(x.out),
            x.out,
        );
        x = step(A, "--key", "Escape", "--key", "Escape"); // the first clears the box, the second closes
        x = step(A, "--click", "No such control at all");
        check(
            "a miss says nothing on screen is called that",
            /nothing on screen is called "No such control at all"/.test(x.out),
            x.out,
        );
    } finally {
        r = node(["--end", A]);
        check(
            "end closes the session and frees its slot",
            r.status === 0 && !existsSync(sockOf(A)),
            `exit ${r.status} ${r.stdout}${r.stderr}`,
        );
    }
    // a setup start: steps run before 01.png and are not shown
    const B = join(base, "session-b");
    const setup = join(base, "setup.txt");
    await writeFile(
        setup,
        "# open a sample before the participant arrives\n--click No thanks\n--click Open the Zachary's karate club sample\n",
    );
    r = node(["--start", B, `setup:${setup}`]);
    check(
        "a setup start runs its steps before 01.png",
        r.status === 0 && pngs(B).length === 1 && existsSync(join(B, "setup.log")),
        `exit ${r.status} ${r.stdout}${r.stderr}`,
    );
    const y = step(B, "--expect", "role=button:Project: Zachary's karate club");
    check("the setup's sample is open when the participant arrives", y.code === 0, y.out);
    const lit = (await ask(B, { op: "hovered" })).out[0];
    check("a setup leaves the pointer over nothing, so no control is lit by a hover", lit === "", lit);
    // bar 2: the open work at the start is listed, and a planted removal shows up as gone at the end
    const workStart = JSON.parse(readFileSync(join(B, "work-start.json"), "utf8"));
    check(
        "the open work at the start lists the setup's source and style layers",
        workStart?.sources?.length > 0 && workStart?.layers?.length > 0,
        JSON.stringify(workStart),
    );
    const removed = (await ask(B, { op: "plant-removal" })).out[0];
    node(["--end", B]);
    const work = existsSync(join(B, "work.json")) ? JSON.parse(readFileSync(join(B, "work.json"), "utf8")) : {};
    check(
        "a planted removal of the loaded table is listed as gone at the end",
        !!removed && (work.gone?.sources ?? []).includes(removed),
        `removed ${removed}; gone ${JSON.stringify(work.gone)}`,
    );
    await writeFile(setup, "--click A control that does not exist\n");
    const C = join(base, "session-c");
    r = node(["--start", C, `setup:${setup}`]);
    check(
        "a setup step that misses fails the start loudly",
        r.status === 1 && /SETUP FAILED/.test(r.stdout),
        `exit ${r.status} ${r.stdout}`,
    );
    node(["--end", C]);
    // a setup path as tasks.md gives it (relative to tier2/), from a folder that is neither
    const F = join(base, "session-f");
    r = node(["--start", F, "setup:../rounds/tier-2/setups/florentine.txt"], base);
    check(
        "a setup path relative to tier2/ is found from another folder",
        r.status === 0 && pngs(F).length === 1,
        `exit ${r.status} ${r.stdout}${r.stderr}`,
    );
    node(["--end", F]);
    const G = join(base, "session-g");
    r = node(["--start", G, "setup:no-such-setup.txt"], base);
    const lines = `${r.stdout}${r.stderr}`.trim().split("\n");
    check(
        "a missing setup file is one SETUP FAILED line, exit 2, and no session",
        r.status === 2 &&
            lines.length === 1 &&
            /^SETUP FAILED: no such setup file no-such-setup\.txt/.test(lines[0]) &&
            !existsSync(G),
        `exit ${r.status} ${lines.join(" | ")}`,
    );
    // screen-reader mode: the focused element's role and name after every step, and live-region text
    const D = join(base, "session-d");
    const srSetup = join(base, "setup-sr.txt");
    await writeFile(
        srSetup,
        "--click No thanks\n--click Open project or file\n--upload florentine.gml\n--click Load\n",
    );
    r = node(["--start", D, `setup:${srSetup}`, "--sr"]);
    check(
        "an --sr start prints what has focus and no screenshot path; a setup leaves nothing focused",
        r.status === 0 && /^focus: nothing \(the page itself\)$/m.test(r.stdout) && !/\.png$/m.test(r.stdout),
        `exit ${r.status} ${r.stdout}${r.stderr}`,
    );
    if (r.status === 0) {
        const before = pngs(D).length;
        let x = step(D, "--click", "Find");
        check(
            "a planted pointer step is refused in screen-reader mode, before anything runs",
            x.code === 2 && /refused in screen-reader mode/.test(x.out) && pngs(D).length === before,
            x.out,
        );
        x = step(D, "--key", "Tab", "--key", "Tab", "--key", "Tab");
        check(
            "every step prints a focus line, and no screenshot path",
            (x.out.match(/^focus: /gm) || []).length === 3 && !/\.png$/m.test(x.out) && pngs(D).length === before + 1,
            x.out,
        );
        x = step(D, "--key", "Escape", "--key", "/");
        check(
            "the focus line gives the role and the accessible name",
            /^focus: (combobox|textbox|searchbox) "[^"]+"/m.test(x.out),
            x.out,
        );
        x = step(D, "--type", "zzzz");
        check(
            "a live region's new text is printed",
            /^live: status \(polite\): "No match for \\"zzzz\\""/m.test(x.out) && /value "zzzz"/.test(x.out),
            x.out,
        );
        // the find box keeps focus and points at the highlighted result: that result is reported
        x = step(D, "--key", "Control+a", "--type", "Strozzi", "--key", "ArrowDown");
        check(
            "a focused combobox reports its highlighted option (aria-activedescendant)",
            /^focus: combobox "Find".*; highlighted: option "[^"]*Strozzi/m.test(x.out),
            x.out,
        );
        // a region that arrives with its text is marked unconfirmed; one that changes on the page is not
        await ask(D, { op: "plant-live" });
        x = step(D, "--wait", "400");
        check(
            "a live region inserted already filled is marked unconfirmed, a changed one is not",
            /^live: status \(polite\): "Planted already filled" -- unconfirmed/m.test(x.out) &&
                /^live: status \(polite\): "Planted change"$/m.test(x.out),
            x.out,
        );
        x = step(D, "--key", "Escape", "--key", "Control+e", "--read");
        check(
            "--read reads the open dialog: its name first, then its text and controls",
            /^read: dialog "[^"]+"[^\n]*:$/m.test(x.out) && /^read: (button|tab|radio) "/m.test(x.out),
            x.out,
        );
    }
    node(["--end", D]);
    // a session left without --end (its agent was stopped) closes itself and frees its slot
    const E = join(base, "session-e");
    r = spawnSync(process.execPath, [self, "--start", E, "empty"], {
        encoding: "utf8",
        env: { ...process.env, REAL_IDLE_SECONDS: "3" },
    });
    let gone = false;
    for (let i = 0; r.status === 0 && !gone && i < 60; i++) {
        await new Promise((ok) => setTimeout(ok, 500));
        gone = !existsSync(sockOf(E));
    }
    check(
        "a session nobody steps or ends closes itself",
        gone && /closing the session/.test(readFileSync(join(E, "session.log"), "utf8")),
        `exit ${r.status} ${r.stdout}${r.stderr}`,
    );
    // a shared name is refused with its candidates; a dropped file goes through the browser itself
    const H = join(base, "session-h");
    r = node(["--start", H, "setup:friends-ranked.txt"]);
    if (check("a ranked setup starts", r.status === 0, `exit ${r.status} ${r.stdout}${r.stderr}`)) {
        let x = step(H, "--click", "PageRank");
        check(
            "a name several controls share is refused, with each candidate named",
            /ambiguous: "PageRank" matches \d+ controls, so the step did nothing; name one: "PageRank#1" treeitem/.test(
                x.out,
            ) && pngs(H).length === 2,
            x.out,
        );
        x = step(H, "--drop", "friends-v2.csv");
        check(
            "a drop where nothing takes it says it was not delivered",
            /the drop was not delivered: nothing in the middle of the window \(empty canvas\)/.test(x.out),
            x.out,
        );
    }
    node(["--end", H]);
    const I = join(base, "session-i");
    r = node(["--start", I, "empty", "--task", "T17A"]);
    if (check("a start with a task", r.status === 0, `exit ${r.status} ${r.stdout}${r.stderr}`)) {
        // a data file dropped on the start screen opens the Data page as a new graph, not a project
        const x = step(I, "--click", "No thanks", "--drop", "friends.csv", "--expect", "Open as a new graph");
        check(
            "a file dropped on the start screen opens it on the Data page",
            x.code === 0 && /dropped the file friends\.csv .*; the page took it/.test(x.out),
            x.out,
        );
        r = node(["--end", I]);
        const rec = JSON.parse(readFileSync(join(I, "session.json"), "utf8"));
        check(
            "the first --end of a T17 or T18 session hands over the follow-up and keeps the session open",
            r.status === 3 &&
                /"Your club now asks the same for pairs who ran together 5 or more times\./.test(r.stdout) &&
                existsSync(sockOf(I)) &&
                /^given /.test(rec.followUp),
            `exit ${r.status} ${r.stdout}${r.stderr}`,
        );
        r = node(["--end", I]);
        check("the second --end ends it", r.status === 0 && !existsSync(sockOf(I)), `exit ${r.status} ${r.stdout}`);
    }
    return finish(bad, [A, B, C, D, E, H, I]);
}
function finish(bad, dirs) {
    for (const d of dirs)
        if (existsSync(sockOf(d))) spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--end", d]);
    console.log(bad ? `${bad} check${bad === 1 ? "" : "s"} failed` : "every check passed");
    return bad ? 1 : 0;
}

// ---------- main ----------
const args = process.argv.slice(2);
const mode = args[0];
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
// the positional arguments after the mode, without the bare flags and the flags that take a value
const rest = (bare, valued) =>
    args.slice(1).filter((x, i, a) => !bare.includes(x) && !valued.includes(x) && !valued.includes(a[i - 1]));
let code = 0;
if (mode === "--serve") {
    await serve(resolve(args[1]), args[2] === "--sr");
} else if (mode === "--start") {
    const task = flag("--task");
    const [dir, how] = rest(["--sr"], ["--task"]);
    if (!dir) {
        console.error("usage: real.mjs --start <session dir> [empty | setup:<file>] [--sr] [--task T17A]");
        code = 2;
    } else code = await start(dir, how || "empty", args.includes("--sr"), task);
} else if (mode === "--brief") {
    const [dir] = rest([], ["--task", "--persona"]);
    const why = dir
        ? await brief(dir, flag("--task"), flag("--persona"))
        : "usage: real.mjs --brief <session dir> [--task T17A --persona <name>]";
    if (why) {
        console.error(why);
        code = 2;
    } else console.log(join(resolve(dir), "briefing.md"));
} else if (mode === "--step") {
    const p = parseSteps(args.slice(2));
    if (!args[1] || p.refused) {
        console.error(p.refused || "usage: real.mjs --step <session dir> <steps...>");
        code = 2;
    } else if (!existsSync(sockOf(args[1]))) {
        console.error(`no live session in ${resolve(args[1])}; start one with --start`);
        code = 2;
    } else code = say(await ask(args[1], { op: "step", steps: p.steps }));
} else if (mode === "--end") {
    if (!existsSync(sockOf(args[1] || ""))) {
        console.log(`no live session in ${resolve(args[1] || ".")}`);
    } else {
        const r = await ask(args[1], { op: "end" }).catch(() => ({
            out: ["the session did not answer; removed its socket"],
            code: 0,
            end: true,
        }));
        if (r.end) {
            for (let i = 0; existsSync(sockOf(args[1])) && i < 50; i++) await new Promise((ok) => setTimeout(ok, 100));
            await rm(sockOf(args[1]), { force: true });
        }
        code = say(r);
    }
} else if (mode === "--prove") {
    code = await prove();
} else {
    console.error(
        "usage: real.mjs --brief <dir> | --start <dir> [empty|setup:<file>] [--sr] [--task T17A] | --step <dir> <steps...> | --end <dir> | --prove",
    );
    code = 2;
}
if (mode !== "--serve") process.exit(code);
