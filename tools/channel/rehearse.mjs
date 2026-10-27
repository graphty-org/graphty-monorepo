#!/usr/bin/env node
// rehearse.mjs -- a rehearsal of the nightly path (tools/nightly-candidate-hold design, issue #4068): the real tools
// release.yml and release-rerun.yml run (full-run.mjs pick and verdict, release-rerun.mjs, hold.mjs, nightly.mjs
// decide), in the order GitHub runs them, against scratch state, with every lane's result taken from a scenario.
//
//   node tools/channel/rehearse.mjs [scenario ...]   runs the scenarios (default: all), exit 1 when one fails
//   node tools/channel/rehearse.mjs --list           names them
//   node tools/channel/rehearse.mjs gh <args>        the scratch gh the tools call (put on PATH by the driver)
//
// Scratch state, reset for every scenario, so a rehearsal touches nothing real:
//   - the results store: the real Worker (tools/results-service) on node:sqlite (its d1-shim), served on localhost,
//     with an OIDC token endpoint whose tokens it trusts (ACTIONS_ID_TOKEN_REQUEST_URL), signed with a key made here;
//   - GitHub: a scratch gh on PATH that keeps issues, workflow dispatches, re-runs and run artifacts in a JSON file
//     and fails on any call it does not know, so a new gh call in a tool shows up here first;
//   - git: a shared clone of HEAD, so channel refs (origin/channel/nightly) are the clone's, never the real remote's.
// Not rehearsed yet (follow-ups on #4068): the stub lanes from a donor full run's artifacts (captures here are
// synthesized: complete, nothing differing), version, land and publish to a scratch registry (Verdaccio), the site,
// fix forward, approval and abandon.
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { createSign, generateKeyPairSync } from "node:crypto";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const REPO = "graphty-org/graphty-monorepo";
const REPO_ID = "1122477634";

// ---------------------------------------------------------------------------------------------------------------
// The scratch gh: state in $REHEARSAL_STATE
// ---------------------------------------------------------------------------------------------------------------

const load = (file) => JSON.parse(readFileSync(file, "utf8"));
const save = (file, s) => writeFileSync(file, `${JSON.stringify(s, null, 2)}\n`);
export const emptyState = () => ({ issues: [], dispatches: [], reruns: [], artifacts: {}, jobs: {}, calls: [] });

// --flag value pairs (repeatable) and positionals
function argsOf(argv) {
    const flags = {};
    const pos = [];
    const rest = [...argv];
    while (rest.length) {
        const a = rest.shift();
        if (a === "--paginate") continue;
        if (a.startsWith("-") && a.length > 1) {
            flags[a] ??= [];
            flags[a].push(rest.shift());
        } else pos.push(a);
    }
    const one = (...names) => names.map((n) => flags[n]?.at(-1)).find((v) => v !== undefined);
    return { flags, pos, one };
}

const jq = (value, expr) =>
    expr === undefined
        ? JSON.stringify(value)
        : execFileSync("jq", ["-r", expr], { input: JSON.stringify(value), encoding: "utf8" }).trimEnd();

const restIssue = (i) => ({
    number: i.number,
    title: i.title,
    state: i.state,
    state_reason: i.stateReason ?? null,
    created_at: i.createdAt,
    closed_at: i.closedAt ?? null,
    updated_at: i.updatedAt,
    labels: i.labels.map((name) => ({ name })),
    body: i.body,
});
const cliIssue = (i) => ({
    ...restIssue(i),
    state: i.state.toUpperCase(),
    createdAt: i.createdAt,
    closedAt: i.closedAt ?? null,
    url: `https://github.com/${REPO}/issues/${i.number}`,
    labels: i.labels.map((name) => ({ name })),
});
const bodyOf = (a) => {
    const file = a.one("--body-file", "-F");
    return file ? readFileSync(file, "utf8") : (a.one("--body", "-b", "--comment", "-c") ?? "");
};

/**
 * One scratch gh call against a state object (mutated).
 * @param s the state
 * @param argv gh's arguments
 * @param now the time
 * @returns what gh prints
 */
export function ghCall(s, argv, now = new Date().toISOString()) {
    s.calls.push(argv.join(" "));
    const a = argsOf(argv.slice(1));
    const [cmd] = argv;
    const sub = a.pos[0];
    const issue = (n) => s.issues.find((i) => i.number === Number(n)) ?? fail(`no issue #${n}`);
    const touch = (i) => Object.assign(i, { updatedAt: now });
    if (cmd === "api") return api(s, a);
    if (cmd === "issue" && sub === "list") {
        const state = a.one("--state", "-s") ?? "open";
        const q = /in:title "(.*)"/.exec(a.one("--search", "-S") ?? "")?.[1] ?? "";
        const label = a.flags["--label"] ?? [];
        const found = s.issues
            .filter((i) => state === "all" || i.state === state)
            .filter((i) => i.title.includes(q) && label.every((l) => i.labels.includes(l)))
            .slice(0, Number(a.one("--limit", "-L") ?? 30))
            .map(cliIssue);
        return jq(found, a.one("--jq", "-q"));
    }
    if (cmd === "issue" && sub === "create") {
        const number = s.issues.reduce((m, i) => Math.max(m, i.number), 0) + 1;
        const labels = (a.flags["--label"] ?? a.flags["-l"] ?? []).flatMap((l) => l.split(","));
        const title = a.one("--title", "-t");
        s.issues.push({ number, title, labels, body: bodyOf(a), state: "open", comments: [], createdAt: now });
        touch(s.issues.at(-1));
        return `https://github.com/${REPO}/issues/${number}`;
    }
    if (cmd === "issue" && sub === "comment") {
        touch(issue(a.pos[1])).comments.push(bodyOf(a));
        return "";
    }
    if (cmd === "issue" && sub === "edit") {
        const i = touch(issue(a.pos[1]));
        if (a.one("--title", "-t")) i.title = a.one("--title", "-t");
        if (a.one("--body-file", "--body")) i.body = bodyOf(a);
        i.labels.push(...(a.flags["--add-label"] ?? []).flatMap((l) => l.split(",")));
        return "";
    }
    if (cmd === "issue" && (sub === "close" || sub === "reopen")) {
        const i = touch(issue(a.pos[1]));
        if (a.one("--comment", "-c")) i.comments.push(a.one("--comment", "-c"));
        i.state = sub === "close" ? "closed" : "open";
        i.closedAt = sub === "close" ? now : null;
        i.stateReason = sub === "close" ? (a.one("--reason", "-r") ?? "completed") : null;
        return "";
    }
    if (cmd === "workflow" && sub === "run") {
        s.dispatches.push({ workflow: a.pos[1], ref: a.one("--ref", "-r"), fields: a.flags["-f"] ?? [] });
        return "";
    }
    if (cmd === "run" && sub === "rerun") {
        s.reruns.push({ run: a.pos[1], failed: argv.includes("--failed") });
        return "";
    }
    if (cmd === "run" && sub === "download") {
        const name = a.one("-n", "--name");
        const file = s.artifacts[`${a.pos[1]}/${name}`] ?? fail(`no artifact ${name} on run ${a.pos[1]}`);
        const dir = a.one("-D", "--dir") ?? ".";
        mkdirSync(dir, { recursive: true });
        cpSync(file, join(dir, `${name}.json`));
        return "";
    }
    return fail(`the scratch gh does not know: gh ${argv.join(" ")}`);
}

function api(s, a) {
    const path = a.pos[0];
    const url = new URL(path, "https://api.test/");
    const q = (k) => url.searchParams.get(k);
    let out;
    if (/^\/repos\/[^/]+\/[^/]+\/issues$/.test(url.pathname)) {
        const labels = (q("labels") ?? "").split(",").filter(Boolean);
        out = s.issues
            .filter((i) => (q("state") ?? "open") === "all" || i.state === (q("state") ?? "open"))
            .filter((i) => labels.every((l) => i.labels.includes(l)) && (!q("since") || i.updatedAt >= q("since")))
            .map(restIssue);
    } else if (/\/actions\/runs\/[^/]+\/artifacts$/.test(url.pathname)) {
        const run = url.pathname.split("/").at(-2);
        const names = Object.keys(s.artifacts)
            .filter((k) => k.startsWith(`${run}/`) && (!q("name") || k === `${run}/${q("name")}`))
            .map((k) => ({ name: k.slice(run.length + 1) }));
        out = { total_count: names.length, artifacts: names };
    } else if (/\/actions\/runs\/[^/]+\/attempts\/\d+\/jobs$/.test(url.pathname)) {
        const [, run, n] = /runs\/([^/]+)\/attempts\/(\d+)/.exec(url.pathname);
        out = { jobs: s.jobs[`${run}/${n}`] ?? [] };
    } else {
        fail(`the scratch gh does not know: gh api ${path}`);
    }
    return jq(out, a.one("--jq", "-q"));
}

function fail(message) {
    throw new Error(message);
}

// ---------------------------------------------------------------------------------------------------------------
// The scratch results store and token endpoint
// ---------------------------------------------------------------------------------------------------------------

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

async function startStore() {
    const { AUDIENCE, handle } = await import(pathToFileURL(join(ROOT, "tools/results-service/src/service.js")).href);
    const { d1 } = await import(pathToFileURL(join(ROOT, "tools/results-service/test/d1-shim.mjs")).href);
    // one key for every scratch store: the Worker module caches GitHub's key set by key id
    const jwks = { keys: [{ ...publicKey.export({ format: "jwk" }), kid: "rehearsal", alg: "RS256", use: "sig" }] };
    const keyFetch = async () => Response.json(jwks);
    const env = { DB: d1(), REPOSITORY_ID: REPO_ID, DEPLOY_REPOSITORY_IDS: "1", LOCAL_TOKEN_HASHES: "0000" };
    // who the next token is: the workflow file and the run (the driver sets it before each step)
    const as = { file: "release.yml", run: "9000", attempt: "1" };
    const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const token = () => {
        const now = Math.floor(Date.now() / 1000);
        const claims = {
            iss: "https://token.actions.githubusercontent.com",
            aud: AUDIENCE,
            exp: now + 600,
            nbf: now - 10,
            repository: REPO,
            repository_id: REPO_ID,
            event_name: "workflow_dispatch",
            ref: "refs/heads/master",
            job_workflow_ref: `${REPO}/.github/workflows/${as.file}@refs/heads/master`,
            run_id: as.run,
            run_attempt: as.attempt,
        };
        const input = `${b64({ alg: "RS256", typ: "JWT", kid: "rehearsal" })}.${b64(claims)}`;
        return `${input}.${createSign("RSA-SHA256").update(input).sign(privateKey).toString("base64url")}`;
    };
    const server = createServer(async (req, res) => {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        if (req.url.startsWith("/oidc")) {
            res.setHeader("content-type", "application/json");
            return res.end(JSON.stringify({ value: token() }));
        }
        const request = new Request(`http://store.test${req.url}`, {
            method: req.method,
            headers: req.headers,
            body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
        });
        const out = await handle(request, env, { fetch: keyFetch });
        res.writeHead(out.status, Object.fromEntries(out.headers));
        res.end(Buffer.from(await out.arrayBuffer()));
    });
    await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
    const url = `http://127.0.0.1:${server.address().port}`;
    // a direct call to the store, as `file` would make it
    const call = async (method, path, body, file = "release.yml") => {
        const was = as.file;
        as.file = file;
        const res = await fetch(`${url}${path}`, {
            method,
            headers: { authorization: `Bearer ${token()}`, "content-type": "application/json" },
            body: body && JSON.stringify(body),
        });
        as.file = was;
        return { status: res.status, body: await res.json() };
    };
    return { url, as, call, close: () => server.close() };
}

// ---------------------------------------------------------------------------------------------------------------
// The rehearsal: one scratch world per scenario
// ---------------------------------------------------------------------------------------------------------------

const run = promisify(execFile);
const GREEN = {
    ci: "success",
    llm: "success",
    t4: "success",
    hosts: "success",
    autosave_macos: "success",
    audit: "success",
    version_dry_run: "success",
    recapture: "success",
};

async function world(clone, sha) {
    const dir = mkdtempSync(join(tmpdir(), "rehearsal-"));
    const bin = join(dir, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "gh"), `#!/bin/sh\nexec node "${SELF}" gh "$@"\n`);
    chmodSync(join(bin, "gh"), 0o755);
    const stateFile = join(dir, "gh.json");
    save(stateFile, emptyState());
    const store = await startStore();
    const projects = Object.keys(load(join(clone, "visual-review.config.json")).projects ?? {});
    const base = {
        PATH: `${bin}:${process.env.PATH}`,
        HOME: process.env.HOME,
        REHEARSAL_STATE: stateFile,
        GH_TOKEN: "rehearsal",
        GITHUB_TOKEN: "rehearsal",
        GITHUB_REPOSITORY: REPO,
        RESULTS_URL: store.url,
        ACTIONS_ID_TOKEN_REQUEST_URL: `${store.url}/oidc?x=1`,
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: "rehearsal",
        RELEASE_RERUN_RETRY_MS: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
    };
    // one step of a job: a tool run in the clone, its GITHUB_OUTPUT parsed
    let step = 0;
    const tool = async (args, env = {}) => {
        const out = join(dir, `out-${++step}`);
        writeFileSync(out, "");
        try {
            await run("node", args, { cwd: clone, env: { ...base, GITHUB_OUTPUT: out, ...env } });
        } catch (e) {
            throw new Error(`node ${args.join(" ")} failed:\n${String(e.stdout).slice(-2000)}\n${e.stderr}`);
        }
        return Object.fromEntries(
            readFileSync(out, "utf8")
                .split("\n")
                .filter((l) => l.includes("="))
                .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
        );
    };
    // a Release (full) run's verdict for one attempt, with its verdict-<n> record kept as the run's artifact
    const verdict = async ({ runId, attempt, lanes, pick }) => {
        store.as.run = runId;
        store.as.attempt = String(attempt);
        const captures = join(dir, `captures-${runId}-${attempt}`);
        for (const p of projects) {
            mkdirSync(join(captures, `visual-${p}-${attempt}`), { recursive: true });
            save(join(captures, `visual-${p}-${attempt}`, "results.json"), { complete: true, items: [] });
        }
        const records = join(dir, `records-${runId}`);
        mkdirSync(records, { recursive: true });
        const record = join(records, `verdict-${attempt}.json`);
        const out = await tool(["tools/full-run.mjs", "verdict"], {
            MODE: "full",
            SHA: pick.sha,
            GOOD: pick.good ?? "",
            HELD: pick.held ?? "",
            FORWARD: pick.forward ?? "",
            LANES: JSON.stringify({ pick: "success", ...GREEN, ...lanes }),
            CAPTURES: captures,
            RUN_ATTEMPT: String(attempt),
            RUN_ID: runId,
            RUN_URL: `https://github.com/${REPO}/actions/runs/${runId}`,
            RECORDS: records,
            RECORD: record,
        });
        const s = load(stateFile);
        s.artifacts[`${runId}/verdict-${attempt}`] = record;
        save(stateFile, s);
        return out;
    };
    // release-rerun.yml on a finished attempt
    const rerun = async ({ runId, attempt, conclusion, failed }) => {
        const s = load(stateFile);
        s.jobs[`${runId}/${attempt}`] = failed.map((name) => ({ name, conclusion: "failure" }));
        save(stateFile, s);
        store.as.file = "release-rerun.yml";
        try {
            return await tool(["tools/release-rerun.mjs"], {
                RUN: runId,
                WORKFLOW: "Release",
                TITLE: "Release (full)",
                ATTEMPT: String(attempt),
                CONCLUSION: conclusion,
                RUN_URL: `https://github.com/${REPO}/actions/runs/${runId}`,
                HEAD_SHA: sha,
            });
        } finally {
            store.as.file = "release.yml";
        }
    };
    const hold = (pick, out, runId) =>
        out.hold === "start" || out.hold === "update"
            ? tool(["tools/channel/hold.mjs", out.hold], {
                  SHA: pick.sha,
                  STATE: out.state,
                  WHAT: out.what,
                  RUN_URL: `https://github.com/${REPO}/actions/runs/${runId}`,
              })
            : null;
    const gh = () => load(stateFile);
    const openIssues = (prefix) => gh().issues.filter((i) => i.state === "open" && i.title.startsWith(prefix));
    const close = () => {
        store.close();
        rmSync(dir, { recursive: true, force: true });
    };
    return { store, tool, verdict, rerun, hold, gh, openIssues, close };
}

// the slot's pick on a master whose newest kept site is `sha`
async function pickOn(w, sha) {
    assert.equal((await w.store.call("POST", "/v1/sites", { sha }, "deploy-pages.yml")).status, 200);
    const pick = await w.tool(["tools/full-run.mjs", "pick"], { MODE: "full", HEAD_SHA: sha });
    assert.equal(pick.sha, sha, `pick takes the kept site's commit (${pick.why})`);
    return pick;
}

const candidate = async (w) => (await w.store.call("GET", "/v1/candidate")).body;

/** The scenarios, in the design's order; each gets a fresh scratch world. */
export const SCENARIOS = {
    // a green run with no changed picture: verdict green-clean, nothing filed, nothing held, nightly promotes
    "green-clean-promote": async (w, sha) => {
        const pick = await pickOn(w, sha);
        const out = await w.verdict({ runId: "9101", attempt: 1, lanes: {}, pick });
        assert.equal(out.state, "green-clean");
        assert.equal(out.deferred, "false");
        assert.equal(out.hold, "none");
        const decide = await w.tool(["tools/channel/nightly.mjs", "decide"], {
            STATE: out.state,
            GATE: "success",
            HELD: pick.held ?? "",
            SHA: sha,
        });
        assert.equal(decide.promote, "true", `nightly promotes a green-clean candidate (${decide.why})`);
        assert.deepEqual(w.openIssues(""), [], "a green-clean run files nothing");
        assert.deepEqual(w.gh().dispatches, [], "and dispatches no bisect");
    },
    // T4 red on attempt 1, green on the same-commit re-run: deferred, re-run once, green-clean, the lane filed flaky
    "red-then-green-rerun": async (w, sha) => {
        const pick = await pickOn(w, sha);
        const first = await w.verdict({ runId: "9201", attempt: 1, lanes: { t4: "failure" }, pick });
        assert.equal(first.deferred, "true", "attempt 1's red is deferred to the re-run");
        assert.equal(first.hold, "none");
        assert.deepEqual(w.openIssues("Full run red"), [], "a deferred red files nothing yet");
        const decision = await w.rerun({ runId: "9201", attempt: 1, conclusion: "failure", failed: ["T4 GPU"] });
        assert.equal(decision.decision, "rerun");
        assert.deepEqual(w.gh().reruns, [{ run: "9201", failed: true }]);
        const second = await w.verdict({ runId: "9201", attempt: 2, lanes: {}, pick });
        assert.equal(second.state, "green-clean");
        assert.deepEqual(w.openIssues("Full run red"), [], "green on the re-run files no red issue");
        assert.equal(w.openIssues("Flaky in full run").length, 1, "the lane that failed once is filed as flaky");
        assert.deepEqual(w.gh().dispatches, [], "and no bisect");
        assert.equal(
            (await w.rerun({ runId: "9201", attempt: 2, conclusion: "success", failed: [] })).decision,
            "none",
        );
    },
    // T4 red on both attempts after a green parent: one red issue, one bisect of the range, and the candidate held
    "red-twice-hold": async (w, sha, parent) => {
        const green = await w.store.call("POST", "/v1/verdicts", { sha: parent, state: "green-clean", lane: null });
        assert.equal(green.status, 200, JSON.stringify(green.body));
        const pick = await pickOn(w, sha);
        assert.equal(pick.good, parent, "pick names the last green commit as the bisect's good end");
        await w.verdict({ runId: "9301", attempt: 1, lanes: { t4: "failure" }, pick });
        assert.equal(
            (await w.rerun({ runId: "9301", attempt: 1, conclusion: "failure", failed: ["T4 GPU"] })).decision,
            "rerun",
        );
        const second = await w.verdict({ runId: "9301", attempt: 2, lanes: { t4: "failure" }, pick });
        assert.equal(second.state, "red");
        assert.equal(second.deferred, "false");
        assert.equal(w.openIssues("Full run red").length, 1, "one red issue");
        assert.equal(w.gh().dispatches.filter((d) => d.workflow === "bisect.yml").length, 1, "one bisect");
        assert.equal(second.hold, "start", "a red verdict with nothing held holds the commit");
        const held = await w.hold(pick, second, "9301");
        assert.ok(held.issue, "the hold opens its issue");
        assert.equal(w.openIssues("Nightly held on").length, 1);
        assert.equal(
            (await candidate(w)).sha ?? (await candidate(w)).candidate?.sha,
            sha,
            "the store holds the commit",
        );
        assert.equal(
            (await w.rerun({ runId: "9301", attempt: 2, conclusion: "failure", failed: [] })).decision,
            "none",
        );
    },
};

async function main(names) {
    const unknown = names.filter((n) => !SCENARIOS[n]);
    if (unknown.length) fail(`unknown scenario ${unknown.join(", ")}; --list names them`);
    // a shared clone of HEAD: the tools as committed, and refs that are the clone's own
    const clone = mkdtempSync(join(tmpdir(), "rehearsal-clone-"));
    execFileSync("git", ["clone", "--quiet", "--shared", "--no-checkout", ROOT, clone]);
    execFileSync("git", ["-C", clone, "sparse-checkout", "set", "tools", ".github"]);
    execFileSync("git", ["-C", clone, "checkout", "--quiet", "HEAD"], {
        env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" },
    });
    const [sha, parent] = execFileSync("git", ["-C", clone, "rev-parse", "HEAD", "HEAD^1"], { encoding: "utf8" })
        .trim()
        .split("\n");
    let failed = 0;
    for (const name of names) {
        const w = await world(clone, sha);
        try {
            await SCENARIOS[name](w, sha, parent);
            console.log(`ok ${name}`);
        } catch (e) {
            failed++;
            console.log(`FAILED ${name}: ${e.message}\n  gh calls: ${w.gh().calls.join("\n    ")}`);
        } finally {
            w.close();
        }
    }
    rmSync(clone, { recursive: true, force: true });
    if (failed) fail(`${failed} of ${names.length} rehearsal scenarios failed`);
}

if (process.argv[1] === SELF) {
    const [cmd, ...rest] = process.argv.slice(2);
    if (cmd === "gh") {
        const file = process.env.REHEARSAL_STATE ?? fail("REHEARSAL_STATE is not set");
        const s = load(file);
        try {
            const out = ghCall(s, rest);
            if (out) process.stdout.write(`${out}\n`);
        } catch (e) {
            s.calls.push(`FAILED: ${e.message}`);
            save(file, s);
            console.error(e.message);
            process.exit(1);
        }
        save(file, s);
    } else if (cmd === "--list") {
        console.log(Object.keys(SCENARIOS).join("\n"));
    } else {
        try {
            await main(cmd ? [cmd, ...rest] : Object.keys(SCENARIOS));
        } catch (e) {
            console.error(e.message);
            process.exit(1);
        }
    }
}
