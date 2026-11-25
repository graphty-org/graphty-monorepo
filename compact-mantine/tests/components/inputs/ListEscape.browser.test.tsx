/**
 * Escape closes the innermost thing first. In a real browser: an Escape that closes a list
 * field's open list is used up there, so the popover around the field stays open with what was
 * typed in it; the next Escape, with the list shut, reaches the popover.
 */
import { Autocomplete, Popover, Select, TextInput } from "@mantine/core";
import { screen, waitFor } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, assert, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { Popout, PopoutManager } from "../../../src/components/popout";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

/**
 * A popover that closes on an Escape reaching it, as an application's panel does.
 * @param props - Component props
 * @param props.children - The fields inside it
 * @returns The popover, open
 */
function Panel({ children }: { children: React.ReactNode }): React.JSX.Element {
    const [opened, setOpened] = useState(true);
    return (
        <Popover opened={opened} closeOnEscape={false} withinPortal={false}>
            <Popover.Target>
                <button type="button">Path</button>
            </Popover.Target>
            <Popover.Dropdown
                data-testid="panel"
                onKeyDown={(event) => {
                    if (event.key === "Escape") {
                        setOpened(false);
                    }
                }}
            >
                {children}
            </Popover.Dropdown>
        </Popover>
    );
}

describe("Escape in a list field inside a popover", () => {
    it("closes only the Select's list; From stays filled; a second Escape closes the popover", async () => {
        await renderThemed(
            <Panel>
                <TextInput label="From" defaultValue="Ava" />
                <Select label="Weight" data={["none", "weight"]} />
            </Panel>,
        );
        const weight = screen.getByRole("combobox", { name: "Weight" });
        await userEvent.click(weight);
        await waitFor(() => {
            expect(weight).toHaveAttribute("aria-expanded", "true");
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            expect(weight).toHaveAttribute("aria-expanded", "false");
        });
        expect(screen.getByTestId("panel")).toBeVisible();
        expect(screen.getByRole("textbox", { name: "From" })).toHaveValue("Ava");

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            expect(screen.queryByTestId("panel")).toBeNull();
        });
    });

    it("does the same for an Autocomplete's list", async () => {
        await renderThemed(
            <Panel>
                <Autocomplete label="Node" data={["Ava", "Ben"]} />
            </Panel>,
        );
        const node = screen.getByRole("combobox", { name: "Node" });
        await userEvent.click(node);
        await waitFor(() => {
            expect(node).toHaveAttribute("aria-expanded", "true");
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            expect(node).toHaveAttribute("aria-expanded", "false");
        });
        expect(screen.getByTestId("panel")).toBeVisible();
    });
});

describe("Escape in a list field inside a compact-mantine pop-over", () => {
    it("closes only the list, even when the field has a key handler of its own", async () => {
        await renderThemed(
            <PopoutManager>
                <Popout defaultOpened>
                    <Popout.Trigger>
                        <button type="button">Open</button>
                    </Popout.Trigger>
                    <Popout.Panel width={240} header={{ variant: "title", title: "Shape" }}>
                        <Popout.Content>
                            {/* A caller's own onKeyDown replaces the theme's, as a row's field does. */}
                            <Select label="Kind" data={["box", "sphere"]} onKeyDown={() => undefined} />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </PopoutManager>,
        );
        const panel = await screen.findByRole("dialog", { name: "Shape" });
        const kind = screen.getByRole("combobox", { name: "Kind" });
        await userEvent.click(kind);
        await waitFor(() => {
            assert.equal(kind.getAttribute("aria-expanded"), "true");
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.equal(kind.getAttribute("aria-expanded"), "false");
        });
        assert.isTrue(panel.isConnected, "the pop-over stays open");

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Shape" }));
        });
    });
});
