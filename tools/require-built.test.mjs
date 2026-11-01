import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { escapes } from "./require-built.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function write(file, content) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content));
}

describe("require-built", () => {
    it("reports a package name that falls through to an outer node_modules, and passes once the build is here", () => {
        // outer/ plays the main checkout (holding an old build), outer/inner/ an unbuilt worktree inside it
        const outer = mkdtempSync(path.join(tmpdir(), "require-built-"));
        try {
            const pkg = { name: "@x/p", exports: { ".": { types: "./dist/index.d.ts" } } };
            write(path.join(outer, "node_modules/@x/p/package.json"), { ...pkg, types: "./index.d.ts" });
            write(path.join(outer, "node_modules/@x/p/index.d.ts"), "export declare const old: 1;\n");
            const inner = path.join(outer, "inner");
            write(path.join(inner, "package.json"), pkg);
            const config = path.join(inner, "tsconfig.json");
            write(config, { compilerOptions: { paths: { "@x/p": ["./dist/index.d.ts"] } } });

            const found = escapes(config, inner);
            assert.equal(found.length, 1);
            assert.equal(found[0].name, "@x/p");
            assert.equal(found[0].resolved, path.join(outer, "node_modules/@x/p/index.d.ts"));

            write(path.join(inner, "dist/index.d.ts"), "export declare const fresh: 1;\n");
            assert.deepEqual(escapes(config, inner), []);
        } finally {
            rmSync(outer, { recursive: true, force: true });
        }
    });

    it("graphty-element's lint tsconfig resolves every entry point to this checkout's sources, built or not (#5296)", () => {
        const found = escapes(path.join(ROOT, "graphty-element/tsconfig.json"));
        assert.deepEqual(found, []);
    });

    it("every package script that compiles a consumer tsconfig runs the guard on it first", () => {
        const missing = [];
        for (const dir of readdirSync(ROOT, { withFileTypes: true })) {
            let scripts;
            try {
                scripts = JSON.parse(readFileSync(path.join(ROOT, dir.name, "package.json"), "utf8")).scripts ?? {};
            } catch {
                continue;
            }
            for (const [script, command] of Object.entries(scripts)) {
                for (const [, config] of command.matchAll(/tsc -p (\S*(?:consumer|no-jsx-opt-in)\S*\.json)/g)) {
                    const guard = command.match(/require-built\.mjs([^&]*)&&/)?.[1] ?? "";
                    if (!guard.split(/\s+/).includes(config)) {
                        missing.push(`${dir.name} ${script}: ${config}`);
                    }
                }
            }
        }
        assert.deepEqual(missing, []);
    });
});
