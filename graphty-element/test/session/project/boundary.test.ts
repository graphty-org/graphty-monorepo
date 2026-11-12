/**
 * Which dispatched commands replace the project: every replacing import op, a clear, and a
 * different source; merges, renames and ordinary commands do not.
 */

import { assert, describe, it } from "vitest";

import { boundaryOf } from "../../../src/session/project/boundary";

const LOADED = { type: "json", config: { url: "https://example.org/a.json" } };
const loaded = (): typeof LOADED => LOADED;

describe("boundaryOf", () => {
    for (const op of ["data.import", "data.import-source"]) {
        it(`${op} replaces the project unless it merges`, () => {
            assert.strictEqual(boundaryOf({ op, mode: "replace" } as { op: string }, loaded), "import");
            assert.strictEqual(boundaryOf({ op }, loaded), "import", "replace is the default");
            assert.isNull(boundaryOf({ op, mode: "merge" } as { op: string }, loaded));
        });
    }

    it("a batch holding a replacing load is a boundary", () => {
        const batch = { op: "batch", steps: [{ op: "config.set" }, { op: "data.import-source" }] };
        assert.strictEqual(boundaryOf(batch, loaded), "import");
    });

    it("a clear and a different source are boundaries; a rename and an ordinary command are not", () => {
        assert.strictEqual(
            boundaryOf({ op: "data.apply", mutation: { kind: "clear" } } as { op: string }, loaded),
            "clear",
        );
        assert.strictEqual(
            boundaryOf({ op: "data.setSource", source: { type: "json", config: {} } } as { op: string }, loaded),
            "source",
        );
        assert.isNull(
            boundaryOf({ op: "data.setSource", source: { ...LOADED, name: "Renamed" } } as { op: string }, loaded),
        );
        assert.isNull(boundaryOf({ op: "config.set" }, loaded));
    });
});
