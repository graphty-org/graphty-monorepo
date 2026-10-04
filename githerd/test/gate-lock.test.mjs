/**
 * The pre-push gate's machine-wide lock (`tools/prepush.sh`, design section 4.8), run for real: the
 * repository's own script, copied into a throwaway repository whose `pnpm` reports no affected
 * package and whose SonarQube step is a stand-in that waits for a go file. That is the gate's
 * shortest path: take the lock, run the SonarQube step, exit.
 */
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gateLock } from "../lib/proc.mjs";
import { put } from "./helpers/git-repo.mjs";

const PREPUSH = fileURLToPath(new URL("../../tools/prepush.sh", import.meta.url));

/** The SonarQube stand-in: logs its start with its pid, waits for `go-<name>`, logs its end. */
const FAKE_SONAR = `import { appendFileSync, existsSync } from "node:fs";
const name = process.env.GATE_NAME;
const log = (word) => appendFileSync(process.env.GATE_LOG, word + " " + name + " " + process.pid + "\\n");
log("start");
setInterval(() => {
    if (existsSync(process.env.GATE_DIR + "/go-" + name)) {
        log("end");
        process.exit(0);
    }
}, 20);
`;

/** @type {string} */
let dir;
/** @type {string} */
let root;
/** @type {Set<number>} process groups this test started */
let groups;

/**
 * Whether any process in the group is alive.
 * @param {number} pgid the group id
 * @returns {boolean} true if the group exists
 */
function groupAlive(pgid) {
    try {
        process.kill(-pgid, 0);
        return true;
    } catch {
        return false;
    }
}

/**
 * The SonarQube stand-ins' log lines, as `[word, name, pid]`.
 * @returns {string[][]} the lines
 */
function logLines() {
    const log = join(dir, "log");
    return existsSync(log)
        ? readFileSync(log, "utf8")
              .trim()
              .split("\n")
              .map((l) => l.split(" "))
        : [];
}

/**
 * Starts one gate in its own process group, as githerd starts a push.
 * @param {string} name the gate's name in the log
 * @returns {{child: import("node:child_process").ChildProcess, exit: Promise<unknown[]>}} the gate
 */
function startGate(name) {
    const child = spawn("bash", [join(root, "tools", "prepush.sh")], {
        cwd: root,
        detached: true,
        stdio: "ignore",
        env: {
            PATH: `${join(dir, "bin")}:${process.env.PATH}`,
            HOME: dir,
            GIT_CONFIG_GLOBAL: "/dev/null",
            GIT_CONFIG_NOSYSTEM: "1",
            PREPUSH_ALL: "1",
            GATE_NAME: name,
            GATE_LOG: join(dir, "log"),
            GATE_DIR: dir,
        },
    });
    groups.add(/** @type {number} */ (child.pid));
    return { child, exit: once(child, "exit") };
}

/**
 * Waits until the SonarQube stand-in of `name` has started.
 * @param {string} name the gate
 * @returns {Promise<string>} the stand-in's pid
 */
async function started(name) {
    let pid = "";
    await vi.waitFor(
        () => {
            const line = logLines().find(([w, n]) => w === "start" && n === name);
            expect(line).toBeDefined();
            pid = /** @type {string[]} */ (line)[2];
        },
        { timeout: 20_000, interval: 25 },
    );
    groups.add(Number(pid));
    return pid;
}

beforeEach(() => {
    groups = new Set();
    dir = realpathSync(mkdtempSync(join(tmpdir(), "githerd-gate-")));
    root = join(dir, "repo");
    put(join(root, "tools", "prepush.sh"), readFileSync(PREPUSH, "utf8"));
    put(join(root, "tools", "sonar-gate.mjs"), FAKE_SONAR);
    put(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    put(join(root, "node_modules", ".pnpm", "lock.yaml"), "lockfileVersion: '9.0'\n");
    put(join(dir, "bin", "pnpm"), "#!/bin/sh\necho '[]'\n");
    chmodSync(join(dir, "bin", "pnpm"), 0o755);
    execFileSync("git", ["init", "-q", "-b", "master", root], {
        env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
    });
});

afterEach(async () => {
    for (const pgid of groups) {
        if (groupAlive(pgid)) process.kill(-pgid, "SIGKILL");
    }
    await vi.waitFor(() => expect([...groups].filter(groupAlive)).toEqual([]), { timeout: 5000 });
    rmSync(dir, { recursive: true, force: true });
});

describe("the pre-push gate lock", () => {
    it("runs concurrent gates one at a time and counts the ones waiting", async () => {
        const a = startGate("A");
        await started("A");
        const b = startGate("B");
        const c = startGate("C");
        await vi.waitFor(() => expect(gateLock(root).waiters).toBe(2), { timeout: 20_000, interval: 25 });
        expect(gateLock(root).holder).toBe(`pid ${a.child.pid} (repo master)`);
        expect(logLines().map(([w, n]) => `${w} ${n}`)).toEqual(["start A"]);

        writeFileSync(join(dir, "go-A"), "");
        expect((await a.exit)[0]).toBe(0);
        // One of the two waiters goes next; the other keeps waiting until it ends.
        await vi.waitFor(() => expect(logLines()).toHaveLength(3), { timeout: 20_000, interval: 25 });
        const second = logLines()[2][1];
        const third = second === "B" ? "C" : "B";
        expect(gateLock(root).waiters).toBe(1);
        writeFileSync(join(dir, `go-${second}`), "");
        await started(third);
        writeFileSync(join(dir, `go-${third}`), "");
        expect((await b.exit)[0]).toBe(0);
        expect((await c.exit)[0]).toBe(0);

        expect(logLines().map(([w, n]) => `${w} ${n}`)).toEqual([
            "start A",
            "end A",
            `start ${second}`,
            `end ${second}`,
            `start ${third}`,
            `end ${third}`,
        ]);
        expect(gateLock(root)).toEqual({ holder: null, waiters: 0 });
    });

    it("is released when the gate's process group is killed, though its SonarQube step lives on", async () => {
        const a = startGate("A");
        const sonar = await started("A");
        process.kill(-(/** @type {number} */ (a.child.pid)), "SIGKILL");
        await a.exit;

        // The SonarQube step has its own process group, so it survived; it never had the lock.
        expect(groupAlive(Number(sonar))).toBe(true);
        expect(gateLock(root)).toEqual({ holder: null, waiters: 0 });

        const b = startGate("B");
        await started("B");
        writeFileSync(join(dir, "go-B"), "");
        expect((await b.exit)[0]).toBe(0);
    });

    it("reports a free lock when no gate ever ran", () => {
        expect(gateLock(root)).toEqual({ holder: null, waiters: 0 });
    });
});
