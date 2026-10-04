/**
 * Config adoption (design section 9.7): a config read from the default branch is used only after it
 * passes the gate, and the last one that passed is kept on disk as `config.last-good.json`.
 *
 * The gate refuses a config that, compared with the last good one:
 *
 * - switches a write group to `acting` while the ledger holds no line of that group (no would-do
 *   and no action), so nothing shows what the group would have done;
 * - stops a workflow from gating when the recorded month (`test/replay/`) holds a red stretch of
 *   it. The gating lanes are the only config that the `githerd/merge` verdict and the incident
 *   procedure read, so a red stretch on a lane that no longer gates is a merge that would no
 *   longer be held and an incident that would no longer open. Lanes added, or made stricter, only
 *   hold more, and pass.
 *
 * A refused config keeps the last good one in use with a banner, and the daemon opens a revert
 * pull request of the config's pull request. With no good config ever, the caller enters fatal
 * mode; that is the only way a config problem stops githerd.
 */

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { groupModes } from "./board-text.mjs";
import { CONFIG_FILE, resolveConfig } from "./config.mjs";
import { updateLane } from "./master.mjs";

export const LAST_GOOD = "config.last-good.json";

const MINUTE = 60_000;

const MASTER_RUNS = "repos/graphty-org/graphty-monorepo/actions/runs?branch=master&per_page=100";

const REVERT = `mutation($id: ID!, $title: String!, $body: String!) {
  revertPullRequest(input: {pullRequestId: $id, title: $title, body: $body}) {
    revertPullRequest { number }
  }
}`;

/**
 * @typedef {import("./config.mjs").Config} Config
 * @typedef {{config: Config, source: string, adoptedAt: string}} LastGood
 * @typedef {{record: {master: {run: {id: number, name: string}, created: number,
 *   attempts: {start: number, end: number}[]}[]}, answer: (path: string, at: number) => {body: any}}} Replay
 *   the recorded month as `createReplay()` serves it
 */

/**
 * The last good config, as `writeLastGood` saved it.
 * @param {string} stateDir the state directory
 * @returns {LastGood | null} the config, or null when there is none or the file is not one
 */
export function readLastGood(stateDir) {
    try {
        const saved = JSON.parse(readFileSync(join(stateDir, LAST_GOOD), "utf8"));
        return saved?.config?.repo && saved.source && saved.adoptedAt ? saved : null;
    } catch {
        return null;
    }
}

/**
 * Saves a config as the last good one, whole, by a rename.
 * @param {string} stateDir the state directory
 * @param {LastGood} good what to save
 */
export function writeLastGood(stateDir, good) {
    const file = join(stateDir, LAST_GOOD);
    const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(good, null, 2)}\n`);
    renameSync(tmp, file);
}

/**
 * The workflow files that gate (lanes not `watch`).
 * @param {Config} config the config
 * @returns {Set<string>} their files
 */
const gatingFiles = (config) =>
    new Set(
        Object.values(config.lanes)
            .filter((l) => l.gating !== "watch")
            .map((l) => l.workflow),
    );

/**
 * The run ids that turned one workflow's lane red over the recorded month, found by polling the
 * record through `updateLane` at every moment a run of it starts or ends, and a minute after each
 * end: a red is confirmed by its second sighting.
 * @param {Replay} record the recorded month (`createReplay()`)
 * @param {string} name the workflow's name, as its runs carry it
 * @returns {number[]} the first run of each red stretch, in time order
 */
export function redStretches(record, name) {
    const times = new Set();
    for (const t of record.record.master.filter((x) => x.run.name === name)) {
        times.add(t.created);
        for (const a of t.attempts)
            times
                .add(a.start)
                .add(a.end)
                .add(a.end + MINUTE);
    }
    const config = { lanes: { lane: { gating: "required", maxMinutes: null } } };
    let lane = null;
    const out = [];
    for (const at of [...times].sort((a, b) => a - b)) {
        const runs = record.answer(MASTER_RUNS, at).body.workflow_runs.filter((r) => r.name === name);
        const step = updateLane("lane", lane, runs, config, at);
        lane = step.lane;
        for (const e of step.events) if (e.event === "lane-red") out.push(e.runId);
    }
    return out;
}

/**
 * Why a config may not replace the last good one; empty when it may.
 * @param {Config} candidate the config read from the default branch
 * @param {Config | null} lastGood the last good config, null when there was none
 * @param {any[]} ledger every ledger entry
 * @param {(file: string) => number[]} stretches the red stretches of a workflow file in the record
 * @returns {string[]} the reasons, one line each
 */
export function refusals(candidate, lastGood, ledger, stretches) {
    const before = lastGood ? groupModes(lastGood, null) : {};
    const reasons = [];
    for (const [group, mode] of Object.entries(groupModes(candidate, null))) {
        if (mode !== "acting" || before[group] === "acting") continue;
        const covered = ledger.some((e) => e.group === group && (e.kind === "would-do" || e.kind === "action"));
        if (!covered) reasons.push(`it switches ${group} to acting, and the ledger has no line of ${group} yet`);
    }
    if (!lastGood) return reasons;
    const kept = gatingFiles(candidate);
    for (const file of gatingFiles(lastGood)) {
        if (kept.has(file)) continue;
        const red = stretches(file);
        if (red.length) {
            reasons.push(
                `it stops ${file} gating, and the recorded month has ${red.length} red stretches of it ` +
                    `(first run ${red[0]}) that would no longer hold merges or open incidents`,
            );
        }
    }
    return reasons;
}

/**
 * A workflow file's name, from its top-level `name:` line in the repository.
 * @param {string} root the repository
 * @param {string} file the file under `.github/workflows/`
 * @returns {string | null} the name, or null when the file or the line is missing
 */
export function workflowName(root, file) {
    try {
        const text = readFileSync(join(root, ".github", "workflows", file), "utf8");
        const line = text.split("\n").find((l) => l.startsWith("name:"));
        const name = line
            ?.slice("name:".length)
            .trim()
            .replaceAll(/(^["'])|(["']$)/g, "");
        return name || null;
    } catch {
        return null;
    }
}

/**
 * The recorded month, loaded once.
 * @returns {Promise<Replay>} the record
 */
async function loadRecord() {
    const { createReplay } = await import("../test/replay/replay.mjs");
    return /** @type {any} */ (createReplay());
}

/**
 * The config gate for one daemon. `check()` reads the default branch's config and decides which
 * config is in use. A refused config is refused once per text: the replay runs once, `revert`
 * carries the reasons only on that first refusal (the caller opens the revert then), and later
 * checks of the same text answer from memory.
 * @param {{root: string, stateDir: string, env?: Record<string, string | undefined>,
 *   readLedger: () => Promise<any[]>, record?: () => Promise<Replay>,
 *   nameOf?: (file: string) => string | null, now?: () => Date}} options where to read, the ledger
 *   reader, and (for tests) the record, the workflow names and the clock
 * @returns {{check: () => Promise<{config: Config | null, source: string | null,
 *   banner: string | null, revert: string[] | null, fatal: string | null}>}} the gate
 */
export function createConfigGate({
    root,
    stateDir,
    env = process.env,
    readLedger,
    record = loadRecord,
    nameOf = (file) => workflowName(root, file),
    now = () => new Date(),
}) {
    /** @type {Map<string, string[]>} reasons by refused config text */
    const refused = new Map();
    /** @type {Promise<Replay> | null} */
    let loaded = null;

    /**
     * Every red stretch of the workflow files, by replay of the record.
     * @param {Config} candidate the config
     * @param {Config | null} good the last good one
     * @returns {Promise<string[]>} the reasons
     */
    async function gate(candidate, good) {
        const ledger = await readLedger();
        const names = good ? [...gatingFiles(good)].filter((f) => !gatingFiles(candidate).has(f)) : [];
        /** @type {Record<string, number[]>} */
        const red = {};
        for (const file of names) {
            const name = nameOf(file);
            // ponytail: a workflow whose file is gone cannot be named, so its record cannot be read;
            // that refuses it. Keep the name in the lane config if deleting workflows becomes common.
            loaded ??= record();
            red[file] = name === null ? [-1] : redStretches(await loaded, name);
        }
        return refusals(candidate, good, ledger, (file) => red[file] ?? []);
    }

    /**
     * Reads the default branch's config and gates it.
     * @param {LastGood | null} good the last good config
     * @returns {Promise<{adopted: {config: Config, source: string}} | {problem: string, revert: string[] | null}>}
     *   the config to use, or why there is none
     */
    async function decide(good) {
        let r;
        try {
            r = resolveConfig(root, env);
        } catch (err) {
            return { problem: /** @type {Error} */ (err).message, revert: null };
        }
        if (!r.configured) return { problem: /** @type {{reason: string}} */ (r).reason, revert: null };
        const adopted = { config: r.config, source: r.source };
        const text = JSON.stringify(r.config);
        if (good && text === JSON.stringify(good.config)) return { adopted };
        const known = refused.get(text);
        const reasons = known ?? (await gate(r.config, good?.config ?? null));
        if (reasons.length === 0) {
            writeLastGood(stateDir, { ...adopted, adoptedAt: now().toISOString() });
            return { adopted };
        }
        refused.set(text, reasons);
        return {
            problem: `${CONFIG_FILE} on ${r.source} is refused: ${reasons.join("; ")}`,
            revert: known ? null : reasons,
        };
    }

    return {
        async check() {
            const good = readLastGood(stateDir);
            const d = await decide(good);
            if ("adopted" in d) return { ...d.adopted, banner: null, revert: null, fatal: null };
            if (!good) {
                const fatal = `no good ${CONFIG_FILE} was ever loaded: ${d.problem}`;
                return { config: null, source: null, banner: null, revert: d.revert, fatal };
            }
            return {
                config: good.config,
                source: good.source,
                banner: `${d.problem}; githerd runs the last good config, adopted ${good.adoptedAt.slice(0, 16)} UTC`,
                revert: d.revert,
                fatal: null,
            };
        },
    };
}

/**
 * The newest commit on the default branch that changed the config file.
 * @param {string} root the repository
 * @param {string} branch the default branch
 * @returns {string | null} its sha, null when none did
 */
function configCommit(root, branch) {
    try {
        const out = execFileSync(
            "git", // NOSONAR(S4036): the owner's git from his own PATH, as tools/ runs it
            ["log", "-1", "--format=%H", `origin/${branch}`, "--", CONFIG_FILE],
            { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        ).trim();
        return out || null;
    } catch {
        return null;
    }
}

/**
 * Opens the revert pull request of the pull request that brought a refused config (GraphQL
 * `revertPullRequest`, as for an incident's revert), through the `incidents` write group. An open
 * pull request with GitHub's revert title is taken as the revert instead of opening another.
 * @param {{github: any, repo: string, root: string, branch: string, reasons: string[]}} args the
 *   client, the repository, its default branch, and why the config was refused
 * @returns {Promise<number | null>} the revert's number; null when no pull request brought the
 *   commit, while the group does not act, or when GitHub's answer named none
 */
export async function openConfigRevert({ github, repo, root, branch, reasons }) {
    const sha = configCommit(root, branch);
    if (!sha) return null;
    const r = `repos/${repo}/`;
    const pulls = (await github.get(`${r}commits/${sha}/pulls`, { fresh: true })).body ?? [];
    const p = pulls.find((/** @type {any} */ x) => x.merged_at);
    if (!p) return null;
    const title = `Revert "${p.title}"`;
    const list = `${r}pulls?state=open&base=${branch}&per_page=100`;
    const existing = ((await github.get(list, { fresh: true })).body ?? []).find(
        (/** @type {any} */ x) => x.title === title,
    );
    if (existing) return existing.number;
    const body =
        `Reverts #${p.number}. githerd refused the ${CONFIG_FILE} it brought and keeps running the last good ` +
        `config: ${reasons.join("; ")}.`;
    const res = await github.mutate(
        REVERT,
        { id: p.node_id, title, body },
        {
            group: "incidents",
            check: { path: list, expect: [{ title }] },
            fields: { situation: "config-refused", pr: p.number, sha },
        },
    );
    return Number(res.body?.data?.revertPullRequest?.revertPullRequest?.number ?? 0) || null;
}
