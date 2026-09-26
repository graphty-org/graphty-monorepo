# Every indirect compute dispatch costs about 0.4 ms of device time under Dawn's validation, whether or not it dispatches anything

**Status:** ready to send. Nothing here has been filed anywhere yet.
**Measured:** 2026-09-25, on an NVIDIA GeForce RTX 4070 SUPER (driver 580.173.02, Linux, Vulkan), in two runtimes:
Dawn through the `webgpu` npm package 0.4.0 in Node 22, and Chromium 143 (Playwright's build) with
`--enable-unsafe-webgpu --enable-features=Vulkan --use-angle=vulkan`.
**Affected component:** Dawn's indirect-dispatch validation
(`ComputePassEncoder::TransformIndirectDispatchBuffer`; the symbol is present in the shipped `webgpu` binary), which
inserts an internal compute dispatch per `dispatchWorkgroupsIndirect` to copy the three words to a scratch buffer and
clamp them against `maxComputeWorkgroupsPerDimension`.

---

## Summary

A compute pass that records N calls to `dispatchWorkgroupsIndirect` costs about 0.4 ms of GPU time per call on this
hardware, measured from `queue.submit()` to the settling of a 4-byte `mapAsync` on a buffer copied after the pass.
The cost is the same whether the indirect buffer holds `(0, 0, 1)` (nothing runs) or `(1, 1, 1)` (one workgroup of an
empty kernel), and the same in Dawn-node and in Chromium. The same N dispatches recorded with `dispatchWorkgroups`
cost about 1 us each in Dawn-node and about 10 us each in Chromium. With Dawn's `skip_validation` toggle the indirect
form also costs about 1 us, so the difference is the validation pass and nothing else.

The consequence for a graph traversal that batches thirty-two levels per submit with a few indirect dispatches per
level (the standard WebGPU way to run a data-dependent level loop without a host round trip per level): 224 indirect
dispatches per submit, about 87 ms, around under a millisecond of actual kernel work. The clamp is a correctness
guard the spec requires in some form, but it costs the same as a full pipeline drain per dispatch, which suggests it
is being implemented with a barrier that serialises the queue rather than as a cheap pass. We worked around it by
dispatching directly over a host-bounded grid and having the kernels read their counts from a buffer; the report is
so that the cost is known.

## Measurement

One compute pass holding N dispatches of an empty kernel (`@compute @workgroup_size(1) fn main() {}`), wall time from
`queue.submit()` to the resolution of `mapAsync` on a 4-byte staging buffer filled by a `copyBufferToBuffer` recorded
after the pass. Median of 7 after one warm-up. The card was at its working clock (2.7 GHz, sampled with `nvidia-smi`
during the probe); load average on the host 8-14 from unrelated work, which affects the host-side numbers, not the
device wait.

| Runtime                                                | Dispatch form                        |  N = 35 |  N = 224 | Per dispatch |
| ------------------------------------------------------ | ------------------------------------ | ------: | -------: | -----------: |
| Dawn-node 0.4.0, default toggles                       | indirect, slot `(0, 0, 1)`           | 14.7 ms |  87.1 ms | 0.39-0.43 ms |
| Dawn-node 0.4.0, default toggles                       | indirect, slot `(1, 1, 1)`           | 15.7 ms | 100.8 ms |      0.45 ms |
| Dawn-node 0.4.0, default toggles                       | direct `dispatchWorkgroups(1, 1, 1)` | 0.04 ms |  0.12 ms |   about 1 us |
| Dawn-node 0.4.0, `skip_validation`                     | indirect, either slot                | 0.05 ms |  0.19 ms |   about 1 us |
| Chromium 143, default                                  | indirect, slot `(0, 0, 1)`           | 15.6 ms |  87.7 ms |      0.39 ms |
| Chromium 143, default                                  | direct                               |  0.2 ms |   2.2 ms |  about 10 us |
| Chromium 143, `--enable-dawn-features=skip_validation` | indirect                             |  0.1 ms |   0.2 ms |   about 1 us |

About 0.04 ms of each indirect dispatch is host-side recording (`dispatchWorkgroupsIndirect` itself, measured at
42 us per call around the encoder); the rest is the device wait.

## Reproduction

Run from a directory with the `webgpu` npm package installed (0.4.0 here); the same body runs in a page with
`navigator.gpu` in place of the Dawn globals.

```js
import { create, globals } from "webgpu";
Object.assign(globalThis, globals);

const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[s.length >> 1];
};

async function bench(features) {
    const gpu = create(features.map((f) => `enable-dawn-features=${f}`));
    const adapter = await gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const module = device.createShaderModule({ code: "@compute @workgroup_size(1) fn main() {}" });
    const pipeline = device.createComputePipeline({ layout: "auto", compute: { module, entryPoint: "main" } });
    const args = device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    device.queue.writeBuffer(args, 0, Uint32Array.of(0, 0, 1, 0, 1, 1, 1, 0)); // slot 0 dispatches nothing, slot 1 one workgroup
    const staging = device.createBuffer({ size: 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    for (const kind of ["indirect(0,0,1)", "indirect(1,1,1)", "direct"]) {
        for (const N of [35, 224]) {
            const totals = [];
            for (let i = 0; i < 8; i++) {
                const t0 = performance.now();
                const enc = device.createCommandEncoder();
                const pass = enc.beginComputePass();
                pass.setPipeline(pipeline);
                for (let k = 0; k < N; k++) {
                    if (kind === "direct") pass.dispatchWorkgroups(1, 1, 1);
                    else pass.dispatchWorkgroupsIndirect(args, kind === "indirect(0,0,1)" ? 0 : 16);
                }
                pass.end();
                enc.copyBufferToBuffer(args, 0, staging, 0, 4);
                device.queue.submit([enc.finish()]);
                await staging.mapAsync(GPUMapMode.READ);
                staging.unmap();
                if (i > 0) totals.push(performance.now() - t0);
            }
            console.log(
                `${JSON.stringify(features)} ${kind} N=${N}: ${median(totals).toFixed(2)} ms, ${((1000 * median(totals)) / N).toFixed(0)} us per dispatch`,
            );
        }
    }
    device.destroy();
}

await bench([]);
await bench(["skip_validation"]);
```

Expected on this hardware: the two indirect forms near 0.4 ms per dispatch under the default toggles and near
1 us with `skip_validation`; the direct form near 1 us either way.

## What we did about it

The graph package (`@graphty/webgpu-graph-algorithms`) no longer dispatches its traversal kernels indirectly. The
device-side selector that used to write one indirect-args slot per candidate kernel per level now writes a path word
into the same counters block, and every candidate kernel is a direct grid-stride dispatch that reads the word and its
count first (`design/decisions/2026-09-25-frontier-kernels-dispatch-directly.md`). A 34-node breadth-first search went
from 91 ms to 7 ms in Node and a million-node one from 98 ms to 62 ms. Indirect dispatch is still the right tool
where a dispatch happens once per iteration (the layout's grid-hub pass), because 0.4 ms once per frame is invisible.
