/**
 * Every committed style corpus file is accounted for: listed (by itself, or by a directory entry ending in `/`) in
 * its format directory's SOURCES.md with where it came from and its license, and none of them is a yFiles for HTML
 * demo file, whose license forbids redistribution. A file a SOURCES.md lists outside its "Not committed" section
 * must exist.
 */

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { readZipDirectory, readZipEntry, startsLikeZip } from "../../src/common/zip.js";
import { corpusFiles, STYLE_CORPUS } from "./harness.js";

/** Text that marks a file as one of yWorks' demo files. */
const YWORKS_DEMO = /This demo file is part of yFiles|yFiles demo files exhibit|by yWorks GmbH/;

/**
 * The entries a SOURCES.md lists: the first cell of each table row, in backticks; a directory entry ends in `/`.
 * @param text - the SOURCES.md
 * @returns the entries, and those listed under "Not committed"
 */
function listed(text: string): { readonly committed: string[]; readonly local: string[] } {
    const committed: string[] = [];
    const local: string[] = [];
    let section = committed;
    for (const line of text.split("\n")) {
        if (line.startsWith("## ")) {
            section = /not committed/i.test(line) ? local : committed;
        }
        const m = /^\|\s*`([^`]+)`\s*\|/.exec(line);
        if (m !== null) {
            section.push(m[1]);
        }
    }
    return { committed, local };
}

/**
 * The text of a file, and of every entry when it is a zip archive (a Cytoscape session), decompressed.
 * @param path - the file
 * @returns the texts
 */
async function textsOf(path: string): Promise<string[]> {
    let bytes = new Uint8Array(readFileSync(path));
    if (path.endsWith(".gz")) {
        bytes = new Uint8Array(gunzipSync(bytes));
    }
    if (!startsLikeZip(bytes)) {
        return [new TextDecoder("latin1").decode(bytes)];
    }
    const out: string[] = [];
    for (const entry of readZipDirectory(bytes)) {
        const data = await readZipEntry(bytes, entry, { maxBytes: Infinity, maxRatio: Infinity });
        out.push(new TextDecoder("latin1").decode(data));
    }
    return out;
}

/**
 * What is wrong with one corpus directory's SOURCES.md.
 * @param dir - the directory
 * @returns one line per problem
 */
async function sourcesProblems(dir: string): Promise<string[]> {
    let text: string;
    try {
        text = readFileSync(join(dir, "SOURCES.md"), "utf8");
    } catch {
        return ["it has no SOURCES.md"];
    }
    const { committed, local } = listed(text);
    const files = corpusFiles(dir);
    const problems: string[] = [];
    for (const f of files) {
        if (!committed.some((e) => e === f || (e.endsWith("/") && f.startsWith(e)))) {
            problems.push(`${f} is not listed in SOURCES.md`);
        }
        if (local.includes(f)) {
            problems.push(`${f} is listed as not committed`);
        }
        if ((await textsOf(join(dir, f))).some((t) => YWORKS_DEMO.test(t))) {
            problems.push(`${f} is a yFiles demo file, which may not be redistributed`);
        }
    }
    for (const e of committed) {
        if (!e.endsWith("/") && !files.includes(e)) {
            problems.push(`${e} is listed but not committed`);
        }
    }
    return problems;
}

const DIRS = readdirSync(STYLE_CORPUS)
    .filter((d) => statSync(join(STYLE_CORPUS, d)).isDirectory())
    .sort();

describe("the style corpus", () => {
    it.each(DIRS)("%s lists every committed file and holds no yFiles demo file", async (d) => {
        expect(await sourcesProblems(join(STYLE_CORPUS, d))).toEqual([]);
    });
});

describe("the check", () => {
    it("fails on a file missing from SOURCES.md and on a yWorks demo license marker", async () => {
        const dir = mkdtempSync(join(tmpdir(), "style-corpus-"));
        try {
            mkdirSync(join(dir, "sub"));
            writeFileSync(
                join(dir, "SOURCES.md"),
                "| File | Source |\n| --- | --- |\n| `a.graphml` | x |\n| `sub/` | y |\n| `gone.gv` | z |\n",
            );
            writeFileSync(join(dir, "a.graphml"), "<!-- This demo file is part of yFiles for HTML. -->");
            writeFileSync(join(dir, "sub", "b.gv"), "digraph {}");
            writeFileSync(join(dir, "c.gv"), "digraph {}");
            expect(await sourcesProblems(dir)).toEqual([
                "a.graphml is a yFiles demo file, which may not be redistributed",
                "c.gv is not listed in SOURCES.md",
                "gone.gv is listed but not committed",
            ]);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
