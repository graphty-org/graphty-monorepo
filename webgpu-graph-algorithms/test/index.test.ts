/**
 * The public barrel's VALUE list, pinned (contract 3.15, 5.5): P0's errors / constants / isSoftwareAdapter, P1's
 * GpuContext and degree, P3's layout factory, accelerator, default tables and seeder, P5's two layout factories and
 * their default tables, P4's calibrateLayout, P7's six algorithms, P8's four traversals; each value is the same object
 * its module exports; no default export; the entries and the internal surface never reach the root.
 * Types are pinned by test/types/public-api.test-d.ts under the strict-consumer compile.
 */

import { createAccelerator } from "../src/accelerator.js";
import { bellmanFord } from "../src/algorithms/bellman-ford.js";
import { breadthFirstSearch } from "../src/algorithms/bfs.js";
import { closenessCentrality } from "../src/algorithms/closeness.js";
import { connectedComponents } from "../src/algorithms/components.js";
import { degree } from "../src/algorithms/degree.js";
import { pageRank, personalizedPageRank } from "../src/algorithms/pagerank.js";
import { eigenvectorCentrality, hits, katzCentrality } from "../src/algorithms/spectral.js";
import { sssp } from "../src/algorithms/sssp.js";
import * as constants from "../src/constants.js";
import { GpuContext } from "../src/context.js";
import * as acquire from "../src/device/acquire.js";
import * as errors from "../src/errors.js";
import * as api from "../src/index.js";
import { calibrateLayout } from "../src/layouts/calibrate.js";
import { createForceAtlas2 } from "../src/layouts/forceatlas2.js";
import { createFruchtermanReingold } from "../src/layouts/fruchterman-reingold.js";
import { seedPositions } from "../src/layouts/seed.js";
import { createSpringElectrical } from "../src/layouts/spring-electrical.js";
import { verifyDevice } from "../src/primitives/verify.js";

/**
 * The VALUE exports of contract 3.15 at the end of P3 (the P0, P1 and P3 lists; P2 added none). Types are pinned
 * by test/types/public-api.test-d.ts, which the strict-consumer compile inside `pnpm run lint` type-checks.
 */
const VALUE_EXPORTS = [
    // P0 (contract 3.15): the error class, its brand checks, the constants, the adapter classifier
    "WebGpuGraphError",
    "isWebGpuGraphError",
    "hasErrorCode",
    "PASSTHROUGH_FORMAT_CODES",
    "WORKGROUP_SIZE",
    "MAX_WORKGROUPS_PER_DIM",
    "MAX_1D_ITEMS",
    "ARC_WINDOW_ALIGN",
    "STORAGE_ALIGN",
    "EXACT_MAX_NODES",
    "isSoftwareAdapter",
    // P1: the context and the walking-skeleton diagnostic
    "GpuContext",
    "degree",
    // P3: the layout factory, the accelerator, the two default tables, the seeder
    "createForceAtlas2",
    "createAccelerator",
    "FA2_DEFAULTS",
    "LAYOUT_TUNING_DEFAULTS",
    "seedPositions",
    // P5: the two layout factories and their default tables
    "createFruchtermanReingold",
    "createSpringElectrical",
    "FR_DEFAULTS",
    "SE_DEFAULTS",
    // P4: the layout-tier micro-benchmark (spec 2.2)
    "calibrateLayout",
    // P7: the SpMV family and WCC (spec 8.2, 8.3; M8b-T8)
    "pageRank",
    "personalizedPageRank",
    "hits",
    "eigenvectorCentrality",
    "katzCentrality",
    "connectedComponents",
    // P8: the frontier family (spec 3.3 lines 807-810, 8.4; P8-T13 PD-16)
    "breadthFirstSearch",
    "sssp",
    "bellmanFord",
    "closenessCentrality",
    // the device self-check (the capability record a caller reads before committing work to a device)
    "verifyDevice",
];

/**
 * Names contract 3.15 says are NEVER exported from the root: the entries, the @internal surface, P4+ / P7+ names,
 * plus the entries' helpers, the summarizer and the numeric WebGPU constants (the P0 / P1 pins, retained).
 */
const NEVER_EXPORTED = [
    // the ./node and ./browser entries (their own subpaths)
    "createNodeGpu",
    "createNodeGpuContext",
    "probeNodeWebGpu",
    "dawnFlags",
    "probeBrowserWebGpu",
    "requestGpuContext",
    // the @internal surface (tests import these from their files)
    "GraphResidency",
    "BufferPool",
    "Readback",
    "Lease",
    "PipelineCache",
    "Kernel",
    "CommandBatch",
    "UniformRing",
    "UniformBlock",
    "composeWgsl",
    "KERNELS",
    "kernelSpec",
    "ForceSimulation",
    "ForceAtlas2Model",
    "RepulsionExact",
    "Lcg",
    "resolveForceAtlas2Options",
    "resolveLayoutTuning",
    "Profiler", // exported as a TYPE only (3.15)
    "summarizeAdapter",
    "BufferUsage",
    "MapMode",
    "ShaderStage",
    // the P4 / P5 internals and the P7 names that are accelerator members or internals, never barrel values
    "RepulsionGrid",
    "FruchtermanReingoldModel",
    "SpringElectricalModel",
    "resolveFruchtermanReingoldOptions",
    "resolveSpringElectricalOptions",
    "weaklyConnectedComponents",
    "runPowerIteration",
    "spmvPull",
    "assertDeviceComputes", // the guard the entry points await; callers read verifyDevice instead
    "checkScanWords",
    // the P8 tuning entry points (PD-26) and the ring arithmetic, @internal seams the tests reach by file
    "bfsWithTuning",
    "ssspWithTuning",
    "bellmanFordWithTuning",
    "closenessWithTuning",
    "bfsRingSlots",
];

describe("public barrel (contract 3.15; spec 3.3, 11.3 row 'Build output')", () => {
    it("exports exactly the P3 + P4 + P5 + P7 + P8 value list and no default export", () => {
        expect(Object.keys(api).sort()).toEqual([...VALUE_EXPORTS].sort());
        expect((api as Record<string, unknown>).default).toBeUndefined();
    });

    it("re-exports the P0, P1 and P3 values as the very objects their modules export", () => {
        expect(api.WebGpuGraphError).toBe(errors.WebGpuGraphError);
        expect(api.isWebGpuGraphError).toBe(errors.isWebGpuGraphError);
        expect(api.hasErrorCode).toBe(errors.hasErrorCode);
        expect(api.PASSTHROUGH_FORMAT_CODES).toBe(errors.PASSTHROUGH_FORMAT_CODES);
        expect(api.WORKGROUP_SIZE).toBe(constants.WORKGROUP_SIZE);
        expect(api.MAX_WORKGROUPS_PER_DIM).toBe(constants.MAX_WORKGROUPS_PER_DIM);
        expect(api.MAX_1D_ITEMS).toBe(constants.MAX_1D_ITEMS);
        expect(api.ARC_WINDOW_ALIGN).toBe(constants.ARC_WINDOW_ALIGN);
        expect(api.STORAGE_ALIGN).toBe(constants.STORAGE_ALIGN);
        expect(api.EXACT_MAX_NODES).toBe(constants.EXACT_MAX_NODES);
        expect(api.FA2_DEFAULTS).toBe(constants.FA2_DEFAULTS);
        expect(api.LAYOUT_TUNING_DEFAULTS).toBe(constants.LAYOUT_TUNING_DEFAULTS);
        expect(api.isSoftwareAdapter).toBe(acquire.isSoftwareAdapter);
        expect(api.GpuContext).toBe(GpuContext);
        expect(api.degree).toBe(degree);
        expect(api.createForceAtlas2).toBe(createForceAtlas2);
        expect(api.createAccelerator).toBe(createAccelerator);
        expect(api.seedPositions).toBe(seedPositions);
        expect(api.createFruchtermanReingold).toBe(createFruchtermanReingold);
        expect(api.createSpringElectrical).toBe(createSpringElectrical);
        expect(api.FR_DEFAULTS).toBe(constants.FR_DEFAULTS);
        expect(api.SE_DEFAULTS).toBe(constants.SE_DEFAULTS);
        expect(api.pageRank).toBe(pageRank);
        expect(api.personalizedPageRank).toBe(personalizedPageRank);
        expect(api.hits).toBe(hits);
        expect(api.eigenvectorCentrality).toBe(eigenvectorCentrality);
        expect(api.katzCentrality).toBe(katzCentrality);
        expect(api.connectedComponents).toBe(connectedComponents);
        expect(api.breadthFirstSearch).toBe(breadthFirstSearch);
        expect(api.sssp).toBe(sssp);
        expect(api.bellmanFord).toBe(bellmanFord);
        expect(api.closenessCentrality).toBe(closenessCentrality);
        expect(api.calibrateLayout).toBe(calibrateLayout);
        expect(api.verifyDevice).toBe(verifyDevice);
        expect(typeof api.WebGpuGraphError).toBe("function");
        expect(typeof api.isWebGpuGraphError).toBe("function");
        expect(typeof api.hasErrorCode).toBe("function");
        expect(typeof api.isSoftwareAdapter).toBe("function");
        expect(typeof api.GpuContext.probe).toBe("function");
        expect(typeof api.GpuContext.create).toBe("function");
        expect(typeof api.GpuContext.from).toBe("function");
        expect(Object.isFrozen(api.PASSTHROUGH_FORMAT_CODES)).toBe(true);
    });

    it("never exports the entries or the @internal surface", () => {
        for (const name of NEVER_EXPORTED) {
            expect(name in api, name).toBe(false);
        }
    });

    it("carries the P3 default tables with the values of contract 3.2", () => {
        expect(api.FA2_DEFAULTS).toEqual({
            maxIter: 100,
            jitterTolerance: 1,
            scalingRatio: 2,
            gravity: 1,
            strongGravity: false,
            distributedAction: false,
            linlog: false,
            dissuadeHubs: false,
            dim: 2,
            scale: 1,
            settleThreshold: 0.001,
            settleWindow: 10,
            iterationsPerStep: 1,
            maxInFlight: 2,
        });
        expect(api.LAYOUT_TUNING_DEFAULTS).toEqual({
            repulsion: "auto",
            exactMaxNodes: api.EXACT_MAX_NODES,
            nearMax: 64,
            deterministic: true,
            gridMax2D: 512,
            gridMax3D: 128,
            extentFactor: 6,
            compat: "paper",
        });
        expect(Object.isFrozen(api.FA2_DEFAULTS)).toBe(true);
        expect(Object.isFrozen(api.LAYOUT_TUNING_DEFAULTS)).toBe(true);
        expect(Object.isFrozen(api.FR_DEFAULTS)).toBe(true);
        expect(Object.isFrozen(api.SE_DEFAULTS)).toBe(true);
        expect(api.MAX_1D_ITEMS).toBe(16_776_960);
        expect(api.MAX_1D_ITEMS).toBe(api.MAX_WORKGROUPS_PER_DIM * api.WORKGROUP_SIZE);
    });
});
