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
 * The Simulator has no memory-pressure killer and no 7-day storage rule; those are the iPad
 * protocol's (design/work-protection/ipad-protocol.md).
 */

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { type Fixture, startFixture } from "./fixture";

const MACOS = process.platform === "darwin" && process.env.GRAPHTY_LIFECYCLE_MACOS === "1";
const SAFARI = "com.apple.mobilesafari";

/**
 * Run `xcrun simctl`.
 * @param args - Its arguments.
 * @returns What it printed.
 */
function simctl(...args: string[]): string {
    return execFileSync("xcrun", ["simctl", ...args], { encoding: "utf8" });
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

    it("restores the saved work after an app switch and Safari terminated in the background", async () => {
        const key = "ios-switch";
        const tab = key;
        simctl("openurl", udid, fx.url({ key, tab, auto: 3, tail: 1, delay: 600_000 }));
        const saved = await fx.waitFor((e) => e.tab === tab && e.type === "auto-saved");
        assert.strictEqual(saved.state, "saved", "the page saved its edits");
        const tail = await fx.waitFor((e) => e.tab === tab && e.type === "auto-tail");

        simctl("launch", udid, "com.apple.Preferences");
        await fx.waitFor((e) => e.tab === tab && e.type === "visibility" && e.state === "hidden");
        simctl("terminate", udid, SAFARI);
        const lastSaved = fx.lastSaved(tab);
        const mark = fx.log.length;

        // Opened again: Safari may also reload the tab it had, so the first page to report a restore counts.
        simctl("openurl", udid, fx.url({ key, tab: `${tab}.reopened` }));
        const ready = await fx.waitFor(
            (e) => e.seq >= mark && e.type === "ready" && (e.restored as { revision: number } | null) !== null,
        );
        const restored = ready.restored as { revision: number };
        assert.isAtLeast(restored.revision, lastSaved, "the restored revision is at least the last one saved");
        assert.deepEqual(ready.probes, [restored.revision], "every node's probe equals the restored revision");

        const landed = restored.revision >= (tail.revision as number);
        const line = `iOS Simulator: restored revision ${restored.revision}, last saved ${lastSaved}; the write on hide ${landed ? "landed" : "did not land"} before Safari was terminated`;
        console.log(`[ios] ${line}`);
        if (process.env.GITHUB_STEP_SUMMARY) {
            appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${line}\n`);
        }
    });
});
