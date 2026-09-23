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
