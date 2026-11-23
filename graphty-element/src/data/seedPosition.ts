/** The `data.knownFields` naming the columns a node's position is read from. */
export interface PositionAxes {
    readonly nodeXPath?: string | null;
    readonly nodeYPath?: string | null;
    readonly nodeZPath?: string | null;
}

/**
 * The position a record's x, y and z columns give, or null without both an x and a y column
 * holding finite numbers. A missing z column reads 0.
 * @param record - the raw node record
 * @param axes - the columns
 * @returns the file-unit triple, or null
 */
export function readAxes(
    record: Record<string | number, unknown>,
    axes: PositionAxes,
): [number, number, number] | null {
    const { nodeXPath, nodeYPath, nodeZPath } = axes;
    if (typeof nodeXPath !== "string" || typeof nodeYPath !== "string") {
        return null;
    }

    const x = record[nodeXPath];
    const y = record[nodeYPath];
    const z = typeof nodeZPath === "string" ? record[nodeZPath] : 0;
    const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
    return finite(x) && finite(y) && finite(z) ? [x, y, z] : null;
}

/**
 * The file-unit coordinate a record carries, in the two shapes the element's own data has always
 * used, or null when it carries none.
 *
 * `{ x, y, z? }` is what `FixedLayoutEngine` reads off `node.data` today
 * (`src/layout/FixedLayoutEngine.ts`), and `[x, y]` / `[x, y, z]` is the array form the importers
 * produce. A missing z is 0, not NaN: a 2D record IS placed, on the z = 0 plane, and NaN is
 * reserved for "no layout has run".
 *
 * Anything non-finite makes the WHOLE record unseeded rather than partly seeded. A row stored with
 * one NaN component reports itself PLACED (`ElementPositions.isPlaced` tests x), so a layout would
 * never repair it and the mesh would vanish; left unseeded, the node is laid out like any other.
 * Columns given the x and y roles (`data.knownFields.nodeXPath`, `nodeYPath`, `nodeZPath`) win
 * over `position`: a record whose x and y columns hold finite numbers is placed from them.
 * @param record - the raw node record
 * @param axes - the `data.knownFields` naming the x, y and z columns, when known
 * @returns the file-unit triple, or null when there is nothing usable to seed
 */
export function readSeedPosition(
    record: Record<string | number, unknown>,
    axes?: PositionAxes,
): [number, number, number] | null {
    const fromColumns = axes === undefined ? null : readAxes(record, axes);
    if (fromColumns !== null) {
        return fromColumns;
    }

    const { position } = record;
    if (position === null || typeof position !== "object") {
        return null;
    }

    let x: unknown;
    let y: unknown;
    let z: unknown;
    if (Array.isArray(position)) {
        const list: readonly unknown[] = position;
        if (list.length !== 2 && list.length !== 3) {
            return null;
        }

        [x, y] = list;
        z = list.length === 3 ? list[2] : 0;
    } else {
        const vector = position as { x?: unknown; y?: unknown; z?: unknown };
        ({ x, y } = vector);
        z = vector.z ?? 0;
    }

    if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number") {
        return null;
    }

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return null;
    }

    return [x, y, z];
}
