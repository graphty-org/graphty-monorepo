#!/usr/bin/env node
// Scores a tier 3 round's sessions against the scripted bars of ../tier3/criteria.md:
//   bar 1: each task's success (S or SD) at least 80% of its valid sessions, and each dataset half at
//          least 2 of 3 (67%); a task run at fewer than 4 sessions does not hold (the study cannot
//          pass while a task is unjudged). A task in ROUTE_TASKS (T47, T48) holds only when at least
//          half its successes went by the bulk route under study (grade.md "Route: folder" or
//          "several"), which is also the stall rule's count. Bar 1 over the newcomers alone (every
//          persona but Alex and Maren, who know another graph tool) is reported, not judged
//   bar 2: no false "done" (a grade that says the participant claimed done while the screen showed
//          otherwise)
//   bar 3: the median wrong turns of each task's valid sessions at most 2
//   bar 4: time to the first styled graph on T39 (--task), whose sessions start with no graph open:
//          the median steps from 01.png to the first screenshot where every node is drawn in one
//          color that is not the start's (T39's success state), at most BAR4_LIMIT (10, a fixed
//          number in the criteria: twice the answer key's 5; only a criteria change moves it); a session that never got there, or was not graded S or SD, counts
//          as never (Infinity). Keyboard-only sessions (start "empty --keys") count their steps in
//          another unit, so they are left out and reported apart. Minutes between the two
//          screenshots' own clocks are reported beside it, as a trend
//          only: a simulated participant's thinking time is in them. The same median over every
//          other task's empty-start sessions is reported, not judged
//
//   node score.mjs <round dir> [--task T39]   writes <round dir>/score.json
//   node score.mjs <tier 5 round dir> [--tier 5] [--rating-gates]   tier 5's bars (scoreTier5 below)
//   node score.mjs --self-test                     plants a failing and a passing round and checks both
//
// Reads <round dir>/plan.md (one row per session: | id | task | A or B: dataset | persona | `start` |),
// each sessions/<id>/grade.md's first lines ("Grade: S", "False done: no", "Wrong turns: 1", and
// "Route: folder|several|one by one|around|cover" on a ROUTE_TASKS success, "Scripted exit: yes" on a G
// the persona file scripted), and
// each session's styles-steps.jsonl (written by real.mjs). A re-run <id>b replaces a VOID <id>.
// A session with no readable grade fails the run: a bar measured on zero sessions does not hold.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, statSync, utimesSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// tasks whose success counts only when most of it went by the bulk route under study
const ROUTE_TASKS = new Set(["T47", "T48"]);
const BULK_ROUTES = new Set(["folder", "several"]);

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
    const grade = t.match(/^Grade: (S|SD|P|F|G|VOID)\b/m)?.[1];
    const falseDone = t.match(/^False done: (yes|no)\b/im)?.[1]?.toLowerCase();
    const turns = t.match(/^Wrong turns: (\d+)/m)?.[1];
    const route = t.match(/^Route: (folder|several|one by one|around|cover)\b/im)?.[1]?.toLowerCase() ?? null;
    const scriptedExit = /^Scripted exit: yes\b/im.test(t);
    // tier 5's follow-up rating: "Overwhelm: 5 -- <screen element> -- <the reason, in their words>"
    const ow = t.match(/^Overwhelm: ([1-7])\b(?:\s*--\s*([^\n]*?)(?:\s+--\s+(.*))?)?\s*$/m);
    const overwhelm = ow
        ? { rating: Number(ow[1]), element: ow[2]?.trim().toLowerCase() || null, reason: ow[3] ?? null }
        : null;
    if (!grade || !falseDone || turns === undefined) return { unreadable: f };
    return { grade, falseDone: falseDone === "yes", wrongTurns: Number(turns), route, scriptedExit, overwhelm };
}

// Steps and minutes from 01.png to the first screenshot whose layers look different from the first
// graph the session showed; with oneColor, to the first whose nodes are all drawn in one color that
// is not the start's (bar 4, T39's success state). null when the session never got there
export function firstStyled(dir, oneColor = false) {
    const f = join(dir, "styles-steps.jsonl");
    if (!existsSync(f)) return null;
    const lines = readFileSync(f, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
    const start = lines.find((l) => l.graph);
    const hit = oneColor
        ? lines.find(
              (l) => l.graph && l.colors?.length === 1 && JSON.stringify(l.colors) !== JSON.stringify(start?.colors),
          )
        : lines.find((l) => l.graph && l.look !== start?.look);
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

// bar 4's limit, fixed by ../tier3/criteria.md; never derived from the answer key
export const BAR4_LIMIT = 10;

export function score(rd, firstTask = "T39") {
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
        if (ROUTE_TASKS.has(row.task) && (used.grade === "S" || used.grade === "SD") && !used.route)
            problems.push(`${used.id}: a ${row.task} success needs a "Route:" line in grade.md`);
        const fs = row.start.startsWith("empty")
            ? firstStyled(join(rd, "sessions", used.id), row.task === firstTask)
            : null;
        sessions.push({ ...row, ...used, firstStyled: fs });
    }
    if (!sessions.length) problems.push("no valid session, so no bar was measured");
    const bars = [];
    const tasks = [...new Set(sessions.map((s) => s.task))].sort();
    for (const t of tasks) {
        const of = sessions.filter((s) => s.task === t);
        const wins = of.filter((s) => s.grade === "S" || s.grade === "SD");
        const ok = wins.length;
        // a task run at fewer than 4 sessions is not judged, so it does not hold (criteria.md, bar 1)
        const judged = of.length >= 4;
        bars.push({
            bar: 1,
            what: `${t} success${judged ? "" : " (not judged: fewer than 4 sessions, so it does not hold)"}`,
            value: `${ok} of ${of.length}`,
            holds: judged && ok / of.length >= 0.8,
        });
        if (ROUTE_TASKS.has(t)) {
            const bulk = wins.filter((s) => BULK_ROUTES.has(s.route)).length;
            const routes = Object.entries(Object.groupBy(wins, (s) => s.route ?? "none"))
                .map(([r, xs]) => `${r} ${xs.length}`)
                .join(", ");
            bars.push({
                bar: 1,
                what: `${t} successes on the bulk route (folder or several; at least half, the stall rule's count)`,
                value: `${bulk} of ${ok} (${routes || "no success"})`,
                holds: ok > 0 && bulk * 2 >= ok,
            });
        }
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
    // a session that never got there counts as never, so it pulls the median up instead of out
    const firstStyledOf = (of, never = Infinity) => {
        const timed = of.filter((s) => s.firstStyled);
        return {
            timed,
            steps: median((never === null ? timed : of).map((s) => s.firstStyled?.steps ?? never)),
            minutes: median(timed.map((s) => s.firstStyled.minutes).filter((m) => m !== null)),
        };
    };
    const keys = (s) => s.start.includes("--keys");
    const won = (s) => s.grade === "S" || s.grade === "SD";
    // a session not graded S or SD never reached the success state, whatever color it drew
    const own = sessions
        .filter((s) => s.task === firstTask && s.start.startsWith("empty") && !keys(s))
        .map((s) => (won(s) ? s : { ...s, firstStyled: null }));
    const f = firstStyledOf(own);
    bars.push({
        bar: 4,
        what: `${firstTask}: steps to every node in one new color (${f.timed.length} of ${own.length} sessions got there; limit ${BAR4_LIMIT})`,
        value: `median ${f.steps}; minutes median ${f.minutes} (trend only)`,
        holds: own.length > 0 && f.steps <= BAR4_LIMIT,
    });
    // reported only: other tasks' first change of any look, over the sessions that made one
    const rest = firstStyledOf(
        sessions.filter((s) => s.task !== firstTask && s.start.startsWith("empty")),
        null,
    );
    const newcomers = sessions.filter((s) => !/^(Alex|Maren)\b/.test(s.persona));
    const reported = {
        otherTasksFirstStyled: { sessions: rest.timed.length, steps: rest.steps, minutes: rest.minutes },
        // the keyboard user's steps to the first styled graph, in key presses: bar 7's evidence, not bar 4's
        keyboardFirstStyled: sessions
            .filter((s) => s.task === firstTask && keys(s))
            .map((s) => ({ id: s.id, grade: s.grade, steps: s.firstStyled?.steps ?? null })),
        // bar 1 without the two personas who know another graph tool
        newcomersOnly: Object.fromEntries(
            tasks.map((t) => {
                const of = newcomers.filter((s) => s.task === t);
                return [t, `${of.filter(won).length} of ${of.length}`];
            }),
        ),
        // a give-up the persona file scripted: graded G, kept in bar 1's denominator
        scriptedExits: sessions.filter((s) => s.scriptedExit).map((s) => s.id),
    };
    return { problems, bars, reported, sessions, holds: !problems.length && bars.every((b) => b.holds) };
}

// ---------- tier 5 (../tier5/criteria.md) ----------
// Bar 1: each task's S or SD at least 75% of its valid pointer sessions and no dataset half with 0
// successes: 2 of 2 on a two-session task, 3 of 4 on a four-session task; a task with fewer valid
// sessions than its plan runs does not hold. Bar 2: no false "done". Bar 3: each task's median
// wrong turns at most 2. Bar 9 (its scripted half): every valid pointer session's "Overwhelm:" line;
// no screen element named as the reason for a rating of 4 or more in two sessions on different task
// halves; and the median rating (at most 2, no task half's median above 3), which gates only when the
// rating check held (ratingGates), and is reported as a measure otherwise. Sam's keyboard-only
// sessions (a start with --keys) count in none of these: bar 5 needs them S or SD, reported here.
export const T5_SUCCESS = 0.75;
export const T5_RATING = { median: 2, half: 3, named: 4 };
export function scoreTier5(rd, { ratingGates = false } = {}) {
    const problems = [];
    const sessions = [];
    for (const row of planRows(rd)) {
        const tries = [row.id, `${row.id}b`, `${row.id}bb`].filter((id) => existsSync(join(rd, "sessions", id)));
        let used = null;
        for (const id of tries) {
            const g = readGrade(join(rd, "sessions", id));
            if (g?.unreadable) problems.push(`${g.unreadable} lacks the three grade lines`);
            if (g && !g.unreadable && g.grade !== "VOID") used = { id, ...g };
        }
        const keys = row.start.includes("--keys");
        if (!used) {
            problems.push(`${row.id}: no valid grade (${tries.join(", ") || "no session folder"})`);
            sessions.push({ ...row, keys, missing: true });
            continue;
        }
        if (!keys && !used.overwhelm)
            problems.push(
                `${used.id}: no readable "Overwhelm: <1-7> -- <screen element> -- <reason>" line in grade.md`,
            );
        sessions.push({ ...row, ...used, keys });
    }
    const pointer = sessions.filter((s) => !s.keys);
    const valid = pointer.filter((s) => !s.missing);
    if (!valid.length) problems.push("no valid pointer session, so no bar was measured");
    const won = (s) => s.grade === "S" || s.grade === "SD";
    const bars = [];
    for (const t of [...new Set(pointer.map((s) => s.task))].sort()) {
        const planned = pointer.filter((s) => s.task === t);
        const of = valid.filter((s) => s.task === t);
        const ok = of.filter(won).length;
        const halves = [...new Set(planned.map((s) => s.half))].sort();
        const empty = halves.filter((h) => !of.some((s) => s.half === h && won(s)));
        bars.push({
            bar: 1,
            what: `${t} success (at least ${T5_SUCCESS * 100}% of ${planned.length}, no half with 0)`,
            value: `${ok} of ${of.length}${of.length < planned.length ? ` (${planned.length - of.length} planned not valid)` : ""}${empty.length ? `; no success on ${empty.join(", ")}` : ""}`,
            holds: of.length === planned.length && of.length > 0 && ok / of.length >= T5_SUCCESS && !empty.length,
        });
        const mt = median(of.map((s) => s.wrongTurns));
        bars.push({ bar: 3, what: `${t} median wrong turns`, value: String(mt), holds: mt !== null && mt <= 2 });
    }
    const fd = valid.filter((s) => s.falseDone);
    bars.push({
        bar: 2,
        what: "false done",
        value: fd.length ? fd.map((s) => s.id).join(", ") : "0",
        holds: fd.length === 0 && valid.length > 0,
    });
    // bar 9: a screen element named as the reason for a 4 or more in two sessions on different halves
    const rated = valid.filter((s) => s.overwhelm);
    const high = rated.filter(
        (s) => s.overwhelm.rating >= T5_RATING.named && s.overwhelm.element && s.overwhelm.element !== "none",
    );
    const byElement = Object.groupBy(high, (s) => s.overwhelm.element);
    const named = Object.entries(byElement).filter(([, xs]) => new Set(xs.map((x) => x.task + x.half)).size >= 2);
    bars.push({
        bar: 9,
        what: `no screen element named as the reason for a rating of ${T5_RATING.named} or more in two sessions on different task halves`,
        value: named.length
            ? named
                  .map(
                      ([e, xs]) =>
                          `"${e}": ${xs.map((x) => `${x.id} ${x.task}${x.half} ${x.overwhelm.rating}`).join(", ")}`,
                  )
                  .join("; ")
            : "none",
        holds: !named.length && rated.length > 0,
    });
    const m = median(rated.map((s) => s.overwhelm.rating));
    const halfMedians = Object.entries(Object.groupBy(rated, (s) => s.task + s.half))
        .map(([h, xs]) => [h, median(xs.map((x) => x.overwhelm.rating))])
        .sort(([a], [b]) => a.localeCompare(b));
    const overHalf = halfMedians.filter(([, v]) => v > T5_RATING.half);
    const ratingHolds = m !== null && m <= T5_RATING.median && !overHalf.length;
    const rating = {
        bar: 9,
        what: `median overwhelm rating at most ${T5_RATING.median}, no task half above ${T5_RATING.half}${ratingGates ? "" : " (a measure: the rating check did not hold, so it gates nothing)"}`,
        value: `median ${m} over ${rated.length}; by half ${halfMedians.map(([h, v]) => `${h} ${v}`).join(", ")}`,
        holds: ratingGates ? ratingHolds : true,
        measured: ratingHolds,
    };
    bars.push(rating);
    // bar 5's grade half: Sam's sessions S or SD (the rest of bar 5 is the walks' and bars.mjs's)
    const sam = sessions.filter((s) => s.keys);
    if (sam.length)
        bars.push({
            bar: 5,
            what: "keyboard-only sessions S or SD",
            value: sam.map((s) => `${s.id} ${s.missing ? "no valid grade" : s.grade}`).join(", "),
            holds: sam.every((s) => !s.missing && won(s)),
        });
    const reported = {
        // every rating with its coded reason, for the report's overwhelm table
        overwhelm: rated.map((s) => ({ id: s.id, half: s.task + s.half, ...s.overwhelm })),
        keyboard: sam.map((s) => ({ id: s.id, task: s.task, grade: s.grade ?? null })),
    };
    return { tier: "5", problems, bars, reported, sessions, holds: !problems.length && bars.every((b) => b.holds) };
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
                `| ${s.id.replace(/b$/, "")} | ${s.task} | ${s.half}: data | ${s.persona ?? "Grace"} | \`${s.start ?? "empty"}\` |`,
            );
            if (s.grade)
                await writeFile(
                    join(d, "grade.md"),
                    `Grade: ${s.grade}\nFalse done: ${s.falseDone ? "yes" : "no"}\nWrong turns: ${s.turns ?? 0}\n` +
                        (s.route ? `Route: ${s.route}\n` : "") +
                        (s.scripted ? "Scripted exit: yes\n" : "") +
                        "\nnotes\n",
                );
            // one color per look by default: "b" is every node in one new color
            const looks = s.looks ?? [null, "a", "a", "b"];
            const lines = looks.map((look, i) => ({
                shot: `${String(i + 1).padStart(2, "0")}.png`,
                at: "",
                graph: look !== null,
                look,
                colors: look === null ? null : (s.colors?.[i] ?? [look]),
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
    const pass = score(await round("pass", good), "T40");
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
        // 11 steps: over the fixed limit of 10, though under twice a key of 6
        "eleven steps to the first styled graph": good.map((s) => ({
            ...s,
            looks: [null, ...Array(10).fill("a"), "b"],
        })),
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
        "a task run at fewer than 4 sessions": [
            ...good,
            { id: "r1-s06", task: "T41", half: "A", grade: "S" },
            { id: "r1-s07", task: "T41", half: "B", grade: "S" },
        ],
        "one session of five got to one new color, the rest never did": good.map((s, i) => ({
            ...s,
            looks: i ? [null, "a", "a"] : undefined,
        })),
        "the look changed but the nodes never all took one new color": good.map((s) => ({
            ...s,
            colors: [null, ["x"], ["x", "y"], ["x", "y"]],
        })),
        "T47 passed all one by one": [
            ...good,
            ...["r1-s06", "r1-s07", "r1-s08", "r1-s09"].map((id, i) => ({
                id,
                task: "T47",
                half: i < 2 ? "A" : "B",
                grade: "S",
                route: "one by one",
            })),
        ],
        "a T48 success with no Route line": [
            ...good,
            ...["r1-s06", "r1-s07", "r1-s08", "r1-s09"].map((id, i) => ({
                id,
                task: "T48",
                half: i < 2 ? "A" : "B",
                grade: "S",
                route: i ? "folder" : undefined,
            })),
        ],
        "only keyboard-only sessions reached one new color": good.map((s, i) => ({
            ...s,
            start: i < 3 ? "empty --keys" : "empty",
            looks: i < 3 ? undefined : [null, "a", "a"],
        })),
        "the one session that reached one new color was graded F": good.map((s, i) => ({
            ...s,
            grade: i === 2 ? "F" : s.grade,
            looks: i === 2 ? undefined : [null, "a", "a"],
        })),
        "T47 passed only around the clusters": [
            ...good,
            ...["r1-s06", "r1-s07", "r1-s08", "r1-s09"].map((id, i) => ({
                id,
                task: "T47",
                half: i < 2 ? "A" : "B",
                grade: "S",
                route: i ? "around" : "folder",
            })),
        ],
        "a T47 success with no Route line": [
            ...good,
            ...["r1-s06", "r1-s07", "r1-s08", "r1-s09"].map((id, i) => ({
                id,
                task: "T47",
                half: i < 2 ? "A" : "B",
                grade: "S",
                route: i ? "folder" : undefined,
            })),
        ],
    };
    for (const [what, sessions] of Object.entries(planted)) {
        const r = score(await round(what.replaceAll(" ", "-"), sessions), "T40");
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
        "T40",
    );
    assert.ok(rerun.holds && rerun.sessions.some((s) => s.id === "r1-s05b"), "a re-run does not replace its VOID");
    // T47 through the clusters, and a scripted exit kept in the denominator as G
    const routed = score(
        await round("routed", [
            ...good,
            ...["r1-s06", "r1-s07", "r1-s08", "r1-s09", "r1-s10", "r1-s11"].map((id, i) => ({
                id,
                task: "T47",
                half: i < 3 ? "A" : "B",
                grade: i === 5 ? "G" : "S",
                route: ["folder", "several", "around", "one by one", "folder"][i],
                persona: i === 0 ? "Alex" : undefined,
                scripted: i === 5,
            })),
        ]),
        "T40",
    );
    assert.ok(
        routed.holds,
        `a T47 passed through the clusters fails: ${JSON.stringify(routed.bars.filter((b) => !b.holds))}`,
    );
    assert.deepEqual(routed.reported.scriptedExits, ["r1-s11"], "a scripted exit was not reported");
    assert.match(routed.bars.find((b) => b.what.startsWith("T47 successes")).value, /^3 of 5 /);
    assert.equal(
        routed.reported.newcomersOnly.T47,
        "4 of 5",
        "Alex's session was not left out of the newcomers' count",
    );
    // tier 5: two-session and four-session tasks, Sam's keyboard sessions left out, the ratings
    const round5 = async (name, sessions) => {
        const rd = join(base, `t5-${name}`);
        await mkdir(rd, { recursive: true });
        const rows = [];
        for (const s of sessions) {
            const d = join(rd, "sessions", s.id);
            await mkdir(d, { recursive: true });
            rows.push(
                `| ${s.id.replace(/b$/, "")} | ${s.task} | ${s.half}: data | P | \`setup:x.txt${s.keys ? " --keys" : ""}\` |`,
            );
            if (s.grade)
                await writeFile(
                    join(d, "grade.md"),
                    `Grade: ${s.grade}\nFalse done: ${s.falseDone ? "yes" : "no"}\nWrong turns: ${s.turns ?? 1}\n` +
                        (s.ow === null ? "" : `Overwhelm: ${s.ow ?? "2 -- none -- it was clear"}\n`),
                );
        }
        await writeFile(join(rd, "plan.md"), [...new Set(rows)].join("\n") + "\n");
        return rd;
    };
    const good5 = [
        { id: "r1-s01", task: "T70", half: "A", grade: "S" },
        { id: "r1-s02", task: "T70", half: "B", grade: "SD", ow: "5 -- the reference picker -- too many names" },
        { id: "r1-s03", task: "T70", half: "A", grade: "F", turns: 4 },
        { id: "r1-s04", task: "T70", half: "B", grade: "S", ow: "1 -- none -- calm" },
        { id: "r1-s21", task: "T72", half: "A", grade: "S", ow: "3 -- the matches strip -- busy" },
        { id: "r1-s22", task: "T72", half: "B", grade: "SD", ow: "4 -- the matches strip -- in the way" },
        { id: "r1-s29", task: "T70", half: "A", grade: "S", keys: true, ow: null },
    ];
    const ok5 = scoreTier5(await round5("pass", good5));
    assert.ok(
        ok5.holds,
        `a passing tier 5 round fails: ${JSON.stringify([ok5.problems, ok5.bars.filter((b) => !b.holds)])}`,
    );
    assert.match(
        ok5.bars.find((b) => b.what.startsWith("T70 success")).value,
        /^3 of 4/,
        "Sam's session was counted in bar 1",
    );
    assert.equal(ok5.reported.overwhelm.find((o) => o.id === "r1-s02").element, "the reference picker");
    console.log("tier 5: a passing round holds (3 of 4, 2 of 2, Sam apart, ratings coded by screen element)");
    const planted5 = {
        "a four-session task at 2 of 4": good5.map((s) => (s.id === "r1-s04" ? { ...s, grade: "P" } : s)),
        "a two-session task at 1 of 2": good5.map((s) => (s.id === "r1-s22" ? { ...s, grade: "F" } : s)),
        "a false done": good5.map((s) => (s.id === "r1-s03" ? { ...s, falseDone: true } : s)),
        "a median of 3 wrong turns": good5.map((s) => (s.task === "T72" ? { ...s, turns: 3 } : s)),
        "a pointer session with no Overwhelm line": good5.map((s) => (s.id === "r1-s01" ? { ...s, ow: null } : s)),
        "one screen element named for a 4 or more on two halves": good5.map((s) =>
            s.id === "r1-s21" ? { ...s, ow: "6 -- the reference picker -- a wall of names" } : s,
        ),
        "a planned session with no grade": good5.map((s) => (s.id === "r1-s21" ? { ...s, grade: undefined } : s)),
        "Sam's keyboard session not a success": good5.map((s) => (s.keys ? { ...s, grade: "F" } : s)),
        "a VOID with no re-run": good5.map((s) => (s.id === "r1-s22" ? { ...s, grade: "VOID" } : s)),
        "a round with no session": [],
    };
    for (const [what, sessions] of Object.entries(planted5)) {
        const r = scoreTier5(await round5(what.replaceAll(" ", "-"), sessions));
        assert.equal(r.holds, false, `tier 5: planted "${what}" was not caught`);
        console.log(
            `tier 5 caught: ${what} (${[...r.problems, ...r.bars.filter((b) => !b.holds).map((b) => b.what)].join("; ")})`,
        );
    }
    // the median rating gates only when the rating check held; otherwise it is a measure
    const loud = good5.map((s) => (s.keys ? s : { ...s, ow: `${s.half === "A" ? 5 : 4} -- none -- loud` }));
    assert.ok(scoreTier5(await round5("loud", loud)).holds, "a high median gated though the rating check did not hold");
    const gated = scoreTier5(await round5("loud-gated", loud), { ratingGates: true });
    assert.ok(!gated.holds, "a median rating of 4.5 passed with the rating check holding");
    console.log("tier 5 caught: a median rating above 2 once the rating check holds (a measure before)");
    await rm(base, { recursive: true, force: true });
    console.log("score.mjs self-test: every planted failure caught, the passing round passes");
}

const args = process.argv.slice(2);
if (args[0] === "--self-test") await selfTest();
else if (
    args[0] &&
    (args.includes("--tier") ? args[args.indexOf("--tier") + 1] : resolve(args[0]).match(/\/tier(\d+)\//)?.[1]) === "5"
) {
    // tier 5: bars 1 to 3, bar 9's scripted half and Sam's grades; --rating-gates once the rating
    // check held (criteria.md, "The rating check")
    const rd = resolve(args[0]);
    const r = scoreTier5(rd, { ratingGates: args.includes("--rating-gates") });
    await writeFile(join(rd, "score.json"), JSON.stringify(r, null, 1) + "\n");
    for (const p of r.problems) console.log(`PROBLEM: ${p}`);
    for (const b of r.bars) console.log(`${b.holds ? "holds" : "FAILS"}  bar ${b.bar}  ${b.what}: ${b.value}`);
    for (const o of r.reported.overwhelm)
        console.log(
            `reported: ${o.id} ${o.half} overwhelm ${o.rating}, ${o.element ?? "no element"}: ${o.reason ?? ""}`,
        );
    console.log(r.holds ? "every scripted bar holds" : "a scripted bar fails or was not measured");
    process.exitCode = r.holds ? 0 : 1;
} else if (args[0]) {
    const rd = resolve(args[0]);
    const ti = args.indexOf("--task");
    const r = score(rd, ti > 0 ? args[ti + 1] : "T39");
    await writeFile(join(rd, "score.json"), JSON.stringify(r, null, 1) + "\n");
    for (const p of r.problems) console.log(`PROBLEM: ${p}`);
    for (const b of r.bars) console.log(`${b.holds ? "holds" : "FAILS"}  bar ${b.bar}  ${b.what}: ${b.value}`);
    const o = r.reported.otherTasksFirstStyled;
    console.log(
        `reported: other tasks' steps to the first styled graph, median ${o.steps} over ${o.sessions} sessions`,
    );
    for (const k of r.reported.keyboardFirstStyled)
        console.log(
            `reported: keyboard-only ${k.id} (${k.grade}), steps to the first styled graph ${k.steps ?? "never"}`,
        );
    console.log(
        `reported: bar 1 over the newcomers alone: ${Object.entries(r.reported.newcomersOnly)
            .map(([t, v]) => `${t} ${v}`)
            .join(", ")}`,
    );
    console.log(r.holds ? "every scripted bar holds" : "a scripted bar fails or was not measured");
    process.exitCode = r.holds ? 0 : 1;
} else {
    console.error("usage: score.mjs <round dir> [--task T39] | --self-test");
    process.exitCode = 2;
}
