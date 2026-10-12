// scripts/run-node-shard.d.ts (the .js implements exactly this)
/** The test files one vitest run started and reported on, and the difference a dead worker swallowed. */
export interface TestFileSets {
    readonly started: string[];
    readonly reported: string[];
    readonly missing: string[];
}
/**
 * The test files a vitest run started but never reported a result for, read out of the run's own output: a file is
 * started once the reporter names it (above output it wrote, or on a result line) and reported once a result line
 * names it. Equal sets mean nothing was swallowed.
 */
export function missingTestFiles(output: string): TestFileSets;
/** The greppable [missing-files] block: the counts, then one line per file that never reported. */
export function formatMissingFiles(sets: TestFileSets): string;
/** Every node process on the machine, with the kernel wait channel that says what it is blocked on. */
export function processTable(): string;
/** The process ids of a process and of every descendant of it, root first. */
export function descendants(root: number): number[];
/** A short digest of one Node diagnostic report: the main thread's stack and the handles holding the loop open. */
export function digestReport(file: string): string;
/** What one run did, as the verdict reads it. */
export interface ShardRun {
    readonly status: number;
    readonly signalled: number;
    /** Whether the hang watcher killed the run for staying silent after its last snapshot. */
    readonly killed?: boolean;
    readonly silenceMs: number;
    readonly output: string;
    readonly outputFile?: string;
    readonly outputWritten?: boolean;
}
/**
 * The wrapper's exit code and cause: a run the hang watcher killed fails as hung; a non-zero vitest exit passes
 * through; an exit of 0 fails when the output holds no vitest summary or the named --outputFile was not written. A
 * run that was only snapshotted while silent and then finished passes.
 */
export function verdict(run: ShardRun): { exitCode: number; cause: string };
/**
 * Runs vitest (or `options.command`) with `argv` and returns the exit code; `silenceMs` sets the hang threshold and
 * `reportDir` where the diagnostic reports go.
 */
export function main(
    argv: readonly string[],
    options?: { command?: readonly string[]; silenceMs?: number; reportDir?: string },
): Promise<number>;
