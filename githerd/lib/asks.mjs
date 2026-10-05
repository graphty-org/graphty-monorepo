/**
 * Whose is a pull request whose CI failed (design section 8.2, the owner's decision of
 * 2026-10-05)? Before githerd offers such a pull request as a `pr` job, it asks the live Claude
 * sessions working in this repository, once per failed head, through Claude Code's session
 * messaging (`peers.mjs`). A session answers with `githerd_mine` (or claims the job with
 * `githerd_claim`); `prInUse` in `queue.mjs` reads the question and its answer.
 *
 * The question lives in `state.asks[<pr>]`: `{head, failing, askedAt, sessions, sent, failed,
 * owner}`. A new head drops it, so a new push starts over. An answer lapses when the answering
 * session ends.
 */

import { failingRequired, headIsGitherds, jobOnPr, prOf } from "./queue.mjs";
import { tellSessions } from "./peers.mjs";

/**
 * The question for one pull request.
 * @param {string} n the pull request
 * @param {any} rec its record
 * @param {string[]} failing its failing required checks
 * @param {string} job the job githerd would offer
 * @returns {string} the message
 */
function askText(n, rec, failing, job) {
    return (
        `githerd: CI failed on #${n} (${rec.headRef}) at ${String(rec.headSha).slice(0, 7)}: ${failing.join(", ")}. ` +
        `If you are working on it, call the githerd_mine tool with pr ${n} (or claim job ${job} with githerd_claim). ` +
        "Otherwise ignore this."
    );
}

/**
 * One pass: forgets questions about a head that is gone, lapses answers whose session ended, and
 * asks about each queued `pr` job's pull request whose CI failed on a head someone other than
 * githerd pushed, when nothing claims it and it was not asked about at this head.
 * @param {any} state the daemon state, changed in place
 * @param {{now: Date, acting: boolean, sessions: () => import("./peers.mjs").PeerSession[],
 *   transport: import("./peers.mjs").Transport, sessionGone: (session: string) => boolean}} opts
 *   the clock, whether the `workers` write group acts (else each send is a would-do line), the live
 *   sessions in this repository, the transport, and whether a session ended
 * @returns {Promise<({kind: string} & Record<string, unknown>)[]>} the ledger lines
 */
export async function askStep(state, { now, acting, sessions, transport, sessionGone }) {
    const asks = (state.asks ??= {});
    const lines = [];
    for (const [n, ask] of Object.entries(asks)) {
        if (state.prs?.[n]?.headSha !== ask.head) {
            delete asks[n];
        } else if (ask.owner && sessionGone(ask.owner.session)) {
            lines.push({ kind: "pr-owner-lapsed", pr: Number(n), head: ask.head, session: ask.owner.session });
            ask.owner = null;
        }
    }
    /** @type {import("./peers.mjs").PeerSession[] | null} read once, when a question is due */
    let live = null;
    for (const job of Object.values(state.jobs ?? {})) {
        if (job.kind !== "pr" || job.state !== "queued") continue;
        const n = String(prOf(job));
        const rec = state.prs?.[n];
        if (!rec || asks[n]?.head === rec.headSha || headIsGitherds(state, rec) || jobOnPr(state, n)) continue;
        const failing = failingRequired(rec);
        if (failing.length === 0) continue;
        live ??= sessions();
        const text = askText(n, rec, failing, job.id);
        const names = live.map((s) => s.name);
        const out = acting ? await tellSessions(live, text, transport) : { sent: [], failed: [] };
        asks[n] = {
            head: rec.headSha,
            failing,
            askedAt: now.toISOString(),
            // In dry-run nobody hears the question, but the wait is the one acting mode would have.
            sessions: acting ? out.sent : names,
            sent: out.sent,
            failed: out.failed,
            owner: null,
        };
        if (!acting && names.length) {
            lines.push({
                kind: "would-do",
                group: "workers",
                op: `ask ${names.length} session(s) whose #${n} is`,
                pr: Number(n),
            });
        }
        lines.push({ kind: "pr-asked", pr: Number(n), head: rec.headSha, sessions: names, ...out });
    }
    return lines;
}
