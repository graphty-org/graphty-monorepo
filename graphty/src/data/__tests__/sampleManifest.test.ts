/**
 * Tests for the sample dataset manifest.
 *
 * Two things are worth testing here and the trivia is not. First, the manifest is a
 * transcription of Welcome.dc.html:340-430, so the assertions are the board's own
 * strings character for character -- a paraphrase is the failure mode, and only an
 * exact comparison catches it. Second, the counts are pre-computed (spec 7.1 item 2
 * wants a row to draw its size before anything loads), which means they can drift away
 * from the data they claim to describe. The cat record's counts are therefore asserted
 * against the real CAT_SOCIAL_NETWORK arrays rather than against a literal, so editing
 * the fixture without editing the manifest fails here instead of on screen.
 *
 * Spec: design/ui/app-shell-progressive-disclosure-design.md section 7.1.
 */

import { describe, expect, it } from "vitest";

import { CAT_SOCIAL_NETWORK, CAT_SOCIAL_NETWORK_NAME } from "../sampleGraphs";
import {
    findSample,
    SAMPLE_MANIFEST,
    SAMPLE_SECTION_HINT,
    SAMPLE_SECTION_NAME,
    type SampleRecord,
    sampleSizeString,
} from "../sampleManifest";

function record(id: string): SampleRecord {
    const found = findSample(id);

    expect(found, `no sample record with id "${id}"`).toBeDefined();

    // The expect above fails the test when `found` is undefined, so the assertion here
    // reports a shape the runtime has already guaranteed.
    return found as SampleRecord;
}

describe("SAMPLE_MANIFEST", () => {
    it("ships exactly the three records that have real data, in the drawn order", () => {
        expect(SAMPLE_MANIFEST.map((entry) => entry.id)).toEqual([
            "karate",
            "cat-social-network",
            "college-football",
        ]);
    });

    it("sets no Large badge and no byte size on any row", () => {
        // The only row Welcome draws with either is Patent citations, for which no file
        // exists, so nothing here may claim the Large treatment.
        for (const entry of SAMPLE_MANIFEST) {
            expect(entry.large).toBe(false);
            expect(entry.size.bytes).toBeUndefined();
        }
    });

    it("carries a hint if and only if it carries a suggested capability", () => {
        for (const entry of SAMPLE_MANIFEST) {
            expect(entry.hint !== undefined).toBe(entry.suggestedCapability !== undefined);
        }
    });

    it("offers exactly one suggested card, community detection on the cat network", () => {
        const suggesting = SAMPLE_MANIFEST.filter((entry) => entry.suggestedCapability !== undefined);

        expect(suggesting.map((entry) => entry.id)).toEqual(["cat-social-network"]);
        expect(suggesting[0]?.suggestedCapability).toBe("community-detection");
    });

    it("gives every record a distinct id", () => {
        expect(new Set(SAMPLE_MANIFEST.map((entry) => entry.id)).size).toBe(SAMPLE_MANIFEST.length);
    });

    it("draws Karate Club exactly as Welcome.dc.html:341-342 does", () => {
        const karate = record("karate");

        expect(karate.name).toBe("Karate Club");
        expect(karate.fileName).toBe("karate.gml");
        expect(karate.tags).toEqual([]);
        // No comma in the credit: REGISTER-1.5.md 11.3.
        expect(karate.credit).toBe("Zachary 1977");
        expect(karate.creditHref).toBe("http://www-personal.umich.edu/~mejn/netdata/");
        expect(karate.blurb).toBe("A club that split in two. The classic test for finding groups.");
        expect(karate.hint).toBeUndefined();
        expect(karate.source).toEqual({
            kind: "url",
            format: "gml",
            url: "/samples/karate.gml",
        });
    });

    it("draws the cat social network exactly as the board does, trailing space included", () => {
        const cat = record("cat-social-network");

        expect(cat.name).toBe("Cat social network");
        expect(cat.fileName).toBe(CAT_SOCIAL_NETWORK_NAME);
        expect(cat.tags).toEqual(["Weighted"]);
        expect(cat.credit).toBe("graphty samples");
        expect(cat.creditHref).toBe("https://graphty.app/");
        // The hint is a nested span in the same run, so the blurb owns the separator.
        expect(cat.blurb).toBe("Small enough to see every relationship. ");
        expect(cat.blurb.endsWith(" ")).toBe(true);
        expect(cat.hint).toBe("Try finding the groups.");
    });

    it("loads the cat social network inline, from the bundled fixture object itself", () => {
        const cat = record("cat-social-network");

        expect(cat.source.kind).toBe("inline");
        expect(cat.source.format).toBe("json");

        if (cat.source.kind !== "inline") {
            throw new Error("the cat record must load inline");
        }

        // Identity, not a copy: the row loads the same object `?test` loads.
        expect(cat.source.payload).toBe(CAT_SOCIAL_NETWORK);
    });

    it("draws College football with no hint, since colouring by conference is not built", () => {
        const football = record("college-football");

        expect(football.name).toBe("College football");
        expect(football.fileName).toBe("football.gml");
        expect(football.tags).toEqual(["Types"]);
        expect(football.credit).toBe("Girvan and Newman 2002");
        expect(football.creditHref).toBe("http://www-personal.umich.edu/~mejn/netdata/");
        expect(football.blurb).toBe("Teams that played each other in one season, tagged by conference.");
        expect(football.hint).toBeUndefined();
        expect(football.suggestedCapability).toBeUndefined();
        expect(football.source).toEqual({
            kind: "url",
            format: "gml",
            url: "/samples/football.gml",
        });
    });

    it("serves every url-sourced sample from /samples/ so Vite's public dir resolves it", () => {
        for (const entry of SAMPLE_MANIFEST) {
            if (entry.source.kind === "url") {
                expect(entry.source.url).toBe(`/samples/${entry.fileName}`);
            }
        }
    });
});

describe("the manifest against the data it describes", () => {
    it("matches the cat fixture's own node and edge arrays", () => {
        // The guard against a pre-computed count drifting from the bundled data. The
        // fixture spells its edge array `edges`, not `links`.
        const cat = record("cat-social-network");

        expect(cat.size.nodes).toBe(CAT_SOCIAL_NETWORK.nodes.length);
        expect(cat.size.edges).toBe(CAT_SOCIAL_NETWORK.edges.length);
    });

    it("records the counts FIXTURES.md measures, 20 nodes and 29 edges", () => {
        // A second, literal check, so a simultaneous edit to fixture and manifest still
        // fails rather than agreeing with itself.
        expect(CAT_SOCIAL_NETWORK.nodes.length).toBe(20);
        expect(CAT_SOCIAL_NETWORK.edges.length).toBe(29);
    });

    it("records the corpus manifest's counts for the two served GML files", () => {
        // graphty-element/test/helpers/corpus/gml/manifest.json: karate 34/78,
        // football 115/613.
        expect(record("karate").size).toEqual({ nodes: 34, edges: 78 });
        expect(record("college-football").size).toEqual({ nodes: 115, edges: 613 });
    });
});

describe("sampleSizeString", () => {
    it("returns the exact strings the board draws for all three rows", () => {
        expect(sampleSizeString(record("karate").size)).toBe("34 nodes, 78 edges");
        expect(sampleSizeString(record("cat-social-network").size)).toBe("20 nodes, 29 edges");
        expect(sampleSizeString(record("college-football").size)).toBe("115 nodes, 613 edges");
    });

    it("groups thousands with an ASCII comma", () => {
        expect(sampleSizeString({ nodes: 65000, edges: 210000 })).toBe("65,000 nodes, 210,000 edges");
    });

    it("appends the MB clause only when a record carries bytes", () => {
        expect(sampleSizeString({ nodes: 65000, edges: 210000, bytes: 14_000_000 })).toBe(
            "65,000 nodes, 210,000 edges, 14 MB",
        );
        expect(sampleSizeString({ nodes: 34, edges: 78 })).not.toContain("MB");
    });

    it("rounds the MB clause to the nearest whole megabyte", () => {
        expect(sampleSizeString({ nodes: 1, edges: 0, bytes: 13_600_000 })).toBe("1 nodes, 0 edges, 14 MB");
        expect(sampleSizeString({ nodes: 1, edges: 0, bytes: 13_400_000 })).toBe("1 nodes, 0 edges, 13 MB");
    });

    it("handles an empty graph without inventing a clause", () => {
        expect(sampleSizeString({ nodes: 0, edges: 0 })).toBe("0 nodes, 0 edges");
    });
});

describe("findSample", () => {
    it("finds each shipped record", () => {
        for (const entry of SAMPLE_MANIFEST) {
            expect(findSample(entry.id)).toBe(entry);
        }
    });

    it("returns undefined for an id that is not in the library", () => {
        // The three deferred rows are the realistic misses.
        expect(findSample("fraud-ring")).toBeUndefined();
        expect(findSample("patent-citations")).toBeUndefined();
        expect(findSample("")).toBeUndefined();
    });
});

describe("the frozen section strings", () => {
    it("keeps SAV-2's hint verbatim", () => {
        expect(SAMPLE_SECTION_HINT).toBe("Click one to load it");
    });

    it("keeps the section name verbatim on both surfaces", () => {
        expect(SAMPLE_SECTION_NAME).toBe("Sample datasets");
    });
});
