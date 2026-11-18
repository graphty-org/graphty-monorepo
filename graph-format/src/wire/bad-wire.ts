/**
 * The E_BAD_SERIALIZATION error every wire reader (from-wire.ts, bytes.ts, json-tags.ts and
 * carried-views.ts) raises for a malformed manifest member or buffer reference.
 */

import { GraphFormatError } from "../errors.js";

/**
 * The E_BAD_SERIALIZATION error of a malformed manifest member or buffer reference.
 * @param ref - the manifest path, e.g. "nodeColumns[2].data"
 * @param reason - what is wrong
 * @param details - extra context
 * @returns the error
 */
export function badWire(
    ref: string,
    reason: string,
    details: Readonly<Record<string, unknown>> = {},
): GraphFormatError {
    return new GraphFormatError("E_BAD_SERIALIZATION", `${ref}: ${reason}`, { ref, reason, ...details });
}
