/**
 * Chromium, Firefox and WebKit through Playwright's library API, each on a persistent profile so
 * a relaunch after a kill finds the same storage, and the processes of the browser a test launched,
 * found by its profile directory, so a kill never reaches another test's browser or the developer's.
 */

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { type BrowserContext, chromium, firefox, webkit } from "playwright";
import { assert } from "vitest";

import { chromeArgs, chromeEnv, type Proc, processes, processTree } from "./cdp-harness";
import type { Fixture, PageCheck } from "./fixture";

/** The three engines. */
export type Engine = "chromium" | "firefox" | "webkit";

export const ENGINES: readonly Engine[] = ["chromium", "firefox", "webkit"];

/**
 * A fresh profile directory.
 * @param name - What the test calls it.
 * @returns The directory.
 */
export function profile(name: string): string {
    return mkdtempSync(path.join(tmpdir(), `graphty-lifecycle-${name}-`));
}

/**
 * Launch an engine on a persistent profile.
 * @param engine - The engine.
 * @param userDataDir - The profile; a relaunch on it keeps its storage.
 * @param firefoxUserPrefs - More Firefox preferences (the quota test's fixed limit).
 * @returns The context.
 */
export function launch(
    engine: Engine,
    userDataDir: string,
    firefoxUserPrefs: Record<string, string | number | boolean> = {},
): Promise<BrowserContext> {
    if (engine === "firefox") {
        return firefox.launchPersistentContext(userDataDir, {
            headless: true,
            firefoxUserPrefs: {
                // Headless Firefox has no WebGL on a machine without a GPU it trusts; Mesa's software GL
                // draws the canvas (the same settings as the autosave-engines project).
                "webgl.force-enabled": true,
                "dom.storageManager.prompt.testing": true,
                "dom.storageManager.prompt.testing.allow": true,
                ...firefoxUserPrefs,
            },
            env: {
                ...process.env,
                LIBGL_ALWAYS_SOFTWARE: "1",
                __GLX_VENDOR_LIBRARY_NAME: "mesa",
                __EGL_VENDOR_LIBRARY_FILENAMES: "/usr/share/glvnd/egl_vendor.d/50_mesa.json",
                MOZ_WEBGL_FORCE_EGL: "1",
            },
        });
    }

    return engine === "chromium"
        ? chromium.launchPersistentContext(userDataDir, { headless: true, args: chromeArgs(), env: chromeEnv() })
        : webkit.launchPersistentContext(userDataDir, { headless: true });
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

/**
 * The processes that run this browser's web pages.
 * @param engine - The engine.
 * @param userDataDir - The profile.
 * @returns The page processes.
 */
export function pageProcesses(engine: Engine, userDataDir: string): Proc[] {
    if (engine === "webkit" && process.platform === "darwin") {
        // macOS starts WebKit's web content processes as XPC services, children of launchd rather than
        // of the browser, so they are found by the WebKit build they run from. A test runs one browser
        // of that build at a time.
        const build = path.dirname(webkit.executablePath());
        return processes().filter((proc) => proc.cmdline.includes(build) && proc.cmdline.includes("WebContent"));
    }

    const isPage: Record<Engine, (cmdline: string) => boolean> = {
        // Headless WebKit on Linux is the WPE port, whose web process is WPEWebProcess.
        webkit: (cmdline) => /WebKitWebProcess|WPEWebProcess/.test(cmdline),
        chromium: (cmdline) => cmdline.includes("--type=renderer") && !cmdline.includes("--extension-process"),
        firefox: (cmdline) => cmdline.includes("-isForBrowser"),
    };
    const pages = browserProcesses(userDataDir).filter((proc) => isPage[engine](proc.cmdline));
    if (engine !== "firefox" || pages.length === 0) {
        return pages;
    }

    // Firefox runs Playwright's own pages and a spare in content processes too, and killing those
    // takes the browser down; nothing on their command lines says which site each one runs. The
    // fixture's, holding the graph, is by far the largest.
    const rss = (pid: number): number => {
        try {
            return Number(readFileSync(`/proc/${pid}/statm`, "utf8").split(" ")[1]);
        } catch {
            return 0;
        }
    };
    return [pages.reduce((a, b) => (rss(b.pid) > rss(a.pid) ? b : a))];
}

/**
 * Kill processes with SIGKILL, as the operating system's out-of-memory killer does.
 * @param procs - The processes.
 */
export function kill(procs: readonly Proc[]): void {
    assert.isNotEmpty(procs, "there is a process to kill");
    for (const proc of procs) {
        try {
            process.kill(proc.pid, "SIGKILL");
        } catch {
            // Already gone with its parent.
        }
    }
}

/**
 * The invariant every kill test asserts (design/work-protection/design.md, section 8): the restored
 * revision is at least the last one logged as saved, every node's probe equals it (the restore is
 * whole), and no entry was deleted.
 * @param check - What the reopened page reports.
 * @param fixture - The fixture, for the log.
 * @param tabs - The tab labels whose saved revisions count.
 * @param entriesBefore - The entry ids that existed before the kill.
 */
export function assertInvariant(
    check: PageCheck,
    fixture: Fixture,
    tabs: readonly string[],
    entriesBefore: readonly string[],
): void {
    const lastSaved = Math.max(...tabs.map((tab) => fixture.lastSaved(tab)));
    assert.isAbove(lastSaved, 0, "the page logged a saved revision before it was killed");
    assert.isNotNull(check.restored, "the work was restored");
    const revision = check.restored?.revision ?? -1;
    assert.isAtLeast(revision, lastSaved, "the restored revision is at least the last logged saved one");
    assert.deepEqual(check.probes, [revision], "every node's probe equals the restored revision");
    const after = new Set(check.entries.map((entry) => entry.id));
    for (const id of entriesBefore) {
        assert.isTrue(after.has(id), `entry ${id} still exists`);
    }
}
