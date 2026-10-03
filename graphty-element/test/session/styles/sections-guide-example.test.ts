/**
 * @file The runnable example of "Sections, in order" in the styling guide
 * (`docs/guide/styling.md`), kept here so the documented code keeps working. The body is the
 * guide's code with its printed lines turned into an assertion; the guide imports from
 * `@graphty/graphty-element/catalog`, which is this module.
 */

import { assert, describe, it } from "vitest";

import { channelsFor } from "../../../catalog";

describe("the styling guide's sections example", () => {
    it("groups a node's channels under one heading per section, in the editor's order", () => {
        const sections = new Map<string, string[]>();

        for (const channel of channelsFor("node")) {
            const rows = sections.get(channel.section) ?? [];
            rows.push(channel.shortName);
            sections.set(channel.section, rows);
        }

        assert.deepEqual(
            [...sections].map(([section, rows]) => `${section}: ${rows.join(", ")}`),
            [
                "fill: Color, Opacity",
                "size: Size",
                "shape: Type",
                "effects: Outline, Glow, Glow strength, Wireframe, Flat shaded, Marker",
                "label: Label, Label style",
                "tooltip: Tooltip, Tooltip style",
            ],
        );
    });
});
