/**
 * The no-special-layers rule: what gives away code that branches on which style layer it holds, and
 * that the baseline excuses exactly the occurrences it counts.
 */

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import { createRule } from "../no-special-layers.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
});

const empty = createRule(() => []);

/** The one error each invalid case gives. */
const special = [{ messageId: "special" }];

describe("no-special-layers", () => {
    tester.run("finds a branch on a layer's identity", empty, {
        valid: [
            // A name written, not compared: a layer may be called anything.
            'const spec = { name: "Everything" };',
            'const word = "Selected";',
            'if (tab === "Layers") {}',
            'if (mode === "base") {}',
            'if (source.by === "user") {}',
            'if (row.kind === "folder") {}',
            "const base = 2;",
            "const databaseRows = [];",
            "if (row.locked) {}",
            'import { isBaseRow } from "./rows";',
            '<Picker basePath="x" />;',
        ],
        invalid: [
            { code: 'if (row.name === "Everything") {}', errors: special },
            { code: 'if ("Hovered" !== layer.name) {}', errors: special },
            { code: 'const NAME = "Pinned"; if (row.name === NAME) {}', errors: special },
            { code: 'const NAME = "Pinned" as const; const a = (n: string) => n === NAME;', errors: special },
            { code: 'switch (row.name) { case "Selected": break; }', errors: special },
            { code: 'if (["Hovered", "x"].includes(row.name)) {}', errors: special },
            { code: 'if (names.includes("Everything")) {}', errors: special },
            { code: "const id = source.templateId;", errors: special },
            { code: "const id = source?.templateId;", errors: special },
            { code: 'const id = source["templateId"];', errors: special },
            { code: "const { templateId } = source;", errors: special },
            { code: 'const id = "graphty:starting-everything";', errors: special },
            { code: 'if (layer.kind === "base") {}', errors: special },
            { code: 'switch (layer.kind) { case "base": break; }', errors: special },
            { code: 'const spec = { kind: "base" };', errors: special },
            { code: 'if (layer.source.by === "element") {}', errors: special },
            { code: "isBaseRow(session, id);", errors: special },
            { code: "const id = startingEverything(session);", errors: special },
            { code: "rows.filter(isBaseRow);", errors: special },
            { code: "function isProtectedLayer() {}", errors: special },
            { code: "const a = { startingRows: true };", errors: special },
            { code: "const a = config.editableBase;", errors: special },
            { code: "<Picker base />;", errors: special },
            { code: "<Picker isBaseRow={true} />;", errors: special },
        ],
    });

    const file = "graphty/src/a.ts";
    const listed = createRule(() => [{ file: "graphty/src/a.ts", rule: "named", detail: "isBaseRow", count: 1 }]);
    tester.run("excuses exactly what the baseline counts", listed, {
        valid: [{ code: "isBaseRow();", filename: `${process.cwd()}/../${file}` }],
        invalid: [
            // One more than the count.
            { code: "isBaseRow(); isBaseRow();", filename: `${process.cwd()}/../${file}`, errors: special },
            // The same name in another file.
            { code: "isBaseRow();", filename: `${process.cwd()}/../graphty/src/b.ts`, errors: special },
            // Another name in the same file.
            { code: "startingEverything();", filename: `${process.cwd()}/../${file}`, errors: special },
        ],
    });
});
