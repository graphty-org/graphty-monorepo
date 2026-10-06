#!/usr/bin/env node
// Keeps the SonarQube project `<key>` (SONAR_PROJECT_KEY) a current analysis of origin/master, and
// sets the server up for the pre-push gate. See design/sonarqube/design.md, sections 1 and 2.
//
// Usage:
//   node tools/sonar-baseline.mjs --setup   once, by the owner, with an ADMIN token, on the owner's
//                                           network. Idempotent: creates <key> and <key>-local, restores
//                                           the "Graphty way" profile (tools/sonar/graphty-way.xml) and
//                                           assigns it, creates the "Graphty" quality gate and assigns
//                                           it, sets <key>'s new-code period to 30 days, and pins the
//                                           server id the gate checks before it sends a token.
//   node tools/sonar-baseline.mjs --once    one baseline pass (below), then exit
//   node tools/sonar-baseline.mjs --watch   a pass every 30 minutes, forever. Run under servherd:
//       servherd_start({ name: "sonar-baseline", cwd: "<repo>", command: "node tools/sonar-baseline.mjs --watch" })
//     with no token in env or command; this script reads it from the environment or .env.
//
// A pass: fetch origin; if origin/master is not the revision <key> last analyzed, move the detached
// worktree .worktrees/sonar-baseline to it, install and build, merge the coverage of that commit's
// CI run (master push runs only; wait up to 3 hours for it, then scan without), restore the profile
// if the file changed, and run a full scan under the lock the gate uses (skipping the pass if a
// push holds it). The first pass of each ISO week comments the numbers on the pinned
// "SonarQube burn-down" issue.
//
// The token goes only to the scanner child and to tools/sonar/api.mjs; every other child (git,
// pnpm, gh, the build) runs with both tokens removed from its environment.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
    acquireLock,
    client,
    envWithoutToken,
    loadConfig,
    serverStatus,
    startScanner,
    stopScanner,
} from "./sonar/api.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PROFILE_FILE = join(ROOT, "tools/sonar/graphty-way.xml");
const POLL_MS = 30 * 60 * 1000;
const COVERAGE_WAIT_MS = 3 * 60 * 60 * 1000;
const SCAN_TIMEOUT_MS = 1800 * 1000;
const GATE_NAME = "Graphty";
// The "Graphty" gate's conditions at stage 0. Each stage of the burn-down adds its ratchet here
// (design section 3, "Stages") and records it in design/sonarqube/server-settings.md.
const GATE_CONDITIONS = [
    { metric: "new_violations", op: "GT", error: "0" },
    { metric: "new_security_hotspots_reviewed", op: "LT", error: "100" },
];

const log = (msg) => console.log(`${new Date().toISOString()} ${msg}`);
const git = (args, cwd = ROOT) => execFileSync("git", args, { cwd, encoding: "utf8", env: envWithoutToken() }).trim();
const commonDir = () => git(["rev-parse", "--path-format=absolute", "--git-common-dir"]);
const sonarDir = () => {
    const d = join(commonDir(), "sonar");
    mkdirSync(d, { recursive: true });
    return d;
};

const POST = { method: "POST" };
const hashFile = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const firstLine = (e) => e.message.split("\n")[0];

// The profile file as { name, parent, languages: { ts: ["typescript:S2699", ...] } }.
function readProfileFile(text) {
    const head = text.match(/<graphty-way name="([^"]+)" parent="([^"]+)">/);
    if (!head) throw new Error('graphty-way.xml: no <graphty-way name="..." parent="..."> element');
    const languages = {};
    const body = text.replaceAll(/<!--[\s\S]*?-->/g, "");
    for (const m of body.matchAll(/<language key="([^"]+)">([\s\S]*?)<\/language>/g)) {
        languages[m[1]] = [...m[2].matchAll(/<deactivate rule="([^"]+)"/g)].map((r) => r[1]);
    }
    return { name: head[1], parent: head[2], languages };
}

// Rule keys active in a profile.
async function activeRules(api, profileKey) {
    const rules = await api.all("api/rules/search", { qprofile: profileKey, activation: "true", f: "repo" }, "rules");
    return new Set(rules.map((r) => r.key));
}

// The profile `name` for `language`, created if missing, with `parentName` as its parent.
async function ensureProfile(api, language, name, parentName) {
    const found = (await api.call("api/qualityprofiles/search", { language })).profiles ?? [];
    const parent = found.find((p) => p.name === parentName);
    if (!parent) throw new Error(`no "${parentName}" profile for ${language}`);
    let profile = found.find((p) => p.name === name);
    if (!profile) {
        profile = (await api.call("api/qualityprofiles/create", { language, name }, POST)).profile;
        log(`created profile "${name}" (${language})`);
    }
    if (profile.parentKey !== parent.key) {
        await api.call(
            "api/qualityprofiles/change_parent",
            { language, qualityProfile: name, parentQualityProfile: parentName },
            POST,
        );
    }
    return { profile, parent };
}

// Deactivate exactly `deactivate` among the rules the profile inherits; reactivate the rest.
async function syncRules(api, profile, parent, deactivate) {
    const want = new Set(deactivate);
    const parentRules = await activeRules(api, parent.key);
    const own = await activeRules(api, profile.key);
    for (const rule of want) {
        if (!own.has(rule)) continue;
        await api.call("api/qualityprofiles/deactivate_rule", { key: profile.key, rule }, POST);
        log(`deactivated ${rule} in "${profile.name}"`);
    }
    for (const rule of parentRules) {
        if (want.has(rule) || own.has(rule)) continue;
        await api.call("api/qualityprofiles/activate_rule", { key: profile.key, rule, reset: "true" }, POST);
        log(`reactivated ${rule} in "${profile.name}"`);
    }
}

// Make the server's "Graphty way" profiles match `file` and assign them to `projects`.
async function restoreProfile(api, projects, file = PROFILE_FILE) {
    const spec = readProfileFile(readFileSync(file, "utf8"));
    for (const [language, deactivate] of Object.entries(spec.languages)) {
        const { profile, parent } = await ensureProfile(api, language, spec.name, spec.parent);
        await syncRules(api, { ...profile, name: `${spec.name} (${language})` }, parent, deactivate);
        for (const project of projects) {
            await api.call("api/qualityprofiles/add_project", { language, qualityProfile: spec.name, project }, POST);
        }
    }
    writeFileSync(join(sonarDir(), "profile-hash"), hashFile(file));
}

// The "Graphty" quality gate with exactly GATE_CONDITIONS, assigned to `projects`.
async function syncGate(api, projects) {
    const gates = (await api.call("api/qualitygates/list")).qualitygates ?? [];
    if (!gates.some((g) => g.name === GATE_NAME)) {
        await api.call("api/qualitygates/create", { name: GATE_NAME }, POST);
        log(`created quality gate "${GATE_NAME}"`);
    }
    const have = (await api.call("api/qualitygates/show", { name: GATE_NAME })).conditions ?? [];
    for (const c of GATE_CONDITIONS) {
        const old = have.find((x) => x.metric === c.metric);
        if (!old) await api.call("api/qualitygates/create_condition", { gateName: GATE_NAME, ...c }, POST);
        else if (old.op !== c.op || old.error !== c.error) {
            await api.call("api/qualitygates/update_condition", { id: old.id, ...c }, POST);
        }
    }
    for (const c of have.filter((x) => !GATE_CONDITIONS.some((w) => w.metric === x.metric))) {
        await api.call("api/qualitygates/delete_condition", { id: c.id }, POST);
    }
    for (const projectKey of projects) {
        await api.call("api/qualitygates/select", { gateName: GATE_NAME, projectKey }, POST);
    }
}

async function setup(cfg) {
    const status = await serverStatus(cfg.host);
    if (!status) throw new Error("the server at SONAR_HOST_URL does not answer");
    const api = client(cfg.host, cfg.adminToken);
    const me = await api.call("api/users/current");
    if (!me.permissions?.global?.includes("admin")) {
        throw new Error("--setup creates projects and profiles: run it with an administrator's token");
    }
    const key = cfg.projectKey;
    const projects = [key, `${key}-local`];
    for (const project of projects) {
        const found = await api.call("api/projects/search", { projects: project });
        if (found.components?.length) continue;
        const name = project === key ? "Graphty" : "Graphty (pre-push scratch)";
        await api.call("api/projects/create", { project, name, mainBranch: "main" }, POST);
        log(`created project ${project}`);
    }
    await restoreProfile(api, projects);
    await syncGate(api, projects);
    await api.call("api/new_code_periods/set", { project: key, type: "NUMBER_OF_DAYS", value: "30" }, POST);
    writeFileSync(join(sonarDir(), "server-id"), `${status.id}\n`);
    log(`setup done; pinned server id ${status.id}`);
}

const sh = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, stdio: "inherit", env: envWithoutToken() }).status === 0;
const ghJson = (args) => JSON.parse(execFileSync("gh", args, { cwd: ROOT, encoding: "utf8", env: envWithoutToken() }));

// The CI run of `sha`'s master push: the run, "pending" while it has not finished, or "error".
function ciRun(sha) {
    try {
        const filter = ["--workflow", "ci.yml", "--branch", "master", "--event", "push", "--commit", sha];
        const runs = ghJson(["run", "list", ...filter, "--json", "databaseId,status,conclusion"]);
        return runs[0]?.status === "completed" ? runs[0] : "pending";
    } catch (e) {
        log(`gh run list failed: ${firstLine(e)}`);
        return "error";
    }
}

// Download a run's coverage-* artifacts and merge them into <worktree>/coverage/lcov.info.
function mergeCoverage(run, worktree) {
    const dir = join(worktree, ".coverage-artifacts");
    rmSync(dir, { recursive: true, force: true });
    rmSync(join(worktree, "coverage/lcov.info"), { force: true });
    if (!sh("gh", ["run", "download", String(run.databaseId), "-p", "coverage-*", "-D", dir], ROOT)) return false;
    return sh("./tools/merge-coverage.sh", ["--ci", "--artifacts", dir], worktree);
}

function isoWeek(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    const year = t.getUTCFullYear();
    return `${year}-W${Math.ceil(((t - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7)}`;
}

const gitOut = (args) => {
    try {
        return git(args);
    } catch {
        return "";
    }
};

// What landed on master since `since` that the weekly review counts: NOSONARs, path entries, bypasses.
function suppressionsSince(since) {
    const log7 = ["log", `--since=${since}`, "-p", "--format=", "origin/master"];
    const nosonar = gitOut(log7)
        .split("\n")
        .filter((l) => l.startsWith("+") && l.includes("NOSONAR")).length;
    const multicriteria = gitOut([...log7, "--", "sonar-project.properties"])
        .split("\n")
        .filter((l) => l.startsWith("+sonar.issue.ignore.multicriteria.") && l.includes(".ruleKey=")).length;
    const grep = ["log", `--since=${since}`, "--grep", "^Sonar-Bypass:", "--format=%h %s", "origin/master"];
    const bypasses = gitOut(grep).split("\n").filter(Boolean);
    return { nosonar, multicriteria, bypasses };
}

// The pre-push gate's runs and skips since `since`, from its run log.
function gateRuns(since) {
    let text = "";
    try {
        text = readFileSync(join(sonarDir(), "gate.log"), "utf8");
    } catch {
        // no gate runs logged yet
    }
    const recent = text.split("\n").filter((line) => Date.parse(line.split(" ")[0]) >= since.getTime());
    return { total: recent.length, skipped: recent.filter((l) => l.includes(" skipped:")).length };
}

// The weekly numbers, as a Markdown comment for the "SonarQube burn-down" issue.
async function weeklyReport(api, key) {
    const since = new Date(Date.now() - 7 * 86400000);
    const sinceDay = since.toISOString().slice(0, 10);
    const open = { components: key, issueStatuses: "OPEN,CONFIRMED" };
    const facet = await api.call("api/issues/search", {
        ...open,
        ps: 1,
        facets: "impactSoftwareQualities,impactSeverities",
    });
    const facets = Object.fromEntries((facet.facets ?? []).map((f) => [f.property, f.values]));
    const fmt = (vals) => (vals ?? []).map((v) => `${v.val} ${v.count}`).join(", ") || "none";
    const hotspots = await api.call("api/hotspots/search", { project: key, status: "TO_REVIEW", ps: 1 });
    const metricKeys =
        "security_rating,reliability_rating,sqale_rating,security_review_rating,duplicated_lines_density,coverage";
    const measures = await api.call("api/measures/component", { component: key, metricKeys });
    const m = Object.fromEntries((measures.component?.measures ?? []).map((x) => [x.metric, x.value]));
    const rating = (v) => (v ? "ABCDE"[Math.round(Number(v)) - 1] : "?");
    const fresh = await api.call("api/issues/search", { ...open, createdAfter: sinceDay, ps: 50 });
    const s = suppressionsSince(sinceDay);
    const runs = gateRuns(since);
    const where = (i) => `${i.component.slice(key.length + 1)}:${i.line ?? ""}`;
    const qualities = fmt(facets.impactSoftwareQualities);
    const severities = fmt(facets.impactSeverities);
    const ratings = [
        `security ${rating(m.security_rating)}`,
        `reliability ${rating(m.reliability_rating)}`,
        `maintainability ${rating(m.sqale_rating)}`,
        `security review ${rating(m.security_review_rating)}`,
    ].join(", ");
    return [
        `## Week ${isoWeek()}: the owner's local SonarQube server, project \`${key}\``,
        "",
        `- Open issues: ${facet.paging?.total ?? 0} (by quality: ${qualities}; by severity: ${severities})`,
        `- Security hotspots to review: ${hotspots.paging?.total ?? 0}`,
        `- Ratings: ${ratings}`,
        `- Duplication ${m.duplicated_lines_density ?? "?"}%, coverage ${m.coverage ?? "not imported"}%`,
        `- Pre-push gate on this machine: ${runs.total} runs, ${runs.skipped} skipped`,
        `- New on master this week: ${fresh.paging?.total ?? 0} issues`,
        ...(fresh.issues ?? []).map((i) => `  - \`${where(i)}\` ${i.rule} ${i.message}`),
        `- New \`NOSONAR\` comments: ${s.nosonar}; new multicriteria entries: ${s.multicriteria}`,
        `- \`Sonar-Bypass\` trailers: ${s.bypasses.length}`,
        ...s.bypasses.map((l) => `  - ${l}`),
    ].join("\n");
}

// The first pass of each ISO week comments the numbers on the open "SonarQube burn-down" issue.
async function postWeekly(api, key) {
    const stamp = join(sonarDir(), "weekly");
    const week = isoWeek();
    if (existsSync(stamp) && readFileSync(stamp, "utf8").trim() === week) return;
    let issue;
    try {
        const search = ["--state", "open", "--search", "SonarQube burn-down in:title", "--json", "number,title"];
        issue = ghJson(["issue", "list", ...search]).find((i) => i.title === "SonarQube burn-down");
    } catch (e) {
        log(`gh issue list failed: ${firstLine(e)}`);
        return;
    }
    if (!issue) {
        log('no open "SonarQube burn-down" issue; weekly comment skipped');
        return;
    }
    if (sh("gh", ["issue", "comment", String(issue.number), "--body", await weeklyReport(api, key)], ROOT)) {
        writeFileSync(stamp, `${week}\n`);
        log(`weekly numbers posted on #${issue.number}`);
    }
}

// Move the baseline worktree to `sha`, install and build. False (logged) when a step failed.
function prepareWorktree(worktree, sha) {
    const moved = existsSync(worktree)
        ? sh("git", ["checkout", "--quiet", "--detach", "--force", sha], worktree)
        : sh("git", ["worktree", "add", "--detach", worktree, sha], ROOT);
    const fail = (why) => {
        log(`${why}; next poll`);
        return false;
    };
    if (!moved) return fail("could not move the baseline worktree");
    if (!sh("pnpm", ["install", "--frozen-lockfile"], worktree)) return fail("pnpm install failed");
    if (!sh("pnpm", ["exec", "nx", "run-many", "-t", "build", "--parallel=3"], worktree)) return fail("build failed");
    sh("npm", ["run", "build:bundle"], join(worktree, "webgpu-graph-algorithms"));
    return true;
}

// Restore the profile when the worktree's file differs from the one last restored.
async function restoreIfChanged(api, key, worktree) {
    const stamp = join(sonarDir(), "profile-hash");
    const file = join(worktree, "tools/sonar/graphty-way.xml");
    if (!existsSync(file)) return;
    if (existsSync(stamp) && readFileSync(stamp, "utf8") === hashFile(file)) return;
    try {
        await restoreProfile(api, [key, `${key}-local`], file);
        log("profile restored");
    } catch (e) {
        log(`profile restore failed (a non-admin token cannot change profiles; run --setup): ${e.message}`);
    }
}

// The full scan of the worktree into <key>, under the lock the gate uses, bounded by SCAN_TIMEOUT_MS.
async function fullScan(cfg, worktree, sha) {
    const release = await acquireLock(join(sonarDir(), "sonar-local.lock"), 0);
    if (!release) return log("a push holds the scan lock; next poll");
    try {
        const version = JSON.parse(readFileSync(join(worktree, "package.json"), "utf8")).version;
        const args = [
            `-Dsonar.projectKey=${cfg.projectKey}`,
            `-Dsonar.host.url=${cfg.host}`,
            `-Dsonar.projectVersion=${version}`,
            `-Dsonar.scm.revision=${sha}`,
            `-Dsonar.working.directory=${join(sonarDir(), "baseline")}`,
        ];
        const env = cfg.java ? { ...process.env, SONAR_SCANNER_JAVA_EXE_PATH: cfg.java } : process.env;
        const scanner = startScanner(worktree, args, {
            token: cfg.token,
            env,
            onOutput: (s) => process.stdout.write(s),
        });
        const timer = setTimeout(() => stopScanner(scanner.child), SCAN_TIMEOUT_MS);
        const { code } = await scanner.done;
        clearTimeout(timer);
        log(code === 0 ? `scanned ${sha.slice(0, 9)} into ${cfg.projectKey}` : `scan failed (exit ${code})`);
    } finally {
        release();
    }
}

// One poll: scan origin/master into <key> if <key> has not analyzed it yet.
async function pass(cfg) {
    if (!(await serverStatus(cfg.host))) return log("server unreachable; next poll");
    const api = client(cfg.host, cfg.token);
    const key = cfg.projectKey;
    if (!sh("git", ["fetch", "--quiet", "origin", "master"], ROOT)) return log("git fetch failed; next poll");
    const sha = git(["rev-parse", "origin/master"]);
    const last = (await api.call("api/project_analyses/search", { project: key, ps: 1 })).analyses?.[0];
    if (last?.revision !== sha) {
        const committed = Number(git(["show", "-s", "--format=%ct", sha])) * 1000;
        const run = ciRun(sha);
        if (run === "pending" && Date.now() - committed < COVERAGE_WAIT_MS) {
            return log(`CI has not finished for ${sha.slice(0, 9)}; next poll`);
        }
        const worktree = join(dirname(commonDir()), ".worktrees", "sonar-baseline");
        if (!prepareWorktree(worktree, sha)) return;
        if (typeof run !== "object" || !mergeCoverage(run, worktree)) {
            rmSync(join(worktree, "coverage/lcov.info"), { force: true });
            log(
                `scanning ${sha.slice(0, 9)} WITHOUT coverage (CI run: ${typeof run === "object" ? "no coverage" : run})`,
            );
        }
        await restoreIfChanged(api, key, worktree);
        await fullScan(cfg, worktree, sha);
    }
    await postWeekly(api, key);
}

// --watch: a pass now, then every POLL_MS. A failed pass is logged and retried at the next poll.
function watch() {
    const tick = async () => {
        try {
            await pass(loadConfig(ROOT));
        } catch (e) {
            log(`pass failed: ${e.message}`);
        }
        setTimeout(tick, POLL_MS);
    };
    return tick();
}

const MODES = { "--setup": setup, "--once": pass, "--watch": watch };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const mode = MODES[process.argv[2]];
    const cfg = loadConfig(ROOT);
    const missing = ["host", "projectKey", process.argv[2] === "--setup" ? "adminToken" : "token"].filter(
        (k) => !cfg[k],
    );
    if (!mode) {
        console.error("usage: node tools/sonar-baseline.mjs --setup | --once | --watch");
        process.exitCode = 2;
    } else if (missing.length) {
        console.error(
            `missing ${missing.join(", ")}: set SONAR_HOST_URL, SONAR_PROJECT_KEY and SONAR_SCAN_TOKEN (SONAR_TOKEN, an admin token, for --setup) in .env`,
        );
        process.exitCode = 1;
    } else {
        try {
            await mode(cfg);
        } catch (e) {
            console.error(e.message);
            process.exitCode = 1;
        }
    }
}
