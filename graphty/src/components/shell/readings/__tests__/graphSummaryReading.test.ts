import { describe, expect, it } from "vitest";

import { DEFAULT_EDGE_NOUN, GRAPH_SUMMARY_EMPTY_READING, graphSummaryReading } from "../graphSummaryReading";

describe("graphSummaryReading", () => {
    describe("the cat fixture, which is what this slice ships", () => {
        it("reads the shipped string character for character", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 20,
                    edgeCount: 29,
                    edgeNoun: DEFAULT_EDGE_NOUN,
                    connectedPartCount: 1,
                    largestPartNodeCount: 20,
                }),
            ).toBe("20 nodes, connected by 29 relationships. One connected part holds all 20 nodes.");
        });
    });

    describe("sentence 1, the node clause", () => {
        it("is a bare node count when no type role has named the types", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 200,
                    edgeCount: 612,
                    edgeNoun: "transactions",
                    connectedPartCount: 1,
                    largestPartNodeCount: 200,
                }),
            ).toBe("200 nodes, connected by 612 transactions. One connected part holds all 200 nodes.");
        });

        it("is a bare node count when nodeTypes is present but empty", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 200,
                    edgeCount: 612,
                    edgeNoun: "transactions",
                    nodeTypes: [],
                    connectedPartCount: 1,
                    largestPartNodeCount: 200,
                }),
            ).toBe("200 nodes, connected by 612 transactions. One connected part holds all 200 nodes.");
        });

        it("names a single type without an 'and'", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 318,
                    edgeCount: 1104,
                    edgeNoun: "interactions",
                    nodeTypes: [{ plural: "proteins", count: 318 }],
                    connectedPartCount: 1,
                    largestPartNodeCount: 318,
                }),
            ).toBe("318 proteins, connected by 1,104 interactions. One connected part holds all 318 nodes.");
        });

        it("names at most three types, largest first, then the other-types clause", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 200,
                    edgeCount: 612,
                    edgeNoun: "transactions",
                    nodeTypes: [
                        { plural: "accounts", count: 96 },
                        { plural: "devices", count: 48 },
                        { plural: "phone numbers", count: 34 },
                        { plural: "merchants", count: 22 },
                    ],
                    otherNodeTypeCount: 1,
                    connectedPartCount: 1,
                    largestPartNodeCount: 200,
                }),
            ).toBe(
                "96 accounts, 48 devices and 34 phone numbers, and 1 other type, connected by 612 transactions. One connected part holds all 200 nodes.",
            );
        });

        it("drops the other-types clause when nothing was hidden", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 20,
                    edgeCount: 29,
                    edgeNoun: DEFAULT_EDGE_NOUN,
                    nodeTypes: [
                        { plural: "cats", count: 17 },
                        { plural: "dog", count: 1 },
                        { plural: "humans", count: 2 },
                    ],
                    otherNodeTypeCount: 0,
                    connectedPartCount: 1,
                    largestPartNodeCount: 20,
                }),
            ).toBe(
                "17 cats, 1 dog and 2 humans, connected by 29 relationships. One connected part holds all 20 nodes.",
            );
        });
    });

    describe("sentence 2, first matching branch only", () => {
        it("uses the exact diameter when there is one and the graph is one part -- spec 5817", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 20,
                    edgeCount: 29,
                    edgeNoun: DEFAULT_EDGE_NOUN,
                    nodeTypes: [
                        { plural: "cats", count: 17 },
                        { plural: "dog", count: 1 },
                        { plural: "humans", count: 2 },
                    ],
                    connectedPartCount: 1,
                    largestPartNodeCount: 20,
                    exactDiameter: 5,
                }),
            ).toBe(
                "17 cats, 1 dog and 2 humans, connected by 29 relationships. Everyone is connected to everyone else through at most 5 steps.",
            );
        });

        it("refuses the diameter sentence when the graph is more than one part", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 20,
                    edgeCount: 29,
                    edgeNoun: DEFAULT_EDGE_NOUN,
                    connectedPartCount: 3,
                    largestPartNodeCount: 18,
                    exactDiameter: 5,
                }),
            ).toBe(
                "20 nodes, connected by 29 relationships. One connected part holds 90% of nodes; 2 small parts hold the rest.",
            );
        });

        it("uses the sampled estimate ahead of the single-part sentence -- spec 5850", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 200,
                    edgeCount: 612,
                    edgeNoun: DEFAULT_EDGE_NOUN,
                    connectedPartCount: 1,
                    largestPartNodeCount: 200,
                    sampledMeanDistance: { steps: 6, sampleSize: 100 },
                }),
            ).toBe(
                "200 nodes, connected by 612 relationships. A typical pair is about 6 steps apart (estimated from 100 samples).",
            );
        });

        it("prefers the exact diameter over a sampled estimate", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 200,
                    edgeCount: 612,
                    edgeNoun: DEFAULT_EDGE_NOUN,
                    connectedPartCount: 1,
                    largestPartNodeCount: 200,
                    exactDiameter: 4,
                    sampledMeanDistance: { steps: 6, sampleSize: 100 },
                }),
            ).toBe(
                "200 nodes, connected by 612 relationships. Everyone is connected to everyone else through at most 4 steps.",
            );
        });

        it("adds '(mostly single nodes)' only when the flag is true", () => {
            const base = {
                nodeCount: 10,
                edgeCount: 8,
                edgeNoun: DEFAULT_EDGE_NOUN,
                connectedPartCount: 4,
                largestPartNodeCount: 7,
            };

            expect(graphSummaryReading(base)).toBe(
                "10 nodes, connected by 8 relationships. One connected part holds 70% of nodes; 3 small parts hold the rest.",
            );
            expect(graphSummaryReading({ ...base, smallPartsMostlySingleNodes: false })).toBe(
                "10 nodes, connected by 8 relationships. One connected part holds 70% of nodes; 3 small parts hold the rest.",
            );
            expect(graphSummaryReading({ ...base, smallPartsMostlySingleNodes: true })).toBe(
                "10 nodes, connected by 8 relationships. One connected part holds 70% of nodes; 3 small parts (mostly single nodes) hold the rest.",
            );
        });

        it("makes one small part singular in both the noun and the verb", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 10,
                    edgeCount: 8,
                    edgeNoun: DEFAULT_EDGE_NOUN,
                    connectedPartCount: 2,
                    largestPartNodeCount: 9,
                }),
            ).toBe(
                "10 nodes, connected by 8 relationships. One connected part holds 90% of nodes; 1 small part holds the rest.",
            );
        });
    });

    describe("above the threshold", () => {
        it("reproduces spec 5845-5849's worked example exactly", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 1100000,
                    edgeCount: 10004112,
                    edgeNoun: DEFAULT_EDGE_NOUN,
                    nodeTypes: [
                        { plural: "users", count: 612341 },
                        { plural: "devices", count: 388499 },
                        { plural: "domains", count: 41000 },
                    ],
                    otherNodeTypeCount: 37,
                    connectedPartCount: 48001,
                    largestPartNodeCount: 1001000,
                    smallPartsMostlySingleNodes: true,
                }),
            ).toBe(
                "612,000 users, 388,000 devices and 41,000 domains, and 37 other types, connected by 10,000,000 relationships. One connected part holds 91% of nodes; 48,000 small parts (mostly single nodes) hold the rest.",
            );
        });

        it("reproduces the ExplorerLargeGraph sentence 2 shape", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 120418,
                    edgeCount: 1104206,
                    edgeNoun: "events",
                    connectedPartCount: 3141,
                    largestPartNodeCount: 111989,
                    smallPartsMostlySingleNodes: true,
                }).endsWith(
                    "One connected part holds 93% of nodes; 3,140 small parts (mostly single nodes) hold the rest.",
                ),
            ).toBe(true);
        });

        it("rounds the prose counts and leaves nothing exact in the sentence", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 120418,
                    edgeCount: 1104206,
                    edgeNoun: "events",
                    connectedPartCount: 1,
                    largestPartNodeCount: 120418,
                }),
            ).toBe("120,000 nodes, connected by 1,100,000 events. One connected part holds all 120,000 nodes.");
        });
    });

    describe("the empty state", () => {
        it("returns sentence 1 alone with nothing loaded", () => {
            expect(
                graphSummaryReading({
                    nodeCount: 0,
                    edgeCount: 0,
                    edgeNoun: DEFAULT_EDGE_NOUN,
                    connectedPartCount: 0,
                    largestPartNodeCount: 0,
                }),
            ).toBe("0 nodes, connected by 0 relationships.");
        });

        it("has its own prose for the caller that wants words instead", () => {
            expect(GRAPH_SUMMARY_EMPTY_READING).toBe(
                "Nothing is loaded yet. Open a file, a URL or pasted data to see a reading here.",
            );
        });
    });
});
