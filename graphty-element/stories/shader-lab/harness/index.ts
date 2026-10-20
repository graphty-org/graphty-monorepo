/**
 * The shader-lab harness. A story imports from here:
 *   import { labMeta, mountLab, graphArgs, graphArgTypes } from "../harness";
 *   export default { title: "Shader Lab/<Batch title>/<Name>", ...labMeta };
 */
import { GRAPH_KINDS } from "./graphs";

export { GLSL_LIBRARY } from "./glsl";
export { communityColor, GRAPH_KINDS, type GraphKind, hopsFrom, type LabGraph, makeGraph, PALETTE } from "./graphs";
export {
    type Blend,
    type EdgeLayerOptions,
    type InstanceOptions,
    type LabContext,
    type LabLayer,
    type LabOptions,
    mountLab,
    type NodeLayerOptions,
    QUALITIES,
    type Quality,
    QUALITY_SETTINGS,
    qualityDefines,
    type Uniforms,
    type UniformValue,
} from "./lab";

/**
 * Spread into a story file's default export, which Storybook requires to be an object literal
 * with a literal title: `export default { title: "Shader Lab/<Batch title>/<Name>", ...labMeta };`
 */
export const labMeta = { tags: ["!autodocs"], parameters: { layout: "fullscreen" } };

/** Args every story can offer: the sample graph and the base sizes. */
export interface GraphArgs {
    graph: (typeof GRAPH_KINDS)[number];
    nodes: number;
    dim: 2 | 3;
    nodeSize: number;
    edgeWidth: number;
}

export const graphArgs: GraphArgs = { graph: "communities", nodes: 0, dim: 3, nodeSize: 1, edgeWidth: 1.5 };

export const graphArgTypes = {
    graph: { control: "select", options: GRAPH_KINDS },
    nodes: { control: "select", options: [0, 60, 120, 240, 400, 1000, 2500, 5000], labels: { 0: "default" } },
    dim: { control: "inline-radio", options: [2, 3] },
    nodeSize: { control: { type: "range", min: 0.2, max: 4, step: 0.05 } },
    edgeWidth: { control: { type: "range", min: 0.25, max: 12, step: 0.25 } },
};

/**
 * A range control.
 * @param min - lowest value
 * @param max - highest value
 * @param step - step
 * @returns the argType
 */
export function range(
    min: number,
    max: number,
    step = (max - min) / 100,
): { control: { type: "range"; min: number; max: number; step: number } } {
    return { control: { type: "range", min, max, step } };
}
