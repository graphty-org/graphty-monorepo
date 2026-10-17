#!/usr/bin/env node
// Scores a tier 3 round's sessions against the scripted bars of ../tier3/criteria.md:
//   bar 1: each task's success (S or SD) at least 80% of its valid sessions, and each dataset half at
//          least 2 of 3 (67%); a task run at fewer than 4 sessions is reported, not judged
//   bar 2: no false "done" (a grade that says the participant claimed done while the screen showed
//          otherwise)
//   bar 3: the median wrong turns of each task's valid sessions at most 2
//   bar 4: time to the first styled graph on T39 (--task), whose sessions start with no graph open:
//          the median steps from 01.png to the first screenshot whose layers look different from the
//          first graph the session showed, at most twice the answer key's steps (--key-steps, default
//          6). Minutes between the two screenshots' own clocks are reported beside it, as a trend
//          only: a simulated participant's thinking time is in them. The same median over every
//          other task's empty-start sessions is reported, not judged
//
//   node score.mjs <round dir> [--key-steps N] [--task T39]   writes <round dir>/score.json
//   node score.mjs --self-test                     plants a failing and a passing round and checks both
//
// Reads <round dir>/plan.md (one row per session: | id | task | A or B: dataset | persona | `start` |),
// each sessions/<id>/grade.md's first lines ("Grade: S", "False done: no", "Wrong turns: 1"), and
// each session's styles-steps.jsonl (written by real.mjs). A re-run <id>b replaces a VOID <id>.
// A session with no readable grade fails the run: a bar measured on zero sessions does not hold.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, statSync, utimesSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const median = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

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
            persona: c[4],
            start: (c[5] ?? "").replaceAll("`", ""),
        }));
}

function readGrade(dir) {
    const f = join(dir, "grade.md");
    if (!existsSync(f)) return null;
    const t = readFileSync(f, "utf8");
    const grade = t.match(/^Grade: (S|SD|F|G|VOID)\b/m)?.[1];
    const falseDone = t.match(/^False done: (yes|no)\b/im)?.[1]?.toLowerCase();
    const turns = t.match(/^Wrong turns: (\d+)/m)?.[1];
    if (!grade || !falseDone || turns === undefined) return { unreadable: f };
    return { grade, falseDone: falseDone === "yes", wrongTurns: Number(turns) };
}

// Steps and minutes from 01.png to the first screenshot whose layers look different from the first
// graph the session showed; null when the session never changed a look
export function firstStyled(dir) {
    const f = join(dir, "styles-steps.jsonl");
    if (!existsSync(f)) return null;
    const lines = readFileSync(f, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
    const base = lines.find((l) => l.graph)?.look;
    const hit = lines.find((l) => l.graph && l.look !== base);
    if (!hit) return null;
    const clock = (shot) => {
        const p = join(dir, shot);
        return existsSync(p) ? statSync(p).mtimeMs : null;
    };
    const [t0, t1] = [clock("01.png"), clock(hit.shot)];
    return {
        shot: hit.shot,
        steps: Number(hit.shot.replace(/\.png$/, "")) - 1,
        minutes: t0 !== null && t1 !== null ? Math.round(((t1 - t0) / 60000) * 10) / 10 : null,
    };
}

export function score(rd, keySteps = 6, firstTask = "T39") {
    const problems = [];
    const sessions = [];
    for (const row of planRows(rd)) {
        // the latest valid of <id>, <id>b, <id>bb
        const tries = [row.id, `${row.id}b`, `${row.id}bb`].filter((id) => existsSync(join(rd, "sessions", id)));
        let used = null;
        for (const id of tries) {
            const g = readGrade(join(rd, "sessions", id));
            if (g?.unreadable) problems.push(`${g.unreadable} lacks the three grade lines`);
            if (g && !g.unreadable && g.grade !== "VOID") used = { id, ...g };
        }
        if (!used) {
            problems.push(`${row.id}: no valid grade (${tries.join(", ") || "no session folder"})`);
            continue;
        }
        const fs = row.start.startsWith("empty") ? firstStyled(join(rd, "sessions", used.id)) : null;
        sessions.push({ ...row, ...used, firstStyled: fs });
    }
    if (!sessions.length) problems.push("no valid session, so no bar was measured");
    const bars = [];
    const tasks = [...new Set(sessions.map((s) => s.task))].sort();
    for (const t of tasks) {
        const of = sessions.filter((s) => s.task === t);
        const ok = of.filter((s) => s.grade === "S" || s.grade === "SD").length;
        // a task run at fewer than 4 sessions is reported, not judged (criteria.md, bar 1)
        const judged = of.length >= 4;
        bars.push({
            bar: 1,
            what: `${t} success${judged ? "" : " (reported, not judged: fewer than 4 sessions)"}`,
            value: `${ok} of ${of.length}`,
            holds: !judged || ok / of.length >= 0.8,
        });
        for (const h of judged ? ["A", "B"] : []) {
            const hs = of.filter((s) => s.half === h);
            if (!hs.length) continue;
            const hok = hs.filter((s) => s.grade === "S" || s.grade === "SD").length;
            bars.push({
                bar: 1,
                what: `${t}${h} success`,
                value: `${hok} of ${hs.length}`,
                holds: hok / hs.length >= 2 / 3,
            });
        }
        const mt = median(of.map((s) => s.wrongTurns));
        bars.push({ bar: 3, what: `${t} median wrong turns`, value: String(mt), holds: mt <= 2 });
    }
    const fd = sessions.filter((s) => s.falseDone);
    bars.push({
        bar: 2,
        what: "false done",
        value: fd.length ? fd.map((s) => s.id).join(", ") : "0",
        holds: fd.length === 0 && sessions.length > 0,
    });
    const firstStyledOf = (of) => {
        const timed = of.filter((s) => s.firstStyled);
        return {
            timed,
            steps: median(timed.map((s) => s.firstStyled.steps)),
            minutes: median(timed.map((s) => s.firstStyled.minutes).filter((m) => m !== null)),
        };
    };
    const own = sessions.filter((s) => s.task === firstTask && s.start.startsWith("empty"));
    const f = firstStyledOf(own);
    bars.push({
        bar: 4,
        what: `${firstTask}: steps to the first styled graph (${f.timed.length} of ${own.length} sessions styled something; limit ${2 * keySteps})`,
        value: `median ${f.steps}; minutes median ${f.minutes} (trend only)`,
        holds: f.timed.length > 0 && f.steps <= 2 * keySteps,
    });
    const rest = firstStyledOf(sessions.filter((s) => s.task !== firstTask && s.start.startsWith("empty")));
    const reported = {
        otherTasksFirstStyled: { sessions: rest.timed.length, steps: rest.steps, minutes: rest.minutes },
    };
    return { problems, bars, reported, sessions, holds: !problems.length && bars.every((b) => b.holds) };
}

async function selfTest() {
    const base = mkdtempSync(join(tmpdir(), "score-"));
    const round = async (name, sessions) => {
        const rd = join(base, name);
        const rows = [];
        for (const s of sessions) {
            const d = join(rd, "sessions", s.id);
            await mkdir(d, { recursive: true });
            rows.push(
                `| ${s.id.replace(/b$/, "")} | ${s.task} | ${s.half}: data | Grace | \`${s.start ?? "empty"}\` |`,
            );
            if (s.grade)
                await writeFile(
                    join(d, "grade.md"),
                    `Grade: ${s.grade}\nFalse done: ${s.falseDone ? "yes" : "no"}\nWrong turns: ${s.turns ?? 0}\n\nnotes\n`,
                );
            const looks = s.looks ?? [null, "a", "a", "b"];
            const lines = looks.map((look, i) => ({
                shot: `${String(i + 1).padStart(2, "0")}.png`,
                at: "",
                graph: look !== null,
                look,
            }));
            await writeFile(join(d, "styles-steps.jsonl"), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
            for (const [i, l] of lines.entries()) {
                await writeFile(join(d, l.shot), "");
                utimesSync(join(d, l.shot), 1000 + i * 60, 1000 + i * 60);
            }
        }
        await writeFile(join(rd, "plan.md"), [...new Set(rows)].join("\n") + "\n");
        return rd;
    };
    const good = [
        { id: "r1-s01", task: "T40", half: "A", grade: "S" },
        { id: "r1-s02", task: "T40", half: "A", grade: "SD" },
        { id: "r1-s03", task: "T40", half: "B", grade: "S", turns: 1 },
        { id: "r1-s04", task: "T40", half: "B", grade: "S", turns: 3 },
        { id: "r1-s05", task: "T40", half: "B", grade: "S" },
    ];
    const pass = score(await round("pass", good), 6, "T40");
    assert.ok(pass.holds, `a passing round fails: ${JSON.stringify(pass, null, 1)}`);
    assert.equal(
        pass.bars.find((b) => b.bar === 4).value.startsWith("median 3"),
        true,
        "the look first changes on 04.png, 3 steps after 01.png",
    );
    // each planted failure must fail its own bar
    const planted = {
        "a dataset half below 2 of 3": [
            ...good.slice(0, 2),
            { id: "r1-s03", task: "T40", half: "B", grade: "F" },
            { id: "r1-s04", task: "T40", half: "B", grade: "G" },
            { id: "r1-s05", task: "T40", half: "B", grade: "S" },
        ],
        "a false done": [...good.slice(0, 4), { id: "r1-s05", task: "T40", half: "B", grade: "F", falseDone: true }],
        "wrong turns": good.map((s) => ({ ...s, turns: 4 })),
        "no session ever styled a graph": good.map((s) => ({ ...s, looks: [null, "a", "a"] })),
        "too many steps to the first styled graph": good.map((s) => ({
            ...s,
            looks: [null, ...Array(20).fill("a"), "b"],
        })),
        "a grade.md without its three lines": [
            ...good.slice(0, 4),
            { id: "r1-s05", task: "T40", half: "B", grade: "pass" },
        ],
        "a session with no grade.md": [...good.slice(0, 4), { id: "r1-s05", task: "T40", half: "B" }],
        "a VOID with no re-run": [...good.slice(0, 4), { id: "r1-s05", task: "T40", half: "B", grade: "VOID" }],
    };
    for (const [what, sessions] of Object.entries(planted)) {
        const r = score(await round(what.replaceAll(" ", "-"), sessions), 6, "T40");
        assert.equal(r.holds, false, `planted "${what}" was not caught`);
        console.log(
            `caught: ${what} (${[...r.problems, ...r.bars.filter((b) => !b.holds).map((b) => b.what)].join("; ")})`,
        );
    }
    // a VOID first run replaced by its re-run is scored on the re-run
    const rerun = score(
        await round("rerun", [
            ...good.slice(0, 4),
            { id: "r1-s05", task: "T40", half: "B", grade: "VOID" },
            { id: "r1-s05b", task: "T40", half: "B", grade: "S" },
        ]),
        6,
        "T40",
    );
    assert.ok(rerun.holds && rerun.sessions.some((s) => s.id === "r1-s05b"), "a re-run does not replace its VOID");
    await rm(base, { recursive: true, force: true });
    console.log("score.mjs self-test: every planted failure caught, the passing round passes");
}

const args = process.argv.slice(2);
if (args[0] === "--self-test") await selfTest();
else if (args[0]) {
    const rd = resolve(args[0]);
    const ki = args.indexOf("--key-steps");
    const ti = args.indexOf("--task");
    const r = score(rd, ki > 0 ? Number(args[ki + 1]) : 6, ti > 0 ? args[ti + 1] : "T39");
    await writeFile(join(rd, "score.json"), JSON.stringify(r, null, 1) + "\n");
    for (const p of r.problems) console.log(`PROBLEM: ${p}`);
    for (const b of r.bars) console.log(`${b.holds ? "holds" : "FAILS"}  bar ${b.bar}  ${b.what}: ${b.value}`);
    const o = r.reported.otherTasksFirstStyled;
    console.log(
        `reported: other tasks' steps to the first styled graph, median ${o.steps} over ${o.sessions} sessions`,
    );
    console.log(r.holds ? "every scripted bar holds" : "a scripted bar fails or was not measured");
    process.exitCode = r.holds ? 0 : 1;
} else {
    console.error("usage: score.mjs <round dir> [--key-steps N] | --self-test");
    process.exitCode = 2;
}
