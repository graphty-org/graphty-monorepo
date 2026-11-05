/**
 * @file The first source loaded into an empty element draws: a table read with the value guess
 * and loaded with the draft's own mapping puts meshes on the canvas, not only rows in the session.
 * This is the path an application takes for the first file a reader drops into a new project.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import tp53 from "../data/fixtures/tp53-interactions.tsv?raw";

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

describe("the first load into an empty element", () => {
    it("draws the nodes of a table loaded through a draft", async () => {
        const element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        document.body.appendChild(element);
        mounted.push(element);
        await element.updateComplete;
        const { session } = element;
        const visible = (): number =>
            element.graph.scene.meshes.filter((mesh) => mesh.isEnabled() && mesh.isVisible).length;
        const empty = visible();

        const file = new File([tp53], "tp53-interactions.tsv", { type: "text/tab-separated-values" });
        const draft = await session.data.prepare({ config: { file }, name: file.name }, { guess: "values" });
        await draft.load({ styles: "none", mapping: draft.mapping });

        assert.isAbove(session.data.statistics().nodeCount, 0);
        await vi.waitFor(() => {
            assert.isAbove(visible(), empty, "a node is drawn");
        });
    });
});
