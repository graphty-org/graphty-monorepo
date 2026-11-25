/**
 * @file Two captured stories whose batched picture once differed from the objects path's, drawn on both paths in the
 * test projects every pull request runs (the whole story set is compared by the render-parity project).
 *
 * - FadeThrough holds a particle layout transition at its pose, which writes every row again each frame with the value
 *   it holds: the rows must count as at rest, so the arrowheads and line ends are placed on the CPU, and placed from
 *   each held node's own float64 place, which the row table keeps only to 32 bits.
 * - BipartiteMatching paints some edges vermilion over gray in 2D: where a vermilion head meets a gray one, the color
 *   painted later is on top, as the objects path draws its 2D caps in one batch a color.
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
import * as flow from "../../stories/algorithms/Flow/Flow.stories";
import * as transitions from "../../stories/transitions/TransitionPresets.stories";
import { type CanvasFrame, pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

// The page the visual capture loads, so a story runs its capture steps (the transition's hold among them).
history.replaceState(null, "", `${location.pathname}${location.search || "?"}&chromatic=true`);
(globalThis as { __GRAPHTY_STORY_RUNNER__?: boolean }).__GRAPHTY_STORY_RUNNER__ = true;

afterEach(() => {
    renderPathDefault.value = "objects";
    document.body.replaceChildren();
});

/** One composed story. */
interface Composed {
    run(context: { canvasElement: HTMLElement }): Promise<void>;
}

/**
 * Storybook's web component renderer, which this project does not load.
 * @param renderer - The engine every element of the story draws on.
 * @returns The annotations.
 */
function annotations(renderer: "webgl" | "webgpu"): object {
    return {
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
                element.renderer = renderer;
            }

            canvas.replaceChildren(built);
        },
    };
}

/**
 * Draw a story on a render path and read its whole canvas.
 * @param story - The story.
 * @param path - The render path.
 * @returns The bytes, and the element's count of object edges.
 */
async function picture(
    story: Composed,
    path: "objects" | "batched",
): Promise<{ frame: CanvasFrame; objectEdges: number }> {
    renderPathDefault.value = path;
    const host = document.createElement("div");
    host.style.width = "800px";
    host.style.height = "600px";
    document.body.append(host);
    await story.run({ canvasElement: host });
    const element = host.querySelector<Graphty>("graphty-element");
    assert.isNotNull(element);
    assert.equal(element.graph.renderPath, path);
    const frame = await readCanvas(element.graph);
    const { objectEdges } = element.graph.rowCounts;
    host.remove();
    return { frame, objectEdges };
}

describe.each(RENDERERS)("stories batched draws as objects does, on %s", (renderer) => {
    const stories = {
        ...(composeStories(transitions as never, annotations(renderer) as never) as Record<string, Composed>),
        ...(composeStories(flow as never, annotations(renderer) as never) as Record<string, Composed>),
    };

    for (const name of ["FadeThrough", "BipartiteMatching"]) {
        it(name, async () => {
            const story = stories[name];
            assert.isDefined(story);
            const objects = await picture(story, "objects");
            const batched = await picture(story, "batched");
            assert.equal(batched.objectEdges, 0, "every edge pulled");
            assert.equal(pixelsOverBar(objects.frame, batched.frame), 0);
        });
    }
});
