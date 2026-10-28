import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ImportReportBuilder } from "../../../src/common/report.js";
import { RecordReader, type RecordSyntax, sniffDelimiter } from "../../../src/formats/csv/records.js";
import { ImportError } from "../../../src/types.js";
import { textChunksOf } from "../../helpers/corpus.js";

// Golden outputs of the record tokeniser over every pair of these fragments, under several
// syntaxes and chunkings: the cells, quoted flags and line of every record, the leading comments,
// the stray-quote line, or the fatal error and its line. The fragments cover quoting, doubled
// quotes, delimiters, whitespace runs, empty fields, comments and every line ending.
const FRAGMENTS = [
    "a,b",
    "a;b c",
    '"q,1"',
    '"a""b"',
    '""',
    '"x"y',
    'a"b',
    "  a \t b ",
    ",,",
    "#c",
    '"l\r\nm"',
    "\n",
    "\r\n",
    "\r",
    "\r\r\n\n",
    '"open',
];

const SYNTAXES: { name: string; syntax: RecordSyntax }[] = [
    { name: "comma", syntax: { delimiter: ",", quote: '"' } },
    { name: "semicolon", syntax: { delimiter: ";", quote: '"' } },
    { name: "tab", syntax: { delimiter: "\t", quote: '"' } },
    { name: "space", syntax: { delimiter: " ", quote: '"' } },
    { name: "whitespace", syntax: { delimiter: " ", quote: '"', collapseSpaces: true, comments: ["#"] } },
    { name: "comma-comments", syntax: { delimiter: ",", quote: '"', comments: ["#", "%"] } },
    { name: "single-quote", syntax: { delimiter: ",", quote: "'" } },
];

async function run(text: string, syntax: RecordSyntax, chunk: number): Promise<unknown> {
    const reader = new RecordReader(textChunksOf(text, chunk), new ImportReportBuilder("csv", 100), syntax, {
        allowEmpty: true,
    });
    const records: unknown[] = [];
    try {
        for await (const count of reader) {
            records.push([reader.line, reader.cells.slice(0, count), reader.quoted.slice(0, count)]);
        }
    } catch (error) {
        if (!(error instanceof ImportError)) {
            throw error;
        }
        const issue = error.report.issues[0];
        return { error: issue.code, line: issue.line, records };
    }
    return {
        records,
        comments: reader.leadingComments.map((c, k) => [reader.leadingCommentLines[k], c]),
        stray: reader.strayQuoteLine,
    };
}

describe("RecordReader golden outputs", () => {
    for (const { name, syntax } of SYNTAXES) {
        it(`${name}: every fragment pair, whole and in 1- and 3-character chunks`, async () => {
            const out: Record<string, unknown> = {};
            for (const a of FRAGMENTS) {
                for (const b of FRAGMENTS) {
                    for (const sep of ["\n", "\r\n"]) {
                        const text = a + sep + b;
                        const whole = await run(text, syntax, Math.max(1, text.length));
                        expect(await run(text, syntax, 1), JSON.stringify(text)).toEqual(whole);
                        expect(await run(text, syntax, 3), JSON.stringify(text)).toEqual(whole);
                        out[JSON.stringify(text)] = whole;
                    }
                }
            }
            // compared as parsed JSON, so reformatting the golden file changes nothing; delete it to rewrite it
            const file = new URL(`__golden__/records-${name}.json`, import.meta.url);
            const actual: unknown = JSON.parse(JSON.stringify(out));
            if (!existsSync(file)) {
                writeFileSync(file, `${JSON.stringify(actual, null, 4)}\n`);
            }
            expect(actual).toEqual(JSON.parse(readFileSync(file, "utf8")));
        });
    }
});

describe("sniffDelimiter", () => {
    it("never tries the quote or the newline as the delimiter", () => {
        expect(sniffDelimiter("a'b'c\nd'e'f\n", "\n", ["'", ","], "'")).toBeNull();
        expect(sniffDelimiter("a\rb\rc\n", "\r", ["\r", ","])).toBeNull();
    });

    it("picks the candidate whose rows vary least in width, the first on a tie", () => {
        expect(sniffDelimiter("a,b;c\nd,e;f\ng;h\n", "\n", [",", ";"])).toBe(";");
        expect(sniffDelimiter("a,b;c\nd,e;f\n", "\n", [",", ";"])).toBe(",");
        expect(sniffDelimiter("a,b,c\nd,e\n", "\n", [","])).toBe(",");
    });

    it("drops the last row of an unterminated preview and needs two fields per row on average", () => {
        // terminated, the short last row counts; unterminated, it may be cut short and is dropped
        expect(sniffDelimiter("a,b;c\nd,e;f\ng;h\ni", "\n", [",", ";"])).toBe(";");
        expect(sniffDelimiter("a;b\nc;d\ne,f,g", "\n", [",", ";"])).toBe(";");
        expect(sniffDelimiter("a;b\nc;d\ne,f,g\n", "\n", [",", ";"])).toBeNull();
        expect(sniffDelimiter("a,b\nc\nd\n", "\n", [","])).toBeNull();
        expect(sniffDelimiter("a,b", "\n", [","])).toBe(",");
        expect(sniffDelimiter("\n \n", "\n", [","])).toBeNull();
    });
});
