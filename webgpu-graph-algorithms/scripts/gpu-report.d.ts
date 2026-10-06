// scripts/gpu-report.d.ts (the .js implements exactly this; only the clock record of `--clocks` is typed, the part
// the tests import)

/** One sample of the 200 ms nvidia-smi clock log gpu.yml records while the benchmarks run. */
export interface ClockSample {
    /** The sample's stamp, milliseconds (the runner's local time read as UTC). */
    readonly t: number;
    readonly smMHz: number;
    readonly maxSmMHz: number;
    readonly pstate: string;
    readonly powerW: number;
}

/** One benchmark group's run interval in the stamped bench log. */
export interface BenchGroupInterval {
    readonly group: string;
    readonly start: number;
    readonly end: number;
}

/** The clock record of one benchmark group; the clock and power fields are null when no sample fell inside it. */
export interface ClockGroup {
    readonly group: string;
    readonly samples: number;
    readonly smMinMHz: number | null;
    readonly smMedianMHz: number | null;
    readonly maxSmMHz: number | null;
    readonly pstates: Readonly<Record<string, number>>;
    readonly powerMinW: number | null;
    readonly powerMedianW: number | null;
}

/** The samples of the clock log, oldest first; the header and any other line are skipped. */
export function parseClockLog(text: string): ClockSample[];

/** The group intervals of the stamped bench log, in run order. */
export function parseBenchLog(text: string): BenchGroupInterval[];

/** The clock record of every group. */
export function summarizeClocks(samples: readonly ClockSample[], groups: readonly BenchGroupInterval[]): ClockGroup[];
