#!/usr/bin/env node
// The pre-push SonarQube step: blocks a push when SonarQube finds a NEW issue or security hotspot
// on a line the push adds or changes. Run by tools/prepush.sh ("SonarQube (changed lines)").
// Design: design/sonarqube/design.md, section 1.
//
// 1. The changed files: `git diff -M --name-status --diff-filter=AMR <merge-base> HEAD`, kept to the
//    extensions SonarQube analyzes. A file with uncommitted changes is left out with a warning (the
//    scanner reads the working tree; the push sends HEAD). Nothing left: pass, no server contact.
// 2. The server and the setup. Unreachable, or not the pinned server: pass with a boxed warning and
//    send no token. Anything else wrong (no token, rejected token, no Java, no scanner, no
//    `<key>-local` project): block, with the fix.
// 3. Scan only those files into `<key>-local` (scratch; never `<key>`, which a partial scan would
//    empty), wait for the server to process it, read its open issues and hotspots.
// 4. A finding on a changed line (`git diff -M -U0 <merge-base> HEAD`) blocks, unless master's
//    analysis in `<key>` already has it: an issue with the same rule and line hash in the same file
//    (following renames); for S3776 and S107 the same rule in the same hunk with a score that did
//    not rise; a hotspot with the same rule and line hash that is to review or reviewed SAFE.
//    An issue on an UNCHANGED line whose rule and message master lacks for that file is a warning.
// 5. `// NOSONAR(<rule>): <reason of 10+ chars>` is the only accepted NOSONAR form on a changed line,
//    and it may not name a vulnerability rule. A `Sonar-Bypass: <reason>` trailer on HEAD passes a
//    push with findings, except vulnerabilities and hotspots.
//
// One deadline for the whole step (900 s, SONAR_GATE_DEADLINE): past it, the step stops the scanner
// and passes with the boxed warning. One scan per machine at a time (flock on
// <git common dir>/sonar/sonar-local.lock). Every run appends a line to <git common dir>/sonar/gate.log.
//
// Exit 0: passed, skipped or bypassed. Exit 1: blocked. Never prints the token.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { accessSync, appendFileSync, constants, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { basename, delimiter, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
    ApiError,
    acquireLock,
    client,
    envWithoutToken,
    loadConfig,
    serverStatus,
    startScanner,
    stopScanner,
} from "./sonar/api.mjs";

const TOOLS_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".html", ".css", ".py"]);
const REPO_OF = { ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".mjs": "javascript" };
const SCORE_RULES = /:(S3776|S107)$/;
const NOSONAR_FORM = /NOSONAR\((S\d+)\): .{10,}/;
const SETUP_FIX = "run `node tools/sonar-baseline.mjs --setup` once (the owner, with the admin token)";
const TOKEN_FIX = "put a valid SonarQube user token in .env as SONAR_TOKEN (My Account > Security > Generate token)";
const RED = "\x1b[0;31m";
const YELLOW = "\x1b[1;33m";
const NC = "\x1b[0m";

// ---------------------------------------------------------------------------------------------
// Pure helpers (exported for the tests)
// ---------------------------------------------------------------------------------------------

/**
 * SonarQube's line hash: MD5 of the line with all whitespace removed (matching lines, not security).
 * @param line - One line of source, without its newline.
 * @returns The hash as lowercase hex, as the issues API reports it.
 */
export function lineHash(line) {
    const md5 = createHash("md5"); // NOSONAR(S4790): SonarQube's own line-hash formula, not a security use
    return md5.update(line.replaceAll(/\s/g, "")).digest("hex");
}

// `git diff --name-status -M` output -> [{ path, oldPath }].
function parseNameStatus(text) {
    return text
        .split("\n")
        .filter(Boolean)
        .map((line) => {
            const [status, first, second] = line.split("\t");
            return status.startsWith("R") ? { path: second, oldPath: first } : { path: first, oldPath: first };
        });
}

const hunkOf = (m) => ({
    oldStart: Number(m[1]),
    oldCount: m[2] === undefined ? 1 : Number(m[2]),
    newStart: Number(m[3]),
    newCount: m[4] === undefined ? 1 : Number(m[4]),
});

/**
 * Parse `git diff -M -U0` output.
 * @param text - The diff.
 * @returns Map from each file's new path to its hunks, `{ oldStart, oldCount, newStart, newCount }`;
 *   a pure rename maps to [].
 */
export function parseHunks(text) {
    const files = new Map();
    let current = null;
    for (const line of text.split("\n")) {
        const target = line.match(/^(?:\+\+\+ b\/|rename to )(.+)$/)?.[1];
        const hunk = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (target) {
            current = target;
            if (!files.has(current)) files.set(current, []);
        } else if (line.startsWith("+++ /dev/null")) {
            current = null;
        } else if (hunk && current) {
            files.get(current).push(hunkOf(hunk));
        }
    }
    return files;
}

// Is new-side `line` added or changed by one of `hunks`?
const onChangedLine = (hunks, line) =>
    hunks.some((h) => h.newCount > 0 && line >= h.newStart && line < h.newStart + h.newCount);

/**
 * Where an old-side line sits on the new side. A pure insertion (`-a,0`) sits after old line a.
 * @param hunks - The file's hunks, from parseHunks.
 * @param line - A line number on the old side.
 * @returns `{ hunk }` when a hunk replaced the line, else `{ line }` shifted by the hunks above it.
 */
export function mapOldLine(hunks, line) {
    let shift = 0;
    for (const h of hunks) {
        if (h.oldCount > 0 && line >= h.oldStart && line < h.oldStart + h.oldCount) return { hunk: h };
        const above = h.oldCount > 0 ? h.oldStart <= line : h.oldStart < line;
        if (above) shift += h.newCount - h.oldCount;
    }
    return { line: line + shift };
}

const GLOB_TOKENS = { "**/": "(?:.*/)?", "**": ".*", "*": "[^/]*", "?": "[^/]" };

/**
 * Translate the glob syntax of sonar-project.properties (`**`, `*`, `?`).
 * @param glob - One pattern, such as `src/*.test.ts`.
 * @returns A RegExp over repository-relative paths.
 */
export function globToRegExp(glob) {
    const body = glob
        .split(/(\*\*\/|\*\*|\*|\?)/)
        .map((tok) => GLOB_TOKENS[tok] ?? tok.replaceAll(/[.+^${}()|[\]\\]/g, String.raw`\$&`))
        .join("");
    return new RegExp(`^${body}$`);
}

// One `key=value` from properties text (ours uses no continuation lines).
function readProperty(text, key) {
    const line = text.split("\n").find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim() : "";
}

// The first number in an S3776 / S107 message: the complexity score, or the parameter count.
const scoreOf = (message) => Number(message.match(/\d+/)?.[0] ?? Number.NaN);

const isVulnerability = (issue) =>
    issue.type === "VULNERABILITY" || (issue.impacts ?? []).some((i) => i.softwareQuality === "SECURITY");

const COMMENT_MARKER = /(?:\/\/|\/\*|#|<!--)\s*NOSONAR/;
const balanced = (s) => ['"', "'", "`"].every((q) => s.split(q).length % 2 === 1);

/**
 * Find a NOSONAR comment: a comment marker (`//`, `/*`, `#`, `<!--`) directly before NOSONAR, with
 * the quotes before it balanced, so a NOSONAR inside a string or a code span is not mistaken for one.
 * @param text - One line of source.
 * @returns The comment text from its marker on, or null.
 */
export function nosonarComment(text) {
    const m = COMMENT_MARKER.exec(text);
    return m && balanced(text.slice(0, m.index)) ? text.slice(m.index) : null;
}

// NOSONAR comments on changed lines: the malformed ones (blocking) and the rule each good one names.
function checkNosonar(files) {
    const malformed = [];
    const named = new Map(); // `${path}:${line}` -> "S1234"
    for (const [path, f] of files) {
        f.lines.forEach((text, i) => {
            const line = i + 1;
            const comment = nosonarComment(text);
            if (!comment || !onChangedLine(f.hunks, line)) return;
            const rule = comment.match(NOSONAR_FORM)?.[1];
            if (rule) named.set(`${path}:${line}`, rule);
            else {
                const message = "write it as // NOSONAR(<rule>): <reason of 10+ characters>";
                malformed.push({ path, line, rule: "NOSONAR", message, kind: "nosonar" });
            }
        });
    }
    return { malformed, named };
}

// Does master already have this changed-line issue?
function masterHasIssue(issue, f, masterIssues) {
    if (!SCORE_RULES.test(issue.rule)) {
        return masterIssues.some((m) => m.rule === issue.rule && m.hash && m.hash === issue.hash);
    }
    // S3776 / S107 are reported on the signature, which the edit usually changes: match by place,
    // and let it through only when the score did not rise.
    const prior = masterIssues.find((m) => {
        if (m.rule !== issue.rule || !m.line) return false;
        const where = mapOldLine(f.hunks, m.line);
        return where.hunk ? onChangedLine([where.hunk], issue.line) : where.line === issue.line;
    });
    return Boolean(prior) && scoreOf(issue.message) <= scoreOf(prior.message);
}

// Does master already have this changed-line hotspot, to review or reviewed SAFE?
function masterHasHotspot(h, f, master) {
    const hash = lineHash(f.lines[h.line - 1] ?? "");
    return master.hotspotsByFile(f.oldPath).some((m) => {
        const open = m.status === "TO_REVIEW" || (m.status === "REVIEWED" && m.resolution === "SAFE");
        if (!open || m.ruleKey !== h.ruleKey || !m.line) return false;
        const text = master.lineAt(f.oldPath, m.line);
        return text !== null && lineHash(text) === hash;
    });
}

/**
 * The verdict. Inputs are plain data, so the tests drive it without a server.
 * @param input - What the step gathered.
 * @param input.local - `{ issues, hotspots }` of <key>-local, each with a repository-relative `path`.
 * @param input.master - `issuesByFile(oldPath)` and `hotspotsByFile(oldPath)` (arrays) and
 *   `lineAt(oldPath, line)` (master's text of that line, or null), from <key>.
 * @param input.files - Map from each scanned path to `{ oldPath, hunks, lines }` (HEAD's lines).
 * @returns `{ blocking, existing, warnings, named }`: findings as `{ path, line, rule, message, kind }`,
 *   and the rule each well-formed NOSONAR names, by `path:line`.
 */
export function decide({ local, master, files }) {
    const { malformed, named } = checkNosonar(files);
    const blocking = [...malformed];
    const existing = [];
    const warnings = [];
    for (const issue of local.issues) {
        const f = files.get(issue.path);
        if (f && issue.line) judgeIssue(issue, f, master.issuesByFile(f.oldPath), { blocking, existing, warnings });
    }
    for (const h of local.hotspots) {
        const f = files.get(h.path);
        if (!f || !h.line || !onChangedLine(f.hunks, h.line)) continue;
        if (named.get(`${h.path}:${h.line}`) === h.ruleKey.split(":")[1]) continue;
        const entry = { path: h.path, line: h.line, rule: h.ruleKey, message: h.message, kind: "hotspot" };
        (masterHasHotspot(h, f, master) ? existing : blocking).push(entry);
    }
    return { blocking, existing, warnings, named };
}

// Sort one issue into blocking, existing (on a changed line, master has it) or warnings.
function judgeIssue(issue, f, masterIssues, out) {
    const kind = isVulnerability(issue) ? "vulnerability" : "issue";
    const entry = { path: issue.path, line: issue.line, rule: issue.rule, message: issue.message, kind };
    if (onChangedLine(f.hunks, issue.line)) {
        (masterHasIssue(issue, f, masterIssues) ? out.existing : out.blocking).push(entry);
    } else if (!masterIssues.some((m) => m.rule === issue.rule && m.message === issue.message)) {
        out.warnings.push(entry);
    }
}

// ---------------------------------------------------------------------------------------------
// The step
// ---------------------------------------------------------------------------------------------

// How a run ends: thrown by any phase, caught once in main.
class Outcome extends Error {
    constructor(outcome, code, lines) {
        super(outcome);
        this.outcome = outcome;
        this.code = code;
        this.lines = lines;
    }
}
const skip = (reason, why) =>
    new Outcome(`skipped:${reason}`, 0, [why, "The next push from the owner's network checks the whole branch."]);

const git = (args) => execFileSync("git", args, { encoding: "utf8", env: envWithoutToken(), maxBuffer: 256 << 20 });

function isExecutable(p) {
    try {
        accessSync(p, constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

const findOnPath = (cmd) =>
    (process.env.PATH ?? "")
        .split(delimiter)
        .map((dir) => join(dir, cmd))
        .find((p) => p !== cmd && isExecutable(p)) ?? null;

// Printed width: the color codes take no columns, so they must not count toward the padding.
const visibleLength = (l) => [RED, YELLOW, NC].reduce((t, c) => t.replaceAll(c, ""), l).length;

function box(lines) {
    const width = Math.max(...lines.map(visibleLength)) + 4;
    const bar = `+${"-".repeat(width - 2)}+`;
    console.log(YELLOW + bar);
    for (const l of lines)
        console.log(`${YELLOW}| ${NC}${l}${" ".repeat(width - 4 - visibleLength(l))}${YELLOW} |${NC}`);
    console.log(bar + NC);
}

// Phase 1: the analyzable files the push changes, minus those with uncommitted changes.
function changedFiles(run) {
    run.base = git(["merge-base", "origin/master", "HEAD"]).trim();
    const changed = parseNameStatus(git(["diff", "-M", "--name-status", "--diff-filter=AMR", run.base, "HEAD"]));
    const analyzable = changed.filter((c) => EXTENSIONS.has(extname(c.path)));
    const dirty = new Set(git(["diff", "--name-only", "HEAD"]).split("\n").filter(Boolean));
    run.leftOut = analyzable.filter((c) => dirty.has(c.path)).map((c) => c.path);
    for (const p of run.leftOut) {
        console.log(`${YELLOW}not checked: ${p} has uncommitted changes; the next push checks it${NC}`);
    }
    return analyzable.filter((c) => !dirty.has(c.path));
}

// The server answers and is the one `--setup` pinned; otherwise a skip (no token is sent).
async function checkServer(run, cfg) {
    if (!cfg.host) throw skip("no-host", "SONAR_HOST_URL is not set (environment or .env).");
    const status = await serverStatus(cfg.host, 3000);
    if (!status) throw skip("unreachable", "The SonarQube server did not answer within 3 s.");
    const pinFile = join(run.sonarDir, "server-id");
    if (!existsSync(pinFile)) throw run.blockSetup("no pinned server id", SETUP_FIX);
    if (readFileSync(pinFile, "utf8").trim() !== status.id) {
        throw skip("not-pinned-server", "Something answered at SONAR_HOST_URL, but it is not the owner's server.");
    }
}

// Phase 2: everything the scan needs, or an Outcome. Sends the token only to the pinned server.
async function checkSetup(run) {
    const cfg = loadConfig(run.top);
    await checkServer(run, cfg);
    if (!cfg.token)
        throw run.blockSetup("no SONAR_TOKEN", "put SONAR_TOKEN=<your SonarQube token> in the repository's .env");
    if (!cfg.projectKey) throw run.blockSetup("no SONAR_PROJECT_KEY", "put SONAR_PROJECT_KEY=graphty-monorepo in .env");

    const api = client(cfg.host, cfg.token);
    const me = await api.call("api/users/current").catch((e) => ({ error: e }));
    if (me.error || !me.isLoggedIn) {
        const why = me.error instanceof ApiError ? `HTTP ${me.error.status}` : (me.error?.message ?? "not logged in");
        throw run.blockSetup(`the token was rejected (${why})`, TOKEN_FIX);
    }
    const java = cfg.java || findOnPath("java");
    if (!java || !isExecutable(java)) {
        throw run.blockSetup(
            "no Java",
            "set SONAR_SCANNER_JAVA_EXE_PATH (.env or the environment) to a Java 17+ `java`",
        );
    }
    const scanner = process.env.SONAR_GATE_SCANNER || join(TOOLS_ROOT, "node_modules/.bin/sonar-scanner-npm");
    if (!isExecutable(scanner)) throw run.blockSetup("the scanner is not installed", "run `pnpm install`");
    const localKey = `${cfg.projectKey}-local`;
    try {
        await api.call("api/components/show", { component: localKey });
    } catch (e) {
        const missing = e instanceof ApiError && e.status === 404;
        throw run.blockSetup(
            missing ? `project ${localKey} is missing` : `api/components/show: ${e.message}`,
            SETUP_FIX,
        );
    }
    return { cfg, api, java, localKey };
}

// Phase 3: scan the files into <key>-local and read back its open issues and hotspots.
async function scan(run, setup, scanList) {
    const { cfg, api, java, localKey } = setup;
    const props = readFileSync(join(run.top, "sonar-project.properties"), "utf8");
    const testGlobs = readProperty(props, "sonar.test.inclusions").split(",").filter(Boolean).map(globToRegExp);
    const isTest = (p) => testGlobs.some((re) => re.test(p));
    const sources = scanList.filter((c) => !isTest(c.path)).map((c) => c.path);
    const tests = scanList.filter((c) => isTest(c.path)).map((c) => c.path);
    const workDir = join(run.sonarDir, basename(run.top));
    rmSync(workDir, { recursive: true, force: true });

    console.log(`SonarQube: scanning ${scanList.length} changed file(s) into ${localKey}...`);
    let output = "";
    const scanner = startScanner(
        run.top,
        [
            `-Dsonar.projectKey=${localKey}`,
            `-Dsonar.host.url=${cfg.host}`,
            `-Dsonar.inclusions=${sources.join(",") || "nothing-to-scan/**"}`,
            `-Dsonar.test.inclusions=${tests.join(",") || "nothing-to-scan/**"}`,
            `-Dsonar.working.directory=${workDir}`,
            "-Dsonar.javascript.lcov.reportPaths=",
            "-Dsonar.qualitygate.wait=false",
            `-Dsonar.scm.revision=${run.head}`,
        ],
        {
            token: cfg.token,
            env: { ...process.env, SONAR_SCANNER_JAVA_EXE_PATH: java },
            onOutput: (s) => (output += s),
        },
    );
    run.scanner = scanner.child;
    const { code, error } = await scanner.done;
    run.scanner = null;
    if (code !== 0) {
        console.log(output.trim().split("\n").slice(-20).join("\n"));
        const detail = error ? `, ${error.message}` : "";
        throw run.blockSetup(`the scanner failed (exit ${code}${detail})`, "read the scanner output above");
    }

    const taskId = readProperty(readFileSync(join(workDir, "report-task.txt"), "utf8"), "ceTaskId");
    let task = (await api.call("api/ce/task", { id: taskId })).task;
    while (task.status === "PENDING" || task.status === "IN_PROGRESS") {
        await new Promise((r) => setTimeout(r, 1000));
        task = (await api.call("api/ce/task", { id: taskId })).task;
    }
    if (task.status !== "SUCCESS") {
        const why = `the server could not process the scan (${task.status}: ${task.errorMessage ?? ""})`;
        throw run.blockSetup(why, "see the project's background tasks on the server");
    }

    const withPath = (x) => ({ ...x, path: x.component.slice(x.component.indexOf(":") + 1) });
    const query = { components: localKey, issueStatuses: "OPEN,CONFIRMED" };
    const issues = (await api.all("api/issues/search", query, "issues")).map(withPath);
    const hotspots = (await api.all("api/hotspots/search", { project: localKey, status: "TO_REVIEW" }, "hotspots")).map(
        withPath,
    );
    return { issues, hotspots };
}

// Phase 4: master's findings for the files that have any, from <key>.
async function masterFindings(api, mainKey, oldPaths) {
    const revision = await api
        .call("api/project_analyses/search", { project: mainKey, ps: 1 })
        .then((r) => r.analyses?.[0]?.revision ?? null)
        .catch(() => null);
    const issues = new Map();
    const hotspots = new Map();
    const none = () => [];
    for (const old of oldPaths) {
        const issueQuery = { components: `${mainKey}:${old}`, issueStatuses: "OPEN,CONFIRMED" };
        issues.set(old, await api.all("api/issues/search", issueQuery, "issues").catch(none));
        const toReview = { project: mainKey, files: old, status: "TO_REVIEW" };
        const safe = { project: mainKey, files: old, status: "REVIEWED", resolution: "SAFE" };
        hotspots.set(old, [
            ...(await api.all("api/hotspots/search", toReview, "hotspots").catch(none)),
            ...(await api.all("api/hotspots/search", safe, "hotspots").catch(none)),
        ]);
    }
    const text = new Map();
    const lineAt = (old, line) => {
        if (!revision) return null;
        if (!text.has(old)) {
            try {
                text.set(old, git(["show", `${revision}:${old}`]).split("\n"));
            } catch {
                text.set(old, null);
            }
        }
        return text.get(old)?.[line - 1] ?? null;
    };
    return {
        issuesByFile: (p) => issues.get(p) ?? [],
        hotspotsByFile: (p) => hotspots.get(p) ?? [],
        lineAt,
    };
}

// A NOSONAR naming a vulnerability rule hides whatever else is on its line: it blocks.
async function vulnerabilityNosonar(api, named) {
    const found = [];
    for (const [where, rule] of named) {
        const cut = where.lastIndexOf(":");
        const path = where.slice(0, cut);
        const repo = REPO_OF[extname(path)];
        if (!repo) continue;
        const r = await api
            .call("api/rules/show", { key: `${repo}:${rule}` })
            .then((x) => x.rule)
            .catch(() => null);
        if (r?.type === "VULNERABILITY") {
            const message = "NOSONAR may not name a vulnerability rule; use a path entry in sonar-project.properties";
            found.push({ path, line: Number(where.slice(cut + 1)), rule, message, kind: "nosonar" });
        }
    }
    return found;
}

function verdictOutcome(verdict, host, bypass) {
    const fmt = (f) =>
        `  ${f.path}:${f.line}  ${f.rule}  ${f.kind === "hotspot" ? "[security hotspot]  " : ""}${f.message}`;
    const lines = [];
    if (verdict.existing.length) {
        lines.push(
            "Existing issues on lines you touched (not blocking; master has them):",
            ...verdict.existing.map(fmt),
            "",
        );
    }
    if (verdict.warnings.length) {
        const head = `${YELLOW}Possibly introduced by this push (warning; on lines it did not change):${NC}`;
        lines.push(head, ...verdict.warnings.map(fmt), "");
    }
    if (!verdict.blocking.length) {
        lines.push("SonarQube: no new issue or hotspot on the changed lines.");
        return new Outcome("passed", 0, lines);
    }
    lines.push(`${RED}SonarQube: new findings on lines this push adds or changes:${NC}`);
    for (const f of verdict.blocking) {
        lines.push(fmt(f));
        if (f.kind !== "nosonar") lines.push(`      ${host}/coding_rules?open=${f.rule}&rule_key=${f.rule}`);
    }
    lines.push(
        "",
        "Fix each one. For a false positive: `// NOSONAR(<rule>): <reason>` on the line, or a reasoned",
        "sonar.issue.ignore.multicriteria entry in sonar-project.properties. Emergencies only: a",
        "`Sonar-Bypass: <reason>` trailer on the HEAD commit (never covers vulnerabilities or hotspots).",
    );
    const hard = verdict.blocking.some((f) => f.kind === "vulnerability" || f.kind === "hotspot");
    if (bypass && !hard) return new Outcome("bypassed", 0, [...lines, `Sonar-Bypass: ${bypass}`]);
    if (bypass) lines.push(`${RED}Sonar-Bypass does not cover vulnerabilities or security hotspots.${NC}`);
    return new Outcome("blocked", 1, lines);
}

async function check(run) {
    const scanList = changedFiles(run);
    if (scanList.length === 0) {
        return new Outcome("passed", 0, ["No analyzable file changed; nothing for SonarQube to check."]);
    }
    run.bypass = git(["log", "-1", "--format=%(trailers:key=Sonar-Bypass,valueonly,separator=%x20)", "HEAD"]).trim();
    const setup = await checkSetup(run);

    const release = await acquireLock(join(run.sonarDir, "sonar-local.lock"), run.left() / 1000);
    if (!release) throw skip("deadline", "Another scan held the lock until the deadline.");
    let local;
    try {
        local = await scan(run, setup, scanList);
    } finally {
        release();
    }

    const paths = scanList.flatMap((c) => [c.path, c.oldPath]);
    const hunks = parseHunks(git(["diff", "-M", "-U0", run.base, "HEAD", "--", ...new Set(paths)]));
    const files = new Map(
        scanList.map((c) => [
            c.path,
            { oldPath: c.oldPath, hunks: hunks.get(c.path) ?? [], lines: git(["show", `HEAD:${c.path}`]).split("\n") },
        ]),
    );
    const withFindings = new Set([...local.issues, ...local.hotspots].map((x) => files.get(x.path)?.oldPath));
    withFindings.delete(undefined);
    const master = await masterFindings(setup.api, setup.cfg.projectKey, withFindings);
    const verdict = decide({ local, master, files });
    verdict.blocking.push(...(await vulnerabilityNosonar(setup.api, verdict.named)));
    return verdictOutcome(verdict, setup.cfg.host, run.bypass);
}

async function main() {
    const started = Date.now();
    const deadlineMs = Number(process.env.SONAR_GATE_DEADLINE ?? 900) * 1000;
    const top = git(["rev-parse", "--show-toplevel"]).trim();
    const sonarDir = join(git(["rev-parse", "--path-format=absolute", "--git-common-dir"]).trim(), "sonar");
    mkdirSync(sonarDir, { recursive: true });
    let branch = "(detached)";
    try {
        branch = git(["symbolic-ref", "--short", "-q", "HEAD"]).trim();
    } catch {
        // detached HEAD
    }
    const run = {
        top,
        sonarDir,
        head: git(["rev-parse", "HEAD"]).trim(),
        leftOut: [],
        bypass: "",
        scanner: null,
        left: () => deadlineMs - (Date.now() - started),
        blockSetup(why, fix) {
            if (this.bypass)
                return new Outcome("bypassed", 0, [`The scan could not run: ${why}`, `Sonar-Bypass: ${this.bypass}`]);
            return new Outcome("blocked", 1, [`${RED}SonarQube step cannot run: ${why}${NC}`, `Fix: ${fix}`]);
        },
    };

    const finish = (o) => {
        if (o.outcome.startsWith("skipped")) box(["SonarQube did NOT check this push", ...o.lines]);
        else if (o.outcome === "bypassed") box(["SonarQube: passed by the Sonar-Bypass trailer on HEAD", ...o.lines]);
        else for (const l of o.lines) console.log(l);
        const entry = [
            new Date().toISOString(),
            branch,
            run.head.slice(0, 12),
            o.outcome,
            `left-out:${run.leftOut.length}`,
        ];
        appendFileSync(join(sonarDir, "gate.log"), `${entry.join(" ")}\n`);
        return o.code;
    };

    // The deadline covers the lock wait, the scan, the server's queue and the reads.
    const timer = setTimeout(() => {
        if (run.scanner) stopScanner(run.scanner);
        process.exit(
            finish(skip("deadline", `The ${deadlineMs / 1000} s deadline passed (is the server's queue busy?).`)),
        );
    }, run.left());
    let outcome;
    try {
        outcome = await check(run);
    } catch (e) {
        outcome =
            e instanceof Outcome ? e : new Outcome("blocked", 1, [`${RED}SonarQube step failed: ${e.message}${NC}`]);
    }
    clearTimeout(timer);
    return finish(outcome);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    process.exitCode = await main();
}
