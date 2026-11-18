/**
 * Which LLM regression cases a run executes: a rotating slice of them, plus named extras, or all.
 * @module test/helpers/llm-regression-rotation
 *
 * Each case belongs to one of `slices` slices by a hash of its full name (`<file> > <suite> > <test>`, vitest's
 * `task.fullName`), so its slice never changes while its name does not. The release job runs one slice a run and
 * moves to the next slice the run after (tools/llm-rotation.mjs), so every case runs at least once every `slices`
 * runs at about 1/slices of the cost. A random sample was not used: a seeded random pick leaves some cases unrun
 * for many runs in a row, a fixed rotation never does.
 *
 * `LLM_REGRESSION_SELECTION` names a JSON file `{ full, slice, slices, also }` (tools/llm-rotation.mjs plan). With
 * no such variable every case runs, as a run by hand or a bisect point does.
 */

import { readFileSync } from "node:fs";

/** What a run executes. */
export interface LlmRegressionSelection {
    /** Every case. */
    full: boolean;
    /** The slice this run executes, from 0. */
    slice: number;
    /** How many slices the cases are split into. */
    slices: number;
    /** Full names of cases run whatever their slice (a case that failed last time it ran). */
    also: string[];
}

/**
 * The slice a case belongs to: FNV-1a over its full name, modulo the slice count.
 * @param name - The case's full name
 * @param slices - How many slices
 * @returns 0 to slices - 1
 */
export function sliceOf(name: string, slices: number): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < name.length; i++) {
        hash = Math.imul(hash ^ name.charCodeAt(i), 0x01000193) >>> 0;
    }

    return hash % slices;
}

/**
 * Whether a run with this selection executes the case.
 * @param name - The case's full name
 * @param selection - The run's selection, or undefined for every case
 * @returns True to run it
 */
export function isSelected(name: string, selection: LlmRegressionSelection | undefined): boolean {
    if (!selection || selection.full) {
        return true;
    }

    return sliceOf(name, selection.slices) === selection.slice || selection.also.includes(name);
}

/**
 * The selection the LLM_REGRESSION_SELECTION file holds.
 * @returns It, or undefined when the variable is unset (every case runs)
 */
export function readSelection(): LlmRegressionSelection | undefined {
    const file = process.env.LLM_REGRESSION_SELECTION;
    return file ? (JSON.parse(readFileSync(file, "utf8")) as LlmRegressionSelection) : undefined;
}
