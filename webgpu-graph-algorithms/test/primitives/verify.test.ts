/**
 * The device self-check (src/primitives/verify.ts): the gate that refuses a device returning wrong numbers.
 *
 * Three things are checked here. The verdict function is driven past fabricated results on the host, including
 * the byte pattern the Windows host lane actually printed (a block that nothing wrote, and a block total of 1
 * where the block's real sum belonged), so the refusal path is exercised on any machine -- no adapter reachable
 * from here reproduces the defect. The check is then run on the lane's real adapter, where it must pass, and
 * what it cost is printed rather than asserted. Finally the whole gate is driven end to end through the
 * package's own sabotage seam: the shipped scan-block body is replaced with one that writes the wrong block
 * total, and a public algorithm on that device must refuse with E_DEVICE_INCORRECT instead of returning a
 * number.
 */

import { fromEdgeArrays } from "@graphty/graph-format";

import { degree } from "../../src/algorithms/degree.js";
import { hasErrorCode, isWebGpuGraphError } from "../../src/errors.js";
import { assertDeviceComputes, checkScanWords, verifyDevice } from "../../src/primitives/verify.js";
import { SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/** The poison word the check writes into every output slot before the dispatch. */
const POISON = 0xdeadbeef;

/**
 * A correct exclusive scan of 1, 2, 3, ... -- the check's input -- over `count` words.
 * @param count - the words
 * @returns the output words and the total, as the device would return them when it is right
 */
function correctRun(count: number): { readonly words: Uint32Array; readonly total: number } {
    const words = new Uint32Array(count);
    let running = 0;
    for (let i = 0; i < count; i++) {
        words[i] = running;
        running = (running + i + 1) >>> 0;
    }
    return { words, total: running };
}

describe("the verdict of the device self-check (a fabricated result, no device)", () => {
    const WG = 256;
    const COUNT = 8 * WG + 1;

    it("accepts a correct scan", () => {
        const { words, total } = correctRun(COUNT);
        expect(checkScanWords(words, total, COUNT)).toBeNull();
    });

    it("rejects the Windows pattern: the second block was never written (the poison survived)", () => {
        const { words, total } = correctRun(COUNT);
        words[WG] = POISON;
        const mismatch = checkScanWords(words, total, COUNT);
        expect(mismatch).not.toBeNull();
        expect(mismatch?.where).toBe(`out[${WG}]`);
        expect(mismatch?.actual).toBe(POISON);
        expect(mismatch?.expected).toBe((WG * (WG + 1)) / 2);
        expect(mismatch?.poison).toBe(true);
    });

    it("rejects the Windows pattern: a block total of 1 where the block's sum belonged", () => {
        // the whole of block 1 starts from an offset of 1 instead of block 0's sum
        const { words, total } = correctRun(COUNT);
        const wrongOffset = 1;
        for (let i = WG; i < 2 * WG; i++) {
            words[i] = words[i] - (WG * (WG + 1)) / 2 + wrongOffset;
        }
        const mismatch = checkScanWords(words, total, COUNT);
        expect(mismatch?.where).toBe(`out[${WG}]`);
        expect(mismatch?.actual).toBe(wrongOffset);
        expect(mismatch?.expected).toBe((WG * (WG + 1)) / 2);
        expect(mismatch?.poison).toBe(false);
    });

    it("rejects a single wrong word inside a block, and names it", () => {
        const { words, total } = correctRun(COUNT);
        const at = 3 * WG + 17;
        const right = words[at];
        words[at] = right + 1;
        const mismatch = checkScanWords(words, total, COUNT);
        expect(mismatch?.where).toBe(`out[${at}]`);
        expect(mismatch?.expected).toBe(right);
        expect(mismatch?.actual).toBe(right + 1);
    });

    it("rejects a wrong total even when every output word is right", () => {
        const { words, total } = correctRun(COUNT);
        expect(checkScanWords(words, total - 1, COUNT)?.where).toBe("total");
        expect(checkScanWords(words, POISON, COUNT)?.poison).toBe(true);
    });
});

describe("the device self-check on this lane's adapter", () => {
    it("passes, reports what it did, and is run once per device", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "device-check" });
        try {
            const cold = await verifyDevice(ctx);
            const warmStart = performance.now();
            const warm = await verifyDevice(ctx);
            const warmMs = performance.now() - warmStart;
            console.log(
                `[device-check] ${cold.vendor}/${cold.architecture} "${cold.description}" wg=${String(cold.workgroupSize)} ` +
                    `count=${String(cold.count)} (${String(cold.blocks)} full blocks + 1 word) | ` +
                    `first call ${cold.ms.toFixed(2)} ms (pipeline compile included) | memoised call ${warmMs.toFixed(3)} ms`,
            );
            expect(cold.ok).toBe(true);
            expect(cold.mismatch).toBeNull();
            expect(cold.check).toBe("exclusive-scan");
            expect(cold.count).toBe(32 * ctx.workgroupSize + 1);
            expect(cold.workgroupSize).toBe(ctx.workgroupSize);
            expect(cold.ms).toBeGreaterThan(0);
            // the same settled record, not a second scan
            expect(warm).toBe(cold);
            await expect(assertDeviceComputes(ctx)).resolves.toBeUndefined();
        } finally {
            ctx.dispose();
        }
    });
});

describe("the gate end to end, through the sabotage seam (spec 11.9 item 1)", () => {
    it("refuses a device whose scan writes the wrong block total, and says what came back", async (t) => {
        requireGpu(t);
        const mutation = (SABOTAGE["scan-block"] ?? []).find((m) => m.name === "block-sum-from-lane-zero");
        expect(mutation, "the block-sum-from-lane-zero mutation").toBeDefined();
        if (mutation === undefined) {
            return;
        }
        await withSabotage("scan-block", mutation, async (ctx) => {
            const check = await verifyDevice(ctx);
            console.log(
                `[device-check] sabotaged scan-block: ok=${String(check.ok)} ` +
                    `${check.mismatch?.where ?? "-"} = ${String(check.mismatch?.actual)}, expected ${String(check.mismatch?.expected)}`,
            );
            expect(check.ok).toBe(false);
            expect(check.mismatch).not.toBeNull();
            expect(check.mismatch?.where).toBe(`out[${String(ctx.workgroupSize)}]`);

            let thrown: unknown = null;
            try {
                await assertDeviceComputes(ctx);
            } catch (err: unknown) {
                thrown = err;
            }
            expect(hasErrorCode(thrown, "E_DEVICE_INCORRECT")).toBe(true);
            if (!isWebGpuGraphError(thrown)) {
                throw new Error("expected a WebGpuGraphError");
            }
            const { details } = thrown;
            expect(details.check).toBe("exclusive-scan");
            expect(details.where).toBe(`out[${String(ctx.workgroupSize)}]`);
            expect(details.expected).toBe(check.mismatch?.expected);
            expect(details.actual).toBe(check.mismatch?.actual);
            expect(details.count).toBe(check.count);
            expect(details.workgroupSize).toBe(ctx.workgroupSize);
            expect(details.adapter).toEqual({
                vendor: ctx.caps.vendor,
                architecture: ctx.caps.architecture,
                device: ctx.caps.device,
                description: ctx.caps.description,
            });
            expect(thrown.message).toContain("Refusing to run");
            expect(thrown.message).toContain(ctx.caps.description);

            // and the gate is wired: a public algorithm on that device refuses instead of returning a number
            const snapshot = fromEdgeArrays({
                directed: false,
                nodeCount: 3,
                src: new Uint32Array([0, 1]),
                dst: new Uint32Array([1, 2]),
            });
            await expect(degree(ctx, snapshot)).rejects.toMatchObject({ code: "E_DEVICE_INCORRECT" });
        });
    });
});
