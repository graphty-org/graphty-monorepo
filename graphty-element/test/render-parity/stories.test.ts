/**
 * @file Every captured story draws the same whole canvas on both render paths.
 *
 * Each story loads under `"objects"` twice and under `"batched"` once, in one run. Two object
 * loads that differ mean the story is not stable, so comparing it says nothing: it goes in
 * `unstable.json` with its reason. The bar is section 7 of design/rendering/row-renderer.md.
 *
 * `PARITY_STORIES` narrows a local run to files whose name matches it.
 */

import { composeStories } from "storybook/preview-api";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { renderPathDefault } from "../../src/meshes/NodeBatch";
import { type CanvasFrame, pixelsOverBar as overBar, readCanvas } from "../helpers/whole-canvas";
import unstable from "./unstable.json";

vi.mock("../../stories/helpers", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../stories/helpers")>()),
    storySetup: (opts: { preSteps?: number } = {}) => ({ ...opts, preSteps: opts.preSteps ?? 2000 }),
}));

(globalThis as { __GRAPHTY_STORY_RUNNER__?: boolean }).__GRAPHTY_STORY_RUNNER__ = true;

const narrowed = (import.meta.env as Record<string, string | undefined>).VITE_PARITY_STORIES ?? "";
const UNSTABLE: Readonly<Record<string, string>> = unstable;

/** One composed story. */
interface Composed {
    run(context: { canvasElement: HTMLElement }): Promise<void>;
    parameters: { chromatic?: { disableSnapshot?: boolean } };
}

const modules = import.meta.glob<Record<string, unknown>>("../../stories/**/*.stories.ts");

afterEach(() => {
    renderPathDefault.value = "objects";
    document.body.replaceChildren();
});

/**
 * Draw a story and read its whole canvas.
 * @param story - The story.
 * @param path - The render path.
 * @returns The bytes, or null for a story with no element.
 */
async function picture(story: Composed, path: "objects" | "batched"): Promise<CanvasFrame | null> {
    renderPathDefault.value = path;
    const host = document.createElement("div");
    host.style.width = "800px";
    host.style.height = "600px";
    document.body.append(host);
    await story.run({ canvasElement: host });
    const element = host.querySelector<Graphty>("graphty-element");
    if (element === null) {
        host.remove();
        return null;
    }

    const frame = await readCanvas(element.graph);
    assert.equal(element.graph.renderPath, path);
    host.remove();
    return frame;
}

const files = Object.keys(modules).filter((file) => narrowed === "" || new RegExp(narrowed).test(file));

describe.each(files)("%s", async (file) => {
    const load = modules[file];
    const stories = Object.entries(composeStories((await load?.()) as never, {}) as Record<string, Composed>).filter(
        ([, story]) => story.parameters.chromatic?.disableSnapshot !== true,
    );

    it.each(stories)("%s", async (name, story) => {
        const id = `${file} ${name}`;
        const objects = await picture(story, "objects");
        if (objects === null || id in UNSTABLE) {
            return;
        }

        const again = await picture(story, "objects");
        assert.isNotNull(again);
        assert.equal(overBar(objects, again), 0, `${id} is not stable between two loads`);
        const batched = await picture(story, "batched");
        assert.isNotNull(batched);
        assert.equal(overBar(objects, batched), 0, `${id} differs on the batched path`);
    });
});
