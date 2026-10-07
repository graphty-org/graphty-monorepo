/**
 * The workspace draws its icons from src/workspace/glyphs.ts alone: an import of lucide-react
 * anywhere else under src/workspace fails lint, through the app's real config.
 *
 * The probes are story paths that do not exist: stories are linted without type information.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const graphtyDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const RULE = "@typescript-eslint/no-restricted-imports";

/**
 * Lint one source text as a file of the app.
 * @param file - The probe's path, relative to the app.
 * @param code - The source text.
 * @returns The messages of the no-restricted-imports rule.
 */
async function restrictedImports(file: string, code: string): Promise<string[]> {
    const [result] = await new ESLint({ cwd: graphtyDir }).lintText(code, { filePath: resolve(graphtyDir, file) });
    return result.messages.filter((message) => message.ruleId === RULE).map((message) => message.message);
}

const LUCIDE = 'import { Move } from "lucide-react";\n';

describe("workspace glyphs", () => {
    it("fails an import of lucide-react in a workspace file", async () => {
        const messages = await restrictedImports("src/workspace/toolbar/LintProbe.stories.tsx", LUCIDE);

        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain("glyphs.ts");
    });

    it("still fails the stock Mantine components compact-mantine replaces in a workspace file", async () => {
        const messages = await restrictedImports(
            "src/workspace/toolbar/LintProbe.stories.tsx",
            'import { ColorInput } from "@mantine/core";\n',
        );

        expect(messages).toHaveLength(1);
    });

    it("allows lucide-react in glyphs.ts", async () => {
        const [result] = await new ESLint({ cwd: graphtyDir }).lintFiles(["src/workspace/glyphs.ts"]);

        expect(result.messages.filter((message) => message.ruleId === RULE)).toEqual([]);
    });

    it("allows lucide-react outside the workspace", async () => {
        expect(await restrictedImports("src/stories/LintProbe.stories.tsx", LUCIDE)).toEqual([]);
    });
});
