/**
 * Readers of the text a list channel's value is written in: an edge's bends, a node's point lists and a label
 * table. They live apart from the drawing code that uses them, so the catalog's list items read them without
 * loading that code.
 */
import type { LabelTable } from "./labelTable";
import { type ShapePoint, shapePointList } from "./shapeOutlines";

/**
 * Read a `line.bends` value: `along,across` pairs separated by white space.
 * @param text - The value.
 * @returns The pairs, flat (`along0, across0, along1, ...`), or null when the value is absent,
 *     empty, or holds anything that is not a pair of finite numbers.
 */
export function parseBends(text: string | undefined): number[] | null {
    const parts = text?.trim().split(/\s+/) ?? [];
    if (parts.length === 0 || parts[0] === "") {
        return null;
    }

    const out: number[] = [];
    for (const part of parts) {
        const pair = part.split(",");
        const along = Number(pair[0]);
        const across = Number(pair[1]);
        if (
            pair.length !== 2 ||
            pair[0] === "" ||
            pair[1] === "" ||
            !Number.isFinite(along) ||
            !Number.isFinite(across)
        ) {
            return null;
        }

        out.push(along, across);
    }

    return out;
}

/**
 * Lists of points as `node.shapeParts` and `node.shapeLines` write them: `x,y` pairs separated by spaces, one list
 * after another separated by ";", each coordinate a fraction optionally followed by a signed length (`-1+24`). A list
 * with a pair that is not two coordinates is dropped.
 * @param text - The lists.
 * @returns The lists, each point its x fraction and length and its y fraction and length.
 */
export function pointLists(text: string | undefined): ShapePoint[][] {
    return (text ?? "")
        .split(";")
        .map((list) => shapePointList(list))
        .filter((list) => list !== null);
}

/**
 * Reads `shape.labelTable`: a table as JSON, or null when it is absent or is not one.
 * @param json - the value
 * @returns the table, or null
 */
export function readLabelTable(json: string | undefined): LabelTable | null {
    if (json === undefined || json.trim() === "") {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(json);
        return isTable(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Whether a value has a table's shape: rows of cells, each an object.
 * @param v - the value
 * @returns true when it does
 */
function isTable(v: unknown): v is LabelTable {
    if (typeof v !== "object" || v === null || !Array.isArray((v as { rows?: unknown }).rows)) {
        return false;
    }
    return (v as { rows: unknown[] }).rows.every(
        (row) =>
            typeof row === "object" &&
            row !== null &&
            Array.isArray((row as { cells?: unknown }).cells) &&
            (row as { cells: unknown[] }).cells.every(
                (cell) =>
                    typeof cell === "object" &&
                    cell !== null &&
                    ((cell as { table?: unknown }).table === undefined ||
                        isTable((cell as { table: unknown }).table)) &&
                    ((cell as { lines?: unknown }).lines === undefined ||
                        (Array.isArray((cell as { lines: unknown }).lines) &&
                            (cell as { lines: unknown[] }).lines.every(
                                (l) => typeof (l as { text?: unknown } | null)?.text === "string",
                            ))),
            ),
    );
}
