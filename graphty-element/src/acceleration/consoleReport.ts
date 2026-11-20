/**
 * @file The one console line that tells a developer acceleration was wanted and is off.
 *
 * `capabilities.acceleration` already says why the element is on the CPU path, but a status
 * nobody reads is a silent fallback. So a probe that ends unavailable also prints one line,
 * starting with its code so it can be searched for, once per page per code -- never per probe,
 * because a warning that repeats is a warning people learn to silence.
 *
 * Nothing is printed when the GPU was never asked for: the package is not installed
 * (`E_MISSING_PACKAGE`), or nothing registered an accelerator at all
 * (`E_NO_ACCELERATOR_REGISTERED`). A consumer who installed the package and wants the CPU says so
 * with `acceleration="off"`, which never probes and so never prints.
 *
 * The line is not stripped from production builds: the device that lacks WebGPU is the end
 * user's, not the developer's.
 */

import { sharedStore } from "../catalog/pluginRegistry";
import type { AccelerationErrorCode } from "../errors";

/** Codes that mean the GPU was never asked for, so nothing is printed. */
const SILENT: ReadonlySet<AccelerationErrorCode> = new Set(["E_MISSING_PACKAGE", "E_NO_ACCELERATOR_REGISTERED"]);

/** Codes that mean the GPU package is installed and broken, printed as an error. */
const BROKEN: ReadonlySet<AccelerationErrorCode> = new Set(["E_ACCELERATOR_FAILED", "E_ACCELERATOR_INCOMPATIBLE"]);

/** The codes already printed on this page, shared by every copy of the element. */
const printed = sharedStore("acceleration-console", () => new Set<string>());

/**
 * Prints one line for an unavailable probe, the first time its code is seen on this page.
 * @param code - Why acceleration is unavailable.
 * @param reason - What the probe said, for the developer reading the console.
 */
export function reportUnavailable(code: AccelerationErrorCode | undefined, reason: string | undefined): void {
    if (code === undefined || SILENT.has(code) || printed.has(code)) {
        return;
    }

    printed.add(code);
    const line = `[graphty-element] ${code}: ${reason ?? "acceleration is unavailable"}`;
    if (BROKEN.has(code)) {
        console.error(line);
    } else {
        console.warn(line);
    }
}

/**
 * Forgets which codes were printed. Written for tests, which each need a fresh page.
 */
export function resetUnavailableReports(): void {
    printed.clear();
}
