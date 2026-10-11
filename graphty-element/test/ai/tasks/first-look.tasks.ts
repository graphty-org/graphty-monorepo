/**
 * @file Tasks: a first look at a graph, data triage and loading data (W01, W14, W18).
 */

import { assert } from "vitest";

import { assertAnswered, defineTask, runOf } from "./kit";

/** Every algorithm that finds groups. */
export const COMMUNITY_ALGORITHMS = [
    "louvain",
    "leiden",
    "label-propagation",
    "girvan-newman",
    "markov-clustering",
    "spectral-clustering",
    "hierarchical-clustering",
] as const;

const EMPTY = { nodes: [], edges: [] };

const GRAPHML = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="kind" for="node" attr.name="kind" attr.type="string"/>
  <graph id="G" edgedefault="undirected">
    <node id="n1"><data key="kind">gene</data></node>
    <node id="n2"><data key="kind">protein</data></node>
    <node id="n3"><data key="kind">gene</data></node>
    <edge source="n1" target="n2"/>
    <edge source="n2" target="n3"/>
  </graph>
</graphml>`;

export const FIRST_LOOK_TASKS = [
    defineTask({
        id: "size-and-connectivity",
        source: ["W01", "explain this graph in 60 seconds"],
        tier: ["core"],
        dataset: "karate",
        prompts: ["How big is this graph, and is it all one connected piece?"],
        effects: [0],
        tools: [],
        reference: [[[{ tool: "query", args: { action: "statistics" } }]]],
        check: async ({ messages, oracle }) => {
            const stats = (await oracle()).data.statistics();
            assertAnswered(messages, "the node count", stats.nodeCount);
            assertAnswered(messages, "the edge count", stats.edgeCount);
        },
    }),
    defineTask({
        id: "directed-and-weighted",
        source: ["W01"],
        tier: ["core"],
        dataset: "celegans-neural",
        prompts: ["Is this network directed? Are the connections weighted?"],
        effects: [0],
        tools: [],
        reference: [[[{ tool: "query", args: { action: "statistics" } }]]],
        check: ({ messages }) => {
            assertAnswered(
                messages,
                "that it is directed",
                '"directed"',
                "is directed",
                "are directed",
                "directed network",
                "directed graph",
                "yes",
            );
            assertAnswered(messages, "that it is weighted", '"weighted":true', "weighted");
        },
    }),
    defineTask({
        id: "sample-records",
        source: ["W01"],
        tier: ["core"],
        dataset: "football",
        prompts: ["Show me five example teams with everything we know about them."],
        effects: [0],
        tools: [],
        reference: [[[{ tool: "query", args: { action: "nodes", where: "all", limit: 5 } }]]],
        check: ({ messages }) => {
            const page = messages[0].results.find(
                (result) => Array.isArray(result.body.data) && (result.body.data as unknown[]).length === 5,
            );
            assert.isDefined(page, "no tool result holds five records");
            for (const record of page.body.data as Record<string, unknown>[]) {
                assert.containsAllKeys(record, ["conference"], "a sample record lacks the team's conference");
            }
        },
    }),
    defineTask({
        id: "conference-breakdown",
        source: ["W01"],
        tier: ["core"],
        dataset: "football",
        prompts: ["What conferences are there, and how many teams are in each?"],
        effects: [0],
        tools: [],
        reference: [[[{ tool: "query", args: { action: "histogram", column: "conference" } }]]],
        check: ({ s, messages }) => {
            const counts = new Map<string, number>();
            for (const node of s.data.nodes()) {
                const conference = String((node as unknown as { conference: unknown }).conference);
                counts.set(conference, (counts.get(conference) ?? 0) + 1);
            }

            for (const [conference, count] of counts) {
                assertAnswered(messages, `the ${conference} conference`, conference);
                // Every count shows up somewhere; the largest is the one checked by value.
                if (count === Math.max(...counts.values())) {
                    assertAnswered(messages, `the ${conference} count`, count);
                }
            }
        },
    }),
    defineTask({
        id: "missing-values",
        source: ["W01", "data quality report before analysis"],
        tier: ["core"],
        dataset: "yeast-perturbation",
        prompts: ["Which attributes are missing values, and for how many nodes?"],
        effects: [0],
        tools: [],
        reference: [[[{ tool: "query", args: { action: "attributes" } }]]],
        check: ({ messages }) => {
            // Two genes have no expression values (and no label).
            assertAnswered(messages, "an attribute with missing values", "gal1rgexp", "gal4rgexp", "gal80rexp");
            assertAnswered(messages, "the missing count", 2, 329);
        },
    }),
    defineTask({
        id: "degree-distribution",
        source: ["W01"],
        tier: ["core"],
        dataset: "les-miserables",
        prompts: ["What does the degree distribution look like? Min, max and average?"],
        effects: [null],
        tools: ["run_algorithm", "results"],
        reference: [[[{ tool: "query", args: { action: "statistics" } }]]],
        check: async ({ messages, oracle }) => {
            const stats = (await oracle()).data.statistics();
            assertAnswered(messages, "the highest degree", stats.degreeRange[1]);
            assertAnswered(messages, "the mean degree", stats.meanDegree, stats.meanDegree.toFixed(1));
        },
    }),
    defineTask({
        id: "load-pasted-csv",
        source: ["W18", "W14"],
        tier: ["search"],
        dataset: EMPTY,
        prompts: ["Load this edge list:\nsource,target\na,b\nb,c\nc,a\nc,d"],
        tools: ["import_data"],
        reference: [
            [
                [
                    {
                        tool: "import_data",
                        args: { action: "import", format: "csv", text: "source,target\na,b\nb,c\nc,a\nc,d" },
                    },
                ],
            ],
        ],
        check: ({ s }) => {
            const stats = s.data.statistics();
            assert.strictEqual(stats.nodeCount, 4);
            assert.strictEqual(stats.edgeCount, 4);
        },
    }),
    defineTask({
        id: "load-pasted-graphml",
        source: ["W18"],
        tier: ["search"],
        dataset: EMPTY,
        prompts: [`Here is a GraphML file, please open it:\n${GRAPHML}`],
        tools: ["import_data"],
        reference: [[[{ tool: "import_data", args: { action: "import", text: GRAPHML } }]]],
        check: ({ s }) => {
            const stats = s.data.statistics();
            assert.strictEqual(stats.nodeCount, 3);
            assert.strictEqual(stats.edgeCount, 2);
            assert.include(
                s.data.attributes().map((attribute) => attribute.name),
                "kind",
            );
        },
    }),
    defineTask({
        id: "community-colors-for-a-new-user",
        source: ["W14", "multi-step analysis from one prompt"],
        tier: ["catalog", "multi-step"],
        dataset: "karate",
        prompts: ["I'm new to this. Find the groups in this network and color them."],
        tools: ["run_algorithm", "style"],
        reference: [[[{ tool: "run_algorithm", args: { name: "louvain" } }]]],
        check: ({ s }) => {
            const run = runOf(s, ...COMMUNITY_ALGORITHMS);
            const colored = s.styles
                .list()
                .some((layer) => JSON.stringify(layer.encode?.["node.color"] ?? {}).includes(`results.${run.id}.`));
            assert.isTrue(colored, `no layer colors the nodes by the ${run.algorithm} run's groups`);
        },
    }),
];
