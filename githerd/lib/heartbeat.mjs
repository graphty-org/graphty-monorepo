/**
 * The heartbeat issue, which the GitHub watchdog workflow (tools/githerd-watchdog.mjs) reads while
 * the dev machine may be off: githerd's first write opens one issue labelled `githerd-heartbeat`
 * and pins it; after that githerd rewrites its BODY (never a comment, so nobody is notified) every
 * 15 minutes, a cadence and not a timeout, and at once when a line other than the times changes.
 *
 * The body, line 1 exactly `alive: <ISO 8601 UTC>`, then `<key>: <ISO time> <text>` lines: `mode`,
 * `last complete poll` (the last poll that ran every step), `poll failing` (since when, and the first
 * error) while polls fail, `paused` while paused, one `stuck` per faulted job (oldest last: the watchdog keeps the last line
 * of a key), `stopped` on a clean stop, `fatal` in fatal mode, and `version`.
 *
 * Only one open issue may carry the label: an open one is reused, never a second opened. The writes
 * go through the `owner-items` write group (the issue is the owner's alarm), so in dry-run they are
 * `would-do` lines, one per change of the body's lines. Only the live daemon writes: a development
 * daemon is in dry-run unless `GITHERD_DEV_ACT=1` makes it the live one (daemon.mjs `mode`).
 */

/** The label the watchdog finds the issue by. */
export const LABEL = "githerd-heartbeat";
/** How often the body is rewritten while nothing in it but the times changes. */
export const CADENCE_MS = 15 * 60_000;

const GROUP = "owner-items";
const TITLE = "githerd heartbeat";
const PIN = `mutation pinIssue($id: ID!) {
  pinIssue(input: {issueId: $id}) { issue { number } }
}`;

/**
 * @typedef {{mode: string, lastPoll?: string | null, failing?: {since: string, error: string} | null,
 *   paused?: string | null, stuck?: {since: string, job: string}[],
 *   stopped?: string | null, fatal?: string | null, version?: string | null}} Lines what the body
 *   says besides `alive`
 */

/**
 * The first line of a text.
 * @param {string} text the text
 * @returns {string} the line, trimmed
 */
const oneLine = (text) => text.split(/\r?\n/, 1)[0].trim();

/**
 * The issue body.
 * @param {string} at the write's time, ISO 8601 UTC
 * @param {Lines} lines what it says
 * @returns {string} the body
 */
export function heartbeatBody(
    at,
    { mode, lastPoll = null, failing = null, paused = null, stuck = [], stopped = null, fatal = null, version = null },
) {
    const out = [`alive: ${at}`, `mode: ${at} ${mode}`];
    if (lastPoll) out.push(`last complete poll: ${lastPoll}`);
    if (failing) out.push(`poll failing: ${failing.since} ${oneLine(failing.error)}`);
    if (paused) out.push(`paused: ${at} ${oneLine(paused)}`);
    const newestFirst = [...stuck].sort((a, b) => b.since.localeCompare(a.since));
    for (const s of newestFirst) out.push(`stuck: ${s.since} ${s.job}`);
    if (stopped) out.push(`stopped: ${at} ${oneLine(stopped)}`);
    if (fatal) out.push(`fatal: ${at} ${oneLine(fatal)}`);
    if (version) out.push(`version: ${at} ${version}`);
    return out.join("\n");
}

/**
 * The jobs the heartbeat calls stuck: those githerd could not start (`faulted`), since they faulted.
 * @param {any} state the daemon state
 * @returns {{since: string, job: string}[]} the jobs
 */
export function stuckJobs(state) {
    return Object.values(state.jobs ?? {})
        .filter((j) => j.state === "faulted")
        .map((j) => ({ since: String(j.stateSince ?? ""), job: String(j.id) }));
}

/**
 * Writes the heartbeat when it is due: 15 minutes after the last write, or at once when the lines
 * other than the times changed (a mode change, a stop, a fault). Records what it wrote in
 * `state.heartbeat`. While the group does not act, a change is one `would-do` line and GitHub is not
 * asked anything. A `final` write (fatal mode, which polls nothing) is made once, not on the cadence.
 * @param {{github: any, repo: string, state: any, now: number, lines: Lines, final?: boolean}} ctx the
 *   client (its write gate decides acting or would-do), `owner/name`, the daemon state, the time,
 *   the lines, and whether this is fatal mode's last word
 * @returns {Promise<boolean>} true when it wrote (or recorded a would-do)
 */
export async function writeHeartbeat({ github, repo, state, now, lines, final = false }) {
    const hb = (state.heartbeat ??= { issue: null, at: null, shape: null });
    const at = new Date(now).toISOString();
    const body = heartbeatBody(at, lines);
    // The body without its times: what changing calls for a write at once. Another complete poll
    // is not news; a poll failing is.
    const shape = body.replaceAll(at, "").replace(`last complete poll: ${lines.lastPoll}`, "");
    const acting = github.acting(GROUP);
    const due = !acting || final ? false : !hb.at || now - Date.parse(hb.at) >= CADENCE_MS;
    if (shape === hb.shape && !due) return false;
    const r = `repos/${repo}/`;
    let n = hb.issue ?? null;
    if (acting) {
        const listed = (await github.get(`${r}issues?labels=${LABEL}&state=open&per_page=100`)).body ?? [];
        const open = listed.filter((/** @type {any} */ i) => !i.pull_request).map((/** @type {any} */ i) => i.number);
        n = open.length ? Math.min(...open) : null;
    }
    const fields = { situation: "heartbeat" };
    if (n === null) {
        const res = await github.write(
            "POST",
            `${r}issues`,
            { title: TITLE, body, labels: [LABEL] },
            { group: GROUP, check: "created", fields },
        );
        n = Number(res.body?.number ?? 0) || null;
        if (n && res.body?.node_id) {
            await github.mutate(
                PIN,
                { id: res.body.node_id },
                { group: GROUP, check: { path: `${r}issues/${n}`, expect: { number: n } }, fields },
            );
        }
    } else {
        const path = `${r}issues/${n}`;
        await github.write(
            "PATCH",
            path,
            { body },
            { group: GROUP, check: { path, expect: { body } }, retry: true, fields },
        );
    }
    Object.assign(hb, { issue: n, at, shape });
    return true;
}
