#!/usr/bin/env node
// Claude Code Stop hook, registered in .claude/settings.json beside tools/issue-round-idle-hook.mjs: a turn may not end
// on a promise nothing will keep, nor end only to wait on CI while other work could start. On 2026-11-25 a reply said
// "the routine that starts issue work would pick them up" while no issue-round loop had run for a day; sessions also
// often end a turn "waiting for CI" with unstarted work in hand.
//
// It blocks (decision "block" with a reason saying exactly what to do) when:
//   A. the final reply promises later work ("I'll check back", "once it merges I will", "the routine will pick it
//      up") and nothing backs it: no running background task, no scheduled cron, no live commitment of this session
//      in tools/commitments.mjs's ledger; a reply naming issue-round or pipeline-round also needs that round's
//      last-round file under 75 minutes old.
//   S. a commitment of this session in the ledger is stale (its backing died: task gone, PR red or merged, ...).
//   B. the reply ends to wait on CI, a PR, a merge or an agent, no background agent or workflow is running, and work
//      is open: a "next" commitment of this session, a fresh idle verdict with startable jobs, or the reply itself
//      lists what remains.
// Quoted text, code and ACTION NEEDED lines are ignored. It never blocks a continuation (stop_hook_active), a
// subagent, or the same reply twice, and blocks a session at most once per 10 minutes. Every block is appended to
// tmp/promise-hook/log.jsonl, to review false alarms. Any error allows the stop and is logged.
//
//   echo '{"session_id":"...","last_assistant_message":"..."}' | node tools/claude-promise-hook.mjs
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { liveness, mainRoot, readLedger } from "./commitments.mjs";

const MIN = 60 * 1000;
const QUIET_MS = 10 * MIN;
const ROUND_MS = 75 * MIN;
const VERDICT_MS = 10 * MIN;

const VERBS =
    "start|pick|check|follow|open|push|merge|retry|watch|re-?run|fix|report|land|monitor|look|revisit|come back|" +
    "circle back|resume|continue|finish|handle|ping|let you know|update you|keep an eye|poll|wait|arm|file|run";
const PROMISES = [
    // first person, future: "I'll check back", "I will open the PR", "I'm going to retry"
    new RegExp(String.raw`\b(I'll|I will|I'm going to|I am going to|we'll|we will)\s+(\w+\s+){0,2}?(${VERBS})\b`, "i"),
    // "once it merges, I'll", "when CI passes I will"
    /\b(once|when|after)\b[^.\n]{0,80}\b(lands?|merges?|merged|passes|finish(es|ed)?|completes?|is green|goes green|is done)\b[^.\n]{0,40}\b(I'll|I will|we'll)\b/i,
    // "the routine will pick them up", "issue-round picks it up", "the next round handles it"
    /\b(routine|loop|issue-round|pipeline-round|round|watcher|cron)\b[^.\n]{0,40}\b(will|would|should|is going to)\s+(pick|start|handle|take|catch|run|get to|fix)\b/i,
    // present tense: "the routine that starts issue work picks up the high-priority ones", "the loop handles them"
    /\b(routine|loop|issue-round|pipeline-round|round|watcher)\b[^.\n]{0,40}\b(picks? up|picks? (it|them|this|these|that) up|(handles|starts|takes) (it|them|this|these|those))\b/i,
];
const OFFER = /\b(if you|want me to|would you like|shall I|should I|let me know)\b/i;
const WAITING =
    /\b(wait(ing)? (for|on|until)|until)\b[^.\n]{0,40}\b(CI|checks?|PRs?|pull requests?|merges?|builds?|full run|tests?|agents?|workflows?|auto-?merge|green)\b|\bonce (CI|the checks?|checks|the PRs?|the pull requests?|it|they)\b[^.\n]{0,20}\b(pass(es)?|merges?|lands?|is green|go(es)? green)\b/i;
const REMAINING =
    /\b(remaining|still to do|left to do|not (yet )?started|next up)\b|^\s*[-*]?\s*(next|remaining|left|todo)\s*:/im;

/**
 * The reply with quotes, code and ACTION NEEDED lines removed: only what the session says in its own voice.
 * @param text the reply
 * @returns the text to match
 */
export function ownWords(text) {
    return String(text ?? "")
        .replaceAll("\u2019", "'")
        .replaceAll(/```[\s\S]*?(```|$)/g, " ")
        .replaceAll(/`[^`\n]*`/g, " ")
        .replaceAll(/"[^"\n]*"/g, " ")
        .split("\n")
        .filter((l) => !/^\s*>/.test(l) && !/^[\s*_`-]*ACTION NEEDED:/.test(l))
        .join("\n");
}

/**
 * The first sentence that promises later work, or null.
 * @param text the session's own words
 * @returns the matched phrase
 */
export function promiseIn(text) {
    for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
        if (OFFER.test(sentence) || /\b(won't|will not|wouldn't)\b/i.test(sentence)) continue;
        for (const re of PROMISES) {
            const m = re.exec(sentence);
            if (m) return sentence.trim().slice(0, 200);
        }
    }
    return null;
}

const mtime = (path) => {
    try {
        return statSync(path).mtimeMs;
    } catch {
        return null;
    }
};

const readJson = (path) => {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch {
        return null;
    }
};

const pt = (ms) => new Date(ms).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }) + " PT";

const staleReason = (checked) => {
    const stale = checked.filter(({ c, l }) => l.live === false && c.backing !== "next");
    if (stale.length === 0) return null;
    const list = stale.map(({ c, l }) => `${c.id} "${c.what}" (${c.backing}: ${l.why})`).join("; ");
    return (
        `these commitments in the ledger have nothing keeping them any more: ${list}. For each, either start ` +
        "what keeps it now (a background agent, workflow or command, CronCreate, a fix for a red PR) and run " +
        '`node tools/commitments.mjs add "<what>" <backing>` with the new backing, then ' +
        "`node tools/commitments.mjs done <old id>`; or mark it done if it is finished or dropped, and say so in " +
        "the reply."
    );
};

const promiseReason = (words, tasks, crons, liveCount, root, now) => {
    const promise = promiseIn(words);
    if (!promise) return null;
    const roundNamed =
        ["issue-round", "pipeline-round"].find((r) => promise.includes(r)) ??
        (/\b(routine|loop|round)\b/i.test(promise) ? "issue-round" : null);
    const lastRound = roundNamed ? mtime(join(root, "tmp", roundNamed, "last-round")) : null;
    if (roundNamed ? lastRound !== null && now - lastRound < ROUND_MS : tasks.length + crons.length + liveCount > 0)
        return null;
    const ran = lastRound === null ? "never" : pt(lastRound);
    const running =
        `background tasks running: ${tasks.map((t) => t.id).join(", ") || "none"}; scheduled wakeups: ` +
        `${crons.map((c) => c.id).join(", ") || "none"}; live commitments: ${liveCount}` +
        (roundNamed ? `; ${roundNamed} last ran ${ran}` : "");
    return (
        `the reply promises later work that nothing will do: "${promise}" (${running}). Either start what ` +
        "keeps it now -- a background Agent or Workflow, a background Bash command, CronCreate or " +
        "ScheduleWakeup, or `/loop 30m /issue-round` for a round -- record it with " +
        '`node tools/commitments.mjs add "<what>" <kind>:<id>` and name its id in the reply; or rewrite ' +
        "the sentence to say plainly that nothing is scheduled, with an ACTION NEEDED line if only the " +
        "owner can do it."
    );
};

const waitReason = (words, tasks, mine, session, root, now) => {
    if (!WAITING.test(words) || tasks.some((t) => /agent|workflow/i.test(String(t.type)))) return null;
    const verdict = readJson(join(root, "tmp", "issue-round", "idle.json"));
    const startable =
        verdict?.idle === true &&
        verdict.session === session &&
        now - verdict.at < VERDICT_MS &&
        !String(verdict.reason).startsWith("starved");
    const open = [
        ...mine.filter((c) => c.backing === "next").map((c) => `${c.id} "${c.what}"`),
        ...(startable ? [`issue-round: ${verdict.line}`] : []),
        ...(REMAINING.test(words) ? ["the reply lists remaining work"] : []),
    ];
    if (open.length === 0) return null;
    return (
        `the reply ends the turn to wait on CI or a PR while work is open: ${open.join("; ")}. Start the ` +
        "next independent item now in a background subagent (Agent with run_in_background, or a Workflow), " +
        'record it with `node tools/commitments.mjs add "<what>" task:<id>` (and `done` its next entry), then ' +
        "stop; or say in one line why none of it can start before the wait ends."
    );
};

/**
 * The block reason for one Stop input, or null to allow.
 * @param input the hook input
 * @param root the main checkout
 * @param now ms
 * @returns the reason, or null
 */
export function decide(input, root, now = Date.now()) {
    const session = input?.session_id;
    if (!session || input.stop_hook_active || input.agent_id) return null;
    const words = ownWords(input.last_assistant_message);
    const tasks = (input.background_tasks ?? []).filter((t) => t.status === "running");
    const crons = input.session_crons ?? [];
    const mine = readLedger(root).filter((c) => !c.done && c.session === session);
    const checked = mine.map((c) => ({ c, l: liveness(c, root, now, input) }));
    const liveCount = checked.filter(({ l }) => l.live === true).length;
    return (
        staleReason(checked) ??
        promiseReason(words, tasks, crons, liveCount, root, now) ??
        waitReason(words, tasks, mine, session, root, now)
    );
}

/**
 * The hook's stdout for one stdin: a block, or "" to allow. Applies the once-per-reply and quiet-period rules.
 * @param text the hook's stdin
 * @param root the main checkout
 * @param now ms
 * @returns the JSON to print, or ""
 */
export function hook(text, root, now = Date.now()) {
    const dir = join(root, "tmp", "promise-hook");
    let input;
    try {
        input = JSON.parse(text);
    } catch {
        return "";
    }
    try {
        const reason = decide(input, root, now);
        if (!reason) return "";
        const session = input.session_id;
        const hash = createHash("sha1").update(String(input.last_assistant_message)).digest("hex").slice(0, 16);
        mkdirSync(dir, { recursive: true });
        // a corrupt state file is replaced, never allowed to throw (that would silence this hook for the session)
        const read = readJson(join(dir, "state.json"));
        const state = read && typeof read === "object" && !Array.isArray(read) ? read : {};
        const s = state[session];
        const hashes = Array.isArray(s?.hashes) ? s.hashes : [];
        const at = Number(s?.at) || 0;
        if (hashes.includes(hash) || now - at < QUIET_MS) return "";
        state[session] = { at: now, hashes: [...hashes.slice(-19), hash] };
        const tmp = join(dir, `state.json.${process.pid}`);
        writeFileSync(tmp, `${JSON.stringify(state)}\n`);
        renameSync(tmp, join(dir, "state.json"));
        const excerpt = String(input.last_assistant_message).slice(-600);
        appendFileSync(
            join(dir, "log.jsonl"),
            `${JSON.stringify({ at: new Date(now).toISOString(), session, reason, excerpt })}\n`,
        );
        return JSON.stringify({ decision: "block", reason });
    } catch (error) {
        try {
            mkdirSync(dir, { recursive: true });
            appendFileSync(
                join(dir, "log.jsonl"),
                `${JSON.stringify({ at: new Date(now).toISOString(), error: String(error.stack ?? error).slice(0, 500) })}\n`,
            );
        } catch {
            // nowhere to log: allow
        }
        return "";
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    let text = "";
    try {
        text = readFileSync(0, "utf8");
    } catch {
        // no stdin: allow
    }
    process.stdout.write(hook(text, mainRoot(process.env.CLAUDE_PROJECT_DIR ?? process.cwd())));
}
