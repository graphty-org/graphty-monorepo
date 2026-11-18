/**
 * @file The simple path of saved views and tours, run as `docs/guide/camera.md` prints it, on a real
 * `<graphty-element>`: a view id the element does not know, a call that refuses, or a tour that
 * does not play to its end fails here. `test/documentation/camera-guide-example.test.ts` compiles
 * the same block against the published types. The recorder is the mock (no codec in the test
 * browser); the camera moves, the tour and the recording's timing are the element's own.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import guide from "../../../docs/guide/camera.md?raw";
import type { Graphty } from "../../../index.js";
import type { TourEndReason } from "../../../src/camera/tour";
import { operationQueueOf } from "../../../src/Graph";
import { restoreMockMediaRecorder, setupMockMediaRecorder } from "../video/mock-media-recorder.js";

/** The two lines the example starts with; the run hands it the mounted element instead. */
const SETUP = 'import "@graphty/graphty-element";\nconst g = document.querySelector("graphty-element")!;\n';

/** The guide's first `ts` block, after its setup lines: plain JavaScript. */
function exampleBody(): string {
    const block = /```ts\n([\s\S]*?)```/.exec(guide)?.[1];
    assert.isDefined(block, "camera.md has a ts block");
    assert.isTrue(block.startsWith(SETUP), "the example starts by reaching the element");

    return block.slice(SETUP.length);
}

describe("the camera guide's saved views and tours example", () => {
    let element: Graphty;
    let originalMediaRecorder: typeof MediaRecorder;

    beforeEach(async () => {
        originalMediaRecorder = globalThis.MediaRecorder;
        setupMockMediaRecorder(vi);
        element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "480px";
        element.style.height = "360px";
        document.body.appendChild(element);
        await element.updateComplete;
        await element.session.data.addNodes([
            { id: "a", position: { x: -5, y: 0, z: 0 } },
            { id: "b", position: { x: 5, y: 0, z: 0 } },
            { id: "c", position: { x: 0, y: 5, z: 3 } },
        ]);
        await element.session.data.addEdges([{ source: "a", target: "b" }]);
        await element.graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(element.graph).waitForCompletion();
    });

    afterEach(() => {
        element.remove();
        restoreMockMediaRecorder(vi, originalMediaRecorder);
    });

    it("runs on a real element: the views, the tour, its length and how it ends", async function runExample() {
        const ended: TourEndReason[] = [];
        const off = element.graph.on("tour-ended", (event) => {
            ended.push(event.reason);
        });
        const downloads: string[] = [];
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
            this: HTMLAnchorElement,
        ) {
            downloads.push(this.download);
        });

        // The constructor of every async function, this test's own included: it builds one from source text.
        const AsyncFunction = Object.getPrototypeOf(runExample).constructor as new (
            ...args: string[]
        ) => (g: Graphty) => Promise<void>;
        await new AsyncFunction("g", exampleBody())(element);
        click.mockRestore();
        off();

        assert.deepStrictEqual([...element.session.views.keys()], ["overview", "hub"]);
        assert.deepStrictEqual([...element.session.tours.keys()], ["intro"]);
        const plan = element.planTour("intro");
        assert.isTrue(plan.playable);
        assert.strictEqual(plan.totalMs, 6500, "the guide's 6.5 s");
        assert.deepStrictEqual(ended, ["finished", "finished"], "the preview and the recording both played to the end");
        assert.lengthOf(downloads, 2, "the video and the picture were both saved");
    });
});
