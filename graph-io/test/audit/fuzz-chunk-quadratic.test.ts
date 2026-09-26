/**
 * Fuzz audit, hang lens (design section 8.4: streaming importers run "over a byte stream" with
 * bounded memory; a hang beyond 10 s on a 50 MB value is a finding): one token that spans many
 * chunks must cost linear work in its length, not its length times the number of chunks it
 * spans. Three readers used to re-scan their whole carry on every chunk while a token was
 * incomplete, so a 50 MB quoted cell, a 50 MB line or a 50 MB attribute value arriving in 16 KB
 * chunks (the chunk size of a fetch body in Chromium; File.stream() gives 64 KB) took 30-40 s
 * instead of well under one second:
 *
 * - LineReader (src/common/input.ts): `text = carry + chunk` then `indexOf("\n", 0)` over the
 *   whole carry on every chunk of a line that has no terminator yet (Pajek);
 * - CsvRecordReader (src/formats/csv/records.ts): `carry += chunk` and papaparse re-parsed the
 *   carry from offset 0 on every chunk while a quoted cell (or an unclosed quote) was open;
 * - XmlTokenizer (src/common/xml.ts): `buffer + text` then consumeMarkup() re-read the
 *   incomplete start tag, comment, CDATA or name from its `<` on every push.
 *
 * The Neo4j record reader (a per-character state machine that keeps only the open field) is the
 * linear control. A fourth quadratic lived in the core: GraphBuilder resolved column names by a
 * linear scan, so a 100k-column CSV or Neo4j header, or a JSON node with 100k keys, took 50-130 s;
 * every importer that declares columns from the input reaches it.
 *
 * The tests count work rather than time it (test/helpers/work-meter.ts): the characters a reader
 * examines through the string primitives it scans with, and the reads of the builder's column
 * arrays. A count does not change with machine load or core type, so the bounds are tight: a
 * linear reader examines each input character a small constant number of times, while the
 * re-scanning readers examined a 1 MB token in 16 KB chunks about 32 times over (the carry is
 * re-read once per chunk, 64 chunks, half the token on average) and more at larger sizes.
 * The 50 MB end-to-end imports of the task run under IO_BENCH=1 as a measurement.
 */

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { LineReader } from "../../src/common/input.js";
import { ImportReportBuilder } from "../../src/common/report.js";
import { XmlTokenizer } from "../../src/common/xml.js";
import { CsvRecordReader, RecordReader as Neo4jRecordReader } from "../../src/formats/csv/records.js";
import { registry } from "../../src/registry.js";
import { ImportError } from "../../src/types.js";
import { charactersExamined, countColumnReads } from "../helpers/work-meter.js";

const MB = 1024 * 1024;
const CHUNK = 16 * 1024;
const BENCH = process.env.IO_BENCH === "1";
const LONG = { timeout: 600_000 };

/**
 * The most characters a linear reader may examine per input character. The linear readers examine
 * 4 to 8 (the test's own slicing of the input into chunks counts as one); a reader that re-scans
 * its carry per chunk examines about (chunk count / 2) more: 32 at 1 MB in 16 KB chunks, 512 at
 * 16 MB.
 */
const PER_CHARACTER_BOUND = 16;
/** Chunking a token into 16 KB pieces may examine at most this many times more than one piece. */
const SHAPE_BOUND = 2;
/** The most reads of the column arrays per declared column (a scan by name reads thousands). */
const READS_PER_COLUMN_BOUND = 10;

async function* pieces(text: string, size: number): AsyncGenerator<string, void, undefined> {
    for (let i = 0; i < text.length; i += size) {
        yield text.slice(i, i + size);
        await Promise.resolve();
    }
}

async function* onePiece(text: string): AsyncGenerator<string, void, undefined> {
    yield text;
    await Promise.resolve();
}

function chunkedBytes(text: string, size: number): ReadableStream<Uint8Array> {
    const bytes = new TextEncoder().encode(text);
    let offset = 0;
    return new ReadableStream<Uint8Array>({
        pull(controller): void {
            if (offset >= bytes.byteLength) {
                controller.close();
                return;
            }
            controller.enqueue(bytes.subarray(offset, Math.min(offset + size, bytes.byteLength)));
            offset += size;
        },
    });
}

/** Characters examined per input character, at 1 MB and 16 MB (the bound must hold at both). */
async function perCharacter(
    make: (mb: number) => string,
    work: (text: string) => Promise<number>,
): Promise<{ small: number; large: number; text: string }> {
    const smallText = make(1);
    const largeText = make(16);
    const small = (await work(smallText)) / smallText.length;
    const large = (await work(largeText)) / largeText.length;
    return { small, large, text: `1 MB ${small.toFixed(2)}, 16 MB ${large.toFixed(2)} characters examined per character` };
}

async function linesWork(input: AsyncIterable<string>): Promise<number> {
    const reader = new LineReader(input, new ImportReportBuilder("audit", 100));
    let lines = 0;
    const examined = await charactersExamined(async () => {
        for await (const _line of reader) {
            lines++;
        }
    });
    expect(lines).toBeGreaterThan(0);
    return examined;
}

async function csvWork(input: AsyncIterable<string>): Promise<number> {
    const reader = new CsvRecordReader(input, new ImportReportBuilder("csv", 100));
    let rows = 0;
    const examined = await charactersExamined(async () => {
        for await (const _row of reader) {
            rows++;
        }
    });
    expect(rows).toBe(2);
    return examined;
}

async function xmlWork(text: string, size: number): Promise<number> {
    let starts = 0;
    const tokenizer = new XmlTokenizer({
        start(): void {
            starts++;
        },
        end(): void {},
        text(): void {},
    });
    const examined = await charactersExamined(() => {
        for (let i = 0; i < text.length; i += size) {
            tokenizer.push(text.slice(i, i + size));
        }
        tokenizer.finish();
    });
    expect(starts).toBe(3);
    return examined;
}

async function neo4jWork(input: AsyncIterable<string>): Promise<number> {
    const reader = new Neo4jRecordReader(
        input,
        new ImportReportBuilder("neo4j", 100),
        { delimiter: ",", quote: '"' },
        {},
    );
    let rows = 0;
    const examined = await charactersExamined(async () => {
        for await (const _cells of reader) {
            rows++;
        }
    });
    expect(rows).toBe(3);
    return examined;
}

function line(mb: number): string {
    return `1 "${"x".repeat(mb * MB)}"\n`;
}

function csvCell(mb: number): string {
    return `source,target,label\na,b,"${"x".repeat(mb * MB)}"\n`;
}

function xmlAttribute(mb: number): string {
    return `<graphml><graph><node id="${"x".repeat(mb * MB)}"/></graph></graphml>`;
}

function neo4jCell(mb: number): string {
    return `:ID,name,:LABEL\n1,"${"x".repeat(mb * MB)}",P\n2,b,P\n`;
}

describe("fuzz audit: a token spanning many chunks costs linear work", () => {
    it("LineReader: a line spanning 16 KB chunks examines each character a bounded number of times", async () => {
        const { small, large, text } = await perCharacter(line, (t) => linesWork(pieces(t, CHUNK)));
        console.log(`LineReader one line in 16 KB chunks: ${text}`);
        expect(small, text).toBeLessThan(PER_CHARACTER_BOUND);
        expect(large, text).toBeLessThan(PER_CHARACTER_BOUND);
    });

    it("LineReader: one 8 MB line in 16 KB chunks examines about as much as in one chunk", async () => {
        const chunked = await linesWork(pieces(line(8), CHUNK));
        const whole = await linesWork(onePiece(line(8)));
        console.log(`LineReader 8 MB line examined: 16 KB chunks ${chunked}, one chunk ${whole}`);
        expect(chunked).toBeLessThan(whole * SHAPE_BOUND);
    });

    it("CsvRecordReader: a quoted cell spanning 16 KB chunks examines each character a bounded number of times", async () => {
        const { small, large, text } = await perCharacter(csvCell, (t) => csvWork(pieces(t, CHUNK)));
        console.log(`CsvRecordReader one quoted cell in 16 KB chunks: ${text}`);
        expect(small, text).toBeLessThan(PER_CHARACTER_BOUND);
        expect(large, text).toBeLessThan(PER_CHARACTER_BOUND);
    });

    it("CsvRecordReader: an 8 MB quoted cell in 16 KB chunks examines about as much as in one chunk", async () => {
        const chunked = await csvWork(pieces(csvCell(8), CHUNK));
        const whole = await csvWork(onePiece(csvCell(8)));
        console.log(`CsvRecordReader 8 MB cell examined: 16 KB chunks ${chunked}, one chunk ${whole}`);
        expect(chunked).toBeLessThan(whole * SHAPE_BOUND);
    });

    it("XmlTokenizer: an attribute value spanning 16 KB chunks examines each character a bounded number of times", async () => {
        const { small, large, text } = await perCharacter(xmlAttribute, (t) => xmlWork(t, CHUNK));
        console.log(`XmlTokenizer one attribute in 16 KB chunks: ${text}`);
        expect(small, text).toBeLessThan(PER_CHARACTER_BOUND);
        expect(large, text).toBeLessThan(PER_CHARACTER_BOUND);
    });

    it("XmlTokenizer: an 8 MB attribute value in 16 KB chunks examines about as much as in one push", async () => {
        const text = xmlAttribute(8);
        const chunked = await xmlWork(text, CHUNK);
        const whole = await xmlWork(text, text.length);
        console.log(`XmlTokenizer 8 MB attribute examined: 16 KB pushes ${chunked}, one push ${whole}`);
        expect(chunked).toBeLessThan(whole * SHAPE_BOUND);
    });

    it("Neo4jRecordReader (control): a quoted cell spanning 16 KB chunks is linear and shape-independent", async () => {
        const { small, large, text } = await perCharacter(neo4jCell, (t) => neo4jWork(pieces(t, CHUNK)));
        const chunked = await neo4jWork(pieces(neo4jCell(16), CHUNK));
        const whole = await neo4jWork(onePiece(neo4jCell(16)));
        console.log(`Neo4jRecordReader one quoted cell in 16 KB chunks: ${text}; 16 MB whole examined ${whole}`);
        expect(small, text).toBeLessThan(PER_CHARACTER_BOUND);
        expect(large, text).toBeLessThan(PER_CHARACTER_BOUND);
        expect(chunked).toBeLessThan(whole * SHAPE_BOUND);
    });
});

describe("fuzz audit: the number of declared columns", () => {
    it("GraphBuilder: declaring and resolving 20k columns reads the column array a bounded number of times per column", () => {
        const count = 20_000;
        const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
        builder.addNode("a");
        const reads = countColumnReads(builder);
        for (let i = 0; i < count; i++) {
            builder.declareNodeColumn({ name: `c${i}`, dtype: "f64" });
        }
        for (let i = 0; i < count; i++) {
            expect(builder.nodeColumn(`c${i}`)).toBe(i);
        }
        console.log(`GraphBuilder ${count} columns: ${reads()} column-array reads`);
        expect(reads()).toBeLessThan(READS_PER_COLUMN_BOUND * count);
    });

    it("CSV: a 40k-column header reads the builder's column arrays a bounded number of times per column", async () => {
        const columns = 40_000;
        const header = ["source", "target", ...Array.from({ length: columns }, (_, i) => `c${i}`)].join(",");
        const text = `${header}\na,b,${new Array<string>(columns).fill("1").join(",")}\n`;
        const sink = new GraphBuilder({ directed: true, weightDtype: "f64" });
        const reads = countColumnReads(sink);
        await registry.importer("csv").import(text, sink, {});
        expect(sink.edgeCount).toBe(1);
        console.log(`CSV ${columns}-column header: ${reads()} column-array reads`);
        expect(reads()).toBeLessThan(READS_PER_COLUMN_BOUND * columns);
    });
});

describe.skipIf(!BENCH)("fuzz audit: 50 MB end-to-end import times, a measurement (IO_BENCH=1)", () => {
    async function timeImport(format: string, input: string | ReadableStream<Uint8Array>): Promise<number> {
        const sink = new GraphBuilder({ directed: true, weightDtype: "f64" });
        const t0 = performance.now();
        try {
            await registry.importer(format).import(input, sink, {});
        } catch (err) {
            if (!(err instanceof ImportError)) {
                throw err;
            }
        }
        return performance.now() - t0;
    }

    it(
        "CSV: a 50 MB quoted cell in 16 KB chunks imports",
        async () => {
            const ms = await timeImport("csv", chunkedBytes(csvCell(50), CHUNK));
            console.log(`csv 50 MB cell in 16 KB chunks: ${ms.toFixed(0)} ms`);
        },
        LONG,
    );

    it(
        "CSV: an unclosed quote followed by 50 MB of rows in 16 KB chunks fails",
        async () => {
            const ms = await timeImport(
                "csv",
                chunkedBytes(`source,target,label\na,b,"oops\n${"a,b,c\n".repeat((50 * MB) / 6)}`, CHUNK),
            );
            console.log(`csv unclosed quote + 50 MB in 16 KB chunks: ${ms.toFixed(0)} ms`);
        },
        LONG,
    );

    it(
        "Pajek: a 50 MB label in 16 KB chunks imports",
        async () => {
            const ms = await timeImport("pajek", chunkedBytes(`*Vertices 1\n${line(50)}*Edges\n1 1\n`, CHUNK));
            console.log(`pajek 50 MB label in 16 KB chunks: ${ms.toFixed(0)} ms`);
        },
        LONG,
    );

    it(
        "GraphML: a 50 MB attribute value in 16 KB chunks imports",
        async () => {
            const doc = `<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph id="G" edgedefault="directed"><node id="${"x".repeat(50 * MB)}"/></graph></graphml>`;
            const ms = await timeImport("graphml", chunkedBytes(doc, CHUNK));
            console.log(`graphml 50 MB attribute in 16 KB chunks: ${ms.toFixed(0)} ms`);
        },
        LONG,
    );

    it(
        "GraphML: a 50 MB comment in 16 KB chunks imports",
        async () => {
            const doc = `<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><!-- ${"x".repeat(50 * MB)} --><graph id="G" edgedefault="directed"><node id="a"/></graph></graphml>`;
            const ms = await timeImport("graphml", chunkedBytes(doc, CHUNK));
            console.log(`graphml 50 MB comment in 16 KB chunks: ${ms.toFixed(0)} ms`);
        },
        LONG,
    );

    it(
        "JSON: a node with 100k keys imports",
        async () => {
            const keys = Array.from({ length: 100_000 }, (_, i) => `"k${i}":${i}`).join(",");
            const ms = await timeImport("json", `{"nodes":[{"id":"a",${keys}}],"links":[]}`);
            console.log(`json 100k keys: ${ms.toFixed(0)} ms`);
        },
        LONG,
    );

    it(
        "CSV: a 100k-column header imports",
        async () => {
            const header = ["source", "target", ...Array.from({ length: 100_000 }, (_, i) => `c${i}`)].join(",");
            const ms = await timeImport("csv", `${header}\na,b,${new Array<string>(100_000).fill("1").join(",")}\n`);
            console.log(`csv 100k columns: ${ms.toFixed(0)} ms`);
        },
        LONG,
    );
});
