import { spawn } from "node:child_process";
import { once } from "node:events";
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { normalizeConfig } from "../lib/config.mjs";
import { identify } from "../lib/proc.mjs";
import {
    admit,
    checkInit,
    classify,
    consumesAttempt,
    createRunner,
    ownerIdentity,
    recoverRuns,
    runArgv,
    runEnv,
    runSettings,
    sandboxMissing,
    toolsFor,
    writeRunGitconfig,
} from "../lib/runner.mjs";

const FAKE = fileURLToPath(new URL("helpers/fake-claude.mjs", import.meta.url));

const CONFIG = normalizeConfig({
    repo: "o/r",
    lanes: { ci: { workflow: "ci.yml", gating: "required" } },
    protectedPaths: ["visual-baselines/"],
    runs: {
        model: { "master-red": "opus", default: "sonnet" },
        caps: {
            "master-red": { turns: 80, budgetUsd: 6, timeoutMinutes: 60 },
            "pr-fix": { turns: 60, budgetUsd: 4, timeoutMinutes: 45 },
            default: { turns: 30, budgetUsd: 1.5, timeoutMinutes: 15 },
        },
    },
});

/** @type {number[]} process groups started by the tests */
const groups = [];
/** @type {Array<() => Promise<void>>} */
const stoppers = [];

/**
 * Whether a process group still has a live (non-zombie) member.
 * @param {number} pgid the group
 * @returns {boolean} true when alive
 */
function groupAlive(pgid) {
    try {
        process.kill(-pgid, 0);
        return true;
    } catch {
        return false;
    }
}

afterEach(async () => {
    for (const stop of stoppers.splice(0)) await stop();
    for (const pgid of groups.splice(0)) {
        try {
            process.kill(-pgid, "SIGKILL");
        } catch {
            // gone
        }
        for (let i = 0; i < 50 && groupAlive(pgid); i++) await new Promise((r) => setTimeout(r, 20));
        expect(groupAlive(pgid)).toBe(false);
    }
});

/**
 * A runner in a fresh state directory driven by fake-claude with `scenario`.
 * @param {any} scenario the fake's scenario
 * @param {any} [extra] more runner options
 * @returns {any} the runner, its state, ledger lines and directory
 */
function setup(scenario, extra = {}) {
    const dir = mkdtempSync(join(tmpdir(), "githerd-runner-"));
    const scenarioFile = join(dir, "scenario.json");
    writeFileSync(scenarioFile, JSON.stringify(scenario));
    const state = extra.state ?? { runs: {}, spend: {}, claims: {}, escalations: {} };
    const ledger = [];
    const logs = [];
    const runner = createRunner({
        stateDir: dir,
        state,
        config: () => CONFIG,
        mode: () => "dry-run",
        daemonUrl: "http://127.0.0.1:1",
        gitconfig: join(dir, "run-gitconfig"),
        claude: [process.execPath, FAKE, scenarioFile],
        packageDir: "/pkg",
        env: {
            PATH: process.env.PATH,
            HOME: "/home/x",
            LANG: "C",
            GH_TOKEN: "ghp_secret",
            PUSHOVER_TOKEN: "p",
            PUSHOVER_USER: "u",
            GITHERD_CONFIG: "/x",
            ANTHROPIC_API_KEY: "k",
            GNUPGHOME: "/g",
        },
        ledger: (e) => void ledger.push(e),
        log: (level, text) => void logs.push(`${level} ${text}`),
        killGraceMs: 200,
        ...extra,
    });
    stoppers.push(() => runner.shutdown());
    return { runner, state, ledger, logs, dir };
}

/**
 * Starts a triage run unless `req` says otherwise.
 * @param {any} runner the runner
 * @param {any} req the request
 * @returns {any} the start answer
 */
function start(runner, req) {
    return runner.start({ kind: "triage", event: "issue-new", target: "issue:1", prompt: "hi", ...req });
}

const ok = {
    subtype: "success",
    is_error: false,
    total_cost_usd: 0.42,
    num_turns: 3,
    structured_output: { outcome: "done", summary: "s" },
    permission_denials: [],
};

describe("pure parts", () => {
    it("gives code-editing kinds Bash and read-only kinds only read tools", () => {
        expect(toolsFor("pr-fix")).toContain("Bash");
        expect(toolsFor("triage")).toEqual(["Read", "Grep", "Glob"]);
        expect(() => toolsFor("nope")).toThrow(/unknown run kind/);
    });

    it("builds the argv with --tools and pre-approves only the read tools and mcp__githerd", () => {
        const argv = runArgv({ kind: "master-red", config: CONFIG, runDir: "/r", prompt: "P" });
        const at = (flag) => argv[argv.indexOf(flag) + 1];
        expect(at("-p")).toBe("P");
        expect(at("--tools")).toBe("Read Edit Write Grep Glob Bash mcp__githerd");
        expect(at("--allowedTools")).toBe("Read Grep Glob mcp__githerd");
        expect(at("--model")).toBe("opus");
        expect(at("--max-turns")).toBe("80");
        expect(at("--max-budget-usd")).toBe("6");
        expect(at("--permission-mode")).toBe("auto");
        expect(at("--setting-sources")).toBe("project,local");
        expect(at("--mcp-config")).toBe("/r/mcp.json");
        // claude reads --json-schema as the schema's JSON text, not a file path.
        expect(JSON.parse(at("--json-schema")).required).toEqual(["outcome", "summary"]);
        expect(argv).toContain("--strict-mcp-config");
        const ro = runArgv({ kind: "triage", config: CONFIG, runDir: "/r", prompt: "P" });
        expect(ro[ro.indexOf("--tools") + 1]).toBe("Read Grep Glob mcp__githerd");
        expect(ro[ro.indexOf("--model") + 1]).toBe("sonnet");
    });

    it("builds the environment from the allowlist only", () => {
        const env = runEnv(
            { PATH: "/bin", HOME: "/h", GH_TOKEN: "t", PUSHOVER_USER: "u", GITHERD_NAME: "n", GPG_TTY: "/dev/pts/1" },
            { gitconfig: "/g", run: { GITHERD_RUN_ID: "r" } },
        );
        expect(env).toEqual({
            PATH: "/bin",
            HOME: "/h",
            GPG_TTY: "/dev/pts/1",
            GIT_CONFIG_GLOBAL: "/g",
            GITHERD_RUN_ID: "r",
        });
        expect(() => runEnv({}, { gitconfig: "/g", run: { GH_TOKEN: "x" } })).toThrow(/GITHERD_/);
    });

    it("writes settings with the guard, deny rules, attribution and memory off, sandbox for code kinds", () => {
        const s = /** @type {any} */ (
            runSettings({ kind: "pr-fix", guard: ["/n o/node", "/g.mjs"], gpgAgentSocket: "/s" })
        );
        expect(s.hooks.PreToolUse[0].matcher).toBe("Bash|Edit|Write");
        expect(s.hooks.PreToolUse[0].hooks[0].command).toBe("'/n o/node' /g.mjs");
        expect(s.permissions.deny).toContain("Read(~/.config/gh/**)");
        expect(s.permissions.deny).toContain("Edit(~/.ssh/**)");
        expect(s.includeCoAuthoredBy).toBe(false);
        expect(s.attribution).toEqual({ commit: "", pr: "" });
        expect(s.autoMemoryEnabled).toBe(false);
        expect(s.sandbox.enabled).toBe(true);
        expect(s.sandbox.network.allowUnixSockets).toEqual(["/s"]);
        const ro = /** @type {any} */ (runSettings({ kind: "triage", guard: ["node"] }));
        expect(ro.sandbox).toBeUndefined();
    });

    it("checks the init line", () => {
        const init = {
            permissionMode: "auto",
            mcp_servers: [{ name: "githerd", status: "connected" }],
            tools: ["Read", "Grep", "Glob", "mcp__githerd__x"],
        };
        expect(checkInit(init, "triage")).toBeNull();
        // claude adds StructuredOutput for --json-schema.
        expect(checkInit({ ...init, tools: [...init.tools, "StructuredOutput"] }, "triage")).toBeNull();
        expect(checkInit({ ...init, permissionMode: "default" }, "triage")).toMatch(/permission mode/);
        expect(checkInit({ ...init, tools: [...init.tools, "Bash"] }, "triage")).toMatch(/read-only/);
        expect(checkInit({ ...init, tools: ["Read", "Grep"] }, "triage")).toMatch(/expected/);
        expect(checkInit({ ...init, tools: [...init.tools, "mcp__other__y"] }, "triage")).toMatch(/other MCP/);
        expect(checkInit({ ...init, mcp_servers: [] }, "triage")).toMatch(/MCP servers/);
        expect(checkInit({ ...init, mcp_servers: [{ name: "githerd", status: "failed" }] }, "triage")).toMatch(/MCP/);
    });

    it("classifies outcomes", () => {
        expect(classify({ killed: "timeout", result: null })).toEqual({ status: "failed", outcome: "timeout" });
        expect(classify({ killed: null, result: null })).toEqual({ status: "failed", outcome: "no-result" });
        expect(classify({ killed: null, result: { subtype: "error_max_turns", is_error: false } })).toEqual({
            status: "failed",
            outcome: "error_max_turns",
        });
        expect(classify({ killed: null, result: { subtype: "success", is_error: true } })).toEqual({
            status: "failed",
            outcome: "error",
        });
        expect(classify({ killed: null, result: { subtype: "success" } })).toEqual({
            status: "failed",
            outcome: "no-structured-output",
        });
        expect(classify({ killed: null, result: ok })).toEqual({ status: "ended", outcome: "done" });
        expect(classify({ killed: null, result: { ...ok, structured_output: { outcome: "failed" } } }).status).toBe(
            "failed",
        );
        expect(classify({ killed: "interrupted", result: ok }).status).toBe("interrupted");
        expect(consumesAttempt({ status: "failed" })).toBe(true);
        expect(consumesAttempt({ status: "interrupted" })).toBe(false);
        expect(consumesAttempt({ status: "lost" })).toBe(false);
    });

    it("admits runs within the daily budget, keeping one master-red run's share", () => {
        const now = new Date("2026-10-02T12:00:00Z");
        const st = (spent, running = []) => ({
            spend: { "2026-10-02": spent },
            runs: Object.fromEntries(running.map((r, i) => [`r${i}`, { status: "running", ...r }])),
        });
        const acting = (s, kind) => admit(s, CONFIG, "acting", kind, now);
        expect(acting(st(7.5), "triage").ok).toBe(true); // 7.5 + 1.5 = 9
        expect(acting(st(7.6), "triage").ok).toBe(false);
        expect(acting(st(9), "master-red").ok).toBe(true); // one master-red run always fits
        expect(acting(st(9.1), "master-red").ok).toBe(false);
        expect(acting(st(0, [{ kind: "pr-fix", budgetUsd: 4 }]), "pr-fix").ok).toBe(true);
        expect(acting(st(1, [{ kind: "pr-fix", budgetUsd: 4 }]), "pr-fix").ok).toBe(true); // 1 + 4 + 4 = 9
        expect(acting(st(1.1, [{ kind: "pr-fix", budgetUsd: 4 }]), "pr-fix").ok).toBe(false);
        expect(acting(st(0, [{ budgetUsd: 1 }, { budgetUsd: 1 }]), "triage")).toMatchObject({
            ok: false,
            reason: /2 runs/,
        });
        expect(acting(st(100), "retriage-candidates").ok).toBe(true);
        expect(admit(st(0), CONFIG, "paused", "triage", now).ok).toBe(false);
        // dry-run: $5 is smaller than a master-red run, so nothing is reserved and master-red never fits.
        expect(admit(st(3.5), CONFIG, "dry-run", "triage", now).ok).toBe(true);
        expect(admit(st(0), CONFIG, "dry-run", "master-red", now).ok).toBe(false);
    });

    it("writes the run git config without a credential helper", () => {
        const dir = mkdtempSync(join(tmpdir(), "githerd-gc-"));
        const file = writeRunGitconfig(dir, { name: "O", email: "o@x", signingKey: "ABC" });
        const text = readFileSync(file, "utf8");
        expect(text).toContain("gpgsign = true");
        expect(text).toContain("signingkey = ABC");
        expect(text).toMatch(/\[credential\]\n\thelper =\n/);
    });
});

describe("ownerIdentity", () => {
    beforeAll(() => isolateGit());

    it("reads the repository's name and email, and refuses a repository without them", () => {
        const repo = mkdtempSync(join(tmpdir(), "githerd-prompt-"));
        git(repo, "init", "-q", "-b", "master");
        git(repo, "config", "user.name", "Owner");
        git(repo, "config", "user.email", "o@example.com");
        expect(ownerIdentity(repo)).toEqual({ name: "Owner", email: "o@example.com", signingKey: null });
        const bare = mkdtempSync(join(tmpdir(), "githerd-noid-"));
        git(bare, "init", "-q");
        expect(() => ownerIdentity(bare)).toThrow(/user.name/);
    });
});

/**
 * Waits for a run and returns its record and what the fake saw.
 * @param {any} env the setup
 * @param {any} res the start answer
 * @returns {Promise<{record: any, seen: any}>} the record and the fake's view
 */
async function finish(env, res) {
    expect(res.ok).toBe(true);
    const runDir = join(env.dir, "runs", res.id);
    const seenFile = join(runDir, "fake-claude.json");
    const record = await res.done;
    if (record.process) groups.push(record.process.pid);
    const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, "utf8")) : null;
    return { record, seen };
}

describe("runs against fake-claude", () => {
    it("passes exactly the allowlisted environment and writes the run directory", async () => {
        const env = setup({ result: ok });
        const { record, seen } = await finish(env, start(env.runner, {}));
        const runDir = join(env.dir, "runs", record.id);
        expect(Object.keys(seen.env).sort()).toEqual(
            [
                "GITHERD_RUN_DIR",
                "GITHERD_RUN_ID",
                "GITHERD_RUN_KIND",
                "GIT_CONFIG_GLOBAL",
                "GNUPGHOME",
                "HOME",
                "LANG",
                "PATH",
            ].sort(),
        );
        expect(seen.env.GH_TOKEN).toBeUndefined();
        expect(Object.keys(seen.env).some((k) => k.startsWith("PUSHOVER_"))).toBe(false);
        expect(seen.cwd).toBe(join(runDir, "work"));
        const mcp = JSON.parse(readFileSync(join(runDir, "mcp.json"), "utf8"));
        expect(Object.keys(mcp.mcpServers)).toEqual(["githerd"]);
        expect(mcp.mcpServers.githerd.args).toEqual(["/pkg/bin/githerd-mcp.mjs"]);
        expect(mcp.mcpServers.githerd.env.GITHERD_RUN_TOKEN).toMatch(/^[0-9a-f]{64}$/);
        expect(readFileSync(join(runDir, "prompt.md"), "utf8")).toBe("hi");
        expect(JSON.parse(readFileSync(join(runDir, "result.schema.json"), "utf8")).required).toEqual([
            "outcome",
            "summary",
        ]);
        expect(record).toMatchObject({
            status: "ended",
            outcome: "done",
            costUsd: 0.42,
            numTurns: 3,
            sessionId: "sess-1",
        });
        expect(env.state.spend[record.startedAt.slice(0, 10)]).toBe(0.42);
        expect(JSON.parse(readFileSync(join(runDir, "result.json"), "utf8")).tokenHash).toBeUndefined();
        expect(readFileSync(join(runDir, "stream.jsonl"), "utf8")).toMatch(/"subtype":"init"/);
        expect(env.ledger.map((l) => l.kind)).toEqual(["run-start", "run-end"]);
        expect(env.ledger[1]).toMatchObject({ outcome: "done", untrusted: true, summary: "s" });
        expect(Object.keys(env.state.escalations)).toEqual([]);
    });

    it("kills a read-only kind whose init lists Bash", async () => {
        const env = setup({ init: { tools: ["Read", "Grep", "Glob", "Bash"] }, hang: true });
        const { record } = await finish(env, start(env.runner, {}));
        expect(record).toMatchObject({ status: "failed", outcome: "init-mismatch", costUsd: 1.5 });
        expect(env.state.escalations[`run-failed:${record.id}`].kind).toBe("run-failed");
    });

    it("kills a run whose init is in default mode", async () => {
        const env = setup({ init: { permissionMode: "default" }, hang: true });
        const { record } = await finish(env, start(env.runner, {}));
        expect(record.outcome).toBe("init-mismatch");
    });

    it("treats a result without an init line as an init mismatch", async () => {
        const env = setup({ init: null, result: ok });
        const { record } = await finish(env, start(env.runner, {}));
        expect(record.outcome).toBe("init-mismatch");
    });

    it("escalates a denial even when the run exits 0", async () => {
        const env = setup({
            result: { ...ok, permission_denials: [{ tool_name: "Bash", tool_input: { command: "git push" } }] },
            guardDenials: [{ tool: "Bash", reason: "git push is denied" }],
        });
        const { record } = await finish(env, start(env.runner, {}));
        expect(record.status).toBe("ended");
        expect(record.denials).toHaveLength(2);
        const esc = env.state.escalations[`denied:${record.id}`];
        expect(esc).toMatchObject({ kind: "denied", target: "issue:1" });
        expect(esc.detail).toContain("git push");
    });

    it("fails error_max_turns", async () => {
        const env = setup({ result: { subtype: "error_max_turns", is_error: false, total_cost_usd: 1.1 } });
        const { record } = await finish(env, start(env.runner, {}));
        expect(record).toMatchObject({ status: "failed", outcome: "error_max_turns", costUsd: 1.1 });
        expect(consumesAttempt(record)).toBe(true);
    });

    it("kills a backgrounded call at once", async () => {
        const env = setup({
            lines: [
                {
                    type: "assistant",
                    message: {
                        content: [
                            { type: "tool_use", name: "Bash", input: { command: "sleep 99", run_in_background: true } },
                        ],
                    },
                },
            ],
            hang: true,
        });
        const { record } = await finish(env, start(env.runner, { timeoutMs: 600_000 }));
        expect(record).toMatchObject({ status: "failed", outcome: "backgrounded" });
    });

    it("kills a hang at the timeout, with its whole process group, and charges the full budget", async () => {
        const env = setup({ hang: true });
        const res = start(env.runner, { timeoutMs: 300 });
        const { record } = await finish(env, res);
        expect(record).toMatchObject({ status: "failed", outcome: "timeout", costUsd: 1.5 });
        const grandchild = Number(readFileSync(join(env.dir, "runs", record.id, "grandchild.pid"), "utf8"));
        for (let i = 0; i < 50 && identify(grandchild); i++) await new Promise((r) => setTimeout(r, 20));
        expect(identify(grandchild)).toBeNull();
        expect(groupAlive(record.process.pid)).toBe(false);
    });

    it("never admits two runs together past the cap", async () => {
        const state = {
            runs: {},
            spend: { [new Date().toISOString().slice(0, 10)]: 2.5 },
            claims: {},
            escalations: {},
        };
        const env = setup({ result: ok }, { state });
        const a = start(env.runner, {});
        const b = start(env.runner, {});
        expect(a.ok).toBe(true); // 2.5 + 1.5 = 4 of the $5 dry-run budget
        expect(b).toMatchObject({ ok: false, reason: /exceeds/ }); // 4 + 1.5 would be 5.5
        await finish(env, a);
    });

    it("marks runs interrupted on shutdown and consumes no attempt", async () => {
        const env = setup({ hang: true });
        const res = start(env.runner, {});
        env.state.claims["issue:1"] = { target: "issue:1", holder: res.id };
        await new Promise((r) => setTimeout(r, 200));
        expect(env.runner.inFlight()).toEqual([res.id]);
        await env.runner.shutdown();
        const { record } = await finish(env, res);
        expect(record.status).toBe("interrupted");
        expect(consumesAttempt(record)).toBe(false);
        expect(env.state.claims["issue:1"]).toBeUndefined();
        expect(env.state.escalations).toEqual({});
    });

    it("removes servherd servers a run left inside its working directory", async () => {
        const calls = [];
        let runId = "";
        const env = setup(
            { result: ok },
            {
                servherd: async (args) => {
                    calls.push(args);
                    if (args[0] === "list") {
                        return {
                            servers: [
                                { server: { name: "left", cwd: join(env.dir, "runs", runId, "work", "sub") } },
                                { server: { name: "other", cwd: "/elsewhere" } },
                            ],
                        };
                    }
                    return {};
                },
            },
        );
        const res = start(env.runner, {});
        runId = res.id;
        await finish(env, res);
        expect(calls).toEqual([["list"], ["remove", "left", "-f"]]);
        expect(env.logs.some((l) => l.includes("left"))).toBe(true);
    });

    it("uses the given worktree for a code-editing kind and refuses one without", async () => {
        const env = setup({ result: ok }, { sandboxMissing: () => [] });
        const wt = mkdtempSync(join(tmpdir(), "githerd-wt-"));
        const { seen } = await finish(env, start(env.runner, { kind: "pr-fix", target: "pr:2", cwd: wt }));
        expect(seen.cwd).toBe(wt);
        expect(() => start(env.runner, { kind: "pr-fix", target: "pr:2" })).toThrow(/worktree/);
    });
});

describe("the Bash sandbox", () => {
    it("finds bwrap and socat on PATH and names the missing ones", () => {
        const dir = mkdtempSync(join(tmpdir(), "githerd-path-"));
        writeFileSync(join(dir, "bwrap"), "#!/bin/sh\n", { mode: 0o755 });
        writeFileSync(join(dir, "socat"), "not executable", { mode: 0o644 });
        expect(sandboxMissing(dir)).toEqual(["socat"]);
        expect(sandboxMissing(undefined)).toEqual(["bwrap", "socat"]);
        chmodSync(join(dir, "socat"), 0o755);
        expect(sandboxMissing(`/nonexistent:${dir}`)).toEqual([]);
    });

    it("refuses a code-editing run without it, and still starts a read-only one", async () => {
        const env = setup({ result: ok }, { sandboxMissing: () => ["bwrap"] });
        const wt = mkdtempSync(join(tmpdir(), "githerd-wt-"));
        const res = start(env.runner, { kind: "master-red", target: "master", cwd: wt });
        expect(res).toEqual({ ok: false, reason: expect.stringMatching(/code-editing runs are off.*bwrap/) });
        expect(env.state.runs).toEqual({});
        expect((await finish(env, start(env.runner, {}))).record.status).toBe("ended");
    });

    it("kills a code-editing run whose claude reports the sandbox disabled", async () => {
        const env = setup(
            { hang: true, stderr: "Sandbox disabled: dependencies are missing" },
            { sandboxMissing: () => [] },
        );
        const wt = mkdtempSync(join(tmpdir(), "githerd-wt-"));
        const { record } = await finish(env, start(env.runner, { kind: "pr-fix", target: "pr:2", cwd: wt }));
        expect(record).toMatchObject({ status: "failed", outcome: "sandbox-disabled" });
    });
});

describe("recoverRuns", () => {
    it("marks runs lost after a reboot and kills and interrupts a still-live run", async () => {
        const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)", "run-20261002-0001-aa"], {
            detached: true,
            stdio: "ignore",
        });
        groups.push(child.pid);
        const exited = once(child, "exit");
        const me = identify(child.pid);
        const state = {
            claims: { "pr:1": { target: "pr:1", holder: "run-20261002-0001-aa" } },
            runs: {
                "run-20261002-0001-aa": { status: "running", process: me },
                "run-20261002-0002-bb": { status: "running", process: { ...me, pid: 999999 } },
                "run-20261002-0003-cc": { status: "running", process: { ...me, bootId: "old" } },
                "run-20261002-0004-dd": { status: "ended" },
            },
        };
        const out = recoverRuns(state, { now: new Date(), bootId: me.bootId, killGraceMs: 100 });
        expect(out).toEqual({
            lost: ["run-20261002-0003-cc"],
            interrupted: ["run-20261002-0001-aa", "run-20261002-0002-bb"],
            killed: ["run-20261002-0001-aa"],
        });
        expect(state.claims).toEqual({});
        expect(state.runs["run-20261002-0004-dd"].status).toBe("ended");
        await exited;
    });
});
