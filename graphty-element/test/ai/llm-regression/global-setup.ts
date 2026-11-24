/**
 * @file Global setup for the "llm-regression" vitest project: the directory every test file's Gemini transport
 * shares its prompt caches in (test/helpers/llm-regression-gemini.ts), so a prefix is cached once per run rather
 * than once per file, and the caches' deletion when the run ends.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { TestProject } from "vitest/node";

import { deleteCaches } from "../../helpers/llm-regression-gemini";

declare module "vitest" {
    export interface ProvidedContext {
        /** The run's shared Gemini cache directory. */
        llmRegressionCacheDir: string;
    }
}

/**
 * Make the run's cache directory.
 * @param project - The llm-regression project.
 * @returns The teardown, which deletes the run's caches and the directory.
 */
export default function setup(project: TestProject): () => Promise<void> {
    const dir = mkdtempSync(join(tmpdir(), "llm-regression-caches-"));
    project.provide("llmRegressionCacheDir", dir);
    return async () => {
        const apiKey = project.config.env.GOOGLE_API_KEY ?? process.env.GOOGLE_API_KEY;
        if (apiKey) {
            await deleteCaches(dir, apiKey, globalThis.fetch);
        }

        rmSync(dir, { recursive: true, force: true });
    };
}
