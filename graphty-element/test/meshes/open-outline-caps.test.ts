/**
 * @file The caps `edge.arrow*OutlineWidth` is declared drawn on (`drawnWhen`) are the caps the renderer frames an
 * outline for: channels.ts cannot import the renderer, so it keeps its own list.
 */
import { assert, describe, it } from "vitest";

import { FilledArrowRenderer } from "../../src/meshes/FilledArrowRenderer";
import { CHANNEL_DESCRIPTORS, OPEN_OUTLINE_CAPS } from "../../src/session/styles/channels";

describe("open outline caps", () => {
    it("lists exactly the caps the renderer frames an outline for", () => {
        assert.sameMembers([...OPEN_OUTLINE_CAPS], Object.keys(FilledArrowRenderer.OPEN_OUTLINES));
    });

    it("declares an outline width drawn on those caps only", () => {
        assert.deepInclude(CHANNEL_DESCRIPTORS["edge.arrowHeadOutlineWidth"].drawnWhen ?? [], {
            channel: "edge.arrowHead",
            values: OPEN_OUTLINE_CAPS,
        });
    });
});
