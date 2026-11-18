/**
 * The iOS Simulator the iOS lifecycle test runs in: which one, and booting it.
 *
 * Run on its own (`pnpm exec tsx test/lifecycle/ios-device.ts`), it boots the device and returns once
 * it is booted. The macOS workflow does that in a step before the test: a first boot on a fresh
 * hosted runner took 22 minutes (issue #8861), and inside the test's beforeAll that counted against
 * the test file's hang guard, which then ended a run whose tests were passing. The test boots it
 * too, which returns at once when the device is already up.
 */

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Run `xcrun simctl`.
 * @param args - Its arguments.
 * @returns What it printed.
 */
export function simctl(...args: string[]): string {
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
 * Pick the device and boot it, returning once it finished booting. Says how long each part took,
 * so a slow boot is named in the run.
 * @returns Its udid.
 */
export function bootSimulator(): string {
    const udid = pickDevice();
    const start = Date.now();
    try {
        simctl("boot", udid);
    } catch {
        // Already booted.
    }

    const booted = Date.now();
    simctl("bootstatus", udid, "-b");
    console.log(
        `[ios] Simulator ${udid}: boot ${Math.round((booted - start) / 1000)} s, bootstatus ${Math.round((Date.now() - booted) / 1000)} s`,
    );
    return udid;
}

if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    bootSimulator();
}
