/**
 * @file The words a picker and a legend read off an algorithm entry: a plain sentence per result
 * field, the aliases a search box matches, the essential options, and a heading per category.
 *
 * A consumer that renders an Analyze menu or a legend must hold no per-algorithm list of its own,
 * so every built-in entry has to carry all of them. These tests loop over the whole table and
 * fail naming the entry and the field that is missing.
 */

import { assert, describe, it } from "vitest";

import { BUILT_IN_ALGORITHMS } from "../../src/catalog/algorithms";
import { SESSION_CATALOG_TABLES } from "../../src/session/catalog";

/**
 * The options each built-in marks essential. Written out, so a mark that goes missing -- or one
 * that appears on an option nobody chose -- fails here rather than changing a picker silently.
 */
const ESSENTIAL: Readonly<Record<string, readonly string[]>> = {
    degree: [],
    betweenness: [],
    closeness: [],
    pagerank: ["dampingFactor", "weight"],
    eigenvector: [],
    katz: ["alpha"],
    hits: [],
    louvain: ["resolution"],
    leiden: ["resolution"],
    "label-propagation": [],
    "girvan-newman": ["maxCommunities"],
    components: ["strength"],
    "shortest-path": ["source", "target"],
    "all-pairs-distance": [],
    bfs: ["source"],
    dfs: ["source"],
    kruskal: [],
    prim: ["startNode"],
    "bipartite-matching": [],
    "max-flow": ["source", "sink"],
    "min-cut": ["source", "sink"],
    "k-core": [],
    "clustering-coefficient": [],
    "link-prediction": ["method", "topK"],
};

describe("reader words on the algorithm catalog", () => {
    it("gives every result field of every entry a plain sentence, and no sentence to a field it lacks", () => {
        for (const descriptor of BUILT_IN_ALGORITHMS) {
            const names = new Set(descriptor.fields.map((field) => field.name));
            for (const name of names) {
                const sentence = descriptor.sentence[name];
                assert.isString(sentence, `${descriptor.key}.${name} has no sentence`);
                assert.match(
                    sentence,
                    /^[A-Z0-9].*\.$/,
                    `${descriptor.key}.${name}: one sentence, capital to full stop`,
                );
                assert.notMatch(sentence, /[^\x20-\x7e]/, `${descriptor.key}.${name}: plain ASCII`);
                assert.notInclude(sentence, "{", `${descriptor.key}.${name}: an unfilled placeholder`);
            }
            for (const name of Object.keys(descriptor.sentence)) {
                assert.isTrue(
                    names.has(name),
                    `${descriptor.key} has a sentence for ${name}, which it does not publish`,
                );
            }
        }
    });

    it("gives every entry at least one lowercase alias, none repeating its own name", () => {
        for (const descriptor of BUILT_IN_ALGORITHMS) {
            assert.isAbove(descriptor.aliases.length, 0, `${descriptor.key} has no alias`);
            assert.strictEqual(
                new Set(descriptor.aliases).size,
                descriptor.aliases.length,
                `${descriptor.key}: repeated alias`,
            );
            for (const alias of descriptor.aliases) {
                assert.strictEqual(alias, alias.trim().toLowerCase(), `${descriptor.key}: "${alias}" is not lowercase`);
                assert.notStrictEqual(
                    alias,
                    descriptor.plainName.toLowerCase(),
                    `${descriptor.key}: alias repeats plainName`,
                );
            }
        }
    });

    it("finds Betweenness by 'brokers' and the community entries by 'groups'", () => {
        const matching = (word: string): string[] =>
            BUILT_IN_ALGORITHMS.filter((d) => d.aliases.includes(word)).map((d) => d.key);

        assert.include(matching("brokers"), "betweenness");
        assert.includeMembers(matching("groups"), ["louvain", "leiden", "label-propagation", "girvan-newman"]);
    });

    it("marks exactly the essential options, and never an advanced one", () => {
        assert.sameMembers(
            Object.keys(ESSENTIAL),
            BUILT_IN_ALGORITHMS.map((d) => d.key),
            "the expected list names every built-in",
        );
        for (const descriptor of BUILT_IN_ALGORITHMS) {
            const essential = descriptor.options.filter((option) => option.essential === true);
            assert.sameMembers(
                essential.map((option) => option.name),
                [...ESSENTIAL[descriptor.key]],
                `${descriptor.key} essentials`,
            );
            for (const option of essential) {
                assert.notStrictEqual(
                    option.advanced,
                    true,
                    `${descriptor.key}.${option.name} is essential and advanced`,
                );
            }
        }
    });

    it("gives every built-in category a reader heading, and passes an unknown one through", () => {
        const { categoryLabel } = SESSION_CATALOG_TABLES;
        assert.strictEqual(categoryLabel("centrality"), "Rank nodes");
        assert.strictEqual(categoryLabel("community"), "Find groups");
        for (const category of new Set(BUILT_IN_ALGORITHMS.map((d) => d.category))) {
            const label = categoryLabel(category);
            assert.notStrictEqual(label, category, `${category} has no heading`);
            assert.match(label, /^[A-Z][a-z ]+$/, `${category}: a short plain heading`);
        }
        assert.strictEqual(categoryLabel("custom"), "Custom", "the category defineAlgorithm gives every definition");
        assert.strictEqual(categoryLabel("similarity"), "similarity", "a plugin's own category reads as written");
    });

    it("survives JSON, like the rest of the descriptor", () => {
        const pagerank = BUILT_IN_ALGORITHMS.find((d) => d.key === "pagerank");
        assert.isDefined(pagerank);
        const copy = JSON.parse(JSON.stringify(pagerank)) as typeof pagerank;
        assert.deepEqual(copy?.sentence, pagerank?.sentence);
        assert.deepEqual(copy?.aliases, pagerank?.aliases);
    });
});
