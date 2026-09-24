/**
 * The layout seam of the WebGPU design (design/webgpu/webgpu-acceleration-plan.md section 9.3): steppable
 * simulations over a graph-format snapshot and the owner's stride-3 scene-unit position array, the accelerator
 * interface an injected GPU implements, and the dispatcher that chooses between the two. Nothing here imports the
 * GPU package: the dependency direction is graph-format <- layout <- graphty-element <- the app, and
 * graphty-element's `./webgpu` entry point is the only importer of `@graphty/webgpu-graph-algorithms`
 * (`design/decisions/2026-09-19-graphty-element-owns-webgpu.md`).
 */

export { createSimulation } from "./create-simulation";
export { ForceAtlas2Simulation } from "./forceatlas2";
export { FruchtermanReingoldSimulation } from "./fruchterman-reingold";
export { resolveNodeVector, resolveWeights } from "./inputs";
export { Lcg, seedPositions } from "./seed";
export { toLayoutSnapshot } from "./snapshot";
export type {
    CommonLayoutOptions,
    ForceAtlas2Options,
    FruchtermanReingoldOptions,
    LayoutAccelerator,
    LayoutSimulation,
    SimulationOptions,
    SimulationType,
    SpringElectricalOptions,
} from "./types";
