/**
 * A label a file draws in runs of styles of their own (graph-io's `labelRuns`: vis-network's multi-font labels) is
 * drawn through the label's own markup: each run in the tags of its weight, slant, face and color.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import type { RichTextStyle } from "../../../src/meshes/RichTextLabel";
import { measureLine, RichTextParser } from "../../../src/meshes/RichTextParser";
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
        // a run drawn lower than the line: how far, as a share of the label's size
        assert.strictEqual(
            labelRunsMarkup(JSON.stringify([{ text: "B", shift: 6 }, { text: " x" }]), 10),
            "<shift='60%'>B</shift> x",
        );
    });

    it("draws a shifted run that far below the line, a share of the label's own size", () => {
        const parser = new RichTextParser({ size: 20, weight: "normal", style: "normal" } as unknown as RichTextStyle);
        const [line] = parser.parse("a<shift='30%'>B<shift='4'>C</shift></shift>");
        assert.deepEqual(
            line.map((segment) => [segment.text, segment.style.shift ?? 0]),
            [
                ["a", 0],
                ["B", 6],
                ["C", 10],
            ],
        );
    });

    it("sets runs of different sizes on one line where the label's run alignment says", () => {
        // a context whose fonts are as tall as their size: ascent 0.8, descent 0.2, hanging baseline 0.6 of it
        const ctx = {
            font: "",
            textBaseline: "alphabetic",
            measureText(this: { font: string }, text: string) {
                const size = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 0);
                return {
                    width: text.length * size * 0.5,
                    fontBoundingBoxAscent: 0.8 * size,
                    fontBoundingBoxDescent: 0.2 * size,
                    actualBoundingBoxAscent: 0.7 * size,
                    actualBoundingBoxDescent: 0,
                    hangingBaseline: 0.6 * size,
                };
            },
        } as unknown as CanvasRenderingContext2D;
        const parser = new RichTextParser({ size: 10, weight: "normal", style: "normal", font: "x" } as RichTextStyle);
        const [line] = parser.parse("a<size='200%'>M</size><shift='10%'>b</shift>");
        const at = (runAlign?: "baseline" | "hanging" | "middle"): number[] =>
            measureLine(ctx, line, { lineHeight: 1, textOutline: false, textOutlineWidth: 0, runAlign }).offsets;
        // on one baseline, the shifted run a unit lower
        assert.deepEqual(at(), [0, 0, 1]);
        assert.deepEqual(at("baseline"), [0, 0, 1]);
        // their hanging baselines on the 20 px run's: the 10 px runs 6 px higher (12 - 6)
        assert.deepEqual(at("hanging"), [-6, 0, -5]);
        // their middles on its: (16 - 4) / 2 - (8 - 2) / 2 = 3 px higher
        assert.deepEqual(at("middle"), [-3, 0, -2]);
        // the line holds every run where it sits: the tallest ascent above the baseline, the deepest descent below
        const { lineBox, baseline } = measureLine(ctx, line, {
            lineHeight: 1,
            textOutline: false,
            textOutlineWidth: 0,
            runAlign: "hanging",
        });
        assert.strictEqual(baseline, 16);
        assert.strictEqual(lineBox, 16 + 4);
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
