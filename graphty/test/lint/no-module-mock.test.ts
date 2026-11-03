/**
 * Every test file and story under src/ runs in a browser project, where a vi.mock switches the
 * page's HTTP cache off and slows every page beside it (issue #3416). eslint.config.js bans it with
 * no-restricted-syntax; this runs the real config's rule over sample code, for each kind of file.
 */
import { fileURLToPath } from "node:url";

import { ESLint, Linter } from "eslint";
import tseslint from "typescript-eslint";
import { assert, describe, it } from "vitest";

const RULE_ID = "no-restricted-syntax";
const APP_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const eslint = new ESLint({ cwd: APP_ROOT });
const linter = new Linter();

/**
 * Whether the app's config reports the source as a module mock in the given file.
 * @param file - the file, relative to the app.
 * @param source - the code.
 * @returns whether the ban fired.
 */
async function banned(file: string, source: string): Promise<boolean> {
    const ruleConfig = (await eslint.calculateConfigForFile(file)).rules?.[RULE_ID];
    const config: Linter.Config[] = [
        { files: ["**/*.ts"], languageOptions: { parser: tseslint.parser }, rules: { [RULE_ID]: ruleConfig } },
    ];
    return linter.verify(source, config, "sample.ts").some((m) => m.ruleId === RULE_ID && /vi\.mock/.test(m.message));
}

describe("no module mocks in a browser project", () => {
    for (const file of [
        "src/components/FeedbackModal.test.tsx",
        "src/workspace/frame/__tests__/UndoHistory.real-element.test.tsx",
        "src/stories/FeedbackModal.stories.tsx",
    ]) {
        it(`bans vi.mock and vi.doMock in ${file}`, async () => {
            assert.isTrue(await banned(file, 'vi.mock("./sentry", () => ({}));'));
            assert.isTrue(await banned(file, 'vi.doMock("./sentry");'));
            assert.isFalse(await banned(file, "vi.fn();"));
        });
    }
});
