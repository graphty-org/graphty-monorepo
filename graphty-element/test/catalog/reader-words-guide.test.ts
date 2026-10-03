/**
 * @file The "Building an algorithm menu" example in the algorithms guide
 * (`docs/guide/algorithms.md`), run on a standalone session so the documented code keeps working.
 * The guide reaches the same catalog as `element.session.catalog`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

describe("the algorithms guide's menu example", () => {
    it("groups a search under plain headings and reads a short form and a legend sentence", () => {
        const session = createGraphSession();
        const { catalog } = session;
        const search = "brokers";

        // Group the matching algorithms under plain headings
        const menu = new Map<string, string[]>();
        for (const algorithm of catalog.algorithms()) {
            const words = [algorithm.plainName, algorithm.technicalName, ...(algorithm.aliases ?? [])];
            if (!words.some((word) => word.toLowerCase().includes(search))) {
                continue;
            }
            const heading = catalog.categoryLabel(algorithm.category);
            menu.set(heading, [...(menu.get(heading) ?? []), algorithm.technicalName]);
        }
        assert.deepEqual([...menu], [["Ranks nodes", ["Betweenness centrality"]]]);

        // A short form for PageRank, and the sentence a legend shows beside its colors
        const pagerank = catalog.algorithms().find((algorithm) => algorithm.key === "pagerank");
        assert.deepEqual(
            pagerank?.options.filter((option) => option.essential).map((option) => option.name),
            ["dampingFactor", "weight"],
        );
        assert.strictEqual(pagerank?.sentence?.value, "A node scores high when well-connected nodes link to it.");

        session.dispose();
    });
});
