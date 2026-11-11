/**
 * @file Tasks: investigation and what-if, biology workflows, communication (W06, W07, W11, W12,
 * W15, W20-W25).
 */

import { assert } from "vitest";

import {
    assertAnswered,
    assertSameMembers,
    defineTask,
    degrees,
    matching,
    neighborhood,
    setMembers,
    styleOf,
} from "./kit";

/**
 * The id of the note on a node.
 * @param s - The session.
 * @param node - The node.
 * @returns The note's id.
 */
function noteOn(s: Parameters<typeof degrees>[0], node: string): string | undefined {
    return s.notes.list().find((note) => note.targets.some((target) => "node" in target && target.node === node))?.id;
}

export const INVESTIGATION_TASKS = [
    defineTask({
        id: "two-hop-context-only",
        source: ["W06"],
        tier: ["core"],
        dataset: "political-blogs",
        prompts: ["Show me only the blogs within two links of dailykos.com, and hide everything else."],
        tools: ["filter"],
        reference: [[[{ tool: "filter", args: { action: "keep_neighbors", ids: ["dailykos.com"], hops: 2 } }]]],
        check: ({ s }) => {
            assertSameMembers(
                s.visibility.nodes,
                neighborhood(s, "154", 2),
                "the visible blogs are not dailykos.com's two-link neighborhood",
            );
            assert.isFalse(s.visibility.showContext);
        },
    }),
    defineTask({
        id: "remove-and-measure",
        source: ["W11", "resilience: what breaks if we lose this?"],
        tier: ["core", "multi-step"],
        dataset: "florentine-families",
        prompts: ["Remove the Medici and tell me how many connected components are left.", "Put them back."],
        effects: [1, -1],
        tools: ["edit_data", "undo"],
        reference: [
            [
                [{ tool: "edit_data", args: { action: "remove_nodes", ids: ["Medici"] } }],
                [{ tool: "query", args: { action: "statistics" } }],
            ],
            [[{ tool: "undo", args: { action: "undo" } }]],
        ],
        check: async ({ s, messages, oracle }) => {
            const without = await oracle();
            await without.data.removeNodes(["Medici"]);
            assertAnswered([messages[0]], "the component count", without.data.statistics().components.count);
            assert.strictEqual(s.data.statistics().nodeCount, 15);
            assert.isDefined(s.data.node("Medici"), "the Medici are not back");
        },
    }),
    defineTask({
        id: "remove-isolated-nodes",
        source: ["edge cleanup", "W18"],
        tier: ["catalog"],
        dataset: "stelzl-interactome",
        prompts: ["Delete all the nodes that have no connections."],
        tools: ["edit_data", "run_algorithm", "results"],
        reference: [
            [
                [{ tool: "run_algorithm", args: { name: "degree", style: false } }],
                [
                    {
                        tool: "edit_data",
                        args: { action: "remove_nodes", result: { run: "degree", field: "value", op: "==", value: 0 } },
                    },
                ],
            ],
        ],
        check: async ({ s, oracle }) => {
            const before = degrees(await oracle());
            const connected = [...before].filter(([, degree]) => degree > 0).map(([id]) => id);
            assert.strictEqual(s.data.statistics().nodeCount, connected.length);
            assert.strictEqual(s.data.statistics().components.isolatedCount, 0);
        },
    }),
    defineTask({
        id: "filter-by-type",
        source: ["W07"],
        tier: ["core"],
        dataset: "wikipathways-senescence-autophagy",
        prompts: ["Show only the nodes of type GeneProduct."],
        tools: ["filter"],
        reference: [[[{ tool: "filter", args: { action: "show_only", where: "data.type == 'GeneProduct'" } }]]],
        check: async ({ s }) => {
            assertSameMembers(
                s.visibility.nodes,
                await matching(s, "data.type == 'GeneProduct'"),
                "the visible nodes are not the gene products",
            );
        },
    }),
    defineTask({
        id: "largest-component-only",
        source: ["W20"],
        tier: ["catalog", "multi-step"],
        dataset: "stelzl-interactome",
        prompts: ["Show only the largest connected component."],
        tools: ["filter", "run_algorithm", "results"],
        reference: [
            [
                [{ tool: "run_algorithm", args: { name: "components", style: false } }],
                [{ tool: "results", args: { action: "summary", run: "components" } }],
                [
                    {
                        tool: "filter",
                        args: {
                            action: "show_only",
                            result: { run: "components", field: "group", op: "==", value: 0 },
                        },
                    },
                ],
            ],
        ],
        check: async ({ s }) => {
            const largest = await s.scope.resolve("largest-component");
            assertSameMembers(
                s.visibility.nodes,
                [...(largest as unknown as { nodes: Iterable<unknown> }).nodes],
                "the visible nodes are not the largest component",
            );
        },
    }),
    defineTask({
        id: "note-on-a-node",
        source: ["W15", "W06"],
        tier: ["search"],
        dataset: "florentine-families",
        prompts: ["Add a note to the Medici node: 'bankers to the Pope'."],
        tools: ["notes"],
        reference: [[[{ tool: "notes", args: { action: "add", ids: ["Medici"], text: "bankers to the Pope" } }]]],
        check: ({ s }) => {
            const notes = s.notes.list();
            assert.lengthOf(notes, 1);
            assert.strictEqual(notes[0].text.toLowerCase(), "bankers to the pope");
            assert.deepEqual(notes[0].targets, [{ node: "Medici" }]);
        },
    }),
    defineTask({
        id: "edit-and-remove-notes",
        source: ["W06", "W12"],
        tier: ["search", "multi-step"],
        dataset: "florentine-families",
        prepare: (s) => {
            s.notes.add({ targets: [{ node: "Medici" }], text: "outlier, check" });
            s.notes.add({ targets: [{ node: "Strozzi" }], text: "outlier, check" });
            return Promise.resolve();
        },
        prompts: ["Change the note on the Medici to say 'checked, real'.", "Delete the note on the Strozzi."],
        tools: ["notes"],
        reference: [
            [
                [{ tool: "notes", args: { action: "list" } }],
                [
                    {
                        tool: "notes",
                        resolve: (s) => ({ action: "update", note: noteOn(s, "Medici"), text: "checked, real" }),
                    },
                ],
            ],
            [
                [{ tool: "notes", args: { action: "list" } }],
                [{ tool: "notes", resolve: (s) => ({ action: "remove", note: noteOn(s, "Strozzi") }) }],
            ],
        ],
        check: ({ s }) => {
            const notes = s.notes.list();
            assert.lengthOf(notes, 1, "the Strozzi note is still there");
            assert.deepEqual(notes[0].targets, [{ node: "Medici" }]);
            assert.strictEqual(notes[0].text, "checked, real");
        },
    }),
];

export const BIOLOGY_TASKS = [
    defineTask({
        id: "diverging-expression-color",
        source: ["W20"],
        tier: ["catalog"],
        dataset: "yeast-perturbation",
        prompts: ["Color genes by gal1RGexp, blue for down, red for up, white at zero."],
        tools: ["style"],
        reference: [
            [
                [
                    {
                        tool: "style",
                        args: {
                            action: "encode",
                            encode: {
                                channel: "node.color",
                                attribute: "gal1RGexp",
                                palette: "red-blue",
                                midpoint: 0,
                                reverse: true,
                            },
                        },
                    },
                ],
            ],
        ],
        check: ({ s }) => {
            const layer = s.styles
                .list()
                .find((each) => JSON.stringify(each.encode?.["node.color"] ?? {}).includes("gal1RGexp"));
            assert.isDefined(layer, "no layer colors by gal1RGexp");
            const values = [...s.data.nodes()]
                .map((node) => node as unknown as { id: string; gal1RGexp?: number })
                .filter((node) => typeof node.gal1RGexp === "number")
                .sort((a, b) => a.gal1RGexp! - b.gal1RGexp!);
            const rgb = (id: string): { r: number; b: number } =>
                styleOf(s, id, "node.color") as { r: number; b: number };
            const lowest = rgb(values[0].id);
            const highest = rgb(values.at(-1)!.id);
            assert.isAbove(lowest.b, lowest.r, `the most down-regulated gene is not blue: ${JSON.stringify(lowest)}`);
            assert.isAbove(highest.r, highest.b, `the most up-regulated gene is not red: ${JSON.stringify(highest)}`);
        },
    }),
    defineTask({
        id: "join-pasted-table",
        source: ["W20"],
        tier: ["search"],
        dataset: "yeast-perturbation",
        prompts: ["Add these scores to the genes:\nid,score\nYKR026C,2.5\nYGL122C,-1.0\nYGR218W,0.3"],
        tools: ["edit_data", "import_data"],
        reference: [
            [
                [
                    {
                        tool: "edit_data",
                        args: {
                            action: "update_nodes",
                            records: [
                                { id: "YKR026C", score: 2.5 },
                                { id: "YGL122C", score: -1 },
                                { id: "YGR218W", score: 0.3 },
                            ],
                        },
                    },
                ],
            ],
        ],
        check: ({ s }) => {
            const score = (id: string): unknown =>
                (s.data.node(id) as unknown as { score?: unknown } | undefined)?.score;
            assert.strictEqual(Number(score("YKR026C")), 2.5);
            assert.strictEqual(Number(score("YGL122C")), -1);
            assert.strictEqual(Number(score("YGR218W")), 0.3);
            assert.strictEqual(s.data.statistics().nodeCount, 331, "genes were added, not joined");
        },
    }),
    defineTask({
        id: "search-by-label",
        source: ["W22"],
        tier: ["core"],
        dataset: "wikipathways-senescence-autophagy",
        prompts: ["Find every node whose name contains ATG and select them."],
        effects: [0],
        tools: ["select"],
        reference: [
            [
                [{ tool: "query", args: { action: "find", text: "ATG" } }],
                [
                    {
                        tool: "select",
                        resolve: (s) => ({
                            action: "set",
                            ids: s.find("ATG").records.map((record) => String(record.id)),
                        }),
                    },
                ],
            ],
        ],
        check: ({ s }) => {
            const expected = [...s.data.nodes()]
                .map((node) => node as unknown as { id: string; label?: string })
                .filter((node) => (node.label ?? "").includes("ATG"))
                .map((node) => node.id);
            assertSameMembers(s.selection.nodes, expected, "the selection is not the ATG nodes");
        },
    }),
    defineTask({
        id: "set-intersection",
        source: ["W24"],
        tier: ["search", "multi-step"],
        dataset: "yeast-perturbation",
        prompts: [
            "Make one set of genes with gal1RGexp above 1 and another with gal4RGexp above 1, then a third set called 'both' with the genes in both.",
        ],
        tools: ["sets"],
        reference: [
            [
                [
                    { tool: "sets", args: { action: "create", where: "data.gal1RGexp > `1`", name: "gal1 up" } },
                    { tool: "sets", args: { action: "create", where: "data.gal4RGexp > `1`", name: "gal4 up" } },
                ],
                [
                    {
                        tool: "sets",
                        args: { action: "combine", op: "intersection", sets: ["gal1 up", "gal4 up"], name: "both" },
                    },
                ],
            ],
        ],
        check: async ({ s }) => {
            assert.isAtLeast(s.sets.list().length, 3);
            const expected = [...s.data.nodes()]
                .map((node) => node as unknown as { id: string; gal1RGexp?: number; gal4RGexp?: number })
                .filter((node) => (node.gal1RGexp ?? 0) > 1 && (node.gal4RGexp ?? 0) > 1)
                .map((node) => node.id);
            assertSameMembers(await setMembers(s, "both"), expected, "'both' is not the intersection");
        },
    }),
];

export const COMMUNICATION_TASKS = [
    defineTask({
        id: "screenshot",
        source: ["W15"],
        tier: ["search"],
        dataset: "karate",
        prompts: ["Take a picture of the graph."],
        effects: [0],
        tools: ["capture"],
        reference: [[[{ tool: "capture", args: { action: "screenshot" } }]]],
        check: ({ messages }) => {
            const capture = messages[0].results.find(
                (result) => result.tool === "capture" && result.outcome === "AI_COMPLETED",
            );
            assert.isDefined(capture, "no screenshot was taken");
        },
    }),
    defineTask({
        id: "export-graphml",
        source: ["W25", "format conversion with a loss report"],
        tier: ["search"],
        dataset: "florentine-families",
        prompts: ["Export this as GraphML."],
        effects: [0],
        tools: ["export_graph"],
        reference: [[[{ tool: "export_graph", args: { format: "graphml" } }]]],
        check: ({ messages }) => {
            const exported = messages[0].results.find(
                (result) => result.tool === "export_graph" && result.outcome === "AI_COMPLETED",
            );
            assert.isDefined(exported, "nothing was exported");
            assert.include(JSON.stringify(exported.body).toLowerCase(), "graphml");
        },
    }),
    defineTask({
        id: "name-the-project",
        source: ["W25"],
        tier: ["search"],
        dataset: "karate",
        prompts: ["Call this project 'Karate split analysis'."],
        tools: ["project"],
        reference: [[[{ tool: "project", args: { action: "rename", name: "Karate split analysis" } }]]],
        check: ({ s }) => {
            assert.strictEqual(s.config.name, "Karate split analysis");
        },
    }),
    defineTask({
        id: "black-background",
        source: ["W15"],
        tier: ["search"],
        dataset: "karate",
        prompts: ["Make the background black."],
        tools: ["project"],
        reference: [
            [
                [
                    {
                        tool: "project",
                        args: { action: "settings", background: { backgroundType: "color", color: "#000000" } },
                    },
                ],
            ],
        ],
        check: ({ s }) => {
            const color = String((s.config.background as { color?: unknown }).color).toLowerCase();
            assert.include(["#000000", "#000", "black"], color);
        },
    }),
    defineTask({
        id: "rename-the-data",
        source: ["W25"],
        tier: ["search"],
        dataset: { nodes: [], edges: [] },
        prepare: async (s) => {
            await s.data.import({
                type: "csv",
                config: { data: "source,target\nMedici,Strozzi\nStrozzi,Albizzi" },
                name: "marriages.csv",
            });
        },
        prompts: ["Rename the data source to 'Florentine marriages, 1430s'."],
        tools: ["import_data", "project"],
        reference: [
            [[{ tool: "import_data", args: { action: "rename_source", name: "Florentine marriages, 1430s" } }]],
        ],
        check: ({ s }) => {
            assert.strictEqual(s.data.source()?.name, "Florentine marriages, 1430s");
        },
    }),
    defineTask({
        id: "what-the-colors-mean",
        source: ["what am I looking at?", "W20"],
        tier: ["search"],
        dataset: "karate",
        prepare: async (s) => {
            await s.runs.start("louvain");
        },
        prompts: ["What does each color mean?"],
        effects: [0],
        tools: ["style", "results"],
        reference: [[[{ tool: "style", args: { action: "legend" } }]]],
        check: ({ messages }) => {
            assertAnswered(messages, "that the colors are communities", "communit", "group", "louvain");
        },
    }),
    defineTask({
        id: "why-is-this-node-red",
        source: ["style layer debugger"],
        tier: ["search"],
        dataset: "karate",
        prepare: async (s) => {
            await s.styles.add({
                name: "Everyone",
                selector: { match: "everything" },
                set: { "node.color": "#0000ff" },
            } as never);
            await s.styles.add({
                name: "Watch list",
                selector: { match: "ids", nodes: ["33"] },
                set: { "node.color": "#ff0000" },
            } as never);
        },
        prompts: ["Why is node 33 red?"],
        effects: [0],
        tools: ["style"],
        reference: [[[{ tool: "style", args: { action: "explain", node: "33" } }]]],
        check: ({ messages }) => {
            assertAnswered(messages, "the layer that paints it", "watch list");
        },
    }),
    defineTask({
        id: "remove-an-analysis",
        source: ["W25"],
        tier: ["catalog"],
        dataset: "karate",
        prepare: async (s) => {
            await s.runs.start("pagerank");
        },
        prompts: ["Remove the PageRank results."],
        tools: ["results"],
        reference: [[[{ tool: "results", args: { action: "remove", run: "pagerank" } }]]],
        check: ({ s }) => {
            const live = s.runs.list().filter((run) => run.algorithm === "pagerank" && run.status !== "removed");
            assert.lengthOf(live, 0, "the PageRank run is still there");
            const bound = s.styles
                .list()
                .filter((layer) => layer.source.by === "run" && layer.source.algorithm === "pagerank");
            assert.lengthOf(bound, 0, "PageRank's layers are still there");
        },
    }),
];
