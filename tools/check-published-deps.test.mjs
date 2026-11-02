// Tests of tools/check-published-deps.mjs: every rule `check` applies to an unpacked package, on fixture packages
// written to a temporary directory. Run: node tools/check-published-deps.test.mjs
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { check } from "./check-published-deps.mjs";

const TMP = mkdtempSync(join(tmpdir(), "check-published-deps-test-"));
after(() => rmSync(TMP, { recursive: true, force: true }));

let fixtures = 0;
/**
 * Write an unpacked package.
 * @param manifest - its package.json
 * @param files - path to content
 * @returns its directory
 */
function packed(manifest, files) {
    const dir = join(TMP, `pkg-${fixtures++}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify(manifest));
    for (const [file, text] of Object.entries(files)) {
        mkdirSync(dirname(join(dir, file)), { recursive: true });
        writeFileSync(join(dir, file), text);
    }
    return dir;
}

const NONE = new Map();

describe("check", () => {
    it("passes a package whose imports and declarations match", () => {
        const dir = packed(
            { name: "@fx/a", dependencies: { lodash: "^4.0.0" }, peerDependencies: { react: "^18.0.0" } },
            {
                "dist/index.js":
                    'import x from "lodash/fp";\nimport "node:fs";\nimport fs from "fs";\nimport y from "./y.js";\n',
                "dist/index.d.ts": 'export type { R } from "react";\nimport type { S } from "@fx/a/sub";\n',
            },
        );
        assert.deepEqual(check("a", dir, NONE), []);
    });

    it("flags shipped test and tool configuration", () => {
        const dir = packed(
            { name: "@fx/b" },
            {
                "vitest.config.js": "",
                "dist/vite.config.mjs": "",
                ".storybook/main.js": "",
                "dist/a.test.js": "",
                "dist/a.spec.tsx": "",
                "dist/a.test-d.ts": "",
                "tsconfig.tsbuildinfo": "",
                "dist/ok.js": "",
            },
        );
        assert.deepEqual(check("b", dir, NONE).sort(), [
            "ships .storybook/main.js, which is test or tool configuration",
            "ships dist/a.spec.tsx, which is test or tool configuration",
            "ships dist/a.test-d.ts, which is test or tool configuration",
            "ships dist/a.test.js, which is test or tool configuration",
            "ships dist/vite.config.mjs, which is test or tool configuration",
            "ships tsconfig.tsbuildinfo, which is test or tool configuration",
            "ships vitest.config.js, which is test or tool configuration",
        ]);
    });

    it("flags an undeclared import and an unused declaration, and reads every import form", () => {
        const dir = packed(
            {
                name: "@fx/c",
                dependencies: { used: "1.0.0", unused: "1.0.0", dyn: "1.0.0", req: "1.0.0", min: "1.0.0" },
                peerDependencies: { "unused-peer": "1.0.0", "@webgpu/types": "1.0.0" },
            },
            {
                "dist/a.js": [
                    'import { a } from "used";',
                    'export { b } from "missing";',
                    "const d = import(`dyn`);",
                    'const r = require("req");',
                    'x();import{q}from"min";',
                    '    import { z } from "indented-is-a-string";',
                    "const t = import(`tmpl/${x}`);",
                    'import u from "https://example.com/u.js";',
                    'import bad from "Bad_Name";',
                ].join("\n"),
                "dist/a.d.ts": '/// <reference types="@webgpu/types" />\n',
                "src/a.ts": 'import s from "only-in-src";\n',
                "dist/readme.md": 'import m from "not-code";\n',
            },
        );
        assert.deepEqual(check("c", dir, NONE).sort(), [
            'declares dependency "unused", which no shipped file imports',
            'declares peer dependency "unused-peer", which no shipped file imports',
            'dist/a.js imports "missing", which is neither a dependency nor a peer dependency',
        ]);
    });

    it("lets a .d.ts import be satisfied by its @types package, scoped or not", () => {
        const dir = packed(
            { name: "@fx/d", dependencies: { "@types/react": "1", "@types/scope__pkg": "1" } },
            {
                "dist/a.d.ts": 'import type { R } from "react";\nimport type { P } from "@scope/pkg/sub";\n',
                "dist/a.js": 'import r from "react";\n',
            },
        );
        assert.deepEqual(check("d", dir, NONE), [
            'dist/a.js imports "react", which is neither a dependency nor a peer dependency',
        ]);
    });

    it("flags a name in both dependencies and peers, except graph-format", () => {
        const dir = packed(
            {
                name: "@fx/e",
                dependencies: { both: "1", "@graphty/graph-format": "^1.0.0" },
                peerDependencies: { both: "1", "@graphty/graph-format": "^1.0.0" },
            },
            { "dist/a.js": 'import "both";\nimport "@graphty/graph-format";\n' },
        );
        assert.deepEqual(check("e", dir, NONE), ['declares "both" as both a dependency and a peer dependency']);
    });

    it("flags a range the workspace version does not satisfy, in either section", () => {
        const dir = packed(
            {
                name: "@fx/f",
                dependencies: { "@graphty/a": "^1.0.0", "@graphty/b": "^2.0.0", outside: "^1.0.0" },
                peerDependencies: { "@graphty/c": "^1.0.0" },
            },
            { "dist/a.js": 'import "@graphty/a";\nimport "@graphty/b";\nimport "@graphty/c";\nimport "outside";\n' },
        );
        const versions = new Map([
            ["@graphty/a", "1.4.0"],
            ["@graphty/b", "3.0.0"],
            ["@graphty/c", "2.0.0"],
        ]);
        assert.deepEqual(check("f", dir, versions), [
            'dependencies "@graphty/b": "^2.0.0" does not accept the workspace version 3.0.0',
            'peerDependencies "@graphty/c": "^1.0.0" does not accept the workspace version 2.0.0',
        ]);
    });

    it("reports problems in rule order", () => {
        const dir = packed(
            { name: "@fx/g", dependencies: { gone: "1" } },
            {
                "vitest.config.js": "",
                "dist/a.js": 'import "zeta";\n',
            },
        );
        assert.deepEqual(check("g", dir, NONE), [
            "ships vitest.config.js, which is test or tool configuration",
            'dist/a.js imports "zeta", which is neither a dependency nor a peer dependency',
            'declares dependency "gone", which no shipped file imports',
        ]);
    });
});
