#!/usr/bin/env node
/**
 * Keeps the SonarQube project `<key>` (SONAR_PROJECT_KEY) a current analysis of origin/master, and
 * sets the server up for the pre-push gate. See design/sonarqube/design.md, sections 1 and 2.
 *
 * Usage:
 *   node tools/sonar-baseline.mjs --setup   once, by the owner, with an ADMIN token, on the owner's
 *                                           network. Idempotent: creates <key> and <key>-local, restores
 *                                           the "Graphty way" profile (tools/sonar/graphty-way.xml) and
 *                                           assigns it, creates the "Graphty" quality gate and assigns
 *                                           it, sets <key>'s new-code period to 30 days, and pins the
 *                                           server id the gate checks before it sends a token.
 *   node tools/sonar-baseline.mjs --once    one baseline pass (below), then exit
 *   node tools/sonar-baseline.mjs --watch   a pass every 30 minutes, forever. Run under servherd:
 *       servherd_start({ name: "sonar-baseline", cwd: "<repo>", command: "node tools/sonar-baseline.mjs --watch" })
 *     with no token in env or command; this script reads it from the environment or .env.
 *
 * A pass: fetch origin; if origin/master is not the revision <key> last analyzed, move the detached
 * worktree .worktrees/sonar-baseline to it, install and build, merge the coverage of that commit's
 * CI run (master push runs only; wait up to 3 hours for it, then scan without), restore the profile
 * if the file changed, and run a full scan under the lock the gate uses (skipping the pass if a
 * push holds it). The first pass of each ISO week comments the numbers on the pinned
 * "SonarQube burn-down" issue.
 *
 * The token goes only to the scanner child and to tools/sonar/api.mjs; every other child (git,
 * pnpm, gh, the build) runs with SONAR_TOKEN removed from its environment.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { acquireLock, client, envWithoutToken, loadConfig, serverStatus, startScanner } from "./sonar/api.mjs";

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

/** The profile file as { name, parent, languages: { ts: ["typescript:S2699", ...] } }. */
export function readProfileFile(text) {
    const head = text.match(/<graphty-way\s+name="([^"]+)"\s+parent="([^"]+)"/);
    if (!head) throw new Error("graphty-way.xml: no <graphty-way name=... parent=...> element");
    const languages = {};
    const body = text.replace(/<!--[\s\S]*?-->/g, "");
    for (const m of body.matchAll(/<language\s+key="([^"]+)"\s*>([\s\S]*?)<\/language>/g)) {
        languages[m[1]] = [...m[2].matchAll(/<deactivate\s+rule="([^"]+)"/g)].map((r) => r[1]);
    }
    return { name: head[1], parent: head[2], languages };
}

/** Rule keys active in a profile. */
async function activeRules(api, profileKey) {
    const rules = await api.all("api/rules/search", { qprofile: profileKey, activation: "true", f: "repo" }, "rules");
    return new Set(rules.map((r) => r.key));
}

/** Make the server's "Graphty way" profiles match `file` and assign them to `projects`. */
async function restoreProfile(api, projects, file = PROFILE_FILE) {
    const spec = readProfileFile(readFileSync(file, "utf8"));
    for (const [language, deactivate] of Object.entries(spec.languages)) {
        const found = (await api.call("api/qualityprofiles/search", { language })).profiles ?? [];
        let profile = found.find((p) => p.name === spec.name);
        const parent = found.find((p) => p.name === spec.parent);
        if (!parent) throw new Error(`no "${spec.parent}" profile for ${language}`);
        if (!profile) {
            profile = (await api.call("api/qualityprofiles/create", { language, name: spec.name }, { method: "POST" }))
                .profile;
            log(`created profile "${spec.name}" (${language})`);
        }
        if (profile.parentKey !== parent.key) {
            await api.call(
                "api/qualityprofiles/change_parent",
                { language, qualityProfile: spec.name, parentQualityProfile: spec.parent },
                { method: "POST" },
            );
        }
        const want = new Set(deactivate);
        const parentRules = await activeRules(api, parent.key);
        const ownRules = await activeRules(api, profile.key);
        for (const rule of want) {
            if (ownRules.has(rule)) {
                await api.call("api/qualityprofiles/deactivate_rule", { key: profile.key, rule }, { method: "POST" });
                log(`deactivated ${rule} in "${spec.name}" (${language})`);
            }
        }
        for (const rule of parentRules) {
            if (!want.has(rule) && !ownRules.has(rule)) {
                await api.call(
                    "api/qualityprofiles/activate_rule",
                    { key: profile.key, rule, reset: "true" },
                    { method: "POST" },
                );
                log(`reactivated ${rule} in "${spec.name}" (${language})`);
            }
        }
        for (const project of projects) {
            await api.call(
                "api/qualityprofiles/add_project",
                { language, qualityProfile: spec.name, project },
                { method: "POST" },
            );
        }
    }
    writeFileSync(join(sonarDir(), "profile-hash"), hashFile(file));
}

const hashFile = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");

async function setup(cfg) {
    const status = await serverStatus(cfg.host);
    if (!status) throw new Error(`the server at SONAR_HOST_URL does not answer`);
    const api = client(cfg.host, cfg.token);
    const me = await api.call("api/users/current");
    if (!me.permissions?.global?.includes("admin")) {
        throw new Error("--setup creates projects and profiles: run it with an administrator's token");
    }
    const key = cfg.projectKey;
    const projects = [key, `${key}-local`];
    for (const project of projects) {
        const r = await api.call("api/projects/search", { projects: project });
        if (!r.components?.length) {
            const name = project === key ? "Graphty" : "Graphty (pre-push scratch)";
            await api.call("api/projects/create", { project, name, mainBranch: "main" }, { method: "POST" });
            log(`created project ${project}`);
        }
    }
    await restoreProfile(api, projects);

    const gates = (await api.call("api/qualitygates/list")).qualitygates ?? [];
    if (!gates.some((g) => g.name === GATE_NAME)) {
        await api.call("api/qualitygates/create", { name: GATE_NAME }, { method: "POST" });
        log(`created quality gate "${GATE_NAME}"`);
    }
    const gate = await api.call("api/qualitygates/show", { name: GATE_NAME });
    for (const c of GATE_CONDITIONS) {
        const have = (gate.conditions ?? []).find((x) => x.metric === c.metric);
        if (!have) {
            await api.call("api/qualitygates/create_condition", { gateName: GATE_NAME, ...c }, { method: "POST" });
        } else if (have.op !== c.op || have.error !== c.error) {
            await api.call("api/qualitygates/update_condition", { id: have.id, ...c }, { method: "POST" });
        }
    }
    for (const c of gate.conditions ?? []) {
        if (!GATE_CONDITIONS.some((w) => w.metric === c.metric)) {
            await api.call("api/qualitygates/delete_condition", { id: c.id }, { method: "POST" });
        }
    }
    for (const projectKey of projects) {
        await api.call("api/qualitygates/select", { gateName: GATE_NAME, projectKey }, { method: "POST" });
    }
    await api.call(
        "api/new_code_periods/set",
        { project: key, type: "NUMBER_OF_DAYS", value: "30" },
        { method: "POST" },
    );
    writeFileSync(join(sonarDir(), "server-id"), `${status.id}\n`);
    log(`setup done; pinned server id ${status.id}`);
}

const sh = (cmd, args, cwd, timeoutMs) => {
    const r = spawnSync(cmd, args, { cwd, stdio: "inherit", env: envWithoutToken(), timeout: timeoutMs });
    return r.status === 0;
};

/** The CI run of `sha`'s master push: the run, "pending" while it has not finished, or "error". */
function ciRun(sha) {
    try {
        const runs = JSON.parse(
            execFileSync(
                "gh",
                [
                    "run",
                    "list",
                    "--workflow",
                    "ci.yml",
                    "--branch",
                    "master",
                    "--event",
                    "push",
                    "--commit",
                    sha,
                    "--json",
                    "databaseId,status,conclusion",
                ],
                { cwd: ROOT, encoding: "utf8", env: envWithoutToken() },
            ),
        );
        return runs[0]?.status === "completed" ? runs[0] : "pending";
    } catch (e) {
        log(`gh run list failed: ${e.message.split("\n")[0]}`);
        return "error";
    }
}

/** Download a run's coverage-* artifacts and merge them into <worktree>/coverage/lcov.info. */
function mergeCoverage(run, worktree) {
    const dir = join(worktree, ".coverage-artifacts");
    rmSync(dir, { recursive: true, force: true });
    rmSync(join(worktree, "coverage/lcov.info"), { force: true });
    if (!sh("gh", ["run", "download", String(run.databaseId), "-p", "coverage-*", "-D", dir], ROOT)) return false;
    return sh("./tools/merge-coverage.sh", ["--ci", "--artifacts", dir], worktree);
}

function isoWeek(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const year = t.getUTCFullYear();
    return `${year}-W${Math.ceil(((t - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7)}`;
}

/** The weekly numbers, as a Markdown comment for the "SonarQube burn-down" issue. */
async function weeklyReport(api, key) {
    const since = new Date(Date.now() - 7 * 86400000);
    const sinceIso = since.toISOString().slice(0, 10);
    const facet = await api.call("api/issues/search", {
        components: key,
        issueStatuses: "OPEN,CONFIRMED",
        ps: 1,
        facets: "impactSoftwareQualities,impactSeverities",
    });
    const facets = Object.fromEntries((facet.facets ?? []).map((f) => [f.property, f.values]));
    const fmt = (vals) => (vals ?? []).map((v) => `${v.val} ${v.count}`).join(", ") || "none";
    const hotspots = await api.call("api/hotspots/search", { project: key, status: "TO_REVIEW", ps: 1 });
    const measures = await api.call("api/measures/component", {
        component: key,
        metricKeys:
            "security_rating,reliability_rating,sqale_rating,security_review_rating,duplicated_lines_density,coverage",
    });
    const m = Object.fromEntries((measures.component?.measures ?? []).map((x) => [x.metric, x.value]));
    const rating = (v) => (v ? "ABCDE"[Math.round(Number(v)) - 1] : "?");
    const fresh = await api.call("api/issues/search", {
        components: key,
        issueStatuses: "OPEN,CONFIRMED",
        createdAfter: sinceIso,
        ps: 50,
    });
    const gitOut = (args) => {
        try {
            return git(args);
        } catch {
            return "";
        }
    };
    const nosonar = gitOut(["log", `--since=${sinceIso}`, "-p", "--format=", "origin/master"])
        .split("\n")
        .filter((l) => l.startsWith("+") && l.includes("NOSONAR")).length;
    const multicriteria = gitOut([
        "log",
        `--since=${sinceIso}`,
        "-p",
        "--format=",
        "origin/master",
        "--",
        "sonar-project.properties",
    ])
        .split("\n")
        .filter((l) => /^\+sonar\.issue\.ignore\.multicriteria\.\w+\.ruleKey/.test(l)).length;
    const bypasses = gitOut([
        "log",
        `--since=${sinceIso}`,
        "--grep",
        "^Sonar-Bypass:",
        "--format=%h %s",
        "origin/master",
    ]);
    const runs = { total: 0, skipped: 0 };
    try {
        for (const line of readFileSync(join(sonarDir(), "gate.log"), "utf8").split("\n")) {
            const t = Date.parse(line.split(" ")[0]);
            if (!line || !(t >= since.getTime())) continue;
            runs.total++;
            if (line.includes(" skipped:")) runs.skipped++;
        }
    } catch {
        // no gate runs logged yet
    }
    return [
        `## Week ${isoWeek()}: the owner's local SonarQube server, \`${key}\``,
        "",
        `- Open issues: ${facet.paging?.total ?? facet.total} (by quality: ${fmt(facets.impactSoftwareQualities)}; by severity: ${fmt(facets.impactSeverities)})`,
        `- Security hotspots to review: ${hotspots.paging?.total ?? 0}`,
        `- Ratings: security ${rating(m.security_rating)}, reliability ${rating(m.reliability_rating)}, maintainability ${rating(m.sqale_rating)}, security review ${rating(m.security_review_rating)}`,
        `- Duplication ${m.duplicated_lines_density ?? "?"}%, coverage ${m.coverage ?? "not imported"}%`,
        `- Pre-push gate on this machine: ${runs.total} runs, ${runs.skipped} skipped`,
        `- New on master this week: ${fresh.paging?.total ?? 0} issues${(fresh.issues ?? []).length ? "" : ""}`,
        ...(fresh.issues ?? [])
            .slice(0, 50)
            .map((i) => `  - \`${i.component.replace(`${key}:`, "")}:${i.line ?? ""}\` ${i.rule} ${i.message}`),
        `- New \`NOSONAR\` comments: ${nosonar}; new multicriteria entries: ${multicriteria}`,
        `- \`Sonar-Bypass\` trailers: ${bypasses ? bypasses.split("\n").length : 0}`,
        ...(bypasses ? bypasses.split("\n").map((l) => `  - ${l}`) : []),
    ].join("\n");
}

async function postWeekly(api, key) {
    const stamp = join(sonarDir(), "weekly");
    const week = isoWeek();
    if (existsSync(stamp) && readFileSync(stamp, "utf8").trim() === week) return;
    let issue;
    try {
        const found = JSON.parse(
            execFileSync(
                "gh",
                [
                    "issue",
                    "list",
                    "--state",
                    "open",
                    "--search",
                    "SonarQube burn-down in:title",
                    "--json",
                    "number,title",
                ],
                { cwd: ROOT, encoding: "utf8", env: envWithoutToken() },
            ),
        );
        issue = found.find((i) => i.title === "SonarQube burn-down");
    } catch (e) {
        log(`gh issue list failed: ${e.message.split("\n")[0]}`);
        return;
    }
    if (!issue) {
        log('no open "SonarQube burn-down" issue; weekly comment skipped');
        return;
    }
    const body = await weeklyReport(api, key);
    if (sh("gh", ["issue", "comment", String(issue.number), "--body", body], ROOT)) {
        writeFileSync(stamp, `${week}\n`);
        log(`weekly numbers posted on #${issue.number}`);
    }
}

async function pass(cfg) {
    if (!(await serverStatus(cfg.host))) {
        log("server unreachable; next poll");
        return;
    }
    const api = client(cfg.host, cfg.token);
    const key = cfg.projectKey;
    if (!sh("git", ["fetch", "--quiet", "origin", "master"], ROOT)) return log("git fetch failed; next poll");
    const sha = git(["rev-parse", "origin/master"]);
    const last = (await api.call("api/project_analyses/search", { project: key, ps: 1 })).analyses?.[0];
    if (last?.revision === sha) {
        log(`${key} already has ${sha.slice(0, 9)}`);
        await postWeekly(api, key);
        return;
    }

    const worktree = join(dirname(commonDir()), ".worktrees", "sonar-baseline");
    if (!existsSync(worktree)) {
        if (!sh("git", ["worktree", "add", "--detach", worktree, sha], ROOT)) return log("worktree add failed");
    } else if (!sh("git", ["checkout", "--quiet", "--detach", "--force", sha], worktree)) {
        return log("worktree checkout failed");
    }

    const committed = Number(git(["show", "-s", "--format=%ct", sha])) * 1000;
    const run = ciRun(sha);
    if (run === "pending" && Date.now() - committed < COVERAGE_WAIT_MS) {
        log(`CI has not finished for ${sha.slice(0, 9)}; next poll`);
        return;
    }

    if (!sh("pnpm", ["install", "--frozen-lockfile"], worktree)) return log("pnpm install failed");
    if (!sh("pnpm", ["exec", "nx", "run-many", "-t", "build", "--parallel=3"], worktree)) return log("build failed");
    sh("npm", ["run", "build:bundle"], join(worktree, "webgpu-graph-algorithms"));

    const withCoverage = typeof run === "object" && mergeCoverage(run, worktree);
    if (!withCoverage) {
        rmSync(join(worktree, "coverage/lcov.info"), { force: true });
        log(`scanning ${sha.slice(0, 9)} WITHOUT coverage (CI run: ${typeof run === "object" ? "merge failed" : run})`);
    }

    const hashStamp = join(sonarDir(), "profile-hash");
    const profileFile = join(worktree, "tools/sonar/graphty-way.xml");
    if (
        existsSync(profileFile) &&
        (!existsSync(hashStamp) || readFileSync(hashStamp, "utf8") !== hashFile(profileFile))
    ) {
        try {
            await restoreProfile(api, [key, `${key}-local`], profileFile);
            log("profile restored");
        } catch (e) {
            log(`profile restore failed (the scan token may not administer profiles): ${e.message}`);
        }
    }

    const release = await acquireLock(join(sonarDir(), "sonar-local.lock"), 0);
    if (!release) return log("a push holds the scan lock; next poll");
    try {
        const version = JSON.parse(readFileSync(join(worktree, "package.json"), "utf8")).version;
        const { child, done } = startScanner(
            worktree,
            [
                `-Dsonar.projectKey=${key}`,
                `-Dsonar.host.url=${cfg.host}`,
                `-Dsonar.projectVersion=${version}`,
                `-Dsonar.scm.revision=${sha}`,
                `-Dsonar.working.directory=${join(sonarDir(), "baseline")}`,
            ],
            { token: cfg.token, env: { ...process.env, ...javaEnv(cfg) }, onOutput: (s) => process.stdout.write(s) },
        );
        const timer = setTimeout(() => child.kill("SIGTERM"), SCAN_TIMEOUT_MS);
        const { code } = await done;
        clearTimeout(timer);
        log(code === 0 ? `scanned ${sha.slice(0, 9)} into ${key}` : `scan of ${sha.slice(0, 9)} failed (exit ${code})`);
    } finally {
        release();
    }
    await postWeekly(api, key);
}

const javaEnv = (cfg) => (cfg.java ? { SONAR_SCANNER_JAVA_EXE_PATH: cfg.java } : {});

async function main() {
    const mode = process.argv[2];
    const cfg = loadConfig(ROOT);
    const missing = ["host", "projectKey", "token"].filter((k) => !cfg[k]);
    if (missing.length) {
        console.error(`missing ${missing.join(", ")}: set SONAR_HOST_URL, SONAR_PROJECT_KEY and SONAR_TOKEN in .env`);
        process.exit(1);
    }
    if (mode === "--setup") return setup(cfg);
    if (mode === "--once") return pass(cfg);
    if (mode === "--watch") {
        for (;;) {
            try {
                await pass(loadConfig(ROOT));
            } catch (e) {
                log(`pass failed: ${e.message}`);
            }
            await new Promise((r) => setTimeout(r, POLL_MS));
        }
    }
    console.error("usage: node tools/sonar-baseline.mjs --setup | --once | --watch");
    process.exit(2);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch((e) => {
        console.error(e.message);
        process.exit(1);
    });
}
