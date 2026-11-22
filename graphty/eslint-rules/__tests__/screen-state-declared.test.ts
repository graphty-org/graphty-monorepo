/**
 * The screen-state-declared rule: every piece of component state says what a reload does to it, and
 * graphty/src holds no undeclared state beyond the names screen-state-baseline.json excuses, with
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

/**
 * The most `// on reload: gap #N` declarations graphty/src may hold: state the reader made that a
 * reload drops, each tracked by its issue. Only lower it.
 */
const MAX_COMPONENT_GAPS = 8;

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
            "// on reload: fresh: read: the browser's width\nconst width = useSyncExternalStore(on, read);",
            '<input\n    // on reload: gap #9702: typed text\n    defaultValue="a"\n/>',
            "<input value={text} />",
        ],
        invalid: [
            { code: "const [open, setOpen] = useState(false);", errors: [{ messageId: "undeclared" }] },
            { code: "const [s, d] = React.useReducer(reduce, 0);", errors: [{ messageId: "undeclared" }] },
            {
                code: 'import { useState as useLocal } from "react";\nconst [note, setNote] = useLocal("");',
                errors: [{ messageId: "undeclared", data: { hook: "useState", name: "note" } }],
            },
            { code: "const width = useSyncExternalStore(on, read);", errors: [{ messageId: "undeclared" }] },
            { code: '<TextInput defaultValue="a" />', errors: [{ messageId: "undeclared" }] },
            { code: "const [opened, handlers] = useDisclosure(false);", errors: [{ messageId: "undeclared" }] },
            {
                code: 'class Old extends Component {\n    state = { draft: "" };\n}',
                errors: [{ messageId: "undeclared", data: { hook: "class state", name: "state" } }],
            },
            { code: '<input type="checkbox" defaultChecked />', errors: [{ messageId: "undeclared" }] },
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
        "excuses the state a file's baseline names, wherever it is, and no other",
        createRule(
            () => ({ "file.tsx": ["a"] }),
            () => KINDS,
        ),
        {
            valid: [
                { code: "const [a] = useState(0);", filename: `${ROOT}file.tsx` },
                {
                    code: "const [b] = useState(1);",
                    filename: `${ROOT}file.tsx`,
                    options: [{ baseline: { "file.tsx": ["b"] } }],
                },
            ],
            invalid: [
                {
                    code: "const [b] = useState(1);\nconst [a] = useState(0);",
                    filename: `${ROOT}file.tsx`,
                    errors: [{ messageId: "undeclared", line: 1 }],
                },
                {
                    // The old one removed and a new one added: the count is the same, the name is not.
                    code: "const [draft] = useState(1);",
                    filename: `${ROOT}file.tsx`,
                    errors: [{ messageId: "undeclared", data: { hook: "useState", name: "draft" } }],
                },
                {
                    code: "const [a] = useState(0);\nconst [a2] = useState(0);",
                    filename: `${ROOT}file.tsx`,
                    options: [{ baseline: {} }],
                    errors: [{ messageId: "undeclared" }, { messageId: "undeclared" }],
                },
            ],
        },
    );

    it("finds no undeclared state in graphty/src beyond the baseline, no stale baseline name, and no new gap", async () => {
        const heard: Record<string, string[]> = {};
        const counted = createRule(
            () => ({}),
            () => Object.keys(JSON.parse(readFileSync(`${ROOT}src/workspace/state/fresh-kinds.json`, "utf8"))),
            (file, name) => {
                (heard[file] ??= []).push(name);
            },
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
        const refused: string[] = [];
        let gaps = 0;
        for (const result of results) {
            const file = relative(ROOT, result.filePath).replaceAll("\\", "/");
            gaps += (readFileSync(result.filePath, "utf8").match(/on reload:\s*gap #\d+/g) ?? []).length;
            for (const message of result.messages) {
                if (message.ruleId !== "local/screen-state-declared" || message.messageId !== "undeclared") {
                    refused.push(`${file}:${String(message.line)} ${message.message}`);
                }
            }
        }
        const baseline = (
            JSON.parse(readFileSync(`${ROOT}screen-state-baseline.json`, "utf8")) as {
                files: Record<string, string[]>;
            }
        ).files;
        assert.deepStrictEqual(refused, []);
        // Each heard name takes one of its file's baseline names; what is left over either way is wrong.
        const over: string[] = [];
        const stale: string[] = [];
        for (const file of new Set([...Object.keys(heard), ...Object.keys(baseline)])) {
            const left = [...(baseline[file] ?? [])];
            for (const name of heard[file] ?? []) {
                const at = left.indexOf(name);
                if (at === -1) {
                    over.push(`${file}: ${name}`);
                } else {
                    left.splice(at, 1);
                }
            }
            stale.push(...left.map((name) => `${file}: ${name}`));
        }
        assert.deepStrictEqual(over, [], "undeclared component state the baseline does not name: declare it");
        assert.deepStrictEqual(stale, [], "a baseline name is no longer undeclared in its file: remove it");
        assert.isAtMost(gaps, MAX_COMPONENT_GAPS, "a new gap #N declaration: keep the state instead");
        assert.strictEqual(gaps, MAX_COMPONENT_GAPS, "fewer gaps than MAX_COMPONENT_GAPS: lower it");
    });
});
