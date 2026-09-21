/**
 * The defaults an options form starts from.
 *
 * Kept beside the form rather than inside it because a caller usually needs the defaults twice:
 * once to draw the form, and once to send a run the values the reader never touched.
 */
import type { OptionDescriptor } from "@graphty/graphty-element/catalog";

/**
 * The default value of every option that declares one.
 * @param options - The options to read.
 * @returns The defaults, by option name.
 */
export function optionDefaults(options: readonly OptionDescriptor[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const option of options) {
        if (option.default !== undefined) {
            result[option.name] = option.default;
        }
    }

    return result;
}
