/**
 * Advisory CI checks (the repository's `tools/ci-advisory-checks.json`): a new required check
 * starts as a warning until its `enforce` date (YYYY-MM-DD, UTC). While the date is ahead, a
 * failing advisory check is no failure for githerd: it makes no pull request broken, no `pr` job,
 * no ownership question and no merge hold, and the board shows it as `advisory: <check> (enforced
 * from <date>)`. On and after the date, or for a check listed under `required`, it counts as usual.
 *
 * An entry names a ci.yml job by its id (`links`) or one step of it (`test/Types`); GitHub names a
 * check run by the job's `name:`, so the daemon reads ci.yml from the default branch with the
 * registry and maps each id to the names its runs take (a matrix name such as
 * `Test (${{ matrix.shard }})` matches every shard).
 *
 * Promotion: the CI workflow tests warn from three days before an entry's enforce date ("move it
 * into required and drop its warning wiring", tools/ci-workflows.test.mjs). From then githerd makes
 * one job per entry that opens the pull request doing that (jobs.mjs `promoteJobs`).
 */

/** The registry, on the default branch. */
export const REGISTRY_FILE = "tools/ci-advisory-checks.json";
/** The workflow whose jobs and steps the registry names. */
export const CI_FILE = ".github/workflows/ci.yml";
/** Days before an entry's enforce date from which the CI workflow tests ask for its promotion. */
export const PROMOTE_LEAD_DAYS = 3;

const DAY = 24 * 60 * 60_000;

/**
 * @typedef {{id: string, job: string, step: string | null, enforce: string, issue: number | null}} Entry
 *   one advisory check: `id` is `<job>` or `<job>/<step>`, as the CI's warnings name it
 * @typedef {{entries: Entry[], names: Record<string, string>}} Advisory the registry's advisory
 *   entries, and per ci.yml job id the pattern (a RegExp source) of its check run names
 */

/**
 * The check run name pattern of each job of a workflow file: its `name:`, with every `${{ }}`
 * expression matching any text, or the job id when it has no name. Reads only the job keys under
 * `jobs:` and their own `name:` line, which is all GitHub names a check run by.
 * @param {string} text the workflow file
 * @returns {Record<string, string>} the RegExp source by job id
 */
export function jobNames(text) {
    /** @type {Record<string, string>} */
    const names = {};
    const lines = text.split("\n");
    const start = lines.findIndex((l) => l.trimEnd() === "jobs:");
    if (start === -1) return names;
    /** @type {{indent: number, job: string | null, child: number}} */
    const at = { indent: -1, job: null, child: -1 };
    for (const line of lines.slice(start + 1)) {
        if (line !== "" && line.trimStart() === line) break;
        const t = line.trim();
        if (t && !t.startsWith("#")) readJobLine(names, at, line.length - line.trimStart().length, t);
    }
    return names;
}

/**
 * Reads one line under `jobs:` (`jobNames`): a job key at the jobs' depth starts a job, and a
 * `name:` at its first child depth names it.
 * @param {Record<string, string>} names the patterns so far, updated
 * @param {{indent: number, job: string | null, child: number}} at where the reading is, updated
 * @param {number} depth the line's indentation
 * @param {string} t the line, trimmed
 */
function readJobLine(names, at, depth, t) {
    const key = t.endsWith(":") && /^[\w-]+$/.test(t.slice(0, -1)) ? t.slice(0, -1) : null;
    if (key && (at.indent === -1 || depth === at.indent)) {
        Object.assign(at, { indent: depth, job: key, child: -1 });
        names[key] = `^${escape(key)}$`;
        return;
    }
    if (at.job === null) return;
    if (at.child === -1) at.child = depth;
    if (depth !== at.child || !t.startsWith("name:")) return;
    let name = t.slice("name:".length).trim();
    const quote = name[0];
    if ((quote === '"' || quote === "'") && name.length > 1 && name.endsWith(quote)) name = name.slice(1, -1);
    names[at.job] = pattern(name);
}

/**
 * A RegExp source matching a job name, its `${{ }}` expressions as any text.
 * @param {string} name the `name:` value
 * @returns {string} the source
 */
function pattern(name) {
    const parts = [];
    let rest = name;
    for (let open = rest.indexOf("${{"); open !== -1; open = rest.indexOf("${{")) {
        const close = rest.indexOf("}}", open);
        if (close === -1) break;
        parts.push(escape(rest.slice(0, open)));
        rest = rest.slice(close + 2);
    }
    parts.push(escape(rest));
    return `^${parts.join(".+")}$`;
}

/**
 * Escapes text for a RegExp.
 * @param {string} text the text
 * @returns {string} the escaped text
 */
function escape(text) {
    return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Reads the registry and the workflow as the default branch has them. A missing or unreadable
 * registry lists nothing, as for the CI ("without the file on the base, nothing is advisory").
 * @param {string | null} registry the registry file, null when the branch has none
 * @param {string | null} ci the workflow file, null when the branch has none
 * @returns {Advisory} the advisory entries and the job names
 */
export function readAdvisory(registry, ci) {
    let raw = [];
    try {
        raw = registry ? (JSON.parse(registry).advisory ?? []) : [];
    } catch {
        raw = [];
    }
    const entries = (Array.isArray(raw) ? raw : [])
        .filter((a) => typeof a?.job === "string" && /^\d{4}-\d\d-\d\d$/.test(String(a.enforce)))
        .map((a) => ({
            id: a.step ? `${a.job}/${a.step}` : a.job,
            job: a.job,
            step: typeof a.step === "string" ? a.step : null,
            enforce: a.enforce,
            issue: Number.isInteger(a.issue) && a.issue > 0 ? a.issue : null,
        }));
    return { entries, names: ci ? jobNames(ci) : {} };
}

/**
 * The UTC day of a time, as the registry writes its dates.
 * @param {Date | string | number} at the time
 * @returns {string} YYYY-MM-DD
 */
export const utcDay = (at) => new Date(at).toISOString().slice(0, 10);

/**
 * The entries still in their warning period on a day: enforce after it (the CI's own rule).
 * @param {Advisory | null | undefined} advisory the registry as read
 * @param {string} today the UTC day
 * @returns {Entry[]} the entries that only warn today
 */
export const warningNow = (advisory, today) => (advisory?.entries ?? []).filter((e) => e.enforce > today);

/**
 * The entries the CI workflow tests ask to promote on a day: on or after enforce less three days.
 * @param {Advisory | null | undefined} advisory the registry as read
 * @param {string} today the UTC day
 * @returns {Entry[]} the entries due for promotion
 */
export const promotionsDue = (advisory, today) =>
    (advisory?.entries ?? []).filter((e) => Date.parse(today) >= Date.parse(e.enforce) - PROMOTE_LEAD_DAYS * DAY);

/**
 * The advisory entry a failed job falls under today: an entry for the whole job, or, when the
 * failed steps are known, entries for every one of them.
 * @param {Advisory | null | undefined} advisory the registry as read
 * @param {string} today the UTC day
 * @param {{job: string, steps?: string[]}} failure the job's check run name, and its failed steps
 * @returns {Entry[] | null} the entries, or null when the failure counts as usual
 */
export function advisoryFailure(advisory, today, { job, steps = [] }) {
    if (!advisory) return null;
    const of = warningNow(advisory, today).filter((e) => {
        const name = advisory.names[e.job] ?? `^${escape(e.job)}$`;
        return new RegExp(name).test(job);
    });
    const whole = of.find((e) => e.step === null);
    if (whole) return [whole];
    if (!steps.length) return null;
    const per = steps.map((s) => of.find((e) => e.step === s));
    return per.every(Boolean) ? /** @type {Entry[]} */ ([...new Set(per)]) : null;
}

/**
 * The board's words for an advisory failure.
 * @param {Entry} e the entry
 * @returns {string} `advisory: <check> (enforced from <date>)`
 */
export const advisoryWords = (e) => `advisory: ${e.id} (enforced from ${e.enforce})`;
