import { readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { assert, describe, it } from "vitest";

// The PositionMap rescale utilities are deprecated: an editor and `@typescript-eslint/no-deprecated` show a caller
// the replacement only when the tag is on the declaration itself.
const file = join(__dirname, "../src/utils/rescale.ts");
const source = ts.createSourceFile(file, readFileSync(file, "utf-8"), ts.ScriptTarget.Latest, true);

function deprecationOf(name: string): string {
    const decl = source.statements.find(
        (stmt): stmt is ts.FunctionDeclaration => ts.isFunctionDeclaration(stmt) && stmt.name?.text === name,
    );
    assert.isDefined(decl, `${name} is not declared in utils/rescale.ts`);
    const tag = ts.getJSDocDeprecatedTag(decl);
    assert.isDefined(tag, `${name} has no @deprecated tag`);
    return ts.getTextOfJSDocComment(tag.comment) ?? "";
}

describe("rescale utilities deprecation", () => {
    for (const name of ["rescaleLayout", "rescaleLayoutDict"]) {
        it(`${name} names rescaleInPlace, the id-keyed conversions and the removal major`, () => {
            const text = deprecationOf(name);
            assert.include(text, "rescaleInPlace");
            assert.include(text, "toPositionMap");
            assert.include(text, "fromPositionMap");
            assert.include(text, "3.0.0");
        });
    }
});
