/**
 * @file The 3.0 migration guide lists every algorithm result that differs from 2.x on purpose.
 *
 * These differences were decided when the built-in algorithms moved onto the graph snapshot. A
 * reader upgrading from 2.x who sees a different PageRank or a new E_OPTION_RANGE error must find the reason in the guide, not only in a commit body.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

const GUIDE = readFileSync(join(__dirname, "../../docs/guide/migrating-to-3.md"), "utf8");

/**
 * The text of the section headed `heading`, up to the next second-level heading.
 * @param heading - the section's heading, without the leading `## `
 * @returns the section's text
 */
function section(heading: string): string {
    const start = GUIDE.indexOf(`\n## ${heading}\n`);
    assert.notStrictEqual(start, -1, `the guide has a "## ${heading}" section`);
    const end = GUIDE.indexOf("\n## ", start + 1);
    return GUIDE.slice(start, end === -1 ? undefined : end);
}

describe("migrating-to-3.md", () => {
    it("lists the traversal and path results that differ from 2.x", () => {
        const text = section("Some algorithm results differ from 2.x");
        for (const phrase of [
            "PageRank",
            "strongly connected components",
            "0.5",
            "Prim",
            "Bellman-Ford",
            "negative cycle",
            "E_OPTION_RANGE",
            "personalization",
            'acceleration: "required"',
            "E_NO_ACCELERATOR",
            "pre-order",
            "Prim start node",
            "Bellman-Ford source",
            'method: "power-iteration"',
            "useDelta",
        ]) {
            assert.include(text, phrase);
        }
    });

    it("lists the centrality, community, flow, cut, matching, all-pairs and link results", () => {
        const text = section("Some algorithm results differ from 2.x");
        for (const phrase of [
            "k-core",
            "self-loop",
            "Louvain",
            "useOptimized",
            "Label Propagation",
            "HITS `mode`",
            "Katz `mode`",
            "eigenvector centrality",
            "net flow",
            "capacity: 0",
            "fewer than two nodes",
            "`source` equal to the `sink`",
            "exactly first",
            "Stoer-Wagner",
            "s-t min cut",
            "Karger",
            "Bipartite matching",
            "Floyd-Warshall eccentricity",
            "5,792",
            "E_TOO_LARGE",
            "Adamic-Adar",
        ]) {
            assert.include(text, phrase);
        }
    });

    it("names the removed reportClampedWeights helper", () => {
        assert.include(section("SimpleLayoutEngine is deprecated"), "reportClampedWeights");
    });
});
