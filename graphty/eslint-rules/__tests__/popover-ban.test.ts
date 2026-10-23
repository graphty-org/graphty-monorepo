/**
 * The graphty app's lint bans Mantine's Popover (use compact-mantine's Popout) and
 * compact-mantine's bare ColorPickerPanel (use CompactColorInput), except in the files its
 * eslint.config.js lists with a reason. Read through the real config.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const graphtyDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// Only the import rule runs, and without type information: a probe at a real source path would
// otherwise build the type-aware program of the whole app (and of graphty-element's source it
// reads) for every lint, which took over a minute on a CI runner.
const IMPORTS_ONLY = {
    ruleFilter: ({ ruleId }: { ruleId: string }) => ruleId === "@typescript-eslint/no-restricted-imports",
    overrideConfig: { languageOptions: { parserOptions: { project: false, projectService: false } } },
};

/**
 * Lint one source text as a file of the app.
 * @param file - The file's path, relative to the app.
 * @param code - The source text.
 * @returns The messages of the no-restricted-imports rule.
 */
async function restrictedImports(file: string, code: string): Promise<string[]> {
    const [result] = await new ESLint({ cwd: graphtyDir, ...IMPORTS_ONLY }).lintText(code, {
        filePath: resolve(graphtyDir, file),
    });
    return result.messages
        .filter((message) => message.ruleId === "@typescript-eslint/no-restricted-imports")
        .map((message) => message.message);
}

// A story path that does not exist: stories are linted without type information.
const PROBE = "src/workspace/LintProbe.stories.tsx";

describe("the app's Popover and ColorPickerPanel bans", () => {
    it("fails an import of Popover from @mantine/core", async () => {
        const messages = await restrictedImports(PROBE, 'import { Popover } from "@mantine/core";\n');

        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain("Use Popout");
    });

    it("fails an import of ColorPickerPanel from @graphty/compact-mantine", async () => {
        const messages = await restrictedImports(
            "src/components/LintProbe.stories.tsx",
            'import { ColorPickerPanel } from "@graphty/compact-mantine";\n',
        );

        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain("Use CompactColorInput");
    });

    it("allows Popover in a listed toolbar dropdown, and keeps the other bans there", async () => {
        const messages = await restrictedImports(
            "src/workspace/toolbar/WorkspaceToolbar.tsx",
            'import { ColorInput, Popover } from "@mantine/core";\nexport const used = [ColorInput, Popover];\n',
        );

        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain("Use CompactColorInput");
    });
});
