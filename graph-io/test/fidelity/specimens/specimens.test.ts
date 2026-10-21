/**
 * The specimen registries: every format accounts for every sheet category exactly once (a sheet, absent with its
 * documentation, or still pending), sheet ids follow `specimen-<category>[-p<N>]`, sample ids are unique across the
 * whole fidelity corpus, and every registered sheet file exists and holds the four anchor-* corner nodes.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { CORPUS_SAMPLES } from "../corpus-samples.js";
import { SAMPLES } from "../samples.js";
import { SPECIMEN_FORMATS, SPECIMEN_SAMPLES } from "./index.js";
import { categoryOf, SHEET_CATEGORIES } from "./sheets.js";

const testDir = fileURLToPath(new URL("../../", import.meta.url));
const ANCHORS = ["anchor-nw", "anchor-ne", "anchor-sw", "anchor-se"];

describe("specimen registries", () => {
    it("has one folder per format, with distinct ids and titles", () => {
        expect(new Set(SPECIMEN_FORMATS.map((f) => f.id)).size).toBe(SPECIMEN_FORMATS.length);
        expect(new Set(SPECIMEN_FORMATS.map((f) => f.title)).size).toBe(SPECIMEN_FORMATS.length);
    });

    it.each(SPECIMEN_FORMATS)("$title accounts for every category exactly once", (format) => {
        const built = new Set(format.sheets.map((s) => categoryOf(s.id)));
        const accounted = [...built, ...Object.keys(format.absent), ...format.pending].sort();
        expect(accounted).toEqual([...new Set(accounted)].sort());
        expect(accounted).toEqual([...SHEET_CATEGORIES].sort());
        for (const [category, why] of Object.entries(format.absent)) {
            expect(why.doc, `${format.id} ${category}`).toMatch(/^https?:\/\//);
            expect(why.reason.length, `${format.id} ${category}`).toBeGreaterThan(10);
        }
    });

    it.each(SPECIMEN_FORMATS)("$title names its sheets by category and page", (format) => {
        for (const sheet of format.sheets) {
            expect(categoryOf(sheet.id), sheet.id).toBeDefined();
            expect(sheet.id).toMatch(/^specimen-[a-z-]+?(-p([2-9]|[1-9]\d+))?$/);
        }
        expect(new Set(format.sheets.map((s) => s.id)).size).toBe(format.sheets.length);
    });

    it("gives every specimen a sample id no other fidelity sample has", () => {
        const ids = [...SAMPLES, ...CORPUS_SAMPLES, ...SPECIMEN_SAMPLES].map((s) => s.id);
        expect(ids.length - new Set(ids).size).toBe(0);
    });

    it.each(SPECIMEN_SAMPLES.map((s) => [s.id, s.file]))(
        "%s: its file exists and has the corner anchors",
        (_, file) => {
            const path = `${testDir}${file}`;
            expect(existsSync(path), path).toBe(true);
            const bytes = readFileSync(path);
            // A .cys session is a zip, so its text is not searched here; its XGMML twin carries the same anchors.
            if (file.endsWith(".cys")) {
                return;
            }
            // a numeric character reference spells a character as some writers escape it (gv2gml writes - as &#45;)
            const text = (file.endsWith(".gz") ? gunzipSync(bytes) : bytes)
                .toString("utf8")
                .replaceAll(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
            expect(ANCHORS.filter((a) => !text.includes(a))).toEqual([]);
        },
    );
});
