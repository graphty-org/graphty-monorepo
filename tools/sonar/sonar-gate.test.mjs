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
    nosonarComment,
    parseHunks,
    scannerFailure,
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
const git = (cwd, ...args) => execFileSync("git", args, { cwd, env: gitEnv, encoding: "utf8" }).trim();

const BASE = ["export function a() {", "    return 1;", "}", "export const b = 2;", ""].join("\n");

// A repository whose origin/master has src/a.ts = BASE and whose HEAD changes it to `head`.
function repo(head, { message = "change", extra = {} } = {}) {
    const dir = mkdtempSync(join(scratch, "repo-"));
    git(dir, "init", "-q", "-b", "master");
    writeFileSync(join(dir, "sonar-project.properties"), "sonar.test.inclusions=**/*.test.ts\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src/a.ts"), BASE);
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
writeFileSync(work + "/report-task.txt", "ceTaskId=task-1\\n");
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
async function server({ local = [], master = {}, hotspots = [], admin = false, fail = {} } = {}) {
    const seen = [];
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
                return json(res, 200, { task: { status: "SUCCESS" }, component: {} });
            case "/api/issues/search":
                if (q.components === "proj-local") return page("issues", local);
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
    return { url: `http://127.0.0.1:${srv.address().port}`, seen };
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

    it("blocks a cognitive complexity that rose, not one that held", () => {
        const files = new Map([
            ["f.ts", { oldPath: "f.ts", hunks: [{ oldStart: 5, oldCount: 1, newStart: 5, newCount: 1 }], lines: [] }],
        ]);
        const master = {
            issuesByFile: () => [{ rule: "typescript:S3776", line: 5, message: "from 16 to the 15 allowed." }],
            hotspotsByFile: () => [],
            lineAt: () => null,
        };
        const at = (n) => ({
            path: "f.ts",
            line: 5,
            rule: "typescript:S3776",
            message: `from ${n} to the 15 allowed.`,
        });
        assert.equal(decide({ local: { issues: [at(16)], hotspots: [] }, master, files }).blocking.length, 0);
        assert.equal(decide({ local: { issues: [at(17)], hotspots: [] }, master, files }).blocking.length, 1);
    });

    it("lets a regex complexity (S5843) through when an edit to the regex lowered it", () => {
        const files = new Map([
            ["f.ts", { oldPath: "f.ts", hunks: [{ oldStart: 5, oldCount: 1, newStart: 5, newCount: 1 }], lines: [] }],
        ]);
        const master = {
            issuesByFile: () => [{ rule: "typescript:S5843", line: 5, message: "from 41 to the 20 allowed." }],
            hotspotsByFile: () => [],
            lineAt: () => null,
        };
        const at = (n) => ({
            path: "f.ts",
            line: 5,
            rule: "typescript:S5843",
            message: `from ${n} to the 20 allowed.`,
        });
        assert.equal(decide({ local: { issues: [at(29)], hotspots: [] }, master, files }).blocking.length, 0);
        assert.equal(decide({ local: { issues: [at(42)], hotspots: [] }, master, files }).blocking.length, 1);
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
