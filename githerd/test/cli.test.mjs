import {
    chmodSync,
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readlinkSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { parseSince, runCli } from "../lib/cli.mjs";
import { repoRoot } from "../lib/config.mjs";
import { startDaemon } from "../lib/daemon.mjs";
import { appendLedger, readLedger } from "../lib/store.mjs";
import { PACKAGE_DIR } from "../lib/version.mjs";
import { createFakeGh } from "./helpers/fake-gh.mjs";

const FAKE_SERVHERD = fileURLToPath(new URL("helpers/fake-servherd.mjs", import.meta.url));
const FAKE_NOTIFY = fileURLToPath(new URL("helpers/fake-notify.mjs", import.meta.url));
const DEPLOY_KEY = "ssh-ed25519 AAAAC3NzaDeployKeyBlob release";

/** @type {string} */
let dir;
/** @type {string} the main checkout */
let root;
/** @type {string} */
let fake;
/** @type {string} */
let notifyLog;
/** @type {Record<string, string | undefined>} */
let env;
/** @type {any[]} in-process daemons, shut down after each test */
let daemons;
/** @type {number[]} processes the test's scripts started outside the fake servherd */
let strays;

/**
 * The checkout's state directory under the test's HOME.
 * @returns {string} the directory
 */
const stateDir = () => join(dir, "home", ".githerd", "main");

beforeAll(() => isolateGit());

/**
 * Whether a process is alive (a zombie is not).
 * @param {number} pid the process
 * @returns {boolean} true when alive
 */
function alive(pid) {
    try {
        const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
        return stat.slice(stat.lastIndexOf(")") + 2)[0] !== "Z";
    } catch {
        return false;
    }
}

/**
 * Writes an executable script.
 * @param {string} path where
 * @param {string} body the script after a node shebang
 */
function script(path, body) {
    writeFileSync(path, `#!${process.execPath}\n${body}\n`);
    chmodSync(path, 0o755);
}

/**
 * Writes the config the CLI, the launcher and the daemon read through GITHERD_CONFIG.
 * @param {Record<string, unknown>} [overrides] fields to change
 */
function writeConfig(overrides = {}) {
    const config = {
        repo: "o/r",
        lanes: { ci: { workflow: "ci.yml", gating: "required" } },
        pollSeconds: 60,
        servherdCommand: [process.execPath, FAKE_SERVHERD],
        notify: { command: [process.execPath, FAKE_NOTIFY, notifyLog, "ok", "{status}", "{message}"] },
        ...overrides,
    };
    writeFileSync(/** @type {string} */ (env.GITHERD_CONFIG), JSON.stringify(config));
}

/**
 * Runs the CLI in this process.
 * @param {string[]} argv the arguments
 * @param {object} [options] overrides
 * @param {Record<string, string | undefined>} [options.extraEnv] environment changes
 * @param {() => Date} [options.now] the clock
 * @param {number} [options.signTimeoutMs] the signing timeout
 * @returns {Promise<{code: number, out: string, err: string}>} the exit code and the output
 */
async function cli(argv, { extraEnv = {}, now, signTimeoutMs } = {}) {
    const out = [];
    const err = [];
    const code = await runCli(argv, {
        cwd: root,
        env: { ...env, ...extraEnv },
        out: (l) => out.push(l),
        err: (l) => err.push(l),
        healthWaitMs: 15_000,
        ...(now ? { now } : {}),
        ...(signTimeoutMs ? { signTimeoutMs } : {}),
    });
    return { code, out: out.join("\n"), err: err.join("\n") };
}

/**
 * Starts a daemon in this process on port 0, with a fake gh and no poll.
 * @returns {Promise<any>} the daemon
 */
async function daemon() {
    const d = await startDaemon({
        root: repoRoot(root),
        port: 0,
        exec: createFakeGh(() => ({ code: 1, stdout: "", stderr: "offline" })).exec,
        git: async () => ({ code: 0, stdout: "", stderr: "" }),
        env,
        autoPoll: false,
        log: () => {},
    });
    daemons.push(d);
    return d;
}

/**
 * The fake servherd's recorded invocations.
 * @returns {{argv: string[]}[]} the calls
 */
function servherdCalls() {
    const file = join(fake, "calls.jsonl");
    if (!existsSync(file)) return [];
    return readFileSync(file, "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l));
}

/**
 * Sets the repository's signing program to a fake signer.
 * @param {"ok" | "hang"} behavior signs at once, or never returns
 * @returns {string} the file the hanging signer writes its pid to
 */
function signer(behavior) {
    const path = join(dir, `signer-${behavior}`);
    const pidFile = join(dir, "signer.pid");
    script(
        path,
        behavior === "hang"
            ? `require("node:fs").writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));\nsetInterval(() => {}, 1000);`
            : `process.stdin.resume();\nprocess.stdin.on("end", () => {\n  process.stderr.write("\\n[GNUPG:] SIG_CREATED D 1 8 00 0 X\\n");\n  process.stdout.write("-----BEGIN PGP SIGNATURE-----\\n\\nfake\\n-----END PGP SIGNATURE-----\\n");\n});`,
    );
    git(root, "config", "gpg.program", path);
    return pidFile;
}

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-cli-"));
    root = join(dir, "main");
    fake = join(dir, "servherd");
    notifyLog = join(dir, "notify.log");
    mkdirSync(fake);
    mkdirSync(join(dir, "home"));
    // A gh that knows two answers and fails every other call as offline, so a daemon never
    // reaches GitHub.
    const bin = join(dir, "bin");
    mkdirSync(bin);
    script(
        join(bin, "gh"),
        `const a = process.argv.slice(2).join(" ");
if (a === "auth status") { process.stderr.write("github.com\\n  Logged in to github.com as owner\\n  Token scopes: 'repo', 'workflow'\\n"); process.exit(0); }
if (a === "api repos/o/r/keys") { console.log(JSON.stringify([{ id: 7, title: "RELEASE_DEPLOY_KEY", key: ${JSON.stringify(DEPLOY_KEY)} }])); process.exit(0); }
process.stderr.write("fake gh: offline\\n"); process.exit(1);`,
    );
    env = {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        HOME: join(dir, "home"),
        GITHERD_CONFIG: join(dir, "githerd.config.json"),
        FAKE_SERVHERD_DIR: fake,
        GITHERD_PM2: JSON.stringify([process.execPath, FAKE_SERVHERD, "pm2"]),
    };
    for (const name of [
        "GITHERD_URL",
        "GITHERD_RUN_TOKEN",
        "GITHERD_STATE_DIR",
        "GITHERD_NAME",
        "GITHERD_DEV",
        "PM2_HOME",
        "GITHERD_RUN_ID",
    ])
        delete env[name];
    // The owner's notify keys never reach a test daemon's environment file.
    for (const name of Object.keys(env)) if (name.startsWith("PUSHOVER_")) delete env[name];
    writeConfig();
    daemons = [];
    strays = [];

    mkdirSync(root);
    git(root, "init", "-q", "-b", "master");
    git(root, "config", "user.name", "Test");
    git(root, "config", "user.email", "test@example.com");
    git(dir, "init", "-q", "--bare", "remote.git");
    git(root, "remote", "add", "origin", join(dir, "remote.git"));
    const pkg = join(root, "githerd");
    for (const part of ["bin", "lib", "package.json"])
        cpSync(join(PACKAGE_DIR, part), join(pkg, part), { recursive: true });
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "first");
    git(root, "push", "-q", "origin", "master");
    git(root, "remote", "set-head", "origin", "master");
});

afterEach(async () => {
    for (const d of daemons) if (!d.fenced) await d.shutdown();
    const pidsFile = join(fake, "pids.jsonl");
    const pids = existsSync(pidsFile) ? readFileSync(pidsFile, "utf8").trim().split("\n").map(Number) : [];
    const signerPid = join(dir, "signer.pid");
    if (existsSync(signerPid)) strays.push(Number(readFileSync(signerPid, "utf8")));
    for (const pid of [...pids, ...strays]) {
        for (const target of [-pid, pid]) {
            try {
                process.kill(target, "SIGKILL");
            } catch {
                // already gone
            }
        }
    }
    const all = [...pids, ...strays];
    const end = Date.now() + 5000;
    while (all.some(alive) && Date.now() < end) await new Promise((r) => setTimeout(r, 50));
    expect(all.filter(alive)).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
});

describe("usage", () => {
    it("exits 2 with the usage on an unknown or missing command", async () => {
        for (const argv of [["nope"], []]) {
            const r = await cli(argv);
            expect(r.code).toBe(2);
            expect(r.err).toContain("usage: githerd");
        }
        const help = await cli(["help"]);
        expect(help.code).toBe(0);
        expect(help.out).toContain("doctor [--send-test]");
    });

    it("exits 2 outside a git repository", async () => {
        const out = [];
        const err = [];
        const code = await runCli(["status"], { cwd: dir, env, out: (l) => out.push(l), err: (l) => err.push(l) });
        expect(code).toBe(2);
        expect(err.join("\n")).toContain("not inside a git repository");
    });

    it("reads --since as a duration or a date", () => {
        const now = new Date("2026-10-02T12:00:00Z");
        expect(parseSince("1d", now)?.toISOString()).toBe("2026-10-01T12:00:00.000Z");
        expect(parseSince("2h", now)?.toISOString()).toBe("2026-10-02T10:00:00.000Z");
        expect(parseSince("30m", now)?.toISOString()).toBe("2026-10-02T11:30:00.000Z");
        expect(parseSince("2026-09-30", now)?.toISOString()).toBe("2026-09-30T00:00:00.000Z");
        expect(parseSince("soon", now)).toBeNull();
    });
});

describe("status", () => {
    it("prints the daemon's status text, and JSON with --json, without registering a session", async () => {
        const d = await daemon();
        const text = await cli(["status"]);
        expect(text.code).toBe(0);
        expect(text.out).toContain("MASTER: unknown");
        const json = await cli(["status", "--json"]);
        expect(json.code).toBe(0);
        expect(JSON.parse(json.out).master.verdict).toBe("unknown");
        expect(Object.keys(d.state.sessions ?? {})).toEqual([]);
    });

    it("answers with the daemon stopped, from state.json, and says so", async () => {
        mkdirSync(stateDir(), { recursive: true });
        writeFileSync(
            join(stateDir(), "state.json"),
            JSON.stringify({
                schema: 1,
                ownerItems: { i1: { id: "i1", kind: "login", question: "run gh auth login" } },
            }),
        );
        writeFileSync(join(stateDir(), "FATAL"), "gh is not authenticated\n");
        const r = await cli(["status"]);
        expect(r.code).toBe(0);
        expect(r.out).toContain("githerd is DOWN: gh is not authenticated");
        expect(r.out).toContain("DAEMON DOWN: no daemon.json; state.json written");
        expect(r.out).toContain("  i1 [login] run gh auth login");
        expect(r.out).toContain("MASTER: unknown");
        expect((await cli(["status", "owner"])).out.split("\n").at(-2)).toBe("OWNER (1):");
        expect(JSON.parse((await cli(["status", "--json"])).out).state.ownerItems.i1.kind).toBe("login");
        const bad = await cli(["status", "weather"]);
        expect(bad.code).toBe(1);
        expect(bad.err).toContain("unknown section weather");
    });

    it("falls back to state.json.bak, then the ledger, with no state.json", async () => {
        mkdirSync(stateDir(), { recursive: true });
        await appendLedger(stateDir(), {
            kind: "record",
            collection: "ownerItems",
            id: "i2",
            record: { id: "i2", kind: "money", question: "top up" },
        });
        expect((await cli(["status", "owner"])).out).toContain("written never");
        expect((await cli(["status", "owner"])).out).toContain("i2 [money] top up");
        writeFileSync(join(stateDir(), "state.json.bak"), JSON.stringify({ schema: 1 }));
        expect((await cli(["status", "owner"])).out).toContain("OWNER: nothing is waiting on you");
    });
});

describe("board", () => {
    it("draws the board, redraws when state.json changes, and ends on the signal", async () => {
        mkdirSync(stateDir(), { recursive: true });
        const out = [];
        const stop = new AbortController();
        const done = runCli(["board"], { cwd: root, env, out: (l) => out.push(l), err: () => {}, signal: stop.signal });
        await expect.poll(() => out.length).toBe(1);
        expect(out[0].startsWith("\x1b[2J\x1b[H")).toBe(true);
        expect(out[0]).toContain("OWNER: nothing is waiting on you");
        writeFileSync(
            join(stateDir(), "state.json"),
            JSON.stringify({ schema: 1, ownerItems: { i3: { id: "i3", kind: "visual", question: "look" } } }),
        );
        await expect.poll(() => out.at(-1)).toContain("i3 [visual] look");
        stop.abort();
        expect(await done).toBe(0);
        const aborted = new AbortController();
        aborted.abort();
        expect(await runCli(["board"], { cwd: root, env, out: () => {}, err: () => {}, signal: aborted.signal })).toBe(
            0,
        );
    });
});

describe("why", () => {
    it("explains an item from state.json and the ledger, and says when nothing names it", async () => {
        mkdirSync(stateDir(), { recursive: true });
        writeFileSync(
            join(stateDir(), "state.json"),
            JSON.stringify({
                schema: 1,
                jobs: {
                    "issue-7": {
                        id: "issue-7",
                        kind: "issue",
                        target: "#7",
                        state: "queued",
                        stateSince: "2026-10-03T10:00:00.000Z",
                        reason: "next by priority",
                    },
                },
            }),
        );
        await appendLedger(stateDir(), { kind: "decision", target: "issue:7", text: "queued" });
        const r = await cli(["why", "#7"], { now: () => new Date("2026-10-03T11:00:00.000Z") });
        expect(r.code).toBe(0);
        expect(r.out).toContain("job issue-7 (issue, #7): queued 1 h 0 min");
        expect(r.out).toContain('decision {"target":"issue:7","text":"queued"}');
        expect(await cli(["why", "#8"])).toMatchObject({
            code: 1,
            err: "nothing in state.json or the ledger names #8",
        });
        expect((await cli(["why"])).code).toBe(2);
    });
});

describe("ack and veto", () => {
    it("ack clears an escalation once and records the owner in the ledger", async () => {
        const d = await daemon();
        await d.rpc(
            {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: { name: "githerd_escalate", arguments: { key: "decide:x", kind: "decision", summary: "pick" } },
            },
            { session: "wt-1" },
        );
        const r = await cli(["ack", "decide:x"]);
        expect(r).toMatchObject({ code: 0, out: "resolved decide:x" });
        expect(d.state.escalations["decide:x"].resolvedAt).toBeTruthy();
        const entries = await readLedger(d.stateDir);
        expect(entries.at(-1)).toMatchObject({ kind: "escalation", key: "decide:x", resolved: true, by: "owner" });
        const again = await cli(["ack", "decide:x"]);
        expect(again.code).toBe(1);
        expect(again.err).toContain("already resolved");
        expect((await cli(["ack", "nope:1"])).err).toContain("no escalation nope:1");
        expect((await cli(["ack"])).code).toBe(2);
    });

    it("veto ends the proposal on a target, vetoes the target for good, and saves it", async () => {
        const d = await daemon();
        d.state.proposals = {
            "issue:4": { id: "issue:4", kind: "duplicate", target: "issue:4", status: "commented" },
        };
        const r = await cli(["veto", "issue:4"]);
        expect(r).toMatchObject({
            code: 0,
            out: "vetoed issue:4: its duplicate proposal ended; githerd will never propose closing it",
        });
        const saved = JSON.parse(readFileSync(join(d.stateDir, "state.json"), "utf8"));
        expect(saved.proposals["issue:4"].status).toBe("vetoed");
        expect(saved.vetoes["issue:4"]).toMatchObject({ by: "owner" });
        expect((await readLedger(d.stateDir)).at(-1)).toMatchObject({ kind: "veto", target: "issue:4", by: "owner" });
        expect(await cli(["veto", "issue:4"])).toMatchObject({ code: 1, err: "issue:4 is already vetoed" });
        expect((await cli(["veto", "pr:9"])).out).toBe("vetoed pr:9; githerd will never propose closing it");
        expect((await cli(["veto", "prop-9"])).err).toBe("veto takes issue:<n> or pr:<n>, not prop-9");
        expect((await cli(["veto"])).code).toBe(2);
    });

    it("both exit 1 when no daemon answers", async () => {
        expect((await cli(["ack", "decide:x"])).code).toBe(1);
        expect((await cli(["veto", "prop-1"])).code).toBe(1);
    });
});

describe("mode", () => {
    it("lowers the mode through override.json, refuses acting, and clears", async () => {
        const d = await daemon();
        const health = async () => (await (await fetch(`${d.url}/health`)).json()).mode;
        const override = join(stateDir(), "override.json");

        const paused = await cli(["mode", "paused"]);
        expect(paused.code).toBe(0);
        expect(JSON.parse(readFileSync(override, "utf8")).mode).toBe("paused");
        expect(await health()).toBe("paused");

        const acting = await cli(["mode", "acting"]);
        expect(acting.code).toBe(2);
        expect(acting.err).toContain("githerd mode acting is refused");
        expect(JSON.parse(readFileSync(override, "utf8")).mode).toBe("paused");

        expect((await cli(["mode", "clear"])).code).toBe(0);
        expect(existsSync(override)).toBe(false);
        expect(await health()).toBe("dry-run");

        expect((await cli(["mode", "loud"])).code).toBe(2);
    });

    it("with no argument, shows each write group's mode and its ledger coverage", async () => {
        mkdirSync(stateDir(), { recursive: true });
        await appendLedger(stateDir(), { kind: "would-do", group: "statuses", situation: "new head" });
        const r = await cli(["mode"]);
        expect(r.code).toBe(0);
        expect(r.out.split("\n")).toHaveLength(6);
        expect(r.out).toMatch(/^statuses +dry-run +1 lines, 1 situations, last /);
        expect(r.out).toContain("workers      dry-run  no ledger lines yet");
        writeFileSync(join(stateDir(), "override.json"), JSON.stringify({ mode: "paused" }));
        expect((await cli(["mode"])).out).toMatch(/^statuses +paused/);
        writeFileSync(/** @type {string} */ (env.GITHERD_CONFIG), "{");
        expect((await cli(["mode"])).code).toBe(1);
    });
});

describe("ledger", () => {
    it("prints entries, filtered by kind, target and age", async () => {
        const state = join(stateDir());
        mkdirSync(state, { recursive: true });
        const now = new Date();
        const old = new Date(now.getTime() - 3 * 86_400_000);
        await appendLedger(state, { kind: "event", event: "x", target: "pr:1" }, { now: () => old });
        await appendLedger(state, { kind: "run-end", run: "r1", target: "pr:704" }, { now: () => now });
        await appendLedger(state, { kind: "report", targets: ["pr:704", "issue:2"] }, { now: () => now });

        const lines = (/** @type {{out: string}} */ r) =>
            r.out
                .split("\n")
                .filter(Boolean)
                .map((l) => JSON.parse(l));
        expect(lines(await cli(["ledger"]))).toHaveLength(3);
        expect(lines(await cli(["ledger", "--kind", "run-end"])).map((e) => e.run)).toEqual(["r1"]);
        expect(lines(await cli(["ledger", "--target", "pr:704"])).map((e) => e.kind)).toEqual(["run-end", "report"]);
        expect(lines(await cli(["ledger", "--since", "1d"], { now: () => now }))).toHaveLength(2);
        const bad = await cli(["ledger", "--since", "soon"]);
        expect(bad.code).toBe(2);
        expect(bad.err).toContain("--since takes");
    });
});

describe("runs and run", () => {
    it("lists recent runs newest first and shows one with its files", async () => {
        const state = join(stateDir());
        expect((await cli(["runs"])).out).toBe("no runs");
        mkdirSync(join(state, "runs", "run-a"), { recursive: true });
        writeFileSync(
            join(state, "state.json"),
            JSON.stringify({
                schema: 1,
                runs: {
                    "run-a": {
                        status: "done",
                        kind: "triage",
                        target: "issue:1",
                        startedAt: "2026-10-01T10:00:00Z",
                        cost: 0.5,
                    },
                    "run-b": {
                        status: "running",
                        kind: "master-red",
                        target: "master",
                        startedAt: "2026-10-02T10:00:00Z",
                    },
                },
            }),
        );
        writeFileSync(join(state, "runs", "run-a", "result.json"), '{"outcome":"done"}\n');

        const runs = await cli(["runs"]);
        expect(runs.code).toBe(0);
        expect(runs.out.split("\n")).toEqual([
            "run-b running master-red master 2026-10-02T10:00:00Z -",
            "run-a done triage issue:1 2026-10-01T10:00:00Z $0.50",
        ]);
        expect((await cli(["runs", "--last", "1"])).out.split("\n")).toHaveLength(1);
        expect((await cli(["runs", "--last", "0"])).code).toBe(2);

        const run = await cli(["run", "run-a"]);
        expect(run.code).toBe(0);
        expect(run.out).toContain('"kind": "triage"');
        expect(run.out).toContain("files in");
        expect(run.out).toContain('result.json: {"outcome":"done"}');
        expect((await cli(["run", "run-z"])).code).toBe(1);
        expect((await cli(["run", "../state.json"])).code).toBe(2);
    });
});

describe("ensure and restart", () => {
    it("ensure starts the daemon once and then finds it warm; restart goes through servherd", async () => {
        const first = await cli(["ensure"]);
        expect(first.code).toBe(0);
        expect(first.out).toMatch(/^started http:\/\/127\.0\.0\.1:\d+$/);
        const warm = await cli(["ensure"]);
        expect(warm.out).toMatch(/^warm /);
        expect((await cli(["status"])).code).toBe(0);

        const before = JSON.parse(readFileSync(join(fake, "registry.json"), "utf8")).githerd.pid;
        const restart = await cli(["restart"]);
        expect(restart).toMatchObject({ code: 0, out: "restarted githerd" });
        expect(servherdCalls().at(-1)?.argv).toEqual(["--json", "restart", "githerd"]);
        expect(JSON.parse(readFileSync(join(fake, "registry.json"), "utf8")).githerd.pid).not.toBe(before);
    });

    it("install prepares the code and the environment file, prints the start command, and starts nothing", async () => {
        mkdirSync(stateDir(), { recursive: true });
        writeFileSync(join(stateDir(), "daemon-env.json"), JSON.stringify({ HOME: "/from-a-worker" }));
        const r = await cli(["install"], { extraEnv: { PUSHOVER_USER_KEY: "k", CLAUDECODE: "1" } });
        expect(r.code).toBe(0);
        expect(r.out).toMatch(
            new RegExp(`^cd ${stateDir()} && .* start -n githerd --autorestart -- env -i GITHERD_ROOT=${root} `),
        );
        expect(r.out).not.toContain("PUSHOVER");
        expect(readlinkSync(join(stateDir(), "current"))).toMatch(/^versions\/0\.\d+\.\d+-[0-9a-f]{8}$/);
        const saved = JSON.parse(readFileSync(join(stateDir(), "daemon-env.json"), "utf8"));
        expect(saved).toMatchObject({ HOME: join(dir, "home"), PUSHOVER_USER_KEY: "k" });
        expect(saved.CLAUDECODE).toBeUndefined();
        expect(servherdCalls()).toEqual([]);
    });

    it("install keeps the notify keys of the old environment file when this shell has none, and says so", async () => {
        mkdirSync(stateDir(), { recursive: true });
        writeFileSync(join(stateDir(), "daemon-env.json"), JSON.stringify({ PUSHOVER_USER_KEY: "k" }));
        const r = await cli(["install"]);
        expect(r.code).toBe(0);
        expect(r.out).toContain("kept from the old daemon-env.json, unset here: PUSHOVER_USER_KEY");
        expect(JSON.parse(readFileSync(join(stateDir(), "daemon-env.json"), "utf8")).PUSHOVER_USER_KEY).toBe("k");
    });

    it("refuses install, ensure, restart and dev inside a run", async () => {
        for (const extraEnv of [{ GITHERD_RUN_ID: "run-1" }, { GITHERD_URL: "http://127.0.0.1:1" }]) {
            for (const verb of ["install", "ensure", "restart", "dev"]) {
                const r = await cli([verb], { extraEnv });
                expect(r.code, verb).toBe(2);
                expect(r.err).toBe(`githerd ${verb}: runs never start servers`);
            }
        }
        expect(servherdCalls()).toEqual([]);
        expect(existsSync(join(stateDir(), "daemon-env.json"))).toBe(false);
    });

    it("ensure exits 1 when githerd is not configured", async () => {
        const r = await cli(["ensure"], { extraEnv: { GITHERD_CONFIG: undefined } });
        expect(r.code).toBe(1);
        expect(r.err).toContain("githerd is not configured");
        expect(servherdCalls()).toEqual([]);
    });
});

describe("dev", () => {
    it("runs the working tree as githerd-dev with state in .githerd-dev, never above dry-run", async () => {
        writeConfig({ mode: "acting" });
        const r = await cli(["dev"]);
        expect(r.err).toBe("");
        expect(r.code).toBe(0);
        const devState = join(root, ".githerd-dev");
        expect(r.out).toContain(`githerd-dev started at http://127.0.0.1:`);
        expect(r.out).toContain("(dry-run)");
        const start = servherdCalls().find((c) => c.argv.includes("start"));
        // The shared daemon's start path: env -i, --autorestart, the state directory as cwd.
        expect(start?.argv).toEqual([
            "--json",
            "start",
            "-n",
            "githerd-dev",
            "--autorestart",
            "--",
            "env",
            "-i",
            `GITHERD_ROOT=${root}`,
            `GITHERD_STATE_DIR=${devState}`,
            `GITHERD_CONFIG=${env.GITHERD_CONFIG}`,
            "GITHERD_DEV=1",
            "PORT={{port}}",
            "node",
            join(PACKAGE_DIR, "bin", "githerd-daemon.mjs"),
        ]);
        expect(start?.cwd).toBe(devState);
        expect(JSON.parse(readFileSync(join(devState, "daemon-env.json"), "utf8"))).toMatchObject({ PATH: env.PATH });
        expect(existsSync(join(devState, "daemon.json"))).toBe(true);
        expect(existsSync(join(stateDir(), "daemon.json"))).toBe(false);
        const status = await cli(["status"], { extraEnv: { GITHERD_STATE_DIR: devState } });
        expect(status.code).toBe(0);
    });

    it("refuses without GITHERD_CONFIG", async () => {
        const r = await cli(["dev"], { extraEnv: { GITHERD_CONFIG: undefined } });
        expect(r.code).toBe(2);
        expect(r.err).toContain("githerd dev needs GITHERD_CONFIG");
    });
});

describe("doctor", () => {
    /**
     * The doctor's lines by check name.
     * @param {string} out the output
     * @returns {Record<string, string>} each check's line
     */
    const checks = (out) =>
        Object.fromEntries(
            out
                .split("\n")
                .filter(Boolean)
                .map((l) => [/^\S+\s+([^:]+):/.exec(l)?.[1], l]),
        );

    it("passes every check with a supervised daemon, and --send-test pages", async () => {
        signer("ok");
        expect((await cli(["ensure"])).code).toBe(0);
        const r = await cli(["doctor", "--send-test"]);
        const c = checks(r.out);
        expect(Object.keys(c).sort()).toEqual(
            ["config", "daemon", "deploy keys", "gh", "notify", "servherd", "signing", "state", "supervision"].sort(),
        );
        for (const line of Object.values(c)) expect(line).toMatch(/^ok /);
        expect(r.code).toBe(0);
        expect(c.signing).toContain("the daemon's environment");
        expect(c.supervision).toContain("pm2 autorestart on for servherd-githerd");
        expect(c.daemon).toContain("same as origin/master");
        expect(readFileSync(notifyLog, "utf8")).toContain("githerd doctor: test page");
    });

    it("reports a missing gh", async () => {
        signer("ok");
        const bin = join(dir, "bare-bin");
        mkdirSync(bin);
        for (const tool of ["git", "ssh-keygen"]) {
            symlinkSync(execFileSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).trim(), join(bin, tool));
        }
        const r = await cli(["doctor"], { extraEnv: { PATH: bin } });
        expect(r.code).toBe(1);
        expect(checks(r.out).gh).toBe("FAIL gh: gh not found on PATH: githerd reads GitHub through gh");
        expect(checks(r.out)["deploy keys"]).toBeUndefined();
    });

    it("reports a hanging signer, killed at the timeout, and no daemon or supervision", async () => {
        const pidFile = signer("hang");
        const r = await cli(["doctor"], { signTimeoutMs: 1000 });
        const c = checks(r.out);
        expect(r.code).toBe(1);
        expect(c.signing).toMatch(
            /^FAIL signing: git commit-tree -S did not finish within 1 s in this shell's environment/,
        );
        expect(c.daemon).toMatch(/^FAIL daemon: not reachable/);
        expect(c.supervision).toBe("FAIL supervision: no pm2 process servherd-githerd; run githerd ensure");
        expect(c.state).toMatch(/^warn state: no /);
        const pid = Number(readFileSync(pidFile, "utf8"));
        const end = Date.now() + 5000;
        while (alive(pid) && Date.now() < end) await new Promise((res) => setTimeout(res, 50));
        expect(alive(pid)).toBe(false);
    });

    it("reports a missing notify command and a deploy key's private half in ~/.ssh", async () => {
        signer("ok");
        writeConfig({ notify: { command: [join(dir, "no-such-notify"), "{message}"] } });
        const ssh = join(dir, "home", ".ssh");
        mkdirSync(ssh);
        writeFileSync(
            join(ssh, "id_release"),
            "-----BEGIN OPENSSH PRIVATE KEY-----\nx\n-----END OPENSSH PRIVATE KEY-----\n",
        );
        writeFileSync(join(ssh, "id_release.pub"), `${DEPLOY_KEY}\n`);
        const r = await cli(["doctor"]);
        const c = checks(r.out);
        expect(r.code).toBe(1);
        expect(c.notify).toBe(
            `FAIL notify: notify command not found or not executable: ${join(dir, "no-such-notify")}`,
        );
        expect(c["deploy keys"]).toContain(
            `warn deploy keys: ${join(ssh, "id_release")} is the private key of deploy key "RELEASE_DEPLOY_KEY"`,
        );
    });

    it("warns on a null notify command and fails an unconfigured repository", async () => {
        signer("ok");
        writeConfig({ notify: { command: null } });
        expect(checks((await cli(["doctor"])).out).notify).toMatch(/^warn notify: notify.command is null/);
        const r = await cli(["doctor"], { extraEnv: { GITHERD_CONFIG: undefined } });
        expect(r.code).toBe(1);
        expect(checks(r.out).config).toMatch(/^FAIL config: githerd is not configured/);
    });
});
