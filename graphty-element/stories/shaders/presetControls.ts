/**
 * @file A shader preset's parameters as Storybook controls, and back out of a story's args, shared
 * by every shader story so each parameter type gets the same control everywhere.
 */

import type { InputType } from "storybook/internal/types";

import type { ShaderDescriptor, ShaderParamDescriptor, ShaderParams } from "../../src/catalog/shaders";

type Value = number | string | boolean;

/**
 * One parameter's Storybook control.
 * @param param - The parameter.
 * @returns The control.
 */
function control(param: ShaderParamDescriptor): InputType {
    switch (param.type) {
        case "color":
            return { name: param.plainName, control: "color" };
        case "boolean":
            return { name: param.plainName, control: "boolean" };
        case "enum":
            return {
                name: param.plainName,
                control: "select",
                options: (param.values ?? []).map((choice) => choice.value),
            };
        default:
            return {
                name: param.plainName,
                control: {
                    type: "range",
                    min: param.min,
                    max: param.max,
                    step: param.type === "integer" ? 1 : (param.step ?? 0.01),
                },
            };
    }
}

/**
 * A preset's parameters as Storybook controls, at their defaults.
 * @param descriptor - The preset's catalog entry.
 * @param options - Options.
 * @param options.skip - Parameters the story binds or sets itself, left out.
 * @param options.overrides - Defaults this story changes.
 * @param options.prefix - Put before each arg's name, for a story showing more than one preset.
 * @returns The args and their controls.
 */
export function presetControls(
    descriptor: ShaderDescriptor,
    options: { skip?: readonly string[]; overrides?: ShaderParams; prefix?: string } = {},
): { args: Record<string, Value>; argTypes: Record<string, InputType> } {
    const { skip = [], overrides = {}, prefix = "" } = options;
    const args: Record<string, Value> = {};
    const argTypes: Record<string, InputType> = {};
    for (const param of descriptor.params) {
        if (skip.includes(param.name)) {
            continue;
        }

        args[prefix + param.name] = overrides[param.name] ?? (param.default as Value);
        argTypes[prefix + param.name] = control(param);
    }

    return { args, argTypes };
}

/**
 * Only the preset's own parameters out of a story's args, which Storybook also fills with the
 * element's event handlers.
 * @param descriptor - The preset's catalog entry.
 * @param storyArgs - The story's args.
 * @param prefix - The prefix {@link presetControls} put before each name.
 * @returns The parameters.
 */
export function presetParams(
    descriptor: ShaderDescriptor,
    storyArgs: Readonly<Record<string, unknown>>,
    prefix = "",
): ShaderParams {
    const out: Record<string, Value> = {};
    for (const { name } of descriptor.params) {
        const value = storyArgs[prefix + name];
        if (value !== undefined) {
            out[name] = value as Value;
        }
    }

    return out;
}
