/**
 * @file Tasks: visual exploration -- layouts, 2D, filters, selections, saved views, pins (W02, W06,
 * W15, W17).
 */

import { assert } from "vitest";

import { assertSameMembers, defineTask, degrees, neighborhood } from "./kit";

export const EXPLORE_TASKS = [
    defineTask({
        id: "circular-layout",
        source: ["W02"],
        tier: ["core"],
        dataset: "karate",
        prompts: ["Arrange the nodes in a circle."],
        tools: ["layout"],
        reference: [[[{ tool: "layout", args: { action: "set", name: "circular" } }]]],
        check: ({ s }) => {
            assert.strictEqual(s.layout.id, "circular");
        },
    }),
    defineTask({
        id: "flatten-to-2d",
        source: ["W02"],
        tier: ["core"],
        dataset: "karate",
        prompts: ["Flatten it to 2D."],
        tools: ["view", "layout"],
        reference: [[[{ tool: "view", args: { action: "dimension", dimension: "2d" } }]]],
        check: ({ s }) => {
            assert.strictEqual(s.layout.dimension, "2d");
        },
    }),
    defineTask({
        id: "hide-low-degree",
        source: ["W02", "natural-language queries into selections and filters"],
        tier: ["catalog"],
        dataset: "les-miserables",
        prompts: ["Hide every character who appears with fewer than 3 others."],
        tools: ["filter", "run_algorithm", "results"],
        reference: [
            [
                [{ tool: "run_algorithm", args: { name: "degree", style: false } }],
                [
                    {
                        tool: "filter",
                        args: { action: "hide", result: { run: "degree", field: "value", op: "<", value: 3 } },
                    },
                ],
            ],
        ],
        check: ({ s }) => {
            const expected = [...degrees(s)].filter(([, degree]) => degree >= 3).map(([id]) => id);
            assertSameMembers(s.visibility.nodes, expected, "the visible characters are not those with 3 or more");
            assert.strictEqual(s.data.statistics().nodeCount, 77, "characters were deleted, not hidden");
        },
    }),
    defineTask({
        id: "show-all-again",
        source: ["W02"],
        tier: ["core", "multi-step"],
        dataset: "les-miserables",
        prompts: ["Hide every character who appears with fewer than 3 others.", "Show them all again."],
        tools: ["filter", "run_algorithm", "results", "undo"],
        reference: [
            [
                [{ tool: "run_algorithm", args: { name: "degree", style: false } }],
                [
                    {
                        tool: "filter",
                        args: { action: "hide", result: { run: "degree", field: "value", op: "<", value: 3 } },
                    },
                ],
            ],
            [[{ tool: "filter", args: { action: "clear" } }]],
        ],
        check: ({ s }) => {
            assert.isNull(s.visibility.filter, "a filter is still set");
            assert.strictEqual(s.visibility.nodes.size, 77);
        },
    }),
    defineTask({
        id: "two-hop-selection",
        source: ["W02", "ego network on demand"],
        tier: ["core"],
        dataset: "les-miserables",
        prompts: ["Select Myriel and everyone within two steps of him."],
        effects: [0],
        tools: ["select"],
        reference: [[[{ tool: "select", args: { action: "neighborhood", ids: ["Myriel"], hops: 2 } }]]],
        check: ({ s }) => {
            assertSameMembers(
                s.selection.nodes,
                neighborhood(s, "Myriel", 2),
                "the selection is not Myriel's two-step neighborhood",
            );
        },
    }),
    defineTask({
        id: "ego-network-in-context",
        source: ["W06", "W17"],
        tier: ["core", "multi-step"],
        dataset: "karate",
        prompts: ["Show only node 0 and its direct neighbors, but keep the rest of the graph faintly visible."],
        tools: ["filter"],
        reference: [
            [
                [{ tool: "filter", args: { action: "keep_neighbors", ids: ["0"], hops: 1 } }],
                [{ tool: "filter", args: { action: "context", enabled: true } }],
            ],
        ],
        check: ({ s }) => {
            assertSameMembers(
                s.visibility.nodes,
                neighborhood(s, "0", 1),
                "the visible nodes are not node 0 and its neighbors",
            );
            assert.isTrue(s.visibility.showContext, "the hidden nodes are not drawn faintly");
        },
    }),
    defineTask({
        id: "seeded-force-layout",
        source: ["W02", "consumers set the seed"],
        tier: ["catalog"],
        dataset: "dolphins",
        prompts: ["Use a 3D force-directed layout, and make it come out the same every time (seed 42)."],
        tools: ["layout", "view"],
        reference: [[[{ tool: "layout", args: { action: "set", name: "force", options: { seed: 42 } } }]]],
        check: ({ s }) => {
            assert.strictEqual(s.layout.id, "force");
            assert.strictEqual(s.layout.options.seed, 42, `layout options: ${JSON.stringify(s.layout.options)}`);
            assert.strictEqual(s.layout.dimension, "3d");
        },
    }),
    defineTask({
        id: "save-named-view",
        source: ["W02", "W15"],
        tier: ["search"],
        dataset: "karate",
        prompts: ["Save this view as 'overview'."],
        tools: ["view"],
        reference: [[[{ tool: "view", args: { action: "save", name: "overview" } }]]],
        check: ({ s }) => {
            assert.isTrue(s.views.has("overview"), `saved views: ${[...s.views.keys()].join(", ") || "none"}`);
        },
    }),
    defineTask({
        id: "pin-a-node",
        source: ["W02", "W15"],
        tier: ["search"],
        dataset: "les-miserables",
        prompts: ["Keep Valjean fixed where he is when the layout runs."],
        tools: ["layout"],
        reference: [[[{ tool: "layout", args: { action: "pin", ids: ["Valjean"] } }]]],
        check: ({ s }) => {
            assert.isTrue(s.positions.pinned.has("Valjean"), `pinned: ${[...s.positions.pinned].join(", ") || "none"}`);
        },
    }),
    defineTask({
        id: "hierarchy-layout",
        source: ["W13"],
        tier: ["catalog"],
        dataset: "go-slim-generic",
        prompts: ["Lay out the GO terms as a hierarchy."],
        tools: ["layout"],
        reference: [[[{ tool: "layout", args: { action: "set", name: "hierarchical" } }]]],
        check: ({ s }) => {
            assert.include(["hierarchical", "layers", "shell", "radial"], s.layout.id);
        },
    }),
    defineTask({
        id: "bipartite-layout",
        source: ["bipartite to one-mode projection"],
        tier: ["catalog"],
        dataset: "davis-southern-women",
        prompts: ["Put the women on one side and the events on the other."],
        tools: ["layout"],
        reference: [[[{ tool: "layout", args: { action: "set", name: "bipartite" } }]]],
        check: ({ s }) => {
            assert.include(["bipartite", "layers"], s.layout.id);
        },
    }),
    defineTask({
        id: "saved-coordinates",
        source: ["W20", "W22"],
        tier: ["catalog"],
        dataset: "wikipathways-senescence-autophagy",
        prompts: ["Lay the pathway out using its saved x and y positions."],
        tools: ["layout", "project"],
        reference: [[[{ tool: "layout", args: { action: "set", name: "fixed" } }]]],
        check: ({ s }) => {
            assert.strictEqual(s.layout.id, "fixed");
        },
    }),
    defineTask({
        id: "which-layouts-suit",
        source: ["W14"],
        tier: ["catalog"],
        dataset: "davis-southern-women",
        prompts: ["What layouts would work well for a two-mode network like this?"],
        effects: [0],
        tools: ["layout"],
        reference: [
            [[{ tool: "catalog", args: { action: "search", text: "two-mode bipartite layout", kind: "layout" } }]],
        ],
        check: ({ messages }) => {
            const text = `${messages[0].text}\n${JSON.stringify(messages[0].results)}`.toLowerCase();
            assert.include(text, "bipartite", "the bipartite layout is not suggested");
        },
    }),
];
