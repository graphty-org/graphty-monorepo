/**
 * The platform self-test (design section 11.4): one worker on its own tmux server, started with the
 * real worker command line (`env -i`, the generated `--settings` and `--mcp-config`, a fresh
 * worktree under `.worktrees/`) and the configured model, driven through every platform behavior
 * githerd relies on. It checks Claude Code, not githerd's daemon: the worker's hooks and MCP server
 * are probes that report to a responder in this process, while the guard is the installed one,
 * reached through a symlink as `current/` is.
 *
 * The probes reuse the real pieces where the wire format matters: the MCP probe is `createMcpServer`
 * with the eleven tools' schemas, and the hook probe prints `hookOutput`'s JSON.
 *
 * The result is written to `selftest.json` in the state directory. Resume is soft: when it fails,
 * the result says resume is unverified and a dead worker's next session starts fresh (design 7.7).
 * The weekly-limit text is soft too: unreadable, the limit is display-only.
 */

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { hookOutput, LAUNCH_PROMPT } from "./hook.mjs";
import { createMcpServer, TOOLS } from "./mcp.mjs";
import { readScreen } from "./screen.mjs";
import {
    capturePane,
    endSession,
    killServer,
    pressKey,
    readRegistry,
    ring,
    running,
    startWorker,
    typeLine,
} from "./tmux.mjs";
import { loginPath, readSigningEnv, workerArgv, workerEnv, writeJobFiles } from "./worker-settings.mjs";
import { jobWorktreeDir, removeJobWorktree, run } from "./worktrees.mjs";

/** The self-test's own tmux server, never githerd's. */
const SOCKET = "githerd-selftest";
/** The self-test's job id: window `selftest`, session `githerd-selftest`. */
const JOB = "selftest";
/** The file the worker writes its Bash tool's variable names to, in its worktree. */
const ENV_FILE = "githerd-selftest-env.txt";
/** How long one turn of the worker may take. */
const TURN_MS = 10 * 60 * 1000;
/** How long the usage panel and the registry's removal may take. */
const SHORT_MS = 15_000;
const POLL_MS = 1000;
/** How long a probe waits for the responder. */
const PROBE_WAIT_MS = 5000;

/**
 * The `CLAUDE*` variables Claude Code sets itself in every hook and Bash process (platform facts
 * 7.2 and 10.12; `CLAUDE_EFFORT` since 2.1.289, whose binary says it is "exposed to hook commands
 * and Bash"). A new name fails the self-test until it is looked at and added here.
 */
const CLAUDE_OWN = new Set([
    "CLAUDECODE",
    "CLAUDE_CODE_CHILD_SESSION",
    "CLAUDE_CODE_ENTRYPOINT",
    "CLAUDE_CODE_EXECPATH",
    "CLAUDE_CODE_MESSAGING_SOCKET",
    "CLAUDE_CODE_MESSAGING_TOKEN",
    "CLAUDE_CODE_SESSION_ATTENDED",
    "CLAUDE_CODE_SESSION_ID",
    "CLAUDE_EFFORT",
    "CLAUDE_ENV_FILE",
    "CLAUDE_PID",
    "CLAUDE_PROJECT_DIR",
]);

const GUARD = fileURLToPath(new URL("../bin/githerd-guard.mjs", import.meta.url));
const SELF = pathToFileURL(fileURLToPath(import.meta.url)).href;

/**
 * @typedef {object} HookReport what the hook probe sends: the event, Claude Code's input, and what
 *   the hook process could see of its environment
 * @property {string} event the hook event
 * @property {any} input the hook input
 * @property {{pushover: number, claude: string[]}} env the number of `PUSHOVER*` variables and the
 *   `CLAUDE*` names
 */

/**
 * @typedef {{kind: "hook", event: string, input: any, env: HookReport["env"]} |
 *   {kind: "tool", name: string, args: any}} Event one thing the worker did
 */

/**
 * @typedef {object} Check one line of the result
 * @property {string} name what was checked
 * @property {boolean} ok whether it held
 * @property {boolean} required whether a failure fails the self-test
 * @property {string} detail what was seen
 */

/**
 * @typedef {object} Result the self-test's record (`selftest.json`)
 * @property {string} at when it ran
 * @property {string} claudeVersion the Claude Code version it ran on
 * @property {string} model the configured model
 * @property {boolean} passed every required check held
 * @property {boolean} resumeVerified a dead worker's session may be resumed on this version
 * @property {{percent: number, resets: string | null} | null} weekly the weekly limit, when readable
 * @property {Check[]} checks every check
 * @property {string[]} leftovers what could not be cleaned up
 */

/**
 * What the worker is told to do, step by step (`githerd_next`'s first answer).
 * @param {string} org the configured repository's owner
 * @returns {string} the text
 */
export function jobText(org) {
    return [
        `githerd platform self-test, job ${JOB}. This checks the worker platform; it is not real work.`,
        "Do exactly these steps, in order, and nothing else:",
        `1. Call githerd_claim with job "${JOB}", snapshotVersion 1, overlap {"decision": "independent", ` +
            '"reason": "self-test"} and plan "self-test".',
        "2. Run this with the Bash tool. It fails because that repository does not exist, which is expected:",
        `   gh pr create --repo ${org}/githerd-selftest-missing --head githerd-selftest-missing --base master ` +
            '--title "githerd self-test" --body "githerd self-test"',
        `3. Run this with the Bash tool: env | cut -d= -f1 | sort > ${ENV_FILE}`,
        `4. Call githerd_wait with job "${JOB}", for "local", target "${JOB}" and reason "self-test".`,
        "5. Stop.",
    ].join("\n");
}

/** `githerd_next`'s answer after the doorbell. */
const RUNG = "githerd self-test: the doorbell reached you. Reply with the single word RUNG and stop.";
/** The prompt of the resumed session. */
const RESUME_PROMPT = "githerd self-test: this session was resumed. Reply with the single word RESUMED and stop.";

/**
 * The responder: githerd's side of the self-test, recording every event and answering it.
 * @param {{org: string, token: string}} options the configured repository's owner, and the token the
 *   Stop gate asks the worker to reply with
 * @returns {{events: Event[], hook: (r: HookReport) => import("./hook.mjs").HookAnswer,
 *   tool: (name: string, args: any) => string}} the recorded events and the two answerers
 */
export function createResponder({ org, token }) {
    /** @type {Event[]} */
    const events = [];
    let blocked = false;
    let nexts = 0;
    return {
        events,
        hook({ event, input, env }) {
            events.push({ kind: "hook", event, input, env });
            if (event !== "Stop" || blocked) return {};
            blocked = true;
            return { block: `githerd self-test: before you stop, reply with the exact line ${token}` };
        },
        tool(name, args) {
            events.push({ kind: "tool", name, args });
            if (name === "githerd_next") return ++nexts === 1 ? jobText(org) : RUNG;
            if (name === "githerd_claim") return `Claimed job ${JOB}. Go on with step 2.`;
            if (name === "githerd_wait") return "Waiting. Stop now; githerd rings this session when it changes.";
            return `githerd self-test: ${name} is not part of the self-test; do not call it.`;
        },
    };
}

/**
 * Serves a responder on 127.0.0.1: `POST /hook` takes a {@link HookReport} and answers a
 * `HookAnswer`; `POST /tool` takes `{name, args}` and answers `{text}`.
 * @param {ReturnType<typeof createResponder>} responder the responder
 * @returns {Promise<{url: string, close: () => Promise<void>}>} its address and its stopper
 */
export async function serveResponder(responder) {
    const server = createServer(async (req, res) => {
        let body;
        try {
            body = JSON.parse(Buffer.concat(await req.toArray()).toString("utf8"));
        } catch {
            body = null;
        }
        let reply = null;
        if (req.method === "POST" && req.url === "/hook" && body) reply = responder.hook(body);
        if (req.method === "POST" && req.url === "/tool" && body)
            reply = { text: responder.tool(body.name, body.args) };
        res.writeHead(reply ? 200 : 404, { "content-type": "application/json" });
        res.end(JSON.stringify(reply ?? { error: "not found" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(undefined)));
    const { port } = /** @type {import("node:net").AddressInfo} */ (server.address());
    return {
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((resolve) => server.close(() => resolve(undefined))),
    };
}

/**
 * Posts JSON to the responder.
 * @param {string} url where
 * @param {object} body what
 * @param {typeof fetch} fetcher the fetch function
 * @returns {Promise<any>} the answer
 */
async function post(url, body, fetcher) {
    const res = await fetcher(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(PROBE_WAIT_MS),
    });
    return res.json();
}

/**
 * The hook probe: reports the event and what its process can see, and prints the answer the way the
 * real hook does.
 * @param {string} url the responder
 * @param {string} event the hook event
 * @param {{input: string, env: Record<string, string | undefined>, fetch?: typeof fetch}} options
 *   Claude Code's JSON, the hook's environment, and for tests the fetch function
 * @returns {Promise<string | null>} the JSON to print, or null for nothing
 */
export async function probeHook(url, event, { input, env, fetch: fetcher = fetch }) {
    let parsed = {};
    try {
        parsed = JSON.parse(input);
    } catch {
        // no input
    }
    const names = Object.keys(env);
    const report = {
        event,
        input: parsed,
        env: {
            pushover: names.filter((n) => n.startsWith("PUSHOVER")).length,
            claude: names.filter((n) => n.startsWith("CLAUDE")).sort((a, b) => a.localeCompare(b)),
        },
    };
    try {
        return hookOutput(event, await post(`${url}/hook`, report, fetcher));
    } catch {
        return null;
    }
}

/**
 * The MCP probe: the eleven tools with their real schemas over stdio, each call answered by the
 * responder.
 * @param {string} url the responder
 * @param {{input: NodeJS.ReadableStream, write: (line: string) => void, fetch?: typeof fetch}} options
 *   standard input, a writer of one line to standard output, and for tests the fetch function
 * @returns {Promise<void>} when the input ends
 */
export async function probeMcp(url, { input, write, fetch: fetcher = fetch }) {
    const server = createMcpServer({
        serverInfo: { name: "githerd", version: "selftest" },
        tools: () =>
            TOOLS.map((tool) => ({
                ...tool,
                handler: async (/** @type {any} */ args) =>
                    (await post(`${url}/tool`, { name: tool.name, args }, fetcher)).text,
            })),
    });
    for await (const line of createInterface({ input, crlfDelay: Infinity })) {
        if (!line.trim()) continue;
        const reply = await server.handle(line);
        if (reply) write(JSON.stringify(reply));
    }
}

/**
 * Writes the installed-copy layout the generated settings point at, `<dir>/current/bin/`: the
 * hook and MCP probes, which know the responder's address, and the real guard through a symlink.
 * @param {string} dir the self-test's state directory
 * @param {string} url the responder
 */
export function writeProbe(dir, url) {
    const bin = join(dir, "current", "bin");
    mkdirSync(bin, { recursive: true });
    const hook = [
        'import { text } from "node:stream/consumers";',
        `import { probeHook } from ${JSON.stringify(SELF)};`,
        `const out = await probeHook(${JSON.stringify(url)}, process.argv[2] ?? "", { input: await text(process.stdin), env: process.env });`,
        "if (out) process.stdout.write(`${out}\\n`);",
        "",
    ];
    const mcp = [
        `import { probeMcp } from ${JSON.stringify(SELF)};`,
        `await probeMcp(${JSON.stringify(url)}, { input: process.stdin, write: (l) => process.stdout.write(\`\${l}\\n\`) });`,
        "process.exit(0);",
        "",
    ];
    writeFileSync(join(bin, "githerd-hook.mjs"), hook.join("\n"));
    writeFileSync(join(bin, "githerd-mcp.mjs"), mcp.join("\n"));
    symlinkSync(GUARD, join(bin, "githerd-guard.mjs"));
}

/**
 * The weekly limit as the usage panel (`/usage`) shows it: the percentage under "Current week (all
 * models)" and its reset time.
 * @param {string} capture the pane
 * @returns {{percent: number, resets: string | null} | null} the limit, or null when not shown
 */
export function parseWeekly(capture) {
    const lines = capture.split("\n").map((l) => l.trim());
    const at = lines.findIndex((l) => l.startsWith("Current week (all models)"));
    if (at < 0) return null;
    const used = lines
        .slice(at + 1, at + 3)
        .filter((l) => l.endsWith("% used"))
        .map((l) => Number(l.slice(0, -"% used".length).split(" ").at(-1)))
        .find((n) => Number.isInteger(n));
    if (used === undefined) return null;
    const resets = lines.slice(at + 1, at + 4).find((l) => l.startsWith("Resets "));
    return { percent: used, resets: resets ? resets.slice("Resets ".length) : null };
}

/**
 * Reads a file, missing counting as empty.
 * @param {string} file the path
 * @returns {string} the text
 */
function readText(file) {
    try {
        return readFileSync(file, "utf8");
    } catch {
        return "";
    }
}

/**
 * The `CLAUDE*` names the owner's user settings put in every session's environment.
 * @param {string} home the owner's home directory
 * @returns {string[]} the names
 */
function userClaudeNames(home) {
    try {
        const env = JSON.parse(readFileSync(join(home, ".claude", "settings.json"), "utf8")).env ?? {};
        return Object.keys(env).filter((n) => n.startsWith("CLAUDE"));
    } catch {
        return [];
    }
}

/**
 * What the tmux side saw: each phase's outcome.
 * @typedef {object} Observed
 * @property {boolean} started the registry entry appeared
 * @property {string | null} startCapture the pane of a start that did not
 * @property {{phase: string, why: string, capture: string}[]} stuck phases that did not end idle
 * @property {string[] | null} bashEnv the names the Bash tool saw, null when the file was not written
 * @property {boolean} ghAllowed the guard let `gh pr create` through (its write log): a failing
 *   command fires no PostToolUse, so the hooks never see it
 * @property {{rung: boolean, why?: string} | null} ring the doorbell
 * @property {{percent: number, resets: string | null} | null} weekly the weekly limit
 * @property {string | null} exit how the session ended (`exit`, `sigterm`, `gone`)
 * @property {boolean} registryGone the registry entry was gone after `/exit`
 * @property {boolean} resumed the resumed session started
 */

/**
 * Judges what was recorded (design 11.4).
 * @param {{events: Event[], observed: Observed, model: string, nonce: string, token: string,
 *   allowedClaude: Set<string>}} record the responder's events, the tmux side, the configured
 *   model, the doorbell nonce, the Stop gate's token, and the `CLAUDE*` names allowed
 * @returns {Check[]} the checks
 */
export function judge(record) {
    return [...startChecks(record), envCheck(record), ...turnChecks(record), ...endChecks(record)];
}

/**
 * One check.
 * @param {string} name what was checked
 * @param {boolean} ok whether it held
 * @param {string} detail what was seen
 * @param {boolean} [required] whether a failure fails the self-test
 * @returns {Check} the check
 */
function check(name, ok, detail, required = true) {
    return { name, ok, required, detail };
}

/**
 * The hook events of one kind.
 * @param {Event[]} events the events
 * @param {string} event the hook event
 * @returns {Extract<Event, {kind: "hook"}>[]} its events
 */
function hooksOf(events, event) {
    return /** @type {Extract<Event, {kind: "hook"}>[]} */ (
        events.filter((e) => e.kind === "hook" && e.event === event)
    );
}

/**
 * Where a tool was first called at or after an event.
 * @param {Event[]} events the events
 * @param {string} name the tool
 * @param {number} [from] the first event to look at
 * @returns {number} its index, -1 when not called
 */
function toolAt(events, name, from = 0) {
    return events.findIndex((e, i) => i >= from && e.kind === "tool" && e.name === name);
}

/**
 * The start: the registry entry, SessionStart with the model, no dialog, and the first calls.
 * @param {Parameters<typeof judge>[0]} record as for {@link judge}
 * @returns {Check[]} the checks
 */
function startChecks({ events, observed, model }) {
    const startup = hooksOf(events, "SessionStart").find((h) => h.input.source === "startup");
    const seenModel = startup?.input.model ?? null;
    const called = ["githerd_next", "githerd_claim"].filter((n) => toolAt(events, n) >= 0);
    const stuck = observed.stuck.map((s) => `${s.phase}: ${s.why}\n${s.capture}`).join("\n");
    return [
        check(
            "registry entry appears",
            observed.started,
            observed.started ? "yes" : `no entry; pane:\n${observed.startCapture ?? ""}`,
        ),
        check(
            "SessionStart reaches githerd with the model",
            typeof seenModel === "string" && seenModel.startsWith(model),
            startup ? `model ${seenModel}` : "no SessionStart",
        ),
        check("no dialog blocks the worker", observed.started && observed.stuck.length === 0, stuck || "none"),
        check(
            "githerd_next, githerd_claim and gh pr create run without a prompt",
            called.length === 2 && observed.ghAllowed && observed.stuck.length === 0,
            `called ${called.join(", ") || "nothing"}; gh pr create ${observed.ghAllowed ? "ran" : "did not run"}`,
        ),
    ];
}

/**
 * What hooks and the Bash tool see of their environment.
 * @param {Parameters<typeof judge>[0]} record as for {@link judge}
 * @returns {Check} the check
 */
function envCheck({ events, observed, allowedClaude }) {
    const hooks = /** @type {Extract<Event, {kind: "hook"}>[]} */ (events.filter((e) => e.kind === "hook"));
    const bash = observed.bashEnv ?? [];
    const pushover = hooks.filter((h) => h.env.pushover > 0).map((h) => h.event);
    const names = new Set([...hooks.flatMap((h) => h.env.claude), ...bash.filter((n) => n.startsWith("CLAUDE"))]);
    const extra = [...names].filter((n) => !allowedClaude.has(n)).sort((a, b) => a.localeCompare(b));
    const bashPushover = bash.filter((n) => n.startsWith("PUSHOVER")).length;
    const written = observed.bashEnv !== null;
    const bashText = written ? `Bash tool: ${bashPushover} Pushover` : "the Bash tool's variables were not written";
    return check(
        "hooks and the Bash tool see no Pushover or unexpected CLAUDE variable",
        written && hooks.length > 0 && pushover.length === 0 && bashPushover === 0 && extra.length === 0,
        `${bashText}; hooks with Pushover: ${pushover.join(", ") || "none"}; unexpected: ${extra.join(", ") || "none"}`,
    );
}

/**
 * The turns: the Stop block, the wait, the doorbell.
 * @param {Parameters<typeof judge>[0]} record as for {@link judge}
 * @returns {Check[]} the checks
 */
function turnChecks({ events, observed, nonce, token }) {
    const stops = hooksOf(events, "Stop");
    const obeyed = stops.slice(1).some((h) => (h.input.last_assistant_message ?? "").includes(token));
    const waited = toolAt(events, "githerd_wait") >= 0;
    const prompt = hooksOf(events, "UserPromptSubmit").find((h) => (h.input.prompt ?? "").includes(nonce));
    const woke = prompt !== undefined && toolAt(events, "githerd_next", events.indexOf(prompt)) >= 0;
    const rung = observed.ring?.rung === true;
    const bell = `nonce ${prompt ? "seen" : "not seen"}; githerd_next ${woke ? "called" : "not called"}`;
    return [
        check("a Stop block is obeyed", obeyed, `${stops.length} stops; token ${obeyed ? "replied" : "missing"}`),
        check(
            "githerd_wait idles",
            waited && !observed.stuck.some((s) => s.phase === "first turn"),
            waited ? "called, then idle" : "githerd_wait not called",
        ),
        check(
            "the doorbell starts a turn and UserPromptSubmit sees the nonce",
            rung && woke,
            rung ? bell : `not rung: ${observed.ring?.why ?? "not tried"}`,
        ),
    ];
}

/**
 * The end: `/exit`, resume and the weekly limit; the last two are soft.
 * @param {Parameters<typeof judge>[0]} record as for {@link judge}
 * @returns {Check[]} the checks
 */
function endChecks({ events, observed }) {
    const starts = hooksOf(events, "SessionStart");
    const first = starts.find((h) => h.input.source === "startup")?.input.session_id;
    const resume = starts.find((h) => h.input.source === "resume");
    const same = resume?.input.session_id === first;
    const session = same ? "same" : "another";
    const weekly = observed.weekly;
    return [
        check(
            "/exit removes the registry entry",
            observed.exit === "exit" && observed.registryGone,
            `ended by ${observed.exit ?? "nothing"}; entry ${observed.registryGone ? "gone" : "still there"}`,
        ),
        check(
            "resume restores the session",
            observed.resumed && resume !== undefined && same,
            resume ? `SessionStart resume, ${session} session` : "no SessionStart resume",
            false,
        ),
        check(
            "the weekly-limit text is readable",
            weekly !== null,
            weekly ? `${weekly.percent}% used, resets ${weekly.resets ?? "unknown"}` : "not shown: display-only",
            false,
        ),
    ];
}

/**
 * Everything the self-test does outside this process; tests replace it.
 * @typedef {object} Platform
 * @property {() => Promise<string>} claudeVersion `claude --version`
 * @property {(responder: ReturnType<typeof createResponder>) => Promise<{url: string, close: () => Promise<void>}>} serve serves the responder
 * @property {(root: string, dir: string) => Promise<string>} addWorktree adds the worktree detached
 *   at HEAD and answers its commit
 * @property {(root: string, dir: string, base: string) => Promise<string | null>} removeWorktree
 *   null when removed, else why not
 * @property {() => string} loginPath the owner's login shell PATH
 * @property {(o: {job: string, cwd: string, argv: string[], socket: string}) => ReturnType<typeof startWorker>} start starts a window
 * @property {typeof ring} ring rings the doorbell
 * @property {(w: import("./tmux.mjs").Window, text: string) => Promise<{sent: boolean}>} type types one line
 * @property {typeof pressKey} key sends one key
 * @property {typeof capturePane} capture reads the pane
 * @property {(w: import("./tmux.mjs").Window & {startTime: string}) => Promise<string>} end ends the session
 * @property {(pid: number) => any} registry reads the registry entry
 * @property {typeof running} running whether the session runs
 * @property {(socket: string) => void} killServer removes the tmux server
 */

/**
 * The real platform.
 * @param {Record<string, string | undefined>} env the environment
 * @returns {Platform} it
 */
function realPlatform(env) {
    const home = env.HOME ?? homedir();
    return {
        async claudeVersion() {
            const r = await run("claude", ["--version"], { cwd: home, env, timeoutMs: 30_000 });
            const version = /^(\d+\.\d+\.\d+)/.exec(r.stdout.trim())?.[1];
            if (r.code !== 0 || !version) throw new Error(`claude --version: ${(r.stderr || r.stdout).trim()}`);
            return version;
        },
        serve: serveResponder,
        async addWorktree(root, dir) {
            // LFS files are not needed to start a session; skipping them keeps the checkout fast.
            const lfsOff = { ...env, GIT_LFS_SKIP_SMUDGE: "1" };
            const add = await run("git", ["worktree", "add", "--detach", dir, "HEAD"], { cwd: root, env: lfsOff });
            if (add.code !== 0) throw new Error(`git worktree add: ${add.stderr.trim()}`);
            return (await run("git", ["rev-parse", "HEAD"], { cwd: dir, env })).stdout.trim();
        },
        async removeWorktree(root, dir, base) {
            const r = await removeJobWorktree({ root, job: JOB, dir, base, env, ledger: async () => {} });
            return "reason" in r ? r.reason : null;
        },
        loginPath: () => loginPath({ shell: env.SHELL ?? "/bin/bash", home, user: env.USER ?? "", lang: env.LANG }),
        start: (o) => startWorker(o),
        ring,
        type: (w, text) => typeLine(w, text),
        key: pressKey,
        capture: capturePane,
        end: (w) => endSession(w),
        registry: (pid) => readRegistry(join(home, ".claude", "sessions"), pid),
        running,
        killServer,
    };
}

/**
 * Removes what a self-test killed mid-run leaves behind: its tmux server (and the worker in it) and
 * its worktree, whose removal git refuses while it holds changes other than the probe's file.
 * @param {string} root the main checkout
 * @param {Record<string, string | undefined>} env the environment
 * @returns {Promise<string | null>} why the worktree could not be removed, or null
 */
export async function reapSelftest(root, env) {
    killServer(SOCKET);
    const wt = jobWorktreeDir(root, JOB);
    if (!existsSync(wt)) return null;
    rmSync(join(wt, ENV_FILE), { force: true });
    const r = await run("git", ["worktree", "remove", wt], { cwd: root, env });
    return r.code === 0 ? null : (r.stderr || r.stdout).trim();
}

/**
 * Runs the platform self-test and writes `selftest.json`.
 * @param {{root: string, stateDir: string, repo: string, model: string,
 *   env?: Record<string, string | undefined>, platform?: Platform,
 *   sleep?: (ms: number) => Promise<unknown>, now?: () => Date, log?: (line: string) => void,
 *   turnMs?: number}} options the main checkout, githerd's state directory, the configured
 *   repository and model, the environment the worker's is built from, and for tests the platform,
 *   the clock and the turn bound
 * @returns {Promise<Result>} the result
 */
export async function runSelftest({
    root,
    stateDir,
    repo,
    model,
    env = process.env,
    platform = realPlatform(env),
    sleep = delay,
    now = () => new Date(),
    log = () => {},
    turnMs = TURN_MS,
}) {
    const home = env.HOME ?? homedir();
    const claudeVersion = await platform.claudeVersion();
    const dir = join(stateDir, "selftest");
    rmSync(dir, { recursive: true, force: true });
    const jobDir = join(dir, "jobs", JOB);
    const nonce = randomBytes(6).toString("hex");
    const token = `SELFTEST-ACK-${nonce.slice(0, 6).toUpperCase()}`;
    const responder = createResponder({ org: repo.split("/")[0], token });
    const server = await platform.serve(responder);
    const wt = jobWorktreeDir(root, JOB);
    /** @type {string[]} */
    const leftovers = [];
    /** @type {Observed} */
    const observed = {
        started: false,
        startCapture: null,
        stuck: [],
        bashEnv: null,
        ghAllowed: false,
        ring: null,
        weekly: null,
        exit: null,
        registryGone: false,
        resumed: false,
    };
    /** @type {(import("./tmux.mjs").Window & {startTime: string})[]} */
    const windows = [];
    let base = "";
    try {
        writeProbe(dir, server.url);
        writeJobFiles(jobDir, { stateDir: dir });
        writeFileSync(join(jobDir, "guard.json"), JSON.stringify({ root: wt, repo, ownerItems: [] }));
        if (existsSync(wt)) throw new Error(`${wt} exists: an earlier self-test left it; remove it first`);
        log(`worktree ${wt}`);
        base = await platform.addWorktree(root, wt);
        const workerVars = workerEnv({
            env,
            path: platform.loginPath(),
            signing: readSigningEnv(home),
            job: JOB,
            nonce,
        });
        const argv = (/** @type {{prompt: string, resume?: string}} */ o) =>
            workerArgv({ env: workerVars, model, job: JOB, jobDir, ...o });
        const ctx = { platform, sleep, observed, events: responder.events, turnMs };
        await phases(ctx, { wt, jobDir, argv, windows, nonce, log });
    } catch (err) {
        leftovers.push(`aborted: ${/** @type {Error} */ (err).message}`);
    } finally {
        for (const w of windows) if (platform.running(w.pid, w.startTime)) await platform.end(w);
        platform.killServer(SOCKET);
        await server.close();
        rmSync(join(wt, ENV_FILE), { force: true });
        if (base) {
            const why = await platform.removeWorktree(root, wt, base);
            if (why) leftovers.push(`worktree ${wt} not removed: ${why}`);
        }
    }
    writeFileSync(join(dir, "events.jsonl"), responder.events.map((e) => `${JSON.stringify(e)}\n`).join(""));
    const allowedClaude = new Set([...CLAUDE_OWN, ...userClaudeNames(home)]);
    const checks = judge({ events: responder.events, observed, model, nonce, token, allowedClaude });
    /** @type {Result} */
    const result = {
        at: now().toISOString(),
        claudeVersion,
        model,
        passed: leftovers.every((l) => !l.startsWith("aborted")) && checks.every((c) => c.ok || !c.required),
        resumeVerified: checks.find((c) => c.name === "resume restores the session")?.ok === true,
        weekly: observed.weekly,
        checks,
        leftovers,
    };
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "selftest.json"), `${JSON.stringify(result, null, 4)}\n`);
    return result;
}

/**
 * Waits until `done` holds and the session is idle. A registry `waiting` is a dialog: the phase is
 * stuck, with the pane.
 * @param {{platform: Platform, sleep: (ms: number) => Promise<unknown>, observed: Observed}} ctx the context
 * @param {import("./tmux.mjs").Window} window the window
 * @param {string} phase the phase's name
 * @param {() => boolean} done the phase's end
 * @param {number} ms the bound
 * @returns {Promise<boolean>} whether it ended idle
 */
async function settle(ctx, window, phase, done, ms) {
    let why = `not idle after ${Math.round(ms / 1000)} s`;
    for (let waited = 0; waited <= ms; waited += POLL_MS) {
        const entry = ctx.platform.registry(window.pid);
        if (entry?.status === "waiting") {
            why = `waiting for ${entry.waitingFor ?? "something"}`;
            break;
        }
        if (entry?.status === "idle" && done()) return true;
        await ctx.sleep(POLL_MS);
    }
    ctx.observed.stuck.push({ phase, why, capture: ctx.platform.capture(window) });
    return false;
}

/**
 * Opens the usage panel, reads the weekly limit from it and closes it again.
 * @param {{platform: Platform, sleep: (ms: number) => Promise<unknown>}} ctx the context
 * @param {import("./tmux.mjs").Window} window the window, showing the empty prompt box
 * @returns {Promise<{percent: number, resets: string | null} | null>} the limit, null when unread
 */
async function readWeekly({ platform, sleep }, window) {
    if (!(await platform.type(window, "/usage")).sent) return null;
    let weekly = null;
    for (let waited = 0; waited <= SHORT_MS && !weekly; waited += POLL_MS) {
        await sleep(POLL_MS);
        weekly = parseWeekly(platform.capture(window));
    }
    platform.key(window, "Escape");
    const empty = () => readScreen(platform.capture(window), window.name).kind === "empty-box";
    for (let waited = 0; waited <= SHORT_MS && !empty(); waited += POLL_MS) await sleep(POLL_MS);
    return weekly;
}

/**
 * The phases, in order; each needs the one before it.
 * @param {{platform: Platform, sleep: (ms: number) => Promise<unknown>, observed: Observed,
 *   events: Event[], turnMs: number}} ctx the context
 * @param {{wt: string, jobDir: string, argv: (o: {prompt: string, resume?: string}) => string[],
 *   windows: (import("./tmux.mjs").Window & {startTime: string})[], nonce: string,
 *   log: (line: string) => void}} run the worktree, the job directory the guard logs to, the
 *   command line, the windows started, the doorbell nonce and the progress log
 */
async function phases(ctx, { wt, jobDir, argv, windows, nonce, log }) {
    const { platform, observed, events } = ctx;
    const count = (/** @type {(e: Event) => boolean} */ p) => events.filter(p).length;
    const allowedStops = () => Math.max(0, count((e) => e.kind === "hook" && e.event === "Stop") - 1);
    const nexts = () => count((e) => e.kind === "tool" && e.name === "githerd_next");

    log("starting the worker");
    const started = await platform.start({ job: JOB, cwd: wt, argv: argv({ prompt: LAUNCH_PROMPT }), socket: SOCKET });
    if (!("registry" in started)) {
        observed.startCapture = started.capture;
        return;
    }
    observed.started = true;
    const window = { ...started.window, startTime: started.startTime };
    windows.push(window);
    const session = started.registry.sessionId;

    log("first turn: githerd_next, githerd_claim, gh pr create, the environment, githerd_wait");
    if (!(await settle(ctx, window, "first turn", () => allowedStops() >= 1, ctx.turnMs))) return;
    try {
        observed.bashEnv = readFileSync(join(wt, ENV_FILE), "utf8")
            .split("\n")
            .filter((n) => /^\w+$/.test(n));
    } catch {
        observed.bashEnv = null;
    }
    observed.ghAllowed = readText(join(jobDir, "writes.jsonl")).includes('"verb":"pr create"');

    log("doorbell");
    observed.ring = await platform.ring(window, { nonce, job: JOB });
    if (!observed.ring.rung) return;
    if (!(await settle(ctx, window, "doorbell turn", () => nexts() >= 2 && allowedStops() >= 2, ctx.turnMs))) return;

    log("usage panel");
    observed.weekly = await readWeekly(ctx, window);

    log("/exit");
    observed.exit = await platform.end(window);
    for (let waited = 0; waited <= SHORT_MS; waited += POLL_MS) {
        observed.registryGone = platform.registry(window.pid) === null;
        if (observed.registryGone) break;
        await ctx.sleep(POLL_MS);
    }

    log("resume");
    // Counted before the start: a quick session can finish its turn before the start returns.
    const stopsBefore = allowedStops();
    const resumed = await platform.start({
        job: JOB,
        cwd: wt,
        argv: argv({ prompt: RESUME_PROMPT, resume: session }),
        socket: SOCKET,
    });
    if (!resumed.ok) return;
    observed.resumed = true;
    const again = { ...resumed.window, startTime: resumed.startTime };
    windows.push(again);
    await settle(ctx, again, "resumed turn", () => allowedStops() > stopsBefore, ctx.turnMs);
}

/**
 * A check's mark in the CLI's lines.
 * @param {Check} c the check
 * @returns {string} `ok  `, `FAIL` or `soft` (a soft check that failed)
 */
function mark(c) {
    if (c.ok) return "ok  ";
    return c.required ? "FAIL" : "soft";
}

/**
 * The result in plain lines, for the CLI.
 * @param {Result} result the result
 * @returns {string[]} the lines
 */
export function selftestText(result) {
    return [
        `githerd self-test on Claude Code ${result.claudeVersion} with ${result.model}: ${result.passed ? "passed" : "FAILED"}`,
        ...result.checks.map((c) => `  ${mark(c)} ${c.name}: ${c.detail}`),
        ...result.leftovers.map((l) => `  note ${l}`),
    ];
}

/**
 * Whether a dead worker's session may be resumed (design 7.7): the last self-test passed, verified
 * resume, and ran on the Claude Code version installed now. The version is asked only when the
 * record would allow it.
 * @param {string} stateDir githerd's state directory
 * @param {() => Promise<string>} [version] the installed Claude Code version
 * @returns {Promise<boolean>} true when resume is verified
 */
export async function resumeVerified(stateDir, version = () => realPlatform(process.env).claudeVersion()) {
    let record;
    try {
        record = JSON.parse(readFileSync(join(stateDir, "selftest.json"), "utf8"));
    } catch {
        return false;
    }
    if (record?.passed !== true || record.resumeVerified !== true) return false;
    try {
        return record.claudeVersion === (await version());
    } catch {
        return false;
    }
}
