/**
 * @file Finding the column a {@link ColumnRef} names.
 */

import type { AttributeDescriptor } from "../catalog/types";
import { GraphtyError } from "../errors";
import { nearestNames } from "./results/ResultsApi";
import type { ColumnRef } from "./shared";

/**
 * The attribute a column reference names, matched on its kind and its literal name.
 * @param attributes - What `session.data.attributes()` lists now.
 * @param ref - The column.
 * @returns The attribute's descriptor.
 * @throws A `GraphtyError` coded `E_UNKNOWN_ATTRIBUTE`, with `details.kind`, `details.name` and
 *     the nearest names of that kind in `details.candidates`, when no such column exists.
 */
export function resolveColumn(attributes: readonly AttributeDescriptor[], ref: ColumnRef): AttributeDescriptor {
    const found = attributes.find((attribute) => attribute.kind === ref.kind && attribute.name === ref.name);
    if (found !== undefined) {
        return found;
    }

    const names = attributes.filter((attribute) => attribute.kind === ref.kind).map((attribute) => attribute.name);
    throw new GraphtyError({
        code: "E_UNKNOWN_ATTRIBUTE",
        source: "data",
        message: `No ${ref.kind} column is named ${JSON.stringify(ref.name)}.`,
        details: { kind: ref.kind, name: ref.name, candidates: nearestNames(ref.name, names) },
    });
}
