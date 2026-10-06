/**
 * The adapter report of spec 12.3 (contract 6.6): the first step of every GPU job, so a driver regression is
 * visible in the log, and the "fails loudly on a software adapter" guard of the GPU lane. Also the source of
 * the runner class and the nvidia-smi sample that scripts/bench-compare.js reads (T-13 quiet-GPU rule).
 *
 * Runs AFTER `pnpm run build:all`: it imports dist/node.js (the ./node entry) for createNodeGpu and dawnFlags
 * ONLY -- never GpuContext -- so it works from P0 and never depends on the core. Sequence: createNodeGpu with
 * GRAPHTY_GPU_ADAPTER / GRAPHTY_DAWN_FEATURES, gpu.requestAdapter(), adapter.info, the policy verdict of
 * scripts/gpu-policy.js (GRAPHTY_GPU_REQUIRE), runnerClass(info, process.env) of scripts/runner-class.js
 * (honours GRAPHTY_RUNNER_CLASS, which gpu.yml sets to gpu-linux-t4), adapter.requestDevice() with the four
 * limits raised to the adapter's values (a default device from a fresh adapter when that request is refused),
 * the 4-byte round-trip latency (10 x writeBuffer + mapAsync of a 4-byte MAP_READ staging buffer, median),
 * then a 10 s sample of `nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader` at 1 Hz when
 * nvidia-smi exists. Prints ONE JSON document to stdout (diagnostics go to stderr; never pipe through tee).
 *
 * `node scripts/gpu-report.js --clocks <clock log> <bench log>` (issue #703) is a second, GPU-free mode: it reads the
 * 200 ms log gpu.yml records with `nvidia-smi --query-gpu=timestamp,clocks.sm,clocks.max.sm,pstate,power.draw
 * --format=csv -lms 200` while `pnpm run bench` runs, and the bench output with the same local time in front of every
 * line, and prints `{ groups: ClockGroup[] }`: per benchmark group, the min and median SM clock, the P-states seen and
 * the power draw. scripts/bench-compare.js cites it beside a regression, so a clock drop is told from slower code.
 *
 * Exit codes: 0 ok; 2 the policy is violated (ok: false, reason set); 3 no module / no adapter (dist/node.js
 * missing, E_NO_WEBGPU, or requestAdapter() null; reason set); 1 an unexpected error (message on stderr).
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { checkAdapter, isSoftwareInfo, parseGpuRequire } from "./gpu-policy.js";
import { runnerClass } from "./runner-class.js";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");

/** Exit code: the report is ok. */
export const EXIT_OK = 0;
/** Exit code: an unexpected error (the message is on stderr). */
export const EXIT_UNEXPECTED = 1;
/** Exit code: the adapter violates GRAPHTY_GPU_REQUIRE. */
export const EXIT_POLICY = 2;
/** Exit code: no module (dist/node.js or webgpu) or no adapter. */
export const EXIT_NO_ADAPTER = 3;
/** The four limits the report prints (spec 2.2, 4.6). */
export const LIMIT_NAMES = Object.freeze([
    "maxBufferSize",
    "maxStorageBufferBindingSize",
    "maxStorageBuffersPerShaderStage",
    "maxComputeWorkgroupsPerDimension",
]);
/** Round trips timed for the latency median. */
export const ROUND_TRIPS = 10;
/** Seconds of nvidia-smi sampling at 1 Hz. */
export const SMI_SECONDS = 10;

// GPUBufferUsage / GPUMapMode bits as numbers (src/device/webgpu-constants.ts values), so the script does not
// depend on createNodeGpu having installed the globals.
const BUFFER_USAGE_MAP_READ = 0x0001;
const BUFFER_USAGE_COPY_DST = 0x0008;
const MAP_MODE_READ = 0x0001;

/**
 * One 1 Hz nvidia-smi sample.
 * @typedef {{ utilizationGpu: number, memoryUsedMiB: number }} SmiSample
 */

/**
 * The nvidiaSmi block of the report (contract 6.6): the samples and their extremes; `minMemoryUsedMiB` is the
 * "own process footprint estimate" bench-compare's quiet-GPU rule subtracts (contract 6.8).
 * @typedef {object} SmiBlock
 * @property {boolean} available - whether nvidia-smi answered
 * @property {readonly SmiSample[]} samples - the samples, oldest first
 * @property {number} maxUtilization - the highest utilization.gpu seen
 * @property {number} maxMemoryUsedMiB - the highest memory.used seen
 * @property {number} minMemoryUsedMiB - the lowest memory.used seen
 */

/**
 * Parse one line of `nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader` ("0 %, 512 MiB").
 * @param {string} line - the line
 * @returns {{ utilizationGpu: number, memoryUsedMiB: number } | null} the sample, or null when the line does
 * not carry two numbers
 */
export function parseSmiLine(line) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 2) {
        return null;
    }
    const utilization = /^(\d+)/.exec(parts[0]);
    const memory = /^(\d+)/.exec(parts[1]);
    if (utilization === null || memory === null) {
        return null;
    }
    return { utilizationGpu: Number(utilization[1]), memoryUsedMiB: Number(memory[1]) };
}

/**
 * The nvidiaSmi block of the report from the collected samples.
 * @param {readonly SmiSample[]} samples - the 1 Hz samples
 * @returns {SmiBlock} the block (available: true)
 */
export function summarizeSamples(samples) {
    let maxUtilization = 0;
    let maxMemoryUsedMiB = 0;
    let minMemoryUsedMiB = samples.length === 0 ? 0 : Number.POSITIVE_INFINITY;
    for (const s of samples) {
        maxUtilization = Math.max(maxUtilization, s.utilizationGpu);
        maxMemoryUsedMiB = Math.max(maxMemoryUsedMiB, s.memoryUsedMiB);
        minMemoryUsedMiB = Math.min(minMemoryUsedMiB, s.memoryUsedMiB);
    }
    return { available: true, samples: [...samples], maxUtilization, maxMemoryUsedMiB, minMemoryUsedMiB };
}

/**
 * The median of a non-empty list.
 * @param {readonly number[]} values - the values
 * @returns {number} the median
 */
export function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The four limits of a GPUSupportedLimits as a plain object.
 * @param {GPUSupportedLimits} limits - adapter.limits or device.limits
 * @returns {Record<string, number>} the four values
 */
export function pickLimits(limits) {
    const out = {};
    for (const name of LIMIT_NAMES) {
        out[name] = limits[name];
    }
    return out;
}

/**
 * Sleep.
 * @param {number} ms - milliseconds
 * @returns {Promise<void>} resolves after ms
 */
function sleep(ms) {
    return new Promise((resolveSleep) => {
        setTimeout(resolveSleep, ms);
    });
}

/**
 * One nvidia-smi query; null when the binary is missing or fails.
 * @returns {{ utilizationGpu: number, memoryUsedMiB: number } | null} the first GPU's sample
 */
function queryNvidiaSmi() {
    const result = spawnSync("nvidia-smi", ["--query-gpu=utilization.gpu,memory.used", "--format=csv,noheader"], {
        encoding: "utf8",
    });
    if (result.error !== undefined || result.status !== 0 || typeof result.stdout !== "string") {
        return null;
    }
    const firstLine = result.stdout.split("\n").find((line) => line.trim() !== "");
    return firstLine === undefined ? null : parseSmiLine(firstLine);
}

/**
 * The 10 s nvidia-smi sample at 1 Hz.
 * @param {number} seconds - how many samples
 * @returns {Promise<SmiBlock>} the block
 */
async function sampleNvidiaSmi(seconds) {
    const first = queryNvidiaSmi();
    if (first === null) {
        return { available: false, samples: [], maxUtilization: 0, maxMemoryUsedMiB: 0, minMemoryUsedMiB: 0 };
    }
    const samples = [first];
    for (let i = 1; i < seconds; i++) {
        await sleep(1000);
        const sample = queryNvidiaSmi();
        if (sample !== null) {
            samples.push(sample);
        }
    }
    return summarizeSamples(samples);
}

/**
 * The median 4-byte round trip: writeBuffer into a MAP_READ | COPY_DST staging buffer, mapAsync, read, unmap.
 * @param {GPUDevice} device - the device
 * @returns {Promise<number>} the median of ROUND_TRIPS trips, milliseconds
 */
async function roundTripMs(device) {
    const staging = device.createBuffer({ size: 4, usage: BUFFER_USAGE_MAP_READ | BUFFER_USAGE_COPY_DST });
    const data = new Uint32Array(1);
    const times = [];
    for (let i = 0; i < ROUND_TRIPS; i++) {
        data[0] = i + 1;
        const start = performance.now();
        device.queue.writeBuffer(staging, 0, data);
        await staging.mapAsync(MAP_MODE_READ);
        const value = new Uint32Array(staging.getMappedRange())[0];
        staging.unmap();
        times.push(performance.now() - start);
        if (value !== i + 1) {
            throw new Error(`round trip ${i}: read ${value}, expected ${i + 1}`);
        }
    }
    staging.destroy();
    return median(times);
}

/**
 * The installed webgpu (Dawn) package version, or null when it cannot be resolved.
 * @returns {string | null} the version
 */
function webgpuVersion() {
    try {
        const require = createRequire(pathToFileURL(resolve(packageRoot, "package.json")).href);
        const manifest = JSON.parse(readFileSync(require.resolve("webgpu/package.json"), "utf8"));
        return typeof manifest.version === "string" ? manifest.version : null;
    } catch {
        return null;
    }
}

/**
 * The NodeGpuOptions of the environment (GRAPHTY_GPU_ADAPTER, GRAPHTY_DAWN_FEATURES).
 * @param {Readonly<Record<string, string | undefined>>} env - the environment
 * @returns {{ adapter?: string, dawnFeatures?: string[] }} the options (only defined keys)
 */
export function nodeGpuOptions(env) {
    const options = {};
    if (env.GRAPHTY_GPU_ADAPTER !== undefined && env.GRAPHTY_GPU_ADAPTER !== "") {
        options.adapter = env.GRAPHTY_GPU_ADAPTER;
    }
    if (env.GRAPHTY_DAWN_FEATURES !== undefined && env.GRAPHTY_DAWN_FEATURES !== "") {
        options.dawnFeatures = env.GRAPHTY_DAWN_FEATURES.split(",")
            .map((f) => f.trim())
            .filter((f) => f !== "");
    }
    return options;
}

/**
 * A document for a failure before any adapter facts exist.
 * @param {ReturnType<typeof parseGpuRequire>} policy - the parsed policy
 * @param {string} reason - the reason text
 * @param {string} runner - the runner class (the override or "unknown")
 * @returns {Record<string, unknown>} the document
 */
function failureDocument(policy, reason, runner) {
    return {
        ok: false,
        policy,
        adapter: null,
        deviceLimits: null,
        roundTripMs: null,
        runnerClass: runner,
        nvidiaSmi: { available: false, samples: [], maxUtilization: 0, maxMemoryUsedMiB: 0, minMemoryUsedMiB: 0 },
        webgpu: webgpuVersion(),
        node: process.version,
        reason,
    };
}

/**
 * One sample of the clock log.
 * @typedef {{ t: number, smMHz: number, maxSmMHz: number, pstate: string, powerW: number }} ClockSample
 */

/**
 * The clock record of one benchmark group; the clock and power fields are null when no sample fell inside it.
 * @typedef {object} ClockGroup
 * @property {string} group - the benchmark group
 * @property {number} samples - the clock samples taken while it ran
 * @property {number | null} smMinMHz - the lowest SM clock
 * @property {number | null} smMedianMHz - the median SM clock
 * @property {number | null} maxSmMHz - the card's maximum SM clock
 * @property {Record<string, number>} pstates - how many samples saw each P-state
 * @property {number | null} powerMinW - the lowest power draw
 * @property {number | null} powerMedianW - the median power draw
 */

/** "2026/10/02 06:41:00.200" at the start of a line: nvidia-smi's timestamp and the one gpu.yml stamps the bench log with. */
const STAMP = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})/;

/**
 * Milliseconds of a stamp. Both logs carry the runner's local time, so it is read as UTC on both sides alike.
 * @param {string} text - a line that may start with a stamp
 * @returns {number | null} the time, or null when the line has no stamp
 */
function stampMs(text) {
    const m = STAMP.exec(text);
    return m === null ? null : Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7]);
}

/**
 * Parse the clock log: `timestamp, clocks.current.sm [MHz], clocks.max.sm [MHz], pstate, power.draw [W]` rows;
 * the header and any line that is not a sample are skipped.
 * @param {string} text - the log
 * @returns {ClockSample[]} the samples, oldest first
 */
export function parseClockLog(text) {
    const samples = [];
    for (const line of text.split("\n")) {
        const parts = line.split(",").map((p) => p.trim());
        const t = stampMs(line);
        const sm = Number.parseFloat(parts[1]);
        const max = Number.parseFloat(parts[2]);
        if (t === null || parts.length < 5 || !Number.isFinite(sm)) {
            continue;
        }
        samples.push({ t, smMHz: sm, maxSmMHz: max, pstate: parts[3], powerW: Number.parseFloat(parts[4]) });
    }
    return samples;
}

/**
 * The group intervals of the stamped bench log: a group runs from its `== <group> (` header to the next one, the
 * last to the log's last stamped line.
 * @param {string} text - the bench output, a stamp in front of every line
 * @returns {{ group: string, start: number, end: number }[]} the groups in run order
 */
export function parseBenchLog(text) {
    const groups = [];
    let last = null;
    for (const line of text.split("\n")) {
        const t = stampMs(line);
        if (t === null) {
            continue;
        }
        last = t;
        const header = /^\S+ \S+ == (\S+) \(/.exec(line);
        if (header !== null) {
            if (groups.length > 0) {
                groups[groups.length - 1].end = t;
            }
            groups.push({ group: header[1], start: t, end: t });
        }
    }
    if (groups.length > 0 && last !== null) {
        groups[groups.length - 1].end = last;
    }
    return groups;
}

/**
 * The clock record of every group: the samples whose time falls in [start, end).
 * @param {readonly ClockSample[]} samples - parseClockLog's samples
 * @param {readonly { group: string, start: number, end: number }[]} groups - parseBenchLog's groups
 * @returns {ClockGroup[]} one record per group, in run order
 */
export function summarizeClocks(samples, groups) {
    return groups.map(({ group, start, end }) => {
        const inside = samples.filter((s) => s.t >= start && s.t < end);
        const pstates = {};
        for (const s of inside) {
            pstates[s.pstate] = (pstates[s.pstate] ?? 0) + 1;
        }
        const some = inside.length > 0;
        const sm = inside.map((s) => s.smMHz);
        const power = inside.map((s) => s.powerW).filter((w) => Number.isFinite(w));
        return {
            group,
            samples: inside.length,
            smMinMHz: some ? Math.min(...sm) : null,
            smMedianMHz: some ? median(sm) : null,
            maxSmMHz: some ? Math.max(...inside.map((s) => s.maxSmMHz)) : null,
            pstates,
            powerMinW: power.length > 0 ? Math.min(...power) : null,
            powerMedianW: power.length > 0 ? median(power) : null,
        };
    });
}

/**
 * Build the report.
 * @param {Readonly<Record<string, string | undefined>>} env - the environment
 * @returns {Promise<{ document: Record<string, unknown>, exitCode: number }>} the document and the exit code
 */
export async function report(env) {
    const policy = parseGpuRequire(env.GRAPHTY_GPU_REQUIRE);
    const overrideClass =
        env.GRAPHTY_RUNNER_CLASS !== undefined && env.GRAPHTY_RUNNER_CLASS !== ""
            ? env.GRAPHTY_RUNNER_CLASS
            : "unknown";
    const nodeEntry = resolve(packageRoot, "dist/node.js");
    if (!existsSync(nodeEntry)) {
        return {
            document: failureDocument(
                policy,
                `E_NO_WEBGPU: ${nodeEntry} not found; run "pnpm run build:all" first`,
                overrideClass,
            ),
            exitCode: EXIT_NO_ADAPTER,
        };
    }
    const { createNodeGpu, dawnFlags } = await import(pathToFileURL(nodeEntry).href);
    const options = nodeGpuOptions(env);
    console.error(`[gpu-report] dawn flags: ${JSON.stringify(dawnFlags(options))}`);
    let handle;
    try {
        handle = await createNodeGpu(options);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const code =
            error !== null && typeof error === "object" && "code" in error ? String(error.code) : "E_NO_WEBGPU";
        return { document: failureDocument(policy, `${code}: ${message}`, overrideClass), exitCode: EXIT_NO_ADAPTER };
    }
    try {
        const adapter = await handle.gpu.requestAdapter();
        if (adapter === null) {
            return {
                document: failureDocument(
                    policy,
                    "E_NO_ADAPTER: requestAdapter() returned null (no usable Vulkan ICD?)",
                    overrideClass,
                ),
                exitCode: EXIT_NO_ADAPTER,
            };
        }
        const { info } = adapter;
        const adapterInfo = {
            vendor: info.vendor,
            architecture: info.architecture,
            device: info.device,
            description: info.description,
            isFallbackAdapter: info.isFallbackAdapter,
        };
        const verdict = checkAdapter(adapterInfo, policy);
        const runner = runnerClass(adapterInfo, env);
        const adapterLine = [
            `vendor=${info.vendor}`,
            `architecture=${info.architecture}`,
            `device=${info.device}`,
            `description=${info.description}`,
            `software=${String(isSoftwareInfo(adapterInfo))}`,
            `runnerClass=${runner}`,
        ].join(" ");
        console.error(`[gpu-report] adapter ${adapterLine}`);
        const requiredLimits = pickLimits(adapter.limits);
        let device;
        try {
            device = await adapter.requestDevice({ requiredLimits });
        } catch (error) {
            const refusal = error instanceof Error ? error.message : String(error);
            console.error(
                `[gpu-report] requestDevice with raised limits refused (${refusal}); ` +
                    "using a default device from a fresh adapter",
            );
            const fresh = await handle.gpu.requestAdapter();
            if (fresh === null) {
                throw new Error("requestAdapter() returned null on the second request");
            }
            device = await fresh.requestDevice();
        }
        const deviceLimits = pickLimits(device.limits);
        let latency = null;
        try {
            latency = await roundTripMs(device);
        } finally {
            device.destroy();
        }
        const nvidiaSmi = await sampleNvidiaSmi(SMI_SECONDS);
        const document = {
            ok: verdict.ok,
            policy,
            adapter: {
                vendor: info.vendor,
                architecture: info.architecture,
                device: info.device,
                description: info.description,
                software: isSoftwareInfo(adapterInfo),
                subgroupMinSize: typeof info.subgroupMinSize === "number" ? info.subgroupMinSize : 0,
                subgroupMaxSize: typeof info.subgroupMaxSize === "number" ? info.subgroupMaxSize : 0,
                features: [...adapter.features].sort(),
                limits: requiredLimits,
            },
            deviceLimits,
            roundTripMs: latency,
            runnerClass: runner,
            nvidiaSmi,
            webgpu: webgpuVersion(),
            node: process.version,
            reason: verdict.reason,
        };
        return { document, exitCode: verdict.ok ? EXIT_OK : EXIT_POLICY };
    } finally {
        handle.dispose();
    }
}

/**
 * Print the report and exit with its code.
 * @returns {Promise<void>} resolves before process.exit
 */
async function main() {
    if (process.argv[2] === "--clocks") {
        const [clockFile, benchFile] = process.argv.slice(3);
        if (clockFile === undefined || benchFile === undefined) {
            console.error("usage: gpu-report.js --clocks <clock log> <bench log>");
            process.exit(EXIT_UNEXPECTED);
        }
        const groups = summarizeClocks(
            parseClockLog(readFileSync(clockFile, "utf8")),
            parseBenchLog(readFileSync(benchFile, "utf8")),
        );
        process.stdout.write(`${JSON.stringify({ groups }, null, 4)}\n`);
        return;
    }
    let outcome;
    try {
        outcome = await report(process.env);
    } catch (error) {
        console.error(
            `[gpu-report] unexpected error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
        );
        process.exit(EXIT_UNEXPECTED);
    }
    process.stdout.write(`${JSON.stringify(outcome.document, null, 4)}\n`);
    process.exit(outcome.exitCode);
}

const isMain = process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
    await main();
}
