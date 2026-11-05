/**
 * @file The four lifecycle events can be subscribed through `graph.on`.
 *
 * `render-initialized`, `manager-initialized`, `lifecycle-initialized` and `lifecycle-disposed`
 * were declared and forwarded to the DOM, but `graph.on` threw "Unknown event type" for each:
 * the listener switch had no case for them. A listener subscribed before `init()` now hears
 * the three start-up events.
 *
 * `lifecycle-disposed` is delivered too, exactly once, to a `graph.on` listener and to one on the
 * element. It used to be emitted after the event manager had cleared its observable, so it reached
 * nobody (issue #1645).
 */

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { Graph } from "../../src/Graph";
import { Graphty } from "../../src/graphty-element";

describe("graph.on accepts the lifecycle events", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
    });

    afterEach(() => {
        container.remove();
    });

    it("delivers the start-up events, and accepts a listener for the disposal", async () => {
        const heard: string[] = [];
        graph.on("render-initialized", (e) => heard.push(e.type));
        graph.on("manager-initialized", (e) => heard.push(e.type));
        graph.on("lifecycle-initialized", (e) => heard.push(e.type));
        graph.on("lifecycle-disposed", (e) => heard.push(e.type));

        await graph.init();

        assert.include(heard, "render-initialized");
        assert.include(heard, "manager-initialized");
        assert.include(heard, "lifecycle-initialized");

        graph.dispose();
    });
});

describe("lifecycle-disposed is delivered", () => {
    let container: HTMLElement | null = null;

    afterEach(() => {
        container?.remove();
        container = null;
    });

    it("reaches a graph.on listener once when the graph is disposed", async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        const graph = new Graph(container);
        await graph.init();

        let heard = 0;
        graph.on("lifecycle-disposed", () => {
            heard++;
        });

        graph.dispose();
        graph.dispose();

        assert.strictEqual(heard, 1);
    });

    it("reaches a graph.on listener and a DOM listener once when the element is removed", async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        const element = document.createElement("graphty-element");
        assert.instanceOf(element, Graphty);
        element.style.display = "block";
        element.style.width = "100%";
        element.style.height = "100%";
        container.appendChild(element);
        await vi.waitFor(() => {
            assert.isTrue(element.graph.initialized, "the element finished initialising");
        });

        let viaGraph = 0;
        let viaDom = 0;
        element.graph.on("lifecycle-disposed", () => {
            viaGraph++;
        });
        const delivered = new Promise<void>((resolve) => {
            element.addEventListener("lifecycle-disposed", () => {
                viaDom++;
                resolve();
            });
        });

        element.remove();
        await delivered;
        element.graph.dispose();

        assert.strictEqual(viaGraph, 1, "graph.on heard it once");
        assert.strictEqual(viaDom, 1, "the element dispatched it once");
    });
});
