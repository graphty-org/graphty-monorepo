/**
 * githerd in several repositories on one machine: two repositories whose main checkouts share a
 * folder name ("main") but not a path or a GitHub repository get their own state directory, tmux
 * server and servherd name, and one's daemon never sees, retires or ends the other's workers. The
 * state directory of before 2026-10 (`~/.githerd/<folder name>`) moves to the new name only for
 * the checkout it belongs to, and only once nothing runs from it.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { renderBoard } from "../lib/board-text.mjs";
import { daemonName, installCommand, launcherContext, ours } from "../lib/launcher.mjs";
import { inRepository } from "../lib/owners.mjs";
import { identify, pushQueueScript, pushQueueTickets } from "../lib/proc.mjs";
import { realPlatform, retireStrayWindows } from "../lib/start.mjs";
import { defaultStateDir, legacyStateDir } from "../lib/store.mjs";
import { endSession, running, tmuxSocket } from "../lib/tmux.mjs";
import { fakeWorkers, sleep } from "./helpers/fake-worker.mjs";

/** @type {string} */
let dir;
/** @type {string} the test's HOME, never the owner's */
let home;
/** @type {string} the first repository's main checkout */
let a;
/** @type {string} the second repository's main checkout, in a folder of the same name */
let b;
/** @type {ReturnType<typeof fakeWorkers>[]} */
let fakes;

/**
 * A main checkout with its githerd config.
 * @param {string} path where
 * @param {string} repo the config's `repo`
 * @returns {string} the checkout
 */
function checkout(path, repo) {
    mkdirSync(path, { recursive: true });
    git(path, "init", "-q");
    writeFileSync(join(path, "githerd.config.json"), JSON.stringify({ repo }));
    return path;
}

/**
 * The launcher's context in a checkout, with the test's HOME.
 * @param {string} root the checkout
 * @returns {import("../lib/launcher.mjs").LauncherContext} the context
 */
function context(root) {
    const env = { ...process.env, HOME: home, GITHERD_CONFIG: join(root, "githerd.config.json") };
    delete env.GITHERD_NAME;
    const found = launcherContext({ cwd: root, env, pkgDir: "githerd" });
    if (found.kind !== "ready") throw new Error(`not ready: ${found.kind}`);
    return found.ctx;
}

beforeAll(() => isolateGit());

beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "githerd-multi-")));
    home = join(dir, "home");
    mkdirSync(home);
    a = checkout(join(dir, "a", "main"), "Org-One/app");
    b = checkout(join(dir, "b", "main"), "org-two/app");
    fakes = [];
});

afterEach(async () => {
    for (const f of fakes) await f.cleanup();
    rmSync(dir, { recursive: true, force: true });
});

describe("two repositories in folders of the same name", () => {
    it("get their own state directory, tmux server and servherd name", () => {
        const [ca, cb] = [context(a), context(b)];
        expect(ca.stateDir).toBe(join(home, ".githerd", "org-one_app"));
        expect(cb.stateDir).toBe(join(home, ".githerd", "org-two_app"));
        expect([ca.name, cb.name]).toEqual(["githerd-org-one_app", "githerd-org-two_app"]);
        expect(tmuxSocket(ca.stateDir)).not.toBe(tmuxSocket(cb.stateDir));
        expect(installCommand(ca)).toContain(`cd ${ca.stateDir} && `);
        expect(installCommand(ca)).toContain(" start -n githerd-org-one_app ");
        expect(installCommand(cb)).toContain(" start -n githerd-org-two_app ");
        // Each directory names the checkout it belongs to.
        expect(readFileSync(join(ca.stateDir, "root"), "utf8").trim()).toBe(a);
        expect(readFileSync(join(cb.stateDir, "root"), "utf8").trim()).toBe(b);
    });

    it("read only their own sessions' transcripts for pushes, wherever this repository's worktrees live", () => {
        const session = (/** @type {string} */ cwd, /** @type {number} */ pid) => ({
            pid,
            sessionId: `s${pid}`,
            name: "n",
            cwd,
        });
        const porcelain = `worktree ${a}\nHEAD 1\nbranch refs/heads/master\n\nworktree ${dir}/a-feature\nHEAD 2\ndetached\n`;
        const sessions = [
            session(a, 1),
            session(join(a, "githerd"), 2),
            session(join(dir, "a-feature", "lib"), 3),
            session(b, 4),
            session(`${a}-other`, 5),
        ];
        expect(inRepository(sessions, porcelain).map((s) => s.pid)).toEqual([1, 2, 3]);
    });

    it("never take each other's daemon for their own", () => {
        const [ca, cb] = [context(a), context(b)];
        const health = (/** @type {string} */ root) => ({ name: "githerd", root, protocol: 1 });
        expect(ours(ca, health(a))).toBe(true);
        expect(ours(ca, health(b))).toBe(false);
        expect(ours(cb, health(a))).toBe(false);
    });

    it("keep a second clone of one repository apart from the first", () => {
        const first = defaultStateDir(a, home);
        const clone = checkout(join(dir, "c", "main"), "org-one/app");
        const second = defaultStateDir(clone, home);
        expect(second).toMatch(/\/\.githerd\/org-one_app-[0-9a-f]{8}$/);
        expect(defaultStateDir(a, home)).toBe(first);
        expect(defaultStateDir(clone, home)).toBe(second);
    });

    it("run their workers on separate tmux servers: the same job id never meets, and one daemon retires and ends only its own", async () => {
        const [sa, sb] = [defaultStateDir(a, home), defaultStateDir(b, home)];
        const fa = fakeWorkers({ socket: tmuxSocket(sa) });
        const fb = fakeWorkers({ socket: tmuxSocket(sb) });
        fakes.push(fa, fb);
        const wa = await fa.start("issue-12", { screen: "idle" });
        const wb = await fb.start("issue-12", { screen: "idle" });
        expect(wa.ok && wb.ok).toBe(true);

        // What each daemon's watchdog lists: its own job window only (beside the session's first,
        // idle window, which names no job).
        const jobWindows = (/** @type {string} */ stateDir) =>
            realPlatform({ env: { HOME: home }, stateDir })
                .windows()
                .filter((w) => w.job.startsWith("issue-"));
        const listA = jobWindows(sa);
        expect(listA.map((w) => [w.job, w.pid])).toEqual([["issue-12", wa.window.pid]]);
        expect(jobWindows(sb).map((w) => [w.job, w.pid])).toEqual([["issue-12", wb.window.pid]]);

        // A's daemon lost its start of issue-12: it retires the stray window on its own server.
        const state = { jobs: { "issue-12": { id: "issue-12", holder: null } } };
        expect(retireStrayWindows(state, listA, new Date())).toEqual(["issue-12"]);
        const [stray] = /** @type {any} */ (state).retiring;
        expect(stray.holder.socket).toBe(tmuxSocket(sa));
        await endSession(stray.holder, { sleep });
        expect(running(wa.window.pid, wa.startTime)).toBe(false);
        expect(running(wb.window.pid, wb.startTime)).toBe(true);
        expect(jobWindows(sb)).toHaveLength(1);
    });
});

describe("the state directory of before 2026-10", () => {
    /**
     * Writes `~/.githerd/main` as an install of `root` left it.
     * @param {string} root the checkout its daemon.json names
     * @returns {string} the directory
     */
    function legacy(root) {
        const old = legacyStateDir(a, home);
        mkdirSync(old, { recursive: true });
        writeFileSync(join(old, "daemon.json"), JSON.stringify({ port: 1, root }));
        writeFileSync(join(old, "ledger.jsonl"), '{"kind":"event"}\n');
        return old;
    }

    it("moves to the new name for its own checkout only, never for another of the same folder name", () => {
        const old = legacy(a);
        expect(defaultStateDir(b, home)).toBe(join(home, ".githerd", "org-two_app"));
        expect(existsSync(old)).toBe(true);
        const moved = defaultStateDir(a, home);
        expect(moved).toBe(join(home, ".githerd", "org-one_app"));
        expect(existsSync(old)).toBe(false);
        expect(readFileSync(join(moved, "ledger.jsonl"), "utf8")).toBe('{"kind":"event"}\n');
        expect(readFileSync(join(moved, "root"), "utf8").trim()).toBe(a);
    });

    it("is left alone when it belongs to another checkout", () => {
        const old = legacy("/elsewhere/main");
        expect(defaultStateDir(a, home)).toBe(join(home, ".githerd", "org-one_app"));
        expect(readFileSync(join(old, "daemon.json"), "utf8")).toContain("/elsewhere/main");
    });

    it("stays in use, under its old servherd name, while a daemon runs from it, and moves once none does", () => {
        const old = legacy(a);
        writeFileSync(join(old, "lock"), JSON.stringify(identify(process.pid)));
        expect(defaultStateDir(a, home)).toBe(old);
        expect(daemonName(a, old, home)).toBe("githerd");
        rmSync(join(old, "lock"));
        const moved = defaultStateDir(a, home);
        expect(moved).toBe(join(home, ".githerd", "org-one_app"));
        expect(daemonName(a, moved, home)).toBe("githerd-org-one_app");
    });
});

describe("a repository with no push queue script", () => {
    it("says on the board that its pushes run unqueued, and stops saying so once the script exists", () => {
        const board = () =>
            renderBoard(
                /** @type {any} */ ({ state: {}, liveness: {}, pushQueue: pushQueueTickets(a) }),
                new Date(),
                "push",
            );
        expect(board()).toContain(
            "PUSH QUEUE: none -- this repository has no tools/push-queue.sh or tmp/push-queue.sh, so githerd's pushes and its reference gate run unqueued",
        );
        expect(pushQueueScript(a)).toBeNull();
        mkdirSync(join(a, "tmp"));
        writeFileSync(join(a, "tmp", "push-queue.sh"), '#!/bin/sh\nexec "$@"\n');
        expect(pushQueueScript(a)).toBe(join(a, "tmp", "push-queue.sh"));
        expect(board()).toContain("PUSH QUEUE: free, 0 waiting");
        mkdirSync(join(a, "tools"));
        writeFileSync(join(a, "tools", "push-queue.sh"), '#!/bin/sh\nexec "$@"\n');
        expect(pushQueueScript(a)).toBe(join(a, "tools", "push-queue.sh"));
    });
});
