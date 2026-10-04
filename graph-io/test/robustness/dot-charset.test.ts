/**
 * Robustness of DOT's `charset` declaration: only a graph-level attribute counts, wherever it sits
 * in the first 64 KiB, never the word in a comment, a quoted value or a node attribute list.
 */

import { describe, expect, it } from "vitest";

import { importGraph } from "../../src/registry.js";
import { bytesOf, codes } from "./helpers.js";

const E_ACUTE = String.fromCharCode(0xe9);
const CAFE_UTF8 = [0x63, 0x61, 0x66, 0xc3, 0xa9];

describe("robustness: DOT charset", () => {
    it("ignores charset in a comment, in a quoted value and in a node attribute list: the file stays UTF-8", async () => {
        for (const prefix of [
            '// set charset="latin1" if needed\n',
            "/* charset=big5 */\n",
            'digraph { x [label="charset=big5"]; ',
            "digraph { node [charset=latin1]; ",
        ]) {
            const open = prefix.startsWith("digraph") ? prefix : `${prefix}digraph { `;
            const { snapshot, report } = await importGraph(bytesOf(open, '"', CAFE_UTF8, '" -> b }\n'), {
                format: "dot",
            });
            expect(report.issues).toEqual([]);
            expect(snapshot.ids.toArray()).toContain(`caf${E_ACUTE}`);
        }
    });

    it("honours a graph-level charset as a statement or in graph [...]", async () => {
        for (const open of ['digraph { charset="latin1"; ', "digraph { graph [charset=latin1]; "]) {
            const { snapshot, report } = await importGraph(bytesOf(open, '"caf', [0xe9], '" -> b }\n'), {
                format: "dot",
            });
            expect(report.issues).toEqual([]);
            expect(snapshot.ids.toArray()).toContain(`caf${E_ACUTE}`);
        }
    });

    it("honours a charset that follows more than 1024 bytes of comments holding UTF-8 text", async () => {
        const comment = bytesOf("/* licence by Jos", [0xc3, 0xa9], ` ${"x".repeat(2000)} */\n`);
        const bytes = bytesOf(comment, 'digraph { charset="latin1"; "caf', [0xe9], '" -> b }\n');
        const { snapshot, report } = await importGraph(bytes, { format: "dot" });
        // the comment is read as Latin-1 too, as the file says; no fatal E_INVALID_UTF8
        expect(codes(report)).toEqual([]);
        expect(snapshot.ids.toArray()).toContain(`caf${E_ACUTE}`);
    });
});
