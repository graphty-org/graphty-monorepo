import { describe, expect, it } from "vitest";

import {
    endsWithContinuation,
    hasStrayBrace,
    parseQualifiers,
    parseXref,
    parseXrefList,
    splitQualifiers,
    splitTagValue,
    stripComment,
    tokenize,
    unescapeObo,
} from "../../../src/formats/obo/syntax.js";

describe("OBO lexical layer (research-obo.md 4.1)", () => {
    it("unescapes the guides' escapes, \\W as a space, any other \\x as x", () => {
        expect(unescapeObo("a\\nb\\tc\\Wd")).toBe("a\nb\tc d");
        expect(unescapeObo('\\:\\,\\"\\\\\\(\\)\\[\\]\\{\\}\\!')).toBe(':,"\\()[]{}!');
        expect(unescapeObo("\\z")).toBe("z");
        expect(unescapeObo("end\\")).toBe("end");
        expect(unescapeObo("plain")).toBe("plain");
    });

    it("splits a line at the first unescaped colon", () => {
        expect(splitTagValue("is_a: GO:0000001")).toEqual({ tag: "is_a", rest: "GO:0000001" });
        expect(splitTagValue("id:\tX:1")).toEqual({ tag: "id", rest: "X:1" });
        expect(splitTagValue("my\\:tag: v")).toEqual({ tag: "my:tag", rest: "v" });
        expect(splitTagValue("no colon here")).toBeNull();
    });

    it("strips a hidden comment outside quotes, never a ! glued to text or escaped", () => {
        expect(stripComment("X:1 ! a comment")).toBe("X:1");
        expect(stripComment('"a ! b" [] ! c')).toBe('"a ! b" []');
        expect(stripComment("a \\! b")).toBe("a \\! b");
        expect(stripComment("http://x.org/#!/y")).toBe("http://x.org/#!/y");
        expect(stripComment("Hello! there")).toBe("Hello! there");
        expect(stripComment("! only a comment")).toBe("");
        expect(stripComment("a  \t")).toBe("a");
    });

    it("recognizes a continuation backslash only when it is not escaped", () => {
        expect(endsWithContinuation("name: a \\")).toBe(true);
        expect(endsWithContinuation("name: a \\\\")).toBe(false);
        expect(endsWithContinuation("name: a")).toBe(false);
    });

    it("splits trailing qualifier blocks: quoted, unquoted, several, IRI names, repeated names", () => {
        expect(splitQualifiers('X:2 {cardinality="2", gci_filler="T:1"}')).toEqual({
            value: "X:2",
            qualifiers: { cardinality: "2", gci_filler: "T:1" },
            badBlock: null,
        });
        expect(splitQualifiers("X:2 {source=PMID:1}").qualifiers).toEqual({ source: "PMID:1" });
        expect(splitQualifiers('X:2 {a="1"}{b="2"}').qualifiers).toEqual({ a: "1", b: "2" });
        expect(splitQualifiers('X:2 {a="1",b="x, y"}').qualifiers).toEqual({ a: "1", b: "x, y" });
        expect(splitQualifiers('v {http://purl.obolibrary.org/obo/IAO_0010000="x"}').qualifiers).toEqual({
            "http://purl.obolibrary.org/obo/IAO_0010000": "x",
        });
        expect(splitQualifiers('v {s="1", s="2"}').qualifiers).toEqual({ s: ["1", "2"] });
        expect(splitQualifiers('v {a="\\"q\\""}').qualifiers).toEqual({ a: '"q"' });
        expect(splitQualifiers('"text {not a block}" []')).toEqual({
            value: '"text {not a block}" []',
            qualifiers: null,
            badBlock: null,
        });
        expect(splitQualifiers("set \\{a\\}")).toEqual({ value: "set \\{a\\}", qualifiers: null, badBlock: null });
    });

    it("leaves a closing brace that is not a qualifier block in the value and names it", () => {
        expect(splitQualifiers("P{GawB}")).toEqual({ value: "P{GawB}", qualifiers: null, badBlock: "{GawB}" });
        expect(splitQualifiers("only }")).toEqual({ value: "only }", qualifiers: null, badBlock: "only }" });
        expect(parseQualifiers('a="unterminated')).toBeNull();
        expect(parseQualifiers("   ")).toBeNull();
        expect(parseQualifiers('="x"')).toBeNull();
    });

    it("tokenizes words, quoted strings and bracketed lists, flagging what is never closed", () => {
        expect(tokenize('"s2" BROAD UK_SPELLING [A:1, B:2 "desc"]')).toEqual([
            { kind: "quoted", text: "s2", unterminated: false },
            { kind: "word", text: "BROAD", unterminated: false },
            { kind: "word", text: "UK_SPELLING", unterminated: false },
            { kind: "list", text: 'A:1, B:2 "desc"', unterminated: false },
        ]);
        expect(tokenize('"q \\"x\\" y" []')[0].text).toBe('q "x" y');
        expect(tokenize("part_of\tX:2")).toEqual([
            { kind: "word", text: "part_of", unterminated: false },
            { kind: "word", text: "X:2", unterminated: false },
        ]);
        expect(tokenize("a\\ b c").map((t) => t.text)).toEqual(["a b", "c"]);
        expect(tokenize('"text []')).toEqual([{ kind: "quoted", text: "text []", unterminated: true }]);
        expect(tokenize("[A:1, B:2")).toEqual([{ kind: "list", text: "A:1, B:2", unterminated: true }]);
        expect(tokenize('"a" [x "]"]')[1].text).toBe('x "]"');
    });

    it("reads xrefs: ids with spaces, descriptions, escaped commas and per-xref qualifiers", () => {
        expect(parseXref('NIST Chemistry WebBook:110-63-4 "CAS Registry Number"')).toEqual({
            id: "NIST Chemistry WebBook:110-63-4",
            description: "CAS Registry Number",
            qualifiers: null,
            unterminated: false,
        });
        expect(parseXref("http://ecoliwiki.net/colipedia/index.php/Category\\:Cryptic_Prophage.w")?.id).toBe(
            "http://ecoliwiki.net/colipedia/index.php/Category:Cryptic_Prophage.w",
        );
        expect(parseXref("  ")).toBeNull();
        expect(parseXrefList('A:1, B:2 "d, e", C\\,D:3 {q="1, 2"}, ')).toEqual([
            { id: "A:1", description: null, qualifiers: null, unterminated: false },
            { id: "B:2", description: "d, e", qualifiers: null, unterminated: false },
            { id: "C,D:3", description: null, qualifiers: { q: "1, 2" }, unterminated: false },
        ]);
        expect(parseXrefList("")).toEqual([]);
        expect(parseXrefList("KEGG COMPOUND:")).toEqual([
            { id: "KEGG COMPOUND:", description: null, qualifiers: null, unterminated: false },
        ]);
    });

    it("finds a stray brace only outside quotes and when unescaped", () => {
        expect(hasStrayBrace("a P{GawB} b")).toBe(true);
        expect(hasStrayBrace('"a {b}" []')).toBe(false);
        expect(hasStrayBrace("a \\{b\\}")).toBe(false);
    });
});
