/**
 * @file An element that is created and never used opens no Babylon engine (issue #1977).
 *
 * Building the element's graph opens a Babylon engine, which holds a WebGL context, and Chrome
 * keeps only 16 of those per page, evicting the oldest LIVE one when a page asks for more. The
 * element used to build its graph in its constructor, so a page that made elements it never
 * attached -- a template, a validation step, a test -- could evict a live graph's context. The
 * graph is now built the first time something needs it: being attached, or a property, method or
 * `session` reached before that, which must go on working exactly as before. And `shutdown()` on
 * an element whose graph was built but never attached now gives its engine back: shutting a graph
 * down used to dispose nothing until the graph had finished initialising.
 */

import "../../src/algorithms";

import { EngineStore } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import { Graphty } from "../../src/graphty-element";
import { contextOf, released } from "../helpers/webgl-context";

/** More elements than Chrome keeps contexts for, so eager engines would evict one. */
const ELEMENTS = 24;

const NODES = [{ id: "hub" }, { id: "a" }, { id: "b" }, { id: "tail" }];
const EDGES = [
    { src: "hub", dst: "a" },
    { src: "hub", dst: "b" },
    { src: "b", dst: "tail" },
];

const attached: Graphty[] = [];

/**
 * Attach an element in a sized box, as a page would.
 * @param element - The element.
 */
function attach(element: Graphty): void {
    element.style.display = "block";
    element.style.width = "320px";
    element.style.height = "240px";
    document.body.appendChild(element);
    attached.push(element);
}

afterEach(() => {
    for (const element of attached.splice(0)) {
        element.remove();
    }
});

describe("an element that is never used opens no engine", () => {
    it("creates no engine for elements made and never attached, and the next one attached draws", async () => {
        const before = EngineStore.Instances.length;

        for (let i = 0; i < ELEMENTS; i++) {
            const element = i % 2 === 0 ? new Graphty() : document.createElement("graphty-element");
            assert.instanceOf(element, Graphty);
        }

        assert.strictEqual(EngineStore.Instances.length, before, "an unattached element opened an engine");

        const element = new Graphty();
        attach(element);
        element.nodeData = NODES;
        element.edgeData = EDGES;

        assert.strictEqual(EngineStore.Instances.length, before + 1, "attaching opens exactly one engine");
        await vi.waitFor(() => {
            assert.strictEqual(element.graph.getNodes().length, NODES.length);
        });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        const gl = contextOf(element.graph);
        assert.isFalse(gl.isContextLost());
        element.graph.scene.render();
        const pixels = await element.graph.engine.readPixels(0, 0, 1, 1);
        // A lost context reads back zeros; a drawn frame has the background, whitesmoke.
        assert.deepEqual(Array.from(new Uint8Array(pixels.buffer)), [245, 245, 245, 255]);
    });

    it("applies what was set before attaching once the element is attached", async () => {
        const element = new Graphty();
        const settled: Event[] = [];
        element.addEventListener("graph-settled", (event) => {
            settled.push(event);
        });
        element.layout = "circular";
        element.runAlgorithmsOnLoad = true;
        element.algorithmsOnLoad = ["graphty:degree"];
        element.nodeData = NODES;
        element.edgeData = EDGES;
        assert.strictEqual(element.layout, "circular", "a property reads back before attaching");

        attach(element);

        await vi.waitFor(() => {
            assert.isTrue(
                element.session.runs.list().some((run) => run.algorithm === "degree" && run.status === "succeeded"),
                "the load-time degree run succeeded",
            );
        });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.strictEqual(element.graph.getNodes().length, NODES.length, "the nodes set before attaching are drawn");
        assert.strictEqual(element.layout, "circular");
        assert.strictEqual(element.graph.getLayoutManager().layoutEngine?.type, "circular");
        assert.isAbove(settled.length, 0, "a listener added before attaching hears the graph settle");
    });

    it("gives back the context of an element configured but never attached when it is shut down", async () => {
        const element = new Graphty();
        element.nodeData = NODES;
        const { engine } = element.graph;
        const gl = contextOf(element.graph);
        const release = released(gl);

        element.shutdown();

        // Graph shutdown used to dispose nothing unless the graph had finished initialising.
        assert.notInclude(EngineStore.Instances, engine, "the engine of a graph never attached was not disposed");
        await release;

        assert.isTrue(gl.isContextLost());
    });
});
