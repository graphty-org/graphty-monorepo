// scripts/bench-ab.d.ts (the .js implements exactly this)
/** One row of a `benchmarks/run.ts --samples-out` file: every timed sample of one benchmark. */
export interface AbSample {
    readonly group: string;
    readonly name: string;
    readonly samples: readonly number[];
}
/** One round of the paired run: the samples of the base build and of the candidate build. */
export interface AbRound {
    readonly base: readonly AbSample[];
    readonly candidate: readonly AbSample[];
}
/** The verdict on one row: the geometric-mean ratio of candidate over base minimum and its 95 % interval. */
export interface AbRow {
    readonly key: string;
    readonly status: "ok" | "REGRESSION" | "new" | "removed" | "too few rounds";
    readonly ratio: number;
    readonly low: number;
    readonly high: number;
}
/** The lower-bound factor above which a row is a regression. */
export const DEFAULT_THRESHOLD: number;
/** Compares the rounds of a paired run, row by row. */
export function compareRounds(rounds: readonly AbRound[], options?: { readonly threshold?: number }): AbRow[];
