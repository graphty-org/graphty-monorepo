// scripts/bench-groups.d.ts (the .js implements exactly this)
/** src files (package-relative) a change to which selects every benchmark group. */
export const AFFECTS_EVERY_GROUP: readonly string[];
/** The groups benchmarks/run.ts declares, in run order, with the bench file of each (package-relative). */
export function declaredGroups(read?: (path: string) => string): { name: string; benchFile: string }[];
/** Kernel id -> the absolute WGSL module files its registry entry imports. */
export function kernelModules(): Map<string, string[]>;
/** Group name -> the package-relative src files its benchmark reaches. */
export function groupFileSets(): Map<string, Set<string>>;
/** Every file under src/, package-relative. */
export function srcFiles(): string[];
/** The groups a change (repository-relative paths) selects, in run order, and one reason per changed src file. */
export function selectGroups(
    changed: readonly string[],
    sets?: Map<string, Set<string>>,
): { groups: string[]; reasons: string[] };
/** Seconds one pass of each group takes on the T4 (measured). */
export const PASS_SECONDS: Readonly<Record<string, number>>;
export const PAIRED_PASSES: number;
export const BASE_BUILD_MINUTES: number;
export const PAIRED_MARGIN: number;
export const PAIRED_TIMEOUT_CAP: number;
/** The paired benchmark step's timeout in minutes for the selected groups (or ["all"]). */
export function pairedTimeoutMinutes(groups: readonly string[]): number;
