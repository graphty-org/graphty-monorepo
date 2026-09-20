import { assert, describe, expect, it } from "vitest";
import { existsSync } from "fs";
import { readFileSync } from "node:fs";
import { readFile } from "fs/promises";
import { join } from "path";

describe("Package Structure", () => {
    it("should have dist/layout.js as the main entry point", async () => {
        const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf-8"));

        expect(packageJson.main).toBe("dist/layout.js");
        expect(packageJson.exports["."].import).toBe("./dist/layout.js");
    });

    it("should have dist/layout.js file after build", () => {
        const layoutPath = join(process.cwd(), "dist/layout.js");
        const exists = existsSync(layoutPath);

        expect(exists).toBe(true);
    });

    it("should export all expected functions from bundle", async () => {
        // Dynamically import the bundle
        const bundle = await import("../dist/layout.js");

        // Check key exports exist
        const expectedExports = [
            "forceatlas2Layout",
            "springLayout",
            "kamadaKawaiLayout",
            "circularLayout",
            "randomLayout",
            "rescaleLayout",
            "completeGraph",
            "cycleGraph",
        ];

        for (const exportName of expectedExports) {
            expect(bundle[exportName]).toBeDefined();
            expect(typeof bundle[exportName]).toBe("function");
        }
    });

    it("exports the simulation seam (design 9.3)", async () => {
        const layout = await import("../dist/layout.js");
        for (const name of [
            "createSimulation",
            "ForceAtlas2Simulation",
            "FruchtermanReingoldSimulation",
            "seedPositions",
            "resolveNodeVector",
            "resolveWeights",
            "toLayoutSnapshot",
        ]) {
            assert.equal(typeof layout[name], "function", `${name} is exported`);
        }
    });

    it("leaves @graphty/graph-format external in the bundle", () => {
        // happy-dom's global URL resolves against http://localhost:3000/ and ignores a file:// base, so the
        // bundle is located from the package root the way the other cases in this file do.
        const bundle = readFileSync(join(process.cwd(), "dist/layout.js"), "utf8");
        assert.ok(
            /from\s+["']@graphty\/graph-format["']/.test(bundle),
            "the bundle imports @graphty/graph-format instead of inlining it",
        );
        assert.ok(!/class GraphBuilder\b/.test(bundle), "no graph-format source inlined");
    });
});
