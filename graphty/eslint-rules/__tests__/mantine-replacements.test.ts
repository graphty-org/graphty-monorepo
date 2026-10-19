/**
 * The stock Mantine components compact-mantine replaces fail lint in the graphty app and in
 * compact-mantine, through the real configs (compact-mantine/eslint/mantine-replacements.js).
 *
 * Each probe is a story path that does not exist: stories are linted without type information,
 * so the configs lint the text without a TypeScript program.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const graphtyDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repoDir = resolve(graphtyDir, "..");

const MESSAGE = "Use CompactColorInput from @graphty/compact-mantine.";

/**
 * Lint one source text as a file of a package, with that package's own config.
 * @param cwd - The directory whose eslint.config.js applies.
 * @param file - The probe's path, relative to `cwd`.
 * @param code - The source text.
 * @returns The messages of the no-restricted-imports rule.
 */
async function restrictedImports(cwd: string, file: string, code: string): Promise<string[]> {
    const [result] = await new ESLint({ cwd }).lintText(code, { filePath: resolve(cwd, file) });
    return result.messages
        .filter((message) => message.ruleId === "@typescript-eslint/no-restricted-imports")
        .map((message) => message.message);
}

const PACKAGES = [
    ["the graphty app", graphtyDir, "src/stories/LintProbe.stories.tsx"],
    ["compact-mantine", repoDir, "compact-mantine/stories/LintProbe.stories.tsx"],
] as const;

describe.each(PACKAGES)("Mantine replacements in %s", (_name, cwd, file) => {
    it.each(["ColorInput", "ColorPicker"])("fails an import of %s from @mantine/core", async (component) => {
        const messages = await restrictedImports(cwd, file, `import { ${component} } from "@mantine/core";\n`);

        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain(MESSAGE);
    });

    it("allows the rest of @mantine/core", async () => {
        const messages = await restrictedImports(cwd, file, 'import { TextInput } from "@mantine/core";\n');

        expect(messages).toEqual([]);
    });
});
