/**
 * @file The rows that decide what a column holds when the location map looks for its columns: a
 * bounded, evenly spaced sample, so finding the location reads a fixed number of values per column
 * however many nodes there are (issue #10229: a cold table open read every value of every column).
 * Every caller samples the same rows of a column of the same length, so they reach one answer.
 */

/**
 * At most this many rows of a column are read to tell whether it holds locations.
 * ponytail: a fixed sample; a column whose share sits within a few percent of the 50% bar can be
 * judged differently than a full read would. Raise it if that ever bites.
 */
export const DETECTION_ROWS = 1000;

/**
 * The rows read of a column of so many rows: all of them up to {@link DETECTION_ROWS}, else that
 * many, evenly spaced from the first.
 * @param count - The column's length.
 * @returns The rows, ascending, or undefined for every row.
 */
export function detectionRows(count: number): number[] | undefined {
    if (count <= DETECTION_ROWS) {
        return undefined;
    }

    return Array.from({ length: DETECTION_ROWS }, (_, at) => Math.floor((at * count) / DETECTION_ROWS));
}

/**
 * A column's values at its {@link detectionRows}.
 * @param values - The column, by row; a column read only at those rows serves as well.
 * @returns The values that decide what the column holds.
 */
export function sampled(values: readonly unknown[]): readonly unknown[] {
    const rows = detectionRows(values.length);
    return rows === undefined ? values : rows.map((row) => values[row]);
}
