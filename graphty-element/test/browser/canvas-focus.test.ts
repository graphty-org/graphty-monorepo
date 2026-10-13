import { afterEach, assert, describe, test } from "vitest";

import type { Graph } from "../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

/**
 * The graph canvas must not take keyboard focus from the host page on its own, and focusing it on a
 * click must not scroll the page. Issue #78.
 */
describe("canvas focus", () => {
    let graph: Graph | undefined;
    const extras: HTMLElement[] = [];

    afterEach(() => {
        if (graph) {
            cleanupTestGraph(graph);
            graph = undefined;
        }

        for (const el of extras.splice(0)) {
            el.remove();
        }

        window.scrollTo(0, 0);
    });

    // First in the file: a document runs autofocus at most once, so a later test would pass regardless.
    test("startup on a page where nothing has focus does not focus the canvas (issue #2424)", async () => {
        (document.activeElement as HTMLElement | null)?.blur();
        assert.strictEqual(document.activeElement, document.body);

        graph = await createTestGraph();
        await graph.setViewMode("3d");
        // Autofocus runs on a rendering opportunity after insertion, so let a few frames pass.
        for (let i = 0; i < 3; i++) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }

        assert.notStrictEqual(document.activeElement, graph.canvas, "the canvas took focus on load");
    });

    test("startup and view-mode switches leave a focused host input focused", async () => {
        const input = document.createElement("input");
        document.body.appendChild(input);
        extras.push(input);
        input.focus();
        assert.strictEqual(document.activeElement, input);

        graph = await createTestGraph();
        await graph.setViewMode("3d");
        assert.strictEqual(document.activeElement, input, "3d startup took focus from the host input");

        await graph.setViewMode("2d");
        await graph.setViewMode("3d");
        assert.strictEqual(document.activeElement, input, "switching back to 3d took focus from the host input");
    });

    test("clicking the canvas focuses it without scrolling the page", async () => {
        // A tall spacer before the graph puts the canvas below the fold of a scrollable page.
        const spacer = document.createElement("div");
        spacer.style.height = "5000px";
        document.body.appendChild(spacer);
        extras.push(spacer);

        graph = await createTestGraph();
        await graph.setViewMode("3d");

        for (const mode of ["3d", "2d"] as const) {
            await graph.setViewMode(mode);
            const { canvas } = graph;
            (document.activeElement as HTMLElement | null)?.blur();
            window.scrollTo(0, 0);
            assert.strictEqual(window.scrollY, 0);

            canvas.dispatchEvent(
                new PointerEvent("pointerdown", { clientX: 10, clientY: 10, button: 0, bubbles: true }),
            );

            assert.strictEqual(document.activeElement, canvas, `${mode}: pointer down did not focus the canvas`);
            assert.strictEqual(window.scrollY, 0, `${mode}: focusing the canvas scrolled the page`);
        }
    });
});
