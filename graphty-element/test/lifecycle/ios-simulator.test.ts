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
 * The Simulator has no memory-pressure killer and no 7-day storage rule; those are the iPad
 * protocol's (design/work-protection/ipad-protocol.md).
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, assert, beforeAll, describe, it, onTestFailed } from "vitest";

import { processes } from "./cdp-harness";
import { kill } from "./engines";
import { type Fixture, startFixture } from "./fixture";

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
    } catch (error) {
        console.log(`[ios] ${tab}: could not save the diagnostics: ${String(error)}`);
    }
}

describe.skipIf(!MACOS)("Safari in the iOS Simulator", () => {
    let fx: Fixture;
    let udid: string;

    beforeAll(async () => {
        fx = await startFixture();
        udid = pickDevice();
        try {
            simctl("boot", udid);
        } catch {
            // Already booted.
        }

        simctl("bootstatus", udid, "-b");
    });

    afterAll(async () => {
        try {
            simctl("shutdown", udid);
        } catch {
            // Not booted.
        }

        await fx?.close();
    });

    /**
     * Open the self-driving page, let it save three edits and leave a fourth pending, do `between`
     * (the condition under test), open the page again, and assert the invariant on the restore.
     * @param key - The autosave key, and the tab label.
     * @param between - What happens to Safari after the edits.
     * @returns The summary line.
     */
    async function scenario(key: string, between: () => string | Promise<string>): Promise<string> {
        const tab = key;
        onTestFailed(() => {
            console.log(`[ios] reports: ${JSON.stringify(fx.log.filter((e) => e.tab.startsWith(tab)))}`);
            diagnose(udid, tab);
        });
        simctl("openurl", udid, fx.url({ key, tab, auto: 3, tail: 1, delay: 600_000 }));
        const saved = await fx.waitFor((e) => e.tab === tab && e.type === "auto-saved");
        assert.strictEqual(saved.state, "saved", "the page saved its edits");
        const tail = await fx.waitFor((e) => e.tab === tab && e.type === "auto-tail");

        const what = await between();
        const lastSaved = fx.lastSaved(tab);
        const mark = fx.log.length;

        // Opened again: Safari may also reload the tab it had, so the first page to report a restore counts.
        simctl("openurl", udid, fx.url({ key, tab: `${tab}.reopened` }));
        const ready = await fx.waitFor(
            (e) =>
                e.seq >= mark &&
                e.type === "ready" &&
                e.tab.startsWith(tab) &&
                (e.restored as { revision: number } | null) !== null,
        );
        const restored = ready.restored as { revision: number };
        assert.isAtLeast(restored.revision, lastSaved, "the restored revision is at least the last one saved");
        assert.deepEqual(ready.probes, [restored.revision], "every node's probe equals the restored revision");

        const hidden = fx.log.filter((e) => e.tab === tab && e.type === "visibility" && e.state === "hidden");
        console.log(
            `[ios] ${tab}: hidden reported by ${hidden.map((e) => `${(e.via as string | undefined) ?? "fetch"} at +${(e.at as number) - (tail.at as number)} ms`).join(", ") || "nothing"}`,
        );
        const landed = restored.revision >= (tail.revision as number);
        const line = `iOS Simulator, ${what}: restored revision ${restored.revision}, last saved ${lastSaved}; the pending edit ${landed ? "was" : "was not"} kept`;
        console.log(`[ios] ${line}`);
        if (process.env.GITHUB_STEP_SUMMARY) {
            appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${line}\n`);
        }

        return line;
    }

    /** Switch to another app (Settings), as a reader does, and wait until the page reported hidden. */
    async function appSwitch(tab: string): Promise<void> {
        simctl("launch", udid, "com.apple.Preferences");
        await fx.waitFor((e) => e.tab === tab && e.type === "visibility" && e.state === "hidden");
    }

    it("restores the saved work after an app switch and Safari terminated in the background", async () => {
        await scenario("ios-switch", async () => {
            await appSwitch("ios-switch");
            simctl("terminate", udid, SAFARI);
            return "app switch, Safari terminated";
        });
    });

    it("restores the saved work after a memory warning in the background and Safari terminated", async () => {
        await scenario("ios-memory", async () => {
            await appSwitch("ios-memory");
            // What Simulator's Debug > Simulate Memory Warning posts. A page cannot observe it; Safari
            // may drop the background tab's web process in answer, which the restore must survive.
            simctl("spawn", udid, "notifyutil", "-p", "com.apple.UIKit.SimulatorMemoryWarning");
            simctl("terminate", udid, SAFARI);
            return "memory warning in the background, Safari terminated";
        });
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
