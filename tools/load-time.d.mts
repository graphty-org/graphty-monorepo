/** One timed row: the median and minimum of repeated runs, in milliseconds. */
export interface LoadTimeRow {
    group: string;
    name: string;
    medianMs: number;
    minMs: number;
    samplesMs: number[];
}
/** One row from repeated samples. */
export declare function summarize(group: string, name: string, samplesMs: number[]): LoadTimeRow;
/** Writes one benchmark's session to benchmarks/out/load-time-<part>.json and returns the file. */
export declare function writeLoadTimes(part: string, results: LoadTimeRow[]): string;
