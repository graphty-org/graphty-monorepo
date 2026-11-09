/**
 * @file Every captured story draws the same whole canvas on both render paths.
 *
 * Each story loads under `"objects"` twice and under `"batched"` once, in one run. Two object
 * loads that differ mean the story is not stable, so comparing it says nothing: it goes in
 * `unstable.json` with its reason, or in `unstable-webgpu.json` when only WebGPU is. The bar is section 7 of design/rendering/row-renderer.md.
 * A listed story reports as skipped, so a passed count is a count of stories compared.
 *
 * `VITE_PARITY_STORIES` narrows a run to files whose name matches it, and `VITE_PARITY_RENDERER`
 * says which engine draws: `webgl` unless it says `webgpu`. `VITE_PARITY_PULLED=1` compares the
 * object loads with a third that pulls edges from the row table (`pulledEdgesDefault`) instead of
 * one on `"batched"`. `VITE_PARITY_ANTIALIAS=false` builds every load without multisampling, so the
 * batched load draws straight pulled lines with the lean program (design/rendering/cosmos-gap.md, G12).
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
import { antialiasDefault, pulledEdgesDefault } from "../../src/meshes/PulledLineBatch";
import { type CanvasFrame, pixelsOverBar as overBar, readCanvas } from "../helpers/whole-canvas";
import unstable from "./unstable.json";
import unstableWebgpu from "./unstable-webgpu.json";

// The page the visual capture loads, so a story runs its capture steps.
history.replaceState(null, "", `${location.pathname}${location.search || "?"}&chromatic=true`);
(globalThis as { __GRAPHTY_STORY_RUNNER__?: boolean }).__GRAPHTY_STORY_RUNNER__ = true;

const narrowed = (import.meta.env as Record<string, string | undefined>).VITE_PARITY_STORIES ?? "";
/** Which engine this run draws on. */
const RENDERER = ((import.meta.env as Record<string, string | undefined>).VITE_PARITY_RENDERER ?? "webgl") as
    "webgl" | "webgpu";
/** Whether the third load pulls edges rather than batching nodes. */
const PULLED = (import.meta.env as Record<string, string | undefined>).VITE_PARITY_PULLED === "1";
/** Whether every load multisamples. */
const ANTIALIAS = (import.meta.env as Record<string, string | undefined>).VITE_PARITY_ANTIALIAS !== "false";
const UNSTABLE: Readonly<Record<string, string>> =
    RENDERER === "webgpu" ? { ...unstable, ...unstableWebgpu } : unstable;

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
        // Built off the page, because the element opens its renderer when it connects.
        const built = document.createDocumentFragment();
        if (drawn instanceof Node) {
            built.append(drawn);
        } else {
            render(drawn, built);
        }

        for (const element of built.querySelectorAll<Graphty>("graphty-element")) {
            element.renderer = RENDERER;
        }

        canvas.replaceChildren(built);
    },
};

// Read when an element builds its engine, which a story's own bindings can do before the renderer is set.
antialiasDefault.value = ANTIALIAS;

const modules = import.meta.glob<Record<string, unknown>>("../../stories/**/*.stories.ts");

afterEach(() => {
    renderPathDefault.value = "objects";
    pulledEdgesDefault.value = false;
    document.body.replaceChildren();
});

/**
 * Draw a story and read its whole canvas.
 * @param story - The story.
 * @param path - The render path.
 * @param pulled - Whether edges are pulled from the row table.
 * @returns The bytes, or null for a story with no element.
 */
async function picture(story: Composed, path: "objects" | "batched", pulled = false): Promise<CanvasFrame | null> {
    renderPathDefault.value = path;
    pulledEdgesDefault.value = pulled;
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
    assert.equal(
        element.graph.leansLines(),
        !ANTIALIAS && path === "batched",
        `the lean program is not as set (antialias ${String(element.graph.antialias)})`,
    );
    assert.equal(element.graph.engine.isWebGPU, RENDERER === "webgpu", "the story drew on the other engine");
    host.remove();
    return frame;
}

// Its first story never finishes its objects load here, so it says nothing about a batch.
const HANGS = /LabelStyles/;
// Opening WebGPU swaps the first scene for its own (#5971), and any shader these stories were loading on
// the first one rejects with "The graph was disposed", on either path.
const SWAP_REJECTS = /shaders\/Scene(Drawing|Presets)/;
const files = Object.keys(modules).filter(
    (file) =>
        !HANGS.test(file) &&
        !(RENDERER === "webgpu" && SWAP_REJECTS.test(file)) &&
        (narrowed === "" || new RegExp(narrowed).test(file)),
);

describe.each(files)("%s", async (file) => {
    const load = modules[file];
    const stories = Object.entries(
        composeStories((await load?.()) as never, ANNOTATIONS as never) as Record<string, Composed>,
    ).filter(([, story]) => story.parameters.chromatic?.disableSnapshot !== true);

    if (stories.length === 0) {
        it.skip("has no captured story", () => undefined);
    }

    // A story that compares nothing reports as skipped, so "passed" counts only compared stories.
    it.for(stories)("%s", async ([name, story], { skip }) => {
        const id = `${file} ${name}`;
        if (id in UNSTABLE) {
            skip(UNSTABLE[id]);
        }

        const objects = await picture(story, "objects");
        if (objects === null) {
            skip("no element");
            return;
        }

        const again = await picture(story, "objects");
        assert.isNotNull(again);
        assert.equal(overBar(objects, again), 0, `${id} is not stable between two loads`);
        const third = PULLED ? await picture(story, "objects", true) : await picture(story, "batched");
        assert.isNotNull(third);
        assert.equal(
            overBar(objects, third),
            0,
            `${id} differs ${PULLED ? "with edges pulled" : "on the batched path"}`,
        );
    });
});
