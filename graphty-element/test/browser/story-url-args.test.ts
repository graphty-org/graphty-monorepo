/**
 * @file A story's layout options can be set from a Storybook URL under either spelling.
 *
 * The Controls panel labels a control by the option it sets (`layoutConfig.weighted`), while its
 * arg key is something else (`kamadaWeighted`). A link built from the label,
 * `?args=layoutConfig.weighted:!false`, reaches the render function as a nested change to the
 * `layoutConfig` arg; the control's unchanged value used to overwrite it, so the link drew the
 * story's default picture with no warning (issue #229). Storybook drops any URL arg whose key
 * has no argType, so these are the two spellings a link can use.
 */

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../src/graphty-element";
import { renderFn } from "../../stories/helpers";
import meta, { KamadaKawaiWeighted } from "../../stories/Layout.stories";

type RenderContext = Parameters<typeof renderFn>[1];

/**
 * Render the weighted Kamada-Kawai story with some args changed, as a URL would change them.
 * @param changed - The args the URL sets, on top of the story's own.
 * @returns The layout options the element was given.
 */
function layoutOptionsWith(changed: Record<string, unknown>): Record<string, unknown> | undefined {
    const initialArgs = { ...meta.args, ...KamadaKawaiWeighted.args };
    // No data: only the options handed to the element are under test.
    delete initialArgs.dataSource;
    const element = renderFn({ ...initialArgs, ...changed }, {
        argTypes: KamadaKawaiWeighted.argTypes,
        initialArgs,
    } as unknown as RenderContext) as Graphty;

    try {
        return element.layoutConfig;
    } finally {
        element.graph.dispose();
    }
}

describe("story layout options set from the URL", () => {
    it("keeps the story's own options when the URL changes nothing", () => {
        assert.strictEqual(layoutOptionsWith({})?.weighted, true);
    });

    it("honours the name the Controls panel shows: ?args=layoutConfig.weighted:!false", () => {
        assert.strictEqual(layoutOptionsWith({ layoutConfig: { dim: 3, scale: 1, weighted: false } })?.weighted, false);
    });

    it("honours the arg key: ?args=kamadaWeighted:!false", () => {
        assert.strictEqual(layoutOptionsWith({ kamadaWeighted: false })?.weighted, false);
    });
});
