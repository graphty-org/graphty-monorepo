/**
 * A matrix of tiny kernels that names WHICH shader construct a backend gets wrong when a multi-block scan fails.
 *
 * Why it exists: on Dawn's D3D12 backend over the Microsoft Basic Render Driver -- the Windows leg of the host
 * matrix, where the published dawn-node compiles through d3dcompiler_47.dll because it ships neither dxcompiler.dll
 * nor dxil.dll -- every multi-block exclusive scan is wrong while every single-block scan is right, and the grid
 * tier built on the scan fails with it. Three shapes of the scan kernel have been measured there against a
 * two-block input of ones: the ORIGINAL, which read the workgroup id before the barrier loop and used it after,
 * left the second block's range at the test's poison fill and returned the second block's own sum at index zero,
 * as if that workgroup's id were zero; a workgroup-memory BROADCAST of the id, published by lane zero before the
 * loop, fixed the per-element writes and zeroed every block sum, including the single-block case that had always
 * been right; and reading the id AFTER the loop, the shape the reduce kernel uses and which is bitwise correct
 * there across 1311 workgroups, reproduced the original exactly. So "the value is lost across a barrier" does not
 * explain what that device does, and the fault could as easily be the index arithmetic, the single-lane store or
 * the workgroup array. Each case below moves exactly one of those.
 *
 * Every case dispatches four workgroups of 256 lanes into a freshly poisoned pair of buffers and prints one
 * `[wgid-probe]` line: per workgroup, whether its 256-word range holds what it must and what it holds instead,
 * then the four-word sums array. Only cases 1, 3 and 7 are asserted, because only those three are guaranteed by
 * the WebGPU specification in a shape no reading of it can excuse -- a plain store indexed by the workgroup id,
 * with no barrier and no workgroup memory anywhere. The rest are PRINTED and not asserted, so this file stays
 * green on the platforms where everything works and still reports, on the platform where it does not, the one
 * construct that moved.
 */

import { type U32 } from "@graphty/graph-format";

import { MAX_WORKGROUPS_PER_DIM } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { ShaderStage } from "../../src/device/webgpu-constants.js";
import { readU32, uploadBuffer } from "../helpers/device.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/** Lanes per workgroup, fixed rather than taken from the device so every adapter prints a comparable line. */
const WG = 256;

/** Workgroups dispatched per case: enough that a collapse into block zero is unmistakable, small enough to print. */
const GROUPS = 4;

/** The fill of both buffers before every case, so a word nothing wrote is visible as `poison`. */
const POISON = 0xdeadbeef;

/** The value the cases that test an INDEX store, chosen so it can never be mistaken for a workgroup id or poison. */
const MARK = 4242;

/**
 * The shared preamble of every probe kernel: the two storage buffers, the workgroup scratch, `group_id` exactly as
 * src/kernel/prelude.ts declares it, and `barrier_loop` -- the scan's Hillis-Steele loop verbatim, eight rounds of
 * read, barrier, write, barrier over a workgroup array.
 * @param body - the case's kernel body, already indented
 * @returns the complete WGSL module
 */
function probeWgsl(body: string): string {
    return /* wgsl */ `
const WG: u32 = ${String(WG)}u;
const MAX_WORKGROUPS_PER_DIM: u32 = ${String(MAX_WORKGROUPS_PER_DIM)}u;
const MARK: u32 = ${String(MARK)}u;

@group(0) @binding(0) var<storage, read_write> out: array<u32>;
@group(0) @binding(1) var<storage, read_write> sums: array<u32>;

var<workgroup> sh: array<u32, WG>;
var<workgroup> gid_sh: u32;

fn group_id(wid: vec3<u32>) -> u32 { return wid.x + wid.y * MAX_WORKGROUPS_PER_DIM; }

fn barrier_loop(lid: u32) {
    sh[lid] = 1u;
    workgroupBarrier();
    for (var s = 1u; s < WG; s = s * 2u) {
        var t = 0u;
        if (lid >= s) { t = sh[lid - s]; }
        workgroupBarrier();
        sh[lid] = sh[lid] + t;
        workgroupBarrier();
    }
}

@compute @workgroup_size(WG)
fn main(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
${body}
}
`;
}

/** One case of the matrix: its name, its kernel body, and what each word of `out` must hold afterwards. */
interface ProbeCase {
    readonly name: string;
    readonly body: string;
    /** The value every word of workgroup `wg`'s range of `out` should hold (POISON when the case writes only sums). */
    readonly outExpected: (wg: number) => number;
    /** What every word of `sums` should hold (POISON when the case writes only `out`). */
    readonly sumsExpected: number;
}

/** The workgroup id each lane should find, used as the expected value of the cases that store the id itself. */
function ownGroup(wg: number): number {
    return wg;
}

/** POISON, used as the expected fill of the buffer a case never writes. */
function untouched(): number {
    return POISON;
}

/**
 * The matrix. Cases 2 and 4 read the id BEFORE the barrier loop and use it after -- the original kernel's shape,
 * the one measurement has not yet taken apart; reading it after the loop instead was already measured on the
 * Windows runner and behaved identically to the original.
 */
const CASES: readonly ProbeCase[] = Object.freeze([
    {
        name: "1-id-value-no-barrier",
        body: "    let g = group_id(wid);\n    out[g * WG + lid.x] = g;",
        outExpected: ownGroup,
        sumsExpected: POISON,
    },
    {
        name: "2-id-value-across-barrier-loop",
        body: "    let g = group_id(wid);\n    barrier_loop(lid.x);\n    out[g * WG + lid.x] = g;",
        outExpected: ownGroup,
        sumsExpected: POISON,
    },
    {
        name: "3-last-lane-store-no-barrier",
        body: "    let g = group_id(wid);\n    if (lid.x == WG - 1u) { sums[g] = MARK; }",
        outExpected: untouched,
        sumsExpected: MARK,
    },
    {
        name: "4-last-lane-store-across-barrier-loop",
        body: "    let g = group_id(wid);\n    barrier_loop(lid.x);\n    if (lid.x == WG - 1u) { sums[g] = MARK; }",
        outExpected: untouched,
        sumsExpected: MARK,
    },
    {
        name: "5-last-lane-store-id-from-broadcast",
        body:
            "    if (lid.x == 0u) { gid_sh = group_id(wid); }\n" +
            "    workgroupBarrier();\n" +
            "    barrier_loop(lid.x);\n" +
            "    let g = gid_sh;\n" +
            "    if (lid.x == WG - 1u) { sums[g] = MARK; }",
        outExpected: untouched,
        sumsExpected: MARK,
    },
    {
        name: "6-lane-zero-store-id-from-workgroup-array",
        body:
            "    sh[lid.x] = group_id(wid);\n" +
            "    workgroupBarrier();\n" +
            "    if (lid.x == 0u) { sums[sh[WG - 1u]] = MARK; }",
        outExpected: untouched,
        sumsExpected: MARK,
    },
    {
        name: "7-control-constant-at-id-index",
        body: "    let g = group_id(wid);\n    out[g * WG + lid.x] = MARK;",
        outExpected: () => MARK,
        sumsExpected: POISON,
    },
]);

/** What one case's dispatch left in the two buffers. */
interface ProbeResult {
    readonly out: U32;
    readonly sums: U32;
}

/**
 * Compiles one case, dispatches GROUPS workgroups of WG lanes over a freshly poisoned pair of buffers and reads
 * both back. The pipeline is built straight on the device with an explicit layout, never through the kernel
 * registry, so no probe key reaches the normative compile matrix.
 * @param ctx - the context
 * @param probe - the case
 * @returns the two buffers as read back
 */
async function runProbe(ctx: GpuContext, probe: ProbeCase): Promise<ProbeResult> {
    const out = uploadBuffer(ctx, new Uint32Array(GROUPS * WG).fill(POISON), `wgid-probe/${probe.name}/out`);
    const sums = uploadBuffer(ctx, new Uint32Array(GROUPS).fill(POISON), `wgid-probe/${probe.name}/sums`);
    try {
        const layout = ctx.device.createBindGroupLayout({
            label: `wgid-probe/${probe.name}`,
            entries: [
                { binding: 0, visibility: ShaderStage.COMPUTE, buffer: { type: "storage" } },
                { binding: 1, visibility: ShaderStage.COMPUTE, buffer: { type: "storage" } },
            ],
        });
        const pipeline = ctx.device.createComputePipeline({
            label: `wgid-probe/${probe.name}`,
            layout: ctx.device.createPipelineLayout({ bindGroupLayouts: [layout] }),
            compute: {
                module: ctx.device.createShaderModule({
                    label: `wgid-probe/${probe.name}`,
                    code: probeWgsl(probe.body),
                }),
                entryPoint: "main",
            },
        });
        const group = ctx.device.createBindGroup({
            label: `wgid-probe/${probe.name}`,
            layout,
            entries: [
                { binding: 0, resource: { buffer: out } },
                { binding: 1, resource: { buffer: sums } },
            ],
        });
        const encoder = ctx.device.createCommandEncoder({ label: `wgid-probe/${probe.name}` });
        const pass = encoder.beginComputePass({ label: `wgid-probe/${probe.name}` });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, group);
        pass.dispatchWorkgroups(GROUPS, 1, 1);
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        return { out: await readU32(ctx, out, GROUPS * WG), sums: await readU32(ctx, sums, GROUPS) };
    } finally {
        out.destroy();
        sums.destroy();
    }
}

/**
 * One word, with the poison fill named rather than printed as 3735928559.
 * @param value - the word
 * @returns the text
 */
function show(value: number): string {
    return value === POISON ? "poison" : String(value);
}

/**
 * One workgroup's 256-word range of `out`: `wgN=ok(v)`, or `wgN=BAD(want v; got a x n, b x m)` with the values
 * actually present, commonest first.
 * @param words - the whole out buffer
 * @param wg - the workgroup index
 * @param expected - what every word of the range should hold
 * @returns the text
 */
function rangeReport(words: U32, wg: number, expected: number): string {
    const counts = new Map<number, number>();
    let bad = 0;
    for (let i = 0; i < WG; i++) {
        const value = words[wg * WG + i];
        if (value !== expected) {
            bad++;
        }
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    if (bad === 0) {
        return `wg${String(wg)}=ok(${show(expected)})`;
    }
    const seen = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const head = seen
        .slice(0, 3)
        .map(([value, n]) => `${show(value)}x${String(n)}`)
        .join(",");
    const more = seen.length > 3 ? `,+${String(seen.length - 3)}more` : "";
    return `wg${String(wg)}=BAD(want ${show(expected)}; got ${head}${more})`;
}

/**
 * The single greppable line of one case.
 * @param probe - the case
 * @param result - what the device produced
 * @returns the line
 */
function probeLine(probe: ProbeCase, result: ProbeResult): string {
    const ranges: string[] = [];
    for (let wg = 0; wg < GROUPS; wg++) {
        ranges.push(rangeReport(result.out, wg, probe.outExpected(wg)));
    }
    const sums = [...result.sums].map(show).join(",");
    return `[wgid-probe] ${probe.name} | out: ${ranges.join(" ")} | sums=[${sums}] want=[${show(probe.sumsExpected)} x${String(GROUPS)}]`;
}

describe("which shader construct a backend gets wrong when a multi-block scan fails (P4 probe)", () => {
    it("runs the workgroup-id matrix, prints every case, and asserts the three no device may fail", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "workgroup-id-probe" });
        try {
            const results = new Map<string, ProbeResult>();
            for (const probe of CASES) {
                const result = await runProbe(ctx, probe);
                results.set(probe.name, result);
                console.log(probeLine(probe, result));
            }
            // Asserted: a store indexed by the workgroup id, with no barrier and no workgroup memory in the kernel.
            // Case 7 separates the index from the value -- if it fails, the dispatch or the index arithmetic is
            // wrong and nothing else in the matrix means anything.
            for (const name of ["1-id-value-no-barrier", "7-control-constant-at-id-index"]) {
                const probe = CASES.find((c) => c.name === name);
                const result = results.get(name);
                if (probe === undefined || result === undefined) {
                    throw new Error(`workgroup-id-probe: case ${name} did not run`);
                }
                for (let wg = 0; wg < GROUPS; wg++) {
                    const want = probe.outExpected(wg);
                    expect(rangeReport(result.out, wg, want), `${name}: workgroup ${String(wg)}`).toBe(
                        `wg${String(wg)}=ok(${show(want)})`,
                    );
                }
            }
            const lastLane = results.get("3-last-lane-store-no-barrier");
            if (lastLane === undefined) {
                throw new Error("workgroup-id-probe: case 3-last-lane-store-no-barrier did not run");
            }
            expect([...lastLane.sums], "3-last-lane-store-no-barrier: sums").toEqual(
                new Array<number>(GROUPS).fill(MARK),
            );
        } finally {
            ctx.dispose();
        }
    });
});
