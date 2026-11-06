#!/usr/bin/env node
// Bar 7 of ../tier4/criteria.md (cost on core tasks): counts each session's steps and holds each
// core task's median against the answer key's path step count plus 3.
//
// A step is one input a person makes: a click of any kind (by name or at a point), a key or chord, a
// text typed, a file chosen, a file dropped, a drag, a wheel turn, a reopened tab. Looking is not a
// step: --hover, --hover-at, --hover-icon, --read, --expect, --expect-not, --wait. Steps are read
// from the session's route.jsonl (real.mjs writes every --step there, the setup's steps not among
// them). The path's count is the answer key's "Path steps: N" line in the task's section of
// answers.md ("Path steps: 12 (A)" for one half, "B path steps: 9", "Path steps: 3 (B: 4 ...)" for
// a different B). A session counts once graded and not VOID (its re-run <id>b replaces it); a
// keyboard-only session (start with --keys) counts its steps in another unit, so it is reported
// apart. A core task with no path count, or with no session to count, does not hold.
//
//   node steps.mjs <round dir> [--answers <answers.md>]   writes <round dir>/steps.json; exit 1 when
//                                                          a core task's median is over its limit or
//                                                          cannot be measured
//   node steps.mjs --self-test                            plants a failing and a passing round
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const CORE = ["T61", "T62", "T65", "T67"];
export const OVER = 3;
const ACTS = new Set([
    "--click",
    "--rclick",
    "--dblclick",
    "--shift-click",
    "--ctrl-click",
    "--alt-click",
    "--click-at",
    "--rclick-at",
    "--dblclick-at",
    "--drag",
    "--wheel",
    "--key",
    "--type",
    "--upload",
    "--drop",
    "--reopen",
]);

const median = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// "Path steps: N" per task and half, from the answer key
export function pathSteps(text) {
    const out = {};
    const sections = text.split(/^## /m).slice(1);
    for (const sec of sections) {
        const task = sec.match(/^(T\d+)\./)?.[1];
        if (!task) continue;
        for (const m of sec.matchAll(/(?:\b([AB]) )?[Pp]ath steps: (\d+)(?: \((?:([AB])\)|B: (\d+)))?/g)) {
            const [, pre, n, post, b] = m;
            const half = pre || post;
            if (half) out[task + half] = Number(n);
            else {
                out[`${task}A`] ??= Number(n);
                out[`${task}B`] ??= Number(b ?? n);
            }
        }
    }
    return out;
}

// the inputs a session made
export function countSteps(dir) {
    const f = join(dir, "route.jsonl");
    if (!existsSync(f)) return null;
    const recs = readFileSync(f, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
        .filter((r) => Array.isArray(r.steps));
    return recs.reduce((n, r) => n + r.steps.filter((a) => ACTS.has(a)).length, 0);
}

function planRows(rd) {
    const plan = join(rd, "plan.md");
    if (!existsSync(plan)) return [];
    return readFileSync(plan, "utf8")
        .split("\n")
        .map((l) => l.split("|").map((c) => c.trim()))
        .filter((c) => /^r\d+-s\d+$/.test(c[1] ?? ""))
        .map((c) => ({
            id: c[1],
            task: c[2],
            half: c[3].match(/^([AB]):/)?.[1] ?? "A",
            keys: /--keys\b/.test(c[5] ?? ""),
        }));
}
const gradeOf = (dir) =>
    existsSync(join(dir, "grade.md"))
        ? (readFileSync(join(dir, "grade.md"), "utf8").match(/^Grade: (S|SD|P|F|G|VOID)\b/m)?.[1] ?? "unreadable")
        : null;

export function measure(rd, answers) {
    const paths = pathSteps(readFileSync(answers, "utf8"));
    const problems = [];
    const sessions = [];
    for (const row of planRows(rd)) {
        if (!CORE.includes(row.task)) continue;
        const tries = [row.id, `${row.id}b`, `${row.id}bb`].filter((id) => existsSync(join(rd, "sessions", id)));
        const used = tries.filter((id) => gradeOf(join(rd, "sessions", id)) !== "VOID").pop();
        if (!used) continue;
        const dir = join(rd, "sessions", used);
        const grade = gradeOf(dir);
        const steps = countSteps(dir);
        if (grade === null || grade === "unreadable")
            problems.push(`${used}: no readable grade.md, so not counted yet`);
        else if (steps === null) problems.push(`${used}: no route.jsonl`);
        else sessions.push({ id: used, task: row.task, half: row.half, keys: row.keys, grade, steps });
    }
    const tasks = CORE.map((task) => {
        const of = sessions.filter((s) => s.task === task && !s.keys);
        const path = { A: paths[`${task}A`] ?? null, B: paths[`${task}B`] ?? null };
        // each session against its own half's path; the median of the steps over the path
        const over = of.filter((s) => path[s.half] !== null).map((s) => s.steps - path[s.half]);
        const m = median(over);
        const holds = m !== null && m <= OVER && path.A !== null && path.B !== null;
        const why =
            path.A === null || path.B === null
                ? `no path step count in answers.md for ${task}${path.A === null ? "A" : "B"}`
                : m === null
                  ? "no counted session"
                  : `median ${m} steps over the path (limit ${OVER})`;
        return {
            task,
            path,
            sessions: of.map((s) => `${s.id} ${s.half} ${s.grade} ${s.steps} steps`),
            keyboard: sessions.filter((s) => s.task === task && s.keys).map((s) => `${s.id} ${s.steps} steps`),
            medianOver: m,
            holds,
            why,
        };
    });
    return { tasks, problems, holds: tasks.every((t) => t.holds) };
}

async function selfTest() {
    const rd = mkdtempSync(join(tmpdir(), "steps-"));
    const answers = join(rd, "answers.md");
    try {
        await writeFile(
            answers,
            [
                "## T61. Two\n  Path steps: 6.",
                "## T62. Read\n  Path steps: 5.",
                "## T64. Name\n  B path steps: 9.",
                "## T65. Some\n  Path steps: 12 (A). x\n  Path steps: 12 (B). y",
                "## T67. Wrong\n  Path steps: 3 (B: 4 with Read as yes/no).",
            ].join("\n\n"),
        );
        assert.deepEqual(pathSteps(readFileSync(answers, "utf8")), {
            T61A: 6,
            T61B: 6,
            T62A: 5,
            T62B: 5,
            T64B: 9,
            T65A: 12,
            T65B: 12,
            T67A: 3,
            T67B: 4,
        });
        const rows = [];
        const session = async (id, task, half, n, { grade = "S", keys = false, looks = 2 } = {}) => {
            rows.push(`| ${id} | ${task} | ${half}: data | P | \`${keys ? "empty --keys" : "empty"}\` |`);
            const d = join(rd, "sessions", id);
            await mkdir(d, { recursive: true });
            const recs = [{ start: "empty" }];
            for (let i = 0; i < n; i++) recs.push({ steps: i % 2 ? ["--key", "Enter"] : ["--click", "x"] });
            for (let i = 0; i < looks; i++) recs.push({ steps: ["--hover", "x", "--read", "--expect", "y"] });
            await writeFile(join(d, "route.jsonl"), recs.map((r) => JSON.stringify(r)).join("\n") + "\n");
            await writeFile(join(d, "grade.md"), `Grade: ${grade}\nFalse done: no\nWrong turns: 0\n`);
        };
        await session("r1-s01", "T61", "A", 7);
        await session("r1-s02", "T61", "B", 9);
        await session("r1-s03", "T62", "A", 5);
        await session("r1-s04", "T65", "B", 15);
        await session("r1-s05", "T67", "A", 3);
        await session("r1-s06", "T67", "B", 5);
        await session("r1-s07", "T61", "A", 40, { keys: true });
        await session("r1-s08", "T62", "B", 99, { grade: "VOID" });
        const plan = () => writeFile(join(rd, "plan.md"), rows.join("\n") + "\n");
        await plan();
        let r = measure(rd, answers);
        assert.ok(r.holds, `the planted passing round failed: ${JSON.stringify(r.tasks)}`);
        assert.equal(r.tasks[0].medianOver, 2, "T61: 7-6 and 9-6, hovers and reads not counted");
        assert.deepEqual(r.tasks[0].keyboard, ["r1-s07 40 steps"], "a keyboard-only session is reported apart");
        assert.equal(r.tasks[1].sessions.length, 1, "a VOID session was counted");
        console.log("a passing round holds: medians", r.tasks.map((t) => `${t.task} ${t.medianOver}`).join(", "));
        await session("r1-s09", "T65", "A", 17);
        await session("r1-s10", "T65", "A", 20);
        await plan();
        r = measure(rd, answers);
        assert.ok(!r.holds && !r.tasks[2].holds, "a T65 median of 5 over the path held");
        console.log(`caught a core task over its limit: T65 ${r.tasks[2].why}`);
        await writeFile(answers, "## T61. Two\n  Path steps: 6.\n");
        r = measure(rd, answers);
        assert.ok(!r.tasks[1].holds && /no path step count/.test(r.tasks[1].why), "a task with no path count held");
        console.log(`caught a task with no path count: T62 ${r.tasks[1].why}`);
        await rm(join(rd, "sessions"), { recursive: true });
        r = measure(rd, answers);
        assert.ok(!r.holds && r.tasks.every((t) => !t.holds), "a round with no sessions held");
        console.log("a round with no session to count fails");
        console.log("self-test: every planted case caught");
    } finally {
        await rm(rd, { recursive: true, force: true });
    }
}

const args = process.argv.slice(2);
if (args[0] === "--self-test") await selfTest();
else if (!args[0]) {
    console.error("usage: steps.mjs <round dir> [--answers <answers.md>] | --self-test");
    process.exit(2);
} else {
    const rd = resolve(args[0]);
    const ai = args.indexOf("--answers");
    const tier = rd.match(/\/(tier\d+)\//)?.[1] ?? "tier4";
    const answers = ai > 0 ? resolve(args[ai + 1]) : join(here, "..", tier, "answers.md");
    const r = measure(rd, answers);
    await writeFile(join(rd, "steps.json"), JSON.stringify(r, null, 1) + "\n");
    for (const t of r.tasks) {
        console.log(`${t.holds ? "holds" : "FAILS"} ${t.task} (path A ${t.path.A}, B ${t.path.B}): ${t.why}`);
        for (const s of t.sessions) console.log(`  ${s}`);
        for (const s of t.keyboard) console.log(`  keyboard only, not counted: ${s}`);
    }
    for (const p of r.problems) console.log(`  (${p})`);
    console.log(join(rd, "steps.json"));
    process.exit(r.holds ? 0 : 1);
}
