/**
 * A menu's icon button with a tooltip, in a real browser: clicking it opens the menu, and the button
 * itself says so -- aria-expanded="true", aria-controls naming the menu, and the open style
 * (selected ground, brand glyph) -- while hovering it still shows its tooltip.
 */
import { ActionIcon, Menu } from "@mantine/core";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { TargetTooltip } from "../../../src/components/overlays/TargetTooltip";
import { UiGlyph } from "../../../src/icons";
import { computed, renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

describe("TargetTooltip", () => {
    it("hands Menu.Target's open state to the button, and keeps the tooltip", async () => {
        await renderThemed(
            <Menu>
                <Menu.Target>
                    <TargetTooltip label="Layer actions">
                        <ActionIcon aria-label="Layer actions">
                            <UiGlyph name="caretDown" />
                        </ActionIcon>
                    </TargetTooltip>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item>Rename</Menu.Item>
                </Menu.Dropdown>
            </Menu>,
        );
        const button = screen.getByRole("button", { name: "Layer actions" });
        await userEvent.hover(button);
        expect((await screen.findByRole("tooltip", {})).textContent).toBe("Layer actions");
        expect(button.getAttribute("aria-expanded")).toBe("false");
        const closedColor = computed(button).color;

        await userEvent.click(button);
        const menu = await screen.findByRole("menu", {});
        await waitFor(() => {
            expect(button.getAttribute("aria-expanded")).toBe("true");
        });
        expect(button.getAttribute("aria-haspopup")).toBe("menu");
        expect(button.getAttribute("aria-controls")).toBe(menu.id);

        // The open style: the glyph turns the brand color.
        const brand = document.createElement("span");
        brand.style.color = "var(--cm-icon-brand)";
        button.parentElement?.append(brand);
        expect(computed(button).color).toBe(computed(brand).color);
        expect(computed(button).color).not.toBe(closedColor);
    });
});
