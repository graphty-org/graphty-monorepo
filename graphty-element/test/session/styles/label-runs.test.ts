/**
 * A label a file draws in runs of styles of their own (graph-io's `labelRuns`: vis-network's multi-font labels) is
 * drawn through the label's own markup: each run in the tags of its weight, slant, face and color.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import type { RichTextStyle } from "../../../src/meshes/RichTextLabel";
import { RichTextParser } from "../../../src/meshes/RichTextParser";
import { labelRunsMarkup } from "../../../src/session/styles/fileStyles/translate";

describe("a label drawn in runs", () => {
    it("is each run's words in the tags of its own font, every line tagged on its own", () => {
        const runs = JSON.stringify([
            { text: "B", weight: "bold", color: "#ff0000" },
            { text: " " },
            { text: "I", italic: true },
            { text: "M\nN", font: "monospace", size: 15 },
        ]);
        assert.strictEqual(
            labelRunsMarkup(runs),
            "<bold><color='#ff0000'>B</color></bold> <italic>I</italic><font='monospace'>M</font>\n<font='monospace'>N</font>",
        );
        assert.isNull(labelRunsMarkup("not json"));
        // a run larger than the label: its size as a share of the label's
        assert.strictEqual(labelRunsMarkup(JSON.stringify([{ text: "M", size: 15 }]), 10), "<size='150%'>M</size>");
    });

    it("draws a vis-network multi-font label in runs, a plain one as it is", async () => {
        const session = createGraphSession();
        const doc = {
            nodes: [
                { id: "a", x: 0, y: 0, label: "<b>B</b> x", font: { multi: "html" } },
                { id: "b", x: 50, y: 0, label: "plain" },
            ],
            edges: [{ from: "a", to: "b", label: "<i>I</i> y", font: { multi: true } }],
            options: { physics: false },
        };
        await session.data.import({ type: "json", config: { data: JSON.stringify(doc) } }, { styles: "file" });
        const merged = (target: { node: string } | { edge: string }): unknown =>
            (session.styles.explain(target).merged as Record<string, unknown>)[
                "node" in target ? "node.label" : "edge.label"
            ];
        assert.strictEqual(merged({ node: "a" }), "<bold>B</bold> x");
        assert.strictEqual(merged({ node: "b" }), "plain");
        const edge = session.data.edges()[0];
        assert.strictEqual(merged({ edge: edge.id }), "<italic>I</italic> y");
    });

    it("draws a size in percent at that share of the size it is opened in", () => {
        const parser = new RichTextParser({ size: 20, weight: "normal", style: "normal" } as unknown as RichTextStyle);
        const [line] = parser.parse("a<size='150%'>M</size>");
        assert.deepEqual(
            line.map((segment) => [segment.text, segment.style.size]),
            [
                ["a", 20],
                ["M", 30],
            ],
        );
    });
});
