/**
 * A menu row's shortcut in a real browser: drawn at the row's right, kept out of the row's
 * accessible name, and spoken through aria-keyshortcuts.
 */
import { Menu } from "@mantine/core";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { ContextMenu, MenuShortcut } from "../../../src";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

describe("MenuShortcut", () => {
    it("shows the keys but names the row by its label alone, with the keys in aria-keyshortcuts", async () => {
        await renderThemed(
            <ContextMenu target={<div style={{ width: 200, height: 100 }}>Canvas</div>}>
                <Menu.Item aria-keyshortcuts="F2" rightSection={<MenuShortcut>F2</MenuShortcut>}>
                    Rename
                </Menu.Item>
                <Menu.Item aria-keyshortcuts="Delete" rightSection={<MenuShortcut>Delete</MenuShortcut>}>
                    Delete
                </Menu.Item>
            </ContextMenu>,
        );
        await userEvent.click(screen.getByText("Canvas"), { button: "right" });

        const rename = await screen.findByRole("menuitem", { name: "Rename" });
        expect(rename).toHaveAccessibleName("Rename");
        expect(rename).toHaveAttribute("aria-keyshortcuts", "F2");
        expect(rename).toHaveTextContent("RenameF2");
        expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAccessibleName("Delete");
    });
});
