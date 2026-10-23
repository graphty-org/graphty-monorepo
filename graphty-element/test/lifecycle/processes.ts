/**
 * The processes on this machine, and the reaping of the browsers the lifecycle tests start.
 *
 * A browser these tests start runs on a profile from `profile()`, and every one of its processes
 * names that profile on its command line, so the profile finds them all. A run reaps its own
 * browsers when it exits, normally or on an error, and when it is interrupted (SIGINT, SIGTERM,
 * SIGHUP). A run killed outright (SIGKILL) cannot, so every run's first `profile()` reaps the
 * browsers of profiles whose run is gone: the profile's name carries the pid of the run that made it.
 *
 * Only Node's own modules are imported here, so a child process can load this file on its own
 * (`node --experimental-strip-types`), as test/lifecycle/processes.test.ts does.
 */

import { type ChildProcess, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** A process on this machine. */
export interface Proc {
    readonly pid: number;
    readonly ppid: number;
    readonly cmdline: string;
}

/**
 * Every process on this machine, read from /proc, or from `ps` where there is none (macOS).
 * @returns The processes.
 */
export function processes(): Proc[] {
    if (!existsSync("/proc/self")) {
        return execFileSync("ps", ["-axww", "-o", "pid=,ppid=,command="], { encoding: "utf8", maxBuffer: 64 << 20 })
            .split("\n")
            .map((line) => /^\s*(\d+)\s+(\d+)\s(.*)$/.exec(line))
            .filter((match) => match !== null)
            .map((match) => ({ pid: Number(match[1]), ppid: Number(match[2]), cmdline: match[3] }));
    }

    const found: Proc[] = [];
    for (const name of readdirSync("/proc")) {
        if (!/^\d+$/.test(name)) {
            continue;
        }

        try {
            const stat = readFileSync(`/proc/${name}/stat`, "utf8");
            // The command name is in parentheses and may hold spaces; the parent pid follows it.
            const ppid = Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]);
            const cmdline = readFileSync(`/proc/${name}/cmdline`, "utf8").replaceAll("\0", " ");
            found.push({ pid: Number(name), ppid, cmdline });
        } catch {
            // It exited while being read.
        }
    }

    return found;
}

/**
 * A process and everything under it.
 * @param root - The root pid.
 * @returns The processes of the tree, root first.
 */
export function processTree(root: number): Proc[] {
    const all = processes();
    const tree = all.filter((proc) => proc.pid === root);
    for (let i = 0; i < tree.length; i++) {
        tree.push(...all.filter((proc) => proc.ppid === tree[i].pid));
    }

    return tree;
}

/**
 * The browser's own processes: every process whose command line names the profile, and all
 * their descendants.
 * @param userDataDir - The profile the browser was launched on.
 * @returns The processes, outermost first.
 */
export function browserProcesses(userDataDir: string): Proc[] {
    const named = processes().filter((proc) => proc.cmdline.includes(userDataDir));
    const roots = named.filter((proc) => !named.some((other) => other.pid === proc.ppid));
    return roots.flatMap((root) => processTree(root.pid));
}

const PREFIX = "graphty-lifecycle-";

/** The profiles this run made, and the helper processes (drivers, log streams) it started. */
const ownProfiles = new Set<string>();
const ownChildren = new Set<number>();
let reaping = false;

function killQuietly(pid: number): void {
    try {
        process.kill(pid, "SIGKILL");
    } catch {
        // Already gone.
    }
}

function isAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === "EPERM";
    }
}

/** Kill every browser on this run's profiles and every helper it started. */
function reapOwn(): void {
    for (const dir of ownProfiles) {
        for (const proc of browserProcesses(dir)) {
            killQuietly(proc.pid);
        }
    }

    for (const pid of ownChildren) {
        killQuietly(pid);
    }
}

function onSignal(signal: NodeJS.Signals): void {
    reapOwn();
    // Then the signal's own effect: the next listener (Playwright's) or the default, which ends the run.
    for (const name of SIGNALS) {
        process.off(name, onSignal);
    }

    process.kill(process.pid, signal);
}

const SIGNALS: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];

/** On first use: reap what earlier runs left, and reap this run's own when it ends. */
function startReaping(): void {
    if (reaping) {
        return;
    }

    reaping = true;
    reapStale();
    process.on("exit", reapOwn);
    for (const signal of SIGNALS) {
        process.on(signal, onSignal);
    }
}

/**
 * Kill the browsers left running on profiles whose run is gone, and remove those profiles. A
 * profile with no pid in its name is from a run older than this rule, and is gone too.
 * @param root - Where profiles are made.
 * @returns The profiles reaped.
 */
export function reapStale(root = tmpdir()): string[] {
    const reaped: string[] = [];
    for (const name of readdirSync(root)) {
        if (!name.startsWith(PREFIX)) {
            continue;
        }

        const owner = /-p(\d+)-[^-]+$/.exec(name);
        if (owner !== null && isAlive(Number(owner[1]))) {
            continue;
        }

        const dir = path.join(root, name);
        for (const proc of browserProcesses(dir)) {
            killQuietly(proc.pid);
        }

        rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
        reaped.push(dir);
    }

    return reaped;
}

/**
 * A fresh profile directory, owned by this run: its browsers are killed when the run ends or is
 * interrupted. The first call reaps what earlier runs left behind.
 * @param name - What the test calls it.
 * @returns The directory.
 */
export function profile(name: string): string {
    startReaping();
    const dir = mkdtempSync(path.join(tmpdir(), `${PREFIX}${name}-p${process.pid}-`));
    ownProfiles.add(dir);
    return dir;
}

/**
 * Kill a helper process (a driver, a log stream) with this run, however the run ends.
 * @param child - The process.
 * @returns The process.
 */
export function ownChild<T extends ChildProcess>(child: T): T {
    startReaping();
    if (child.pid !== undefined) {
        const { pid } = child;
        ownChildren.add(pid);
        child.once("exit", () => ownChildren.delete(pid));
    }

    return child;
}
