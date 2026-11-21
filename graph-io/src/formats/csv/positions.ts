/**
 * How a CSV node table's positions are spelled, for `extractPositions()`. CSV declares nothing about
 * coordinates, so numeric node columns named `x` and `y` (and `z`), in any case, are read as the
 * positions by their names: y up, in the file's own unit, as graph-io writes them. The guess is noted
 * (`W_POSITIONS_GUESSED`).
 */

import type { Column, GraphSnapshot } from "@graphty/graph-format";

import type { ImporterPositions } from "../../positions/types.js";

/** The dtypes that hold one number. */
const NUMERIC: ReadonlySet<string> = new Set(["f64", "f32", "i32", "u32", "u8"]);

/**
 * The spelling of a CSV file's positions.
 * @param snapshot - the graph the CSV importer read
 * @returns the x / y (/ z) columns, or null when the node table has no numeric x and y
 */
export function csvPositions(snapshot: GraphSnapshot): ImporterPositions | null {
    const named = (name: string): Column | undefined =>
        [...snapshot.nodes].find(
            (c) => c.meta.name.toLowerCase() === name && c.meta.components === 1 && NUMERIC.has(c.dtype),
        );
    const x = named("x");
    const y = named("y");
    if (x === undefined || y === undefined) {
        return null;
    }
    const z = named("z");
    return {
        x: x.meta.name,
        y: y.meta.name,
        ...(z === undefined ? {} : { z: z.meta.name }),
        yAxis: "up",
        units: "file",
        byName: true,
    };
}
