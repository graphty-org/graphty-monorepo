/**
 * The screen-state-declared rule: every useState and useReducer says what a reload does to it, and
 * graphty/src holds no undeclared call beyond the per-file counts in screen-state-baseline.json, with
 * inline comments off so an eslint-disable hides nothing (issue #9655).
 */

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint, RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { assert, describe, it } from "vitest";

import { createRule } from "../screen-state-declared.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const KINDS = ["request", "in flight", "notice", "read", "derived", "pointer"];

const tester = new RuleTester({
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
});

const none = createRule(
    () => ({}),
    () => KINDS,
);

describe("screen-state-declared", () => {
    tester.run("asks every piece of component state what a reload does to it", none, {
        valid: [
            "// on reload: fresh: pointer: a menu opened for a look\nconst [open, setOpen] = useState(false);",
            "// on reload: gap #9655: the step shown\nconst [step, setStep] = React.useState(null);",
            "/* on reload: fresh: in flight: a press */\nconst [state, dispatch] = useReducer(reduce, 0);",
            "// The menu.\n// on reload: fresh: request: cleared by its reader\nconst [x] = useState(0);",
            "const ref = useRef(null);",
            "const value = useMemo(() => 1, []);",
        ],
        invalid: [
            { code: "const [open, setOpen] = useState(false);", errors: [{ messageId: "undeclared" }] },
            { code: "const [s, d] = React.useReducer(reduce, 0);", errors: [{ messageId: "undeclared" }] },
            {
                code: "// on reload: fresh: the menu\nconst [open, setOpen] = useState(false);",
                errors: [{ messageId: "undeclared" }],
            },
            {
                code: "// on reload: kept\nconst [open, setOpen] = useState(false);",
                errors: [{ messageId: "kept" }],
            },
            {
                code: "// on reload: fresh: draft: an open editor\nconst [open, setOpen] = useState(false);",
                errors: [{ messageId: "kind" }],
            },
        ],
    });

    tester.run(
        "excuses the calls a file's baseline counts, in order, and no more",
        createRule(
            () => ({ "file.tsx": 1 }),
            () => KINDS,
        ),
        {
            valid: [{ code: "const [a] = useState(0);", filename: `${ROOT}file.tsx` }],
            invalid: [
                {
                    code: "const [a] = useState(0);\nconst [b] = useState(1);",
                    filename: `${ROOT}file.tsx`,
                    errors: [{ messageId: "undeclared", line: 2 }],
                },
            ],
        },
    );

    it("finds no undeclared state in graphty/src beyond the baseline, and no stale baseline count", async () => {
        const counted = createRule(
            () => ({}),
            () => Object.keys(JSON.parse(readFileSync(`${ROOT}src/workspace/state/fresh-kinds.json`, "utf8"))),
        );
        const eslint = new ESLint({
            cwd: ROOT,
            overrideConfigFile: true,
            allowInlineConfig: false,
            overrideConfig: [
                {
                    files: ["src/**/*.{ts,tsx}"],
                    ignores: [
                        "**/__tests__/**",
                        "**/__fixtures__/**",
                        "**/*.test.*",
                        "**/*.stories.*",
                        "**/stories/**",
                    ],
                    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
                    plugins: { local: { rules: { "screen-state-declared": counted } } },
                    rules: { "local/screen-state-declared": "error" },
                },
            ],
        });
        const results = await eslint.lintFiles(["src/**/*.{ts,tsx}"]);
        const found: Record<string, number> = {};
        const refused: string[] = [];
        for (const result of results) {
            const file = relative(ROOT, result.filePath).replaceAll("\\", "/");
            for (const message of result.messages) {
                if (message.ruleId === "local/screen-state-declared" && message.messageId === "undeclared") {
                    found[file] = (found[file] ?? 0) + 1;
                } else {
                    refused.push(`${file}:${String(message.line)} ${message.message}`);
                }
            }
        }
        const baseline = (
            JSON.parse(readFileSync(`${ROOT}screen-state-baseline.json`, "utf8")) as { files: Record<string, number> }
        ).files;
        assert.deepStrictEqual(refused, []);
        const over = Object.entries(found).filter(([file, count]) => count > (baseline[file] ?? 0));
        assert.deepStrictEqual(over, [], "undeclared useState or useReducer past the baseline: declare them");
        const stale = Object.entries(baseline).filter(([file, count]) => (found[file] ?? 0) < count);
        assert.deepStrictEqual(stale, [], "a baseline count is higher than the file's undeclared calls: lower it");
    });
});
