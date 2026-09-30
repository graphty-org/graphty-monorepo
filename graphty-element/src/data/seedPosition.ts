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
 * @param record - the raw node record
 * @returns the file-unit triple, or null when there is nothing usable to seed
 */
export function readSeedPosition(record: Record<string | number, unknown>): [number, number, number] | null {
    const { position } = record;
    if (position === null || typeof position !== "object") {
        return null;
    }

    let x: unknown;
    let y: unknown;
    let z: unknown;
    if (Array.isArray(position)) {
        if (position.length !== 2 && position.length !== 3) {
            return null;
        }

        [x, y] = position;
        z = position.length === 3 ? position[2] : 0;
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
