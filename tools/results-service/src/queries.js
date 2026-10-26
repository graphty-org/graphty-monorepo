// The results Worker's read side (design/ci/channels-pipeline/results-service.md 5.3 and 6; channels.md 5 and
// 7; budgets-and-trust.md 1.6). Every answer is computed when it is read: no cron, no stored conclusion.
import { refuse } from "./service.js";

const DAY = 86_400_000;
// a full run's slot: release.yml runs every 6 hours, so a promotion run started at most this long before its move
const FULL_RUN_SLOT = DAY / 4;
const EVIDENCE = "('pr','full','bisect','base')"; // what reuse and history may count (never local)
const MASTER_EVIDENCE = "('full','bisect','base')"; // master's own code: the only kinds that excuse or pass a quarantine
const QUARANTINE_PASSES = 20;
const NEVER_QUARANTINED = /^webgpu-graph-algorithms/;

const list = (value) => (value ?? "").split(",").filter(Boolean);
const placeholders = (values) => values.map(() => "?").join(",");
const all = async (db, sql, ...args) =>
    (
        await db
            .prepare(sql)
            .bind(...args)
            .all()
    ).results;
const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Passing master-evidence runs of a quarantined test's file since its last failure there (6.5: 20 leave).
async function passesSince(db, q) {
    const [row] = await all(
        db,
        `SELECT count(*) AS n FROM file_run r JOIN invocation i ON i.id = r.invocation
         WHERE r.file = ? AND i.kind IN ${MASTER_EVIDENCE} AND i.outcome IN ('passed','failed')
           AND (i.variant = ? OR i.variant LIKE ? || '|%') AND i.started_at >= ?
           AND NOT EXISTS (SELECT 1 FROM failure f WHERE f.invocation = i.id AND f.file = r.file AND f.name = ?)
           AND i.started_at > coalesce((SELECT max(j.started_at) FROM failure f JOIN invocation j ON j.id = f.invocation
                 WHERE f.file = ? AND f.name = ? AND j.kind IN ${MASTER_EVIDENCE} AND j.started_at >= ?), 0)`,
        q.file,
        q.family,
        q.family,
        q.since,
        q.name,
        q.file,
        q.name,
        q.since,
    );
    return row.n;
}

/**
 * The quarantine as it stands now: entries not left, not expired, without 20 passes since their last
 * failure, and never a GPU family.
 * @param db the D1 database
 * @param families shard families
 * @param now milliseconds
 * @returns the entries, each with family, file, name, issue, expires and passes
 */
async function activeQuarantine(db, families, now) {
    const wanted = families.filter((f) => !NEVER_QUARANTINED.test(f));
    if (!wanted.length) return [];
    const rows = await all(
        db,
        `SELECT family, file, name, issue, since, expires FROM quarantine
         WHERE left_at IS NULL AND expires > ? AND family IN (${placeholders(wanted)})`,
        now,
        ...wanted,
    );
    const out = [];
    for (const q of rows) {
        const passes = await passesSince(db, q);
        if (passes < QUARANTINE_PASSES) out.push({ ...q, since: undefined, passes });
    }
    return out;
}

// Failures master's own runs of the asked variants saw on exactly `base`, or with the same variant and
// inputs key (6.3). Another variant's failure (flags=on for a flags=off run) excuses nothing.
async function failingOnBase(db, base, pairs, changed) {
    if (!pairs.length) return [];
    const variants = pairs.map(([v]) => v);
    const same = pairs.map(() => " OR (i.variant = ? AND i.inputs = ?)").join("");
    const rows = await all(
        db,
        `SELECT DISTINCT i.variant, f.file, f.name, f.key, f.signature, f.invocation, t.number AS issue
         FROM failure f JOIN invocation i ON i.id = f.invocation
         LEFT JOIN tracked_issue t ON t.signature = f.signature
         WHERE i.kind IN ${MASTER_EVIDENCE} AND i.outcome = 'failed'
           AND ((i.sha = ? AND i.variant IN (${placeholders(variants)}))${same})`,
        base ?? "",
        ...variants,
        ...pairs.flat(),
    );
    return rows.filter((r) => !changed.has(r.file)); // rule 1, the file itself; its import closure is the client's
}

async function variantFacts(db, variant, inputs, now) {
    const passed = await db
        .prepare(
            `SELECT id FROM invocation WHERE variant = ? AND inputs = ? AND outcome = 'passed' AND kind IN ${EVIDENCE}
             ORDER BY started_at DESC LIMIT 1`,
        )
        .bind(variant, inputs)
        .first();
    const order = await all(
        db,
        `SELECT f.file, max(i.started_at) AS at FROM failure f JOIN invocation i ON i.id = f.invocation
         WHERE i.variant = ? AND i.kind IN ${EVIDENCE} AND i.outcome = 'failed' AND i.started_at >= ?
         GROUP BY f.file ORDER BY at DESC`,
        variant,
        now - 7 * DAY,
    );
    const runs = await all(
        db,
        `SELECT file, ms FROM (SELECT r.file, r.ms, row_number() OVER (PARTITION BY r.file ORDER BY i.started_at DESC) AS n
           FROM file_run r JOIN invocation i ON i.id = r.invocation
           WHERE i.variant = ? AND i.kind IN ${EVIDENCE} AND i.outcome IN ('passed','failed') AND r.ms IS NOT NULL)
         WHERE n <= 9`,
        variant,
    );
    const byFile = Map.groupBy(runs, (r) => r.file);
    const fileMs = Object.fromEntries([...byFile].map(([file, rs]) => [file, median(rs.map((r) => r.ms))]));
    return { passedWithInputs: passed?.id ?? null, order: order.map((r) => r.file), fileMs };
}

// The files' history over every variant, for a caller that names files and no variants (test-changed.mjs's
// ranking, tools/test-history.mjs scoreFromPlan): failed in the last 7 days, newest first, and the median of
// each file's last 9 runs. Chunked: D1 binds at most 100 parameters a statement.
async function fileFacts(db, files, now) {
    const order = new Map();
    const fileMs = {};
    for (let i = 0; i < files.length; i += 90) {
        const chunk = files.slice(i, i + 90);
        const failed = await all(
            db,
            `SELECT f.file, max(i.started_at) AS at FROM failure f JOIN invocation i ON i.id = f.invocation
             WHERE f.file IN (${placeholders(chunk)}) AND i.kind IN ${EVIDENCE} AND i.outcome = 'failed'
               AND i.started_at >= ? GROUP BY f.file`,
            ...chunk,
            now - 7 * DAY,
        );
        for (const r of failed) order.set(r.file, r.at);
        const runs = await all(
            db,
            `SELECT file, ms FROM (SELECT r.file, r.ms, row_number() OVER (PARTITION BY r.file ORDER BY i.started_at DESC) AS n
               FROM file_run r JOIN invocation i ON i.id = r.invocation
               WHERE r.file IN (${placeholders(chunk)}) AND i.kind IN ${EVIDENCE}
                 AND i.outcome IN ('passed','failed') AND r.ms IS NOT NULL)
             WHERE n <= 9`,
            ...chunk,
        );
        for (const [file, rs] of Map.groupBy(runs, (r) => r.file)) fileMs[file] = median(rs.map((r) => r.ms));
    }
    return { order: [...order].sort((a, b) => b[1] - a[1]).map(([file]) => file), fileMs };
}

/**
 * GET /v1/plan?sha=&base=&variants=&inputs=&files= : one read per run (5.3). `variants` and `inputs` are
 * comma lists of the same length, pairwise; `files` are the pull request's changed files.
 * @param q the query
 * @param who the caller
 * @param db the D1 database
 * @param now milliseconds
 * @returns quarantine, failingOnBase, and per variant passedWithInputs, order and fileMs; with files and no
 *   variants, also order and fileMs over every variant for those files
 */
export async function getPlan(q, who, db, now) {
    const variants = list(q.get("variants"));
    const inputs = list(q.get("inputs"));
    if (variants.length !== inputs.length) refuse(400, "variants and inputs must be lists of the same length");
    const pairs = variants.map((v, i) => [v, inputs[i]]);
    const families = [...new Set(variants.map((v) => v.split("|")[0]))];
    const facts = {};
    for (const [v, k] of pairs) facts[v] = await variantFacts(db, v, k, now);
    const files = list(q.get("files"));
    return {
        quarantine: await activeQuarantine(db, families, now),
        failingOnBase: await failingOnBase(db, q.get("base"), pairs, new Set(files)),
        variants: facts,
        ...(pairs.length === 0 && files.length ? await fileFacts(db, files, now) : {}),
    };
}

const newestSite = (db) =>
    db.prepare("SELECT sha, built_at AS builtAt FROM site ORDER BY built_at DESC LIMIT 1").first();
const latestVerdict = (db, sha) =>
    db
        .prepare(
            "SELECT sha, state, lane, issue, run_id AS runId, at FROM verdict WHERE sha = ? ORDER BY at DESC LIMIT 1",
        )
        .bind(sha)
        .first();

/**
 * GET /v1/candidate : the full run's pick, master's newest commit whose site-<sha> exists (deploy-pages
 * records one only after a green push build), and its verdict when it is already judged. The release-diff
 * skip needs git and stays in release.yml.
 * @param q the query string
 * @param who the caller
 * @param db the D1 database
 * @param now milliseconds
 * @returns candidate (sha, builtAt) or null, judged: its latest verdict or null, recent, and sites (the last
 *   200 recorded, newest record first)
 */
export async function getCandidate(q, who, db, now) {
    const candidate = await newestSite(db);
    // every commit's latest verdict of the last 30 days: the pick walks master's first parents through them for a
    // restart's own commit, a judgement by inheritance and the bisect's last green commit
    const recent = await all(
        db,
        `SELECT v.sha, v.state, v.lane, v.issue, v.run_id AS runId, v.at FROM verdict v
         WHERE v.at >= ? AND v.at = (SELECT max(w.at) FROM verdict w WHERE w.sha = v.sha) ORDER BY v.at DESC`,
        now - 30 * DAY,
    );
    // the recorded sites, so the pick can order them by master's history (a late record is not a newer commit)
    const sites = (await all(db, "SELECT sha FROM site ORDER BY built_at DESC LIMIT 200")).map((r) => r.sha);
    return { candidate, judged: candidate && (await latestVerdict(db, candidate.sha)), recent, sites };
}

/**
 * GET /v1/failures?run=&good= : the tests a full run saw fail, for its bisect (channels 6). `run` is the run id;
 * `good` the last green full-run commit: `failedBefore` names the tests master's own runs saw fail before that
 * commit's site was built, in the 7 days before it (flaky before the range, so never bisected).
 * @param q the query string
 * @param who the caller
 * @param db the D1 database
 * @returns tests ({ shard, file, name }, distinct) and failedBefore (their bisect ids)
 */
export async function getFailures(q, who, db) {
    const run = q.get("run") ?? "";
    if (!/^\d+$/.test(run)) refuse(400, "run must be a run id");
    const rows = await all(
        db,
        `SELECT DISTINCT f.invocation, f.file, f.name FROM failure f WHERE f.invocation LIKE ? || '.%' ORDER BY f.file, f.name`,
        run,
    );
    // the id is <run>.<attempt>.<job>.<shard>.<try> (tools/results/run-group.mjs)
    const seen = new Map();
    for (const r of rows) {
        const t = { shard: r.invocation.split(".")[3], file: r.file, name: r.name };
        seen.set(`${t.shard}: ${t.file} > ${t.name}`, t);
    }
    // ponytail: the first 100 failing tests, the most a bisect follows (full-run.mjs MAX_TARGETS); each costs one
    // query below, and a Worker call has a query limit
    for (const key of [...seen.keys()].slice(100)) seen.delete(key);
    const built = q.get("good")
        ? (await db.prepare("SELECT built_at FROM site WHERE sha = ?").bind(q.get("good")).first())?.built_at
        : undefined;
    const failedBefore = [];
    for (const [id, t] of built ? seen : []) {
        const [hit] = await all(
            db,
            `SELECT 1 FROM failure f JOIN invocation i ON i.id = f.invocation
             WHERE f.file = ? AND f.name = ? AND i.kind IN ${MASTER_EVIDENCE} AND i.started_at < ?
               AND i.started_at >= ? LIMIT 1`,
            t.file,
            t.name,
            built,
            // flaky before the range means recently: one failure months ago does not excuse a regression now
            built - 7 * DAY,
        );
        if (hit) failedBefore.push(id);
    }
    return { tests: [...seen.values()], failedBefore };
}

// What holds canary's commit back from nightly, by its latest verdict state.
const BLOCKING = {
    red: "red",
    "owner-item": "owner-item",
    "green-images": "waiting-for-screenshots",
    approved: "resume-due",
    rejected: "rejected",
    "green-clean": "promotable",
};

/**
 * Whether a commit is nightly's, or took nightly's verdict over commits that change only versions or approval
 * records: the full run's pick writes such a verdict as "inherited from <short sha>" (tools/full-run.mjs) and
 * never promotes that commit, so it is nightly, not a candidate waiting for it. The chain is followed (a
 * promotion's version merge, then a merge after it). pick never inherits across a visual-baselines/ change, so a
 * merge of the owner's approved baselines is judged on its own and counts as waiting for nightly here too.
 * @param sha the commit
 * @param nightlySha nightly's commit
 * @param states the newest verdict of each recent commit
 * @returns true when it is nightly's
 */
function sameAsNightly(sha, nightlySha, states) {
    if (!sha || !nightlySha) return false;
    let at = sha;
    for (let hop = 0; hop <= states.length; hop++) {
        if (at === nightlySha || (at.length < 40 && nightlySha.startsWith(at))) return true;
        const lane = states.find((v) => v.sha === at || (at.length < 40 && v.sha.startsWith(at)))?.lane;
        const from = /^inherited from ([0-9a-f]{7,})$/.exec(lane ?? "")?.[1];
        if (!from) return false;
        at = from;
    }
    return false;
}

/**
 * GET /v1/release-state : what ci.yml's release-due job and every release.yml run's catch-up read
 * (channels 5 and 7), and `age:nightly` for the stall alarm (main section 7).
 * @param q the query string
 * @param who the caller
 * @param db the D1 database
 * @param now milliseconds
 * @returns nightly, red, approved, offered, canary, ageNightlyMs and blocking
 */
export async function getReleaseState(q, who, db, now) {
    const nightly = await db
        .prepare("SELECT sha, at AS movedAt FROM channel_move WHERE channel = 'nightly' ORDER BY at DESC LIMIT 1")
        .first();
    // ponytail: verdicts of the last 30 days; a candidate waiting longer than that is long since stalled
    const states = await all(
        db,
        `SELECT v.sha, v.state, v.lane, v.issue, v.at, coalesce(s.built_at, 0) AS builtAt FROM verdict v
         LEFT JOIN site s ON s.sha = v.sha
         WHERE v.at >= ? AND v.at = (SELECT max(w.at) FROM verdict w WHERE w.sha = v.sha) ORDER BY v.at`,
        now - 30 * DAY,
    );
    // a nightly with no site row (a lost POST /v1/sites) counts from its promotion run's start, never from the
    // oldest site: not from its move, which ends that run, or the commits merged while it ran would go uncounted.
    // ponytail: the run's start is taken as one slot before the move; a run longer than its slot misses a few
    const nightlyBuilt = nightly
        ? ((await db.prepare("SELECT built_at FROM site WHERE sha = ?").bind(nightly.sha).first())?.built_at ??
          nightly.movedAt - FULL_RUN_SLOT)
        : 0;
    const last = states.findLast((s) => !["approved", "rejected"].includes(s.state));
    const canary = await newestSite(db);
    const canaryVerdict = states.find((s) => s.sha === canary?.sha);
    const unpromoted = !!canary && !sameAsNightly(canary.sha, nightly?.sha, states) && canary.builtAt > nightlyBuilt;
    // nightly is behind from the first site built after it that is not nightly's own (a promotion's version
    // merge, an approvals-only merge), not from its own move: a quiet master is no stall
    const after = await all(
        db,
        "SELECT sha, built_at AS at FROM site WHERE built_at > ? ORDER BY built_at",
        nightlyBuilt,
    );
    const start = after.find((r) => !sameAsNightly(r.sha, nightly?.sha, states))?.at;
    const canaryState = canaryVerdict?.state;
    return {
        nightly,
        red: last?.state === "red" ? last : null,
        // a Finish promotes only a candidate newer than nightly; each of these is a resume that is due
        approved: states.filter((s) => s.state === "approved" && s.builtAt > nightlyBuilt),
        // the frozen candidate: the oldest still waiting for the owner
        offered: states.filter((s) => s.state === "green-images").sort((a, b) => a.builtAt - b.builtAt)[0] ?? null,
        canary,
        // null while nightly has never moved: not started, so the stall alarm has nothing to count from
        ageNightlyMs: nightly ? (unpromoted ? now - start : 0) : null,
        blocking: unpromoted ? (BLOCKING[canaryState] ?? "unjudged") : null,
    };
}

function keyOf(r) {
    if (r.task) return `task:${r.task}`;
    return r.step ? `step:${r.workflow}:${r.job}:${r.step}` : `job:${r.workflow}:${r.job}`;
}

function judgeTrend(rows, budgetSeconds) {
    const secs = rows.map((r) => r.ms / 1000);
    const recent = median(secs.slice(-5));
    const before = secs.slice(-15, -5);
    const earlier = before.length ? median(before) : null;
    const overBudget = budgetSeconds != null && recent > budgetSeconds;
    const overTrend = earlier != null && recent > 1.3 * earlier && recent - earlier >= 60;
    const line = overBudget ? budgetSeconds : Math.max(1.3 * earlier, earlier + 60);
    const first = rows.findIndex((r, i) => i >= rows.length - 5 && r.ms / 1000 > line);
    const range = first > 0 ? `${rows[first - 1].sha}..${rows[first].sha}` : null;
    return { recent, earlier, alarm: overBudget || overTrend, range };
}

/**
 * Master's median seconds per key (budgets 1.5), for a pull request's "slower than master" comment: over the
 * last `n` runs (10, at most 50) of `kind` (full: master's own ci.yml and release.yml runs) of the asked
 * workflows in 30 days, cancelled runs left out. Asked by workflow, not by key: a run has hundreds of keys,
 * more than a URL holds.
 * @param query `workflows` (comma list), `kind`, `n`
 * @param _who the caller
 * @param db the D1 database
 * @param now milliseconds
 * @returns seconds by key (`job:<workflow>:<job>`, `step:<workflow>:<job>:<step>`, `task:<task>`)
 */
export async function getMedians(query, _who, db, now) {
    const workflows = list(query.get("workflows"));
    if (!workflows.length || workflows.length > 20) refuse(400, "workflows names 1 to 20 workflow files");
    const n = Math.min(Math.max(Number(query.get("n")) || 10, 1), 50);
    const rows = await all(
        db,
        `SELECT workflow, job, step, task, ms FROM (SELECT d.*, row_number() OVER
           (PARTITION BY workflow, job, step, task ORDER BY started_at DESC) AS n FROM duration d
           WHERE kind = ? AND workflow IN (${placeholders(workflows)}) AND started_at >= ?
             AND coalesce(conclusion, '') != 'cancelled')
         WHERE n <= ?`,
        query.get("kind") || "full",
        ...workflows,
        now - 30 * DAY,
        n,
    );
    return Object.fromEntries(
        [...Map.groupBy(rows, keyOf)].map(([key, rs]) => [key, median(rs.map((r) => r.ms / 1000))]),
    );
}

/**
 * The trend alarms for the keys of one posted run (budgets 1.6): per key within the run's kind, `recent` =
 * median of the last 5 runs, `earlier` = the 10 before; an alarm over the budget, or over 1.3 x earlier and
 * 60 s slower. The `timings` job that posted files or closes the issues.
 * @param db the D1 database
 * @param kind the run kind
 * @param posted the rows just stored
 * @param budgets seconds by key, from the poster's ci-budgets.json
 * @param now milliseconds
 * @returns key, kind, recent, earlier, alarm and range for each key with at least 5 runs
 */
export async function trendFor(db, kind, posted, budgets, now) {
    const workflows = [...new Set(posted.map((r) => r.workflow))];
    const keys = new Set(posted.map((r) => keyOf({ step: "", task: "", ...r })));
    // ponytail: 30-day window scanned per post; a per-key summary table if D1 reads get slow
    const rows = await all(
        db,
        `SELECT workflow, job, step, task, sha, ms FROM (SELECT d.*, row_number() OVER
           (PARTITION BY workflow, job, step, task ORDER BY started_at DESC) AS n FROM duration d
           WHERE kind = ? AND workflow IN (${placeholders(workflows)}) AND started_at >= ?
             AND coalesce(conclusion, '') != 'cancelled')
         WHERE n <= 15 ORDER BY started_at`,
        kind,
        ...workflows,
        now - 30 * DAY,
    );
    const byKey = Map.groupBy(rows, keyOf);
    return [...byKey]
        .filter(([key, rs]) => keys.has(key) && rs.length >= 5)
        .map(([key, rs]) => ({ key, kind, ...judgeTrend(rs, budgets?.[key]) }));
}
