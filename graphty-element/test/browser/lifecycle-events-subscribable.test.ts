/**
 * @file The four lifecycle events can be subscribed through `graph.on`.
 *
 * `render-initialized`, `manager-initialized`, `lifecycle-initialized` and `lifecycle-disposed`
 * were declared and forwarded to the DOM, but `graph.on` threw "Unknown event type" for each:
 * the listener switch had no case for them. A listener subscribed before `init()` now hears
 * the three start-up events.
 *
 * `lifecycle-disposed` can be subscribed too, but it is still never delivered: it is emitted after
 * the event manager itself was disposed (issue #1645). Delivering it would add a DOM event the
 * element has never dispatched, so that fix is kept apart.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

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
