import { describe, expect, it } from "vitest";

import { DotSyntaxError, DotTokenizer } from "../../../src/formats/dot/tokenizer.js";

/**
 * Lex a whole document into a compact transcript: one line per token (kind, line, flags, text),
 * then every ambiguity callback, then the error a malformed document throws.
 * @param text - the DOT text
 * @returns the transcript
 */
function transcript(text: string): string[] {
    const out: string[] = [];
    const lexer = new DotTokenizer(text, (numeral, line) => out.push(`ambiguity ${numeral} @${line}`));
    try {
        for (let i = 0; i < 10_000; i++) {
            const t = lexer.next();
            const flags = `${t.quoted ? "q" : "-"}${t.html ? "h" : "-"}`;
            out.push(`${t.kind} @${t.line} ${flags} ${JSON.stringify(t.text)}`);
            if (t.kind === "eof") {
                break;
            }
        }
    } catch (error) {
        if (!(error instanceof DotSyntaxError)) {
            throw error;
        }
        out.push(`error @${error.line} ${error.message}`);
    }
    return out;
}

const CASES: Record<string, string> = {
    empty: "",
    whitespaceOnly: " \t\v\f\n\r\n\r  ",
    punctuation: "{ } [ ] ; , = : + -> --",
    graph: 'digraph G { a -> b [label="x"]; b -- c; subgraph s { d } }',
    identifiers: "abc _x A9 été a﻿b x_1_y",
    numerals: "1 12.5 .5 -3 -.25 -0.5 7. 0",
    ambiguousNumerals: "1e3 1.2.3 -4x 5_",
    quotedPlain: '"hello world" "" "node"',
    quotedEscapes: '"a\\"b" "x\\\\" "back\\slash" "tab\\t" "end\\\\\\""',
    quotedContinuationLf: '"line\\\nnext" a',
    quotedContinuationCrlf: '"line\\\r\nnext" a',
    quotedContinuationCr: '"line\\\rnext" a',
    quotedRawNewlines: '"multi\nline\r\nstring\rhere" after',
    quotedConcat: '"a" + "b" + c',
    html: "<b>bold</b> <<table><tr><td>x</td></tr></table>> after",
    htmlMultiline: "<a\nb\r\nc\rd> after",
    lineComment: "a // comment -> b\nb",
    blockComment: "a /* one\ntwo\r\nthree\rfour */ b",
    blockCommentAdjacent: "a/**/b/* x */c",
    hashFirstLine: '# 1 "file.dot"\ndigraph { a }',
    hashAfterNewline: "a\n# preprocessor line\nb\r\n#another\r\nc\r#cr line\rd",
    hashMidLine: "a # b",
    strayBom: "a ﻿ b",
    slashAlone: "a / b",
    crlfLines: "a\r\nb\r\n\r\nc",
    crOnlyLines: "a\rb\r\rc",
    unterminatedQuoted: 'a\n"never closed',
    unterminatedQuotedEscape: '"abc\\',
    unterminatedHtml: "a\n<b>never",
    unterminatedHtmlOpen: "a\n<b <i> never",
    unterminatedBlockComment: "a\n/* never",
    badDash: "a - b",
    badDashEnd: "a -",
    badCharacter: "a\n\n@",
    badCharacterQuote: "a '",
    dotNotNumeral: "a . b",
    minusDotDigit: "-.5 -.x",
};

describe("DOT tokenizer golden transcripts", () => {
    for (const [name, text] of Object.entries(CASES)) {
        it(name, () => {
            expect(transcript(text)).toMatchSnapshot();
        });
    }

    it("lexes the same with and without an ambiguity callback", () => {
        const plain = new DotTokenizer("1e3 a");
        expect([plain.next().text, plain.next().text, plain.next().text, plain.next().kind]).toEqual([
            "1",
            "e3",
            "a",
            "eof",
        ]);
    });

    it("peeks ahead without consuming", () => {
        const lexer = new DotTokenizer("a -> b");
        expect(lexer.peek(2).text).toBe("b");
        expect(lexer.peek().text).toBe("a");
        expect(lexer.next().text).toBe("a");
        expect(lexer.next().text).toBe("->");
        expect(lexer.peek(5).kind).toBe("eof");
    });
});
