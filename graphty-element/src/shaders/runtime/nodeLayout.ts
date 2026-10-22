/**
 * @file The layout of the per-element data node shaders read (design/rendering/shader-styles.md
 * section 5): the data textures' names and shapes, which parameter takes which slot of a node's
 * varying `vec4`, and the value a parameter is written as.
 *
 * Apart from the programs (`nodePrograms.ts`) so the code a graph loads with every node -- which
 * packs these values -- carries no GLSL; the programs load with the shader runtime.
 *
 * Plain values; nothing here reaches Babylon.js, Lit or the DOM.
 */

import { isClockBinding, type ShaderParamDescriptor } from "../../catalog/shaders";

/**
 * The value a clock-bound parameter's uniform or data texel holds while no use has set it: the
 * program then reads the clock instead (wrap.ts). Far below any range a parameter declares.
 */
const CLOCK_UNSET = -1e30;

/** The parameter-set texture's sampler. */
export const PARAM_TEXTURE = "graphty_paramTex";

/** The state-time texture's sampler. */
export const STATE_TEXTURE = "graphty_stateTex";

/** Texels per row of the parameter-set texture: one per parameter, the most a shader declares. */
export const PARAM_TEXTURE_WIDTH = 16;

/** Nodes per row of the state-time texture; each node takes {@link STATE_TEXELS} texels. */
export const STATE_NODES_PER_ROW = 128;

/** Texels per node in the state-time texture: (selected, hovered, pinned, entered), (exited, changed). */
export const STATE_TEXELS = 2;

/** The most parameters a shader binds per element: the slots of one `vec4`. */
export const VARYING_SLOTS = 4;

/**
 * Which slot of the varying `vec4` each parameter takes: its index among the `varies` ones that
 * are not colors (a color takes three floats and is never per element), up to four.
 * @param params - The parameters.
 * @returns The slot by parameter name.
 */
export function varyingSlots(params: readonly ShaderParamDescriptor[]): ReadonlyMap<string, number> {
    const slots = new Map<string, number>();
    for (const param of params) {
        if (param.varies === true && param.type !== "color" && slots.size < VARYING_SLOTS) {
            slots.set(param.name, slots.size);
        }
    }

    return slots;
}

/**
 * The value a parameter's uniform takes for one of its values.
 * @param param - The parameter.
 * @param value - A value of it, or undefined for its default.
 * @returns The uniform's value: three floats for a color, else one.
 */
export function uniformValueOf(param: ShaderParamDescriptor, value: unknown): number[] {
    const given = value ?? param.default;
    // A clock-bound default no use has replaced: the program reads the clock (wrap.ts).
    if (isClockBinding(given) && isClockBinding(param.default)) {
        return param.type === "color" ? [CLOCK_UNSET, CLOCK_UNSET, CLOCK_UNSET] : [CLOCK_UNSET];
    }

    switch (param.type) {
        case "color": {
            const hex = typeof given === "string" && /^#[\da-fA-F]{6}$/.test(given) ? given : "#ffffff";
            return [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255);
        }
        case "boolean":
            return [given === true ? 1 : 0];
        case "enum": {
            const index = (param.values ?? []).findIndex((entry) => entry.value === given);
            return [Math.max(0, index)];
        }
        default:
            return [typeof given === "number" && Number.isFinite(given) ? given : 0];
    }
}
