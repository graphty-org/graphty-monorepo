import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

/*
 * The API report does not warn about a type the session entry uses but does not export (its
 * extractor messages are off), so a consumer would meet a name in a signature that it cannot
 * import. This pins the sources group: every Source* type a parameter or property is typed with
 * is declared in the report, so it is exported from @graphty/graphty-element/session.
 */
describe("the session API report", () => {
    it("declares every Source* type a parameter or property is typed with", () => {
        const report = readFileSync(new URL("../../api/session.api.md", import.meta.url), "utf8");
        const named = new Set([...report.matchAll(/\w\??: (?:readonly )?(Source[A-Z]\w*)/g)].map((m) => m[1]));
        const declared = new Set(
            [
                ...report.matchAll(/^export (?:interface|type|class|const|function) (Source[A-Z]\w*)/gm),
                ...report.matchAll(/^export \{ (Source[A-Z]\w*) \}/gm),
                ...report.matchAll(/^import \{ (Source[A-Z]\w*) \}/gm),
            ].map((m) => m[1]),
        );
        assert.deepStrictEqual(
            [...named].filter((name) => !declared.has(name)),
            [],
        );
    });
});
