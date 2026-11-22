import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";

import { stampPackageVersion } from "./stamp-package-version.mjs";

describe("stampPackageVersion", () => {
    const root = mkdtempSync(path.join(tmpdir(), "stamp-package-version-"));
    after(() => rmSync(root, { recursive: true, force: true }));

    it("writes the version over the placeholder, in tsc output and in a bundle", () => {
        const tsc = path.join(root, "version.js");
        const bundle = path.join(root, "bundle.js");
        writeFileSync(tsc, 'export const VERSION = "0.0.0";\n');
        writeFileSync(bundle, 'const other = "0.0.0";\nconst VERSION$1 = "0.0.0";\nexport { VERSION$1 as VERSION };\n');
        stampPackageVersion(tsc, "3.4.22");
        stampPackageVersion(bundle, "3.4.22");
        assert.equal(readFileSync(tsc, "utf8"), 'export const VERSION = "3.4.22";\n');
        assert.equal(
            readFileSync(bundle, "utf8"),
            'const other = "0.0.0";\nconst VERSION$1 = "3.4.22";\nexport { VERSION$1 as VERSION };\n',
        );
    });

    it("fails when the file holds no placeholder", () => {
        const file = path.join(root, "stamped.js");
        writeFileSync(file, 'export const VERSION = "1.0.0";\n');
        assert.throws(() => stampPackageVersion(file, "2.0.0"), /holds no VERSION/);
        assert.equal(readFileSync(file, "utf8"), 'export const VERSION = "1.0.0";\n');
    });
});
