import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";

import { writeDeclarationShims } from "./build-bundle.mjs";

describe("writeDeclarationShims", () => {
    const root = mkdtempSync(path.join(tmpdir(), "build-bundle-"));
    after(() => rmSync(root, { recursive: true, force: true }));
    for (const declaration of ["dist/src/index.d.ts", "dist/src/datasets/karate/index.d.ts"]) {
        mkdirSync(path.dirname(path.join(root, declaration)), { recursive: true });
        writeFileSync(path.join(root, declaration), "export {};\n");
    }
    const read = (name) => readFileSync(path.join(root, "dist", name), "utf8");

    it("re-exports each entry from its own directory and writes the extra shims as given", () => {
        writeDeclarationShims({
            packageRoot: root,
            entries: { pkg: "src/index.ts", "datasets/karate": "src/datasets/karate/index.ts" },
            extraShims: { acquire: 'export { a } from "./src/index.js";\n' },
        });
        assert.equal(read("pkg.d.ts"), 'export * from "./src/index.js";\n');
        assert.equal(read("datasets/karate.d.ts"), 'export * from "../src/datasets/karate/index.js";\n');
        assert.equal(read("acquire.d.ts"), 'export { a } from "./src/index.js";\n');
    });

    it("throws when tsc has not written the entry's declarations", () => {
        assert.throws(
            () => writeDeclarationShims({ packageRoot: root, entries: { missing: "src/missing.ts" } }),
            /src\/missing\.d\.ts not found under dist\//,
        );
    });
});
