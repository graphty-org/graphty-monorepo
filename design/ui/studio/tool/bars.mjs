#!/usr/bin/env node
// Measures the studio's scripted bars on a production build of the graphty app (tier 1's
// ../criteria.md and tier 2's ../tier2/criteria.md):
//   bar 7 (a): every algorithm in the element's catalog run on friends.csv loaded with each weight
//          meaning (closer, farther, capacity, unset) and once with no weight column, both directed
//          and undirected; every run must read the weight in its own sense or not at all, and a run
//          that read no weight must give the same answer as on the table with no weight column
//   bar 8: axe-core (tags wcag2a, wcag2aa, wcag21aa, wcag22aa) on tier 1's core screens and tier 2's
//          screens -- a serious or critical violation fails; on tier 2's screens also no two
//          reachable controls sharing an accessible name, and focus never fallen to the page after
//          the actions the criteria list
//   bar 9: the app's own words on screen at rest, data values, names and numbers left out: (a) tier
//          1's screen (Les Miserables, nothing selected, 1440 x 900) at most 50; (b) tier 2's four
//          screens no higher than round 1's counts in bars-limits.json
//   bar 10 (scripted counts): on every bar 8 tier 2 screen and on long-names.csv's Data place, a
//          node's inspector and the find box, at 1440 x 900 and 1280 x 800, each with its screen and
//          element: text cut off with no title, accessible name or tooltip giving it whole, and a
//          visible error code or field path (measure.mjs bar10). Reported as findings for the
//          experts' severity; they do not fail the run.
//
//   node bars.mjs <out dir> [--dist <build dir>] [--scheme dark|light]
//
// --scheme picks the app's color scheme for tier 1's screens (dark, the app's default, when left
// out). Tier 2's screens are walked with real.mjs sessions (REAL_DIST=<build dir>), each in its own
// browser slot. Before a check is trusted it must fail on a planted case: an image with no text
// alternative (axe), two buttons of one name, focus dropped to the page, a clipped name and an
// E_BAD_SELECTOR string (bar 10), a wrong weight reading of each kind; and a check that reads zero
// items fails. Every planted case is printed with whether it was caught, and where. Writes <out dir>/bars.json and prints a
// summary; exit 1 when a bar fails, a screen was not reached or a planted case was not caught.
process.env.FC_FONTATIONS = "1"; // headless Chromium crashes on startup on this host without it

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { connect } from "node:net";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AXE_TAGS, axeViolations, LAUNCH, serious, wordsOnScreen } from "./measure.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const self = fileURLToPath(import.meta.url);
const repo = resolve(here, "../../../..");
const args = process.argv.slice(2);
const out = args[0] && !args[0].startsWith("--") ? resolve(args[0]) : null;
const di = args.indexOf("--dist");
const dist = resolve(di > 0 ? args[di + 1] : join(repo, "graphty/dist"));
if (!out || !existsSync(join(dist, "index.html"))) {
    console.error(
        "usage: bars.mjs <out dir> [--dist <build dir>] [--scheme dark|light]  (the build dir holds index.html)",
    );
    process.exit(2);
}
const si = args.indexOf("--scheme");
const scheme = si > 0 ? args[si + 1] : "dark";
if (scheme !== "dark" && scheme !== "light") {
    console.error("--scheme takes dark or light");
    process.exit(2);
}
const FILES = join(here, "files");

// ---------- bar 7 (a): how every run reads the loaded weight ----------
// A loaded meaning and what a run says it read: "closer" is strength, "farther" distance
const SENSE = { strength: "closer", distance: "farther", capacity: "capacity", unset: "unset" };
// Every problem with the runs' readings; records are { table, directed, algorithm, status, weight,
// skipped, answer }, table one of strength, distance, capacity, unset or none (no weight column)
function judgeWeights(records) {
    const problems = [];
    const plain = new Map(records.filter((r) => r.table === "none").map((r) => [`${r.directed} ${r.algorithm}`, r]));
    const done = records.filter((r) => r.status === "succeeded");
    if (!done.length) problems.push("no run finished, so nothing was checked");
    for (const r of done) {
        const where = `${r.algorithm} (${r.directed ? "directed" : "undirected"})`;
        const read = r.weight?.attribute === "weight" ? r.weight : null; // the loaded column, not another
        if (r.table === "none") {
            if (read) problems.push(`${where} read "weight" as ${read.meaning} from a table with no weight column`);
            continue;
        }
        if (read) {
            const wrong = r.table === "unset" ? read.meaning === "distance" : read.meaning !== r.table;
            if (wrong)
                problems.push(`${where} read a ${SENSE[r.table]} weight as ${SENSE[read.meaning] ?? read.meaning}`);
            continue;
        }
        // it read no weight (left out with a code, or not a reader): the column must not change its answer
        const p = plain.get(`${r.directed} ${r.algorithm}`);
        if (p?.status === "succeeded" && p.answer !== r.answer)
            problems.push(
                `${where} says it read no weight on the ${SENSE[r.table]} table, but its answer differs from the table with no weight column`,
            );
    }
    return problems;
}
// One planted wrong reading of each kind, each of which the judge must catch
const PLANTED_WEIGHTS = {
    "a closer weight read as a distance": [{ table: "strength", weight: { attribute: "weight", meaning: "distance" } }],
    "an unset weight read as a distance": [{ table: "unset", weight: { attribute: "weight", meaning: "distance" } }],
    "a farther weight read as closeness by PageRank": [
        { table: "distance", algorithm: "pagerank", weight: { attribute: "weight", meaning: "strength" } },
    ],
    "a capacity read as a length by a path": [
        { table: "capacity", algorithm: "shortest-path", weight: { attribute: "weight", meaning: "distance" } },
    ],
    "a run that says it read no weight but answers differently": [
        { table: "strength", answer: "A" },
        { table: "none", answer: "B" },
    ],
    "no run at all": [],
};
function plantedWeights() {
    const missed = [];
    for (const [name, rows] of Object.entries(PLANTED_WEIGHTS)) {
        const records = rows.map((r) => ({ algorithm: "x", directed: true, status: "succeeded", answer: "A", ...r }));
        if (!judgeWeights(records).length) missed.push(name);
    }
    return missed;
}
// in the page: load the table with each meaning and run every algorithm the catalog lists
async function weightRuns(page) {
    const csv = await readFile(join(FILES, "friends.csv"), "utf8");
    return page.evaluate(async (csv) => {
        const s = document.querySelector("graphty-element").session;
        const plain = csv
            .trim()
            .split("\n")
            .map((l) => l.split(",").slice(0, 2).join(","))
            .join("\n");
        const canon = (v) =>
            JSON.stringify(v ?? null, (k, x) => {
                if (/time|duration/i.test(k)) return undefined;
                if (ArrayBuffer.isView(x)) x = Array.from(x);
                if (x instanceof Map) return Object.fromEntries(x);
                if (x instanceof Set) return [...x];
                if (typeof x === "number") return Number.isFinite(x) ? Number(x.toPrecision(9)) : String(x);
                return x;
            });
        const records = [];
        for (const directed of [true, false])
            for (const table of ["strength", "distance", "capacity", "unset", "none"]) {
                const mapping = { rowsAre: "edges", source: "source", target: "target" };
                if (table === "none") mapping.weight = null;
                else Object.assign(mapping, { weight: "weight", weightMeaning: table === "unset" ? null : table });
                await s.data.import(
                    { type: "csv", config: { data: table === "none" ? plain : csv } },
                    { mapping, directed },
                );
                const ids = s.data.nodes().map((n) => n.id);
                for (const a of s.catalog.algorithms()) {
                    const params = {};
                    for (const o of a.options) {
                        if (o.type === "node-id") params[o.name] = /target|sink/i.test(o.name) ? ids.at(-1) : ids[0];
                        if (/seed/i.test(o.name)) params[o.name] = 42; // a random start would differ between tables
                    }
                    const r = { table, directed, algorithm: a.key };
                    try {
                        const run = s.runs.start(a.key, params, { as: `bar7_${a.key}` });
                        await Promise.resolve(run).catch(() => {});
                        Object.assign(r, {
                            status: run.status,
                            error: run.error?.code,
                            weight: run.caveats?.weight ?? null,
                            skipped: run.caveats?.weightSkipped ?? null,
                            answer: canon(run.result),
                        });
                        s.runs.remove(run.id);
                    } catch (e) {
                        r.status = `threw ${e.code ?? e.message}`;
                    }
                    records.push(r);
                }
            }
        return records;
    }, csv);
}

// ---------- tier 1's screens and bar 7, in this script's own browser (inside a browser slot) ----------
async function inner() {
    const TYPES = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".wasm": "application/wasm",
        ".woff2": "font/woff2",
        ".gml": "text/plain",
    };
    const { chromium } = await import(join(repo, "node_modules/playwright/index.mjs"));
    const http = createServer(async (req, res) => {
        const f = join(
            dist,
            normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, ""),
        );
        if (!f.startsWith(dist)) return res.writeHead(403).end();
        try {
            const body = await readFile(f);
            res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" }).end(body);
        } catch {
            if (extname(f)) return res.writeHead(404).end();
            res.writeHead(200, { "content-type": "text/html" }).end(await readFile(join(dist, "index.html")));
        }
    });
    await new Promise((ok) => http.listen(0, "127.0.0.1", ok));
    const origin = `http://127.0.0.1:${http.address().port}`;
    const browser = await chromium.launch(LAUNCH);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const fresh = async () => {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
        // Mantine's color scheme manager reads the reader's saved choice from this key
        await context.addInitScript((s) => localStorage.setItem("mantine-color-scheme-value", s), scheme);
        const page = await context.newPage();
        await page.goto(origin + "/?next", { waitUntil: "networkidle" });
        await page.waitForSelector("main, [role=main]");
        await sleep(800);
        return page;
    };

    const screens = {};
    const log = [];
    const axe = async (page, name) => (screens[name] = await axeViolations(page));
    async function step(page, name, fn) {
        try {
            await fn();
            await sleep(900);
            await axe(page, name);
            log.push(`ok   ${name}`);
        } catch (e) {
            log.push(`MISS ${name}: ${e.message.split("\n")[0]}`);
        }
    }

    // 1. start screen with the usage card, then without it
    let p = await fresh();
    await axe(p, "start screen with the usage card");
    const btn = (n) => p.getByRole("button", { name: n }).first();
    await step(p, "start screen", () => btn("No thanks").click());
    // 2. Les Miserables: the core path's screens
    await step(p, "loaded Graph place", async () => {
        await btn(/Open the Les Miserables/).click();
        await p.waitForFunction(() => document.querySelector("graphty-element")?.getNodes?.().length > 0, null, {
            timeout: 30000,
        });
        await p.evaluate(() => document.querySelector("graphty-element").waitForStableFrame?.({ timeoutMs: 15000 }));
    });
    const rest = await p.evaluate(wordsOnScreen);
    await step(p, "Analyze open", async () => {
        await p.evaluate(() => document.activeElement?.blur());
        await btn(/^Analyze/).click();
    });
    await step(p, "a finished run row", async () => {
        await p.keyboard.type("PageRank");
        await sleep(400);
        await p.keyboard.press("Enter");
        await sleep(600);
        await p.getByRole("button", { name: "Run", exact: true }).first().click();
        await sleep(3500);
    });
    await step(p, "Style tab with a label line", async () => {
        await p.getByRole("treeitem").filter({ hasText: "Everything" }).first().click();
        await p.getByRole("tab", { name: "Style" }).first().click();
        await btn("Add label line").click();
        await p.getByRole("option", { name: "name", exact: true }).first().click();
    });
    await step(p, "find box with results open", async () => {
        await p.evaluate(() => document.activeElement?.blur());
        await p.keyboard.press("/");
        await sleep(400);
        await p.keyboard.type("Javert");
    });
    await step(p, "a node's Values with its neighbors", async () => {
        await p.keyboard.press("ArrowDown");
        await p.keyboard.press("Enter");
        await sleep(600);
        await p.getByText("Degree", { exact: true }).first().click();
    });
    await step(p, "Export Image", () => p.keyboard.press("Control+e"));
    await step(p, "Export Data", () => p.getByRole("dialog").getByText("Data", { exact: true }).first().click());
    await step(p, "Data page", async () => {
        await p.keyboard.press("Escape");
        await btn("Data").click();
    });
    await step(p, "Save as", async () => {
        await btn("Graph").click();
        await p.keyboard.press("Control+s");
    });
    await p.context().close();
    // 3. the refusal of a broken file
    p = await fresh();
    await btn("No thanks").click();
    await step(p, "refusal of a broken file", async () => {
        const fc = p.waitForEvent("filechooser");
        await btn("Open project or file...").click();
        await (await fc).setFiles(join(FILES, "club-members.graphml"));
        await sleep(4000);
    });
    await p.context().close();
    // 4. bar 7 (a): a page with a graph open, so the element and its session are there
    p = await fresh();
    let weights = [];
    try {
        await btn("No thanks").click();
        await btn(/Open the Les Miserables/).click();
        await p.waitForFunction(() => document.querySelector("graphty-element")?.session, null, { timeout: 30000 });
        weights = await weightRuns(p);
        log.push(`ok   bar 7: ${weights.length} runs`);
    } catch (e) {
        log.push(`MISS bar 7: ${e.message.split("\n")[0]}`);
    }
    await browser.close();
    http.close();
    await writeFile(join(out, "inner.json"), JSON.stringify({ screens, log, rest, weights }) + "\n");
}

// ---------- tier 2's screens, walked with real.mjs sessions ----------
const REAL = join(here, "real.mjs");
// real.mjs's socket for a session folder (the same rule as its sockOf)
const sockOf = (dir) =>
    join("/tmp", `graphty-real-${createHash("sha1").update(resolve(dir)).digest("hex").slice(0, 12)}.sock`);
function ask(dir, req) {
    return new Promise((ok, fail) => {
        const c = connect(sockOf(dir));
        let buf = "";
        c.on("data", (d) => (buf += d));
        c.on("end", () => ok(JSON.parse(buf)));
        c.on("error", fail);
        c.write(JSON.stringify(req) + "\n");
    });
}
// the window sizes bar 10 counts at; bars 8 and 9 are measured at the first only
const SIZES = ["1440x900", "1280x800"];
const real = (size, ...a) => {
    const r = spawnSync(process.execPath, [REAL, ...a], {
        encoding: "utf8",
        env: { ...process.env, REAL_DIST: dist, REAL_VIEWPORT: size },
    });
    return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}`.trim() };
};
// a step that did not do what it says, or a screen that is not the one named
const MISSED =
    /nothing on screen is called|nothing in the open dialog|ambiguous:|could not click|only \d+ controls|SETUP FAILED|no live session|the tool failed|expected on screen, not there|expected gone, still on screen/;

// Each walk: a setup and a list of moves. A move's steps, one "--step value" per string as in a
// setup file, run as one real.mjs --step; an --expect in it confirms the screen arrived. Then the page
// is measured when the move names a bar 8 screen, an action after which focus must not fall to the
// page, a bar 9 (b) screen whose words are counted, or a screen only bar 10 counts on (audit).
const steps = (...lines) =>
    lines.flatMap((l) => (l.includes(" ") ? [l.slice(0, l.indexOf(" ")), l.slice(l.indexOf(" ") + 1)] : [l]));
const STEP = "weight is at least 4";
const ADD_STEP = ["--click weight", "--click Attribute actions", "--click Filter to...", "--click Value", "--type 4"];
const WALKS = [
    {
        name: "returning",
        setup: "friends-pagerank.txt",
        moves: [
            // the planted cases are measured on the empty Notes place: the planted blur, on the step
            // editor, leaves the editor, which saves the step, so "Add step" would be gone
            { do: steps("--click Data", ...ADD_STEP, "--expect Add step"), screen: "the step editor" },
            {
                do: steps("--click Add step", "--expect 19 of 20 nodes"),
                focus: "adding a filter step",
                screen: "Data place with a filter step on, and the header chip",
            },
            {
                do: steps(`--click Apply step: ${STEP}`, "--expect-not 19 of 20 nodes"),
                focus: "ticking a filter step",
                screen: "Data place with a filter step off",
            },
            { do: steps(`--click role=treeitem:${STEP}`, "--key Escape"), focus: "Escape from the step editor" },
            {
                do: steps(
                    `--rclick role=treeitem:${STEP}`,
                    "--click role=menuitem:Delete",
                    `--expect-not role=treeitem:${STEP}`,
                ),
                focus: "deleting a filter step",
            },
            { do: steps(...ADD_STEP, "--click Add step", "--expect 19 of 20 nodes") },
            { do: steps("--click Notes", "--expect No notes"), screen: "the Notes place, empty", plant: true },
            { do: steps("--key n", "--type Call the club", "--key Control+Enter"), focus: "saving a note" },
            {
                do: steps("--key Escape", "--key Escape", "--key n", "--type Book the hall", "--key Control+Enter"),
                screen: "the Notes place with two notes",
            },
            { do: steps("--key Control+o", "--upload team.csv", "--click Add") },
            { do: steps("--click Load", "--expect-not Add to friends"), focus: "Load (adding a table)" },
            {
                do: steps("--key Escape", "--key Escape", "--click role=button:Graph", "--expect From 2 files"),
                words: "returning rest screen",
            },
            // the rest of the walk on the whole graph: the step off again
            { do: steps("--click Data", `--click Apply step: ${STEP}`, "--click role=button:Graph") },
            {
                do: steps("--key p", "--key Escape", "--expect-not role=button:Find path"),
                focus: "Escape from the Path popover",
            },
            {
                do: steps(
                    "--key p",
                    "--type Chloe",
                    "--click role=option:Chloe",
                    "--click To",
                    "--type Milo",
                    "--click role=option:Milo",
                ),
                screen: "the Path popover",
            },
            {
                do: steps("--click Find path", "--expect Nodes in order"),
                focus: "Find path",
                screen: "a path run's Values",
                words: "a path run's inspector",
            },
            {
                do: steps(
                    "--key Escape",
                    "--key /",
                    "--type Ava",
                    "--key Enter",
                    "--key g",
                    "--click role=radio:2",
                    "--expect within 2 hops",
                ),
                screen: "the neighbor list with Hops and Follow",
                words: "the neighbor list with Hops and Follow",
            },
            { do: steps("--click Filter to neighbors"), focus: "Filter to neighbors" },
            {
                do: steps(
                    "--key Escape",
                    "--key /",
                    "--type Gus",
                    "--click Gus -> Ivan",
                    "--expect role=button:Edge actions",
                ),
                screen: "an edge's inspector",
                words: "an edge's inspector",
            },
            {
                do: steps("--click Edge actions", "--click Select endpoints", "--expect 2 nodes selected"),
                focus: "Select endpoints",
            },
            { do: steps("--key Escape", "--key /", "--type weight >= 4"), screen: "the find box with a rule hint" },
            { do: steps("--key Control+a", "--type =weight >= 4"), screen: "the find box with a refused rule" },
            { do: steps("--key Escape"), focus: "Escape in the find box" },
        ],
    },
    {
        name: "replace",
        setup: "friends-pagerank.txt",
        moves: [
            {
                do: steps(
                    "--click Data",
                    "--rclick role=treeitem:friends.csv",
                    "--click Replace with file...",
                    "--upload friends-v2.csv",
                ),
                screen: 'the Data page titled "Replace: ..."',
            },
            {
                do: steps("--click role=button:Replace", "--expect-not Replace: friends-v2.csv"),
                focus: "Load (a replacement)",
            },
            {
                do: steps("--click role=button:Graph", "--click role=treeitem:PageRank", "--expect role=button:Rerun"),
                screen: "an out-of-date run with its state bar",
            },
            { do: steps("--click Rerun"), focus: "Rerun" },
        ],
    },
    {
        name: "two-tables",
        setup: null,
        moves: [
            {
                do: steps(
                    "--click No thanks",
                    "--click New from data...",
                    "--click choose a file...",
                    "--upload people.csv",
                ),
            },
            {
                do: steps(
                    "--click Add a table",
                    "--click File...",
                    "--upload messages.csv",
                    "--expect 1 unmatched row",
                ),
                screen: "the Data page with two tables and an unmatched row",
            },
            { do: steps("--click Load", "--expect people and messages"), focus: "Load (two tables)" },
        ],
    },
    {
        // names of 40 or more characters and a 30-character column name
        name: "long-names",
        setup: null,
        moves: [
            {
                do: steps(
                    "--click No thanks",
                    "--click New from data...",
                    "--click choose a file...",
                    "--upload long-names.csv",
                    "--click Load",
                    "--expect-not role=button:Load",
                ),
            },
            {
                do: steps("--click Data", "--expect average_minutes_between_visits"),
                audit: "long names: the Data place",
            },
            {
                do: steps(
                    "--click role=button:Graph",
                    "--key /",
                    "--type Eastside Cold",
                    "--key Enter",
                    "--expect role=heading:Eastside Cold Storage and Packing Facility",
                ),
                audit: "long names: a node's inspector",
            },
            { do: steps("--key Escape", "--key /", "--type Northern"), audit: "long names: the find box" },
        ],
    },
];

async function walkTier2(base) {
    const screens = {};
    const names = {};
    const focus = {};
    const words = {};
    const cut = {};
    const raw = {};
    const log = [];
    const planted = [];
    const caught = [];
    for (const size of SIZES)
        for (const w of WALKS) {
            const first = size === SIZES[0];
            const dir = join(base, `${w.name}-${size}`);
            await rm(dir, { recursive: true, force: true });
            let r = real(size, "--start", dir, w.setup ? `setup:${w.setup}` : "empty");
            if (r.code !== 0) {
                log.push(`MISS ${w.name}: the session did not start: ${r.out.split("\n").slice(0, 3).join(" | ")}`);
                continue;
            }
            let lost = false;
            try {
                for (const m of w.moves) {
                    const label = `${m.screen || m.audit || m.focus || m.words || m.do.join(" ")} at ${size}`;
                    if (lost) {
                        log.push(`MISS ${label}: an earlier move missed`);
                        continue;
                    }
                    r = real(size, "--step", dir, ...m.do);
                    const shot = r.out.split("\n").pop();
                    if (MISSED.test(r.out)) {
                        lost = true;
                        log.push(`MISS ${label}: ${r.out.split("\n").filter((l) => MISSED.test(l))[0]} (${shot})`);
                        continue;
                    }
                    if (!m.screen && !m.audit && !(first && (m.focus || m.words))) continue;
                    const { data } = await ask(dir, { op: "measure" });
                    if (m.plant) {
                        // bar 10: a planted clipped name and a planted code, each found by screen and element
                        const pc = (await ask(dir, { op: "measure", plant: "cut" })).data;
                        const c = pc.cut.find((x) => x.text.startsWith("Planted cut") && !x.readable);
                        if (c) caught.push(`a clipped name: caught on "${label}", ${c.element}: "${c.text}"`);
                        else planted.push(`the cut-text check missed a planted clipped name on "${label}"`);
                        const pr = (await ask(dir, { op: "measure", plant: "raw" })).data;
                        const x = pr.raw.find((y) => y.text === "E_BAD_SELECTOR");
                        if (x)
                            caught.push(
                                `an E_BAD_SELECTOR string: caught on "${label}", ${x.element}: ${x.kind} ${x.text}`,
                            );
                        else planted.push(`the raw-string check missed a planted E_BAD_SELECTOR on "${label}"`);
                    }
                    if (m.screen || m.audit) {
                        cut[label] = data.cut; // every cut text, each with where it can be read whole
                        raw[label] = data.raw;
                    }
                    if (!first) continue;
                    if (m.plant) {
                        // each check must fail on its planted case before its readings are trusted
                        const img = (await ask(dir, { op: "measure", plant: "img" })).data;
                        if (!img.axe.some((v) => v.id === "image-alt" && serious(v)))
                            planted.push("axe missed an image with no text alternative");
                        else caught.push(`an image with no text alternative: caught by axe on "${label}"`);
                        const twins = (await ask(dir, { op: "measure", plant: "twins" })).data;
                        if (!twins.names.shared.some((g) => g.some((x) => x.includes("Planted twin"))))
                            planted.push("the shared-name check missed two buttons called Planted twin");
                        else caught.push(`two buttons called Planted twin: caught on "${label}"`);
                        const blur = (await ask(dir, { op: "measure", plant: "blur" })).data;
                        if (!blur.focusOnPage) planted.push("the focus check missed focus dropped to the page");
                        else caught.push(`focus dropped to the page: caught on "${label}"`);
                        if (data.focusOnPage)
                            planted.push("the focus check reported the page before anything was planted");
                    }
                    if (!data.names.controls) planted.push(`the shared-name check read no controls on "${label}"`);
                    if (m.screen) {
                        screens[m.screen] = data.axe;
                        names[m.screen] = data.names.shared;
                    }
                    if (m.focus) focus[m.focus] = data.focusOnPage;
                    if (m.words) words[m.words] = data.words;
                    log.push(`ok   ${label} (${shot})`);
                }
            } finally {
                real(size, "--end", dir);
            }
        }
    return { screens, names, focus, words, cut, raw, log, planted, caught };
}

async function outer() {
    await mkdir(out, { recursive: true });
    // tier 1's screens and bar 7 hold a browser slot of their own; tier 2's sessions take theirs
    const t1 = spawnSync(join(here, "with-browser.sh"), [process.execPath, self, ...args, "--inner"], {
        stdio: "inherit",
        env: { ...process.env, BROWSER_SLOT: "" },
    });
    const inn = JSON.parse(await readFile(join(out, "inner.json"), "utf8").catch(() => "null")) ?? {
        screens: {},
        log: [`MISS tier 1 and bar 7: the inner run stopped (exit ${t1.status})`],
        rest: { words: [], left: [] },
        weights: [],
    };
    const t2 = await walkTier2(join(out, "sessions"));
    const limits = JSON.parse(await readFile(join(here, "bars-limits.json"), "utf8").catch(() => "{}"));

    const weightProblems = judgeWeights(inn.weights);
    const weightPlantsMissed = plantedWeights();
    const notFinished = inn.weights.filter((r) => r.status !== "succeeded");
    const t1Failing = Object.values(inn.screens).flat().filter(serious);
    const t2Failing = Object.values(t2.screens).flat().filter(serious);
    const shared = Object.entries(t2.names).filter(([, g]) => g.length);
    const fell = Object.entries(t2.focus).filter(([, f]) => f);
    const counts = Object.fromEntries(Object.entries(t2.words).map(([k, v]) => [k, v.words.length]));
    const over = Object.entries(counts).filter(
        ([k, n]) => !n || (limits.words?.[k] !== undefined && n > limits.words[k]),
    );
    const unlimited = Object.keys(counts).filter((k) => limits.words?.[k] === undefined);
    const missed = [...inn.log, ...t2.log].filter((l) => l.startsWith("MISS"));
    const untrusted = [...t2.planted, ...weightPlantsMissed.map((n) => `the weight judge missed ${n}`)];

    const build = readFileSync(join(dist, "index.html"), "utf8").match(
        /<meta name="graphty-build" content="([^"]*)"/,
    )?.[1];
    await writeFile(
        join(out, "bars.json"),
        JSON.stringify(
            {
                build,
                scheme,
                measured: new Date().toISOString(),
                tags: AXE_TAGS,
                screens: inn.screens,
                wordsAtRest: inn.rest,
                tier2: { screens: t2.screens, sharedNames: t2.names, focusOnPage: t2.focus, words: t2.words },
                bar10: { cut: t2.cut, raw: t2.raw },
                planted: { caught: t2.caught, missed: untrusted },
                weights: { problems: weightProblems, notFinished, runs: inn.weights },
                untrusted,
                log: [...inn.log, ...t2.log],
            },
            null,
            1,
        ) + "\n",
    );
    console.log(`build ${build}, tier 1 in the ${scheme} scheme`);
    console.log([...inn.log, ...t2.log].join("\n"));
    console.log(`\nplanted cases, each check's claim beside its result:\n  ${t2.caught.join("\n  ")}`);
    if (untrusted.length) console.log(`\nNOT TRUSTED, a planted case was not caught:\n  ${untrusted.join("\n  ")}`);
    console.log(
        `\nbar 7 (a): ${inn.weights.length} runs, ${notFinished.length} did not finish; ${weightProblems.length} wrong readings`,
    );
    for (const p of weightProblems) console.log(`  ${p}`);
    for (const r of notFinished)
        console.log(
            `  did not finish: ${r.algorithm} on the ${r.table} table (${r.directed ? "directed" : "undirected"}): ${r.error ?? r.status}`,
        );
    console.log("\nbar 8 (axe), per screen: serious or critical / all violations");
    for (const [name, vs] of [...Object.entries(inn.screens), ...Object.entries(t2.screens)])
        console.log(
            `  ${name}: ${vs.filter(serious).length} / ${vs.length}${vs.length ? "  (" + vs.map((v) => `${v.id} ${v.impact} x${v.nodes.length}`).join(", ") + ")" : ""}`,
        );
    console.log("bar 8, controls sharing an accessible name (tier 2 screens):");
    for (const [name, g] of shared) console.log(`  ${name}: ${g.map((x) => x.join(" / ")).join("; ")}`);
    if (!shared.length) console.log("  none");
    console.log("bar 8, focus fallen to the page after:");
    for (const [name, f] of Object.entries(t2.focus)) console.log(`  ${f ? "FELL" : "kept"} ${name}`);
    console.log(
        `\nbar 9 (a): ${inn.rest.words.length} app words at rest (target <= 50); ${inn.rest.left.length} data words and numbers left out`,
    );
    console.log(`  ${inn.rest.words.join(" ")}`);
    console.log("bar 9 (b): app words on tier 2's screens (limit: round 1's count, bars-limits.json)");
    for (const [k, n] of Object.entries(counts))
        console.log(`  ${k}: ${n} (limit ${limits.words?.[k] ?? "not recorded"})  ${t2.words[k].words.join(" ")}`);
    console.log('\nbar 10, text cut off with no way to read it whole (screen: element "text"):');
    const unreadable = Object.entries(t2.cut).flatMap(([name, cs]) =>
        cs.filter((c) => !c.readable).map((c) => [name, c]),
    );
    for (const [name, c] of unreadable) console.log(`  ${name}: ${c.element} "${c.text}"`);
    if (!unreadable.length) console.log("  none");
    const readable = Object.values(t2.cut).flat().length - unreadable.length;
    console.log(
        `  (${readable} more cut but readable whole by a title, an accessible name, a tooltip or a copy on screen: bars.json)`,
    );
    console.log("bar 10, visible codes and field paths (screen: element kind text):");
    for (const [name, rs] of Object.entries(t2.raw))
        for (const r of rs) console.log(`  ${name}: ${r.element} ${r.kind} ${r.text}`);
    if (!Object.values(t2.raw).flat().length) console.log("  none");
    console.log(`\n${join(out, "bars.json")}`);
    const fail =
        untrusted.length ||
        missed.length ||
        weightProblems.length ||
        t1Failing.length ||
        t2Failing.length ||
        shared.length ||
        fell.length ||
        inn.rest.words.length === 0 ||
        inn.rest.words.length > 50 ||
        over.length ||
        unlimited.length;
    process.exit(fail ? 1 : 0);
}

if (args.includes("--inner")) await inner();
else await outer();
