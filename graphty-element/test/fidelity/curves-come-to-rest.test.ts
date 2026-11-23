/**
 * @file The curves of vis-network's siblings sample (200 nodes, 284 curved edges) come to rest within a few frames
 * of the layout settling, on the seeded drawing every fidelity run draws (issue #9280).
 *
 * One support point there sat beside a cell edge of the Barnes-Hut tree, whose push jumps as the point crosses it,
 * and swung back and forth without ever slowing. The points ran to their step cap, 39 frames to a stable frame
 * against 10 before the force layout's start grew, and the fidelity story's stable frame ran out in CI's
 * software-rendered browser.
 */
import { afterEach, assert, it } from "vitest";

import { CORPUS_SAMPLES } from "../../../graph-io/test/fidelity/corpus-samples";
import { createSampleElement, importSample } from "./load-sample";
import { readSample } from "./mount";

/** Frames before the stable frame: the layout settles in its pre-steps, and the points at rest took 13. */
const FRAMES = 20;

afterEach(() => {
    document.body.replaceChildren();
});

it("draws vis-siblings' curves at rest within a few frames", async () => {
    const sample = CORPUS_SAMPLES.find((s) => s.id === "json-vis-siblings");
    assert.isDefined(sample);
    const { data } = await readSample(sample.file);
    const url = URL.createObjectURL(data);
    const element = createSampleElement(800, 600);
    document.body.appendChild(element);
    await element.updateComplete;
    let frames = 0;
    element.graph.getScene().onAfterRenderObservable.add(() => {
        frames++;
    });
    try {
        await importSample(element, sample.format, url);
    } finally {
        URL.revokeObjectURL(url);
    }

    assert.isAtMost(frames, FRAMES, "frames drawn before the curves came to rest");
});
