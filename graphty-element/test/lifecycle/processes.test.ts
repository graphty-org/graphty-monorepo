/**
 * The lifecycle runs reap their browsers: on a normal exit, an error and an interrupt, and, for a run
 * killed outright, at the next run's start. A stand-in "browser" (a Node process naming the profile on
 * its command line, as every browser process does) shows it without starting a real one.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, assert, describe, it, onTestFinished, vi } from "vitest";

import { reapStale } from "./processes";

const MODULE = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), "processes.ts")).href;
const IDLE = "setInterval(() => {}, 1 << 30)";

const roots: string[] = [];
const strays: ChildProcess[] = [];

afterEach(() => {
    for (const child of strays.splice(0)) {
        child.kill("SIGKILL");
    }

    for (const root of roots.splice(0)) {
        rmSync(root, { recursive: true, force: true });
    }
});

function scratch(): string {
    const root = mkdtempSync(path.join(tmpdir(), "graphty-reaper-test-"));
    roots.push(root);
    return root;
}

/** A process that names the profile on its command line and runs until killed. */
function fakeBrowser(dir: string): ChildProcess {
    const child = spawn(process.execPath, ["-e", IDLE, "--", `--user-data-dir=${dir}`], { stdio: "ignore" });
    strays.push(child);
    return child;
}

function alive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

async function exitedPid(): Promise<number> {
    const child = spawn(process.execPath, ["-e", ""], { stdio: "ignore" });
    await new Promise((resolve) => child.once("exit", resolve));
    assert.isDefined(child.pid);
    return child.pid ?? 0;
}

describe("lifecycle browsers are reaped", () => {
    it("at the next start, kills the browsers of a run that is gone and spares a live run's", async () => {
        const root = scratch();
        const gone = path.join(root, `graphty-lifecycle-chrome-p${await exitedPid()}-aaaaaa`);
        const legacy = path.join(root, "graphty-lifecycle-firefox-unloader-bbbbbb");
        const live = path.join(root, `graphty-lifecycle-chrome-p${process.pid}-cccccc`);
        for (const dir of [gone, legacy, live]) {
            mkdirSync(dir);
        }

        const goneBrowser = fakeBrowser(gone);
        const legacyBrowser = fakeBrowser(legacy);
        const liveBrowser = fakeBrowser(live);
        const exits = [goneBrowser, legacyBrowser].map(
            (child) => new Promise((resolve) => child.once("exit", resolve)),
        );

        assert.sameMembers(reapStale(root), [gone, legacy]);
        await Promise.all(exits);
        assert.isFalse(existsSync(gone), "the gone run's profile is removed");
        assert.isFalse(existsSync(legacy), "a profile with no owner is removed");
        assert.isTrue(existsSync(live), "a live run's profile stays");
        assert.isNull(liveBrowser.exitCode, "a live run's browser keeps running");
        assert.isNull(liveBrowser.signalCode);
    });

    it.each([
        ["interrupted (SIGINT)", "SIGINT"],
        ["terminated (SIGTERM)", "SIGTERM"],
        ["hung up (SIGHUP)", "SIGHUP"],
        ["exiting normally", null],
        ["failing with an error", "throw"],
    ] as const)("a run %s kills its browsers", async (_label, how) => {
        const root = scratch();
        // The run: makes a profile, starts a browser on it, reports the browser's pid, then ends as asked.
        const endings = { null: "process.exit(0);", throw: "throw new Error('the run failed');" };
        const ending = endings[String(how) as keyof typeof endings] ?? "setInterval(() => {}, 1 << 30);";
        const script = `
            const { spawn } = await import("node:child_process");
            const { profile } = await import(${JSON.stringify(MODULE)});
            const dir = profile("reaper");
            const browser = spawn(process.execPath, ["-e", ${JSON.stringify(IDLE)}, "--", "--user-data-dir=" + dir], { stdio: "ignore", detached: true });
            process.stdout.write(browser.pid + "\\n");
            ${ending}
        `;
        const run = spawn(
            process.execPath,
            ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", script],
            { env: { ...process.env, TMPDIR: root }, stdio: ["ignore", "pipe", "pipe"] },
        );
        strays.push(run);
        const runExited = new Promise((resolve) => run.once("exit", resolve));
        const browserPid = await new Promise<number>((resolve, reject) => {
            let text = "";
            run.stdout?.on("data", (chunk: Buffer) => {
                text += chunk.toString();
                if (text.includes("\n")) {
                    resolve(Number(text.trim()));
                }
            });
            run.once("exit", () => reject(new Error("the run ended before starting its browser")));
        });
        assert.isTrue(alive(browserPid), "the browser started");
        onTestFinished(() => {
            if (alive(browserPid)) {
                process.kill(browserPid, "SIGKILL");
            }
        });

        if (how !== null && how !== "throw") {
            run.kill(how);
        }

        await runExited;
        // The browser is in its own session (detached), so only the run's reaping can end it.
        await vi.waitFor(() => assert.isFalse(alive(browserPid), "the browser is gone"));
    });
});
