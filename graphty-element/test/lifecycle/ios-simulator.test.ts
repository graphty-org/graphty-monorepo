/**
 * Safari on iOS, in the iOS Simulator (macOS with Xcode only; the macOS workflow sets
 * GRAPHTY_LIFECYCLE_MACOS=1). No WebDriver reaches Safari there, so the fixture page drives itself
 * (`auto`, `tail`) and reports to this test's server as it goes.
 *
 * The run: open the page with `simctl openurl`; it makes three edits and saves them, then one more
 * that is left to the write on hide; switch to another app (Settings), as a reader does; once the
 * page reported `hidden`, terminate Safari at once, as iOS does to a background app it needs the
 * memory of; open the page again. The restore must hold at least the last revision the page reported
 * saved, whole (design/work-protection/design.md, section 8). Whether the write on hide landed
 * before the kill is recorded, not asserted.
 *
 * The same run with a memory warning posted while Safari is in the background, and once with Safari's
 * web content process killed (as iOS kills it for memory) instead of Safari itself.
 *
 * The pages run without WebGL (`webgl=off`, so the element draws nothing): on the hosted macOS
 * runners the Simulator's Metal driver aborts WebKit's GPU process (MTLSimDriver, an XPC error in
 * setBuffer) while a WebGL page draws, until WebKit gives up on every tab -- sometimes before the page
 * has made its edits. What these scenarios test, the autosave across the app's lifecycle, does not
 * draw; a page whose WebGL fails is covered by the "No WebGL" lifecycle test and, here, by the switch
 * scenario's "page terminated by WebKit" path.
 *
 * And the discard-and-return check: a tab whose web content process iOS killed in the background is
 * loaded again when the reader returns to Safari. It must keep its session storage, so
 * `listAutosaves` still finds the entry this tab was writing and marks it `own` -- the premise of
 * reopening a discarded tab straight into its work.
 *
 * The Simulator has no memory-pressure killer and no 7-day storage rule; those are the iPad
 * protocol's (design/work-protection/ipad-protocol.md).
 */

import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { afterAll, assert, beforeAll, describe, it, onTestFailed } from "vitest";

import { kill } from "./engines";
import { type Fixture, startFixture } from "./fixture";
import { ownChild, processes } from "./processes";

const MACOS = process.platform === "darwin" && process.env.GRAPHTY_LIFECYCLE_MACOS === "1";
const SAFARI = "com.apple.mobilesafari";

/**
 * Run `xcrun simctl`.
 * @param args - Its arguments.
 * @returns What it printed.
 */
function simctl(...args: string[]): string {
    return execFileSync("xcrun", ["simctl", ...args], { encoding: "utf8", maxBuffer: 256 << 20 });
}

/**
 * Terminate Safari. Safari may already be gone (iOS ends a background app in answer to a memory
 * warning); simctl then fails with ESRCH, "found nothing to terminate", which is the state asked
 * for. Any other failure is thrown.
 * @param udid - The Simulator.
 * @returns "terminated", or "already gone" when nothing was running.
 */
function terminateSafari(udid: string): "terminated" | "already gone" {
    try {
        simctl("terminate", udid, SAFARI);
        return "terminated";
    } catch (error) {
        if (String((error as { stderr?: unknown }).stderr).includes("found nothing to terminate")) {
            return "already gone";
        }

        throw error;
    }
}

/**
 * The newest iPad the installed runtimes offer, else the newest iPhone.
 * @returns Its udid.
 */
function pickDevice(): string {
    const { devices } = JSON.parse(simctl("list", "devices", "available", "-j")) as {
        devices: Record<string, { udid: string; name: string }[]>;
    };
    const ios = Object.entries(devices)
        .filter(([runtime]) => runtime.includes("iOS"))
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .flatMap(([, list]) => list)
        .reverse();
    const device = ios.find((d) => d.name.startsWith("iPad")) ?? ios.find((d) => d.name.startsWith("iPhone"));
    if (device === undefined) {
        throw new Error("no iOS simulator is installed");
    }

    return device.udid;
}

/**
 * When a scenario fails, keep what the Simulator showed and what Safari and WebKit logged, in
 * test-results/ios/<tab> (the workflow uploads it): whether the app switch happened and what became of
 * the page's reports cannot be read from the page.
 * @param udid - The Simulator.
 * @param tab - The scenario.
 */
function diagnose(udid: string, tab: string): void {
    const dir = join("test-results", "ios", tab);
    mkdirSync(dir, { recursive: true });
    try {
        simctl("io", udid, "screenshot", join(dir, "screen.png"));
        const predicate =
            'process == "MobileSafari" OR process BEGINSWITH "com.apple.WebKit" OR process == "SpringBoard"';
        writeFileSync(
            join(dir, "log.txt"),
            simctl("spawn", udid, "log", "show", "--last", "20m", "--style", "compact", "--predicate", predicate),
        );
        // A WebKit process that crashed (the GPU process on a virtual GPU) leaves its report on the host.
        const reports = join(homedir(), "Library", "Logs", "DiagnosticReports");
        for (const name of existsSync(reports) ? readdirSync(reports) : []) {
            if (/WebKit|MobileSafari/.test(name)) {
                cpSync(join(reports, name), join(dir, name));
            }
        }
    } catch (error) {
        console.log(`[ios] ${tab}: could not save the diagnostics: ${String(error)}`);
    }
}

/** What Safari's own log says happened to it and to its pages, as it happens. */
interface SafariLog {
    /** The lines seen so far. */
    lines: string[];
    /** Wait until a line matching `pattern` arrived at or after line `from`; resolves with its index. */
    waitFor(pattern: RegExp, from: number): Promise<number>;
    /** Resolves once `log stream` printed anything, on stdout or stderr: it is running. */
    ready: Promise<void>;
    stop(): void;
}

/**
 * Follow Safari's log in the Simulator for the facts a page cannot report: that Safari became active
 * (UIKit's "deactivation reasons: N -> 0"), that a URL reached it ("UIOpenURLAction"), that Safari's
 * scene went to the background, and that
 * WebKit terminated a page's web process (after the GPU process crashed too many times, Safari shows
 * its own error page in place of the page).
 * @param udid - The Simulator.
 * @returns The log.
 */
function followSafari(udid: string): SafariLog {
    const predicate =
        'process == "MobileSafari" AND (eventMessage CONTAINS "UISceneDidEnterBackground" OR eventMessage CONTAINS "processDidTerminate" OR eventMessage CONTAINS "deactivation reasons" OR eventMessage CONTAINS "UIOpenURLAction")';
    const child: ChildProcess = ownChild(
        spawn("xcrun", ["simctl", "spawn", udid, "log", "stream", "--style", "compact", "--predicate", predicate], {
            stdio: ["ignore", "pipe", "pipe"],
        }),
    );
    const lines: string[] = [];
    const waiters = new Set<() => void>();
    const failures = new Set<(error: Error) => void>();
    let ended: Error | undefined;
    let stopped = false;
    let rest = "";
    let stderr = "";
    let attached: () => void = () => undefined;
    let died: (error: Error) => void = () => undefined;
    const ready = new Promise<void>((resolve, reject) => {
        attached = resolve;
        died = reject;
    });
    child.stderr?.on("data", (chunk: Buffer) => {
        attached();
        stderr = (stderr + chunk.toString("utf8")).slice(-1000);
    });
    child.stdout?.on("data", (chunk: Buffer) => {
        attached();
        const text = rest + chunk.toString("utf8");
        const parts = text.split("\n");
        rest = parts.pop() ?? "";
        lines.push(...parts);
        waiters.forEach((wake) => wake());
    });
    // A wait on a stream that ended would never end: fail it, naming why. On "close", so every line the
    // stream wrote was read first. Not after stop(): ending the run must not fail the waits still pending.
    child.on("close", (code, signal) => {
        if (stopped) {
            return;
        }

        if (rest !== "") {
            lines.push(rest);
            rest = "";
            waiters.forEach((wake) => wake());
        }

        ended = new Error(
            `Safari's log stream ended (code ${String(code)}, signal ${String(signal)}): ${stderr.trim()}`,
        );
        died(ended);
        failures.forEach((fail) => fail(ended as Error));
    });
    return {
        lines,
        ready,
        waitFor: (pattern, from) =>
            new Promise((resolve, reject) => {
                const fail = (error: Error): void => {
                    waiters.delete(check);
                    failures.delete(fail);
                    reject(new Error(`waiting for ${String(pattern)}: ${error.message}`));
                };
                const check = (): void => {
                    const index = lines.findIndex((line, i) => i >= from && pattern.test(line));
                    if (index >= 0) {
                        waiters.delete(check);
                        failures.delete(fail);
                        resolve(index);
                    }
                };
                waiters.add(check);
                failures.add(fail);
                check();
                if (ended !== undefined && waiters.has(check)) {
                    fail(ended);
                }
            }),
        stop: () => {
            stopped = true;
            child.kill();
        },
    };
}

describe.skipIf(!MACOS)("Safari in the iOS Simulator", () => {
    let fx: Fixture;
    let udid: string;
    let safariLog: SafariLog;

    beforeAll(async () => {
        fx = await startFixture();
        udid = pickDevice();
        try {
            simctl("boot", udid);
        } catch {
            // Already booted.
        }

        simctl("bootstatus", udid, "-b");
        safariLog = followSafari(udid);
        // The stream is running once it printed anything (`log stream` starts with "Filtering the log
        // data using ..."). A Safari already running (a Simulator booted before this run) logged its
        // activation before that; terminated, every open below launches a process the stream sees whole.
        await safariLog.ready;
        terminateSafari(udid);
    });

    afterAll(async () => {
        safariLog?.stop();
        try {
            simctl("shutdown", udid);
        } catch {
            // Not booted.
        }

        await fx?.close();
    });

    /**
     * Open a URL in Safari, once Safari is active. `simctl openurl` gives up after about 20 seconds,
     * and SpringBoard holds an open-URL request for an app until the app's launch activation
     * completes. `simctl launch` returns as soon as Safari's process exists, not when it is active: on
     * Safari's first launch after the Simulator booted, its code first ran 16 s after the process was
     * spawned and it became active 24 s after (issue #3654), so an openurl sent when launch returned
     * timed out. So wait until this Safari process logs that it became active, unless the last
     * activation change it logged before the launch already said so (Safari was in front).
     *
     * Being active is not enough when Safari's main thread is busy: after its web content processes
     * were killed, Safari's main thread logged nothing for 11.6 s (it ended with "Failed to take web
     * view snapshot"), SpringBoard held the open request until then, and `simctl openurl` gave up,
     * though SpringBoard delivered the URL to Safari right after (issue #3654, second failure). So
     * openurl's own time limit is not the test: when it gives up (code 60, "Operation timed out"),
     * wait for this Safari process to log that it received the URL. Any other failure is thrown.
     * @param url - The page.
     */
    async function openInSafari(url: string): Promise<void> {
        const from = safariLog.lines.length;
        // `simctl launch` prints "com.apple.mobilesafari: <pid>".
        const pid = simctl("launch", udid, SAFARI).trim().split(": ").at(-1) ?? "";
        assert.match(pid, /^\d+$/, "simctl launch printed Safari's pid");
        const change = new RegExp(`MobileSafari\\[${pid}:.*deactivation reasons: \\d+ -> \\d+;`);
        const active = new RegExp(`MobileSafari\\[${pid}:.*deactivation reasons: \\d+ -> 0;`);
        const last = safariLog.lines.filter((line) => change.test(line)).at(-1);
        if (last === undefined || !active.test(last)) {
            await safariLog.waitFor(active, last === undefined ? from : safariLog.lines.lastIndexOf(last) + 1);
        }

        const sent = safariLog.lines.length;
        try {
            simctl("openurl", udid, url);
        } catch (error) {
            if (!String((error as { stderr?: unknown }).stderr).includes("code=60")) {
                throw error;
            }

            console.log(`[ios] simctl openurl gave up; waiting for Safari ${pid} to receive the URL`);
            await safariLog.waitFor(
                new RegExp(`MobileSafari\\[${pid}:.*Received action\\(s\\) in scene-update: UIOpenURLAction`),
                sent,
            );
        }
    }

    /**
     * Open the self-driving page, let it save three edits and leave a fourth pending, do `between`
     * (the condition under test), open the page again, and assert the invariant on the restore.
     * @param key - The autosave key, and the tab label.
     * @param between - What happens to Safari after the edits; `from` is where its log for this scenario starts.
     * @returns The summary line.
     */
    async function scenario(key: string, between: (from: number) => string | Promise<string>): Promise<string> {
        const tab = key;
        onTestFailed(() => {
            console.log(`[ios] reports: ${JSON.stringify(fx.log.filter((e) => e.tab.startsWith(tab)))}`);
            diagnose(udid, tab);
        });
        const from = safariLog.lines.length;
        await openInSafari(fx.url({ key, tab, auto: 3, tail: 1, delay: 600_000, webgl: "off" }));
        const saved = await fx.waitFor((e) => e.tab === tab && e.type === "auto-saved");
        assert.strictEqual(saved.state, "saved", "the page saved its edits");
        const tail = await fx.waitFor((e) => e.tab === tab && e.type === "auto-tail");

        const what = await between(from);
        const lastSaved = fx.lastSaved(tab);
        const mark = fx.log.length;

        // Opened again. Safari may also reload the tab it had, in the background, at the same moment:
        // then the two pages start on the key together, the old one with this entry as its own (#4148).
        // The reopened page is in front, so it always reports: the wait ends on its ready, or on a
        // restore the old tab reported first -- never on the old tab alone, which iOS may suspend.
        const reopened = `${tab}.reopened`;
        const entry = fx.events(tab, "saved").at(-1)?.entry as string;
        await openInSafari(fx.url({ key, tab: reopened, webgl: "off" }));
        const ready = await fx.waitFor(
            (e) =>
                e.seq >= mark && e.type === "ready" && (e.tab === reopened || (e.tab === tab && e.restored !== null)),
        );
        const restored = ready.restored as { revision: number } | null;
        let revision: number;
        let by: string;
        if (restored === null) {
            // The old tab claimed its own entry first. iOS suspends a tab in the background, so it may
            // never report; the reopened page was told who holds the work and read that entry.
            assert.deepEqual(
                ready.available,
                [{ reason: "held-by-other-tab", id: entry }],
                `the reopened page restored nothing, so it must be told the other tab holds the work: ${JSON.stringify(ready)}`,
            );
            const held = (ready.entries as { id: string; revision: number; live: boolean }[]).find(
                (e) => e.id === entry,
            );
            assert.isTrue(held?.live, `the saved entry is held by the reloaded tab: ${JSON.stringify(ready.entries)}`);
            revision = held?.revision ?? 0;
            assert.isAtLeast(revision, lastSaved, "the held entry's revision is at least the last one saved");
            by = "held by the old tab, reloaded in the background";
        } else {
            ({ revision } = restored);
            assert.isAtLeast(revision, lastSaved, "the restored revision is at least the last one saved");
            assert.deepEqual(ready.probes, [revision], "every node's probe equals the restored revision");
            by = `restored by ${ready.tab === tab ? "the old tab, reloaded" : "the reopened tab"}`;
        }

        const hidden = fx.log.filter((e) => e.tab === tab && e.type === "visibility" && e.state === "hidden");
        console.log(
            `[ios] ${tab}: hidden reported by ${hidden.map((e) => `${(e.via as string | undefined) ?? "fetch"} at +${(e.at as number) - (tail.at as number)} ms`).join(", ") || "nothing"}`,
        );
        const landed = revision >= (tail.revision as number);
        const line = `iOS Simulator, ${what}: revision ${revision} ${by}, last saved ${lastSaved}; the pending edit ${landed ? "was" : "was not"} kept`;
        console.log(`[ios] ${line}`);
        if (process.env.GITHUB_STEP_SUMMARY) {
            appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${line}\n`);
        }

        return line;
    }

    /**
     * Switch to another app (Settings), as a reader does. Done once Safari's scene is in the
     * background, and then once the page reported hidden -- or once WebKit terminated the page's
     * process, which then reports nothing: in the Simulator the GPU process can crash until WebKit
     * gives up on the page and shows its own error page, and the saved work must survive that too.
     * @param tab - The scenario.
     * @param from - Where Safari's log for this scenario starts.
     * @returns How the page left: "hidden" or "terminated".
     */
    async function appSwitch(tab: string, from: number): Promise<"hidden" | "terminated"> {
        simctl("launch", udid, "com.apple.Preferences");
        await safariLog.waitFor(/UISceneDidEnterBackground/, from);
        const how = await Promise.race([
            fx
                .waitFor((e) => e.tab === tab && e.type === "visibility" && e.state === "hidden")
                .then(() => "hidden" as const),
            safariLog.waitFor(/processDidTerminate/, from).then(() => "terminated" as const),
        ]);
        console.log(
            `[ios] ${tab}: Safari in the background; the page ${how === "hidden" ? "reported hidden" : "had been terminated by WebKit"}`,
        );
        return how;
    }

    it("restores the saved work after an app switch and Safari terminated in the background", async () => {
        await scenario("ios-switch", async (from) => {
            const how = await appSwitch("ios-switch", from);
            return `app switch (page ${how}), Safari ${terminateSafari(udid)}`;
        });
    });

    it("restores the saved work after a memory warning in the background and Safari terminated", async () => {
        await scenario("ios-memory", async (from) => {
            const how = await appSwitch("ios-memory", from);
            // What Simulator's Debug > Simulate Memory Warning posts. A page cannot observe it; Safari
            // may drop the background tab's web process in answer, which the restore must survive.
            simctl("spawn", udid, "notifyutil", "-p", "com.apple.UIKit.SimulatorMemoryWarning");
            return `memory warning in the background (page ${how}), Safari ${terminateSafari(udid)}`;
        });
    });

    it("keeps the tab's session storage and its own entry when the reader returns to a discarded tab", async () => {
        const tab = "ios-return";
        onTestFailed(() => {
            console.log(`[ios] reports: ${JSON.stringify(fx.log.filter((e) => e.tab.startsWith(tab)))}`);
            diagnose(udid, tab);
        });
        const from = safariLog.lines.length;
        await openInSafari(fx.url({ key: tab, tab, auto: 2, list: 1, webgl: "off" }));
        const saved = await fx.waitFor((e) => e.tab === tab && e.type === "auto-saved");
        assert.strictEqual(saved.state, "saved", "the page saved its edits");
        const entry = fx.events(tab, "saved").at(-1)?.entry as string | undefined;
        assert.isString(entry, "the page reported the entry it writes");

        // Discard: switch away, then kill the page's web content process, as iOS does to a
        // background tab. Returning to Safari loads the tab again, in the same tab.
        await appSwitch(tab, from);
        const pages = processes().filter(
            (proc) => proc.cmdline.includes("CoreSimulator") && proc.cmdline.includes("WebKit.WebContent"),
        );
        kill(pages);
        const mark = fx.log.length;
        simctl("launch", udid, SAFARI);
        const listed = await fx.waitFor((e) => e.seq >= mark && e.tab === tab && e.type === "listed");
        const entries = listed.entries as { id: string; own?: boolean }[];
        assert.strictEqual(listed.item, entry, "session storage survived the discard");
        assert.deepEqual(
            entries.filter((e) => e.own === true).map((e) => e.id),
            [entry],
            "the returned tab owns its entry",
        );
        const line = `iOS Simulator, discard and return (${pages.length} web content processes killed): session storage kept, own entry found`;
        console.log(`[ios] ${line}`);
        if (process.env.GITHUB_STEP_SUMMARY) {
            appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${line}\n`);
        }
    });

    it("restores the saved work after Safari's web content process is killed", async () => {
        await scenario("ios-webcontent", () => {
            // The Simulator's processes run on the host; only this runner's one booted Simulator has a
            // WebContent process from a CoreSimulator runtime.
            const pages = processes().filter(
                (proc) => proc.cmdline.includes("CoreSimulator") && proc.cmdline.includes("WebKit.WebContent"),
            );
            kill(pages);
            return `web content process killed (${pages.length})`;
        });
    });
});
