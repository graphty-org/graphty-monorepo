/**
 * Mantine Card against Figma's library card (components.md 55; ls/panel-assets #114): padding 8,
 * a transparent 1px edge, radius 5, no fill, no shadow. A card rendered as a button
 * hovers to --cm-bg-hover and rings inside with 2px on keyboard focus (ls/assets-component-tile-*).
 */
import { Card } from "@mantine/core";
import { afterEach, describe, expect, it } from "vitest";

import { drive, expectMeasured, figmaAvailable, figmaElement, figmaSpec, part, renderFigma, resetHarness } from "./harness";

afterEach(resetHarness);

describe.runIf(await figmaAvailable())("Card (C55)", () => {
    it("the library card: padding 8, a transparent 1px edge, radius 5, no fill (ls/panel-assets #114)", async () => {
        const { container } = await renderFigma(
            <Card w={224} h={173}>
                Library
            </Card>,
        );
        expectMeasured(
            part(container, ".mantine-Card-root"),
            figmaSpec(await figmaElement("ls/panel-assets", { index: 114 }), [
                "width",
                "height",
                "paddingTop",
                "paddingRight",
                "paddingBottom",
                "paddingLeft",
                "borderTopWidth",
                "borderTopColor",
                "borderRadius",
                "backgroundColor",
                "boxShadow",
            ]),
        );
    });

    it("a card that is a button hovers to the hover ground and rings 2px inside on keyboard focus", async () => {
        const { container } = await renderFigma(
            <Card component="button" w={96} h={116}>
                Tile
            </Card>,
        );
        const card = part(container, ".mantine-Card-root");
        await drive(card, "hover");
        expect(getComputedStyle(card).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
        await drive(card, "focus");
        expect(getComputedStyle(card).boxShadow).toMatch(/0px 0px 0px 2px inset$/);
    });
});
