// Tests of the no-source-program lint rule: passing and failing samples of each check.
//
//   node tools/eslint-rules/no-source-program.test.mjs
import { describe, it } from "node:test";

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";

import rule from "./no-source-program.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
    languageOptions: { parser: tseslint.parser, ecmaVersion: 2024, sourceType: "module" },
});
const tool = { messageId: "tool" };
const programImport = { messageId: "programImport" };
const origin = { messageId: "origin" };
const filePrefix = { messageId: "filePrefix" };

tester.run("no-source-program", rule, {
    valid: [
        // Neutral facts graph-io hands over, and other things called source or tool.
        "const units = extracted.styles.lengths.units;",
        "const { format } = extracted.styles.source;",
        "const name = rule.name; const kind = edge.source;",
        "const { tool, action, args } = request;",
        "if (call.tool === 'web-search') run();",
        "const t = source.tools; const u = sources.tool;",
        // toolDefaults as an option passed through to graph-io, and other graph-io imports.
        "extractStyles(importer, snapshot, report, { toolDefaults: options.toolDefaults });",
        "import { extractStyles, type ExtractedStyles } from '@graphty/graph-io/styles';",
        "import { toolDefaults } from './local';",
        "type R = import('@graphty/graph-io/styles').ExtractedStyles;",
        // Other names, and strings that only contain file:.
        "const words = fileStyleNotesWords; import { fileStyleNotesWords as w } from './fileStyleWords';",
        "const text = 'a file: b'; const url = `blob:${id}`;",
        { code: "if (id.startsWith('file:')) migrate();", options: [{ filePrefix: false }] },
    ],
    invalid: [
        { code: "const program = extracted.styles.source.tool;", errors: [tool] },
        { code: "const program = extracted.styles.source?.tool;", errors: [tool] },
        { code: "if (source.tool === 'yed') bump();", errors: [tool] },
        { code: "const program = styles.source['tool'];", errors: [tool] },
        { code: "const { tool } = extracted.styles.source;", errors: [tool] },
        { code: "const { tool: program, format } = styles.source;", errors: [tool] },
        { code: "const { source: { tool } } = extracted.styles;", errors: [tool] },
        { code: "function f({ tool } = styles.source) { return tool; }", errors: [tool] },
        { code: "import { toolDefaults } from '@graphty/graph-io/styles';", errors: [programImport] },
        { code: "import { type StyleTool, extractStyles } from '@graphty/graph-io/styles';", errors: [programImport] },
        { code: "import type { ToolArrowhead } from '@graphty/graph-io';", errors: [programImport] },
        { code: "import { toolDefaults as defaults } from '@graphty/graph-io/styles';", errors: [programImport] },
        { code: "export { toolDefaults } from '@graphty/graph-io/styles';", errors: [programImport] },
        { code: "type T = import('@graphty/graph-io/styles').StyleTool;", errors: [programImport] },
        { code: "const origin = fileStyleOf(layer);", errors: [origin] },
        { code: "let o: FileStyleOrigin;", errors: [origin] },
        { code: "const words = fileStyleWords.role;", errors: [origin] },
        { code: "const template = `file:${importId}`;", errors: [filePrefix] },
        { code: "const template = 'file:' + importId;", errors: [filePrefix] },
        { code: "if (id.startsWith('file:')) sweep();", errors: [filePrefix] },
    ],
});
