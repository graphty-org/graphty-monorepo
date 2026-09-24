/**
 * The second device probe: which part of the SCAN'S DISPATCH MACHINERY a backend gets wrong once the shader
 * constructs have been cleared.
 *
 * Why it exists: on Dawn's D3D12 backend over the Microsoft Basic Render Driver -- the Windows leg of the host
 * matrix, where the published dawn-node compiles through d3dcompiler_47.dll because it ships neither dxcompiler.dll
 * nor dxil.dll -- every multi-block exclusive scan is wrong while every single-block scan is right. The first probe
 * (test/primitives/workgroup-id-probe.test.ts) took the SHADER apart there and cleared six constructs: the
 * workgroup id as a value, the id carried across the scan's barrier loop, a single-lane divergent store indexed by
 * the id both with and without that loop, a workgroup ARRAY written by every lane and read by one across a barrier,
 * and a constant stored at an index derived from the id. Its one failure was a workgroup SCALAR published by lane
 * zero before the barrier loop and read by another lane after it -- which explains why a broadcast fix produced
 * zero block sums, and which the scan as it stands does not use.
 *
 * So the shader is not what is left. What is left is everything AROUND the shader that a multi-block scan does and a
 * single-block scan does not: a second and a third dispatch in the SAME compute pass, a different uniform for each
 * of them, storage bindings taken from a pooled scratch buffer, and one dispatch reading what the dispatch before it
 * wrote. Each case below isolates exactly one of those, in the shape src/primitives/scan.ts really records
 * (group 0 empty, the storage bindings in group 1, the params uniform in group 2 with a dynamic offset, as
 * src/kernel/wgsl.ts lays every kernel out):
 *
 *   1  several dispatches of ONE pipeline in ONE pass, each selecting its own uniform through a dynamic offset into
 *      a UniformRing-shaped buffer (src/kernel/uniform-ring.ts: 256-byte slots, one writeBuffer for all of them)
 *   1b the same dispatches, but each with its OWN 16-byte uniform buffer and therefore its own bind group, at
 *      dynamic offset zero: the shape the scan takes under the test scope, which is how the Windows failure was
 *      measured (test/helpers/segmented-reduce.ts builds a pooled params buffer per record, not a ring slot)
 *   2  the same dispatches, one compute pass each -- the control for cases 1 and 1b
 *   3  a storage binding that starts part way into a larger buffer (a pooled scratch window)
 *   4  two dispatches in one pass where the second reads what the first wrote (what the scan's levels depend on)
 *   5  the scan's OWN two-block shape with the uniform taken out: the same body, the same three dispatches in one
 *      pass, but the element count supplied as a pipeline-overridable constant. If this one is right where the real
 *      scan is wrong, the uniform path is the answer and nothing in the shader is.
 *
 * Every case prints one greppable `[scan-uniform-probe]` line. Cases 1 to 4 are all ASSERTED, because each is a plain
 * requirement of the WebGPU specification that no conforming device may fail -- dispatches in a pass run in order,
 * a dynamic offset selects the slot it names, a binding starts where its offset says, and a dispatch sees the
 * writes of the dispatch before it. Case 5 is PRINTED and not asserted: it is the comparison against the real
 * scan, whose correctness on that backend is the question, and the scan's own test already reports that failure.
 *
 * Pipelines are built straight on the device, as the first probe does, so no probe key ever reaches the normative
 * compile matrix of src/kernels.ts.
 */

import { type U32 } from "@graphty/graph-format";

import { MAX_WORKGROUPS_PER_DIM, STORAGE_ALIGN, UNIFORM_SLOT_BYTES } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { BufferUsage, ShaderStage } from "../../src/device/webgpu-constants.js";
import { readU32, uploadBuffer } from "../helpers/device.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/** Lanes per workgroup, fixed rather than taken from the device so every adapter prints a comparable line. */
const WG = 256;

/** Dispatches of cases 1 and 2: one uniform slot each, enough that "one slot applied to all" is unmistakable. */
const SLOTS = 4;

/** The fill of every buffer before every case, so a word nothing wrote is visible as `poison`. */
const POISON = 0xdeadbeef;

/** The value the pattern cases store, chosen so it can never be mistaken for an index, a slot or poison. */
const MARK = 4242;

/** Slot k of the ring carries the value VALUE_BASE + k, so a stale slot is readable off the printed line. */
const VALUE_BASE = 7000;

/** Bytes of the probe's params block (four u32, the shape of `ScanParams` in src/kernels.ts). */
const PARAMS_BYTES = 16;

/** Words of the buffer that precede case 3's binding (STORAGE_ALIGN = 256 bytes, the offset alignment the package always honours). */
const OFFSET_WORDS = STORAGE_ALIGN / 4;

/** Case 5's element count: one word more than a block, the smallest input that needs two blocks and three dispatches. */
const COUNT = WG + 1;

/**
 * Cases 1 and 2: one workgroup whose lane zero stores the value of ITS uniform at the index ITS uniform names.
 * A dispatch that sees another dispatch's uniform therefore writes another slot, and its own slot keeps poison.
 */
const RING_WGSL = /* wgsl */ `
const WG: u32 = ${String(WG)}u;

struct Params { slot: u32, value: u32, pad0: u32, pad1: u32 }

@group(1) @binding(0) var<storage, read_write> out: array<u32>;
@group(2) @binding(0) var<uniform> P: Params;

@compute @workgroup_size(WG)
fn main(@builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) { out[P.slot] = P.value; }
}
`;

/** Case 3: every lane stores MARK + its index through a binding that starts part way into a larger buffer. */
const OFFSET_WGSL = /* wgsl */ `
const WG: u32 = ${String(WG)}u;
const MARK: u32 = ${String(MARK)}u;

@group(1) @binding(0) var<storage, read_write> out: array<u32>;

@compute @workgroup_size(WG)
fn main(@builtin(local_invocation_id) lid: vec3<u32>) {
    out[lid.x] = MARK + lid.x;
}
`;

/** Case 4, the first dispatch: fills the middle buffer with MARK + index. */
const WRITER_WGSL = /* wgsl */ `
const WG: u32 = ${String(WG)}u;
const MARK: u32 = ${String(MARK)}u;

@group(1) @binding(0) var<storage, read_write> mid: array<u32>;

@compute @workgroup_size(WG)
fn main(@builtin(local_invocation_id) lid: vec3<u32>) {
    mid[lid.x] = MARK + lid.x;
}
`;

/**
 * Case 4, the second dispatch of the same pass: reads the middle buffer and adds one, in the binding shape of
 * `scan-add` (the writable output at binding 0, the read-only input at binding 1). A device that runs this before
 * the writer's stores are visible reports the poison fill plus one.
 */
const READER_WGSL = /* wgsl */ `
const WG: u32 = ${String(WG)}u;

@group(1) @binding(0) var<storage, read_write> out: array<u32>;
@group(1) @binding(1) var<storage, read> mid: array<u32>;

@compute @workgroup_size(WG)
fn main(@builtin(local_invocation_id) lid: vec3<u32>) {
    out[lid.x] = mid[lid.x] + 1u;
}
`;

/**
 * Case 5: src/wgsl/scan-block.wgsl.ts verbatim, with `P.count` replaced by the override `COUNT` and the prelude's
 * `group_id` declared inline. Nothing else moves -- the Hillis-Steele loop, the two barriers a round, the id read
 * after the loop and the last lane's block-sum store are the shipped text.
 */
const SCAN_BLOCK_WGSL = /* wgsl */ `
override WG: u32 = ${String(WG)}u;
override COUNT: u32 = 0u;
const MAX_WORKGROUPS_PER_DIM: u32 = ${String(MAX_WORKGROUPS_PER_DIM)}u;

@group(1) @binding(0) var<storage, read> src: array<u32>;
@group(1) @binding(1) var<storage, read_write> out: array<u32>;
@group(1) @binding(2) var<storage, read_write> blockSums: array<u32>;

var<workgroup> sh: array<u32, WG>;

fn group_id(wid: vec3<u32>) -> u32 { return wid.x + wid.y * MAX_WORKGROUPS_PER_DIM; }

@compute @workgroup_size(WG)
fn scan_block(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let readAt = group_id(wid) * WG + lid.x;
    var v = 0u;
    if (readAt < COUNT) { v = src[readAt]; }
    sh[lid.x] = v;
    workgroupBarrier();
    for (var s = 1u; s < WG; s = s * 2u) {
        var t = 0u;
        if (lid.x >= s) { t = sh[lid.x - s]; }
        workgroupBarrier();
        sh[lid.x] = sh[lid.x] + t;
        workgroupBarrier();
    }
    let inclusive = sh[lid.x];
    let g = group_id(wid);
    let i = g * WG + lid.x;
    if (i < COUNT) { out[i] = inclusive - v; }
    if (lid.x == WG - 1u) { blockSums[g] = inclusive; }
}
`;

/** Case 5: src/wgsl/scan-add.wgsl.ts verbatim, with `P.count` replaced by the override `COUNT`. */
const SCAN_ADD_WGSL = /* wgsl */ `
override WG: u32 = ${String(WG)}u;
override COUNT: u32 = 0u;
const MAX_WORKGROUPS_PER_DIM: u32 = ${String(MAX_WORKGROUPS_PER_DIM)}u;

@group(1) @binding(0) var<storage, read_write> out: array<u32>;
@group(1) @binding(1) var<storage, read> blockOffsets: array<u32>;

fn group_id(wid: vec3<u32>) -> u32 { return wid.x + wid.y * MAX_WORKGROUPS_PER_DIM; }

@compute @workgroup_size(WG)
fn scan_add(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let g = group_id(wid);
    let i = g * WG + lid.x;
    if (i >= COUNT) { return; }
    out[i] = out[i] + blockOffsets[g];
}
`;

/** A byte range of a buffer, as createBindGroup takes it. */
interface Span {
    readonly buffer: GPUBuffer;
    readonly offset: number;
    readonly size: number;
}

/** What one case asks the device to compile: its text, its entry point, its binding kinds and its constants. */
interface PipelineSpec {
    readonly label: string;
    readonly code: string;
    readonly entryPoint: string;
    /** The kinds of group 1's storage bindings, in binding order. */
    readonly storage: readonly ("storage" | "read-only-storage")[];
    /** Whether group 2 carries a params uniform with a dynamic offset. */
    readonly uniform: boolean;
    /** The pipeline-overridable constants, or null for a module that declares none. */
    readonly constants: Readonly<Record<string, number>> | null;
}

/** A compiled probe pipeline with its explicit layouts (index 0 empty, 1 storage, 2 uniform when present). */
interface ProbePipeline {
    readonly pipeline: GPUComputePipeline;
    readonly layouts: readonly GPUBindGroupLayout[];
}

/** What one case produced: its name, its printed line, and what it got wrong (null when nothing). */
interface ProbeReport {
    readonly name: string;
    readonly line: string;
    readonly bad: string | null;
}

/**
 * The whole of a buffer as a Span.
 * @param buffer - the buffer
 * @returns the range [0, buffer.size)
 */
function whole(buffer: GPUBuffer): Span {
    return { buffer, offset: 0, size: buffer.size };
}

/**
 * Compiles one probe module with the group layout every kernel of this package has: an EMPTY group 0, the storage
 * bindings in group 1, and a 16-byte params uniform with a dynamic offset in group 2 when the case uses one.
 * @param ctx - the context
 * @param spec - the module
 * @returns the pipeline and its layouts
 */
function buildPipeline(ctx: GpuContext, spec: PipelineSpec): ProbePipeline {
    const layouts: GPUBindGroupLayout[] = [
        ctx.device.createBindGroupLayout({ label: `${spec.label}/layout0`, entries: [] }),
        ctx.device.createBindGroupLayout({
            label: `${spec.label}/layout1`,
            entries: spec.storage.map(
                (type, binding): GPUBindGroupLayoutEntry => ({
                    binding,
                    visibility: ShaderStage.COMPUTE,
                    buffer: { type },
                }),
            ),
        }),
    ];
    if (spec.uniform) {
        layouts.push(
            ctx.device.createBindGroupLayout({
                label: `${spec.label}/layout2`,
                entries: [
                    {
                        binding: 0,
                        visibility: ShaderStage.COMPUTE,
                        buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: PARAMS_BYTES },
                    },
                ],
            }),
        );
    }
    const pipeline = ctx.device.createComputePipeline({
        label: spec.label,
        layout: ctx.device.createPipelineLayout({ label: `${spec.label}/layout`, bindGroupLayouts: layouts }),
        compute: {
            module: ctx.device.createShaderModule({ label: spec.label, code: spec.code }),
            entryPoint: spec.entryPoint,
            constants: spec.constants ?? {},
        },
    });
    return { pipeline, layouts };
}

/**
 * The bind groups of one pipeline: an empty group 0, the storage spans in group 1, the uniform span in group 2.
 * @param ctx - the context
 * @param label - the case label
 * @param pipe - the pipeline
 * @param storage - one span per storage binding, in binding order
 * @param uniform - the uniform span (the whole ring is never bound: the slot is the dynamic offset), or null
 * @returns the bind groups in group order
 */
function bindGroupsOf(
    ctx: GpuContext,
    label: string,
    pipe: ProbePipeline,
    storage: readonly Span[],
    uniform: Span | null,
): readonly GPUBindGroup[] {
    const groups: GPUBindGroup[] = [
        ctx.device.createBindGroup({ label: `${label}/0`, layout: pipe.layouts[0], entries: [] }),
        ctx.device.createBindGroup({
            label: `${label}/1`,
            layout: pipe.layouts[1],
            entries: storage.map((span, binding) => ({ binding, resource: span })),
        }),
    ];
    if (uniform !== null) {
        groups.push(
            ctx.device.createBindGroup({
                label: `${label}/2`,
                layout: pipe.layouts[2],
                entries: [{ binding: 0, resource: uniform }],
            }),
        );
    }
    return groups;
}

/**
 * setPipeline, every bind group (group 2 with its dynamic offset) and one dispatch -- the prefix
 * src/kernel/kernel.ts records for every kernel.
 * @param pass - the open compute pass
 * @param pipe - the pipeline
 * @param groups - its bind groups in group order
 * @param x - workgroups to dispatch
 * @param dynamicOffset - the byte offset of the uniform slot (ignored when the case has no uniform)
 */
function record(
    pass: GPUComputePassEncoder,
    pipe: ProbePipeline,
    groups: readonly GPUBindGroup[],
    x: number,
    dynamicOffset: number,
): void {
    pass.setPipeline(pipe.pipeline);
    groups.forEach((group, index) => {
        if (index === 2) {
            pass.setBindGroup(index, group, [dynamicOffset]);
        } else {
            pass.setBindGroup(index, group);
        }
    });
    pass.dispatchWorkgroups(x, 1, 1);
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
 * A run of words as a comma-separated list.
 * @param words - the buffer as read back
 * @param from - the first index
 * @param count - how many
 * @returns the text
 */
function list(words: U32, from: number, count: number): string {
    const out: string[] = [];
    for (let i = from; i < from + count; i++) {
        out.push(show(words[i]));
    }
    return out.join(",");
}

/**
 * Checks a run of words against what each index must hold: "ok", or the FIRST index that disagrees with both values.
 * @param words - the buffer as read back
 * @param from - the first index
 * @param count - how many
 * @param want - the value index i must hold
 * @returns the verdict text
 */
function check(words: U32, from: number, count: number, want: (index: number) => number): string {
    for (let i = from; i < from + count; i++) {
        if (words[i] !== want(i)) {
            return `BAD@${String(i)}(want ${show(want(i))} got ${show(words[i])})`;
        }
    }
    return "ok";
}

/**
 * The first index of a word the poison fill no longer covers, or -1: a device that ignores a binding offset writes
 * its pattern at word 0 instead of at the offset, and this is the number that says so.
 * @param words - the buffer as read back
 * @returns the index, or -1 when every word is still poison
 */
function firstWritten(words: U32): number {
    for (let i = 0; i < words.length; i++) {
        if (words[i] !== POISON) {
            return i;
        }
    }
    return -1;
}

/** Where the params of cases 1, 1b and 2 live and how the pass is cut. */
type RingMode = "one-pass" | "per-dispatch-buffer" | "separate-passes";

/** The params of slot k as the probe kernel reads them: { slot: k, value: VALUE_BASE + k, pad0, pad1 }. */
function paramsOf(slot: number): U32 {
    return new Uint32Array([slot, VALUE_BASE + slot, 0, 0]);
}

/**
 * Cases 1, 1b and 2: SLOTS dispatches of ONE pipeline, each carrying its own params. "one-pass" puts every
 * params record in a slot of a UniformRing-shaped buffer and selects it with a dynamic offset, all in one compute
 * pass; "per-dispatch-buffer" gives every dispatch its own 16-byte uniform buffer and its own bind group at
 * dynamic offset zero, the shape the scan takes under the test scope; "separate-passes" is the ring again with one
 * compute pass per dispatch. Slot k holds { slot: k, value: VALUE_BASE + k }, so dispatch k must leave
 * VALUE_BASE + k at word k of the output and a dispatch reading another's params writes another word instead.
 * @param ctx - the context
 * @param name - the case name
 * @param mode - where the params live and how the pass is cut
 * @returns the report
 */
async function runRingCase(ctx: GpuContext, name: string, mode: RingMode): Promise<ProbeReport> {
    const out = uploadBuffer(ctx, new Uint32Array(SLOTS).fill(POISON), `${name}/out`);
    const uniforms: GPUBuffer[] = [];
    try {
        if (mode === "per-dispatch-buffer") {
            for (let slot = 0; slot < SLOTS; slot++) {
                const params = ctx.device.createBuffer({
                    label: `${name}/params${String(slot)}`,
                    size: PARAMS_BYTES,
                    usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
                });
                ctx.device.queue.writeBuffer(params, 0, paramsOf(slot));
                uniforms.push(params);
            }
        } else {
            const ring = ctx.device.createBuffer({
                label: `${name}/ring`,
                size: SLOTS * UNIFORM_SLOT_BYTES,
                usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
            });
            const shadow = new Uint32Array((SLOTS * UNIFORM_SLOT_BYTES) / 4);
            for (let slot = 0; slot < SLOTS; slot++) {
                shadow.set(paramsOf(slot), (slot * UNIFORM_SLOT_BYTES) / 4);
            }
            // One writeBuffer over every dirty slot, exactly as UniformRing.flush() sends a batch.
            ctx.device.queue.writeBuffer(ring, 0, shadow);
            uniforms.push(ring);
        }
        const pipe = buildPipeline(ctx, {
            label: name,
            code: RING_WGSL,
            entryPoint: "main",
            storage: ["storage"],
            uniform: true,
            constants: null,
        });
        const groups = uniforms.map((buffer, index) =>
            bindGroupsOf(ctx, `${name}/${String(index)}`, pipe, [whole(out)], { buffer, offset: 0, size: PARAMS_BYTES }),
        );
        const encoder = ctx.device.createCommandEncoder({ label: name });
        const dispatch = (pass: GPUComputePassEncoder, slot: number): void => {
            if (mode === "per-dispatch-buffer") {
                record(pass, pipe, groups[slot], 1, 0);
            } else {
                record(pass, pipe, groups[0], 1, slot * UNIFORM_SLOT_BYTES);
            }
        };
        if (mode === "separate-passes") {
            for (let slot = 0; slot < SLOTS; slot++) {
                const pass = encoder.beginComputePass({ label: `${name}/${String(slot)}` });
                dispatch(pass, slot);
                pass.end();
            }
        } else {
            const pass = encoder.beginComputePass({ label: name });
            for (let slot = 0; slot < SLOTS; slot++) {
                dispatch(pass, slot);
            }
            pass.end();
        }
        ctx.device.queue.submit([encoder.finish()]);
        const words = await readU32(ctx, out, SLOTS);
        const verdict = check(words, 0, SLOTS, (i) => VALUE_BASE + i);
        return {
            name,
            line:
                `[scan-uniform-probe] ${name} | dispatches=${String(SLOTS)} params=${mode === "per-dispatch-buffer" ? `${String(PARAMS_BYTES)}B-buffer-each` : `ring-slots-of-${String(UNIFORM_SLOT_BYTES)}B`} ` +
                `| out=[${list(words, 0, SLOTS)}] want=[${String(VALUE_BASE)}..${String(VALUE_BASE + SLOTS - 1)}] -> ${verdict}`,
            bad: verdict === "ok" ? null : verdict,
        };
    } finally {
        out.destroy();
        for (const buffer of uniforms) {
            buffer.destroy();
        }
    }
}

/**
 * Case 3: one dispatch through a storage binding that starts STORAGE_ALIGN bytes into a larger buffer -- the shape
 * a pooled scratch window has. The pattern must land at word OFFSET_WORDS and the words before it must still be
 * poison; a device that ignores the offset writes the pattern at word 0.
 * @param ctx - the context
 * @returns the report
 */
async function runOffsetCase(ctx: GpuContext): Promise<ProbeReport> {
    const name = "3-storage-binding-at-a-non-zero-offset";
    const total = OFFSET_WORDS + WG;
    const buffer = uploadBuffer(ctx, new Uint32Array(total).fill(POISON), `${name}/out`);
    try {
        const pipe = buildPipeline(ctx, {
            label: name,
            code: OFFSET_WGSL,
            entryPoint: "main",
            storage: ["storage"],
            uniform: false,
            constants: null,
        });
        const groups = bindGroupsOf(ctx, name, pipe, [{ buffer, offset: STORAGE_ALIGN, size: 4 * WG }], null);
        const encoder = ctx.device.createCommandEncoder({ label: name });
        const pass = encoder.beginComputePass({ label: name });
        record(pass, pipe, groups, 1, 0);
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        const words = await readU32(ctx, buffer, total);
        const before = check(words, 0, OFFSET_WORDS, () => POISON);
        const inside = check(words, OFFSET_WORDS, WG, (i) => MARK + (i - OFFSET_WORDS));
        const verdict = before === "ok" ? inside : before;
        return {
            name,
            line:
                `[scan-uniform-probe] ${name} | offset=${String(STORAGE_ALIGN)}B size=${String(4 * WG)}B ` +
                `| firstWrittenWord=${String(firstWritten(words))} want=${String(OFFSET_WORDS)} ` +
                `| before=${before} inside=${inside} -> ${verdict}`,
            bad: verdict === "ok" ? null : verdict,
        };
    } finally {
        buffer.destroy();
    }
}

/**
 * Case 4: two dispatches of two pipelines in ONE pass, the second reading what the first wrote -- what every level
 * of the scan depends on. The middle buffer starts poisoned, so a second dispatch that ran too early reports
 * poison + 1 rather than the pattern + 1.
 * @param ctx - the context
 * @returns the report
 */
async function runDependencyCase(ctx: GpuContext): Promise<ProbeReport> {
    const name = "4-second-dispatch-reads-what-the-first-wrote";
    const mid = uploadBuffer(ctx, new Uint32Array(WG).fill(POISON), `${name}/mid`);
    const out = uploadBuffer(ctx, new Uint32Array(WG).fill(POISON), `${name}/out`);
    try {
        const writer = buildPipeline(ctx, {
            label: `${name}/writer`,
            code: WRITER_WGSL,
            entryPoint: "main",
            storage: ["storage"],
            uniform: false,
            constants: null,
        });
        const reader = buildPipeline(ctx, {
            label: `${name}/reader`,
            code: READER_WGSL,
            entryPoint: "main",
            storage: ["storage", "read-only-storage"],
            uniform: false,
            constants: null,
        });
        const writerGroups = bindGroupsOf(ctx, `${name}/writer`, writer, [whole(mid)], null);
        const readerGroups = bindGroupsOf(ctx, `${name}/reader`, reader, [whole(out), whole(mid)], null);
        const encoder = ctx.device.createCommandEncoder({ label: name });
        const pass = encoder.beginComputePass({ label: name });
        record(pass, writer, writerGroups, 1, 0);
        record(pass, reader, readerGroups, 1, 0);
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        const words = await readU32(ctx, out, WG);
        const verdict = check(words, 0, WG, (i) => MARK + i + 1);
        return {
            name,
            line:
                `[scan-uniform-probe] ${name} | out[0]=${show(words[0])} out[${String(WG - 1)}]=${show(words[WG - 1])} ` +
                `want=${String(MARK + 1)}..${String(MARK + WG)} -> ${verdict}`,
            bad: verdict === "ok" ? null : verdict,
        };
    } finally {
        mid.destroy();
        out.destroy();
    }
}

/**
 * Case 5: the scan of COUNT ones recorded exactly as src/primitives/scan.ts records it -- two `scan-block`
 * dispatches and one `scan-add` dispatch in ONE pass over pooled outputs -- with the element count supplied as a
 * pipeline-overridable constant instead of read from a uniform. The exclusive output must be 0, 1, 2, ... and the
 * total COUNT. The block sums and the level-1 offsets are printed next to it, because on a device that loses a
 * block they are where the loss becomes visible first.
 * @param ctx - the context
 * @returns the report
 */
async function runScanShapeCase(ctx: GpuContext): Promise<ProbeReport> {
    const name = "5-the-scan-shape-with-the-count-as-an-override";
    const blocks = Math.ceil(COUNT / WG);
    const src = uploadBuffer(ctx, new Uint32Array(COUNT).fill(1), `${name}/src`);
    const out = uploadBuffer(ctx, new Uint32Array(COUNT).fill(POISON), `${name}/out`);
    const sums0 = uploadBuffer(ctx, new Uint32Array(blocks).fill(POISON), `${name}/sums0`);
    const offsets1 = uploadBuffer(ctx, new Uint32Array(blocks).fill(POISON), `${name}/offsets1`);
    const sums1 = uploadBuffer(ctx, new Uint32Array(1).fill(POISON), `${name}/sums1`);
    try {
        const blockSpec: PipelineSpec = {
            label: `${name}/block`,
            code: SCAN_BLOCK_WGSL,
            entryPoint: "scan_block",
            storage: ["read-only-storage", "storage", "storage"],
            uniform: false,
            constants: { WG, COUNT },
        };
        const level0 = buildPipeline(ctx, blockSpec);
        const level1 = buildPipeline(ctx, { ...blockSpec, constants: { WG, COUNT: blocks } });
        const add = buildPipeline(ctx, {
            label: `${name}/add`,
            code: SCAN_ADD_WGSL,
            entryPoint: "scan_add",
            storage: ["storage", "read-only-storage"],
            uniform: false,
            constants: { WG, COUNT },
        });
        const level0Groups = bindGroupsOf(
            ctx,
            `${name}/level0`,
            level0,
            [whole(src), whole(out), whole(sums0)],
            null,
        );
        const level1Groups = bindGroupsOf(
            ctx,
            `${name}/level1`,
            level1,
            [whole(sums0), whole(offsets1), whole(sums1)],
            null,
        );
        const addGroups = bindGroupsOf(ctx, `${name}/add`, add, [whole(out), whole(offsets1)], null);
        const encoder = ctx.device.createCommandEncoder({ label: name });
        const pass = encoder.beginComputePass({ label: name });
        record(pass, level0, level0Groups, blocks, 0);
        record(pass, level1, level1Groups, 1, 0);
        record(pass, add, addGroups, blocks, 0);
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        const words = await readU32(ctx, out, COUNT);
        const sums = await readU32(ctx, sums0, blocks);
        const offsets = await readU32(ctx, offsets1, blocks);
        const top = await readU32(ctx, sums1, 1);
        const scanned = check(words, 0, COUNT, (i) => i);
        const total = top[0] === COUNT ? "ok" : `BAD(want ${String(COUNT)} got ${show(top[0])})`;
        const verdict = scanned === "ok" ? total : scanned;
        return {
            name,
            line:
                `[scan-uniform-probe] ${name} | count=${String(COUNT)} blocks=${String(blocks)} dispatches=3 ` +
                `| out[0]=${show(words[0])} out[${String(WG - 1)}]=${show(words[WG - 1])} out[${String(WG)}]=${show(words[WG])} ` +
                `total=${show(top[0])} | sums0=[${list(sums, 0, blocks)}] offsets1=[${list(offsets, 0, blocks)}] ` +
                `| out:${scanned} total:${total}`,
            bad: verdict === "ok" ? null : verdict,
        };
    } finally {
        src.destroy();
        out.destroy();
        sums0.destroy();
        offsets1.destroy();
        sums1.destroy();
    }
}

/** The cases asserted: every one a plain requirement of the specification, none of them a barrier scan. */
const ASSERTED: readonly string[] = Object.freeze([
    "1-one-pipeline-many-dispatches-one-pass",
    "1b-one-pipeline-a-uniform-buffer-each-one-pass",
    "2-one-pipeline-many-dispatches-separate-passes",
    "3-storage-binding-at-a-non-zero-offset",
    "4-second-dispatch-reads-what-the-first-wrote",
]);

describe("which part of the scan's dispatch machinery a backend gets wrong (P4 probe 2)", () => {
    it("runs the uniform, offset, ordering and override cases, prints every one, and asserts the five no device may fail", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "scan-uniform-probe" });
        try {
            const reports: ProbeReport[] = [
                await runRingCase(ctx, "1-one-pipeline-many-dispatches-one-pass", "one-pass"),
                await runRingCase(ctx, "1b-one-pipeline-a-uniform-buffer-each-one-pass", "per-dispatch-buffer"),
                await runRingCase(ctx, "2-one-pipeline-many-dispatches-separate-passes", "separate-passes"),
                await runOffsetCase(ctx),
                await runDependencyCase(ctx),
                await runScanShapeCase(ctx),
            ];
            for (const report of reports) {
                console.log(report.line);
            }
            for (const report of reports) {
                if (ASSERTED.includes(report.name)) {
                    expect(report.bad, report.name).toBeNull();
                }
            }
        } finally {
            ctx.dispose();
        }
    });
});
