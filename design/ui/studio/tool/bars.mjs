#!/usr/bin/env node
// Measures the studio's scripted bars on a production build of the graphty app (tier 1's
// ../criteria.md and tier 2's ../tier2/criteria.md):
//   bar 7 (a): every algorithm in the element's catalog run on friends.csv loaded with each weight
//          meaning (closer, farther, capacity, unset) and once with no weight column, both directed
//          and undirected; every run must read the weight in its own sense or not at all, and a run
//          that read no weight must give the same answer as on the table with no weight column
//   bar 8: axe-core (tags wcag2a, wcag2aa, wcag21aa, wcag22aa) on tier 1's core screens and tier 2's
//          screens -- a serious or critical violation fails; on tier 2's screens also no two
//          reachable controls sharing an accessible name, focus never fallen to the page after
//          the actions the criteria list, and the find list's active option scrolled into view when
//          ArrowDown passes the visible rows. When that scroll check holds, axe's
//          scrollable-region-focusable on the find list's viewport is an exception: the list is a
//          combobox driven by aria-activedescendant, so the keys reach every row with no tab stop
//   bar 9: the app's own words on screen at rest, data values, names (sources, files, tables,
//          columns and nodes, read from the session) and numbers left out: (a) tier
//          1's screen (Les Miserables, nothing selected, 1440 x 900) at most 50; (b) tier 2's four
//          screens no higher than round 1's counts in bars-limits.json
//   bar 10 (scripted counts): on every bar 8 tier 2 screen and on long-names.csv's Data place, a
//          node's inspector and the find box, at 1440 x 900 and 1280 x 800, each with its screen and
//          element: text cut off with no title, accessible name or tooltip giving it whole, and a
//          visible error code or field path (measure.mjs bar10). Reported as findings for the
//          experts' severity; they do not fail the run.
//
//   node bars.mjs <out dir> [--dist <build dir>] [--scheme dark|light]
//   node bars.mjs <out dir> --tier 3 [--dist <build dir>] [--record-limits]
//
// --tier 3 measures only tier 3's screens (../tier3/criteria.md): the Style panel reached from an
// empty app by clicking, as a first-time user reaches it -- a sample opened, Everything's Node and
// Edge tabs, a new layer and its picker with each kind of condition card, a color added and undone,
// a run's groups folder edited in bulk, two layers picked together, the color popover -- for bars 8
// (axe, shared names, focus kept after each action), 9 (words at rest, against the "tier3" counts in
// bars-limits.json; --record-limits writes them) and 10 (cut text, raw codes), at 1440 x 900 and
// 900 x 700. It also writes every measured screen's words and control names to vocabulary.json for
// wording.mjs. After adding a text card, a color and a shape it types a value with no click first
// (bar 8, "typed"): the value must be written, so focus landed where the next input goes; a planted
// case types on the start screen, where nothing takes text, and must fail.
//
// --scheme picks the app's color scheme for tier 1's screens (dark, the app's default, when left
// out); with --tier 3, given explicitly, it opens every tier 3 walk in that scheme (REAL_SCHEME), so
// bar 6 of ../tier3/criteria.md is walked once per theme. Tier 2's screens are walked with real.mjs sessions (REAL_DIST=<build dir>), each in its own
// browser slot. Before a check is trusted it must fail on a planted case: an image with no text
// alternative (axe), two buttons of one name, focus dropped to the page (also after each action
// added for the focus check), the active option scrolled out of the find list, a clipped name and an
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

import { AXE_TAGS, axeViolations, bar6Gaps, LAUNCH, serious, wordsOnScreen } from "./measure.mjs";

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
const TIER = args.includes("--tier") ? args[args.indexOf("--tier") + 1] : "2";
const RECORD = args.includes("--record-limits");

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
        await p.evaluate(() => document.querySelector("graphty-element").waitForStableFrame?.());
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
        await p
            .getByRole("button", { name: /^Run\b/ })
            .first()
            .click();
        await sleep(3500);
    });
    await step(p, "Style tab with a label line", async () => {
        await p.getByRole("treeitem").filter({ hasText: "Everything" }).first().click();
        await p.getByRole("tab", { name: "Style" }).first().click();
        await btn("Add to node text").click();
        await p
            .getByRole("menuitem", { name: /^Label/ })
            .first()
            .click();
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
// the window sizes bar 10 counts at, and (tier 3) bar 6's axe, shared-name, focus and typing checks,
// each proven at every size by its planted failure; bar 9's words are counted at the first only
const SIZES = args.includes("--size")
    ? [args[args.indexOf("--size") + 1]]
    : TIER === "3"
      ? ["1440x900", "900x700"]
      : ["1440x900", "1280x800"];
// --only <walk>[,<walk>] walks only those, --size <WxH> at one size only (a partial run, for writing
// a walk: every screen it leaves out is a MISS line)
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const real = (size, ...a) => {
    const r = spawnSync(process.execPath, [REAL, ...a], {
        encoding: "utf8",
        env: {
            ...process.env,
            REAL_DIST: dist,
            REAL_VIEWPORT: size,
            ...(TIER === "3" && si > 0 ? { REAL_SCHEME: scheme } : {}),
        },
    });
    return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}`.trim() };
};
// a step that did not do what it says, or a screen that is not the one named. "typed nothing" is
// matched itself: a batch stops at a failed --type, so a check after it in the batch no longer runs
const MISSED =
    /nothing on screen is called|nothing in the open dialog|ambiguous:|could not click|only \d+ controls|SETUP FAILED|no live session|the tool failed|expected on screen, not there|expected gone, still on screen|typed nothing, not "/;

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
            // leaving an off step's editor with no edit leaves the step off
            {
                do: steps(
                    `--click role=treeitem:${STEP}`,
                    "--click role=button:Graph",
                    "--expect-not 19 of 20 nodes",
                    "--click Data",
                    `--expect role=treeitem:${STEP}`,
                    "--expect-not 19 of 20 nodes",
                ),
                focus: "leaving an off step's editor unedited",
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
            {
                do: steps(
                    "--key Escape",
                    "--key Escape",
                    "--key n",
                    "--type Not this one",
                    "--click Cancel",
                    "--expect-not Not this one",
                ),
                focus: "Cancel in the note editor",
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
        // the focus check's actions found by hand in round 3, and the find list's scrolling; measured
        // at the first window size only, each focus action proven against a planted drop
        name: "focus-and-scroll",
        setup: "friends-pagerank.txt",
        only: SIZES[0],
        moves: [
            {
                do: steps(
                    "--key /",
                    "--type weight >= 4",
                    "--key ArrowDown",
                    "--key Enter",
                    "--expect 12 edges selected",
                    "--click role=tab:Style",
                    "--click Add to Line",
                    "--click role=menuitem:Color",
                ),
                focus: "Color chosen from Add to Line on a rule selection",
                proveFocus: true,
            },
            {
                // 18 rows down: past the 8 the list shows at 1440 x 900
                do: steps(
                    "--key Escape",
                    "--key Escape",
                    "--key Escape",
                    "--key /",
                    "--key Control+a",
                    "--type a",
                    ...Array(18).fill("--key ArrowDown"),
                ),
                scroll: "the find list after ArrowDown past its visible rows",
            },
            {
                // "shortest path" matches four descriptions; Shortest path is the fourth row on round
                // 3's build. The --expect fails the move if a build orders the rows otherwise.
                do: steps(
                    "--key Escape",
                    "--click role=button:Analyze",
                    "--type shortest path",
                    "--key ArrowDown",
                    "--key ArrowDown",
                    "--key ArrowDown",
                    "--key Enter",
                    "--expect role=button:Find path",
                ),
                focus: "Enter on Shortest path, found by typing 'shortest path' in the Analyze list",
                proveFocus: true,
            },
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

// Tier 3: the Style panel from an empty app, every step a click or a key as a first-time user makes
// it, on the start page the frozen build opens with ("Open a file", Samples); BAR6 in measure.mjs is
// what the walks must cover, and every screen, focus action and typing check it lists that the walks
// did not reach is a MISS line
const NEW_LAYER = ["--click Add a layer or a folder", "--click role=menuitem:Layer", "--key Enter"];
const SAMPLE = (name) => ["--click role=link:Samples", `--click Open the ${name} sample`];
const OPEN_FILE = (file) => ["--click Open a file", `--upload ${file}`];
const WALKS3 = [
    {
        name: "first-use",
        moves: [
            {
                // one Tab, so focus is on a control and the planted blur has somewhere to fall from
                do: steps("--key Tab", "--expect Open a file"),
                screen: "the start screen",
                plant: true,
                dataText: true,
            },
            {
                do: steps(...SAMPLE("Les Miserables"), "--expect Style layers"),
                screen: "a sample just opened",
                words: "a sample just opened",
            },
            {
                do: steps("--click role=button:Legend"),
                screen: "a sample just opened, the key switched on",
            },
            { do: steps("--click role=button:Legend") },
            {
                do: steps("--click role=treeitem:Everything", "--click role=tab:Style", "--expect Style nodes"),
                screen: "Everything, Node tab",
                words: "Everything, Node tab",
            },
            {
                do: steps("--click role=combobox:Shape", "--expect role=option:Box"),
                screen: "the open shape list",
            },
            { do: steps("--key Escape", "--expect-not role=option:Box") },
            { do: steps("--click role=tab:Edge", "--expect Style edges"), screen: "Everything, Edge tab" },
            { do: steps("--click Add to edge line"), screen: "the line menu" },
            { do: steps("--key Escape"), focus: "Escape from the line menu" },
            { do: steps("--click role=tab:Node", ...NEW_LAYER), focus: "adding a layer" },
            {
                do: steps("--click Which nodes", "--expect Add a condition"),
                screen: "a new layer, its picker open",
            },
            { do: steps("--click Add a condition", "--expect role=option:name"), screen: "the add-a-condition menu" },
            {
                do: steps("--click role=option:name"),
                focus: "adding a card",
                screen: "a text card",
                typed: {
                    as: "a new text card",
                    do: steps("--type Mme", "--expect 6 of 77"),
                    // no Escape first: it closes the picker and drops the unfinished card
                    recover: steps("--click name: text to match", "--key Control+a", "--type Mme", "--expect 6 of 77"),
                },
            },
            {
                // on T40 B's success path, letters typed after choosing the match kind reopened the menu
                do: steps("--click name: how to match", "--click role=option:Starts with"),
                focus: "choosing a text card's match kind",
                typed: {
                    as: "a text card after Starts with",
                    do: steps("--key Control+a", "--type Mlle", "--expect 3 of 77"),
                    recover: steps("--key Escape", "--click name: text to match", "--key Control+a", "--type Mlle"),
                },
            },
            {
                // back to the card the at-rest word count was recorded on
                do: steps(
                    "--click name: how to match",
                    "--click role=option:Contains",
                    "--click name: text to match",
                    "--key Control+a",
                    "--type Mme",
                    "--expect 6 of 77",
                    // the names that hold the text open under the box and cover Done; Tab closes them
                    "--key Tab",
                ),
            },
            {
                do: steps("--click Done", "--expect name contains Mme"),
                focus: "Done in the picker",
                screen: "a layer with a condition, at rest",
                words: "a layer with a condition, at rest",
            },
            {
                // Fill's "+" adds its one line, Color, with focus in its box
                do: steps("--click Add to node fill", "--expect Color"),
                focus: "adding a color",
                screen: "a color just added",
                typed: {
                    as: "a new Color line",
                    do: steps("--key Control+a", "--type purple", "--key Enter", "--expect 800080"),
                    recover: steps(
                        "--key Escape",
                        "--click Node color, set here",
                        "--key Control+a",
                        "--type purple",
                        "--key Enter",
                        "--expect 800080",
                    ),
                },
            },
            { do: steps("--key Control+z", "--expect-not 800080"), focus: "Undo" },
            { do: steps("--click Add to node text"), screen: "the text menu" },
            { do: steps("--key Escape"), focus: "Escape from the text menu" },
            { do: steps("--click Analyze", "--expect Degree"), screen: "the analysis list" },
            {
                // the analyses' one-line descriptions are words a prompt may echo
                do: steps("--type louvain", "--expect Louvain"),
                screen: "the analysis list, filtered to groups",
            },
            {
                do: steps("--key Enter", "--expect Resolution"),
                screen: "a groups analysis before it runs",
            },
            {
                // the run's groups land in a folder named for it, closed in the layer tree
                do: steps("--click Run", "--expect role=treeitem:Louvain"),
                focus: "running a groups analysis",
            },
            {
                do: steps("--click role=treeitem:Louvain", "--expect Which nodes"),
                screen: "a folder of groups",
                words: "a folder of groups",
            },
            { do: steps("--click role=tab:Edge"), screen: "a folder of groups, Edge tab" },
            {
                do: steps(
                    "--click role=tab:Node",
                    "--click Find nodes, edges, values",
                    "--type Javert",
                    "--expect Nodes 1",
                ),
                screen: "the find box, a name typed, its results",
            },
            {
                do: steps("--key Enter", "--click role=tab:Values", "--expect Memberships"),
                screen: "a node's inspector, its Memberships",
            },
            {
                do: steps("--click role=tab:Style", "--expect Why this look"),
                screen: "a node's own Style tab, its Fill + and Why this look",
            },
            {
                do: steps(
                    "--key Escape",
                    "--click role=treeitem:Everything",
                    "--ctrl-click role=treeitem:Layer 1",
                    "--expect 2 layers",
                ),
                screen: "two layers picked together",
                words: "two layers picked together",
            },
            {
                do: steps(
                    "--click role=treeitem:Everything",
                    ...NEW_LAYER,
                    "--click role=tab:Edge",
                    "--click Which edges",
                    "--click Add a condition",
                    "--click role=option:shared_chapters",
                    "--expect Between",
                ),
            },
            {
                do: steps("--click Done", "--expect shared_chapters"),
                focus: "Done in an Edge tab picker",
                screen: "a layer with an Edge tab condition, at rest",
            },
        ],
    },
    {
        // a colleague's project: what a layer someone else made picks out, and why (T50)
        name: "colleague",
        moves: [
            {
                do: steps(...OPEN_FILE("lesmis-poster.graphty.json"), "--expect role=treeitem:Poster"),
                screen: "a colleague's project just opened",
            },
            {
                do: steps("--click role=treeitem:Poster", "--expect Mlle"),
                focus: "selecting a colleague's layer",
                screen: "a colleague's layer selected",
            },
        ],
    },
    {
        name: "own-file",
        moves: [
            {
                do: steps(...OPEN_FILE("volunteers.graphml"), "--expect Load"),
                screen: "a file read, before loading",
                dataText: true,
            },
            { do: steps("--click Load", "--expect Style layers"), focus: "Load" },
            {
                do: steps(
                    ...NEW_LAYER,
                    "--click Which nodes",
                    "--click Add a condition",
                    "--click role=option:role",
                    "--expect Is any of",
                ),
                screen: "a category card",
            },
            // a value ticked, so the card is finished and Done keeps it as the first of four
            { do: steps("--click role=checkbox:volunteer", "--expect-not Dropped the condition") },
            {
                do: steps("--click Add a condition", "--click role=option:trained", "--expect Yes"),
                focus: "adding a yes/no card",
                screen: "a yes/no card",
            },
            {
                do: steps("--click Add a condition", "--click role=option:hours", "--expect Between"),
                screen: "a number card",
            },
            {
                do: steps(
                    "--click Add a condition",
                    "--click role=option:phone",
                    "--click phone: how to match",
                    "--click role=option:Has no value",
                ),
                screen: "a has-no-value card",
            },
            {
                do: steps("--click phone: how to match", "--key Escape", "--expect Done"),
                focus: "Escape from a card's menu",
            },
            {
                do: steps("--click Done"),
                focus: "Done after four cards",
                screen: "a layer with four conditions, at rest",
                words: "a layer with four conditions, at rest",
            },
            {
                do: steps(
                    "--click Add to node fill",
                    "--click Node color by attribute",
                    "--click role=option:role",
                    "--expect-not role=option:role",
                ),
                focus: "picking a column for a color",
                screen: "a color bound to a category column, with its key",
            },
            {
                do: steps("--click Node color: role", "--expect Change source"),
                screen: "the color popover of a category column",
            },
            { do: steps("--key Escape"), focus: "Escape from the color popover" },
            { do: steps("--click Add to node shape", "--click role=menuitem:Size"), focus: "adding a size" },
            { do: steps("--click Node size by attribute"), screen: "the size popover, before a column is picked" },
            { do: steps("--key Escape"), focus: "Escape from the size popover" },
            {
                do: steps(
                    "--click Node size by attribute",
                    "--click role=option:hours",
                    "--click Node size: hours",
                    "--expect Change source",
                ),
                screen: "the size popover of a number column",
            },
            { do: steps("--key Escape"), focus: "Escape from a bound size's popover" },
            {
                // last in its walk: a failed check leaves the walk where the next move need not start
                // with Size there, Shape's "+" adds its one line left, Shape
                do: steps("--click Add to node shape", "--expect role=combobox:Node shape"),
                focus: "adding a shape",
                typed: {
                    as: "a new Shape line",
                    do: steps("--type Box", "--key Enter", "--key Escape", "--expect Box"),
                },
            },
        ],
    },
    {
        // where bulk editing and picking by data meet: one card added to every layer of a run's folder
        name: "folder-picker",
        moves: [
            { do: steps(...OPEN_FILE("volunteers.graphml"), "--click Load", "--expect Style layers") },
            {
                do: steps(
                    "--click Analyze",
                    "--type louvain",
                    "--key Enter",
                    "--click Run",
                    "--expect role=treeitem:Louvain",
                ),
            },
            {
                do: steps(
                    "--click role=treeitem:Louvain",
                    "--click role=button:Which nodes",
                    "--click Add a condition",
                    "--click role=option:trained",
                    "--expect Yes",
                ),
                focus: "adding a card on a folder",
                screen: "a run's folder, its picker open, a card added to every layer",
                words: "a run's folder, its picker open, a card added to every layer",
            },
            { do: steps("--click Done"), focus: "Done in a folder's picker" },
            {
                do: steps("--click Node color: from each layer", "--expect Color from each layer"),
                screen: "the color from each layer dialog",
            },
            { do: steps("--key Escape"), focus: "Escape from the color from each layer dialog" },
        ],
    },
];

async function walkTier2(base) {
    const screens = {};
    const names = {};
    const focus = {};
    const scroll = {};
    const words = {};
    const cut = {};
    const raw = {};
    const log = [];
    const planted = [];
    const caught = [];
    const vocab = {};
    const typed = {};
    // what a screen says out loud: its controls' accessible names, and after each move what took
    // focus, what live regions said and the notices shown (real.mjs --sr), by move
    const spoken = {};
    // what bar 6 measured, by size: a name is added only once its check ran at that size
    const per = () => Object.fromEntries(SIZES.map((z) => [z, []]));
    const seen = { screens: per(), focus: per(), typed: per(), planted: per() };
    for (const size of SIZES)
        for (const w of TIER === "3" ? WALKS3 : WALKS) {
            const first = size === SIZES[0];
            // bar 6's readings at a later size are kept under "<name> at <size>", so a failure there
            // fails the run beside the first size's (bar 8's word counts and the wording check's
            // vocabulary stay at the first size, where their limits were recorded)
            const at = (k) => (first ? k : `${k} at ${size}`);
            if (w.only && w.only !== size) continue;
            if (ONLY && !ONLY.includes(w.name)) continue;
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
                    const label = `${m.screen || m.audit || m.focus || m.scroll || m.words || m.do.join(" ")} at ${size}`;
                    if (lost) {
                        log.push(`MISS ${label}: an earlier move missed`);
                        continue;
                    }
                    r = real(size, "--step", dir, ...m.do);
                    const shot = r.out.split("\n").pop();
                    // a notice the app took down before the screenshot, which a person watching read
                    const said = r.out
                        .split("\n")
                        .filter((l) => l.startsWith("a notice showed"))
                        .map((l) => l.replace(/^a notice showed and went before this screenshot: /, "notice: "));
                    if (TIER === "3" && first && said.length) spoken[label.replace(/ at \S+$/, "")] = { said };
                    // exit 2: a step refused before anything ran (a pointer step in keyboard-only mode)
                    if (r.code === 2 || MISSED.test(r.out)) {
                        lost = true;
                        log.push(`MISS ${label}: ${r.out.split("\n").filter((l) => MISSED.test(l))[0]} (${shot})`);
                        continue;
                    }
                    // focus landed where the next input goes: the value typed with no click is written.
                    // A miss is a bar 8 finding, not a lost walk: recover by clicking into the field
                    if (m.typed) {
                        const t = real(size, "--step", dir, ...m.typed.do);
                        const ok = t.code !== 2 && !MISSED.test(t.out);
                        typed[at(m.typed.as)] = ok;
                        seen.typed[size].push(m.typed.as);
                        if (!ok && m.typed.recover) {
                            const rr = real(size, "--step", dir, ...m.typed.recover);
                            if (rr.code === 2 || MISSED.test(rr.out)) {
                                lost = true;
                                log.push(`MISS ${label}: recovering after typing into ${m.typed.as} failed`);
                                continue;
                            }
                        }
                    }
                    if (!m.screen && !m.audit && !m.focus && !(first && (m.words || m.scroll))) continue;
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
                    if (m.plant) {
                        // each check must fail on its planted case, at every size, before its readings
                        // there are trusted
                        const proved = (kind, ok, yes, no) => {
                            if (ok) {
                                caught.push(yes);
                                seen.planted[size].push(kind);
                            } else planted.push(no);
                        };
                        const img = (await ask(dir, { op: "measure", plant: "img" })).data;
                        proved(
                            "axe",
                            img.axe.some((v) => v.id === "image-alt" && serious(v)),
                            `an image with no text alternative: caught by axe on "${label}"`,
                            `axe missed an image with no text alternative on "${label}"`,
                        );
                        const twins = (await ask(dir, { op: "measure", plant: "twins" })).data;
                        proved(
                            "shared names",
                            twins.names.shared.some((g) => g.some((x) => x.includes("Planted twin"))),
                            `two buttons called Planted twin: caught on "${label}"`,
                            `the shared-name check missed two buttons called Planted twin on "${label}"`,
                        );
                        const blur = (await ask(dir, { op: "measure", plant: "blur" })).data;
                        if (data.focusOnPage)
                            planted.push(`the focus check reported the page before anything was planted on "${label}"`);
                        proved(
                            "focus",
                            blur.focusOnPage && !data.focusOnPage,
                            `focus dropped to the page: caught on "${label}"`,
                            `the focus check missed focus dropped to the page on "${label}"`,
                        );
                        if (TIER === "3") {
                            // nothing on the start screen takes text, so typing must not write
                            const t = real(size, "--step", dir, "--type", "Plantedtext", "--expect", "Plantedtext");
                            proved(
                                "typing",
                                MISSED.test(t.out),
                                `typing with focus in no field: caught on "${label}"`,
                                `the typed check missed typing with focus in no field on "${label}"`,
                            );
                        }
                    }
                    if (!data.names.controls) planted.push(`the shared-name check read no controls on "${label}"`);
                    if (m.screen) {
                        screens[at(m.screen)] = data.axe;
                        names[at(m.screen)] = data.names.shared;
                        seen.screens[size].push(m.screen);
                        const k = label.replace(/ at \S+$/, "");
                        if (first)
                            spoken[k] = { names: data.names.all, said: [...(spoken[k]?.said ?? []), ...data.spoken] };
                    }
                    if (m.focus) {
                        focus[at(m.focus)] = data.focusOnPage;
                        seen.focus[size].push(m.focus);
                    }
                    if (m.proveFocus) {
                        const b = (await ask(dir, { op: "measure", plant: "blur" })).data;
                        if (b.focusOnPage) caught.push(`focus dropped to the page: caught after "${label}"`);
                        else planted.push(`the focus check missed focus dropped to the page after "${label}"`);
                    }
                    if (m.scroll) {
                        scroll[m.scroll] = data.activeInView;
                        const u = (await ask(dir, { op: "measure", plant: "unscroll" })).data;
                        if (u.activeInView?.inView === false)
                            caught.push(`the active option scrolled out of view: caught on "${label}"`);
                        else
                            planted.push(
                                `the scroll check missed the active option scrolled out of view on "${label}"`,
                            );
                    }
                    if (!first) {
                        log.push(`ok   ${label} (${shot})`);
                        continue;
                    }
                    if (m.words) words[m.words] = data.words;
                    // a screen whose text is mostly the data's (the samples' descriptions, a file's rows) gives
                    // the wording check its control names only
                    if (m.screen)
                        vocab[m.screen] = { words: m.dataText ? [] : data.words.words, names: data.names.all };
                    log.push(`ok   ${label} (${shot})`);
                }
            } finally {
                real(size, "--end", dir);
            }
        }
    if (TIER === "3" && !Object.keys(typed).length) planted.push("the typed check typed into no field");
    // bar 6's list, measured at every size: a screen, focus action, typing check or planted failure
    // the walks never reached
    const walked = seen;
    if (TIER === "3") log.push(...bar6Gaps(walked, SIZES));
    return { screens, names, focus, scroll, words, cut, raw, log, planted, caught, vocab, typed, spoken, walked };
}

async function outer() {
    await mkdir(out, { recursive: true });
    // tier 1's screens and bar 7 hold a browser slot of their own; tier 2's sessions take theirs
    // tier 3 measures its own screens only: tier 1's and bar 7 belong to the earlier tiers' bars
    const t1 =
        TIER === "3"
            ? null
            : spawnSync(join(here, "with-browser.sh"), [process.execPath, self, ...args, "--inner"], {
                  stdio: "inherit",
                  env: { ...process.env, BROWSER_SLOT: "" },
              });
    const inn = (t1 && JSON.parse(await readFile(join(out, "inner.json"), "utf8").catch(() => "null"))) ?? {
        screens: {},
        log: t1 ? [`MISS tier 1 and bar 7: the inner run stopped (exit ${t1.status})`] : [],
        rest: { words: TIER === "3" ? ["(tier 1 not measured)"] : [], left: [] },
        weights: [],
    };
    const t2 = await walkTier2(join(out, "sessions"));
    const allLimits = JSON.parse(await readFile(join(here, "bars-limits.json"), "utf8").catch(() => "{}"));
    if (TIER === "3" && RECORD) {
        const build0 = readFileSync(join(dist, "index.html"), "utf8").match(
            /<meta name="graphty-build" content="([^"]*)"/,
        )?.[1];
        allLimits.tier3 = {
            about: "Bar 9 for tier 3: the app's words at rest on tier 3's screens, counted by bars.mjs --tier 3 --record-limits; a later build's count may not rise above these",
            build: build0,
            measured: new Date().toISOString().slice(0, 10),
            // a limit only falls: a screen keeps the lower of its recorded count and this build's
            words: Object.fromEntries(
                Object.entries(t2.words).map(([k, v]) => [
                    k,
                    Math.min(v.words.length, allLimits.tier3?.words?.[k] ?? Infinity),
                ]),
            ),
        };
        await writeFile(join(here, "bars-limits.json"), JSON.stringify(allLimits, null, 4) + "\n");
    }
    const limits = TIER === "3" ? (allLimits.tier3 ?? {}) : allLimits;
    if (TIER === "3") {
        await writeFile(join(out, "vocabulary.json"), JSON.stringify(t2.vocab, null, 1) + "\n");
        await writeFile(join(out, "spoken.json"), JSON.stringify(t2.spoken, null, 1) + "\n");
    }

    const weightProblems = TIER === "3" ? [] : judgeWeights(inn.weights);
    const weightPlantsMissed = TIER === "3" ? [] : plantedWeights();
    const notFinished = inn.weights.filter((r) => r.status !== "succeeded");
    const scrolled = Object.entries(t2.scroll).filter(([, a]) => !a?.inView);
    // axe's scrollable-region-focusable on the find list's viewport, excused only while the scroll
    // check shows the keys bring every row into view
    const excused = (v) =>
        Object.keys(t2.scroll).length > 0 &&
        !scrolled.length &&
        v.id === "scrollable-region-focusable" &&
        v.nodes.every((n) => n.html.includes("ws-find-viewport"));
    const exceptions = [...Object.entries(inn.screens), ...Object.entries(t2.screens)].flatMap(([k, vs]) =>
        vs.filter(excused).map((v) => `${k}: ${v.id} on ${v.nodes.map((n) => n.target).join(", ")}`),
    );
    const t1Failing = Object.values(inn.screens)
        .flat()
        .filter(serious)
        .filter((v) => !excused(v));
    const t2Failing = Object.values(t2.screens)
        .flat()
        .filter(serious)
        .filter((v) => !excused(v));
    const shared = Object.entries(t2.names).filter(([, g]) => g.length);
    const fell = Object.entries(t2.focus).filter(([, f]) => f);
    const unwritten = Object.entries(t2.typed).filter(([, ok]) => !ok);
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
                tier: TIER,
                tags: AXE_TAGS,
                screens: inn.screens,
                wordsAtRest: inn.rest,
                tier2: {
                    screens: t2.screens,
                    sharedNames: t2.names,
                    focusOnPage: t2.focus,
                    typedWithNoClick: t2.typed,
                    activeOptionInView: t2.scroll,
                    words: t2.words,
                },
                exceptions,
                // what the walks reached, by bar 6's names: real.mjs --gate checks it against BAR6
                walked: t2.walked,
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
    if (TIER === "3") {
        console.log("bar 8, a value typed with no click is written into:");
        for (const [name, ok] of Object.entries(t2.typed)) console.log(`  ${ok ? "written" : "NOT WRITTEN"} ${name}`);
    }
    console.log("bar 8, the find list's active option after ArrowDown:");
    for (const [name, a] of Object.entries(t2.scroll))
        console.log(
            `  ${a?.inView ? "in view" : a ? "OUT OF VIEW" : "NO ACTIVE OPTION"} ${name}${a ? `: "${a.option}"` : ""}`,
        );
    console.log("bar 8, axe hits excused by the scroll check:");
    for (const e of exceptions) console.log(`  ${e}`);
    if (!exceptions.length) console.log("  none");
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
        unwritten.length ||
        scrolled.length ||
        (TIER !== "3" && (inn.rest.words.length === 0 || inn.rest.words.length > 50)) ||
        over.length ||
        unlimited.length;
    process.exit(fail ? 1 : 0);
}

if (args.includes("--inner")) await inner();
else await outer();
