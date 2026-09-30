import { Drawer, MantineProvider, Menu, Modal } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Accessibility defaults the compact theme gives Mantine's overlays, found by running
 * axe-core over the graphty app shell.
 */
describe("overlay accessibility defaults", () => {
    /*
       Mantine draws the Modal and Drawer close button as an icon with no text and no
       aria-label, so a screen reader announces a nameless "button" (axe: button-name,
       critical). The theme names it; a caller that passes its own label still wins.
    */
    it.each([
        ["Modal", Modal],
        ["Drawer", Drawer],
    ] as const)("names the %s close button", (_name, Overlay) => {
        render(
            <MantineProvider theme={compactTheme}>
                <Overlay opened onClose={() => undefined} title="Title" transitionProps={{ duration: 0 }}>
                    body
                </Overlay>
            </MantineProvider>,
        );

        expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("keeps a caller's own close button label", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <Modal
                    opened
                    onClose={() => undefined}
                    title="Title"
                    transitionProps={{ duration: 0 }}
                    closeButtonProps={{ "aria-label": "Dismiss" }}
                >
                    body
                </Modal>
            </MantineProvider>,
        );

        expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    });

    /*
       By default Mantine puts a focusable, role-less div at the top of every menu
       dropdown to hold focus on open. A role="menu" may only own menu items, groups and
       separators, so axe reports aria-required-children (critical) on every open menu.
       Without the placeholder, focus moves to the first item on open, which is what the
       WAI-ARIA menu pattern asks for.
    */
    it("draws only menu items inside an open menu", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <Menu opened transitionProps={{ duration: 0 }}>
                    <Menu.Target>
                        <button type="button">Open</button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item>One</Menu.Item>
                        <Menu.Item>Two</Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </MantineProvider>,
        );

        const children = [...screen.getByRole("menu").children];

        expect(children.map((child) => child.getAttribute("role"))).toEqual(["menuitem", "menuitem"]);
    });
});
