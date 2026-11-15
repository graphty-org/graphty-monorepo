import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { assert, describe, it } from "vitest";

/** The package.json fields these tests read. */
interface PackageJson {
    main: string;
    type: string;
    types: string;
    exports: Record<string, { import: string; types: string }>;
    files: string[];
}

/** The tsconfig.json fields these tests read. */
interface TsConfig {
    extends?: string;
    compilerOptions: { composite?: boolean; module?: string; target?: string; declaration?: boolean };
}

describe("Build Output Tests", () => {
    it("should have correct package.json configuration", () => {
        const packageJson = JSON.parse(readFileSync(resolve("./package.json"), "utf-8")) as PackageJson;

        // Check main entry point - now using the bundle
        // This fixes the npm package bug where dist/src/index.js had ES module import issues
        // and ForceAtlas2 returned NaN for Z coordinates in 3D mode
        assert.strictEqual(packageJson.main, "dist/layout.js");
        assert.strictEqual(packageJson.type, "module");
        assert.strictEqual(packageJson.types, "dist/layout.d.ts");

        // Check exports field - now using the bundle
        assert.isDefined(packageJson.exports);
        assert.isDefined(packageJson.exports["."]);
        assert.strictEqual(packageJson.exports["."].import, "./dist/layout.js");
        assert.strictEqual(packageJson.exports["."].types, "./dist/layout.d.ts");

        // Check files field
        assert.isDefined(packageJson.files);
        assert.include(packageJson.files, "dist/");
        assert.include(packageJson.files, "src/");
    });

    it("should have TypeScript configuration for ES modules", () => {
        const tsconfig = JSON.parse(readFileSync(resolve("./tsconfig.json"), "utf-8")) as TsConfig;

        // Check that tsconfig extends base or has required settings
        // With extends pattern, settings come from base config
        if (tsconfig.extends) {
            assert.include(tsconfig.extends, "tsconfig.base.json");
            // composite: true is required for project references
            assert.isTrue(tsconfig.compilerOptions.composite);
        } else {
            // Legacy: check module settings directly
            assert.strictEqual(tsconfig.compilerOptions.module, "ES2020");
            assert.strictEqual(tsconfig.compilerOptions.target, "ES2020");
            assert.isTrue(tsconfig.compilerOptions.declaration);
        }
    });

    const distExists = existsSync(resolve("./dist/src/index.js"));

    it.skipIf(!distExists)("should have built the main entry file", () => {
        assert.isTrue(existsSync(resolve("./dist/src/index.js")));
        assert.isTrue(existsSync(resolve("./dist/src/index.d.ts")));
    });

    it.skipIf(!distExists)("should have built the layout and simulation modules", () => {
        assert.isTrue(existsSync(resolve("./dist/src/indexed/index.js")));
        assert.isTrue(existsSync(resolve("./dist/src/simulation/index.js")));
    });

    const typesExist = existsSync(resolve("./dist/layout.d.ts"));

    it.skipIf(!typesExist)("declares everything the bundle's entry exports", () => {
        // the bundle is built from src/index.ts, so its declarations must be those of src/index and not a subset
        assert.include(readFileSync(resolve("./dist/layout.d.ts"), "utf-8"), 'export * from "./src/index.js";');
    });
});
