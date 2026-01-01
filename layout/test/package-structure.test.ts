import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
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
});
