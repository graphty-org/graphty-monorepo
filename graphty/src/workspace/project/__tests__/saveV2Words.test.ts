/**
 * The words of the version 2 save and open dialogs, by graphty-element's counts and codes.
 */

import type { ProjectFileSection, ProjectProblem, ProjectSourceChoice } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    aboutRows,
    heldWords,
    needRows,
    refusedWords,
    reportLines,
    savePresets,
    sectionSummary,
    sourceDetail,
} from "../saveV2Words";

const NAMES = { session: null, sources: new Map([["src_1", "friends.csv"]]) };

describe("the version 2 dialogs' words", () => {
    it("says what a section holds from its counts, leaving out what it holds none of", () => {
        assert.strictEqual(
            sectionSummary({ section: "data", counts: { sources: 1, nodes: 15, edges: 20, types: 0 } }),
            "1 source . 15 nodes . 20 edges",
        );
        assert.strictEqual(
            sectionSummary({ section: "recipe", name: "Sweep", counts: { commands: 5 } }),
            "Sweep . 5 steps",
        );
        assert.strictEqual(
            sectionSummary({ section: "results", counts: { runs: 2, layout: 7 } }),
            "2 runs . the layout",
        );
        assert.strictEqual(sectionSummary({ section: "notes", counts: {} }), "Empty");
    });

    it("words each code, and says a repeated line once", () => {
        const facts: ProjectProblem[] = [
            { code: "W_SOURCE_NO_PATH", params: { source: "src_1" } },
            { code: "W_SECTION_KEPT", params: { section: "style", version: 3, reason: "version" } },
            { code: "W_SOURCE_UNAVAILABLE", params: { source: "src_1", reason: "consent" } },
            { code: "W_DATA_MISMATCH", params: { section: "notes", data: null } },
            { code: "W_DATA_MISMATCH", params: { section: "notes", data: null } },
            { code: "W_ELEMENT_NAMING_LEFT_OUT", params: { section: "style", pointer: "/layers/1", movedTo: "view" } },
        ];
        assert.deepEqual(reportLines(facts, NAMES), [
            { item: "friends.csv", outcome: "Copied", reason: "No file path to refer to" },
            { item: "Style", outcome: "Kept as opened", reason: "Version 3, newer than this release" },
            { item: "friends.csv", outcome: "Not loaded", reason: "Fetching not allowed" },
            { item: "Notes", outcome: "Not loaded", reason: "Written on other data" },
            { item: "A layer", outcome: "Moved to view", reason: "Picks nodes by id" },
        ]);
        assert.strictEqual(heldWords("extension", 2), "Needs an extension");
        assert.strictEqual(heldWords("toString", 2), "Not readable here", "a reason with no words yet");
    });

    it("says why a source stays a copy, and what it supplies", () => {
        const source: ProjectSourceChoice = {
            id: "src_1",
            name: "friends.csv",
            kind: "file",
            format: "csv",
            storage: "embedded",
            referable: false,
            refused: { code: "W_SOURCE_NO_PATH", params: { source: "src_1" } },
            nodes: 3,
            edges: 1,
        };
        assert.strictEqual(refusedWords(source), "No file path to refer to");
        assert.isUndefined(refusedWords({ ...source, referable: true }));
        assert.strictEqual(sourceDetail(source), "CSV . 3 nodes . 1 edge");
    });

    it("offers a preset per use case over the element's sections", () => {
        const presets = savePresets(["data", "style", "recipe", "settings", "results", "notes", "view"]);
        assert.deepEqual(presets[0].sections, ["data", "style", "recipe", "settings", "results", "notes", "view"]);
        assert.deepEqual(presets.find((preset) => preset.value === "share")?.sections, [
            "data",
            "style",
            "recipe",
            "settings",
            "view",
        ]);
    });

    it("words a section file's facts and what it needs, leaving out what the file does not say", () => {
        const style: ProjectFileSection = {
            section: "style",
            name: "Fraud review style",
            version: 2,
            counts: { layers: 3 },
            about: { authors: [{ name: "Fraud team" }, { name: "Ana" }], license: "CC-BY-4.0" },
            needs: [
                { kind: "column", name: "amount", table: "edge", found: true },
                { kind: "column", name: "mcc", table: "node", found: false },
                { kind: "type", name: "merchant" },
                { kind: "result", name: "pagerank", found: false },
            ],
        };
        assert.deepEqual(aboutRows(style), [
            ["Name", "Fraud review style"],
            ["Authors", "Fraud team, Ana"],
            ["License", "CC-BY-4.0"],
            ["Adds", "Fraud review style . 3 layers"],
        ]);
        assert.deepEqual(needRows(style), [
            { need: "amount", found: "amount", state: "Bound" },
            { need: "mcc", found: "", state: "Missing" },
            { need: "Type merchant", found: "", state: "" },
            { need: "Run pagerank", found: "", state: "Waits for the run" },
        ]);
    });
});
