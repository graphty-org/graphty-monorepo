/**
 * The `...Async` methods and the simulations on a real WebGPU device under Node (Dawn), through the provider the
 * package loads on demand. Every result is compared with the synchronous CPU method within the tolerance the WebGPU
 * package documents for that algorithm.
 *
 * The adapter policy is @graphty/webgpu-graph-algorithms', read from GRAPHTY_GPU_REQUIRE by its own parser: unset
 * skips these tests when there is no adapter (with the reason), "any" demands an adapter (lavapipe counts),
 * "hardware" a non-software one, a vendor name that vendor. GRAPHTY_GPU_ADAPTER picks the Dawn adapter by name
 * ("llvmpipe" mirrors CI). On the dev box the NVIDIA GPU needs the extracted libEGL tree on LD_LIBRARY_PATH (see
 * webgpu-graph-algorithms/CLAUDE.md).
 */

import { probeNodeWebGpu } from "@graphty/webgpu-graph-algorithms/node";
import cytoscape, { type LayoutOptions } from "cytoscape";
import { beforeAll, describe, expect, it, type TestContext } from "vitest";

// The policy parser lives in the GPU package's scripts/ and is not exported, so the adapter's tests import it by
// path rather than keep a second copy of the rule.
import { checkAdapter, parseGpuRequire } from "../../webgpu-graph-algorithms/scripts/gpu-policy.js";
import { configureWebGpu, type GpuAccelerator, gpuFor } from "../src/gpu";
import graphtyCytoscape, { type Backend } from "../src/index";
import { caseName, CASES, coreFor, expectClose, mainGraph } from "./gpu-cases";

if (process.env.XDG_RUNTIME_DIR === undefined || process.env.XDG_RUNTIME_DIR === "") {
    process.env.XDG_RUNTIME_DIR = "/tmp";
}

const adapter = process.env.GRAPHTY_GPU_ADAPTER;
let verdict: { ok: boolean; skip: boolean; reason: string | null } = { ok: false, skip: true, reason: "not probed" };

beforeAll(async () => {
    cytoscape.use(graphtyCytoscape);
    const probe = await probeNodeWebGpu({ adapter });
    verdict = checkAdapter(probe.summary, parseGpuRequire(process.env.GRAPHTY_GPU_REQUIRE));
    if (verdict.ok && probe.summary !== null) {
        console.log(`[gpu] cytoscape adapter tests on ${probe.summary.vendor} / ${probe.summary.architecture}`);
    }
    // The policy, not the adapter's software filter, decides which adapters these tests accept
    configureWebGpu({ acceptSoftware: true, adapter });
}, 60_000);

/**
 * Skips under the unset policy when there is no adapter; fails when the policy demands one.
 * @param t - the test context
 */
function requireGpu(t: TestContext): void {
    if (verdict.skip) {
        t.skip(verdict.reason ?? "no adapter");
    }
    expect(verdict.ok, verdict.reason ?? "").toBe(true);
}

type Method = (o?: Record<string, unknown>) => unknown;
const method = (cy: cytoscape.Core, name: string): Method => (cy as unknown as Record<string, Method>)[name].bind(cy);

describe("the Async methods on the GPU", () => {
    for (const c of CASES) {
        it(`${caseName(c)} runs on the GPU within the documented tolerance of the CPU`, async (t) => {
            requireGpu(t);
            const cy = coreFor(c);
            const r = (await method(cy, `${c.method}Async`)(c.options)) as Record<string, unknown> & {
                backend: Backend;
            };
            expect(r.backend.ran, r.backend.reason ?? "").toBe("gpu");
            const got = c.read(r as never, cy);
            if (c.check !== undefined) {
                c.check(got, cy);
            } else {
                expectClose(got, c.read(method(cy, c.method)(c.options) as never, cy), c.tol, caseName(c), c.abs);
            }
            cy.destroy();
        });
    }
});

describe("the device lifecycle on the GPU", () => {
    it("reuses one device for every call on a core and disposes it on cy.destroy()", async (t) => {
        requireGpu(t);
        const cy = mainGraph();
        const first = await gpuFor(cy);
        await cy.graphtyPageRankAsync();
        await cy.graphtyBetweennessCentralityAsync();
        const again = await gpuFor(cy);
        expect(again.gpu).toBe(first.gpu);
        const { ctx } = first.gpu?.accelerator as unknown as { ctx: { state: string } };
        expect(ctx.state).toBe("ready");
        cy.destroy();
        await Promise.resolve();
        await Promise.resolve();
        expect(ctx.state).toBe("disposed");
    });

    it("concurrent runs that write their fields all finish: one run's write does not free another's buffers", async (t) => {
        requireGpu(t);
        const cy = mainGraph();
        const runs = await Promise.all([
            cy.graphtyPageRankAsync({ field: "pr" }),
            cy.graphtyBetweennessCentralityAsync({ field: "bc" }),
            cy.graphtyClosenessCentralityAsync({ field: "cc" }),
        ]);
        expect(runs.map((r) => r.backend.ran)).toEqual(["gpu", "gpu", "gpu"]);
        for (const field of ["pr", "bc", "cc"]) {
            expect(typeof cy.nodes()[0].data(field), field).toBe("number");
        }
        cy.destroy();
    });

    it("acquires a new device after the device is lost, and the next call runs on it", async (t) => {
        requireGpu(t);
        const cy = mainGraph();
        const before = (await gpuFor(cy)).gpu;
        const acc = before?.accelerator as GpuAccelerator & { ctx: { device: GPUDevice } };
        acc.ctx.device.destroy();
        await before?.lost;
        const r = await cy.graphtyPageRankAsync();
        expect(r.backend.ran).toBe("gpu");
        const after = (await gpuFor(cy)).gpu;
        expect(after).not.toBe(before);
        expectClose(
            cy.nodes().map((n) => r.score(n) ?? NaN),
            cy.nodes().map((n) => cy.graphtyPageRank().score(n) ?? NaN),
            1e-5,
            "PageRank after the loss",
        );
        cy.destroy();
    });
});

describe("the simulations on the GPU", () => {
    for (const name of ["graphty-forceatlas2", "graphty-fruchterman-reingold", "graphty-spring-electrical"]) {
        it(`${name} runs on the core's device and places every node`, async (t) => {
            requireGpu(t);
            const cy = mainGraph();
            const layout = cy.layout({
                name,
                boundingBox: { x1: 0, y1: 0, w: 500, h: 500 },
                maxIter: 200,
                seed: 1,
            } as unknown as LayoutOptions);
            const errors: unknown[] = [];
            layout.on("layouterror", (_e, error: unknown) => errors.push(error));
            const stop = layout.promiseOn("layoutstop");
            layout.run();
            await stop;
            expect(errors).toEqual([]);
            expect((layout as unknown as { backend: Backend }).backend.ran).toBe("gpu");
            const xs = cy.nodes().map((n) => n.position());
            expect(xs.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
            // the fit fills the box, and the run spread the nodes out
            expect(new Set(xs.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`)).size).toBe(xs.length);
            cy.destroy();
        });
    }
});
