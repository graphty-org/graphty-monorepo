/**
 * Does the shipped device self-check fire on THIS machine, and does a public algorithm refuse when it does?
 *
 * The self-check (src/primitives/verify.ts) runs one real exclusive scan of known numbers before this package
 * computes anything on a device, so a driver that returns wrong numbers is refused rather than believed. Every
 * adapter reachable from the development machines computes it correctly, so nothing there can show the check
 * FIRING -- only that it does not fire wrongly. The Windows host leg is the machine that fails: Dawn's D3D12
 * backend over the Microsoft Basic Render Driver gets every multi-workgroup prefix sum wrong, and Microsoft's
 * redistributable renderer beside the host executable makes the same code correct. This script is what asks
 * that machine, on both renderers.
 *
 *     node scripts/device-check-question.mjs
 *
 * It creates a context the way a consumer would (createNodeGpuContext, honouring GRAPHTY_GPU_ADAPTER and
 * GRAPHTY_DAWN_FEATURES), awaits verifyDevice for the record, then calls `degree` -- a public algorithm, gated
 * like every other compute entry point -- to show what a caller actually gets. Every line is printed under the
 * marker [device-check]; the last one begins "VERDICT:" and says which of three things happened:
 *
 *     THE GUARD FIRED      the scan came back wrong and degree refused with E_DEVICE_INCORRECT (exit 3)
 *     THE GUARD IS SILENT  the scan was correct and degree returned its numbers (exit 0)
 *     UNKNOWN              the question could not be asked -- no adapter, a lost device (exit 1)
 *
 * Runs AFTER `pnpm run build:all`: it imports dist/node.js and dist/webgpu-graph-algorithms.js, the two entries
 * a consumer imports, so what it exercises is what ships and not the sources beside it.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { nodeGpuOptions } from "./gpu-report.js";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");

/** Exit code: the check passed and the algorithm computed -- the guard did not fire. */
export const EXIT_SILENT = 0;
/** Exit code: the question could not be asked (no module, no adapter, a lost device). */
export const EXIT_UNKNOWN = 1;
/** Exit code: the check failed and the algorithm refused -- the guard fired. */
export const EXIT_FIRED = 3;

/** The marker every line carries, so one grep over a job log tells the story. */
const MARKER = "[device-check]";

/**
 * Print one line under the marker.
 * @param {string} text - the line
 * @returns {void}
 */
function say(text) {
    console.log(`${MARKER} ${text}`);
}

/**
 * The message of a thrown value.
 * @param {unknown} error - the thrown value
 * @returns {string} its message
 */
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}

/**
 * The error code of a thrown value, or null when it carries none.
 * @param {unknown} error - the thrown value
 * @returns {string | null} the code
 */
function codeOf(error) {
    return error !== null && typeof error === "object" && "code" in error ? String(error.code) : null;
}

/**
 * Import one built entry.
 * @param {string} name - the file under dist/ (`node.js`)
 * @returns {Promise<Record<string, unknown>>} the module namespace
 */
async function entry(name) {
    const file = resolve(packageRoot, "dist", name);
    if (!existsSync(file)) {
        throw new Error(`${file} not found; run "pnpm run build:all" first`);
    }
    return import(pathToFileURL(file).href);
}

/**
 * Ask the question and print the answer.
 * @returns {Promise<number>} the exit code
 */
async function ask() {
    const { createNodeGpuContext } = await entry("node.js");
    const { degree, verifyDevice } = await entry("webgpu-graph-algorithms.js");
    const { fromEdgeArrays } = await import("@graphty/graph-format");
    const options = nodeGpuOptions(process.env);
    say(`options ${JSON.stringify(options)}`);
    const ctx = await createNodeGpuContext({ ...options, label: "device-check-question" });
    try {
        const { caps } = ctx;
        say(`adapter vendor=${caps.vendor} architecture=${caps.architecture} device=${caps.device}`);
        say(`adapter description=${caps.description}`);
        const check = await verifyDevice(ctx);
        say(
            `scan ok=${String(check.ok)} blocks=${String(check.blocks)} count=${String(check.count)} ` +
                `wg=${String(check.workgroupSize)} ms=${check.ms.toFixed(2)}`,
        );
        const { mismatch } = check;
        if (mismatch !== null) {
            const how = mismatch.poison
                ? "nothing wrote it (the poison word the check left there survived the dispatch)"
                : "a different number came back";
            say(
                `mismatch ${mismatch.where} = ${String(mismatch.actual)}, expected ${String(mismatch.expected)} -- ${how}`,
            );
        }
        // what a caller actually gets: degree is a public algorithm and is gated like every compute entry point
        const snapshot = fromEdgeArrays({
            directed: false,
            nodeCount: 3,
            src: new Uint32Array([0, 1]),
            dst: new Uint32Array([1, 2]),
        });
        let refusal = null;
        let degrees = null;
        try {
            degrees = await degree(ctx, snapshot);
        } catch (error) {
            refusal = error;
        }
        if (refusal !== null && codeOf(refusal) === "E_DEVICE_INCORRECT") {
            say(`degree() refused: ${messageOf(refusal)}`);
        } else if (refusal !== null) {
            say(`degree() threw something else (${codeOf(refusal) ?? "no code"}): ${messageOf(refusal)}`);
            say("VERDICT: UNKNOWN -- the algorithm failed for a reason that is not the self-check, so this run");
            say("VERDICT: settles nothing about the guard on this machine.");
            return EXIT_UNKNOWN;
        } else {
            say(`degree() returned [${Array.from(degrees ?? []).join(", ")}] (expected [1, 2, 1])`);
        }
        if (check.ok && refusal === null) {
            say("VERDICT: THE GUARD IS SILENT -- this device computed the known scan correctly and the public");
            say("VERDICT: algorithm ran. Nothing was refused, which is what a working renderer must produce.");
            return EXIT_SILENT;
        }
        if (!check.ok && refusal !== null) {
            say("VERDICT: THE GUARD FIRED -- this device computes multi-workgroup shaders incorrectly, the check");
            say("VERDICT: caught it, and the public algorithm refused with E_DEVICE_INCORRECT instead of");
            say("VERDICT: returning a wrong number. This is the outcome the guard exists for.");
            return EXIT_FIRED;
        }
        say(`VERDICT: UNKNOWN -- the check said ok=${String(check.ok)} but degree() did the opposite, so the`);
        say("VERDICT: check and the gate disagree. That is a defect in this package, not in the driver.");
        return EXIT_UNKNOWN;
    } finally {
        ctx.dispose();
    }
}

/**
 * Print the answer and exit with its code.
 * @returns {Promise<void>} resolves before process.exit
 */
async function main() {
    let code;
    try {
        code = await ask();
    } catch (error) {
        say(`could not ask: ${codeOf(error) ?? "no code"} ${messageOf(error)}`);
        say("VERDICT: UNKNOWN -- no device answered, so this run says nothing about the guard either way.");
        code = EXIT_UNKNOWN;
    }
    process.exit(code);
}

const isMain = process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
    await main();
}
