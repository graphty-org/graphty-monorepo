import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    checkAllowRule,
    loginPath,
    readSigningEnv,
    signingEnv,
    workerArgv,
    workerEnv,
    workerSettings,
    writeJobFiles,
} from "../lib/worker-settings.mjs";

const STATE = "/home/owner/.githerd/graphty-monorepo";

/** The owner's user settings as they are today: SSH signing for every Claude session. */
const OWNER_SETTINGS = {
    env: {
        GIT_CONFIG_COUNT: "2",
        GIT_CONFIG_KEY_0: "gpg.format",
        GIT_CONFIG_VALUE_0: "ssh",
        GIT_CONFIG_KEY_1: "user.signingkey",
        GIT_CONFIG_VALUE_1: "/home/owner/.ssh/git_signing_claude.pub",
        CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION: "100000",
    },
};

let dir;
beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-worker-settings-"));
});
afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.unstubAllEnvs();
});

describe("generated files", () => {
    it("writes settings.json and mcp.json as the snapshots show", async () => {
        const jobDir = join(dir, "jobs", "issue-12");
        const files = writeJobFiles(jobDir, { stateDir: STATE, overlay: ["WebFetch(domain:registry.npmjs.org)"] });
        expect(files).toEqual({ settings: join(jobDir, "settings.json"), mcp: join(jobDir, "mcp.json") });
        // The job directory is a temporary one; the snapshot names it <tmp>.
        await expect(readFileSync(files.settings, "utf8").replaceAll(dir, "<tmp>")).toMatchFileSnapshot(
            "worker-settings/settings.json",
        );
        await expect(readFileSync(files.mcp, "utf8")).toMatchFileSnapshot("worker-settings/mcp.json");
    });

    it("keeps the fixed allow rules first and drops overlay duplicates", () => {
        const s = /** @type {any} */ (
            workerSettings({ stateDir: STATE, jobDir: dir, overlay: ["mcp__githerd__*", "mcp__x__y", "mcp__x__y"] })
        );
        expect(s.permissions.allow).toEqual([
            "mcp__githerd__*",
            "Bash(gh pr create:*)",
            "Bash(gh pr edit:*)",
            "mcp__x__y",
        ]);
    });

    it("refuses an overlay rule that is not one permission rule", () => {
        for (const bad of ["", "Bash(", "Bash(a)(b)", "Bash(rm\n-rf)", "Edit(caf\u00e9)", 7, "two words"]) {
            expect(() => workerSettings({ stateDir: STATE, jobDir: dir, overlay: /** @type {any} */ ([bad]) })).toThrow(
                /not a permission rule/,
            );
        }
        expect(checkAllowRule("Bash(npm view:*)")).toBe("Bash(npm view:*)");
    });
});

describe("hook commands", () => {
    /**
     * Runs one generated hook command under sh, as Claude Code does.
     * @param {string} command the command
     * @returns {import("node:child_process").SpawnSyncReturns<string>} the result
     */
    const run = (command) => spawnSync("sh", ["-c", command], { input: "{}", encoding: "utf8" });

    it("hooks exit 0 silently and the guard refuses while githerd is not installed", () => {
        const s = /** @type {any} */ (workerSettings({ stateDir: join(dir, "it's missing"), jobDir: dir }));
        const stop = run(s.hooks.Stop[0].hooks[0].command);
        expect([stop.status, stop.stdout, stop.stderr]).toEqual([0, "", ""]);
        const guard = run(s.hooks.PreToolUse[0].hooks[0].command);
        expect(guard.status).toBe(2);
        expect(guard.stderr).toMatch(/githerd guard is not installed/);
        const count = run(s.hooks.SubagentStop[0].hooks[0].command);
        expect([count.status, count.stderr]).toEqual([0, ""]);
    });

    it("runs the installed scripts with the event as the hook's argument", () => {
        const stateDir = join(dir, "state dir");
        const bin = join(stateDir, "current", "bin");
        mkdirSync(bin, { recursive: true });
        const echo = "process.stdout.write(JSON.stringify(process.argv.slice(2)))";
        writeFileSync(join(bin, "githerd-hook.mjs"), echo);
        writeFileSync(join(bin, "githerd-guard.mjs"), echo);
        const s = /** @type {any} */ (workerSettings({ stateDir, jobDir: join(dir, "job's dir") }));
        expect(run(s.hooks.Notification[0].hooks[0].command).stdout).toBe('["Notification"]');
        expect(run(s.hooks.SubagentStop[0].hooks[0].command).stdout).toBe(JSON.stringify([join(dir, "job's dir")]));
    });
});

describe("signing variables", () => {
    it("takes exactly the GIT_CONFIG_* pairs from the owner's user settings", () => {
        expect(signingEnv(OWNER_SETTINGS)).toEqual({
            GIT_CONFIG_COUNT: "2",
            GIT_CONFIG_KEY_0: "gpg.format",
            GIT_CONFIG_VALUE_0: "ssh",
            GIT_CONFIG_KEY_1: "user.signingkey",
            GIT_CONFIG_VALUE_1: "/home/owner/.ssh/git_signing_claude.pub",
        });
        expect(signingEnv({})).toEqual({});
        expect(signingEnv(null)).toEqual({});
    });

    it("refuses a malformed count or a missing pair", () => {
        expect(() => signingEnv({ env: { GIT_CONFIG_COUNT: "two" } })).toThrow(/not a small count/);
        expect(() => signingEnv({ env: { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "gpg.format" } })).toThrow(
            /GIT_CONFIG_VALUE_0 is missing/,
        );
    });

    it("reads them from ~/.claude/settings.json, and nothing when the file is absent", () => {
        expect(readSigningEnv(dir)).toEqual({});
        mkdirSync(join(dir, ".claude"));
        writeFileSync(join(dir, ".claude", "settings.json"), JSON.stringify(OWNER_SETTINGS));
        expect(readSigningEnv(dir).GIT_CONFIG_VALUE_0).toBe("ssh");
        writeFileSync(join(dir, ".claude", "settings.json"), "{");
        expect(() => readSigningEnv(dir)).toThrow(SyntaxError);
        // A directory in the file's place is an error, not "no settings".
        rmSync(join(dir, ".claude", "settings.json"));
        mkdirSync(join(dir, ".claude", "settings.json"));
        expect(() => readSigningEnv(dir)).toThrow(/EISDIR/);
    });
});

describe("environment and command line", () => {
    const daemonEnv = {
        HOME: "/home/owner",
        USER: "owner",
        LANG: "C.UTF-8",
        SSH_AUTH_SOCK: "/run/user/1000/ssh-agent.sock",
        PATH: "/daemon/path",
        TERM: "screen",
        PUSHOVER_USER_KEY: "u-secret",
        PUSHOVER_APP_TOKEN: "a-secret",
        CLAUDECODE: "1",
        CLAUDE_CODE_SESSION_ID: "stale",
        NX_CACHE_DIRECTORY: "/somewhere",
        GITHERD_JOB: "another-job",
    };

    it("passes only the allow-list, the login PATH, the signing variables and the job's two", () => {
        const env = workerEnv({
            env: daemonEnv,
            path: "/login/path",
            signing: signingEnv(OWNER_SETTINGS),
            job: "issue-12",
            nonce: "n0nce",
        });
        expect(env).toEqual({
            HOME: "/home/owner",
            USER: "owner",
            LANG: "C.UTF-8",
            SSH_AUTH_SOCK: "/run/user/1000/ssh-agent.sock",
            TERM: "xterm-256color",
            PATH: "/login/path",
            GIT_CONFIG_COUNT: "2",
            GIT_CONFIG_KEY_0: "gpg.format",
            GIT_CONFIG_VALUE_0: "ssh",
            GIT_CONFIG_KEY_1: "user.signingkey",
            GIT_CONFIG_VALUE_1: "/home/owner/.ssh/git_signing_claude.pub",
            GITHERD_JOB: "issue-12",
            GITHERD_NONCE: "n0nce",
        });
        expect(workerEnv({ env: {}, path: "/p", signing: {}, job: "j", nonce: "n" })).toEqual({
            TERM: "xterm-256color",
            PATH: "/p",
            GITHERD_JOB: "j",
            GITHERD_NONCE: "n",
        });
    });

    it("refuses anything but a signing variable in the signing set", () => {
        expect(() =>
            workerEnv({ env: {}, path: "/p", signing: { PUSHOVER_USER_KEY: "x" }, job: "j", nonce: "n" }),
        ).toThrow(/not a signing variable/);
    });

    it("builds the env -i command line of design section 7.1", async () => {
        const argv = workerArgv({
            env: { HOME: "/home/owner", PATH: "/p", GITHERD_JOB: "issue-12" },
            model: "claude-opus-5-5",
            job: "issue-12",
            jobDir: `${STATE}/jobs/issue-12`,
            prompt: "You are a githerd worker.",
        });
        await expect(`${argv.join("\n")}\n`).toMatchFileSnapshot("worker-settings/argv.txt");
        expect(() => workerArgv({ env: {}, model: "claude-haiku-4-5", job: "j", jobDir: "/j", prompt: "p" })).toThrow(
            /a worker runs on claude-opus-5-5 or claude-fable-5, not claude-haiku-4-5/,
        );
    });

    it("resumes a dead worker's session by its id", () => {
        const argv = workerArgv({
            env: {},
            model: "claude-opus-5-5",
            job: "j",
            jobDir: "/j",
            prompt: "p",
            resume: "s-1",
        });
        expect(argv.slice(argv.indexOf("--resume"), argv.indexOf("--resume") + 2)).toEqual(["--resume", "s-1"]);
        expect(argv.indexOf("--resume")).toBeLessThan(argv.indexOf("--"));
    });
});

describe("login PATH", () => {
    /**
     * A fake login shell: prints startup noise, then runs `body`.
     * @param {string} body the shell script after the noise
     * @returns {string} its path
     */
    const fakeShell = (body) => {
        const file = join(dir, "fake-shell");
        writeFileSync(file, `#!/bin/sh\necho "Welcome to the machine"\n${body}\n`);
        chmodSync(file, 0o755);
        return file;
    };

    it("takes the marked PATH line and starts the shell with a clean environment", () => {
        vi.stubEnv("PUSHOVER_USER_KEY", "u-secret");
        // The marker line is printed by the command itself; HOME, TERM and the Pushover key show
        // what the shell started with.
        const shell = fakeShell('PATH="/login/bin:$HOME:$TERM:${PUSHOVER_USER_KEY-none}"; shift; eval "$1"');
        expect(loginPath({ shell, home: "/home/owner", user: "owner" })).toBe("/login/bin:/home/owner:dumb:none");
    });

    it("refuses a shell that prints no PATH", () => {
        expect(() => loginPath({ shell: fakeShell("true"), home: dir })).toThrow(/printed no PATH/);
    });
});
