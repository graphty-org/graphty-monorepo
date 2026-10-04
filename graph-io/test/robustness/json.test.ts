/**
 * Robustness of the JSON importer's input handling: JSON Lines, doubled byte order marks and a
 * document longer than one JavaScript string.
 */

import { describe, expect, it } from "vitest";

import { MAX_TEXT_LENGTH } from "../../src/common/input.js";
import { importGraph } from "../../src/registry.js";
import { bytesOf, codes, importFailure } from "./helpers.js";

describe("robustness: JSON input", () => {
    it("names JSON Lines in the syntax error", async () => {
        const err = await importFailure(importGraph('{"source":"a","target":"b"}\n{"source":"b","target":"c"}\n', { format: "json" }));
        expect(codes(err.report)).toEqual(["E_SYNTAX"]);
        expect(err.message).toContain("JSON Lines");
        const plain = await importFailure(importGraph('{"nodes": [}', { format: "json" }));
        expect(plain.message).not.toContain("JSON Lines");
    });

    it("strips a doubled UTF-8 BOM instead of an invisible syntax error", async () => {
        const { snapshot, report } = await importGraph(bytesOf([0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf], '{"nodes":[{"id":"a"}],"links":[]}'));
        expect(report.issues).toEqual([]);
        expect(snapshot.ids.toArray()).toEqual(["a"]);
    });

    it("refuses a document longer than one string with E_TOO_LARGE (category unsupported) before joining it", async () => {
        const piece = " ".repeat(16 * 1024 * 1024);
        const count = Math.ceil(MAX_TEXT_LENGTH / piece.length) + 1;
        async function* huge(): AsyncGenerator<string> {
            yield '{"nodes":[';
            for (let i = 0; i < count; i++) {
                yield piece;
            }
            yield "]}";
            await Promise.resolve();
        }
        const err = await importFailure(importGraph(huge(), { format: "json" }));
        expect(codes(err.report)).toEqual(["E_TOO_LARGE"]);
        expect(err.report.issues[0].category).toBe("unsupported");
    });
});
