/**
 * The rule-to-layer converter reads only graph-io's neutral properties and facts: two extractions that differ only in
 * the program graph-io names as their source translate to the same layers and the same values, whatever that program
 * is. graph-io settles every program's own look before the styles reach graphty-element, so the source is report-only.
 */
import { readFileSync } from "node:fs";

import { importGraph } from "@graphty/graph-io";
import type { ExtractedStyles } from "@graphty/graph-io/styles";
import { assert, describe, it } from "vitest";

import { translateFileStyles } from "../../../src/session/styles/fileStyles/translate";

/** A small file of every program whose look graph-io settles, by format. */
const FILES: readonly { readonly format: string; readonly text: string }[] = [
    {
        format: "dot",
        text: `digraph { node [shape=box style="rounded,filled" fillcolor=tomato]; a -> b [arrowhead=onormal style=dashed]; b -> c [arrowhead=halfopen]; c [shape=cylinder]; }`,
    },
    {
        format: "json",
        text: JSON.stringify({
            elements: {
                nodes: [{ data: { id: "a", label: "a" } }, { data: { id: "b", label: "b" } }],
                edges: [{ data: { id: "e", source: "a", target: "b" } }],
            },
            style: [
                { selector: "node", style: { label: "data(label)", shape: "round-triangle", "text-valign": "top" } },
                { selector: "edge", style: { "target-arrow-shape": "triangle-tee", "line-style": "dashed" } },
            ],
        }),
    },
    {
        format: "gexf",
        text: readFileSync(
            new URL("../../../../graph-io/test/corpus/styles/gexf/gexfjs-miserables.gexf", import.meta.url),
            "utf8",
        ),
    },
];

/**
 * The extraction with its source naming another program.
 * @param extracted - The extraction.
 * @param tool - The program it names.
 * @returns The copy.
 */
function namingTool(extracted: ExtractedStyles, tool: string | null): ExtractedStyles {
    return {
        ...extracted,
        styles: {
            ...extracted.styles,
            source: { ...extracted.styles.source, tool: tool as ExtractedStyles["styles"]["source"]["tool"] },
        },
    };
}

describe("a file's styles translate the same whatever program the source names", () => {
    for (const { format, text } of FILES) {
        it(`gives the same layers and values for a ${format} file`, async () => {
            const { snapshot, styles } = await importGraph(text, { format, styles: true });
            assert.isNotNull(styles);
            const translate = (extracted: ExtractedStyles): unknown => {
                const out = translateFileStyles({
                    extracted,
                    snapshot,
                    namespace: "values",
                    options: {},
                    dataPath: () => null,
                });
                return {
                    layers: out.layers,
                    node: [...out.columns.node],
                    edge: [...out.columns.edge],
                    hidden: out.hidden,
                    sceneScale: out.sceneScale,
                };
            };
            const own = translate(styles as ExtractedStyles);
            for (const tool of [
                "graphty",
                "graphviz",
                "cytoscape",
                "cytoscape-js",
                "vis-network",
                "gephi",
                "yed",
                null,
            ]) {
                assert.deepEqual(translate(namingTool(styles as ExtractedStyles, tool)), own, String(tool));
            }
        });
    }
});
