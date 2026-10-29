#!/usr/bin/env node
// Drives the real graphty app (the tier 1 workspace, from a production build) the way a study
// participant does: one live browser per session, a step at a time, a numbered PNG after each.
//
//   node real.mjs --start <session dir> [empty | setup:<setup file>] [--sr]
//       opens the app with clean storage (a new browser profile on disk, as a person's browser
//       keeps it, not an incognito one) in a browser held for the whole session, runs the setup
//       steps (never shown to the participant), saves 01.png and writes session.json (the commit
//       under study, the URL). A setup file holds one step per line, "--click Open the ... sample";
//       a blank line or one starting with # is skipped. A setup step that misses fails the start.
//       --sr (screen-reader mode): after every step, prints what a screen reader would say: the
//       focused element's role, accessible name, value and states ("focus: ..."), and the text of
//       every live region that appeared or changed ("live: ..."). A focused control that points at a
//       highlighted option (aria-activedescendant) is reported with that option, as a screen reader
//       reads it. A region that arrived with its text already in it is marked unconfirmed: many
//       screen readers read only a change to a region already on the page (role=alert excepted).
//       A session of a round (rounds/<round>/sessions/<id>) starts only once --gate has passed for
//       the frozen build. REAL_SLOT_WAIT_SECONDS=<s> gives up after that long without a free
//       browser slot: exit 4, nothing started, run it again.
//   node real.mjs --step <session dir> <steps...>
//       acts on the live session, waits for the drawing to settle, saves the next NN.png and prints
//       what a participant would notice
//   node real.mjs --end <session dir>
//       closes the browser and frees its browser slot; a participant's folder is copied to the
//       round's, adding files and never removing or rewriting a note already there
//   node real.mjs --leaks <session dir | round dir>
//       what the participant opened outside its folder; a session whose log it cannot read fails
//   node real.mjs --gate <round dir>
//       refuses a round with no pilot of a planned task half or no bars run on the frozen build; on
//       exit 0 it writes the plan's "Gate evidence" section, without which --start refuses (exit 1)
//       every session of the round
//   node real.mjs --replay <walk folder | route.jsonl> <session dir> [--end-on-diverge] [--keep]
//       runs a saved route again (every session saves its own as route.jsonl) and stops, the session
//       left open, at the first step whose check points differ from the route's (exit 5)
//   node real.mjs --rewalk <old walks folder> <new walks folder> [--only <walk>,...]
//       replays every route under the old folder into the new one; rewalk.json says which diverged
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
//   --expect | --expect-not "<text>"  (role=<role>, role=<role>:<name>, selected=N, described=<text>);
//                          text and roles are waited for up to 2 s
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
import {
    appendFileSync,
    closeSync,
    existsSync,
    mkdirSync,
    openSync,
    readdirSync,
    readFileSync,
    readSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { appendFile, cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { connect, createServer as netServer } from "node:net";
import { homedir } from "node:os";
import { basename, dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

import {
    activeInView,
    axeViolations,
    bar6Gaps,
    bar10,
    drawnColors,
    focusOnPage,
    keyShown,
    LAUNCH,
    NAME_CHARS,
    nodeColors,
    openWork,
    plant,
    sameNames,
    styleChanges,
    styleContent,
    styleTree,
    unplant,
    wordsOnScreen,
    workGone,
} from "./measure.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../..");
// REAL_DIST serves a copy of a build instead, one a rebuild cannot replace mid-session
const dist = process.env.REAL_DIST ? resolve(process.env.REAL_DIST) : join(repo, "graphty/dist");
const files = join(here, "files");
// tier 2's files: the default, and what --prove plants against
const tier2 = join(here, "../tier2");
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

// GPU rendering. Headless Chromium draws WebGL with SwiftShader, a software rasterizer: each idle
// graphty page burned 550-690% CPU, so four study browsers loaded the machine past 47 and every step
// waited on the CPU. Through ANGLE on Vulkan the RTX 4070 draws the same page for 27-51% (2026-10-21).
// This machine has no system libEGL.so.1, and without one these flags HANG the first page instead of
// failing, so the launch reads the extracted copy (REAL_EGL_DIR, else the main checkout's tmp/egl;
// rebuild it with: apt-get download libegl1 libglvnd0; dpkg -x each .deb into tmp/egl/root).
// REAL_GPU=0 runs SwiftShader on purpose (a machine with no GPU); otherwise a session whose renderer
// is not the GPU fails its start loudly, never quietly falls back to software.
const GPU = process.env.REAL_GPU !== "0";
const MAIN = dirname(
    spawnSync("git", ["-C", here, "rev-parse", "--path-format=absolute", "--git-common-dir"], {
        encoding: "utf8",
    }).stdout.trim(),
);
const EGL = process.env.REAL_EGL_DIR || join(MAIN, "tmp/egl/root/usr/lib/x86_64-linux-gnu");
const GPU_ARGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-angle=vulkan",
    "--disable-vulkan-surface",
];
function gpuLaunch() {
    if (!GPU) return {};
    if (!existsSync(join(EGL, "libEGL.so.1")))
        throw new Error(
            `GPU rendering needs libEGL.so.1 in ${EGL} (without it the GPU flags hang the first page): mkdir -p tmp/egl && cd tmp/egl && apt-get download libegl1 libglvnd0 && dpkg -x libegl1_*.deb root && dpkg -x libglvnd0_*.deb root, in the main checkout; or REAL_GPU=0 for SwiftShader`,
        );
    return {
        args: GPU_ARGS,
        env: { ...process.env, LD_LIBRARY_PATH: [EGL, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":") },
    };
}
// The WebGL renderer the page draws with, as the GPU reports it
const rendererOf = (page) =>
    page
        .evaluate(() => {
            const g = document.createElement("canvas").getContext("webgl2");
            const e = g?.getExtension("WEBGL_debug_renderer_info");
            return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "no WebGL";
        })
        .catch((e) => `unknown (${e.message.split("\n")[0]})`);
const onGpu = (r) => !/SwiftShader|llvmpipe|softpipe|Software|no WebGL|unknown/i.test(r);

// a fixed folder, not TMPDIR, so every agent finds the same session from the same session dir
const sockOf = (dir) =>
    join("/tmp", `graphty-real-${createHash("sha1").update(resolve(dir)).digest("hex").slice(0, 12)}.sock`);
const fileArg = (f) => (existsSync(resolve(f)) ? resolve(f) : join(files, f));

// ---------- where a participant's session lives ----------
// The studio's own files (tasks.md, answers.md, criteria.md, roster.md, plans, grades) live under
// STUDIO. A participant whose session folder sat inside it read tasks.md three folders up (r2-s05),
// so a participant's session runs in a folder of its own under SCRATCH, mirroring the studio path
// the facilitator names it by, and --end copies it back there for the graders.
const STUDIO = resolve(here, "..");
const SCRATCH = join(repo, "tmp/studio-sessions");
const under = (p, root) => p === root || p.startsWith(root + "/");
const ROUND_SESSION = /\/rounds\/[^/]+\/sessions\/[^/]+$/;
const scratchOf = (dir) => (under(dir, STUDIO) && dir !== STUDIO ? join(SCRATCH, dir.slice(STUDIO.length + 1)) : dir);
const studioOf = (dir) => (under(dir, SCRATCH) && dir !== SCRATCH ? join(STUDIO, dir.slice(SCRATCH.length + 1)) : null);
// The study tier a folder belongs to: the first part of its path under the studio's files or under
// the participants' copy of them (tier3/rounds/round-1/sessions/r1-s01), else REAL_TIER, else 2.
// Every tier keeps its tasks, answers, roster and criteria in tier<N>/ and its setups in
// rounds/tier-<N>/setups/ (with one fixed tier 2 path, a tier 3 round would brief tier 2 prompts).
function tierOf(dir) {
    const d = dir ? resolve(dir) : "";
    const rel = under(d, STUDIO) ? d.slice(STUDIO.length + 1) : under(d, SCRATCH) ? d.slice(SCRATCH.length + 1) : "";
    return rel.match(/^tier(\d+)(?:\/|$)/)?.[1] ?? (process.env.REAL_TIER || "2");
}
const tierFiles = (dir) => join(here, `../tier${tierOf(dir)}`);
const setupsOf = (dir) => join(here, `../rounds/tier-${tierOf(dir)}/setups`);
const frozenSha = (dir) =>
    readFileSync(join(tierFiles(dir), "criteria.md"), "utf8").match(/build ([0-9a-f]{7,40})/)?.[1];
const briefed = (dir) => {
    const f = join(dir, "briefing.md");
    return existsSync(f) && readFileSync(f, "utf8").includes(`--start ${dir} `);
};
// Pilot, dry-run and readiness walks (rounds/r1, rounds/r1d2, rounds/round-2/pilot ...) keep their
// screenshots and step files in the main checkout's tmp/design-studio/<tier>/<round or pass>/, which
// git ignores; only a walk's report.md belongs in the studio's files. On 2026-10-21 golden held
// 83,000 walk screenshots (9.9 GB in Git LFS) because walks wrote them beside their reports.
const WALKS = join(MAIN, "tmp/design-studio");
// a studio folder under rounds/ as its place under WALKS (tier 1's rounds/ has no tier folder), or null
const walksOf = (dir) => {
    const m = under(dir, STUDIO) && dir.slice(STUDIO.length + 1).match(/^(?:(tier\d+)\/)?rounds\/(.+)$/);
    return m ? join(WALKS, m[1] || "tier1", m[2]) : null;
};
const WALK_IN_ROUNDS = /\/rounds\/(?:r\d[^/]*|[^/]+\/pilot)(?:\/|$)/;
// why a walk must not write into this folder, or null
function walkRefusal(dir) {
    if (!under(dir, STUDIO) || !WALK_IN_ROUNDS.test(dir.slice(STUDIO.length))) return null;
    return `${dir} is a walk folder inside the studio's files; walks write under ${WALKS} (git ignores it): use ${walksOf(dir)}`;
}
// a round's readiness walks: under WALKS, or the round's own pilot/ for a round walked before 2026-10-21
function readinessOf(rd) {
    const t = walksOf(join(rd, "pilot"));
    return t && (existsSync(t) || !existsSync(join(rd, "pilot"))) ? t : join(rd, "pilot");
}
// why --start must not open this folder for a participant, or null
function participantRefusal(dir) {
    if (under(dir, STUDIO) && (ROUND_SESSION.test(dir) || existsSync(join(dir, "briefing.md"))))
        return `${dir} is a participant's session inside the studio's files, a few folders below tasks.md and the answers; brief it (real.mjs --brief ${dir}) and start the folder that prints, ${scratchOf(dir)}`;
    if (under(dir, SCRATCH) && !briefed(dir))
        return `${dir} holds no briefing.md written for it by --brief; run real.mjs --brief ${studioOf(dir)} first`;
    return null;
}

// ---------- the participant's side of the study: briefing, follow-up, clean folder ----------
// A session folder rounds/round-N/sessions/<id>/ has its task, half, persona and start in the
// round's plan.md table ("| r1-s04 | T20 | B: hiking trails ... | Jordan (analyst) | `empty` |").
// An explicit --task T17A (with --persona <name> for --brief) stands in for a folder with no plan.
function sessionTask(dir, task, persona) {
    let start = null;
    if (!task) {
        const home = studioOf(resolve(dir)) ?? resolve(dir);
        const plan = join(dirname(dirname(home)), "plan.md");
        const rows =
            existsSync(plan) &&
            readFileSync(plan, "utf8")
                .split("\n")
                .map((l) => l.split("|").map((c) => c.trim()));
        // a void session's re-run (r2-s05b) takes its first run's row
        const id = basename(home);
        const row = rows && (rows.find((c) => c[1] === id) ?? rows.find((c) => c[1] === id.replace(/b$/, "")));
        if (!row) return null;
        task = row[2] + (row[3].match(/^([AB]):/)?.[1] ?? "");
        persona ??= row[4];
        start = row[5]?.replaceAll("`", "") || null;
    }
    const m = task.match(/^(T\d+R?)([AB])$/);
    return m && { task: m[1], half: m[2], persona: persona?.split(/[\s(]/)[0] ?? null, start, tier: tierOf(dir) };
}
const tasksText = (tier) => readFileSync(join(here, `../tier${tier ?? 2}`, "tasks.md"), "utf8");
const sectionOf = (text, head) => {
    const at = text.search(new RegExp(`^### ${head}\\.`, "m"));
    if (at < 0) return null;
    const rest = text.slice(at + 4);
    const end = rest.search(/^#{2,3} /m);
    return end < 0 ? rest : rest.slice(0, end);
};
const oneLine = (t) => t.replace(/\s+/g, " ").trim();
// The half's prompt and its follow-up (any task with a Follow-up block), word for word from tasks.md
function taskWords(t) {
    const sec = sectionOf(tasksText(t.tier), t.task);
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
// "Evidence limits" says how far the study team may trust the persona ("Weight findings on import ...
// over findings on her words"): for the team, not the participant (round 1's tool dry run 2)
// "Why this persona exists" says what the studio needs the persona for (Sam's: "the studio's keyboard
// bar ... beside the screen-reader user, Morgan"): the team's reason, not the persona's (dry run 3)
const TEAM_ONLY = /facilitator|study team|for the real study|hypothes|evidence limits|why this persona exists/i;
// a playing rule addressed to whoever runs the session about the design's hypotheses ("Do not show
// her the design's hypotheses.", Nadia's): one list item, so the rest of the rules stay
const TEAM_RULE = /^- [^\n]*\bdesign'?s? hypothes[^\n]*(?:\n[ \t]+[^\n]*)*\n?/gim;
const TEAM_NOTE =
    /^\W*evidence limits\b|\bfindings?\b[^.]*\b(weigh|trust)|\b(weigh|trust)\w*\b[^.]*\bfindings?\b|\bhypothesis to test\b/i;
const TEAM_SENTENCE = /;?[^.!?;]*\bfindings?\b[^.!?;]*\b(rest on|lead to check|weigh|trust)[^.!?]*[.!?]/gi;
// a path into the study's files, or a pointer to the team's hypotheses file
const STUDY_PATH = /`[^`\s]*\b(?:study|hypotheses)\/[^`\s]*`|\bhypotheses file\b/i;
function personaText(text) {
    return (
        text
            // a line that is only a closing tag is markup left in the file, never the persona's words
            .replace(/^<\/[a-z]+>[ \t]*$/gim, "")
            .split(/^(?=## )/m)
            .filter((s) => !TEAM_ONLY.test(s.split("\n")[0]))
            .join("")
            // a paragraph that points at a team-only section ("'Facilitator notes' at the end is for the
            // moderator", Dana's intro) is itself for the team, and the briefing check would refuse it
            .split(/\n[ \t]*\n/)
            .filter((p) => !FACILITATOR_WORDS.test(p))
            // a note to the team inside the persona's own text: how much its findings weigh
            // ("Evidence limits: ...", Nadia's; "Findings that rest on her exact vocabulary ... carry
            // less weight", Elena's)
            .filter((p) => !TEAM_NOTE.test(p))
            // and one sentence of it inside a paragraph ("No single finding may rest on the short clock
            // alone.", "treat a vocabulary finding as a lead to check", Elena's)
            .map((p) => p.replace(TEAM_SENTENCE, (m) => (m.startsWith(";") ? "." : "")))
            .map((p) => p.replace(TEAM_RULE, "").trimEnd())
            // a paragraph that points at the study's own files ("See `study/hypotheses/x.md` for the
            // design hypotheses", "the design team's guesses ... live in a separate hypotheses file")
            // sends a participant to team material
            .filter((p) => !STUDY_PATH.test(p))
            .join("\n\n")
            .trim()
    );
}
// What a task asks a participant to find in the files, listed in the answer key under "Facts no
// briefing may hold" (round 4's briefings named the two new people and the rows with no node row in
// their file table). Kept there, not here: a participant may read this file.
function answerFacts(tier = "2") {
    const answers = join(here, `../tier${tier}`, "answers.md");
    const sec = readFileSync(answers, "utf8").match(/^## Facts no briefing may hold\n([\s\S]*?)(?=^## )/m)?.[1];
    const facts = [...(sec ?? "").matchAll(/^- (.*)$/gm)].flatMap(([, l]) =>
        [...l.split(" -- ")[0].matchAll(/`([^`]+)`/g)].map((m) => m[1]),
    );
    if (!facts.length) throw new Error(`${answers} lists no "Facts no briefing may hold"`);
    return facts;
}
// a whole word: not inside another, nor in a name joined by "-" (session r5-s11 is not the row s11)
const factsIn = (text, tier) =>
    answerFacts(tier).filter((f) => new RegExp(`(?<![\\w-])${reEscape(f)}(?![\\w-])`).test(text));
// --brief: writes <dir>/briefing.md, everything a participant gets (tasks.md, "Rules for whoever runs
// a session"): the persona files and the history under their name, the prompt word for word, the
// start command and the tool's participant instructions. Never the follow-up, the avoided words,
// the success path or another persona.
async function brief(dir, task, persona) {
    dir = resolve(dir);
    const t = sessionTask(dir, task, persona);
    // the participant's own folder: outside the studio's files, whatever folder the facilitator named
    const own = scratchOf(dir);
    if (!t)
        return `--brief: no task for ${dir} (no row for it in the round's plan.md; pass --task T17A --persona <name>)`;
    const words = taskWords(t);
    if (!words?.prompt) return `--brief: tasks.md has no Prompt ${t.half} for ${t.task}`;
    const tierDir = join(here, `../tier${t.tier}`);
    const roster = readFileSync(join(tierDir, "roster.md"), "utf8");
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
    // the first "served from" is the first line's, the frozen build (backticks optional: a change log
    // entry further down names an older build in backticks, and briefed participants onto it)
    const distLine = readFileSync(join(tierDir, "criteria.md"), "utf8").match(/served from `?([^`\s]+)`?/)?.[1];
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
        /first time/i.test(history)
            ? `## Your experience with this program`
            : `## Your earlier sessions with this program`,
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
        `REAL_DIST=${distLine ?? "<the study build>"} REAL_TIER=${t.tier} node ${join(here, "real.mjs")} --start ${own} ${start}`,
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
    await mkdir(own, { recursive: true });
    await writeFile(join(own, "briefing.md"), doc);
    const bad = facilitatorFiles(own);
    if (bad.length)
        return `--brief: the briefing still holds facilitator words (${bad.join(", ")}); fix the persona or task files`;
    const facts = factsIn(doc, t.tier);
    return facts.length
        ? `--brief: the briefing holds answer-key facts (${facts.join(", ")}); fix the file that carries them into it`
        : null;
}

// ---------- after a session: the copy for the graders, and what the participant opened ----------
// A participant may read its own folder and nothing else of the study. The check reads every tool
// call in the participant's transcripts (the Claude Code session logs whose first prompt names the
// folder and a study participant) and lists each one that opened a facilitator file, a persona
// file, anything else under the studio's files, or a path up out of its folder. Any one voids it.
const FACILITATOR_FILE =
    /(?:^|[\s/"'`=(])((?:answers|tasks|criteria|roster|plan|scores|insights|decisions|grade)\.md)\b/;
const PARTICIPANT_PROMPT = /study participant/i;
function jsonLines(text) {
    return text
        .split("\n")
        .map((l) => {
            try {
                return JSON.parse(l);
            } catch {
                return null;
            }
        })
        .filter(Boolean);
}
// the prompt an agent's log opens with: its user messages before its first answer
function promptOf(lines) {
    const out = [];
    for (const l of lines) {
        if (l.type === "assistant") break;
        const c = l.type === "user" && l.message?.content;
        out.push(typeof c === "string" ? c : Array.isArray(c) ? c.map((x) => x.text ?? "").join("\n") : "");
    }
    return out.join("\n");
}
function headOf(f, bytes = 256 * 1024) {
    const fd = openSync(f, "r");
    try {
        const b = Buffer.alloc(bytes);
        return b.subarray(0, readSync(fd, b, 0, bytes, 0)).toString("utf8");
    } finally {
        closeSync(fd);
    }
}
// whether a prompt names this folder (r3-s1 is not named by a prompt that names r3-s10)
const reEscape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const names = (text, dir) => new RegExp(`${reEscape(dir)}(?![\\w.-])`).test(text);
// the logs of agents prompted as the participant of this folder, by its own path or by the round's
// sessions/<id> path the round runner names (round 3's runner named only that one, so its leak
// check read no log at all), written to since its briefing
function transcriptsFor(own) {
    const root = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "projects");
    const dirs = [own, studioOf(own)].filter(Boolean);
    const b = dirs.map((d) => join(d, "briefing.md")).find((f) => existsSync(f));
    if (!existsSync(root) || !b) return [];
    const since = statSync(b).mtimeMs;
    return readdirSync(root, { recursive: true })
        .map(String)
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => join(root, f))
        .filter((f) => statSync(f).mtimeMs >= since)
        .filter((f) => {
            const p = promptOf(jsonLines(headOf(f)));
            return dirs.some((d) => names(p, d)) && PARTICIPANT_PROMPT.test(p);
        });
}
const stringsIn = (v) =>
    typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(stringsIn) : [];
// why one string a tool call was given opens something the participant may not
function leaksIn(s, allowed) {
    const out = [];
    for (const p of s.match(/\/[^\s"'`;|&<>()$*]+/g) ?? []) {
        const q = normalize(p).replace(/\/+$/, "");
        if (/\/personas\//.test(q)) out.push(["a persona file", q]);
        else if (under(q, STUDIO) && !allowed.some((a) => under(q, a))) out.push(["a studio file", q]);
    }
    const f = s.match(FACILITATOR_FILE);
    if (f) out.push(["a facilitator file", f[1]]);
    if (/(?:^|[\s"'`=/])\.\.(?:\/|\s|$)/.test(s)) out.push(["a path up out of its folder", ".."]);
    return out;
}
// own: the participant's folder; given: transcripts to read instead of looking them up
function leakCheck(own, given = []) {
    const home = studioOf(own);
    const allowed = [own, home, join(here, "real.mjs"), files].filter(Boolean);
    const transcripts = given.length ? given : transcriptsFor(own);
    const leaks = [];
    // the briefing the participant was given: its own folder's, or the round's copy of it
    const briefing = [own, home]
        .filter(Boolean)
        .map((d) => join(d, "briefing.md"))
        .find((f) => existsSync(f));
    for (const f of briefing ? factsIn(readFileSync(briefing, "utf8"), tierOf(briefing)) : [])
        leaks.push({ transcript: briefing, tool: "briefing", why: "an answer-key fact", what: f });
    let calls = 0;
    for (const t of transcripts)
        for (const l of jsonLines(readFileSync(t, "utf8")))
            for (const b of (l.type === "assistant" && l.message?.content) || []) {
                if (b?.type !== "tool_use") continue;
                calls++;
                const found = stringsIn(b.input).flatMap((s) => leaksIn(s, allowed));
                // a search with no folder searches wherever the agent runs, the repository included
                if (/^(Grep|Glob)$/.test(b.name) && !b.input?.path)
                    found.push(["a search outside its folder", b.input?.pattern ?? ""]);
                for (const [why, what] of found) leaks.push({ transcript: t, tool: b.name, why, what });
            }
    return { checked: new Date().toISOString(), briefing: briefing ?? null, transcripts, calls, leaks };
}
function leakLines(l, own) {
    const read = `read: ${l.briefing ?? "no briefing"}; ${l.transcripts.join(", ") || "no participant log"}`;
    const voids = l.leaks.map((k) =>
        k.tool === "briefing"
            ? `VOID: its briefing holds ${k.why}, "${k.what}" (${k.transcript})`
            : `VOID: the participant opened ${k.why}, ${k.what} (${k.tool}, ${basename(k.transcript)})`,
    );
    if (!l.transcripts.length)
        return [
            read,
            `FAIL: the leak check read no participant log for ${own}; it cannot say the session did not leak`,
            ...voids,
        ];
    if (!l.leaks.length)
        return [
            read,
            `leak check: ${l.calls} tool calls in ${l.transcripts.length} participant transcripts; none opened a file outside the session folder, and its briefing holds no answer-key fact`,
        ];
    return [read, ...voids];
}
// What the tool itself writes in a session folder; an --end may replace these in the round's copy.
const TOOL_RECORD = /^(\d+\.png|briefing\.md|session\.(json|log)|setup\.log|work(-start)?\.json|leaks\.json)$/;
// --end of a participant's session: its folder, copied where the round's graders read it, with
// leaks.json beside it. Notes written in the round's copy during the session (the runner asks for
// transcript.md there) are kept: the copy only adds files and refreshes the tool's own records, and
// never removes or rewrites anything else (round 3's --end cleared the folder first and lost five
// sessions' notes). A copy already graded is left alone.
async function copyBack(own, home) {
    if (!existsSync(own) || !readdirSync(own).some((f) => /^\d+\.png$/.test(f))) return;
    if (existsSync(join(home, "grade.md"))) {
        console.log(`not copied: ${home} is already graded`);
        return;
    }
    const kept = [];
    await cp(own, home, {
        recursive: true,
        preserveTimestamps: true,
        filter: (src, dest) => {
            if (src === own || !existsSync(dest) || statSync(src).isDirectory()) return true;
            if (TOOL_RECORD.test(basename(src)) && dirname(src) === own) return true;
            if (!readFileSync(src).equals(readFileSync(dest))) kept.push(dest);
            return false;
        },
    });
    for (const k of kept) console.log(`kept ${k} as it was; the session folder's copy differs`);
    const l = leakCheck(own);
    await writeFile(join(home, "leaks.json"), JSON.stringify(l, null, 1) + "\n");
    console.log(`copied to ${home}`);
    for (const line of leakLines(l, own)) console.log(line);
}

// ---------- a round: its leak check and its gate ----------
// the session rows of a round's plan.md ("| r4-s01 | T20 | A: ... | Nadia | `empty` |")
const planRows = (rd) => {
    const p = join(rd, "plan.md");
    if (!existsSync(p)) return [];
    return readFileSync(p, "utf8")
        .split("\n")
        .map((l) => l.split("|").map((c) => c.trim()))
        .filter((c) => /^r\d+-s\d+b?$/.test(c[1] ?? ""));
};
// Every session of a round, planned or run, with its leak check; a session whose participant log
// cannot be read fails the round's check by name, so "no leaks" is never reported from nothing.
async function roundLeaks(rd) {
    const sd = join(rd, "sessions");
    const ids = [...new Set([...planRows(rd).map((c) => c[1]), ...(existsSync(sd) ? readdirSync(sd) : [])])].sort();
    const unread = [];
    const lines = [];
    let logs = 0;
    let briefings = 0;
    for (const id of ids) {
        const home = join(sd, id);
        const l = leakCheck(scratchOf(home));
        logs += l.transcripts.length;
        if (l.briefing) briefings++;
        if (!l.transcripts.length) unread.push(id);
        // every briefing and log it read, by session, and what voids it
        lines.push(
            ...leakLines(l, id)
                .filter((x) => /^(read|VOID):/.test(x))
                .map((x) => `${id}: ${x}`),
        );
        if (existsSync(home)) await writeFile(join(home, "leaks.json"), JSON.stringify(l, null, 1) + "\n");
    }
    lines.unshift(
        `leak check: ${logs} participant logs read for ${ids.length - unread.length} of ${ids.length} sessions; ${briefings} briefings read`,
    );
    if (unread.length) lines.push(`FAIL: no participant log read for ${unread.length} sessions: ${unread.join(", ")}`);
    return { lines, failed: unread.length > 0 || lines.some((x) => x.includes("VOID")) };
}
// Before a round's first session (criteria.md, preflights 4, 6 and 9): every task half the plan runs
// has its walks under <round>/pilot/<half>/<walk>/ (pilot/T40B/success/session.json), each with its
// screenshots, on a build that counts as the frozen one, and the bars runs on that build caught every
// planted case, reached every screen and wrote spoken.json. A walk is the success walk, the detours
// walk or the keyboard walk by its folder's name (keys or keyboard: the keyboard walk; detour: the
// detours walk; any other: the success walk); a half with a keyboard-only session in the plan (a
// start with --keys) also needs the keyboard walk, started --keys (keyboardOnlyMode: true). A build
// counts as the frozen one when its commit's app code (graphty, graphty-element, compact-mantine,
// pnpm-lock.yaml) is the frozen build's (preflight 1). Round 3 started without any of this.
const APP_CODE = ["graphty", "graphty-element", "compact-mantine", "pnpm-lock.yaml"];
const sameApp = new Map();
function sameAppCode(sha, commit) {
    if (!commit) return false;
    if (commit.startsWith(sha) || sha.startsWith(commit)) return true;
    const k = `${sha} ${commit}`;
    if (!sameApp.has(k))
        sameApp.set(k, spawnSync("git", ["-C", repo, "diff", "--quiet", sha, commit, "--", ...APP_CODE]).status === 0);
    return sameApp.get(k);
}
const walkKind = (name) => (/keys|keyboard/i.test(name) ? "keyboard" : /detour/i.test(name) ? "detours" : "success");
function gateCheck(rd) {
    const sha = frozenSha(rd);
    if (!sha)
        return {
            problems: [`${join(tierFiles(rd), "criteria.md")} names no frozen build on its first line`],
            evidence: [],
        };
    const problems = [];
    const evidence = [];
    // each half the plan runs, and whether a keyboard-only session is among its sessions
    const halves = new Map();
    for (const c of planRows(rd)) {
        const t = sessionTask(join(rd, "sessions", c[1]));
        if (!t) continue;
        const h = t.task + t.half;
        halves.set(h, halves.get(h) || /--keys\b/.test(t.start ?? ""));
    }
    if (!halves.size) problems.push(`${join(rd, "plan.md")} lists no session`);
    const pd = readinessOf(rd);
    for (const [h, keys] of [...halves].sort()) {
        const hd = join(pd, h);
        const walks = { success: [], detours: [], keyboard: [] };
        const why = [];
        for (const w of existsSync(hd) ? readdirSync(hd) : []) {
            const wd = join(hd, w);
            const sj = join(wd, "session.json");
            if (!existsSync(sj)) continue;
            let sess = null;
            try {
                sess = JSON.parse(readFileSync(sj, "utf8"));
            } catch {
                // an unreadable session.json is no walk
            }
            // a replay that diverged was ended partway: not a whole walk (tool/README.md, "Replaying a route")
            if (w.endsWith("-diverged")) continue;
            const kind = walkKind(w);
            if (!sess) why.push(`${w}: unreadable session.json`);
            else if (!readdirSync(wd).some((x) => /^\d+\.png$/.test(x))) why.push(`${w}: no screenshots`);
            else if (!sameAppCode(sha, sess.commit ?? sess.buildStamp?.split(" ")[0]))
                why.push(`${w}: build ${sess.commit ?? sess.buildStamp} has app code other than ${sha}'s`);
            else if (kind === "keyboard" && sess.keyboardOnlyMode !== true)
                why.push(`${w}: not started --keys (keyboardOnlyMode is not true)`);
            else walks[kind].push(w);
        }
        const needs = ["success", "detours", ...(keys ? ["keyboard"] : [])];
        const missing = needs.filter((k) => !walks[k].length);
        if (missing.length)
            problems.push(
                `${h}: no ${missing.join(", no ")} walk on build ${sha} under ${hd}/${why.length ? ` (${why.join("; ")})` : ""}`,
            );
        else evidence.push(`pilot ${h}: ${needs.map((k) => `${k} ${join(hd, walks[k][0])}/`).join(", ")}`);
    }
    const tier3 = tierOf(rd) === "3";
    for (const name of tier3 ? ["bars", "bars-light"] : ["bars"]) {
        const bj = join(rd, name, "bars.json");
        let bars = null;
        try {
            bars = JSON.parse(readFileSync(bj, "utf8"));
        } catch {
            // missing or unreadable: no bars run
        }
        const bp = [];
        if (!bars) bp.push(`no bars run: ${bj} is missing (node bars.mjs ${join(rd, name)} --dist <frozen build>)`);
        else {
            if (!sameAppCode(sha, String(bars.build).split(" ")[0]))
                bp.push(`${bj} measured build ${bars.build}, whose app code is not ${sha}'s`);
            if (bars.untrusted?.length) bp.push(`${bj} missed planted cases: ${bars.untrusted.join("; ")}`);
            const miss = (bars.log ?? []).filter((l) => l.startsWith("MISS"));
            if (miss.length) bp.push(`${bj} has ${miss.length} MISS lines, the first: ${miss[0]}`);
            if (tier3) {
                if (bars.tier !== "3") bp.push(`${bj} is not a --tier 3 run`);
                const gaps = bar6Gaps(bars.walked ?? {}, ["1440x900", "900x700"]);
                if (gaps.length) bp.push(`${bj} leaves out ${gaps.length} of bar 6's checks, the first: ${gaps[0]}`);
                const sp = join(rd, name, "spoken.json");
                let spoken = {};
                try {
                    spoken = JSON.parse(readFileSync(sp, "utf8"));
                } catch {
                    // missing: checked below
                }
                if (!Object.keys(spoken).length) bp.push(`no spoken text: ${sp} is missing or empty`);
            }
        }
        problems.push(...bp);
        if (!bp.length) evidence.push(`${name} on ${bars.build}: ${bj}`);
    }
    return { sha, problems, evidence };
}

// Why --start must not open a session of a round: the round's plan.md holds no "Gate evidence"
// section that --gate wrote for the frozen build. Checked at the start itself, so no runner,
// continuation script or hand start skips the gate (round 4 ran all its sessions without one).
function gateRefusal(dir) {
    const home = studioOf(dir) ?? dir;
    if (!ROUND_SESSION.test(home)) return null;
    const plan = join(dirname(dirname(home)), "plan.md");
    const sha = frozenSha(home);
    const text = existsSync(plan) ? readFileSync(plan, "utf8") : "";
    const at = text.match(/^## Gate evidence\n\nChecked by `real\.mjs --gate` on \S+, build ([0-9a-f]+):/m)?.[1];
    if (!at)
        return `${plan} holds no "Gate evidence" section, so no session of this round may start; run real.mjs --gate ${dirname(plan)} until it exits 0`;
    if (!sha || !(at.startsWith(sha) || sha.startsWith(at)))
        return `${plan} holds gate evidence for build ${at}, not the frozen build ${sha}; run real.mjs --gate ${dirname(plan)} again`;
    return null;
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
        // a file is found from the folder the command runs in, not the session process's: a warm
        // browser was started from another one
        steps.push(a === "--upload" || a === "--drop" ? [a, fileArg(v[0])] : [a, ...v]);
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
const ask = (dir, req) => askAt(sockOf(dir), req);
function askAt(sock, req) {
    return new Promise((ok, fail) => {
        const s = connect(sock);
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

async function start(dir, how, sr, task, keys) {
    dir = resolve(dir);
    const refused = participantRefusal(dir) || walkRefusal(dir);
    if (refused) {
        console.error(refused);
        return 2;
    }
    const ungated = gateRefusal(dir);
    if (ungated) {
        console.log(`FAIL: ${ungated}`);
        return 1;
    }
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
        // a setup file is looked up from the folder the command runs in, then the tier's folder
        // (tasks.md gives paths relative to it), then the tier's setups folder itself
        const look = [process.cwd(), tierFiles(dir), setupsOf(dir)];
        const file = look.map((d) => resolve(d, m[1])).find((f) => existsSync(f));
        if (!file) {
            console.error(`SETUP FAILED: no such setup file ${m[1]} (looked in ${look.join(", ")})`);
            return 2;
        }
        const p = parseSetup(await readFile(file, "utf8"));
        if (p.refused) {
            console.error(p.refused);
            return 2;
        }
        setup = p.steps;
        how = `setup:${file}`;
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
    // any task with a Follow-up block holds a follow-up prompt, given at --end (see "op end" in serve)
    const t = sessionTask(dir, task);
    const followUp = t ? taskWords(t)?.followUp : null;
    // the session process holds a browser slot for its whole life, so it runs inside the gate; a warm
    // one already holds its slot and has the app open
    const log = openSync(join(dir, "session.log"), "a");
    let child = null,
        exited = null;
    if (!(await claimWarm(dir, sr, keys))) {
        child = spawn(
            gate,
            [process.execPath, fileURLToPath(import.meta.url), "--serve", dir, ...(sr ? ["--sr"] : [])],
            {
                detached: true,
                stdio: ["ignore", log, log],
                env: {
                    ...process.env,
                    ...(GPU ? { BROWSER_GPU: "1" } : {}),
                    ...(keys ? { REAL_KEYS_ONLY: "1" } : {}),
                },
            },
        );
        child.on("exit", (c) => (exited = c));
    }
    const ticket = () => child && existsSync(QUEUE) && readdirSync(QUEUE).some((f) => f.endsWith(`-${child.pid}`));
    let waited = 0;
    // REAL_SLOT_WAIT_SECONDS bounds the wait for a browser slot, so a caller whose shell call has a
    // time limit gets "nothing started" (exit 4) and runs the same start again, instead of a start
    // left waiting in the background that nobody resumes (round 4: r4-s05, r4-s20, r4-s28, void)
    const waitFor = Number(process.env.REAL_SLOT_WAIT_SECONDS) || 0;
    while (!existsSync(sockOf(dir))) {
        // still in the queue for a slot, and a warm browser came ready: take it, leave the queue
        if (waited % 2 === 1 && ticket() && (await claimWarm(dir, sr, keys))) {
            try {
                process.kill(-child.pid, "SIGTERM");
            } catch {
                // already gone
            }
            child = null;
        }
        if (child && exited !== null) {
            // its reason, so a start that could not reach the GPU says so on the command's own output
            const why = readFileSync(join(dir, "session.log"), "utf8").match(/^Error: .*$/m)?.[0];
            console.error(
                `the session process stopped (exit ${exited}); see ${join(dir, "session.log")}${why ? `\n${why}` : ""}`,
            );
            return 1;
        }
        if (waitFor && child && waited * 500 >= waitFor * 1000) {
            try {
                process.kill(-child.pid, "SIGTERM");
            } catch {
                // already gone
            }
            console.error(`no browser slot came free in ${waitFor} s; nothing started, run the same --start again`);
            return 4;
        }
        if (waited === 10) console.log("waiting for a free browser slot ...");
        await new Promise((r) => setTimeout(r, 500));
        waited++;
    }
    child?.unref();
    topUp();
    const route = {
        start: how || "empty",
        keys: !!keys,
        sr: !!sr,
        viewport: VIEWPORT,
        scheme: process.env.REAL_SCHEME || null,
        dist,
    };
    const r = await ask(dir, { op: "start", setup, task: t && t.task + t.half, followUp, route });
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
            // the deploy writes site.json beside the app (graphty/sites/<channel>.json); a local
            // build has none, and the app's 404 for it ended every setup with SETUP FAILED (tier 4)
            if (f === join(dist, "site.json"))
                body = await readFile(join(repo, "graphty/sites/production.json")).catch(() => null);
            if (body) return res.writeHead(200, { "content-type": "application/json" }).end(body);
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
    // A browser profile on disk, as a person's browser has, made empty for each session. A new
    // context of a launched browser is an incognito one: Chromium sizes its storage quota from
    // memory, which the app reads as a private window, so every session showed a false "This looks
    // like a private window" notice (round 1's tool dry run 2). Outside the session folder, so the
    // profile is never copied to the round's folder.
    // a warm browser (dir null) has no session folder yet: its profile is named by its process
    const profile = join(
        homedir(),
        ".cache/graphty-real-profiles",
        dir ? basename(sockOf(dir), ".sock") : `warm-${process.pid}`,
    );
    await rm(profile, { recursive: true, force: true });
    const context = await chromium.launchPersistentContext(profile, {
        ...LAUNCH,
        ...gpuLaunch(),
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
        acceptDownloads: true,
    });
    // a persistent context opens with a blank tab of its own, closed once the session's tab is open
    const blank = context.pages();
    const renderer = await rendererOf(blank[0] ?? (await context.newPage()));
    if (GPU && !onGpu(renderer)) {
        await context.close().catch(() => {});
        throw new Error(
            `GPU rendering was asked for (REAL_GPU is not 0), but the browser draws with "${renderer}". A software renderer burns 550-690% CPU per idle graphty page; check ${EGL} holds libEGL.so.1 and nvidia-smi sees the card, or set REAL_GPU=0 to run on SwiftShader on purpose`,
        );
    }
    const browser = { close: () => context.close().finally(() => rm(profile, { recursive: true, force: true })) };
    const s = {
        dir,
        sr,
        keysOnly: process.env.REAL_KEYS_ONLY === "1",
        renderer,
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
    await s.context.addInitScript(watchIdle);
    // REAL_SCHEME=light|dark: the app's color scheme for a scripted walk (bars.mjs --tier 3 --scheme);
    // studies leave it unset, so a participant sees the app's own default
    if (process.env.REAL_SCHEME)
        await s.context.addInitScript(
            (v) => localStorage.setItem("mantine-color-scheme-value", v),
            process.env.REAL_SCHEME,
        );
    await newTab(s);
    await Promise.all(blank.map((p) => p.close()));
    if (!dir) {
        // a warm browser: the app opened and settled now, the session's folder given by its claim
        const claim = await warmUp(s, browser, http);
        dir = s.dir = claim.dir;
        s.sr = claim.sr;
        s.keysOnly = claim.keys;
        s.missFails = claim.missFails;
        s.idleMs = claim.idleMs;
        s.warm = true;
        const log = openSync(join(dir, "session.log"), "a");
        console.log = (...a) => appendFileSync(log, a.join(" ") + "\n");
        console.log(
            `took over warm browser ${process.pid} (warm for ${Math.round((Date.now() - s.warmSince) / 1000)} s)`,
        );
    }

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
        const ms = s.idleMs || IDLE_MS;
        idle = setTimeout(() => {
            console.log(`no step for ${ms / 1000} seconds; closing the session`);
            close();
        }, ms);
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
                        r = await opStart(s, req.setup, req.route);
                    } else if (req.op === "step") r = await opStep(s, req.steps);
                    else if (req.op === "plant-spin") r = await plantSpin(s, req.on);
                    else if (req.op === "plant-live") r = await plantLive(s);
                    else if (req.op === "plant-ticker") r = await plantTicker(s);
                    else if (req.op === "hovered") r = await hovered(s);
                    else if (req.op === "measure") r = await measure(s, req.plant);
                    else if (req.op === "work") r = { out: [], code: 0, data: await s.page.evaluate(openWork) };
                    else if (req.op === "plant-removal") r = await plantRemoval(s);
                    else if (req.op === "plant-dom") r = await plantDom(s, req.kind);
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

// ---------- the warm pool: browsers launched with the app loaded, waiting for a --start ----------
// A cold --start spent 7 to 11 s launching a browser, loading the app and letting it settle, after
// the wait for a slot. A warm browser has done all of that before anyone asks: a --start of the same
// build, window size and color scheme takes one over in about a second. The pool keeps itself:
// every --start and --end tops it up to REAL_WARM_POOL (default 2; 0 turns it off) through the gate's
// try mode, which only fills spare slots above the four the pre-push gate shares and never while a
// start waits in the queue. A warm browser that waits REAL_WARM_SECONDS (default 600) unclaimed, or
// sees starts queue for a slot, closes and frees its slot. Its page was opened on a clean profile and
// never touched, so the session it becomes is the one a cold start makes.
const WARM_DIR = "/tmp/graphty-real-warm";
const WARM_POOL = Number(process.env.REAL_WARM_POOL ?? 2);
const WARM_MS = (Number(process.env.REAL_WARM_SECONDS) || 600) * 1000;
const warmKey = () =>
    createHash("sha1")
        // the tool's own version too: a warm browser runs the code it was started with
        .update(
            JSON.stringify([
                dist,
                VIEWPORT,
                process.env.REAL_SCHEME || "",
                GPU,
                statSync(fileURLToPath(import.meta.url)).mtimeMs,
            ]),
        )
        .digest("hex")
        .slice(0, 10);
const alive = (pid) => existsSync(`/proc/${pid}`);
const QUEUE = join(process.env.BROWSER_SLOT_DIR || join(MAIN, "tmp/browser-slots"), "queue");
// the warm browsers of this key: ready (a socket) and still warming (a marker named by its gate's pid)
function warmOnes() {
    if (!existsSync(WARM_DIR)) return { ready: [], warming: 0 };
    const mine = readdirSync(WARM_DIR).filter((f) => f.startsWith(warmKey() + "-"));
    const pidOf = (f) => f.slice(warmKey().length + 1).split(".")[0];
    return {
        ready: mine.filter((f) => f.endsWith(".sock") && alive(pidOf(f))).map((f) => join(WARM_DIR, f)),
        warming: mine.filter((f) => f.endsWith(".warming") && alive(pidOf(f))).length,
    };
}
// Starts warm browsers in the background until the pool holds REAL_WARM_POOL for this build
function topUp() {
    if (!(WARM_POOL > 0)) return;
    mkdirSync(WARM_DIR, { recursive: true });
    // markers of warmers the gate turned away (no spare slot) are left by processes that are gone
    for (const f of readdirSync(WARM_DIR))
        if (f.endsWith(".warming") && !alive(f.split("-").pop().split(".")[0]))
            rmSync(join(WARM_DIR, f), { force: true });
    const { ready, warming } = warmOnes();
    for (let i = ready.length + warming; i < WARM_POOL; i++) {
        const log = openSync(join(WARM_DIR, `${warmKey()}.log`), "a");
        const child = spawn(gate, [process.execPath, fileURLToPath(import.meta.url), "--warm"], {
            detached: true,
            stdio: ["ignore", log, log],
            env: { ...process.env, BROWSER_SLOT_TRY: "1", ...(GPU ? { BROWSER_GPU: "1" } : {}) },
        });
        writeFileSync(join(WARM_DIR, `${warmKey()}-${child.pid}.warming`), "");
        child.unref();
    }
}
// Takes over a ready warm browser for <dir>: true when one answered the claim
async function claimWarm(dir, sr, keys) {
    if (!(WARM_POOL > 0)) return false;
    for (const sock of warmOnes().ready) {
        const r = await askAt(sock, {
            op: "claim",
            dir,
            sr: !!sr,
            keys: !!keys,
            missFails: process.env.REAL_MISS_FAILS,
            idleMs: (Number(process.env.REAL_IDLE_SECONDS) || 0) * 1000,
        }).catch(() => null);
        if (r?.ok) return true;
    }
    return false;
}
// In the warm browser: open the app, settle, then wait on the pool's socket for one claim
async function warmUp(s, browser, http) {
    s.warmSince = Date.now();
    const marker = join(WARM_DIR, `${warmKey()}-${process.ppid}.warming`);
    const sock = join(WARM_DIR, `${warmKey()}-${process.pid}.sock`);
    let quitting = false;
    const quit = async (why) => {
        if (quitting) return;
        quitting = true;
        console.log(`warm browser ${process.pid}: ${why}; closing`);
        await rm(sock, { force: true });
        await rm(marker, { force: true });
        await browser.close().catch(() => {});
        http.close();
        process.exit(0);
    };
    const signals = ["SIGTERM", "SIGINT", "SIGHUP"];
    for (const sig of signals) process.on(sig, () => quit(sig));
    const said = [];
    await opening(s, said);
    await settle(s, said);
    if (said.some((l) => /did not finish loading|never drew/.test(l))) await quit(said.join("; "));
    s.errors.length = 0;
    return new Promise((done) => {
        let queued = 0;
        const watch = setInterval(() => {
            if (Date.now() - s.warmSince > WARM_MS) quit(`unclaimed for ${WARM_MS / 1000} s`);
            // starts waiting for a slot (another build's, or one that missed the claim) come first
            queued = existsSync(QUEUE) && readdirSync(QUEUE).length ? queued + 1 : 0;
            if (queued >= 3) quit("starts are queued for a slot");
        }, 2000);
        let taken = false;
        const server = netServer({ allowHalfOpen: true }, (c) => {
            c.on("error", () => {});
            let buf = "";
            c.on("data", (d) => {
                buf += d;
                if (!buf.includes("\n")) return;
                const req = JSON.parse(buf.slice(0, buf.indexOf("\n")));
                // one claim only: the first takes it, any other is told to try the next
                if (req.op !== "claim" || taken) return c.end(JSON.stringify({ ok: false }) + "\n");
                taken = true;
                clearInterval(watch);
                for (const sig of signals) process.removeAllListeners(sig);
                server.close();
                rmSync(sock, { force: true });
                c.end(JSON.stringify({ ok: true }) + "\n");
                done({ ...req, dir: resolve(req.dir) });
            });
        });
        server.listen(sock, () => rmSync(marker, { force: true }));
    });
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
    const scan = (records = []) => {
        // text put in again (a new node with the same words) is read again, as a screen reader does
        const added = records
            .filter((m) => m.addedNodes.length > 0 && m.target.textContent?.trim())
            .map((m) => m.target);
        for (const r of document.querySelectorAll(LIVE)) {
            // a region inside another is read as part of it; a hidden one is not read at all
            if (r.parentElement?.closest(LIVE) || r.closest("[aria-hidden=true]") || !r.checkVisibility()) continue;
            const text = r.textContent.replace(/\s+/g, " ").trim();
            if (last.get(r) === text && !added.some((t) => r.contains(t))) continue;
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
// In the page: window.__realIdle() resolves once the page has taken the last input -- no DOM change
// across two animation frames, no timer of under a second pending and no request in flight -- or
// after 2 s, whichever comes first. It stands in for the fixed 400 ms the tool waited after every
// action until 2026-10-21. Timers of a second or more are left out: they are a tooltip's open
// delay (compact-mantine's TOOLTIP_OPEN_DELAY), a notice's lifetime or an idle check, which a
// person does not wait for between two moves.
function watchIdle() {
    const pending = new Set();
    const [st, ct, f] = [window.setTimeout, window.clearTimeout, window.fetch];
    window.setTimeout = function (fn, ms, ...a) {
        if (typeof fn !== "function" || (Number(ms) || 0) >= 1000) return st.call(this, fn, ms, ...a);
        const id = st.call(
            this,
            function (...b) {
                pending.delete(id);
                return fn.apply(this, b);
            },
            ms,
            ...a,
        );
        pending.add(id);
        return id;
    };
    window.clearTimeout = function (id) {
        pending.delete(id);
        return ct.call(this, id);
    };
    let inflight = 0;
    if (f)
        window.fetch = function (...a) {
            inflight++;
            return f.apply(this, a).finally(() => inflight--);
        };
    let changes = 0;
    new MutationObserver(() => changes++).observe(document, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
    });
    window.__realIdle = () =>
        new Promise((done) => {
            let quiet = 0,
                seen = changes;
            const cap = st(() => done(false), 2000);
            const frame = () => {
                quiet = changes === seen && !pending.size && !inflight ? quiet + 1 : 0;
                seen = changes;
                if (quiet >= 2) {
                    ct(cap);
                    done(true);
                } else requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        });
}
// Waits for the page to take the last input (watchIdle), at most about 2 s
const appIdle = (page) => page.evaluate(() => window.__realIdle?.()).catch(() => {});
const SR_STATES = new Set(["checked", "pressed", "expanded", "selected", "disabled", "invalid", "required"]);
// What a screen reader says for the focused element (through shadow roots), from Chromium's own
// accessibility tree, and the live-region text recorded since the last call
const FOCUSED =
    "(() => { let e = document.activeElement; while (e?.shadowRoot?.activeElement) e = e.shadowRoot.activeElement; return e === document.body || e?.hasAttribute('data-real-start') ? null : e; })()";
// role "name" value "..." states, for one accessibility node. A range's value is its valuetext
// when it has one, as a screen reader speaks it: Chromium keeps a range's number as a 32-bit
// float, so the bare value of aria-valuenow="0.85" comes back as 0.8500000238418579.
function axSays(n) {
    const off = (p) => p.value.value === false || p.value.value === "false";
    // A screen reader says "collapsed" for expanded=false; every other false state goes unsaid.
    const states = (n.properties || [])
        .filter((p) => SR_STATES.has(p.name) && (!off(p) || p.name === "expanded"))
        .map((p) => {
            if (p.name === "expanded" && off(p)) {
                return "collapsed";
            }
            return p.value.value === true || p.value.value === "true" ? p.name : `${p.name}=${p.value.value}`;
        });
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
            // focus inside a component's shadow root (the drawing's canvas) is in its host's landmark
            for (let e = ${FOCUSED}; e; e = e.getRootNode().host) {
                const found = e.closest("[role=dialog], [role=alertdialog], [role=region], [role=main], [role=navigation], [role=complementary], [role=banner], [role=contentinfo], [role=search], [role=form], main, nav, aside, header, footer, form, section[aria-label], section[aria-labelledby]");
                if (found) return found;
            }
            return document.body;
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
            // the workspace, or the start page a first visit with no project open lands on
            () =>
                document.querySelector("#root")?.children.length > 0 &&
                document.querySelector("main, [role=main], [data-start-door]"),
            null,
            { timeout: 30000 },
        )
        .catch(() => out.push("the app never drew its window"));
}
async function opStart(s, setup, route) {
    const out = [];
    // the route's first line: how this walk started, so --replay can start the same way
    await writeFile(join(s.dir, "route.jsonl"), JSON.stringify({ ...route, task: s.task ?? null }) + "\n");
    // a warm browser opened the app before its claim, and nothing has touched it since
    if (!s.warm) await opening(s, out);
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
                keyboardOnlyMode: !!s.keysOnly,
                viewport: VIEWPORT,
                renderer: s.renderer,
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
        // a failed request (the start page's remote pictures) is logged, but only a step that does not work fails it
        const r = await run(s, setup, said, SETUP_CLICK_MS, false);
        // a reopened project has nothing focused: the last setup step's control must not wear a focus ring,
        // and Tab starts at the top of the page. A blur alone keeps Chromium's starting point for Tab
        // on the last control the setup clicked (round 2's keyboard sessions began in the inspector),
        // so focus a mark at the start of the page. The mark goes only once focus has left it: an app
        // that puts back focus which falls to the page would move it off the mark if it went at once.
        await s.page.evaluate(() => {
            const mark = document.createElement("span");
            mark.tabIndex = -1;
            mark.setAttribute("data-real-start", "");
            mark.addEventListener("blur", () => mark.remove(), { once: true });
            document.body.prepend(mark);
            mark.focus();
        });
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
    await writeFile(
        join(s.dir, "styles-start.json"),
        JSON.stringify(await s.page.evaluate(styleTree).catch((e) => ({ error: e.message.split("\n")[0] })), null, 1) +
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

// The first --end of a session of any task with a Follow-up block does not end it: it hands the participant the follow-up,
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
    // the whole style tree at the end beside the start's, and what changed in it, for the graders
    const stylesEnd = await s.page.evaluate(styleTree).catch((e) => ({ error: e.message.split("\n")[0] }));
    const stylesStart = JSON.parse(await readFile(join(s.dir, "styles-start.json"), "utf8").catch(() => "null"));
    await writeFile(
        join(s.dir, "styles.json"),
        JSON.stringify({ changes: styleChanges(stylesStart, stylesEnd), start: stylesStart, end: stylesEnd }, null, 1) +
            "\n",
    );
    // the key the reader saw last and the colors the drawing shows, for the key-and-drawing check
    // (keydraw.mjs)
    const key = await s.page.evaluate(keyShown).catch((e) => ({ error: e.message.split("\n")[0] }));
    const drawn = await s.page.evaluate(drawnColors).catch((e) => ({ error: e.message.split("\n")[0] }));
    await writeFile(join(s.dir, "key.json"), JSON.stringify({ key, drawn }, null, 1) + "\n");
    return { out: [`session ended: ${s.dir}`], code: 0, end: true };
}
// What the studio's bars read on the page as it is now (bars.mjs): axe, controls sharing a name,
// focus fallen to the page, the app's words on screen, bar 10's cut text and raw strings. A plant
// ("img", "twins", "blur", "cut", "raw", "unscroll") puts a known failure on the page first and
// takes it away after, to prove each check can fail.
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
                activeInView: await page.evaluate(activeInView),
                axe: await axeViolations(page),
                names: await sameNames(s.cdp),
                words: await page.evaluate(wordsOnScreen),
                spoken: await spokenNow(s),
                ...(await bar10Counts(page)),
            },
        };
    } finally {
        if (planted) await page.evaluate(unplant);
    }
}
// What the screen says out loud now, as screen-reader mode reports it ("focus: ..." for the focused
// control, "live: ..." for each live region's text), read whether or not the session is in that
// mode: bars.mjs writes it to spoken.json for the wording check
async function spokenNow(s) {
    const out = [];
    await srReport(s, out);
    const shown = await s.page
        .evaluate(() =>
            [...document.querySelectorAll("[aria-live]:not([aria-live=off]), [role=status], [role=alert], [role=log]")]
                .filter(
                    (r) =>
                        r.checkVisibility() &&
                        !r.parentElement?.closest("[aria-live], [role=status], [role=alert], [role=log]"),
                )
                .map(
                    (r) =>
                        `${r.getAttribute("role") || "region"}: ${JSON.stringify(r.textContent.replace(/\s+/g, " ").trim())}`,
                )
                .filter((l) => !l.endsWith(': ""')),
        )
        .catch(() => []);
    for (const l of shown) if (!out.some((o) => o.includes(l.slice(l.indexOf(": ") + 2)))) out.push(`live: ${l}`);
    return out;
}
// Bar 10's counts (measure.mjs bar10); a cut text with no title or name is hovered, and a tooltip
// holding its whole text makes it readable. The pointer goes back off the page, as after a setup.
async function bar10Counts(page) {
    const { cut, raw } = await page.evaluate(bar10);
    try {
        for (const c of cut.filter((x) => !x.readable)) {
            if (
                !(await page.hover(`[data-studio-cut="${c.mark}"]`, { timeout: 2000 }).then(
                    () => true,
                    () => false,
                ))
            )
                continue;
            // compact-mantine opens a tooltip after 1 s
            const tip = await page
                .waitForFunction(
                    (t) =>
                        [...document.querySelectorAll("[role=tooltip]")].some(
                            (x) => x.checkVisibility() && x.textContent.replace(/\s+/g, " ").includes(t),
                        ),
                    c.text,
                    { timeout: 2500 },
                )
                .then(
                    () => true,
                    () => false,
                );
            if (tip) c.readable = "tooltip";
        }
    } finally {
        await page.mouse.move(-1, -1);
        await page.evaluate(() =>
            document.querySelectorAll("[data-studio-cut]").forEach((e) => e.removeAttribute("data-studio-cut")),
        );
    }
    for (const c of cut) delete c.mark;
    return { cut, raw };
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
        // the same words put in again are a second announcement
        setTimeout(() => (later.textContent = "Planted change"), 200);
    });
    return { out: [], code: 0 };
}

// --prove only: "slow" adds a button whose click asks for a navigation that answers "204 No Content"
// (so the page stays) after 4.5 s: Playwright waits for it after the click is done, past the click
// limit, as it did on a loaded machine. "hidden-tip" adds a tooltip dismissed by CSS (opacity 0) and
// an empty one.
async function plantDom(s, kind) {
    if (kind === "slow")
        await s.context.route("**/real-planted-slow", (r) =>
            setTimeout(() => r.fulfill({ status: 204 }).catch(() => {}), 4500),
        );
    await s.page.evaluate((kind) => {
        if (kind === "slow") {
            const b = document.createElement("button");
            b.textContent = "Planted slow";
            Object.assign(b.style, { position: "fixed", left: "600px", top: "10px", zIndex: 99999 });
            b.onclick = () => {
                location.href = "/real-planted-slow";
                b.remove();
            };
            document.body.append(b);
        } else
            for (const [text, opacity] of [
                ["Planted dismissed tip", "0"],
                ["", "1"],
            ]) {
                const t = document.createElement("div");
                t.setAttribute("role", "tooltip");
                t.textContent = text;
                Object.assign(t.style, { position: "fixed", left: "10px", top: "10px", opacity });
                document.body.append(t);
                setTimeout(() => t.remove(), 10000);
            }
    }, kind);
    return { out: [], code: 0 };
}

// In screen-reader mode the participant has no pointer: these steps are refused before anything runs
const POINTER = new Set([...Object.keys(CLICKS), ...Object.keys(AT), "--hover-icon", "--drag", "--wheel", "--drop"]);

async function opStep(s, steps) {
    const pointer = (s.sr || s.keysOnly) && steps.find(([a]) => POINTER.has(a));
    if (pointer)
        return {
            out: [`${pointer[0]} is refused in ${s.sr ? "screen-reader" : "keyboard-only"} mode: use --key and --type`],
            code: 2,
        };
    const out = [];
    const t0 = performance.now();
    s.ms = {};
    const r = await run(s, steps, out);
    const t1 = performance.now();
    const said = await shot(s);
    out.push(said);
    s.ms.shot = performance.now() - t1;
    // A participant's miss is part of the session, so it exits 0. A scripted walk (a dry run, a
    // re-walk) starts its session with REAL_MISS_FAILS=1, so a step that found nothing to act on
    // fails the walk: a walk that only "passes" because its click missed checks nothing.
    const code = r.code || (r.missed && (s.missFails ?? process.env.REAL_MISS_FAILS) === "1" ? 2 : 0);
    s.ms.total = performance.now() - t0;
    const check = await recordRoute(s, { steps, out, code, missed: r.missed });
    return { out, code, check };
}

// The screenshot is always saved for graders; a screen-reader participant is not told where. It is
// taken through the DevTools protocol with optimizeForSpeed (a lighter PNG compression): the same
// pixels, 30 to 45% sooner than Playwright's own screenshot (tmp/browser-speed/probe2.log).
async function shot(s) {
    const n = readdirSync(s.dir).filter((f) => /^\d+\.png$/.test(f)).length + 1;
    const file = join(s.dir, `${String(n).padStart(2, "0")}.png`);
    s.cdp ??= await s.context.newCDPSession(s.page);
    const { data } = await s.cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
    await writeFile(file, Buffer.from(data, "base64"));
    s.lastShot = basename(file);
    await recordStyles(s, file);
    return s.sr ? "(a screenshot was kept for the graders)" : file;
}
// ---------- routes: every walk is saved as a script that --replay can run again ----------
// route.jsonl in the session folder: a first line saying how the session started, then one line per
// --step with its actions, what it printed and the screen it ended on (the check points a replay
// compares). A file is kept by its full path, so the route replays from any folder.
const routeSteps = (steps) =>
    steps.flatMap(([a, ...v]) =>
        a === "--upload" || a === "--drop" ? [a, existsSync(resolve(v[0])) ? resolve(v[0]) : v[0]] : [a, ...v],
    );
// What a step printed, without what differs from run to run on the same screen: the screenshot's
// path, the session folder, a slow click that landed, a drawing still settling, a notice that went
// before the screenshot, the indented call log of a failed click
const NOISE = /still moving|^slow \w+ \(landed\)|^a notice showed and went|^ {4}|screenshot was kept/;
const checkLines = (out, dir) =>
    out
        .filter((l) => !NOISE.test(l) && !/^\/.*\.png$/.test(l))
        .map((l) => l.replaceAll(dir, "<session>").replace(/\d+(\.\d+)? (KB|MB|bytes)/g, "<size>"));
// The screen's check point: every control and heading in view, by kind and name, sorted
function screenOf() {
    const sel =
        "button,a[href],input,select,textarea,h1,h2,h3,h4,[role=button],[role=link],[role=tab],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],[role=option],[role=treeitem],[role=checkbox],[role=radio],[role=switch],[role=combobox],[role=textbox],[role=searchbox],[role=slider],[role=dialog],[role=alertdialog],[role=heading],[role=row]";
    const out = [];
    for (const e of document.querySelectorAll(sel)) {
        if (!e.checkVisibility() || e.closest("[aria-hidden=true]")) continue;
        const name = (e.getAttribute("aria-label") || e.innerText || e.value || e.placeholder || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 60);
        out.push(`${e.getAttribute("role") || e.tagName.toLowerCase()} ${name}`);
    }
    return out.sort();
}
async function recordRoute(s, { steps, out, code, missed }) {
    const ms = Object.fromEntries(Object.entries(s.ms).map(([k, v]) => [k, Math.round(v)]));
    const line = {
        steps: routeSteps(steps),
        code,
        missed,
        shot: s.lastShot,
        out: checkLines(out, s.dir),
        screen: await s.page.evaluate(screenOf).catch(() => []),
        ms,
    };
    await appendFile(join(s.dir, "route.jsonl"), JSON.stringify(line) + "\n");
    return line;
}
// How far a replayed step's check points are from the recorded ones: null when they match, else
// why. Lines must match exactly; the screen may differ in a few controls (a "saved 2 minutes ago"
// row), at most REAL_REPLAY_TOLERANCE of them (default 2, or 5% of the screen's controls).
function divergence(rec, now) {
    if (now.missed && !rec.missed) return `a control the route used is missing: ${now.out.join(" | ")}`;
    // a route written by hand (its steps only) has no check points but its names
    if (!rec.out) return null;
    if (now.code !== rec.code) return `the step exited ${now.code}, the route's ${rec.code}: ${now.out.join(" | ")}`;
    const a = rec.out.join("\n"),
        b = now.out.join("\n");
    if (a !== b)
        return `the step printed other things: recorded ${JSON.stringify(rec.out)}, now ${JSON.stringify(now.out)}`;
    const left = [...rec.screen];
    const added = [];
    for (const x of now.screen) {
        const i = left.indexOf(x);
        if (i >= 0) left.splice(i, 1);
        else added.push(x);
    }
    const allowed = Number(process.env.REAL_REPLAY_TOLERANCE) || Math.max(2, Math.round(0.05 * rec.screen.length));
    if (left.length + added.length > allowed)
        return `the screen differs: gone ${JSON.stringify(left.slice(0, 12))}, new ${JSON.stringify(added.slice(0, 12))}`;
    return null;
}

// One line per screenshot in styles-steps.jsonl: whether a graph is open and a hash of what its layers
// look like, so the time to the first styled graph is read from the screenshots' own clocks
// (score.mjs). Never shown to the participant.
async function recordStyles(s, file) {
    const tree = await s.page.evaluate(styleTree, false).catch(() => null);
    const content = styleContent(tree);
    const line = {
        shot: basename(file),
        at: new Date().toISOString(),
        graph: content !== null,
        look: content && createHash("sha1").update(content).digest("hex").slice(0, 12),
        colors: await s.page.evaluate(nodeColors).catch(() => null),
    };
    await appendFile(join(s.dir, "styles-steps.jsonl"), JSON.stringify(line) + "\n");
}

// The DOM stops changing, then the drawing settles: graphty-element's waitForStableFrame
async function settle(s, out, ms = 15000) {
    const { page } = s;
    const t0 = performance.now();
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
    const t1 = performance.now();
    // waitForStableFrame watches the layout, not the camera: captures of the canvas's area half a
    // second apart catch a turning or drifting drawing it lets through
    if (!moving && (await canvasMoves(s)))
        out.push("the drawing is still moving (the canvas kept changing for a second with no input)");
    s.ms = { ...s.ms, settleDom: t1 - t0, settleCanvas: performance.now() - t1 };
}
// Only a plain capture of the window: hiding the rest with a style would blur the canvas, which
// lets go of a held camera key and so stops the very spin this looks for. So the captures include
// whatever lies over the canvas (an open popover, its suggestion list, a caret, a notice), and only
// the canvas's own pixels are compared: a cell of the canvas's area that something else covers,
// in any of the captures, is left out.
async function canvasMoves(s) {
    const { page } = s;
    // a page closed under the check (the session is closing) has no motion to report
    s.cdp ??= await s.context.newCDPSession(page).catch(() => null);
    if (!s.cdp) return false;
    const clip = await page
        .locator("graphty-element")
        .first()
        .boundingBox()
        .catch(() => null);
    if (!clip || clip.width < 1 || clip.height < 1) return false;
    const covered = new Set();
    const grab = async () => {
        for (const i of await coveredCells(page, clip)) covered.add(i);
        // a quarter-size capture through the DevTools protocol: a turning or drifting drawing changes
        // it as surely as a full one (each pixel blends 16 of the drawing's), at a fraction of the cost
        const png = await s.cdp
            .send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true, clip: { ...clip, scale: 0.25 } })
            .then((r) => Buffer.from(r.data, "base64"))
            .catch(() => null);
        return png && PNG.sync.read(png);
    };
    // three captures, and moving only when each differs from the one before: a one-off change (a
    // notice arriving over the canvas, a late repaint) is not motion, a spin or a drift changes every time.
    // The third is taken only when the first two differ: two that match already say "still" (the
    // common case), which saves half a second and a capture on every step.
    const a = await grab();
    await page.waitForTimeout(500);
    const b = await grab();
    if (!a || !b || !canvasDiffers(a, b, clip, covered)) return false;
    await page.waitForTimeout(500);
    const c = await grab();
    return !!c && canvasDiffers(a, b, clip, covered) && canvasDiffers(b, c, clip, covered);
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
                const [key, desc, control, kind] = await el.evaluate(
                    (e, [tip, chars]) => {
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
                            .slice(0, chars);
                        const input = { checkbox: "checkbox", radio: "radio", range: "slider" }[c.type] || "textbox";
                        const kind =
                            c.getAttribute("role") ||
                            { TR: "row", A: "link", SELECT: "combobox", TEXTAREA: "textbox", INPUT: input }[
                                c.tagName
                            ] ||
                            c.tagName.toLowerCase();
                        // where a person sees it: an open list or menu sits over the panel behind it
                        const where = c.closest("[role=listbox],[role=menu]") ? " in the open list" : "";
                        return [c.dataset.tryKey, `${kind} "${said}"${where}`, found !== null, kind];
                    },
                    [TIP, NAME_CHARS],
                );
                if (key === "behind") behind++;
                else if (key && !seen.has(key)) seen.set(key, { el, desc, control, kind });
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
        // "#n" picks by position, which a person never sees; among different kinds of control (a
        // panel row and the open list's option) it is refused: in round 2 "weight#2" took the panel
        // row, not the option the participant meant, and threw away a half-made filter step
        const kinds = [...new Set(all.map((x) => x.kind).filter(Boolean))];
        if (nth && !role && kinds.length > 1)
            return {
                miss: `ambiguous: "${raw}" picks by position among different kinds of control, so the step did nothing; name it by kind: ${kinds.map((k) => `"role=${k}:${name}"`).join(", ")} (${all.map((x) => x.desc).join(", ")})`,
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
        ([x, y, chars]) => {
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
            const said = (c.getAttribute("aria-label") || c.innerText || "")
                .trim()
                .replace(/\s+/g, " ")
                .slice(0, chars);
            return `${c.getAttribute("role") || c.tagName.toLowerCase()}${said ? ` "${said}"` : ""}`;
        },
        [x, y, NAME_CHARS],
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
// A participant's click gives up after 3 s; a setup click, which nobody waits on, after 20 s, so a
// loaded machine (load 90 to 115) does not fail a start whose control was only slow to settle
const CLICK_MS = 3000,
    SETUP_CLICK_MS = 20000;
async function act(page, f, verb, opt, ms = CLICK_MS) {
    if (f.el) return f.el[verb](Object.assign({ timeout: ms }, opt));
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
                // one dismissed by CSS (opacity 0, visibility hidden) or empty is no tooltip
                (e) =>
                    (stale || !("realStale" in e.dataset)) &&
                    e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
                    e.innerText.trim(),
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
async function run(s, steps, out, clickMs = CLICK_MS, requestsFail = true) {
    let { page } = s;
    let code = 0,
        missed = 0;
    const t0 = performance.now();
    for (const [i, [a, v, v2]] of steps.entries()) {
        // A batch stops at its first miss or failed check: the rest was written for a screen the
        // walker expected, and run on another one it would act on the wrong controls
        if ((missed || code) && i > 0) {
            out.push(
                `stopped after "${steps[i - 1].join(" ")}": the rest of this step (${steps
                    .slice(i)
                    .map((x) => x[0])
                    .join(" ")}) did not run`,
            );
            break;
        }
        if (a === "--expect" || a === "--expect-not") {
            let seen;
            const sel = v.match(/^selected=(\d+)$/);
            if (sel) {
                const n = await page
                    .locator("[aria-selected=true]:not([role=tab], [role=gridcell], [role=rowheader])")
                    .filter({ visible: true })
                    .count();
                seen = n === +sel[1];
                if (seen !== (a === "--expect")) {
                    out.push(
                        `${n} row${n === 1 ? " is" : "s are"} selected; ${a === "--expect" ? "expected" : "expected other than"} ${sel[1]}`,
                    );
                    code = 1;
                }
                continue;
            }
            // what a screen reader reads after the focused control's name: its accessible description
            const desc = v.match(/^described=(.*)$/s);
            if (desc) {
                s.cdp ??= await s.context.newCDPSession(s.page);
                const f = await evalObject(s, FOCUSED);
                const said = (f && (await axOf(s, f))?.description?.value) || "";
                if (said.includes(desc[1]) !== (a === "--expect")) {
                    out.push(
                        `focus is described as ${JSON.stringify(said)}; ${a === "--expect" ? "expected" : "expected other than"} ${JSON.stringify(desc[1])}`,
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
            const onScreen = async () => {
                const loc = rn ? (rn[2] ? await byRole() : page.getByRole(rn[1])) : page.getByText(v, { exact: false });
                return (
                    (await loc.filter({ visible: true }).count()) > 0 ||
                    (!rn &&
                        (await page.evaluate(
                            (w) =>
                                [...document.querySelectorAll("input, textarea")].some(
                                    (f) => f.checkVisibility() && f.value.includes(w),
                                ),
                            v,
                        )))
                );
            };
            // what the last step started (a worker's result, a list filling) may land a moment later
            const until = Date.now() + 2000;
            while ((seen = await onScreen()) !== (a === "--expect") && Date.now() < until)
                await page.evaluate(() => new Promise(requestAnimationFrame)).catch(() => {});
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
                await act(page, f, verb, CLICKS[a], clickMs).catch((e) => {
                    // Playwright counts its wait after the click (for navigations it may have started)
                    // inside the limit: a click its call log says was done landed, and was only slow
                    if (callLog(e).some((l) => / action done$/.test(l))) {
                        out.push(
                            `slow ${verb} (landed): "${v}" was ${verb}ed; the wait after it ran past ${clickMs} ms`,
                        );
                        return;
                    }
                    // Playwright's call log names the actionability check that failed (covered, not stable, ...)
                    out.push(`could not ${verb} "${v}": ${e.message.split("\n")[0]}`, ...callLog(e));
                    missed++;
                });
            }
            if (verb !== "hover") await appIdle(page);
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
                await appIdle(page);
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
            await appIdle(page);
        } else if (a === "--wheel") {
            const [x, y, d] = v.split(",").map(Number);
            await page.mouse.move(x, y);
            await page.mouse.wheel(0, d);
            await appIdle(page);
        } else if (a === "--wait") {
            await page.waitForTimeout(+v);
        } else if (a === "--read") {
            await srRead(s, out);
        } else if (a === "--key" && v === "Escape" && (s.chooser || s.picker)) {
            // Escape goes to an open file chooser, as in a real browser, and closes it with no file;
            // before 2026-10-21 a chooser nobody answered stayed "open" for the rest of the session
            s.picker?.answer(null);
            await s.chooser?.setFiles([]).catch(() => {});
            [s.picker, s.chooser] = [null, null];
            out.push("closed the file chooser without choosing a file");
            await appIdle(page);
        } else if (a === "--key") {
            await page.keyboard.press(v);
            await appIdle(page);
        } else if (a === "--type") {
            const into = await page.evaluate((chars) => {
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
                    : `${e.getAttribute("role") || e.tagName.toLowerCase()} "${(e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, chars)}"`;
            }, NAME_CHARS);
            if (into) {
                out.push(`nothing that takes text has focus (focus is on ${into}); typed nothing, not "${v}"`);
                code = 1;
                continue;
            }
            await page.keyboard.type(v, { delay: 20 });
            await appIdle(page);
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
            await appIdle(page);
        } else if (a === "--reopen") {
            // a picker left open dies with its tab
            s.picker?.answer(null);
            [s.picker, s.chooser] = [null, null];
            await page.close();
            page = await newTab(s);
            await opening(s, out);
            // the start page's remote pictures failing to load is logged, as at a start, but does not fail the step
            requestsFail = false;
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
            // the listener records the drop on the next task; no record after 2 s is no drop
            await page.waitForFunction(() => window.__realDrop !== null, null, { timeout: 2000 }).catch(() => {});
            await appIdle(page);
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
    const t1 = performance.now();
    await settle(s, out);
    const t2 = performance.now();
    // what was announced while the drawing settled
    if (s.sr) await srLive(s, out);
    else await goneNotices(s, out);
    await copySaves(s, out);
    // downloads that started during these steps: saved into the session folder and named
    if (s.downloads.length) {
        for (const line of await Promise.all(s.downloads.splice(0))) out.push(line);
    }
    for (const e of s.errors.splice(0)) {
        out.push(e);
        if (requestsFail || !e.startsWith("failed request: ")) code = 1;
    }
    s.ms = { ...s.ms, act: t1 - t0, settle: t2 - t1, after: performance.now() - t2 };
    return { code, missed };
}

// ---------- --replay and --rewalk: a saved route run again with no one at the keyboard ----------
const routeFile = (r) => (existsSync(join(r, "route.jsonl")) ? join(r, "route.jsonl") : r);
const readRoute = (r) =>
    readFileSync(routeFile(r), "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l));
// Ends a live session as --end does, waiting for its process to let go of its socket
async function endSession(dir) {
    const r = await ask(dir, { op: "end" }).catch(() => ({ out: [], end: true }));
    for (let i = 0; existsSync(sockOf(dir)) && i < 50; i++) await new Promise((ok) => setTimeout(ok, 100));
    await rm(sockOf(dir), { force: true });
    return r;
}
// --replay <walk folder | route.jsonl> <new session dir> [--end-on-diverge] [--keep]
// Starts the new session the way the route's did and sends its steps one --step at a time, comparing
// each step's check points (what it printed, the controls on screen, a miss) with the route's. All
// match: the session is ended (--keep leaves it open to carry on). One differs: it stops there, says
// how, and leaves the session open on that screen for whoever replayed it to carry on by hand (exit
// 5); --end-on-diverge ends it instead. Writes replay.json in the new folder.
async function replay(from, dir, { endOnDiverge, keep }) {
    dir = resolve(dir);
    const [head, ...recs] = readRoute(from);
    // the route's window and color scheme; the build is whatever REAL_DIST names now (the point of a
    // re-walk is the same route on a new build)
    const vp = head.viewport ?? VIEWPORT;
    const want = { REAL_VIEWPORT: `${vp.width}x${vp.height}`, REAL_SCHEME: head.scheme || "" };
    if (
        want.REAL_VIEWPORT !== `${VIEWPORT.width}x${VIEWPORT.height}` ||
        want.REAL_SCHEME !== (process.env.REAL_SCHEME || "")
    )
        return spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], {
            stdio: "inherit",
            env: { ...process.env, ...want },
        }).status;
    const t0 = Date.now();
    const summary = { route: routeFile(resolve(from)), steps: recs.length, matched: 0, diverged: null };
    const save = () =>
        writeFile(
            join(dir, "replay.json"),
            JSON.stringify({ ...summary, seconds: Math.round((Date.now() - t0) / 1000) }, null, 1) + "\n",
        );
    const code = await start(dir, head.start, head.sr, undefined, head.keys);
    if (code) {
        summary.diverged = { step: 0, why: `the start exited ${code}` };
        await save();
        return code;
    }
    for (const [i, rec] of recs.entries()) {
        const p = parseSteps(rec.steps);
        const r = p.refused
            ? { out: [p.refused], code: 2 }
            : await ask(dir, { op: "step", steps: p.steps }).catch((e) => ({ out: [e.message], code: 1 }));
        const why = r.check ? divergence(rec, r.check) : `the step did not run: ${r.out.join(" | ")}`;
        if (why) {
            summary.diverged = {
                step: i + 1,
                steps: rec.steps,
                why,
                shot: r.check?.shot ?? null,
                recordedShot: rec.shot,
            };
            await save();
            console.log(`step ${i + 1} of ${recs.length} (${rec.steps.join(" ")}) DIVERGED: ${why}`);
            for (const l of r.out) console.log(`  ${l}`);
            if (endOnDiverge) {
                await endSession(dir);
                console.log(`the session is ended; ${summary.matched} steps matched the route before this one`);
            } else
                console.log(
                    `the session is still open on that screen (${join(dir, r.check?.shot ?? "")}): carry on by hand with --step, then --end`,
                );
            return 5;
        }
        summary.matched++;
        console.log(`step ${i + 1} of ${recs.length}: ${rec.steps.join(" ")} -- matches (${r.check.shot})`);
    }
    await save();
    if (keep) console.log(`replayed all ${recs.length} steps; every check point matched; the session is still open`);
    else {
        await endSession(dir);
        console.log(`replayed all ${recs.length} steps; every check point matched; session ended`);
    }
    return 0;
}
// --rewalk <old walks folder> <new walks folder> [--only <walk>,<walk>]
// Replays every route under the old folder (a task's pilot folder, or a pilot folder of tasks) into
// the same place under the new one, REAL_REWALK_PARALLEL (default 4) at a time, each through the
// browser gate. A walk that diverges is ended and its folder kept as <walk>-diverged, so <walk> is
// free for a walker to --replay it again and carry on by hand from where it went another way. Writes
// <new>/rewalk.json and exits 0 when every route matched, 5 when any diverged.
async function rewalk(oldDir, newDir, only) {
    oldDir = resolve(oldDir);
    newDir = resolve(newDir);
    if (walkRefusal(newDir)) {
        console.error(walkRefusal(newDir));
        return 2;
    }
    const found = [];
    const look = (d, depth) => {
        if (existsSync(join(d, "route.jsonl"))) return found.push(d);
        if (depth < 2)
            for (const f of readdirSync(d, { withFileTypes: true }))
                if (f.isDirectory() && !f.name.endsWith("-diverged")) look(join(d, f.name), depth + 1);
    };
    look(oldDir, 0);
    const walks = found
        .map((d) => d.slice(oldDir.length + 1))
        .filter((w) => !only || only.some((o) => w === o || w.startsWith(o + "/") || w.endsWith("/" + o)));
    if (!walks.length) {
        console.log(`FAIL: no route.jsonl under ${oldDir}${only ? ` for ${only.join(", ")}` : ""}; nothing to replay`);
        return 1;
    }
    const results = [];
    let next = 0;
    const self = fileURLToPath(import.meta.url);
    const worker = async () => {
        while (next < walks.length) {
            const w = walks[next++];
            const to = join(newDir, w);
            await rm(to, { recursive: true, force: true });
            await rm(to + "-diverged", { recursive: true, force: true });
            const out = await new Promise((ok) => {
                const c = spawn(process.execPath, [self, "--replay", join(oldDir, w), to, "--end-on-diverge"], {
                    env: process.env,
                });
                let text = "";
                c.stdout.on("data", (d) => (text += d));
                c.stderr.on("data", (d) => (text += d));
                c.on("exit", (code) => ok({ code, text }));
            });
            const rep = JSON.parse(await readFile(join(to, "replay.json"), "utf8").catch(() => "null")) ?? {
                diverged: { step: 0, why: out.text.trim().split("\n").pop() },
            };
            if (rep.diverged) await rename(to, to + "-diverged");
            results.push({ walk: w, ...rep, folder: rep.diverged ? to + "-diverged" : to });
            console.log(
                rep.diverged
                    ? `${w}: DIVERGED at step ${rep.diverged.step} of ${rep.steps ?? "?"}: ${rep.diverged.why.slice(0, 300)}`
                    : `${w}: all ${rep.steps} steps matched (${rep.seconds} s)`,
            );
        }
    };
    await Promise.all(Array.from({ length: Math.max(1, Number(process.env.REAL_REWALK_PARALLEL) || 4) }, worker));
    results.sort((a, b) => a.walk.localeCompare(b.walk));
    await mkdir(newDir, { recursive: true });
    await writeFile(join(newDir, "rewalk.json"), JSON.stringify({ from: oldDir, walks: results }, null, 1) + "\n");
    const bad = results.filter((r) => r.diverged);
    console.log(
        `${results.length - bad.length} of ${results.length} routes matched every check point${bad.length ? `; diverged: ${bad.map((r) => r.walk).join(", ")}` : ""} (${join(newDir, "rewalk.json")})`,
    );
    return bad.length ? 5 : 0;
}

// ---------- --prove: the tool against the real app ----------
async function prove() {
    const self = fileURLToPath(import.meta.url);
    // REAL_PROVE_DIR keeps two self-tests run at once from clearing each other's sessions
    const base = resolve(process.env.REAL_PROVE_DIR || join(repo, "design/ui/studio/tmp/prove"));
    await rm(base, { recursive: true, force: true });
    // the warm pool is off for every check but its own, so each start below is the cold one it tests
    process.env.REAL_WARM_POOL = "0";
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
        const many = spawnSync(gate, ["true"], { encoding: "utf8", env: { ...process.env, BROWSER_SLOTS: "17" } });
        check(
            "the gate refuses BROWSER_SLOTS above 16",
            many.status === 2 && /BROWSER_SLOTS must be 1 to 16/.test(many.stderr),
            `exit ${many.status} ${many.stderr}`,
        );
    }

    // the participant's side: a briefing with the prompt only, and no facilitator file in the folder
    {
        const P = join(base, "brief");
        await rm(scratchOf(P), { recursive: true, force: true });
        const b = node(["--brief", P, "--task", "T18B", "--persona", "Ruth"]);
        const bf = join(scratchOf(P), "briefing.md");
        const text = existsSync(bf) ? readFileSync(bf, "utf8") : "";
        check(
            "a briefing holds the prompt word for word, the start and the history, and nothing for facilitators",
            b.status === 0 &&
                text.includes("The Strozzi want a message carried to the Pazzi") &&
                text.includes("setup:florentine-ranked.txt") &&
                text.includes("## Your earlier sessions") &&
                !/Peruzzi|Words avoided|Facilitator notes|Suits:/.test(text),
            `exit ${b.status} ${b.stderr}`,
        );
        check(
            "a session id that ends in a fact's word (r5-<word>) is not that fact",
            answerFacts()
                .filter((f) => /^\w+$/.test(f))
                .every((f) => !factsIn(`sessions/r5-${f}/briefing.md`).length),
            answerFacts().join(", "),
        );
        check(
            "a briefing holds no answer-key fact and keeps the held-key clicks",
            factsIn(text).length === 0 &&
                ["--shift-click", "--ctrl-click", "--alt-click"].every((k) => text.includes(k)),
            `facts: ${factsIn(text).join(", ")}`,
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

    // a participant's session runs outside the studio's files, from its own briefing; one whose
    // transcript opened a facilitator file is void, by name
    {
        const R = join(under(base, STUDIO) ? base : join(STUDIO, "tmp", basename(base)), "rounds/round-9");
        await rm(R, { recursive: true, force: true });
        await rm(scratchOf(R), { recursive: true, force: true });
        const S1 = join(R, "sessions/r9-s01");
        const own = scratchOf(S1);
        let r = node(["--start", S1, "empty"]);
        check(
            "a start refuses a participant's session folder inside the studio's files",
            r.status === 2 && /inside the studio's files/.test(r.stderr) && !existsSync(sockOf(S1)),
            `exit ${r.status} ${r.stderr}`,
        );
        const S0 = scratchOf(join(R, "sessions/r9-s00"));
        await mkdir(S0, { recursive: true });
        r = node(["--start", S0, "empty"]);
        check(
            "a start refuses a participant's folder with no briefing written by --brief",
            r.status === 2 && /no briefing\.md written for it by --brief/.test(r.stderr) && !existsSync(sockOf(S0)),
            `exit ${r.status} ${r.stderr}`,
        );
        r = node(["--brief", S1, "--task", "T20A", "--persona", "Grace"]);
        const bf = join(own, "briefing.md");
        check(
            "a briefing for a studio session folder is written outside the studio's files, starting that folder",
            r.status === 0 &&
                r.stdout.trim() === bf &&
                !under(own, STUDIO) &&
                existsSync(bf) &&
                readFileSync(bf, "utf8").includes(`--start ${own} `),
            `exit ${r.status} ${r.stdout}${r.stderr}`,
        );
        r = node(["--start", own, "empty"]);
        check(
            "a start refuses a session of a round whose plan holds no gate evidence",
            r.status === 1 &&
                /^FAIL: .*plan\.md holds no "Gate evidence" section/.test(r.stdout) &&
                r.stdout.trim().split("\n").length === 1 &&
                !existsSync(sockOf(own)) &&
                !pngs(own).length,
            `exit ${r.status} ${r.stdout}${r.stderr}`,
        );
        // planted logs: the participant's (reads tasks.md), a clean one, and another agent's
        const C = join(base, "claude");
        const plantLog = (name, prompt, calls) =>
            writeFile(
                join(C, "projects/p", name),
                [
                    { type: "user", message: { content: prompt } },
                    ...calls.map(([n, input]) => ({
                        type: "assistant",
                        message: { content: [{ type: "tool_use", name: n, input }] },
                    })),
                ]
                    .map((x) => JSON.stringify(x))
                    .join("\n") + "\n",
            );
        await mkdir(join(C, "projects/p"), { recursive: true });
        const you = `YOU ARE A STUDY PARTICIPANT. Read only ${own}/briefing.md.`;
        const click = ["Bash", { command: `node ${join(here, "real.mjs")} --step ${own} --click "Open a file"` }];
        await plantLog("leak.jsonl", you, [click, ["Bash", { command: `sed -n 1,40p ${join(tier2, "tasks.md")}` }]]);
        await plantLog("clean.jsonl", you, [click, ["Read", { file_path: join(own, "01.png") }]]);
        await plantLog("grader.jsonl", `Grade session ${own}`, [["Read", { file_path: join(tier2, "answers.md") }]]);
        const env = { ...process.env, CLAUDE_CONFIG_DIR: C };
        r = spawnSync(process.execPath, [self, "--leaks", own], { encoding: "utf8", env });
        check(
            "a participant transcript that opens tasks.md voids the session, by name",
            r.status === 1 &&
                /VOID: .*tasks\.md.*leak\.jsonl/.test(r.stdout) &&
                !/VOID: .*clean\.jsonl|grader\.jsonl|answers\.md/.test(r.stdout),
            `exit ${r.status} ${r.stdout}${r.stderr}`,
        );
        r = node(["--leaks", own, join(C, "projects/p/clean.jsonl")]);
        check(
            "a transcript that reads only its own folder is not void",
            r.status === 0 && /none opened a file outside the session folder/.test(r.stdout),
            `exit ${r.status} ${r.stdout}${r.stderr}`,
        );
        // --end copies the participant's folder to the studio one, with what the check found, and
        // keeps the notes the participant wrote in the studio one during the session
        await writeFile(join(own, "01.png"), "");
        await mkdir(S1, { recursive: true });
        const note = "## Step 1\nI see the start screen and will open my file.\n";
        await writeFile(join(S1, "transcript.md"), note);
        await writeFile(join(own, "transcript.md"), "a different file of the same name\n");
        r = spawnSync(process.execPath, [self, "--end", own], { encoding: "utf8", env });
        const lj = join(S1, "leaks.json");
        const found = existsSync(lj) ? JSON.parse(readFileSync(lj, "utf8")).leaks : [];
        check(
            "an end copies the session into the round's folder with the leak check beside it",
            r.status === 0 &&
                existsSync(join(S1, "01.png")) &&
                existsSync(join(S1, "briefing.md")) &&
                found.some((k) => k.what.endsWith("tasks.md")) &&
                /VOID: /.test(r.stdout),
            `exit ${r.status} ${r.stdout}${r.stderr}`,
        );
        const kept = existsSync(join(S1, "transcript.md")) ? readFileSync(join(S1, "transcript.md"), "utf8") : "";
        check(
            "an end keeps a note written in the round's folder before it, word for word",
            kept === note && /kept .*transcript\.md/.test(r.stdout),
            `transcript.md now reads ${JSON.stringify(kept)}; ${r.stdout}`,
        );
        // the round's leak check: a session whose log cannot be read fails it by name; a log
        // whose prompt names the round's sessions/<id> folder (the runner's way) is read
        const S2 = join(R, "sessions/r9-s02");
        const S3 = join(R, "sessions/r9-s03");
        for (const d of [S2, S3]) {
            await mkdir(d, { recursive: true });
            await writeFile(join(d, "briefing.md"), "a briefing\n");
            await writeFile(join(d, "01.png"), "");
        }
        // a briefing that holds answer-key facts (the first two the answer key lists, read from it so
        // this file, which a participant may read, never holds them)
        const planted = answerFacts().slice(0, 2).join(", ");
        await writeFile(join(S3, "briefing.md"), `a briefing\n\nThe newer file adds two people (${planted}).\n`);
        await plantLog("s03.jsonl", `YOU ARE A STUDY PARTICIPANT. Read only ${S3}/briefing.md.`, [
            ["Read", { file_path: join(S3, "01.png") }],
        ]);
        r = spawnSync(process.execPath, [self, "--leaks", R], { encoding: "utf8", env });
        check(
            "the round's leak check fails on a session with no readable log, naming it",
            r.status === 1 &&
                /for 2 of 3 sessions/.test(r.stdout) &&
                /FAIL: no participant log read for 1 sessions: r9-s02$/m.test(r.stdout),
            `exit ${r.status} ${r.stdout}${r.stderr}`,
        );
        check(
            "the round's leak check voids a session whose briefing holds an answer-key fact, naming it",
            planted.includes(", ") &&
                new RegExp(
                    `^r9-s03: VOID: its briefing holds an answer-key fact, "${reEscape(planted.split(", ")[0])}"`,
                    "m",
                ).test(r.stdout) &&
                !/^r9-s0[12]: VOID: its briefing/m.test(r.stdout),
            `planted "${planted}"; ${r.stdout}`,
        );
        check(
            "the round's leak check names every briefing and every log it read",
            /^r9-s01: read: \S+r9-s01\/briefing\.md; [^\n]*leak\.jsonl/m.test(r.stdout) &&
                /^r9-s03: read: \S+r9-s03\/briefing\.md; \S+s03\.jsonl/m.test(r.stdout) &&
                /^r9-s02: read: \S+r9-s02\/briefing\.md; no participant log$/m.test(r.stdout),
            r.stdout,
        );
        // the gate: a round folder with no pilot results and no bars run may not start
        const sha = readFileSync(join(tier2, "criteria.md"), "utf8").match(/build ([0-9a-f]{7,40})/)?.[1];
        await writeFile(join(R, "plan.md"), "| r9-s01 | T20 | A: bus stops, bus-stops.csv | Grace | `empty` |\n");
        r = node(["--gate", R]);
        check(
            "the gate refuses a round folder with no pilot results and no bars run",
            r.status === 1 &&
                /FAIL: T20A: no success, no detours walk on build/.test(r.stdout) &&
                /FAIL: no bars run/.test(r.stdout),
            `exit ${r.status} ${r.stdout}${r.stderr}`,
        );
        // a half's walks, each in its own folder under the half's (pilot/T20A/success/)
        const pilot = join(R, "pilot/T20A/success");
        for (const w of [pilot, join(R, "pilot/T20A/detours")]) {
            await mkdir(w, { recursive: true });
            await writeFile(join(w, "session.json"), JSON.stringify({ buildStamp: `${sha} graphty@0` }));
            await writeFile(join(w, "01.png"), "");
        }
        await mkdir(join(R, "bars"), { recursive: true });
        await writeFile(join(R, "bars/bars.json"), JSON.stringify({ build: `${sha} graphty@0`, untrusted: [] }));
        r = node(["--gate", R]);
        const plan = readFileSync(join(R, "plan.md"), "utf8");
        check(
            "the gate passes with both, and the plan lists the evidence by file",
            r.status === 0 &&
                plan.includes(`pilot T20A: success ${pilot}/`) &&
                plan.includes(join(R, "bars/bars.json")),
            `exit ${r.status} ${r.stdout}${r.stderr}`,
        );
        // with the gate passed, a session of the round starts, even when every browser slot is
        // full at first: a bounded wait gives up with nothing started, and the same start run
        // again takes the slot as soon as it frees (planted in a pool of one slot of its own)
        const S4 = join(R, "sessions/r9-s04");
        const own4 = scratchOf(S4);
        node(["--brief", S4, "--task", "T20A", "--persona", "Grace"]);
        const pool = join(base, "slots");
        await mkdir(pool, { recursive: true });
        // flock hands its lock to the sleep it runs, so the holder is let go by its process group
        const holder = spawn("flock", [join(pool, "slot1"), "sleep", "600"], { stdio: "ignore", detached: true });
        const release = () => {
            try {
                process.kill(-holder.pid);
            } catch {
                // already let go
            }
        };
        while (spawnSync("flock", ["-n", join(pool, "slot1"), "true"]).status === 0)
            await new Promise((ok) => setTimeout(ok, 100));
        const full = { ...process.env, BROWSER_SLOT_DIR: pool, BROWSER_SLOTS: "1" };
        r = spawnSync(process.execPath, [self, "--start", own4, "empty"], {
            encoding: "utf8",
            env: { ...full, REAL_SLOT_WAIT_SECONDS: "2" },
        });
        check(
            "with every slot full, a bounded start gives up with exit 4 and nothing started",
            r.status === 4 &&
                /no browser slot came free/.test(r.stderr) &&
                !existsSync(sockOf(own4)) &&
                !pngs(own4).length,
            `exit ${r.status} ${r.stdout}${r.stderr}`,
        );
        const later = spawn(process.execPath, [self, "--start", own4, "empty"], {
            env: { ...full, REAL_SLOT_WAIT_SECONDS: "120" },
        });
        let said = "";
        later.stdout.on("data", (d) => {
            said += d;
            if (said.includes("waiting for a free browser slot")) release();
        });
        later.stderr.on("data", (d) => (said += d));
        const status = await new Promise((ok) => later.on("exit", ok));
        release();
        check(
            "the same start, run again, starts the session once the slot frees",
            status === 0 && pngs(own4).includes("01.png") && existsSync(sockOf(own4)),
            `exit ${status} ${said}`,
        );
        node(["--end", own4]);
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
    if (GPU)
        check(
            "the session draws on the GPU, not SwiftShader (session.json names the renderer)",
            onGpu(json.renderer || ""),
            `renderer ${json.renderer}`,
        );
    {
        const c = commitOf();
        check(
            "session.json names the served build's commit, and the checkout's HEAD apart from it",
            !!c.build && json.commit.startsWith(c.build.split(" ")[0]) && json.toolCommit === c.toolSha,
            `commit ${json.commit}, toolCommit ${json.toolCommit}, build ${c.build}, HEAD ${c.toolSha}`,
        );
    }
    try {
        // the start page's own way in: a click by name, then the file chooser it opens
        let x = step(
            A,
            "--click",
            "Open a file",
            "--upload",
            "florentine.gml",
            "--click",
            "Load",
            "--expect",
            "role=button:Project: florentine",
        );
        check("a click by a control's name", x.code === 0 && pngs(A).length === 2, x.out);
        check("a session without --sr prints no screen-reader lines", !/^(focus|live): /m.test(x.out), x.out);
        check(
            "an upload answers the file chooser and the file opens",
            x.code === 0 && /chose the file florentine\.gml/.test(x.out),
            x.out,
        );
        // a newly opened graph has no history, so Undo is disabled and its tooltip gives the reason
        x = step(A, "--hover", "Undo");
        check("a hover prints the tooltip", x.code === 0 && /^tooltip: "(Undo|Nothing to undo)/m.test(x.out), x.out);
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
        // a click that landed while the wait after it ran past the limit is slow, not a miss
        await ask(A, { op: "plant-dom", kind: "slow" });
        x = step(A, "--click", "Planted slow");
        check(
            "a click that lands but whose wait after it runs past the limit is reported as landed, not missed",
            /^slow click \(landed\): "Planted slow"/m.test(x.out) && !/could not click/.test(x.out),
            x.out,
        );
        // a tooltip dismissed by CSS, and an empty one, are no tooltip; Everything has none of its own
        await ask(A, { op: "plant-dom", kind: "hidden-tip" });
        x = step(A, "--hover", "Everything");
        check("a hover over a dismissed, hidden tooltip reports tooltip: null", /^tooltip: null$/m.test(x.out), x.out);
        // a client stopped mid-step (its agent was stopped): the session answers the next step
        // (the request is written, then the client is gone before its answer; the next step queues
        // behind it, so it is answered only after the session tried to answer the gone one)
        await new Promise((ok) => {
            const c = connect(sockOf(A));
            c.on("error", ok);
            c.write(JSON.stringify({ op: "step", steps: parseSteps(["--wait", "2000"]).steps }) + "\n", () => {
                c.destroy();
                ok();
            });
        });
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
            "Add to node text",
            "--click",
            "role=menuitem:Label",
            "--click",
            // florentine's name column spells each node's id, so the picker lists it as "Node id"
            "Node id",
            "--key",
            "Escape",
        );
        check("labels are turned on as a participant would", x.code === 0 && !/nothing on screen/.test(x.out), x.out);
        x = step(A, "--click", "Tornabuoni");
        const clicked = x.out.match(/clicked node "Tornabuoni" on the canvas, at (\d+),(\d+)/);
        check("a click by a node's drawn label lands on that node", x.code === 0 && !!clicked, x.out);
        // selecting a node moves the camera, so the point is read from where a node is drawn now (one
        // the inspector does not name, so the name resolves to the canvas)
        x = step(A, "--hover", "Medici");
        const at = x.out.match(/hovered node "Medici" on the canvas, at (\d+),(\d+)/);
        if (at) x = step(A, "--click-at", `${at[1]},${at[2]}`);
        check(
            "a click-at reports the node under the point",
            !!at && x.code === 0 && new RegExp(`^at ${at[1]},${at[2]}: node "Medici"`, "m").test(x.out),
            x.out,
        );
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
        "# open a sample before the participant arrives\n--click role=button:Samples\n--click A club that split in two\n",
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
    // a setup click on a control that never becomes clickable (Redo, with nothing to redo) fails the start
    const C2 = join(base, "session-c2");
    await writeFile(setup, "--click role=button:Samples\n--click A club that split in two\n--click Redo\n");
    r = node(["--start", C2, `setup:${setup}`]);
    node(["--end", C2]);
    check(
        "a setup click on a control that never becomes clickable fails the start",
        r.status === 1 &&
            /SETUP FAILED/.test(r.stdout) &&
            /could not click "Redo": .*Timeout 20000ms/.test(r.stdout) &&
            /not enabled/.test(r.stdout),
        `exit ${r.status} ${r.stdout}${r.stderr}`,
    );

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
        // the last click is on a control that stays, so Tab would start after it if the setup left it there
        "--click Open a file\n--upload florentine.gml\n--click Load\n--click role=button:Graph\n",
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
        x = step(D, "--key", "Tab");
        check(
            "Tab after a setup starts at the top of the page, not after the setup's last click",
            /^focus: button "Main menu"/m.test(x.out),
            x.out,
        );
        x = step(D, "--key", "Tab", "--key", "Tab", "--key", "Tab");
        check(
            "every step prints a focus line, and no screenshot path",
            (x.out.match(/^focus: /gm) || []).length === 3 && !/\.png$/m.test(x.out) && pngs(D).length === before + 2,
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
            /^live: status \(polite\): "No match for \\"zzzz\\"/m.test(x.out) && /value "zzzz"/.test(x.out),
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
            "a live region inserted already filled is marked unconfirmed, a changed one is not, a repeat is read again",
            /^live: status \(polite\): "Planted already filled" -- unconfirmed/m.test(x.out) &&
                (x.out.match(/^live: status \(polite\): "Planted change"$/gm) || []).length === 2,
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
        // a planted two-kind name: the open Attribute list's option "weight" and the Data panel's
        // row "weight". "#n" picks by position, which a person never sees, so it is refused
        x = step(H, "--click", "Data", "--click", "Add filter step", "--click", "Attribute");
        const before = pngs(H).length;
        x = step(H, "--click", "weight#1");
        check(
            "a position pick among different kinds of control is refused, naming each kind",
            /ambiguous: "weight#1" picks by position among different kinds of control, so the step did nothing; name it by kind: .*"role=option:weight"/.test(
                x.out,
            ) && pngs(H).length === before + 1,
            x.out,
        );
        x = step(H, "--click", "role=option:weight", "--expect", "New filter step");
        check("the same control named by kind is clicked", x.code === 0, x.out);
        x = step(H, "--key", "Escape", "--key", "Escape");
        x = step(H, "--click", "Nothing is called this");
        check("a participant's miss exits 0", x.code === 0 && /nothing on screen is called/.test(x.out), x.out);
        x = step(H, "--drop", "friends-v2.csv");
        check(
            "a drop where nothing takes it says it was not delivered",
            /the drop was not delivered: nothing in the middle of the window \(empty canvas\)/.test(x.out),
            x.out,
        );
    }
    node(["--end", H]);
    // a scripted walk's session fails a step that misses
    const M = join(base, "session-m");
    r = spawnSync(process.execPath, [self, "--start", M, "empty"], {
        encoding: "utf8",
        env: { ...process.env, REAL_MISS_FAILS: "1" },
    });
    if (check("a walk's session starts", r.status === 0, `exit ${r.status} ${r.stdout}${r.stderr}`)) {
        const x = step(M, "--click", "Nothing is called this");
        check("with REAL_MISS_FAILS=1 a planted miss exits 2", x.code === 2, `exit ${x.code} ${x.out}`);
    }
    node(["--end", M]);
    await proveRoutes(base, check, node, step);
    await proveWarm(base, check);
    const I = join(base, "session-i");
    r = node(["--start", I, "empty", "--task", "T17A"]);
    if (check("a start with a task", r.status === 0, `exit ${r.status} ${r.stdout}${r.stderr}`)) {
        // a data file dropped on the start screen opens the Data page as a new graph, not a project
        const x = step(I, "--drop", "friends.csv", "--expect", "Open as a new graph");
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
// --prove's checks of routes: a walk saves its route, --replay runs it again and stops at a planted
// difference, --rewalk sorts walks that match from walks that diverge, a batch stops at its first miss
async function proveRoutes(base, check, node, step) {
    const self = fileURLToPath(import.meta.url);
    const R = join(base, "route-walk");
    let r = node(["--start", R, "empty"]);
    if (!check("a walk to replay starts", r.status === 0, `exit ${r.status} ${r.stdout}${r.stderr}`)) return;
    step(R, "--click", "Open a file", "--upload", "florentine.gml", "--click", "Load");
    step(R, "--hover", "Undo");
    let x = step(R, "--click", "Nothing is called this", "--key", "Tab");
    check(
        "a batch stops at its first miss: the steps after it do not run",
        /^stopped after "--click Nothing is called this": the rest of this step \(--key\) did not run/m.test(x.out),
        x.out,
    );
    node(["--end", R]);
    const route = existsSync(join(R, "route.jsonl")) ? readRoute(R) : [];
    check(
        "a walk saves its route: how it started, then each step with its check points",
        route.length === 4 &&
            route[0].start === "empty" &&
            route[1].steps[0] === "--click" &&
            route[2].screen.length > 0,
        JSON.stringify(route).slice(0, 400),
    );
    const R2 = join(base, "route-replay");
    r = node(["--replay", R, R2]);
    check(
        "a replay of an unchanged route matches every check point and ends the session",
        r.status === 0 && /replayed all 3 steps; every check point matched/.test(r.stdout) && !existsSync(sockOf(R2)),
        `exit ${r.status} ${r.stdout}${r.stderr}`,
    );
    // a route whose second step saw another tooltip: the screen it replays on differs there
    const old = join(base, "route-old");
    const plantRoute = async (walk, edit) => {
        await mkdir(join(old, walk), { recursive: true });
        const lines = readRoute(R);
        edit(lines);
        await writeFile(join(old, walk, "route.jsonl"), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
    };
    await plantRoute("good", () => {});
    await plantRoute("changed", (l) => (l[2].out = ['tooltip: "Something the build no longer says"']));
    await plantRoute("missing", (l) => (l[1].steps = ["--click", "Open a file that is not there"]));
    const R3 = join(base, "route-diverged");
    r = node(["--replay", join(old, "changed"), R3]);
    check(
        "a replay stops at the first step whose check points differ, and leaves the session open there",
        r.status === 5 &&
            /^step 2 of 3 \(--hover Undo\) DIVERGED: the step printed other things/m.test(r.stdout) &&
            existsSync(sockOf(R3)),
        `exit ${r.status} ${r.stdout}${r.stderr}`,
    );
    node(["--end", R3]);
    const W = join(base, "route-new");
    r = spawnSync(process.execPath, [self, "--rewalk", old, W], {
        encoding: "utf8",
        env: { ...process.env, REAL_REWALK_PARALLEL: "1" },
    });
    const rw = existsSync(join(W, "rewalk.json"))
        ? JSON.parse(readFileSync(join(W, "rewalk.json"), "utf8"))
        : { walks: [] };
    const by = Object.fromEntries(rw.walks.map((w) => [w.walk, w]));
    check(
        "a rewalk replays every route: the unchanged one matches, a missing control and a changed screen diverge and keep their folder aside",
        r.status === 5 &&
            by.good &&
            !by.good.diverged &&
            /a control the route used is missing/.test(by.missing?.diverged?.why || "") &&
            by.changed?.diverged?.step === 2 &&
            existsSync(join(W, "changed-diverged", "02.png")) &&
            !existsSync(join(W, "changed")),
        `exit ${r.status} ${r.stdout}${r.stderr}`,
    );
}
// --prove's check of the warm pool, in a pool of its own: a start tops it up, and the next start of
// the same build takes the warm browser over instead of launching one
async function proveWarm(base, check) {
    const self = fileURLToPath(import.meta.url);
    const pool = join(base, "warm-slots");
    await mkdir(pool, { recursive: true });
    const env = {
        ...process.env,
        BROWSER_SLOT_DIR: pool,
        BROWSER_SLOTS: "6",
        REAL_WARM_POOL: "1",
        REAL_WARM_SECONDS: "180",
    };
    const run = (a) => spawnSync(process.execPath, [self, ...a], { encoding: "utf8", env });
    const [W1, W2] = [join(base, "warm-1"), join(base, "warm-2")];
    let r = run(["--start", W1, "empty"]);
    check("a cold start tops up the warm pool", r.status === 0, `exit ${r.status} ${r.stdout}${r.stderr}`);
    for (let i = 0; i < 240 && !warmOnes().ready.length; i++) await new Promise((ok) => setTimeout(ok, 500));
    const t = Date.now();
    r = run(["--start", W2, "empty"]);
    const took = Date.now() - t;
    const log = existsSync(join(W2, "session.log")) ? readFileSync(join(W2, "session.log"), "utf8") : "";
    check(
        "the next start of the same build takes over the warm browser, with the app already open",
        r.status === 0 && /took over warm browser/.test(log) && existsSync(join(W2, "01.png")),
        `exit ${r.status} in ${took} ms; ${r.stdout}${r.stderr}; session.log: ${log.slice(0, 300)}`,
    );
    for (const d of [W1, W2]) spawnSync(process.execPath, [self, "--end", d], { env: { ...env, REAL_WARM_POOL: "0" } });
    // the browsers it warmed after: stopped, so the planted pool leaves nothing running
    for (const f of existsSync(WARM_DIR) ? readdirSync(WARM_DIR) : []) {
        const pid = Number(f.match(/-(\d+)\.(sock|warming)$/)?.[1]);
        if (!pid || !f.startsWith(warmKey())) continue;
        try {
            process.kill(f.endsWith(".warming") ? -pid : pid, "SIGTERM");
        } catch {
            // already gone
        }
    }
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
} else if (mode === "--warm") {
    await serve(null, false);
} else if (mode === "--start") {
    const task = flag("--task");
    const [dir, how] = rest(["--sr", "--keys"], ["--task"]);
    if (!dir) {
        console.error("usage: real.mjs --start <session dir> [empty | setup:<file>] [--sr | --keys] [--task T17A]");
        code = 2;
    } else code = await start(dir, how || "empty", args.includes("--sr"), task, args.includes("--keys"));
} else if (mode === "--brief") {
    const [dir] = rest([], ["--task", "--persona"]);
    const why = dir
        ? await brief(dir, flag("--task"), flag("--persona"))
        : "usage: real.mjs --brief <session dir> [--task T17A --persona <name>]";
    if (why) {
        console.error(why);
        code = 2;
    } else console.log(join(scratchOf(resolve(dir)), "briefing.md"));
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
    let ended = true;
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
        ended = !!r.end;
        code = say(r);
    }
    const home = args[1] && studioOf(resolve(args[1]));
    if (ended && home) await copyBack(resolve(args[1]), home);
    // a slot just came free: warm the next browser of the build this command names
    if (ended && process.env.REAL_DIST) topUp();
} else if (mode === "--leaks") {
    const [dir, ...given] = args.slice(1);
    if (!dir) {
        console.error("usage: real.mjs --leaks <session dir> [transcript.jsonl ...] | --leaks <round dir>");
        code = 2;
    } else if (existsSync(join(resolve(dir), "sessions")) || existsSync(join(resolve(dir), "plan.md"))) {
        const r = await roundLeaks(resolve(dir));
        for (const line of r.lines) console.log(line);
        code = r.failed ? 1 : 0;
    } else {
        const own = under(resolve(dir), STUDIO) ? scratchOf(resolve(dir)) : resolve(dir);
        const l = leakCheck(
            own,
            given.map((g) => resolve(g)),
        );
        for (const line of leakLines(l, own)) console.log(line);
        code = l.leaks.length ? 1 : l.transcripts.length ? 0 : 2;
    }
} else if (mode === "--gate") {
    if (!args[1]) {
        console.error("usage: real.mjs --gate <round dir>");
        code = 2;
    } else {
        const g = gateCheck(resolve(args[1]));
        for (const p of g.problems) console.log(`FAIL: ${p}`);
        if (!g.problems.length) {
            // the plan names its gate evidence by file before the first session
            const plan = join(resolve(args[1]), "plan.md");
            const text = readFileSync(plan, "utf8").replace(/\n## Gate evidence\n[\s\S]*?(?=\n## |$(?![\s\S]))/, "");
            const section = `\n## Gate evidence\n\nChecked by \`real.mjs --gate\` on ${new Date().toISOString().slice(0, 10)}, build ${g.sha}:\n\n${g.evidence.map((e) => `- ${e}`).join("\n")}\n`;
            await writeFile(plan, text.trimEnd() + "\n" + section);
            console.log(`gate passed: ${g.evidence.length} files of evidence, listed in ${plan}`);
        }
        code = g.problems.length ? 1 : 0;
    }
} else if (mode === "--replay") {
    const [from, dir] = rest(["--end-on-diverge", "--keep"], []);
    if (!from || !dir) {
        console.error(
            "usage: real.mjs --replay <walk folder | route.jsonl> <new session dir> [--end-on-diverge] [--keep]",
        );
        code = 2;
    } else if (!existsSync(routeFile(resolve(from)))) {
        console.error(`no route.jsonl in ${resolve(from)}`);
        code = 2;
    } else
        code = await replay(from, dir, {
            endOnDiverge: args.includes("--end-on-diverge"),
            keep: args.includes("--keep"),
        });
} else if (mode === "--rewalk") {
    const [from, to] = rest([], ["--only"]);
    if (!from || !to) {
        console.error("usage: real.mjs --rewalk <old walks folder> <new walks folder> [--only <walk>,<walk>]");
        code = 2;
    } else code = await rewalk(from, to, flag("--only")?.split(","));
} else if (mode === "--prove") {
    code = await prove();
} else {
    console.error(
        "usage: real.mjs --brief <dir> | --start <dir> [empty|setup:<file>] [--sr] [--task T17A] | --step <dir> <steps...> | --end <dir> | --leaks <dir> [transcript.jsonl ...] | --leaks <round dir> | --gate <round dir> | --replay <walk> <dir> [--end-on-diverge] [--keep] | --rewalk <old walks> <new walks> [--only <walk>,...] | --prove",
    );
    code = 2;
}
if (mode !== "--serve" && mode !== "--warm") process.exit(code);
