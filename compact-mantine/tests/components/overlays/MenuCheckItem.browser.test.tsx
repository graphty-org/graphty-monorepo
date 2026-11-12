/**
 * MenuCheckItem's checked state as assistive technology reads it: the checked row of a radio set
 * says aria-checked="true", in a top-level menu and in a submenu.
 */
import { MantineProvider, Menu } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { compactTheme, MenuCheckItem } from "../../../src";

const TYPES = ["text", "number", "yes/no"];

describe("MenuCheckItem", () => {
    it("a radio row reports aria-checked true on the checked row only", async () => {
        render(
            <MantineProvider theme={compactTheme}>
                <Menu opened>
                    <Menu.Target>
                        <button type="button">open</button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        {TYPES.map((type) => (
                            <MenuCheckItem key={type} radio checked={type === "number"}>
                                {type}
                            </MenuCheckItem>
                        ))}
                    </Menu.Dropdown>
                </Menu>
            </MantineProvider>,
        );
        const rows = await screen.findAllByRole("menuitemradio");
        expect(rows.map((row) => row.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    });

    it("a radio row in a submenu reports aria-checked true on the checked row", async () => {
        render(
            <MantineProvider theme={compactTheme}>
                <Menu opened>
                    <Menu.Target>
                        <button type="button">open</button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Sub>
                            <Menu.Sub.Target>
                                <Menu.Sub.Item>Type</Menu.Sub.Item>
                            </Menu.Sub.Target>
                            <Menu.Sub.Dropdown>
                                {TYPES.map((type) => (
                                    <MenuCheckItem key={type} radio checked={type === "number"}>
                                        {type}
                                    </MenuCheckItem>
                                ))}
                            </Menu.Sub.Dropdown>
                        </Menu.Sub>
                    </Menu.Dropdown>
                </Menu>
            </MantineProvider>,
        );
        await userEvent.hover(await screen.findByRole("menuitem", { name: "Type" }));
        const rows = await screen.findAllByRole("menuitemradio");
        expect(rows.map((row) => row.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    });
});
