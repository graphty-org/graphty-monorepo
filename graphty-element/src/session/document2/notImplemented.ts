/**
 * @file The refusal a version 2 part that is not written yet throws. Experimental (`save-files-v2`).
 */

import { GraphtyError } from "../../errors/GraphtyError";

/**
 * The refusal of a version 2 part that is not implemented yet.
 * @param part - What is missing, such as `style.write`.
 * @returns The error, `E_UNSUPPORTED` with `{ key: part }`.
 */
export function notImplemented(part: string): GraphtyError {
    return new GraphtyError({
        code: "E_UNSUPPORTED",
        message: `Save files version 2: ${part} is not implemented yet.`,
        source: "data",
        details: { key: part },
    });
}

/**
 * Throw the refusal of a version 2 part that is not implemented yet, where a value is due.
 * @param part - What is missing.
 */
export function throwNotImplemented(part: string): never {
    throw notImplemented(part);
}
