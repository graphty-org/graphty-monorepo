/**
 * @file `colorScheme`: the canvas clears to the background's `color` by default, its `darkColor`
 * under `"dark"`, and follows `prefers-color-scheme` under `"auto"` without reloading (issue #291).
 * Under a dark scheme `session.config.backgroundColor` reports the dark color, and labels no layer
 * colored are drawn light.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { commands } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { DEFAULT_BACKGROUND_COLOR, DEFAULT_DARK_BACKGROUND_COLOR } from "../../schema";
import { Graph, operationQueueOf } from "../../src/Graph";
import { asData, styleEveryEdge, styleEveryNode } from "../helpers/testSetup";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Emulates `prefers-color-scheme: dark` (true) or light (false). */
        emulateColorScheme: (dark: boolean) => Promise<void>;
    }
}

const cleanups: (() => void)[] = [];

afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }

    await commands.emulateColorScheme(false);
});

/**
 * A real `Graph`, not yet initialized.
 * @returns The graph.
 */
function newGraph(): Graph {
    const container = document.createElement("div");
    container.style.width = "200px";
    container.style.height = "150px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

/**
 * The color the scene clears to.
 * @param graph - The graph.
 * @returns Hex, upper case.
 */
function clearColor(graph: Graph): string {
    return graph.getScene().clearColor.toHexString(true);
}

/**
 * Switch the emulated page scheme and resolve once the page has heard the change.
 * @param dark - Whether the page turns dark.
 */
async function pageScheme(dark: boolean): Promise<void> {
    const heard = new Promise((resolve) => {
        matchMedia("(prefers-color-scheme: dark)").addEventListener("change", resolve, { once: true });
    });
    await commands.emulateColorScheme(dark);
    await heard;
}

describe("colorScheme", () => {
    it("draws the light colour by default, even when the page is dark", async () => {
        await commands.emulateColorScheme(true);
        const graph = newGraph();
        await graph.init();
        assert.strictEqual(graph.getColorScheme(), "light");
        assert.strictEqual(clearColor(graph), DEFAULT_BACKGROUND_COLOR);
    });

    it("draws the dark default, or the background's darkColor, when dark", async () => {
        const graph = newGraph();
        graph.setColorScheme("dark");
        await graph.init();
        assert.strictEqual(clearColor(graph), DEFAULT_DARK_BACKGROUND_COLOR);

        graph.setBackground({ backgroundType: "color", color: "#FFFFFF", darkColor: "#202030" });
        await operationQueueOf(graph).waitForCompletion();
        assert.strictEqual(clearColor(graph), "#202030");

        graph.setColorScheme("light");
        assert.strictEqual(clearColor(graph), "#FFFFFF");
    });

    it("follows prefers-color-scheme when auto", async () => {
        const graph = newGraph();
        await graph.init();
        graph.setColorScheme("auto");
        assert.strictEqual(clearColor(graph), DEFAULT_BACKGROUND_COLOR);

        await pageScheme(true);
        assert.strictEqual(clearColor(graph), DEFAULT_DARK_BACKGROUND_COLOR);

        await pageScheme(false);
        assert.strictEqual(clearColor(graph), DEFAULT_BACKGROUND_COLOR);
    });

    it("reports the dark color through session.config.backgroundColor", async () => {
        const graph = newGraph();
        await graph.init();
        assert.strictEqual(graph.getSession().config.backgroundColor, DEFAULT_BACKGROUND_COLOR);
        graph.setColorScheme("dark");
        assert.strictEqual(graph.getSession().config.backgroundColor, DEFAULT_DARK_BACKGROUND_COLOR);
        graph.setColorScheme("light");
        assert.strictEqual(graph.getSession().config.backgroundColor, DEFAULT_BACKGROUND_COLOR);
    });

    it("draws labels no layer colored light under a dark scheme, and keeps a chosen color", async () => {
        const graph = newGraph();
        await graph.init();
        await graph.addNodes([asData({ id: "a" }), asData({ id: "b" })]);
        await graph.addEdge(asData({ src: "a", dst: "b" }));
        await styleEveryNode(graph, { "node.label": "words" });
        await styleEveryEdge(graph, { "edge.label": "link" });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const nodeColor = (id: string): string | undefined =>
            graph.getDataManager().nodes.get(id)?.label?.textRuns[0]?.[0]?.style.color;
        const edgeColor = (): string | undefined =>
            [...graph.getDataManager().edges.values()][0]?.label?.textRuns[0]?.[0]?.style.color;
        assert.strictEqual(nodeColor("a"), "#000000", "black on the light canvas");
        assert.strictEqual(edgeColor(), "#000000");

        graph.setColorScheme("dark");
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const light = nodeColor("a");
        assert(light !== undefined && light !== "#000000", `a light color on the dark canvas, got ${String(light)}`);
        assert.strictEqual(edgeColor(), light);

        await styleEveryNode(graph, { "node.labelColor": "#ff0000" }, "red labels");
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        assert.strictEqual(nodeColor("a")?.toLowerCase(), "#ff0000", "a chosen color wins");

        graph.setColorScheme("light");
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        assert.strictEqual(edgeColor(), "#000000");
    });

    it("is the element's color-scheme attribute, and refuses an unknown scheme", () => {
        const element: Graphty = document.createElement("graphty-element");
        cleanups.push(() => {
            element.remove();
        });
        element.setAttribute("color-scheme", "dark");
        document.body.appendChild(element);
        assert.strictEqual(element.colorScheme, "dark");
        element.colorScheme = "sepia" as "dark";
        assert.strictEqual(element.colorScheme, "dark");
    });
});
