/**
 * The device self-check: one real exclusive scan of known numbers, run once per device before this package
 * computes anything on it, so a device that returns wrong numbers is refused instead of believed.
 *
 * WHY IT EXISTS. On the Windows host lane -- Dawn's D3D12 backend over the Microsoft Basic Render Driver, the
 * software renderer built into Windows -- every exclusive scan of more than one workgroup came back wrong: a
 * block total of 1 where 256 belonged, or a second block nothing wrote at all, differing between two runs of
 * identical code in one job. Everything built on the scan was wrong with it (the histogram, the radix sort, the
 * grid build and every layout above them, eighteen test files), while every single-block scan and every earlier
 * primitive stayed right. Three shader repairs failed; copying Microsoft's current redistributable renderer
 * beside the runner's Node executable made all of it pass untouched. The defect is the driver's, and the danger
 * to a caller is not a crash but silence: a graph laid out from wrong numbers with no error anywhere.
 *
 * WHY IT SCANS RATHER THAN PROBING A CONSTRUCT. An earlier hand-written probe matrix of workgroup constructs
 * (test/primitives/workgroup-id-probe.test.ts) was measured PASSING on that renderer in the same job in which the
 * real scan returned the wrong answer, so a copy of the shader's shape is not evidence about the shader. This
 * check therefore drives the shipped `prepareScan` through the shipped composer and pipeline cache: it tests the
 * code that runs, and it cannot drift away from it. One scan covers both recorded failures -- a value crossing
 * `workgroupBarrier` inside a block, and a block total crossing from one dispatch of a compute pass to the next
 * dispatch that reads it, which is the shape of every driver in this package.
 *
 * WHY IT REFUSES RATHER THAN ROUTING AROUND THE DEFECT. See docs/decisions/device-self-check.md: a barrier-free second
 * implementation was designed and costed, and rejected because it would ship unverified on the only platform it
 * exists for.
 *
 * WHERE IT RUNS. Lazily, at the first compute entry point a caller reaches, memoised per GPUDevice: the
 * algorithms (degree, connectedComponents, the power-iteration family) and calibrateLayout await it on entry, and
 * a layout simulation awaits it in the compile-and-bind promise `load()` starts -- the promise every batch and
 * every debug run already awaits before it may submit. So a caller is covered whether the context was created,
 * adopted through `create({ device })` or adopted through `GpuContext.from`, and a simulation refuses before its
 * first iteration without the check sitting on the per-batch path, where an extra await would move the moment a
 * submission becomes visible to a step() issued in the same tick and so change how the frame loop coalesces.
 * It deliberately does NOT run in GpuContext.create:
 * a context that only compiles -- Dawn's null backend, which computes nothing by design -- must stay usable, and
 * `src/context.ts` may not import a primitive (the layer rule of spec 3.2).
 */

import { WebGpuGraphError } from "../errors.js";
import { UniformRing } from "../kernel/uniform-ring.js";
import { type CheckedContext, type DeviceCheck, type DeviceCheckMismatch } from "../types/context.js";
import { type Binding } from "../types/memory.js";
import { type ReduceScope } from "./reduce.js";
import { prepareScan } from "./scan.js";

/**
 * The word written into every output slot before the dispatch, so a word NOTHING wrote is distinguishable from
 * a word written wrongly. The Windows lane returned this value from the second block, which is how the failure
 * was read as "the block was never written" rather than "the block was miscomputed".
 */
const POISON = 0xdeadbeef;

/** Full workgroups the check scans; one partial workgroup of a single word follows them. */
const CHECK_BLOCKS = 32;

/** Params slots the scan's levels need (two levels of block scan plus one add-back, with room to spare). */
const RING_SLOTS = 8;

/** The settled check per device: the one work a second caller never repeats. A rejection is dropped, so a check that failed to RUN is retried. */
const checked = new WeakMap<GPUDevice, Promise<DeviceCheck>>();

/**
 * The input word at `i`: 1, 2, 3, ... so no two workgroups have the same block total (all-ones would give every
 * block the same one, and a block total stored at the wrong index would still read correct -- which is exactly
 * the Windows symptom) and every output word is a different number.
 * @param i - the word index
 * @returns the input value
 */
function inputAt(i: number): number {
    return i + 1;
}

/**
 * The verdict: the first output word or total that disagrees with the arithmetic answer, or null when nothing
 * does. Pure, so test/primitives/verify.test.ts can drive it past a fabricated wrong result and exercise the
 * refusal without a broken device.
 * @param words - the `count` output words read back from the device
 * @param total - the total word read back from the device
 * @param count - the words scanned
 * @returns the first disagreement, or null
 * @internal
 */
export function checkScanWords(words: Uint32Array, total: number, count: number): DeviceCheckMismatch | null {
    let running = 0;
    for (let i = 0; i < count; i++) {
        const got = words[i];
        if (got !== running) {
            return { where: `out[${String(i)}]`, expected: running, actual: got, poison: got === POISON };
        }
        // u32 addition wraps in WGSL, so the host oracle wraps too: at WORKGROUP_SIZE 256 the total cannot
        // reach 2^32, but a false refusal would deny every device on earth, so it is not left to that constant
        running = (running + inputAt(i)) >>> 0;
    }
    if (total !== running) {
        return { where: "total", expected: running, actual: total, poison: total === POISON };
    }
    return null;
}

/**
 * Binds a whole scratch buffer.
 * @param buffer - the buffer
 * @param size - the bytes bound
 * @returns the binding
 */
function whole(buffer: GPUBuffer, size: number): Binding {
    return { buffer, offset: 0, size, window: null };
}

/**
 * Runs the check once: one scan of `CHECK_BLOCKS * workgroupSize + 1` words recorded into one compute pass, one
 * submit, the output and the total read back and verified on the host.
 *
 * It never throws for a wrong ANSWER -- that is the returned record's job. A failure of the machinery (a lost
 * device, a validation error, out of memory) propagates with its own code, so "the driver computes incorrectly"
 * is never said about a device that merely died.
 * @param ctx - the context to check
 * @returns what the check found
 */
async function runCheck(ctx: CheckedContext): Promise<DeviceCheck> {
    const started = performance.now();
    const wg = ctx.workgroupSize;
    const count = CHECK_BLOCKS * wg + 1;
    const bytes = 4 * count;
    const lease = ctx.pool.lease();
    const ring = new UniformRing(ctx.device, ctx.allocator, RING_SLOTS, "device-check/ring");
    try {
        const scope: ReduceScope = {
            device: ctx.device,
            caps: ctx.caps,
            pipelines: ctx.pipelines,
            pool: ctx.pool,
            workgroupSize: wg,
            scratch: (byteLength, label) => lease.storage(byteLength, `device-check/${label}`),
            params(block, values) {
                const slot = ring.reserve(1);
                ring.write(slot, block, values);
                return { binding: ring.binding(block), offset: ring.offsetOf(slot) };
            },
        };
        const planner = await prepareScan(scope);
        const src = lease.storage(bytes, "device-check/src");
        const out = lease.storage(bytes, "device-check/out");
        const input = new Uint32Array(count);
        for (let i = 0; i < count; i++) {
            input[i] = inputAt(i);
        }
        ctx.device.queue.writeBuffer(src, 0, input);
        ctx.device.queue.writeBuffer(out, 0, new Uint32Array(count).fill(POISON));
        const encoder = ctx.device.createCommandEncoder({ label: "device-check" });
        const pass = encoder.beginComputePass({ label: "device-check" });
        const total = planner.record(pass, whole(src, bytes), count, whole(out, bytes));
        pass.end();
        ring.flush();
        ctx.device.queue.submit([encoder.finish()]);
        const words = new Uint32Array(await ctx.readback.read(out, bytes));
        const totalWord = new Uint32Array(
            await ctx.readback.read(total.binding.buffer, 4, undefined, total.binding.offset + 4 * total.index),
        );
        const mismatch = checkScanWords(words, totalWord[0], count);
        return {
            check: "exclusive-scan",
            ok: mismatch === null,
            workgroupSize: wg,
            count,
            blocks: CHECK_BLOCKS,
            ms: performance.now() - started,
            vendor: ctx.caps.vendor,
            architecture: ctx.caps.architecture,
            description: ctx.caps.description,
            mismatch,
        };
    } finally {
        ring.destroy();
        lease.release();
    }
}

/**
 * What this device computed when it was asked for an answer this package already knows, run once per device and
 * remembered. A caller may await it before committing work to a context; every compute entry point of the
 * package awaits it too, so the cost is paid once whoever asks first.
 *
 * It reports rather than throws, so a caller can ask a device a question without having to catch the answer. The
 * entry points use `assertDeviceComputes`, which turns a failing report into E_DEVICE_INCORRECT.
 * @param ctx - the context whose device is checked
 * @returns the capability record; `ok` false means this device returns wrong numbers
 */
export function verifyDevice(ctx: CheckedContext): Promise<DeviceCheck> {
    const cached = checked.get(ctx.device);
    if (cached !== undefined) {
        return cached;
    }
    const running = runCheck(ctx).catch((err: unknown) => {
        // only a settled verdict is worth keeping: a check that could not RUN (a lost device, a transient
        // out-of-memory) must not answer for the device forever
        checked.delete(ctx.device);
        throw err;
    });
    checked.set(ctx.device, running);
    return running;
}

/**
 * The guard every compute entry point awaits: resolves on a device that computed the check correctly, throws
 * E_DEVICE_INCORRECT on one that did not, carrying the first wrong word, what was required there, and the
 * adapter strings that separate a broken driver from a fixed one.
 * @param ctx - the context about to be computed on
 * @internal
 */
export async function assertDeviceComputes(ctx: CheckedContext): Promise<void> {
    const check = await verifyDevice(ctx);
    const { mismatch } = check;
    if (mismatch === null) {
        return;
    }
    const adapter = {
        vendor: check.vendor,
        architecture: check.architecture,
        device: ctx.caps.device,
        description: check.description,
    };
    const hint =
        check.architecture === "warp"
            ? "this is the Microsoft Basic Render Driver; the Microsoft.Direct3D.WARP redistributable (1.0.21 or newer) beside the host executable computes it correctly"
            : undefined;
    const observed = mismatch.poison
        ? `${mismatch.where} was never written (the ${String(POISON)} the check wrote beforehand survived the dispatch)`
        : `${mismatch.where} came back as ${String(mismatch.actual)} where ${String(mismatch.expected)} was required`;
    const message =
        `this device computes multi-workgroup shaders incorrectly: an exclusive scan of ${String(check.count)} ` +
        `known numbers is wrong -- ${observed}. Refusing to run: every number this package computed here would ` +
        `be unreliable. adapter: ${adapter.vendor}/${adapter.architecture} "${adapter.description}"`;
    throw new WebGpuGraphError(
        "E_DEVICE_INCORRECT",
        hint === undefined ? message : `${message}. ${hint}`,
        {
            check: check.check,
            where: mismatch.where,
            expected: mismatch.expected,
            actual: mismatch.actual,
            poison: mismatch.poison,
            count: check.count,
            blocks: check.blocks,
            workgroupSize: check.workgroupSize,
            adapter,
            ...(hint === undefined ? {} : { hint }),
        },
    );
}
