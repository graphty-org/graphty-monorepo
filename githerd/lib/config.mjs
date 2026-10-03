/**
 * The repository's githerd settings: `githerd.config.json`, read from the default branch on the
 * remote (design section 3.4) and checked by a strict `normalizeConfig` (design section 13). A key
 * the checker does not know is an error, never ignored, so a typo cannot silently fall back to a
 * default, and a key that would widen what githerd may do is rejected by name.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname } from "node:path";

export const CONFIG_FILE = "githerd.config.json";

/** Modes from lowest to highest. An override may only move down this list. */
const MODES = ["paused", "dry-run", "acting"];

/** Paths every repository protects; a repository's own lists are added to these. */
const DEFAULT_PROTECTED = ["githerd.config.json", ".mcp.json", ".claude/", ".github/", "CLAUDE.md"];

const ACTION_GROUPS = ["statuses", "prUpkeep", "runWrites", "proposals", "incidents"];

/** The generic defaults. A repository's file overrides any of these except the protected lists. */
export const DEFAULTS = Object.freeze({
    mode: "dry-run",
    pollSeconds: 180,
    servherdCommand: ["npx", "-y", "servherd"],
    release: null,
    requiredChecks: [],
    ownerGate: null,
    labels: { types: [], priorities: [], efforts: [] },
    protectedPaths: DEFAULT_PROTECTED,
    noAutoMergePaths: DEFAULT_PROTECTED,
    worktreeSetup: null,
    runRulesFile: null,
    actions: Object.fromEntries(ACTION_GROUPS.map((g) => [g, false])),
    grace: { closeIssueDays: 7, closeIssueShownDays: 3, revertMinutes: 30 },
    runs: {
        maxConcurrent: 2,
        dailyBudgetUsd: 15,
        dryRunDailyBudgetUsd: 5,
        // An effort:high issue's backlog run: the larger model and caps, never the owner's call.
        model: { default: "sonnet", "backlog-high": "opus" },
        caps: {
            default: { turns: 30, budgetUsd: 1.5, timeoutMinutes: 15 },
            "backlog-high": { turns: 200, budgetUsd: 8, timeoutMinutes: 120 },
        },
        writesPerRun: 10,
    },
    backlog: { wipCap: 3, agingDays: 60 },
    refresh: { everyHours: 24, maxIssuesPerRun: 15, minDaysBetween: 14 },
    retriage: { intervalDays: 7, startHourUtc: 9, batchSize: 25, runsPerHour: 2, budgetUsd: 25 },
    staleDays: 14,
    notify: { command: null, maxPerHour: 6 },
    digest: { weekday: "sun", hourUtc: 16, issue: null },
});

/**
 * Keys that would widen githerd past design section 14, rejected wherever they appear at the top
 * level or under `actions`, with the reason.
 */
const FORBIDDEN = {
    pushToDefaultBranch: "githerd never pushes to the default branch",
    forcePush: "githerd never force-pushes",
    merge: "githerd never merges; Mergify does, gated by githerd/merge",
    directMerge: "githerd never merges; Mergify does, gated by githerd/merge",
    autoMergeBreaking: "githerd never advances a breaking change",
    approveVisual: "githerd never approves visual changes",
    acceptVisual: "githerd never approves visual changes",
    deleteBranches: "githerd never deletes a branch it did not create",
    deleteLabels: "githerd never deletes a label",
    repos: "githerd acts on exactly one repository, named by repo",
    repositories: "githerd acts on exactly one repository, named by repo",
    extraRepos: "githerd acts on exactly one repository, named by repo",
    removeProtectedPaths: "a repository's lists add to the default protected paths; they cannot remove them",
    reverts:
        "reverts belong to actions.incidents: a revert is vetoed on the incident issue, so it never runs without it",
    trustedAuthors: "githerd trusts only the account gh is logged in as, resolved at start; there is no list to add to",
    revert: "reverts belong to actions.incidents: a revert is vetoed on the incident issue, so it never runs without it",
};

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
// A path inside the repository: relative, no "..", no backslashes.
const REPO_PATH = /^(?!\/)(?!.*(^|\/)\.\.(\/|$))[^\\]+$/;
const NAME = /^[a-z0-9][a-z0-9-]*$/;
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * @typedef {{ workflow: string, gating: "required" | "if-run" | "watch", maxMinutes: number | null }} Lane
 * @typedef {{ turns: number, budgetUsd: number, timeoutMinutes: number }} RunCap
 * @typedef {{
 *   repo: string, mode: "paused" | "dry-run" | "acting", pollSeconds: number, servherdCommand: string[],
 *   lanes: Record<string, Lane>, release: { commitPattern: string, stallHours: number } | null,
 *   requiredChecks: string[],
 *   ownerGate: { steps: string[], rejectMarker: string | null,
 *     reviewServer: { name: string, command: string[] } | null } | null,
 *   labels: { types: string[], priorities: string[], efforts: string[] },
 *   protectedPaths: string[], noAutoMergePaths: string[], worktreeSetup: string[] | null,
 *   runRulesFile: string | null, actions: Record<string, boolean>,
 *   grace: { closeIssueDays: number, closeIssueShownDays: number, revertMinutes: number },
 *   runs: { maxConcurrent: number, dailyBudgetUsd: number, dryRunDailyBudgetUsd: number,
 *     model: Record<string, string>, caps: Record<string, RunCap>, writesPerRun: number },
 *   backlog: { wipCap: number, agingDays: number },
 *   refresh: { everyHours: number, maxIssuesPerRun: number, minDaysBetween: number },
 *   retriage: { intervalDays: number, startHourUtc: number, batchSize: number, runsPerHour: number,
 *     budgetUsd: number },
 *   staleDays: number, notify: { command: string[] | null, maxPerHour: number },
 *   digest: { weekday: string, hourUtc: number, issue: number | null },
 * }} Config
 */

const fail = (msg) => {
    throw new Error(`${CONFIG_FILE}: ${msg}`);
};

const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

function object(v, where) {
    if (!isObject(v)) fail(`${where} must be an object`);
    return v;
}

/**
 * Rejects keys outside `allowed`, naming forbidden ones with their reason.
 * @param {object} obj the object checked
 * @param {string[]} allowed its settings
 * @param {string} where the prefix for messages
 */
function onlyKeys(obj, allowed, where) {
    for (const key of Object.keys(obj)) {
        if (Object.hasOwn(FORBIDDEN, key)) fail(`${where}${key} is forbidden: ${FORBIDDEN[key]}`);
        if (!allowed.includes(key)) fail(`${where}${key} is not a setting`);
    }
}

function string(v, where) {
    if (typeof v !== "string" || v === "") fail(`${where} must be a non-empty string`);
    return v;
}

function strings(v, where, { nonEmpty = false } = {}) {
    if (!Array.isArray(v) || v.some((s) => typeof s !== "string" || s === "") || (nonEmpty && v.length === 0)) {
        fail(`${where} must be ${nonEmpty ? "a non-empty" : "an"} array of non-empty strings`);
    }
    return [...v];
}

function regex(v, where) {
    string(v, where);
    try {
        new RegExp(v);
    } catch (e) {
        fail(`${where} is not a valid regular expression: ${e.message}`);
    }
    return v;
}

function number(v, where, { min = 0, max = Infinity, integer = true } = {}) {
    if (typeof v !== "number" || !Number.isFinite(v) || (integer && !Number.isInteger(v)) || v < min || v > max) {
        const range = max === Infinity ? `at least ${min}` : `from ${min} to ${max}`;
        fail(`${where} must be ${integer ? "an integer" : "a number"} ${range}`);
    }
    return v;
}

const positive = { min: 1 };
const money = { min: 0, integer: false };

/**
 * Checks an object section of numbers against its defaults: every key is optional and must be
 * one the defaults name.
 * @param {unknown} raw the section as written
 * @param {Record<string, number>} defaults its defaults
 * @param {string} where the section's name for messages
 * @param {Record<string, object>} [rules] per-key ranges; a positive integer otherwise
 * @returns {any} the section
 */
function numbers(raw, defaults, where, rules = {}) {
    if (raw === undefined) return { ...defaults };
    onlyKeys(object(raw, where), Object.keys(defaults), `${where}.`);
    const out = { ...defaults };
    for (const [key, value] of Object.entries(raw)) {
        out[key] = number(value, `${where}.${key}`, rules[key] ?? positive);
    }
    return out;
}

/**
 * Adds a repository's list to the defaults, keeping the defaults first and dropping repeats.
 * @param {unknown} raw the list as written
 * @param {string[]} defaults the default list
 * @param {string} where the key for messages
 * @returns {string[]} the merged list
 */
function withDefaults(raw, defaults, where) {
    if (raw === undefined) return [...defaults];
    const list = strings(raw, where);
    for (const p of list) {
        if (!REPO_PATH.test(p))
            fail(`${where}: "${p}" must be a path inside the repository, relative and without ".."`);
    }
    return [...new Set([...defaults, ...list])];
}

function lanes(raw) {
    const where = "lanes";
    if (!isObject(raw) || Object.keys(raw).length === 0) {
        fail('lanes must name at least one workflow, e.g. { "ci": { "workflow": "ci.yml", "gating": "required" } }');
    }
    /** @type {Record<string, Lane>} */
    const out = {};
    for (const [id, lane] of Object.entries(raw)) {
        const at = `${where}.${id}`;
        if (!NAME.test(id)) fail(`${at}: a lane id is lowercase letters, digits and "-"`);
        onlyKeys(object(lane, at), ["workflow", "gating", "maxMinutes"], `${at}.`);
        if (!["required", "if-run", "watch"].includes(lane.gating)) {
            fail(`${at}.gating must be "required", "if-run" or "watch"`);
        }
        out[id] = {
            workflow: string(lane.workflow, `${at}.workflow`),
            gating: lane.gating,
            maxMinutes: lane.maxMinutes === undefined ? null : number(lane.maxMinutes, `${at}.maxMinutes`, positive),
        };
    }
    return out;
}

function ownerGate(raw) {
    if (raw === undefined || raw === null) return null;
    onlyKeys(object(raw, "ownerGate"), ["steps", "rejectMarker", "reviewServer"], "ownerGate.");
    const steps = strings(raw.steps, "ownerGate.steps", { nonEmpty: true });
    steps.forEach((s, i) => regex(s, `ownerGate.steps[${i}]`));
    let reviewServer = null;
    if (raw.reviewServer !== undefined && raw.reviewServer !== null) {
        const r = object(raw.reviewServer, "ownerGate.reviewServer");
        onlyKeys(r, ["name", "command"], "ownerGate.reviewServer.");
        reviewServer = {
            name: string(r.name, "ownerGate.reviewServer.name"),
            command: strings(r.command, "ownerGate.reviewServer.command", { nonEmpty: true }),
        };
    }
    return {
        steps,
        rejectMarker:
            raw.rejectMarker === undefined || raw.rejectMarker === null
                ? null
                : string(raw.rejectMarker, "ownerGate.rejectMarker"),
        reviewServer,
    };
}

function runs(raw) {
    const d = DEFAULTS.runs;
    if (raw === undefined) return structuredClone(d);
    onlyKeys(object(raw, "runs"), Object.keys(d), "runs.");
    const { model, caps, ...rest } = raw;
    const out = {
        ...numbers(
            rest,
            {
                maxConcurrent: d.maxConcurrent,
                dailyBudgetUsd: d.dailyBudgetUsd,
                dryRunDailyBudgetUsd: d.dryRunDailyBudgetUsd,
                writesPerRun: d.writesPerRun,
            },
            "runs",
            { dailyBudgetUsd: money, dryRunDailyBudgetUsd: money },
        ),
        model: { ...d.model },
        caps: structuredClone(d.caps),
    };
    if (model !== undefined) {
        for (const [kind, name] of Object.entries(object(model, "runs.model"))) {
            if (!NAME.test(kind)) fail(`runs.model.${kind}: a run kind is lowercase letters, digits and "-"`);
            out.model[kind] = string(name, `runs.model.${kind}`);
        }
    }
    if (caps !== undefined) {
        for (const [kind, cap] of Object.entries(object(caps, "runs.caps"))) {
            if (!NAME.test(kind)) fail(`runs.caps.${kind}: a run kind is lowercase letters, digits and "-"`);
            const at = `runs.caps.${kind}`;
            onlyKeys(object(cap, at), ["turns", "budgetUsd", "timeoutMinutes"], `${at}.`);
            for (const key of ["turns", "budgetUsd", "timeoutMinutes"]) {
                if (cap[key] === undefined) fail(`${at}.${key} is required`);
            }
            out.caps[kind] = numbers(cap, { turns: 0, budgetUsd: 0, timeoutMinutes: 0 }, at, {
                budgetUsd: { min: 0.01, integer: false },
            });
        }
    }
    return out;
}

/**
 * Checks a parsed config and fills in the defaults.
 * @param {unknown} input the parsed JSON
 * @returns {Config} the settings
 */
export function normalizeConfig(input) {
    const raw = /** @type {any} */ (input);
    if (!isObject(raw)) fail("must be a JSON object");
    onlyKeys(raw, ["repo", "lanes", ...Object.keys(DEFAULTS)], "");
    if (typeof raw.repo !== "string" || !REPO.test(raw.repo)) fail('repo must be "<owner>/<name>"');
    const mode = raw.mode ?? DEFAULTS.mode;
    if (!MODES.includes(mode)) fail(`mode must be one of ${MODES.join(", ")}`);
    const opt = (key, check) => (raw[key] === undefined ? structuredClone(DEFAULTS[key]) : check(raw[key], key));
    const nullable = (key, check) => (raw[key] === null ? null : opt(key, check));

    const labelsRaw = raw.labels === undefined ? {} : object(raw.labels, "labels");
    onlyKeys(labelsRaw, ["types", "priorities", "efforts"], "labels.");
    const labels = Object.fromEntries(
        ["types", "priorities", "efforts"].map((k) => [
            k,
            labelsRaw[k] === undefined ? [] : strings(labelsRaw[k], `labels.${k}`),
        ]),
    );

    const actionsRaw = raw.actions === undefined ? {} : object(raw.actions, "actions");
    onlyKeys(actionsRaw, ACTION_GROUPS, "actions.");
    const actions = Object.fromEntries(
        ACTION_GROUPS.map((g) => {
            const v = actionsRaw[g] ?? false;
            if (typeof v !== "boolean") fail(`actions.${g} must be true or false`);
            return [g, v];
        }),
    );

    let release = null;
    if (raw.release !== undefined && raw.release !== null) {
        onlyKeys(object(raw.release, "release"), ["commitPattern", "stallHours"], "release.");
        release = {
            commitPattern: regex(raw.release.commitPattern, "release.commitPattern"),
            stallHours: number(raw.release.stallHours, "release.stallHours", { min: 1, integer: false }),
        };
    }

    const grace = numbers(raw.grace, DEFAULTS.grace, "grace");
    if (grace.closeIssueShownDays > grace.closeIssueDays) {
        fail("grace.closeIssueShownDays cannot be more than grace.closeIssueDays");
    }

    const notifyRaw = raw.notify === undefined ? {} : object(raw.notify, "notify");
    onlyKeys(notifyRaw, ["command", "maxPerHour"], "notify.");

    const digestRaw = raw.digest === undefined ? {} : object(raw.digest, "digest");
    onlyKeys(digestRaw, ["weekday", "hourUtc", "issue"], "digest.");
    const weekday = digestRaw.weekday ?? DEFAULTS.digest.weekday;
    if (!WEEKDAYS.includes(weekday)) fail(`digest.weekday must be one of ${WEEKDAYS.join(", ")}`);

    return {
        repo: raw.repo,
        mode,
        pollSeconds: opt("pollSeconds", (v, k) => number(v, k, { min: 60 })),
        servherdCommand: opt("servherdCommand", (v, k) => strings(v, k, { nonEmpty: true })),
        lanes: lanes(raw.lanes),
        release,
        requiredChecks: opt("requiredChecks", strings),
        ownerGate: ownerGate(raw.ownerGate),
        labels: /** @type {any} */ (labels),
        protectedPaths: withDefaults(raw.protectedPaths, DEFAULT_PROTECTED, "protectedPaths"),
        noAutoMergePaths: withDefaults(raw.noAutoMergePaths, DEFAULT_PROTECTED, "noAutoMergePaths"),
        worktreeSetup: nullable("worktreeSetup", (v, k) => strings(v, k, { nonEmpty: true })),
        runRulesFile: nullable("runRulesFile", (v, k) => {
            if (!REPO_PATH.test(string(v, k)))
                fail(`${k} must be a path inside the repository, relative and without ".."`);
            return v;
        }),
        actions,
        grace,
        runs: runs(raw.runs),
        backlog: numbers(raw.backlog, DEFAULTS.backlog, "backlog", { wipCap: { min: 0 } }),
        refresh: numbers(raw.refresh, DEFAULTS.refresh, "refresh"),
        retriage: numbers(raw.retriage, DEFAULTS.retriage, "retriage", {
            startHourUtc: { min: 0, max: 23 },
            budgetUsd: money,
        }),
        staleDays: opt("staleDays", (v, k) => number(v, k, positive)),
        notify: {
            command:
                notifyRaw.command === undefined || notifyRaw.command === null
                    ? null
                    : strings(notifyRaw.command, "notify.command", { nonEmpty: true }),
            maxPerHour:
                notifyRaw.maxPerHour === undefined
                    ? DEFAULTS.notify.maxPerHour
                    : number(notifyRaw.maxPerHour, "notify.maxPerHour", positive),
        },
        digest: {
            weekday,
            hourUtc:
                digestRaw.hourUtc === undefined
                    ? DEFAULTS.digest.hourUtc
                    : number(digestRaw.hourUtc, "digest.hourUtc", { min: 0, max: 23 }),
            issue:
                digestRaw.issue === undefined || digestRaw.issue === null
                    ? null
                    : number(digestRaw.issue, "digest.issue", positive),
        },
    };
}

const run = (cwd, ...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/**
 * The main checkout's root, the same from every worktree: the real path of the parent of the git
 * common directory.
 * @param {string} [cwd] where to start
 * @returns {string} the root
 */
export function repoRoot(cwd = process.cwd()) {
    let common;
    try {
        common = run(cwd, "rev-parse", "--path-format=absolute", "--git-common-dir");
    } catch {
        throw new Error(`${cwd} is not inside a git repository: run githerd in your repository`);
    }
    return realpathSync(dirname(common));
}

/**
 * The remote's default branch, from `refs/remotes/origin/HEAD`.
 * @param {string} root the repository
 * @returns {string | null} the branch name, or null when origin/HEAD is not set
 */
export function defaultBranch(root) {
    try {
        return run(root, "symbolic-ref", "--short", "refs/remotes/origin/HEAD").replace(/^origin\//, "");
    } catch {
        return null;
    }
}

function parse(text, source) {
    let raw;
    try {
        raw = JSON.parse(text);
    } catch (e) {
        throw new Error(`${source} is not valid JSON: ${e.message}`);
    }
    return normalizeConfig(raw);
}

/**
 * Finds and checks the config (design section 3.4): `GITHERD_CONFIG` when set, otherwise the file
 * on the remote's default branch. Never the working tree, so a branch cannot loosen the rules that
 * judge it. An invalid config throws; a missing one is "not configured".
 * @param {string} root the repository
 * @param {Record<string, string | undefined>} [env] the environment
 * @returns {{ configured: true, config: Config, source: string }
 *     | { configured: false, reason: string }} the result
 */
export function resolveConfig(root, env = process.env) {
    if (env.GITHERD_CONFIG) {
        const path = env.GITHERD_CONFIG;
        return { configured: true, config: parse(readFileSync(path, "utf8"), path), source: path };
    }
    const branch = defaultBranch(root);
    if (branch === null) {
        return {
            configured: false,
            reason: "githerd is not configured: origin/HEAD is not set and GITHERD_CONFIG is unset",
        };
    }
    const source = `origin/${branch}:${CONFIG_FILE}`;
    let text;
    try {
        text = run(root, "show", source);
    } catch {
        return { configured: false, reason: `githerd is not configured: no ${CONFIG_FILE} on origin/${branch}` };
    }
    return { configured: true, config: parse(text, source), source };
}

/**
 * The mode githerd runs in: the config's, lowered by a local override. An override can only lower,
 * so an override of "acting" (or anything unrecognized) changes nothing.
 * @param {{ mode: string }} config the settings
 * @param {string | null | undefined} override the override's mode, if any
 * @returns {"paused" | "dry-run" | "acting"} the mode
 */
export function effectiveMode(config, override) {
    const base = MODES.indexOf(config.mode);
    const lower = MODES.indexOf(override ?? "");
    return /** @type {any} */ (MODES[lower === -1 ? base : Math.min(base, lower)]);
}
