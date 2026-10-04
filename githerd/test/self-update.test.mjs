import { spawnSync } from "node:child_process";
import {
    chmodSync,
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { startDaemon } from "../lib/daemon.mjs";
import {
    currentHash,
    protocolCheck,
    protocolGate,
    readSelfUpdate,
    realGates,
    replayGate,
    selftestGate,
    updateGate,
    writeSelfUpdate,
} from "../lib/self-update.mjs";
import { PACKAGE_DIR } from "../lib/version.mjs";

const PROTOCOL_BIN = fileURLToPath(new URL("../bin/githerd-protocol-test.mjs", import.meta.url));

/** @type {string} */
let dir;
/** @type {string} the main checkout */
let root;
/** @type {string} */
let stateDir;
/** @type {Record<string, string | undefined>} */
let env;

beforeAll(() => isolateGit());

/**
 * Writes a file, creating its directory.
 * @param {string} path the file
 * @param {string} text its contents
 */
function put(path, text) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
}

/**
 * Commits everything in the main checkout.
 * @returns {string} the commit
 */
function commit() {
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "change");
    return git(root, "rev-parse", "HEAD");
}

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-self-update-"));
    root = join(dir, "main");
    stateDir = join(dir, "state");
    mkdirSync(stateDir);
    git(dir, "init", "-q", "-b", "master", root);
    git(root, "config", "user.name", "Test");
    git(root, "config", "user.email", "test@example.com");
    put(join(root, ".gitignore"), "node_modules\n");
    // A gh that is never reached: the protocol test's daemon must not call it.
    const bin = join(dir, "bin");
    put(join(bin, "gh"), "#!/bin/sh\necho 'fake gh: offline' >&2\nexit 1\n");
    chmodSync(join(bin, "gh"), 0o755);
    put(
        join(dir, "githerd.config.json"),
        JSON.stringify({
            repo: "o/r",
            lanes: { ci: { workflow: "ci.yml", gating: "required" } },
            notify: { command: null },
        }),
    );
    env = {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        HOME: join(dir, "home"),
        GITHERD_CONFIG: join(dir, "githerd.config.json"),
    };
});

afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
});

describe("the record", () => {
    it("reads empty when missing, keeps the newest twenty verdicts, and says where a hash stands", () => {
        expect(readSelfUpdate(stateDir)).toEqual({ gates: {}, adopting: null });
        expect(updateGate(stateDir, "a".repeat(40))).toBe("pending");
        /** @type {Record<string, any>} */
        const gates = {};
        for (let i = 0; i < 25; i++) {
            const at = new Date(Date.UTC(2026, 9, 4, 0, i)).toISOString();
            gates[`h${String(i).padStart(2, "0")}`] = { passed: i % 2 === 0, at };
        }
        writeSelfUpdate(stateDir, { gates, adopting: null });
        const kept = Object.keys(readSelfUpdate(stateDir).gates);
        expect(kept).toHaveLength(20);
        expect(kept).not.toContain("h04");
        expect(updateGate(stateDir, "h24")).toBe("passed");
        expect(updateGate(stateDir, "h23")).toBe("refused");

        // The version `current` names has passed, whatever the record says.
        put(join(stateDir, "versions", "0.1.0-h23", "version.json"), JSON.stringify({ codeHash: "h23" }));
        symlinkSync(join("versions", "0.1.0-h23"), join(stateDir, "current"));
        expect(currentHash(stateDir)).toBe("h23");
        expect(updateGate(stateDir, "h23")).toBe("passed");

        // A copy without version.json has no hash.
        rmSync(join(stateDir, "versions", "0.1.0-h23", "version.json"));
        expect(currentHash(stateDir)).toBeNull();
    });

    it("lists the three gates in order", () => {
        expect(realGates({ root, pkgDir: "githerd", stateDir, env }).map((g) => g.name)).toEqual([
            "replay",
            "protocol",
            "self-test",
        ]);
    });
});

describe("the replay gate", () => {
    /**
     * Commits a package whose replay suite has one test.
     * @param {boolean} passes whether the test passes
     * @returns {string} the commit
     */
    function suite(passes) {
        put(
            join(root, "pkg", "test", "replay", "one.test.mjs"),
            `import { expect, it } from "vitest";\nit("replays", () => expect(${passes ? 1 : 2}).toBe(1));\n`,
        );
        const sha = commit();
        symlinkSync(join(PACKAGE_DIR, "node_modules"), join(root, "pkg", "node_modules"));
        return sha;
    }
    const trees = () =>
        git(root, "worktree", "list", "--porcelain")
            .split("\n")
            .filter((l) => l.startsWith("worktree "));

    it("passes on a green suite in a worktree of the commit, and removes the worktree", async () => {
        const r = await replayGate({ root, pkgDir: "pkg", stateDir, env, commit: suite(true) });
        expect(r.ok).toBe(true);
        expect(r.detail).toMatch(/1 passed/);
        expect(trees()).toHaveLength(1);
    });

    it("fails on a red suite, with the end of its output in plain ASCII", async () => {
        const r = await replayGate({ root, pkgDir: "pkg", stateDir, env, commit: suite(false) });
        expect(r.ok).toBe(false);
        expect(r.detail).toMatch(/1 failed/);
        expect(r.detail).toMatch(/^[\x20-\x7e]*$/);
        expect(trees()).toHaveLength(1);
    });

    it("fails without running anything when the main checkout has no install", async () => {
        put(join(root, "pkg", "x.txt"), "x");
        const r = await replayGate({ root, pkgDir: "pkg", stateDir, env, commit: commit() });
        expect(r).toEqual({ ok: false, detail: expect.stringMatching(/run pnpm install in the main checkout/) });
        expect(trees()).toHaveLength(1);
    });
});

describe("the protocol gate", () => {
    it("needs the previous version's directory", () => {
        const r = spawnSync(process.execPath, [PROTOCOL_BIN], { encoding: "utf8" });
        expect(r.status).toBe(2);
        expect(r.stderr).toMatch(/usage: githerd-protocol-test.mjs <previous version directory>/);
    });

    it("passes with no previous version", async () => {
        expect(await protocolGate({ root, env, dir: PACKAGE_DIR, previous: null })).toEqual({
            ok: true,
            detail: "no previous version",
        });
    });

    it("serves the previous client, and refuses a version that no longer speaks its tool protocol", async () => {
        put(join(root, "README"), "x");
        commit();
        const same = await protocolGate({ root, env, dir: PACKAGE_DIR, previous: PACKAGE_DIR });
        expect(same).toEqual({
            ok: true,
            detail: expect.stringMatching(/previous client \(tool protocol \d+\) is served/),
        });

        // A previous client on a tool protocol the new daemon does not serve.
        const previous = join(dir, "previous");
        cpSync(join(PACKAGE_DIR, "lib"), join(previous, "lib"), { recursive: true });
        const mcp = join(previous, "lib", "mcp.mjs");
        const text = readFileSync(mcp, "utf8");
        expect(text).toMatch(/export const TOOL_PROTOCOL = \d+;/);
        writeFileSync(mcp, text.replace(/export const TOOL_PROTOCOL = \d+;/, "export const TOOL_PROTOCOL = 99;"));
        const old = await protocolGate({ root, env, dir: PACKAGE_DIR, previous });
        expect(old.ok).toBe(false);
        expect(old.detail).toMatch(/githerd_status from the previous client: .*protocol/);
    });

    it("serves a previous client exactly one tool protocol behind the new copy", async () => {
        // The new copy is this package with its tool protocol raised by one.
        const next = join(dir, "next");
        for (const sub of ["lib", "bin"]) cpSync(join(PACKAGE_DIR, sub), join(next, sub), { recursive: true });
        cpSync(join(PACKAGE_DIR, "package.json"), join(next, "package.json"));
        const mcp = join(next, "lib", "mcp.mjs");
        const text = readFileSync(mcp, "utf8");
        const current = Number(/export const TOOL_PROTOCOL = (\d+);/.exec(text)?.[1]);
        writeFileSync(
            mcp,
            text.replace(/export const TOOL_PROTOCOL = \d+;/, `export const TOOL_PROTOCOL = ${current + 1};`),
        );
        expect(await protocolGate({ root, env, dir: next, previous: PACKAGE_DIR })).toEqual({
            ok: true,
            detail: `the previous client (tool protocol ${current}) is served`,
        });
    });
});

describe("the protocol check", () => {
    it("names the tools the previous client offers and the new daemon no longer serves", async () => {
        const previous = join(dir, "previous");
        cpSync(join(PACKAGE_DIR, "lib"), join(previous, "lib"), { recursive: true });
        const mcp = join(previous, "lib", "mcp.mjs");
        const text = readFileSync(mcp, "utf8");
        writeFileSync(
            mcp,
            text.replace(
                "export const TOOLS = [",
                'export const TOOLS = [\n    { name: "githerd_gone", description: "gone", inputSchema: { type: "object", properties: {} } },',
            ),
        );
        expect(await protocolCheck({ root, previous, env, startDaemon })).toEqual({
            ok: false,
            detail: "the new daemon lacks the previous client's githerd_gone",
        });
        expect(await protocolCheck({ root, previous: PACKAGE_DIR, env, startDaemon })).toMatchObject({ ok: true });
    });

    it("serves a config with an acting group although the scratch ledger is empty", async () => {
        const config = JSON.parse(readFileSync(env.GITHERD_CONFIG, "utf8"));
        writeFileSync(env.GITHERD_CONFIG, JSON.stringify({ ...config, mode: "acting", actions: { statuses: true } }));
        expect(await protocolCheck({ root, previous: PACKAGE_DIR, env, startDaemon })).toMatchObject({ ok: true });
    });
});

describe("the self-test gate", () => {
    /**
     * A copy whose CLI prints a line and exits with `code`.
     * @param {number} code the exit code
     * @returns {string} the copy
     */
    function copy(code) {
        const at = join(dir, `copy-${code}`);
        put(
            join(at, "bin", "githerd.mjs"),
            `console.log("self-test " + process.argv[2] + " exit ${code}");\nprocess.exit(${code});\n`,
        );
        return at;
    }

    it("runs the new copy's githerd selftest and passes on exit 0 only", async () => {
        expect(await selftestGate({ root, env, dir: copy(0) })).toEqual({
            ok: true,
            detail: "self-test selftest exit 0",
        });
        expect(await selftestGate({ root, env, dir: copy(1) })).toEqual({
            ok: false,
            detail: expect.stringMatching(/self-test selftest exit 1$/),
        });
        expect(existsSync(join(dir, "copy-0"))).toBe(true);
    });
});
