/**
 * @file A label bound to a note is drawn as plain text (design/notes/notes-design.md section 6.3,
 * conformance note-7): every character of `<color='red'>x</color>` in the label's own color. In
 * the same scene a data column holding `<bold>y</bold>` bound to a label is still drawn bold,
 * which pins that notes change nothing about data labels.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { RichTextLabel } from "../../src/meshes/RichTextLabel";

const NOTE = "<color='red'>x</color>";

describe("a label bound to a note", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "414px";
        container.style.height = "207px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([{ id: "a" }, { id: "b", name: "<bold>y</bold>" }]);
        await graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Render until a node's label is drawn.
     * @param id - The node.
     * @returns Its label.
     */
    async function labelOf(id: string): Promise<RichTextLabel> {
        for (let frame = 0; frame < 60; frame++) {
            graph.scene.render();
            const label = graph.getNode(id)?.label;
            if (label !== undefined) {
                return label;
            }

            await new Promise<void>((done) => {
                setTimeout(done, 10);
            });
        }

        throw new Error(`node ${id} drew no label`);
    }

    it("draws every character of the note in the label's color; a data label keeps its markup", async () => {
        const session = graph.getSession();
        session.notes.add({ text: NOTE, targets: [{ node: "a" }] });
        await session.styles.add({
            name: "note",
            target: "node",
            selector: { match: "has", path: "graphty.notes.latest" },
            encode: { "node.label": { by: "graphty.notes.latest" } },
            set: { "node.labelStyle": { color: "#000000" } },
        });
        await session.styles.add({
            name: "name",
            target: "node",
            selector: { match: "has", path: "data.name" },
            encode: { "node.label": { by: "data.name" } },
        });
        await session.styles.settled();

        const note = (await labelOf("a")).textRuns;
        assert.strictEqual(note.length, 1);
        assert.strictEqual(note[0].length, 1, "one run: no markup was read");
        assert.strictEqual(note[0][0].text, NOTE);
        assert.strictEqual(note[0][0].text.length, 22);
        assert.notStrictEqual(note[0][0].style.color, "red");

        const data = (await labelOf("b")).textRuns;
        assert.deepEqual(
            data[0].map((run) => [run.text, run.style.weight]),
            [["y", "bold"]],
            "a data label still reads markup",
        );
    });
});
