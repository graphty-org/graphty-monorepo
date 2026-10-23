import { afterEach, assert, describe, test } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graph } from "../../src/Graph";
import { click } from "../helpers/real-input";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

/**
 * The graph canvas must not take keyboard focus from the host page on its own, and focusing it on a
 * click must not scroll the page. Issue #78. A press on it must still reach the host page.
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
        assert.isFalse(graph.canvas.hasAttribute("autofocus"), "the canvas carries an autofocus attribute");
        // The browser flushes autofocus candidates in the rendering update before it runs animation
        // frame callbacks, so by the time one frame has run, autofocus has had its chance.
        await new Promise((resolve) => requestAnimationFrame(resolve));

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

    test("a press on the canvas reaches the host page as a mouse press", async () => {
        // A host page's popover or menu closes on a mousedown outside it (Mantine's default). A
        // canceled pointerdown suppresses the browser's compatibility mouse events, so a press on
        // the drawing never reached such a page and its popover stayed open.
        graph = await createTestGraph();
        await graph.setViewMode("3d");
        const seen: string[] = [];
        const record = (event: Event): void => {
            seen.push(event.type);
        };
        document.addEventListener("mousedown", record);
        document.addEventListener("mouseup", record);
        try {
            await userEvent.click(graph.canvas, { position: { x: 5, y: 5 } });
        } finally {
            document.removeEventListener("mousedown", record);
            document.removeEventListener("mouseup", record);
        }

        assert.deepEqual(seen, ["mousedown", "mouseup"]);
        assert.strictEqual(document.activeElement, graph.canvas, "the press still focuses the canvas");
    });

    test("clicking the canvas focuses it without scrolling the page", async () => {
        // A spacer before the graph leaves only the canvas's top edge above the fold of a
        // scrollable page: a real pointer can reach it, and a focus that scrolls would bring the
        // rest of the canvas into view.
        const spacer = document.createElement("div");
        spacer.style.height = `${String(window.innerHeight - 40)}px`;
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

            await click(canvas, { x: 10, y: 10 });

            assert.strictEqual(document.activeElement, canvas, `${mode}: pointer down did not focus the canvas`);
            assert.strictEqual(window.scrollY, 0, `${mode}: focusing the canvas scrolled the page`);
        }
    });

    // A click is not keyboard focus, so it draws no focus ring: the reader turning the graph with
    // the mouse saw the browser's blue outline round the whole canvas (the owner's report). The
    // canvas is focused by script from the pointer handler, and a browser decides whether script
    // focus shows a ring from the input before it -- on a page nothing had focused yet, it does.
    test("a click focuses the canvas without drawing a focus ring", async () => {
        graph = await createTestGraph();
        await graph.setViewMode("3d");
        const { canvas } = graph;

        // Keyboard input first, the case where a browser would carry a ring over to script focus.
        await userEvent.keyboard("{Shift}");
        (document.activeElement as HTMLElement | null)?.blur();
        await click(canvas, { x: 20, y: 20 });

        assert.strictEqual(document.activeElement, canvas, "the click did not focus the canvas");
        assert.strictEqual(getComputedStyle(canvas).outlineStyle, "none", "a click drew a focus ring");
    });

    test("keyboard focus on the canvas still draws a focus ring", async () => {
        const before = document.createElement("button");
        before.textContent = "before";
        document.body.prepend(before);
        extras.push(before);
        graph = await createTestGraph();
        await graph.setViewMode("3d");
        const { canvas } = graph;

        // A click first, so a ring left switched off by it would show here.
        await click(canvas, { x: 20, y: 20 });
        before.focus();
        // Focus that follows the keyboard is keyboard focus, and is shown.
        await userEvent.keyboard("{Shift}");
        canvas.focus();

        assert.strictEqual(document.activeElement, canvas, "the canvas did not take focus");
        assert.notStrictEqual(getComputedStyle(canvas).outlineStyle, "none", "keyboard focus drew no ring");
    });
});
