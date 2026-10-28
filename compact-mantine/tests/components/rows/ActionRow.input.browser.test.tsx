/**
 * The hover split with the real mouse: the browser moves the pointer onto the row and off it, so
 * the reveal follows the same mouseenter and mouseleave a reader's pointer makes.
 */
import { MantineProvider, UnstyledButton } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { compactTheme } from "../../../src";
import { ActionRow } from "../../../src/components/rows/ActionRow";
import { UiGlyph } from "../../../src/icons";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRow(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * A 24px icon-only affordance, the shape most actions on this row take.
 * @param root0 - Component props
 * @param root0.label - The word the glyph replaces: the title and the accessible name
 * @returns The icon button
 */
function GlyphAction({ label }: { label: string }): React.JSX.Element {
    return (
        <UnstyledButton type="button" title={label} aria-label={label}>
            <UiGlyph name="copy" />
        </UnstyledButton>
    );
}

describe("ActionRow under the real mouse", () => {
    // The pointer stays where the last test left it, over where the next row renders.
    beforeEach(async () => {
        await commands.mouseAway();
    });

    it("reveals what acts on hover", async () => {
        renderRow(<ActionRow reveal="hover" state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

        await userEvent.hover(screen.getByTestId("action-row"));

        const actions = screen.getByTestId("action-row-actions");
        await expect.element(actions).toHaveAttribute("data-visible", "true");
        // The reveal fades over 100ms: the end of the fade is the opacity a reader sees.
        await expect.element(actions).toHaveStyle({ opacity: "1" });
    });

    it("hides them again when the pointer leaves", async () => {
        renderRow(<ActionRow reveal="hover" state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

        const row = screen.getByTestId("action-row");
        await userEvent.hover(row);
        await expect.element(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "true");
        // The pointer leaves for the far corner of the page.
        await commands.mouseAway();

        await expect.element(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "false");
    });

    it("withdraws pointer events with the ink, so an invisible button cannot be clicked", async () => {
        renderRow(<ActionRow reveal="hover" state="20 nodes" actions={<GlyphAction label="Copy reading" />} />);

        expect(screen.getByTestId("action-row-actions")).toHaveStyle({ pointerEvents: "none" });

        await userEvent.hover(screen.getByTestId("action-row"));

        await expect.element(screen.getByTestId("action-row-actions")).not.toHaveStyle({ pointerEvents: "none" });
    });

    it("leaves what reports state resident while the row is hovered", async () => {
        renderRow(
            <ActionRow
                reveal="hover"
                state="Chonky_Boy"
                residentActions={<GlyphAction label="Hidden. Show Chonky_Boy" />}
            />,
        );

        await userEvent.hover(screen.getByTestId("action-row"));

        expect(screen.getByTestId("action-row-resident-actions").style.opacity).toBe("");
    });

    it("outranks the hover when the caller holds them shut", async () => {
        renderRow(
            <ActionRow
                reveal="hover"
                state="20 nodes"
                actionsVisible={false}
                actions={<GlyphAction label="Copy reading" />}
            />,
        );

        await userEvent.hover(screen.getByTestId("action-row"));

        expect(screen.getByTestId("action-row-actions")).toHaveAttribute("data-visible", "false");
    });
});
