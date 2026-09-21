import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

describe("the element never transfers a snapshot", () => {
    it("src/ contains no transferables(), toWire() or toBytes() call", () => {
        // fileURLToPath, not import.meta.dirname: the workspace engines floor is node >=18.19.0
        // and import.meta.dirname only exists from 20.11, where it would be `undefined` and join
        // would throw. vitest.config.ts already uses this form.
        const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
        const offenders: string[] = [];
        // readdirSync's recursive option, not a glob package: `tinyglobby` is NOT a dependency or a
        // devDependency of @graphty/graphty-element and is not under graphty-element/node_modules --
        // it resolves only by hoisting from the workspace root (a transitive dep of vite), which is
        // precisely what knip's unlisted-dependency rule flags. Node 22 has recursive readdir.
        for (const entry of readdirSync(root, { recursive: true, encoding: "utf8" })) {
            if (!entry.endsWith(".ts")) {
                continue;
            }

            const text = readFileSync(join(root, entry), "utf8");
            if (/\.transferables\(|\.toWire\(|\.toBytes\(|\.toByteChunks\(/.test(text)) {
                offenders.push(entry);
            }
        }

        assert.deepStrictEqual(offenders, [], "DEP-M6-D: transferring a snapshot detaches the element's positions");
    });
});
