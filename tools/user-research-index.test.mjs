// Every research document in design/user-research/ is listed in section 2 of
// population-to-designloom-persona-index.md, and the table names no file that is gone.
//
//   node --test tools/user-research-index.test.mjs
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { it } from "node:test";

const DIR = new URL("../design/user-research/", import.meta.url);
const INDEX = "population-to-designloom-persona-index.md";

it("the persona index lists every user research document", () => {
    const docs = readdirSync(DIR).filter((f) => f.endsWith(".md") && f !== INDEX && f !== "README.md");
    const section2 = readFileSync(new URL(INDEX, DIR), "utf8")
        .split(/^## 2\./m)[1]
        .split(/^## 3\./m)[0];
    const listed = [...section2.matchAll(/^\| ([a-z0-9-]+\.md) +\|/gm)].map((m) => m[1]);
    assert.deepEqual(
        { missing: docs.filter((f) => !listed.includes(f)), stale: listed.filter((f) => !docs.includes(f)) },
        { missing: [], stale: [] },
    );
});
