/**
 * The harness example: a themed Mantine Button against Figma's primary button, light and dark,
 * with every expected value read from the Figma capture rather than copied.
 *
 * Light: bc/btn-primary-md-enabled--default #63 ("Button", Figma md = our default sm, 24 tall).
 * Dark: dark-theme/dark-panel-rect #69 (the "Share" button, Figma lg = our md, 32 tall).
 *
 * FOUNDATION lists what the tokens and the theme deliver (the brand fill, the on-brand text, the
 * 5px radius). The rest of the capture -- height (32 at md), 11/16 type, 450 weight, 0.055px
 * letter-spacing, label inset and so width -- is the buttons package's Button styling; its own
 * Figma test compares the same captures with those properties added.
 */
import { Button } from "@mantine/core";
import { afterEach, describe, it } from "vitest";

import { figmaAvailable, figmaElement, figmaSpec } from "./figma";
import { drive, expectMeasured, part, renderThemed, resetHarness } from "./measure";

const FOUNDATION = ["backgroundColor", "color", "borderRadius"];

afterEach(resetHarness);

describe.skipIf(!(await figmaAvailable()))("harness example: primary Button against Figma", () => {
    it("light, default size, matches bc/btn-primary-md-enabled--default", async () => {
        const figma = await figmaElement("bc/btn-primary-md-enabled--default", { index: 63 });
        const { container } = await renderThemed(<Button>Button</Button>, { scheme: "light" });
        expectMeasured(part(container, "button"), figmaSpec(figma, FOUNDATION));
    });

    it("dark, size md, matches the dark Share button", async () => {
        const figma = await figmaElement("dark-theme/dark-panel-rect", { tag: "button", cls: "shareButton" });
        const { container } = await renderThemed(<Button size="md">Share</Button>, { scheme: "dark" });
        expectMeasured(part(container, "button"), figmaSpec(figma, FOUNDATION));
    });

    it("hover moves the fill to the brand hover token (driven by a real pointer)", async () => {
        const { container } = await renderThemed(<Button>Button</Button>, { scheme: "light" });
        const button = part(container, "button");
        await drive(button, "hover");
        expectMeasured(button, { backgroundColor: "#007be5" });
    });
});
