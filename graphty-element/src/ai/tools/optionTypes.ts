/**
 * @file Which option types the assistant can offer a model, as plain data: every option type but
 * `unknown`, the one a descriptor records when its schema used a construct nothing could classify.
 * Kept apart from the schemas so a plugin's own check reads it without loading zod.
 */

import { OPTION_TYPES, type OptionDescriptor, type OptionType } from "../../catalog/types";

/** The option types the assistant offers. */
export const OFFERED_OPTION_TYPES: ReadonlySet<OptionType> = new Set(OPTION_TYPES.filter((type) => type !== "unknown"));

/**
 * Whether the assistant can offer an option.
 * @param option - The option.
 * @returns True unless its type is `unknown`.
 */
export function isOfferedOption(option: Pick<OptionDescriptor, "type">): boolean {
    return OFFERED_OPTION_TYPES.has(option.type);
}
