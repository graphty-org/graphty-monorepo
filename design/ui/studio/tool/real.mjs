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

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../..");
// REAL_DIST serves a copy of a build instead, one a rebuild cannot replace mid-session
const dist = process.env.REAL_DIST ? resolve(process.env.REAL_DIST) : join(repo, "graphty/dist");
const files = join(here, "files");
const gate = join(here, "with-browser.sh");
// The tier 1 workspace is reached with ?next until the Switch-over makes it the default (graphty/src/App.tsx)
const TIER1 = "/?next";
const VIEWPORT = { width: 1440, height: 900 };
// A session nobody steps for this long is closed, so one whose agent was stopped before --end frees
// its browser slot soon (two stopped agents held slots for 45 minutes in round 1, 2026-10-06).
// REAL_IDLE_SECONDS overrides it (the --prove check uses a few seconds).
const IDLE_MS = (Number(process.env.REAL_IDLE_SECONDS) || 15 * 60) * 1000;

// a fixed folder, not TMPDIR, so every agent finds the same session from the same session dir
const sockOf = (dir) =>
    join("/tmp", `graphty-real-${createHash("sha1").update(resolve(dir)).digest("hex").slice(0, 12)}.sock`);
const fileArg = (f) => (existsSync(resolve(f)) ? resolve(f) : join(files, f));

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

async function start(dir, how, sr) {
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
        const p = parseSetup(await readFile(resolve(m[1]), "utf8"));
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
    const r = await ask(dir, { op: "start", setup });
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
    if (sr) await s.context.addInitScript(watchLive);
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
                    else if (req.op === "start") r = await opStart(s, req.setup);
                    else if (req.op === "step") r = await opStep(s, req.steps);
                    else if (req.op === "plant-spin") r = await plantSpin(s, req.on);
                    else if (req.op === "plant-live") r = await plantLive(s);
                    else if (req.op === "plant-ticker") r = await plantTicker(s);
                    else if (req.op === "end") r = { out: [`session ended: ${dir}`], code: 0, end: true };
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
// role "name" value "..." states, for one accessibility node
function axSays(n) {
    const states = (n.properties || [])
        .filter((p) => SR_STATES.has(p.name) && p.value.value !== false && p.value.value !== "false")
        .map((p) => (p.value.value === true || p.value.value === "true" ? p.name : `${p.name}=${p.value.value}`));
    return [
        n.role?.value || "unknown role",
        n.name?.value ? JSON.stringify(n.name.value) : "(no name)",
        n.value?.value !== undefined && n.value.value !== "" ? `value ${JSON.stringify(String(n.value.value))}` : "",
        states.join(", "),
    ]
        .filter(Boolean)
        .join(" ");
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
                role === "heading" && level ? axSays(n).replace(/^heading/, `heading level ${level}`) : axSays(n),
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

const commitOf = () => {
    const sha = spawnSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
    const dirty =
        spawnSync("git", ["-C", repo, "status", "--porcelain", "--", "graphty", "graphty-element"], {
            encoding: "utf8",
        }).stdout.trim() !== "";
    let stamp = null;
    try {
        stamp = readFileSync(join(dist, "index.html"), "utf8").match(/<meta name="graphty-build" content="([^"]*)"/)[1];
    } catch {
        // no stamp, or a rebuild in progress removed the page for a moment: unknown, not fatal
    }
    return { sha, dirty, build: stamp };
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
                uncommittedChanges: commit.dirty,
                buildStamp: commit.build,
                url: TIER1,
                screenReaderMode: !!s.sr,
                viewport: VIEWPORT,
                started: new Date().toISOString(),
                setup: setup.map((x) => x.join(" ")),
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
        await writeFile(join(s.dir, "setup.log"), said.join("\n") + "\n");
        if (r.code || r.missed) {
            out.push(`SETUP FAILED: a setup step did not work (setup.log):`, ...said.map((l) => "  " + l));
            code = 1;
        }
    }
    s.errors.length = 0; // what loading and setup printed is in session.log, not the participant's view
    if (s.sr) await srReport(s, out);
    out.push(`commit ${commit.sha}${commit.dirty ? " (with uncommitted changes)" : ""}, build ${commit.build}`);
    out.push(await shot(s));
    return { out, code };
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
// controls share says so. With no control of that name, a node whose label is drawn on the canvas,
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
            for (const el of await loc.filter({ visible: true }).elementHandles()) {
                const [key, desc] = await el.evaluate((e, tip) => {
                    // a tooltip bubble, hidden text and the graph's canvas are not controls
                    if (e.closest(`${tip}, [aria-hidden=true], graphty-element, canvas`)) return [null];
                    // with a modal dialog open, only it (and a list or menu it opened) can be used
                    const modal = [...document.querySelectorAll("[aria-modal=true]")]
                        .filter((m) => m.checkVisibility())
                        .pop();
                    if (modal && !modal.contains(e) && !e.closest("[role=listbox],[role=menu]")) return ["behind"];
                    const hit =
                        e.closest(
                            "button,a[href],input,select,textarea,label,tr,[tabindex],[role=button],[role=link],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],[role=tab],[role=treeitem],[role=switch],[role=option],[role=row],[role=checkbox],[role=radio],[role=combobox]",
                        ) || e;
                    // a label and the control it labels are one control to a person
                    const c = hit.tagName === "LABEL" && hit.control ? hit.control : hit;
                    c.dataset.tryKey ??= String((window.__tryKeys = (window.__tryKeys || 0) + 1));
                    const said = (c.getAttribute("aria-label") || c.innerText || c.value || "")
                        .trim()
                        .replace(/\s+/g, " ")
                        .slice(0, 40);
                    return [c.dataset.tryKey, `${c.getAttribute("role") || c.tagName.toLowerCase()} "${said}"`];
                }, TIP);
                if (key === "behind") behind++;
                else if (key && !seen.has(key)) seen.set(key, { el, desc });
            }
        }
        let all = [...seen.values()];
        if (!all.length && behind)
            return { miss: `nothing in the open dialog is called "${name}" (a control behind the dialog is)` };
        if (!all.length && !role) all = await nodesNamed(page, name, exact);
        if (!all.length) continue;
        if (nth > all.length)
            return {
                miss: `"${raw}": only ${all.length} control${all.length === 1 ? " is" : "s are"} called "${name}" (${all.map((x) => x.desc).join(", ")})`,
            };
        if (!nth && all.length > 1)
            out.push(
                `ambiguous: "${name}" matches ${all.length} controls (${all.map((x) => x.desc).join(", ")}); took the first`,
            );
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
async function act(page, f, verb, opt) {
    if (f.el) return f.el[verb](Object.assign({ timeout: 3000 }, opt));
    const [x, y] = f.at;
    if (verb === "hover") return page.mouse.move(x, y);
    for (const m of opt.modifiers || []) await page.keyboard.down(m);
    await page.mouse.click(x, y, { button: opt.button || "left", clickCount: verb === "dblclick" ? 2 : 1 });
    for (const m of opt.modifiers || []) await page.keyboard.up(m);
}
const tipNow = (page) =>
    page.evaluate((tip) => {
        const t = [...document.querySelectorAll(tip)].find((e) => e.checkVisibility());
        return t ? t.innerText.replace(/\s+/g, " ").trim() : null;
    }, TIP);
// The tooltip of what the pointer rests on: the shared theme opens one 1000 ms after the pointer
// arrives (compact-mantine TOOLTIP_OPEN_DELAY), so this waits up to 2 s for it, or null
async function tooltip(page) {
    for (let i = 0; i < 20; i++) {
        const t = await tipNow(page);
        if (t) return t;
        await page.waitForTimeout(100);
    }
    return null;
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
                await act(page, f, verb, CLICKS[a]).catch((e) => {
                    out.push(`could not ${verb} "${v}": ${e.message.split("\n")[0]}`);
                    missed++;
                });
            }
            if (verb !== "hover") await page.waitForTimeout(400);
            if (verb === "hover" && !f.miss) out.push(`tooltip: ${JSON.stringify(await tooltip(page))}`);
        } else if (a in AT) {
            const [x, y] = v.split(",").map(Number);
            out.push(`at ${x},${y}: ${await whatIsAt(page, x, y)}`);
            if (a === "--hover-at") {
                await page.mouse.move(x, y);
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
            const path = fileArg(v);
            const bytes = readFileSync(path).toString("base64");
            const target = await page.evaluate(
                ([b64, name, x, y]) => {
                    const bin = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
                    const dt = new DataTransfer();
                    dt.items.add(new File([bin], name));
                    const t = document.elementFromPoint(x, y) || document.body;
                    for (const type of ["dragenter", "dragover", "drop"])
                        t.dispatchEvent(
                            new DragEvent(type, {
                                bubbles: true,
                                cancelable: true,
                                dataTransfer: dt,
                                clientX: x,
                                clientY: y,
                            }),
                        );
                    return t.tagName.toLowerCase();
                },
                [bytes, basename(path), VIEWPORT.width / 2, VIEWPORT.height / 2],
            );
            out.push(`dropped the file ${basename(path)} on the middle of the window (${target})`);
            await page.waitForTimeout(400);
        }
        for (const p of s.picked.splice(0)) out.push(p);
        if ((s.chooser || s.picker) && a !== "--upload")
            out.push("a file chooser is open (answer it with --upload <file>)");
        if (s.sr) await srReport(s, out);
    }
    await settle(s, out);
    if (s.sr) await srLive(s, out); // what was announced while the drawing settled
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
    const node = (args) => spawnSync(process.execPath, [self, ...args], { encoding: "utf8", env: process.env });
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
    node(["--end", B]);
    await writeFile(setup, "--click A control that does not exist\n");
    const C = join(base, "session-c");
    r = node(["--start", C, `setup:${setup}`]);
    check(
        "a setup step that misses fails the start loudly",
        r.status === 1 && /SETUP FAILED/.test(r.stdout),
        `exit ${r.status} ${r.stdout}`,
    );
    node(["--end", C]);
    // screen-reader mode: the focused element's role and name after every step, and live-region text
    const D = join(base, "session-d");
    const srSetup = join(base, "setup-sr.txt");
    await writeFile(srSetup, "--click No thanks\n--click Open project or file\n--upload florentine.gml\n");
    r = node(["--start", D, `setup:${srSetup}`, "--sr"]);
    check(
        "an --sr start prints what has focus and no screenshot path",
        r.status === 0 && /^focus: /m.test(r.stdout) && !/\.png$/m.test(r.stdout),
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
    return finish(bad, [A, B, C, D, E]);
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
let code = 0;
if (mode === "--serve") {
    await serve(resolve(args[1]), args[2] === "--sr");
} else if (mode === "--start") {
    const [dir, how] = args.slice(1).filter((x) => x !== "--sr");
    if (!dir) {
        console.error("usage: real.mjs --start <session dir> [empty | setup:<file>] [--sr]");
        code = 2;
    } else code = await start(dir, how || "empty", args.includes("--sr"));
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
        }));
        for (let i = 0; existsSync(sockOf(args[1])) && i < 50; i++) await new Promise((ok) => setTimeout(ok, 100));
        await rm(sockOf(args[1]), { force: true });
        code = say(r);
    }
} else if (mode === "--prove") {
    code = await prove();
} else {
    console.error(
        "usage: real.mjs --start <dir> [empty|setup:<file>] [--sr] | --step <dir> <steps...> | --end <dir> | --prove",
    );
    code = 2;
}
if (mode !== "--serve") process.exit(code);
