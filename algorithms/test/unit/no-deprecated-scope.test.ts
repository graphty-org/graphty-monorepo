/**
 * The workspace eslint config turns `@typescript-eslint/no-deprecated` off only for the legacy code
 * that algorithms 3.0.0 deletes. Code that outlives it, such as `utils/math-utilities.ts` (which the
 * `indexed` code imports) and the `indexed` code itself, keeps the rule at error.
 */
import { join } from "node:path";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../../..");

async function ruleFor(file: string): Promise<unknown> {
    const config = (await new ESLint({ cwd: root }).calculateConfigForFile(join(root, file))) as {
        rules?: Record<string, unknown>;
    };
    const setting = config.rules?.["@typescript-eslint/no-deprecated"];
    return Array.isArray(setting) ? setting[0] : setting;
}

describe("no-deprecated exemption", () => {
    it("is off in the legacy code 3.0.0 deletes", async () => {
        expect(await ruleFor("algorithms/src/utils/graph-converters.ts")).toBe(0);
        expect(await ruleFor("algorithms/src/core/graph.ts")).toBe(0);
    });

    it("stays an error in code that outlives 3.0.0", async () => {
        expect(await ruleFor("algorithms/src/utils/math-utilities.ts")).toBe(2);
        expect(await ruleFor("algorithms/src/utils/priorityQueue.ts")).toBe(2);
        expect(await ruleFor("algorithms/src/indexed/pagerank.ts")).toBe(2);
    });
});
