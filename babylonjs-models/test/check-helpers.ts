/**
 * What the check tests share: a variant fixture's bytes, a set's summary, and the fact a set is
 * refused with.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert } from "vitest";

import { checkModelFiles, DEFAULT_MODEL_LIMITS, type ModelLimits } from "../src/files/index.js";
import { ModelError } from "../src/files/references.js";

const VARIANTS = join(dirname(fileURLToPath(import.meta.url)), "fixtures/variants");

/**
 * A variant's file.
 * @param id - The variant.
 * @param name - The file.
 * @returns Its bytes.
 */
export function fixture(id: string, name: string): Uint8Array {
    return new Uint8Array(readFileSync(join(VARIANTS, id, name)));
}

/**
 * Check a set.
 * @param files - The set.
 * @param limits - Limits to change.
 * @param main - The main file, when the set does not tell.
 * @returns The summary.
 */
export async function summaryOf(files: Map<string, Uint8Array>, limits: Partial<ModelLimits> = {}, main?: string) {
    const options = main === undefined ? {} : { main };
    return (await checkModelFiles(files, options, { ...DEFAULT_MODEL_LIMITS, ...limits })).summary;
}

/**
 * What checking a set threw.
 * @param files - The set.
 * @param limits - Limits to change.
 * @param main - The main file, when the set does not tell.
 * @returns The first fact.
 */
export async function refusalOf(files: Map<string, Uint8Array>, limits: Partial<ModelLimits> = {}, main?: string) {
    const error = await summaryOf(files, limits, main).then(
        () => assert.fail("the set was accepted"),
        (e: unknown) => e,
    );
    assert.instanceOf(error, ModelError);
    return error.fact;
}
