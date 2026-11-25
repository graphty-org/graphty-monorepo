import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Popout, PopoutManager, PopoutRegion, usePopoutRegion } from "../../src/components/popout";
import { compactTheme } from "../../src/theme";
import type { PopoutPlacement } from "../../src/types/popout";

// A panel opens to the left of its trigger, so the triggers sit well in from the left edge of a
// window wide enough for that, the way a sidebar holds them; at the window's edge the panel is
// pushed back over its own trigger and a reader could not press it again.
beforeAll(async () => {
    await page.viewport(1024, 768);
});

/**
 * One pop-out, named so a board can open it and look for its content.
 * @param props - Component props
 * @param props.name - What to call the trigger and the content test id
 * @param props.placement - The side the panel opens on, or undefined to leave it to the region
 * @returns A pop-out with a titled panel.
 */
function NamedPopout({ name, placement }: { name: string; placement?: PopoutPlacement }): React.JSX.Element {
    return (
        <Popout>
            <Popout.Trigger>
                <button>{`Open ${name}`}</button>
            </Popout.Trigger>
            <Popout.Panel width={200} header={{ variant: "title", title: name }} placement={placement}>
                <Popout.Content>
                    <span data-testid={`${name}-content`}>{name}</span>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * Renders inside the providers every pop-out needs.
 * @param ui - What to draw inside the manager.
 * @returns The render result.
 */
function renderPopout(ui: React.ReactElement) {
    return render(
        <MantineProvider theme={compactTheme}>
            <PopoutManager>
                <div style={{ marginInlineStart: 600 }}>{ui}</div>
            </PopoutManager>
        </MantineProvider>,
    );
}

describe("PopoutRegion", () => {
    it("keeps ONE pop-out open across regions: opening one in another region replaces it (Figma)", async () => {
        const user = userEvent.setup();

        renderPopout(
            <>
                <PopoutRegion id="panel">
                    <NamedPopout name="panel-one" />
                </PopoutRegion>
                <PopoutRegion id="inspector">
                    <NamedPopout name="inspector-one" />
                </PopoutRegion>
            </>,
        );

        await user.click(screen.getByRole("button", { name: "Open panel-one" }));
        await waitFor(() => {
            expect(screen.getByTestId("panel-one-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open inspector-one" }));
        await waitFor(() => {
            expect(screen.getByTestId("inspector-one-content")).toBeInTheDocument();
        });

        // Figma keeps one light popover open at a time: the region no longer
        // separates them, so the first one closed.
        expect(screen.queryByTestId("panel-one-content")).not.toBeInTheDocument();
    });

    it("closes the first when a second opens in the SAME region", async () => {
        const user = userEvent.setup();

        renderPopout(
            <PopoutRegion id="panel">
                <NamedPopout name="first" />
                <NamedPopout name="second" />
            </PopoutRegion>,
        );

        await user.click(screen.getByRole("button", { name: "Open first" }));
        await waitFor(() => {
            expect(screen.getByTestId("first-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open second" }));
        await waitFor(() => {
            expect(screen.getByTestId("second-content")).toBeInTheDocument();
        });

        expect(screen.queryByTestId("first-content")).not.toBeInTheDocument();
    });

    it("keeps the same whole-page rule where no region is declared", async () => {
        const user = userEvent.setup();

        // No PopoutRegion anywhere: every root-level pop-out shares one group,
        // exactly as with regions.
        renderPopout(
            <>
                <NamedPopout name="alpha" />
                <NamedPopout name="beta" />
            </>,
        );

        await user.click(screen.getByRole("button", { name: "Open alpha" }));
        await waitFor(() => {
            expect(screen.getByTestId("alpha-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open beta" }));
        await waitFor(() => {
            expect(screen.getByTestId("beta-content")).toBeInTheDocument();
        });

        expect(screen.queryByTestId("alpha-content")).not.toBeInTheDocument();
    });

    it("closes a sibling child when a second child of the same parent opens", async () => {
        const user = userEvent.setup();

        // Two children of one parent are siblings, so opening the second closes
        // the first while the parent stays.
        renderPopout(
            <PopoutRegion id="panel">
                <Popout>
                    <Popout.Trigger>
                        <button>Open parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={240} header={{ variant: "title", title: "parent" }}>
                        <Popout.Content>
                            <NamedPopout name="child-a" />
                            <NamedPopout name="child-b" />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </PopoutRegion>,
        );

        await user.click(screen.getByRole("button", { name: "Open parent" }));
        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Open child-a" })).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open child-a" }));
        await waitFor(() => {
            expect(screen.getByTestId("child-a-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open child-b" }));
        await waitFor(() => {
            expect(screen.getByTestId("child-b-content")).toBeInTheDocument();
        });

        expect(screen.queryByTestId("child-a-content")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Open child-b" })).toBeInTheDocument();
    });

    it("still tells a pop-out which region it was opened in", () => {
        let seen: string | null = "unset";
        function Probe(): null {
            seen = usePopoutRegion();
            return null;
        }
        renderPopout(
            <PopoutRegion id="inspector">
                <Probe />
            </PopoutRegion>,
        );
        expect(seen).toBe("inspector");
    });

    /**
     * Opens a named pop-out and reports which side of its trigger the panel opened on.
     * @param name - The pop-out's name
     * @returns "left" or "right"
     */
    async function sideOf(name: string): Promise<"left" | "right"> {
        await userEvent.click(screen.getByRole("button", { name: `Open ${name}` }));
        await waitFor(() => {
            expect(screen.getByTestId(`${name}-content`)).toBeInTheDocument();
        });
        const trigger = screen.getByRole("button", { name: `Open ${name}` }).getBoundingClientRect();
        const panel = screen.getByRole("dialog").getBoundingClientRect();
        return panel.left >= trigger.right - 1 ? "right" : "left";
    }

    it("opens a pop-out on the region's side when the panel sets none", async () => {
        renderPopout(
            <PopoutRegion id="panel" placement="right">
                <NamedPopout name="region-side" />
            </PopoutRegion>,
        );
        expect(await sideOf("region-side")).toBe("right");
    });

    it("inherits the side from an enclosing region that sets one", async () => {
        renderPopout(
            <PopoutRegion id="outer" placement="right">
                <PopoutRegion id="inner">
                    <NamedPopout name="inherited" />
                </PopoutRegion>
            </PopoutRegion>,
        );
        expect(await sideOf("inherited")).toBe("right");
    });

    it("lets a panel's own placement win over its region's", async () => {
        renderPopout(
            <PopoutRegion id="panel" placement="right">
                <NamedPopout name="own-side" placement="left" />
            </PopoutRegion>,
        );
        expect(await sideOf("own-side")).toBe("left");
    });

    it("opens on the left where no region sets a side", async () => {
        renderPopout(
            <PopoutRegion id="panel">
                <NamedPopout name="default-side" />
            </PopoutRegion>,
        );
        expect(await sideOf("default-side")).toBe("left");
    });
});
