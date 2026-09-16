import { describe, expect, it } from "vitest";

import {
    INSIGHT_ACTION_LABEL,
    insightCandidates,
    type InsightCapability,
    INSIGHTS_CARD_CAP,
    INSIGHTS_ESTIMATE_CEILING_SECONDS,
    type InsightsGraphShape,
    insightsStripModel,
    isSliceAvailable,
    NARROW_VIEW_NODE_FLOOR,
    SLICE_AVAILABLE_CAPABILITIES,
} from "../insightsRules";

const LARGE_GRAPH_THRESHOLD = 100000;

/**
 * The cat social network as the shell measures it: 20 nodes, 29 edges, direction never
 * read off the data, no time role, no validation pass. Main.dc.html:702.
 * @param overrides - fields to change.
 * @returns the shape.
 */
function catShape(overrides: Partial<InsightsGraphShape> = {}): InsightsGraphShape {
    return {
        nodeCount: 20,
        edgeCount: 29,
        directedness: "unknown",
        hasTimeRole: false,
        validationIssueTypeCount: 0,
        searchExample: "Mr_Whiskers",
        largeGraphThreshold: LARGE_GRAPH_THRESHOLD,
        ...overrides,
    };
}

/**
 * The InsightsWide worked example: the synthetic fraud ring, 200 nodes, 612 edges,
 * directed, a time attribute and four validation warning types.
 * InsightsWide.dc.html:22 to 28.
 * @param overrides - fields to change.
 * @returns the shape.
 */
function fraudShape(overrides: Partial<InsightsGraphShape> = {}): InsightsGraphShape {
    return {
        nodeCount: 200,
        edgeCount: 612,
        directedness: "directed",
        hasTimeRole: true,
        validationIssueTypeCount: 4,
        searchExample: "merch-88",
        largeGraphThreshold: LARGE_GRAPH_THRESHOLD,
        ...overrides,
    };
}

/**
 * A graph above the threshold. The threshold is an input, so a small node count with a
 * small threshold exercises the above-threshold branch below the Narrow-the-view floor.
 * @param overrides - fields to change.
 * @returns the shape.
 */
function largeShape(overrides: Partial<InsightsGraphShape> = {}): InsightsGraphShape {
    return {
        nodeCount: 318000,
        edgeCount: 1104000,
        directedness: "unknown",
        hasTimeRole: false,
        validationIssueTypeCount: 0,
        searchExample: "dc01.corp.local",
        largeGraphThreshold: LARGE_GRAPH_THRESHOLD,
        ...overrides,
    };
}

/**
 * The capabilities of a card list, in order.
 * @param cards - the cards.
 * @returns their capabilities.
 */
function capabilitiesOf(cards: readonly { readonly capability: InsightCapability }[]): InsightCapability[] {
    return cards.map((card) => card.capability);
}

/**
 * The titles of a card list, in order. The slice's acceptance criteria are written in
 * the drawn titles ("Who has influence"), not in capability ids, so the assertions that
 * stand for a reader read the same way.
 * @param cards - the cards.
 * @returns their titles.
 */
function titlesOf(cards: readonly { readonly title: string }[]): string[] {
    return cards.map((card) => card.title);
}

/**
 * A 500-node graph, comfortably below the threshold and comfortably above rule 5's
 * 20-node floor -- the size at which all three centrality cards are live at once.
 * @param overrides - fields to change.
 * @returns the shape.
 */
function centralityShape(overrides: Partial<InsightsGraphShape> = {}): InsightsGraphShape {
    return {
        nodeCount: 500,
        edgeCount: 1840,
        directedness: "undirected",
        hasTimeRole: false,
        validationIssueTypeCount: 0,
        searchExample: "node-17",
        largeGraphThreshold: LARGE_GRAPH_THRESHOLD,
        ...overrides,
    };
}

/**
 * Every member of the {@link InsightCapability} union, written out. The annotation is
 * the compile-time half of the membership guard below: a string that is not a member
 * cannot be added here, and the union cannot gain a member without this list being
 * updated to match the rule table it indexes.
 */
const ALL_INSIGHT_CAPABILITIES: readonly InsightCapability[] = [
    "centrality-betweenness",
    "centrality-degree",
    "centrality-pagerank",
    "community-detection",
    "component-analysis",
    "data-validation",
    "narrow-the-view",
    "search",
    "temporal-navigation",
];

describe("insightCandidates", () => {
    describe("the cat graph the reference shell draws", () => {
        it("yields exactly the three cards Main.dc.html draws", () => {
            expect(capabilitiesOf(insightCandidates(catShape()))).toEqual([
                "community-detection",
                "centrality-degree",
                "search",
            ]);
        });

        it("draws the frozen copy for each of those three cards", () => {
            const [groups, connected, search] = insightCandidates(catShape());

            expect(groups).toEqual({
                id: "community-detection",
                capability: "community-detection",
                title: "Find groups",
                technicalName: "Communities, Louvain",
                body: "Cluster nodes that interact more with each other than with the rest.",
                actionLabel: "Try it",
            });
            expect(connected).toEqual({
                id: "centrality-degree",
                capability: "centrality-degree",
                title: "Who is most connected",
                technicalName: "Degree centrality",
                body: "Rank nodes by how many links they have.",
                actionLabel: "Try it",
            });
            expect(search).toEqual({
                id: "search",
                capability: "search",
                title: "Search for something you know",
                technicalName: "Search",
                body: "Type a name like Mr_Whiskers to find it on the canvas.",
                actionLabel: "Try it",
            });
        });
    });

    describe("rule 1, validation warnings", () => {
        it("does not fire when nothing has counted an issue", () => {
            expect(capabilitiesOf(insightCandidates(catShape()))).not.toContain("data-validation");
        });

        it("leads with the card, counting issue KINDS, when there are issues", () => {
            const [first] = insightCandidates(catShape({ validationIssueTypeCount: 4 }));

            expect(first.capability).toBe("data-validation");
            expect(first.title).toBe("Check 4 data issues");
            expect(first.technicalName).toBe("Data validation");
            expect(first.body).toBe("Open the validation report to see what needs attention.");
        });
    });

    describe("rule 2, always", () => {
        it("offers Find groups on every graph below the threshold", () => {
            expect(capabilitiesOf(insightCandidates(catShape()))).toContain("community-detection");
            expect(capabilitiesOf(insightCandidates(fraudShape()))).toContain("community-detection");
            expect(capabilitiesOf(insightCandidates(catShape({ nodeCount: 2, edgeCount: 1 })))).toContain(
                "community-detection",
            );
        });
    });

    describe("rules 3 and 4, influence versus degree", () => {
        it("offers PageRank and not degree on a measured directed graph", () => {
            const capabilities = capabilitiesOf(insightCandidates(catShape({ directedness: "directed" })));

            expect(capabilities).toContain("centrality-pagerank");
            expect(capabilities).not.toContain("centrality-degree");
        });

        it("offers degree and not PageRank on a measured undirected graph", () => {
            const capabilities = capabilitiesOf(insightCandidates(catShape({ directedness: "undirected" })));

            expect(capabilities).toContain("centrality-degree");
            expect(capabilities).not.toContain("centrality-pagerank");
        });

        it("treats unmeasured direction as not directed, so degree is offered", () => {
            const capabilities = capabilitiesOf(insightCandidates(catShape({ directedness: "unknown" })));

            expect(capabilities).toContain("centrality-degree");
            expect(capabilities).not.toContain("centrality-pagerank");
        });

        it("offers degree on a directed graph whose PageRank estimate the ceiling refuses", () => {
            const capabilities = capabilitiesOf(
                insightCandidates(
                    catShape({
                        directedness: "directed",
                        estimateSeconds: { "centrality-pagerank": INSIGHTS_ESTIMATE_CEILING_SECONDS + 1 },
                    }),
                ),
            );

            expect(capabilities).not.toContain("centrality-pagerank");
            expect(capabilities).toContain("centrality-degree");
        });

        it("keeps degree off a directed graph whose PageRank estimate is under the ceiling", () => {
            const capabilities = capabilitiesOf(
                insightCandidates(
                    catShape({
                        directedness: "directed",
                        estimateSeconds: { "centrality-pagerank": INSIGHTS_ESTIMATE_CEILING_SECONDS - 1 },
                    }),
                ),
            );

            expect(capabilities).toContain("centrality-pagerank");
            expect(capabilities).not.toContain("centrality-degree");
        });
    });

    describe("rule 5, bridges above 20 nodes", () => {
        it("is not offered at exactly 20 nodes", () => {
            expect(capabilitiesOf(insightCandidates(catShape({ nodeCount: 20 })))).not.toContain(
                "centrality-betweenness",
            );
        });

        it("is offered at 21 nodes", () => {
            expect(capabilitiesOf(insightCandidates(catShape({ nodeCount: 21 })))).toContain("centrality-betweenness");
        });

        it("is never offered above the threshold", () => {
            expect(capabilitiesOf(insightCandidates(largeShape()))).not.toContain("centrality-betweenness");
        });
    });

    describe("rule 6, a time role", () => {
        it("is not offered until a time role is assigned", () => {
            expect(capabilitiesOf(insightCandidates(catShape()))).not.toContain("temporal-navigation");
        });

        it("is offered once one is", () => {
            const [card] = insightCandidates(catShape({ hasTimeRole: true })).filter(
                (candidate) => candidate.capability === "temporal-navigation",
            );

            expect(card.title).toBe("See how it changed over time");
            expect(card.technicalName).toBe("Time slider");
        });
    });

    describe("rule 7 and the rest of the above-threshold set", () => {
        it("replaces the table with the deterministic set ExplorerLargeGraph draws", () => {
            expect(capabilitiesOf(insightCandidates(largeShape()))).toEqual([
                "narrow-the-view",
                "component-analysis",
                "centrality-degree",
                "search",
            ]);
        });

        it("leads with the validation card when there are issues", () => {
            expect(capabilitiesOf(insightCandidates(largeShape({ validationIssueTypeCount: 4 })))).toEqual([
                "data-validation",
                "narrow-the-view",
                "component-analysis",
                "centrality-degree",
                "search",
            ]);
        });

        it("adds 'Exact ids are fastest.' to the search body", () => {
            const [search] = insightCandidates(largeShape()).filter((card) => card.capability === "search");

            expect(search.body).toBe("Try dc01.corp.local. Exact ids are fastest.");
        });

        it("draws the frozen Narrow the view copy, with the one-line comma collapse", () => {
            const [narrow] = insightCandidates(largeShape()).filter(
                (card) => card.capability === "narrow-the-view",
            );

            expect(narrow.title).toBe("Narrow the view");
            expect(narrow.technicalName).toBe("Filter builder, Explore");
            expect(narrow.body).toBe("Filter by type, attribute, or a result you have already run.");
        });
    });

    describe("the Narrow the view node floor", () => {
        it("is absent at exactly the floor", () => {
            const shape = largeShape({ nodeCount: NARROW_VIEW_NODE_FLOOR, largeGraphThreshold: 1000 });

            expect(capabilitiesOf(insightCandidates(shape))).not.toContain("narrow-the-view");
        });

        it("is present one node above the floor", () => {
            const shape = largeShape({ nodeCount: NARROW_VIEW_NODE_FLOOR + 1, largeGraphThreshold: 1000 });

            expect(capabilitiesOf(insightCandidates(shape))).toContain("narrow-the-view");
        });

        it("is present at 60,000 nodes, which exceeds the floor", () => {
            const shape = largeShape({ nodeCount: 60000, largeGraphThreshold: 1000 });

            expect(capabilitiesOf(insightCandidates(shape))).toContain("narrow-the-view");
        });
    });

    describe("the 60 s estimate ceiling", () => {
        it("refuses Find groups above the threshold when nothing estimated it", () => {
            expect(capabilitiesOf(insightCandidates(largeShape()))).not.toContain("community-detection");
        });

        it("offers Find groups above the threshold under an estimate of 25 s", () => {
            const shape = largeShape({ estimateSeconds: { "community-detection": 25 } });

            expect(capabilitiesOf(insightCandidates(shape))).toContain("community-detection");
        });

        it("refuses Find groups above the threshold at an estimate of 90 s", () => {
            const shape = largeShape({ estimateSeconds: { "community-detection": 90 } });

            expect(capabilitiesOf(insightCandidates(shape))).not.toContain("community-detection");
        });

        it("refuses a card at exactly the ceiling and keeps it one second below, below the threshold too", () => {
            const atCeiling = catShape({
                estimateSeconds: { "community-detection": INSIGHTS_ESTIMATE_CEILING_SECONDS },
            });
            const underCeiling = catShape({
                estimateSeconds: { "community-detection": INSIGHTS_ESTIMATE_CEILING_SECONDS - 1 },
            });

            expect(capabilitiesOf(insightCandidates(atCeiling))).not.toContain("community-detection");
            expect(capabilitiesOf(insightCandidates(underCeiling))).toContain("community-detection");
        });

        it("keeps the deterministic set above the threshold even though nothing estimated it", () => {
            expect(capabilitiesOf(insightCandidates(largeShape()))).toEqual([
                "narrow-the-view",
                "component-analysis",
                "centrality-degree",
                "search",
            ]);
        });
    });

    describe("the search card", () => {
        it("is last whenever it is offered", () => {
            const candidates = insightCandidates(fraudShape());

            expect(candidates[candidates.length - 1].capability).toBe("search");
        });

        it("is absent with no example to name", () => {
            expect(capabilitiesOf(insightCandidates(catShape({ searchExample: undefined })))).not.toContain("search");
            expect(capabilitiesOf(insightCandidates(catShape({ searchExample: "" })))).not.toContain("search");
        });
    });

    it("labels every card with the one affordance string", () => {
        for (const card of insightCandidates(fraudShape())) {
            expect(card.actionLabel).toBe(INSIGHT_ACTION_LABEL);
            expect(card.id).toBe(card.capability);
        }
    });
});

describe("insightsStripModel", () => {
    describe("the InsightsWide worked example", () => {
        it("finds six candidates", () => {
            expect(capabilitiesOf(insightCandidates(fraudShape()))).toEqual([
                "data-validation",
                "community-detection",
                "centrality-pagerank",
                "centrality-betweenness",
                "temporal-navigation",
                "search",
            ]);
        });

        it("shows cards 1, 2, 3 and Search, and reports the two the cap dropped", () => {
            const model = insightsStripModel(fraudShape(), []);

            expect(capabilitiesOf(model.cards)).toEqual([
                "data-validation",
                "community-detection",
                "centrality-pagerank",
                "search",
            ]);
            expect(model.droppedCount).toBe(2);
            expect(capabilitiesOf(model.droppedCards)).toEqual(["centrality-betweenness", "temporal-navigation"]);
        });

        it("never shows more than the cap", () => {
            expect(insightsStripModel(fraudShape(), []).cards.length).toBeLessThanOrEqual(INSIGHTS_CARD_CAP);
        });
    });

    describe("the cat graph", () => {
        it("shows all three candidates and drops none", () => {
            const model = insightsStripModel(catShape(), []);

            expect(capabilitiesOf(model.cards)).toEqual(["community-detection", "centrality-degree", "search"]);
            expect(model.droppedCount).toBe(0);
            expect(model.droppedCards).toEqual([]);
        });
    });

    describe("retirement", () => {
        it("removes a retired card and promotes one the cap had dropped", () => {
            const model = insightsStripModel(fraudShape(), ["community-detection"]);

            expect(capabilitiesOf(model.cards)).toEqual([
                "data-validation",
                "centrality-pagerank",
                "centrality-betweenness",
                "search",
            ]);
            expect(model.droppedCount).toBe(1);
            expect(capabilitiesOf(model.droppedCards)).toEqual(["temporal-navigation"]);
        });

        it("can retire the search card too", () => {
            const model = insightsStripModel(catShape(), ["search"]);

            expect(capabilitiesOf(model.cards)).toEqual(["community-detection", "centrality-degree"]);
        });

        it("ignores a retired capability the table never offered", () => {
            const model = insightsStripModel(catShape(), ["narrow-the-view", "not-a-capability"]);

            expect(capabilitiesOf(model.cards)).toEqual(["community-detection", "centrality-degree", "search"]);
        });
    });

    describe("above the threshold", () => {
        it("keeps Search and drops the lowest-priority card when five candidates survive", () => {
            const model = insightsStripModel(largeShape({ validationIssueTypeCount: 4 }), []);

            expect(capabilitiesOf(model.cards)).toEqual([
                "data-validation",
                "narrow-the-view",
                "component-analysis",
                "search",
            ]);
            expect(capabilitiesOf(model.droppedCards)).toEqual(["centrality-degree"]);
        });

        it("shows Find groups as the extra card when it fits under the cap and the ceiling", () => {
            const model = insightsStripModel(
                largeShape({
                    nodeCount: 2000,
                    largeGraphThreshold: 1000,
                    estimateSeconds: { "community-detection": 25 },
                }),
                [],
            );

            expect(capabilitiesOf(model.cards)).toEqual([
                "component-analysis",
                "centrality-degree",
                "community-detection",
                "search",
            ]);
            expect(model.droppedCount).toBe(0);
        });
    });
});

describe("SLICE_AVAILABLE_CAPABILITIES", () => {
    it("is the five capabilities this slice can complete end to end", () => {
        expect(SLICE_AVAILABLE_CAPABILITIES).toEqual([
            "centrality-betweenness",
            "centrality-degree",
            "centrality-pagerank",
            "community-detection",
            "search",
        ]);
    });

    it("holds exactly five entries, every one of them a member of the capability union", () => {
        const declared: readonly InsightCapability[] = SLICE_AVAILABLE_CAPABILITIES;

        expect(declared).toHaveLength(5);

        for (const capability of declared) {
            expect(ALL_INSIGHT_CAPABILITIES).toContain(capability);
        }
    });

    it("reports availability per capability, now that the slice runs the three centralities", () => {
        expect(isSliceAvailable("centrality-degree")).toBe(true);
        expect(isSliceAvailable("centrality-pagerank")).toBe(true);
        expect(isSliceAvailable("centrality-betweenness")).toBe(true);
        expect(isSliceAvailable("community-detection")).toBe(true);
        expect(isSliceAvailable("search")).toBe(true);
    });

    it("still refuses the four capabilities nothing can run, open or read", () => {
        expect(isSliceAvailable("component-analysis")).toBe(false);
        expect(isSliceAvailable("data-validation")).toBe(false);
        expect(isSliceAvailable("narrow-the-view")).toBe(false);
        expect(isSliceAvailable("temporal-navigation")).toBe(false);
    });

    it("leaves the cat graph with all three of its cards once filtered, degree included", () => {
        const shown = insightsStripModel(catShape(), []).cards.filter((card) => isSliceAvailable(card.capability));

        expect(capabilitiesOf(shown)).toEqual(["community-detection", "centrality-degree", "search"]);
    });
});

describe("the three centrality cards at 500 nodes", () => {
    it("draws Who has influence on a directed graph with nothing retired and nothing estimated", () => {
        const model = insightsStripModel(centralityShape({ directedness: "directed" }), []);

        expect(titlesOf(model.cards)).toContain("Who has influence");
        expect(model.cards.every((card) => isSliceAvailable(card.capability))).toBe(true);
    });

    it("draws Who is most connected on an undirected graph of the same size", () => {
        const model = insightsStripModel(centralityShape(), []);

        expect(titlesOf(model.cards)).toContain("Who is most connected");
        expect(model.cards.every((card) => isSliceAvailable(card.capability))).toBe(true);
    });

    it("draws Find the bridges at 500 nodes below the threshold", () => {
        expect(titlesOf(insightsStripModel(centralityShape(), []).cards)).toContain("Find the bridges");
    });

    it("does not draw Find the bridges at 20 nodes or fewer", () => {
        expect(titlesOf(insightsStripModel(centralityShape({ nodeCount: 20 }), []).cards)).not.toContain(
            "Find the bridges",
        );
        expect(titlesOf(insightsStripModel(centralityShape({ nodeCount: 8 }), []).cards)).not.toContain(
            "Find the bridges",
        );
    });

    it("does not draw Find the bridges above the large-graph threshold", () => {
        const shape = centralityShape({ nodeCount: 500, largeGraphThreshold: 400 });

        expect(titlesOf(insightsStripModel(shape, []).cards)).not.toContain("Find the bridges");
    });

    it("refuses the bridges card at a 120 s estimate while still offering degree at 0.1 s", () => {
        const shape = centralityShape({
            estimateSeconds: { "centrality-betweenness": 120, "centrality-degree": 0.1 },
        });
        const titles = titlesOf(insightsStripModel(shape, []).cards);

        expect(titles).not.toContain("Find the bridges");
        expect(titles).toContain("Who is most connected");
    });

    it("frees the retired centrality's cap slot, so four cards are still drawn", () => {
        const withNothingRetired = insightsStripModel(fraudShape(), []);
        const withInfluenceRetired = insightsStripModel(fraudShape(), ["centrality-pagerank"]);

        expect(capabilitiesOf(withNothingRetired.cards)).toEqual([
            "data-validation",
            "community-detection",
            "centrality-pagerank",
            "search",
        ]);
        expect(withInfluenceRetired.cards).toHaveLength(INSIGHTS_CARD_CAP);
        expect(capabilitiesOf(withInfluenceRetired.cards)).toEqual([
            "data-validation",
            "community-detection",
            "centrality-betweenness",
            "search",
        ]);
        expect(capabilitiesOf(withInfluenceRetired.droppedCards)).toEqual(["temporal-navigation"]);
    });
});
