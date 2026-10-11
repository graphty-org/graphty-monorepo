/**
 * @file Tasks: communities, paths and flows, centrality (W03, W04, W05, W08-W11, W17, W21, W23).
 */

import { assert } from "vitest";

import {
    assertAnswered,
    assertSameMembers,
    defineTask,
    degrees,
    neighborhood,
    nodeValues,
    runOf,
    setMembers,
    styleOf,
    topIds,
} from "./kit";

/** Centrality measures a reader's "important" may mean. */
const CENTRALITY = ["degree", "pagerank", "betweenness", "closeness", "eigenvector", "katz", "hits"] as const;

/**
 * Prepare: a Louvain run, as a reader would have started it.
 * @param s - The session.
 */
async function louvain(s: Parameters<NonNullable<Parameters<typeof defineTask>[0]["prepare"]>>[0]): Promise<void> {
    await s.runs.start("louvain");
}

/**
 * The group the Louvain run put the most nodes in.
 * @param s - The session.
 * @returns The group.
 */
function largestGroup(s: Parameters<typeof degrees>[0]): unknown {
    const sizes = new Map<unknown, number>();
    for (const group of nodeValues(s, "louvain", "group").values()) {
        sizes.set(group, (sizes.get(group) ?? 0) + 1);
    }

    return [...sizes].sort((a, b) => b[1] - a[1])[0][0];
}

export const COMMUNITY_TASKS = [
    defineTask({
        id: "louvain",
        source: ["W04"],
        tier: ["catalog"],
        dataset: "karate",
        prompts: ["Detect communities with Louvain."],
        tools: ["run_algorithm"],
        reference: [[[{ tool: "run_algorithm", args: { name: "louvain" } }]]],
        check: ({ s }) => {
            const run = runOf(s, "louvain");
            const groups = nodeValues(s, run.id, "group");
            assert.isTrue(
                [...groups.values()].every((group) => typeof group === "number"),
                "a node has no community",
            );
        },
    }),
    defineTask({
        id: "partition-quality",
        source: ["W04"],
        tier: ["catalog", "multi-step"],
        dataset: "karate",
        prompts: ["Detect communities with Louvain.", "How good is that partition? What's the modularity?"],
        effects: [1, 0],
        tools: ["run_algorithm", "results"],
        reference: [
            [[{ tool: "run_algorithm", args: { name: "louvain" } }]],
            [[{ tool: "results", args: { action: "summary", run: "louvain" } }]],
        ],
        check: ({ s, messages }) => {
            const modularity = runOf(s, "louvain").result?.graph.modularity as number;
            assertAnswered(messages, "the modularity", modularity, modularity.toFixed(2));
        },
    }),
    defineTask({
        id: "color-by-community",
        source: ["W04", "W21"],
        tier: ["catalog", "multi-step"],
        dataset: "karate",
        prompts: ["Run Louvain and color the nodes by community."],
        tools: ["run_algorithm", "style"],
        reference: [[[{ tool: "run_algorithm", args: { name: "louvain" } }]]],
        check: ({ s }) => {
            const run = runOf(s, "louvain");
            const groups = nodeValues(s, run.id, "group");
            const colorOf = new Map<unknown, string>();
            for (const [id, group] of groups) {
                const color = JSON.stringify(styleOf(s, id, "node.color"));
                const seen = colorOf.get(group);
                assert.isTrue(seen === undefined || seen === color, `community ${String(group)} has two colors`);
                colorOf.set(group, color);
            }

            assert.strictEqual(new Set(colorOf.values()).size, colorOf.size, "two communities share a color");
        },
    }),
    defineTask({
        id: "community-sizes",
        source: ["W04", "W21"],
        tier: ["catalog"],
        dataset: "karate",
        prepare: louvain,
        prompts: ["How big is each community?"],
        effects: [0],
        tools: ["results"],
        reference: [[[{ tool: "results", args: { action: "summary", run: "louvain" } }]]],
        check: ({ s, messages }) => {
            const sizes = new Map<unknown, number>();
            for (const group of nodeValues(s, "louvain", "group").values()) {
                sizes.set(group, (sizes.get(group) ?? 0) + 1);
            }

            for (const size of sizes.values()) {
                assertAnswered(messages, "a community's size", size);
            }
        },
    }),
    defineTask({
        id: "set-from-largest-community",
        source: ["W21", "W25"],
        tier: ["search", "multi-step"],
        dataset: "karate",
        prepare: louvain,
        prompts: ["Make a set from the largest community and call it 'core'.", "Rename 'core' to 'inner circle'."],
        effects: [1, 1],
        tools: ["sets", "results", "select"],
        reference: [
            [
                [{ tool: "results", args: { action: "summary", run: "louvain" } }],
                [
                    {
                        tool: "sets",
                        resolve: (s) => ({
                            action: "create_from",
                            result: { run: "louvain", field: "group", op: "==", value: largestGroup(s) },
                            name: "core",
                        }),
                    },
                ],
            ],
            [[{ tool: "sets", args: { action: "rename", set: "core", name: "inner circle" } }]],
        ],
        check: async ({ s }) => {
            const sizes = new Map<unknown, string[]>();
            for (const [id, group] of nodeValues(s, "louvain", "group")) {
                sizes.set(group, [...(sizes.get(group) ?? []), id]);
            }

            const largest = [...sizes.values()].sort((a, b) => b.length - a.length)[0];
            assertSameMembers(await setMembers(s, "inner circle"), largest, "the set is not the largest community");
            assert.isUndefined(
                s.sets.list().find((set) => set.name === "core"),
                "the old name is still there",
            );
        },
    }),
    defineTask({
        id: "compare-two-methods",
        source: ["compare two algorithms' answers"],
        tier: ["catalog", "multi-step"],
        dataset: "football",
        prompts: ["Run Louvain and label propagation and tell me how many communities each finds."],
        tools: ["run_algorithm", "results"],
        reference: [
            [
                [
                    { tool: "run_algorithm", args: { name: "louvain", style: false } },
                    { tool: "run_algorithm", args: { name: "label-propagation", style: false } },
                ],
            ],
        ],
        check: ({ s, messages }) => {
            for (const algorithm of ["louvain", "label-propagation"]) {
                const count = runOf(s, algorithm).result?.graph.groupCount as number;
                assertAnswered(messages, `the ${algorithm} community count`, count);
            }
        },
    }),
    defineTask({
        id: "leiden-resolution",
        source: ["W04", "parameter sweep"],
        tier: ["catalog"],
        dataset: "football",
        prompts: ["Run Leiden with resolution 1.5."],
        tools: ["run_algorithm"],
        reference: [[[{ tool: "run_algorithm", args: { name: "leiden", options: { resolution: 1.5 } } }]]],
        check: ({ s }) => {
            assert.strictEqual(runOf(s, "leiden").params.resolution, 1.5);
        },
    }),
    defineTask({
        id: "markov-clustering",
        source: ["W21"],
        tier: ["catalog"],
        dataset: "yeast-perturbation",
        prompts: ["Cluster this network with MCL, inflation 2."],
        tools: ["run_algorithm"],
        reference: [[[{ tool: "run_algorithm", args: { name: "markov-clustering", options: { inflation: 2 } } }]]],
        check: ({ s }) => {
            assert.strictEqual(runOf(s, "markov-clustering").params.inflation, 2);
        },
    }),
    defineTask({
        id: "two-encodings",
        source: ["W04", "compare my network against references"],
        tier: ["catalog", "multi-step"],
        dataset: "football",
        prompts: ["Color the teams by conference, and give each community Louvain finds its own node shape."],
        tools: ["run_algorithm", "style"],
        reference: [
            [
                [
                    {
                        tool: "style",
                        args: { action: "encode", encode: { channel: "node.color", attribute: "conference" } },
                    },
                    { tool: "run_algorithm", args: { name: "louvain", style: false } },
                ],
                [
                    {
                        tool: "style",
                        args: { action: "encode", encode: { channel: "node.shape", run: "louvain", field: "group" } },
                    },
                ],
            ],
        ],
        check: ({ s }) => {
            const run = runOf(s, "louvain");
            const layers = s.styles.list();
            const byConference = layers.some((layer) =>
                JSON.stringify(layer.encode?.["node.color"] ?? {}).includes("conference"),
            );
            assert.isTrue(byConference, "no layer colors the teams by conference");
            const shaped = layers.some((layer) =>
                JSON.stringify(layer.encode?.["node.shape"] ?? {}).includes(`results.${run.id}.`),
            );
            assert.isTrue(shaped, "no layer gives each community a shape");
        },
    }),
    defineTask({
        id: "group-by-namespace",
        source: ["group by attributes"],
        tier: ["core", "multi-step"],
        dataset: "go-slim-generic",
        prompts: ["How many terms are in each namespace? Color them by namespace."],
        tools: ["style"],
        reference: [
            [
                [
                    { tool: "query", args: { action: "histogram", column: "namespace" } },
                    {
                        tool: "style",
                        args: { action: "encode", encode: { channel: "node.color", attribute: "namespace" } },
                    },
                ],
            ],
        ],
        check: ({ s, messages }) => {
            const counts = new Map<string, number>();
            for (const node of s.data.nodes()) {
                const namespace = String((node as unknown as { namespace: unknown }).namespace);
                counts.set(namespace, (counts.get(namespace) ?? 0) + 1);
            }

            for (const count of counts.values()) {
                assertAnswered(messages, "a namespace's count", count);
            }

            const colored = s.styles
                .list()
                .some((layer) => JSON.stringify(layer.encode?.["node.color"] ?? {}).includes("namespace"));
            assert.isTrue(colored, "no layer colors the terms by namespace");
        },
    }),
];

export const PATH_TASKS = [
    defineTask({
        id: "shortest-path-named-nodes",
        source: ["W05"],
        tier: ["catalog"],
        dataset: "florentine-families",
        prompts: ["What's the shortest path from the Medici to the Strozzi?"],
        tools: ["run_algorithm", "results"],
        reference: [
            [
                [
                    {
                        tool: "run_algorithm",
                        args: { name: "shortest-path", options: { source: "Medici", target: "Strozzi" } },
                    },
                ],
            ],
        ],
        check: ({ s, messages }) => {
            const run = runOf(s, "shortest-path", "astar", "bfs");
            const params = run.params as { source?: unknown; target?: unknown; targetNode?: unknown };
            assert.strictEqual(params.source, "Medici");
            assert.strictEqual(params.target ?? params.targetNode, "Strozzi");
            // Medici - Ridolfi - Strozzi is the only two-hop route.
            assertAnswered(messages, "the family in between", "ridolfi");
        },
    }),
    defineTask({
        id: "highlight-only-the-path",
        source: ["W05", "the algorithm-style rule"],
        tier: ["catalog", "multi-step"],
        dataset: "florentine-families",
        prompts: [
            "Highlight the shortest path from the Medici to the Strozzi in red, and leave everything else alone.",
        ],
        tools: ["run_algorithm", "style", "results"],
        reference: [
            [
                [
                    {
                        tool: "run_algorithm",
                        args: { name: "shortest-path", options: { source: "Medici", target: "Strozzi" }, style: false },
                    },
                ],
                [
                    {
                        tool: "style",
                        args: {
                            action: "add",
                            result: { run: "shortest-path", field: "onPath", op: "==", value: true },
                            values: { "node.color": "red" },
                        },
                    },
                ],
            ],
        ],
        check: ({ s }) => {
            const run = runOf(s, "shortest-path", "astar", "bfs");
            const onPath = nodeValues(
                s,
                run.id,
                run.fields.some((field) => field.name === "onPath") ? "onPath" : "level",
            );
            const red = (id: string): boolean =>
                JSON.stringify(styleOf(s, id, "node.color"))
                    .toLowerCase()
                    .includes("ff0000") || JSON.stringify(styleOf(s, id, "node.color")).includes('"r":255,"g":0,"b":0');
            for (const id of ["Medici", "Ridolfi", "Strozzi"]) {
                assert.isTrue(
                    red(id),
                    `${id} is on the path and not red: ${JSON.stringify(styleOf(s, id, "node.color"))}`,
                );
            }

            // Off the path, nothing the message added touches a node.
            const off = [...onPath.keys()].filter((id) => !["Medici", "Ridolfi", "Strozzi"].includes(id));
            for (const id of off) {
                const painters = s.styles.explain({ node: id }).contributions.filter((contribution) => {
                    const layer = s.styles.get(contribution.layerId);
                    return (
                        layer !== undefined &&
                        layer.source.by !== "element" &&
                        contribution.properties.includes("node.color")
                    );
                });
                assert.lengthOf(
                    painters,
                    0,
                    `${id} is off the path and colored by ${painters.map((p) => p.name).join(", ")}`,
                );
            }
        },
    }),
    defineTask({
        id: "weighted-route",
        source: ["W05", "traffic and routing what-ifs"],
        tier: ["catalog"],
        dataset: "knuth-miles",
        prompts: ["What's the shortest driving route by miles from Seattle, WA to San Antonio, TX?"],
        tools: ["run_algorithm", "results"],
        reference: [
            [
                [
                    {
                        tool: "run_algorithm",
                        args: { name: "shortest-path", options: { source: "Seattle, WA", target: "San Antonio, TX" } },
                    },
                ],
            ],
        ],
        check: ({ s, messages }) => {
            const run = runOf(s, "shortest-path", "astar");
            assert.strictEqual(run.params.source, "Seattle, WA");
            assert.strictEqual(run.params.target, "San Antonio, TX");
            const cost = run.result?.graph.cost as number;
            assertAnswered(messages, "the route's miles", Math.round(cost), cost);
        },
    }),
    defineTask({
        id: "unreachable-pair",
        source: ["say when the graph cannot answer"],
        tier: ["catalog"],
        dataset: "florentine-families",
        prepare: async (s) => {
            // A family with no marriages at all: no path reaches it.
            await s.data.addNodes([{ id: "Pucci" }]);
        },
        prompts: ["Is there any path between the Medici and the Pucci?"],
        effects: [null],
        tools: ["run_algorithm", "results"],
        reference: [[[{ tool: "query", args: { action: "neighbors", ids: ["Pucci"] } }]]],
        check: ({ messages }) => {
            const text = `${messages[0].text}\n${JSON.stringify(messages[0].results)}`.toLowerCase();
            assert.match(
                text,
                /no (path|route|connection)|not connected|unreachable|disconnected|isolated|route\.none|no neighbors|"total":0|cannot be reached/,
            );
        },
    }),
    defineTask({
        id: "minimum-spanning-tree",
        source: ["W11"],
        tier: ["catalog", "multi-step"],
        dataset: "knuth-miles",
        prompts: ["Show me the cheapest road network that still connects every city."],
        tools: ["run_algorithm", "style", "results"],
        reference: [[[{ tool: "run_algorithm", args: { name: "kruskal" } }]]],
        check: ({ s }) => {
            const run = runOf(s, "kruskal", "prim");
            assert.strictEqual(run.result?.graph.count, 127, "a spanning tree of 128 cities has 127 roads");
            const painted = s.styles
                .list()
                .some(
                    (layer) =>
                        JSON.stringify(layer.selector).includes(`results.${run.id}.`) ||
                        JSON.stringify(layer.encode ?? {}).includes(`results.${run.id}.`),
                );
            assert.isTrue(painted, "the tree is not shown");
        },
    }),
    defineTask({
        id: "minimum-cut",
        source: ["W09"],
        tier: ["catalog"],
        dataset: "florentine-families",
        prompts: ["What's the fewest marriages you'd have to cut to separate the Medici from the Strozzi?"],
        tools: ["run_algorithm", "results"],
        reference: [
            [[{ tool: "run_algorithm", args: { name: "min-cut", options: { source: "Medici", sink: "Strozzi" } } }]],
        ],
        check: ({ s, messages }) => {
            const run = runOf(s, "min-cut", "max-flow");
            const value = (run.result?.graph.cutValue ?? run.result?.graph.maxFlow) as number;
            assertAnswered(messages, "the cut size", value);
        },
    }),
];

export const CENTRALITY_TASKS = [
    defineTask({
        id: "five-most-important",
        source: ["W10", "who matters most here"],
        tier: ["catalog", "multi-step"],
        dataset: "karate",
        prompts: ["Who are the five most important people in this club? Select them."],
        tools: ["run_algorithm", "results", "select"],
        reference: [
            [
                [{ tool: "run_algorithm", args: { name: "pagerank" } }],
                [{ tool: "results", args: { action: "top", run: "pagerank", k: 5, select: true } }],
            ],
        ],
        check: ({ s }) => {
            const run = runOf(s, ...CENTRALITY);
            assert.lengthOf(s.selection.nodes, 5);
            const top = topIds(nodeValues(s, run.id, "value"), 5);
            for (const id of s.selection.nodes) {
                assert.isTrue(
                    top.has(String(id)),
                    `${String(id)} is selected and not in the top five by ${run.algorithm}`,
                );
            }

            assert.includeMembers(s.selection.nodes.map(String), ["0", "33"]);
        },
    }),
    defineTask({
        id: "size-by-pagerank",
        source: ["W10"],
        tier: ["catalog", "multi-step"],
        dataset: "political-blogs",
        prompts: ["Size the blogs by PageRank."],
        tools: ["run_algorithm", "style"],
        reference: [
            [
                [{ tool: "run_algorithm", args: { name: "pagerank", style: false } }],
                [
                    {
                        tool: "style",
                        args: { action: "encode", encode: { channel: "node.size", run: "pagerank", field: "value" } },
                    },
                ],
            ],
        ],
        check: ({ s }) => {
            const run = runOf(s, "pagerank");
            const sized = s.styles
                .list()
                .some((layer) => JSON.stringify(layer.encode?.["node.size"] ?? {}).includes(`results.${run.id}.`));
            assert.isTrue(sized, "no layer sizes the blogs by PageRank");
            const values = [...nodeValues(s, run.id, "value")].filter(
                (entry): entry is [string, number] => typeof entry[1] === "number",
            );
            values.sort((a, b) => b[1] - a[1]);
            const highest = Number(styleOf(s, values[0][0], "node.size"));
            const lowest = Number(styleOf(s, values.at(-1)![0], "node.size"));
            assert.isAbove(highest, lowest, "the top blog is not drawn larger than the lowest");
        },
    }),
    defineTask({
        id: "four-centralities",
        source: ["W23"],
        tier: ["catalog", "multi-step"],
        dataset: "yeast-perturbation",
        prompts: ["Compute degree, betweenness, closeness and eigenvector centrality."],
        tools: ["run_algorithm"],
        reference: [
            [
                [
                    { tool: "run_algorithm", args: { name: "degree", style: false } },
                    { tool: "run_algorithm", args: { name: "betweenness", style: false } },
                    { tool: "run_algorithm", args: { name: "closeness", style: false } },
                    { tool: "run_algorithm", args: { name: "eigenvector", style: false } },
                ],
            ],
        ],
        check: ({ s }) => {
            for (const algorithm of ["degree", "betweenness", "closeness", "eigenvector"]) {
                runOf(s, algorithm);
            }
        },
    }),
    defineTask({
        id: "hub-and-neighbors",
        source: ["W17"],
        tier: ["catalog", "multi-step"],
        dataset: "les-miserables",
        prompts: ["Select the biggest hub and its direct neighbors."],
        effects: [null],
        tools: ["run_algorithm", "results", "select"],
        reference: [
            [
                [{ tool: "query", args: { action: "nodes", where: "all", sort: "-degree", limit: 1 } }],
                [{ tool: "select", args: { action: "neighborhood", ids: ["Valjean"], hops: 1 } }],
            ],
        ],
        check: ({ s }) => {
            assertSameMembers(
                s.selection.nodes,
                neighborhood(s, "Valjean", 1),
                "the selection is not Valjean and his neighbors",
            );
        },
    }),
    defineTask({
        id: "brokers",
        source: ["W17", "W10"],
        tier: ["catalog", "multi-step"],
        dataset: "celegans-neural",
        prompts: ["Select the neurons with more than 20 connections but a clustering coefficient below 0.2."],
        effects: [null],
        tools: ["run_algorithm", "results", "select"],
        reference: [
            [
                [
                    { tool: "run_algorithm", args: { name: "degree", style: false } },
                    { tool: "run_algorithm", args: { name: "clustering-coefficient", style: false } },
                ],
                [
                    {
                        tool: "select",
                        args: {
                            action: "set",
                            where: "results.degree.value > 20 && results.clustering-coefficient.value < 0.2",
                        },
                    },
                ],
            ],
        ],
        check: ({ s }) => {
            const degree = degrees(s);
            const clustering = nodeValues(s, runOf(s, "clustering-coefficient").id, "value");
            const expected = [...degree]
                .filter(([id, d]) => d > 20 && Number(clustering.get(id)) < 0.2)
                .map(([id]) => id);
            assert.isAbove(expected.length, 0);
            assertSameMembers(
                s.selection.nodes,
                expected,
                "the selection is not the high-degree, low-clustering neurons",
            );
        },
    }),
    defineTask({
        id: "top-hubs-large-graph",
        source: ["W17"],
        tier: ["catalog"],
        dataset: "openflights",
        prompts: ["Which airports are the biggest hubs? Top 10."],
        effects: [null],
        tools: ["run_algorithm", "results"],
        reference: [
            [
                [{ tool: "run_algorithm", args: { name: "degree", style: false } }],
                [{ tool: "results", args: { action: "top", run: "degree", k: 10 } }],
            ],
        ],
        check: ({ s, messages }) => {
            const top = [...degrees(s)]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([id]) => id);
            const text = `${messages[0].text}\n${JSON.stringify(messages[0].results)}`;
            const named = top.filter((id) => {
                const label = s.data.name(id) ?? "";
                return text.includes(id) || (label !== "" && text.includes(label));
            });
            assert.isAtLeast(
                named.length,
                8,
                `only ${String(named.length)} of the top 10 hubs are named: ${named.join(", ")}`,
            );
        },
    }),
    defineTask({
        id: "statistical-outliers",
        source: ["W12", "find the odd nodes"],
        tier: ["catalog", "multi-step"],
        dataset: "celegans-neural",
        prompts: ["Select the neurons whose total degree is more than three standard deviations above the mean."],
        effects: [null],
        tools: ["run_algorithm", "results", "select"],
        reference: [
            [
                [{ tool: "run_algorithm", args: { name: "degree", style: false } }],
                [{ tool: "select", args: { action: "set", where: "results.degree.value > `57.6`" } }],
            ],
        ],
        check: ({ s }) => {
            const all = [...degrees(s)];
            const mean = all.reduce((sum, [, d]) => sum + d, 0) / all.length;
            const sd = Math.sqrt(all.reduce((sum, [, d]) => sum + (d - mean) ** 2, 0) / all.length);
            const expected = all.filter(([, d]) => d > mean + 3 * sd).map(([id]) => id);
            assertSameMembers(s.selection.nodes, expected, "the selection is not the outliers");
        },
    }),
    defineTask({
        id: "betweenness-threshold-count",
        source: ["W23"],
        tier: ["catalog"],
        dataset: "yeast-perturbation",
        prepare: async (s) => {
            await s.runs.start("betweenness");
        },
        prompts: ["How many genes have a betweenness above 1000?"],
        effects: [0],
        tools: ["results"],
        reference: [
            [
                [
                    {
                        tool: "query",
                        args: { action: "count", result: { run: "betweenness", field: "value", op: ">", value: 1000 } },
                    },
                ],
            ],
        ],
        check: ({ s, messages }) => {
            const count = [...nodeValues(s, "betweenness", "value").values()].filter(
                (value) => Number(value) > 1000,
            ).length;
            assertAnswered(messages, "the count", count);
        },
    }),
];
