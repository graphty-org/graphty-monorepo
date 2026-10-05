import { execFile, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runCli } from "../lib/cli.mjs";
import {
    createResponder,
    jobText,
    judge,
    parseWeekly,
    probeHook,
    probeMcp,
    resumeVerified,
    runSelftest,
    selftestText,
    serveResponder,
    writeProbe,
} from "../lib/selftest.mjs";

const GUARD = fileURLToPath(new URL("../bin/githerd-guard.mjs", import.meta.url));
const MODEL = "claude-opus-5-5";
const OWN = ["CLAUDECODE", "CLAUDE_CODE_SESSION_ID", "CLAUDE_PID", "CLAUDE_PROJECT_DIR"];
const BAR = String.fromCodePoint(0x2588).repeat(20);

/** The usage panel as Claude Code 2.1.289 drew it, the bars shortened. */
const USAGE = [
    "  Settings  Status   Config   Usage   Stats",
    "  Current session",
    `  ${BAR}             14% used`,
    "  Resets 12:10pm (UTC)",
    "  Current week (all models)",
    `  ${BAR}             76% used`,
    "  Resets Oct 8, 3pm (UTC)",
    "  Current week (Fable)",
    "                     0% used",
    "  Esc to cancel",
].join("\n");

let dir;
beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-selftest-"));
});
afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
});

const sleep = async () => {};

describe("createResponder", () => {
    it("blocks the first stop only, hands out the job and then the doorbell answer", () => {
        const r = createResponder({ org: "graphty-org", token: "TOK-1" });
        const env = { pushover: 0, claude: [] };
        expect(r.hook({ event: "SessionStart", input: {}, env })).toEqual({});
        expect(r.hook({ event: "Stop", input: {}, env }).block).toContain("TOK-1");
        expect(r.hook({ event: "Stop", input: {}, env })).toEqual({});
        expect(r.tool("githerd_next", {})).toBe(jobText("graphty-org"));
        expect(r.tool("githerd_next", {})).toMatch(/doorbell reached you/);
        expect(r.tool("githerd_claim", {})).toMatch(/Claimed/);
        expect(r.tool("githerd_wait", {})).toMatch(/Stop now/);
        expect(r.tool("githerd_push", {})).toMatch(/not part of the self-test/);
        expect(r.events).toHaveLength(8);
    });

    it("tells the worker to run gh pr create against a repository that does not exist", () => {
        expect(jobText("graphty-org")).toContain("gh pr create --repo graphty-org/githerd-selftest-missing");
    });
});

describe("the probes", () => {
    it("report a hook with what its process sees and print the answer as the real hook does", async () => {
        const r = createResponder({ org: "o", token: "TOK-2" });
        const server = await serveResponder(r);
        try {
            const env = { PUSHOVER_USER_KEY: "x", CLAUDE_PID: "1", CLAUDE_CODE_X: "1", HOME: "/h" };
            const out = await probeHook(server.url, "Stop", { input: '{"stop_hook_active":false}', env });
            expect(JSON.parse(/** @type {string} */ (out))).toMatchObject({ decision: "block" });
            expect(r.events[0]).toMatchObject({
                event: "Stop",
                input: { stop_hook_active: false },
                env: { pushover: 1, claude: ["CLAUDE_CODE_X", "CLAUDE_PID"] },
            });
            expect(await probeHook(server.url, "Stop", { input: "not json", env: {} })).toBeNull();
            const res = await fetch(`${server.url}/nothing`, { method: "POST", body: "{}" });
            expect(res.status).toBe(404);
        } finally {
            await server.close();
        }
        expect(await probeHook(server.url, "Stop", { input: "{}", env: {} })).toBeNull();
    });

    it("serve the thirteen tools over stdio and forward calls", async () => {
        const r = createResponder({ org: "o", token: "t" });
        const server = await serveResponder(r);
        const input = new PassThrough();
        /** @type {any[]} */
        const out = [];
        const done = probeMcp(server.url, { input, write: (l) => out.push(JSON.parse(l)) });
        input.write('{"jsonrpc":"2.0","id":1,"method":"tools/list"}\n\n');
        input.end('{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"githerd_next","arguments":{}}}\n');
        await done;
        await server.close();
        expect(out[0].result.tools).toHaveLength(13);
        expect(out[1].result.content[0].text).toBe(jobText("o"));
    });

    it("are installed where the generated settings point, with the real guard behind a symlink", async () => {
        const r = createResponder({ org: "o", token: "TOK-3" });
        const server = await serveResponder(r);
        try {
            writeProbe(dir, server.url);
            const bin = join(dir, "current", "bin");
            expect(realpathSync(join(bin, "githerd-guard.mjs"))).toBe(realpathSync(GUARD));
            // Asynchronously: the responder answers from this process.
            const child = promisify(execFile)(process.execPath, [join(bin, "githerd-hook.mjs"), "Stop"], {
                env: { PATH: process.env.PATH },
            });
            child.child.stdin?.end("{}");
            expect(JSON.parse((await child).stdout).reason).toContain("TOK-3");
            const mcp = spawnSync(process.execPath, [join(bin, "githerd-mcp.mjs")], {
                input: '{"jsonrpc":"2.0","id":1,"method":"ping"}\n',
                encoding: "utf8",
            });
            expect(JSON.parse(mcp.stdout)).toMatchObject({ id: 1, result: {} });
        } finally {
            await server.close();
        }
    });
});

describe("parseWeekly", () => {
    it("reads the all-models week and its reset", () => {
        expect(parseWeekly(USAGE)).toEqual({ percent: 76, resets: "Oct 8, 3pm (UTC)" });
    });

    it("is null when the panel does not show it", () => {
        expect(parseWeekly("nothing here")).toBeNull();
        expect(parseWeekly("  Current week (all models)\n  loading")).toBeNull();
        expect(parseWeekly(USAGE.replace("Resets Oct 8, 3pm (UTC)", "x"))).toEqual({ percent: 76, resets: null });
    });
});

/**
 * The events of a worker that did everything right.
 * @returns {any[]} the events
 */
function goodEvents() {
    const env = { pushover: 0, claude: OWN };
    const hook = (event, input) => ({ kind: "hook", event, input, env });
    return [
        hook("SessionStart", { source: "startup", model: MODEL, session_id: "s1" }),
        hook("UserPromptSubmit", { prompt: "You are a githerd worker." }),
        { kind: "tool", name: "githerd_next", args: {} },
        { kind: "tool", name: "githerd_claim", args: {} },
        hook("PostToolUse", { tool_name: "Bash", tool_input: { command: "gh pr create --repo o/x" } }),
        { kind: "tool", name: "githerd_wait", args: {} },
        hook("Stop", { last_assistant_message: "waiting" }),
        hook("Stop", { stop_hook_active: true, last_assistant_message: "TOK" }),
        hook("UserPromptSubmit", { prompt: "[githerd n0nce] job selftest has news. Call githerd_next." }),
        { kind: "tool", name: "githerd_next", args: {} },
        hook("Stop", { last_assistant_message: "RUNG" }),
        hook("SessionStart", { source: "resume", session_id: "s1" }),
    ];
}

/**
 * A clean run.
 * @returns {import("../lib/selftest.mjs").Observed} the tmux side
 */
function goodObserved() {
    return {
        started: true,
        startCapture: null,
        stuck: [],
        bashEnv: ["HOME", ...OWN],
        ghAllowed: true,
        ring: { rung: true },
        weekly: { percent: 76, resets: null },
        exit: "exit",
        registryGone: true,
        resumed: true,
    };
}

const judged = (events, observed) =>
    judge({ events, observed, model: MODEL, nonce: "n0nce", token: "TOK", allowedClaude: new Set(OWN) });

describe("judge", () => {
    it("passes a worker that did everything", () => {
        const checks = judged(goodEvents(), goodObserved());
        expect(checks.filter((c) => !c.ok)).toEqual([]);
        expect(checks).toHaveLength(11);
    });

    it("fails Pushover or an unexpected CLAUDE variable in a hook or the Bash tool", () => {
        const events = goodEvents();
        events[0] = { ...events[0], env: { pushover: 2, claude: [...OWN, "CLAUDE_EFFORT"] } };
        const env = judged(events, { ...goodObserved(), bashEnv: ["PUSHOVER_APP_TOKEN"] }).find((c) =>
            c.name.startsWith("hooks and the Bash tool"),
        );
        expect(env).toMatchObject({ ok: false, required: true });
        expect(env?.detail).toMatch(
            /Bash tool: 1 Pushover; hooks with Pushover: SessionStart; unexpected: CLAUDE_EFFORT/,
        );
        const none = judged(goodEvents(), { ...goodObserved(), bashEnv: null }).find((c) =>
            c.name.startsWith("hooks and the Bash tool"),
        );
        expect(none?.detail).toMatch(/not written/);
    });

    it("fails a missing token, a dialog, a wrong model, a doorbell not rung and a session not exited", () => {
        const events = goodEvents().filter((e) => e.input?.last_assistant_message !== "TOK");
        events[0] = { ...events[0], input: { source: "startup", model: "claude-haiku-4-5" } };
        const observed = {
            ...goodObserved(),
            stuck: [{ phase: "first turn", why: "waiting for permission prompt", capture: "Do you want to proceed?" }],
            ghAllowed: false,
            ring: { rung: false, why: "viewed" },
            exit: "sigterm",
            registryGone: false,
        };
        const failed = judged(events, observed)
            .filter((c) => !c.ok)
            .map((c) => c.name);
        expect(failed).toEqual([
            "SessionStart reaches githerd with the model",
            "no dialog blocks the worker",
            "githerd_next, githerd_claim and gh pr create run without a prompt",
            "a Stop block is obeyed",
            "githerd_wait idles",
            "the doorbell starts a turn and UserPromptSubmit sees the nonce",
            "/exit removes the registry entry",
            "resume restores the session",
        ]);
    });

    it("keeps resume and the weekly text soft, and reports a start that never registered", () => {
        const checks = judged([], {
            ...goodObserved(),
            started: false,
            startCapture: "New MCP server found",
            ring: null,
            weekly: null,
            exit: null,
            resumed: false,
        });
        const soft = checks.filter((c) => !c.required);
        expect(soft.map((c) => [c.name, c.ok])).toEqual([
            ["resume restores the session", false],
            ["the weekly-limit text is readable", false],
        ]);
        expect(checks[0].detail).toContain("New MCP server found");
        expect(checks.find((c) => c.name.startsWith("the doorbell"))?.detail).toBe("not rung: not tried");
    });
});

/**
 * A platform whose worker is played by this test through the probes, so the responder's HTTP side
 * and the hook probe run for real.
 * @param {{failStart?: boolean, failResume?: boolean, removeFails?: boolean, usage?: boolean}} [opts]
 *   which step fails, and whether the usage panel can be typed
 * @returns {{platform: import("../lib/selftest.mjs").Platform, calls: string[]}} the platform
 */
function fakePlatform(opts = {}) {
    /** @type {string[]} */
    const calls = [];
    let url = "";
    let pid = 100;
    /** @type {Map<number, any>} */
    const registry = new Map();
    const env = { CLAUDECODE: "1", CLAUDE_PID: "1" };
    const hook = async (event, input) => probeHook(url, event, { input: JSON.stringify(input), env });
    const tool = async (name) => {
        const res = await fetch(`${url}/tool`, { method: "POST", body: JSON.stringify({ name, args: {} }) });
        return (await res.json()).text;
    };
    /**
     * Plays a turn's end: the first stop is blocked, so the worker replies with the token.
     * @param {string} message the turn's last message
     */
    const stop = async (message) => {
        const out = await hook("Stop", { last_assistant_message: message });
        const reason = out ? JSON.parse(out).reason : null;
        if (reason) await hook("Stop", { stop_hook_active: true, last_assistant_message: reason.split(" ").at(-1) });
    };
    const window = (n) => ({ socket: "s", window: `@${n}`, pane: `%${n}`, pid: n, name: "githerd-selftest" });
    /** @type {import("../lib/selftest.mjs").Platform} */
    const platform = {
        claudeVersion: async () => "2.1.288",
        async serve(responder) {
            const server = await serveResponder(responder);
            url = server.url;
            return server;
        },
        async addWorktree(_root, wt) {
            calls.push("add");
            mkdirSync(wt, { recursive: true });
            return "abc123";
        },
        async removeWorktree(_root, wt) {
            calls.push("remove");
            if (opts.removeFails) return "it has changes";
            rmSync(wt, { recursive: true, force: true });
            return null;
        },
        loginPath: () => "/usr/bin",
        async start({ cwd, argv }) {
            const jobDir = argv[argv.indexOf("--settings") + 1].replace(/\/settings\.json$/, "");
            const n = ++pid;
            const resume = argv.includes("--resume");
            calls.push(resume ? "start resume" : "start");
            if ((opts.failStart && !resume) || (opts.failResume && resume)) {
                return { ok: false, window: window(n), capture: "a dialog" };
            }
            registry.set(n, { status: "idle", sessionId: "s1" });
            if (resume) {
                await hook("SessionStart", { source: "resume", session_id: "s1" });
                await stop("RESUMED");
            } else {
                await hook("SessionStart", { source: "startup", model: `${MODEL}[1m]`, session_id: "s1" });
                await tool("githerd_next");
                await tool("githerd_claim");
                writeFileSync(join(jobDir, "writes.jsonl"), '{"verb":"pr create","item":null}\n');
                writeFileSync(join(cwd, "githerd-selftest-env.txt"), "HOME\nCLAUDECODE\nnot a name=1\n");
                await tool("githerd_wait");
                await stop("waiting");
            }
            return { ok: true, window: window(n), startTime: "1", registry: registry.get(n) };
        },
        async ring(_w, { nonce, job }) {
            calls.push("ring");
            await hook("UserPromptSubmit", { prompt: `[githerd ${nonce}] job ${job} has news. Call githerd_next.` });
            await tool("githerd_next");
            await stop("RUNG");
            return { rung: true };
        },
        async type(_w, text) {
            calls.push(`type ${text}`);
            return { sent: opts.usage !== false };
        },
        key: (_w, key) => calls.push(`key ${key}`),
        capture: () => (calls.includes("key Escape") ? "" : USAGE),
        async end(w) {
            calls.push("end");
            registry.delete(w.pid);
            return "exit";
        },
        registry: (n) => registry.get(n) ?? null,
        running: (n) => registry.has(n),
        killServer: () => calls.push("kill"),
    };
    return { platform, calls };
}

describe("runSelftest", () => {
    it("drives a worker through every phase, cleans up and writes selftest.json", async () => {
        const { platform, calls } = fakePlatform();
        const state = join(dir, "state");
        const result = await runSelftest({
            root: dir,
            stateDir: state,
            repo: "graphty-org/graphty-monorepo",
            model: MODEL,
            env: { HOME: dir },
            platform,
            sleep,
            now: () => new Date("2026-10-04T00:00:00Z"),
            turnMs: 3000,
        });
        expect(result.checks.filter((c) => !c.ok)).toEqual([]);
        expect(result).toMatchObject({ passed: true, resumeVerified: true, claudeVersion: "2.1.288", leftovers: [] });
        expect(result.weekly).toEqual({ percent: 76, resets: "Oct 8, 3pm (UTC)" });
        expect(calls).toEqual([
            "add",
            "start",
            "ring",
            "type /usage",
            "key Escape",
            "end",
            "start resume",
            "end",
            "kill",
            "remove",
        ]);
        expect(JSON.parse(readFileSync(join(state, "selftest.json"), "utf8")).at).toBe("2026-10-04T00:00:00.000Z");
        const settings = JSON.parse(readFileSync(join(state, "selftest", "jobs", "selftest", "settings.json"), "utf8"));
        expect(settings.hooks.Stop[0].hooks[0].command).toContain(join(state, "selftest", "current", "bin"));
        expect(selftestText(result)[0]).toBe("githerd self-test on Claude Code 2.1.288 with claude-opus-5-5: passed");
    });

    it("fails a start that never registers and still removes what it made", async () => {
        const { platform, calls } = fakePlatform({ failStart: true, removeFails: true });
        const result = await runSelftest({
            root: dir,
            stateDir: join(dir, "state"),
            repo: "o/r",
            model: MODEL,
            env: { HOME: dir },
            platform,
            sleep,
        });
        expect(result.passed).toBe(false);
        expect(calls).toEqual(["add", "start", "kill", "remove"]);
        expect(result.leftovers[0]).toMatch(/not removed: it has changes/);
        expect(selftestText(result).some((l) => l.startsWith("  FAIL registry entry appears"))).toBe(true);
        expect(selftestText(result).at(-1)).toMatch(/^ {2}note worktree/);
    });

    it("marks resume unverified and the weekly limit display-only without failing", async () => {
        const { platform } = fakePlatform({ failResume: true, usage: false });
        const result = await runSelftest({
            root: dir,
            stateDir: join(dir, "state"),
            repo: "o/r",
            model: MODEL,
            env: { HOME: dir },
            platform,
            sleep,
        });
        expect(result).toMatchObject({ passed: true, resumeVerified: false, weekly: null });
        expect(selftestText(result).filter((l) => l.startsWith("  soft"))).toHaveLength(2);
    });

    it("records a turn that never ends as stuck, with the pane", async () => {
        const { platform } = fakePlatform();
        platform.registry = () => ({ status: "busy" });
        const result = await runSelftest({
            root: dir,
            stateDir: join(dir, "state"),
            repo: "o/r",
            model: MODEL,
            env: { HOME: dir },
            platform,
            sleep,
            turnMs: 2000,
        });
        const dialog = result.checks.find((c) => c.name === "no dialog blocks the worker");
        expect(dialog?.detail).toMatch(/^first turn: not idle after 2 s/);
        expect(result.passed).toBe(false);
    });

    it("stops a phase on a dialog", async () => {
        const { platform } = fakePlatform();
        platform.registry = () => ({ status: "waiting", waitingFor: "permission prompt" });
        const result = await runSelftest({
            root: dir,
            stateDir: join(dir, "state"),
            repo: "o/r",
            model: MODEL,
            env: { HOME: dir },
            platform,
            sleep,
        });
        expect(result.checks.find((c) => c.name === "no dialog blocks the worker")?.detail).toMatch(
            /waiting for permission prompt/,
        );
    });

    it("refuses to reuse a worktree an earlier run left", async () => {
        const { platform, calls } = fakePlatform();
        mkdirSync(join(dir, ".worktrees", "githerd-selftest"), { recursive: true });
        const result = await runSelftest({
            root: dir,
            stateDir: join(dir, "state"),
            repo: "o/r",
            model: MODEL,
            env: { HOME: dir },
            platform,
            sleep,
        });
        expect(result.passed).toBe(false);
        expect(result.leftovers[0]).toMatch(/^aborted: .* exists/);
        expect(calls).toEqual(["kill"]);
    });
});

describe("resumeVerified", () => {
    const write = (record) => writeFileSync(join(dir, "selftest.json"), JSON.stringify(record));

    it("is true only for a passed self-test that verified resume on the installed version", async () => {
        expect(await resumeVerified(dir, async () => "2.1.288")).toBe(false);
        write({ passed: true, resumeVerified: true, claudeVersion: "2.1.288" });
        expect(await resumeVerified(dir, async () => "2.1.288")).toBe(true);
        expect(await resumeVerified(dir, async () => "2.1.289")).toBe(false);
        expect(
            await resumeVerified(dir, async () => {
                throw new Error("no claude");
            }),
        ).toBe(false);
        write({ passed: false, resumeVerified: true, claudeVersion: "2.1.288" });
        let asked = false;
        expect(
            await resumeVerified(dir, async () => {
                asked = true;
                return "2.1.288";
            }),
        ).toBe(false);
        expect(asked).toBe(false);
    });
});

describe("githerd selftest", () => {
    it("runs with the configured repository and model and exits by the result", async () => {
        const config = fileURLToPath(new URL("../../githerd.config.json", import.meta.url));
        spawnSync("git", ["init", "-q", dir]);
        /** @type {string[]} */
        const out = [];
        /** @type {any[]} */
        const seen = [];
        const env = { HOME: dir, GITHERD_CONFIG: config, GITHERD_STATE_DIR: join(dir, "state") };
        const run = (passed) =>
            runCli(["selftest"], {
                cwd: dir,
                env,
                out: (l) => out.push(l),
                err: (l) => out.push(l),
                selftest: async (o) => {
                    seen.push(o);
                    o.log?.("starting");
                    return { ...goodResult(), passed };
                },
            });
        expect(await run(true)).toBe(0);
        expect(await run(false)).toBe(1);
        expect(seen[0]).toMatchObject({ repo: "graphty-org/graphty-monorepo", model: MODEL });
        expect(out).toContain("... starting");
        expect(out.some((l) => l.includes("FAILED"))).toBe(true);
    });

    it("refuses without a config", async () => {
        spawnSync("git", ["init", "-q", dir]);
        /** @type {string[]} */
        const err = [];
        const code = await runCli(["selftest"], {
            cwd: dir,
            env: { HOME: dir },
            out: () => {},
            err: (l) => err.push(l),
        });
        expect(code).toBe(2);
        expect(err[0]).toMatch(/^githerd selftest: githerd is not configured/);
        expect(existsSync(join(dir, "state"))).toBe(false);
    });
});

/**
 * A passing result.
 * @returns {import("../lib/selftest.mjs").Result} the result
 */
function goodResult() {
    return {
        at: "2026-10-04T00:00:00.000Z",
        claudeVersion: "2.1.288",
        model: MODEL,
        passed: true,
        resumeVerified: true,
        weekly: null,
        checks: [],
        leftovers: [],
    };
}
