/**
 * The iOS Simulator the iOS lifecycle test runs in (ios-simulator.test.ts), and booting it.
 *
 * Run on its own (`node test/lifecycle/simulator.ts`), it boots that Simulator and says how long it
 * took. The macOS workflow does this in a step of its own before the test: a Simulator's first boot
 * on a fresh runner took 3 minutes in one run and 22 in another (full run 44312561274, issue #8852),
 * and inside the test file's beforeAll those minutes counted against the file guard, which then ended
 * the run in the middle of the third test. Booted already, the test's own boot returns at once.
 */

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/**
 * Run `xcrun simctl`.
 * @param args - Its arguments.
 * @returns What it printed.
 */
export function simctl(...args: string[]): string {
    // stderr piped, not inherited: a failure the caller expects ("found nothing to terminate") prints
    // nothing, and every failure carries it on the error.
    return execFileSync("xcrun", ["simctl", ...args], {
        encoding: "utf8",
        maxBuffer: 256 << 20,
        stdio: ["ignore", "pipe", "pipe"],
    });
}

/**
 * The newest iPad the installed runtimes offer, else the newest iPhone.
 * @returns Its udid.
 */
export function pickDevice(): string {
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
 * Boot the Simulator the test uses, and wait until it has finished booting.
 * @returns Its udid.
 */
export function bootSimulator(): string {
    const udid = pickDevice();
    try {
        simctl("boot", udid);
    } catch {
        // Already booted.
    }

    simctl("bootstatus", udid, "-b");
    return udid;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const start = Date.now();
    const udid = bootSimulator();
    console.log(`iOS Simulator ${udid} booted in ${Math.round((Date.now() - start) / 1000)} s`);
}
