// Tests of tools/check-packed-exports.mjs: the manifest rules on file lists, and a real `npm pack --dry-run`
// of a fixture package with and without its dist/. Run: node tools/check-packed-exports.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { entryTargets, missingFromPack, packedFiles } from "./check-packed-exports.mjs";

const script = fileURLToPath(new URL("check-packed-exports.mjs", import.meta.url));
const TMP = mkdtempSync(join(tmpdir(), "check-packed-exports-"));
after(() => rmSync(TMP, { recursive: true, force: true }));

const manifest = {
    name: "@fixture/pkg",
    version: "1.0.0",
    main: "dist/index.js",
    types: "./dist/index.d.ts",
    bin: { tool: "./bin/tool.mjs" },
    exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        "./sub/*": { import: "./dist/sub/*.js" },
        "./package.json": "./package.json",
        "./internal": null,
    },
    files: ["dist/", "!dist/*.tsbuildinfo", "bin/", "README.md"],
};
const full = ["package.json", "README.md", "bin/tool.mjs", "dist/index.js", "dist/index.d.ts", "dist/sub/a.js"];

describe("entryTargets", () => {
    it("names every main, types, bin and exports target, skipping null exports", () => {
        assert.deepEqual(
            entryTargets(manifest).map(([, t]) => t),
            [
                "dist/index.js",
                "./dist/index.d.ts",
                "./bin/tool.mjs",
                "./dist/index.d.ts",
                "./dist/index.js",
                "./dist/sub/*.js",
                "./package.json",
            ],
        );
    });
    it("reads a string bin and array exports", () => {
        assert.deepEqual(entryTargets({ bin: "cli.js", exports: ["./a.js", "./b.js"] }), [
            ["bin", "cli.js"],
            ["exports[0]", "./a.js"],
            ["exports[1]", "./b.js"],
        ]);
    });
});

describe("missingFromPack", () => {
    it("passes a pack that holds every target and files entry", () => {
        assert.deepEqual(missingFromPack(manifest, full), []);
    });
    it("names every target and files entry a pack without dist/ lacks", () => {
        const problems = missingFromPack(
            manifest,
            full.filter((f) => !f.startsWith("dist/")),
        );
        assert.deepEqual(problems, [
            "main points at dist/index.js, which is not in the pack",
            "types points at ./dist/index.d.ts, which is not in the pack",
            'exports["."]["types"] points at ./dist/index.d.ts, which is not in the pack',
            'exports["."]["import"] points at ./dist/index.js, which is not in the pack',
            'exports["./sub/*"]["import"] points at ./dist/sub/*.js, which is not in the pack',
            "files lists dist/, which matches nothing in the pack",
        ]);
    });
    it("needs a pattern export to match at least one file under its directory", () => {
        const problems = missingFromPack(
            manifest,
            full.filter((f) => f !== "dist/sub/a.js"),
        );
        assert.deepEqual(problems, [
            'exports["./sub/*"]["import"] points at ./dist/sub/*.js, which is not in the pack',
        ]);
    });
});

describe("a real npm pack of a fixture package", () => {
    const pkg = join(TMP, "pkg");
    mkdirSync(join(pkg, "bin"), { recursive: true });
    writeFileSync(join(pkg, "package.json"), JSON.stringify(manifest));
    writeFileSync(join(pkg, "README.md"), "fixture\n");
    writeFileSync(join(pkg, "bin/tool.mjs"), "\n");

    it("fails, naming the package, when dist/ was never built", () => {
        const r = spawnSync(process.execPath, [script, pkg], { encoding: "utf8" });
        assert.equal(r.status, 1, r.stdout + r.stderr);
        assert.match(r.stdout, /FAIL {2}@fixture\/pkg/);
        assert.match(r.stdout, /main points at dist\/index.js, which is not in the pack/);
    });

    it("passes once dist/ holds the build", () => {
        mkdirSync(join(pkg, "dist/sub"), { recursive: true });
        for (const f of ["dist/index.js", "dist/index.d.ts", "dist/sub/a.js"]) writeFileSync(join(pkg, f), "\n");
        assert.ok(packedFiles(pkg).includes("dist/index.js"));
        const r = spawnSync(process.execPath, [script, pkg], { encoding: "utf8" });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.match(r.stdout, /ok {4}@fixture\/pkg/);
    });
});
