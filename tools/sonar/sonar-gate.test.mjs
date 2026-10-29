// Tests of the pre-push SonarQube step's decisions, runnable without a SonarQube server: each case
// builds a throwaway git repository, a fake server (node:http) and a fake scanner, runs
// tools/sonar-gate.mjs against them, and checks the exit code, the output and the run log.
//
//   node --test tools/sonar/
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isolatedGitEnv } from "../isolated-git-env.mjs";
import { ApiError } from "./api.mjs";
import {
    decide,
    globToRegExp,
    isNetworkError,
    lineHash,
    mapOldLine,
    mapOldLineExact,
    nosonarComment,
    parseHunks,
    scannedBase,
    scannedCommits,
    scannerFailure,
    scoredSpan,
    spanText,
} from "../sonar-gate.mjs";

const GATE = join(dirname(fileURLToPath(import.meta.url)), "..", "sonar-gate.mjs");
const TOKEN = "squ_fake_token_0123456789abcdef";
const SERVER_ID = "FAKE-SERVER-ID";
const scratch = mkdtempSync(join(tmpdir(), "sonar-gate-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

// A fixture repository's git: no global or system config, so no signing and no hooks of the owner's,
// and none of the GIT_* variables a hook exports (they would point git at the real repository).
const gitEnv = isolatedGitEnv();
for (const k of Object.keys(gitEnv)) if (k.startsWith("SONAR_")) delete gitEnv[k];
delete gitEnv.PUSH_REMOTE_SHA; // the pre-push hook exports it; a fixture repository sets its own
const git = (cwd, ...args) => execFileSync("git", args, { cwd, env: gitEnv, encoding: "utf8" }).trim();

const BASE = ["export function a() {", "    return 1;", "}", "export const b = 2;", ""].join("\n");

// A repository whose origin/master has src/a.ts = BASE and whose HEAD changes it to `head`.
function repo(head, { message = "change", extra = {}, base = BASE } = {}) {
    const dir = mkdtempSync(join(scratch, "repo-"));
    git(dir, "init", "-q", "-b", "master");
    writeFileSync(join(dir, "sonar-project.properties"), "sonar.test.inclusions=**/*.test.ts\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src/a.ts"), base);
    git(dir, "add", ".");
    git(dir, "commit", "-q", "-m", "base");
    git(dir, "update-ref", "refs/remotes/origin/master", "HEAD");
    git(dir, "switch", "-q", "-c", "feature");
    writeFileSync(join(dir, "src/a.ts"), head);
    for (const [p, text] of Object.entries(extra)) {
        mkdirSync(dirname(join(dir, p)), { recursive: true });
        writeFileSync(join(dir, p), text);
    }
    git(dir, "add", ".");
    git(dir, "commit", "-q", "-m", message);
    mkdirSync(join(dir, ".git/sonar"), { recursive: true });
    writeFileSync(join(dir, ".git/sonar/server-id"), `${SERVER_ID}\n`);
    return dir;
}

// A fake scanner: writes report-task.txt and records what it was given.
const scanner = join(scratch, "fake-scanner.mjs");
writeFileSync(
    scanner,
    `#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const work = process.argv.find((a) => a.startsWith("-Dsonar.working.directory=")).split("=")[1];
mkdirSync(work, { recursive: true });
const isBase = process.argv.some((a) => a.startsWith("-Dsonar.projectBaseDir="));
writeFileSync(work + "/report-task.txt", isBase ? "ceTaskId=task-base\\n" : "ceTaskId=task-1\\n");
writeFileSync(work + "/ps.txt", execFileSync("ps", ["-eo", "args"], { encoding: "utf8" }));
writeFileSync(work + "/args.json", JSON.stringify({ args: process.argv.slice(2), hasToken: Boolean(process.env.SONAR_TOKEN) }));
console.log("INFO: fake scan done");
`,
);
chmodSync(scanner, 0o755);

// A scanner that fails: prints the recorded output named by SCANNER_FIXTURE (plus, to check the
// redaction, the token it was given and a URL with credentials in it) and exits 1.
const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const failingScanner = join(scratch, "failing-scanner.mjs");
writeFileSync(
    failingScanner,
    `#!/usr/bin/env node
import { readFileSync } from "node:fs";
process.stdout.write(readFileSync(process.env.SCANNER_FIXTURE, "utf8"));
console.log("[ERROR] Bootstrapper: token " + process.env.SONAR_TOKEN + " at http://user:" + process.env.SONAR_TOKEN + "@host/");
process.exit(1);
`,
);
chmodSync(failingScanner, 0o755);

// A fake SonarQube. `local` are <key>-local's issues, `master` master's issues by file, `hotspots`
// <key>-local's hotspots. Records every request with whether it carried the token.
// `base` are <key>-local's issues after a scan of the merge base's files (the gate's second scan).
async function server({ local = [], base = [], master = {}, hotspots = [], admin = false, fail = {} } = {}) {
    const seen = [];
    let scanned = "head";
    const json = (res, code, body) => {
        res.writeHead(code, { "Content-Type": "application/json" });
        res.end(JSON.stringify(body));
    };
    const srv = createServer((req, res) => {
        const url = new URL(req.url, "http://x");
        const q = Object.fromEntries(url.searchParams);
        const authed = req.headers.authorization === `Bearer ${TOKEN}`;
        seen.push({ path: url.pathname, authed, auth: req.headers.authorization ?? "" });
        const page = (field, items) => json(res, 200, { paging: { total: items.length }, [field]: items });
        if (fail[url.pathname]) return json(res, fail[url.pathname], { errors: [{ msg: "failed" }] });
        switch (url.pathname) {
            case "/api/system/status":
                return json(res, 200, { id: SERVER_ID, status: "UP" });
            case "/api/users/current":
                if (!authed) return json(res, 401, { errors: [] });
                return json(res, 200, { isLoggedIn: true, permissions: { global: admin ? ["admin"] : ["scan"] } });
            case "/api/components/show":
            case "/api/ce/task":
                if (q.id) scanned = q.id === "task-base" ? "base" : "head";
                return json(res, 200, { task: { status: "SUCCESS" }, component: {} });
            case "/api/issues/search":
                if (q.components === "proj-local") return page("issues", scanned === "base" ? base : local);
                return page("issues", master[q.components.slice("proj:".length)] ?? []);
            case "/api/hotspots/search":
                return page("hotspots", q.project === "proj-local" ? hotspots : []);
            case "/api/project_analyses/search":
                return json(res, 200, { analyses: [] });
            default:
                return json(res, 404, {});
        }
    });
    await new Promise((r) => srv.listen(0, "127.0.0.1", r));
    after(() => srv.close());
    return {
        url: `http://127.0.0.1:${srv.address().port}`,
        seen,
        scans: () => seen.filter((x) => x.path === "/api/ce/task"),
    };
}

// Run the gate in `dir`. Resolves to { code, out, log }.
function gate(dir, env) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [GATE], {
            cwd: dir,
            env: {
                ...gitEnv,
                SONAR_PROJECT_KEY: "proj",
                SONAR_GATE_SCANNER: scanner,
                SONAR_SCANNER_JAVA_EXE_PATH: process.execPath,
                ...env,
            },
        });
        let out = "";
        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (out += d));
        child.on("close", (code) => {
            let log = "";
            try {
                log = readFileSync(join(dir, ".git/sonar/gate.log"), "utf8");
            } catch {
                // no log
            }
            resolve({ code, out, log });
        });
    });
}

const HEAD_NEW = BASE.replace("return 1;", "return 1 + 1;"); // changes line 2
const issue = (line, text, more = {}) => ({
    component: "proj-local:src/a.ts",
    line,
    rule: "typescript:S1234",
    message: "Do not do that.",
    hash: lineHash(text),
    type: "CODE_SMELL",
    impacts: [{ softwareQuality: "MAINTAINABILITY", severity: "LOW" }],
    ...more,
});

describe("sonar-gate: when it cannot check", () => {
    it("passes with the warning when the server is down, and sends no token", async () => {
        const dir = repo(HEAD_NEW);
        const r = await gate(dir, { SONAR_HOST_URL: "http://127.0.0.1:9", SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 0);
        assert.match(r.out, /SonarQube did NOT check this push/);
        assert.match(r.log, / skipped:unreachable /);
    });

    it("passes with the warning when the server is not the pinned one, and sends no token", async () => {
        const s = await server();
        const dir = repo(HEAD_NEW);
        writeFileSync(join(dir, ".git/sonar/server-id"), "SOMEONE-ELSE\n");
        const r = await gate(dir, { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 0);
        assert.match(r.log, / skipped:not-pinned-server /);
        assert.ok(
            s.seen.every((x) => !x.auth),
            "no request carried a token",
        );
    });

    it("passes without contacting the server when no analyzable file changed", async () => {
        const s = await server();
        const dir = repo(BASE, { extra: { "notes.md": "docs only\n" } });
        const r = await gate(dir, { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 0);
        assert.equal(s.seen.length, 0);
        assert.match(r.log, / passed /);
    });

    it("blocks when there is no token", async () => {
        const s = await server();
        const r = await gate(repo(HEAD_NEW), { SONAR_HOST_URL: s.url });
        assert.equal(r.code, 1);
        assert.match(r.out, /no SONAR_TOKEN/);
        assert.match(r.log, / blocked /);
    });

    it("blocks when the token is rejected", async () => {
        const s = await server();
        const r = await gate(repo(HEAD_NEW), { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: "wrong" });
        assert.equal(r.code, 1);
        assert.match(r.out, /token was rejected/);
    });

    it("accepts an administrator's token from SONAR_TOKEN", async () => {
        const s = await server({ admin: true });
        const r = await gate(repo(HEAD_NEW), { SONAR_HOST_URL: s.url, SONAR_TOKEN: TOKEN });
        assert.doesNotMatch(r.out, /administrator|no SONAR_TOKEN|token was rejected/);
    });
});

describe("sonar-gate: commits pushed past the gate", () => {
    const c = (sha, more = {}) => ({
        sha: sha.padEnd(40, "0"),
        committer: "dev@example.com",
        files: ["src/x.ts"],
        ...more,
    });

    it("reads the scanned commits from gate.log: passed, bypassed and reused, never blocked or skipped", () => {
        const log = [
            "2026-10-23T00:00:00.000Z golden aaaaaaaaaaaa passed left-out:0",
            "2026-10-23T00:00:00.000Z golden bbbbbbbbbbbb blocked left-out:0",
            "2026-10-23T00:00:00.000Z golden cccccccccccc skipped:unreachable left-out:0",
            "2026-10-23T00:00:00.000Z (detached) dddddddddddd bypassed left-out:0",
            "2026-10-23T00:00:00.000Z golden eeeeeeeeeeee reused left-out:0",
            "",
        ].join("\n");
        assert.deepEqual([...scannedCommits(log)].sort(), ["aaaaaaaaaaaa", "dddddddddddd", "eeeeeeeeeeee"]);
    });

    it("keeps a scanned base, and moves back past unscanned commits to the newest scanned one", () => {
        const scanned = new Set(["a".padEnd(12, "0")]);
        assert.deepEqual(scannedBase([c("a"), c("b")], scanned), { base: c("a").sha, missed: [] });
        const r = scannedBase([c("e"), c("d"), c("a"), c("b")], scanned);
        assert.equal(r.base, c("a").sha);
        assert.deepEqual(
            r.missed.map((x) => x.sha[0]),
            ["e", "d"],
        );
    });

    it("counts GitHub's merges and release commits and the owner's approval commits as scanned", () => {
        const none = new Set();
        assert.equal(scannedBase([c("m", { committer: "noreply@github.com" })], none).missed.length, 0);
        const bot = "41898282+github-actions[bot]@users.noreply.github.com";
        assert.equal(scannedBase([c("r", { committer: bot })], none).missed.length, 0);
        const approval = c("v", { files: ["visual-baselines/x/a.png", "visual-review-approvals/t.json"] });
        assert.equal(scannedBase([approval], none).missed.length, 0);
        assert.equal(scannedBase([c("v", { files: ["visual-baselines/a.png", "src/a.ts"] })], none).missed.length, 1);
    });

    it("says when no scanned commit is in the history it looked at", () => {
        const r = scannedBase([c("e"), c("d")], new Set());
        assert.equal(r.base, null);
        assert.equal(r.missed.length, 2);
    });

    it("scans the lines of a commit that reached origin/master with --no-verify, and names it", async () => {
        // origin/master's scanned commit, then one pushed past the gate that adds src/b.ts with an issue,
        // then this push, which changes only src/a.ts. Measured from its merge base alone, b.ts would
        // never be scanned by anyone.
        const dir = repo(HEAD_NEW);
        const scannedSha = git(dir, "rev-parse", "origin/master");
        git(dir, "switch", "-q", "--detach", "origin/master");
        writeFileSync(join(dir, "src/b.ts"), "export const c = 3;\n");
        git(dir, "add", ".");
        git(dir, "commit", "-q", "-m", "pushed with --no-verify");
        const unscanned = git(dir, "rev-parse", "HEAD");
        git(dir, "update-ref", "refs/remotes/origin/master", "HEAD");
        git(dir, "switch", "-q", "feature");
        git(dir, "merge", "-q", "--no-edit", "origin/master");
        writeFileSync(
            join(dir, ".git/sonar/gate.log"),
            `2026-10-23T00:00:00.000Z master ${scannedSha.slice(0, 12)} passed left-out:0\n`,
        );
        const bIssue = issue(1, "export const c = 3;", { component: "proj-local:src/b.ts" });
        const s = await server({ local: [bIssue] });
        const r = await gate(dir, { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN, PUSH_BASE_REF: "origin/master" });
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /reached the push base without a SonarQube scan/);
        assert.match(r.out, new RegExp(`${unscanned.slice(0, 12)} pushed with --no-verify`));
        assert.match(r.out, /src\/b\.ts:1 {2}typescript:S1234/);

        // Once that commit is recorded as scanned, the push is measured from its merge base again.
        writeFileSync(
            join(dir, ".git/sonar/gate.log"),
            `2026-10-23T00:00:00.000Z master ${unscanned.slice(0, 12)} passed left-out:0\n`,
        );
        const again = await gate(dir, {
            SONAR_HOST_URL: s.url,
            SONAR_SCAN_TOKEN: TOKEN,
            PUSH_BASE_REF: "origin/master",
        });
        assert.equal(again.code, 0, again.out);
        assert.doesNotMatch(again.out, /without a SonarQube scan/);
    });
});

// Every recorded scanner failure: the gate's verdict, and a line of the cause it must print.
// bootstrap-* are the Node bootstrapper's own errors, engine-* the Java engine's. The first, and the
// two non-network engine ones, come from pre-push logs of 2026-10-03 to 2026-10-10 (the old gate kept
// only the last 20 lines); the rest were recorded on 2026-10-10 against the real server through a
// proxy that answered 503 or closed the connection on one request. Host names and home directories
// are replaced.
const SCANNER_FAILURES = [
    ["bootstrap-enotfound.txt", "skipped:server-fault", /getaddrinfo ENOTFOUND sonarqube\.example\.lan/],
    ["bootstrap-econnrefused.txt", "skipped:server-fault", /connect ECONNREFUSED 127\.0\.0\.1:9/],
    ["bootstrap-socket-hang-up.txt", "skipped:server-fault", /socket hang up/],
    ["engine-unknown-host.txt", "skipped:server-fault", /Caused by: java\.net\.UnknownHostException/],
    ["engine-http-503.txt", "skipped:server-fault", /Caused by: org\.sonarqube\.ws\.client\.HttpException: Error 503/],
    ["engine-http-503-on-submit.txt", "skipped:server-fault", /Failed to upload report: Error 503/],
    ["engine-end-of-stream.txt", "skipped:server-fault", /Caused by: java\.io\.IOException: unexpected end of stream/],
    ["engine-connection-refused-on-submit.txt", "skipped:server-fault", /Caused by: java\.net\.ConnectException/],
    ["bootstrap-http-401.txt", "blocked", /Request failed with status code 401/],
    ["engine-nosuchfile.txt", "blocked", /Caused by: java\.nio\.file\.NoSuchFileException/],
    ["engine-bridge-timeout.txt", "blocked", /Failed to start the bridge server/],
];

describe("sonar-gate: when the scanner fails", () => {
    for (const [fixture, outcome, cause] of SCANNER_FAILURES) {
        it(`${fixture}: ${outcome}, printing the cause`, async () => {
            const s = await server();
            const r = await gate(repo(HEAD_NEW), {
                SONAR_HOST_URL: s.url,
                SONAR_SCAN_TOKEN: TOKEN,
                SONAR_GATE_SCANNER: failingScanner,
                SCANNER_FIXTURE: join(FIXTURES, fixture),
            });
            assert.equal(r.code, outcome === "blocked" ? 1 : 0, r.out);
            assert.match(r.log, new RegExp(` ${outcome} `));
            assert.match(r.out, cause);
            if (outcome === "blocked") assert.match(r.out, /SonarQube step cannot run: the scanner failed \(exit 1\)/);
            else assert.match(r.out, /SonarQube did NOT check this push/);
            assert.doesNotMatch(r.out, /^\s+at /m, "no stack frames");
            assert.ok(!r.out.includes(TOKEN), "the token is not in the output");
        });
    }

    it("passes with the warning when the server fails after the scan (HTTP 503 on api/ce/task)", async () => {
        const s = await server({ fail: { "/api/ce/task": 503 } });
        const r = await gate(repo(HEAD_NEW), { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /SonarQube did NOT check this push/);
        assert.match(r.log, / skipped:server-fault /);
    });

    it("blocks when the server refuses a read (HTTP 403 on api/issues/search)", async () => {
        const s = await server({ fail: { "/api/issues/search": 403 } });
        const r = await gate(repo(HEAD_NEW), { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 1, r.out);
        assert.match(r.log, / blocked /);
    });

    it("blocks when the scratch project is missing, and passes when the server fails on that check", async () => {
        const missing = await server({ fail: { "/api/components/show": 404 } });
        const r1 = await gate(repo(HEAD_NEW), { SONAR_HOST_URL: missing.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r1.code, 1, r1.out);
        assert.match(r1.out, /project proj-local is missing/);
        const down = await server({ fail: { "/api/components/show": 502 } });
        const r2 = await gate(repo(HEAD_NEW), { SONAR_HOST_URL: down.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r2.code, 0, r2.out);
        assert.match(r2.log, / skipped:server-fault /);
    });
});

describe("sonar-gate: the verdict", () => {
    it("blocks a new issue on a changed line, and never leaks the token", async () => {
        const s = await server({ local: [issue(2, "    return 1 + 1;")] });
        const dir = repo(HEAD_NEW);
        const r = await gate(dir, { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 1);
        assert.match(r.out, /src\/a\.ts:2 {2}typescript:S1234 {2}Do not do that\./);
        assert.match(r.log, / blocked /);

        const work = join(dir, ".git/sonar", dir.split("/").pop());
        const recorded = JSON.parse(readFileSync(join(work, "args.json"), "utf8"));
        assert.ok(recorded.hasToken, "the scanner got the token in its environment");
        assert.ok(recorded.args.includes("-Dsonar.sources=src/a.ts"));
        assert.ok(
            recorded.args.every((a) => !a.includes(TOKEN)),
            "not in the scanner's arguments",
        );
        for (const f of readdirSync(work)) {
            assert.ok(!readFileSync(join(work, f), "utf8").includes(TOKEN), `not in ${f} (ps output included)`);
        }
        assert.ok(!r.out.includes(TOKEN), "not in the output");
        assert.ok(!r.log.includes(TOKEN), "not in the run log");
    });

    it("lets through issues master already has, on touched and untouched lines", async () => {
        const head = BASE.replace("return 1;", "return   1;"); // whitespace only: same line hash
        const s = await server({
            local: [issue(2, "    return   1;"), issue(4, "export const b = 2;", { rule: "typescript:S9999" })],
            master: {
                "src/a.ts": [
                    { rule: "typescript:S1234", line: 2, hash: lineHash("    return 1;"), message: "Do not do that." },
                    { rule: "typescript:S9999", line: 4, hash: "x", message: "Do not do that." },
                ],
            },
        });
        const r = await gate(repo(head), { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /Existing issues on lines you touched/);
        assert.doesNotMatch(r.out, /Possibly introduced/);
        assert.match(r.log, / passed /);
    });

    it("warns, without blocking, about a new issue on an unchanged line", async () => {
        const s = await server({ local: [issue(4, "export const b = 2;")] });
        const r = await gate(repo(HEAD_NEW), { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 0);
        assert.match(r.out, /Possibly introduced by this push/);
    });

    it("passes a code smell with a Sonar-Bypass trailer on HEAD, and logs it", async () => {
        const s = await server({ local: [issue(2, "    return 1 + 1;")] });
        const dir = repo(HEAD_NEW, { message: "change\n\nSonar-Bypass: the server mislabels this rule" });
        const r = await gate(dir, { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 0);
        assert.match(r.out, /Sonar-Bypass: the server mislabels this rule/);
        assert.match(r.log, / bypassed /);
    });

    it("still blocks a vulnerability or a hotspot under a Sonar-Bypass trailer", async () => {
        const vuln = issue(2, "    return 1 + 1;", {
            type: "VULNERABILITY",
            impacts: [{ softwareQuality: "SECURITY" }],
        });
        const hotspot = { component: "proj-local:src/a.ts", line: 2, ruleKey: "typescript:S5852", message: "regex" };
        const dir = repo(HEAD_NEW, { message: "change\n\nSonar-Bypass: in a hurry today, sorry" });
        for (const shape of [{ local: [vuln] }, { hotspots: [hotspot] }]) {
            const s = await server(shape);
            const r = await gate(dir, { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
            assert.equal(r.code, 1, r.out);
            assert.match(r.out, /does not cover vulnerabilities or security hotspots/);
        }
    });

    it("blocks a NOSONAR without a rule and a reason", async () => {
        const s = await server();
        const head = BASE.replace("return 1;", "return 1; // NOSONAR");
        const r = await gate(repo(head), { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 1);
        assert.match(r.out, /NOSONAR\(<rule>\): <reason/);
    });

    it("leaves out a file with uncommitted changes, with a warning", async () => {
        const s = await server();
        const dir = repo(HEAD_NEW);
        writeFileSync(join(dir, "src/a.ts"), `${HEAD_NEW}// edited\n`);
        const r = await gate(dir, { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 0);
        assert.match(r.out, /not checked: src\/a\.ts has uncommitted changes/);
        assert.match(r.log, /left-out:1/);
    });
});

describe("sonar-gate: helpers", () => {
    it("keeps only the scanner's error and cause lines, credentials masked", () => {
        const { cause, network } = scannerFailure(
            readFileSync(join(FIXTURES, "engine-connection-refused-on-submit.txt"), "utf8") +
                "[ERROR] see http://user:secret@host/x\n",
        );
        assert.ok(network);
        assert.equal(cause[0], "[ERROR] ScannerEngine: Error during SonarScanner Engine execution");
        assert.match(cause[1], /^java\.lang\.IllegalStateException: Failed to upload report/);
        assert.ok(cause.every((l) => !/^at /.test(l)));
        assert.ok(cause.includes("Caused by: java.net.ConnectException: Connection refused"));
        assert.equal(cause.at(-1), "[ERROR] see http://***@host/x");
        assert.deepEqual(scannerFailure("no errors here\n"), { cause: [], network: false });
    });

    it("tells a network or server fault of an API call from a refusal", () => {
        assert.ok(isNetworkError(new ApiError(503, "api/ce/task", "")));
        assert.ok(!isNetworkError(new ApiError(401, "api/users/current", "")));
        assert.ok(isNetworkError(new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } })));
        assert.ok(isNetworkError(new TypeError("fetch failed", { cause: { code: "UND_ERR_SOCKET" } })));
        assert.ok(isNetworkError(new DOMException("timed out", "TimeoutError")));
        assert.ok(!isNetworkError(new TypeError("Cannot read properties of undefined")));
    });

    it("computes SonarQube's line hash (whitespace removed)", () => {
        assert.equal(lineHash("  a = 1;"), lineHash("a=1;"));
        // Two lines of graph-io/src/formats/json/importer.ts at 5ba15bb7 and the `hash` the server's
        // issues API reported for the issues on them (2026-10-02).
        assert.equal(lineHash('    dialect?: JsonDialect | "auto" | undefined;'), "bf1b1a81ef5c7f073873f55859d87e84");
        assert.equal(lineHash("    nodeIdKey?: string | undefined;"), "b0094507ee76d5b801cdb2ef3b7d4c54");
    });

    it("parses -U0 hunks, renames included", () => {
        const diff = [
            "diff --git a/old.ts b/new.ts",
            "similarity index 90%",
            "rename from old.ts",
            "rename to new.ts",
            "--- a/old.ts",
            "+++ b/new.ts",
            "@@ -3 +3,2 @@",
            "@@ -10,0 +12 @@",
        ].join("\n");
        assert.deepEqual(parseHunks(diff).get("new.ts"), [
            { oldStart: 3, oldCount: 1, newStart: 3, newCount: 2 },
            { oldStart: 10, oldCount: 0, newStart: 12, newCount: 1 },
        ]);
    });

    it("maps an old line through the hunks above it", () => {
        const hunks = [
            { oldStart: 3, oldCount: 1, newStart: 3, newCount: 2 },
            { oldStart: 10, oldCount: 0, newStart: 12, newCount: 1 },
        ];
        assert.deepEqual(mapOldLine(hunks, 2), { line: 2 });
        assert.deepEqual(mapOldLine(hunks, 3), { hunk: hunks[0] });
        assert.deepEqual(mapOldLine(hunks, 10), { line: 11 });
        assert.deepEqual(mapOldLine(hunks, 11), { line: 13 });
    });

    it("reads the sonar-project.properties globs", () => {
        const re = globToRegExp("**/*.test.ts");
        assert.ok(re.test("a.test.ts") && re.test("x/y/a.test.ts") && !re.test("a.ts"));
        assert.ok(globToRegExp("**/test/**").test("pkg/test/a.ts"));
    });

    it("takes NOSONAR only from a comment, not from a string or a code span", () => {
        assert.ok(nosonarComment("f(); // NOSONAR(S1234): a good reason here"));
        assert.equal(nosonarComment('const s = "// NOSONAR";'), null);
        assert.equal(nosonarComment(" * `// NOSONAR(<rule>)` is the form"), null);
    });
});
// Issue #2166: an edit to a line that already carries a finding on master must not make that
// finding look new, and must not let a new one through either.
describe("sonar-gate: findings on a line edited in place", () => {
    const S1234 = "typescript:S1234";
    const S5852 = "typescript:S5852";
    const BASE_LINES = ["const a = 1;", 's = s.replace(/(a+)+$/g, "");', "const c = 3;"];
    const EDITED = ["const a = 1;", 's = s.replaceAll(/(a+)+$/g, "");', "const c = 3;"];
    const REGEX = "/(a+)+$/g";
    const ONE_LINE_EDIT = [{ oldStart: 2, oldCount: 1, newStart: 2, newCount: 1 }];
    const file = (lines = EDITED, hunks = ONE_LINE_EDIT, baseLines = BASE_LINES) =>
        new Map([["f.ts", { oldPath: "f.ts", hunks, lines, baseLines }]]);
    // The range of `code` on `line` of `lines`, as the APIs report it.
    const range = (lines, line, code = REGEX) => {
        const startOffset = lines[line - 1].indexOf(code);
        assert.ok(startOffset >= 0, `${code} on line ${line}`);
        return { startLine: line, endLine: line, startOffset, endOffset: startOffset + code.length };
    };
    const finding = (lines, line, rule, more = {}) => ({
        line,
        rule,
        message: "Do not do that.",
        hash: lineHash(lines[line - 1]),
        textRange: range(lines, line),
        type: "CODE_SMELL",
        ...more,
    });
    const local = (line, rule = S1234, more = {}, lines = EDITED) => ({
        path: "f.ts",
        ...finding(lines, line, rule, more),
    });
    const prior = (line, rule = S1234, more = {}) => finding(BASE_LINES, line, rule, more);
    const hotspot = (lines, line, more = {}) => ({
        ruleKey: S5852,
        line,
        message: "Make sure the regex used here cannot lead to denial of service.",
        textRange: range(lines, line),
        status: "TO_REVIEW",
        ...more,
    });
    const localHotspot = (line, lines = EDITED) => ({ path: "f.ts", ...hotspot(lines, line) });
    const run = ({ issues = [], hotspots = [], masterIssues = [], masterHotspots = [] }, files = file()) =>
        decide({
            local: { issues, hotspots },
            master: {
                issuesByFile: () => masterIssues,
                hotspotsByFile: () => masterHotspots,
                lineAt: (_p, line) => BASE_LINES[line - 1] ?? null,
            },
            files,
        });

    it("maps an old line through an edit in place, and not through a hunk that changed the line count", () => {
        const hunks = [
            { oldStart: 2, oldCount: 2, newStart: 2, newCount: 2 },
            { oldStart: 6, oldCount: 1, newStart: 6, newCount: 3 },
        ];
        assert.equal(mapOldLineExact(hunks, 1), 1);
        assert.equal(mapOldLineExact(hunks, 3), 3);
        assert.equal(mapOldLineExact(hunks, 6), null);
        assert.equal(mapOldLineExact(hunks, 7), 9);
    });

    it("cuts the code a finding points at out of the file", () => {
        assert.equal(spanText(BASE_LINES, range(BASE_LINES, 2)), REGEX);
        const multi = { startLine: 1, endLine: 2, startOffset: 6, endOffset: 5 };
        assert.equal(spanText(BASE_LINES, multi), "a = 1;\ns = s");
        assert.equal(spanText(BASE_LINES, { startLine: 2, endLine: 2, startOffset: 3, endOffset: 3 }), null);
        assert.equal(spanText(BASE_LINES, { startLine: 3, endLine: 4, startOffset: 0, endOffset: 1 }), null);
        assert.equal(spanText(BASE_LINES, undefined), null);
    });

    it("lets through master's hotspot, to review or reviewed SAFE, on a line edited for another reason", () => {
        for (const more of [{}, { status: "REVIEWED", resolution: "SAFE" }]) {
            const v = run({ hotspots: [localHotspot(2)], masterHotspots: [hotspot(BASE_LINES, 2, more)] });
            assert.equal(v.blocking.length, 0, JSON.stringify(v.blocking));
            assert.equal(v.existing.length, 1);
        }
    });

    it("lets through master's issue, open or marked a false positive, on a line edited for another reason", () => {
        for (const more of [{}, { issueStatus: "FALSE_POSITIVE" }]) {
            const v = run({ issues: [local(2)], masterIssues: [prior(2, S1234, more)] });
            assert.equal(v.blocking.length, 0);
            assert.equal(v.existing.length, 1);
        }
    });

    it("blocks a new finding of a different rule on that edited line", () => {
        const v = run({
            issues: [local(2, "typescript:S7781")],
            hotspots: [localHotspot(2)],
            masterHotspots: [hotspot(BASE_LINES, 2)],
        });
        assert.deepEqual(
            v.blocking.map((b) => b.rule),
            ["typescript:S7781"],
        );
        // An issue never borrows a hotspot of the same rule key, nor the other way round.
        const swapped = run({ issues: [local(2, S5852)], masterHotspots: [hotspot(BASE_LINES, 2)] });
        assert.equal(swapped.blocking.length, 1);
    });

    it("blocks an extra occurrence of the same rule on the edited line", () => {
        const v = run({ issues: [local(2), local(2)], masterIssues: [prior(2)] });
        assert.equal(v.blocking.length, 1);
        assert.equal(v.existing.length, 1);
        const h = run({ hotspots: [localHotspot(2), localHotspot(2)], masterHotspots: [hotspot(BASE_LINES, 2)] });
        assert.equal(h.blocking.length, 1);
    });

    it("blocks the same rule on the edited line when it points at different code", () => {
        // The edit replaced the regex: the old hotspot was about code that is gone.
        const lines = [EDITED[0], 's = s.replaceAll(/(b+)+c/g, "");', EDITED[2]];
        const at = { ...localHotspot(2), textRange: range(lines, 2, "/(b+)+c/g") };
        for (const more of [{}, { status: "REVIEWED", resolution: "SAFE" }]) {
            const v = run({ hotspots: [at], masterHotspots: [hotspot(BASE_LINES, 2, more)] }, file(lines));
            assert.equal(v.blocking.length, 1);
        }
    });

    it("blocks a copy of a line with master's issue while the original still has it", () => {
        // Line 2 kept; a copy of it added as line 3. The copy's issue has master's hash, but master's
        // one issue already belongs to the unchanged original.
        const lines = [BASE_LINES[0], BASE_LINES[1], BASE_LINES[1], BASE_LINES[2]];
        const files = file(lines, [{ oldStart: 2, oldCount: 0, newStart: 3, newCount: 1 }]);
        const v = run(
            { issues: [local(2, S1234, {}, lines), local(3, S1234, {}, lines)], masterIssues: [prior(2)] },
            files,
        );
        assert.deepEqual(
            v.blocking.map((b) => b.line),
            [3],
        );
    });

    it("keeps a vulnerability to the line hash", () => {
        const vuln = { type: "VULNERABILITY", impacts: [{ softwareQuality: "SECURITY" }] };
        const v = run({
            issues: [local(2, "typescript:S2076", vuln)],
            masterIssues: [prior(2, "typescript:S2076", vuln)],
        });
        assert.equal(v.blocking.length, 1);
    });

    it("does not match in place when the edit changed the line count", () => {
        const lines = [EDITED[0], EDITED[1], "// added", EDITED[2]];
        const files = file(lines, [{ oldStart: 2, oldCount: 1, newStart: 2, newCount: 2 }]);
        const v = run({ hotspots: [localHotspot(2, lines)], masterHotspots: [hotspot(BASE_LINES, 2)] }, files);
        assert.equal(v.blocking.length, 1);
    });

    it("does not match in place when master's analysis numbers the lines differently from the merge base", () => {
        const base = ["// a line master's analysis does not have", ...BASE_LINES];
        const v = run(
            { hotspots: [localHotspot(2)], masterHotspots: [hotspot(BASE_LINES, 2)] },
            file(EDITED, ONE_LINE_EDIT, base),
        );
        assert.equal(v.blocking.length, 1);
    });

    it("still lets through a moved but unchanged line by its hash", () => {
        // Old line 2 moved below line 3: the hunks remove it and add it back a line lower.
        const lines = [BASE_LINES[0], BASE_LINES[2], BASE_LINES[1]];
        const hunks = [
            { oldStart: 2, oldCount: 1, newStart: 1, newCount: 0 },
            { oldStart: 3, oldCount: 0, newStart: 3, newCount: 1 },
        ];
        const v = run(
            {
                issues: [local(3, S1234, {}, lines)],
                hotspots: [localHotspot(3, lines)],
                masterIssues: [prior(2)],
                masterHotspots: [hotspot(BASE_LINES, 2)],
            },
            file(lines, hunks),
        );
        assert.equal(v.blocking.length, 0, JSON.stringify(v.blocking));
        assert.equal(v.existing.length, 2);
    });
});

// Cognitive complexity (S3776), regex complexity (S5843) and too many parameters (S107) are reported
// on the function's name or the regex, which an edit inside the body leaves alone. The gate judges
// them by the whole span the finding covers, against a scan of the merge base's files.
describe("sonar-gate: complexity and parameter counts", () => {
    const S3776 = "typescript:S3776";
    const msg = (n) => `Refactor this function to reduce its Cognitive Complexity from ${n} to the 15 allowed.`;
    // A finding at `line` whose increments (secondary locations) run to `to`.
    const scored = (line, n, to = line + 10, rule = S3776, message = msg(n)) => ({
        path: "f.ts",
        line,
        rule,
        message,
        textRange: { startLine: line, endLine: line, startOffset: 9, endOffset: 12 },
        flows: [{ locations: [{ textRange: { startLine: to, endLine: to } }] }],
    });
    const noMaster = { issuesByFile: () => [], hotspotsByFile: () => [], lineAt: () => null };
    const run = ({ issues, base = [], hunks, lines = [] }) =>
        decide({
            local: { issues, hotspots: [] },
            master: noMaster,
            base: { issuesByFile: () => base },
            files: new Map([["f.ts", { oldPath: "f.ts", hunks, lines, baseLines: lines }]]),
        });
    // One line added at new line 8, inside a function that starts at line 5: its name line is unchanged.
    const DEEP = [{ oldStart: 7, oldCount: 0, newStart: 8, newCount: 1 }];

    it("blocks a branch added deep inside a function whose signature line did not change", () => {
        const before = { ...scored(5, 21, 14), line: 5 };
        const v = run({ issues: [scored(5, 23, 15)], base: [before], hunks: DEEP });
        assert.equal(v.blocking.length, 1, JSON.stringify(v));
        assert.match(v.blocking[0].message, /was 21 at the merge base/);
    });

    it("blocks a function that crossed the limit inside its body (no finding at the merge base)", () => {
        const v = run({ issues: [scored(5, 16, 15)], hunks: DEEP });
        assert.equal(v.blocking.length, 1);
    });

    it("lets through an edited function above 20 whose score held or fell", () => {
        for (const n of [30, 28]) {
            const v = run({ issues: [scored(5, n, 15)], base: [scored(5, 30, 14)], hunks: DEEP });
            assert.equal(v.blocking.length, 0, `score ${n}`);
            assert.equal(v.existing.length, 1);
        }
    });

    it("touch it, fix it: blocks an edited function scoring 16 to 20 even when its score held", () => {
        for (const n of [16, 20]) {
            const v = run({ issues: [scored(5, n, 15)], base: [scored(5, n, 14)], hunks: DEEP });
            assert.equal(v.blocking.length, 1, `score ${n}`);
            assert.match(v.blocking[0].message, /bring it to 15 or below/);
        }
    });

    it("leaves a function the push does not edit alone, whatever its score", () => {
        const below = [{ oldStart: 30, oldCount: 1, newStart: 30, newCount: 1 }];
        const v = run({ issues: [scored(5, 18, 15)], base: [scored(5, 18, 15)], hunks: below });
        assert.equal(v.blocking.length, 0);
    });

    it("counts a deletion inside the body as an edit", () => {
        const deleted = [{ oldStart: 9, oldCount: 2, newStart: 8, newCount: 0 }];
        const v = run({ issues: [scored(5, 17, 15)], base: [scored(5, 19, 17)], hunks: deleted });
        assert.equal(v.blocking.length, 1);
        assert.match(v.blocking[0].message, /bring it to 15 or below/);
    });

    it("finds the merge base's finding through hunks above that moved the function", () => {
        const above = [
            { oldStart: 1, oldCount: 0, newStart: 2, newCount: 3 },
            { oldStart: 7, oldCount: 0, newStart: 11, newCount: 1 },
        ];
        const v = run({ issues: [scored(8, 30, 18)], base: [scored(5, 30, 14)], hunks: above });
        assert.equal(v.blocking.length, 0, JSON.stringify(v.blocking));
    });

    it("judges S5843 and S107 by their own scores, without the 16-to-20 rule", () => {
        const regex = (n) => `Simplify this regular expression to reduce its complexity from ${n} to the 20 allowed.`;
        const r = (n) => scored(5, 0, 5, "typescript:S5843", regex(n));
        const edit = [{ oldStart: 5, oldCount: 1, newStart: 5, newCount: 1 }];
        assert.equal(run({ issues: [r(22)], base: [r(23)], hunks: edit }).blocking.length, 0);
        assert.equal(run({ issues: [r(24)], base: [r(23)], hunks: edit }).blocking.length, 1);
        const params = (n) => `Function 'parse2D' has too many parameters (${n}). Maximum allowed is 7.`;
        const p = (n) => ({ ...scored(5, 0, 5, "typescript:S107", params(n)), flows: [] });
        assert.equal(run({ issues: [p(8)], base: [p(8)], hunks: edit }).blocking.length, 0);
        assert.equal(run({ issues: [p(9)], base: [p(8)], hunks: edit }).blocking.length, 1);
    });

    it("takes S107's span through a parameter list that runs over several lines", () => {
        const lines = ["export function f(", "    a: number,", "    b: number,", "): void {", "    return;", "}"];
        const issue = { rule: "typescript:S107", line: 1, textRange: { startLine: 1, endLine: 1 }, flows: [] };
        assert.deepEqual(scoredSpan(issue, lines), { start: 1, end: 4 });
        // A parameter added on its own line (new line 3) inside that list is an edit of the function.
        const added = [{ oldStart: 2, oldCount: 0, newStart: 3, newCount: 1 }];
        const v = run({
            issues: [{ ...issue, path: "f.ts", message: "has too many parameters (8)." }],
            hunks: added,
            lines,
        });
        assert.equal(v.blocking.length, 1);
    });

    it("blocks end to end: scans the merge base's copy of the file and compares", async () => {
        const fn = (extra) =>
            [
                "export function a(x: number) {",
                "    if (x > 1) {",
                "        return 1;",
                "    }",
                ...extra,
                "    return 2;",
                "}",
                "",
            ].join("\n");
        const base = fn([]);
        const head = fn(["    if (x > 2) {", "        return 3;", "    }"]);
        const at = (n, to) => ({ ...scored(1, n, to), component: "proj-local:src/a.ts", type: "CODE_SMELL" });
        const s = await server({ local: [at(17, 6)], base: [at(16, 2)] });
        const dir = repo(head, { base });
        const r = await gate(dir, { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 1, r.out);
        assert.equal(s.scans().length, 2, "a second scan, of the merge base");
        assert.match(r.out, /src\/a\.ts:1 {2}typescript:S3776 .*was 16 at the merge base/);
        const copy = join(dir, ".git/sonar", `base-${dir.split("/").pop()}`);
        assert.equal(readFileSync(join(copy, "src/a.ts"), "utf8"), base);
        const args = JSON.parse(
            readFileSync(join(dir, ".git/sonar", `base-work-${dir.split("/").pop()}`, "args.json"), "utf8"),
        ).args;
        assert.ok(args.includes(`-Dsonar.projectBaseDir=${copy}`), args.join(" "));
        assert.ok(args.includes("-Dsonar.sources=src/a.ts"));
    });

    it("scans only once when no complexity finding touches the push", async () => {
        const s = await server({ local: [issue(2, "    return 1 + 1;")] });
        await gate(repo(HEAD_NEW), { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(s.scans().length, 1);
    });
});

// A branch already on GitHub is judged by what THIS push changes: the lines between the remote
// branch's head and the new head, less what a merge brought in from master. A new branch has no
// remote head, so everything it changes counts.
describe("sonar-gate: complexity is judged on this push's own changes", () => {
    const msg = (n) => `Refactor this function to reduce its Cognitive Complexity from ${n} to the 15 allowed.`;
    // An S3776 finding on function `a` (line 1) whose increments run to line `to`.
    const at = (n, to) => ({
        component: "proj-local:src/a.ts",
        line: 1,
        rule: "typescript:S3776",
        message: msg(n),
        type: "CODE_SMELL",
        textRange: { startLine: 1, endLine: 1, startOffset: 16, endOffset: 17 },
        flows: [{ locations: [{ textRange: { startLine: to, endLine: to } }] }],
    });
    const fn = (name, { first = "x + 1", inner = "y", extra = [] } = {}) => [
        `export function ${name}(x: number) {`,
        `    const y = ${first};`,
        "    if (x > 1) {",
        `        return ${inner};`,
        "    }",
        ...extra,
        "    // tail",
        "    return 2;",
        "}",
        "",
    ];
    const file = (a, b = {}) => [...fn("a", a), ...fn("b", b)].join("\n");
    const NESTED = ["    if (x > 2) {", "        return 3;", "    }"];
    const MASTER = file({});
    const PUSHED = file({ extra: NESTED }); // the branch's first push: a's complexity rose then

    // The branch pushed once (origin/feature), then `steps` committed on top: each { master } is a
    // master commit merged into the branch, each { head } a branch commit.
    function pushedRepo(steps) {
        const dir = repo(PUSHED, { base: MASTER });
        const pushed = git(dir, "rev-parse", "HEAD");
        git(dir, "update-ref", "refs/remotes/origin/feature", pushed);
        for (const step of steps) {
            if (step.master) {
                git(dir, "switch", "-q", "master");
                writeFileSync(join(dir, "src/a.ts"), step.master);
                git(dir, "commit", "-q", "-am", "master moves on");
                git(dir, "update-ref", "refs/remotes/origin/master", "HEAD");
                git(dir, "switch", "-q", "feature");
                git(dir, "merge", "-q", "--no-edit", "master");
            } else {
                writeFileSync(join(dir, "src/a.ts"), step.head);
                git(dir, "commit", "-q", "-am", "this push");
            }
        }
        return { dir, pushed };
    }
    const priorCopy = (dir) =>
        readFileSync(join(dir, ".git/sonar", `prior-${dir.split("/").pop()}`, "src/a.ts"), "utf8");

    it("does not judge a function the branch changed before, after a master merge", async () => {
        // Master edits a's first line; the merge brings it in; the push edits nothing of its own in a.
        const { dir } = pushedRepo([
            { master: file({ first: "x + 2" }) },
            { head: file({ first: "x + 2", extra: NESTED }, { inner: "y + 1" }) },
        ]);
        assert.equal(git(dir, "show", "HEAD:src/a.ts").split("\n")[1], "    const y = x + 2;");
        const s = await server({ local: [at(17, 8)], base: [at(17, 8)] });
        const r = await gate(dir, { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN });
        assert.equal(r.code, 0, r.out);
        assert.equal(s.scans().length, 1, "no second scan: no complexity finding is this push's");
    });

    it("blocks a push that edits one old function scoring 17 (touch it, fix it)", async () => {
        const { dir, pushed } = pushedRepo([{ head: file({ inner: "y + 1", extra: NESTED }) }]);
        const s = await server({ local: [at(17, 8)], base: [at(17, 8)] });
        const r = await gate(dir, { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN, PUSH_REMOTE_SHA: pushed });
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /src\/a\.ts:1 {2}typescript:S3776 .*bring it to 15 or below/);
        assert.equal(priorCopy(dir), PUSHED, "compared with the remote head's copy, not the merge base's");
    });

    it("blocks a push that raises a function's score deep inside it", async () => {
        const deeper = [...NESTED, "    if (x > 3) {", "        return 4;", "    }"];
        const { dir, pushed } = pushedRepo([{ head: file({ extra: deeper }) }]);
        const s = await server({ local: [at(23, 11)], base: [at(21, 8)] });
        const r = await gate(dir, { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN, PUSH_REMOTE_SHA: pushed });
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /src\/a\.ts:1 {2}typescript:S3776 .*was 21 before this push/);
    });

    it("judges everything a new branch changes", async () => {
        // Two commits, neither on GitHub: the first raised a, the second edits only b.
        const dir = repo(PUSHED, { base: MASTER });
        writeFileSync(join(dir, "src/a.ts"), file({ extra: NESTED }, { inner: "y + 1" }));
        git(dir, "commit", "-q", "-am", "second");
        const zero = "0".repeat(40);
        const s = await server({ local: [at(17, 8)] });
        const r = await gate(dir, { SONAR_HOST_URL: s.url, SONAR_SCAN_TOKEN: TOKEN, PUSH_REMOTE_SHA: zero });
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /src\/a\.ts:1 {2}typescript:S3776 /);
    });

    it("never counts a score master's merge raised as this push's", () => {
        // Master's side (the merge base) already scores 23; the remote head scored 21.
        const f = { path: "f.ts", line: 5, rule: "typescript:S3776", message: msg(23) };
        const issue = { ...f, textRange: { startLine: 5, endLine: 5 }, flows: [] };
        const hunk = [{ oldStart: 5, oldCount: 1, newStart: 5, newCount: 1 }];
        const v = decide({
            local: { issues: [issue], hotspots: [] },
            master: { issuesByFile: () => [], hotspotsByFile: () => [], lineAt: () => null },
            base: [
                { issuesByFile: () => [{ ...f, message: msg(21) }], label: "before this push" },
                { issuesByFile: () => [{ ...f, message: msg(23) }], label: "at the merge base" },
            ],
            files: new Map([["f.ts", { oldPath: "f.ts", hunks: hunk, lines: [], baseLines: [] }]]),
        });
        assert.equal(v.blocking.length, 0, JSON.stringify(v.blocking));
    });
});
