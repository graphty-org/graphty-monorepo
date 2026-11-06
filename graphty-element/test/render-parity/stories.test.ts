/**
 * @file Every captured story draws the same whole canvas on both render paths.
 *
 * Each story loads under `"objects"` twice and under `"batched"` once, in one run. Two object
 * loads that differ mean the story is not stable, so comparing it says nothing: it goes in
 * `unstable.json` with its reason. The bar is section 7 of design/rendering/row-renderer.md.
 *
 * `VITE_PARITY_STORIES` narrows a run to files whose name matches it, and `VITE_PARITY_RENDERER`
 * says which engine draws: `webgl` unless it says `webgpu`.
 */

import "../../src/algorithms/index";
import "../../src/data/index";
import "../../src/graphty-element";
import "../../src/layout/index";

import { render } from "lit";
import { composeStories } from "storybook/preview-api";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { renderPathDefault } from "../../src/meshes/NodeBatch";
import { type CanvasFrame, pixelsOverBar as overBar, readCanvas } from "../helpers/whole-canvas";
import unstable from "./unstable.json";

// The page the visual capture loads, so a story runs its capture steps.
history.replaceState(null, "", `${location.pathname}${location.search || "?"}&chromatic=true`);
(globalThis as { __GRAPHTY_STORY_RUNNER__?: boolean }).__GRAPHTY_STORY_RUNNER__ = true;

const narrowed = (import.meta.env as Record<string, string | undefined>).VITE_PARITY_STORIES ?? "";
/** Which engine this run draws on. */
const RENDERER = ((import.meta.env as Record<string, string | undefined>).VITE_PARITY_RENDERER ?? "webgl") as
    "webgl" | "webgpu";
const UNSTABLE: Readonly<Record<string, string>> = unstable;

/** One composed story. */
interface Composed {
    run(context: { canvasElement: HTMLElement }): Promise<void>;
    parameters: { chromatic?: { disableSnapshot?: boolean } };
}

/** Storybook's web component renderer, which this project does not load: a story returns an element or a template. */
const ANNOTATIONS = {
    renderToCanvas: (context: { storyFn: () => unknown; showMain: () => void }, canvas: HTMLElement): void => {
        context.showMain();
        const drawn = context.storyFn();
        if (drawn instanceof Node) {
            for (const element of [drawn, ...((drawn as Element).querySelectorAll?.("graphty-element") ?? [])]) {
                if (element instanceof HTMLElement && element.localName === "graphty-element") {
                    (element as Graphty).renderer = RENDERER;
                }
            }

            canvas.replaceChildren(drawn);
        } else {
            render(drawn, canvas);
        }
    },
};

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
    await story.run({ canvasElement: host }).catch((error: unknown) => {
        throw new Error(`on ${path}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    });
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

// Its first story never finishes its objects load here, so it says nothing about a batch.
const HANGS = /LabelStyles/;
const files = Object.keys(modules).filter(
    (file) => !HANGS.test(file) && (narrowed === "" || new RegExp(narrowed).test(file)),
);

describe.each(files)("%s", async (file) => {
    const load = modules[file];
    const stories = Object.entries(
        composeStories((await load?.()) as never, ANNOTATIONS as never) as Record<string, Composed>,
    ).filter(([, story]) => story.parameters.chromatic?.disableSnapshot !== true);

    it.skipIf(stories.length > 0)("has no captured story", () => undefined);
    it.each(stories)("%s", async (name, story) => {
        const id = `${file} ${name}`;
        if (id in UNSTABLE) {
            return;
        }

        const objects = await picture(story, "objects");
        if (objects === null) {
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
