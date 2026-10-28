import { GraphtyError } from "../errors";
import type { SnapshotLayoutInput } from "./SnapshotLayoutEngine";

/** The rows of each group a `groupBy` option names, and the rows that carry no group. */
export interface GroupedRows {
    /** One array of rows per distinct value, numbers before strings, each in ascending order. */
    readonly groups: readonly number[][];
    /** The rows whose node carries no value for the attribute. */
    readonly ungrouped: readonly number[];
}

/**
 * Split the graph's rows into the groups the layout's `groupBy` option names: a node attribute
 * (`group`, `data.group`) or a run's partition (`results.louvain.group`).
 * @param input - The layout's input.
 * @param layout - The layout's name, for the refusal.
 * @returns The groups.
 * @throws A `GraphtyError` with `E_OPTION_RANGE` when no attribute is named or no node carries it.
 */
export function groupRows(input: SnapshotLayoutInput, layout: string): GroupedRows {
    const values = input.column("groupBy");
    const byValue = new Map<unknown, number[]>();
    const ungrouped: number[] = [];
    values?.forEach((value, row) => {
        if (value === undefined || value === null) {
            ungrouped.push(row);
            return;
        }

        const rows = byValue.get(value);
        if (rows === undefined) {
            byValue.set(value, [row]);
        } else {
            rows.push(row);
        }
    });

    if (byValue.size === 0) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message:
                typeof input.options.groupBy === "string"
                    ? `the layout "${layout}" groups nodes by "${input.options.groupBy}", which no node carries`
                    : `the layout "${layout}" needs groupBy: the attribute whose values name each node's group`,
            source: "layout",
            details: { layout, option: "groupBy", value: input.options.groupBy },
        });
    }

    const keys = [...byValue.keys()].sort((a, b) => {
        if (typeof a === "number" && typeof b === "number") {
            return a - b;
        }

        // Numbers before strings; strings in reading order.
        return Number(typeof b === "number") - Number(typeof a === "number") || String(a).localeCompare(String(b));
    });
    return { groups: keys.map((key) => byValue.get(key) ?? []), ungrouped };
}
