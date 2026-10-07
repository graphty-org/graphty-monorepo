/**
 * The published typings, compiled the way a TypeScript application compiles them: test/consumer/consumer.ts against
 * dist/ with strict settings and skipLibCheck off, so an error in our declarations or in how they augment
 * Cytoscape's fails here. CYTOSCAPE_DIR points the compile at another Cytoscape's typings (CI checks the oldest and
 * newest 3.x the peer range admits).
 *
 * Builds against dist/, so the package must be built first (the pre-push gate and CI do).
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const pkg = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);

describe("the published typings", () => {
    it("compile in a strict consumer with skipLibCheck off", () => {
        expect(existsSync(join(pkg, "dist/index.d.ts")), "build the package first (npm run build)").toBe(true);
        const cytoscapeDir = process.env.CYTOSCAPE_DIR ?? join(pkg, "node_modules/cytoscape");
        const dir = mkdtempSync(join(tmpdir(), "cytoscape-extensions-types-"));
        try {
            const config = join(dir, "tsconfig.json");
            writeFileSync(
                config,
                JSON.stringify({
                    extends: join(pkg, "test/consumer/tsconfig.json"),
                    compilerOptions: { paths: { cytoscape: [join(cytoscapeDir, "index.d.ts")] } },
                    files: [join(pkg, "test/consumer/consumer.ts")],
                }),
            );
            const tsc = require.resolve("typescript/bin/tsc");
            let output = "";
            try {
                execFileSync(process.execPath, [tsc, "-p", config], { encoding: "utf8", stdio: "pipe" });
            } catch (e) {
                const err = e as { stdout?: string; stderr?: string };
                output = `${err.stdout ?? ""}${err.stderr ?? ""}` || String(e);
            }
            expect(output).toBe("");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }, 120_000);
});
